import type { IfvgStrategySettings } from "./strategy-settings";
import type { AccountId, ParameterSetId, StrategyId } from "./ids";

/** Single IFVG zone-reaction product line (blueprint); do not invent new families in mock data. */
export type StrategyFamily = "IFVG_ZONE_REACTION";

export type StrategyStatus = "draft" | "active" | "paused" | "retired";

export type StrategyVersion = string;

export type ParameterSetStatus =
  | "draft"
  | "tested_train"
  | "validated"
  | "approved_for_demo"
  | "approved_for_alerts"
  | "approved_for_trade_review"
  | "retired"
  | "rejected";

export type ParameterSetApprovalLevel =
  | "none"
  | "internal"
  | "demo"
  | "alerts_only"
  | "trade_review";

export type ParameterSetRequestedUsage =
  | "observe"
  | "alert"
  | "trade_review"
  | "backtest"
  | "validation";

/** Machine codes for registry blocks (trade review / alerts). */
export type ParameterSetBlockReason =
  | "STRATEGY_NOT_FOUND"
  | "STRATEGY_NOT_ACTIVE"
  | "PARAMETER_SET_NOT_FOUND"
  | "PARAMETER_SET_DRAFT"
  | "PARAMETER_SET_NOT_VALIDATED"
  | "PARAMETER_SET_ALERTS_ONLY"
  | "PARAMETER_SET_REJECTED"
  | "PARAMETER_SET_RETIRED"
  | "PARAMETER_SET_SYMBOL_MISMATCH"
  | "PARAMETER_SET_BROKER_SYMBOL_MISMATCH"
  | "PARAMETER_SET_ACCOUNT_NOT_ALLOWED"
  | "PARAMETER_SET_ACCOUNT_BLOCKED";

export type ParameterSetWarningReason =
  | "PARAMETER_SET_BROKER_SYMBOL_UNSPECIFIED"
  | "PARAMETER_SET_DEMO_APPROVAL_ONLY"
  | "PARAMETER_SET_APPROVED_FOR_TRADE_REVIEW";

export type ParameterSetSource = "mock" | "manual" | "import_mt5_placeholder";

export interface ParameterSetUsagePolicy {
  /** Product notes only — enforcement lives in evaluator + trade plan. */
  notes?: string;
}

export interface StrategyDefinition {
  strategyId: StrategyId;
  name: string;
  version: StrategyVersion;
  family: StrategyFamily;
  description: string;
  supportedSymbols: string[];
  /** Blueprint-aligned setting groups required by this strategy. */
  requiredSettingsGroups: readonly string[];
  status: StrategyStatus;
  /** Explicit: strategy registry does not enable live execution. */
  liveTradingEnabled: false;
  notes?: string;
  usagePolicy?: ParameterSetUsagePolicy;
}

export interface ParameterSetDefinition {
  parameterSetId: ParameterSetId;
  strategyId: StrategyId;
  canonicalSymbol: string;
  /** When set, broker feed must match for trade_review (per evaluation settings). */
  brokerSymbol?: string;
  status: ParameterSetStatus;
  approvalLevel: ParameterSetApprovalLevel;
  /** Non-empty → account must be listed for trade_review / alert (per rules). */
  allowedAccountIds: AccountId[];
  blockedAccountIds: AccountId[];
  blockedReason?: string;
  settings: IfvgStrategySettings;
  source: ParameterSetSource;
  createdAt: string;
  updatedAt: string;
  validationSummary?: string;
  notes?: string;
}

export interface ParameterSetRegistry {
  strategies: StrategyDefinition[];
  parameterSets: ParameterSetDefinition[];
}

/** Placeholder for future bulk registry validation (import / CI). */
export interface StrategyRegistryResult {
  ok: boolean;
  errors: string[];
}

export interface ParameterSetCompatibilityResult {
  compatible: boolean;
  allowObserve: boolean;
  allowAlert: boolean;
  allowTradeReview: boolean;
  /** Parameter set status when found; `unknown` when parameter set row is missing. */
  status: ParameterSetStatus | "unknown";
  approvalLevel: ParameterSetApprovalLevel;
  blockingReasons: ParameterSetBlockReason[];
  warningReasons: ParameterSetWarningReason[];
  parameterSet: ParameterSetDefinition | null;
  strategy: StrategyDefinition | null;
  simpleSummary: string;
  technicalSummary: string;
}

export interface ParameterSetCompatibilityInput {
  strategyRegistry: ParameterSetRegistry;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: string;
  /** Broker symbol for the active account (optional). */
  brokerSymbol?: string | undefined;
  accountId: AccountId;
  requestedUsage: ParameterSetRequestedUsage;
}
