/**
 * E5.15.2 — CLI: liquidity target realism / TP vs liquidity distance audit (read-only; no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaLiquidityTargetRealismAuditFromTexts,
  flattenTargetRealismAuditCsvRows,
  type TestEaLiquidityTargetRealismAuditAnalysis,
} from "@workspace/mapazapp-core";
import { findTestEaBundleRootDirs } from "./mapazapp-testea-ambiguity-sensitivity";
import { loadReconcileBundleInput } from "./mapazapp-testea-entry-variant-sim-reconcile";

export type LiquidityTargetRealismAuditCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-liquidity-target-realism-audit (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-liquidity-target-realism-audit -- [options]

Options:
  --bundle <path>           Bundle folder (repeatable). Requires backtest_summary.json + backtest_trades.csv
  --search-root <path>      Recursively find bundle folders
  --campaign-folder <token> Only include paths whose normalized path contains Mapazapp\\\\TestEA\\\\<token>\\\\
  --json                    Full JSON on stdout
  --csv-output <path>       Write realism audit summary CSV
  --max-examples <n>        Sample rows per bucket (default 10)
  --strict                  Exit 1 if any bundle fails
  --help, -h

Exit codes:
  0  At least one bundle audited successfully
  1  Failure (--strict or no bundles)
  2  Invalid arguments
`;

function defaultIo(): LiquidityTargetRealismAuditCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeRealismCsv(
  path: string,
  analysis: TestEaLiquidityTargetRealismAuditAnalysis,
  io: LiquidityTargetRealismAuditCliIo,
): void {
  const rows = flattenTargetRealismAuditCsvRows(analysis);
  const lines = [
    "bundle,section,bucket,row_key,col_key,count,notes",
    ...rows.map(
      (r) =>
        `${csvEscape(r.bundle)},${csvEscape(r.section)},${csvEscape(r.bucket)},${csvEscape(r.row_key)},${csvEscape(r.col_key)},${r.count},${csvEscape(r.notes)}`,
    ),
  ];
  io.writeFileUtf8(path, `${lines.join("\n")}\n`);
}

export function runLiquidityTargetRealismAuditCli(
  argv: string[],
  io: LiquidityTargetRealismAuditCliIo = defaultIo(),
): number {
  const bundles: string[] = [];
  let searchRoot: string | undefined;
  let campaignFolder: string | undefined;
  let jsonOut = false;
  let csvOutput: string | undefined;
  let maxExamples = 10;
  let strict = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") {
      io.stdoutWrite(`${USAGE}\n`);
      return 0;
    }
    if (a === "--bundle") {
      bundles.push(resolve(argv[++i] ?? ""));
      continue;
    }
    if (a === "--search-root") {
      searchRoot = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--campaign-folder") {
      campaignFolder = argv[++i];
      continue;
    }
    if (a === "--json") {
      jsonOut = true;
      continue;
    }
    if (a === "--csv-output") {
      csvOutput = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--max-examples") {
      maxExamples = Number(argv[++i]);
      if (!Number.isFinite(maxExamples) || maxExamples < 0) return 2;
      continue;
    }
    if (a === "--strict") {
      strict = true;
      continue;
    }
    io.stderrWrite(`Unknown argument: ${a}\n${USAGE}`);
    return 2;
  }

  if (searchRoot) {
    for (const p of findTestEaBundleRootDirs(searchRoot, io)) {
      if (campaignFolder) {
        const norm = normalize(p).replace(/\//g, "\\");
        const needle = `Mapazapp\\TestEA\\${campaignFolder}\\`;
        if (!norm.toLowerCase().includes(needle.toLowerCase())) continue;
      }
      bundles.push(p);
    }
  }

  if (bundles.length === 0) {
    io.stderrWrite("No bundles specified.\n");
    return strict ? 1 : 2;
  }

  const results: TestEaLiquidityTargetRealismAuditAnalysis[] = [];
  for (const b of bundles) {
    const loaded = loadReconcileBundleInput(b, io);
    if (!loaded) {
      io.stderrWrite(`skip (missing summary/trades): ${b}\n`);
      if (strict) return 1;
      continue;
    }
    const r = analyzeTestEaLiquidityTargetRealismAuditFromTexts(loaded, { maxExamples });
    results.push(r);
    if (!r.ok) {
      for (const w of r.warnings) io.stderrWrite(`warn: ${w}\n`);
      for (const e of r.errors) io.stderrWrite(`error: ${e}\n`);
      if (strict) return 1;
    }
  }

  const okResults = results.filter((r) => r.ok);
  if (okResults.length === 0) return strict ? 1 : 2;

  if (jsonOut) {
    io.stdoutWrite(
      `${JSON.stringify(okResults.length === 1 ? okResults[0] : { bundles: results }, null, 2)}\n`,
    );
  } else {
    for (const r of okResults) {
      io.stdoutWrite(`\n=== ${r.bundleName} (liquidity target realism audit — diagnostic) ===\n`);
      io.stdoutWrite(`trades=${r.overall.trade_count} supported=${r.overall.supported_count}\n`);
      io.stdoutWrite(
        `before_nearest=${r.overall.before_nearest_count} beyond_nearest=${r.overall.beyond_nearest_count} reached_by_tp=${r.overall.reached_by_tp_count}\n`,
      );
      io.stdoutWrite(`flags: ${r.interpretation_flags.join(", ") || "(none)"}\n`);
      const tp = r.distance_stats.official_tp_distance_points;
      const near = r.distance_stats.nearest_liquidity_distance_points;
      io.stdoutWrite(
        `avg_tp_dist=${tp.average?.toFixed(1) ?? "n/a"} avg_nearest_dist=${near.average?.toFixed(1) ?? "n/a"}\n`,
      );
    }
  }

  if (csvOutput && okResults[0]) {
    writeRealismCsv(csvOutput, okResults[0], io);
    io.stderrWrite(`Wrote ${csvOutput}\n`);
  }

  return 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") === process.argv[1].replace(/\\/g, "/");

if (isMain) {
  process.exit(runLiquidityTargetRealismAuditCli(process.argv.slice(2)));
}
