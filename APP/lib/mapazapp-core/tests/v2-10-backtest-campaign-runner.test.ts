import { describe, expect, it } from "vitest";
import { runBacktestCampaign } from "../src/backtest-campaign-runner";
import { createDefaultBacktestCampaignSettingsForTests } from "../src/backtest-campaign-settings";
import type { BacktestCampaignDataset, BacktestCampaignInput } from "../src/backtest-campaign-types";
import { createEngineRealityFixtures, createEngineRealityStrategySettings } from "../src/engine-reality-fixtures";
import { createDefaultEntrySlTpSettingsForTests } from "../src/entry-sl-tp-model";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
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

describe("V2-10 campaign validation", () => {
  it("no datasets => insufficient_data", () => {
    const input = baseCampaignInput([]);
    const r = runBacktestCampaign(input);
    expect(r.status).toBe("insufficient_data");
  });

  it("empty candles => not_rankable path in symbol recommendation", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "XAUUSD",
        brokerSymbol: "XAUUSD",
        timeframe: "M15",
        candles: [],
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "unknown",
      },
    ]);
    const r = runBacktestCampaign(input);
    expect(r.symbolResults[0]?.recommendation).toBe("not_rankable");
  });
});

describe("V2-10 symbol ranking", () => {
  it("returns ranking rows per symbol sorted desc", () => {
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
    const r = runBacktestCampaign(input);
    expect(r.ranking.length).toBe(2);
    expect(r.ranking[0]!.score).toBeGreaterThanOrEqual(r.ranking[1]!.score);
  });
});

describe("V2-10 recommendations", () => {
  it("low trade count => needs_more_data", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "EURUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "validation",
        testOnlyReplayOverride: replayStub({
          summary: { ...replayStub({}).summary, replayedTradeCount: 2, totalR: 0.8, averageR: 0.4 },
        }),
      },
    ]);
    const r = runBacktestCampaign(input);
    expect(r.symbolResults[0]!.recommendation).toBe("needs_more_data");
  });

  it("negative result => rejected", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "BTCUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "validation",
        testOnlyReplayOverride: replayStub({
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
    ]);
    const r = runBacktestCampaign(input);
    expect(r.symbolResults[0]!.recommendation).toBe("rejected");
  });

  it("mixed runs => unstable", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "NAS100",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "train",
        testOnlyReplayOverride: replayStub({ summary: { ...replayStub({}).summary, totalR: 8, averageR: 0.8 } }),
      },
      {
        symbol: "NAS100",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "validation",
        testOnlyReplayOverride: replayStub({
          summary: { ...replayStub({}).summary, totalR: -0.2, averageR: -0.01, profitFactor: 0.99, maxDrawdownR: 2.5 },
          diagnostics: [{ code: "PIPELINE_INTERNAL", message: "forced variance" }],
        }),
      },
    ]);
    const r = runBacktestCampaign(input);
    expect(r.symbolResults[0]!.recommendation).toBe("unstable");
  });

  it("positive but unknown split only => promising_but_unproven", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "XAUUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "unknown",
        testOnlyReplayOverride: replayStub({
          summary: { ...replayStub({}).summary, replayedTradeCount: 18, totalR: 9, averageR: 0.5 },
        }),
      },
    ]);
    const r = runBacktestCampaign(input);
    expect(r.symbolResults[0]!.recommendation).toBe("promising_but_unproven");
  });
});

describe("V2-10 parameter set aggregation", () => {
  it("aggregates by parameterSetId and keeps review-only safety", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "XAUUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "validation",
        testOnlyReplayOverride: replayStub({}),
      },
    ]);
    const r = runBacktestCampaign(input);
    expect(r.parameterSetResults.length).toBe(2);
    expect(r.registryMutationAllowed).toBe(false);
  });
});

describe("V2-10 diagnostics penalty", () => {
  it("severe diagnostics lower rank score", () => {
    const reality = createEngineRealityFixtures();
    const clean = runBacktestCampaign(
      baseCampaignInput([
        {
          symbol: "XAUUSD",
          timeframe: "M15",
          candles: reality.CLEAN_BULLISH_IFVG.candles,
          symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
          datasetSplit: "validation",
          testOnlyReplayOverride: replayStub({}),
        },
      ]),
    );
    const penalized = runBacktestCampaign(
      baseCampaignInput([
        {
          symbol: "XAUUSD",
          timeframe: "M15",
          candles: reality.CLEAN_BULLISH_IFVG.candles,
          symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
          datasetSplit: "validation",
          testOnlyReplayOverride: replayStub({
            diagnostics: [{ code: "PIPELINE_INTERNAL", message: "forced" }],
          }),
        },
      ]),
    );
    expect(penalized.symbolResults[0]!.rankScore).toBeLessThan(clean.symbolResults[0]!.rankScore);
  });
});

describe("V2-10 no auto-approval + determinism", () => {
  it("never exposes approval mutation flags", () => {
    const reality = createEngineRealityFixtures();
    const r = runBacktestCampaign(
      baseCampaignInput([
        {
          symbol: "XAUUSD",
          timeframe: "M15",
          candles: reality.CLEAN_BULLISH_IFVG.candles,
          symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
          datasetSplit: "validation",
          testOnlyReplayOverride: replayStub({}),
        },
      ]),
    );
    expect(r.executionEnabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.reviewOnly).toBe(true);
  });

  it("same input => same ranking", () => {
    const reality = createEngineRealityFixtures();
    const input = baseCampaignInput([
      {
        symbol: "XAUUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
        datasetSplit: "validation",
        testOnlyReplayOverride: replayStub({}),
      },
    ]);
    expect(runBacktestCampaign(input).ranking).toEqual(runBacktestCampaign(input).ranking);
  });
});
