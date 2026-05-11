/**
 * D11.1 — Pure TypeScript model for a future on-disk local launcher config file.
 * Does not read/write the filesystem, does not start OS child processes, does not touch MT5.
 * Not a declaration that a real launcher is ready to execute.
 */

import {
  assertMt5BridgeReadinessSafety,
  createDefaultMt5BridgeReadinessConfig,
  evaluateMt5BridgeReadiness,
  sanitizeBridgePathForDisplay,
  type Mt5BridgeReadinessConfig,
} from "./mapazapp-mt5-bridge-readiness";
import {
  assertMt5ConfigSafety,
  createDefaultMt5Config,
  sanitizeMt5PathForDisplay,
  validateMt5Config,
  type Mt5Config,
} from "./mapazapp-mt5-config-model";

export type LauncherConfigStatus = "valid" | "invalid" | "not_configured" | "unsafe";

export interface LauncherConfig {
  schemaVersion: string;
  apiHost: string;
  apiPort: number;
  dashboardPort: number;
  dataRoot: string | null;
  logsRoot: string | null;
  mt5Config: Mt5Config;
  bridgeConfig: Mt5BridgeReadinessConfig;
  actionTransportEnabled: boolean;
  actionTokenRequired: boolean;
  allowProcessStart: boolean;
  allowMt5Launch: boolean;
  allowCommandFiles: boolean;
}

export interface LauncherConfigValidationResult {
  ok: boolean;
  status: LauncherConfigStatus;
  errors: string[];
  warnings: string[];
  safeSummary: string[];
}

export interface CreateDefaultLauncherConfigOptions {
  schemaVersion?: string;
  apiHost?: string;
  apiPort?: number;
  dashboardPort?: number;
  dataRoot?: string | null;
  logsRoot?: string | null;
  mt5Config?: Mt5Config;
  bridgeConfig?: Mt5BridgeReadinessConfig;
  actionTransportEnabled?: boolean;
  actionTokenRequired?: boolean;
  allowProcessStart?: boolean;
  allowMt5Launch?: boolean;
  allowCommandFiles?: boolean;
}

const PRIVATE_FRAGMENTS = [
  /c:\\users\\/i,
  /\/users\//i,
  /appdata/i,
  /metaquotes/i,
  /terminal64\.exe/i,
] as const;

const OPERATIONAL_FRAGMENTS =
  /\b(mt5 connected|bridge connected|ready to trade|ordersend|ctrade)\b/i;

const SECRETISH = /\b(bearer\s+[a-z0-9._~-]{8,}|x-mapazapp-action-token"\s*:\s*"[^"]{4,})\b/i;

function pushSafeUnique(acc: string[], token: string): void {
  if (!acc.includes(token)) acc.push(token);
}

function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
}

function validatePorts(apiPort: number, dashboardPort: number, errors: string[]): void {
  for (const [label, p] of [
    ["apiPort", apiPort],
    ["dashboardPort", dashboardPort],
  ] as const) {
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      errors.push(`${label}_out_of_range`);
    }
  }
}

/**
 * Safe defaults for a future launcher config file (declarative only).
 */
export function createDefaultLauncherConfig(
  options?: CreateDefaultLauncherConfigOptions,
): LauncherConfig {
  const base: LauncherConfig = {
    schemaVersion: "1",
    apiHost: "127.0.0.1",
    apiPort: 3001,
    dashboardPort: 5173,
    dataRoot: null,
    logsRoot: null,
    mt5Config: createDefaultMt5Config(),
    bridgeConfig: createDefaultMt5BridgeReadinessConfig(),
    actionTransportEnabled: false,
    actionTokenRequired: true,
    allowProcessStart: false,
    allowMt5Launch: false,
    allowCommandFiles: false,
  };
  if (!options) return { ...base };
  return {
    ...base,
    schemaVersion: options.schemaVersion ?? base.schemaVersion,
    apiHost: options.apiHost ?? base.apiHost,
    apiPort: options.apiPort ?? base.apiPort,
    dashboardPort: options.dashboardPort ?? base.dashboardPort,
    dataRoot: options.dataRoot !== undefined ? options.dataRoot : base.dataRoot,
    logsRoot: options.logsRoot !== undefined ? options.logsRoot : base.logsRoot,
    mt5Config: options.mt5Config ?? base.mt5Config,
    bridgeConfig: options.bridgeConfig ?? base.bridgeConfig,
    actionTransportEnabled: options.actionTransportEnabled ?? base.actionTransportEnabled,
    actionTokenRequired: options.actionTokenRequired ?? base.actionTokenRequired,
    allowProcessStart: options.allowProcessStart ?? base.allowProcessStart,
    allowMt5Launch: options.allowMt5Launch ?? base.allowMt5Launch,
    allowCommandFiles: options.allowCommandFiles ?? base.allowCommandFiles,
  };
}

/**
 * Validates a declarative launcher file config (no I/O).
 */
export function validateLauncherConfig(config: LauncherConfig): LauncherConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const safeSummary: string[] = [];

  if (typeof config.schemaVersion !== "string" || !config.schemaVersion.trim()) {
    errors.push("schemaVersion_required");
  }

  if (typeof config.apiHost !== "string" || !config.apiHost.trim()) {
    errors.push("apiHost_required");
  } else if (!isLoopbackHost(config.apiHost)) {
    warnings.push("apiHost_not_loopback");
    pushSafeUnique(safeSummary, "api_host_non_loopback_warning");
  }

  validatePorts(config.apiPort, config.dashboardPort, errors);

  if (config.allowMt5Launch) {
    pushSafeUnique(safeSummary, "unsafe_allow_mt5_launch");
    return {
      ok: false,
      status: "unsafe",
      errors: ["allowMt5Launch_must_remain_false"],
      warnings: [],
      safeSummary,
    };
  }

  if (config.allowCommandFiles) {
    pushSafeUnique(safeSummary, "unsafe_allow_command_files");
    return {
      ok: false,
      status: "unsafe",
      errors: ["allowCommandFiles_must_remain_false"],
      warnings: [],
      safeSummary,
    };
  }

  if (config.allowProcessStart) {
    pushSafeUnique(safeSummary, "unsafe_allow_process_start");
    return {
      ok: false,
      status: "unsafe",
      errors: ["allowProcessStart_must_remain_false"],
      warnings: [],
      safeSummary,
    };
  }

  if (config.actionTransportEnabled && !config.actionTokenRequired) {
    pushSafeUnique(safeSummary, "invalid_action_transport_without_token");
    return {
      ok: false,
      status: "invalid",
      errors: ["action_transport_requires_token_policy"],
      warnings: [],
      safeSummary,
    };
  }

  if (errors.length > 0) {
    pushSafeUnique(safeSummary, "structural_invalid");
    return {
      ok: false,
      status: "invalid",
      errors,
      warnings,
      safeSummary,
    };
  }

  const mt5Result = validateMt5Config(config.mt5Config);
  const mt5Safety = assertMt5ConfigSafety(mt5Result);
  if (!mt5Safety.ok) {
    errors.push(...mt5Safety.errors);
    pushSafeUnique(safeSummary, "mt5_validation_json_unsafe");
    return {
      ok: false,
      status: "invalid",
      errors,
      warnings,
      safeSummary,
    };
  }

  const bridgeReadiness = evaluateMt5BridgeReadiness(config.bridgeConfig);
  const bridgeSafety = assertMt5BridgeReadinessSafety(bridgeReadiness);
  if (!bridgeSafety.ok) {
    errors.push(...bridgeSafety.errors);
    pushSafeUnique(safeSummary, "bridge_validation_json_unsafe");
    return {
      ok: false,
      status: "invalid",
      errors,
      warnings,
      safeSummary,
    };
  }

  let status: LauncherConfigStatus = "valid";
  pushSafeUnique(safeSummary, "structural_ok");

  if (mt5Result.status === "unsafe") {
    return {
      ok: false,
      status: "unsafe",
      errors: [...mt5Result.errors],
      warnings: [...mt5Result.warnings],
      safeSummary: [...mt5Result.safeSummary.map((t) => `mt5:${t}`)],
    };
  }

  if (mt5Result.status === "invalid") {
    status = "invalid";
    errors.push(...mt5Result.errors);
  }
  warnings.push(...mt5Result.warnings);
  for (const t of mt5Result.safeSummary) pushSafeUnique(safeSummary, `mt5:${t}`);

  if (bridgeReadiness.status === "unsafe") {
    return {
      ok: false,
      status: "unsafe",
      errors: [...bridgeReadiness.errors],
      warnings: [...bridgeReadiness.warnings],
      safeSummary: [...bridgeReadiness.safeSummary.map((t) => `bridge:${t}`)],
    };
  }

  if (bridgeReadiness.status === "invalid" || bridgeReadiness.status === "missing") {
    status = "invalid";
    errors.push(...bridgeReadiness.errors);
  }
  warnings.push(...bridgeReadiness.warnings);
  for (const t of bridgeReadiness.safeSummary) pushSafeUnique(safeSummary, `bridge:${t}`);

  if (config.actionTransportEnabled) {
    warnings.push("action_transport_enabled_not_wired");
    pushSafeUnique(safeSummary, "action_transport_declarative_only");
  }

  const ok = status === "valid";
  return {
    ok,
    status,
    errors: [...errors],
    warnings,
    safeSummary,
  };
}

/**
 * Returns a display-oriented copy with paths redacted (no private segments in strings).
 */
export function sanitizeLauncherConfigForDisplay(config: LauncherConfig): LauncherConfig {
  const m = config.mt5Config;
  const b = config.bridgeConfig;
  return {
    ...config,
    dataRoot: sanitizeMt5PathForDisplay(config.dataRoot),
    logsRoot: sanitizeMt5PathForDisplay(config.logsRoot),
    mt5Config: {
      ...m,
      terminalPath: sanitizeMt5PathForDisplay(m.terminalPath),
      dataFolder: sanitizeMt5PathForDisplay(m.dataFolder),
      mql5FilesFolder: sanitizeMt5PathForDisplay(m.mql5FilesFolder),
      bridgeFolder: sanitizeMt5PathForDisplay(m.bridgeFolder),
    },
    bridgeConfig: {
      ...b,
      bridgeFolder: sanitizeBridgePathForDisplay(b.bridgeFolder) ?? "",
    },
  };
}

export interface LauncherConfigSafetyAssertion {
  ok: boolean;
  errors: string[];
}

/**
 * Ensures validation JSON is free of private markers, operational lies, or obvious secret patterns.
 * When given a `LauncherConfig`, validates first then scans the validation JSON.
 */
export function assertLauncherConfigSafety(
  input: LauncherConfigValidationResult | LauncherConfig,
): LauncherConfigSafetyAssertion {
  const result =
    "mt5Config" in input ? validateLauncherConfig(input as LauncherConfig) : input;

  let raw: string;
  try {
    raw = JSON.stringify(result);
  } catch {
    return { ok: false, errors: ["result_not_json_serializable"] };
  }

  const errors: string[] = [];
  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(raw)) errors.push(`disallowed_private_fragment_in_json:${re.source}`);
  }
  if (OPERATIONAL_FRAGMENTS.test(raw)) {
    errors.push("disallowed_operational_marker_in_json");
  }
  if (SECRETISH.test(raw)) {
    errors.push("disallowed_secretish_token_pattern_in_json");
  }

  return { ok: errors.length === 0, errors };
}
