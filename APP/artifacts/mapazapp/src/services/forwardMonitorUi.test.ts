import { describe, expect, it } from "vitest";
import type { ForwardMonitorCandidateState } from "@workspace/mapazapp-core";
import { forwardMonitorCandidateNextStep, forwardMonitorStatusSimpleLabel } from "./forwardMonitorUi";

describe("forwardMonitorUi", () => {
  it("maps statuses to simple copy", () => {
    expect(forwardMonitorStatusSimpleLabel("no_candidates").toLowerCase()).toContain("no");
    expect(forwardMonitorStatusSimpleLabel("blocked_by_account_guard").toLowerCase()).toContain("account");
  });

  it("trade-ready candidate stresses manual review only", () => {
    const c = {
      candidateId: "z1",
      zoneId: "z1",
      symbol: "XAUUSD",
      direction: "BUY",
      reviewStatus: "TRADE_READY",
      currentAction: "review_manually",
      simpleSummary: "Fixture",
      technicalReasonCodes: [],
      accountId: "ACC_THE5ERS_100K_PHASE1_A",
      strategyId: "MZP_IFVG_ZONE_REACTION_V1",
      parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
      lastUpdatedUtc: "2026-05-04T12:00:00.000Z",
    } satisfies ForwardMonitorCandidateState;
    const line = forwardMonitorCandidateNextStep(c);
    expect(line.toLowerCase()).toContain("manual");
    expect(line.toLowerCase()).toContain("execution");
  });
});
