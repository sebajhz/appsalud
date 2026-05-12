/**
 * D14.4 — Pure TypeScript model for a future local launcher wrapper (design / dry-run only).
 * Does not start processes, does not perform filesystem I/O, does not launch MT5 or trading surfaces.
 */

import {
  createDefaultLauncherConfig,
  sanitizeLauncherConfigForDisplay,
  validateLauncherConfig,
  type LauncherConfig,
} from "./mapazapp-launcher-config-model";

export type LocalLauncherWrapperMode =
  | "design_only"
  | "dry_run"
  | "supervisor_backed"
  | "packaged_future";

export type LocalLauncherComponentKind =
  | "api"
  | "dashboard"
  | "supervisor"
  | "config"
  | "logs"
  | "evidence";

export type LocalLauncherWrapperActionId =
  | "validate_layout"
  | "validate_config"
  | "validate_ports"
  | "start"
  | "stop"
  | "status"
  | "export_evidence";

export interface LocalLauncherWrapperActionPolicy {
  actionId: LocalLauncherWrapperActionId;
  allowedInDesignOnly: boolean;
  allowedInDryRun: boolean;
  requiresProcessStart: boolean;
  requiresFilesystemWrite: boolean;
  requiresExplicitApproval: boolean;
  description: string;
  blockedReason?: string;
}

export interface LocalLauncherWrapperSafety {
  executionEnabled: false;
  tradingEnabled: false;
  mt5LaunchEnabled: false;
  actionTransportEnabled: false;
  postRoutesEnabled: false;
  commandFilesEnabled: false;
  filesystemWritesEnabled: false;
  processStartEnabled: false;
  installerEnabled: false;
  manualApprovalRequired: true;
}

export type LocalLauncherWrapperLayoutRootStrategy = "portable" | "appData" | "undecided";

export interface LocalLauncherWrapperLayoutFolders {
  launcher: string;
  apiServer: string;
  dashboard: string;
  config: string;
  logs: string;
  evidence: string;
  runtime: string;
  backups: string;
  support: string;
}

export interface LocalLauncherWrapperLayoutRef {
  rootStrategy: LocalLauncherWrapperLayoutRootStrategy;
  folders: LocalLauncherWrapperLayoutFolders;
  writesAllowed: false;
}

export interface LocalLauncherWrapperComponent {
  kind: LocalLauncherComponentKind;
  managedConceptually: boolean;
  safeSummary: string[];
}

export interface LocalLauncherWrapperEvidenceRef {
  exportFormat: "json";
  redactionPolicy: "d13_style";
  safeSummary: string[];
}

export interface LocalLauncherWrapperValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface LocalLauncherWrapperModel {
  mode: LocalLauncherWrapperMode;
  name: string;
  version: string;
  createdAt: string;
  components: LocalLauncherWrapperComponent[];
  actions: LocalLauncherWrapperActionPolicy[];
  safety: LocalLauncherWrapperSafety;
  layout: LocalLauncherWrapperLayoutRef;
  config: LauncherConfig;
  evidence: LocalLauncherWrapperEvidenceRef;
  notes: string[];
}

export interface CreateDefaultLocalLauncherWrapperModelOptions {
  mode?: LocalLauncherWrapperMode;
  name?: string;
  version?: string;
  createdAt?: string;
  components?: LocalLauncherWrapperComponent[];
  actions?: LocalLauncherWrapperActionPolicy[];
  safety?: Partial<LocalLauncherWrapperSafety>;
  layout?: Partial<Pick<LocalLauncherWrapperLayoutRef, "rootStrategy" | "folders">>;
  config?: LauncherConfig;
  evidence?: Partial<LocalLauncherWrapperEvidenceRef>;
  notes?: string[];
}

export interface LocalLauncherWrapperSafetyAssertion {
  ok: boolean;
  errors: string[];
}

export type LocalLauncherWrapperPlanStepState = "allowed" | "blocked" | "dry_run_outline";

export interface LocalLauncherWrapperPlanStep {
  actionId: LocalLauncherWrapperActionId;
  state: LocalLauncherWrapperPlanStepState;
  reason: string;
  requiresProcessStart: boolean;
  requiresFilesystemWrite: boolean;
}

export interface LocalLauncherWrapperActionPlan {
  mode: LocalLauncherWrapperMode;
  createdAt: string;
  steps: LocalLauncherWrapperPlanStep[];
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

const ALL_ACTION_IDS: LocalLauncherWrapperActionId[] = [
  "validate_layout",
  "validate_config",
  "validate_ports",
  "start",
  "stop",
  "status",
  "export_evidence",
];

function pushUnique(acc: string[], token: string): void {
  if (!acc.includes(token)) acc.push(token);
}

function defaultLayoutFolders(): LocalLauncherWrapperLayoutFolders {
  return {
    launcher: "Mapazapp/launcher",
    apiServer: "Mapazapp/api-server",
    dashboard: "Mapazapp/dashboard",
    config: "Mapazapp/config",
    logs: "Mapazapp/logs",
    evidence: "Mapazapp/evidence",
    runtime: "Mapazapp/runtime",
    backups: "Mapazapp/backups",
    support: "Mapazapp/support",
  };
}

function defaultComponents(): LocalLauncherWrapperComponent[] {
  const kinds: LocalLauncherComponentKind[] = [
    "api",
    "dashboard",
    "supervisor",
    "config",
    "logs",
    "evidence",
  ];
  return kinds.map((kind) => ({
    kind,
    managedConceptually: true,
    safeSummary: [`component_managed_conceptually:${kind}`],
  }));
}

function defaultActionPolicies(): LocalLauncherWrapperActionPolicy[] {
  return [
    {
      actionId: "validate_layout",
      allowedInDesignOnly: true,
      allowedInDryRun: true,
      requiresProcessStart: false,
      requiresFilesystemWrite: false,
      requiresExplicitApproval: false,
      description: "Declarative layout checks against D14.1 (no mkdir/write).",
    },
    {
      actionId: "validate_config",
      allowedInDesignOnly: true,
      allowedInDryRun: true,
      requiresProcessStart: false,
      requiresFilesystemWrite: false,
      requiresExplicitApproval: false,
      description: "Validate LauncherConfig (D11.1) without persisting files.",
    },
    {
      actionId: "validate_ports",
      allowedInDesignOnly: true,
      allowedInDryRun: true,
      requiresProcessStart: false,
      requiresFilesystemWrite: false,
      requiresExplicitApproval: false,
      description: "Port policy review without binding listeners.",
    },
    {
      actionId: "status",
      allowedInDesignOnly: true,
      allowedInDryRun: true,
      requiresProcessStart: false,
      requiresFilesystemWrite: false,
      requiresExplicitApproval: false,
      description: "Aggregated conceptual status (no live probes required).",
    },
    {
      actionId: "export_evidence",
      allowedInDesignOnly: true,
      allowedInDryRun: true,
      requiresProcessStart: false,
      requiresFilesystemWrite: false,
      requiresExplicitApproval: true,
      description: "Prepare sanitized evidence bundle metadata (no I/O here).",
    },
    {
      actionId: "start",
      allowedInDesignOnly: false,
      allowedInDryRun: true,
      requiresProcessStart: true,
      requiresFilesystemWrite: false,
      requiresExplicitApproval: true,
      description: "Future supervised start sequence (blocked until D14.6 gate).",
      blockedReason: "future_process_start_requires_gate_d14_6",
    },
    {
      actionId: "stop",
      allowedInDesignOnly: false,
      allowedInDryRun: true,
      requiresProcessStart: true,
      requiresFilesystemWrite: false,
      requiresExplicitApproval: true,
      description: "Future supervised stop sequence (blocked until D14.6 gate).",
      blockedReason: "future_process_stop_requires_gate_d14_6",
    },
  ];
}

function assertSafetyShape(safety: LocalLauncherWrapperSafety): string[] {
  const errors: string[] = [];
  if (safety.executionEnabled !== false) errors.push("executionEnabled_must_remain_false");
  if (safety.tradingEnabled !== false) errors.push("tradingEnabled_must_remain_false");
  if (safety.mt5LaunchEnabled !== false) errors.push("mt5LaunchEnabled_must_remain_false");
  if (safety.actionTransportEnabled !== false) errors.push("actionTransportEnabled_must_remain_false");
  if (safety.postRoutesEnabled !== false) errors.push("postRoutesEnabled_must_remain_false");
  if (safety.commandFilesEnabled !== false) errors.push("commandFilesEnabled_must_remain_false");
  if (safety.filesystemWritesEnabled !== false) errors.push("filesystemWritesEnabled_must_remain_false");
  if (safety.processStartEnabled !== false) errors.push("processStartEnabled_must_remain_false");
  if (safety.installerEnabled !== false) errors.push("installerEnabled_must_remain_false");
  if (safety.manualApprovalRequired !== true) errors.push("manualApprovalRequired_must_remain_true");
  return errors;
}

/**
 * Safe-by-default wrapper model: design_only, no execution flags, conceptual layout only.
 */
export function createDefaultLocalLauncherWrapperModel(
  options?: CreateDefaultLocalLauncherWrapperModelOptions,
): LocalLauncherWrapperModel {
  const baseSafety: LocalLauncherWrapperSafety = {
    executionEnabled: false,
    tradingEnabled: false,
    mt5LaunchEnabled: false,
    actionTransportEnabled: false,
    postRoutesEnabled: false,
    commandFilesEnabled: false,
    filesystemWritesEnabled: false,
    processStartEnabled: false,
    installerEnabled: false,
    manualApprovalRequired: true,
  };
  const safety: LocalLauncherWrapperSafety = { ...baseSafety, ...options?.safety };

  const baseFolders = defaultLayoutFolders();
  const folders =
    options?.layout?.folders !== undefined ? { ...baseFolders, ...options.layout.folders } : baseFolders;
  const layout: LocalLauncherWrapperLayoutRef = {
    rootStrategy: options?.layout?.rootStrategy ?? "undecided",
    folders,
    writesAllowed: false,
  };

  return {
    mode: options?.mode ?? "design_only",
    name: options?.name ?? "local_launcher_wrapper",
    version: options?.version ?? "0",
    createdAt: options?.createdAt ?? "1970-01-01T00:00:00.000Z",
    components: options?.components ?? defaultComponents(),
    actions: options?.actions ?? defaultActionPolicies(),
    safety,
    layout,
    config: options?.config ?? createDefaultLauncherConfig(),
    evidence: {
      exportFormat: "json",
      redactionPolicy: "d13_style",
      safeSummary: ["evidence_slot_declarative_only"],
      ...options?.evidence,
    },
    notes: options?.notes ?? [],
  };
}

function collectActionCoverage(actions: LocalLauncherWrapperActionPolicy[]): string[] {
  const errors: string[] = [];
  const seen = new Set<LocalLauncherWrapperActionId>();
  for (const row of actions) {
    if (seen.has(row.actionId)) errors.push(`duplicate_action_policy:${row.actionId}`);
    seen.add(row.actionId);
  }
  for (const id of ALL_ACTION_IDS) {
    if (!seen.has(id)) errors.push(`missing_action_policy:${id}`);
  }
  return errors;
}

/**
 * Structural + policy validation for the wrapper model (no I/O).
 */
export function validateLocalLauncherWrapperModel(model: LocalLauncherWrapperModel): LocalLauncherWrapperValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof model.name !== "string" || !model.name.trim()) errors.push("name_required");
  if (typeof model.version !== "string" || !model.version.trim()) errors.push("version_required");
  if (typeof model.createdAt !== "string" || !model.createdAt.trim()) errors.push("createdAt_required");

  errors.push(...assertSafetyShape(model.safety));

  if (model.mode === "design_only" && model.safety.processStartEnabled) {
    errors.push("design_only_forbids_process_start_flag");
  }

  if (model.layout.writesAllowed !== false) {
    errors.push("layout_writesAllowed_must_remain_false");
  }

  errors.push(...collectActionCoverage(model.actions));

  const cfgResult = validateLauncherConfig(model.config);
  if (!cfgResult.ok) {
    errors.push(...cfgResult.errors.map((e) => `launcher_config:${e}`));
    warnings.push(...cfgResult.warnings);
  } else {
    warnings.push(...cfgResult.warnings);
  }

  if (model.mode === "packaged_future") {
    warnings.push("packaged_future_mode_is_documentation_only_in_d14_4");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * JSON safety scan over validation output or full model snapshot (sanitized).
 */
export function assertLocalLauncherWrapperSafety(
  input: LocalLauncherWrapperModel | LocalLauncherWrapperValidationResult,
): LocalLauncherWrapperSafetyAssertion {
  const validation =
    "mode" in input ? validateLocalLauncherWrapperModel(input) : input;

  let raw: string;
  try {
    raw = JSON.stringify(validation);
  } catch {
    return { ok: false, errors: ["payload_not_json_serializable"] };
  }

  const errors: string[] = [];
  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(raw)) pushUnique(errors, `disallowed_private_fragment:${re.source}`);
  }
  if (OPERATIONAL_FRAGMENTS.test(raw)) pushUnique(errors, "disallowed_operational_marker");
  if (SECRETISH.test(raw)) pushUnique(errors, "disallowed_secretish_token_pattern");

  return { ok: errors.length === 0, errors };
}

function policyFor(
  model: LocalLauncherWrapperModel,
  id: LocalLauncherWrapperActionId,
): LocalLauncherWrapperActionPolicy | undefined {
  return model.actions.find((a) => a.actionId === id);
}

function resolveStepState(
  model: LocalLauncherWrapperModel,
  policy: LocalLauncherWrapperActionPolicy,
): LocalLauncherWrapperPlanStep {
  const requiresProcessStart = policy.requiresProcessStart;
  const requiresFilesystemWrite = policy.requiresFilesystemWrite;

  if (requiresFilesystemWrite) {
    return {
      actionId: policy.actionId,
      state: "blocked",
      reason: "filesystem_writes_disabled",
      requiresProcessStart,
      requiresFilesystemWrite,
    };
  }

  if (requiresProcessStart && model.safety.processStartEnabled === false) {
    if (policy.actionId === "start" || policy.actionId === "stop") {
      if (model.mode === "dry_run") {
        return {
          actionId: policy.actionId,
          state: "dry_run_outline",
          reason: "outline_only_no_process_start_in_d14_4",
          requiresProcessStart,
          requiresFilesystemWrite,
        };
      }
      return {
        actionId: policy.actionId,
        state: "blocked",
        reason: policy.blockedReason ?? "process_start_disabled",
        requiresProcessStart,
        requiresFilesystemWrite,
      };
    }
  }

  const modeAllows =
    model.mode === "design_only"
      ? policy.allowedInDesignOnly
      : policy.allowedInDryRun || policy.allowedInDesignOnly;

  if (!modeAllows) {
    return {
      actionId: policy.actionId,
      state: "blocked",
      reason: policy.blockedReason ?? "action_not_allowed_for_mode",
      requiresProcessStart,
      requiresFilesystemWrite,
    };
  }

  return {
    actionId: policy.actionId,
    state: "allowed",
    reason: "allowed_declarative_only",
    requiresProcessStart,
    requiresFilesystemWrite,
  };
}

/**
 * Builds an ordered declarative plan for validate/status vs future start/stop.
 */
export function createLocalLauncherWrapperActionPlan(
  model: LocalLauncherWrapperModel,
  options?: { createdAt?: string },
): LocalLauncherWrapperActionPlan {
  const order: LocalLauncherWrapperActionId[] = [
    "validate_layout",
    "validate_config",
    "validate_ports",
    "status",
    "export_evidence",
    "start",
    "stop",
  ];
  const steps: LocalLauncherWrapperPlanStep[] = [];
  for (const id of order) {
    const policy = policyFor(model, id);
    if (!policy) continue;
    steps.push(resolveStepState(model, policy));
  }
  return {
    mode: model.mode,
    createdAt: options?.createdAt ?? model.createdAt,
    steps,
  };
}

/**
 * Stable JSON snapshot for evidence (sanitized paths, no raw secrets).
 */
export function serializeLocalLauncherWrapperModel(model: LocalLauncherWrapperModel): string {
  const sanitized = sanitizeLocalLauncherWrapperForDisplay(model);
  const validation = validateLocalLauncherWrapperModel(sanitized);
  const snapshot = {
    model: sanitized,
    validation,
  };
  return JSON.stringify(snapshot);
}

/**
 * Display-oriented copy: redacts launcher config paths; keeps conceptual layout tokens.
 */
export function sanitizeLocalLauncherWrapperForDisplay(model: LocalLauncherWrapperModel): LocalLauncherWrapperModel {
  return {
    ...model,
    config: sanitizeLauncherConfigForDisplay(model.config),
    notes: model.notes.map((n) => scrubNote(n)),
  };
}

function scrubNote(note: string): string {
  let out = note;
  for (const re of PRIVATE_FRAGMENTS) {
    out = out.replace(re, "[redacted_path]");
  }
  return out;
}

export function assertLocalLauncherWrapperModelSafetyFromSerializedJson(json: string): LocalLauncherWrapperSafetyAssertion {
  const errors: string[] = [];
  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(json)) pushUnique(errors, `disallowed_private_fragment:${re.source}`);
  }
  if (OPERATIONAL_FRAGMENTS.test(json)) pushUnique(errors, "disallowed_operational_marker");
  if (SECRETISH.test(json)) pushUnique(errors, "disallowed_secretish_token_pattern");
  return { ok: errors.length === 0, errors };
}
