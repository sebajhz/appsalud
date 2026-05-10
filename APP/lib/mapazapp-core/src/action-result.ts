/**
 * D7.2 — Pure shared ActionResult model for future dashboard / API / launcher workflows.
 * No HTTP, no process spawn, no MT5. Aligns with ACTION_BRIDGE_DESIGN.md §6.
 */

import type { MapazappRuntimeStatus } from "./runtime-status";

/** Documented future action IDs (D4.1 / ACTION_BRIDGE_DESIGN §9). */
export const MAPAZAPP_ACTION_IDS = [
  "validate_environment",
  "start_mapazapp_dev",
  "validate_csv",
  "show_runtime_status",
  "validate_mt5_config",
  "open_mt5",
  "stop_mapazapp",
  "open_logs",
] as const;

export type MapazappActionId = (typeof MAPAZAPP_ACTION_IDS)[number];

export type MapazappActionStatus =
  | "not_available"
  | "blocked"
  | "pending"
  | "running"
  | "ok"
  | "warning"
  | "error";

export type MapazappActionSource =
  | "dashboard"
  | "api"
  | "launcher"
  | "script"
  | "unknown";

export interface MapazappActionSafety {
  executionEnabled: boolean;
  sendToMt5Enabled: boolean;
  canAutoExecute: boolean;
  autoApprovalEnabled: boolean;
  registryMutationAllowed: boolean;
  manualReviewRequired: boolean;
}

export interface MapazappActionResult {
  ok: boolean;
  actionId: MapazappActionId;
  status: MapazappActionStatus;
  source: MapazappActionSource;
  message: string;
  safety: MapazappActionSafety;
  /** Optional snapshot; omit when not applicable. */
  runtimeStatus?: MapazappRuntimeStatus | null;
  logsPreview: string[];
  warnings: string[];
  errors: string[];
  generatedAt: string;
}

export interface CreateActionResultBaseOptions {
  source?: MapazappActionSource;
  generatedAt?: string;
  warnings?: string[];
  errors?: string[];
  logsPreview?: string[];
  runtimeStatus?: MapazappRuntimeStatus | null;
}

const PRIVATE_PATH_SUBSTRINGS_LOWER = [
  "appdata",
  "metaquotes",
  "terminal64.exe",
  "c:\\users",
  "/users/",
] as const;

const OPERATIONAL_SUBSTRINGS_LOWER = [
  "ready to trade",
  "ready for trading",
  "live trading",
  "real trading",
  "execute order",
  "send order",
  "ordersend",
  "ctrade",
  "mt5 connected",
  "bridge connected",
] as const;

/** Logs / diagnostics only — short broker-credential hints (word-boundary match). */
const CREDENTIAL_WORD_RE = /\b(login|account|balance|equity|investor|server)\b/i;

const APPROVED_TRUE_RE = /"approved"\s*:\s*true\b/;
const EXECUTION_TRUE_RE = /"executionEnabled"\s*:\s*true\b/;
const SEND_MT5_TRUE_RE = /"sendToMt5Enabled"\s*:\s*true\b/;
const CAN_AUTO_EXEC_TRUE_RE = /"canAutoExecute"\s*:\s*true\b/;
const AUTO_APPROVAL_TRUE_RE = /"autoApprovalEnabled"\s*:\s*true\b/;
const REGISTRY_MUT_TRUE_RE = /"registryMutationAllowed"\s*:\s*true\b/;

export function createDefaultActionSafety(): MapazappActionSafety {
  return {
    executionEnabled: false,
    sendToMt5Enabled: false,
    canAutoExecute: false,
    autoApprovalEnabled: false,
    registryMutationAllowed: false,
    manualReviewRequired: true,
  };
}

function defaultGeneratedAt(explicit?: string): string {
  return explicit ?? new Date().toISOString();
}

function scanLowercasePrivateAndOperational(text: string): string | null {
  const low = text.toLowerCase();
  for (const s of PRIVATE_PATH_SUBSTRINGS_LOWER) {
    if (low.includes(s)) {
      return `Disallowed private or path marker substring: ${s}`;
    }
  }
  for (const s of OPERATIONAL_SUBSTRINGS_LOWER) {
    if (low.includes(s)) {
      return `Disallowed operational substring: ${s}`;
    }
  }
  return null;
}

function scanLogLikeLine(line: string): string | null {
  const pathOrOps = scanLowercasePrivateAndOperational(line);
  if (pathOrOps) return pathOrOps;
  if (CREDENTIAL_WORD_RE.test(line)) {
    return "Disallowed credential-related token in logs or diagnostics.";
  }
  return null;
}

export interface ActionResultSafetyAssertion {
  ok: boolean;
  errors: string[];
}

/**
 * Validates structural safety flags and scans human-readable fields for forbidden leakage patterns.
 * Does not prove absence of all secrets — callers must still redact at source.
 */
export function assertActionResultSafety(result: MapazappActionResult): ActionResultSafetyAssertion {
  const errors: string[] = [];
  const s = result.safety;

  if (s.executionEnabled) errors.push("executionEnabled must be false.");
  if (s.sendToMt5Enabled) errors.push("sendToMt5Enabled must be false.");
  if (s.canAutoExecute) errors.push("canAutoExecute must be false.");
  if (s.autoApprovalEnabled) errors.push("autoApprovalEnabled must be false.");
  if (s.registryMutationAllowed) errors.push("registryMutationAllowed must be false.");
  if (!s.manualReviewRequired) errors.push("manualReviewRequired must be true.");

  const msgIssue = scanLowercasePrivateAndOperational(result.message);
  if (msgIssue) errors.push(`${msgIssue} (message)`);

  for (const line of result.logsPreview) {
    const hit = scanLogLikeLine(line);
    if (hit) errors.push(`${hit} (logsPreview)`);
  }
  for (const line of result.warnings) {
    const hit = scanLogLikeLine(line);
    if (hit) errors.push(`${hit} (warnings)`);
  }
  for (const line of result.errors) {
    const hit = scanLogLikeLine(line);
    if (hit) errors.push(`${hit} (errors)`);
  }

  let rawJson: string;
  try {
    rawJson = JSON.stringify(serializeActionResult(result));
  } catch {
    errors.push("ActionResult could not be serialized for JSON safety scan.");
    return { ok: false, errors };
  }

  if (
    EXECUTION_TRUE_RE.test(rawJson) ||
    SEND_MT5_TRUE_RE.test(rawJson) ||
    CAN_AUTO_EXEC_TRUE_RE.test(rawJson) ||
    AUTO_APPROVAL_TRUE_RE.test(rawJson) ||
    REGISTRY_MUT_TRUE_RE.test(rawJson) ||
    APPROVED_TRUE_RE.test(rawJson)
  ) {
    errors.push("Serialized action result contained unsafe execution or approval JSON tokens.");
  }

  const lowJson = rawJson.toLowerCase();
  for (const s of OPERATIONAL_SUBSTRINGS_LOWER) {
    if (lowJson.includes(s)) {
      errors.push(`Serialized JSON contained operational substring: ${s}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function createActionNotAvailableResult(
  actionId: MapazappActionId,
  message?: string,
  options?: CreateActionResultBaseOptions,
): MapazappActionResult {
  const msg = message ?? "Action bridge is not implemented yet.";
  return {
    ok: false,
    actionId,
    status: "not_available",
    source: options?.source ?? "unknown",
    message: msg,
    safety: createDefaultActionSafety(),
    runtimeStatus: options?.runtimeStatus,
    logsPreview: options?.logsPreview ?? [],
    warnings: options?.warnings ?? [],
    errors: options?.errors ?? [],
    generatedAt: defaultGeneratedAt(options?.generatedAt),
  };
}

export function createBlockedActionResult(
  actionId: MapazappActionId,
  message: string,
  options?: CreateActionResultBaseOptions,
): MapazappActionResult {
  const errs = options?.errors ?? (message.length > 0 ? [message] : []);
  return {
    ok: false,
    actionId,
    status: "blocked",
    source: options?.source ?? "unknown",
    message,
    safety: createDefaultActionSafety(),
    runtimeStatus: options?.runtimeStatus,
    logsPreview: options?.logsPreview ?? [],
    warnings: options?.warnings ?? [],
    errors: errs,
    generatedAt: defaultGeneratedAt(options?.generatedAt),
  };
}

/**
 * Read-only success posture only — does not execute anything.
 * Do not use to imply start/stop/open-MT5 completed unless a future governed layer sets fields explicitly.
 */
export function createSuccessfulReadOnlyActionResult(
  actionId: MapazappActionId,
  message: string,
  options?: CreateActionResultBaseOptions,
): MapazappActionResult {
  return {
    ok: true,
    actionId,
    status: "ok",
    source: options?.source ?? "unknown",
    message,
    safety: createDefaultActionSafety(),
    runtimeStatus: options?.runtimeStatus,
    logsPreview: options?.logsPreview ?? [],
    warnings: options?.warnings ?? [],
    errors: options?.errors ?? [],
    generatedAt: defaultGeneratedAt(options?.generatedAt),
  };
}

export function serializeActionResult(result: MapazappActionResult): Record<string, unknown> {
  const sanitized = JSON.parse(
    JSON.stringify(result, (_key, value: unknown) => {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return null;
      }
      return value;
    }),
  ) as Record<string, unknown>;
  return sanitized;
}
