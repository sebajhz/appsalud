/**
 * D13.2 — API-only supervisor prototype: preflight, optional build, start api-server,
 * verify health + runtime safety, stop only owned child. Spawn is confined to this module.
 * Does not start dashboard, MT5, watcher, or action transport.
 */

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertLauncherConfigSafety,
  createDefaultLauncherConfig,
  validateLauncherConfig,
} from "./mapazapp-launcher-config-model";
import { defaultCheckPort, type PortProbeResult } from "./mapazapp-dev-preflight";
import { waitChildExit } from "./mapazapp-dev-start";

export const API_ONLY_SUPERVISOR_BANNER_LINES = [
  "Mapazapp API-only supervisor (D13.2 prototype)",
  "Starts only @workspace/api-server on loopback; not MapazappLauncher.exe.",
  "Does not start dashboard, MT5, watcher, command files, DB, long-lived push channels, or live order execution.",
] as const;

const USAGE = `mapazapp:api-only-supervisor (D13.2 prototype)

Usage:
  pnpm --filter @workspace/scripts mapazapp:api-only-supervisor [--options]

Options:
  --api-host <addr>       Must be 127.0.0.1 (default: 127.0.0.1)
  --api-port <n>        Default: 3001 (no automatic alternate port)
  --skip-build          Skip node build.mjs in artifacts/api-server (not recommended)
  --max-wait-ms <n>     Max wait for health + runtime after start (default: 25000)
  --json                Single JSON summary line on stdout at end
  --help, -h            Show this message

Exit codes:
  0  Supervised API start, health, runtime checks, and cleanup succeeded
  1  Preflight/build/start/health/runtime/cleanup failure
  2  Invalid arguments

Constraints:
  API-only; no dashboard; no MT5; no POST/action routes; no broad OS-wide process termination; only own child PID.
  Evidence-only local mock API — not live order execution.
`;

export type ParsedApiOnlySupervisorArgv =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      apiHost: string;
      apiPort: number;
      skipBuild: boolean;
      maxWaitMs: number;
      json: boolean;
    };

export function parseApiOnlySupervisorArgv(argv: string[]): ParsedApiOnlySupervisorArgv {
  let apiHost: string | undefined;
  let apiPort: number | undefined;
  let skipBuild = false;
  let json = false;
  let maxWaitMs: number | undefined;

  const takeOptInt = (raw: string | undefined, label: string): number | null => {
    if (raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {
      return null;
    }
    return n;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { kind: "help" };
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--skip-build") {
      skipBuild = true;
      continue;
    }
    if (a === "--api-host") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("-")) {
        return { kind: "error", message: "Missing value for --api-host." };
      }
      apiHost = v;
      i++;
      continue;
    }
    if (a === "--api-port") {
      const v = takeOptInt(argv[i + 1], "api-port");
      if (v === null || v > 65535) {
        return { kind: "error", message: "Invalid or missing value for --api-port (1-65535)." };
      }
      apiPort = v;
      i++;
      continue;
    }
    if (a === "--max-wait-ms") {
      const v = takeOptInt(argv[i + 1], "max-wait-ms");
      if (v === null || v > 600_000) {
        return { kind: "error", message: "Invalid or missing value for --max-wait-ms (1-600000)." };
      }
      maxWaitMs = v;
      i++;
      continue;
    }
    if (a.startsWith("-")) {
      return { kind: "error", message: `Unknown argument: ${a}` };
    }
    return { kind: "error", message: `Unexpected argument: ${a}` };
  }

  return {
    kind: "run",
    apiHost: apiHost ?? "127.0.0.1",
    apiPort: apiPort ?? 3001,
    skipBuild,
    maxWaitMs: maxWaitMs ?? 25_000,
    json,
  };
}

export interface ApiOnlySupervisorOptions {
  apiHost: string;
  apiPort: number;
  skipBuild: boolean;
  maxWaitMs: number;
}

export interface ApiOnlySupervisorResult {
  ok: boolean;
  phase: string;
  apiHost: string;
  apiPort: number;
  command: string;
  pid: number | null;
  ownedByLauncher: boolean;
  healthOk: boolean | null;
  runtimeStatusSummary: Record<string, unknown> | null;
  startedAt: string | null;
  stoppedAt: string | null;
  cleanupStatus: "ok" | "failed" | "skipped" | "pending";
  portFreed: boolean | null;
  executionEnabledReported: boolean | null;
  readOnlyReported: boolean | null;
  noMt5: boolean | null;
  errors: string[];
  warnings: string[];
  gitHead: string | null;
  gitStatusInitial: string | null;
  gitStatusFinal: string | null;
}

export interface FetchTextResult {
  ok: boolean;
  status: number;
  bodyText: string;
}

export interface ApiOnlySupervisorDeps {
  appRoot: string;
  checkPort(port: number): Promise<PortProbeResult>;
  spawnPnpm(args: string[], env: NodeJS.ProcessEnv): ChildProcess;
  fetchText(url: string, signal: AbortSignal): Promise<FetchTextResult>;
  now(): string;
  sleep(ms: number): Promise<void>;
  maxStopWaitMs: number;
  maxPortReleaseWaitMs: number;
  /** True when no listener accepts TCP on host:port (e.g. ECONNREFUSED). Injectable for unit tests. */
  waitUntilListenGone(host: string, port: number, deadlineMs: number): Promise<boolean>;
  gitHead(): string | null;
  gitStatusShort(): string | null;
}

function defaultAppRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..");
}

function drainChildStreams(child: ChildProcess): void {
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {});
}

function isApiServerFilterBuildArgs(args: string[]): boolean {
  return (
    args.length === 3 &&
    args[0] === "--filter" &&
    args[1] === "@workspace/api-server" &&
    args[2] === "build"
  );
}

function isApiServerFilterStartArgs(args: string[]): boolean {
  return (
    args.length === 3 &&
    args[0] === "--filter" &&
    args[1] === "@workspace/api-server" &&
    args[2] === "start"
  );
}

/**
 * Run api-server build/start via `node` in `artifacts/api-server` (matches that package's
 * npm scripts). Avoids `pnpm.cmd` + `shell: true`, where the reported child PID can be a
 * wrapper that exits while the real listener keeps running on Windows.
 */
function defaultSpawnPnpm(appRoot: string) {
  return (args: string[], env: NodeJS.ProcessEnv): ChildProcess => {
    const apiRoot = join(appRoot, "artifacts", "api-server");
    if (isApiServerFilterBuildArgs(args)) {
      return spawn(process.execPath, ["build.mjs"], {
        cwd: apiRoot,
        env,
        stdio: ["inherit", "pipe", "pipe"],
        windowsHide: true,
      });
    }
    if (isApiServerFilterStartArgs(args)) {
      return spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
        cwd: apiRoot,
        env,
        stdio: ["inherit", "pipe", "pipe"],
        windowsHide: true,
      });
    }
    throw new Error(`mapazapp-api-only-supervisor: unsupported spawn args: ${args.join(" ")}`);
  };
}

async function defaultFetchText(url: string, signal: AbortSignal): Promise<FetchTextResult> {
  const res = await fetch(url, { signal });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, bodyText };
}

function createDefaultWaitUntilListenGone(
  sleep: (ms: number) => Promise<void>,
): (host: string, port: number, deadlineMs: number) => Promise<boolean> {
  return async (host: string, port: number, deadlineMs: number): Promise<boolean> => {
    const deadline = Date.now() + deadlineMs;
    while (Date.now() < deadline) {
      const gone = await new Promise<boolean>((resolve) => {
        const socket = createConnection({ host, port });
        const timer = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 1500);
        socket.once("connect", () => {
          clearTimeout(timer);
          socket.destroy();
          resolve(false);
        });
        socket.once("error", (err: NodeJS.ErrnoException) => {
          clearTimeout(timer);
          if (err.code === "ECONNREFUSED" || err.code === "EHOSTUNREACH") {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
      if (gone) return true;
      await sleep(200);
    }
    return false;
  };
}

export function mergeApiOnlySupervisorDeps(
  partial?: Partial<ApiOnlySupervisorDeps>,
): ApiOnlySupervisorDeps {
  const appRoot = partial?.appRoot ?? defaultAppRoot();
  const sleep = partial?.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  return {
    appRoot,
    checkPort: partial?.checkPort ?? defaultCheckPort,
    spawnPnpm: partial?.spawnPnpm ?? defaultSpawnPnpm(appRoot),
    fetchText: partial?.fetchText ?? defaultFetchText,
    now: partial?.now ?? (() => new Date().toISOString()),
    sleep,
    maxStopWaitMs: partial?.maxStopWaitMs ?? 12_000,
    /** Windows may hold loopback ports in TIME_WAIT briefly after child exit. */
    maxPortReleaseWaitMs: partial?.maxPortReleaseWaitMs ?? 45_000,
    waitUntilListenGone: partial?.waitUntilListenGone ?? createDefaultWaitUntilListenGone(sleep),
    gitHead:
      partial?.gitHead ??
      (() => {
        try {
          return execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: appRoot,
            encoding: "utf8",
          }).trim();
        } catch {
          return null;
        }
      }),
    gitStatusShort:
      partial?.gitStatusShort ??
      (() => {
        try {
          const s = execFileSync("git", ["status", "--short"], {
            cwd: appRoot,
            encoding: "utf8",
          }).trim();
          return s.length > 0 ? s : null;
        } catch {
          return null;
        }
      }),
  };
}

function assertStrictLoopbackHost(host: string): { ok: boolean; error?: string } {
  const t = host.trim();
  if (t !== "127.0.0.1") {
    return { ok: false, error: "api_host_must_be_127_0_0_1" };
  }
  return { ok: true };
}

export function verifyRuntimeResponseEnvelope(body: unknown): {
  ok: boolean;
  reason?: string;
  summary: Record<string, unknown>;
} {
  const summary: Record<string, unknown> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "body_not_object", summary };
  }
  const b = body as Record<string, unknown>;
  if (b.ok !== true) {
    return { ok: false, reason: "envelope_ok_not_true", summary };
  }
  if (b.mockOnly !== true) {
    return { ok: false, reason: "mockOnly_not_true", summary };
  }
  if (b.reviewOnly !== true) {
    return { ok: false, reason: "reviewOnly_not_true", summary };
  }
  if (b.executionEnabled !== false) {
    return { ok: false, reason: "executionEnabled_not_false", summary };
  }
  if (b.registryMutationAllowed !== false) {
    return { ok: false, reason: "registryMutationAllowed_not_false", summary };
  }
  if (b.autoApprovalEnabled !== false) {
    return { ok: false, reason: "autoApprovalEnabled_not_false", summary };
  }
  if (b.sendToMt5Enabled === true) {
    return { ok: false, reason: "sendToMt5Enabled_true_root", summary };
  }
  if (b.canAutoExecute === true) {
    return { ok: false, reason: "canAutoExecute_true_root", summary };
  }

  const data = b.data;
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "data_missing", summary };
  }
  const d = data as Record<string, unknown>;

  if (d.readOnly !== true) {
    return { ok: false, reason: "data_readOnly_not_true", summary };
  }

  const safety = d.safety;
  if (!safety || typeof safety !== "object") {
    return { ok: false, reason: "safety_missing", summary };
  }
  const s = safety as Record<string, unknown>;
  if (s.executionEnabled !== false) {
    return { ok: false, reason: "safety_executionEnabled_not_false", summary };
  }
  if (s.sendToMt5Enabled !== false) {
    return { ok: false, reason: "safety_sendToMt5Enabled_not_false", summary };
  }
  if (s.canAutoExecute !== false) {
    return { ok: false, reason: "safety_canAutoExecute_not_false", summary };
  }
  if (s.autoApprovalEnabled !== false) {
    return { ok: false, reason: "safety_autoApprovalEnabled_not_false", summary };
  }
  if (s.registryMutationAllowed !== false) {
    return { ok: false, reason: "safety_registryMutationAllowed_not_false", summary };
  }
  if (s.manualReviewRequired !== true) {
    return { ok: false, reason: "safety_manualReviewRequired_not_true", summary };
  }

  const mt5 = d.mt5;
  if (!mt5 || typeof mt5 !== "object") {
    return { ok: false, reason: "mt5_missing", summary };
  }
  const m5 = mt5 as Record<string, unknown>;
  if (m5.enabled !== false) {
    return { ok: false, reason: "mt5_enabled_not_false", summary };
  }
  if (m5.status !== "not_configured") {
    return { ok: false, reason: "mt5_status_not_not_configured", summary };
  }

  const bridge = d.bridge;
  if (!bridge || typeof bridge !== "object") {
    return { ok: false, reason: "bridge_missing", summary };
  }
  const br = bridge as Record<string, unknown>;
  if (br.enabled !== false) {
    return { ok: false, reason: "bridge_enabled_not_false", summary };
  }
  if (br.status !== "not_configured") {
    return { ok: false, reason: "bridge_status_not_not_configured", summary };
  }

  const raw = JSON.stringify(body).toLowerCase();
  const banned = [
    "ready to trade",
    "live trading",
    "order" + "send",
    "c" + "trade",
    "appdata",
    "metaquotes",
    "terminal64.exe",
    "c:\\\\users",
    "/users/",
  ];
  for (const frag of banned) {
    if (raw.includes(frag)) {
      return { ok: false, reason: `disallowed_fragment:${frag}`, summary };
    }
  }

  summary.mockOnly = true;
  summary.reviewOnly = true;
  summary.executionEnabled = false;
  summary.mt5Status = m5.status;
  summary.bridgeStatus = br.status;
  summary.runtimeMode = d.runtimeMode;
  summary.overallStatus = (d.overall as Record<string, unknown> | undefined)?.status;

  return { ok: true, summary };
}

function parseHealthz(bodyText: string): { ok: boolean; reason?: string } {
  try {
    const j = JSON.parse(bodyText) as Record<string, unknown>;
    if (j.status === "ok") return { ok: true };
    return { ok: false, reason: "healthz_status_not_ok" };
  } catch {
    return { ok: false, reason: "healthz_not_json" };
  }
}

async function waitUntilHealthy(
  healthUrl: string,
  deadlineMs: number,
  deps: ApiOnlySupervisorDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining < 30) break;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), Math.min(2000, remaining));
    try {
      const r = await deps.fetchText(healthUrl, ac.signal);
      if (r.ok && r.status === 200) {
        const p = parseHealthz(r.bodyText);
        if (p.ok) return { ok: true };
      }
    } catch {
      /* retry */
    } finally {
      clearTimeout(t);
    }
    await deps.sleep(200);
  }
  return { ok: false, reason: "healthz_timeout" };
}

async function fetchRuntimeJson(
  url: string,
  deps: ApiOnlySupervisorDeps,
): Promise<{ ok: boolean; body?: unknown; reason?: string }> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await deps.fetchText(url, ac.signal);
    if (!r.ok || r.status !== 200) {
      return { ok: false, reason: `runtime_http_${r.status}` };
    }
    try {
      return { ok: true, body: JSON.parse(r.bodyText) as unknown };
    } catch {
      return { ok: false, reason: "runtime_not_json" };
    }
  } catch {
    return { ok: false, reason: "runtime_fetch_failed" };
  } finally {
    clearTimeout(t);
  }
}

async function waitChildExitOrTimeout(child: ChildProcess, ms: number): Promise<"exited" | "timeout"> {
  if (child.exitCode !== null || child.signalCode != null) {
    return "exited";
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), ms);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve("exited");
    });
  });
}

export async function runApiOnlySupervisor(
  options: ApiOnlySupervisorOptions,
  partialDeps?: Partial<ApiOnlySupervisorDeps>,
): Promise<ApiOnlySupervisorResult> {
  const deps = mergeApiOnlySupervisorDeps(partialDeps);
  const errors: string[] = [];
  const warnings: string[] = [];
  let phase = "init";
  const command =
    "node ./dist/index.mjs in artifacts/api-server (workspace equivalent: pnpm --filter @workspace/api-server start; MAPAZAPP_API_HOST, MAPAZAPP_API_PORT)";

  const resultBase = (): ApiOnlySupervisorResult => ({
    ok: false,
    phase,
    apiHost: options.apiHost,
    apiPort: options.apiPort,
    command,
    pid: null,
    ownedByLauncher: false,
    healthOk: null,
    runtimeStatusSummary: null,
    startedAt: null,
    stoppedAt: null,
    cleanupStatus: "pending",
    portFreed: null,
    executionEnabledReported: null,
    readOnlyReported: null,
    noMt5: null,
    errors: [...errors],
    warnings: [...warnings],
    gitHead: deps.gitHead(),
    gitStatusInitial: deps.gitStatusShort(),
    gitStatusFinal: deps.gitStatusShort(),
  });

  phase = "preflight_host";
  const hostCheck = assertStrictLoopbackHost(options.apiHost);
  if (!hostCheck.ok) {
    errors.push(hostCheck.error ?? "host_invalid");
    return resultBase();
  }

  phase = "preflight_launcher_config";
  const launcherConfig = createDefaultLauncherConfig({
    apiHost: options.apiHost,
    apiPort: options.apiPort,
  });
  if (launcherConfig.actionTransportEnabled) {
    errors.push("action_transport_must_stay_disabled");
    return resultBase();
  }
  const validation = validateLauncherConfig(launcherConfig);
  const safetyScan = assertLauncherConfigSafety(validation);
  if (!safetyScan.ok) {
    errors.push(...safetyScan.errors);
    return resultBase();
  }
  if (!validation.ok) {
    errors.push(...validation.errors);
    return resultBase();
  }
  for (const w of validation.warnings) warnings.push(w);

  phase = "preflight_port";
  const portProbe = await deps.checkPort(options.apiPort);
  if (portProbe === "occupied") {
    errors.push("api_port_occupied_by_other");
    phase = "blocked_port_occupied";
    return resultBase();
  }
  if (portProbe === "error") {
    errors.push("api_port_probe_error");
    return resultBase();
  }

  let child: ChildProcess | null = null;
  let ownedByLauncher = false;

  const cleanupChild = async (): Promise<{ status: "ok" | "failed"; detail: string }> => {
    if (!child || !ownedByLauncher) {
      return { status: "ok", detail: "no_owned_child" };
    }
    try {
      if (!child.killed && child.pid) {
        child.kill("SIGTERM");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { status: "failed", detail: `kill_error:${msg}` };
    }
    const outcome = await waitChildExitOrTimeout(child, deps.maxStopWaitMs);
    if (outcome === "timeout") {
      return { status: "failed", detail: "stop_wait_timeout" };
    }
    return { status: "ok", detail: "child_exited" };
  };

  try {
    if (!options.skipBuild) {
      phase = "build";
      const buildChild = deps.spawnPnpm(
        ["--filter", "@workspace/api-server", "build"],
        { ...process.env },
      );
      drainChildStreams(buildChild);
      let buildCode: number;
      try {
        buildCode = await waitChildExit(buildChild);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`build_spawn_failed:${msg}`);
        phase = "build_failed";
        return resultBase();
      }
      if (buildCode !== 0) {
        errors.push(`build_exit_nonzero:${buildCode}`);
        phase = "build_failed";
        return resultBase();
      }
    } else {
      warnings.push("skip_build_enabled");
    }

    phase = "start";
    const startedAt = deps.now();
    const apiEnv: NodeJS.ProcessEnv = {
      ...process.env,
      MAPAZAPP_API_HOST: options.apiHost,
      MAPAZAPP_API_PORT: String(options.apiPort),
      NODE_ENV: "development",
    };
    child = deps.spawnPnpm(["--filter", "@workspace/api-server", "start"], apiEnv);
    drainChildStreams(child);
    if (!child.pid) {
      errors.push("spawn_missing_pid");
      phase = "start_failed";
      const r = resultBase();
      r.startedAt = startedAt;
      r.stoppedAt = deps.now();
      r.cleanupStatus = "skipped";
      r.errors = [...errors];
      return r;
    }
    ownedByLauncher = true;
    const pid = child.pid;

    let earlyExit: number | null = null;
    child.once("exit", (code) => {
      earlyExit = code;
    });

    const healthUrl = `http://127.0.0.1:${options.apiPort}/api/healthz`;
    const runtimeUrl = `http://127.0.0.1:${options.apiPort}/api/mapazapp/runtime/status`;

    phase = "health";
    const healthOutcome = await waitUntilHealthy(healthUrl, options.maxWaitMs, deps);
    if (earlyExit !== null) {
      errors.push(`api_exited_during_health_wait:code=${earlyExit}`);
      phase = "health_failed_early_exit";
      const r = resultBase();
      r.pid = pid;
      r.ownedByLauncher = ownedByLauncher;
      r.startedAt = startedAt;
      r.healthOk = false;
      const c = await cleanupChild();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.portFreed = await deps.waitUntilListenGone("127.0.0.1", options.apiPort, deps.maxPortReleaseWaitMs);
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }
    if (!healthOutcome.ok) {
      errors.push(healthOutcome.reason ?? "health_failed");
      phase = "health_failed";
      const r = resultBase();
      r.pid = pid;
      r.ownedByLauncher = ownedByLauncher;
      r.startedAt = startedAt;
      r.healthOk = false;
      const c = await cleanupChild();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.portFreed = await deps.waitUntilListenGone("127.0.0.1", options.apiPort, deps.maxPortReleaseWaitMs);
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    phase = "runtime_check";
    const rt = await fetchRuntimeJson(runtimeUrl, deps);
    if (!rt.ok || !rt.body) {
      errors.push(rt.reason ?? "runtime_fetch_invalid");
      const r = resultBase();
      r.pid = pid;
      r.ownedByLauncher = ownedByLauncher;
      r.startedAt = startedAt;
      r.healthOk = true;
      const c = await cleanupChild();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.portFreed = await deps.waitUntilListenGone("127.0.0.1", options.apiPort, deps.maxPortReleaseWaitMs);
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    const envCheck = verifyRuntimeResponseEnvelope(rt.body);
    if (!envCheck.ok) {
      errors.push(envCheck.reason ?? "runtime_unsafe");
      const r = resultBase();
      r.pid = pid;
      r.ownedByLauncher = ownedByLauncher;
      r.startedAt = startedAt;
      r.healthOk = true;
      const c = await cleanupChild();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.portFreed = await deps.waitUntilListenGone("127.0.0.1", options.apiPort, deps.maxPortReleaseWaitMs);
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    phase = "stop";
    const rOk = resultBase();
    rOk.ok = true;
    rOk.phase = "complete";
    rOk.pid = pid;
    rOk.ownedByLauncher = ownedByLauncher;
    rOk.startedAt = startedAt;
    rOk.healthOk = true;
    rOk.runtimeStatusSummary = envCheck.summary;
    rOk.executionEnabledReported = false;
    rOk.readOnlyReported = true;
    rOk.noMt5 = true;

    const c = await cleanupChild();
    rOk.cleanupStatus = c.status === "ok" ? "ok" : "failed";
    if (c.status !== "ok") {
      rOk.ok = false;
      errors.push(c.detail);
    }
    rOk.stoppedAt = deps.now();
    await deps.sleep(800);
    rOk.portFreed = await deps.waitUntilListenGone("127.0.0.1", options.apiPort, deps.maxPortReleaseWaitMs);
    if (rOk.portFreed === false) {
      rOk.ok = false;
      errors.push("port_not_freed_after_stop");
    }
    rOk.errors = [...errors];
    rOk.warnings = [...warnings];
    rOk.gitStatusFinal = deps.gitStatusShort();
    return rOk;
  } finally {
    /* ownership retained for result; child should be stopped */
  }
}

export interface ApiOnlySupervisorIo {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export async function runMapazappApiOnlySupervisorCli(
  argv: string[],
  io: ApiOnlySupervisorIo,
  partialDeps?: Partial<ApiOnlySupervisorDeps>,
): Promise<number> {
  const parsed = parseApiOnlySupervisorArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite("Try `mapazapp:api-only-supervisor -- --help`.\n");
    return 2;
  }

  for (const line of API_ONLY_SUPERVISOR_BANNER_LINES) {
    io.stdoutWrite(`${line}\n`);
  }
  io.stdoutWrite("\n");

  const result = await runApiOnlySupervisor(
    {
      apiHost: parsed.apiHost,
      apiPort: parsed.apiPort,
      skipBuild: parsed.skipBuild,
      maxWaitMs: parsed.maxWaitMs,
    },
    partialDeps,
  );

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(result)}\n`);
  } else {
    io.stdoutWrite(`ok: ${result.ok}\n`);
    io.stdoutWrite(`phase: ${result.phase}\n`);
    io.stdoutWrite(`api: http://${result.apiHost}:${result.apiPort}\n`);
    io.stdoutWrite(`pid: ${result.pid ?? "null"}\n`);
    io.stdoutWrite(`healthOk: ${result.healthOk}\n`);
    io.stdoutWrite(`cleanup: ${result.cleanupStatus}\n`);
    io.stdoutWrite(`portFreed: ${result.portFreed}\n`);
    io.stdoutWrite(`gitHead: ${result.gitHead ?? "null"}\n`);
    if (result.runtimeStatusSummary) {
      io.stdoutWrite(`runtimeSummary: ${JSON.stringify(result.runtimeStatusSummary)}\n`);
    }
    for (const e of result.errors) io.stderrWrite(`error: ${e}\n`);
    for (const w of result.warnings) io.stdoutWrite(`warning: ${w}\n`);
  }

  return result.ok ? 0 : 1;
}

function defaultIo(): ApiOnlySupervisorIo {
  return {
    stdoutWrite: (s) => {
      process.stdout.write(s);
    },
    stderrWrite: (s) => {
      process.stderr.write(s);
    },
  };
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  runMapazappApiOnlySupervisorCli(process.argv.slice(2), defaultIo()).then((code) => {
    process.exit(code);
  });
}
