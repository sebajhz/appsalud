import type { Candle } from "./candle";
import type { BacktestCampaignDataset } from "./backtest-campaign-types";
import type { SymbolMarketSpec } from "./symbol-profile";

export type ManualCandleDatasetSourceType =
  | "manual_csv_text"
  | "bridge_candles_csv_text"
  | "generic_ohlc_csv_text"
  | "mt5_export_csv_text"
  | "unknown";

export type ManualCandleDatasetFormat =
  | "mapazapp_bridge_candles_v1"
  | "generic_ohlc"
  | "mt5_rates_like"
  | "auto_detect";

export type ManualCandleDatasetWarningCode =
  | "MANUAL_ROW_SKIPPED"
  | "MANUAL_SYMBOL_MISMATCH"
  | "MANUAL_TIMEFRAME_MISMATCH"
  | "MANUAL_DUPLICATE_TIMESTAMPS"
  | "MANUAL_ROWS_REORDERED"
  | "MANUAL_LOW_ROW_COUNT"
  | "MANUAL_UNKNOWN_SOURCE_TYPE";

export type ManualCandleDatasetErrorCode =
  | "MANUAL_CSV_EMPTY"
  | "MANUAL_MISSING_HEADER"
  | "MANUAL_FORMAT_UNRECOGNIZED"
  | "MANUAL_MISSING_REQUIRED_COLUMNS"
  | "MANUAL_NO_VALID_ROWS"
  | "MANUAL_FORMAT_HINT_MISMATCH";

export interface ManualCandleDatasetWarning {
  code: ManualCandleDatasetWarningCode;
  message: string;
  rowIndex?: number;
  detail?: string;
}

export interface ManualCandleDatasetError {
  code: ManualCandleDatasetErrorCode;
  message: string;
  detail?: string;
}

/** One logical row after parse (audit / tooling); optional on dataset. */
export interface ManualCandleDatasetRow {
  timeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume?: number;
  spreadPoints?: number;
  realVolume?: number;
  isClosed?: boolean;
  rawSymbol?: string;
  rawTimeframe?: string;
}

export interface ManualCandleDataset {
  candles: Candle[];
  canonicalSymbol: string;
  brokerSymbol?: string;
  timeframe: string;
  datasetSplit: BacktestCampaignDataset["datasetSplit"];
  sourceName?: string;
  sourceType: ManualCandleDatasetSourceType;
  /** Resolved concrete format (never `auto_detect`). */
  detectedFormat: Exclude<ManualCandleDatasetFormat, "auto_detect">;
  rowCount: number;
  validRowCount: number;
  skippedRowCount: number;
  /** Optional row-level audit trail (synthetic imports / tests). */
  rows?: ManualCandleDatasetRow[];
}

export interface ManualCandleDatasetValidationSummary {
  delimiter: "," | ";" | "\t";
  resolvedFormat: Exclude<ManualCandleDatasetFormat, "auto_detect"> | "unknown";
  duplicateTimestampCount: number;
  hadUnsortedInput: boolean;
  rowCount: number;
  validRowCount: number;
  skippedRowCount: number;
}

export interface ManualCandleDatasetImportInput {
  csvText: string;
  canonicalSymbol: string;
  brokerSymbol?: string;
  timeframe: string;
  datasetSplit: BacktestCampaignDataset["datasetSplit"];
  sourceName?: string;
  /** When set, used as `sourceType` on success; may still parse as any supported wire shape. */
  sourceTypeHint?: ManualCandleDatasetSourceType;
  formatHint?: ManualCandleDatasetFormat;
  /** When set and `validRowCount` is lower, a warning is emitted (dataset still ok if rows exist). */
  minRows?: number;
  /** When true, populated `rows` on `ManualCandleDataset` (memory). Default false. */
  includeParsedRows?: boolean;
}

export interface ManualCandleDatasetImportResult {
  ok: boolean;
  dataset: ManualCandleDataset | null;
  errors: ManualCandleDatasetError[];
  warnings: ManualCandleDatasetWarning[];
  validationSummary: ManualCandleDatasetValidationSummary;
}

export interface CreateBacktestCampaignDatasetFromManualImportOptions {
  symbolProfile: SymbolMarketSpec | null;
  datasetId?: string;
}
