/**
 * E5.19 — CLI: setup readiness report prototype (read-only; no MT5).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dirent } from "node:fs";
import {
  buildTestEaSetupReadinessReportFromTexts,
  renderSetupReadinessReportHtml,
  renderSetupReadinessReportMarkdown,
  setupReadinessReportToJson,
  type SetupReadinessReport,
  type SetupReadinessReportLanguage,
} from "@workspace/mapazapp-core";
import { findTestEaBundleRootDirs } from "./mapazapp-testea-ambiguity-sensitivity";
import { loadReconcileBundleInput } from "./mapazapp-testea-entry-variant-sim-reconcile";

export type SetupReadinessReportCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  writeFileUtf8(path: string, data: string): void;
};

const USAGE = `mapazapp-testea-setup-readiness-report (read-only report prototype, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-setup-readiness-report -- [options]

Options:
  --bundle <path>              Bundle folder (requires backtest_summary.json + backtest_trades.csv)
  --markdown-output <path>     Write Markdown report
  --json-output <path>         Write JSON report
  --html-output <path>         Write HTML report (optional)
  --language es|en             Report language (default: es)
  --max-examples <n>           Example trade cards per category (default 10)
  --search-root <path>         Recursively find bundle folders
  --strict                     Exit 1 if report ok=false
  --help, -h

Exit codes:
  0  Report generated (ok=true, or ok=false without --strict)
  1  Failure (--strict and ok=false, or no bundle)
  2  Invalid arguments
`;

function defaultIo(): SetupReadinessReportCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
  };
}

function parseLanguage(raw: string | undefined): SetupReadinessReportLanguage | null {
  if (raw === "es" || raw === "en") return raw;
  return null;
}

export function runSetupReadinessReportCli(
  argv: string[],
  io: SetupReadinessReportCliIo = defaultIo(),
): number {
  const bundles: string[] = [];
  let searchRoot: string | undefined;
  let markdownOutput: string | undefined;
  let jsonOutput: string | undefined;
  let htmlOutput: string | undefined;
  let language: SetupReadinessReportLanguage = "es";
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
    if (a === "--markdown-output") {
      markdownOutput = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--json-output") {
      jsonOutput = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--html-output") {
      htmlOutput = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--language") {
      const lang = parseLanguage(argv[++i]);
      if (!lang) return 2;
      language = lang;
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
      bundles.push(p);
    }
  }

  if (bundles.length === 0) {
    io.stderrWrite("No bundles specified.\n");
    return strict ? 1 : 2;
  }

  if (!markdownOutput && !jsonOutput && !htmlOutput) {
    io.stderrWrite("Specify at least one of --markdown-output, --json-output, --html-output\n");
    return 2;
  }

  let lastReport: SetupReadinessReport | undefined;
  for (const b of bundles) {
    const loaded = loadReconcileBundleInput(b, io);
    if (!loaded) {
      io.stderrWrite(`skip (missing summary/trades): ${b}\n`);
      if (strict) return 1;
      continue;
    }
    const report = buildTestEaSetupReadinessReportFromTexts(loaded, { maxExamples, language });
    lastReport = report;

    for (const w of report.warnings) io.stderrWrite(`warn: ${w}\n`);
    for (const e of report.errors) io.stderrWrite(`error: ${e}\n`);

    if (!report.ok) {
      io.stderrWrite(`report not ok for bundle: ${b}\n`);
      if (strict) return 1;
      continue;
    }

    if (markdownOutput) io.writeFileUtf8(markdownOutput, renderSetupReadinessReportMarkdown(report));
    if (jsonOutput) io.writeFileUtf8(jsonOutput, setupReadinessReportToJson(report));
    if (htmlOutput) io.writeFileUtf8(htmlOutput, renderSetupReadinessReportHtml(report));

    io.stderrWrite(`Wrote report for ${b} (ok=${report.ok})\n`);
  }

  if (!lastReport) return strict ? 1 : 2;
  if (!lastReport.ok && strict) return 1;

  return 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") === process.argv[1].replace(/\\/g, "/");

if (isMain) {
  process.exit(runSetupReadinessReportCli(process.argv.slice(2)));
}
