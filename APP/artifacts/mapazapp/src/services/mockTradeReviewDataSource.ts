import type { AccountId, TradePlanEvaluationSettings } from "@workspace/mapazapp-core";
import {
  createDefaultTradePlanEvaluationSettingsForTests,
  evaluateTradeReviewPlan,
} from "@workspace/mapazapp-core";
import { mockAlerts } from "@/mock/alerts";
import { mockBacktests } from "@/mock/backtests";
import { mockConfig } from "@/mock/config";
import { mockPropFirmByAccount } from "@/mock/propfirm";
import { mockRiskByAccount } from "@/mock/risk";
import { mockZones } from "@/mock/zones";
import { buildTradePlanInputFromMockZone } from "./mapMockZoneToCore";
import { mapMockRiskToTradePlanGuard } from "./mapMockRiskToTradePlanGuard";
import { getMockSymbolMarketSpec } from "./mockSymbolProfiles";
import type { DashboardMockDataSource, TradeReviewPlanRow } from "./tradeReviewDataSource";
import { createMockAccountDataSource } from "./mockAccountDataSource";

export function createDashboardTradePlanSettings(): TradePlanEvaluationSettings {
  const base = createDefaultTradePlanEvaluationSettingsForTests();
  return {
    ...base,
    testOrDevMode: false,
    requireAccountIdForGuard: true,
    minScoreTrade: mockConfig.zoneScoring.minScoreForTradeReady,
  };
}

/** Whether mock backtests approve this parameter set for symbol + account. */
export function isMockParameterSetApprovedForAccount(
  parameterSetId: string,
  canonicalSymbol: string,
  accountId: string,
): boolean {
  const bt = mockBacktests.find((b) => b.id === parameterSetId);
  if (!bt || bt.status !== "APPROVED") return false;
  const symbols = bt.symbol.split(",").map((s) => s.trim());
  if (!symbols.includes(canonicalSymbol)) return false;
  return bt.allowedAccountIds.includes(accountId);
}

function evaluateRow(accountId: AccountId, zone: (typeof mockZones)[0], settings: TradePlanEvaluationSettings): TradeReviewPlanRow | null {
  const spec = getMockSymbolMarketSpec(accountId, zone.symbol);
  if (!spec) return null;
  const risk = mockRiskByAccount[accountId] ?? mockRiskByAccount[mockConfig.activeAccountId];
  const prop = mockPropFirmByAccount[accountId];
  const approved = isMockParameterSetApprovedForAccount(zone.parameter_set_id, zone.symbol, accountId);
  const guard = mapMockRiskToTradePlanGuard(risk, approved, { propFirm: prop });
  const input = buildTradePlanInputFromMockZone({
    zone,
    symbolProfile: spec,
    accountId,
    tradePlanSettings: settings,
    accountGuard: guard,
  });
  return { zone, evaluation: evaluateTradeReviewPlan(input) };
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
  };
}
