import type { BacktestCampaignInput, BacktestCampaignParameterSetInput } from "./backtest-campaign-types";
import { createDefaultBacktestCampaignSettingsForTests } from "./backtest-campaign-settings";
import { createEngineRealityFixtures, createEngineRealityStrategySettings } from "./engine-reality-fixtures";
import { createDefaultEntrySlTpSettingsForTests } from "./entry-sl-tp-model";
import { createDefaultTradePlanEvaluationSettingsForTests } from "./trade-plan-settings";

function cloneCandles(candles: import("./candle").Candle[]): import("./candle").Candle[] {
  return candles.map((x) => ({ ...x }));
}

function baseParameterSet(
  parameterSetId: string,
  overrides?: Partial<BacktestCampaignParameterSetInput>,
): BacktestCampaignParameterSetInput {
  const strategySettings = createEngineRealityStrategySettings();
  const tradePlanSettings = createDefaultTradePlanEvaluationSettingsForTests();
  tradePlanSettings.testOrDevMode = false;
  tradePlanSettings.requireApprovedParameterSet = true;
  const entrySlTpSettings = createDefaultEntrySlTpSettingsForTests();
  entrySlTpSettings.minRr = 1.5;
  return {
    parameterSetId,
    strategyId: "MZP_IFVG_ZONE_REACTION_V1",
    strategySettings,
    tradePlanSettings,
    entrySlTpSettings,
    ...overrides,
  };
}

export function createBacktestCampaignFixtures(): {
  XAUUSD_PROMISING_SYNTHETIC: BacktestCampaignInput;
  EURUSD_NEEDS_MORE_DATA: BacktestCampaignInput;
  NAS100_UNSTABLE: BacktestCampaignInput;
  BTCUSD_REJECTED: BacktestCampaignInput;
  EMPTY_NO_CANDIDATE: BacktestCampaignInput;
} {
  const reality = createEngineRealityFixtures();

  const psBase = baseParameterSet("MZP_IFVG_CAMPAIGN_BASE");
  const psAggressive = baseParameterSet("MZP_IFVG_CAMPAIGN_AGGRESSIVE", {
    entrySlTpSettings: { ...psBase.entrySlTpSettings, minRr: 1.1, fixedRTarget: 1.5 },
  });

  const commonSettings = createDefaultBacktestCampaignSettingsForTests();

  return {
    XAUUSD_PROMISING_SYNTHETIC: {
      datasets: [
        {
          symbol: "XAUUSD",
          brokerSymbol: "XAUUSD",
          timeframe: "M15",
          candles: cloneCandles(reality.CLEAN_BULLISH_IFVG.candles),
          symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
          datasetSplit: "train",
          sourceName: "synthetic_clean",
        },
        {
          symbol: "XAUUSD",
          brokerSymbol: "XAUUSD",
          timeframe: "M15",
          candles: cloneCandles(reality.NEAR_SWEEP_BULLISH_IFVG.candles),
          symbolProfile: reality.NEAR_SWEEP_BULLISH_IFVG.symbolProfile,
          datasetSplit: "validation",
          sourceName: "synthetic_near",
        },
      ],
      parameterSets: [psBase, psAggressive],
      campaignSettings: commonSettings,
    },
    EURUSD_NEEDS_MORE_DATA: {
      datasets: [
        {
          symbol: "EURUSD",
          brokerSymbol: "EURUSD",
          timeframe: "M15",
          candles: cloneCandles(reality.CLEAN_BULLISH_IFVG.candles).slice(0, 12),
          symbolProfile: { ...reality.CLEAN_BULLISH_IFVG.symbolProfile, canonicalSymbol: "EURUSD", brokerSymbol: "EURUSD" },
          datasetSplit: "unknown",
          sourceName: "tiny_synthetic",
        },
      ],
      parameterSets: [psBase],
      campaignSettings: commonSettings,
    },
    NAS100_UNSTABLE: {
      datasets: [
        {
          symbol: "NAS100",
          brokerSymbol: "NAS100",
          timeframe: "M15",
          candles: cloneCandles(reality.CLEAN_BULLISH_IFVG.candles),
          symbolProfile: reality.BEARISH_MIRROR_IFVG.symbolProfile,
          datasetSplit: "train",
          sourceName: "up_leg",
        },
        {
          symbol: "NAS100",
          brokerSymbol: "NAS100",
          timeframe: "M15",
          candles: cloneCandles(reality.OVER_SWEEP_BREAK_RISK.candles),
          symbolProfile: reality.BEARISH_MIRROR_IFVG.symbolProfile,
          datasetSplit: "validation",
          sourceName: "down_leg",
        },
      ],
      parameterSets: [psBase, psAggressive],
      campaignSettings: { ...commonSettings, highVarianceScoreStdDev: 10 },
    },
    BTCUSD_REJECTED: {
      datasets: [
        {
          symbol: "BTCUSD",
          brokerSymbol: "BTCUSD",
          timeframe: "M15",
          candles: cloneCandles(reality.OVER_SWEEP_BREAK_RISK.candles),
          symbolProfile: reality.OVER_SWEEP_BREAK_RISK.symbolProfile,
          datasetSplit: "train",
          sourceName: "volatile_break_risk",
        },
        {
          symbol: "BTCUSD",
          brokerSymbol: "BTCUSD",
          timeframe: "M15",
          candles: cloneCandles(reality.LATE_TRADE_ALREADY_PASSED.candles),
          symbolProfile: reality.OVER_SWEEP_BREAK_RISK.symbolProfile,
          datasetSplit: "validation",
          sourceName: "late_chase",
        },
      ],
      parameterSets: [psAggressive],
      campaignSettings: commonSettings,
    },
    EMPTY_NO_CANDIDATE: {
      datasets: [
        {
          symbol: "XAUUSD",
          brokerSymbol: "XAUUSD",
          timeframe: "M15",
          candles: [],
          symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
          datasetSplit: "unknown",
          sourceName: "empty",
        },
      ],
      parameterSets: [psBase],
      campaignSettings: commonSettings,
    },
  };
}
