/**
 * E5.6.1 — Post-process TestEA export bundles for ambiguity accounting (no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaBundleAmbiguitySensitivityFromTexts,
  analyzeTestEaCampaignAmbiguitySensitivityFromTexts,
  summarizeAmbiguitySensitivity,
  type AmbiguityAccountingMode,
  type AmbiguitySensitivitySortKey,
  type TestEaAmbiguityBundleTextInput,
  type TestEaAmbiguitySensitivityOptions,
  type TestEaAmbiguitySensitivityRow,
} from "@workspace/mapazapp-core";

export type AmbiguitySensitivityCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-ambiguity-sensitivity (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-ambiguity-sensitivity -- [options]

Options:
  --bundle <path>           Bundle folder (repeatable). Requires backtest_summary.json + backtest_trades.csv
  --search-root <path>      Recursively find bundle folders (directory containing backtest_summary.json + trades)
  --campaign-folder <token> Only include paths whose normalized path contains Mapazapp\\\\TestEA\\\\<token>\\\\
  --mode all|neutral_zero|conservative_loss|skip_ambiguous
  --sort-by fvg|expectancy|total_r|max_drawdown|ambiguous_rate
  --max-results <n>
  --json                    Full JSON on stdout
  --csv-output <path>       Write CSV (creates/overwrites file)
  --strict                  Exit 1 if any bundle fails to parse (default: skip broken bundles with warning)
  --help, -h

Exit codes:
  0  At least one bundle analyzed
  1  Failure (--strict parse error, or no bundles)
  2  Invalid arguments
`;

function parseSortBy(raw: string | undefined): AmbiguitySensitivitySortKey {
  const s = (raw ?? "fvg").trim().toLowerCase();
  if (s === "fvg") return "fvg";
  if (s === "expectancy") return "expectancy";
  if (s === "total_r") return "total_r";
  if (s === "max_drawdown" || s === "maxdd") return "max_drawdown";
  if (s === "ambiguous_rate") return "ambiguous_rate";
  throw new Error(`invalid --sort-by: ${raw}`);
}

export function findTestEaBundleRootDirs(
  searchRoot: string,
  io: Pick<AmbiguitySensitivityCliIo, "existsSync" | "readdirSync">,
  opts?: { campaignFolderToken?: string },
): string[] {
  const found = new Set<string>();
  const token = opts?.campaignFolderToken?.trim().toLowerCase();

  const walk = (dir: string) => {
    let ents: Dirent[];
    try {
      ents = io.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (e.isFile() && e.name === "backtest_summary.json") {
        const bundleDir = dirname(p);
        const tradesPath = join(bundleDir, "backtest_trades.csv");
        if (!io.existsSync(tradesPath)) continue;
        if (token) {
          const n = normalize(bundleDir).replace(/\//g, "\\").toLowerCase();
          const needle = `mapazapp\\testea\\${token}`;
          if (!n.includes(needle)) continue;
        }
        found.add(bundleDir);
      }
    }
  };

  walk(searchRoot);
  return [...found];
}

export function analyzeTestEaBundleAmbiguitySensitivity(
  bundlePath: string,
  options?: TestEaAmbiguitySensitivityOptions,
  io: Pick<AmbiguitySensitivityCliIo, "readFileUtf8" | "existsSync"> = defaultIo(),
): ReturnType<typeof analyzeTestEaBundleAmbiguitySensitivityFromTexts> {
  const abs = bundlePath.replace(/[/\\]+$/, "");
  const summaryPath = join(abs, "backtest_summary.json");
  const tradesPath = join(abs, "backtest_trades.csv");
  if (!io.existsSync(summaryPath) || !io.existsSync(tradesPath)) {
    return {
      ok: false,
      bundleName: basename(abs),
      errors: ["missing backtest_summary.json or backtest_trades.csv"],
      importErrors: [],
      importWarnings: [],
      rows: [],
    };
  }
  return analyzeTestEaBundleAmbiguitySensitivityFromTexts(
    {
      bundleName: basename(abs),
      summaryJsonText: io.readFileUtf8(summaryPath),
      tradesCsvText: io.readFileUtf8(tradesPath),
    },
    options,
  );
}

export function analyzeTestEaCampaignAmbiguitySensitivity(
  bundlePaths: string[],
  options?: TestEaAmbiguitySensitivityOptions,
  io: Pick<AmbiguitySensitivityCliIo, "readFileUtf8" | "existsSync"> = defaultIo(),
): ReturnType<typeof analyzeTestEaCampaignAmbiguitySensitivityFromTexts> {
  const bundles: TestEaAmbiguityBundleTextInput[] = [];
  for (const p of bundlePaths) {
    const r = analyzeTestEaBundleAmbiguitySensitivity(p, options, io);
    if (!r.ok) continue;
    const abs = p.replace(/[/\\]+$/, "");
    bundles.push({
      bundleName: basename(abs),
      summaryJsonText: io.readFileUtf8(join(abs, "backtest_summary.json")),
      tradesCsvText: io.readFileUtf8(join(abs, "backtest_trades.csv")),
    });
  }
  return analyzeTestEaCampaignAmbiguitySensitivityFromTexts(bundles, options);
}

function defaultIo(): AmbiguitySensitivityCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

function escapeCsvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: TestEaAmbiguitySensitivityRow[]): string {
  const headers: (keyof TestEaAmbiguitySensitivityRow)[] = [
    "bundleName",
    "mode",
    "fvgMin",
    "tradeCountRaw",
    "countedTrades",
    "ambiguousCount",
    "ambiguousRate",
    "winCount",
    "lossCount",
    "totalR",
    "expectancyR",
    "winrate",
    "maxDrawdownR",
    "tradesPerDay",
    "runId",
    "campaignId",
    "parameterSetId",
    "effectiveRunId",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsvCell(r[h] as never)).join(","));
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
      mode: AmbiguityAccountingMode[] | "all";
      sortBy: AmbiguitySensitivitySortKey;
      maxResults?: number;
      csvOutput?: string;
    };

function parseArgv(argv: string[]): ParsedCli {
  const bundles: string[] = [];
  let searchRoot: string | undefined;
  let campaignFolder: string | undefined;
  let json = false;
  let strict = false;
  let modeSpec: AmbiguityAccountingMode[] | "all" = "all";
  let sortBy: AmbiguitySensitivitySortKey = "fvg";
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
      case "mode": {
        const mv = next.trim().toLowerCase();
        if (mv === "all" || mv === "") modeSpec = "all";
        else if (mv === "neutral_zero") modeSpec = ["neutral_zero"];
        else if (mv === "conservative_loss") modeSpec = ["conservative_loss"];
        else if (mv === "skip_ambiguous") modeSpec = ["skip_ambiguous"];
        else return { kind: "error", message: `invalid --mode: ${next}` };
        break;
      }
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

  const uniq = [...new Set(resolved.map((p) => normalize(p)))];
  return {
    kind: "run",
    bundles: uniq,
    json,
    strict,
    mode: modeSpec,
    sortBy,
    maxResults,
    csvOutput,
  };
}

export function runMapazappTesteaAmbiguitySensitivityCli(argv: string[], io: AmbiguitySensitivityCliIo): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite(`Try --help\n`);
    return 2;
  }

  if (parsed.bundles.length === 0) {
    io.stderrWrite("error: provide --bundle and/or --search-root\n");
    return 2;
  }

  const modeOpt: TestEaAmbiguitySensitivityOptions =
    parsed.mode === "all" ? {} : { modes: parsed.mode as AmbiguityAccountingMode[] };

  const analyses: ReturnType<typeof analyzeTestEaBundleAmbiguitySensitivityFromTexts>[] = [];
  const skipped: { path: string; reason: string }[] = [];

  for (const bp of parsed.bundles) {
    const r = analyzeTestEaBundleAmbiguitySensitivity(bp, modeOpt, io);
    if (!r.ok) {
      skipped.push({ path: bp, reason: r.errors.join("; ") || "import failed" });
      if (parsed.strict) {
        io.stderrWrite(`strict: bundle failed: ${bp}\n${r.errors.join("\n")}\n`);
        return 1;
      }
      io.stderrWrite(`skip: ${basename(bp)} — ${skipped[skipped.length - 1]!.reason}\n`);
      continue;
    }
    analyses.push(r);
  }

  const flat = analyses.flatMap((a) => a.rows);
  if (flat.length === 0) {
    io.stderrWrite("error: no bundle produced rows\n");
    return 1;
  }

  const sorted = summarizeAmbiguitySensitivity(flat, {
    sortBy: parsed.sortBy,
    maxResults: parsed.maxResults,
  });

  if (parsed.csvOutput) {
    io.writeFileUtf8(parsed.csvOutput, rowsToCsv(sorted));
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
          rows: sorted,
        },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  io.stdoutWrite("Mapazapp TestEA ambiguity sensitivity (E5.6.1)\n");
  io.stdoutWrite(`Bundles analyzed: ${analyses.length}  skipped: ${skipped.length}\n\n`);
  for (const row of sorted) {
    io.stdoutWrite(
      [
        row.bundleName,
        row.mode,
        `FVG=${row.fvgMin ?? "?"}`,
        `trades=${row.tradeCountRaw}`,
        `amb=${row.ambiguousCount}(${row.ambiguousRate.toFixed(3)})`,
        `totalR=${row.totalR.toFixed(2)}`,
        `E[R]=${row.expectancyR.toFixed(4)}`,
        `DD=${row.maxDrawdownR.toFixed(2)}`,
        `winrate=${row.winrate.toFixed(3)}`,
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
  process.exit(runMapazappTesteaAmbiguitySensitivityCli(process.argv.slice(2), defaultIo()));
}
