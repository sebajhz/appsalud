/**
 * D10.6 — Pure MT5 bridge folder readiness model (no watcher, no writes, no command files).
 * Does not claim bridge connectivity; at most “ready for read-only validation” when policy allows.
 */

import { sanitizeMt5PathForDisplay } from "./mapazapp-mt5-config-model";

export type Mt5BridgeReadinessStatus =
  | "not_configured"
  | "ready"
  | "missing"
  | "invalid"
  | "unsafe"
  | "unknown";

export interface Mt5BridgeReadinessConfig {
  bridgeFolder: string;
  expectedFiles: string[];
  allowCommandFiles: boolean;
  readOnly: boolean;
  enabled: boolean;
}

export interface Mt5BridgeReadinessResult {
  ok: boolean;
  status: Mt5BridgeReadinessStatus;
  errors: string[];
  warnings: string[];
  safeSummary: string[];
  expectedFiles: string[];
  presentFiles?: string[];
}

export interface Mt5BridgeReadinessDeps {
  exists?: (absolutePath: string) => boolean;
  listFiles?: (absolutePath: string) => string[];
}

export interface CreateDefaultMt5BridgeReadinessConfigOptions extends Partial<Mt5BridgeReadinessConfig> {}

const PRIVATE_FRAGMENTS = [
  /c:\\users\\/i,
  /\/users\//i,
  /appdata/i,
  /metaquotes/i,
  /terminal64\.exe/i,
] as const;

const OPERATIONAL_FRAGMENTS =
  /\b(mt5 connected|bridge connected|ready to trade|ordersend|ctrade)\b/i;

function pushSafeUnique(acc: string[], token: string): void {
  if (!acc.includes(token)) acc.push(token);
}

export function createDefaultMt5BridgeReadinessConfig(
  options?: CreateDefaultMt5BridgeReadinessConfigOptions,
): Mt5BridgeReadinessConfig {
  const base: Mt5BridgeReadinessConfig = {
    bridgeFolder: "",
    expectedFiles: [],
    allowCommandFiles: false,
    readOnly: true,
    enabled: false,
  };
  if (!options) return { ...base };
  return { ...base, ...options };
}

export interface Mt5BridgeReadinessConfigValidation {
  ok: boolean;
  errors: string[];
}

export function validateMt5BridgeReadinessConfig(
  config: Mt5BridgeReadinessConfig,
): Mt5BridgeReadinessConfigValidation {
  const errors: string[] = [];

  if (typeof config.bridgeFolder !== "string") {
    errors.push("bridgeFolder_must_be_string");
  }
  if (!Array.isArray(config.expectedFiles)) {
    errors.push("expectedFiles_must_be_array");
  } else if (!config.expectedFiles.every((f) => typeof f === "string")) {
    errors.push("expectedFiles_must_be_strings");
  }
  if (typeof config.allowCommandFiles !== "boolean") {
    errors.push("allowCommandFiles_must_be_boolean");
  }
  if (typeof config.readOnly !== "boolean") {
    errors.push("readOnly_must_be_boolean");
  }
  if (typeof config.enabled !== "boolean") {
    errors.push("enabled_must_be_boolean");
  }

  return { ok: errors.length === 0, errors };
}

/** Display-oriented path redaction; never use raw bridge paths in summaries or logs. */
export function sanitizeBridgePathForDisplay(path: string | null): string | null {
  return sanitizeMt5PathForDisplay(path);
}

export function evaluateMt5BridgeReadiness(
  config: Mt5BridgeReadinessConfig,
  deps?: Mt5BridgeReadinessDeps,
): Mt5BridgeReadinessResult {
  const structural = validateMt5BridgeReadinessConfig(config);
  if (!structural.ok) {
    return {
      ok: false,
      status: "invalid",
      errors: [...structural.errors],
      warnings: [],
      safeSummary: ["bridge_readiness_config_invalid"],
      expectedFiles: Array.isArray(config.expectedFiles) ? [...config.expectedFiles] : [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const safeSummary: string[] = [];
  const expectedFiles = [...config.expectedFiles];

  if (config.allowCommandFiles) {
    pushSafeUnique(safeSummary, "unsafe_allow_command_files");
    return {
      ok: false,
      status: "unsafe",
      errors: ["allowCommandFiles_must_remain_false"],
      warnings: [],
      safeSummary,
      expectedFiles,
    };
  }

  if (!config.enabled) {
    pushSafeUnique(safeSummary, "bridge_disabled");
    pushSafeUnique(safeSummary, "not_configured_safe_default");
    return {
      ok: true,
      status: "not_configured",
      errors: [],
      warnings: [],
      safeSummary,
      expectedFiles,
    };
  }

  pushSafeUnique(safeSummary, "bridge_enabled_flag_true");

  const folder = config.bridgeFolder.trim();
  if (!folder) {
    pushSafeUnique(safeSummary, "missing_bridge_folder_config");
    return {
      ok: false,
      status: "invalid",
      errors: ["bridge_folder_required_when_enabled"],
      warnings: [],
      safeSummary,
      expectedFiles,
    };
  }

  if (!config.readOnly) {
    errors.push("read_only_required_for_bridge_readiness");
    pushSafeUnique(safeSummary, "policy_read_only_not_acknowledged");
    return {
      ok: false,
      status: "invalid",
      errors,
      warnings,
      safeSummary,
      expectedFiles,
    };
  }

  pushSafeUnique(safeSummary, "read_only_posture_acknowledged");

  if (!deps?.exists) {
    warnings.push("bridge_folder_not_verified_no_probe");
    pushSafeUnique(safeSummary, "bridge_readiness_not_verified_no_deps");
    pushSafeUnique(safeSummary, "ready_for_read_only_validation_not_confirmed");
    return {
      ok: true,
      status: "unknown",
      errors: [],
      warnings,
      safeSummary,
      expectedFiles,
    };
  }

  if (!deps.exists(folder)) {
    errors.push("bridge_folder_missing_on_disk");
    pushSafeUnique(safeSummary, "bridge_folder_absent");
    return {
      ok: false,
      status: "missing",
      errors,
      warnings,
      safeSummary,
      expectedFiles,
    };
  }

  pushSafeUnique(safeSummary, "bridge_folder_present_shape_only");

  if (expectedFiles.length === 0) {
    warnings.push("expected_files_empty");
    pushSafeUnique(safeSummary, "bridge_ready_for_read_only_validation_no_expected_files");
    return {
      ok: true,
      status: "ready",
      errors: [],
      warnings,
      safeSummary,
      expectedFiles,
      presentFiles: [],
    };
  }

  if (!deps.listFiles) {
    warnings.push("expected_files_not_verified_no_list_probe");
    pushSafeUnique(safeSummary, "bridge_readiness_partial_no_list_files_dep");
    return {
      ok: true,
      status: "unknown",
      errors: [],
      warnings,
      safeSummary,
      expectedFiles,
    };
  }

  const listed = deps.listFiles(folder);
  const listedLower = new Set(listed.map((n) => n.toLowerCase()));
  const presentFiles: string[] = [];
  const missing: string[] = [];

  for (const name of expectedFiles) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (listedLower.has(trimmed.toLowerCase())) {
      presentFiles.push(trimmed);
    } else {
      missing.push(trimmed);
    }
  }

  if (missing.length > 0) {
    errors.push("expected_bridge_files_missing");
    pushSafeUnique(safeSummary, "bridge_expected_files_incomplete");
    return {
      ok: false,
      status: "missing",
      errors,
      warnings,
      safeSummary,
      expectedFiles,
      presentFiles,
    };
  }

  pushSafeUnique(safeSummary, "bridge_expected_files_present_read_only");
  pushSafeUnique(safeSummary, "ready_for_read_only_validation");
  return {
    ok: true,
    status: "ready",
    errors: [],
    warnings,
    safeSummary,
    expectedFiles,
    presentFiles,
  };
}

export interface Mt5BridgeReadinessSafetyAssertion {
  ok: boolean;
  errors: string[];
}

/** Ensures serialized readiness output carries no private markers or operational lies. */
export function assertMt5BridgeReadinessSafety(
  result: Mt5BridgeReadinessResult,
): Mt5BridgeReadinessSafetyAssertion {
  const errors: string[] = [];
  let raw: string;
  try {
    raw = JSON.stringify(result);
  } catch {
    return { ok: false, errors: ["result_not_json_serializable"] };
  }

  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(raw)) errors.push(`disallowed_private_fragment_in_json:${re.source}`);
  }
  if (OPERATIONAL_FRAGMENTS.test(raw)) {
    errors.push("disallowed_operational_marker_in_json");
  }

  return { ok: errors.length === 0, errors };
}
