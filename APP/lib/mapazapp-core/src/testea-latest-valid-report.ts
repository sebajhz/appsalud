/**
 * E5.20.2 — Latest valid bundle selection + Setup Readiness report generation (read-only; no MT5, no trading).
 */

import { basename, join, resolve } from "node:path";
import { findDuplicateCsvHeaders } from "./export-sample-validation";
import {
  deriveTestEaBundleSafetyPosture,
  validateTestEaExportBundleTexts,
  type TestEaBundleIssue,
  type TestEaBundleValidationResult,
} from "./testea-export-bundle-validate";
import {
  buildTestEaBundleIndex,
  latestValidGroupingKey,
  type BundleValidStatus,
  type LatestValidByKeyEntry,
  type TestEaBundleIndexFsIo,
  type TestEaBundleIndexRecord,
  type TestEaBundleIndexV1,
} from "./testea-bundle-index";
import {
  buildTestEaSetupReadinessReportFromTexts,
  renderSetupReadinessReportHtml,
  renderSetupReadinessReportMarkdown,
  setupReadinessReportToJson,
  type SetupReadinessReport,
  type SetupReadinessReportLanguage,
} from "./testea-setup-readiness-report";

export const LATEST_VALID_REPORT_ELIGIBLE_STATUSES: ReadonlySet<BundleValidStatus> = new Set([
  "valid",
  "valid_warnings",
  "report_missing",
]);

export const REPORT_MD_NAME = "setup_readiness_report.md";
export const REPORT_JSON_NAME = "setup_readiness_report.json";
export const REPORT_HTML_NAME = "setup_readiness_report.html";
export const RESULT_JSON_NAME = "latest_valid_report_result.json";

export interface LatestValidReportSelectionFilters {
  profileId?: string;
  campaignId?: string;
  parameterSetId?: string;
  symbol?: string;
  timeframe?: string;
  bundleId?: string;
}

export type LatestValidReportSelectionErrorCode =
  | "NO_BUNDLES_IN_INDEX"
  | "NO_LATEST_VALID_KEYS"
  | "BUNDLE_ID_NOT_FOUND"
  | "BUNDLE_ID_NOT_ELIGIBLE"
  | "BUNDLE_ID_STALE"
  | "BUNDLE_ID_INVALID"
  | "NO_MATCHING_LATEST_KEY"
  | "MULTIPLE_MATCHING_LATEST_KEYS"
  | "AMBIGUOUS_LATEST"
  | "SELECTED_BUNDLE_NOT_IN_INDEX";

export interface LatestValidReportSelectionFailure {
  ok: false;
  code: LatestValidReportSelectionErrorCode;
  message: string;
  matching_keys?: string[];
  candidate_bundle_ids?: string[];
  available_latest_keys?: LatestValidByKeyEntry[];
}

export interface LatestValidReportSelectionSuccess {
  ok: true;
  selectedKey: string;
  entry: LatestValidByKeyEntry;
  record: TestEaBundleIndexRecord;
}

export type LatestValidReportSelectionResult =
  | LatestValidReportSelectionSuccess
  | LatestValidReportSelectionFailure;

export interface LatestValidReportPreReportValidation {
  ok: boolean;
  errors: TestEaBundleIssue[];
  warnings: TestEaBundleIssue[];
  validation: TestEaBundleValidationResult;
  readOnly: boolean;
  executionEnabled: boolean;
  has_real_trading_orders: boolean;
  has_setup_readiness_checklist_v1_logic: boolean;
  duplicate_csv_headers: string[];
}

export interface LatestValidReportResult {
  ok: boolean;
  selected_bundle_id: string | null;
  selected_bundle_name: string | null;
  selected_bundle_path: string | null;
  selected_key: string | null;
  valid_status_before_report: BundleValidStatus | null;
  report_markdown_path: string | null;
  report_json_path: string | null;
  report_html_path: string | null;
  ea_build: string | null;
  symbol: string | null;
  timeframe: string | null;
  trade_count: number | null;
  decision_counts: Record<string, number>;
  average_score: number | null;
  warnings: string[];
  errors: string[];
}

export interface LatestValidReportGenerateOptions {
  index: TestEaBundleIndexV1;
  outputDir: string;
  selection: LatestValidReportSelectionFilters;
  language?: SetupReadinessReportLanguage;
  maxExamples?: number;
  strict?: boolean;
  writeMarkdown?: boolean;
  writeJson?: boolean;
  writeHtml?: boolean;
  nowUtc?: string;
}

export interface LatestValidReportBundleReadInput {
  summaryJson: string;
  eventsCsv: string;
  tradesCsv: string;
  eventsCsvByteLength?: number;
}

export interface LatestValidReportFsIo extends TestEaBundleIndexFsIo {
  readBundleTexts(bundlePath: string): LatestValidReportBundleReadInput | null;
  ensureDir(path: string): void;
  writeFileUtf8(path: string, data: string): void;
  readIndexJson?(path: string): string;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function filtersProvided(f: LatestValidReportSelectionFilters): boolean {
  return !!(
    f.profileId ||
    f.campaignId ||
    f.parameterSetId ||
    f.symbol ||
    f.timeframe
  );
}

function latestEntryMatchesFilters(
  entry: LatestValidByKeyEntry,
  f: LatestValidReportSelectionFilters,
): boolean {
  if (f.profileId && norm(entry.profile_id) !== norm(f.profileId)) return false;
  if (f.campaignId && norm(entry.campaign_id) !== norm(f.campaignId)) return false;
  if (f.parameterSetId && norm(entry.parameter_set_id) !== norm(f.parameterSetId)) return false;
  if (f.symbol && norm(entry.symbol) !== norm(f.symbol)) return false;
  if (f.timeframe && norm(entry.timeframe) !== norm(f.timeframe)) return false;
  return true;
}

function recordMatchesBundleId(record: TestEaBundleIndexRecord, bundleId: string): boolean {
  return record.bundle_id === bundleId;
}

function failSelection(
  code: LatestValidReportSelectionErrorCode,
  message: string,
  extra?: Partial<
    Pick<
      LatestValidReportSelectionFailure,
      "matching_keys" | "candidate_bundle_ids" | "available_latest_keys"
    >
  >,
): LatestValidReportSelectionFailure {
  return { ok: false, code, message, ...extra };
}

export function isLatestValidReportEligibleStatus(status: BundleValidStatus): boolean {
  return LATEST_VALID_REPORT_ELIGIBLE_STATUSES.has(status);
}

/** Select bundle from index using bundle-id or latest_valid_by_key filters. */
export function selectLatestValidBundleFromIndex(
  index: TestEaBundleIndexV1,
  filters: LatestValidReportSelectionFilters,
): LatestValidReportSelectionResult {
  if (!index.bundles.length && !index.latest_valid_by_key.length) {
    return failSelection("NO_BUNDLES_IN_INDEX", "no bundles found in index");
  }

  if (filters.bundleId) {
    const record = index.bundles.find((b) => recordMatchesBundleId(b, filters.bundleId!));
    if (!record) {
      return failSelection(
        "BUNDLE_ID_NOT_FOUND",
        `bundle-id not found in index: ${filters.bundleId}`,
      );
    }
    if (record.valid_status === "invalid") {
      return failSelection(
        "BUNDLE_ID_INVALID",
        `selected bundle is invalid: ${filters.bundleId}`,
      );
    }
    if (record.valid_status === "stale") {
      return failSelection(
        "BUNDLE_ID_STALE",
        `selected bundle is stale: ${filters.bundleId}`,
      );
    }
    if (!isLatestValidReportEligibleStatus(record.valid_status)) {
      return failSelection(
        "BUNDLE_ID_NOT_ELIGIBLE",
        `bundle valid_status "${record.valid_status}" is not eligible for report generation`,
      );
    }
    return {
      ok: true,
      selectedKey: latestValidGroupingKey(record),
      entry: {
        key: latestValidGroupingKey(record),
        profile_id: record.profile_id,
        campaign_id: record.campaign_id,
        parameter_set_id: record.parameter_set_id,
        symbol: record.symbol,
        timeframe: record.timeframe,
        bundle_id: record.bundle_id,
      },
      record,
    };
  }

  if (!index.latest_valid_by_key.length) {
    return failSelection("NO_LATEST_VALID_KEYS", "no latest_valid_by_key entries in index");
  }

  const matching = index.latest_valid_by_key.filter((e) => latestEntryMatchesFilters(e, filters));

  if (matching.length === 0) {
    return failSelection(
      "NO_MATCHING_LATEST_KEY",
      filtersProvided(filters)
        ? "no latest_valid_by_key entry matches the provided filters"
        : "no latest_valid_by_key entry available (provide filters or --bundle-id)",
      { available_latest_keys: index.latest_valid_by_key },
    );
  }

  if (matching.length > 1) {
    return failSelection(
      "MULTIPLE_MATCHING_LATEST_KEYS",
      `multiple latest_valid_by_key entries match (${matching.length}); narrow with --profile, --campaign, --parameter-set, --symbol, --timeframe, or --bundle-id`,
      { matching_keys: matching.map((m) => m.key) },
    );
  }

  const entry = matching[0]!;
  if (entry.ambiguous_latest) {
    return failSelection(
      "AMBIGUOUS_LATEST",
      `ambiguous_latest for key ${entry.key}; specify --bundle-id`,
      { candidate_bundle_ids: entry.candidate_bundle_ids ?? [] },
    );
  }

  if (!entry.bundle_id) {
    return failSelection(
      "AMBIGUOUS_LATEST",
      `latest_valid_by_key entry has no bundle_id for key ${entry.key}`,
      { candidate_bundle_ids: entry.candidate_bundle_ids ?? [] },
    );
  }

  const record = index.bundles.find((b) => b.bundle_id === entry.bundle_id);
  if (!record) {
    return failSelection(
      "SELECTED_BUNDLE_NOT_IN_INDEX",
      `latest bundle_id ${entry.bundle_id} not found in bundles array`,
    );
  }

  if (!isLatestValidReportEligibleStatus(record.valid_status)) {
    return failSelection(
      "BUNDLE_ID_NOT_ELIGIBLE",
      `selected bundle valid_status "${record.valid_status}" is not eligible`,
    );
  }

  return { ok: true, selectedKey: entry.key, entry, record };
}

export function validateBundleBeforeLatestValidReport(
  record: TestEaBundleIndexRecord,
  texts: LatestValidReportBundleReadInput,
  opts?: { strict?: boolean },
): LatestValidReportPreReportValidation {
  let validation = validateTestEaExportBundleTexts(
    {
      summaryJson: texts.summaryJson,
      eventsCsv: texts.eventsCsv,
      tradesCsv: texts.tradesCsv,
      eventsCsvByteLength: texts.eventsCsvByteLength,
      bundleLabel: record.bundle_path,
    },
    { requireTradeCountZero: false },
  );

  if (opts?.strict && validation.warnings.length > 0) {
    validation = {
      ...validation,
      ok: false,
      status: "failed",
      errors: [
        ...validation.errors,
        ...validation.warnings.map((w) => ({
          level: "error" as const,
          code: `STRICT_${w.code}`,
          message: w.message,
          fileName: w.fileName,
        })),
      ],
      warnings: [],
    };
  }

  const summary = validation.summary ?? {};
  const posture = deriveTestEaBundleSafetyPosture(summary, validation);
  const headerLine = texts.tradesCsv.split(/\r?\n/)[0] ?? "";
  const dupHeaders = findDuplicateCsvHeaders(headerLine);
  const duplicate_csv_headers = dupHeaders.map((d) => `${d.name}(${d.count})`);

  const errors: TestEaBundleIssue[] = [...validation.errors];
  const warnings: TestEaBundleIssue[] = [...validation.warnings];

  const validationOk =
    validation.ok || (validation.status === "warning" && validation.errors.length === 0);
  if (!validationOk) {
    errors.push({
      level: "error",
      code: "LATEST_VALID_REPORT_VALIDATION_FAILED",
      message: "bundle export validation must be ok=true or status=warning with no errors",
    });
  }

  if (!posture.readOnly) {
    errors.push({
      level: "error",
      code: "LATEST_VALID_REPORT_READ_ONLY_REQUIRED",
      message: "readOnly must be true before report generation",
    });
  }
  if (posture.executionEnabled) {
    errors.push({
      level: "error",
      code: "LATEST_VALID_REPORT_EXECUTION_DISABLED_REQUIRED",
      message: "executionEnabled must be false before report generation",
    });
  }
  if (summary.has_real_trading_orders === true) {
    errors.push({
      level: "error",
      code: "LATEST_VALID_REPORT_NO_REAL_TRADING_ORDERS",
      message: "has_real_trading_orders must be false",
    });
  }
  if (summary.has_setup_readiness_checklist_v1_logic !== true) {
    errors.push({
      level: "error",
      code: "LATEST_VALID_REPORT_SETUP_READINESS_REQUIRED",
      message: "has_setup_readiness_checklist_v1_logic must be true",
    });
  }
  for (const d of dupHeaders) {
    errors.push({
      level: "error",
      code: "LATEST_VALID_REPORT_DUPLICATE_CSV_HEADER",
      message: `duplicate CSV header "${d.name}" appears ${d.count} times`,
      fileName: "backtest_trades.csv",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    validation,
    readOnly: posture.readOnly,
    executionEnabled: posture.executionEnabled,
    has_real_trading_orders: summary.has_real_trading_orders === true,
    has_setup_readiness_checklist_v1_logic:
      summary.has_setup_readiness_checklist_v1_logic === true,
    duplicate_csv_headers,
  };
}

function issueMessages(issues: TestEaBundleIssue[]): string[] {
  return issues.map((i) => (i.fileName ? `${i.code}: ${i.message} (${i.fileName})` : `${i.code}: ${i.message}`));
}

function extractDecisionCounts(report: SetupReadinessReport): Record<string, number> {
  return { ...report.executive_summary.decision_counts };
}

function extractAverageScore(report: SetupReadinessReport): number | null {
  return report.executive_summary.average_setup_readiness_score;
}

/** Generate Setup Readiness report artifacts for the selected latest-valid bundle. */
export function generateLatestValidReport(
  options: LatestValidReportGenerateOptions,
  io: LatestValidReportFsIo,
): LatestValidReportResult {
  const emptyResult = (): LatestValidReportResult => ({
    ok: false,
    selected_bundle_id: null,
    selected_bundle_name: null,
    selected_bundle_path: null,
    selected_key: null,
    valid_status_before_report: null,
    report_markdown_path: null,
    report_json_path: null,
    report_html_path: null,
    ea_build: null,
    symbol: null,
    timeframe: null,
    trade_count: null,
    decision_counts: {},
    average_score: null,
    warnings: [],
    errors: [],
  });

  const selection = selectLatestValidBundleFromIndex(options.index, options.selection);
  if (!selection.ok) {
    const r = emptyResult();
    r.errors.push(selection.message);
    return r;
  }

  const { record } = selection;
  const texts = io.readBundleTexts(record.bundle_path);
  if (!texts) {
    const r = emptyResult();
    r.selected_bundle_id = record.bundle_id;
    r.selected_bundle_name = record.bundle_name;
    r.selected_bundle_path = record.bundle_path;
    r.selected_key = selection.selectedKey;
    r.valid_status_before_report = record.valid_status;
    r.errors.push(`could not read bundle files at ${record.bundle_path}`);
    return r;
  }

  const pre = validateBundleBeforeLatestValidReport(record, texts, {
    strict: options.strict,
  });

  const base: LatestValidReportResult = {
    ok: false,
    selected_bundle_id: record.bundle_id,
    selected_bundle_name: record.bundle_name,
    selected_bundle_path: record.bundle_path,
    selected_key: selection.selectedKey,
    valid_status_before_report: record.valid_status,
    report_markdown_path: null,
    report_json_path: null,
    report_html_path: null,
    ea_build: record.ea_build,
    symbol: record.symbol,
    timeframe: record.timeframe,
    trade_count: record.trade_count,
    decision_counts: {},
    average_score: null,
    warnings: issueMessages(pre.warnings),
    errors: [],
  };

  if (!pre.ok) {
    base.errors = issueMessages(pre.errors);
    return base;
  }

  const report = buildTestEaSetupReadinessReportFromTexts(
    {
      bundleName: basename(record.bundle_path),
      summaryJsonText: texts.summaryJson,
      tradesCsvText: texts.tradesCsv,
    },
    {
      maxExamples: options.maxExamples ?? 10,
      language: options.language ?? "es",
    },
  );

  base.warnings.push(...report.warnings);
  if (report.errors.length > 0) {
    base.errors.push(...report.errors);
  }
  if (!report.ok) {
    return base;
  }

  const outDir = resolve(options.outputDir);
  try {
    io.ensureDir(outDir);
  } catch {
    base.errors.push(`output-dir cannot be created: ${outDir}`);
    return base;
  }

  const writeMd = options.writeMarkdown !== false;
  const writeJson = options.writeJson !== false;
  const writeHtml = options.writeHtml !== false;

  if (writeMd) {
    const p = join(outDir, REPORT_MD_NAME);
    io.writeFileUtf8(p, renderSetupReadinessReportMarkdown(report));
    base.report_markdown_path = p;
  }
  if (writeJson) {
    const p = join(outDir, REPORT_JSON_NAME);
    io.writeFileUtf8(p, setupReadinessReportToJson(report));
    base.report_json_path = p;
  }
  if (writeHtml) {
    const p = join(outDir, REPORT_HTML_NAME);
    io.writeFileUtf8(p, renderSetupReadinessReportHtml(report));
    base.report_html_path = p;
  }

  base.decision_counts = extractDecisionCounts(report);
  base.average_score = extractAverageScore(report);
  base.trade_count = report.header.trade_count;
  base.ea_build = report.header.ea_build ?? base.ea_build;
  base.symbol = report.header.symbol ?? base.symbol;
  base.timeframe = report.header.timeframe ?? base.timeframe;
  base.ok = true;

  const resultPath = join(outDir, RESULT_JSON_NAME);
  io.writeFileUtf8(resultPath, latestValidReportResultToJson(base));

  return base;
}

export function latestValidReportResultToJson(result: LatestValidReportResult): string {
  return JSON.stringify(result, null, 2);
}

export function parseBundleIndexJson(text: string): TestEaBundleIndexV1 {
  const parsed = JSON.parse(text) as TestEaBundleIndexV1;
  if (parsed.schema_version !== "mapazapp_bundle_index_v1") {
    throw new Error(`unsupported index schema_version: ${String(parsed.schema_version)}`);
  }
  return parsed;
}

export interface LoadOrBuildIndexOptions {
  root?: string;
  indexPath?: string;
  refreshIndex?: boolean;
  profileFilter?: string;
  strict?: boolean;
}

/** Load index from file and/or refresh from root scan (in-memory only unless caller persists). */
export function loadOrBuildTestEaBundleIndex(
  opts: LoadOrBuildIndexOptions,
  io: TestEaBundleIndexFsIo,
): TestEaBundleIndexV1 {
  if (opts.root && opts.refreshIndex !== false) {
    return buildTestEaBundleIndex(
      {
        root: opts.root,
        profileFilter: opts.profileFilter,
        strict: opts.strict,
      },
      io,
    );
  }
  if (opts.indexPath && io.readFileUtf8) {
    return parseBundleIndexJson(io.readFileUtf8(opts.indexPath));
  }
  if (opts.root) {
    return buildTestEaBundleIndex(
      {
        root: opts.root,
        profileFilter: opts.profileFilter,
        strict: opts.strict,
      },
      io,
    );
  }
  throw new Error("loadOrBuildTestEaBundleIndex requires --root or --index");
}

export function updateIndexReportPaths(
  index: TestEaBundleIndexV1,
  bundleId: string,
  paths: {
    report_json_path?: string | null;
    report_markdown_path?: string | null;
    report_html_path?: string | null;
  },
): boolean {
  const rec = index.bundles.find((b) => b.bundle_id === bundleId);
  if (!rec) return false;
  if (paths.report_json_path !== undefined) rec.report_json_path = paths.report_json_path;
  if (paths.report_markdown_path !== undefined) rec.report_markdown_path = paths.report_markdown_path;
  if (paths.report_html_path !== undefined) rec.report_html_path = paths.report_html_path;
  if (rec.valid_status === "report_missing" && paths.report_json_path) {
    rec.valid_status = rec.warnings.length > 0 ? "valid_warnings" : "valid";
  }
  return true;
}
