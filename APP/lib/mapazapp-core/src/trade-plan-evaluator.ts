/**
 * Pure trade **review** plan evaluation — not execution, not MT5 (blueprint philosophy §2 / §6).
 */

import type {
  TradePlanEvaluationResult,
  TradePlanInput,
  TradePlanReason,
  TradePlanStatus,
} from "./trade-plan-types";
import { collectTradePlanHardGateFailures, scoreBlocksTradeReady } from "./trade-plan-gates";
import { tradePlanReason } from "./trade-plan-reasons";
import { computeTradePlanPrices, computeTradePlanRiskMetrics } from "./trade-plan-targets";

function resolvedScore(input: TradePlanInput): number | undefined {
  const s = input.score;
  if (!s) return undefined;
  if (s.scoreResult != null) return s.scoreResult.total;
  return s.totalScore;
}

function parseIso(s: string | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function zoneExpired(zone: { expiresAt?: string }, evalIso?: string, forced?: boolean): boolean {
  if (forced) return true;
  const exp = zone.expiresAt;
  if (!exp) return false;
  const te = parseIso(evalIso);
  const tx = Date.parse(exp);
  if (te == null || !Number.isFinite(tx)) return false;
  return te > tx;
}

function zoneInvalidated(
  zone: { direction: "BUY" | "SELL"; invalidationPrice: number },
  price: number | undefined,
  forced?: boolean,
): boolean {
  if (forced) return true;
  if (price == null || !Number.isFinite(price)) return false;
  if (zone.direction === "BUY") return price <= zone.invalidationPrice;
  return price >= zone.invalidationPrice;
}

function buildSummary(params: {
  symbol: string;
  direction: "BUY" | "SELL";
  status: TradePlanStatus;
  sweepNarrative?: string;
  retest: boolean;
  confirmed: boolean;
  gatesOk: boolean;
  rrOk?: boolean;
}): string {
  const dir = params.direction === "BUY" ? "buy" : "sell";
  let s = `${params.symbol} has a possible ${dir} zone. `;
  if (params.sweepNarrative) s += params.sweepNarrative + " ";
  if (!params.retest) {
    s += "No retest of the zone yet. ";
    return s.trim();
  }
  s += "Retest happened. ";
  if (!params.confirmed) {
    s += "Confirmation is not present yet. ";
    return s.trim();
  }
  s += "Confirmation is present. ";
  if (!params.gatesOk) {
    s += "Account or risk gates block trade-ready review. ";
    return s.trim();
  }
  if (params.rrOk === false) {
    s += "R:R is below minimum. ";
    return s.trim();
  }
  if (params.status === "TRADE_READY") {
    s += "Risk/R:R is acceptable and account guard allows review. Status: TRADE_READY (review only).";
  } else {
    s += `Status: ${params.status}.`;
  }
  return s.trim();
}

function sweepNarrative(status: string | undefined): string | undefined {
  if (status === "CONFIRMED_SWEEP") return "Liquidity sweep confirmed relative to pool.";
  if (status === "NEAR_SWEEP") return "Price approached liquidity (near sweep) without full sweep confirmation.";
  return undefined;
}

export function evaluateTradeReviewPlan(input: TradePlanInput): TradePlanEvaluationResult {
  const settings = input.tradePlanSettings;
  const reasons: TradePlanReason[] = [];
  const noTradeReasons: TradePlanReason[] = [];

  if (!input.zoneCandidate) {
    const rs = [tradePlanReason("NO_ZONE")];
    return {
      plan: {
        status: "NO_TRADE",
        action: "NO_TRADE",
        direction: "BUY",
        canonicalSymbol: "",
        zoneId: "",
        targetModel: settings.targetModel,
        entryAreaLow: 0,
        entryAreaHigh: 0,
        referenceEntryPrice: 0,
        stopLoss: null,
        takeProfit: null,
        metrics: null,
        reasons: rs,
        noTradeReasons: rs,
        failedHardGates: [],
        simpleSummary: "No zone candidate to evaluate.",
        reviewReady: false,
      },
      passedHardGatesForTradeReady: false,
      failedHardGates: [],
    };
  }

  const zone = input.zoneCandidate;
  const sym = input.symbolProfile;
  const spreadPrice = input.spreadPrice ?? sym?.spreadPrice ?? NaN;

  if (input.zoneMarkedUsed) {
    return finalizeLifecycle(zone, input, "USED", [tradePlanReason("ZONE_USED")], settings, "Zone has been marked used.");
  }

  if (zoneExpired(zone, input.evaluationTimeIso, input.zoneMarkedExpired)) {
    return finalizeLifecycle(zone, input, "EXPIRED", [tradePlanReason("ZONE_EXPIRED")], settings, "Zone expired.");
  }

  if (zoneInvalidated(zone, input.currentPrice, input.zoneMarkedInvalidated)) {
    return finalizeLifecycle(
      zone,
      input,
      "INVALIDATED",
      [tradePlanReason("ZONE_INVALIDATED")],
      settings,
      "Invalidation level breached.",
    );
  }

  if (!input.retestResult.retested) {
    reasons.push(tradePlanReason("WAITING_FOR_RETEST"));
    return assemble(
      zone,
      sym,
      "WAIT_RETEST",
      reasons,
      [],
      null,
      null,
      undefined,
      input,
      settings,
      spreadPrice,
      false,
      [],
    );
  }

  if (settings.requireConfirmationForTradeReady && !input.confirmationResult.confirmed) {
    reasons.push(tradePlanReason("WAITING_FOR_CONFIRMATION"));
    return assemble(
      zone,
      sym,
      "WAIT_CONFIRMATION",
      reasons,
      [],
      null,
      null,
      undefined,
      input,
      settings,
      spreadPrice,
      false,
      [],
    );
  }

  if (!sym) {
    const nt = [tradePlanReason("MISSING_SYMBOL_PROFILE")];
    return assemble(
      zone,
      sym,
      "NO_TRADE",
      nt,
      nt,
      null,
      null,
      undefined,
      input,
      settings,
      spreadPrice,
      false,
      ["SYMBOL_PROFILE_MISSING"],
    );
  }

  const atr = input.confirmationAtr;
  if (atr == null || atr <= 0) {
    const nt = [tradePlanReason("MISSING_ATR_FOR_PLAN")];
    return assemble(
      zone,
      sym,
      "NO_TRADE",
      nt,
      nt,
      null,
      null,
      undefined,
      input,
      settings,
      spreadPrice,
      false,
      ["CONFIRMATION_ATR_MISSING"],
    );
  }

  let refFallback = false;
  let confirmationClose = input.confirmationClose;
  if (
    settings.referenceEntryMode === "CONFIRMATION_CLOSE" &&
    (confirmationClose == null || !Number.isFinite(confirmationClose))
  ) {
    confirmationClose = zone.midpoint;
    refFallback = true;
  }

  const prices = computeTradePlanPrices({
    zone,
    symbolProfile: sym,
    confirmationAtr: atr,
    spreadPrice,
    settings,
    sweepLow: input.sweep?.sweepLow,
    sweepHigh: input.sweep?.sweepHigh,
    confirmationClose,
  });

  if (refFallback) {
    reasons.push(tradePlanReason("REFERENCE_ENTRY_FALLBACK_MIDPOINT"));
  }

  const metrics = computeTradePlanRiskMetrics({
    symbolProfile: sym,
    direction: zone.direction,
    referenceEntryPrice: prices.referenceEntryPrice,
    stopLoss: prices.stopLoss,
    takeProfit: prices.takeProfit,
  });

  const gateCtx = {
    input,
    zone,
    settings,
    spreadPrice,
    stopLoss: prices.stopLoss,
    takeProfit: prices.takeProfit,
    referenceEntryPrice: prices.referenceEntryPrice,
    confirmationAtr: atr,
  };
  const gateFailures = collectTradePlanHardGateFailures(gateCtx);

  const scoreTotal = resolvedScore(input);
  const sweepStatus = input.sweep?.sweepStatus;
  const nearBlocks =
    sweepStatus === "NEAR_SWEEP" && !settings.allowNearSweepTradeReady;

  if (gateFailures.length > 0) {
    for (const g of gateFailures) {
      noTradeReasons.push(...hardGateToReasons(g));
    }
    return assemble(
      zone,
      sym,
      "NO_TRADE",
      noTradeReasons,
      noTradeReasons,
      prices,
      metrics,
      undefined,
      input,
      settings,
      spreadPrice,
      false,
      gateFailures,
    );
  }

  if (scoreBlocksTradeReady(scoreTotal, settings)) {
    reasons.push(tradePlanReason("SCORE_BELOW_MINIMUM"));
    reasons.push(tradePlanReason("ZONE_VALID"));
    return assemble(
      zone,
      sym,
      "OBSERVE",
      reasons,
      [],
      prices,
      metrics,
      scoreTotal,
      input,
      settings,
      spreadPrice,
      false,
      [],
    );
  }

  if (nearBlocks) {
    reasons.push(tradePlanReason("NEAR_SWEEP_NOT_TRADE_READY"));
    reasons.push(tradePlanReason("ZONE_VALID"));
    return assemble(
      zone,
      sym,
      "OBSERVE",
      reasons,
      [],
      prices,
      metrics,
      scoreTotal,
      input,
      settings,
      spreadPrice,
      false,
      [],
    );
  }

  reasons.push(tradePlanReason("ZONE_VALID"));
  reasons.push(tradePlanReason("TRADE_READY_REVIEW_ONLY"));
  return assemble(
    zone,
    sym,
    "TRADE_READY",
    reasons,
    [],
    prices,
    metrics,
    scoreTotal,
    input,
    settings,
    spreadPrice,
    true,
    [],
  );
}

function hardGateToReasons(g: import("./trade-plan-types").TradePlanHardGate): TradePlanReason[] {
  switch (g) {
    case "SYMBOL_PROFILE_MISSING":
      return [tradePlanReason("MISSING_SYMBOL_PROFILE")];
    case "RR_BELOW_MINIMUM":
      return [tradePlanReason("RR_BELOW_MINIMUM")];
    case "SPREAD_NOT_ALLOWED":
      return [tradePlanReason("SPREAD_NOT_ALLOWED")];
    case "SPREAD_ABOVE_MAX":
      return [tradePlanReason("SPREAD_TOO_HIGH")];
    case "DAILY_DRAWDOWN_BLOCKED":
      return [tradePlanReason("ACCOUNT_BLOCKED_DAILY_DRAWDOWN")];
    case "MAX_DRAWDOWN_BLOCKED":
      return [tradePlanReason("ACCOUNT_BLOCKED_MAX_DRAWDOWN")];
    case "MAX_TRADES_REACHED":
      return [tradePlanReason("ACCOUNT_MAX_TRADES")];
    case "NEWS_BLACKOUT":
      return [tradePlanReason("ACCOUNT_NEWS_BLACKOUT")];
    case "PROP_FIRM_BLOCKED":
      return [tradePlanReason("ACCOUNT_PROP_BLOCKED")];
    case "PSYCHOLOGICAL_LOCK":
      return [tradePlanReason("ACCOUNT_PSYCHOLOGICAL_LOCK")];
    case "TRADE_REVIEW_NOT_ALLOWED":
      return [tradePlanReason("ACCOUNT_REVIEW_DISABLED")];
    case "OPERATIONAL_STATUS_BLOCKS":
      return [tradePlanReason("OPERATIONAL_STATUS_BLOCKS")];
    case "ACCOUNT_ID_REQUIRED":
      return [tradePlanReason("ACCOUNT_ID_REQUIRED")];
    case "APPROVED_PARAMETER_SET_REQUIRED":
      return [tradePlanReason("PARAMETER_SET_NOT_APPROVED")];
    case "CONFIRMATION_ATR_MISSING":
      return [tradePlanReason("MISSING_ATR_FOR_PLAN")];
    case "SL_DISTANCE_ABOVE_MAX_ATR":
      return [tradePlanReason("SL_DISTANCE_TOO_WIDE")];
    default:
      return [{ code: g, messageSimple: `Blocked: ${g}` }];
  }
}

function finalizeLifecycle(
  zone: import("./zone-candidate").ZoneCandidate,
  input: TradePlanInput,
  status: TradePlanStatus,
  reasons: TradePlanReason[],
  settings: import("./trade-plan-settings").TradePlanEvaluationSettings,
  summary: string,
): TradePlanEvaluationResult {
  return {
    plan: {
      status,
      action: status,
      direction: zone.direction,
      canonicalSymbol: zone.canonicalSymbol,
      zoneId: zone.zoneId,
      strategyId: input.strategyId ?? zone.strategyId,
      parameterSetId: input.parameterSetId ?? zone.parameterSetId,
      accountId: input.accountId,
      targetModel: settings.targetModel,
      entryAreaLow: zone.zoneLow,
      entryAreaHigh: zone.zoneHigh,
      referenceEntryPrice: zone.midpoint,
      stopLoss: null,
      takeProfit: null,
      metrics: null,
      reasons,
      noTradeReasons: [],
      failedHardGates: [],
      simpleSummary: summary,
      reviewReady: false,
    },
    passedHardGatesForTradeReady: false,
    failedHardGates: [],
  };
}

function assemble(
  zone: import("./zone-candidate").ZoneCandidate,
  sym: import("./symbol-profile").SymbolMarketSpec | null,
  status: TradePlanStatus,
  reasons: TradePlanReason[],
  noTradeReasons: TradePlanReason[],
  prices: ReturnType<typeof computeTradePlanPrices> | null,
  metrics: ReturnType<typeof computeTradePlanRiskMetrics> | null,
  scoreTotal: number | undefined,
  input: TradePlanInput,
  settings: import("./trade-plan-settings").TradePlanEvaluationSettings,
  spreadPrice: number,
  reviewReady: boolean,
  failedHardGates: import("./trade-plan-types").TradePlanHardGate[],
): TradePlanEvaluationResult {
  const sweepSt = input.sweep?.sweepStatus;
  const summary = buildSummary({
    symbol: zone.canonicalSymbol,
    direction: zone.direction,
    status,
    sweepNarrative: sweepNarrative(sweepSt),
    retest: input.retestResult.retested,
    confirmed: input.confirmationResult.confirmed,
    gatesOk: failedHardGates.length === 0,
    rrOk: metrics == null ? undefined : metrics.rr >= settings.minRr,
  });

  return {
    plan: {
      status,
      action: status,
      direction: zone.direction,
      canonicalSymbol: zone.canonicalSymbol,
      zoneId: zone.zoneId,
      strategyId: input.strategyId ?? zone.strategyId,
      parameterSetId: input.parameterSetId ?? zone.parameterSetId,
      accountId: input.accountId,
      targetModel: settings.targetModel,
      entryAreaLow: prices?.entryAreaLow ?? zone.zoneLow,
      entryAreaHigh: prices?.entryAreaHigh ?? zone.zoneHigh,
      referenceEntryPrice: prices?.referenceEntryPrice ?? zone.midpoint,
      stopLoss: prices?.stopLoss ?? null,
      takeProfit: prices?.takeProfit ?? null,
      metrics,
      reasons,
      noTradeReasons,
      failedHardGates,
      simpleSummary: summary,
      reviewReady,
    },
    passedHardGatesForTradeReady: reviewReady && failedHardGates.length === 0,
    failedHardGates,
  };
}
