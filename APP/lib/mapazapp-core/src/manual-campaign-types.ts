import type { BacktestCampaignInput, BacktestCampaignResult } from "./backtest-campaign-types";
import type { ImportBacktestCsvOptions } from "./backtest-types";
import type { ExportSampleFileText, ExportSampleValidationResult, ExportSampleValidationStatus } from "./export-sample-validation-types";
import type { ManualCandleDatasetImportResult } from "./manual-candle-dataset-types";
import type { SymbolMarketSpec } from "./symbol-profile";

/** Compatible with `TestEaValidateOptions` in export validation (kept here to avoid import cycles). */
export interface ManualCampaignTestEaValidateOptions {
  importOptions: ImportBacktestCsvOptions;
}

/**
 * Operator-facing source kinds for the manual campaign pipeline (V2-13).
 * Distinct from `ManualCandleDatasetSourceType` (wire / CSV shape hints).
 */
export type ManualCampaignPipelineSourceType =
  | "manual_csv_text"
  | "bridge_export_bundle_text"
  | "testea_export_bundle_text"
  | "mixed_export_bundle_text";

export type ManualCampaignStatus =
  | "completed"
  | "completed_with_warnings"
  | "no_valid_datasets"
  | "import_failed"
  | "campaign_failed"
  | "insufficient_data";

export type ManualCampaignDiagnosticLevel = "info" | "warning" | "error";

export interface ManualCampaignDiagnostic {
  level: ManualCampaignDiagnosticLevel;
  code: string;
  message: string;
  sourceName?: string;
  detail?: string;
}

export type ManualCampaignReasonCode =
  | "MANUAL_CAMPAIGN_OK"
  | "MANUAL_CAMPAIGN_NO_SOURCES"
  | "MANUAL_CAMPAIGN_NO_PARAMETER_SETS"
  | "MANUAL_CAMPAIGN_SOURCE_MISSING_CSV"
  | "MANUAL_CAMPAIGN_SOURCE_MISSING_FILES"
  | "MANUAL_CAMPAIGN_PRIVACY_BLOCKED"
  | "MANUAL_CAMPAIGN_BUNDLE_INVALID"
  | "MANUAL_CAMPAIGN_MANUAL_IMPORT_FAILED"
  | "MANUAL_CAMPAIGN_NO_CANDLE_DATASET"
  | "MANUAL_CAMPAIGN_TESTEA_EVIDENCE_ONLY"
  | "MANUAL_CAMPAIGN_NO_VALID_DATASETS"
  | "MANUAL_CAMPAIGN_EXCEPTION";

export interface ManualCampaignSummary {
  sourceCount: number;
  campaignDatasetsBuilt: number;
  exportBundleRuns: number;
  privacyPassedAll: boolean;
  campaignRunCount: number;
  campaignValidRunCount: number;
  rankableSymbolCount: number;
  primaryReasonCodes: ManualCampaignReasonCode[];
}

/** Per-source import audit (no raw CSV text). */
export interface ManualCampaignDatasetImport {
  sourceName: string;
  pipelineSourceType: ManualCampaignPipelineSourceType;
  manualCandleImport?: ManualCandleDatasetImportResult;
  exportBundleStatus?: ExportSampleValidationStatus;
  exportBundleKind?: ExportSampleValidationResult["bundleKind"];
  validCandleRowCount?: number;
  skippedRowCount?: number;
  csvBodyRowCount?: number;
  testEaEvidenceOnly?: boolean;
  bundleHadCandlesCsv?: boolean;
}

export interface ManualCampaignDatasetResult {
  sourceName: string;
  pipelineSourceType: ManualCampaignPipelineSourceType;
  import: ManualCampaignDatasetImport;
  campaignDatasetCreated: boolean;
  datasetId?: string;
  /** Full validation result when this source used `validateExportSampleBundle` (tests / tooling). */
  exportSampleValidation?: ExportSampleValidationResult | null;
}

export interface ManualCampaignSource {
  sourceName: string;
  sourceType: ManualCampaignPipelineSourceType;
  csvText?: string;
  files?: ExportSampleFileText[];
  expectedCanonicalSymbol?: string;
  expectedBrokerSymbol?: string;
  expectedTimeframe?: string;
  datasetSplit: BacktestCampaignInput["datasets"][number]["datasetSplit"];
  symbolProfile: SymbolMarketSpec | null;
}

export interface ManualCampaignImportSettings {
  manualFormatHint?: import("./manual-candle-dataset-types").ManualCandleDatasetFormat;
  manualMinRows?: number;
  manualIncludeParsedRows?: boolean;
  manualSourceTypeHint?: import("./manual-candle-dataset-types").ManualCandleDatasetSourceType;
}

export interface ManualCampaignInput
  extends Pick<
    BacktestCampaignInput,
    "parameterSets" | "campaignSettings" | "defaultAccountGuardInput" | "defaultRegistryCompatibility"
  > {
  sources: ManualCampaignSource[];
  importSettings?: ManualCampaignImportSettings;
  privacyMode: "strict" | "relaxed";
  testEaValidateOptions?: ManualCampaignTestEaValidateOptions;
}

export interface ManualCampaignResult {
  status: ManualCampaignStatus;
  summary: ManualCampaignSummary;
  diagnostics: ManualCampaignDiagnostic[];
  datasetResults: ManualCampaignDatasetResult[];
  campaignResult: BacktestCampaignResult | null;
  reviewOnly: true;
  executionEnabled: false;
  registryMutationAllowed: false;
  autoApprovalEnabled: false;
}
