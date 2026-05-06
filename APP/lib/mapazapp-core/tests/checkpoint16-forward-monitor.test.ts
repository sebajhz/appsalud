import { describe, expect, it } from "vitest";
import {
  createForwardMonitorFixtureInputBlockedGuard,
  createForwardMonitorFixtureInputBlockedRegistry,
  createForwardMonitorFixtureInputNoCandidates,
  createForwardMonitorFixtureInputThe5ersXau,
  evaluateForwardMonitorSnapshot,
} from "../src/index";

describe("Checkpoint 16 — forward monitor snapshot", () => {
  it("trade-ready scanner path yields monitoring or completed_snapshot and reviewOnly", () => {
    const input = createForwardMonitorFixtureInputThe5ersXau();
    const r = evaluateForwardMonitorSnapshot(input);
    expect(r.ok).toBe(true);
    expect(["monitoring", "completed_snapshot", "completed_with_warnings"]).toContain(r.status);
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.reviewOnly).toBe(true);
    expect(r.executionEnabled).toBe(false);
    expect(r.mockOnly).toBe(true);
    expect(r.simulated).toBe(true);
    const hasTradeReady = r.candidates.some((c) => c.reviewStatus === "TRADE_READY");
    const hasWaitConf = r.candidates.some((c) => c.reviewStatus === "WAIT_CONFIRMATION");
    const hasObserve = r.candidates.some((c) => c.reviewStatus === "OBSERVE");
    expect(hasTradeReady || hasWaitConf || hasObserve).toBe(true);
    if (hasTradeReady) {
      const tr = r.candidates.find((c) => c.reviewStatus === "TRADE_READY")!;
      expect(tr.currentAction).toBe("review_manually");
    }
  });

  it("account guard blocked returns blocked_by_account_guard", () => {
    const r = evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputBlockedGuard());
    expect(r.ok).toBe(true);
    expect(r.status).toBe("blocked_by_account_guard");
    expect(r.candidates).toHaveLength(0);
    expect(r.reviewOnly).toBe(true);
    expect(r.executionEnabled).toBe(false);
  });

  it("registry blocked returns blocked_by_registry", () => {
    const r = evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputBlockedRegistry());
    expect(r.ok).toBe(true);
    expect(r.status).toBe("blocked_by_registry");
    expect(r.candidates).toHaveLength(0);
  });

  it("no candidates returns no_candidates", () => {
    const r = evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputNoCandidates());
    expect(r.ok).toBe(true);
    expect(r.status).toBe("no_candidates");
    expect(r.candidates).toHaveLength(0);
  });

  it("result never enables execution", () => {
    const inputs = [
      createForwardMonitorFixtureInputThe5ersXau(),
      createForwardMonitorFixtureInputBlockedGuard(),
      createForwardMonitorFixtureInputBlockedRegistry(),
      createForwardMonitorFixtureInputNoCandidates(),
    ];
    for (const input of inputs) {
      const r = evaluateForwardMonitorSnapshot(input);
      expect(r.executionEnabled).toBe(false);
    }
  });
});
