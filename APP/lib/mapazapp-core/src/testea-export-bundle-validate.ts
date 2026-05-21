import type { ImportBacktestCsvOptions } from "./backtest-types";
import type { BacktestRunId } from "./ids";
import type { ParameterSetId, StrategyId } from "./ids";
import { parseBacktestEventsCsv } from "./backtest-events-csv";
import { validateTestEaExportSample } from "./export-sample-validation";
import type { ExportSampleValidationDiagnostic } from "./export-sample-validation-types";
import type { TestEaExportValidationResult } from "./export-sample-validation-types";
import type { ExportSampleFileText } from "./export-sample-validation-types";

/** Warnings ignored for bundle **status** (ok vs warning) and for `--strict` promotion — header-only trades are valid in E4.x. */
export const TESTEA_BUNDLE_STRICT_IGNORE_WARNING_CODES = new Set(["CSV_HEADER_ONLY_NO_TRADE_ROWS"]);

export type TestEaBundleCliStatus = "ok" | "warning" | "failed";

export interface TestEaBundleIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  fileName?: string;
}

export interface TestEaBundleFilesState {
  summary: "ok" | "missing" | "invalid";
  events: "ok" | "missing" | "invalid";
  trades: "ok" | "missing" | "invalid" | "header_only";
}

export interface TestEaBundleValidationOptions {
  /** When true (default for E5.3+), `trade_count` in summary may match virtual trade rows. When true, enforces trade_count === 0 (E4.1 legacy). */
  requireTradeCountZero?: boolean;
  /** Warn when `eventsCsvByteLength` exceeds this threshold. Default 1_500_000 bytes. */
  eventsLargeWarningBytes?: number;
}

export interface TestEaBundleValidationInput {
  summaryJson: string;
  eventsCsv: string;
  tradesCsv: string;
  /** UTF-8 byte length of events CSV (for size warning only). */
  eventsCsvByteLength?: number;
  /** Single path segment or basename for messages (avoid leaking full private paths). */
  bundleLabel?: string;
}

export interface TestEaBundleValidationResult {
  ok: boolean;
  status: TestEaBundleCliStatus;
  errors: TestEaBundleIssue[];
  warnings: TestEaBundleIssue[];
  files: TestEaBundleFilesState;
  summary: Record<string, unknown> | null;
  eventCounts: Record<string, number> | null;
  testEa: TestEaExportValidationResult;
}

function diagToIssue(d: ExportSampleValidationDiagnostic): TestEaBundleIssue {
  return {
    level: d.level === "error" ? "error" : "warning",
    code: d.code,
    message: d.message,
    fileName: d.fileName,
  };
}

function pickImportIds(summary: Record<string, unknown> | null): ImportBacktestCsvOptions {
  const sid = (summary?.["strategy_id"] as string | undefined)?.trim() || "MZP_IFVG_ZONE_REACTION_V1";
  const pid = (summary?.["parameter_set_id"] as string | undefined)?.trim() || "MZP_IFVG_XAUUSD_V1_SET_003";
  const sym = (summary?.["symbol"] as string | undefined)?.trim() || "XAUUSD";
  const eff =
    (summary?.["effective_run_id"] as string | undefined)?.trim() ||
    (summary?.["run_id"] as string | undefined)?.trim() ||
    "TESTEA_BUNDLE_VALIDATE";
  return {
    strategyId: sid as StrategyId,
    parameterSetId: pid as ParameterSetId,
    canonicalSymbol: sym,
    brokerSymbol: (summary?.["broker_symbol"] as string | undefined)?.trim() || undefined,
    datasetSplit: "validation",
    sourceType: "mapazapp_testea_csv",
    runId: eff as BacktestRunId,
  };
}

function isNonEmptyString(s: string): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function looksLikeOutcomeStyleParameterSetId(parameterSetId: string): boolean {
  const s = parameterSetId.trim();
  if (s.length === 0) return false;
  if (/OUTCOME_SET/i.test(s)) return true;
  if (/_OUTCOME_/i.test(s)) return true;
  if (/^OUTCOME_/i.test(s)) return true;
  return false;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Validates a **three-file** Mapazapp_TestEA export folder contents (in-memory strings only).
 * Read files in `@workspace/scripts` (or elsewhere) and pass UTF-8 text here — **no MT5**, no disk in core.
 *
 * Enforces E3.6 / E4.1 bundle rules on top of `validateTestEaExportSample` (including `bundleContract` event parse).
 */
export interface TestEaBundleSafetyPosture {
  readOnly: boolean;
  executionEnabled: boolean;
}

/**
 * Derives consumption safety flags aligned with `validateTestEaExportBundleTexts` / export-validate CLI.
 * Raw `backtest_ea_v1` summaries often omit `readOnly` / `executionEnabled`; use tester/backtest flags instead.
 */
export function deriveTestEaBundleSafetyPosture(
  summary: Record<string, unknown> | null,
  validation?: Pick<TestEaBundleValidationResult, "ok" | "testEa">,
): TestEaBundleSafetyPosture {
  if (!summary) {
    return { readOnly: false, executionEnabled: true };
  }

  if (summary.readOnly === true || summary.read_only === true) {
    return {
      readOnly: true,
      executionEnabled:
        summary.executionEnabled === true || summary.execution_enabled === true,
    };
  }
  if (summary.readOnly === false || summary.read_only === false) {
    return {
      readOnly: false,
      executionEnabled:
        summary.executionEnabled === true || summary.execution_enabled === true,
    };
  }
  if (summary.executionEnabled === true || summary.execution_enabled === true) {
    return { readOnly: false, executionEnabled: true };
  }
  if (summary.executionEnabled === false || summary.execution_enabled === false) {
    return { readOnly: false, executionEnabled: false };
  }

  if (validation?.ok && validation.testEa.summaryOk) {
    return { readOnly: true, executionEnabled: false };
  }

  const schema = summary.schema_version;
  if (schema === "backtest_ea_v1") {
    const backtestMode = summary.backtest_mode;
    const modeOk = backtestMode === undefined || backtestMode === "virtual";
    const liveOff = summary.live_trading_enabled !== true;
    const readOnlyPosture =
      summary.tester_only === true &&
      summary.backtest_role === true &&
      summary.official_ea === "Mapazapp_TestEA" &&
      summary.has_real_trading_orders === false &&
      summary.has_full_ifvg_pipeline === false &&
      summary.has_real_ifvg_logic === true &&
      summary.has_real_daily_bias_logic === true &&
      modeOk &&
      liveOff;
    if (readOnlyPosture) {
      return { readOnly: true, executionEnabled: false };
    }
  }

  if (schema === "MZP_TESTEA_V1") {
    const readOnlyPosture =
      summary.execution_mode === "virtual_export_only" &&
      summary.live_trading_enabled === false;
    if (readOnlyPosture) {
      return { readOnly: true, executionEnabled: false };
    }
  }

  if (
    summary.tester_only === true &&
    summary.backtest_role === true &&
    summary.has_real_trading_orders === false &&
    summary.live_trading_enabled !== true
  ) {
    return { readOnly: true, executionEnabled: false };
  }

  return {
    readOnly: false,
    executionEnabled: summary.live_trading_enabled === true,
  };
}

export function validateTestEaExportBundleTexts(
  input: TestEaBundleValidationInput,
  options?: TestEaBundleValidationOptions,
): TestEaBundleValidationResult {
  const requireTc0 = options?.requireTradeCountZero === true;
  const largeBytes = options?.eventsLargeWarningBytes ?? 1_500_000;

  const errors: TestEaBundleIssue[] = [];
  const warnings: TestEaBundleIssue[] = [];

  const files: TestEaBundleFilesState = {
    summary: !isNonEmptyString(input.summaryJson) ? "missing" : "ok",
    events: !isNonEmptyString(input.eventsCsv) ? "missing" : "ok",
    trades: !isNonEmptyString(input.tradesCsv) ? "missing" : "ok",
  };

  if (files.summary === "missing") {
    errors.push({ level: "error", code: "BUNDLE_MISSING_SUMMARY", message: "backtest_summary.json is missing or empty" });
  }
  if (files.events === "missing") {
    errors.push({ level: "error", code: "BUNDLE_MISSING_EVENTS", message: "backtest_events.csv is missing or empty" });
  }
  if (files.trades === "missing") {
    errors.push({ level: "error", code: "BUNDLE_MISSING_TRADES", message: "backtest_trades.csv is missing or empty" });
  }

  let summaryObj: Record<string, unknown> | null = null;
  if (files.summary === "ok") {
    try {
      const root = JSON.parse(input.summaryJson) as unknown;
      if (root !== null && typeof root === "object" && !Array.isArray(root)) {
        summaryObj = root as Record<string, unknown>;
      } else {
        files.summary = "invalid";
        errors.push({ level: "error", code: "BUNDLE_SUMMARY_NOT_OBJECT", message: "summary JSON must be an object" });
      }
    } catch (e) {
      files.summary = "invalid";
      errors.push({
        level: "error",
        code: "BUNDLE_SUMMARY_JSON_PARSE",
        message: e instanceof Error ? e.message : "JSON parse failed",
      });
    }
  }

  if (input.eventsCsvByteLength !== undefined && input.eventsCsvByteLength > largeBytes) {
    warnings.push({
      level: "warning",
      code: "BUNDLE_EVENTS_LARGE",
      message: `backtest_events.csv is large (${input.eventsCsvByteLength} bytes > ${largeBytes}); expect slower tooling`,
    });
  }

  const label = (input.bundleLabel ?? "").replace(/\//g, "\\");
  if (label && /[\\/]testea([\\/]|$)/i.test(label) && !/[\\/]TestEA([\\/]|$)/.test(label)) {
    warnings.push({
      level: "warning",
      code: "BUNDLE_EXPORTROOT_LOWERCASE_TESTEA",
      message:
        "Path contains a lowercase `testea` folder segment — consider canonical `Mapazapp\\TestEA` in future runs",
    });
  }

  if (errors.some((e) => e.code.startsWith("BUNDLE_MISSING") || e.code === "BUNDLE_SUMMARY_NOT_OBJECT" || e.code === "BUNDLE_SUMMARY_JSON_PARSE")) {
    const status: TestEaBundleCliStatus = "failed";
    return {
      ok: false,
      status,
      errors,
      warnings,
      files,
      summary: summaryObj,
      eventCounts: null,
      testEa: {
        status: "invalid",
        tradesImport: null,
        tradeCount: 0,
        eventsCsvPresent: files.events === "ok",
        eventsParseAttempted: false,
        eventsParseOk: false,
        eventsDataRowCount: 0,
        summaryParsed: files.summary === "ok",
        summaryOk: false,
        summaryTradeCount: null,
        summaryJson: summaryObj,
        diagnostics: [],
      },
    };
  }

  const importOpts = pickImportIds(summaryObj);
  const fileTexts: ExportSampleFileText[] = [
    { fileName: "backtest_summary.json", text: input.summaryJson },
    { fileName: "backtest_events.csv", text: input.eventsCsv },
    { fileName: "backtest_trades.csv", text: input.tradesCsv },
  ];

  const testEa = validateTestEaExportSample(
    {
      bundleKind: "testea_export_bundle",
      files: fileTexts,
      privacyMode: "relaxed",
    },
    {
      importOptions: importOpts,
      zeroTradeCountMismatchAsWarning: true,
      eventsParseOptions: { bundleContract: true },
    },
  );

  for (const d of testEa.diagnostics) {
    if (d.level === "error") errors.push(diagToIssue(d));
    else if (d.level === "warning") warnings.push(diagToIssue(d));
  }

  if (summaryObj) {
    if (!isNonEmptyString(String(summaryObj["symbol"] ?? ""))) {
      errors.push({ level: "error", code: "BUNDLE_SUMMARY_SYMBOL", message: "summary.symbol must be a non-empty string" });
    }
    if (!isNonEmptyString(String(summaryObj["execution_timeframe"] ?? ""))) {
      errors.push({
        level: "error",
        code: "BUNDLE_SUMMARY_EXEC_TF",
        message: "summary.execution_timeframe must be a non-empty string",
      });
    }
    if (!isNonEmptyString(String(summaryObj["daily_bias_timeframe"] ?? ""))) {
      errors.push({
        level: "error",
        code: "BUNDLE_SUMMARY_BIAS_TF",
        message: "summary.daily_bias_timeframe must be a non-empty string",
      });
    }
    for (const [key, label] of [
      ["total_bias_evaluated", "total_bias_evaluated"],
      ["total_setup_candidates", "total_setup_candidates"],
      ["allowed_setups", "allowed_setups"],
      ["rejected_by_daily_bias", "rejected_by_daily_bias"],
    ] as const) {
      if (!isFiniteNumber(summaryObj[key])) {
        errors.push({
          level: "error",
          code: "BUNDLE_SUMMARY_NUMERIC",
          message: `summary.${label} must be a finite number`,
        });
      }
    }
    if (requireTc0) {
      const tc = summaryObj["trade_count"];
      if (tc !== 0) {
        errors.push({
          level: "error",
          code: "BUNDLE_TRADE_COUNT_NONZERO",
          message: `E4.1 phase expects trade_count === 0 (got ${String(tc)})`,
        });
      }
    }

    const pid = String(summaryObj["parameter_set_id"] ?? "").trim();
    const cid = String(summaryObj["campaign_id"] ?? "").trim();
    const safeOpt = summaryObj["optimization_safe_exports"];
    if (looksLikeOutcomeStyleParameterSetId(pid) && !isNonEmptyString(cid)) {
      warnings.push({
        level: "warning",
        code: "CAMPAIGN_ID_RECOMMENDED_FOR_OUTCOME_STYLE_SET",
        message:
          "parameter_set_id looks like an outcome campaign set but campaign_id is empty — set InpCampaignId for evidence traceability",
      });
    }
    if (looksLikeOutcomeStyleParameterSetId(pid) && safeOpt === false) {
      warnings.push({
        level: "warning",
        code: "OPTIMIZATION_SAFE_EXPORTS_DISABLED_FOR_OUTCOME_STYLE_RUN",
        message:
          "optimization_safe_exports is false while parameter_set_id looks outcome-style — MT5 Optimization may overwrite exports; prefer InpOptimizationSafeExports=true for sweeps",
      });
    }
  }

  if (testEa.tradesImport?.ok && testEa.tradeCount === 0) {
    files.trades = "header_only";
  } else if (testEa.tradesImport && !testEa.tradesImport.ok) {
    files.trades = "invalid";
  }

  if (!testEa.eventsParseOk) {
    files.events = "invalid";
  }
  if (!testEa.summaryOk) {
    files.summary = "invalid";
  }

  const prCounts = parseBacktestEventsCsv(input.eventsCsv, { bundleContract: true });
  const eventCounts = prCounts.ok ? prCounts.eventTypeCounts ?? null : null;

  const IGNORE_FOR_BUNDLE_STATUS = TESTEA_BUNDLE_STRICT_IGNORE_WARNING_CODES;
  const materialWarnings = warnings.filter((w) => !IGNORE_FOR_BUNDLE_STATUS.has(w.code));
  const testeaHasMaterialWarning =
    testEa.diagnostics.some((d) => d.level === "warning" && !IGNORE_FOR_BUNDLE_STATUS.has(d.code));

  const hasErr = errors.length > 0;
  const hasWarn = materialWarnings.length > 0 || testeaHasMaterialWarning;

  let status: TestEaBundleCliStatus;
  if (hasErr) status = "failed";
  else if (hasWarn) status = "warning";
  else status = "ok";

  return {
    ok: status !== "failed",
    status,
    errors,
    warnings,
    files,
    summary: summaryObj,
    eventCounts,
    testEa,
  };
}
