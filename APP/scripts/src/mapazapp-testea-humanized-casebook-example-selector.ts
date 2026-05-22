/**
 * E5.22.4.1 — CLI: humanized casebook example selector (read-only; no MT5).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  analyzeTestEaHumanizedCasebookExamplesFromTexts,
  flattenHumanizedCasebookExampleCsvRows,
  type TestEaHumanizedCasebookExampleSelectorResult,
} from "@workspace/mapazapp-core";
import { loadReconcileBundleInput } from "./mapazapp-testea-entry-variant-sim-reconcile";

export type HumanizedCasebookExampleSelectorCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-humanized-casebook-example-selector (read-only, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-humanized-casebook-example-selector -- [options]

Options:
  --bundle <path>              Bundle folder (backtest_summary.json + backtest_trades.csv)
  --json                       Full JSON on stdout
  --csv-output <path>          Flattened example CSV (_DO_NOT_COMMIT recommended)
  --max-examples-per-case <n>  Max rows per HA/calibration bucket (default 5)
  --strict                     Exit 1 if bundle fails
  --help, -h

Exit codes:
  0  Success
  1  Failure (--strict or no bundle)
  2  Invalid arguments
`;

function defaultIo(): HumanizedCasebookExampleSelectorCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

function csvEscape(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeExampleCsv(
  path: string,
  result: TestEaHumanizedCasebookExampleSelectorResult,
  io: HumanizedCasebookExampleSelectorCliIo,
): void {
  const rows = flattenHumanizedCasebookExampleCsvRows(result);
  const header =
    "case_id,category,trade_id,outcome,result_r,decision,score,grade,primary_blocker,ifvg_grade,target_grade,environment_grade,discipline_grade,session,volatility,entry_status,reason_selected,interpretation,future_humanized_action,governance_note";
  const lines = [
    header,
    ...rows.map(
      (r) =>
        [
          csvEscape(r.case_id),
          csvEscape(r.category),
          csvEscape(r.trade_id),
          csvEscape(r.outcome),
          r.result_r,
          csvEscape(r.decision),
          r.score ?? "",
          csvEscape(r.grade),
          csvEscape(r.primary_blocker),
          csvEscape(r.ifvg_grade),
          csvEscape(r.target_grade),
          csvEscape(r.environment_grade),
          csvEscape(r.discipline_grade),
          csvEscape(r.session),
          csvEscape(r.volatility),
          csvEscape(r.entry_status),
          csvEscape(r.reason_selected),
          csvEscape(r.interpretation),
          csvEscape(r.future_humanized_action),
          csvEscape(r.governance_note),
        ].join(","),
    ),
  ];
  io.writeFileUtf8(path, `${lines.join("\n")}\n`);
}

export function runHumanizedCasebookExampleSelectorCli(
  argv: string[],
  io: HumanizedCasebookExampleSelectorCliIo = defaultIo(),
): number {
  let bundle: string | undefined;
  let jsonOut = false;
  let csvOutput: string | undefined;
  let maxExamplesPerCase = 5;
  let strict = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") {
      io.stdoutWrite(`${USAGE}\n`);
      return 0;
    }
    if (a === "--bundle") {
      bundle = resolve(argv[++i] ?? "");
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
    if (a === "--max-examples-per-case") {
      maxExamplesPerCase = Number(argv[++i]);
      if (!Number.isFinite(maxExamplesPerCase) || maxExamplesPerCase < 0) return 2;
      continue;
    }
    if (a === "--strict") {
      strict = true;
      continue;
    }
    io.stderrWrite(`Unknown argument: ${a}\n${USAGE}`);
    return 2;
  }

  if (!bundle) {
    io.stderrWrite("Missing --bundle\n");
    return 2;
  }

  const loaded = loadReconcileBundleInput(bundle, io);
  if (!loaded) {
    io.stderrWrite(`Bundle missing summary/trades: ${bundle}\n`);
    return strict ? 1 : 2;
  }

  const result = analyzeTestEaHumanizedCasebookExamplesFromTexts(loaded, { maxExamplesPerCase });
  if (!result.ok) {
    for (const e of result.errors) io.stderrWrite(`error: ${e}\n`);
    if (strict) return 1;
  }
  for (const w of result.warnings) io.stderrWrite(`warn: ${w}\n`);

  if (jsonOut) {
    io.stdoutWrite(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    io.stdoutWrite(`\n=== ${result.bundle} (humanized casebook examples — research) ===\n`);
    io.stdoutWrite(`ea_build=${result.ea_build} trades=${result.trade_count}\n`);
    for (const [caseId, examples] of Object.entries(result.examples_by_case)) {
      io.stdoutWrite(`${caseId}: ${examples.length} example(s)\n`);
    }
    io.stdoutWrite(`missing_cases: ${result.missing_cases.join(", ") || "(none)"}\n`);
  }

  if (csvOutput) {
    writeExampleCsv(csvOutput, result, io);
    io.stderrWrite(`Wrote ${csvOutput}\n`);
  }

  return result.ok ? 0 : strict ? 1 : 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") === process.argv[1].replace(/\\/g, "/");

if (isMain) {
  process.exit(runHumanizedCasebookExampleSelectorCli(process.argv.slice(2)));
}
