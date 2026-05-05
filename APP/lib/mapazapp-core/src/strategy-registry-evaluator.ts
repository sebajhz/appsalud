import type { AccountId } from "./ids";
import type {
  ParameterSetCompatibilityInput,
  ParameterSetCompatibilityResult,
  ParameterSetRegistry,
  ParameterSetStatus,
  ParameterSetBlockReason,
  ParameterSetWarningReason,
  ParameterSetRequestedUsage,
} from "./strategy-registry-types";
import {
  createDefaultStrategyRegistryEvaluationSettings,
  type StrategyRegistryEvaluationSettings,
} from "./strategy-registry-settings";
import { parameterSetBlockMessage, parameterSetWarningMessage } from "./strategy-registry-reasons";

function pushBlock(list: ParameterSetBlockReason[], code: ParameterSetBlockReason): void {
  if (!list.includes(code)) list.push(code);
}

function pushWarn(list: ParameterSetWarningReason[], code: ParameterSetWarningReason): void {
  if (!list.includes(code)) list.push(code);
}

function summarize(blocking: ParameterSetBlockReason[], warnings: ParameterSetWarningReason[]): {
  simple: string;
  technical: string;
} {
  if (blocking.length === 0 && warnings.length === 0) {
    return { simple: "Registry checks passed for requested usage.", technical: "REGISTRY_OK" };
  }
  if (blocking.length > 0) {
    return {
      simple: blocking.slice(0, 2).map((b) => parameterSetBlockMessage(b)).join(" "),
      technical: blocking.join("; "),
    };
  }
  return {
    simple: warnings.map((w) => parameterSetWarningMessage(w)).join(" "),
    technical: warnings.join("; "),
  };
}

/** Blocks TRADE_READY-style review only — alerts may still be allowed (e.g. approved_for_alerts, validated). */
function tradeReviewOnlyBlock(st: ParameterSetStatus): ParameterSetBlockReason | null {
  switch (st) {
    case "approved_for_trade_review":
      return null;
    case "approved_for_alerts":
      return "PARAMETER_SET_ALERTS_ONLY";
    case "draft":
      return "PARAMETER_SET_DRAFT";
    case "tested_train":
    case "validated":
    case "approved_for_demo":
      return "PARAMETER_SET_NOT_VALIDATED";
    case "rejected":
      return "PARAMETER_SET_REJECTED";
    case "retired":
      return "PARAMETER_SET_RETIRED";
    default:
      return "PARAMETER_SET_NOT_VALIDATED";
  }
}

function statusAllowsAlert(st: ParameterSetStatus): boolean {
  if (st === "draft" || st === "rejected" || st === "retired") return false;
  return (
    st === "approved_for_alerts" ||
    st === "approved_for_trade_review" ||
    st === "approved_for_demo" ||
    st === "validated" ||
    st === "tested_train"
  );
}

function statusAllowsBacktest(st: ParameterSetStatus): boolean {
  return st !== "rejected" && st !== "retired";
}

/**
 * Pure registry / parameter-set compatibility for a single (strategy, parameter set, symbol, account) tuple.
 */
export function evaluateParameterSetCompatibility(
  input: ParameterSetCompatibilityInput,
  settings: StrategyRegistryEvaluationSettings = createDefaultStrategyRegistryEvaluationSettings(),
): ParameterSetCompatibilityResult {
  const { strategyRegistry, strategyId, parameterSetId, canonicalSymbol, brokerSymbol, accountId, requestedUsage } =
    input;

  const structural: ParameterSetBlockReason[] = [];
  const warnings: ParameterSetWarningReason[] = [];

  const strategy = strategyRegistry.strategies.find((s) => s.strategyId === strategyId) ?? null;
  const parameterSet = strategyRegistry.parameterSets.find((p) => p.parameterSetId === parameterSetId) ?? null;

  if (!strategy) {
    pushBlock(structural, "STRATEGY_NOT_FOUND");
  } else if (strategy.status === "retired" || strategy.status === "draft" || strategy.status === "paused") {
    pushBlock(structural, "STRATEGY_NOT_ACTIVE");
  }

  if (!parameterSet) {
    pushBlock(structural, "PARAMETER_SET_NOT_FOUND");
  } else {
    if (parameterSet.strategyId !== strategyId) {
      pushBlock(structural, "STRATEGY_NOT_FOUND");
    }
    if (parameterSet.canonicalSymbol !== canonicalSymbol) {
      pushBlock(structural, "PARAMETER_SET_SYMBOL_MISMATCH");
    }

    if (parameterSet.brokerSymbol?.trim()) {
      const setBr = parameterSet.brokerSymbol.trim();
      const incoming = brokerSymbol?.trim();
      if (!incoming && settings.warnWhenSetBrokerSymbolButCallerBrokerMissing) {
        pushWarn(warnings, "PARAMETER_SET_BROKER_SYMBOL_UNSPECIFIED");
      } else if (incoming && setBr !== incoming && settings.blockOnBrokerSymbolMismatch) {
        pushBlock(structural, "PARAMETER_SET_BROKER_SYMBOL_MISMATCH");
      }
    }

    if (parameterSet.blockedAccountIds.includes(accountId)) {
      pushBlock(structural, "PARAMETER_SET_ACCOUNT_BLOCKED");
    }

    if (parameterSet.allowedAccountIds.length > 0 && !parameterSet.allowedAccountIds.includes(accountId)) {
      pushBlock(structural, "PARAMETER_SET_ACCOUNT_NOT_ALLOWED");
    }

    if (parameterSet.status === "approved_for_demo") {
      pushWarn(warnings, "PARAMETER_SET_DEMO_APPROVAL_ONLY");
    }

    if (structural.length === 0 && parameterSet.status === "approved_for_trade_review") {
      pushWarn(warnings, "PARAMETER_SET_APPROVED_FOR_TRADE_REVIEW");
    }
  }

  const tradeReviewBlock = parameterSet ? tradeReviewOnlyBlock(parameterSet.status) : null;
  const blockingReasons: ParameterSetBlockReason[] = [...structural, ...(tradeReviewBlock ? [tradeReviewBlock] : [])];

  const { simple, technical } = summarize(blockingReasons, warnings);

  const st: ParameterSetStatus | "unknown" = parameterSet?.status ?? "unknown";
  const approvalLevel = parameterSet?.approvalLevel ?? "none";

  const symbolMismatch = structural.includes("PARAMETER_SET_SYMBOL_MISMATCH");
  const brokerMismatch = structural.includes("PARAMETER_SET_BROKER_SYMBOL_MISMATCH");
  const accountBlock = structural.includes("PARAMETER_SET_ACCOUNT_BLOCKED") || structural.includes("PARAMETER_SET_ACCOUNT_NOT_ALLOWED");
  const strategyBad = structural.includes("STRATEGY_NOT_FOUND") || structural.includes("STRATEGY_NOT_ACTIVE");
  const setMissing = structural.includes("PARAMETER_SET_NOT_FOUND");

  const allowTradeReview =
    structural.length === 0 &&
    parameterSet != null &&
    tradeReviewBlock === null &&
    parameterSet.status === "approved_for_trade_review";

  const allowAlert =
    structural.length === 0 &&
    parameterSet != null &&
    statusAllowsAlert(parameterSet.status);

  let allowObserve = false;
  if (strategy && parameterSet && !symbolMismatch && !setMissing) {
    if (parameterSet.status === "rejected" || parameterSet.status === "retired") {
      allowObserve = requestedUsage === "observe";
    } else {
      allowObserve = !strategyBad && !brokerMismatch && !accountBlock;
    }
  }

  const allowBacktest =
    strategy != null &&
    strategy.status === "active" &&
    parameterSet != null &&
    structural.length === 0 &&
    statusAllowsBacktest(parameterSet.status);

  let compatible = false;
  if (requestedUsage === "trade_review") compatible = allowTradeReview;
  else if (requestedUsage === "alert") compatible = allowAlert;
  else if (requestedUsage === "observe") compatible = allowObserve;
  else if (requestedUsage === "backtest" || requestedUsage === "validation") compatible = allowBacktest && !strategyBad;

  return {
    compatible,
    allowObserve,
    allowAlert,
    allowTradeReview,
    status: st,
    approvalLevel,
    blockingReasons,
    warningReasons: [...warnings],
    parameterSet,
    strategy,
    simpleSummary: simple,
    technicalSummary: technical,
  };
}

/** True if any registered parameter set is approved for trade review for this account (headline guard). */
export function accountHasApprovedTradeReviewParameterSet(
  registry: ParameterSetRegistry,
  accountId: AccountId,
  settings?: StrategyRegistryEvaluationSettings,
): boolean {
  const evs = settings ?? createDefaultStrategyRegistryEvaluationSettings();
  return registry.parameterSets.some((ps) => {
    if (ps.status !== "approved_for_trade_review") return false;
    const r = evaluateParameterSetCompatibility(
      {
        strategyRegistry: registry,
        strategyId: ps.strategyId,
        parameterSetId: ps.parameterSetId,
        canonicalSymbol: ps.canonicalSymbol,
        brokerSymbol: undefined,
        accountId,
        requestedUsage: "trade_review",
      },
      evs,
    );
    return r.allowTradeReview;
  });
}
