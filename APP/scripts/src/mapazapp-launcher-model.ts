/**
 * D8.2 — Pure launcher configuration and process model skeleton (no OS process spawning APIs).
 * Aligned with LAUNCHER_PROTOTYPE_DESIGN_D8.md. Non-operational defaults only.
 */

import {
  createDefaultRuntimeStatus,
  deriveOverallRuntimeStatus,
  serializeRuntimeStatus,
  type MapazappRuntimeStatus,
  type RuntimeComponentStatus,
  type RuntimeMode,
} from "@workspace/mapazapp-core";

/** Launcher-local runtime posture (maps into `@workspace/mapazapp-core` `RuntimeMode` where applicable). */
export type LauncherRuntimeMode = "mock" | "manual-import" | "dev" | "disabled";

export type LauncherChildProcessName = "api" | "dashboard" | "mt5";

export type LauncherChildProcessStatus =
  | "not_started"
  | "starting"
  | "running"
  | "stopped"
  | "crashed"
  | "failed"
  | "unknown";

export type LauncherPortStatus = "unknown" | "available" | "occupied" | "invalid";

export interface LauncherAppConfig {
  runtimeMode: LauncherRuntimeMode;
  environment: "development" | "production";
  singleInstance: boolean;
  /** Logical lock/mutex name — never a filesystem path with personal segments in defaults. */
  lockName: string | null;
}

export interface LauncherApiConfig {
  host: string;
  port: number;
  healthPath: string;
}

export interface LauncherDashboardConfig {
  host: string;
  port: number;
  openBrowser: boolean;
}

export interface LauncherLogsConfig {
  logsFolder: string | null;
  keepDays: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface LauncherSafetyConfig {
  executionEnabled: boolean;
  sendToMt5Enabled: boolean;
  canAutoExecute: boolean;
  autoApprovalEnabled: boolean;
  registryMutationAllowed: boolean;
  manualReviewRequired: boolean;
}

export interface LauncherMt5Config {
  enabled: boolean;
  terminalPath: string | null;
  mql5FilesFolder: string | null;
}

export interface LauncherBridgeConfig {
  enabled: boolean;
  bridgeFolder: string | null;
}

export interface LauncherConfig {
  app: LauncherAppConfig;
  api: LauncherApiConfig;
  dashboard: LauncherDashboardConfig;
  logs: LauncherLogsConfig;
  safety: LauncherSafetyConfig;
  mt5: LauncherMt5Config;
  bridge: LauncherBridgeConfig;
}

export interface LauncherPortProbeModel {
  api: LauncherPortStatus;
  dashboard: LauncherPortStatus;
}

export interface LauncherChildProcessRecord {
  name: LauncherChildProcessName;
  pid: number | null;
  status: LauncherChildProcessStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  exitCode: number | null;
  /** Relative or opaque logical name — never a populated default path in D8.2. */
  logFile: string | null;
  ownedByLauncher: boolean;
}

export type LauncherChildrenState = Record<LauncherChildProcessName, LauncherChildProcessRecord>;

export interface LauncherProcessModel {
  launcherStartedAt: string | null;
  config: LauncherConfig;
  children: LauncherChildrenState;
  ports: LauncherPortProbeModel;
  actionBridgeEnabled: boolean;
  mt5RuntimeEnabled: boolean;
  watcherEnabled: boolean;
  dbEnabled: boolean;
  websocketEnabled: boolean;
}

export interface CreateDefaultLauncherConfigOptions {
  runtimeMode?: LauncherRuntimeMode;
  environment?: "development" | "production";
  singleInstance?: boolean;
  lockName?: string | null;
  apiPort?: number;
  dashboardPort?: number;
  openBrowser?: boolean;
}

/**
 * Safe defaults: conservative posture, **mock** runtime (no verified services).
 * `openBrowser` defaults **false** until a real launcher exists (see D8.1).
 */
export function createDefaultLauncherConfig(
  options?: CreateDefaultLauncherConfigOptions,
): LauncherConfig {
  return {
    app: {
      runtimeMode: options?.runtimeMode ?? "mock",
      environment: options?.environment ?? "development",
      singleInstance: options?.singleInstance ?? true,
      lockName: options?.lockName ?? "mapazapp-launcher-default",
    },
    api: {
      host: "127.0.0.1",
      port: options?.apiPort ?? 3001,
      healthPath: "/api/healthz",
    },
    dashboard: {
      host: "127.0.0.1",
      port: options?.dashboardPort ?? 5173,
      openBrowser: options?.openBrowser ?? false,
    },
    logs: {
      logsFolder: null,
      keepDays: 14,
      logLevel: "info",
    },
    safety: {
      executionEnabled: false,
      sendToMt5Enabled: false,
      canAutoExecute: false,
      autoApprovalEnabled: false,
      registryMutationAllowed: false,
      manualReviewRequired: true,
    },
    mt5: {
      enabled: false,
      terminalPath: null,
      mql5FilesFolder: null,
    },
    bridge: {
      enabled: false,
      bridgeFolder: null,
    },
  };
}

export interface CreateDefaultLauncherProcessModelOptions {
  config?: LauncherConfig;
  nowIso?: string | null;
}

function defaultChild(name: LauncherChildProcessName): LauncherChildProcessRecord {
  return createLauncherChildProcessRecord(name, {
    pid: null,
    status: "not_started",
    startedAt: null,
    stoppedAt: null,
    exitCode: null,
    logFile: null,
    ownedByLauncher: false,
  });
}

/** Skeleton process model: no children running, future capabilities off (D8.2). */
export function createDefaultLauncherProcessModel(
  options?: CreateDefaultLauncherProcessModelOptions,
): LauncherProcessModel {
  const config = options?.config ?? createDefaultLauncherConfig();
  const nowIso =
    options && Object.prototype.hasOwnProperty.call(options, "nowIso") ?
      options.nowIso ?? null
    : null;

  return {
    launcherStartedAt: nowIso,
    config,
    children: {
      api: defaultChild("api"),
      dashboard: defaultChild("dashboard"),
      mt5: defaultChild("mt5"),
    },
    ports: { api: "unknown", dashboard: "unknown" },
    actionBridgeEnabled: false,
    mt5RuntimeEnabled: false,
    watcherEnabled: false,
    dbEnabled: false,
    websocketEnabled: false,
  };
}

export interface CreateLauncherChildProcessRecordOptions {
  pid?: number | null;
  status?: LauncherChildProcessStatus;
  startedAt?: string | null;
  stoppedAt?: string | null;
  exitCode?: number | null;
  logFile?: string | null;
  ownedByLauncher?: boolean;
}

/**
 * Builds a child record. Enforces: `running` requires positive `pid`.
 * Does **not** accept shell commands — no command field exists by design.
 */
export function createLauncherChildProcessRecord(
  name: LauncherChildProcessName,
  options?: CreateLauncherChildProcessRecordOptions,
): LauncherChildProcessRecord {
  const status = options?.status ?? "not_started";
  const pid = options?.pid ?? null;

  if (status === "running" && (pid === null || !Number.isInteger(pid) || pid <= 0)) {
    throw new TypeError("Launcher child status running requires a positive integer pid.");
  }

  return {
    name,
    pid,
    status,
    startedAt: options?.startedAt ?? null,
    stoppedAt: options?.stoppedAt ?? null,
    exitCode: options?.exitCode ?? null,
    logFile: options?.logFile ?? null,
    ownedByLauncher: options?.ownedByLauncher ?? false,
  };
}

/** Maps launcher runtime mode to core `RuntimeMode` for `MapazappRuntimeStatus.runtimeMode`. */
export function mapLauncherRuntimeModeToCore(mode: LauncherRuntimeMode): RuntimeMode {
  switch (mode) {
    case "mock":
      return "mock";
    case "manual-import":
      return "manual-import";
    case "dev":
      return "mock";
    case "disabled":
      return "disabled";
    default:
      return "mock";
  }
}

function mapChildToComponentStatus(
  child: LauncherChildProcessRecord,
): RuntimeComponentStatus {
  if (child.status === "running" && !child.ownedByLauncher) {
    return "blocked";
  }
  switch (child.status) {
    case "not_started":
      return "not_started";
    case "starting":
      return "starting";
    case "running":
      return "ok";
    case "stopped":
      return "not_started";
    case "crashed":
    case "failed":
      return "error";
    case "unknown":
    default:
      return "unknown";
  }
}

function buildApiDashboardSlices(model: LauncherProcessModel): {
  api: MapazappRuntimeStatus["api"];
  dashboard: MapazappRuntimeStatus["dashboard"];
} {
  const { config } = model;
  const apiChild = model.children.api;
  const dashChild = model.children.dashboard;

  const apiStatus = mapChildToComponentStatus(apiChild);
  const dashStatus = mapChildToComponentStatus(dashChild);

  const apiPort = config.api.port;
  const dashPort = config.dashboard.port;

  const apiUrl =
    apiStatus === "ok" ? `http://${config.api.host}:${apiPort}` : null;
  const dashUrl =
    dashStatus === "ok" ? `http://${config.dashboard.host}:${dashPort}` : null;

  const lastCheckedAt = model.launcherStartedAt;

  const apiError =
    apiChild.status === "running" && !apiChild.ownedByLauncher ?
      "Process reports running but is not owned by launcher."
    : null;
  const dashError =
    dashChild.status === "running" && !dashChild.ownedByLauncher ?
      "Process reports running but is not owned by launcher."
    : null;

  return {
    api: {
      status: apiStatus,
      url: apiUrl,
      port: apiStatus === "ok" ? apiPort : null,
      lastCheckedAt,
      error: apiError,
    },
    dashboard: {
      status: dashStatus,
      url: dashUrl,
      port: dashStatus === "ok" ? dashPort : null,
      lastCheckedAt,
      error: dashError,
    },
  };
}

function buildMt5BridgeSlices(model: LauncherProcessModel): {
  mt5: MapazappRuntimeStatus["mt5"];
  bridge: MapazappRuntimeStatus["bridge"];
} {
  const { mt5, bridge } = model.config;

  return {
    mt5: {
      status: mt5.enabled ? "not_checked" : "not_configured",
      enabled: mt5.enabled,
      terminalPath: mt5.terminalPath,
      dataFolder: null,
      mql5FilesFolder: mt5.mql5FilesFolder,
      lastCheckedAt: model.launcherStartedAt,
      error: null,
    },
    bridge: {
      status: bridge.enabled ? "not_checked" : "not_configured",
      enabled: bridge.enabled,
      bridgeFolder: bridge.bridgeFolder,
      expectedFiles: [],
      lastSeenAt: null,
      lastFile: null,
      error: null,
    },
  };
}

/**
 * Derives a conservative `MapazappRuntimeStatus` from the skeleton model (no HTTP probes).
 * API/dashboard are **not** `ok` unless the corresponding child is `running` **and** `ownedByLauncher`.
 */
export function deriveLauncherRuntimeStatus(model: LauncherProcessModel): MapazappRuntimeStatus {
  const coreMode = mapLauncherRuntimeModeToCore(model.config.app.runtimeMode);
  const base = createDefaultRuntimeStatus({
    runtimeMode: coreMode,
    generatedAt: model.launcherStartedAt,
    apiStatus: "unknown",
    dashboardStatus: "unknown",
  });

  const { api, dashboard } = buildApiDashboardSlices(model);
  const { mt5, bridge } = buildMt5BridgeSlices(model);

  const merged: MapazappRuntimeStatus = {
    ...base,
    api,
    dashboard,
    mt5,
    bridge,
    safety: { ...model.config.safety },
    data: {
      ...base.data,
      sourceMode:
        coreMode === "manual-import" ? "manual-import"
        : coreMode === "disabled" ? "unknown"
        : "mock",
    },
  };

  const overall = deriveOverallRuntimeStatus(merged);
  return { ...merged, overall };
}

export interface LauncherModelSafetyAssertion {
  ok: boolean;
  errors: string[];
}

const PRIVATE_PATH_MARKERS = ["appdata", "metaquotes"] as const;

function containsPrivatePathMarker(path: string | null): boolean {
  if (path === null || path === "") return false;
  const low = path.toLowerCase();
  return PRIVATE_PATH_MARKERS.some((m) => low.includes(m));
}

/**
 * Validates launcher skeleton safety rules for D8.2 (non-operational posture).
 */
export function assertLauncherModelSafety(model: LauncherProcessModel): LauncherModelSafetyAssertion {
  const errors: string[] = [];
  const s = model.config.safety;

  if (s.executionEnabled) errors.push("executionEnabled must be false for D8.2 posture.");
  if (s.sendToMt5Enabled) errors.push("sendToMt5Enabled must be false for D8.2 posture.");
  if (s.canAutoExecute) errors.push("canAutoExecute must be false for D8.2 posture.");
  if (s.autoApprovalEnabled) errors.push("autoApprovalEnabled must be false for D8.2 posture.");
  if (s.registryMutationAllowed) {
    errors.push("registryMutationAllowed must be false for D8.2 posture.");
  }
  if (!s.manualReviewRequired) {
    errors.push("manualReviewRequired must be true for D8.2 posture.");
  }

  if (model.config.mt5.enabled) {
    if (containsPrivatePathMarker(model.config.mt5.terminalPath)) {
      errors.push("MT5 terminalPath must not contain AppData/MetaQuotes markers while enabled.");
    }
    if (containsPrivatePathMarker(model.config.mt5.mql5FilesFolder)) {
      errors.push("MT5 mql5FilesFolder must not contain AppData/MetaQuotes markers while enabled.");
    }
  }

  if (model.actionBridgeEnabled) {
    errors.push("actionBridgeEnabled must be false until the bridge is implemented (D8.2).");
  }
  if (model.mt5RuntimeEnabled) {
    errors.push("mt5RuntimeEnabled must be false until MT5 runtime exists (D8.2).");
  }
  if (model.watcherEnabled) errors.push("watcherEnabled must be false (D8.2).");
  if (model.dbEnabled) errors.push("dbEnabled must be false (D8.2).");
  if (model.websocketEnabled) errors.push("websocketEnabled must be false (D8.2).");

  for (const child of Object.values(model.children)) {
    if (child.status === "running" && !child.ownedByLauncher) {
      errors.push(
        `Child ${child.name} cannot be running without ownedByLauncher in D8.2 safety model.`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

/** JSON-serializable snapshot of the process model (no functions; finite numbers only). */
export function serializeLauncherModel(model: LauncherProcessModel): Record<string, unknown> {
  const raw = JSON.stringify(model, (_key, value: unknown) => {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return null;
    }
    return value;
  });
  return JSON.parse(raw) as Record<string, unknown>;
}

/** Serialized runtime view derived from the model (for dashboards/tests). */
export function serializeLauncherDerivedRuntimeStatus(
  model: LauncherProcessModel,
): Record<string, unknown> {
  return serializeRuntimeStatus(deriveLauncherRuntimeStatus(model)) as Record<string, unknown>;
}
