/**
 * E5.9 — CLI: TestEA Entry Quality Score calibration / distribution (read-only; no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaScoreCalibrationFromTexts,
  summarizeScoreCalibration,
  type TestEaScoreCalibrationBundleAnalysis,
  type TestEaScoreCalibrationCampaignAnalysis,
  type TestEaScoreCalibrationSortKey,
} from "@workspace/mapazapp-core";
import { findTestEaBundleRootDirs } from "./mapazapp-testea-ambiguity-sensitivity";

export type ScoreCalibrationCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-score-calibration (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-score-calibration -- [options]

Options:
  --bundle <path>           Bundle folder (repeatable). Requires backtest_summary.json + backtest_trades.csv
  --search-root <path>      Recursively find bundle folders
  --campaign-folder <token> Only include paths whose normalized path contains Mapazapp\\\\TestEA\\\\<token>\\\\
  --json                    Full JSON on stdout
  --csv-output <path>       Write summary CSV (creates/overwrites file)
  --sort-by fvg|score|expectancy|ambiguous_rate
  --max-results <n>
  --strict                  Exit 1 if any bundle fails to parse or is skipped (default: skip score-missing bundles with warning)
  --help, -h

Exit codes:
  0  At least one bundle analyzed successfully
  1  Failure (--strict, no bundles, or no successful analysis)
  2  Invalid arguments
`;

function parseSortBy(raw: string | undefined): TestEaScoreCalibrationSortKey {
  const s = (raw ?? "fvg").trim().toLowerCase();
  if (s === "fvg") return "fvg";
  if (s === "score") return "score";
  if (s === "expectancy") return "expectancy";
  if (s === "ambiguous_rate") return "ambiguous_rate";
  throw new Error(`invalid --sort-by: ${raw}`);
}

export function analyzeTestEaBundleScoreCalibration(
  bundlePath: string,
  io: Pick<ScoreCalibrationCliIo, "readFileUtf8" | "existsSync"> = defaultIo(),
): TestEaScoreCalibrationBundleAnalysis {
  const abs = bundlePath.replace(/[/\\]+$/, "");
  const summaryPath = join(abs, "backtest_summary.json");
  const tradesPath = join(abs, "backtest_trades.csv");
  if (!io.existsSync(summaryPath) || !io.existsSync(tradesPath)) {
    return {
      ok: false,
      bundleName: basename(abs),
      errors: ["missing backtest_summary.json or backtest_trades.csv"],
      warnings: [],
      diagnostic_flags: [],
      import_errors: [],
      import_warnings: [],
      general: null,
      score_stats: null,
      grades: null,
      outcome_by_score: null,
      relative_bands: null,
      missing_component_frequency: {},
      component_stats: {},
      liquidity_quality_component_stats: null,
      liquidity_chain_component_stats: null,
    };
  }
  return analyzeTestEaScoreCalibrationFromTexts({
    bundleName: basename(abs),
    summaryJsonText: io.readFileUtf8(summaryPath),
    tradesCsvText: io.readFileUtf8(tradesPath),
  });
}

function defaultIo(): ScoreCalibrationCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

function escapeCsvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function summaryRowsToCsv(rows: ReturnType<typeof summarizeScoreCalibration>): string {
  const headers = [
    "bundleName",
    "fvgMin",
    "trade_count",
    "score_average",
    "expectancy_r",
    "ambiguous_rate",
    "run_id",
    "campaign_id",
    "parameter_set_id",
    "effective_run_id",
  ] as const;
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map((h) => escapeCsvCell(r[h as keyof typeof r] as string | number | null | undefined))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

type ParsedCli =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      bundles: string[];
      json: boolean;
      strict: boolean;
      sortBy: TestEaScoreCalibrationSortKey;
      maxResults?: number;
      csvOutput?: string;
    };

function parseArgv(argv: string[]): ParsedCli {
  const bundles: string[] = [];
  let searchRoot: string | undefined;
  let campaignFolder: string | undefined;
  let json = false;
  let strict = false;
  let sortBy: TestEaScoreCalibrationSortKey = "fvg";
  let maxResults: number | undefined;
  let csvOutput: string | undefined;

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
    if (!a.startsWith("--")) return { kind: "error", message: `unexpected argument: ${a}` };
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      return { kind: "error", message: `missing value for --${key}` };
    }
    i++;
    switch (key) {
      case "bundle":
        bundles.push(next);
        break;
      case "search-root":
        searchRoot = next;
        break;
      case "campaign-folder":
        campaignFolder = next;
        break;
      case "sort-by":
        try {
          sortBy = parseSortBy(next);
        } catch (e) {
          return { kind: "error", message: e instanceof Error ? e.message : String(e) };
        }
        break;
      case "max-results": {
        const n = Number(next);
        if (!Number.isFinite(n) || n < 0) return { kind: "error", message: "invalid --max-results" };
        maxResults = Math.floor(n);
        break;
      }
      case "csv-output":
        csvOutput = next;
        break;
      default:
        return { kind: "error", message: `unknown option --${key}` };
    }
  }

  const resolved: string[] = [...bundles];
  if (searchRoot) {
    const io = defaultIo();
    const discovered = findTestEaBundleRootDirs(searchRoot, io, { campaignFolderToken: campaignFolder });
    resolved.push(...discovered);
  }

  const uniq = [...new Set(resolved.map((p) => normalize(resolve(p))))];
  return {
    kind: "run",
    bundles: uniq,
    json,
    strict,
    sortBy,
    maxResults,
    csvOutput,
  };
}

export function runMapazappTesteaScoreCalibrationCli(argv: string[], io: ScoreCalibrationCliIo): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\nTry --help\n`);
    return 2;
  }

  if (parsed.bundles.length === 0) {
    io.stderrWrite("error: provide --bundle and/or --search-root\n");
    return 2;
  }

  const analyses: TestEaScoreCalibrationBundleAnalysis[] = [];
  const skipped: { path: string; reason: string }[] = [];

  for (const bp of parsed.bundles) {
    const r = analyzeTestEaBundleScoreCalibration(bp, io);
    if (!r.ok) {
      const reason = r.errors.join("; ") || r.warnings.join("; ") || "analysis not ok";
      skipped.push({ path: bp, reason });
      if (parsed.strict) {
        io.stderrWrite(`strict: bundle failed: ${bp}\n${reason}\n`);
        return 1;
      }
      io.stderrWrite(`skip: ${basename(bp)} — ${reason}\n`);
      continue;
    }
    analyses.push(r);
  }

  if (analyses.length === 0) {
    io.stderrWrite("error: no bundle produced a successful score calibration analysis\n");
    return 1;
  }

  const campaign: TestEaScoreCalibrationCampaignAnalysis = { bundles: analyses };

  const summaryRows = summarizeScoreCalibration(campaign, {
    sortBy: parsed.sortBy,
    maxResults: parsed.maxResults,
  });

  if (parsed.csvOutput) {
    io.writeFileUtf8(parsed.csvOutput, summaryRowsToCsv(summaryRows));
  }

  if (parsed.json) {
    io.stdoutWrite(
      JSON.stringify(
        {
          ok: true,
          executionEnabled: false as const,
          readOnly: true as const,
          bundlesAnalyzed: analyses.length,
          skipped,
          summaryRows,
          bundles: campaign.bundles,
        },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  io.stdoutWrite("Mapazapp TestEA score calibration (E5.9)\n");
  io.stdoutWrite(`Bundles analyzed: ${analyses.length}  skipped: ${skipped.length}\n\n`);
  for (const a of analyses) {
    const g = a.general;
    const s = a.score_stats;
    io.stdoutWrite(
      [
        a.bundleName,
        `FVG=${g?.fvgMin ?? "?"}`,
        `n=${g?.trade_count ?? "?"}`,
        `score_avg=${s?.score_average?.toFixed(3) ?? "?"}`,
        `E[R]=${a.outcome_by_score?.all?.expectancy_r.toFixed(4) ?? "?"}`,
        `amb%=${((a.outcome_by_score?.all?.ambiguous_rate ?? 0) * 100).toFixed(1)}`,
        `flags=${a.diagnostic_flags.join("|") || "-"}`,
      ].join("  ") + "\n",
    );
  }
  return 0;
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  process.exit(runMapazappTesteaScoreCalibrationCli(process.argv.slice(2), defaultIo()));
}
