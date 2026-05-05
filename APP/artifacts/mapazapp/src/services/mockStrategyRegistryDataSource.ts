import type { AccountId, ParameterSetRequestedUsage } from "@workspace/mapazapp-core";
import {
  createDefaultStrategyRegistryEvaluationSettings,
  evaluateParameterSetCompatibility,
  getCheckpoint8MockApprovalForParameterSet,
} from "@workspace/mapazapp-core";
import { MOCK_CHECKPOINT7_STRATEGY_REGISTRY } from "./mockTradeReviewDataSource";
import type { StrategyRegistryReadModelDataSource } from "./strategyRegistryDataSource";

const evalSettings = createDefaultStrategyRegistryEvaluationSettings();

export function createMockStrategyRegistryDataSource(): StrategyRegistryReadModelDataSource {
  const reg = MOCK_CHECKPOINT7_STRATEGY_REGISTRY;

  return {
    getStrategies() {
      return reg.strategies;
    },
    getParameterSets() {
      return reg.parameterSets;
    },
    getParameterSetsForActiveAccount(_accountId: AccountId) {
      return reg.parameterSets;
    },
    getParameterSetById(parameterSetId: string) {
      return reg.parameterSets.find((p) => p.parameterSetId === parameterSetId) ?? null;
    },
    getStrategyById(strategyId: string) {
      return reg.strategies.find((s) => s.strategyId === strategyId) ?? null;
    },
    getParameterSetCompatibility(
      accountId: AccountId,
      parameterSetId: string,
      canonicalSymbol: string,
      brokerSymbol: string | undefined,
      requestedUsage: ParameterSetRequestedUsage = "trade_review",
    ) {
      const ps = reg.parameterSets.find((p) => p.parameterSetId === parameterSetId);
      const sid = ps?.strategyId ?? reg.strategies[0]!.strategyId;
      return evaluateParameterSetCompatibility(
        {
          strategyRegistry: reg,
          strategyId: sid,
          parameterSetId,
          canonicalSymbol,
          brokerSymbol,
          accountId,
          requestedUsage,
        },
        evalSettings,
      );
    },
    getParameterSetBacktestAdvisory(parameterSetId: string) {
      return getCheckpoint8MockApprovalForParameterSet(parameterSetId);
    },
  };
}
