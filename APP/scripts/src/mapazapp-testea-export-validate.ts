/**
 * E4.1 — Read-only validation of a Mapazapp_TestEA Strategy Tester export folder (three files).
 * No MT5, no Strategy Tester, no trading.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTestEaExportBundleTexts, type TestEaBundleValidationResult, TESTEA_BUNDLE_STRICT_IGNORE_WARNING_CODES } from "@workspace/mapazapp-core";

const USAGE = `mapazapp-testea-export-validate (development-only, read-only)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \\
    --bundle <path-to-run-folder> [options]

Required:
  --bundle <path>   Directory containing backtest_summary.json, backtest_events.csv, backtest_trades.csv

Options:
  --json                     Structured JSON on stdout (paths redacted to basename)
  --strict                   Treat warnings as failures (exit 1)
  --max-events-preview <n>   Include up to n data lines of events CSV in JSON only (capped at 40)
  --events-large-warn-bytes <n>  Override default 1500000 byte threshold for large events warning
  --help, -h                 Show this message

Exit codes:
  0  Validation succeeded (status ok or warning when not --strict)
  1  Validation failed, unreadable bundle, or --strict with warnings
  2  Invalid arguments

Scope:
  Reads only the three expected filenames inside --bundle. Does not execute MT5, Strategy Tester,
  API, dashboard, or trading. Does not modify files.
`;

type ParsedCli =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      bundleDir: string;
      json: boolean;
      strict: boolean;
      maxEventsPreview: number;
      eventsLargeWarnBytes: number;
    };

function parseArgv(argv: string[]): ParsedCli {
  let bundleDir: string | undefined;
  let json = false;
  let strict = false;
  let maxEventsPreview = 0;
  let eventsLargeWarnBytes = 1_500_000;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") return { kind: "help" };
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--strict") {
      strict = true;
      continue;
    }
    if (!a.startsWith("--")) {
      return { kind: "error", message: `unexpected argument: ${a}` };
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      return { kind: "error", message: `missing value for --${key}` };
    }
    i++;
    switch (key) {
      case "bundle":
        bundleDir = next;
        break;
      case "max-events-preview": {
        const n = Number(next);
        if (!Number.isFinite(n) || n < 0) {
          return { kind: "error", message: `--max-events-preview must be a non-negative number` };
        }
        maxEventsPreview = Math.floor(n);
        break;
      }
      case "events-large-warn-bytes": {
        const n = Number(next);
        if (!Number.isFinite(n) || n < 0) {
          return { kind: "error", message: `--events-large-warn-bytes must be a non-negative number` };
        }
        eventsLargeWarnBytes = Math.floor(n);
        break;
      }
      default:
        return { kind: "error", message: `unknown option: --${key}` };
    }
  }

  if (!bundleDir) {
    return { kind: "error", message: "missing required --bundle <path>" };
  }

  return { kind: "run", bundleDir, json, strict, maxEventsPreview, eventsLargeWarnBytes };
}

const SUMMARY_JSON_KEYS = [
  "schema_version",
  "ea_build",
  "run_id",
  "strategy_id",
  "parameter_set_id",
  "symbol",
  "execution_timeframe",
  "daily_bias_timeframe",
  "backtest_mode",
  "tester_only",
  "official_ea",
  "backtest_role",
  "has_real_ifvg_logic",
  "has_full_ifvg_pipeline",
  "has_real_daily_bias_logic",
  "has_real_trading_orders",
  "trade_count",
  "total_bias_evaluated",
  "total_setup_candidates",
  "allowed_setups",
  "rejected_by_daily_bias",
] as const;

function pickSummarySlice(summary: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!summary) return null;
  const o: Record<string, unknown> = {};
  for (const k of SUMMARY_JSON_KEYS) {
    if (k in summary) o[k] = summary[k];
  }
  return o;
}

function eventsPreviewLines(eventsCsv: string, maxDataLines: number): string[] | undefined {
  if (maxDataLines <= 0) return undefined;
  const cap = Math.min(maxDataLines, 40);
  const lines = eventsCsv.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.slice(0, 1 + cap);
}

export interface TestEaExportValidateIo {
  readFileUtf8(absPath: string): string;
  pathExists(absPath: string): boolean;
  isDirectory(absPath: string): boolean;
  fileByteLength(absPath: string): number;
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export function applyStrict(result: TestEaBundleValidationResult): TestEaBundleValidationResult {
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

/** Returns process exit code (does not call process.exit). */
export function runTestEaExportValidateCli(argv: string[], io: TestEaExportValidateIo): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    return 2;
  }

  const absBundle = resolve(parsed.bundleDir);
  if (!io.pathExists(absBundle) || !io.isDirectory(absBundle)) {
    io.stderrWrite("bundle path not found or not a directory\n");
    return 1;
  }

  const names = ["backtest_summary.json", "backtest_events.csv", "backtest_trades.csv"] as const;
  const paths = names.map((n) => join(absBundle, n));
  for (let i = 0; i < names.length; i++) {
    if (!io.pathExists(paths[i]!)) {
      io.stderrWrite(`missing required file: ${names[i]}\n`);
      return 1;
    }
  }

  let summaryJson: string;
  let eventsCsv: string;
  let tradesCsv: string;
  try {
    summaryJson = io.readFileUtf8(paths[0]!);
    eventsCsv = io.readFileUtf8(paths[1]!);
    tradesCsv = io.readFileUtf8(paths[2]!);
  } catch {
    io.stderrWrite("failed to read one or more bundle files\n");
    return 1;
  }

  const eventsBytes = io.fileByteLength(paths[1]!);

  let result = validateTestEaExportBundleTexts(
    {
      summaryJson,
      eventsCsv,
      tradesCsv,
      eventsCsvByteLength: eventsBytes,
      bundleLabel: absBundle,
    },
    { eventsLargeWarningBytes: parsed.eventsLargeWarnBytes, requireTradeCountZero: false },
  );

  if (parsed.strict) {
    result = applyStrict(result);
  }

  const bundleBasename = basename(absBundle.replace(/[/\\]+$/, ""));

  if (parsed.json) {
    const payload = {
      ok: result.ok,
      status: result.status,
      errors: result.errors.map((e) => ({ code: e.code, message: e.message })),
      warnings: result.warnings.map((w) => ({ code: w.code, message: w.message })),
      summary: pickSummarySlice(result.summary),
      files: result.files,
      eventCounts: result.eventCounts,
      bundle: bundleBasename,
      testEaStatus: result.testEa.status,
      ...(parsed.maxEventsPreview > 0
        ? { eventsPreviewLines: eventsPreviewLines(eventsCsv, parsed.maxEventsPreview) }
        : {}),
      executionEnabled: false as const,
      readOnly: true as const,
    };
    io.stdoutWrite(`${JSON.stringify(payload)}\n`);
  } else {
    io.stdoutWrite("Mapazapp TestEA export validation\n");
    io.stdoutWrite(`Bundle: ${bundleBasename}\n`);
    io.stdoutWrite(`Status: ${result.status.toUpperCase()}\n\n`);
    io.stdoutWrite("Summary:\n");
    const s = result.summary;
    if (s) {
      const pick = (k: string) => String(s[k] ?? "");
      io.stdoutWrite(`  run_id: ${pick("run_id")}\n`);
      io.stdoutWrite(`  symbol: ${pick("symbol")}\n`);
      io.stdoutWrite(`  execution_timeframe: ${pick("execution_timeframe")}\n`);
      io.stdoutWrite(`  daily_bias_timeframe: ${pick("daily_bias_timeframe")}\n`);
      io.stdoutWrite(`  total_bias_evaluated: ${pick("total_bias_evaluated")}\n`);
      io.stdoutWrite(`  total_setup_candidates: ${pick("total_setup_candidates")}\n`);
      io.stdoutWrite(`  allowed_setups: ${pick("allowed_setups")}\n`);
      io.stdoutWrite(`  rejected_by_daily_bias: ${pick("rejected_by_daily_bias")}\n`);
      io.stdoutWrite(`  trade_count: ${pick("trade_count")}\n`);
    } else {
      io.stdoutWrite("  (summary not available)\n");
    }
    io.stdoutWrite("\nFiles:\n");
    io.stdoutWrite(`  summary: ${result.files.summary}\n`);
    io.stdoutWrite(`  events: ${result.files.events}\n`);
    io.stdoutWrite(`  trades: ${result.files.trades}\n`);
    if (result.warnings.length > 0) {
      io.stdoutWrite(
        `\nWarnings (${result.warnings.length}):\n${result.warnings.map((w) => `  - ${w.code}: ${w.message}`).join("\n")}\n`,
      );
    }
    if (result.errors.length > 0) {
      io.stdoutWrite(
        `\nErrors (${result.errors.length}):\n${result.errors.map((e) => `  - ${e.code}: ${e.message}`).join("\n")}\n`,
      );
    }
  }

  return result.ok ? 0 : 1;
}

function defaultIo(): TestEaExportValidateIo {
  return {
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    pathExists: (p) => existsSync(p),
    isDirectory: (p) => statSync(p).isDirectory(),
    fileByteLength: (p) => statSync(p).size,
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
  };
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  process.exit(runTestEaExportValidateCli(process.argv.slice(2), defaultIo()));
}
