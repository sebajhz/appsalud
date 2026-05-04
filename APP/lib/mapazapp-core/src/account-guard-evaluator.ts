import type {
  AccountGuardInput,
  AccountGuardKeyMetrics,
  AccountGuardReason,
  AccountGuardReasonCode,
  AccountGuardResult,
  AccountGuardSettings,
  AccountGuardStatus,
} from "./account-guard-types";
import { accountGuardReason } from "./account-guard-reasons";
import type { TradePlanAccountGuardInput } from "./trade-plan-types";

function isFiniteNonNeg(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function validateRiskSnapshot(r: AccountGuardInput["risk"]): boolean {
  const required = [
    r.balance,
    r.equity,
    r.dailyStartBalance,
    r.dailyStartEquity,
    r.dailyLossLimitAmount,
    r.dailyLossUsedAmount,
    r.dailyLossRemainingAmount,
    r.maxLossLimitAmount,
    r.maxLossUsedAmount,
    r.maxLossRemainingAmount,
    r.riskPerTradePercent,
    r.tradesTakenToday,
    r.maxTradesPerDay,
  ];
  if (!required.every(isFiniteNonNeg)) return false;
  if (r.openRiskAmount != null && (!Number.isFinite(r.openRiskAmount) || r.openRiskAmount < 0)) return false;
  if (!(r.dailyLossLimitAmount > 0) || !(r.maxLossLimitAmount > 0)) return false;
  return true;
}

function computeMetrics(r: AccountGuardInput["risk"]): AccountGuardKeyMetrics {
  const dailyLossUsedPercent =
    r.dailyLossLimitAmount > 0 ? (r.dailyLossUsedAmount / r.dailyLossLimitAmount) * 100 : 0;
  const maxLossUsedPercent = r.maxLossLimitAmount > 0 ? (r.maxLossUsedAmount / r.maxLossLimitAmount) * 100 : 0;
  const tradesRemainingToday = Math.max(0, r.maxTradesPerDay - r.tradesTakenToday);
  const rawRpt = (r.equity * r.riskPerTradePercent) / 100;
  const riskPerTradeAmount = Number.isFinite(rawRpt) ? rawRpt : null;
  return {
    dailyLossUsedPercent,
    dailyLossRemainingAmount: r.dailyLossRemainingAmount,
    maxLossUsedPercent,
    maxLossRemainingAmount: r.maxLossRemainingAmount,
    tradesRemainingToday,
    riskPerTradeAmount,
  };
}

function pushBlock(map: Map<AccountGuardReasonCode, AccountGuardReason>, reason: AccountGuardReason): void {
  if (!map.has(reason.code)) map.set(reason.code, reason);
}

function reasonCodeToStatus(code: AccountGuardReasonCode): AccountGuardStatus {
  switch (code) {
    case "MISSING_ACCOUNT_ID":
    case "MISSING_RISK_SNAPSHOT":
    case "MISSING_PROP_RULE_SNAPSHOT":
      return "INSUFFICIENT_ACCOUNT_DATA";
    case "PARAMETER_SET_NOT_APPROVED_FOR_ACCOUNT":
      return "BLOCKED_NO_APPROVED_PARAMETER_SET";
    case "PROP_FIRM_RULE_BLOCKED":
      return "BLOCKED_PROP_FIRM";
    case "DAILY_DRAWDOWN_BLOCKED":
      return "BLOCKED_DAILY_DRAWDOWN";
    case "MAX_DRAWDOWN_BLOCKED":
      return "BLOCKED_MAX_DRAWDOWN";
    case "MAX_TRADES_REACHED":
      return "BLOCKED_MAX_TRADES";
    case "NEWS_BLACKOUT_ACTIVE":
      return "BLOCKED_NEWS";
    case "PSYCHOLOGICAL_LOCK_ACTIVE":
      return "BLOCKED_PSYCHOLOGY";
    case "BRIDGE_DISCONNECTED":
      return "BLOCKED_BRIDGE";
    case "BRIDGE_DISCONNECTED_WARNING":
      return "ACCOUNT_OK";
    case "ACCOUNT_WATCH_ONLY":
      return "WATCH_ONLY";
    case "ACCOUNT_STATUS_BLOCKED":
      return "BLOCKED_ACCOUNT_STATUS";
    default:
      return "BLOCKED_ACCOUNT_STATUS";
  }
}

const STATUS_PRIORITY: AccountGuardStatus[] = [
  "INSUFFICIENT_ACCOUNT_DATA",
  "BLOCKED_NO_APPROVED_PARAMETER_SET",
  "BLOCKED_PROP_FIRM",
  "BLOCKED_DAILY_DRAWDOWN",
  "BLOCKED_MAX_DRAWDOWN",
  "BLOCKED_MAX_TRADES",
  "BLOCKED_NEWS",
  "BLOCKED_PSYCHOLOGY",
  "BLOCKED_BRIDGE",
  "WATCH_ONLY",
  "BLOCKED_ACCOUNT_STATUS",
];

function pickStatus(blocking: AccountGuardReason[]): AccountGuardStatus {
  if (blocking.length === 0) return "ACCOUNT_OK";
  const set = new Set(blocking.map((b) => reasonCodeToStatus(b.code)));
  for (const s of STATUS_PRIORITY) {
    if (set.has(s)) return s;
  }
  return "BLOCKED_ACCOUNT_STATUS";
}

function summarize(blocking: AccountGuardReason[], warnings: AccountGuardReason[]): { simple: string; technical: string } {
  if (blocking.length === 0 && warnings.length === 0) {
    return { simple: "Account guard OK for trade review eligibility.", technical: "ACCOUNT_OK" };
  }
  if (blocking.length > 0) {
    const simple = blocking
      .slice(0, 2)
      .map((b) => b.messageSimple)
      .join(" ");
    const technical = blocking.map((b) => b.code).join("; ");
    return { simple, technical };
  }
  const simple = `Account OK with warnings: ${warnings.map((w) => w.messageSimple).join(" ")}`;
  const technical = warnings.map((w) => w.code).join("; ");
  return { simple, technical };
}

/**
 * Pure account / risk / prop-firm guard for **trade review eligibility** (not execution).
 */
export function evaluateAccountGuard(input: AccountGuardInput, settings: AccountGuardSettings): AccountGuardResult {
  const blockMap = new Map<AccountGuardReasonCode, AccountGuardReason>();
  const warnList: AccountGuardReason[] = [];

  if (!input.accountId?.trim()) {
    pushBlock(blockMap, accountGuardReason("MISSING_ACCOUNT_ID", "blocking"));
    const blocking = [...blockMap.values()];
    return finalize(input.accountId ?? "", blocking, warnList, null);
  }

  if (!validateRiskSnapshot(input.risk)) {
    pushBlock(blockMap, accountGuardReason("MISSING_RISK_SNAPSHOT", "blocking"));
    const blocking = [...blockMap.values()];
    return finalize(input.accountId, blocking, warnList, null);
  }

  if (settings.requirePropFirmSnapshot && !input.prop) {
    pushBlock(blockMap, accountGuardReason("MISSING_PROP_RULE_SNAPSHOT", "blocking"));
    const blocking = [...blockMap.values()];
    return finalize(input.accountId, blocking, warnList, null);
  }

  const metrics = computeMetrics(input.risk);
  const op = input.operationalStatus;

  if (settings.requireApprovedParameterSet && !input.approvedParameterSetForAccount) {
    pushBlock(blockMap, accountGuardReason("PARAMETER_SET_NOT_APPROVED_FOR_ACCOUNT", "blocking"));
  }

  if (input.prop?.propFirmBlocked === true) {
    pushBlock(blockMap, accountGuardReason("PROP_FIRM_RULE_BLOCKED", "blocking"));
  }

  if (input.tradingAllowed === false) {
    pushBlock(
      blockMap,
      accountGuardReason("ACCOUNT_STATUS_BLOCKED", "blocking", {
        messageTechnical: "tradingAllowed false on account snapshot",
      }),
    );
  }

  if (op === "WATCH_ONLY" && !settings.allowWatchOnlyReview) {
    pushBlock(blockMap, accountGuardReason("ACCOUNT_WATCH_ONLY", "blocking"));
  }

  const newsActive = op === "BLOCKED_NEWS" || input.newsBlackout === true;
  if (newsActive && !settings.allowNewsReview) {
    pushBlock(blockMap, accountGuardReason("NEWS_BLACKOUT_ACTIVE", "blocking"));
  }

  if (op === "BLOCKED_PSYCHOLOGY" || input.psychologicalLock === true) {
    pushBlock(blockMap, accountGuardReason("PSYCHOLOGICAL_LOCK_ACTIVE", "blocking"));
  }

  if (settings.requireBridgeForReview && input.bridgeConnected === false) {
    pushBlock(blockMap, accountGuardReason("BRIDGE_DISCONNECTED", "blocking"));
  } else if (!settings.requireBridgeForReview && input.bridgeConnected === false) {
    warnList.push(accountGuardReason("BRIDGE_DISCONNECTED_WARNING", "warning"));
  }

  if (op === "BLOCKED_MAX_TRADES" || input.risk.tradesTakenToday >= input.risk.maxTradesPerDay) {
    pushBlock(blockMap, accountGuardReason("MAX_TRADES_REACHED", "blocking"));
  }

  const dailyNumericBlocked =
    input.risk.dailyLossRemainingAmount <= 0 ||
    (input.risk.dailyLossLimitAmount > 0 && input.risk.dailyLossUsedAmount >= input.risk.dailyLossLimitAmount);
  if (op === "BLOCKED_DAILY_DRAWDOWN" || dailyNumericBlocked) {
    pushBlock(blockMap, accountGuardReason("DAILY_DRAWDOWN_BLOCKED", "blocking"));
  }

  const maxNumericBlocked =
    input.risk.maxLossRemainingAmount <= 0 ||
    (input.risk.maxLossLimitAmount > 0 && input.risk.maxLossUsedAmount >= input.risk.maxLossLimitAmount);
  if (op === "BLOCKED_MAX_DRAWDOWN" || maxNumericBlocked) {
    pushBlock(blockMap, accountGuardReason("MAX_DRAWDOWN_BLOCKED", "blocking"));
  }

  if (op === "BLOCKED_CONSISTENCY") {
    pushBlock(
      blockMap,
      accountGuardReason("ACCOUNT_STATUS_BLOCKED", "blocking", {
        messageSimple: "Consistency rule blocks trade review for this account.",
        messageTechnical: "operationalStatus BLOCKED_CONSISTENCY",
      }),
    );
  }

  if (op === "NO_APPROVED_PARAMETER_SET" && settings.requireApprovedParameterSet) {
    pushBlock(blockMap, accountGuardReason("PARAMETER_SET_NOT_APPROVED_FOR_ACCOUNT", "blocking"));
  }

  const blocking = [...blockMap.values()];

  if (blocking.length === 0) {
    if (
      metrics.dailyLossUsedPercent >= settings.dailyDrawdownWarningPercent &&
      !dailyNumericBlocked &&
      op !== "BLOCKED_DAILY_DRAWDOWN"
    ) {
      warnList.push(accountGuardReason("DAILY_DRAWDOWN_NEAR_LIMIT_WARNING", "warning"));
    }
    if (
      metrics.maxLossUsedPercent >= settings.maxDrawdownWarningPercent &&
      !maxNumericBlocked &&
      op !== "BLOCKED_MAX_DRAWDOWN"
    ) {
      warnList.push(accountGuardReason("MAX_DRAWDOWN_NEAR_LIMIT_WARNING", "warning"));
    }
    if (metrics.tradesRemainingToday === 1 && op !== "BLOCKED_MAX_TRADES") {
      warnList.push(accountGuardReason("TRADES_REMAINING_LOW_WARNING", "warning"));
    }
    const open = input.risk.openRiskAmount;
    if (
      open != null &&
      input.risk.dailyLossRemainingAmount > 0 &&
      open >= input.risk.dailyLossRemainingAmount * 0.5 &&
      !dailyNumericBlocked
    ) {
      warnList.push(accountGuardReason("RISK_REMAINING_LOW_WARNING", "warning"));
    }
  }

  return finalize(input.accountId, blocking, warnList, metrics);
}

function finalize(
  accountId: string,
  blocking: AccountGuardReason[],
  warnings: AccountGuardReason[],
  metrics: AccountGuardKeyMetrics | null,
): AccountGuardResult {
  const allowTradeReview = blocking.length === 0;
  const status = pickStatus(blocking);
  const { simple, technical } = summarize(blocking, warnings);
  return {
    accountId,
    status,
    allowTradeReview,
    blockingReasons: blocking,
    warningReasons: warnings,
    simpleSummary: simple,
    technicalSummary: technical,
    metrics,
  };
}

/**
 * Maps `AccountGuardResult` + original input into the legacy `TradePlanAccountGuardInput` shape
 * consumed by `collectTradePlanHardGateFailures`.
 */
export function accountGuardResultToTradePlanAccountGuardInput(
  input: AccountGuardInput,
  result: AccountGuardResult,
): TradePlanAccountGuardInput {
  const codes = new Set(result.blockingReasons.map((b) => b.code));
  const dailyBlocked = codes.has("DAILY_DRAWDOWN_BLOCKED");
  const maxBlocked = codes.has("MAX_DRAWDOWN_BLOCKED");
  const maxTrades = codes.has("MAX_TRADES_REACHED");
  const news = codes.has("NEWS_BLACKOUT_ACTIVE");
  const prop = codes.has("PROP_FIRM_RULE_BLOCKED");
  const psych = codes.has("PSYCHOLOGICAL_LOCK_ACTIVE");

  let operationalStatus = input.operationalStatus;
  if (codes.has("BRIDGE_DISCONNECTED")) {
    operationalStatus = "BRIDGE_DISCONNECTED";
  }

  return {
    accountId: input.accountId,
    operationalStatus,
    dailyDrawdownBlocked: dailyBlocked,
    maxDrawdownBlocked: maxBlocked,
    maxTradesReached: maxTrades,
    newsBlackout: news,
    propFirmBlocked: prop,
    psychologicalLock: psych,
    approvedParameterSetForAccount: input.approvedParameterSetForAccount,
    spreadAllowed: input.spreadAllowed ?? true,
    accountMode: input.accountMode,
    allowTradeReview: result.allowTradeReview,
  };
}
