import type {
  AccountId,
  BacktestApprovalResult,
  BacktestEvidenceBundle,
  ParameterSetCompatibilityResult,
  ParameterSetDefinition,
  ParameterSetRequestedUsage,
  StrategyDefinition,
} from "@workspace/mapazapp-core";

/**
 * Read-only in-process registry view (checkpoint 9).
 * No fetch, no persistence, no editing.
 */
export interface StrategyRegistryReadModelDataSource {
  getStrategies(): StrategyDefinition[];
  getParameterSets(): ParameterSetDefinition[];
  /** All parameter sets in the mock registry (compatibility is evaluated per account separately). */
  getParameterSetsForActiveAccount(accountId: AccountId): ParameterSetDefinition[];
  getParameterSetById(parameterSetId: string): ParameterSetDefinition | null;
  getStrategyById(strategyId: string): StrategyDefinition | null;
  getParameterSetCompatibility(
    accountId: AccountId,
    parameterSetId: string,
    canonicalSymbol: string,
    brokerSymbol: string | undefined,
    requestedUsage?: ParameterSetRequestedUsage,
  ): ParameterSetCompatibilityResult;
  /** Checkpoint 8 mock/advisory evaluation when a fixture exists for this id. */
  getParameterSetBacktestAdvisory(parameterSetId: string): BacktestApprovalResult | null;
  /** Checkpoint 15 multi-run evidence bundle (mock fixtures only). */
  getParameterSetBacktestEvidenceBundle(parameterSetId: string): BacktestEvidenceBundle | null;
}
