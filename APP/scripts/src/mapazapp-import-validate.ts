/**
 * C3.1 — Development-only local import validator CLI (read-only summary).
 * Delegates CSV parsing to `importManualCandleDataset`; no persistence, no execution.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ManualCandleDatasetFormat } from "@workspace/mapazapp-core";
import { importManualCandleDataset } from "@workspace/mapazapp-core";

export interface ImportValidateIo {
  readFileUtf8(absPath: string): string;
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export interface SafeCliSummary {
  ok: boolean;
  detectedFormat: string | null;
  candleCount: number;
  symbol: string;
  timeframe: string;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  warnings: { code: string; message: string }[];
  errors: { code: string; message: string }[];
  executionEnabled: false;
  readOnly: true;
}

type ParsedCli =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      filePath: string;
      symbol: string;
      timeframe: string;
      format: "auto" | "mt5" | "bridge" | "ohlc";
      json: boolean;
    };

const USAGE = `mapazapp-import-validate (development-only, read-only)

Usage:
  pnpm --filter @workspace/scripts mapazapp:import-validate -- \\
    --file <path> --symbol <symbol> --timeframe <timeframe> [options]

Required:
  --file <path>       Local CSV file path
  --symbol <symbol>   e.g. XAUUSD
  --timeframe <tf>    e.g. M15

Optional:
  --format <auto|mt5|bridge|ohlc>   Default: auto
  --json                           Structured JSON summary on stdout
  --help                           Show this message

This tool validates CSV shape via the core importer only.
It does not save data, connect to MT5, send orders to a broker, or replace a launcher.
`;

function parseArgv(argv: string[]): ParsedCli {
  let filePath: string | undefined;
  let symbol: string | undefined;
  let timeframe: string | undefined;
  let format: "auto" | "mt5" | "bridge" | "ohlc" = "auto";
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") {
      return { kind: "help" };
    }
    if (a === "--json") {
      json = true;
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
      case "file":
        filePath = next;
        break;
      case "symbol":
        symbol = next;
        break;
      case "timeframe":
        timeframe = next;
        break;
      case "format": {
        const f = next.toLowerCase();
        if (f !== "auto" && f !== "mt5" && f !== "bridge" && f !== "ohlc") {
          return { kind: "error", message: `invalid --format (use auto|mt5|bridge|ohlc): ${next}` };
        }
        format = f;
        break;
      }
      default:
        return { kind: "error", message: `unknown option: --${key}` };
    }
  }

  if (!filePath) {
    return { kind: "error", message: "missing required --file <path>" };
  }
  if (!symbol) {
    return { kind: "error", message: "missing required --symbol <symbol>" };
  }
  if (!timeframe) {
    return { kind: "error", message: "missing required --timeframe <timeframe>" };
  }

  return { kind: "run", filePath, symbol, timeframe, format, json };
}

function mapFormatHint(format: "auto" | "mt5" | "bridge" | "ohlc"): ManualCandleDatasetFormat | undefined {
  switch (format) {
    case "auto":
      return "auto_detect";
    case "mt5":
      return "mt5_rates_like";
    case "bridge":
      return "mapazapp_bridge_candles_v1";
    case "ohlc":
      return "generic_ohlc";
    default:
      return "auto_detect";
  }
}

function isoFromTimeMs(t: number): string | null {
  if (!Number.isFinite(t)) return null;
  try {
    return new Date(t).toISOString();
  } catch {
    return null;
  }
}

export function buildSafeSummary(parsed: ParsedCli & { kind: "run" }, csvText: string): SafeCliSummary {
  const formatHint = mapFormatHint(parsed.format);
  const imp = importManualCandleDataset({
    csvText,
    canonicalSymbol: parsed.symbol,
    timeframe: parsed.timeframe,
    datasetSplit: "unknown",
    sourceName: "mapazapp-import-validate-cli",
    formatHint,
  });

  const ds = imp.dataset;
  const candles = ds?.candles ?? [];
  const candleCount = ds ? candles.length : 0;

  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;
  if (candles.length > 0) {
    firstTimestamp = isoFromTimeMs(candles[0]!.time);
    lastTimestamp = isoFromTimeMs(candles[candles.length - 1]!.time);
  }

  const detectedFormat =
    ds?.detectedFormat ??
    (imp.validationSummary.resolvedFormat !== "unknown" ? imp.validationSummary.resolvedFormat : null);

  return {
    ok: imp.ok,
    detectedFormat,
    candleCount,
    symbol: parsed.symbol,
    timeframe: parsed.timeframe,
    firstTimestamp,
    lastTimestamp,
    warnings: imp.warnings.map((w) => ({ code: w.code, message: w.message })),
    errors: imp.errors.map((e) => ({ code: e.code, message: e.message })),
    executionEnabled: false,
    readOnly: true,
  };
}

function assertJsonSafeFinite(summary: SafeCliSummary): void {
  if (!Number.isFinite(summary.candleCount)) {
    throw new Error("internal: candleCount not finite");
  }
}

function printHuman(summary: SafeCliSummary, io: ImportValidateIo): void {
  io.stdoutWrite(`ok: ${summary.ok}\n`);
  io.stdoutWrite(`detectedFormat: ${summary.detectedFormat ?? "null"}\n`);
  io.stdoutWrite(`candleCount: ${summary.candleCount}\n`);
  io.stdoutWrite(`symbol: ${summary.symbol}\n`);
  io.stdoutWrite(`timeframe: ${summary.timeframe}\n`);
  io.stdoutWrite(`firstTimestamp: ${summary.firstTimestamp ?? "null"}\n`);
  io.stdoutWrite(`lastTimestamp: ${summary.lastTimestamp ?? "null"}\n`);
  io.stdoutWrite(`readOnly: ${summary.readOnly}\n`);
  io.stdoutWrite(`executionEnabled: ${summary.executionEnabled}\n`);
  if (summary.warnings.length > 0) {
    io.stdoutWrite(
      `warnings (${summary.warnings.length}):\n${summary.warnings.map((w) => `  - ${w.code}: ${w.message}`).join("\n")}\n`,
    );
  }
  if (summary.errors.length > 0) {
    io.stdoutWrite(
      `errors (${summary.errors.length}):\n${summary.errors.map((e) => `  - ${e.code}: ${e.message}`).join("\n")}\n`,
    );
  }
}

/** Entry point for tests and tooling; returns process exit code (does not call process.exit). */
export function runImportValidateCli(argv: string[], io: ImportValidateIo): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    return 2;
  }

  const absFile = resolve(parsed.filePath);
  let csvText: string;
  try {
    csvText = io.readFileUtf8(absFile);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "ENOENT") {
      io.stderrWrite("file not found\n");
      return 1;
    }
    io.stderrWrite("failed to read file\n");
    return 1;
  }

  if (csvText.trim() === "") {
    io.stderrWrite("empty csv\n");
  }

  const summary = buildSafeSummary(parsed, csvText);
  assertJsonSafeFinite(summary);

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(summary)}\n`);
  } else {
    printHuman(summary, io);
  }

  return summary.ok ? 0 : 1;
}

function defaultIo(): ImportValidateIo {
  return {
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    stdoutWrite: (s) => {
      process.stdout.write(s);
    },
    stderrWrite: (s) => {
      process.stderr.write(s);
    },
  };
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  const code = runImportValidateCli(process.argv.slice(2), defaultIo());
  process.exit(code);
}
