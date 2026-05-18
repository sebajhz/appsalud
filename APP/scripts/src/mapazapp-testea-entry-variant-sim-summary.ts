/**
 * E5.13.6 — CLI: TestEA Entry Variant Outcome / Risk Simulation summary (read-only; no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaEntryVariantOutcomeSimCampaignFromTexts,
  flattenEntryVariantOutcomeSimCompareRows,
  type TestEaEntryVariantOutcomeSimBundleTextInput,
} from "@workspace/mapazapp-core";
import { findTestEaBundleRootDirs } from "./mapazapp-testea-ambiguity-sensitivity";

export type EntryVariantSimSummaryCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-entry-variant-sim-summary (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-summary -- [options]

Options:
  --bundle <path>           Bundle folder (repeatable). Requires backtest_summary.json; trades optional
  --search-root <path>      Recursively find bundle folders
  --campaign-folder <token> Only include paths whose normalized path contains Mapazapp\\\\TestEA\\\\<token>\\\\
  --json                    Full JSON on stdout
  --csv-output <path>       Write compare CSV (creates/overwrites file)
  --strict                  Exit 1 if any bundle fails to parse
  --help, -h

Exit codes:
  0  At least one bundle analyzed successfully
  1  Failure (--strict, no bundles, or no successful analysis)
  2  Invalid arguments
`;

function defaultIo(): EntryVariantSimSummaryCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

export function loadEntryVariantSimBundleInput(
  bundlePath: string,
  io: Pick<EntryVariantSimSummaryCliIo, "readFileUtf8" | "existsSync"> = defaultIo(),
): TestEaEntryVariantOutcomeSimBundleTextInput | null {
  const abs = bundlePath.replace(/[/\\]+$/, "");
  const summaryPath = join(abs, "backtest_summary.json");
  if (!io.existsSync(summaryPath)) return null;
  const tradesPath = join(abs, "backtest_trades.csv");
  const input: TestEaEntryVariantOutcomeSimBundleTextInput = {
    bundleName: basename(abs),
    summaryJsonText: io.readFileUtf8(summaryPath),
  };
  if (io.existsSync(tradesPath)) {
    input.tradesCsvText = io.readFileUtf8(tradesPath);
  }
  return input;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCompareCsv(
  path: string,
  rows: ReturnType<typeof flattenEntryVariantOutcomeSimCompareRows>,
  io: EntryVariantSimSummaryCliIo,
): void {
  const header = [
    "bundle",
    "variant",
    "filled_count",
    "win_count",
    "loss_count",
    "ambiguous_count",
    "not_filled_count",
    "invalid_risk_count",
    "total_r",
    "expectancy_r",
    "winrate",
    "average_risk_points",
  ].join(",");
  const lines = rows.map((r) =>
    [
      r.bundleName,
      r.variant,
      r.filled_count,
      r.win_count,
      r.loss_count,
      r.ambiguous_count,
      r.not_filled_count,
      r.invalid_risk_count,
      r.total_r.toFixed(6),
      r.expectancy_r.toFixed(6),
      r.winrate.toFixed(6),
      r.average_risk_points.toFixed(6),
    ]
      .map(csvEscape)
      .join(","),
  );
  io.writeFileUtf8(path, `${header}\n${lines.join("\n")}\n`);
}

export function runEntryVariantSimSummaryCli(
  argv: string[],
  io: EntryVariantSimSummaryCliIo = defaultIo(),
): number {
  const bundles: string[] = [];
  let searchRoot: string | undefined;
  let campaignFolder: string | undefined;
  let jsonOut = false;
  let csvOutput: string | undefined;
  let strict = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") {
      io.stdoutWrite(`${USAGE}\n`);
      return 0;
    }
    if (a === "--bundle") {
      const p = argv[++i];
      if (!p) return 2;
      bundles.push(resolve(p));
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
    if (a === "--strict") {
      strict = true;
      continue;
    }
    io.stderrWrite(`Unknown argument: ${a}\n${USAGE}`);
    return 2;
  }

  if (searchRoot) {
    const found = findTestEaBundleRootDirs(searchRoot, io);
    for (const p of found) {
      if (campaignFolder) {
        const norm = normalize(p).replace(/\//g, "\\");
        const needle = `Mapazapp\\TestEA\\${campaignFolder}\\`;
        if (!norm.toLowerCase().includes(needle.toLowerCase())) continue;
      }
      bundles.push(p);
    }
  }

  if (bundles.length === 0) {
    io.stderrWrite("No bundles specified. Use --bundle or --search-root.\n");
    return strict ? 1 : 2;
  }

  const inputs: TestEaEntryVariantOutcomeSimBundleTextInput[] = [];
  for (const b of bundles) {
    const loaded = loadEntryVariantSimBundleInput(b, io);
    if (!loaded) {
      io.stderrWrite(`skip (missing summary): ${b}\n`);
      if (strict) return 1;
      continue;
    }
    inputs.push(loaded);
  }

  if (inputs.length === 0) return strict ? 1 : 2;

  const campaign = analyzeTestEaEntryVariantOutcomeSimCampaignFromTexts(inputs);
  const okBundles = campaign.bundles.filter((b) => b.ok && b.has_logic);
  if (okBundles.length === 0) {
    io.stderrWrite("No bundles with has_entry_variant_outcome_sim_v1_logic.\n");
    return strict ? 1 : 0;
  }

  if (jsonOut) {
    io.stdoutWrite(`${JSON.stringify(campaign, null, 2)}\n`);
  } else {
    for (const b of okBundles) {
      io.stdoutWrite(`\n=== ${b.bundleName} (hypothetical variant sim — not official P/L) ===\n`);
      io.stdoutWrite(`enabled: ${String(b.enabled)}\n`);
      for (const v of b.variants) {
        io.stdoutWrite(
          `  ${v.variant}: filled=${v.filled_count} win=${v.win_count} loss=${v.loss_count} amb=${v.ambiguous_count} ` +
            `expR=${v.expectancy_r.toFixed(3)} totalR=${v.total_r.toFixed(3)} winrate=${v.winrate.toFixed(3)}\n`,
        );
      }
      io.stdoutWrite(
        `  best_by_expectancy: ${b.best_variant_by_expectancy ?? ""} | best_by_total_r: ${b.best_variant_by_total_r ?? ""}\n`,
      );
    }
  }

  if (csvOutput) {
    writeCompareCsv(csvOutput, flattenEntryVariantOutcomeSimCompareRows(campaign), io);
    io.stderrWrite(`Wrote ${csvOutput}\n`);
  }

  if (strict && campaign.bundles.some((b) => !b.ok)) return 1;
  return 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") === process.argv[1].replace(/\\/g, "/");

if (isMain) {
  process.exit(runEntryVariantSimSummaryCli(process.argv.slice(2)));
}
