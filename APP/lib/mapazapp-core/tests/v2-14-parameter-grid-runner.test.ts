import { describe, expect, it } from "vitest";
import { createDefaultBacktestCampaignSettingsForTests } from "../src/backtest-campaign-settings";
import {
  gridCandidateRegistryBlockedNasOnXau,
  gridInputMultiSymbolCompatibility,
  gridInputThreeCandidatesSameXauDataset,
  gridInputUnstableNas100,
} from "../src/parameter-grid-fixtures";
import { runParameterGrid } from "../src/parameter-grid-runner";
import { createDefaultParameterGridSettingsForTests } from "../src/parameter-grid-settings";
import type { ParameterGridInput } from "../src/parameter-grid-types";
import type { IfvgReplayBacktestResult } from "../src/ifvg-replay-backtest-types";

function replayStub(partial: Partial<IfvgReplayBacktestResult>): IfvgReplayBacktestResult {
  return {
    status: "completed",
    summary: {
      candidateCount: 10,
      replayAttemptedCount: 8,
      replayedTradeCount: 8,
      wins: 5,
      losses: 3,
      expiredCount: 0,
      missedCount: 0,
      invalidatedCount: 0,
      ambiguousCount: 0,
      notTriggeredCount: 0,
      totalR: 4.2,
      averageR: 0.52,
      winRate: 0.625,
      profitFactor: 1.8,
      maxDrawdownR: 2.1,
      averageMaeR: 0.4,
      averageMfeR: 0.9,
      bestTradeR: 2.2,
      worstTradeR: -1,
    },
    trades: [],
    traces: [],
    diagnostics: [],
    warnings: [],
    detection: null,
    executionEnabled: false,
    registryMutationAllowed: false,
    reviewOnly: true,
    ...partial,
  };
}

describe("V2-14 parameter grid runner", () => {
  it("A. Validation — no datasets => no_valid_datasets", () => {
    const r = runParameterGrid({
      datasets: [],
      candidates: gridInputThreeCandidatesSameXauDataset().candidates,
      campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
      gridSettings: createDefaultParameterGridSettingsForTests(),
    });
    expect(r.status).toBe("no_valid_datasets");
    expect(r.candidates.length).toBe(0);
  });

  it("A. Validation — no candidates => no_valid_parameter_sets", () => {
    const base = gridInputThreeCandidatesSameXauDataset();
    const r = runParameterGrid({
      datasets: base.datasets,
      candidates: [],
      campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
      gridSettings: createDefaultParameterGridSettingsForTests(),
    });
    expect(r.status).toBe("no_valid_parameter_sets");
  });

  it("B. Ranking — one row per parameter set, deterministic order", () => {
    const base = gridInputThreeCandidatesSameXauDataset();
    const input: ParameterGridInput = {
      ...base,
      testOnlyReplayStubByParameterSetId: {
        GRID_SET_A: replayStub({}),
        GRID_SET_B: replayStub({
          summary: { ...replayStub({}).summary, replayedTradeCount: 2, totalR: 0.5, averageR: 0.25 },
        }),
        GRID_SET_C: replayStub({
          summary: {
            ...replayStub({}).summary,
            replayedTradeCount: 18,
            totalR: -10,
            averageR: -0.55,
            profitFactor: 0.55,
            maxDrawdownR: 6,
          },
        }),
      },
    };
    const a = runParameterGrid(input);
    const b = runParameterGrid(input);
    expect(a.ranking.map((x) => x.parameterSetId)).toEqual(b.ranking.map((x) => x.parameterSetId));
    expect(a.ranking.length).toBe(3);
    expect(a.ranking[0]!.gridRankScore).toBeGreaterThanOrEqual(a.ranking[1]!.gridRankScore);
  });

  it("C. Recommendations — promising / needs_more_data / rejected", () => {
    const base = gridInputThreeCandidatesSameXauDataset();
    const r = runParameterGrid({
      ...base,
      testOnlyReplayStubByParameterSetId: {
        GRID_SET_A: replayStub({
          summary: {
            ...replayStub({}).summary,
            replayedTradeCount: 18,
            totalR: 9,
            averageR: 0.5,
            profitFactor: 1.9,
            maxDrawdownR: 2,
          },
        }),
        GRID_SET_B: replayStub({
          summary: { ...replayStub({}).summary, replayedTradeCount: 2, totalR: 0.4, averageR: 0.2 },
        }),
        GRID_SET_C: replayStub({
          summary: {
            ...replayStub({}).summary,
            replayedTradeCount: 20,
            totalR: -8,
            averageR: -0.4,
            winRate: 0.25,
            profitFactor: 0.6,
            maxDrawdownR: 7,
          },
        }),
      },
    });
    const byId = Object.fromEntries(r.candidates.map((c) => [c.parameterSetId, c]));
    expect(byId["GRID_SET_A"]!.recommendation).toBe("candidate_for_more_testing");
    expect(byId["GRID_SET_B"]!.recommendation).toBe("needs_more_data");
    expect(byId["GRID_SET_C"]!.recommendation).toBe("rejected");
    expect("approved" in r).toBe(false);
  });

  it("C. Unstable — mixed dataset polarity", () => {
    const base = gridInputUnstableNas100();
    base.datasets[0] = {
      ...base.datasets[0]!,
      testOnlyReplayOverride: replayStub({ summary: { ...replayStub({}).summary, totalR: 8, averageR: 0.8 } }),
    };
    base.datasets[1] = {
      ...base.datasets[1]!,
      testOnlyReplayOverride: replayStub({
        summary: { ...replayStub({}).summary, totalR: -0.2, averageR: -0.01, profitFactor: 0.99, maxDrawdownR: 2.5 },
      }),
    };
    const r = runParameterGrid(base);
    expect(r.candidates[0]!.recommendation).toBe("unstable");
  });

  it("D. Safety flags", () => {
    const base = gridInputThreeCandidatesSameXauDataset();
    const r = runParameterGrid({
      ...base,
      testOnlyReplayStubByParameterSetId: {
        GRID_SET_A: replayStub({}),
        GRID_SET_B: replayStub({}),
        GRID_SET_C: replayStub({}),
      },
    });
    expect(r.executionEnabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.autoApprovalEnabled).toBe(false);
    expect("approved" in r).toBe(false);
  });

  it("E. Compatibility — symbol filter and registry mismatch", () => {
    const multi = gridInputMultiSymbolCompatibility();
    const r = runParameterGrid({
      ...multi,
      testOnlyReplayStubByParameterSetId: {
        GRID_XAU_ONLY: replayStub({}),
        GRID_EUR_ONLY: replayStub({}),
      },
    });
    const btc = r.candidates.find((c) => c.parameterSetId === "GRID_BTC_ONLY");
    expect(btc?.recommendation).toBe("not_rankable");
    expect(btc?.campaignResult).toBeNull();

    const reg = runParameterGrid({
      datasets: gridInputThreeCandidatesSameXauDataset().datasets,
      candidates: [gridCandidateRegistryBlockedNasOnXau()],
      campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
      gridSettings: createDefaultParameterGridSettingsForTests(),
    });
    expect(reg.candidates[0]!.registrySkipped).toBe(true);
    expect(reg.candidates[0]!.recommendation).toBe("not_rankable");
  });

  it("F. Determinism — repeated grid run matches scores", () => {
    const base = gridInputThreeCandidatesSameXauDataset();
    const input: ParameterGridInput = {
      ...base,
      testOnlyReplayStubByParameterSetId: {
        GRID_SET_A: replayStub({}),
        GRID_SET_B: replayStub({ summary: { ...replayStub({}).summary, replayedTradeCount: 3 } }),
        GRID_SET_C: replayStub({ summary: { ...replayStub({}).summary, replayedTradeCount: 12, totalR: -1 } }),
      },
    };
    const x = runParameterGrid(input);
    const y = runParameterGrid(input);
    expect(x.ranking.map((r) => `${r.parameterSetId}:${r.gridRankScore}`)).toEqual(
      y.ranking.map((r) => `${r.parameterSetId}:${r.gridRankScore}`),
    );
  });

  it("G. Campaign integration — each candidate isolates a single-parameter-set campaign", () => {
    const base = gridInputThreeCandidatesSameXauDataset();
    const r = runParameterGrid({
      ...base,
      testOnlyReplayStubByParameterSetId: {
        GRID_SET_A: replayStub({}),
        GRID_SET_B: replayStub({}),
        GRID_SET_C: replayStub({}),
      },
    });
    for (const c of r.candidates) {
      expect(c.campaignResult).not.toBeNull();
      expect(c.campaignResult!.summary.parameterSetCount).toBe(1);
      expect(c.campaignResult!.parameterSetResults).toHaveLength(1);
    }
  });
});
