/**
 * D7.3 — Dashboard action client interface (service layer only).
 * Returns safe `not_available` / `blocked` results; no HTTP, no UI, no process control.
 */

import {
  MAPAZAPP_ACTION_IDS,
  assertActionResultSafety,
  createActionNotAvailableResult,
  createBlockedActionResult,
  type MapazappActionId,
  type MapazappActionResult,
} from "@workspace/mapazapp-core";

export type DashboardActionCategory =
  | "status"
  | "environment"
  | "import"
  | "launcher"
  | "mt5"
  | "logs";

export type DashboardActionRiskLevel = "low" | "medium" | "high";

export interface DashboardActionDefinition {
  actionId: MapazappActionId;
  label: string;
  description: string;
  category: DashboardActionCategory;
  requiresLauncher: boolean;
  requiresApi: boolean;
  enabled: boolean;
  reason: string;
  riskLevel: DashboardActionRiskLevel;
}

export interface DashboardActionClient {
  runAction(actionId: MapazappActionId): Promise<MapazappActionResult>;
  getAvailableActions(): DashboardActionDefinition[];
}

export interface UnavailableDashboardActionClientOptions {
  /** Fixed timestamp for deterministic tests. */
  nowIso?: string;
}

const NOT_IMPLEMENTED_MESSAGE = "Dashboard action bridge is not implemented yet.";

const BLOCKED_HOST_CONTROL_MESSAGE =
  "Host process control is not available from the web UI; requires a future desktop helper.";

const REQUIRES_BRIDGE_REASON =
  "Requires the desktop helper or API action bridge; not implemented yet.";

const SHOW_STATUS_REASON =
  "Read-only snapshot is shown on the Configuration screen when the API base URL is configured at build time; this client does not load it.";

/** Actions that must never be implied as runnable from the browser client. */
const BLOCKED_FROM_BROWSER: ReadonlySet<MapazappActionId> = new Set([
  "start_mapazapp_dev",
  "open_mt5",
  "stop_mapazapp",
]);

export function createActionDefinitionList(): DashboardActionDefinition[] {
  return [
    {
      actionId: "validate_environment",
      label: "Check dev ports and workspace scripts",
      description:
        "Future: verify default API and UI ports plus expected workspace scripts before starting helpers locally.",
      category: "environment",
      requiresLauncher: false,
      requiresApi: true,
      enabled: false,
      reason: REQUIRES_BRIDGE_REASON,
      riskLevel: "medium",
    },
    {
      actionId: "start_mapazapp_dev",
      label: "Start local API and UI (development)",
      description:
        "Future: supervised start of local API and UI packages; reserved for a desktop helper.",
      category: "launcher",
      requiresLauncher: true,
      requiresApi: true,
      enabled: false,
      reason: REQUIRES_BRIDGE_REASON,
      riskLevel: "high",
    },
    {
      actionId: "validate_csv",
      label: "Validate candle CSV shape",
      description:
        "Future: structural validation of a candle dataset via core importer rules and governed file handling.",
      category: "import",
      requiresLauncher: false,
      requiresApi: true,
      enabled: false,
      reason: REQUIRES_BRIDGE_REASON,
      riskLevel: "medium",
    },
    {
      actionId: "show_runtime_status",
      label: "View runtime snapshot",
      description:
        "Planning aid only: the existing Configuration panel may show a read-only snapshot when wired to the API base URL.",
      category: "status",
      requiresLauncher: false,
      requiresApi: true,
      enabled: true,
      reason: SHOW_STATUS_REASON,
      riskLevel: "low",
    },
    {
      actionId: "validate_mt5_config",
      label: "Check MetaTrader paths (policy)",
      description:
        "Future: policy-bound path checks only; does not imply charts are linked or orders are permitted.",
      category: "mt5",
      requiresLauncher: true,
      requiresApi: false,
      enabled: false,
      reason: REQUIRES_BRIDGE_REASON,
      riskLevel: "medium",
    },
    {
      actionId: "open_mt5",
      label: "Open MetaTrader terminal",
      description:
        "Future: optional open via desktop helper only; never from this web client.",
      category: "launcher",
      requiresLauncher: true,
      requiresApi: false,
      enabled: false,
      reason: REQUIRES_BRIDGE_REASON,
      riskLevel: "high",
    },
    {
      actionId: "stop_mapazapp",
      label: "Stop supervised local processes",
      description:
        "Future: orderly shutdown of children owned by a desktop helper; never arbitrary OS termination from here.",
      category: "launcher",
      requiresLauncher: true,
      requiresApi: false,
      enabled: false,
      reason: REQUIRES_BRIDGE_REASON,
      riskLevel: "high",
    },
    {
      actionId: "open_logs",
      label: "Open diagnostics folder",
      description:
        "Future: view sanitized diagnostics via helper policy; paths stay off the web client.",
      category: "logs",
      requiresLauncher: true,
      requiresApi: false,
      enabled: false,
      reason: REQUIRES_BRIDGE_REASON,
      riskLevel: "medium",
    },
  ];
}

export function createUnavailableDashboardActionClient(
  options?: UnavailableDashboardActionClientOptions,
): DashboardActionClient {
  const generatedAt = options?.nowIso ?? new Date().toISOString();
  const baseOpts = { source: "dashboard" as const, generatedAt };

  return {
    async runAction(actionId: MapazappActionId): Promise<MapazappActionResult> {
      if (BLOCKED_FROM_BROWSER.has(actionId)) {
        return createBlockedActionResult(actionId, BLOCKED_HOST_CONTROL_MESSAGE, baseOpts);
      }
      return createActionNotAvailableResult(actionId, NOT_IMPLEMENTED_MESSAGE, baseOpts);
    },

    getAvailableActions(): DashboardActionDefinition[] {
      return createActionDefinitionList();
    },
  };
}
