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
import { mockAlerts } from "@/mock/alerts";
import { mockConfig } from "@/mock/config";
import { mockPropFirmByAccount } from "@/mock/propfirm";
import { mockRiskByAccount } from "@/mock/risk";
import { mockZones } from "@/mock/zones";
import { buildTradePlanInputFromMockZone } from "./mapMockZoneToCore";
import { mapMockRiskToTradePlanGuard } from "./mapMockRiskToTradePlanGuard";
import { getMockSymbolMarketSpec } from "./mockSymbolProfiles";
import type { DashboardMockDataSource, TradeReviewPlanRow } from "./tradeReviewDataSource";
import { createMockAccountDataSource } from "./mockAccountDataSource";

/** Shared mock registry (checkpoint 7) — not persisted, not MT5. */
export const MOCK_CHECKPOINT7_STRATEGY_REGISTRY = createCheckpoint7MockParameterSetRegistry();

const registryEvalSettings = createDefaultStrategyRegistryEvaluationSettings();

/** Align trade-plan operational skips with `AccountGuardSettings` defaults used by the mock mapper. */
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
    minScoreTrade: mockConfig.zoneScoring.minScoreForTradeReady,
    allowWatchOnlyForTradeReview: ag.allowWatchOnlyReview,
    allowNewsBlackoutForTradeReview: ag.allowNewsReview,
    requireBridgeConnectedForTradeReview: ag.requireBridgeForReview,
  };
}

function evaluateRow(
  accountId: AccountId,
  zone: (typeof mockZones)[0],
  settings: TradePlanEvaluationSettings,
): TradeReviewPlanRow | null {
  const spec = getMockSymbolMarketSpec(accountId, zone.symbol);
  if (!spec) return null;
  const risk = mockRiskByAccount[accountId] ?? mockRiskByAccount[mockConfig.activeAccountId];
  const prop = mockPropFirmByAccount[accountId];

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
    zone,
    evaluation: evaluateTradeReviewPlan(input),
    registryCompatibility,
  };
}

export function createMockDashboardDataSource(): DashboardMockDataSource {
  const settings = createDashboardTradePlanSettings();
  const accounts = createMockAccountDataSource();

  return {
    getAccountSnapshot(accountId: AccountId) {
      return accounts.getAccountSnapshot(accountId);
    },

    getZonesForAccount(_accountId: AccountId) {
      return mockZones;
    },

    getTradeReviewPlansForAccount(accountId: AccountId): TradeReviewPlanRow[] {
      const out: TradeReviewPlanRow[] = [];
      for (const z of mockZones) {
        const row = evaluateRow(accountId, z, settings);
        if (row) out.push(row);
      }
      return out;
    },

    getTradeReviewPlanByZoneId(accountId: AccountId, zoneId: string): TradeReviewPlanRow | undefined {
      const z = mockZones.find((x) => x.id === zoneId);
      if (!z) return undefined;
      return evaluateRow(accountId, z, settings) ?? undefined;
    },

    getAlertsForAccount(accountId: AccountId) {
      return mockAlerts.filter((a) => a.accountId === accountId || a.accountId === null);
    },

    getAccountGuardEvaluation(accountId: AccountId): AccountGuardResult {
      const risk = mockRiskByAccount[accountId] ?? mockRiskByAccount[mockConfig.activeAccountId];
      const prop = mockPropFirmByAccount[accountId];
      const approvedParameterSetForAccount = accountHasApprovedTradeReviewParameterSet(
        MOCK_CHECKPOINT7_STRATEGY_REGISTRY,
        accountId,
        registryEvalSettings,
      );
      return mapMockRiskToTradePlanGuard(risk, approvedParameterSetForAccount, {
        propFirm: prop,
        accountGuardSettings: createDashboardAccountGuardSettings(),
      }).accountGuardResult;
    },
  };
}
