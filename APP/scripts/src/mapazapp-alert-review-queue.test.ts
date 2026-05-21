/**
 * E5.21.2 — CLI tests for mapazapp:alert-review-queue
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  ALERT_DELIVERY_STATUS,
  ALERT_REVIEW_SCHEMA_VERSION,
  alertsToJsonl,
  buildGovernanceFooter,
} from "@workspace/mapazapp-core";
import {
  runAlertReviewQueueCli,
  type AlertReviewQueueCliIo,
} from "./mapazapp-alert-review-queue";

const NOW = "2026-05-21T12:00:00.000Z";

function sampleQueueJsonl(): string {
  const alert = {
    schema_version: ALERT_REVIEW_SCHEMA_VERSION,
    alert_id: "cli-alert-001",
    created_at_utc: NOW,
    source_bundle: "CLI_QUEUE_BUNDLE",
    selected_bundle_id: null,
    symbol: "XAUUSD",
    timeframe: "M15",
    mode: "read_only_review",
    alert_type: "candidate_review",
    decision: "candidate",
    decision_label: "Candidato",
    score: 72,
    grade: "B",
    blocker_or_main_reason: null,
    warning_count: 0,
    top_reasons: [],
    casebook_refs: [],
    title: "Candidato — revisión manual",
    message: "El setup puede revisarse manualmente. Esto no es permiso de entrada.",
    governance_footer: buildGovernanceFooter("es"),
    severity: "review",
    delivery_status: ALERT_DELIVERY_STATUS,
  };
  return alertsToJsonl([alert]);
}

function makeIo(root: string): { io: AlertReviewQueueCliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: AlertReviewQueueCliIo = {
    stdoutWrite: (s) => stdout.push(s),
    stderrWrite: (s) => stderr.push(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    mkdirSync: (p) => mkdirSync(p, { recursive: true }),
  };
  return { io, stdout, stderr };
}

test("alert-review-queue --list prints summary", () => {
  const root = mkdtempSync(join(tmpdir(), "arq-list-"));
  try {
    const queuePath = join(root, "alert_review_queue.jsonl");
    writeFileSync(queuePath, sampleQueueJsonl(), "utf8");
    const { io, stdout } = makeIo(root);
    const code = runAlertReviewQueueCli(["--queue", queuePath, "--list", "--json"], io);
    assert.equal(code, 0);
    const summary = JSON.parse(stdout.join("").trim()) as Record<string, unknown>;
    assert.equal(summary.total_alerts, 1);
    assert.equal((summary.by_status as { new: number }).new, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-review-queue --mark-reviewed writes output JSONL", () => {
  const root = mkdtempSync(join(tmpdir(), "arq-reviewed-"));
  try {
    const queuePath = join(root, "alert_review_queue.jsonl");
    const outPath = join(root, "alert_review_queue.updated.jsonl");
    writeFileSync(queuePath, sampleQueueJsonl(), "utf8");
    const original = readFileSync(queuePath, "utf8");
    const { io } = makeIo(root);
    const code = runAlertReviewQueueCli(
      [
        "--queue",
        queuePath,
        "--output",
        outPath,
        "--mark-reviewed",
        "cli-alert-001",
        "--review-note",
        "Reviewed manually",
      ],
      io,
    );
    assert.equal(code, 0);
    assert.equal(readFileSync(queuePath, "utf8"), original);
    const updated = JSON.parse(readFileSync(outPath, "utf8").trim().split("\n")[0]!) as {
      review_status: string;
      reviewed_at_utc: string;
      review_note: string;
    };
    assert.equal(updated.review_status, "reviewed");
    assert.ok(updated.reviewed_at_utc);
    assert.equal(updated.review_note, "Reviewed manually");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-review-queue --dismiss writes output JSONL", () => {
  const root = mkdtempSync(join(tmpdir(), "arq-dismiss-"));
  try {
    const queuePath = join(root, "alert_review_queue.jsonl");
    const outPath = join(root, "out.jsonl");
    writeFileSync(queuePath, sampleQueueJsonl(), "utf8");
    const { io } = makeIo(root);
    const code = runAlertReviewQueueCli(
      ["--queue", queuePath, "--output", outPath, "--dismiss", "cli-alert-001", "--review-note", "Not relevant"],
      io,
    );
    assert.equal(code, 0);
    const line = JSON.parse(readFileSync(outPath, "utf8").trim()) as { review_status: string };
    assert.equal(line.review_status, "dismissed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-review-queue --archive-reviewed writes output JSONL", () => {
  const root = mkdtempSync(join(tmpdir(), "arq-archive-"));
  try {
    const queuePath = join(root, "q.jsonl");
    const outPath = join(root, "out.jsonl");
    const base = JSON.parse(sampleQueueJsonl().trim()) as Record<string, unknown>;
    base.review_status = "reviewed";
    base.reviewed_at_utc = NOW;
    writeFileSync(queuePath, `${JSON.stringify(base)}\n`, "utf8");
    const { io } = makeIo(root);
    const code = runAlertReviewQueueCli(
      ["--queue", queuePath, "--output", outPath, "--archive-reviewed"],
      io,
    );
    assert.equal(code, 0);
    const line = JSON.parse(readFileSync(outPath, "utf8").trim()) as { review_status: string };
    assert.equal(line.review_status, "archived");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-review-queue invalid queue fails cleanly", () => {
  const root = mkdtempSync(join(tmpdir(), "arq-invalid-"));
  try {
    const queuePath = join(root, "bad.jsonl");
    writeFileSync(queuePath, "not-json\n", "utf8");
    const { io, stderr } = makeIo(root);
    const code = runAlertReviewQueueCli(["--queue", queuePath, "--list", "--json"], io);
    assert.equal(code, 1);
    assert.ok(stderr.join("").includes("invalid JSON"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-review-queue unknown alert id fails cleanly", () => {
  const root = mkdtempSync(join(tmpdir(), "arq-unknown-"));
  try {
    const queuePath = join(root, "q.jsonl");
    const outPath = join(root, "out.jsonl");
    writeFileSync(queuePath, sampleQueueJsonl(), "utf8");
    const { io, stderr } = makeIo(root);
    const code = runAlertReviewQueueCli(
      ["--queue", queuePath, "--output", outPath, "--mark-reviewed", "does-not-exist"],
      io,
    );
    assert.equal(code, 1);
    assert.ok(stderr.join("").includes("Unknown alert_id"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("alert-review-queue --json prints compact summary", () => {
  const root = mkdtempSync(join(tmpdir(), "arq-json-"));
  try {
    const queuePath = join(root, "q.jsonl");
    writeFileSync(queuePath, sampleQueueJsonl(), "utf8");
    const { io, stdout } = makeIo(root);
    runAlertReviewQueueCli(["--queue", queuePath, "--list", "--json"], io);
    const raw = stdout.join("").trim();
    assert.ok(!raw.includes("\n\n"));
    const parsed = JSON.parse(raw) as { schema_version: string };
    assert.equal(parsed.schema_version, "mapazapp_alert_review_queue_summary_v1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
