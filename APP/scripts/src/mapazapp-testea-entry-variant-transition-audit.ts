/**
 * E5.13.6.6 — CLI: entry variant transition / sanity audit (read-only; no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaEntryVariantTransitionAuditFromTexts,
  flattenTransitionAuditCsvRows,
  type TestEaEntryVariantTransitionAuditAnalysis,
  type TransitionVariantId,
} from "@workspace/mapazapp-core";
import { findTestEaBundleRootDirs } from "./mapazapp-testea-ambiguity-sensitivity";
import { loadReconcileBundleInput } from "./mapazapp-testea-entry-variant-sim-reconcile";

export type TransitionAuditCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-entry-variant-transition-audit (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-transition-audit -- [options]

Options:
  --bundle <path>           Bundle folder (repeatable). Requires backtest_summary.json + backtest_trades.csv
  --search-root <path>      Recursively find bundle folders
  --campaign-folder <token> Only include paths whose normalized path contains Mapazapp\\\\TestEA\\\\<token>\\\\
  --json                    Full JSON on stdout
  --csv-output <path>       Write transition bucket CSV
  --max-examples <n>        Sample rows per bucket (default 10)
  --variants <list>         Comma-separated: edge,25,50,75,adaptive (default edge,25,adaptive)
  --strict                  Exit 1 if any bundle fails
  --help, -h

Exit codes:
  0  At least one bundle audited successfully
  1  Failure (--strict or no bundles)
  2  Invalid arguments
`;

function defaultIo(): TransitionAuditCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

function parseVariants(raw: string): TransitionVariantId[] | null {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: TransitionVariantId[] = [];
  for (const p of parts) {
    if (p === "edge" || p === "25" || p === "50" || p === "75" || p === "adaptive") {
      out.push(p);
    } else {
      return null;
    }
  }
  return out.length > 0 ? out : null;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeTransitionCsv(
  path: string,
  analysis: TestEaEntryVariantTransitionAuditAnalysis,
  io: TransitionAuditCliIo,
): void {
  const rows = flattenTransitionAuditCsvRows(analysis);
  const lines = [
    "bundle,variant,bucket,count,total_delta_r,avg_delta_r,avg_risk_ratio_vs_50,notes",
    ...rows.map(
      (r) =>
        `${csvEscape(r.bundle)},${csvEscape(r.variant)},${csvEscape(r.bucket)},${r.count},${r.total_delta_r},${r.avg_delta_r},${r.avg_risk_ratio_vs_50 ?? ""},${csvEscape(r.notes)}`,
    ),
  ];
  io.writeFileUtf8(path, `${lines.join("\n")}\n`);
}

export function runEntryVariantTransitionAuditCli(
  argv: string[],
  io: TransitionAuditCliIo = defaultIo(),
): number {
  const bundles: string[] = [];
  let searchRoot: string | undefined;
  let campaignFolder: string | undefined;
  let jsonOut = false;
  let csvOutput: string | undefined;
  let maxExamples = 10;
  let strict = false;
  let variants: TransitionVariantId[] | undefined;

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
    if (a === "--variants") {
      const parsed = parseVariants(argv[++i] ?? "");
      if (!parsed) return 2;
      variants = parsed;
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

  const results: TestEaEntryVariantTransitionAuditAnalysis[] = [];
  for (const b of bundles) {
    const loaded = loadReconcileBundleInput(b, io);
    if (!loaded) {
      io.stderrWrite(`skip (missing summary/trades): ${b}\n`);
      if (strict) return 1;
      continue;
    }
    const r = analyzeTestEaEntryVariantTransitionAuditFromTexts(loaded, {
      maxExamples,
      variants,
    });
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
      io.stdoutWrite(`\n=== ${r.bundleName} (transition audit — diagnostic) ===\n`);
      io.stdoutWrite(`trades=${r.trade_count} control=${r.control_variant}\n`);
      io.stdoutWrite(`flags: ${r.interpretation_flags.join(", ") || "(none)"}\n`);
      for (const v of r.variants) {
        io.stdoutWrite(
          `\n  [${v.variant}] improved=${v.improvement_summary.improved_count} degraded=${v.improvement_summary.degraded_count} unchanged=${v.improvement_summary.unchanged_count}\n`,
        );
        io.stdoutWrite(
          `    delta_r total=${v.delta_r_summary.total_delta_r_vs_official.toFixed(3)} avg=${v.delta_r_summary.average_delta_r_vs_official.toFixed(4)}\n`,
        );
        io.stdoutWrite(
          `    risk avg_pts=${v.risk_sanity.average_risk_points.toFixed(2)} avg_ratio_vs_50=${v.risk_sanity.average_risk_ratio_vs_50.toFixed(3)}\n`,
        );
        const top = v.transition_matrix.slice(0, 5);
        for (const row of top) {
          io.stdoutWrite(`    ${row.bucket}: ${row.count}\n`);
        }
      }
    }
  }

  if (csvOutput && okResults[0]) {
    writeTransitionCsv(csvOutput, okResults[0], io);
    io.stderrWrite(`Wrote ${csvOutput}\n`);
  }

  return 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") === process.argv[1].replace(/\\/g, "/");

if (isMain) {
  process.exit(runEntryVariantTransitionAuditCli(process.argv.slice(2)));
}
