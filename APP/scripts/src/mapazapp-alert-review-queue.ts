/**
 * E5.21.2 — Local JSONL alert review queue manager CLI (review states only; no channels, no MT5, no trading).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  alertsToJsonl,
  archiveReviewedAndDismissedAlerts,
  buildAlertReviewQueueSummary,
  compactAlertReviewQueueCliSummary,
  dismissAlert,
  loadAlertReviewQueueJsonl,
  markAlertReviewed,
} from "@workspace/mapazapp-core";

const USAGE = `mapazapp-alert-review-queue (local JSONL review states only; no sending)

Usage:
  pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \\
    --queue "<path>/alert_review_queue.jsonl" \\
    --list \\
    [--json]

  pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \\
    --queue "<path>/alert_review_queue.jsonl" \\
    --output "<path>/alert_review_queue.updated.jsonl" \\
    --mark-reviewed "<alert_id>" \\
    [--review-note "note"] \\
    [--json]

  pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \\
    --queue "<path>/alert_review_queue.jsonl" \\
    --output "<path>/alert_review_queue.updated.jsonl" \\
    --dismiss "<alert_id>" \\
    [--review-note "note"] \\
    [--json]

  pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \\
    --queue "<path>/alert_review_queue.jsonl" \\
    --output "<path>/alert_review_queue.updated.jsonl" \\
    --archive-reviewed \\
    [--json]

Options:
  --queue <path>           Input alert_review_queue.jsonl (required)
  --output <path>          Write updated queue (default for mutations; not used with --list only)
  --in-place               Overwrite --queue instead of --output
  --list                   List alerts / print summary only
  --mark-reviewed <id>     Mark one alert reviewed
  --dismiss <id>           Dismiss one alert
  --archive-reviewed       Archive all reviewed and dismissed alerts
  --review-note <text>     Optional review note on mutation
  --skip-invalid           Skip invalid JSONL lines with warnings
  --force                  Allow review/dismiss on archived alerts
  --json                   Print compact summary JSON to stdout
  --help, -h               Show this message

Exit codes:
  0  Success
  1  Queue load/validation/apply failure
  2  Missing required arguments

Scope:
  Local review state management only. No Telegram, email, push, MT5, broker APIs, or trading.
`;

export type AlertReviewQueueCliIo = {
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
      queue: string;
      output: string | null;
      inPlace: boolean;
      list: boolean;
      markReviewed: string | null;
      dismiss: string | null;
      archiveReviewed: boolean;
      reviewNote: string | undefined;
      skipInvalid: boolean;
      force: boolean;
      json: boolean;
    };

function defaultIo(): AlertReviewQueueCliIo {
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

  let queue: string | undefined;
  let output: string | null = null;
  let inPlace = false;
  let list = false;
  let markReviewed: string | null = null;
  let dismiss: string | null = null;
  let archiveReviewed = false;
  let reviewNote: string | undefined;
  let skipInvalid = false;
  let force = false;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--queue") {
      queue = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--output") {
      output = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--in-place") {
      inPlace = true;
      continue;
    }
    if (a === "--list") {
      list = true;
      continue;
    }
    if (a === "--mark-reviewed") {
      markReviewed = argv[++i] ?? "";
      continue;
    }
    if (a === "--dismiss") {
      dismiss = argv[++i] ?? "";
      continue;
    }
    if (a === "--archive-reviewed") {
      archiveReviewed = true;
      continue;
    }
    if (a === "--review-note") {
      reviewNote = argv[++i] ?? "";
      continue;
    }
    if (a === "--skip-invalid") {
      skipInvalid = true;
      continue;
    }
    if (a === "--force") {
      force = true;
      continue;
    }
    if (a === "--json") {
      json = true;
      continue;
    }
    return { kind: "error", message: `Unknown argument: ${a}` };
  }

  if (!queue) return { kind: "error", message: "--queue is required" };

  const mutationCount =
    (markReviewed ? 1 : 0) + (dismiss ? 1 : 0) + (archiveReviewed ? 1 : 0);
  if (mutationCount > 1) {
    return {
      kind: "error",
      message: "Use only one of --mark-reviewed, --dismiss, or --archive-reviewed",
    };
  }

  if (!list && mutationCount === 0) {
    return { kind: "error", message: "Specify --list or a mutation flag" };
  }

  if (!list && !inPlace && !output) {
    return {
      kind: "error",
      message: "--output or --in-place is required for mutations",
    };
  }

  if (inPlace && output) {
    return { kind: "error", message: "Use either --output or --in-place, not both" };
  }

  return {
    kind: "run",
    queue,
    output: inPlace ? queue : output,
    inPlace,
    list,
    markReviewed,
    dismiss,
    archiveReviewed,
    reviewNote,
    skipInvalid,
    force,
    json,
  };
}

export function runAlertReviewQueueCli(
  argv: string[],
  io: AlertReviewQueueCliIo = defaultIo(),
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

  if (!io.existsSync(parsed.queue)) {
    io.stderrWrite(`Queue not found: ${parsed.queue}\n`);
    return 1;
  }

  let queueText: string;
  try {
    queueText = io.readFileUtf8(parsed.queue);
  } catch (err) {
    io.stderrWrite(`Failed to read queue: ${String(err)}\n`);
    return 1;
  }

  const loaded = loadAlertReviewQueueJsonl(queueText, { skipInvalid: parsed.skipInvalid });
  if (!loaded.ok) {
    for (const e of loaded.errors) io.stderrWrite(`${e}\n`);
    const summary = buildAlertReviewQueueSummary({
      queuePath: parsed.queue,
      outputPath: parsed.output,
      alerts: [],
      ok: false,
      errors: loaded.errors,
      warnings: loaded.warnings,
    });
    if (parsed.json) {
      io.stdoutWrite(`${JSON.stringify(compactAlertReviewQueueCliSummary(summary))}\n`);
    }
    return 1;
  }

  let alerts = loaded.alerts;
  const warnings = [...loaded.warnings];
  let updatedIds: string[] = [];
  let applyErrors: string[] = [];
  let ok = true;

  if (!parsed.list) {
    const opts = {
      force: parsed.force,
      reviewNote: parsed.reviewNote,
    };
    let result;
    if (parsed.markReviewed) {
      result = markAlertReviewed(alerts, parsed.markReviewed, opts);
    } else if (parsed.dismiss) {
      result = dismissAlert(alerts, parsed.dismiss, opts);
    } else {
      result = archiveReviewedAndDismissedAlerts(alerts, opts);
    }
    alerts = result.alerts;
    updatedIds = result.updated_alert_ids;
    applyErrors = result.errors;
    ok = result.ok;
    if (!ok) {
      for (const e of applyErrors) io.stderrWrite(`${e}\n`);
    } else if (parsed.output) {
      try {
        io.mkdirSync(dirname(parsed.output));
        io.writeFileUtf8(parsed.output, alertsToJsonl(alerts));
      } catch (err) {
        io.stderrWrite(`Failed to write output: ${String(err)}\n`);
        ok = false;
        applyErrors = [`Failed to write output: ${String(err)}`];
      }
    }
  }

  const summary = buildAlertReviewQueueSummary({
    queuePath: parsed.queue,
    outputPath: parsed.list ? null : parsed.output,
    alerts,
    updatedAlertIds: updatedIds,
    ok: ok && applyErrors.length === 0,
    errors: applyErrors,
    warnings,
  });

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(compactAlertReviewQueueCliSummary(summary))}\n`);
  }

  return summary.ok ? 0 : 1;
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const code = runAlertReviewQueueCli(process.argv.slice(2));
  process.exit(code);
}
