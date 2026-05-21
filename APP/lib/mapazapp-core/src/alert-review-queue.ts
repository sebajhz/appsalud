/**
 * E5.21.2 — Local JSONL alert review queue manager (review states only; no channels, no MT5, no trading).
 */

import {
  ALERT_DELIVERY_STATUS,
  ALERT_REVIEW_SCHEMA_VERSION,
  alertRecordContainsForbiddenWording,
  alertsToJsonl,
  findForbiddenAlertWording,
  type AlertReviewRecord,
} from "./alert-only-review";

export { alertsToJsonl };

export const ALERT_REVIEW_QUEUE_SUMMARY_SCHEMA_VERSION =
  "mapazapp_alert_review_queue_summary_v1" as const;

export const ALERT_REVIEW_QUEUE_STATUSES = [
  "new",
  "reviewed",
  "dismissed",
  "archived",
] as const;

export type AlertReviewQueueStatus = (typeof ALERT_REVIEW_QUEUE_STATUSES)[number];

export interface AlertReviewQueueRecord extends AlertReviewRecord {
  review_status: AlertReviewQueueStatus;
  reviewed_at_utc?: string;
  dismissed_at_utc?: string;
  archived_at_utc?: string;
  review_note?: string;
  updated_at_utc?: string;
}

export interface AlertReviewQueueSummary {
  schema_version: typeof ALERT_REVIEW_QUEUE_SUMMARY_SCHEMA_VERSION;
  ok: boolean;
  queue_path: string;
  output_path: string | null;
  total_alerts: number;
  by_status: Record<AlertReviewQueueStatus, number>;
  updated_alert_ids: string[];
  read_only_review: true;
  no_live_trading: true;
  no_gates: true;
  errors: string[];
  warnings: string[];
}

export interface LoadAlertReviewQueueResult {
  ok: boolean;
  alerts: AlertReviewQueueRecord[];
  errors: string[];
  warnings: string[];
}

export interface ApplyAlertReviewQueueResult {
  ok: boolean;
  alerts: AlertReviewQueueRecord[];
  updated_alert_ids: string[];
  errors: string[];
  warnings: string[];
}

export interface AlertReviewQueueManagerOptions {
  nowUtc?: string;
  force?: boolean;
  reviewNote?: string;
}

function defaultNowUtc(): string {
  return new Date().toISOString();
}

export function effectiveReviewStatus(
  record: Partial<Pick<AlertReviewQueueRecord, "review_status">>,
): AlertReviewQueueStatus {
  const s = record.review_status;
  if (s && ALERT_REVIEW_QUEUE_STATUSES.includes(s)) return s;
  return "new";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseQueueLine(
  line: string,
  lineNumber: number,
): { alert?: AlertReviewQueueRecord; error?: string } {
  const trimmed = line.trim();
  if (!trimmed) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { error: `Line ${lineNumber}: invalid JSON` };
  }
  if (!isRecord(parsed)) {
    return { error: `Line ${lineNumber}: expected JSON object` };
  }
  if (parsed.schema_version !== ALERT_REVIEW_SCHEMA_VERSION) {
    return {
      error: `Line ${lineNumber}: schema_version must be ${ALERT_REVIEW_SCHEMA_VERSION}`,
    };
  }
  if (typeof parsed.alert_id !== "string" || !parsed.alert_id.trim()) {
    return { error: `Line ${lineNumber}: alert_id is required` };
  }
  if (!Array.isArray(parsed.governance_footer) || parsed.governance_footer.length === 0) {
    return { error: `Line ${lineNumber}: governance_footer is required` };
  }
  const status = effectiveReviewStatus({
    review_status: parsed.review_status as AlertReviewQueueStatus | undefined,
  });
  const alert = {
    ...parsed,
    review_status: status,
  } as AlertReviewQueueRecord;
  if (alert.delivery_status !== ALERT_DELIVERY_STATUS) {
    return {
      error: `Line ${lineNumber}: delivery_status must remain ${ALERT_DELIVERY_STATUS}`,
    };
  }
  return { alert };
}

export function loadAlertReviewQueueJsonl(
  text: string,
  options?: { skipInvalid?: boolean },
): LoadAlertReviewQueueResult {
  const lines = text.split(/\r?\n/);
  const alerts: AlertReviewQueueRecord[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const lineNumber = i + 1;
    const result = parseQueueLine(line, lineNumber);
    if (result.error) {
      if (options?.skipInvalid) {
        warnings.push(result.error);
        continue;
      }
      errors.push(result.error);
      continue;
    }
    if (!result.alert) continue;
    if (seenIds.has(result.alert.alert_id)) {
      const msg = `Line ${lineNumber}: duplicate alert_id ${result.alert.alert_id}`;
      if (options?.skipInvalid) {
        warnings.push(msg);
        continue;
      }
      errors.push(msg);
      continue;
    }
    seenIds.add(result.alert.alert_id);
    alerts.push(result.alert);
  }

  if (errors.length > 0) {
    return { ok: false, alerts: [], errors, warnings };
  }
  return { ok: true, alerts, errors: [], warnings };
}

export function countAlertsByStatus(
  alerts: AlertReviewQueueRecord[],
): Record<AlertReviewQueueStatus, number> {
  const counts: Record<AlertReviewQueueStatus, number> = {
    new: 0,
    reviewed: 0,
    dismissed: 0,
    archived: 0,
  };
  for (const a of alerts) {
    counts[effectiveReviewStatus(a)] += 1;
  }
  return counts;
}

export function validateAlertReviewQueueOutput(alerts: AlertReviewQueueRecord[]): string[] {
  const errors: string[] = [];
  for (const alert of alerts) {
    const forbidden = alertRecordContainsForbiddenWording(alert);
    if (forbidden) {
      errors.push(`Alert ${alert.alert_id}: forbidden wording: ${forbidden}`);
    }
    if (alert.review_note) {
      const noteHit = findForbiddenAlertWording(alert.review_note);
      if (noteHit) {
        errors.push(`Alert ${alert.alert_id}: forbidden wording in review_note: ${noteHit}`);
      }
    }
    if (!Array.isArray(alert.governance_footer) || alert.governance_footer.length === 0) {
      errors.push(`Alert ${alert.alert_id}: governance_footer is required`);
    }
    if (alert.delivery_status !== ALERT_DELIVERY_STATUS) {
      errors.push(
        `Alert ${alert.alert_id}: delivery_status must be ${ALERT_DELIVERY_STATUS}`,
      );
    }
  }
  return errors;
}

function cloneAlert(alert: AlertReviewQueueRecord): AlertReviewQueueRecord {
  return JSON.parse(JSON.stringify(alert)) as AlertReviewQueueRecord;
}

function assertNotArchived(
  alert: AlertReviewQueueRecord,
  action: string,
  force?: boolean,
): string | null {
  if (effectiveReviewStatus(alert) === "archived" && !force) {
    return `Cannot ${action} archived alert ${alert.alert_id} without --force`;
  }
  return null;
}

function applyReviewNote(
  alert: AlertReviewQueueRecord,
  reviewNote: string | undefined,
  nowUtc: string,
): void {
  if (reviewNote !== undefined && reviewNote.length > 0) {
    alert.review_note = reviewNote;
  }
  alert.updated_at_utc = nowUtc;
}

export function markAlertReviewed(
  alerts: AlertReviewQueueRecord[],
  alertId: string,
  options: AlertReviewQueueManagerOptions = {},
): ApplyAlertReviewQueueResult {
  const nowUtc = options.nowUtc ?? defaultNowUtc();
  const updated = alerts.map(cloneAlert);
  const idx = updated.findIndex((a) => a.alert_id === alertId);
  if (idx < 0) {
    return {
      ok: false,
      alerts: updated,
      updated_alert_ids: [],
      errors: [`Unknown alert_id: ${alertId}`],
      warnings: [],
    };
  }
  const target = updated[idx]!;
  const archivedErr = assertNotArchived(target, "review", options.force);
  if (archivedErr) {
    return {
      ok: false,
      alerts: updated,
      updated_alert_ids: [],
      errors: [archivedErr],
      warnings: [],
    };
  }
  target.review_status = "reviewed";
  target.reviewed_at_utc = nowUtc;
  applyReviewNote(target, options.reviewNote, nowUtc);
  const validationErrors = validateAlertReviewQueueOutput(updated);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      alerts: updated,
      updated_alert_ids: [],
      errors: validationErrors,
      warnings: [],
    };
  }
  return {
    ok: true,
    alerts: updated,
    updated_alert_ids: [alertId],
    errors: [],
    warnings: [],
  };
}

export function dismissAlert(
  alerts: AlertReviewQueueRecord[],
  alertId: string,
  options: AlertReviewQueueManagerOptions = {},
): ApplyAlertReviewQueueResult {
  const nowUtc = options.nowUtc ?? defaultNowUtc();
  const updated = alerts.map(cloneAlert);
  const idx = updated.findIndex((a) => a.alert_id === alertId);
  if (idx < 0) {
    return {
      ok: false,
      alerts: updated,
      updated_alert_ids: [],
      errors: [`Unknown alert_id: ${alertId}`],
      warnings: [],
    };
  }
  const target = updated[idx]!;
  const archivedErr = assertNotArchived(target, "dismiss", options.force);
  if (archivedErr) {
    return {
      ok: false,
      alerts: updated,
      updated_alert_ids: [],
      errors: [archivedErr],
      warnings: [],
    };
  }
  target.review_status = "dismissed";
  target.dismissed_at_utc = nowUtc;
  applyReviewNote(target, options.reviewNote, nowUtc);
  const validationErrors = validateAlertReviewQueueOutput(updated);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      alerts: updated,
      updated_alert_ids: [],
      errors: validationErrors,
      warnings: [],
    };
  }
  return {
    ok: true,
    alerts: updated,
    updated_alert_ids: [alertId],
    errors: [],
    warnings: [],
  };
}

export function archiveReviewedAndDismissedAlerts(
  alerts: AlertReviewQueueRecord[],
  options: AlertReviewQueueManagerOptions = {},
): ApplyAlertReviewQueueResult {
  const nowUtc = options.nowUtc ?? defaultNowUtc();
  const updated = alerts.map(cloneAlert);
  const updatedIds: string[] = [];

  for (const alert of updated) {
    const status = effectiveReviewStatus(alert);
    if (status === "reviewed" || status === "dismissed") {
      alert.review_status = "archived";
      alert.archived_at_utc = nowUtc;
      alert.updated_at_utc = nowUtc;
      if (options.reviewNote !== undefined && options.reviewNote.length > 0) {
        alert.review_note = options.reviewNote;
      }
      updatedIds.push(alert.alert_id);
    }
  }

  const validationErrors = validateAlertReviewQueueOutput(updated);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      alerts: updated,
      updated_alert_ids: [],
      errors: validationErrors,
      warnings: [],
    };
  }

  return {
    ok: true,
    alerts: updated,
    updated_alert_ids: updatedIds,
    errors: [],
    warnings: [],
  };
}

export function buildAlertReviewQueueSummary(params: {
  queuePath: string;
  outputPath: string | null;
  alerts: AlertReviewQueueRecord[];
  updatedAlertIds?: string[];
  ok?: boolean;
  errors?: string[];
  warnings?: string[];
}): AlertReviewQueueSummary {
  return {
    schema_version: ALERT_REVIEW_QUEUE_SUMMARY_SCHEMA_VERSION,
    ok: params.ok ?? true,
    queue_path: params.queuePath,
    output_path: params.outputPath,
    total_alerts: params.alerts.length,
    by_status: countAlertsByStatus(params.alerts),
    updated_alert_ids: params.updatedAlertIds ?? [],
    read_only_review: true,
    no_live_trading: true,
    no_gates: true,
    errors: params.errors ?? [],
    warnings: params.warnings ?? [],
  };
}

export function compactAlertReviewQueueCliSummary(
  summary: AlertReviewQueueSummary,
): Record<string, unknown> {
  return {
    schema_version: summary.schema_version,
    ok: summary.ok,
    queue_path: summary.queue_path,
    output_path: summary.output_path,
    total_alerts: summary.total_alerts,
    by_status: summary.by_status,
    updated_alert_ids: summary.updated_alert_ids,
    read_only_review: summary.read_only_review,
    no_live_trading: summary.no_live_trading,
    no_gates: summary.no_gates,
    errors: summary.errors,
    warnings: summary.warnings,
  };
}
