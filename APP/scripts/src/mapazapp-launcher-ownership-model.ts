/**
 * D11.5 — Single-instance and port ownership declarative model (no lockfile, no bind, no OS control).
 */

export type LauncherInstanceStatus = "not_locked" | "owned" | "conflict" | "stale" | "unknown";

export type LauncherPortOwnershipStatus =
  | "available"
  | "owned_by_launcher"
  | "occupied_by_other"
  | "unknown";

export type LauncherPortRole = "api" | "dashboard" | "mt5_bridge";

export interface LauncherPortEntry {
  role: LauncherPortRole;
  port: number;
  status: LauncherPortOwnershipStatus;
}

export interface LauncherOwnershipModel {
  instanceStatus: LauncherInstanceStatus;
  lockId: string | null;
  ownedPorts: LauncherPortEntry[];
  conflicts: string[];
  generatedAt: string;
}

const PRIVATE_FRAGMENTS = [
  /c:\\users\\/i,
  /\/users\//i,
  /appdata/i,
  /metaquotes/i,
  /terminal64\.exe/i,
] as const;

const SECRETISH = /\b(bearer\s+[a-z0-9._~-]{8,}|x-mapazapp-action-token"\s*:\s*"[^"]{4,})\b/i;

function pushSafeUnique(acc: string[], token: string): void {
  if (!acc.includes(token)) acc.push(token);
}

export interface CreateDefaultLauncherOwnershipModelOptions {
  generatedAt?: string;
  lockId?: string | null;
}

export function createDefaultLauncherOwnershipModel(
  options?: CreateDefaultLauncherOwnershipModelOptions,
): LauncherOwnershipModel {
  return {
    instanceStatus: "not_locked",
    lockId: options?.lockId !== undefined ? options.lockId : null,
    ownedPorts: [],
    conflicts: [],
    generatedAt: options?.generatedAt ?? "1970-01-01T00:00:00.000Z",
  };
}

export interface PortOwnershipDeps {
  /**
   * When omitted, every binding is `unknown` (no real probe).
   */
  resolveStatus?: (port: number, role: LauncherPortRole) => LauncherPortOwnershipStatus;
}

export interface EvaluatePortOwnershipInput {
  ports: ReadonlyArray<{ role: LauncherPortRole; port: number }>;
}

/**
 * Computes port rows and conflict tokens from injected probes only (no listen/bind).
 */
export function evaluatePortOwnership(
  base: LauncherOwnershipModel,
  input: EvaluatePortOwnershipInput,
  deps?: PortOwnershipDeps,
): LauncherOwnershipModel {
  const ownedPorts: LauncherPortEntry[] = [];
  const conflicts: string[] = [...base.conflicts];

  for (const p of input.ports) {
    const status = deps?.resolveStatus?.(p.port, p.role) ?? "unknown";
    ownedPorts.push({ role: p.role, port: p.port, status });
    if (status === "occupied_by_other") {
      pushSafeUnique(conflicts, `occupied_by_other:${p.role}`);
    }
  }

  return {
    ...base,
    ownedPorts,
    conflicts,
  };
}

export interface SingleInstanceEvaluateInput {
  lockId: string | null;
  conflictingLock: boolean;
  staleLockSignal: boolean;
  /** Explicit simulation: launcher instance legitimately holds the lock. */
  launcherHoldsLock: boolean;
}

/**
 * Declarative single-instance posture; does not create or remove lockfiles.
 */
export function evaluateSingleInstance(
  base: LauncherOwnershipModel,
  input: SingleInstanceEvaluateInput,
): LauncherOwnershipModel {
  let instanceStatus: LauncherInstanceStatus;
  if (input.staleLockSignal) {
    instanceStatus = "stale";
  } else if (input.conflictingLock) {
    instanceStatus = "conflict";
  } else if (input.launcherHoldsLock && input.lockId) {
    instanceStatus = "owned";
  } else if (!input.lockId) {
    instanceStatus = "not_locked";
  } else {
    instanceStatus = "unknown";
  }

  return {
    ...base,
    lockId: input.lockId,
    instanceStatus,
  };
}

export interface LauncherOwnershipSafetyAssertion {
  ok: boolean;
  errors: string[];
}

export function assertLauncherOwnershipSafety(model: LauncherOwnershipModel): LauncherOwnershipSafetyAssertion {
  const errors: string[] = [];
  let raw: string;
  try {
    raw = JSON.stringify(model);
  } catch {
    return { ok: false, errors: ["model_not_json_serializable"] };
  }

  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(raw)) errors.push(`disallowed_private_fragment:${re.source}`);
  }
  if (SECRETISH.test(raw)) errors.push("disallowed_secretish_marker");

  return { ok: errors.length === 0, errors };
}
