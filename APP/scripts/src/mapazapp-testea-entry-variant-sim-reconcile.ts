/**
 * E5.13.6.1 — CLI: reconcile official outcome vs variant 50/CE simulation (read-only; no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaEntryVariantReconcileFromTexts,
  flattenReconcileBucketsCsvRows,
  type TestEaEntryVariantReconcileBundleAnalysis,
} from "@workspace/mapazapp-core";
import { findTestEaBundleRootDirs } from "./mapazapp-testea-ambiguity-sensitivity";

export type ReconcileCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-entry-variant-sim-reconcile (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-reconcile -- [options]

Options:
  --bundle <path>           Bundle folder (repeatable). Requires backtest_summary.json + backtest_trades.csv
  --search-root <path>      Recursively find bundle folders
  --campaign-folder <token> Only include paths whose normalized path contains Mapazapp\\\\TestEA\\\\<token>\\\\
  --json                    Full JSON on stdout
  --csv-output <path>       Write bucket counts CSV
  --max-examples <n>        Sample rows per bucket (default 10)
  --strict                  Exit 1 if any bundle fails
  --help, -h

Exit codes:
  0  At least one bundle reconciled successfully
  1  Failure (--strict or no bundles)
  2  Invalid arguments
`;

function defaultIo(): ReconcileCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

export function loadReconcileBundleInput(
  bundlePath: string,
  io: Pick<ReconcileCliIo, "readFileUtf8" | "existsSync"> = defaultIo(),
): { bundleName: string; summaryJsonText: string; tradesCsvText: string } | null {
  const abs = bundlePath.replace(/[/\\]+$/, "");
  const summaryPath = join(abs, "backtest_summary.json");
  const tradesPath = join(abs, "backtest_trades.csv");
  if (!io.existsSync(summaryPath) || !io.existsSync(tradesPath)) return null;
  return {
    bundleName: basename(abs),
    summaryJsonText: io.readFileUtf8(summaryPath),
    tradesCsvText: io.readFileUtf8(tradesPath),
  };
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeBucketsCsv(path: string, analysis: TestEaEntryVariantReconcileBundleAnalysis, io: ReconcileCliIo): void {
  const rows = flattenReconcileBucketsCsvRows(analysis);
  const lines = ["bucket,count", ...rows.map((r) => `${csvEscape(r.bucket)},${r.count}`)];
  io.writeFileUtf8(path, `${lines.join("\n")}\n`);
}

export function runEntryVariantSimReconcileCli(
  argv: string[],
  io: ReconcileCliIo = defaultIo(),
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

  const results: TestEaEntryVariantReconcileBundleAnalysis[] = [];
  for (const b of bundles) {
    const loaded = loadReconcileBundleInput(b, io);
    if (!loaded) {
      io.stderrWrite(`skip (missing summary/trades): ${b}\n`);
      if (strict) return 1;
      continue;
    }
    const r = analyzeTestEaEntryVariantReconcileFromTexts(loaded, { maxExamples });
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
    io.stdoutWrite(`${JSON.stringify(okResults.length === 1 ? okResults[0] : { bundles: results }, null, 2)}\n`);
  } else {
    for (const r of okResults) {
      const s = r.summary!;
      io.stdoutWrite(`\n=== ${r.bundleName} (50/CE reconcile — diagnostic) ===\n`);
      io.stdoutWrite(
        `trades=${s.trade_count} outcome_match=${s.outcome_match_count} mismatch=${s.mismatch_count} rate=${s.mismatch_rate.toFixed(4)}\n`,
      );
      io.stdoutWrite(
        `official win/loss/amb/exp=${s.official_win_count}/${s.official_loss_count}/${s.official_ambiguous_count}/${s.official_expired_unfilled_count}\n`,
      );
      io.stdoutWrite(
        `v50 win/loss/amb/not_filled=${s.variant50_win_count}/${s.variant50_loss_count}/${s.variant50_ambiguous_count}/${s.variant50_not_filled_count}\n`,
      );
      const top = r.buckets.slice(0, 8);
      for (const b of top) {
        io.stdoutWrite(`  ${b.id}: ${b.count}\n`);
      }
    }
  }

  if (csvOutput && okResults[0]) {
    writeBucketsCsv(csvOutput, okResults[0], io);
    io.stderrWrite(`Wrote ${csvOutput}\n`);
  }

  return 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") === process.argv[1].replace(/\\/g, "/");

if (isMain) {
  process.exit(runEntryVariantSimReconcileCli(process.argv.slice(2)));
}
