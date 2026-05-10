/**
 * D6.1 — Dashboard runtime status data source (read-only GET /api/mapazapp/runtime/status).
 * Service layer only: no UI, no polling, no WebSocket.
 */

import type {
  OverallRuntimeStatus,
  RuntimeComponentStatus,
  RuntimeMode,
} from "@workspace/mapazapp-core";

export type RuntimeStatusViewSource = "api" | "unavailable" | "blocked";

export interface RuntimeStatusSafetyView {
  executionEnabled: boolean;
  sendToMt5Enabled: boolean;
  canAutoExecute: boolean;
  autoApprovalEnabled: boolean;
  registryMutationAllowed: boolean;
  manualReviewRequired: boolean;
}

export interface RuntimeStatusViewModel {
  ok: boolean;
  source: RuntimeStatusViewSource;
  runtimeMode: RuntimeMode | "unknown";
  apiStatus: RuntimeComponentStatus | "unknown";
  dashboardStatus: RuntimeComponentStatus | "unknown";
  mt5Status: RuntimeComponentStatus | "unknown";
  bridgeStatus: RuntimeComponentStatus | "unknown";
  overallStatus: OverallRuntimeStatus | "unknown";
  message: string;
  safety: RuntimeStatusSafetyView;
}

export interface RuntimeStatusDataSource {
  getRuntimeStatus(): Promise<RuntimeStatusViewModel>;
}

export interface HttpRuntimeStatusDataSourceOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const UNCONFIGURED_BASE_MSG =
  "API base URL is not configured. Runtime status is unavailable in the dashboard.";

const COMPONENT_STATUSES = new Set<string>([
  "unknown",
  "not_configured",
  "not_checked",
  "not_started",
  "starting",
  "ok",
  "available",
  "detected",
  "stale",
  "missing",
  "not_found",
  "degraded",
  "blocked",
  "error",
]);

const RUNTIME_MODES = new Set<string>([
  "mock",
  "manual-import",
  "historical",
  "live-read-only",
  "disabled",
  "error",
]);

const OVERALL_STATUSES = new Set<string>(["unknown", "ok", "degraded", "blocked", "error"]);

const UNSAFE_BOOL_KEYS = [
  "executionEnabled",
  "sendToMt5Enabled",
  "canAutoExecute",
  "autoApprovalEnabled",
  "registryMutationAllowed",
] as const;

/** Case-insensitive substrings that must not appear in API JSON (conservative dashboard posture). */
const DANGEROUS_SUBSTRINGS_LOWER = [
  "ready to trade",
  "ready for trading",
  "execute order",
  "send order",
  "ordersend",
  "ctrade",
  "mt5 connected",
  "bridge connected",
  "live trading",
  "real trading",
] as const;

const PRIVATE_PATH_MARKERS = [
  "appdata",
  "metaquotes",
  "terminal64.exe",
  "c:\\\\users",
  "/users/",
] as const;

const APPROVED_TRUE_RE = /"approved"\s*:\s*true\b/;
const EXECUTION_TRUE_RE = /"executionEnabled"\s*:\s*true\b/;
const SEND_MT5_TRUE_RE = /"sendToMt5Enabled"\s*:\s*true\b/;
const CAN_AUTO_EXEC_TRUE_RE = /"canAutoExecute"\s*:\s*true\b/;
const AUTO_APPROVAL_TRUE_RE = /"autoApprovalEnabled"\s*:\s*true\b/;
const REGISTRY_MUT_TRUE_RE = /"registryMutationAllowed"\s*:\s*true\b/;

function conservativeSafety(): RuntimeStatusSafetyView {
  return {
    executionEnabled: false,
    sendToMt5Enabled: false,
    canAutoExecute: false,
    autoApprovalEnabled: false,
    registryMutationAllowed: false,
    manualReviewRequired: true,
  };
}

export function createUnavailableRuntimeStatusViewModel(reason: string): RuntimeStatusViewModel {
  return {
    ok: false,
    source: "unavailable",
    runtimeMode: "unknown",
    apiStatus: "unknown",
    dashboardStatus: "unknown",
    mt5Status: "not_configured",
    bridgeStatus: "not_configured",
    overallStatus: "unknown",
    message: reason,
    safety: conservativeSafety(),
  };
}

function createBlockedRuntimeStatusViewModel(message: string): RuntimeStatusViewModel {
  return {
    ok: false,
    source: "blocked",
    runtimeMode: "unknown",
    apiStatus: "unknown",
    dashboardStatus: "unknown",
    mt5Status: "unknown",
    bridgeStatus: "unknown",
    overallStatus: "blocked",
    message,
    safety: conservativeSafety(),
  };
}

function normalizeRuntimeStatusApiBaseUrl(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  const t = url.trim();
  if (t === "") return undefined;
  return t.replace(/\/+$/, "");
}

/** Read `VITE_MAPAZAPP_API_BASE_URL` from a provided env bag (e.g. `import.meta.env` in Vite). */
export function getRuntimeStatusApiBaseUrlFromEnv(
  env: Record<string, string | undefined>,
): string | undefined {
  return normalizeRuntimeStatusApiBaseUrl(env.VITE_MAPAZAPP_API_BASE_URL);
}

function pickComponentStatus(value: unknown): RuntimeComponentStatus | "unknown" {
  return typeof value === "string" && COMPONENT_STATUSES.has(value) ?
      (value as RuntimeComponentStatus)
    : "unknown";
}

function pickRuntimeMode(value: unknown): RuntimeMode | "unknown" {
  return typeof value === "string" && RUNTIME_MODES.has(value) ? (value as RuntimeMode) : "unknown";
}

function pickOverallStatus(value: unknown): OverallRuntimeStatus | "unknown" {
  return typeof value === "string" && OVERALL_STATUSES.has(value) ?
      (value as OverallRuntimeStatus)
    : "unknown";
}

function recordUnsafeBooleans(obj: Record<string, unknown>): boolean {
  for (const k of UNSAFE_BOOL_KEYS) {
    if (obj[k] === true) return true;
  }
  return false;
}

function scanJsonForOperationalUnsafe(json: string): boolean {
  if (
    EXECUTION_TRUE_RE.test(json) ||
    SEND_MT5_TRUE_RE.test(json) ||
    CAN_AUTO_EXEC_TRUE_RE.test(json) ||
    AUTO_APPROVAL_TRUE_RE.test(json) ||
    REGISTRY_MUT_TRUE_RE.test(json) ||
    APPROVED_TRUE_RE.test(json)
  ) {
    return true;
  }
  const low = json.toLowerCase();
  for (const s of DANGEROUS_SUBSTRINGS_LOWER) {
    if (low.includes(s)) return true;
  }
  return false;
}

function scanJsonForPrivatePathMarkers(json: string): boolean {
  const low = json.toLowerCase();
  for (const m of PRIVATE_PATH_MARKERS) {
    if (low.includes(m)) return true;
  }
  return false;
}

function readSafetySlice(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function mapSafetyFromData(dataSafety: Record<string, unknown> | null): RuntimeStatusSafetyView {
  if (!dataSafety) return conservativeSafety();
  return {
    executionEnabled: dataSafety.executionEnabled === true,
    sendToMt5Enabled: dataSafety.sendToMt5Enabled === true,
    canAutoExecute: dataSafety.canAutoExecute === true,
    autoApprovalEnabled: dataSafety.autoApprovalEnabled === true,
    registryMutationAllowed: dataSafety.registryMutationAllowed === true,
    manualReviewRequired: dataSafety.manualReviewRequired !== false,
  };
}

function mapDataToViewModel(data: Record<string, unknown>): RuntimeStatusViewModel {
  const api = data.api && typeof data.api === "object" && !Array.isArray(data.api) ?
      (data.api as Record<string, unknown>)
    : null;
  const dashboard =
    data.dashboard && typeof data.dashboard === "object" && !Array.isArray(data.dashboard) ?
      (data.dashboard as Record<string, unknown>)
    : null;
  const mt5 = data.mt5 && typeof data.mt5 === "object" && !Array.isArray(data.mt5) ?
      (data.mt5 as Record<string, unknown>)
    : null;
  const bridge =
    data.bridge && typeof data.bridge === "object" && !Array.isArray(data.bridge) ?
      (data.bridge as Record<string, unknown>)
    : null;
  const overall =
    data.overall && typeof data.overall === "object" && !Array.isArray(data.overall) ?
      (data.overall as Record<string, unknown>)
    : null;

  const overallStatus = pickOverallStatus(overall?.status);
  const message =
    typeof overall?.message === "string" && overall.message.length > 0 ?
      overall.message
    : "Runtime status summary unavailable.";

  const safety = mapSafetyFromData(readSafetySlice(data.safety));

  const vm: RuntimeStatusViewModel = {
    ok: overallStatus === "ok",
    source: "api",
    runtimeMode: pickRuntimeMode(data.runtimeMode),
    apiStatus: pickComponentStatus(api?.status),
    dashboardStatus: pickComponentStatus(dashboard?.status),
    mt5Status: pickComponentStatus(mt5?.status),
    bridgeStatus: pickComponentStatus(bridge?.status),
    overallStatus,
    message,
    safety,
  };

  return vm;
}

async function fetchRuntimeStatusJson(
  baseUrl: string,
  fetchImpl: typeof fetch,
  timeoutMs: number | undefined,
): Promise<{ ok: boolean; text: string }> {
  const url = `${baseUrl}/api/mapazapp/runtime/status`;
  const controller = new AbortController();
  const tid =
    timeoutMs !== undefined && timeoutMs > 0 ?
      setTimeout(() => {
        controller.abort();
      }, timeoutMs)
    : undefined;
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    return { ok: res.ok, text };
  } finally {
    if (tid !== undefined) clearTimeout(tid);
  }
}

export function createHttpRuntimeStatusDataSource(
  options?: HttpRuntimeStatusDataSourceOptions,
): RuntimeStatusDataSource {
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options?.timeoutMs;

  return {
    async getRuntimeStatus(): Promise<RuntimeStatusViewModel> {
      const base = normalizeRuntimeStatusApiBaseUrl(options?.apiBaseUrl);
      if (!base) {
        return createUnavailableRuntimeStatusViewModel(UNCONFIGURED_BASE_MSG);
      }

      let text: string;
      let httpOk: boolean;
      try {
        const r = await fetchRuntimeStatusJson(base, fetchImpl, timeoutMs);
        text = r.text;
        httpOk = r.ok;
      } catch {
        return createUnavailableRuntimeStatusViewModel(
          "Runtime status unavailable: network request failed.",
        );
      }

      if (!httpOk) {
        return createUnavailableRuntimeStatusViewModel(
          "Runtime status unavailable: API returned an error status.",
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return createUnavailableRuntimeStatusViewModel(
          "Runtime status unavailable: response was not valid JSON.",
        );
      }

      const rawJsonScan = JSON.stringify(parsed);
      if (scanJsonForOperationalUnsafe(rawJsonScan)) {
        return createBlockedRuntimeStatusViewModel(
          "Runtime status blocked: response contained unsafe execution wording or disallowed flags.",
        );
      }
      if (scanJsonForPrivatePathMarkers(rawJsonScan)) {
        return createBlockedRuntimeStatusViewModel(
          "Runtime status blocked: response contained sensitive path markers.",
        );
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return createUnavailableRuntimeStatusViewModel(
          "Runtime status unavailable: API response envelope was invalid.",
        );
      }

      const envelope = parsed as Record<string, unknown>;

      if (recordUnsafeBooleans(envelope)) {
        return createBlockedRuntimeStatusViewModel(
          "Runtime status blocked: unsafe execution or automation flags were present on the API envelope.",
        );
      }

      if (envelope.ok !== true) {
        return createUnavailableRuntimeStatusViewModel(
          "Runtime status unavailable: API response envelope was invalid.",
        );
      }

      const dataRaw = envelope.data;
      if (!dataRaw || typeof dataRaw !== "object" || Array.isArray(dataRaw)) {
        return createUnavailableRuntimeStatusViewModel(
          "Runtime status unavailable: API response envelope was invalid.",
        );
      }

      const data = dataRaw as Record<string, unknown>;

      const safety = readSafetySlice(data.safety);
      if (!safety || recordUnsafeBooleans(safety)) {
        return createBlockedRuntimeStatusViewModel(
          "Runtime status blocked: unsafe execution or automation flags were present under data.safety.",
        );
      }
      if (safety.manualReviewRequired === false) {
        return createBlockedRuntimeStatusViewModel(
          "Runtime status blocked: manual review must remain required for this posture.",
        );
      }

      return mapDataToViewModel(data);
    },
  };
}
