/**
 * D8.3 — Launcher-side read-only preflight bridge (no spawn, no HTTP server, no MT5).
 * Runs `performDevPreflight`, updates `LauncherProcessModel` ports + snapshot, derives
 * conservative `MapazappRuntimeStatus`, returns `MapazappActionResult` for `validate_environment`.
 */

import {
  assertActionResultSafety,
  createDefaultActionSafety,
  createSuccessfulReadOnlyActionResult,
  type MapazappActionResult,
} from "@workspace/mapazapp-core";
import { mergeDeps, performDevPreflight, type PortProbeResult, type PreflightDeps } from "./mapazapp-dev-preflight";
import {
  createDefaultLauncherProcessModel,
  deriveLauncherRuntimeStatus,
  type LauncherPortStatus,
  type LauncherProcessModel,
} from "./mapazapp-launcher-model";

export function mapDevPreflightPortToLauncherPort(result: PortProbeResult): LauncherPortStatus {
  if (result === "available") return "available";
  if (result === "occupied") return "occupied";
  return "invalid";
}

function clampLogsPreview(lines: string[], maxLines: number, maxLen: number): string[] {
  return lines.slice(0, maxLines).map((line) => {
    if (line.length <= maxLen) return line;
    return `${line.slice(0, maxLen - 3)}...`;
  });
}

export interface RunLauncherValidateEnvironmentPreflightOptions {
  baseModel?: LauncherProcessModel;
  preflightDeps?: Partial<PreflightDeps>;
  generatedAt?: string;
}

/**
 * Read-only environment validation only: shared preflight logic, no API/dashboard/browser/MT5 start.
 * Throws if the assembled `MapazappActionResult` fails `assertActionResultSafety`.
 */
export async function runLauncherValidateEnvironmentPreflight(
  options?: RunLauncherValidateEnvironmentPreflightOptions,
): Promise<{ model: LauncherProcessModel; actionResult: MapazappActionResult }> {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const base = options?.baseModel ?? createDefaultLauncherProcessModel({ nowIso: generatedAt });

  const deps = mergeDeps(options?.preflightDeps);
  const { ok: preflightOk, payload } = await performDevPreflight(
    base.config.api.port,
    base.config.dashboard.port,
    deps,
  );

  const ports = {
    api: mapDevPreflightPortToLauncherPort(payload.ports.api),
    dashboard: mapDevPreflightPortToLauncherPort(payload.ports.dashboard),
  };

  const model: LauncherProcessModel = {
    ...base,
    ports,
    preflight: {
      checkedAt: generatedAt,
      ok: payload.ok,
      scripts: {
        apiServer: payload.scripts.apiServer,
        dashboard: payload.scripts.dashboard,
        scripts: payload.scripts.scripts,
      },
    },
  };

  const runtimeStatus = deriveLauncherRuntimeStatus(model);

  const logsPreview = clampLogsPreview(
    [...payload.warnings, ...payload.errors],
    5,
    120,
  );

  let actionResult: MapazappActionResult;

  if (preflightOk) {
    actionResult = createSuccessfulReadOnlyActionResult(
      "validate_environment",
      "Environment checks passed (read-only); services were not started.",
      {
        source: "launcher",
        generatedAt,
        runtimeStatus,
        warnings: payload.warnings,
        errors: [],
        logsPreview,
      },
    );
  } else {
    actionResult = {
      ok: false,
      actionId: "validate_environment",
      status: "error",
      source: "launcher",
      message: "Environment validation failed; services were not started.",
      safety: createDefaultActionSafety(),
      runtimeStatus,
      logsPreview,
      warnings: payload.warnings,
      errors: payload.errors.length > 0 ? payload.errors : ["Environment validation failed."],
      generatedAt,
    };
  }

  const safety = assertActionResultSafety(actionResult);
  if (!safety.ok) {
    throw new Error(`ActionResult safety assertion failed: ${safety.errors.join("; ")}`);
  }

  return { model, actionResult };
}
