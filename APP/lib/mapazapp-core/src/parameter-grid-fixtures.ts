/**
 * Synthetic parameter grid fixtures — not broker truth, not profitability evidence.
 */

import type { BacktestCampaignDataset, BacktestCampaignParameterSetInput } from "./backtest-campaign-types";
import { createDefaultBacktestCampaignSettingsForTests } from "./backtest-campaign-settings";
import { createEngineRealityFixtures, createEngineRealityStrategySettings } from "./engine-reality-fixtures";
import { createDefaultEntrySlTpSettingsForTests } from "./entry-sl-tp-model";
import { createDefaultTradePlanEvaluationSettingsForTests } from "./trade-plan-settings";
import { evaluateParameterSetCompatibility } from "./strategy-registry-evaluator";
import { createCheckpoint7MockParameterSetRegistry } from "./strategy-registry-fixtures";
import { createDefaultParameterGridSettingsForTests } from "./parameter-grid-settings";
import type { ParameterGridCandidate, ParameterGridInput } from "./parameter-grid-types";

function gridBasePs(parameterSetId: string, overrides?: Partial<BacktestCampaignParameterSetInput>): BacktestCampaignParameterSetInput {
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

function xauDataset(overrides?: Partial<BacktestCampaignDataset>): BacktestCampaignDataset {
  const reality = createEngineRealityFixtures();
  return {
    symbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    timeframe: "M15",
    candles: reality.CLEAN_BULLISH_IFVG.candles,
    symbolProfile: reality.CLEAN_BULLISH_IFVG.symbolProfile,
    datasetSplit: "validation",
    sourceName: "grid_fixture_xau",
    ...overrides,
  };
}

/** Three parameter set IDs over shared XAUUSD validation slice; pair with `testOnlyReplayStubByParameterSetId` in tests. */
export function gridInputThreeCandidatesSameXauDataset(): ParameterGridInput {
  return {
    datasets: [xauDataset()],
    candidates: [
      { parameterSet: gridBasePs("GRID_SET_A") },
      { parameterSet: gridBasePs("GRID_SET_B") },
      { parameterSet: gridBasePs("GRID_SET_C") },
    ],
    campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
    gridSettings: createDefaultParameterGridSettingsForTests(),
  };
}

export function gridInputMultiSymbolCompatibility(): ParameterGridInput {
  const reality = createEngineRealityFixtures();
  const eurProfile = { ...reality.CLEAN_BULLISH_IFVG.symbolProfile, canonicalSymbol: "EURUSD", brokerSymbol: "EURUSD" };
  return {
    datasets: [
      xauDataset(),
      {
        symbol: "EURUSD",
        brokerSymbol: "EURUSD",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: eurProfile,
        datasetSplit: "validation",
        sourceName: "grid_fixture_eur",
      },
    ],
    candidates: [
      { parameterSet: gridBasePs("GRID_XAU_ONLY"), compatibleCanonicalSymbols: ["XAUUSD"] },
      { parameterSet: gridBasePs("GRID_EUR_ONLY"), compatibleCanonicalSymbols: ["EURUSD"] },
      { parameterSet: gridBasePs("GRID_BTC_ONLY"), compatibleCanonicalSymbols: ["BTCUSD"] },
    ],
    campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
    gridSettings: createDefaultParameterGridSettingsForTests(),
  };
}

export function gridInputUnstableNas100(): ParameterGridInput {
  const reality = createEngineRealityFixtures();
  const profile = { ...reality.BEARISH_MIRROR_IFVG.symbolProfile, canonicalSymbol: "NAS100", brokerSymbol: "NAS100" };
  return {
    datasets: [
      {
        symbol: "NAS100",
        brokerSymbol: "NAS100",
        timeframe: "M15",
        candles: reality.CLEAN_BULLISH_IFVG.candles,
        symbolProfile: profile,
        datasetSplit: "train",
        sourceName: "nas_train",
      },
      {
        symbol: "NAS100",
        brokerSymbol: "NAS100",
        timeframe: "M15",
        candles: reality.OVER_SWEEP_BREAK_RISK.candles,
        symbolProfile: profile,
        datasetSplit: "validation",
        sourceName: "nas_val",
      },
    ],
    candidates: [{ parameterSet: gridBasePs("GRID_NAS_UNSTABLE") }],
    campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
    gridSettings: createDefaultParameterGridSettingsForTests(),
  };
}

export function gridCandidateRegistryBlockedNasOnXau(): ParameterGridCandidate {
  const reg = createCheckpoint7MockParameterSetRegistry();
  const compat = evaluateParameterSetCompatibility({
    strategyRegistry: reg,
    strategyId: "MZP_IFVG_ZONE_REACTION_V1",
    parameterSetId: "MZP_IFVG_NAS100_V1_SET_001",
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    accountId: "ACC_THE5ERS_100K_PHASE1_A",
    requestedUsage: "backtest",
  });
  return {
    parameterSet: gridBasePs("GRID_REG_MISMATCH"),
    registryCompatibility: compat,
  };
}
