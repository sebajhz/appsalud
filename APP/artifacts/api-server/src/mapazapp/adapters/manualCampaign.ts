import {
  createDefaultBacktestCampaignSettingsForTests,
  createDefaultEntrySlTpSettingsForTests,
  createDefaultTradePlanEvaluationSettingsForTests,
  createEngineRealityFixtures,
  createEngineRealityStrategySettings,
  runManualDatasetCampaign,
  v213ManualCsvSource,
  type ManualCampaignInput,
  type ManualCampaignResult,
} from "@workspace/mapazapp-core";

function buildMockLatestManualInput(): ManualCampaignInput {
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

let cached: ManualCampaignResult | null = null;

/** Latest mock manual pipeline: V2-13 generic OHLC CSV fixture → campaign (full replay on imported candles). */
export function getMockLatestManualCampaign(): ManualCampaignResult {
  if (!cached) {
    cached = runManualDatasetCampaign(buildMockLatestManualInput());
  }
  return cached;
}
