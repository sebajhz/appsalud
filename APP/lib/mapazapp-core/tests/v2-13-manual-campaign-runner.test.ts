import { describe, expect, it } from "vitest";
import { createDefaultBacktestCampaignSettingsForTests } from "../src/backtest-campaign-settings";
import type { ManualCampaignInput } from "../src/manual-campaign-types";
import {
  v213BadManualCsvSource,
  v213BridgeBundleSource,
  v213ManualCsvSource,
  v213TestEaOnlySource,
} from "../src/manual-campaign-fixtures";
import { runManualDatasetCampaign } from "../src/manual-campaign-runner";
import { createEngineRealityStrategySettings } from "../src/engine-reality-fixtures";
import { createDefaultEntrySlTpSettingsForTests } from "../src/entry-sl-tp-model";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

function baseManualInput(partial: Pick<ManualCampaignInput, "sources">): ManualCampaignInput {
  const strategySettings = createEngineRealityStrategySettings();
  const tradePlanSettings = createDefaultTradePlanEvaluationSettingsForTests();
  const entrySlTpSettings = createDefaultEntrySlTpSettingsForTests();
  return {
    sources: partial.sources,
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

describe("V2-13 manual dataset campaign runner", () => {
  const profile = V1_TEST_SYMBOL_PROFILES.XAUUSD;

  it("A. Manual CSV campaign — imports generic OHLC, runs campaign, reviewOnly", () => {
    const r = runManualDatasetCampaign(
      baseManualInput({ sources: [v213ManualCsvSource(profile)] }),
    );
    expect(r.status === "completed" || r.status === "completed_with_warnings").toBe(true);
    expect(r.reviewOnly).toBe(true);
    expect(r.campaignResult).not.toBeNull();
    expect(r.summary.campaignDatasetsBuilt).toBe(1);
    expect(r.datasetResults[0]?.campaignDatasetCreated).toBe(true);
    expect(r.campaignResult!.summary.datasetCount).toBe(1);
  });

  it("B. BridgeEA bundle — validates sanitized bundle, extracts candles, runs campaign", () => {
    const r = runManualDatasetCampaign(
      baseManualInput({ sources: [v213BridgeBundleSource(profile)] }),
    );
    expect(r.status === "completed" || r.status === "completed_with_warnings").toBe(true);
    expect(r.campaignResult).not.toBeNull();
    expect(r.summary.campaignDatasetsBuilt).toBe(1);
    expect(r.datasetResults[0]?.import.bundleHadCandlesCsv).toBe(true);
    expect(r.campaignResult!.summary.datasetCount).toBe(1);
  });

  it("C. TestEA bundle only — validates, no candle campaign dataset", () => {
    const r = runManualDatasetCampaign(
      baseManualInput({ sources: [v213TestEaOnlySource(profile)] }),
    );
    expect(r.status).toBe("no_valid_datasets");
    expect(r.campaignResult).toBeNull();
    expect(r.summary.campaignDatasetsBuilt).toBe(0);
    expect(r.diagnostics.some((d) => d.code === "MANUAL_CAMPAIGN_TESTEA_EVIDENCE_ONLY")).toBe(true);
    expect(r.datasetResults[0]?.exportSampleValidation?.testEa?.summaryOk).toBe(true);
  });

  it("D. Mixed sources — valid manual CSV + invalid CSV still runs campaign with warnings", () => {
    const r = runManualDatasetCampaign(
      baseManualInput({
        sources: [v213ManualCsvSource(profile), v213BadManualCsvSource(profile)],
      }),
    );
    expect(r.status).toBe("completed_with_warnings");
    expect(r.campaignResult).not.toBeNull();
    expect(r.summary.campaignDatasetsBuilt).toBe(1);
    expect(r.datasetResults.some((x) => x.campaignDatasetCreated)).toBe(true);
    expect(r.datasetResults.some((x) => !x.campaignDatasetCreated)).toBe(true);
  });

  it("E. Bad CSV only — import_failed or no_valid_datasets with diagnostics", () => {
    const r = runManualDatasetCampaign(
      baseManualInput({ sources: [v213BadManualCsvSource(profile)] }),
    );
    expect(r.status === "import_failed" || r.status === "no_valid_datasets").toBe(true);
    expect(r.campaignResult).toBeNull();
    expect(r.diagnostics.some((d) => d.level === "error")).toBe(true);
  });

  it("F. Safety flags — no execution, registry, auto-approval, no approved field", () => {
    const r = runManualDatasetCampaign(
      baseManualInput({ sources: [v213ManualCsvSource(profile)] }),
    );
    expect(r.executionEnabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.autoApprovalEnabled).toBe(false);
    expect("approved" in r).toBe(false);
    expect(r.campaignResult && "approved" in r.campaignResult).toBe(false);
  });

  it("G. Determinism — same input yields same ranking summary", () => {
    const input = baseManualInput({ sources: [v213ManualCsvSource(profile)] });
    const a = runManualDatasetCampaign(input);
    const b = runManualDatasetCampaign(input);
    expect(a.campaignResult!.ranking).toEqual(b.campaignResult!.ranking);
    expect(a.campaignResult!.summary.validRunCount).toBe(b.campaignResult!.summary.validRunCount);
    expect(a.campaignResult!.summary.runCount).toBe(b.campaignResult!.summary.runCount);
  });
});
