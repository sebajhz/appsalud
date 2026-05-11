/**
 * D11.4 — Declarative launcher child process lifecycle model (no OS APIs).
 * Does not start or stop real processes; commandLabel is a safe tag, not a shell command.
 */

export type LauncherChildProcessKind = "api" | "dashboard" | "mt5" | "bridge" | "unknown";

export type LauncherChildProcessStatus =
  | "not_started"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "failed"
  | "unknown";

export interface LauncherChildProcessRecord {
  kind: LauncherChildProcessKind;
  status: LauncherChildProcessStatus;
  pid: number | null;
  startedAt: string | null;
  stoppedAt: string | null;
  ownedByLauncher: boolean;
  /** Safe tag only (e.g. api_service); never a shell command string. */
  commandLabel: string;
  port: number | null;
  safeSummary: string[];
}

export interface LauncherProcessLifecycleModel {
  api: LauncherChildProcessRecord;
  dashboard: LauncherChildProcessRecord;
  mt5: LauncherChildProcessRecord;
  bridge: LauncherChildProcessRecord;
  unknownChild: LauncherChildProcessRecord | null;
  shutdownRequested: boolean;
  lastError: string | null;
  transitionWarnings: string[];
  generatedAt: string;
}

export interface CreateDefaultLauncherProcessLifecycleModelOptions {
  generatedAt?: string;
}

export interface CreateChildProcessRecordOptions {
  kind?: LauncherChildProcessKind;
  status?: LauncherChildProcessStatus;
  pid?: number | null;
  startedAt?: string | null;
  stoppedAt?: string | null;
  ownedByLauncher?: boolean;
  commandLabel?: string;
  port?: number | null;
  safeSummary?: string[];
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

const DEFAULT_LABELS: Record<Exclude<LauncherChildProcessKind, "unknown">, string> = {
  api: "api_service",
  dashboard: "dashboard_service",
  mt5: "mt5_terminal",
  bridge: "bridge_sidecar",
};

function defaultChild(kind: Exclude<LauncherChildProcessKind, "unknown">): LauncherChildProcessRecord {
  return {
    kind,
    status: "not_started",
    pid: null,
    startedAt: null,
    stoppedAt: null,
    ownedByLauncher: false,
    commandLabel: DEFAULT_LABELS[kind],
    port: null,
    safeSummary: kind === "mt5" ? ["mt5_not_configured_default"] : ["child_not_started_default"],
  };
}

/**
 * Default lifecycle posture: nothing running, MT5 not configured, no shutdown requested.
 */
export function createDefaultLauncherProcessLifecycleModel(
  options?: CreateDefaultLauncherProcessLifecycleModelOptions,
): LauncherProcessLifecycleModel {
  const generatedAt = options?.generatedAt ?? "1970-01-01T00:00:00.000Z";
  return {
    api: defaultChild("api"),
    dashboard: defaultChild("dashboard"),
    mt5: defaultChild("mt5"),
    bridge: defaultChild("bridge"),
    unknownChild: null,
    shutdownRequested: false,
    lastError: null,
    transitionWarnings: [],
    generatedAt,
  };
}

/**
 * Builds a declarative child record; does not execute commandLabel.
 */
export function createChildProcessRecord(options: CreateChildProcessRecordOptions): LauncherChildProcessRecord {
  const kind = options.kind ?? "unknown";
  const status = options.status ?? "not_started";
  const pid = options.pid ?? null;

  if (status === "running" && (pid === null || !Number.isInteger(pid) || pid <= 0)) {
    throw new TypeError("Lifecycle record: running requires a positive integer pid.");
  }

  const commandLabel =
    options.commandLabel ??
    (kind === "unknown" ? "unknown_service" : DEFAULT_LABELS[kind as Exclude<LauncherChildProcessKind, "unknown">]);

  if (commandLabel.trim().length === 0) {
    throw new TypeError("commandLabel must be a non-empty safe tag.");
  }
  if (/[;&|`$<>]/.test(commandLabel) || /[/\\]/.test(commandLabel)) {
    throw new TypeError("commandLabel must not contain shell metacharacters or path separators.");
  }

  return {
    kind,
    status,
    pid,
    startedAt: options.startedAt ?? null,
    stoppedAt: options.stoppedAt ?? null,
    ownedByLauncher: options.ownedByLauncher ?? false,
    commandLabel,
    port: options.port ?? null,
    safeSummary: options.safeSummary ?? [],
  };
}

type KnownKind = Exclude<LauncherChildProcessKind, "unknown">;

function patchChild(
  model: LauncherProcessLifecycleModel,
  kind: LauncherChildProcessKind,
  next: LauncherChildProcessRecord,
  extraWarnings: string[],
): LauncherProcessLifecycleModel {
  if (kind === "unknown") {
    return {
      ...model,
      unknownChild: next,
      transitionWarnings: [...model.transitionWarnings, ...extraWarnings],
    };
  }
  return {
    ...model,
    [kind]: next,
    transitionWarnings: [...model.transitionWarnings, ...extraWarnings],
  } as LauncherProcessLifecycleModel;
}

function getChild(model: LauncherProcessLifecycleModel, kind: LauncherChildProcessKind): LauncherChildProcessRecord {
  if (kind === "unknown") {
    return model.unknownChild ?? createChildProcessRecord({ kind: "unknown", commandLabel: "unknown_service" });
  }
  return model[kind];
}

/**
 * Marks a child as starting (declarative only).
 */
export function markChildStarting(
  model: LauncherProcessLifecycleModel,
  kind: LauncherChildProcessKind,
  nowIso: string,
): LauncherProcessLifecycleModel {
  const cur = getChild(model, kind);
  const next: LauncherChildProcessRecord = {
    ...cur,
    status: "starting",
    startedAt: nowIso,
    stoppedAt: null,
    safeSummary: [...cur.safeSummary.filter((t) => !t.startsWith("child_failed:"))],
  };
  pushSafeUnique(next.safeSummary, "child_starting_declarative");
  return patchChild(model, kind, next, []);
}

/**
 * Marks running; emits a transition warning if the launcher does not own the process.
 */
export function markChildRunning(
  model: LauncherProcessLifecycleModel,
  kind: LauncherChildProcessKind,
  args: { pid: number; nowIso: string; ownedByLauncher?: boolean },
): LauncherProcessLifecycleModel {
  const owned = args.ownedByLauncher ?? false;
  const warnings: string[] = [];
  if (!owned) {
    warnings.push("running_without_launcher_ownership");
  }
  const cur = getChild(model, kind);
  const next: LauncherChildProcessRecord = {
    ...cur,
    status: "running",
    pid: args.pid,
    startedAt: cur.startedAt ?? args.nowIso,
    ownedByLauncher: owned,
    safeSummary: [...cur.safeSummary],
  };
  pushSafeUnique(next.safeSummary, "child_running_declarative");
  return patchChild(model, kind, next, warnings);
}

/**
 * Declarative stop: only meaningful when ownedByLauncher is true; otherwise records a warning and leaves state unchanged.
 */
export function markChildStopped(
  model: LauncherProcessLifecycleModel,
  kind: LauncherChildProcessKind,
  nowIso: string,
): LauncherProcessLifecycleModel {
  const cur = getChild(model, kind);
  if (!cur.ownedByLauncher) {
    return patchChild(model, kind, { ...cur }, ["stop_ignored_not_owned_by_launcher"]);
  }
  const next: LauncherChildProcessRecord = {
    ...cur,
    status: "stopped",
    stoppedAt: nowIso,
    pid: null,
    safeSummary: [...cur.safeSummary],
  };
  pushSafeUnique(next.safeSummary, "child_stopped_declarative");
  return patchChild(model, kind, next, []);
}

/**
 * Marks failed with a redacted summary token (no raw OS errors in-model).
 */
export function markChildFailed(
  model: LauncherProcessLifecycleModel,
  kind: LauncherChildProcessKind,
  rawMessage: string,
  nowIso: string,
): LauncherProcessLifecycleModel {
  const token = sanitizeLifecycleFailureToken(rawMessage);
  const cur = getChild(model, kind);
  const next: LauncherChildProcessRecord = {
    ...cur,
    status: "failed",
    stoppedAt: nowIso,
    pid: null,
    safeSummary: [...cur.safeSummary, `child_failed:${token}`],
  };
  return {
    ...patchChild(model, kind, next, []),
    lastError: token,
    generatedAt: nowIso,
  };
}

/**
 * Requests shutdown at the launcher level; does not terminate OS processes.
 */
export function requestLauncherShutdown(
  model: LauncherProcessLifecycleModel,
  nowIso: string,
): LauncherProcessLifecycleModel {
  return {
    ...model,
    shutdownRequested: true,
    generatedAt: nowIso,
    transitionWarnings: [...model.transitionWarnings, "shutdown_requested_declarative_only"],
  };
}

export function sanitizeLifecycleFailureToken(raw: string): string {
  const s = raw.trim().slice(0, 200);
  if (s.length === 0) return "empty_error";
  let low = s.toLowerCase();
  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(low)) return "error_redacted_private_marker";
  }
  if (OPERATIONAL_FRAGMENTS.test(low)) return "error_redacted_operational_marker";
  if (SECRETISH.test(low)) return "error_redacted_secretish_marker";
  const alnum = low.replace(/[^a-z0-9_]+/g, "_").slice(0, 64);
  return alnum.length > 0 ? alnum : "generic_failure";
}

export interface LauncherProcessLifecycleSafetyAssertion {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Structural + JSON hygiene checks on the lifecycle model snapshot.
 */
export function assertLauncherProcessLifecycleSafety(
  model: LauncherProcessLifecycleModel,
): LauncherProcessLifecycleSafetyAssertion {
  const errors: string[] = [];
  const warnings: string[] = [];

  let raw: string;
  try {
    raw = JSON.stringify(model);
  } catch {
    return { ok: false, errors: ["model_not_json_serializable"], warnings: [] };
  }

  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(raw)) errors.push(`disallowed_private_fragment:${re.source}`);
  }
  if (OPERATIONAL_FRAGMENTS.test(raw)) errors.push("disallowed_operational_marker");
  if (SECRETISH.test(raw)) errors.push("disallowed_secretish_marker");

  const rows: LauncherChildProcessRecord[] = [
    model.api,
    model.dashboard,
    model.mt5,
    model.bridge,
    ...(model.unknownChild ? [model.unknownChild] : []),
  ];

  for (const row of rows) {
    if (row.status === "running" && !row.ownedByLauncher) {
      warnings.push(`running_without_ownership:${row.kind}`);
    }
    if ((row.kind === "api" || row.kind === "dashboard") && row.status === "running" && !row.ownedByLauncher) {
      /* covered by warning above */
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
