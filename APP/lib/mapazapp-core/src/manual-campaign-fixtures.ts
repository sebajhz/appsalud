/**
 * Sanitized synthetic inputs for V2-13 manual campaign tests — not real exports or market data.
 */

import type { ManualCampaignSource } from "./manual-campaign-types";
import { createEngineRealityFixtures } from "./engine-reality-fixtures";
import type { ExportSampleFileText } from "./export-sample-validation-types";
import {
  v212SanitizedBridgeBundleFiles,
  v212SanitizedTestEaBundleFiles,
} from "./export-sample-validation-fixtures";
import { V2_11_BAD_OHLC_ALL_FAIL_CSV } from "./manual-candle-dataset-fixtures";

function candlesToGenericOhlcCsv(
  candles: { time: number; open: number; high: number; low: number; close: number }[],
): string {
  const lines = ["timestamp,open,high,low,close"];
  for (const c of candles) {
    lines.push(`${new Date(c.time).toISOString()},${c.open},${c.high},${c.low},${c.close}`);
  }
  return lines.join("\n");
}

/** Generic OHLC text derived from the clean bullish IFVG synthetic fixture (XAUUSD M15). */
export function v213GenericOhlcXauusdFixtureCsv(): string {
  const f = createEngineRealityFixtures();
  return candlesToGenericOhlcCsv(f.CLEAN_BULLISH_IFVG.candles);
}

export function v213SanitizedBridgeBundleFiles(): ExportSampleFileText[] {
  return v212SanitizedBridgeBundleFiles();
}

export function v213SanitizedTestEaBundleFiles(): ExportSampleFileText[] {
  return v212SanitizedTestEaBundleFiles();
}

export const V2_13_BAD_MANUAL_CSV = V2_11_BAD_OHLC_ALL_FAIL_CSV;

export function v213ManualCsvSource(symbolProfile: ManualCampaignSource["symbolProfile"]): ManualCampaignSource {
  return {
    sourceName: "v213_generic_ohlc_xauusd",
    sourceType: "manual_csv_text",
    csvText: v213GenericOhlcXauusdFixtureCsv(),
    expectedCanonicalSymbol: "XAUUSD",
    expectedBrokerSymbol: "XAUUSDm",
    expectedTimeframe: "M15",
    datasetSplit: "full",
    symbolProfile,
  };
}

export function v213BridgeBundleSource(symbolProfile: ManualCampaignSource["symbolProfile"]): ManualCampaignSource {
  return {
    sourceName: "v213_bridge_bundle",
    sourceType: "bridge_export_bundle_text",
    files: v213SanitizedBridgeBundleFiles(),
    expectedCanonicalSymbol: "XAUUSD",
    expectedTimeframe: "M15",
    datasetSplit: "full",
    symbolProfile,
  };
}

export function v213TestEaOnlySource(symbolProfile: ManualCampaignSource["symbolProfile"]): ManualCampaignSource {
  return {
    sourceName: "v213_testea_only",
    sourceType: "testea_export_bundle_text",
    files: v213SanitizedTestEaBundleFiles(),
    expectedCanonicalSymbol: "XAUUSD",
    datasetSplit: "validation",
    symbolProfile,
  };
}

export function v213BadManualCsvSource(symbolProfile: ManualCampaignSource["symbolProfile"]): ManualCampaignSource {
  return {
    sourceName: "v213_bad_csv",
    sourceType: "manual_csv_text",
    csvText: V2_13_BAD_MANUAL_CSV,
    expectedCanonicalSymbol: "XAUUSD",
    expectedTimeframe: "M15",
    datasetSplit: "full",
    symbolProfile,
  };
}
