import type { BacktestCampaignDataset } from "./backtest-campaign-types";
import type { BacktestImportResult } from "./backtest-types";
import type { BridgeStatusSnapshot } from "./bridge-types";
import type { ManualCandleDatasetImportResult } from "./manual-candle-dataset-types";
import type { SymbolMarketSpec } from "./symbol-profile";

export type ExportSampleBundleKind =
  | "bridge_ea_export_bundle"
  | "testea_export_bundle"
  | "mixed_export_bundle"
  | "unknown";

export type ExportSampleFileKind =
  | "bridge_status_json"
  | "latest_market_snapshot_csv"
  | "account_snapshot_csv"
  | "candles_csv"
  | "positions_open_csv"
  | "orders_pending_csv"
  | "deals_history_csv"
  | "bridge_errors_csv"
  | "backtest_trades_csv"
  | "backtest_summary_json";

export type ExportSampleValidationStatus =
  | "valid"
  | "valid_with_warnings"
  | "invalid"
  | "insufficient_files";

export type ExportSampleDiagnosticLevel = "info" | "warning" | "error";

export interface ExportSampleValidationDiagnostic {
  level: ExportSampleDiagnosticLevel;
  code: string;
  message: string;
  fileName?: string;
  detail?: string;
}

export interface ExportSampleFileText {
  fileName: string;
  /** When omitted, inferred from `fileName` where possible. */
  fileKind?: ExportSampleFileKind;
  text: string;
}

export interface ExportSamplePrivacyCheckResult {
  mode: "strict" | "relaxed";
  /** False when strict mode recorded one or more error-level findings. */
  passed: boolean;
  findings: ExportSampleValidationDiagnostic[];
}

export interface ExportSampleValidationInput {
  bundleKind: ExportSampleBundleKind;
  files: ExportSampleFileText[];
  expectedCanonicalSymbol?: string;
  expectedBrokerSymbol?: string;
  expectedTimeframe?: string;
  symbolProfile?: SymbolMarketSpec | null;
  privacyMode: "strict" | "relaxed";
  /** Passed through to `importManualCandleDataset` for candles. Default `unknown`. */
  datasetSplit?: BacktestCampaignDataset["datasetSplit"];
  sourceName?: string;
}

export interface BridgeExportValidationResult {
  /** Sub-status for Bridge-only diagnostics (aggregated into bundle `status`). */
  status: ExportSampleValidationStatus;
  statusSnapshot: BridgeStatusSnapshot | null;
  statusJsonOk: boolean;
  /** Advisory when `schema_version` is legacy alias but parse succeeded. */
  schemaVersionNote?: string;
  candlesManualImport: ManualCandleDatasetImportResult | null;
  campaignDataset: BacktestCampaignDataset | null;
  marketSnapshotOk: boolean;
  marketSnapshotRowCount: number;
  accountSnapshotOk: boolean;
  accountSnapshotRowCount: number;
  positionsOk: boolean;
  positionsRowCount: number;
  ordersOk: boolean;
  ordersRowCount: number;
  dealsOk: boolean;
  dealsRowCount: number;
  errorsCsvOk: boolean;
  errorsCsvRowCount: number;
  diagnostics: ExportSampleValidationDiagnostic[];
}

export interface TestEaExportValidationResult {
  status: ExportSampleValidationStatus;
  tradesImport: BacktestImportResult | null;
  tradeCount: number;
  summaryParsed: boolean;
  summaryOk: boolean;
  summaryTradeCount: number | null;
  summaryJson: Record<string, unknown> | null;
  diagnostics: ExportSampleValidationDiagnostic[];
}

export interface ExportSampleValidationResult {
  status: ExportSampleValidationStatus;
  bundleKind: ExportSampleBundleKind;
  privacy: ExportSamplePrivacyCheckResult;
  diagnostics: ExportSampleValidationDiagnostic[];
  bridge: BridgeExportValidationResult | null;
  testEa: TestEaExportValidationResult | null;
  executionEnabled: false;
  registryMutationAllowed: false;
  reviewOnly: true;
}
