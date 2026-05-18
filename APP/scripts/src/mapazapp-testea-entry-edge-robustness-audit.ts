/**
 * E5.13.6.8 — CLI: edge entry robustness audit (read-only; no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaEntryEdgeRobustnessAuditFromTexts,
  DEFAULT_BUFFER_POINTS,
  DEFAULT_MIN_EFFECTIVE_RR,
  flattenRobustnessAuditCsvRows,
  type TestEaEntryEdgeRobustnessAuditAnalysis,
} from "@workspace/mapazapp-core";
import { findTestEaBundleRootDirs } from "./mapazapp-testea-ambiguity-sensitivity";
import { loadReconcileBundleInput } from "./mapazapp-testea-entry-variant-sim-reconcile";

export type EdgeRobustnessAuditCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-entry-edge-robustness-audit (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-entry-edge-robustness-audit -- [options]

Options:
  --bundle <path>           Bundle folder (repeatable). Requires backtest_summary.json + backtest_trades.csv
  --search-root <path>      Recursively find bundle folders
  --campaign-folder <token> Only include paths whose normalized path contains Mapazapp\\\\TestEA\\\\<token>\\\\
  --json                    Full JSON on stdout
  --csv-output <path>       Write robustness summary CSV
  --max-examples <n>        Sample rows per category (default 10)
  --buffer-points <list>    Comma-separated buffer points (default 5,10,20,30,50)
  --min-effective-rr <n>    Minimum effective RR pass threshold (default 1.5)
  --strict                  Exit 1 if any bundle fails
  --help, -h

Exit codes:
  0  At least one bundle audited successfully
  1  Failure (--strict or no bundles)
  2  Invalid arguments
`;

function defaultIo(): EdgeRobustnessAuditCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

export function parseBufferPoints(raw: string): number[] | null {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0) return null;
    out.push(n);
  }
  return out.length > 0 ? out : null;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeRobustnessCsv(
  path: string,
  analysis: TestEaEntryEdgeRobustnessAuditAnalysis,
  io: EdgeRobustnessAuditCliIo,
): void {
  const rows = flattenRobustnessAuditCsvRows(analysis);
  const lines = [
    "bundle,section,bucket,variant,buffer_points,count,average_effective_rr,fail_count,average_risk_ratio_vs_50,notes",
    ...rows.map(
      (r) =>
        `${csvEscape(r.bundle)},${csvEscape(r.section)},${csvEscape(r.bucket)},${csvEscape(r.variant)},${r.buffer_points},${r.count},${r.average_effective_rr},${r.fail_count},${r.average_risk_ratio_vs_50},${csvEscape(r.notes)}`,
    ),
  ];
  io.writeFileUtf8(path, `${lines.join("\n")}\n`);
}

export function runEntryEdgeRobustnessAuditCli(
  argv: string[],
  io: EdgeRobustnessAuditCliIo = defaultIo(),
): number {
  const bundles: string[] = [];
  let searchRoot: string | undefined;
  let campaignFolder: string | undefined;
  let jsonOut = false;
  let csvOutput: string | undefined;
  let maxExamples = 10;
  let strict = false;
  let bufferPoints = DEFAULT_BUFFER_POINTS;
  let minEffectiveRr = DEFAULT_MIN_EFFECTIVE_RR;

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
    if (a === "--buffer-points") {
      const parsed = parseBufferPoints(argv[++i] ?? "");
      if (!parsed) return 2;
      bufferPoints = parsed;
      continue;
    }
    if (a === "--min-effective-rr") {
      minEffectiveRr = Number(argv[++i]);
      if (!Number.isFinite(minEffectiveRr) || minEffectiveRr <= 0) return 2;
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

  const results: TestEaEntryEdgeRobustnessAuditAnalysis[] = [];
  for (const b of bundles) {
    const loaded = loadReconcileBundleInput(b, io);
    if (!loaded) {
      io.stderrWrite(`skip (missing summary/trades): ${b}\n`);
      if (strict) return 1;
      continue;
    }
    const r = analyzeTestEaEntryEdgeRobustnessAuditFromTexts(loaded, {
      maxExamples,
      bufferPoints,
      minEffectiveRr,
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
      io.stdoutWrite(`\n=== ${r.bundleName} (edge robustness audit — diagnostic) ===\n`);
      io.stdoutWrite(`trades=${r.trade_count} control=${r.control_variant}\n`);
      io.stdoutWrite(`flags: ${r.interpretation_flags.join(", ") || "(none)"}\n`);
      io.stdoutWrite(
        `edge delta_r total=${r.edge_summary.total_delta_r_vs_official.toFixed(1)} unresolved=${r.edge_summary.edge_unresolved_count}\n`,
      );
      for (const buf of r.buffer_stress) {
        io.stdoutWrite(
          `  buffer ${buf.buffer_points}pts: avg_eff_rr=${buf.average_effective_rr.toFixed(3)} fail=${buf.fail_effective_rr_count} edge_wins_failing=${buf.edge_wins_failing_effective_rr_count}\n`,
        );
      }
    }
  }

  if (csvOutput && okResults[0]) {
    writeRobustnessCsv(csvOutput, okResults[0], io);
    io.stderrWrite(`Wrote ${csvOutput}\n`);
  }

  return 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") === process.argv[1].replace(/\\/g, "/");

if (isMain) {
  process.exit(runEntryEdgeRobustnessAuditCli(process.argv.slice(2)));
}
