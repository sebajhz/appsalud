/**
 * E5.20.1 — Local TestEA/BridgeEA bundle discovery and metadata-only indexing (no MT5, no trading).
 */

import { basename, dirname, join, relative, resolve } from "node:path";
import { resolveTestEaBundleLabel } from "./backtest-importer";
import {
  TESTEA_BUNDLE_STRICT_IGNORE_WARNING_CODES,
  validateTestEaExportBundleTexts,
  type TestEaBundleIssue,
  type TestEaBundleValidationResult,
} from "./testea-export-bundle-validate";

export const MAPZAPP_BUNDLE_INDEX_SCHEMA_VERSION = "mapazapp_bundle_index_v1" as const;

export const TESTEA_BUNDLE_CANONICAL_FILES = [
  "backtest_summary.json",
  "backtest_events.csv",
  "backtest_trades.csv",
] as const;

export type BundleValidStatus = "valid" | "valid_warnings" | "invalid" | "stale" | "report_missing";

export interface TestEaBundleIndexRecord {
  bundle_id: string;
  bundle_name: string;
  bundle_path: string;
  summary_path: string;
  trades_path: string;
  events_path: string;
  report_json_path: string | null;
  report_markdown_path: string | null;
  report_html_path: string | null;
  symbol: string | null;
  timeframe: string | null;
  profile_id: string | null;
  campaign_id: string | null;
  parameter_set_id: string | null;
  strategy_id: string | null;
  run_id: string | null;
  effective_run_id: string | null;
  ea_build: string | null;
  schema_version: string | null;
  trade_count: number | null;
  created_at_utc: string | null;
  summary_mtime_utc: string | null;
  readOnly: boolean;
  executionEnabled: boolean;
  has_real_trading_orders: boolean;
  has_setup_readiness_checklist_v1_logic: boolean;
  valid_status: BundleValidStatus;
  warnings: TestEaBundleIssue[];
  errors: TestEaBundleIssue[];
}

export interface LatestValidByKeyEntry {
  key: string;
  profile_id: string | null;
  campaign_id: string | null;
  parameter_set_id: string | null;
  symbol: string | null;
  timeframe: string | null;
  bundle_id: string | null;
  ambiguous_latest?: boolean;
  candidate_bundle_ids?: string[];
}

export interface TestEaBundleIndexV1 {
  schema_version: typeof MAPZAPP_BUNDLE_INDEX_SCHEMA_VERSION;
  created_at_utc: string;
  root: string;
  total_bundles_scanned: number;
  valid_count: number;
  valid_warnings_count: number;
  invalid_count: number;
  stale_count: number;
  report_missing_count: number;
  bundles: TestEaBundleIndexRecord[];
  latest_valid_by_key: LatestValidByKeyEntry[];
}

export interface TestEaBundleIndexOptions {
  root: string;
  profileFilter?: string;
  maxDepth?: number;
  includeInvalid?: boolean;
  strict?: boolean;
  /** ISO timestamp for index header (tests). */
  nowUtc?: string;
}

export interface TestEaBundleIndexFsIo {
  pathExists(path: string): boolean;
  isDirectory(path: string): boolean;
  readFileUtf8(path: string): string;
  fileMtimeUtc(path: string): string | null;
  listDirectory(path: string): string[];
}

export interface TestEaBundleLeafInput {
  bundlePath: string;
  root: string;
  summaryJson: string;
  eventsCsv: string;
  tradesCsv: string;
  eventsCsvByteLength?: number;
  summaryMtimeUtc?: string | null;
  reportJsonPath?: string | null;
  reportMarkdownPath?: string | null;
  reportHtmlPath?: string | null;
  profileId?: string | null;
  options?: Pick<TestEaBundleIndexOptions, "strict" | "profileFilter">;
}

const DEFAULT_MAX_DEPTH = 12;

const REPORT_JSON = "setup_readiness_report.json";
const REPORT_MD = "setup_readiness_report.md";
const REPORT_HTML = "setup_readiness_report.html";

function readSummaryString(summary: Record<string, unknown>, key: string): string | null {
  const v = summary[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function readSummaryNumber(summary: Record<string, unknown>, key: string): number | null {
  const v = summary[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function extractReadOnlyFromSummary(summary: Record<string, unknown>): boolean {
  if (summary.readOnly === true || summary.read_only === true) return true;
  if (summary.readOnly === false || summary.read_only === false) return false;
  return (
    summary.tester_only === true &&
    summary.backtest_role === true &&
    summary.live_trading_enabled === false &&
    summary.has_real_trading_orders === false
  );
}

export function extractExecutionEnabledFromSummary(summary: Record<string, unknown>): boolean {
  if (summary.executionEnabled === true || summary.execution_enabled === true) return true;
  if (summary.executionEnabled === false || summary.execution_enabled === false) return false;
  return summary.live_trading_enabled === true;
}

export function inferProfileIdFromPath(bundlePath: string, root: string): string | null {
  const rel = relative(resolve(root), resolve(bundlePath)).replace(/\\/g, "/");
  const seg = rel.split("/").find((s) => /_Profile_/i.test(s));
  return seg ?? null;
}

export function isCanonicalBundleDir(
  dir: string,
  io: Pick<TestEaBundleIndexFsIo, "pathExists">,
): boolean {
  return TESTEA_BUNDLE_CANONICAL_FILES.every((f) => io.pathExists(join(dir, f)));
}

function applyStrictValidation(result: TestEaBundleValidationResult): TestEaBundleValidationResult {
  const toPromote = result.warnings.filter((w) => !TESTEA_BUNDLE_STRICT_IGNORE_WARNING_CODES.has(w.code));
  if (toPromote.length === 0) return result;
  return {
    ...result,
    ok: false,
    status: "failed",
    errors: [
      ...result.errors,
      ...toPromote.map((w) => ({
        level: "error" as const,
        code: `STRICT_${w.code}`,
        message: w.message,
        fileName: w.fileName,
      })),
    ],
    warnings: result.warnings.filter((w) => TESTEA_BUNDLE_STRICT_IGNORE_WARNING_CODES.has(w.code)),
  };
}

function bundleIdFrom(bundlePath: string, root: string, summary: Record<string, unknown> | null, bundleName: string): string {
  const rel = relative(resolve(root), resolve(bundlePath)).replace(/\\/g, "/");
  if (rel && rel !== ".") return rel;
  const run =
    readSummaryString(summary ?? {}, "effective_run_id") ??
    readSummaryString(summary ?? {}, "run_id") ??
    bundleName;
  return run;
}

export function latestValidGroupingKey(record: Pick<
  TestEaBundleIndexRecord,
  "profile_id" | "campaign_id" | "parameter_set_id" | "symbol" | "timeframe"
>): string {
  return [
    record.profile_id ?? "",
    record.campaign_id ?? "",
    record.parameter_set_id ?? "",
    record.symbol ?? "",
    record.timeframe ?? "",
  ].join("|");
}

export interface BundleRecencySortKey {
  created_at_utc: string | null;
  summary_mtime_utc: string | null;
  bundle_path: string;
}

export function compareBundleRecency(a: BundleRecencySortKey, b: BundleRecencySortKey): number {
  const ca = a.created_at_utc ?? "";
  const cb = b.created_at_utc ?? "";
  if (ca !== cb) return cb.localeCompare(ca);
  const ma = a.summary_mtime_utc ?? "";
  const mb = b.summary_mtime_utc ?? "";
  if (ma !== mb) return mb.localeCompare(ma);
  return b.bundle_path.localeCompare(a.bundle_path);
}

export interface SetupReadinessReportHeaderSlice {
  bundle: string | null;
  bundle_name: string | null;
  ea_build: string | null;
  trade_count: number | null;
}

export function parseSetupReadinessReportHeaderSlice(reportJsonText: string): SetupReadinessReportHeaderSlice | null {
  try {
    const root = JSON.parse(reportJsonText) as unknown;
    if (root === null || typeof root !== "object" || Array.isArray(root)) return null;
    const header = (root as { header?: unknown }).header;
    if (header === null || typeof header !== "object" || Array.isArray(header)) return null;
    const h = header as Record<string, unknown>;
    const tc = h.trade_count;
    return {
      bundle: typeof h.bundle === "string" ? h.bundle : null,
      bundle_name: typeof h.bundle_name === "string" ? h.bundle_name : null,
      ea_build: typeof h.ea_build === "string" ? h.ea_build : null,
      trade_count: typeof tc === "number" && Number.isFinite(tc) ? tc : null,
    };
  } catch {
    return null;
  }
}

export function reportCoherenceStaleReasons(
  record: Pick<
    TestEaBundleIndexRecord,
    "bundle_name" | "ea_build" | "trade_count" | "report_json_path"
  >,
  reportHeader: SetupReadinessReportHeaderSlice,
): string[] {
  const reasons: string[] = [];
  const reportBundle = (reportHeader.bundle_name ?? reportHeader.bundle ?? "").trim();
  const folderBundle = record.bundle_name.trim();
  if (reportBundle && folderBundle && reportBundle !== folderBundle) {
    reasons.push(`report bundle "${reportBundle}" differs from summary/folder "${folderBundle}"`);
  }
  if (
    record.ea_build &&
    reportHeader.ea_build &&
    record.ea_build !== reportHeader.ea_build
  ) {
    reasons.push(`report ea_build "${reportHeader.ea_build}" differs from summary "${record.ea_build}"`);
  }
  if (
    record.trade_count !== null &&
    reportHeader.trade_count !== null &&
    record.trade_count !== reportHeader.trade_count
  ) {
    reasons.push(
      `report trade_count ${reportHeader.trade_count} differs from summary ${record.trade_count}`,
    );
  }
  if (reasons.length > 0 && record.report_json_path) {
    reasons.unshift(`report at ${record.report_json_path} does not match indexed bundle`);
  }
  return reasons;
}

function detectReportPaths(
  bundleDir: string,
  io: Pick<TestEaBundleIndexFsIo, "pathExists">,
): {
  report_json_path: string | null;
  report_markdown_path: string | null;
  report_html_path: string | null;
} {
  const candidates = [bundleDir, dirname(bundleDir)];
  let report_json_path: string | null = null;
  let report_markdown_path: string | null = null;
  let report_html_path: string | null = null;
  for (const base of candidates) {
    const jp = join(base, REPORT_JSON);
    const mp = join(base, REPORT_MD);
    const hp = join(base, REPORT_HTML);
    if (!report_json_path && io.pathExists(jp)) report_json_path = jp;
    if (!report_markdown_path && io.pathExists(mp)) report_markdown_path = mp;
    if (!report_html_path && io.pathExists(hp)) report_html_path = hp;
  }
  return { report_json_path, report_markdown_path, report_html_path };
}

function passesSafetyGates(summary: Record<string, unknown>): { ok: boolean; errors: TestEaBundleIssue[] } {
  const errors: TestEaBundleIssue[] = [];
  if (!extractReadOnlyFromSummary(summary)) {
    errors.push({
      level: "error",
      code: "INDEX_READ_ONLY_REQUIRED",
      message: "summary must indicate read-only posture (readOnly/read_only or tester_only+backtest_role safe flags)",
    });
  }
  if (extractExecutionEnabledFromSummary(summary)) {
    errors.push({
      level: "error",
      code: "INDEX_EXECUTION_DISABLED_REQUIRED",
      message: "executionEnabled/execution_enabled must be false for safe consumption",
    });
  }
  if (summary.has_real_trading_orders === true) {
    errors.push({
      level: "error",
      code: "INDEX_NO_REAL_TRADING_ORDERS",
      message: "has_real_trading_orders must be false",
    });
  }
  return { ok: errors.length === 0, errors };
}

function classifyBaseValidStatus(
  validationOk: boolean,
  validationStatus: TestEaBundleValidationResult["status"],
  safetyOk: boolean,
): BundleValidStatus | "pending" {
  if (!validationOk || !safetyOk) return "invalid";
  if (validationStatus === "warning") return "valid_warnings";
  return "valid";
}

/** Index one bundle leaf from in-memory file texts (tests + CLI after disk read). */
export function indexTestEaBundleLeaf(input: TestEaBundleLeafInput): TestEaBundleIndexRecord {
  const bundlePath = resolve(input.bundlePath);
  const root = resolve(input.root);
  const bundleName = basename(bundlePath);
  const summaryPath = join(bundlePath, "backtest_summary.json");
  const tradesPath = join(bundlePath, "backtest_trades.csv");
  const eventsPath = join(bundlePath, "backtest_events.csv");

  let validation = validateTestEaExportBundleTexts(
    {
      summaryJson: input.summaryJson,
      eventsCsv: input.eventsCsv,
      tradesCsv: input.tradesCsv,
      eventsCsvByteLength: input.eventsCsvByteLength,
      bundleLabel: bundlePath,
    },
    { requireTradeCountZero: false },
  );
  if (input.options?.strict) {
    validation = applyStrictValidation(validation);
  }

  const summary = validation.summary ?? {};
  const profileId =
    input.profileId ??
    inferProfileIdFromPath(bundlePath, root) ??
    null;

  const readOnly = extractReadOnlyFromSummary(summary);
  const executionEnabled = extractExecutionEnabledFromSummary(summary);
  const hasRealOrders = summary.has_real_trading_orders === true;
  const hasReadiness = summary.has_setup_readiness_checklist_v1_logic === true;
  const safety = passesSafetyGates(summary);

  const warnings = [...validation.warnings];
  const errors = [...validation.errors, ...safety.errors];

  let valid_status = classifyBaseValidStatus(validation.ok, validation.status, safety.ok);
  if (valid_status === "pending") valid_status = "valid";

  const report_json_path = input.reportJsonPath ?? null;
  const report_markdown_path = input.reportMarkdownPath ?? null;
  const report_html_path = input.reportHtmlPath ?? null;

  if (
    valid_status === "valid" ||
    valid_status === "valid_warnings"
  ) {
    if (hasReadiness && !report_json_path) {
      valid_status = "report_missing";
    }
  }

  const resolvedName = resolveTestEaBundleLabel(summary, bundleName);

  const record: TestEaBundleIndexRecord = {
    bundle_id: bundleIdFrom(bundlePath, root, summary, resolvedName),
    bundle_name: resolvedName,
    bundle_path: bundlePath,
    summary_path: summaryPath,
    trades_path: tradesPath,
    events_path: eventsPath,
    report_json_path,
    report_markdown_path,
    report_html_path,
    symbol: readSummaryString(summary, "symbol"),
    timeframe: readSummaryString(summary, "execution_timeframe"),
    profile_id: profileId,
    campaign_id: readSummaryString(summary, "campaign_id"),
    parameter_set_id: readSummaryString(summary, "parameter_set_id"),
    strategy_id: readSummaryString(summary, "strategy_id"),
    run_id: readSummaryString(summary, "run_id"),
    effective_run_id:
      readSummaryString(summary, "effective_run_id") ?? readSummaryString(summary, "run_id"),
    ea_build: readSummaryString(summary, "ea_build"),
    schema_version: readSummaryString(summary, "schema_version"),
    trade_count: readSummaryNumber(summary, "trade_count"),
    created_at_utc:
      readSummaryString(summary, "created_at_utc") ?? readSummaryString(summary, "exported_at_utc"),
    summary_mtime_utc: input.summaryMtimeUtc ?? null,
    readOnly,
    executionEnabled,
    has_real_trading_orders: hasRealOrders,
    has_setup_readiness_checklist_v1_logic: hasReadiness,
    valid_status,
    warnings,
    errors,
  };

  return record;
}

export function matchesProfileFilter(
  bundlePath: string,
  root: string,
  profileFilter: string | undefined,
  explicitProfileId?: string | null,
): boolean {
  if (!profileFilter) return true;
  const profileId = explicitProfileId ?? inferProfileIdFromPath(bundlePath, root);
  return profileId === profileFilter;
}

export function findTestEaBundleLeafDirs(
  root: string,
  io: TestEaBundleIndexFsIo,
  opts?: { maxDepth?: number },
): string[] {
  const absRoot = resolve(root);
  const maxDepth = opts?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const found = new Set<string>();

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    if (!io.isDirectory(dir)) return;
    if (isCanonicalBundleDir(dir, io)) {
      found.add(resolve(dir));
      return;
    }
    let names: string[];
    try {
      names = io.listDirectory(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const child = join(dir, name);
      if (io.isDirectory(child)) walk(child, depth + 1);
    }
  };

  if (isCanonicalBundleDir(absRoot, io)) {
    found.add(absRoot);
  } else if (io.isDirectory(absRoot)) {
    walk(absRoot, 0);
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

function applyReportStaleChecks(
  records: TestEaBundleIndexRecord[],
  readReportJson: (path: string) => string | null,
): void {
  for (const rec of records) {
    if (!rec.report_json_path) continue;
    const text = readReportJson(rec.report_json_path);
    if (!text) continue;
    const header = parseSetupReadinessReportHeaderSlice(text);
    if (!header) {
      rec.valid_status = "stale";
      rec.errors.push({
        level: "error",
        code: "INDEX_REPORT_JSON_INVALID",
        message: "setup_readiness_report.json could not be parsed",
        fileName: REPORT_JSON,
      });
      continue;
    }
    const reasons = reportCoherenceStaleReasons(rec, header);
    if (reasons.length > 0) {
      rec.valid_status = "stale";
      for (const msg of reasons) {
        rec.errors.push({
          level: "error",
          code: "INDEX_REPORT_BUNDLE_MISMATCH",
          message: msg,
          fileName: REPORT_JSON,
        });
      }
    }
  }
}

const LATEST_ELIGIBLE: ReadonlySet<BundleValidStatus> = new Set([
  "valid",
  "valid_warnings",
  "report_missing",
]);

export function computeLatestValidByKey(
  bundles: TestEaBundleIndexRecord[],
): LatestValidByKeyEntry[] {
  const groups = new Map<string, TestEaBundleIndexRecord[]>();
  for (const b of bundles) {
    if (!LATEST_ELIGIBLE.has(b.valid_status)) continue;
    const key = latestValidGroupingKey(b);
    const list = groups.get(key) ?? [];
    list.push(b);
    groups.set(key, list);
  }

  const entries: LatestValidByKeyEntry[] = [];
  for (const [key, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sorted = [...list].sort((a, b) =>
      compareBundleRecency(
        {
          created_at_utc: a.created_at_utc,
          summary_mtime_utc: a.summary_mtime_utc,
          bundle_path: a.bundle_path,
        },
        {
          created_at_utc: b.created_at_utc,
          summary_mtime_utc: b.summary_mtime_utc,
          bundle_path: b.bundle_path,
        },
      ),
    );
    const top = sorted[0]!;
    const second = sorted[1];
    const ambiguous =
      !!second &&
      (top.created_at_utc ?? "") === (second.created_at_utc ?? "") &&
      (top.summary_mtime_utc ?? "") === (second.summary_mtime_utc ?? "");

    entries.push({
      key,
      profile_id: top.profile_id,
      campaign_id: top.campaign_id,
      parameter_set_id: top.parameter_set_id,
      symbol: top.symbol,
      timeframe: top.timeframe,
      bundle_id: ambiguous ? null : top.bundle_id,
      ...(ambiguous
        ? { ambiguous_latest: true, candidate_bundle_ids: sorted.map((r) => r.bundle_id) }
        : {}),
    });
  }
  return entries;
}

export function markSupersededBundlesStale(
  bundles: TestEaBundleIndexRecord[],
  latest: LatestValidByKeyEntry[],
): void {
  const winnerByKey = new Map<string, string | null>();
  for (const e of latest) {
    winnerByKey.set(e.key, e.ambiguous_latest ? null : e.bundle_id);
  }
  for (const b of bundles) {
    if (!LATEST_ELIGIBLE.has(b.valid_status)) continue;
    const key = latestValidGroupingKey(b);
    const winner = winnerByKey.get(key);
    if (winner === undefined) continue;
    if (winner === null) continue;
    if (b.bundle_id === winner) continue;
    b.valid_status = "stale";
    b.errors.push({
      level: "error",
      code: "INDEX_SUPERSEDED_BY_NEWER_VALID_RUN",
      message: `newer valid run exists for key ${key} (winner ${winner})`,
    });
  }
}

function countByStatus(bundles: TestEaBundleIndexRecord[]) {
  let valid_count = 0;
  let valid_warnings_count = 0;
  let invalid_count = 0;
  let stale_count = 0;
  let report_missing_count = 0;
  for (const b of bundles) {
    switch (b.valid_status) {
      case "valid":
        valid_count++;
        break;
      case "valid_warnings":
        valid_warnings_count++;
        break;
      case "invalid":
        invalid_count++;
        break;
      case "stale":
        stale_count++;
        break;
      case "report_missing":
        report_missing_count++;
        break;
      default:
        break;
    }
  }
  return { valid_count, valid_warnings_count, invalid_count, stale_count, report_missing_count };
}

/** Scan configured root and build metadata-only bundle index. */
export function buildTestEaBundleIndex(
  options: TestEaBundleIndexOptions,
  io: TestEaBundleIndexFsIo,
): TestEaBundleIndexV1 {
  const root = resolve(options.root);
  const includeInvalid = options.includeInvalid !== false;
  const leafDirs = findTestEaBundleLeafDirs(root, io, { maxDepth: options.maxDepth });

  const records: TestEaBundleIndexRecord[] = [];
  for (const bundlePath of leafDirs) {
    const inferredProfile = inferProfileIdFromPath(bundlePath, root);
    if (!matchesProfileFilter(bundlePath, root, options.profileFilter, inferredProfile)) {
      continue;
    }
    const reports = detectReportPaths(bundlePath, io);
    const summaryPath = join(bundlePath, "backtest_summary.json");
    const record = indexTestEaBundleLeaf({
      bundlePath,
      root,
      summaryJson: io.readFileUtf8(summaryPath),
      eventsCsv: io.readFileUtf8(join(bundlePath, "backtest_events.csv")),
      tradesCsv: io.readFileUtf8(join(bundlePath, "backtest_trades.csv")),
      eventsCsvByteLength: undefined,
      summaryMtimeUtc: io.fileMtimeUtc(summaryPath),
      reportJsonPath: reports.report_json_path,
      reportMarkdownPath: reports.report_markdown_path,
      reportHtmlPath: reports.report_html_path,
      profileId: inferredProfile,
      options: {
        strict: options.strict,
      },
    });
    records.push(record);
  }

  applyReportStaleChecks(records, (p) => {
    try {
      return io.readFileUtf8(p);
    } catch {
      return null;
    }
  });

  const latest_valid_by_key = computeLatestValidByKey(records);
  markSupersededBundlesStale(records, latest_valid_by_key);

  const filtered = includeInvalid ? records : records.filter((r) => r.valid_status !== "invalid");
  const counts = countByStatus(filtered);

  return {
    schema_version: MAPZAPP_BUNDLE_INDEX_SCHEMA_VERSION,
    created_at_utc: options.nowUtc ?? new Date().toISOString(),
    root,
    total_bundles_scanned: records.length,
    ...counts,
    bundles: filtered,
    latest_valid_by_key,
  };
}

export function testEaBundleIndexToJson(index: TestEaBundleIndexV1): string {
  return JSON.stringify(index, null, 2);
}
