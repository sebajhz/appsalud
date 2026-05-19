import type { BacktestCampaignDataset } from "./backtest-campaign-types";
import { parseBacktestEventsCsv, type ParseBacktestEventsCsvOptions } from "./backtest-events-csv";
import { importBacktestTradesFromCsv } from "./backtest-importer";
import type { BacktestImportResult, ImportBacktestCsvOptions } from "./backtest-types";
import {
  parseBridgeAccountSnapshotCsv,
  parseBridgeDealsHistoryCsv,
  parseBridgeErrorsCsv,
  parseBridgeMarketSnapshotCsv,
  parseBridgeOrdersPendingCsv,
  parseBridgePositionsOpenCsv,
} from "./bridge-parse-csv";
import { parseBridgeStatusJson } from "./bridge-parse-json";
import type { BridgeStatusSnapshot } from "./bridge-types";
import { exportSampleDiagnostic } from "./export-sample-validation-reasons";
import type {
  BridgeExportValidationResult,
  ExportSampleBundleKind,
  ExportSampleFileKind,
  ExportSampleFileText,
  ExportSamplePrivacyCheckResult,
  ExportSampleValidationDiagnostic,
  ExportSampleValidationInput,
  ExportSampleValidationResult,
  ExportSampleValidationStatus,
  TestEaExportValidationResult,
} from "./export-sample-validation-types";
import {
  createBacktestCampaignDatasetFromManualImport,
  importManualCandleDataset,
} from "./manual-candle-dataset-importer";
import {
  BUFFERED_EVOS_OPTIMIZATION_PARAMETER_KEYS,
  BUFFERED_EVOS_SUMMARY_AGGREGATE_STRING_KEYS,
  listBufferedEvosSummaryRollupKeys,
} from "./buffered-evos-export-keys";
import {
  IFVG_BISI_SIBI_OPTIMIZATION_PARAMETER_KEYS,
  IFVG_BISI_SIBI_SUMMARY_NUMERIC_KEYS,
  IFVG_BISI_SIBI_TRADE_COLUMNS,
} from "./ifvg-bisi-sibi-export-keys";
import {
  LIQUIDITY_TARGET_QUALITY_OPTIMIZATION_PARAMETER_KEYS,
  LIQUIDITY_TARGET_QUALITY_SUMMARY_NUMERIC_KEYS,
  LIQUIDITY_TARGET_QUALITY_TRADE_COLUMNS,
} from "./liquidity-target-quality-export-keys";

const FILE_NAME_TO_KIND: Record<string, ExportSampleFileKind> = {
  "bridge_status.json": "bridge_status_json",
  "latest_market_snapshot.csv": "latest_market_snapshot_csv",
  "account_snapshot.csv": "account_snapshot_csv",
  "candles.csv": "candles_csv",
  "positions_open.csv": "positions_open_csv",
  "orders_pending.csv": "orders_pending_csv",
  "deals_history.csv": "deals_history_csv",
  "bridge_errors.csv": "bridge_errors_csv",
  "backtest_trades.csv": "backtest_trades_csv",
  "backtest_events.csv": "backtest_events_csv",
  "backtest_summary.json": "backtest_summary_json",
};

export function inferExportSampleFileKind(fileName: string): ExportSampleFileKind | undefined {
  const base = fileName.trim().split(/[/\\]/).pop()?.toLowerCase() ?? "";
  return FILE_NAME_TO_KIND[base];
}

function resolveFileKinds(files: ExportSampleFileText[]): ExportSampleFileText[] {
  return files.map((f) => {
    const inferred = f.fileKind ?? inferExportSampleFileKind(f.fileName);
    return inferred ? { ...f, fileKind: inferred } : { ...f };
  });
}

function isBridgeKind(k: ExportSampleFileKind | undefined): boolean {
  if (!k) return false;
  return (
    k !== "backtest_trades_csv" &&
    k !== "backtest_events_csv" &&
    k !== "backtest_summary_json"
  );
}

function isTestEaKind(k: ExportSampleFileKind | undefined): boolean {
  return k === "backtest_trades_csv" || k === "backtest_events_csv" || k === "backtest_summary_json";
}

/** Privacy heuristics for sanitized samples — conservative; no disk access. */
export function scanExportSamplePrivacy(
  files: ExportSampleFileText[],
  mode: "strict" | "relaxed",
): ExportSamplePrivacyCheckResult {
  const findings: ExportSampleValidationDiagnostic[] = [];

  for (const f of files) {
    const t = f.text;
    const fn = f.fileName;

    const loginMatch = t.match(/"account_login"\s*:\s*"?(\d+)"?/);
    if (loginMatch && loginMatch[1]!.length >= 12) {
      findings.push(
        exportSampleDiagnostic(
          mode === "strict" ? "error" : "warning",
          "PRIVACY_ACCOUNT_LOGIN_LONG",
          `account_login has ${loginMatch[1]!.length} digits (prefer short placeholders e.g. 123456 for samples)`,
          { fileName: fn, detail: loginMatch[1]!.slice(0, 6) + "…" },
        ),
      );
    }

    const serverMatch = t.match(/"account_server"\s*:\s*"([^"]+)"/);
    if (serverMatch) {
      const s = serverMatch[1]!;
      const looksLiveReal =
        /(ICMarkets|Oanda|Pepperstone|FxPro|Interactive\s*Brokers)/i.test(s) &&
        /(Live|Real)/i.test(s) &&
        !/mock|demo|test|sandbox|synthetic/i.test(s);
      if (looksLiveReal) {
        findings.push(
          exportSampleDiagnostic(
            mode === "strict" ? "error" : "warning",
            "PRIVACY_ACCOUNT_SERVER_SENSITIVE",
            "account_server resembles a live broker server name; redact or use Mock*-Demo style placeholders",
            { fileName: fn, detail: s },
          ),
        );
      }
    }

    if (/account_snapshot/i.test(f.fileName) || f.fileKind === "account_snapshot_csv") {
      const lines = t.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length >= 2) {
        const header = lines[0]!.toLowerCase().split(",");
        const balIdx = header.indexOf("balance");
        const eqIdx = header.indexOf("equity");
        for (let r = 1; r < lines.length; r++) {
          const cells = lines[r]!.split(",");
          const bal = balIdx >= 0 ? Number(cells[balIdx]?.trim()) : NaN;
          const eq = eqIdx >= 0 ? Number(cells[eqIdx]?.trim()) : NaN;
          for (const [label, v] of [
            ["balance", bal],
            ["equity", eq],
          ] as const) {
            if (Number.isFinite(v) && v > 50_000_000) {
              findings.push(
                exportSampleDiagnostic(
                  mode === "strict" ? "error" : "warning",
                  "PRIVACY_LARGE_ACCOUNT_METRIC",
                  `Very large ${label} in account snapshot (${v}) — verify redaction for sample bundles`,
                  { fileName: fn },
                ),
              );
            }
          }
        }
      }
    }
  }

  const hasError = findings.some((x) => x.level === "error");
  return { mode, passed: !hasError, findings };
}

function bumpStatus(
  current: ExportSampleValidationStatus,
  next: ExportSampleValidationStatus,
): ExportSampleValidationStatus {
  const rank: Record<ExportSampleValidationStatus, number> = {
    valid: 0,
    valid_with_warnings: 1,
    insufficient_files: 2,
    invalid: 4,
  };
  return rank[next] > rank[current] ? next : current;
}

function mergeDiagnostics(
  a: ExportSampleValidationDiagnostic[],
  b: ExportSampleValidationDiagnostic[],
): ExportSampleValidationDiagnostic[] {
  return [...a, ...b];
}

export function validateBridgeEaExportSample(input: ExportSampleValidationInput): BridgeExportValidationResult {
  const diagnostics: ExportSampleValidationDiagnostic[] = [];
  let status: ExportSampleValidationStatus = "valid";

  const files = resolveFileKinds(input.files.filter((f) => isBridgeKind(f.fileKind ?? inferExportSampleFileKind(f.fileName))));
  const byKind = new Map<ExportSampleFileKind, ExportSampleFileText>();
  for (const f of files) {
    const k = f.fileKind ?? inferExportSampleFileKind(f.fileName);
    if (k && isBridgeKind(k)) byKind.set(k, { ...f, fileKind: k });
  }

  const get = (k: ExportSampleFileKind) => byKind.get(k);

  let statusSnapshot: BridgeStatusSnapshot | null = null;
  let statusJsonOk = false;
  let schemaVersionNote: string | undefined;

  const st = get("bridge_status_json");
  if (!st) {
    diagnostics.push(
      exportSampleDiagnostic(
        "warning",
        "BRIDGE_STATUS_MISSING",
        "bridge_status.json not found — BridgeEA bundle insufficient for full contract check",
        { detail: "add bridge_status.json for status validation" },
      ),
    );
    status = bumpStatus(status, "insufficient_files");
  } else {
    const pr = parseBridgeStatusJson(st.text);
    if (!pr.ok || !pr.value) {
      status = bumpStatus(status, "invalid");
      for (const e of pr.errors) {
        diagnostics.push(
          exportSampleDiagnostic("error", e.code, e.message, { fileName: st.fileName, detail: e.detail }),
        );
      }
    } else {
      statusJsonOk = true;
      statusSnapshot = pr.value;
      if (statusSnapshot.schemaVersion === "QTG_BRIDGE_V1") {
        schemaVersionNote = "legacy_QTG_BRIDGE_V1_alias";
        diagnostics.push(
          exportSampleDiagnostic(
            "warning",
            "BRIDGE_SCHEMA_ALIAS",
            "schema_version uses legacy QTG_BRIDGE_V1 alias; prefer MZP_BRIDGE_V1 for new samples",
            { fileName: st.fileName },
          ),
        );
        status = bumpStatus(status, "valid_with_warnings");
      }
      if (statusSnapshot.schemaVersion !== "MZP_BRIDGE_V1") {
        diagnostics.push(
          exportSampleDiagnostic(
            "warning",
            "BRIDGE_SCHEMA_NON_MZP",
            "Contract samples normally use MZP_BRIDGE_V1",
            { fileName: st.fileName, detail: statusSnapshot.schemaVersion },
          ),
        );
        status = bumpStatus(status, "valid_with_warnings");
      }
    }
  }

  let candlesManualImport = null as ReturnType<typeof importManualCandleDataset> | null;
  let campaignDataset = null as BacktestCampaignDataset | null;
  const cd = get("candles_csv");
  if (!cd) {
    diagnostics.push(
      exportSampleDiagnostic(
        "warning",
        "BRIDGE_CANDLES_MISSING",
        "candles.csv missing — cannot build ManualCandleDataset / campaign adapter path",
      ),
    );
    status = bumpStatus(status, "valid_with_warnings");
  } else {
    const sym = input.expectedCanonicalSymbol ?? "XAUUSD";
    const tf = input.expectedTimeframe ?? "M15";
    candlesManualImport = importManualCandleDataset({
      csvText: cd.text,
      canonicalSymbol: sym,
      brokerSymbol: input.expectedBrokerSymbol ?? sym,
      timeframe: tf,
      datasetSplit: input.datasetSplit ?? "unknown",
      sourceName: input.sourceName ?? "export-sample-validation",
      sourceTypeHint: "bridge_candles_csv_text",
      formatHint: "auto_detect",
    });
    if (!candlesManualImport.ok) {
      status = bumpStatus(status, "invalid");
      for (const e of candlesManualImport.errors) {
        diagnostics.push(
          exportSampleDiagnostic("error", e.code, e.message, { fileName: cd.fileName, detail: e.detail }),
        );
      }
    } else {
      for (const w of candlesManualImport.warnings) {
        diagnostics.push(
          exportSampleDiagnostic("warning", w.code, w.message, { fileName: cd.fileName, detail: w.detail }),
        );
        status = bumpStatus(status, "valid_with_warnings");
      }
      if (input.symbolProfile != null && candlesManualImport.dataset) {
        campaignDataset = createBacktestCampaignDatasetFromManualImport(candlesManualImport, {
          symbolProfile: input.symbolProfile,
          datasetId: "export_sample_bridge_candles",
        });
      }
    }
  }

  function runCsv(
    kind: ExportSampleFileKind,
    label: string,
    parse: (t: string) => { ok: boolean; parsedRowCount?: number; rows?: unknown[]; errors: { code: string; message: string; detail?: string }[] },
  ): { ok: boolean; rowCount: number } {
    const f = get(kind);
    if (!f) {
      diagnostics.push(
        exportSampleDiagnostic("info", "BRIDGE_FILE_OPTIONAL_MISSING", `${label} not present (optional in sample)`, {
          fileName: kind,
        }),
      );
      return { ok: true, rowCount: 0 };
    }
    const r = parse(f.text);
    if (!r.ok) {
      status = bumpStatus(status, "invalid");
      for (const e of r.errors) {
        diagnostics.push(
          exportSampleDiagnostic("error", e.code, e.message, { fileName: f.fileName, detail: e.detail }),
        );
      }
      return { ok: false, rowCount: 0 };
    }
    const n = r.parsedRowCount ?? r.rows?.length ?? 0;
    return { ok: true, rowCount: n };
  }

  const market = runCsv("latest_market_snapshot_csv", "latest_market_snapshot.csv", (txt) => {
    const o = parseBridgeMarketSnapshotCsv(txt);
    return { ok: o.ok, parsedRowCount: o.parsedRowCount, rows: o.rows, errors: o.errors };
  });
  const account = runCsv("account_snapshot_csv", "account_snapshot.csv", (txt) => {
    const o = parseBridgeAccountSnapshotCsv(txt);
    return { ok: o.ok, parsedRowCount: o.parsedRowCount, rows: o.rows, errors: o.errors };
  });
  const pos = runCsv("positions_open_csv", "positions_open.csv", (txt) => {
    const o = parseBridgePositionsOpenCsv(txt);
    return { ok: o.ok, parsedRowCount: o.parsedRowCount, rows: o.rows, errors: o.errors };
  });
  const ord = runCsv("orders_pending_csv", "orders_pending.csv", (txt) => {
    const o = parseBridgeOrdersPendingCsv(txt);
    return { ok: o.ok, parsedRowCount: o.parsedRowCount, rows: o.rows, errors: o.errors };
  });
  const deals = runCsv("deals_history_csv", "deals_history.csv", (txt) => {
    const o = parseBridgeDealsHistoryCsv(txt);
    return { ok: o.ok, parsedRowCount: o.parsedRowCount, rows: o.rows, errors: o.errors };
  });
  const errf = runCsv("bridge_errors_csv", "bridge_errors.csv", (txt) => {
    const o = parseBridgeErrorsCsv(txt);
    return { ok: o.ok, parsedRowCount: o.parsedRowCount, rows: o.rows, errors: o.errors };
  });

  return {
    status,
    statusSnapshot,
    statusJsonOk,
    schemaVersionNote,
    candlesManualImport,
    campaignDataset,
    marketSnapshotOk: market.ok,
    marketSnapshotRowCount: market.rowCount,
    accountSnapshotOk: account.ok,
    accountSnapshotRowCount: account.rowCount,
    positionsOk: pos.ok,
    positionsRowCount: pos.rowCount,
    ordersOk: ord.ok,
    ordersRowCount: ord.rowCount,
    dealsOk: deals.ok,
    dealsRowCount: deals.rowCount,
    errorsCsvOk: errf.ok,
    errorsCsvRowCount: errf.rowCount,
    diagnostics,
  };
}

export interface TestEaValidateOptions {
  importOptions: ImportBacktestCsvOptions;
  /**
   * When true and `trade_count` in summary is 0, imported trade rows produce a **warning**
   * instead of `TESTEA_TRADE_COUNT_MISMATCH` error (E4.1 bundle phase: header-only expected;
   * unexpected rows are suspicious but not always fatal for smoke exports).
   */
  zeroTradeCountMismatchAsWarning?: boolean;
  /** Passed to `parseBacktestEventsCsv` for `backtest_events.csv` (e.g. E4.1 `bundleContract`). */
  eventsParseOptions?: ParseBacktestEventsCsvOptions;
}

export function validateTestEaExportSample(
  input: ExportSampleValidationInput,
  testEaOptions: TestEaValidateOptions,
): TestEaExportValidationResult {
  const diagnostics: ExportSampleValidationDiagnostic[] = [];
  let status: ExportSampleValidationStatus = "valid";

  let eventsCsvPresent = false;
  let eventsParseAttempted = false;
  let eventsParseOk = false;
  let eventsDataRowCount = 0;

  const files = resolveFileKinds(input.files.filter((f) => isTestEaKind(f.fileKind ?? inferExportSampleFileKind(f.fileName))));
  const byKind = new Map<ExportSampleFileKind, ExportSampleFileText>();
  for (const f of files) {
    const k = f.fileKind ?? inferExportSampleFileKind(f.fileName);
    if (k && isTestEaKind(k)) byKind.set(k, { ...f, fileKind: k });
  }

  let tradesImport = null as BacktestImportResult | null;
  let tradeCount = 0;
  const tr = byKind.get("backtest_trades_csv");
  if (!tr) {
    diagnostics.push(
      exportSampleDiagnostic("warning", "TESTEA_TRADES_MISSING", "backtest_trades.csv not found", {}),
    );
    status = bumpStatus(status, "valid_with_warnings");
  } else {
    tradesImport = importBacktestTradesFromCsv(tr.text, testEaOptions.importOptions);
    tradeCount = tradesImport.trades.length;
    if (!tradesImport.ok) {
      status = bumpStatus(status, "invalid");
      for (const e of tradesImport.errors) {
        diagnostics.push(
          exportSampleDiagnostic("error", e.code, e.message, { fileName: tr.fileName, detail: "row" in e ? String((e as { row?: number }).row) : undefined }),
        );
      }
    }
    for (const w of tradesImport.warnings) {
      diagnostics.push(
        exportSampleDiagnostic("warning", w.code, w.message, { fileName: tr.fileName, detail: "row" in w ? String((w as { row?: number }).row) : undefined }),
      );
      status = bumpStatus(status, "valid_with_warnings");
    }
  }

  const ev = byKind.get("backtest_events_csv");
  if (ev) {
    eventsCsvPresent = true;
    eventsParseAttempted = true;
    const pr = parseBacktestEventsCsv(ev.text, testEaOptions.eventsParseOptions);
    eventsDataRowCount = pr.rowCount;
    eventsParseOk = pr.ok;
    if (!pr.ok) {
      status = bumpStatus(status, "invalid");
      for (const e of pr.errors) {
        diagnostics.push(
          exportSampleDiagnostic("error", e.code, e.message, {
            fileName: ev.fileName,
            detail: e.row !== undefined ? String(e.row) : undefined,
          }),
        );
      }
    }
    for (const w of pr.warnings) {
      diagnostics.push(
        exportSampleDiagnostic("warning", w.code, w.message, {
          fileName: ev.fileName,
          detail: w.row !== undefined ? String(w.row) : undefined,
        }),
      );
      status = bumpStatus(status, "valid_with_warnings");
    }
  }

  let summaryParsed = false;
  let summaryOk = false;
  let summaryTradeCount: number | null = null;
  let summaryJson: Record<string, unknown> | null = null;

  const sj = byKind.get("backtest_summary_json");
  if (!sj) {
    diagnostics.push(
      exportSampleDiagnostic("warning", "TESTEA_SUMMARY_MISSING", "backtest_summary.json not found", {}),
    );
    status = bumpStatus(status, "valid_with_warnings");
  } else {
    summaryParsed = true;
    let root: unknown;
    try {
      root = JSON.parse(sj.text) as unknown;
    } catch (e) {
      status = bumpStatus(status, "invalid");
      diagnostics.push(
        exportSampleDiagnostic(
          "error",
          "TESTEA_SUMMARY_JSON_INVALID",
          "JSON parse failed",
          { fileName: sj.fileName, detail: e instanceof Error ? e.message : String(e) },
        ),
      );
      root = undefined;
    }
    if (root !== undefined && root !== null && typeof root === "object" && !Array.isArray(root)) {
      summaryJson = root as Record<string, unknown>;
      const schema = summaryJson["schema_version"];

      if (schema === "MZP_TESTEA_V1") {
        const execMode = summaryJson["execution_mode"];
        if (execMode !== "virtual_export_only") {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_EXECUTION_MODE",
              "execution_mode must be virtual_export_only for CP14/TestEA contract samples",
              { fileName: sj.fileName, detail: String(execMode) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        const live = summaryJson["live_trading_enabled"];
        if (live !== false) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_LIVE_FLAG",
              "live_trading_enabled must be false for safe TestEA export samples",
              { fileName: sj.fileName, detail: String(live) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
      } else if (schema === "backtest_ea_v1") {
        if (summaryJson["tester_only"] !== true) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_TESTER_ONLY",
              "tester_only must be true for backtest_ea_v1 samples",
              { fileName: sj.fileName, detail: String(summaryJson["tester_only"]) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        if (summaryJson["official_ea"] !== "Mapazapp_TestEA") {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_OFFICIAL_EA",
              "official_ea must be Mapazapp_TestEA for backtest_ea_v1 samples",
              { fileName: sj.fileName, detail: String(summaryJson["official_ea"]) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        if (summaryJson["backtest_role"] !== true) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_BACKTEST_ROLE",
              "backtest_role must be true for backtest_ea_v1 samples",
              { fileName: sj.fileName, detail: String(summaryJson["backtest_role"]) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        if (summaryJson["has_real_daily_bias_logic"] !== true) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_BIAS_FLAG",
              "has_real_daily_bias_logic must be true for backtest_ea_v1 samples",
              { fileName: sj.fileName, detail: String(summaryJson["has_real_daily_bias_logic"]) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        if (summaryJson["has_real_ifvg_logic"] !== true) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_IFVG_FLAG",
              "has_real_ifvg_logic must be true for backtest_ea_v1 samples (FVG / Setup V1 candidate detection; see has_full_ifvg_pipeline)",
              { fileName: sj.fileName, detail: String(summaryJson["has_real_ifvg_logic"]) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        if (summaryJson["has_real_trading_orders"] !== false) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_ORDERS_FLAG",
              "has_real_trading_orders must be false for backtest_ea_v1 samples",
              { fileName: sj.fileName, detail: String(summaryJson["has_real_trading_orders"]) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        const pipe = summaryJson["has_full_ifvg_pipeline"];
        if (pipe !== false) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_PIPELINE_FALSE",
              "has_full_ifvg_pipeline must be false for backtest_ea_v1 (E3.6: FVG/setup candidate detection only; not full IFVG pipeline)",
              { fileName: sj.fileName, detail: String(pipe) },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        const tcVirtProbe = summaryJson["trade_count"];
        if (typeof tcVirtProbe === "number" && tcVirtProbe > 0 && summaryJson["has_real_virtual_trade_logic"] !== true) {
          diagnostics.push(
            exportSampleDiagnostic(
              "error",
              "TESTEA_SUMMARY_VIRTUAL_TRADE_LOGIC",
              "has_real_virtual_trade_logic must be true when trade_count > 0 (E5.3 virtual outcomes)",
              { fileName: sj.fileName },
            ),
          );
          status = bumpStatus(status, "invalid");
        }
        if (summaryJson["has_entry_quality_score_logic"] === true) {
          if (summaryJson["score_observation_only"] !== true) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_SCORE_OBSERVATION_ONLY",
                "E5.8: when has_entry_quality_score_logic is true, score_observation_only must be true (observation-only exports)",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
          if (summaryJson["score_gate_enabled"] === true) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_SCORE_GATE_ENABLED",
                "E5.8: score_gate_enabled must be false for observation-only Entry Quality Score exports",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
        }
        if (summaryJson["has_liquidity_sweep_v1_logic"] === true) {
          const liqSummaryKeys = [
            "liquidity_sweep_detection_enabled",
            "liquidity_sweep_score_enabled",
            "average_liquidity_event_score",
            "liquidity_sweep_detected_count",
            "liquidity_sweep_relevant_count",
            "liquidity_sweep_opposite_count",
            "liquidity_sweep_missing_count",
            "liquidity_sweep_pdh_count",
            "liquidity_sweep_pdl_count",
            "liquidity_sweep_local_high_count",
            "liquidity_sweep_local_low_count",
          ] as const;
          for (const k of liqSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_LIQUIDITY_SWEEP_E5_10_KEY",
                  `E5.10: when has_liquidity_sweep_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const detEn = summaryJson["liquidity_sweep_detection_enabled"];
          if (detEn !== undefined && typeof detEn !== "boolean") {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_LIQUIDITY_DETECTION_ENABLED_TYPE",
                "liquidity_sweep_detection_enabled must be boolean",
                { fileName: sj.fileName, detail: String(detEn) },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
          const scoreEn = summaryJson["liquidity_sweep_score_enabled"];
          if (scoreEn !== undefined && typeof scoreEn !== "boolean") {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_LIQUIDITY_SCORE_ENABLED_TYPE",
                "liquidity_sweep_score_enabled must be boolean",
                { fileName: sj.fileName, detail: String(scoreEn) },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
          const liqAvg = summaryJson["average_liquidity_event_score"];
          if (liqAvg !== undefined && (typeof liqAvg !== "number" || !Number.isFinite(liqAvg))) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_LIQUIDITY_AVG_SCORE",
                "average_liquidity_event_score must be a finite number",
                { fileName: sj.fileName, detail: String(liqAvg) },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
          const liqCounters = [
            "liquidity_sweep_detected_count",
            "liquidity_sweep_relevant_count",
            "liquidity_sweep_opposite_count",
            "liquidity_sweep_missing_count",
            "liquidity_sweep_pdh_count",
            "liquidity_sweep_pdl_count",
            "liquidity_sweep_local_high_count",
            "liquidity_sweep_local_low_count",
          ] as const;
          for (const k of liqCounters) {
            const v = summaryJson[k];
            if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_LIQUIDITY_COUNTER",
                  `E5.10: "${k}" must be a non-negative finite number`,
                  { fileName: sj.fileName, detail: String(v) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const requiredCols = [
              "liquidity_event_detected",
              "liquidity_event_type",
              "liquidity_event_direction",
              "liquidity_event_age_bars",
              "liquidity_event_level",
              "liquidity_event_sweep_price",
              "liquidity_event_distance_points",
              "liquidity_event_reasons",
            ] as const;
            for (const col of requiredCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_LIQUIDITY_E5_10",
                    `E5.10: backtest_trades.csv header must include "${col}" when has_liquidity_sweep_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_LIQUIDITY_HEADER_CHECK",
                "has_liquidity_sweep_v1_logic is true but backtest_trades.csv missing — cannot verify E5.10 trade columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_liquidity_sweep_quality_v1_logic"] === true) {
          const liqQSummaryKeys = [
            "average_liquidity_sweep_quality_score",
            "liquidity_sweep_quality_a_count",
            "liquidity_sweep_quality_b_count",
            "liquidity_sweep_quality_c_count",
            "liquidity_sweep_quality_weak_count",
            "liquidity_sweep_quality_none_count",
            "average_liquidity_sweep_recency_score",
            "average_liquidity_sweep_reaction_score",
            "average_liquidity_sweep_displacement_score",
            "average_liquidity_sweep_directional_score",
            "average_liquidity_sweep_distance_score",
            "average_liquidity_sweep_quality_score_win",
            "average_liquidity_sweep_quality_score_loss",
            "average_liquidity_sweep_quality_score_ambiguous",
            "average_liquidity_sweep_quality_score_expired_unfilled",
          ] as const;
          for (const k of liqQSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_LIQUIDITY_QUALITY_E5_10_2_KEY",
                  `E5.10.2: when has_liquidity_sweep_quality_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_LIQUIDITY_QUALITY_NUM",
                    `E5.10.2: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const qualityCols = [
              "liquidity_sweep_quality_score",
              "liquidity_sweep_quality_grade",
              "liquidity_sweep_recency_score",
              "liquidity_sweep_directional_score",
              "liquidity_sweep_reaction_score",
              "liquidity_sweep_displacement_score",
              "liquidity_sweep_distance_score",
              "liquidity_sweep_quality_reasons",
            ] as const;
            for (const col of qualityCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_LIQUIDITY_QUALITY_E5_10_2",
                    `E5.10.2: backtest_trades.csv header must include "${col}" when has_liquidity_sweep_quality_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_LIQUIDITY_QUALITY_HEADER_CHECK",
                "has_liquidity_sweep_quality_v1_logic is true but backtest_trades.csv missing — cannot verify E5.10.2 trade columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_liquidity_chain_v1_logic"] === true) {
          const chainSummaryKeys = [
            "liquidity_chain_detected_count",
            "liquidity_chain_a_count",
            "liquidity_chain_b_count",
            "liquidity_chain_c_count",
            "liquidity_chain_weak_count",
            "liquidity_chain_none_count",
            "average_liquidity_chain_score",
            "average_liquidity_chain_sweep_to_setup_bars",
            "liquidity_chain_reaction_confirmed_count",
            "liquidity_chain_displacement_confirmed_count",
            "liquidity_chain_fvg_after_sweep_count",
          ] as const;
          for (const k of chainSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_LIQUIDITY_CHAIN_E5_10_4_KEY",
                  `E5.10.4: when has_liquidity_chain_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_LIQUIDITY_CHAIN_E5_10_4_NUM",
                    `E5.10.4: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          const chainCounters = [
            "liquidity_chain_detected_count",
            "liquidity_chain_a_count",
            "liquidity_chain_b_count",
            "liquidity_chain_c_count",
            "liquidity_chain_weak_count",
            "liquidity_chain_none_count",
            "liquidity_chain_reaction_confirmed_count",
            "liquidity_chain_displacement_confirmed_count",
            "liquidity_chain_fvg_after_sweep_count",
          ] as const;
          for (const k of chainCounters) {
            const v = summaryJson[k];
            if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_LIQUIDITY_CHAIN_COUNTER",
                  `E5.10.4: "${k}" must be a non-negative finite number`,
                  { fileName: sj.fileName, detail: String(v) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const chainCols = [
              "liquidity_chain_detected",
              "liquidity_chain_grade",
              "liquidity_chain_score",
              "liquidity_chain_sweep_to_setup_bars",
              "liquidity_chain_sweep_to_fvg_bars",
              "liquidity_chain_reaction_confirmed",
              "liquidity_chain_displacement_confirmed",
              "liquidity_chain_fvg_created_after_sweep",
              "liquidity_chain_distance_to_fvg_points",
              "liquidity_chain_reasons",
            ] as const;
            for (const col of chainCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_LIQUIDITY_CHAIN_E5_10_4",
                    `E5.10.4: backtest_trades.csv header must include "${col}" when has_liquidity_chain_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_LIQUIDITY_CHAIN_HEADER_CHECK",
                "has_liquidity_chain_v1_logic is true but backtest_trades.csv missing — cannot verify E5.10.4 trade columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_liquidity_chain_reaction_audit_v1_logic"] === true) {
          const rxAuditSummaryKeys = [
            "liquidity_chain_reaction_checked_count",
            "liquidity_chain_reaction_fail_close_not_back_inside_count",
            "liquidity_chain_reaction_fail_no_candle_after_sweep_count",
            "liquidity_chain_reaction_fail_wrong_level_count",
            "liquidity_chain_reaction_fail_sweep_after_fvg_count",
            "liquidity_chain_reaction_fail_other_count",
          ] as const;
          for (const k of rxAuditSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6_KEY",
                  `E5.10.6: when has_liquidity_chain_reaction_audit_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6_NUM",
                    `E5.10.6: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const rxCols = [
              "liquidity_chain_reaction_failure_reason",
              "liquidity_chain_reaction_close_price",
              "liquidity_chain_reaction_level",
              "liquidity_chain_reaction_bars_checked",
            ] as const;
            for (const col of rxCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6",
                    `E5.10.6: backtest_trades.csv header must include "${col}" when has_liquidity_chain_reaction_audit_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_LIQUIDITY_CHAIN_REACTION_AUDIT_HEADER_CHECK",
                "has_liquidity_chain_reaction_audit_v1_logic is true but backtest_trades.csv missing — cannot verify E5.10.6 reaction audit columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_htf_structure_v1_logic"] === true) {
          if (!("htf_structure_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_HTF_STRUCTURE_E5_11_KEY",
                `E5.11: when has_htf_structure_v1_logic is true, summary must include "htf_structure_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else {
            const en = summaryJson["htf_structure_enabled"];
            if (typeof en !== "boolean") {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_HTF_STRUCTURE_E5_11_BOOL",
                  `E5.11: "htf_structure_enabled" must be a boolean`,
                  { fileName: sj.fileName, detail: String(en) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const htfNumericSummaryKeys = [
            "htf_structure_aligned_count",
            "htf_structure_conflict_count",
            "htf_structure_h4_bullish_count",
            "htf_structure_h4_bearish_count",
            "htf_structure_h4_range_count",
            "htf_structure_h4_transition_count",
            "htf_structure_h1_bullish_count",
            "htf_structure_h1_bearish_count",
            "htf_structure_h1_range_count",
            "htf_structure_h1_transition_count",
            "average_htf_structure_score",
          ] as const;
          for (const k of htfNumericSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_HTF_STRUCTURE_E5_11_KEY",
                  `E5.11: when has_htf_structure_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_HTF_STRUCTURE_E5_11_NUM",
                    `E5.11: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const htfCols = [
              "htf_structure_enabled",
              "h4_structure_state",
              "h1_structure_state",
              "h4_structure_direction",
              "h1_structure_direction",
              "htf_structure_aligned",
              "htf_structure_conflict",
              "htf_structure_score",
              "h4_protected_high",
              "h4_protected_low",
              "h1_protected_high",
              "h1_protected_low",
              "h4_external_liquidity_high",
              "h4_external_liquidity_low",
              "h1_external_liquidity_high",
              "h1_external_liquidity_low",
              "htf_structure_reasons",
            ] as const;
            for (const col of htfCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_HTF_STRUCTURE_E5_11",
                    `E5.11: backtest_trades.csv header must include "${col}" when has_htf_structure_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_HTF_STRUCTURE_HEADER_CHECK",
                "has_htf_structure_v1_logic is true but backtest_trades.csv missing — cannot verify E5.11 HTF columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_mss_choch_v1_logic"] === true) {
          if (!("mss_choch_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_MSS_CHOCH_E5_12_KEY",
                `E5.12: when has_mss_choch_v1_logic is true, summary must include "mss_choch_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else {
            const men = summaryJson["mss_choch_enabled"];
            if (typeof men !== "boolean") {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_MSS_CHOCH_E5_12_BOOL",
                  `E5.12: "mss_choch_enabled" must be a boolean`,
                  { fileName: sj.fileName, detail: String(men) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const mscNumericSummaryKeys = [
            "mss_detected_count",
            "bullish_mss_count",
            "bearish_mss_count",
            "choch_detected_count",
            "bullish_choch_count",
            "bearish_choch_count",
            "wick_break_only_count",
            "mss_valid_close_count",
            "choch_valid_close_count",
            "mss_aligned_with_trade_count",
            "mss_against_trade_count",
            "choch_aligned_with_trade_count",
            "choch_against_trade_count",
            "average_mss_choch_score",
          ] as const;
          for (const k of mscNumericSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_MSS_CHOCH_E5_12_KEY",
                  `E5.12: when has_mss_choch_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_MSS_CHOCH_E5_12_NUM",
                    `E5.12: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const mscCols = [
              "mss_choch_enabled",
              "mss_detected",
              "mss_direction",
              "mss_break_level",
              "mss_close_price",
              "mss_bars_after_sweep",
              "mss_bars_before_entry",
              "mss_valid_close",
              "choch_detected",
              "choch_direction",
              "choch_break_level",
              "choch_close_price",
              "choch_valid_close",
              "wick_break_only",
              "internal_swing_high",
              "internal_swing_low",
              "internal_swing_high_age_bars",
              "internal_swing_low_age_bars",
              "mss_choch_score",
              "mss_choch_reasons",
            ] as const;
            for (const col of mscCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_MSS_CHOCH_E5_12",
                    `E5.12: backtest_trades.csv header must include "${col}" when has_mss_choch_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_MSS_CHOCH_HEADER_CHECK",
                "has_mss_choch_v1_logic is true but backtest_trades.csv missing — cannot verify E5.12 MSS/CHoCH columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_mss_choch_temporal_relevance_v1_logic"] === true) {
          const temporalSummaryKeys = [
            "average_mss_temporal_relevance_score",
            "average_choch_temporal_relevance_score",
            "mss_after_sweep_count",
            "mss_before_entry_count",
            "mss_near_entry_window_count",
            "mss_too_early_count",
            "mss_too_late_count",
            "mss_after_fvg_count",
            "mss_before_fvg_count",
            "choch_after_sweep_count",
            "choch_before_entry_count",
            "choch_near_entry_window_count",
            "choch_too_early_count",
            "choch_too_late_count",
            "choch_after_fvg_count",
            "choch_before_fvg_count",
          ] as const;
          for (const k of temporalSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_MSS_CHOCH_TEMPORAL_E5_12_2_KEY",
                  `E5.12.2: when has_mss_choch_temporal_relevance_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_MSS_CHOCH_TEMPORAL_E5_12_2_NUM",
                    `E5.12.2: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const temporalCols = [
              "mss_temporal_relevance_score",
              "mss_temporal_relevance_grade",
              "mss_after_sweep",
              "mss_before_entry",
              "mss_near_entry_window",
              "mss_too_early",
              "mss_too_late",
              "mss_after_fvg",
              "mss_before_fvg",
              "mss_sweep_to_mss_bars",
              "mss_fvg_to_mss_bars",
              "mss_mss_to_entry_bars",
              "mss_temporal_relevance_reasons",
              "choch_temporal_relevance_score",
              "choch_temporal_relevance_grade",
              "choch_after_sweep",
              "choch_before_entry",
              "choch_near_entry_window",
              "choch_too_early",
              "choch_too_late",
              "choch_after_fvg",
              "choch_before_fvg",
              "choch_sweep_to_choch_bars",
              "choch_fvg_to_choch_bars",
              "choch_choch_to_entry_bars",
              "choch_temporal_relevance_reasons",
            ] as const;
            for (const col of temporalCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_MSS_CHOCH_TEMPORAL_E5_12_2",
                    `E5.12.2: backtest_trades.csv header must include "${col}" when has_mss_choch_temporal_relevance_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_MSS_CHOCH_TEMPORAL_HEADER_CHECK",
                "has_mss_choch_temporal_relevance_v1_logic is true but backtest_trades.csv missing — cannot verify E5.12.2 temporal columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_premium_discount_v1_logic"] === true) {
          if (!("premium_discount_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_PD_E5_13_KEY",
                `E5.13: when has_premium_discount_v1_logic is true, summary must include "premium_discount_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else {
            const pden = summaryJson["premium_discount_enabled"];
            if (typeof pden !== "boolean") {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_PD_E5_13_BOOL",
                  `E5.13: "premium_discount_enabled" must be a boolean`,
                  { fileName: sj.fileName, detail: String(pden) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const pdSummaryKeys = [
            "pd_valid_range_count",
            "pd_missing_range_count",
            "pd_entry_premium_count",
            "pd_entry_discount_count",
            "pd_entry_equilibrium_count",
            "pd_entry_outside_range_count",
            "pd_entry_zone_valid_for_direction_count",
            "pd_entry_zone_conflict_count",
            "pd_entry_too_deep_count",
            "pd_entry_too_shallow_count",
            "average_premium_discount_score",
            "average_pd_position_pct",
            "average_pd_range_size_points",
          ] as const;
          for (const k of pdSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_PD_E5_13_KEY",
                  `E5.13: when has_premium_discount_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_PD_E5_13_NUM",
                    `E5.13: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const pdCols = [
              "premium_discount_enabled",
              "pd_range_source",
              "pd_range_high",
              "pd_range_low",
              "pd_midpoint_50",
              "pd_position_pct",
              "pd_entry_zone",
              "pd_entry_in_premium",
              "pd_entry_in_discount",
              "pd_entry_in_equilibrium",
              "pd_entry_outside_range",
              "pd_entry_zone_valid_for_direction",
              "pd_entry_zone_conflict",
              "pd_entry_too_deep",
              "pd_entry_too_shallow",
              "pd_range_size_points",
              "pd_entry_distance_to_midpoint_points",
              "premium_discount_score",
              "premium_discount_grade",
              "premium_discount_reasons",
            ] as const;
            for (const col of pdCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_PD_E5_13",
                    `E5.13: backtest_trades.csv header must include "${col}" when has_premium_discount_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_PD_HEADER_CHECK",
                "has_premium_discount_v1_logic is true but backtest_trades.csv missing — cannot verify E5.13 Premium/Discount columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_entry_fill_feasibility_v1_logic"] === true) {
          if (!("entry_fill_feasibility_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_EFF_E5_13_2_KEY",
                `E5.13.2: when has_entry_fill_feasibility_v1_logic is true, summary must include "entry_fill_feasibility_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else {
            const effEn = summaryJson["entry_fill_feasibility_enabled"];
            if (typeof effEn !== "boolean") {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_EFF_E5_13_2_BOOL",
                  `E5.13.2: "entry_fill_feasibility_enabled" must be a boolean`,
                  { fileName: sj.fileName, detail: String(effEn) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const effSummaryKeys = [
            "entry_fill_filled_count",
            "entry_fill_expired_unfilled_count",
            "entry_fill_near_miss_count",
            "entry_fill_missed_shallow_retrace_count",
            "entry_fill_too_deep_for_retest_count",
            "entry_fill_invalidated_before_fill_count",
            "entry_fill_outside_fvg_count",
            "entry_fill_geometry_unknown_count",
            "fvg_touch_reached_count",
            "fvg_ce_touch_reached_count",
            "entry_price_reached_count",
            "average_entry_fill_feasibility_score",
            "average_entry_depth_in_fvg_pct",
            "average_max_retrace_into_fvg_pct",
            "average_missed_entry_by_points",
            "average_bars_to_entry_fill",
            "average_bars_to_max_retrace",
          ] as const;
          for (const k of effSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_EFF_E5_13_2_KEY",
                  `E5.13.2: when has_entry_fill_feasibility_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_EFF_E5_13_2_NUM",
                    `E5.13.2: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const effCols = [
              "entry_fill_feasibility_enabled",
              "entry_fill_status",
              "entry_fill_feasibility_score",
              "entry_fill_feasibility_grade",
              "entry_fill_feasibility_reasons",
              "entry_price_for_fill_audit",
              "fvg_near_edge_price",
              "fvg_far_edge_price",
              "fvg_ce_price",
              "entry_depth_in_fvg_pct",
              "entry_distance_from_near_edge_points",
              "entry_distance_from_far_edge_points",
              "entry_distance_from_ce_points",
              "fvg_touch_reached",
              "fvg_ce_touch_reached",
              "entry_price_reached",
              "max_retrace_into_fvg_pct",
              "max_retrace_price",
              "max_retrace_to_entry_distance_points",
              "missed_entry_by_points",
              "bars_to_fvg_touch",
              "bars_to_ce_touch",
              "bars_to_entry_fill",
              "bars_to_max_retrace",
              "bars_until_expiration_or_resolution",
              "entry_expired_unfilled",
              "entry_missed_shallow_retrace",
              "entry_too_deep_for_retest",
              "entry_near_miss",
              "entry_filled_fast",
              "entry_filled_late",
              "entry_invalidated_before_fill",
              "entry_outside_fvg",
              "entry_geometry_unknown",
            ] as const;
            for (const col of effCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_EFF_E5_13_2",
                    `E5.13.2: backtest_trades.csv header must include "${col}" when has_entry_fill_feasibility_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_EFF_HEADER_CHECK",
                "has_entry_fill_feasibility_v1_logic is true but backtest_trades.csv missing — cannot verify E5.13.2 Entry Fill Feasibility columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_entry_variant_feasibility_v1_logic"] === true) {
          if (!("entry_variant_feasibility_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_EV_E5_13_4_KEY",
                `E5.13.4: when has_entry_variant_feasibility_v1_logic is true, summary must include "entry_variant_feasibility_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else {
            const evEn = summaryJson["entry_variant_feasibility_enabled"];
            if (typeof evEn !== "boolean") {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_EV_E5_13_4_BOOL",
                  `E5.13.4: "entry_variant_feasibility_enabled" must be a boolean`,
                  { fileName: sj.fileName, detail: String(evEn) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const evSummaryKeys = [
            "entry_variant_edge_reached_count",
            "entry_variant_25_reached_count",
            "entry_variant_50_reached_count",
            "entry_variant_75_reached_count",
            "entry_variant_adaptive_reached_count",
            "entry_variant_shallow_would_fill_count",
            "entry_variant_deeper_would_not_fill_count",
            "average_entry_variant_feasibility_score",
            "average_entry_variant_best_reached_depth_pct",
            "average_entry_variant_official_depth_pct",
            "average_entry_variant_fill_gap_pct",
            "average_entry_variant_edge_missed_by_points",
            "average_entry_variant_25_missed_by_points",
            "average_entry_variant_50_missed_by_points",
            "average_entry_variant_75_missed_by_points",
          ] as const;
          for (const k of evSummaryKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_EV_E5_13_4_KEY",
                  `E5.13.4: when has_entry_variant_feasibility_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const v = summaryJson[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_EV_E5_13_4_NUM",
                    `E5.13.4: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(v) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const evCols = [
              "entry_variant_feasibility_enabled",
              "entry_variant_edge_price",
              "entry_variant_25_price",
              "entry_variant_50_price",
              "entry_variant_75_price",
              "entry_variant_adaptive_price",
              "entry_variant_adaptive_type",
              "entry_variant_edge_reached",
              "entry_variant_25_reached",
              "entry_variant_50_reached",
              "entry_variant_75_reached",
              "entry_variant_adaptive_reached",
              "entry_variant_edge_missed_by_points",
              "entry_variant_25_missed_by_points",
              "entry_variant_50_missed_by_points",
              "entry_variant_75_missed_by_points",
              "entry_variant_adaptive_missed_by_points",
              "entry_variant_edge_bars_to_touch",
              "entry_variant_25_bars_to_touch",
              "entry_variant_50_bars_to_touch",
              "entry_variant_75_bars_to_touch",
              "entry_variant_adaptive_bars_to_touch",
              "entry_variant_best_reached",
              "entry_variant_best_reached_depth_pct",
              "entry_variant_official_depth_pct",
              "entry_variant_fill_gap_pct",
              "entry_variant_shallow_would_fill",
              "entry_variant_deeper_would_not_fill",
              "entry_variant_feasibility_score",
              "entry_variant_feasibility_grade",
              "entry_variant_feasibility_reasons",
            ] as const;
            for (const col of evCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_EV_E5_13_4",
                    `E5.13.4: backtest_trades.csv header must include "${col}" when has_entry_variant_feasibility_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_EV_HEADER_CHECK",
                "has_entry_variant_feasibility_v1_logic is true but backtest_trades.csv missing — cannot verify E5.13.4 Entry Variant Feasibility columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_entry_variant_outcome_sim_v1_logic"] === true) {
          if (!("entry_variant_outcome_sim_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_EVOS_E5_13_6_KEY",
                `E5.13.6: when has_entry_variant_outcome_sim_v1_logic is true, summary must include "entry_variant_outcome_sim_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else {
            const evosEn = summaryJson["entry_variant_outcome_sim_enabled"];
            if (typeof evosEn !== "boolean") {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_EVOS_E5_13_6_BOOL",
                  `E5.13.6: "entry_variant_outcome_sim_enabled" must be a boolean`,
                  { fileName: sj.fileName, detail: String(evosEn) },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const evosVariants = ["edge", "25", "50", "75", "adaptive"] as const;
          const evosRollupSuffixes = [
            "sim_filled_count",
            "sim_win_count",
            "sim_loss_count",
            "sim_ambiguous_count",
            "sim_not_filled_count",
            "sim_invalid_risk_count",
            "sim_total_r",
            "sim_expectancy_r",
            "sim_winrate",
            "sim_average_risk_points",
          ] as const;
          for (const v of evosVariants) {
            for (const sfx of evosRollupSuffixes) {
              const k = `entry_variant_${v}_${sfx}`;
              if (!(k in summaryJson)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_EVOS_E5_13_6_KEY",
                    `E5.13.6: when has_entry_variant_outcome_sim_v1_logic is true, summary must include "${k}"`,
                    { fileName: sj.fileName },
                  ),
                );
                status = bumpStatus(status, "invalid");
              } else {
                const val = summaryJson[k];
                if (typeof val !== "number" || !Number.isFinite(val)) {
                  diagnostics.push(
                    exportSampleDiagnostic(
                      "error",
                      "TESTEA_SUMMARY_EVOS_E5_13_6_NUM",
                      `E5.13.6: "${k}" must be a finite number`,
                      { fileName: sj.fileName, detail: String(val) },
                    ),
                  );
                  status = bumpStatus(status, "invalid");
                }
              }
            }
          }
          const evosCompareKeys = [
            "entry_variant_outcome_sim_best_variant_by_expectancy",
            "entry_variant_outcome_sim_best_variant_by_total_r",
            "entry_variant_outcome_sim_lowest_ambiguous_variant",
            "entry_variant_outcome_sim_highest_fill_variant",
          ] as const;
          for (const k of evosCompareKeys) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_EVOS_E5_13_6_KEY",
                  `E5.13.6: when has_entry_variant_outcome_sim_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            const evosCols = [
              "entry_variant_outcome_sim_enabled",
              "entry_variant_outcome_sim_reasons",
              "entry_variant_edge_sim_status",
              "entry_variant_edge_sim_result_r",
              "entry_variant_edge_sim_entry_price",
              "entry_variant_edge_sim_sl_price",
              "entry_variant_edge_sim_tp_price",
              "entry_variant_edge_sim_risk_points",
              "entry_variant_edge_sim_effective_rr",
              "entry_variant_edge_sim_bars_to_fill",
              "entry_variant_edge_sim_bars_to_close",
              "entry_variant_edge_sim_ambiguous",
              "entry_variant_edge_sim_invalid_risk",
              "entry_variant_25_sim_status",
              "entry_variant_25_sim_result_r",
              "entry_variant_50_sim_status",
              "entry_variant_50_sim_result_r",
              "entry_variant_75_sim_status",
              "entry_variant_75_sim_result_r",
              "entry_variant_adaptive_sim_status",
              "entry_variant_adaptive_sim_result_r",
              "entry_variant_best_sim_variant",
              "entry_variant_best_sim_result_r",
              "entry_variant_best_sim_status",
              "entry_variant_best_sim_reasons",
            ] as const;
            for (const col of evosCols) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_EVOS_E5_13_6",
                    `E5.13.6: backtest_trades.csv header must include "${col}" when has_entry_variant_outcome_sim_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADES_MISSING_EVOS_HEADER_CHECK",
                "has_entry_variant_outcome_sim_v1_logic is true but backtest_trades.csv missing — cannot verify E5.13.6 Entry Variant Outcome Simulation columns",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          }
        }
        if (summaryJson["has_ifvg_bisi_sibi_v1_logic"] === true) {
          if (!("ifvg_bisi_sibi_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_IFVG_E5_14_KEY",
                `E5.14: when has_ifvg_bisi_sibi_v1_logic is true, summary must include "ifvg_bisi_sibi_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else if (typeof summaryJson["ifvg_bisi_sibi_enabled"] !== "boolean") {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_IFVG_E5_14_BOOL",
                `E5.14: "ifvg_bisi_sibi_enabled" must be a boolean`,
                { fileName: sj.fileName, detail: String(summaryJson["ifvg_bisi_sibi_enabled"]) },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
          for (const k of IFVG_BISI_SIBI_SUMMARY_NUMERIC_KEYS) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_IFVG_E5_14_KEY",
                  `E5.14: when has_ifvg_bisi_sibi_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const val = summaryJson[k];
              if (typeof val !== "number" || !Number.isFinite(val)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_IFVG_E5_14_NUM",
                    `E5.14: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(val) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          const optParams = summaryJson["optimization_parameters"];
          if (optParams && typeof optParams === "object" && !Array.isArray(optParams)) {
            const op = optParams as Record<string, unknown>;
            for (const k of IFVG_BISI_SIBI_OPTIMIZATION_PARAMETER_KEYS) {
              if (!(k in op)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_IFVG_E5_14_OPT",
                    `E5.14: optimization_parameters must include "${k}" when has_ifvg_bisi_sibi_v1_logic is true`,
                    { fileName: sj.fileName },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            for (const col of IFVG_BISI_SIBI_TRADE_COLUMNS) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_IFVG_E5_14",
                    `E5.14: backtest_trades.csv header must include "${col}" when has_ifvg_bisi_sibi_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
        }
        if (summaryJson["has_liquidity_target_quality_v1_logic"] === true) {
          if (!("liquidity_target_quality_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_LQ_TGT_E5_15_KEY",
                `E5.15: when has_liquidity_target_quality_v1_logic is true, summary must include "liquidity_target_quality_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else if (typeof summaryJson["liquidity_target_quality_enabled"] !== "boolean") {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_LQ_TGT_E5_15_BOOL",
                `E5.15: "liquidity_target_quality_enabled" must be a boolean`,
                { fileName: sj.fileName, detail: String(summaryJson["liquidity_target_quality_enabled"]) },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
          for (const k of LIQUIDITY_TARGET_QUALITY_SUMMARY_NUMERIC_KEYS) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_LQ_TGT_E5_15_KEY",
                  `E5.15: when has_liquidity_target_quality_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const val = summaryJson[k];
              if (typeof val !== "number" || !Number.isFinite(val)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_LQ_TGT_E5_15_NUM",
                    `E5.15: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(val) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          const optParamsLq = summaryJson["optimization_parameters"];
          if (optParamsLq && typeof optParamsLq === "object" && !Array.isArray(optParamsLq)) {
            const op = optParamsLq as Record<string, unknown>;
            for (const k of LIQUIDITY_TARGET_QUALITY_OPTIMIZATION_PARAMETER_KEYS) {
              if (!(k in op)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_LQ_TGT_E5_15_OPT",
                    `E5.15: optimization_parameters must include "${k}" when has_liquidity_target_quality_v1_logic is true`,
                    { fileName: sj.fileName },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          if (tr?.text) {
            const headerLine = tr.text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
            const h = headerLine.toLowerCase();
            for (const col of LIQUIDITY_TARGET_QUALITY_TRADE_COLUMNS) {
              if (!h.includes(col)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_TRADES_HEADER_LQ_TGT_E5_15",
                    `E5.15: backtest_trades.csv header must include "${col}" when has_liquidity_target_quality_v1_logic is true (see ${tr.fileName})`,
                    { fileName: sj.fileName, detail: headerLine.slice(0, 240) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
        }
        if (summaryJson["has_buffered_evos_v1_logic"] === true) {
          if (!("buffered_evos_enabled" in summaryJson)) {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_BUFFERED_EVOS_E5_13_6_11_KEY",
                `E5.13.6.11: when has_buffered_evos_v1_logic is true, summary must include "buffered_evos_enabled"`,
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          } else if (typeof summaryJson["buffered_evos_enabled"] !== "boolean") {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_BUFFERED_EVOS_E5_13_6_11_BOOL",
                `E5.13.6.11: "buffered_evos_enabled" must be a boolean`,
                { fileName: sj.fileName, detail: String(summaryJson["buffered_evos_enabled"]) },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
          for (const k of listBufferedEvosSummaryRollupKeys()) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_BUFFERED_EVOS_E5_13_6_11_KEY",
                  `E5.13.6.11: when has_buffered_evos_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            } else {
              const val = summaryJson[k];
              if (typeof val !== "number" || !Number.isFinite(val)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_BUFFERED_EVOS_E5_13_6_11_NUM",
                    `E5.13.6.11: "${k}" must be a finite number`,
                    { fileName: sj.fileName, detail: String(val) },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          }
          for (const k of BUFFERED_EVOS_SUMMARY_AGGREGATE_STRING_KEYS) {
            if (!(k in summaryJson)) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "error",
                  "TESTEA_SUMMARY_BUFFERED_EVOS_E5_13_6_11_KEY",
                  `E5.13.6.11: when has_buffered_evos_v1_logic is true, summary must include "${k}"`,
                  { fileName: sj.fileName },
                ),
              );
              status = bumpStatus(status, "invalid");
            }
          }
          const optParams = summaryJson["optimization_parameters"];
          if (optParams && typeof optParams === "object" && !Array.isArray(optParams)) {
            const op = optParams as Record<string, unknown>;
            for (const k of BUFFERED_EVOS_OPTIMIZATION_PARAMETER_KEYS) {
              if (!(k in op)) {
                diagnostics.push(
                  exportSampleDiagnostic(
                    "error",
                    "TESTEA_SUMMARY_BUFFERED_EVOS_E5_13_6_11_OPT",
                    `E5.13.6.11: optimization_parameters must include "${k}" when has_buffered_evos_v1_logic is true`,
                    { fileName: sj.fileName },
                  ),
                );
                status = bumpStatus(status, "invalid");
              }
            }
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_SUMMARY_BUFFERED_EVOS_E5_13_6_11_OPT",
                "E5.13.6.11: optimization_parameters object required for buffered EVOS parameter keys",
                { fileName: sj.fileName },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
        }
        if (!byKind.has("backtest_events_csv")) {
          diagnostics.push(
            exportSampleDiagnostic(
              "warning",
              "TESTEA_EVENTS_RECOMMENDED",
              "backtest_events.csv missing — E3.6 recommends including events for TestEA evidence bundles",
              { fileName: sj.fileName },
            ),
          );
          status = bumpStatus(status, "valid_with_warnings");
        }
      } else {
        diagnostics.push(
          exportSampleDiagnostic(
            "error",
            "TESTEA_SUMMARY_SCHEMA",
            "schema_version must be MZP_TESTEA_V1 or backtest_ea_v1",
            { fileName: sj.fileName, detail: String(schema) },
          ),
        );
        status = bumpStatus(status, "invalid");
      }

      const tc = summaryJson["trade_count"];
      if (typeof tc !== "number" || !Number.isFinite(tc) || tc < 0) {
        diagnostics.push(
          exportSampleDiagnostic(
            "error",
            "TESTEA_SUMMARY_TRADE_COUNT",
            "trade_count must be a non-negative number",
            { fileName: sj.fileName, detail: String(tc) },
          ),
        );
        status = bumpStatus(status, "invalid");
      } else {
        summaryTradeCount = tc;
        if (tr && tradesImport && tradesImport.ok && typeof tc === "number" && tradesImport.trades.length !== tc) {
          const mismatchDetail = `summary=${tc} csv=${tradesImport.trades.length}`;
          if (testEaOptions.zeroTradeCountMismatchAsWarning && tc === 0 && tradesImport.trades.length > 0) {
            diagnostics.push(
              exportSampleDiagnostic(
                "warning",
                "TESTEA_TRADE_ROWS_WHILE_TRADE_COUNT_ZERO",
                "trade_count is 0 but backtest_trades.csv contains data rows — verify export phase or summary",
                { fileName: sj.fileName, detail: mismatchDetail },
              ),
            );
            status = bumpStatus(status, "valid_with_warnings");
          } else {
            diagnostics.push(
              exportSampleDiagnostic(
                "error",
                "TESTEA_TRADE_COUNT_MISMATCH",
                "trade_count in summary does not match imported trade rows",
                { fileName: sj.fileName, detail: mismatchDetail },
              ),
            );
            status = bumpStatus(status, "invalid");
          }
        }
        const vtc = summaryJson["virtual_trade_count"];
        if (
          summaryJson["has_real_virtual_trade_logic"] === true &&
          typeof tc === "number" &&
          typeof vtc === "number" &&
          Number.isFinite(tc) &&
          Number.isFinite(vtc) &&
          tc !== vtc
        ) {
          diagnostics.push(
            exportSampleDiagnostic(
              "warning",
              "TESTEA_VIRTUAL_TRADE_COUNT_MISMATCH",
              "summary.trade_count differs from summary.virtual_trade_count — after E5.4.1 these should match (one CSV row per counted virtual candidate)",
              { fileName: sj.fileName, detail: `trade_count=${String(tc)} virtual_trade_count=${String(vtc)}` },
            ),
          );
          status = bumpStatus(status, "valid_with_warnings");
        }
        const forbiddenProfitKeys = ["total_profit", "profit_factor", "net_profit", "gross_profit", "win_rate_pct"];
        if (typeof tc === "number" && tc === 0) {
          for (const key of forbiddenProfitKeys) {
            if (key in summaryJson && summaryJson[key] != null) {
              diagnostics.push(
                exportSampleDiagnostic(
                  "warning",
                  "TESTEA_SUMMARY_PROFIT_KEYS_WITH_ZERO_TRADES",
                  `trade_count is 0 but summary contains "${key}" — remove profit-style metrics until trades exist`,
                  { fileName: sj.fileName, detail: String(summaryJson[key]) },
                ),
              );
              status = bumpStatus(status, "valid_with_warnings");
            }
          }
        }
      }
    }
  }

  if (sj && summaryJson) {
    const summaryErrors = diagnostics.filter((d) => d.fileName === sj.fileName && d.level === "error");
    const schema = summaryJson["schema_version"];
    const tradeCountOk =
      typeof summaryJson["trade_count"] === "number" &&
      Number.isFinite(summaryJson["trade_count"] as number) &&
      (summaryJson["trade_count"] as number) >= 0;
    if (schema === "MZP_TESTEA_V1") {
      summaryOk =
        summaryErrors.length === 0 &&
        tradeCountOk &&
        summaryJson["execution_mode"] === "virtual_export_only" &&
        summaryJson["live_trading_enabled"] === false;
    } else if (schema === "backtest_ea_v1") {
      summaryOk =
        summaryErrors.length === 0 &&
        tradeCountOk &&
        summaryJson["tester_only"] === true &&
        summaryJson["official_ea"] === "Mapazapp_TestEA" &&
        summaryJson["backtest_role"] === true &&
        summaryJson["has_real_daily_bias_logic"] === true &&
        summaryJson["has_real_ifvg_logic"] === true &&
        summaryJson["has_real_trading_orders"] === false &&
        summaryJson["has_full_ifvg_pipeline"] === false &&
        (!eventsCsvPresent || eventsParseOk);
    } else {
      summaryOk = false;
    }
  } else {
    summaryOk = false;
  }

  if (diagnostics.some((d) => d.level === "error")) {
    status = bumpStatus(status, "invalid");
  }

  return {
    status,
    tradesImport,
    tradeCount,
    eventsCsvPresent,
    eventsParseAttempted,
    eventsParseOk,
    eventsDataRowCount,
    summaryParsed,
    summaryOk,
    summaryTradeCount,
    summaryJson,
    diagnostics,
  };
}

export function validateExportSampleBundle(
  input: ExportSampleValidationInput,
  testEaOptions?: TestEaValidateOptions,
): ExportSampleValidationResult {
  const resolved = resolveFileKinds(input.files);
  const privacy = scanExportSamplePrivacy(resolved, input.privacyMode);

  const allDiagnostics: ExportSampleValidationDiagnostic[] = [...privacy.findings];

  if (!privacy.passed) {
    allDiagnostics.push(
      exportSampleDiagnostic("error", "PRIVACY_CHECK_FAILED", "Strict privacy check failed — redact sample before sharing or committing"),
    );
  }

  let bridge: BridgeExportValidationResult | null = null;
  let testEa: TestEaExportValidationResult | null = null;

  let bundleKind: ExportSampleBundleKind = input.bundleKind;
  if (input.bundleKind === "unknown") {
    const hasB = resolved.some((f) => isBridgeKind(f.fileKind ?? inferExportSampleFileKind(f.fileName)));
    const hasT = resolved.some((f) => isTestEaKind(f.fileKind ?? inferExportSampleFileKind(f.fileName)));
    if (hasB && hasT) bundleKind = "mixed_export_bundle";
    else if (hasB) bundleKind = "bridge_ea_export_bundle";
    else if (hasT) bundleKind = "testea_export_bundle";
  }

  const runBridge = bundleKind === "bridge_ea_export_bundle" || bundleKind === "mixed_export_bundle";
  const runTest = bundleKind === "testea_export_bundle" || bundleKind === "mixed_export_bundle";

  if (resolved.length === 0) {
    allDiagnostics.push(
      exportSampleDiagnostic("warning", "EXPORT_BUNDLE_EMPTY", "No files in validation input", {}),
    );
  }

  if (runBridge) {
    bridge = validateBridgeEaExportSample({ ...input, files: resolved });
    allDiagnostics.push(...bridge.diagnostics);
  }

  if (runTest) {
    const opts: TestEaValidateOptions =
      testEaOptions ??
      {
        importOptions: {
          strategyId: "MZP_IFVG_ZONE_REACTION_V1",
          parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
          canonicalSymbol: input.expectedCanonicalSymbol ?? "XAUUSD",
          brokerSymbol: input.expectedBrokerSymbol,
          accountId: undefined,
          datasetSplit: "validation",
          sourceType: "mapazapp_testea_csv",
          runId: "TESTEA_SAMPLE_RUN",
        },
      };
    testEa = validateTestEaExportSample({ ...input, files: resolved }, opts);
    allDiagnostics.push(...testEa.diagnostics);
  }

  const hasErr = allDiagnostics.some((d) => d.level === "error");
  const hasWarn = allDiagnostics.some((d) => d.level === "warning");

  let status: ExportSampleValidationStatus = "valid";
  if (!privacy.passed) {
    status = "invalid";
  } else if (hasErr) {
    status = "invalid";
  } else if (
    bridge?.status === "insufficient_files" ||
    (bundleKind === "unknown" && resolved.length === 0)
  ) {
    status = "insufficient_files";
  } else if (
    hasWarn ||
    bridge?.status === "valid_with_warnings" ||
    testEa?.status === "valid_with_warnings"
  ) {
    status = "valid_with_warnings";
  }

  return {
    status,
    bundleKind,
    privacy,
    diagnostics: allDiagnostics,
    bridge,
    testEa,
    executionEnabled: false,
    registryMutationAllowed: false,
    reviewOnly: true,
  };
}
