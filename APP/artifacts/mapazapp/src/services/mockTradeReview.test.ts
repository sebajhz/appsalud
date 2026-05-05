import { describe, expect, it } from "vitest";
import {
  createMockDashboardDataSource,
  createDashboardAccountGuardSettings,
  MOCK_CHECKPOINT7_STRATEGY_REGISTRY,
} from "./mockTradeReviewDataSource";
import { mapMockRiskToTradePlanGuard } from "./mapMockRiskToTradePlanGuard";
import { mockRiskByAccount } from "@/mock/risk";
import { mockPropFirmByAccount } from "@/mock/propfirm";
import { evaluateParameterSetCompatibility } from "@workspace/mapazapp-core";
import { createDefaultStrategyRegistryEvaluationSettings } from "@workspace/mapazapp-core";

describe("Checkpoint 4/7 — mock trade review + registry integration", () => {
  const regSettings = createDefaultStrategyRegistryEvaluationSettings();

  it("registry: XAUUSD trade-review set allows The5ers account", () => {
    const c = evaluateParameterSetCompatibility(
      {
        strategyRegistry: MOCK_CHECKPOINT7_STRATEGY_REGISTRY,
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
        canonicalSymbol: "XAUUSD",
        brokerSymbol: "XAUUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      regSettings,
    );
    expect(c.allowTradeReview).toBe(true);
  });

  it("registry: EURUSD alerts-only set blocks trade review", () => {
    const c = evaluateParameterSetCompatibility(
      {
        strategyRegistry: MOCK_CHECKPOINT7_STRATEGY_REGISTRY,
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
        canonicalSymbol: "EURUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      regSettings,
    );
    expect(c.allowTradeReview).toBe(false);
    expect(c.blockingReasons).toContain("PARAMETER_SET_ALERTS_ONLY");
  });

  it("XAUUSD TRADE_READY mock evaluates to TRADE_READY on The5ers when registry + gates pass", () => {
    const d = createMockDashboardDataSource();
    const row = d.getTradeReviewPlanByZoneId("ACC_THE5ERS_100K_PHASE1_A", "zone_001");
    expect(row).toBeDefined();
    expect(row!.registryCompatibility.allowTradeReview).toBe(true);
    expect(row!.evaluation.plan.status).toBe("TRADE_READY");
    expect(row!.evaluation.plan.reasons.map((x) => x.code)).toContain("TRADE_READY_REVIEW_ONLY");
  });

  it("EURUSD mock with alerts-only parameter set does not reach TRADE_READY", () => {
    const d = createMockDashboardDataSource();
    const row = d.getTradeReviewPlanByZoneId("ACC_THE5ERS_100K_PHASE1_A", "zone_002");
    expect(row?.registryCompatibility.allowTradeReview).toBe(false);
    expect(row?.evaluation.plan.status).toBe("NO_TRADE");
    expect(row?.evaluation.plan.noTradeReasons.some((r) => r.code === "PARAMETER_SET_ALERTS_ONLY")).toBe(true);
  });

  it("PropXP watch-only operational status yields NO_TRADE for XAU zone", () => {
    const d = createMockDashboardDataSource();
    const row = d.getTradeReviewPlanByZoneId("ACC_PROPXP_50K_PHASE1", "zone_001");
    expect(row?.evaluation.plan.status).toBe("NO_TRADE");
    expect(row?.evaluation.failedHardGates.length).toBeGreaterThan(0);
  });

  it("getAccountGuardEvaluation returns core result for active mock account", () => {
    const d = createMockDashboardDataSource();
    const g = d.getAccountGuardEvaluation("ACC_THE5ERS_100K_PHASE1_A");
    expect(g.allowTradeReview).toBe(true);
    expect(g.status).toBe("ACCOUNT_OK");
  });

  it("mapMockRiskToTradePlanGuard aligns trade plan guard with account guard result", () => {
    const risk = mockRiskByAccount["ACC_THE5ERS_100K_PHASE1_A"];
    const prop = mockPropFirmByAccount["ACC_THE5ERS_100K_PHASE1_A"];
    const { tradePlanAccountGuard, accountGuardResult } = mapMockRiskToTradePlanGuard(risk, true, {
      propFirm: prop,
      accountGuardSettings: createDashboardAccountGuardSettings(),
    });
    expect(tradePlanAccountGuard.allowTradeReview).toBe(accountGuardResult.allowTradeReview);
  });

  it("RETESTING mock maps to WAIT_CONFIRMATION", () => {
    const d = createMockDashboardDataSource();
    const row = d.getTradeReviewPlanByZoneId("ACC_THE5ERS_100K_PHASE1_A", "zone_006");
    expect(row?.evaluation.plan.status).toBe("WAIT_CONFIRMATION");
  });
});
