/**
 * Mirrors `createMockDashboardDataSource` trade-review evaluation (no React).
 */
import type { AccountGuardResult, AccountId, TradePlanEvaluationSettings } from "@workspace/mapazapp-core";
import {
  accountHasApprovedTradeReviewParameterSet,
  createCheckpoint7MockParameterSetRegistry,
  createDefaultAccountGuardSettingsForTests,
  createDefaultStrategyRegistryEvaluationSettings,
  createDefaultTradePlanEvaluationSettingsForTests,
  evaluateParameterSetCompatibility,
  evaluateTradeReviewPlan,
} from "@workspace/mapazapp-core";
import {
  MAPAZAPP_ACTIVE_ACCOUNT_ID,
  MAPAZAPP_MOCK_PROP,
  MAPAZAPP_MOCK_RISK,
  MAPAZAPP_MOCK_ZONES,
  MAPAZAPP_ZONE_SCORING,
} from "../mockData";
import type { Zone } from "../types";
import { buildTradePlanInputFromMockZone } from "./mapMockZoneToCore";
import { mapMockRiskToTradePlanGuard } from "./mapMockRiskToTradePlanGuard";
import { getMockSymbolMarketSpec } from "./mockSymbolProfiles";

export const MOCK_CHECKPOINT7_STRATEGY_REGISTRY = createCheckpoint7MockParameterSetRegistry();

const registryEvalSettings = createDefaultStrategyRegistryEvaluationSettings();

export function createDashboardAccountGuardSettings() {
  return createDefaultAccountGuardSettingsForTests();
}

export function createDashboardTradePlanSettings(): TradePlanEvaluationSettings {
  const base = createDefaultTradePlanEvaluationSettingsForTests();
  const ag = createDashboardAccountGuardSettings();
  return {
    ...base,
    testOrDevMode: false,
    requireAccountIdForGuard: true,
    minScoreTrade: MAPAZAPP_ZONE_SCORING.minScoreForTradeReady,
    allowWatchOnlyForTradeReview: ag.allowWatchOnlyReview,
    allowNewsBlackoutForTradeReview: ag.allowNewsReview,
    requireBridgeConnectedForTradeReview: ag.requireBridgeForReview,
  };
}

export interface TradeReviewPlanPayload {
  accountId: AccountId;
  zone: Zone;
  evaluation: ReturnType<typeof evaluateTradeReviewPlan>;
  registryCompatibility: ReturnType<typeof evaluateParameterSetCompatibility>;
}

export function evaluateTradeReviewForAccountZone(
  accountId: AccountId,
  zone: Zone,
  settings: TradePlanEvaluationSettings,
): TradeReviewPlanPayload | null {
  const spec = getMockSymbolMarketSpec(accountId, zone.symbol);
  if (!spec) return null;
  const risk = MAPAZAPP_MOCK_RISK[accountId] ?? MAPAZAPP_MOCK_RISK[MAPAZAPP_ACTIVE_ACCOUNT_ID];
  const prop = MAPAZAPP_MOCK_PROP[accountId];

  const registryCompatibility = evaluateParameterSetCompatibility(
    {
      strategyRegistry: MOCK_CHECKPOINT7_STRATEGY_REGISTRY,
      strategyId: zone.strategy_id,
      parameterSetId: zone.parameter_set_id,
      canonicalSymbol: zone.symbol,
      brokerSymbol: spec.brokerSymbol,
      accountId,
      requestedUsage: "trade_review",
    },
    registryEvalSettings,
  );

  const approvedParameterSetForAccount = registryCompatibility.allowTradeReview;

  const { tradePlanAccountGuard } = mapMockRiskToTradePlanGuard(risk, approvedParameterSetForAccount, {
    propFirm: prop,
    accountGuardSettings: createDashboardAccountGuardSettings(),
  });

  const input = buildTradePlanInputFromMockZone({
    zone,
    symbolProfile: spec,
    accountId,
    tradePlanSettings: settings,
    accountGuard: tradePlanAccountGuard,
    registryCompatibility,
  });

  return {
    accountId,
    zone,
    evaluation: evaluateTradeReviewPlan(input),
    registryCompatibility,
  };
}

export function getAccountGuardEvaluation(accountId: AccountId): AccountGuardResult {
  const risk = MAPAZAPP_MOCK_RISK[accountId] ?? MAPAZAPP_MOCK_RISK[MAPAZAPP_ACTIVE_ACCOUNT_ID];
  const prop = MAPAZAPP_MOCK_PROP[accountId];
  const approvedParameterSetForAccount = accountHasApprovedTradeReviewParameterSet(
    MOCK_CHECKPOINT7_STRATEGY_REGISTRY,
    accountId,
    registryEvalSettings,
  );
  return mapMockRiskToTradePlanGuard(risk, approvedParameterSetForAccount, {
    propFirm: prop,
    accountGuardSettings: createDashboardAccountGuardSettings(),
  }).accountGuardResult;
}

const tradePlanSettingsSingleton = createDashboardTradePlanSettings();

export function listTradeReviewPlansForAccount(accountId: AccountId): TradeReviewPlanPayload[] {
  const out: TradeReviewPlanPayload[] = [];
  for (const z of MAPAZAPP_MOCK_ZONES) {
    const row = evaluateTradeReviewForAccountZone(accountId, z, tradePlanSettingsSingleton);
    if (row) out.push(row);
  }
  return out;
}

export function getTradeReviewPlanByZoneId(accountId: AccountId, zoneId: string): TradeReviewPlanPayload | undefined {
  const z = MAPAZAPP_MOCK_ZONES.find((x) => x.id === zoneId);
  if (!z) return undefined;
  return evaluateTradeReviewForAccountZone(accountId, z, tradePlanSettingsSingleton) ?? undefined;
}
