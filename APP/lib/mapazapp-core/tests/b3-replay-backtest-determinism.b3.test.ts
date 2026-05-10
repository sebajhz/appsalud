import { describe, expect, it } from "vitest";
import { createDefaultBacktestCampaignSettingsForTests } from "../src/backtest-campaign-settings";
import type {
  BacktestCampaignDataset,
  BacktestCampaignInput,
  BacktestCampaignResult,
} from "../src/backtest-campaign-types";
import { createEngineRealityFixtures, createEngineRealityStrategySettings } from "../src/engine-reality-fixtures";
import { createDefaultEntrySlTpSettingsForTests } from "../src/entry-sl-tp-model";
import { createIfvgReplayBacktestFixtures } from "../src/ifvg-replay-backtest-fixtures";
import { runIfvgReplayBacktest } from "../src/ifvg-replay-backtest";
import type { IfvgReplayBacktestResult } from "../src/ifvg-replay-backtest-types";
import { v213ManualCsvSource } from "../src/manual-campaign-fixtures";
import type { ManualCampaignInput } from "../src/manual-campaign-types";
import { runManualDatasetCampaign } from "../src/manual-campaign-runner";
import {
  gridInputThreeCandidatesSameXauDataset,
} from "../src/parameter-grid-fixtures";
import { runParameterGrid } from "../src/parameter-grid-runner";
import { runBacktestCampaign } from "../src/backtest-campaign-runner";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
import {
  walkForwardFixtureGoodTrainValNoForward,
  walkForwardFixtureStableThreeSplits,
  walkForwardMinimalCampaign,
  wfSyntheticRun,
} from "../src/walk-forward-fixtures";
import { evaluateWalkForward } from "../src/walk-forward-evaluator";
import { createDefaultWalkForwardSettingsForTests, createDefaultWalkForwardSplitRequirementsForTests } from "../src/walk-forward-settings";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

const fx = createIfvgReplayBacktestFixtures();

/** Traverse plain JSON-serializable trees; every finite number must be Number.isFinite. */
function visitFiniteNumbers(value: unknown, path: string, onBad: (path: string, n: number) => void): void {
  if (value === null || value === undefined) return;
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value)) onBad(path, value);
    return;
  }
  if (t !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => visitFiniteNumbers(v, `${path}[${i}]`, onBad));
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    visitFiniteNumbers(v, `${path}.${k}`, onBad);
  }
}

function expectOnlyFiniteNumbers(root: unknown, label: string): void {
  const bad: { path: string; n: number }[] = [];
  visitFiniteNumbers(root, label, (path, n) => bad.push({ path, n }));
  expect(bad, `${label}: non-finite numbers`).toEqual([]);
}

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

function baseCampaignInput(datasets: BacktestCampaignDataset[]): BacktestCampaignInput {
  const reality = createEngineRealityFixtures();
  const strategySettings = createEngineRealityStrategySettings();
  const tradePlanSettings = createDefaultTradePlanEvaluationSettingsForTests();
  const entrySlTpSettings = createDefaultEntrySlTpSettingsForTests();
  return {
    datasets,
    parameterSets: [
      {
        parameterSetId: "PS_A",
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        strategySettings,
        tradePlanSettings,
        entrySlTpSettings,
      },
      {
        parameterSetId: "PS_B",
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        strategySettings,
        tradePlanSettings,
        entrySlTpSettings: { ...entrySlTpSettings, minRr: 2.5 },
      },
    ],
    campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
    defaultAccountGuardInput: {
      allowTradeReview: true,
      approvedParameterSetForAccount: true,
      spreadAllowed: true,
      operationalStatus: "TRADING_ALLOWED",
    },
    defaultRegistryCompatibility: null,
  };
}

function baseManualInput(sources: ManualCampaignInput["sources"]): ManualCampaignInput {
  const strategySettings = createEngineRealityStrategySettings();
  const tradePlanSettings = createDefaultTradePlanEvaluationSettingsForTests();
  const entrySlTpSettings = createDefaultEntrySlTpSettingsForTests();
  return {
    sources,
    parameterSets: [
      {
        parameterSetId: "PS_V213_A",
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        strategySettings,
        tradePlanSettings,
        entrySlTpSettings,
      },
      {
        parameterSetId: "PS_V213_B",
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        strategySettings,
        tradePlanSettings,
        entrySlTpSettings: { ...entrySlTpSettings, minRr: 2.5 },
      },
    ],
    campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
    privacyMode: "relaxed",
    defaultAccountGuardInput: {
      allowTradeReview: true,
      approvedParameterSetForAccount: true,
      spreadAllowed: true,
      operationalStatus: "TRADING_ALLOWED",
    },
    defaultRegistryCompatibility: null,
  };
}

/** B3 — block obvious operational-approval JSON tokens (review-only states may still mention trade review strings). */
/**
 * ZoneCandidate.createdAt uses wall-clock time in detection — unstable for byte-identical JSON.
 * B3 scrubs only this field in a cloned structure (test-only; no production change).
 */
function scrubIfvgReplayForStableSnapshot(r: IfvgReplayBacktestResult): unknown {
  const o = JSON.parse(JSON.stringify(r)) as IfvgReplayBacktestResult;
  const cands = o.detection?.candidates;
  if (cands) {
    for (const c of cands) {
      if (c && typeof c === "object" && "createdAt" in c) {
        (c as { createdAt?: string }).createdAt = "__B3_SCRUBBED_CREATED_AT__";
      }
    }
  }
  return o;
}

function stableIfvgReplayJson(r: IfvgReplayBacktestResult): string {
  return JSON.stringify(scrubIfvgReplayForStableSnapshot(r));
}

function assertNoOperationalApprovalTokens(json: string): void {
  expect(json).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"canAutoExecute"\s*:\s*true\b/);
  expect(json).not.toMatch(/"sendToMt5Enabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"autoApprovalEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"approved"\s*:\s*true\b/);
  const low = json.toLowerCase();
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("ready for trading");
  expect(low).not.toContain("execute order");
  expect(low).not.toContain("send order");
  expect(low).not.toContain("ordersend");
  expect(low).not.toContain("ctrade");
}

describe("B3 replay / backtest determinism and evidence stability", () => {
  it("A. IFVG replay — same fixture twice → identical JSON snapshot (createdAt scrubbed)", () => {
    const input = fx.CLEAN_ONE_TP;
    const a = runIfvgReplayBacktest(input);
    const b = runIfvgReplayBacktest(input);
    expect(stableIfvgReplayJson(a)).toBe(stableIfvgReplayJson(b));
    expectOnlyFiniteNumbers(a, "ifvgReplay");
    assertNoOperationalApprovalTokens(JSON.stringify(a));
  });

  it("A. IFVG replay — LOSS fixture deterministic (createdAt scrubbed)", () => {
    const input = fx.LOSS_AFTER_CONFIRM;
    const a = runIfvgReplayBacktest(input);
    const b = runIfvgReplayBacktest(input);
    expect(stableIfvgReplayJson(a)).toBe(stableIfvgReplayJson(b));
    expectOnlyFiniteNumbers(a, "ifvgReplayLoss");
  });

  it("B. Backtest campaign — same datasets + stubs → identical ranking + summary JSON", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "XAUUSD",
        brokerSymbol: "XAUUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "validation",
        testOnlyReplayOverride: replayStub({}),
      },
      {
        symbol: "EURUSD",
        brokerSymbol: "EURUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "validation",
        testOnlyReplayOverride: replayStub({
          summary: { ...replayStub({}).summary, totalR: -1, averageR: -0.2, winRate: 0.35, profitFactor: 0.7 },
        }),
      },
    ]);
    const ra = runBacktestCampaign(input);
    const rb = runBacktestCampaign(input);
    const slice = (r: BacktestCampaignResult) =>
      JSON.stringify({
        status: r.status,
        ranking: r.ranking,
        summary: r.summary,
        symbolResults: r.symbolResults,
        parameterSetResults: r.parameterSetResults,
        runResults: r.runResults.map((x) => ({
          parameterSetId: x.parameterSetId,
          symbol: x.symbol,
          datasetSplit: x.datasetSplit,
          status: x.status,
          rankScore: x.rankScore,
          tradeCount: x.tradeCount,
          totalR: x.totalR,
          averageR: x.averageR,
        })),
      });
    expect(slice(ra)).toBe(slice(rb));
    expect(ra.ranking[0]!.score).toBeGreaterThanOrEqual(ra.ranking[1]!.score);
    expectOnlyFiniteNumbers(ra, "campaign");
    assertNoOperationalApprovalTokens(JSON.stringify(ra));
  });

  it("C. Parameter grid — deterministic ranking order and full JSON match with fixed stubs", () => {
    const base = gridInputThreeCandidatesSameXauDataset();
    const input = {
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
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.ranking.map((x) => x.parameterSetId)).toEqual(b.ranking.map((x) => x.parameterSetId));
    for (let i = 1; i < a.ranking.length; i++) {
      expect(a.ranking[i - 1]!.gridRankScore).toBeGreaterThanOrEqual(a.ranking[i]!.gridRankScore);
    }
    expectOnlyFiniteNumbers(a, "parameterGrid");
    assertNoOperationalApprovalTokens(JSON.stringify(a));
  });

  it("D1. Walk-forward — stable fixture → identical JSON", () => {
    const wfInput = {
      splitRequirements: { requireTrain: true, requireValidation: true, requireForward: true },
      settings: createDefaultWalkForwardSettingsForTests(),
      campaignResult: walkForwardFixtureStableThreeSplits(),
    };
    const a = evaluateWalkForward(wfInput);
    const b = evaluateWalkForward(wfInput);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expectOnlyFiniteNumbers(a, "walkForwardStable");
    assertNoOperationalApprovalTokens(JSON.stringify(a));
    expect(a.executionEnabled).toBe(false);
    expect(a.autoApprovalEnabled).toBe(false);
  });

  it("D2. Walk-forward — missing forward stays conservative (promising_but_unproven / missing splits)", () => {
    const r = evaluateWalkForward({
      campaignResult: walkForwardFixtureGoodTrainValNoForward(),
      splitRequirements: { requireTrain: true, requireValidation: true, requireForward: true },
      settings: createDefaultWalkForwardSettingsForTests(),
    });
    expect(r.status).toBe("missing_required_splits");
    expect(r.parameterSetResults[0]?.recommendation).toBe("promising_but_unproven");
    expectOnlyFiniteNumbers(r, "walkForwardNoForward");
    assertNoOperationalApprovalTokens(JSON.stringify(r));
  });

  it("D3. Walk-forward — missing validation → needs_more_data, finite metrics", () => {
    const campaign = walkForwardMinimalCampaign([
      wfSyntheticRun({
        symbol: "EURUSD",
        parameterSetId: "PS_A",
        datasetSplit: "train",
        rankScore: 60,
        tradeCount: 10,
        averageR: 0.3,
        profitFactor: 1.1,
        maxDrawdownR: 2,
      }),
    ]);
    const r = evaluateWalkForward({
      splitRequirements: createDefaultWalkForwardSplitRequirementsForTests(),
      settings: createDefaultWalkForwardSettingsForTests(),
      campaignResult: campaign,
    });
    expect(r.status).toBe("missing_required_splits");
    expect(r.parameterSetResults[0]?.symbolResults[0]?.recommendation).toBe("needs_more_data");
    expectOnlyFiniteNumbers(r, "walkForwardMissingVal");
  });

  it("E. Manual dataset campaign — deterministic ranking/summary + finite metrics", () => {
    const profile = V1_TEST_SYMBOL_PROFILES.XAUUSD;
    const input = baseManualInput([v213ManualCsvSource(profile)]);
    const a = runManualDatasetCampaign(input);
    const b = runManualDatasetCampaign(input);
    expect(a.status).toBe(b.status);
    expect(a.campaignResult).not.toBeNull();
    expect(b.campaignResult).not.toBeNull();
    expect(a.campaignResult!.ranking).toEqual(b.campaignResult!.ranking);
    expect(a.campaignResult!.summary.validRunCount).toBe(b.campaignResult!.summary.validRunCount);
    expect(a.campaignResult!.summary.runCount).toBe(b.campaignResult!.summary.runCount);
    expect(JSON.stringify(a.campaignResult!.parameterSetResults)).toBe(
      JSON.stringify(b.campaignResult!.parameterSetResults),
    );
    expectOnlyFiniteNumbers(a, "manualCampaign");
    assertNoOperationalApprovalTokens(JSON.stringify(a));
    expect(a.executionEnabled).toBe(false);
    expect(a.autoApprovalEnabled).toBe(false);
  });

  it("F. Anti-lookahead timing metadata — indices coherent when present (firstReplayIndex optional)", () => {
    const r = runIfvgReplayBacktest(fx.CLEAN_ONE_TP);
    const z = r.detection?.candidates[0];
    const tm = z?.candidateTiming;
    expect(tm).toBeDefined();
    const created = tm!.candidateCreatedIndex!;
    const br = tm!.ifvgBreakIndex;
    if (br != null) {
      expect(created).toBeGreaterThanOrEqual(br);
    }
    expect(tm!.firstRetestSearchIndex!).toBeGreaterThanOrEqual(created);
    const fr = tm!.firstReplayIndex;
    const frs = tm!.firstRetestSearchIndex;
    if (fr != null && frs != null) {
      expect(fr).toBeGreaterThanOrEqual(frs);
    }
    const fs = tm!.fvgStartIndex;
    const fm = tm!.fvgMiddleIndex;
    const fe = tm!.fvgEndIndex;
    if (fs != null && fm != null && fe != null) {
      expect(fs).toBeLessThanOrEqual(fm);
      expect(fm).toBeLessThanOrEqual(fe);
      if (br != null) {
        expect(fe).toBeLessThanOrEqual(br);
      }
    }
    const withReplay = r.traces.filter((t) => t.replay != null && t.replaySliceStartBarIndex != null);
    for (const t of withReplay) {
      expect(t.replaySliceStartBarIndex!).toBeGreaterThanOrEqual(created);
    }
  });

  it("G. Gap note — candidateTiming.firstReplayIndex may be omitted (filled only when supplied downstream)", () => {
    const r = runIfvgReplayBacktest(fx.CLEAN_ONE_TP);
    const tm = r.detection?.candidates[0]?.candidateTiming;
    expect(tm).toBeDefined();
    expect(tm!.candidateCreatedIndex).toBeDefined();
    expect(tm!.firstRetestSearchIndex).toBeDefined();
  });
});
