import { describe, expect, it } from "vitest";
import {
  createMockDashboardDataSource,
  isMockParameterSetApprovedForAccount,
} from "./mockTradeReviewDataSource";

describe("Checkpoint 4 — mock trade review integration", () => {
  it("approves ps_alpha_01 only for XAUUSD on allowed accounts", () => {
    expect(isMockParameterSetApprovedForAccount("ps_alpha_01", "XAUUSD", "ACC_THE5ERS_100K_PHASE1_A")).toBe(true);
    expect(isMockParameterSetApprovedForAccount("ps_alpha_01", "EURUSD", "ACC_THE5ERS_100K_PHASE1_A")).toBe(false);
  });

  it("XAUUSD TRADE_READY mock can evaluate to TRADE_READY on The5ers", () => {
    const d = createMockDashboardDataSource();
    const row = d.getTradeReviewPlanByZoneId("ACC_THE5ERS_100K_PHASE1_A", "zone_001");
    expect(row).toBeDefined();
    expect(row!.evaluation.plan.status).toBe("TRADE_READY");
    expect(row!.evaluation.plan.reasons.map((x) => x.code)).toContain("TRADE_READY_REVIEW_ONLY");
  });

  it("PropXP watch-only operational status yields NO_TRADE for same zone", () => {
    const d = createMockDashboardDataSource();
    const row = d.getTradeReviewPlanByZoneId("ACC_PROPXP_50K_PHASE1", "zone_001");
    expect(row?.evaluation.plan.status).toBe("NO_TRADE");
    expect(row?.evaluation.failedHardGates.length).toBeGreaterThan(0);
  });

  it("RETESTING mock maps to WAIT_CONFIRMATION", () => {
    const d = createMockDashboardDataSource();
    const row = d.getTradeReviewPlanByZoneId("ACC_THE5ERS_100K_PHASE1_A", "zone_006");
    expect(row?.evaluation.plan.status).toBe("WAIT_CONFIRMATION");
  });
});
