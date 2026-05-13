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
