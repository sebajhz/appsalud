/**
 * D4 / D5.1a — Pure TypeScript runtime status model (no probes, no MT5, no HTTP).
 * Shared in `@workspace/mapazapp-core` for scripts, future API, dashboard, and launcher.
 * Aligned with LAUNCHER_CONFIG_AND_STATUS_DESIGN.md.
 * Dev scripts (D3.x) do not consume this module yet.
 */

export type RuntimeComponentStatus =
  | "unknown"
  | "not_configured"
  | "not_checked"
  | "not_started"
  | "starting"
  | "ok"
  | "available"
  | "detected"
  | "stale"
  | "missing"
  | "not_found"
  | "degraded"
  | "blocked"
  | "error";

export type RuntimeMode =
  | "mock"
  | "manual-import"
  | "historical"
  | "live-read-only"
  | "disabled"
  | "error";

export type OverallRuntimeStatus =
  | "unknown"
  | "ok"
  | "degraded"
  | "blocked"
  | "error";

export type DataSourceMode =
  | "mock"
  | "manual-import"
  | "historical"
  | "live-read-only"
  | "unknown";

export interface ApiRuntimeSlice {
  status: RuntimeComponentStatus;
  url: string | null;
  port: number | null;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface DashboardRuntimeSlice {
  status: RuntimeComponentStatus;
  url: string | null;
  port: number | null;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface Mt5RuntimeSlice {
  status: RuntimeComponentStatus;
  enabled: boolean;
  terminalPath: string | null;
  dataFolder: string | null;
  mql5FilesFolder: string | null;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface BridgeRuntimeSlice {
  status: RuntimeComponentStatus;
  enabled: boolean;
  bridgeFolder: string | null;
  expectedFiles: string[];
  lastSeenAt: string | null;
  lastFile: string | null;
  error: string | null;
}

export interface DataRuntimeSlice {
  status: RuntimeComponentStatus;
  sourceMode: DataSourceMode;
  symbol: string | null;
  timeframe: string | null;
  candleCount: number | null;
  lastCandleTime: string | null;
  warnings: string[];
}

export interface SafetyRuntimeSlice {
  executionEnabled: boolean;
  sendToMt5Enabled: boolean;
  canAutoExecute: boolean;
  autoApprovalEnabled: boolean;
  registryMutationAllowed: boolean;
  manualReviewRequired: boolean;
}

export interface OverallRuntimeSlice {
  status: OverallRuntimeStatus;
  message: string;
}

export interface MapazappRuntimeStatus {
  runtimeMode: RuntimeMode;
  api: ApiRuntimeSlice;
  dashboard: DashboardRuntimeSlice;
  mt5: Mt5RuntimeSlice;
  bridge: BridgeRuntimeSlice;
  data: DataRuntimeSlice;
  safety: SafetyRuntimeSlice;
  overall: OverallRuntimeSlice;
  generatedAt: string | null;
}

export interface CreateDefaultRuntimeStatusOptions {
  runtimeMode?: RuntimeMode;
  generatedAt?: string | null;
  apiStatus?: RuntimeComponentStatus;
  dashboardStatus?: RuntimeComponentStatus;
}

const SAFE_OVERALL_UNKNOWN_MESSAGE =
  "Components not verified; conservative development posture only.";

export function createDefaultRuntimeStatus(
  options?: CreateDefaultRuntimeStatusOptions,
): MapazappRuntimeStatus {
  const runtimeMode = options?.runtimeMode ?? "mock";
  const generatedAt =
    options && Object.prototype.hasOwnProperty.call(options, "generatedAt")
      ? options.generatedAt ?? null
      : null;

  return {
    runtimeMode,
    api: {
      status: options?.apiStatus ?? "unknown",
      url: null,
      port: null,
      lastCheckedAt: null,
      error: null,
    },
    dashboard: {
      status: options?.dashboardStatus ?? "unknown",
      url: null,
      port: null,
      lastCheckedAt: null,
      error: null,
    },
    mt5: {
      status: "not_configured",
      enabled: false,
      terminalPath: null,
      dataFolder: null,
      mql5FilesFolder: null,
      lastCheckedAt: null,
      error: null,
    },
    bridge: {
      status: "not_configured",
      enabled: false,
      bridgeFolder: null,
      expectedFiles: [],
      lastSeenAt: null,
      lastFile: null,
      error: null,
    },
    data: {
      status: "unknown",
      sourceMode: runtimeMode === "manual-import" ? "manual-import" : "mock",
      symbol: null,
      timeframe: null,
      candleCount: null,
      lastCandleTime: null,
      warnings: [],
    },
    safety: {
      executionEnabled: false,
      sendToMt5Enabled: false,
      canAutoExecute: false,
      autoApprovalEnabled: false,
      registryMutationAllowed: false,
      manualReviewRequired: true,
    },
    overall: {
      status: "unknown",
      message: SAFE_OVERALL_UNKNOWN_MESSAGE,
    },
    generatedAt,
  };
}

export interface ManualImportRuntimeInput {
  ok: boolean;
  symbol?: string | null;
  timeframe?: string | null;
  candleCount?: number | null;
  lastCandleTime?: string | null;
  warnings?: string[];
  generatedAt?: string | null;
}

export function createManualImportRuntimeStatus(
  input: ManualImportRuntimeInput,
): MapazappRuntimeStatus {
  const generatedAt =
    Object.prototype.hasOwnProperty.call(input, "generatedAt") ?
      input.generatedAt ?? null
    : null;

  const base = createDefaultRuntimeStatus({
    runtimeMode: "manual-import",
    generatedAt,
    apiStatus: "unknown",
    dashboardStatus: "unknown",
  });

  return {
    ...base,
    data: {
      status: input.ok ? "ok" : "error",
      sourceMode: "manual-import",
      symbol: input.symbol ?? null,
      timeframe: input.timeframe ?? null,
      candleCount:
        input.candleCount === undefined ? null
        : Number.isFinite(input.candleCount) ? input.candleCount
        : null,
      lastCandleTime: input.lastCandleTime ?? null,
      warnings: input.warnings ?? [],
    },
    overall: {
      status: input.ok ? "unknown" : "error",
      message: input.ok ?
        "Local validated import summary only; not profitability proof."
      : "Manual import validation failed; evidence-only posture.",
    },
  };
}

function isPositiveConnectivityStatus(status: RuntimeComponentStatus): boolean {
  return (
    status === "ok" ||
    status === "available" ||
    status === "detected"
  );
}

function uiServiceAllowsOverallOk(status: RuntimeComponentStatus): boolean {
  return status === "ok";
}

export function deriveOverallRuntimeStatus(
  status: MapazappRuntimeStatus,
): OverallRuntimeSlice {
  const s = status.safety;

  if (s.executionEnabled) {
    return {
      status: "blocked",
      message: "Execution flags must remain disabled for this posture.",
    };
  }
  if (
    s.sendToMt5Enabled ||
    s.canAutoExecute ||
    s.autoApprovalEnabled ||
    s.registryMutationAllowed
  ) {
    return {
      status: "blocked",
      message: "Unsafe automation or mutation flags are enabled.",
    };
  }
  if (!s.manualReviewRequired) {
    return {
      status: "blocked",
      message: "Manual review must remain required.",
    };
  }

  if (status.api.status === "error" || status.dashboard.status === "error") {
    return {
      status: "error",
      message: "API or dashboard reported an error state.",
    };
  }

  if (status.api.status === "blocked" || status.dashboard.status === "blocked") {
    return {
      status: "blocked",
      message: "API or dashboard is blocked.",
    };
  }

  if (
    status.runtimeMode === "live-read-only" &&
    status.mt5.enabled &&
    status.mt5.status === "not_found"
  ) {
    return {
      status: "degraded",
      message: "MT5 enabled but terminal path not found; execution remains disabled.",
    };
  }

  if (status.runtimeMode === "live-read-only" && status.bridge.enabled) {
    if (status.bridge.status === "missing" || status.bridge.status === "stale") {
      return {
        status: "degraded",
        message: "Bridge folder policy indicates missing or stale exports.",
      };
    }
  }

  if (
    status.api.status === "degraded" ||
    status.dashboard.status === "degraded" ||
    status.data.status === "degraded"
  ) {
    return {
      status: "degraded",
      message: "One or more components are degraded.",
    };
  }

  if (status.data.status === "error") {
    return {
      status: "degraded",
      message: "Dataset reported an error; overall cannot be healthy.",
    };
  }

  const uiPending =
    !uiServiceAllowsOverallOk(status.api.status) ||
    !uiServiceAllowsOverallOk(status.dashboard.status);

  if (uiPending) {
    return {
      status: "unknown",
      message: "API/dashboard not verified as OK; overall remains unknown.",
    };
  }

  const mode = status.runtimeMode;
  if (mode === "mock" || mode === "manual-import") {
    return {
      status: "ok",
      message:
        "Mock/manual-import posture: UI services OK; MT5/bridge not claimed.",
    };
  }

  if (mode === "live-read-only") {
    if (status.mt5.enabled && !isPositiveConnectivityStatus(status.mt5.status)) {
      return {
        status: "degraded",
        message: "Live-read-only requires MT5 evidence when enabled.",
      };
    }
    if (
      status.bridge.enabled &&
      !isPositiveConnectivityStatus(status.bridge.status)
    ) {
      return {
        status: "degraded",
        message: "Live-read-only requires bridge evidence when enabled.",
      };
    }
    return {
      status: "ok",
      message: "Live-read-only posture is consistent; execution remains disabled.",
    };
  }

  if (mode === "historical") {
    return {
      status: "ok",
      message: "Historical posture; execution remains disabled.",
    };
  }

  if (mode === "disabled" || mode === "error") {
    return {
      status: mode === "error" ? "error" : "blocked",
      message: "Runtime mode prevents an OK overall summary.",
    };
  }

  return {
    status: "unknown",
    message: SAFE_OVERALL_UNKNOWN_MESSAGE,
  };
}

export interface RuntimeSafetyAssertion {
  ok: boolean;
  errors: string[];
}

export function assertRuntimeSafety(
  status: MapazappRuntimeStatus,
): RuntimeSafetyAssertion {
  const errors: string[] = [];
  const s = status.safety;

  if (s.executionEnabled) errors.push("executionEnabled must be false.");
  if (s.sendToMt5Enabled) errors.push("sendToMt5Enabled must be false.");
  if (s.canAutoExecute) errors.push("canAutoExecute must be false.");
  if (s.autoApprovalEnabled) errors.push("autoApprovalEnabled must be false.");
  if (s.registryMutationAllowed) errors.push("registryMutationAllowed must be false.");
  if (!s.manualReviewRequired) {
    errors.push("manualReviewRequired must be true.");
  }

  const relaxedModes: RuntimeMode[] = ["mock", "manual-import"];
  if (relaxedModes.includes(status.runtimeMode)) {
    if (!status.mt5.enabled && isPositiveConnectivityStatus(status.mt5.status)) {
      errors.push("MT5 is disabled but reports a positive connectivity status.");
    }
    if (!status.bridge.enabled && isPositiveConnectivityStatus(status.bridge.status)) {
      errors.push("Bridge is disabled but reports a positive connectivity status.");
    }
  }

  if (
    relaxedModes.includes(status.runtimeMode) &&
    status.overall.status === "ok" &&
    (!uiServiceAllowsOverallOk(status.api.status) ||
      !uiServiceAllowsOverallOk(status.dashboard.status))
  ) {
    errors.push("Overall cannot be OK while API/dashboard are not OK.");
  }

  return { ok: errors.length === 0, errors };
}

export function serializeRuntimeStatus(
  status: MapazappRuntimeStatus,
): Record<string, unknown> {
  const sanitized = JSON.parse(
    JSON.stringify(status, (_key, value: unknown) => {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return null;
      }
      return value;
    }),
  ) as Record<string, unknown>;
  return sanitized;
}
