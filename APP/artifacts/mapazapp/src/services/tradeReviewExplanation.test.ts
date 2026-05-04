import { describe, expect, it } from "vitest";
import type { TradePlanEvaluationResult, TradeReviewPlan } from "@workspace/mapazapp-core";
import {
  buildTradeReviewExplanation,
  explanationMainReasonLines,
  mapReasonCode,
} from "./tradeReviewExplanation";

function plan(over: Partial<TradeReviewPlan>): TradeReviewPlan {
  return {
    status: "TRADE_READY",
    action: "TRADE_READY",
    direction: "BUY",
    canonicalSymbol: "XAUUSD",
    zoneId: "z_test",
    targetModel: "fixed_R",
    entryAreaLow: 2000,
    entryAreaHigh: 2010,
    referenceEntryPrice: 2005,
    stopLoss: 1990,
    takeProfit: 2030,
    metrics: {
      rr: 2,
      riskPrice: 15,
      rewardPrice: 30,
      slDistancePrice: 15,
      slDistancePoints: 150,
      slDistanceTicks: 150,
    },
    reasons: [],
    noTradeReasons: [],
    failedHardGates: [],
    simpleSummary: "Synthetic summary.",
    reviewReady: true,
    ...over,
  };
}

function evalResult(p: TradeReviewPlan, failedHardGates: TradePlanEvaluationResult["failedHardGates"] = []): TradePlanEvaluationResult {
  return { plan: p, passedHardGatesForTradeReady: p.reviewReady, failedHardGates };
}

describe("tradeReviewExplanation", () => {
  it("TRADE_READY sets manualReviewOnly true and review-only copy", () => {
    const ex = buildTradeReviewExplanation(
      evalResult(
        plan({
          status: "TRADE_READY",
          action: "TRADE_READY",
          reasons: [
            { code: "ZONE_VALID", messageSimple: "Zone geometry is valid for review." },
            { code: "TRADE_READY_REVIEW_ONLY", messageSimple: "Setup passes gates for human review only." },
          ],
          reviewReady: true,
        }),
      ),
    );
    expect(ex.manualReviewOnly).toBe(true);
    expect(ex.simpleSummary.toLowerCase()).toMatch(/manual review/);
    expect(ex.positiveReasons.map((r) => r.code)).toContain("TRADE_READY_REVIEW_ONLY");
    const tr = ex.technicalReasons.find((t) => t.code === "TRADE_READY_REVIEW_ONLY");
    expect(tr?.technical).toBe("Review-only trade-ready state.");
  });

  it("WAIT_RETEST includes missing retest explanation", () => {
    const ex = buildTradeReviewExplanation(
      evalResult(
        plan({
          status: "WAIT_RETEST",
          action: "WAIT_RETEST",
          reasons: [{ code: "WAITING_FOR_RETEST", messageSimple: "Zone exists but price has not retested it yet." }],
          noTradeReasons: [],
          stopLoss: null,
          takeProfit: null,
          metrics: null,
          reviewReady: false,
        }),
      ),
    );
    expect(ex.missingRequirements.some((m) => m.toLowerCase().includes("return"))).toBe(true);
    expect(ex.whatToDoNow.toLowerCase()).toMatch(/retest/);
  });

  it("WAIT_CONFIRMATION includes missing confirmation explanation", () => {
    const ex = buildTradeReviewExplanation(
      evalResult(
        plan({
          status: "WAIT_CONFIRMATION",
          action: "WAIT_CONFIRMATION",
          reasons: [
            { code: "WAITING_FOR_CONFIRMATION", messageSimple: "Retest happened but confirmation is missing." },
          ],
          stopLoss: null,
          takeProfit: null,
          metrics: null,
          reviewReady: false,
        }),
      ),
    );
    expect(ex.missingRequirements.join(" ").toLowerCase()).toMatch(/confirmation/);
    expect(ex.whatItMeans.toLowerCase()).toMatch(/confirmation/);
  });

  it("NO_TRADE with daily drawdown reason surfaces blocking risk message", () => {
    const ex = buildTradeReviewExplanation(
      evalResult(
        plan({
          status: "NO_TRADE",
          action: "NO_TRADE",
          reasons: [],
          noTradeReasons: [
            { code: "ACCOUNT_BLOCKED_DAILY_DRAWDOWN", messageSimple: "Setup is blocked by daily drawdown rules." },
          ],
          failedHardGates: ["DAILY_DRAWDOWN_BLOCKED"],
          stopLoss: null,
          takeProfit: null,
          metrics: null,
          reviewReady: false,
        }),
      ),
    );
    expect(ex.blockingReasons.map((b) => b.code)).toContain("ACCOUNT_BLOCKED_DAILY_DRAWDOWN");
    expect(ex.riskSummary.toLowerCase()).toMatch(/drawdown|blocked|daily/i);
  });

  it("unknown reason code falls back safely", () => {
    const m = mapReasonCode("UNKNOWN_CODE_XYZ");
    expect(m.simple).toBe("Review required.");
    expect(m.technical).toBe("UNKNOWN_CODE_XYZ");
    const ex = buildTradeReviewExplanation(
      evalResult(
        plan({
          status: "OBSERVE",
          action: "OBSERVE",
          reasons: [{ code: "UNKNOWN_CODE_XYZ", messageSimple: "ignored for unknown" }],
          reviewReady: false,
        }),
      ),
    );
    const t = ex.technicalReasons.find((r) => r.code === "UNKNOWN_CODE_XYZ");
    expect(t?.technical).toBe("UNKNOWN_CODE_XYZ");
  });

  it("technical reason codes list preserves known mappings", () => {
    const ex = buildTradeReviewExplanation(
      evalResult(
        plan({
          status: "NO_TRADE",
          action: "NO_TRADE",
          noTradeReasons: [{ code: "SPREAD_TOO_HIGH", messageSimple: "Spread exceeds the allowed ceiling for review." }],
          failedHardGates: ["SPREAD_ABOVE_MAX"],
          reviewReady: false,
        }),
      ),
    );
    const spread = ex.technicalReasons.filter((r) => r.code === "SPREAD_TOO_HIGH" || r.code === "SPREAD_ABOVE_MAX");
    expect(spread.length).toBeGreaterThan(0);
    expect(spread.some((s) => s.technical.toLowerCase().includes("spread"))).toBe(true);
  });

  it("explanationMainReasonLines caps trade-ready reasons", () => {
    const ex = buildTradeReviewExplanation(
      evalResult(
        plan({
          status: "TRADE_READY",
          reasons: [
            { code: "ZONE_VALID", messageSimple: "…" },
            { code: "TRADE_READY_REVIEW_ONLY", messageSimple: "…" },
          ],
        }),
      ),
    );
    expect(explanationMainReasonLines(ex, 2).length).toBeLessThanOrEqual(2);
  });
});
