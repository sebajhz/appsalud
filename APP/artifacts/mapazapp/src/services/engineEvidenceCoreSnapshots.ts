/**
 * In-process snapshots mirroring api-server V2-16 mock-latest adapters (same core fixtures).
 * Used by mock data sources; not HTTP.
 */

import {
  createBacktestCampaignFixtures,
  createDefaultBacktestCampaignSettingsForTests,
  createDefaultEntrySlTpSettingsForTests,
  createDefaultParameterGridSettingsForTests,
  createDefaultTradePlanEvaluationSettingsForTests,
  createDefaultWalkForwardSettingsForTests,
  createEngineRealityFixtures,
  createEngineRealityStrategySettings,
  evaluateWalkForward,
  gridInputThreeCandidatesSameXauDataset,
  runBacktestCampaign,
  runManualDatasetCampaign,
  runParameterGrid,
  v213ManualCsvSource,
  walkForwardFixtureStableThreeSplits,
  type BacktestCampaignInput,
  type BacktestCampaignResult,
  type IfvgReplayBacktestResult,
  type ManualCampaignInput,
  type ManualCampaignResult,
  type ParameterGridResult,
  type WalkForwardResult,
} from "@workspace/mapazapp-core";

function replayStub(partial?: Partial<IfvgReplayBacktestResult>): IfvgReplayBacktestResult {
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
      winRate: 0.625531914893617,
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

function withReplayStubs(input: BacktestCampaignInput): BacktestCampaignInput {
  const stub = replayStub();
  return {
    ...input,
    datasets: input.datasets.map((d) => ({
      ...d,
      testOnlyReplayOverride: stub,
    })),
  };
}

let backtestCache: BacktestCampaignResult | null = null;
let gridCache: ParameterGridResult | null = null;
let walkForwardCache: WalkForwardResult | null = null;
let manualCache: ManualCampaignResult | null = null;

export function getEngineEvidenceBacktestCampaignSnapshot(): BacktestCampaignResult {
  if (!backtestCache) {
    const fx = createBacktestCampaignFixtures();
    backtestCache = runBacktestCampaign(withReplayStubs(fx.XAUUSD_PROMISING_SYNTHETIC));
  }
  return backtestCache;
}

export function getEngineEvidenceParameterGridSnapshot(): ParameterGridResult {
  if (!gridCache) {
    const base = gridInputThreeCandidatesSameXauDataset();
    const stubA = replayStub();
    const stubB = replayStub({
      summary: {
        ...stubA.summary,
        replayedTradeCount: 2,
        totalR: 0.5,
        averageR: 0.25,
        wins: 1,
        losses: 1,
      },
    });
    const stubC = replayStub({
      summary: {
        ...stubA.summary,
        replayedTradeCount: 6,
        totalR: 2.1,
        averageR: 0.35,
        wins: 4,
        losses: 2,
      },
    });
    gridCache = runParameterGrid({
      datasets: base.datasets,
      candidates: base.candidates,
      campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
      gridSettings: createDefaultParameterGridSettingsForTests(),
      testOnlyReplayStubByParameterSetId: {
        GRID_SET_A: stubA,
        GRID_SET_B: stubB,
        GRID_SET_C: stubC,
      },
    });
  }
  return gridCache;
}

export function getEngineEvidenceWalkForwardSnapshot(): WalkForwardResult {
  if (!walkForwardCache) {
    walkForwardCache = evaluateWalkForward({
      campaignResult: walkForwardFixtureStableThreeSplits(),
      splitRequirements: { requireTrain: true, requireValidation: true, requireForward: true },
      settings: createDefaultWalkForwardSettingsForTests(),
    });
  }
  return walkForwardCache;
}

function buildManualInput(): ManualCampaignInput {
  const reality = createEngineRealityFixtures();
  const strategySettings = createEngineRealityStrategySettings();
  const tradePlanSettings = createDefaultTradePlanEvaluationSettingsForTests();
  const entrySlTpSettings = createDefaultEntrySlTpSettingsForTests();
  return {
    sources: [v213ManualCsvSource(reality.CLEAN_BULLISH_IFVG.symbolProfile)],
    parameterSets: [
      {
        parameterSetId: "PS_V216_MOCK_A",
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        strategySettings,
        tradePlanSettings,
        entrySlTpSettings,
      },
      {
        parameterSetId: "PS_V216_MOCK_B",
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

export function getEngineEvidenceManualCampaignSnapshot(): ManualCampaignResult {
  if (!manualCache) {
    manualCache = runManualDatasetCampaign(buildManualInput());
  }
  return manualCache;
}
