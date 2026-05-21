/**
 * E5.21.1 — Alert-only review notifications CLI (local JSONL queue; no channels, no MT5, no trading).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  alertsToJsonl,
  buildAlertReviewSummary,
  compactAlertReviewCliSummary,
  generateAlertsFromDashboardView,
  parseDashboardReadonlyViewJson,
} from "@workspace/mapazapp-core";
import type { SetupReadinessReportLanguage } from "@workspace/mapazapp-core";

const USAGE = `mapazapp-alert-only-review (read-only review alerts from dashboard_readonly_view.json)

Usage:
  pnpm --filter @workspace/scripts mapazapp:alert-only-review -- \\
    --view-json "<path>/dashboard_readonly_view.json" \\
    --output "<path>/alert_review_queue.jsonl" \\
    --summary-output "<path>/alert_review_summary.json" \\
    [--language es|en] \\
    [--json]

Options:
  --view-json <path>         dashboard_readonly_view.json (required)
  --output <path>            Write alert_review_queue.jsonl (required)
  --summary-output <path>    Write alert_review_summary.json (required)
  --language es|en           Alert copy (default: es)
  --json                     Print compact summary JSON to stdout
  --help, -h                 Show this message

Exit codes:
  0  Queue + summary written
  1  Invalid view or write failure
  2  Missing required arguments

Scope:
  Local generation only. No Telegram, email, push, dashboard panel, or trading APIs.
`;

export type AlertOnlyReviewCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  writeFileUtf8(path: string, data: string): void;
  mkdirSync(path: string): void;
};

type ParsedCli =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      viewJson: string;
      output: string;
      summaryOutput: string;
      language: SetupReadinessReportLanguage;
      json: boolean;
    };

function defaultIo(): AlertOnlyReviewCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    mkdirSync: (p) => mkdirSync(p, { recursive: true }),
  };
}

function parseArgv(argv: string[]): ParsedCli {
  if (argv.includes("--help") || argv.includes("-h")) return { kind: "help" };

  let viewJson: string | undefined;
  let output: string | undefined;
  let summaryOutput: string | undefined;
  let language: SetupReadinessReportLanguage = "es";
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--view-json") {
      viewJson = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--output") {
      output = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--summary-output") {
      summaryOutput = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--language") {
      const lang = argv[++i];
      if (lang === "es" || lang === "en") language = lang;
      else return { kind: "error", message: `--language must be es or en (got ${lang ?? ""})` };
      continue;
    }
    if (a === "--json") {
      json = true;
      continue;
    }
    return { kind: "error", message: `Unknown argument: ${a}` };
  }

  if (!viewJson) return { kind: "error", message: "--view-json is required" };
  if (!output) return { kind: "error", message: "--output is required" };
  if (!summaryOutput) return { kind: "error", message: "--summary-output is required" };
  return { kind: "run", viewJson, output, summaryOutput, language, json };
}

export function runAlertOnlyReviewCli(
  argv: string[],
  io: AlertOnlyReviewCliIo = defaultIo(),
): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(`${USAGE}\n`);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    return 2;
  }

  if (!io.existsSync(parsed.viewJson)) {
    io.stderrWrite(`View JSON not found: ${parsed.viewJson}\n`);
    return 1;
  }

  let viewText: string;
  try {
    viewText = io.readFileUtf8(parsed.viewJson);
  } catch (err) {
    io.stderrWrite(`Failed to read view JSON: ${String(err)}\n`);
    return 1;
  }

  const view = parseDashboardReadonlyViewJson(viewText);
  if (!view) {
    io.stderrWrite("dashboard_readonly_view.json could not be parsed or has invalid schema\n");
    if (parsed.json) {
      io.stdoutWrite(
        `${JSON.stringify({ ok: false, errors: ["dashboard_readonly_view.json could not be parsed"] })}\n`,
      );
    }
    return 1;
  }

  let alerts;
  let genWarnings: string[] = [];
  try {
    const result = generateAlertsFromDashboardView(view, { language: parsed.language });
    alerts = result.alerts;
    genWarnings = result.warnings;
  } catch (err) {
    io.stderrWrite(`Failed to generate alerts: ${String(err)}\n`);
    return 1;
  }

  const summary = buildAlertReviewSummary(view, alerts, {
    warnings: genWarnings,
    output_jsonl: parsed.output,
    output_summary: parsed.summaryOutput,
  });

  try {
    io.mkdirSync(dirname(parsed.output));
    io.writeFileUtf8(parsed.output, alertsToJsonl(alerts));
    io.mkdirSync(dirname(parsed.summaryOutput));
    io.writeFileUtf8(parsed.summaryOutput, `${JSON.stringify(summary, null, 2)}\n`);
  } catch (err) {
    io.stderrWrite(`Failed to write outputs: ${String(err)}\n`);
    return 1;
  }

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(compactAlertReviewCliSummary(summary))}\n`);
  }

  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const code = runAlertOnlyReviewCli(process.argv.slice(2));
  process.exit(code);
}
