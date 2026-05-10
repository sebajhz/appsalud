/**
 * D10.1 — Pure MT5 configuration validation model (no launch, no filesystem unless deps injected).
 * Does not claim connectivity, does not execute MT5, does not write command files.
 */

export type Mt5ConfigValidationStatus = "valid" | "invalid" | "not_configured" | "unsafe";

export type Mt5TerminalKind = "mt5" | "unknown";

export interface Mt5Config {
  enabled: boolean;
  terminalPath: string | null;
  dataFolder: string | null;
  mql5FilesFolder: string | null;
  bridgeFolder: string | null;
  allowedReadOnly: boolean;
  allowLaunch: boolean;
  allowCommandFiles: boolean;
}

export interface Mt5ConfigValidationResult {
  ok: boolean;
  status: Mt5ConfigValidationStatus;
  errors: string[];
  warnings: string[];
  safeSummary: string[];
  terminalKind: Mt5TerminalKind;
}

export interface Mt5ConfigValidatorDeps {
  /** Optional read-only existence check; omit for purely structural validation. */
  pathExists?: (absolutePath: string) => boolean;
  /** Optional directory check; omit when not needed. */
  isDirectory?: (absolutePath: string) => boolean;
}

export interface CreateDefaultMt5ConfigOptions extends Partial<Mt5Config> {}

const PRIVATE_FRAGMENTS = [
  /c:\\users\\/i,
  /\/users\//i,
  /appdata/i,
  /metaquotes/i,
  /terminal64\.exe/i,
] as const;

const OPERATIONAL_FRAGMENTS =
  /\b(mt5 connected|bridge connected|ready to trade|ordersend|ctrade)\b/i;

export function createDefaultMt5Config(options?: CreateDefaultMt5ConfigOptions): Mt5Config {
  const base: Mt5Config = {
    enabled: false,
    terminalPath: null,
    dataFolder: null,
    mql5FilesFolder: null,
    bridgeFolder: null,
    allowedReadOnly: false,
    allowLaunch: false,
    allowCommandFiles: false,
  };
  if (!options) return { ...base };
  return { ...base, ...options };
}

/** Infer terminal kind from path shape only; never echoes raw path in outputs. */
export function inferMt5TerminalKind(terminalPath: string | null): Mt5TerminalKind {
  if (!terminalPath || !terminalPath.trim()) return "unknown";
  if (/terminal64\.exe\s*$/i.test(terminalPath.trim())) return "mt5";
  return "unknown";
}

/**
 * Redact common Windows/macOS/Linux privacy segments for display-oriented strings.
 */
export function sanitizeMt5PathForDisplay(path: string | null): string | null {
  if (path === null) return null;
  let s = path.replace(/\\/g, "/");
  s = s.replace(/c:\/users\/[^/]+/i, "[users]/[profile]");
  s = s.replace(/^\/users\/[^/]+/i, "[users]/[profile]");
  s = s.replace(/appdata/gi, "[USERDATA]");
  s = s.replace(/metaquotes/gi, "[VENDOR]");
  s = s.replace(/terminal64\.exe/gi, "[TERMINAL_BINARY]");
  return s;
}

function pushSafeUnique(acc: string[], token: string): void {
  if (!acc.includes(token)) acc.push(token);
}

function anyPathConfigured(config: Mt5Config): boolean {
  return [config.terminalPath, config.dataFolder, config.mql5FilesFolder, config.bridgeFolder].some(
    (p) => typeof p === "string" && p.trim().length > 0,
  );
}

export function validateMt5Config(
  config: Mt5Config,
  deps?: Mt5ConfigValidatorDeps,
): Mt5ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const safeSummary: string[] = [];
  const terminalKind = inferMt5TerminalKind(config.terminalPath);

  if (config.allowLaunch) {
    pushSafeUnique(safeSummary, "unsafe_allow_launch");
    return {
      ok: false,
      status: "unsafe",
      errors: ["allowLaunch_must_remain_false"],
      warnings: [],
      safeSummary,
      terminalKind,
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
      terminalKind,
    };
  }

  if (!config.enabled) {
    pushSafeUnique(safeSummary, "mt5_disabled");
    pushSafeUnique(safeSummary, "not_configured_safe_default");
    return {
      ok: true,
      status: "not_configured",
      errors: [],
      warnings: [],
      safeSummary,
      terminalKind: "unknown",
    };
  }

  pushSafeUnique(safeSummary, "mt5_enabled_flag_true");
  if (terminalKind === "mt5") {
    pushSafeUnique(safeSummary, "terminal_shape_recognized");
  } else if (config.terminalPath?.trim()) {
    warnings.push("terminal_path_shape_unknown");
    pushSafeUnique(safeSummary, "terminal_shape_unknown");
  }

  if (anyPathConfigured(config) && !config.allowedReadOnly) {
    warnings.push("read_only_not_acknowledged");
    pushSafeUnique(safeSummary, "policy_read_only_not_acknowledged");
  }

  const checkPath = (
    label: "terminal" | "data" | "mql5" | "bridge",
    p: string | null,
  ): void => {
    if (p === null || !p.trim()) return;
    if (!deps?.pathExists) return;
    if (!deps.pathExists(p)) {
      errors.push(`${label}_path_missing_on_disk`);
    } else if (deps.isDirectory && !deps.isDirectory(p)) {
      warnings.push(`${label}_path_not_directory`);
    }
  };

  checkPath("terminal", config.terminalPath);
  checkPath("data", config.dataFolder);
  checkPath("mql5", config.mql5FilesFolder);
  checkPath("bridge", config.bridgeFolder);

  if (!anyPathConfigured(config)) {
    warnings.push("enabled_without_paths");
    pushSafeUnique(safeSummary, "partial_config_no_paths");
  }

  let status: Mt5ConfigValidationStatus = errors.length > 0 ? "invalid" : "valid";
  if (warnings.includes("enabled_without_paths") && errors.length === 0) {
    status = "not_configured";
  }

  const ok = status === "valid" || status === "not_configured";
  return {
    ok,
    status,
    errors,
    warnings,
    safeSummary,
    terminalKind,
  };
}

export interface Mt5ConfigSafetyAssertion {
  ok: boolean;
  errors: string[];
}

/** Ensures serialized validation output carries no private markers or operational lies. */
export function assertMt5ConfigSafety(result: Mt5ConfigValidationResult): Mt5ConfigSafetyAssertion {
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
