import type { TradePlanHardGate, TradePlanInput } from "./trade-plan-types";
import type { ZoneCandidate } from "./zone-candidate";
import type { TradePlanEvaluationSettings } from "./trade-plan-settings";
import { computeTradePlanRiskMetrics } from "./trade-plan-targets";

const BLOCKING_OPERATIONAL = new Set<string>([
  "WATCH_ONLY",
  "BLOCKED_DAILY_DRAWDOWN",
  "BLOCKED_MAX_DRAWDOWN",
  "BLOCKED_NEWS",
  "BLOCKED_MAX_TRADES",
  "BLOCKED_CONSISTENCY",
  "BLOCKED_PSYCHOLOGY",
  "BRIDGE_DISCONNECTED",
  "NO_APPROVED_PARAMETER_SET",
]);

export interface TradePlanGateContext {
  input: TradePlanInput;
  zone: ZoneCandidate;
  settings: TradePlanEvaluationSettings;
  spreadPrice: number;
  /** When computed */
  stopLoss: number | null;
  takeProfit: number | null;
  referenceEntryPrice: number | null;
  confirmationAtr: number | null;
}

export function collectTradePlanHardGateFailures(ctx: TradePlanGateContext): TradePlanHardGate[] {
  const failed: TradePlanHardGate[] = [];
  const { input, zone, settings, spreadPrice } = ctx;
  const guard = input.accountGuard;

  if (!input.symbolProfile) failed.push("SYMBOL_PROFILE_MISSING");
  if (!Number.isFinite(zone.invalidationPrice)) failed.push("INVALIDATION_PRICE_INVALID");

  if (settings.requireApprovedParameterSet && !settings.testOrDevMode) {
    const ok = guard?.approvedParameterSetForAccount === true;
    if (!ok) failed.push("APPROVED_PARAMETER_SET_REQUIRED");
  }

  if (settings.requireAccountIdForGuard && !input.accountId?.trim()) {
    failed.push("ACCOUNT_ID_REQUIRED");
  }

  if (guard) {
    if (guard.allowTradeReview === false) failed.push("TRADE_REVIEW_NOT_ALLOWED");
    if (guard.dailyDrawdownBlocked) failed.push("DAILY_DRAWDOWN_BLOCKED");
    if (guard.maxDrawdownBlocked) failed.push("MAX_DRAWDOWN_BLOCKED");
    if (guard.maxTradesReached) failed.push("MAX_TRADES_REACHED");
    if (guard.propFirmBlocked) failed.push("PROP_FIRM_BLOCKED");
    if (guard.newsBlackout) failed.push("NEWS_BLACKOUT");
    if (guard.psychologicalLock) failed.push("PSYCHOLOGICAL_LOCK");
    if (guard.spreadAllowed === false) failed.push("SPREAD_NOT_ALLOWED");
    const op = guard.operationalStatus;
    if (op && BLOCKING_OPERATIONAL.has(op)) {
      failed.push("OPERATIONAL_STATUS_BLOCKS");
    }
  }

  if (settings.maxSpreadPrice != null && Number.isFinite(settings.maxSpreadPrice)) {
    if (spreadPrice > settings.maxSpreadPrice) failed.push("SPREAD_ABOVE_MAX");
  }

  if (ctx.confirmationAtr == null || ctx.confirmationAtr <= 0) {
    failed.push("CONFIRMATION_ATR_MISSING");
  }

  if (
    ctx.stopLoss != null &&
    ctx.takeProfit != null &&
    ctx.referenceEntryPrice != null &&
    input.symbolProfile &&
    ctx.confirmationAtr != null &&
    ctx.confirmationAtr > 0
  ) {
    const m = computeTradePlanRiskMetrics({
      symbolProfile: input.symbolProfile,
      direction: zone.direction,
      referenceEntryPrice: ctx.referenceEntryPrice,
      stopLoss: ctx.stopLoss,
      takeProfit: ctx.takeProfit,
    });
    if (m.rr < settings.minRr) failed.push("RR_BELOW_MINIMUM");
    const slAtr = m.slDistancePrice / ctx.confirmationAtr;
    if (slAtr > settings.maxSlAtr) failed.push("SL_DISTANCE_ABOVE_MAX_ATR");
  }

  return dedupe(failed);
}

/** Gates that block TRADE_READY when score is otherwise OK (evaluator applies separately). */
export function scoreBlocksTradeReady(
  totalScore: number | undefined,
  settings: TradePlanEvaluationSettings,
): boolean {
  if (totalScore == null || !Number.isFinite(totalScore)) return true;
  return totalScore < settings.minScoreTrade;
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
