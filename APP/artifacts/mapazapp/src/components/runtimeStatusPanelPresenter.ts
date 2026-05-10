/**
 * D6.2.1 — Pure presentation helpers for RuntimeStatusPanel (testable without DOM).
 */

import type { RuntimeStatusViewModel } from "@/services/runtimeStatusDataSource";

export const RUNTIME_STATUS_PANEL_DEFAULT_TITLE = "Runtime status";

export const RUNTIME_STATUS_PANEL_SUBTITLE =
  "Read-only development status. This view does not enable trading or MT5 execution.";

export type RuntimeStatusPanelRowTone = "neutral" | "muted" | "warning" | "danger";

export interface RuntimeStatusPanelRow {
  label: string;
  value: string;
  tone: RuntimeStatusPanelRowTone;
  testId: string;
}

function formatComponentLikeStatus(raw: string): string {
  const map: Record<string, string> = {
    ok: "OK",
    unknown: "Unknown",
    not_configured: "Not configured",
    not_checked: "Not checked",
    not_started: "Not started",
    starting: "Starting",
    available: "Available",
    detected: "Detected",
    stale: "Stale",
    missing: "Missing",
    not_found: "Not found",
    degraded: "Degraded",
    blocked: "Blocked",
    error: "Error",
  };
  return map[raw] ??
    raw
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
}

function formatRuntimeMode(mode: RuntimeStatusViewModel["runtimeMode"]): string {
  if (mode === "unknown") return "Unknown";
  return mode
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatSource(source: RuntimeStatusViewModel["source"]): string {
  switch (source) {
    case "api":
      return "API snapshot";
    case "unavailable":
      return "Unavailable";
    case "blocked":
      return "Blocked";
    default:
      return "Unknown";
  }
}

function sourceTone(source: RuntimeStatusViewModel["source"]): RuntimeStatusPanelRowTone {
  if (source === "blocked") return "danger";
  if (source === "unavailable") return "warning";
  return "neutral";
}

function overallTone(overall: RuntimeStatusViewModel["overallStatus"]): RuntimeStatusPanelRowTone {
  if (overall === "blocked" || overall === "error") return "danger";
  if (overall === "degraded" || overall === "unknown") return "warning";
  return "neutral";
}

/** Fixed safety copy shown under rows; execution is never presented as enabled in the UI. */
export function getRuntimeStatusPanelSafetyText(_status: RuntimeStatusViewModel): string {
  return "Execution is disabled. Mapazapp does not send orders or execute trades.";
}

export function buildRuntimeStatusPanelRows(status: RuntimeStatusViewModel): RuntimeStatusPanelRow[] {
  return [
    {
      label: "Source",
      value: formatSource(status.source),
      tone: sourceTone(status.source),
      testId: "runtime-status-source",
    },
    {
      label: "Runtime mode",
      value: formatRuntimeMode(status.runtimeMode),
      tone: "neutral",
      testId: "runtime-status-runtime-mode",
    },
    {
      label: "API",
      value: formatComponentLikeStatus(status.apiStatus),
      tone: "neutral",
      testId: "runtime-status-api",
    },
    {
      label: "Dashboard",
      value: formatComponentLikeStatus(status.dashboardStatus),
      tone: "neutral",
      testId: "runtime-status-dashboard",
    },
    {
      label: "MT5",
      value: formatComponentLikeStatus(status.mt5Status),
      tone: "neutral",
      testId: "runtime-status-mt5",
    },
    {
      label: "Bridge",
      value: formatComponentLikeStatus(status.bridgeStatus),
      tone: "neutral",
      testId: "runtime-status-bridge",
    },
    {
      label: "Execution",
      value: "Disabled",
      tone: "muted",
      testId: "runtime-status-execution",
    },
    {
      label: "Overall",
      value: formatComponentLikeStatus(status.overallStatus),
      tone: overallTone(status.overallStatus),
      testId: "runtime-status-overall",
    },
  ];
}
