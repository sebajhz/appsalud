/**
 * D10.3 — Conservative MT5 slice integration into MapazappRuntimeStatus (no watcher, no MT5 launch).
 * Uses D10.1 validation only; optional filesystem checks via injected deps in tests.
 */

import {
  createDefaultRuntimeStatus,
  deriveOverallRuntimeStatus,
  type MapazappRuntimeStatus,
  type Mt5RuntimeSlice,
  type RuntimeComponentStatus,
} from "@workspace/mapazapp-core";
import {
  type Mt5Config,
  type Mt5ConfigValidationResult,
  type Mt5ConfigValidatorDeps,
  sanitizeMt5PathForDisplay,
  validateMt5Config,
} from "./mapazapp-mt5-config-model";

export interface CreateMt5RuntimeStatusFromConfigOptions {
  /** Defaults to `createDefaultRuntimeStatus`. */
  base?: MapazappRuntimeStatus;
  validationDeps?: Mt5ConfigValidatorDeps;
  generatedAt?: string | null;
}

const SAFE_SUMMARY_DISCLAIMERS = [
  "declarative_config_only",
  "no_live_mt5_probe",
  "no_mt5_launch_from_model",
] as const;

function sanitizePathsForSlice(config: Mt5Config): Pick<Mt5RuntimeSlice, "terminalPath" | "dataFolder" | "mql5FilesFolder"> {
  return {
    terminalPath: sanitizeMt5PathForDisplay(config.terminalPath),
    dataFolder: sanitizeMt5PathForDisplay(config.dataFolder),
    mql5FilesFolder: sanitizeMt5PathForDisplay(config.mql5FilesFolder),
  };
}

/**
 * Maps validation outcome to an MT5 runtime slice: never claims connectivity or “connected”.
 */
export function mapMt5ConfigValidationToRuntimeStatus(
  config: Mt5Config,
  validation: Mt5ConfigValidationResult,
  options?: { generatedAt?: string | null },
): Mt5RuntimeSlice {
  const lastCheckedAt = options?.generatedAt ?? null;
  const paths = sanitizePathsForSlice(config);

  if (validation.status === "unsafe") {
    return {
      status: "blocked",
      enabled: false,
      terminalPath: paths.terminalPath,
      dataFolder: paths.dataFolder,
      mql5FilesFolder: paths.mql5FilesFolder,
      lastCheckedAt,
      error: "mt5_config_unsafe_policy",
    };
  }

  if (!config.enabled || validation.status === "not_configured") {
    return {
      status: "not_configured",
      enabled: false,
      terminalPath: null,
      dataFolder: null,
      mql5FilesFolder: null,
      lastCheckedAt,
      error: null,
    };
  }

  if (validation.status === "invalid") {
    return {
      status: "error",
      enabled: true,
      terminalPath: paths.terminalPath,
      dataFolder: paths.dataFolder,
      mql5FilesFolder: paths.mql5FilesFolder,
      lastCheckedAt,
      error: validation.errors.length > 0 ? validation.errors[0]! : "mt5_config_invalid",
    };
  }

  // valid — still not “connected”; at most declarative shape / read-only readiness
  let status: RuntimeComponentStatus = "not_checked";
  if (validation.terminalKind === "mt5" && config.allowedReadOnly && validation.status === "valid") {
    status = "detected";
  } else if (validation.status === "valid") {
    status = "not_checked";
  }

  const error =
    validation.warnings.length > 0 ? validation.warnings[0]!
    : validation.errors.length > 0 ? validation.errors[0]!
    : null;

  return {
    status,
    enabled: true,
    terminalPath: paths.terminalPath,
    dataFolder: paths.dataFolder,
    mql5FilesFolder: paths.mql5FilesFolder,
    lastCheckedAt,
    error,
  };
}

/** Safe tokens for logs/UI — no raw paths. */
export function createSafeMt5RuntimeSummary(validation: Mt5ConfigValidationResult): string[] {
  const out = [...validation.safeSummary];
  for (const d of SAFE_SUMMARY_DISCLAIMERS) {
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

export function createMt5RuntimeStatusFromConfig(
  config: Mt5Config,
  options?: CreateMt5RuntimeStatusFromConfigOptions,
): MapazappRuntimeStatus {
  const validation = validateMt5Config(config, options?.validationDeps);
  const generatedAt =
    options && Object.prototype.hasOwnProperty.call(options, "generatedAt") ?
      options.generatedAt ?? null
    : new Date().toISOString();

  const base =
    options?.base ??
    createDefaultRuntimeStatus({
      generatedAt,
    });

  const mt5 = mapMt5ConfigValidationToRuntimeStatus(config, validation, { generatedAt });
  const merged: MapazappRuntimeStatus = {
    ...base,
    mt5,
    generatedAt,
  };

  const overall = deriveOverallRuntimeStatus(merged);
  return {
    ...merged,
    overall,
  };
}
