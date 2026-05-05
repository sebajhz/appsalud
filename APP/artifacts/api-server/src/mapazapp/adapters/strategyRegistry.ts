import type { AccountId, ParameterSetRequestedUsage } from "@workspace/mapazapp-core";
import { createDefaultStrategyRegistryEvaluationSettings, evaluateParameterSetCompatibility } from "@workspace/mapazapp-core";
import { MOCK_CHECKPOINT7_STRATEGY_REGISTRY } from "../lib/tradeReviewLogic";

const evalSettings = createDefaultStrategyRegistryEvaluationSettings();

export function listStrategies() {
  return MOCK_CHECKPOINT7_STRATEGY_REGISTRY.strategies;
}

export function listParameterSets() {
  return MOCK_CHECKPOINT7_STRATEGY_REGISTRY.parameterSets;
}

export function getParameterSetById(parameterSetId: string) {
  return MOCK_CHECKPOINT7_STRATEGY_REGISTRY.parameterSets.find((p) => p.parameterSetId === parameterSetId) ?? null;
}

export function getStrategyById(strategyId: string) {
  return MOCK_CHECKPOINT7_STRATEGY_REGISTRY.strategies.find((s) => s.strategyId === strategyId) ?? null;
}

export function compatibilityForAccount(
  accountId: AccountId,
  parameterSetId: string,
  requestedUsage: ParameterSetRequestedUsage = "trade_review",
) {
  const ps = getParameterSetById(parameterSetId);
  const sid = ps?.strategyId ?? MOCK_CHECKPOINT7_STRATEGY_REGISTRY.strategies[0]!.strategyId;
  const canonicalSymbol = ps?.canonicalSymbol ?? "XAUUSD";
  const brokerSymbol = ps?.brokerSymbol;
  return evaluateParameterSetCompatibility(
    {
      strategyRegistry: MOCK_CHECKPOINT7_STRATEGY_REGISTRY,
      strategyId: sid,
      parameterSetId,
      canonicalSymbol,
      brokerSymbol,
      accountId,
      requestedUsage,
    },
    evalSettings,
  );
}
