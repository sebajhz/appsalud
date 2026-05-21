/**
 * E5.20.2 — Latest valid report generator CLI (read-only bundle + report workflow; no MT5, no trading).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTestEaBundleIndex,
  generateLatestValidReport,
  parseBundleIndexJson,
  testEaBundleIndexToJson,
  updateIndexReportPaths,
  type LatestValidReportFsIo,
  type LatestValidReportResult,
  type SetupReadinessReportLanguage,
} from "@workspace/mapazapp-core";

const USAGE = `mapazapp-testea-latest-valid-report (read-only latest-valid bundle + Setup Readiness report)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-latest-valid-report -- \\
    --root "<TestEaRoot>" \\
    --output-dir "<ReportOutputDir>" \\
    [--json]

Options:
  --root <path>              TestEA root (required unless --index only)
  --index <path>             Existing bundles.index.json (optional)
  --output-dir <path>        Required output folder for report artifacts
  --profile <profile_id>     Filter latest_valid_by_key
  --campaign <campaign_id>   Filter latest_valid_by_key
  --parameter-set <id>       Filter latest_valid_by_key
  --symbol <symbol>          Filter latest_valid_by_key
  --timeframe <timeframe>    Filter latest_valid_by_key
  --bundle-id <bundle_id>    Explicit bundle selection from index
  --max-examples <n>         Example trade cards (default: 10)
  --language es|en            Report language (default: es)
  --html                    Write HTML report (default: true)
  --no-html                 Skip HTML report
  --markdown                Write Markdown report (default: true)
  --no-markdown             Skip Markdown report
  --report-json             Write JSON report (default: true)
  --no-report-json          Skip JSON report
  --refresh-index           Re-scan --root before selection (default when --root)
  --no-refresh-index        Use --index file only (requires --index)
  --update-index            Write report paths back into bundles.index.json
  --strict                  Treat validation warnings as failures
  --json                    Print compact latest_valid_report_result.json to stdout
  --help, -h                Show this message

Exit codes:
  0  Report generated successfully
  1  Selection, validation, or report generation failed
  2  Invalid arguments

Scope:
  Reads bundle index + CSVs; writes reports to --output-dir only.
  Does not copy CSVs, modify MT5 bundle folders, run MT5, or trade.
`;

export type TestEaLatestValidReportCliIo = LatestValidReportFsIo & {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
};

type ParsedCli =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      root?: string;
      indexPath?: string;
      outputDir: string;
      json: boolean;
      profile?: string;
      campaign?: string;
      parameterSet?: string;
      symbol?: string;
      timeframe?: string;
      bundleId?: string;
      maxExamples: number;
      language: SetupReadinessReportLanguage;
      writeHtml: boolean;
      writeMarkdown: boolean;
      writeReportJson: boolean;
      refreshIndex: boolean;
      updateIndex: boolean;
      strict: boolean;
    };

function parseBoolDefaultTrue(argv: string[], flag: string, noFlag: string): boolean {
  if (argv.includes(noFlag)) return false;
  if (argv.includes(flag)) return true;
  return true;
}

function parseArgv(argv: string[]): ParsedCli {
  if (argv.includes("--help") || argv.includes("-h")) return { kind: "help" };

  let root: string | undefined;
  let indexPath: string | undefined;
  let outputDir: string | undefined;
  let json = false;
  let profile: string | undefined;
  let campaign: string | undefined;
  let parameterSet: string | undefined;
  let symbol: string | undefined;
  let timeframe: string | undefined;
  let bundleId: string | undefined;
  let maxExamples = 10;
  let language: SetupReadinessReportLanguage = "es";
  let strict = false;
  let refreshIndex = !argv.includes("--no-refresh-index");
  let updateIndex = argv.includes("--update-index");
  const writeHtml = parseBoolDefaultTrue(argv, "--html", "--no-html");
  const writeMarkdown = parseBoolDefaultTrue(argv, "--markdown", "--no-markdown");
  const writeReportJson = parseBoolDefaultTrue(argv, "--report-json", "--no-report-json");

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (
      a === "--json" ||
      a === "--strict" ||
      a === "--refresh-index" ||
      a === "--no-refresh-index" ||
      a === "--update-index" ||
      a === "--html" ||
      a === "--no-html" ||
      a === "--markdown" ||
      a === "--no-markdown" ||
      a === "--report-json" ||
      a === "--no-report-json" ||
      a === "--help" ||
      a === "-h"
    ) {
      if (a === "--json") json = true;
      if (a === "--strict") strict = true;
      if (a === "--refresh-index") refreshIndex = true;
      if (a === "--no-refresh-index") refreshIndex = false;
      if (a === "--update-index") updateIndex = true;
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
      case "root":
        root = resolve(next);
        break;
      case "index":
        indexPath = resolve(next);
        break;
      case "output-dir":
        outputDir = resolve(next);
        break;
      case "profile":
        profile = next;
        break;
      case "campaign":
        campaign = next;
        break;
      case "parameter-set":
        parameterSet = next;
        break;
      case "symbol":
        symbol = next;
        break;
      case "timeframe":
        timeframe = next;
        break;
      case "bundle-id":
        bundleId = next;
        break;
      case "max-examples": {
        const n = Number(next);
        if (!Number.isFinite(n) || n < 0) {
          return { kind: "error", message: "--max-examples must be a non-negative number" };
        }
        maxExamples = Math.floor(n);
        break;
      }
      case "language":
        if (next !== "es" && next !== "en") {
          return { kind: "error", message: "--language must be es or en" };
        }
        language = next;
        break;
      default:
        return { kind: "error", message: `unknown option: --${key}` };
    }
  }

  if (!root && !indexPath) {
    return { kind: "error", message: "missing required --root <path> or --index <path>" };
  }
  if (!outputDir) {
    return { kind: "error", message: "missing required --output-dir <path>" };
  }
  if (!root && !refreshIndex && !indexPath) {
    return { kind: "error", message: "--no-refresh-index requires --index <path>" };
  }

  return {
    kind: "run",
    root,
    indexPath,
    outputDir,
    json,
    profile,
    campaign,
    parameterSet,
    symbol,
    timeframe,
    bundleId,
    maxExamples,
    language,
    writeHtml,
    writeMarkdown,
    writeReportJson,
    refreshIndex,
    updateIndex,
    strict,
  };
}

export function compactLatestValidReportSummary(result: LatestValidReportResult): Record<string, unknown> {
  return {
    ok: result.ok,
    selected_bundle_id: result.selected_bundle_id,
    selected_bundle_name: result.selected_bundle_name,
    selected_key: result.selected_key,
    valid_status_before_report: result.valid_status_before_report,
    report_markdown_path: result.report_markdown_path,
    report_json_path: result.report_json_path,
    report_html_path: result.report_html_path,
    trade_count: result.trade_count,
    average_score: result.average_score,
    decision_counts: result.decision_counts,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/** Returns process exit code (does not call process.exit). */
export function runTestEaLatestValidReportCli(
  argv: string[],
  io: TestEaLatestValidReportCliIo,
): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    return 2;
  }

  if (parsed.root && (!io.pathExists(parsed.root) || !io.isDirectory(parsed.root))) {
    io.stderrWrite("root path not found or not a directory\n");
    return 1;
  }
  if (parsed.indexPath && !parsed.root && !io.pathExists(parsed.indexPath)) {
    io.stderrWrite("index file not found\n");
    return 1;
  }

  let index;
  try {
    if (parsed.root && parsed.refreshIndex) {
      index = buildTestEaBundleIndex(
        { root: parsed.root, profileFilter: parsed.profile, strict: parsed.strict },
        io,
      );
    } else if (parsed.indexPath) {
      index = parseBundleIndexJson(io.readFileUtf8(parsed.indexPath));
    } else if (parsed.root) {
      index = buildTestEaBundleIndex(
        { root: parsed.root, profileFilter: parsed.profile, strict: parsed.strict },
        io,
      );
    } else {
      io.stderrWrite("no index source available\n");
      return 1;
    }
  } catch (e) {
    io.stderrWrite(`${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }

  const result = generateLatestValidReport(
    {
      index,
      outputDir: parsed.outputDir,
      selection: {
        profileId: parsed.profile,
        campaignId: parsed.campaign,
        parameterSetId: parsed.parameterSet,
        symbol: parsed.symbol,
        timeframe: parsed.timeframe,
        bundleId: parsed.bundleId,
      },
      language: parsed.language,
      maxExamples: parsed.maxExamples,
      strict: parsed.strict,
      writeHtml: parsed.writeHtml,
      writeMarkdown: parsed.writeMarkdown,
      writeJson: parsed.writeReportJson,
    },
    io,
  );

  if (parsed.updateIndex && parsed.indexPath && result.ok && result.selected_bundle_id) {
    updateIndexReportPaths(index, result.selected_bundle_id, {
      report_json_path: result.report_json_path,
      report_markdown_path: result.report_markdown_path,
      report_html_path: result.report_html_path,
    });
    io.writeFileUtf8(parsed.indexPath, testEaBundleIndexToJson(index));
  }

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(compactLatestValidReportSummary(result))}\n`);
  } else if (result.ok) {
    io.stdoutWrite(
      `Latest valid report ok: ${result.selected_bundle_name} → ${parsed.outputDir}\n`,
    );
  } else {
    for (const err of result.errors) io.stderrWrite(`${err}\n`);
  }

  return result.ok ? 0 : 1;
}

function defaultIo(): TestEaLatestValidReportCliIo {
  return {
    pathExists: (p) => existsSync(p),
    isDirectory: (p) => statSync(p).isDirectory(),
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    fileMtimeUtc: (p) => {
      try {
        return new Date(statSync(p).mtimeMs).toISOString();
      } catch {
        return null;
      }
    },
    listDirectory: (dir) => readdirSync(dir),
    readBundleTexts: (bundlePath) => {
      const summaryPath = join(bundlePath, "backtest_summary.json");
      const eventsPath = join(bundlePath, "backtest_events.csv");
      const tradesPath = join(bundlePath, "backtest_trades.csv");
      if (!existsSync(summaryPath) || !existsSync(eventsPath) || !existsSync(tradesPath)) {
        return null;
      }
      return {
        summaryJson: readFileSync(summaryPath, "utf8"),
        eventsCsv: readFileSync(eventsPath, "utf8"),
        tradesCsv: readFileSync(tradesPath, "utf8"),
      };
    },
    ensureDir: (dir) => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    },
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
  };
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  process.exit(runTestEaLatestValidReportCli(process.argv.slice(2), defaultIo()));
}
