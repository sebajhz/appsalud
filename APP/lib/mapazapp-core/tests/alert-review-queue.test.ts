import { describe, expect, it } from "vitest";
import {
  ALERT_DELIVERY_STATUS,
  ALERT_REVIEW_SCHEMA_VERSION,
  alertsToJsonl,
  buildGovernanceFooter,
  FORBIDDEN_ALERT_WORDING,
  type AlertReviewRecord,
} from "../src/alert-only-review";
import {
  archiveReviewedAndDismissedAlerts,
  buildAlertReviewQueueSummary,
  dismissAlert,
  effectiveReviewStatus,
  loadAlertReviewQueueJsonl,
  markAlertReviewed,
  validateAlertReviewQueueOutput,
} from "../src/alert-review-queue";

const NOW = "2026-05-21T12:00:00.000Z";

function sampleAlert(overrides: Partial<AlertReviewRecord & { review_status?: string }> = {}): AlertReviewRecord & {
  review_status?: string;
} {
  return {
    schema_version: ALERT_REVIEW_SCHEMA_VERSION,
    alert_id: "alert-test-001",
    created_at_utc: NOW,
    source_bundle: "TEST_BUNDLE",
    selected_bundle_id: null,
    symbol: "XAUUSD",
    timeframe: "M15",
    mode: "read_only_review",
    alert_type: "candidate_review",
    decision: "candidate",
    decision_label: "Candidato",
    score: 70,
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
    ...overrides,
  };
}

function toJsonl(...alerts: Array<AlertReviewRecord & { review_status?: string }>): string {
  return alertsToJsonl(alerts as AlertReviewRecord[]);
}

describe("alert-review-queue", () => {
  it("loads valid JSONL queue", () => {
    const jsonl = toJsonl(sampleAlert(), sampleAlert({ alert_id: "alert-test-002" }));
    const result = loadAlertReviewQueueJsonl(jsonl);
    expect(result.ok).toBe(true);
    expect(result.alerts).toHaveLength(2);
    expect(result.errors).toEqual([]);
  });

  it("defaults missing review_status to new", () => {
    const jsonl = toJsonl(sampleAlert());
    const result = loadAlertReviewQueueJsonl(jsonl);
    expect(result.ok).toBe(true);
    expect(effectiveReviewStatus(result.alerts[0]!)).toBe("new");
  });

  it("marks alert reviewed", () => {
    const loaded = loadAlertReviewQueueJsonl(toJsonl(sampleAlert()));
    const applied = markAlertReviewed(loaded.alerts, "alert-test-001", {
      nowUtc: NOW,
      reviewNote: "Reviewed manually",
    });
    expect(applied.ok).toBe(true);
    const alert = applied.alerts[0]!;
    expect(alert.review_status).toBe("reviewed");
    expect(alert.reviewed_at_utc).toBe(NOW);
    expect(alert.review_note).toBe("Reviewed manually");
    expect(alert.updated_at_utc).toBe(NOW);
  });

  it("dismisses alert", () => {
    const loaded = loadAlertReviewQueueJsonl(toJsonl(sampleAlert()));
    const applied = dismissAlert(loaded.alerts, "alert-test-001", {
      nowUtc: NOW,
      reviewNote: "Not relevant",
    });
    expect(applied.ok).toBe(true);
    const alert = applied.alerts[0]!;
    expect(alert.review_status).toBe("dismissed");
    expect(alert.dismissed_at_utc).toBe(NOW);
    expect(alert.review_note).toBe("Not relevant");
  });

  it("archives reviewed and dismissed alerts", () => {
    const jsonl = toJsonl(
      sampleAlert({ alert_id: "a1", review_status: "reviewed", reviewed_at_utc: NOW }),
      sampleAlert({ alert_id: "a2", review_status: "dismissed", dismissed_at_utc: NOW }),
      sampleAlert({ alert_id: "a3" }),
    );
    const loaded = loadAlertReviewQueueJsonl(jsonl);
    const applied = archiveReviewedAndDismissedAlerts(loaded.alerts, { nowUtc: NOW });
    expect(applied.ok).toBe(true);
    expect(applied.updated_alert_ids).toEqual(["a1", "a2"]);
    expect(applied.alerts[0]!.review_status).toBe("archived");
    expect(applied.alerts[1]!.review_status).toBe("archived");
    expect(effectiveReviewStatus(applied.alerts[2]!)).toBe("new");
  });

  it("preserves governance footer", () => {
    const footer = buildGovernanceFooter("es");
    const loaded = loadAlertReviewQueueJsonl(toJsonl(sampleAlert({ governance_footer: footer })));
    const applied = markAlertReviewed(loaded.alerts, "alert-test-001", { nowUtc: NOW });
    expect(applied.alerts[0]!.governance_footer).toEqual(footer);
  });

  it("preserves delivery_status queued_local_only", () => {
    const loaded = loadAlertReviewQueueJsonl(toJsonl(sampleAlert()));
    const applied = markAlertReviewed(loaded.alerts, "alert-test-001", { nowUtc: NOW });
    expect(applied.alerts[0]!.delivery_status).toBe(ALERT_DELIVERY_STATUS);
  });

  it("rejects unknown alert_id", () => {
    const loaded = loadAlertReviewQueueJsonl(toJsonl(sampleAlert()));
    const applied = markAlertReviewed(loaded.alerts, "missing-id", { nowUtc: NOW });
    expect(applied.ok).toBe(false);
    expect(applied.errors[0]).toContain("Unknown alert_id");
  });

  it("rejects invalid JSONL", () => {
    const result = loadAlertReviewQueueJsonl("{ not json }\n");
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("forbidden wording remains absent in output validation", () => {
    const loaded = loadAlertReviewQueueJsonl(toJsonl(sampleAlert()));
    const applied = markAlertReviewed(loaded.alerts, "alert-test-001", {
      nowUtc: NOW,
      reviewNote: "ok note",
    });
    expect(validateAlertReviewQueueOutput(applied.alerts)).toEqual([]);
    for (const phrase of FORBIDDEN_ALERT_WORDING.slice(0, 3)) {
      const bad = markAlertReviewed(loaded.alerts, "alert-test-001", {
        nowUtc: NOW,
        reviewNote: phrase,
      });
      expect(bad.ok).toBe(false);
    }
  });

  it("rejects review on archived alert without force", () => {
    const jsonl = toJsonl(
      sampleAlert({ alert_id: "arch-1", review_status: "archived", archived_at_utc: NOW }),
    );
    const loaded = loadAlertReviewQueueJsonl(jsonl);
    const applied = markAlertReviewed(loaded.alerts, "arch-1", { nowUtc: NOW });
    expect(applied.ok).toBe(false);
    expect(applied.errors[0]).toContain("archived");
  });

  it("builds queue summary with governance flags", () => {
    const loaded = loadAlertReviewQueueJsonl(toJsonl(sampleAlert()));
    const summary = buildAlertReviewQueueSummary({
      queuePath: "/q.jsonl",
      outputPath: "/out.jsonl",
      alerts: loaded.alerts,
    });
    expect(summary.schema_version).toBe("mapazapp_alert_review_queue_summary_v1");
    expect(summary.read_only_review).toBe(true);
    expect(summary.no_live_trading).toBe(true);
    expect(summary.no_gates).toBe(true);
    expect(summary.by_status.new).toBe(1);
  });
});
