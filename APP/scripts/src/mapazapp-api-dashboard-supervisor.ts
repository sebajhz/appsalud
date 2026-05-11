/**
 * D13.5 — API + dashboard supervisor prototype: preflight two ports, build/start api-server,
 * verify health + runtime, build/start Vite dev via `node …/vite/bin/vite.js` (no pnpm wrapper
 * as listener owner), verify dashboard HTTP + CORS, stop dashboard then API. Spawn confined
 * to this module. No MT5, watcher, POST, action transport, or broad process termination.
 */

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertLauncherConfigSafety,
  createDefaultLauncherConfig,
  validateLauncherConfig,
} from "./mapazapp-launcher-config-model";
import { defaultCheckPort, type PortProbeResult } from "./mapazapp-dev-preflight";
import { waitChildExit } from "./mapazapp-dev-start";
import { verifyRuntimeResponseEnvelope, type FetchTextResult } from "./mapazapp-api-only-supervisor";

export const API_DASHBOARD_SUPERVISOR_BANNER_LINES = [
  "Mapazapp API + dashboard supervisor (D13.5 prototype)",
  "Starts @workspace/api-server and Vite dev for @workspace/mapazapp on loopback; not MapazappLauncher.exe.",
  "Does not start MT5, watcher, command files, DB, long-lived push channels, or trading execution.",
] as const;

const USAGE = `mapazapp:api-dashboard-supervisor (D13.5 prototype)

Usage:
  pnpm --filter @workspace/scripts mapazapp:api-dashboard-supervisor [--options]

Options:
  --api-host <addr>           Must be 127.0.0.1 (default: 127.0.0.1)
  --api-port <n>              Default: 3001 (no automatic alternate port)
  --dashboard-host <addr>     Must be 127.0.0.1 (default: 127.0.0.1)
  --dashboard-port <n>        Default: 5173 (no automatic alternate port)
  --skip-build                Skip api-server + mapazapp builds (not recommended)
  --max-wait-ms <n>           Max wait per major wait phase (default: 25000)
  --json                      Single JSON summary line on stdout at end
  --help, -h                  Show this message

Exit codes:
  0  Supervised start, checks, and cleanup succeeded
  1  Preflight/build/start/check/cleanup failure
  2  Invalid arguments

Constraints:
  API + dashboard dev only; no MT5; no POST/action routes; no broad OS-wide process termination; only own child PIDs.
`;

export type ParsedApiDashboardSupervisorArgv =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      apiHost: string;
      apiPort: number;
      dashboardHost: string;
      dashboardPort: number;
      skipBuild: boolean;
      maxWaitMs: number;
      json: boolean;
    };

export function parseApiDashboardSupervisorArgv(argv: string[]): ParsedApiDashboardSupervisorArgv {
  let apiHost: string | undefined;
  let apiPort: number | undefined;
  let dashboardHost: string | undefined;
  let dashboardPort: number | undefined;
  let skipBuild = false;
  let json = false;
  let maxWaitMs: number | undefined;

  const takeOptInt = (raw: string | undefined): number | null => {
    if (raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) return null;
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
      if (v === undefined || v.startsWith("-")) return { kind: "error", message: "Missing value for --api-host." };
      apiHost = v;
      i++;
      continue;
    }
    if (a === "--api-port") {
      const v = takeOptInt(argv[i + 1]);
      if (v === null || v > 65535) return { kind: "error", message: "Invalid or missing value for --api-port (1-65535)." };
      apiPort = v;
      i++;
      continue;
    }
    if (a === "--dashboard-host") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("-")) return { kind: "error", message: "Missing value for --dashboard-host." };
      dashboardHost = v;
      i++;
      continue;
    }
    if (a === "--dashboard-port") {
      const v = takeOptInt(argv[i + 1]);
      if (v === null || v > 65535) {
        return { kind: "error", message: "Invalid or missing value for --dashboard-port (1-65535)." };
      }
      dashboardPort = v;
      i++;
      continue;
    }
    if (a === "--max-wait-ms") {
      const v = takeOptInt(argv[i + 1]);
      if (v === null || v > 600_000) return { kind: "error", message: "Invalid or missing value for --max-wait-ms (1-600000)." };
      maxWaitMs = v;
      i++;
      continue;
    }
    if (a.startsWith("-")) return { kind: "error", message: `Unknown argument: ${a}` };
    return { kind: "error", message: `Unexpected argument: ${a}` };
  }

  return {
    kind: "run",
    apiHost: apiHost ?? "127.0.0.1",
    apiPort: apiPort ?? 3001,
    dashboardHost: dashboardHost ?? "127.0.0.1",
    dashboardPort: dashboardPort ?? 5173,
    skipBuild,
    maxWaitMs: maxWaitMs ?? 25_000,
    json,
  };
}

export interface ApiDashboardSupervisorOptions {
  apiHost: string;
  apiPort: number;
  dashboardHost: string;
  dashboardPort: number;
  skipBuild: boolean;
  maxWaitMs: number;
}

export interface ApiDashboardSupervisorResult {
  ok: boolean;
  phase: string;
  apiHost: string;
  apiPort: number;
  dashboardHost: string;
  dashboardPort: number;
  command: string;
  apiPid: number | null;
  dashboardPid: number | null;
  apiOwnedBySupervisor: boolean;
  dashboardOwnedBySupervisor: boolean;
  healthOk: boolean | null;
  runtimeStatusSummary: Record<string, unknown> | null;
  dashboardHttpOk: boolean | null;
  dashboardConfigHttpOk: boolean | null;
  corsOk: boolean | null;
  startedAt: string | null;
  stoppedAt: string | null;
  cleanupStatus: "ok" | "failed" | "skipped" | "pending";
  apiPortFreed: boolean | null;
  dashboardPortFreed: boolean | null;
  executionEnabledReported: boolean | null;
  readOnlyReported: boolean | null;
  noMt5: boolean | null;
  errors: string[];
  warnings: string[];
  gitHead: string | null;
  gitStatusInitial: string | null;
  gitStatusFinal: string | null;
}

export interface ApiDashboardSupervisorDeps {
  appRoot: string;
  checkPort(port: number): Promise<PortProbeResult>;
  /** Spawn API build, API start, dashboard build, or dashboard dev — only patterns supported below. */
  spawnSupervisedChild(
    spec:
      | { kind: "api-build"; env: NodeJS.ProcessEnv }
      | { kind: "api-start"; env: NodeJS.ProcessEnv }
      | { kind: "dashboard-build"; env: NodeJS.ProcessEnv }
      | { kind: "dashboard-dev"; env: NodeJS.ProcessEnv; host: string; port: number },
  ): ChildProcess;
  fetchText(url: string, signal: AbortSignal, headers?: Record<string, string>): Promise<FetchTextResult>;
  now(): string;
  sleep(ms: number): Promise<void>;
  maxStopWaitMs: number;
  maxPortReleaseWaitMs: number;
  waitUntilListenGone(host: string, port: number, deadlineMs: number): Promise<boolean>;
  gitHead(): string | null;
  gitStatusShort(): string | null;
  /** After dashboard child is spawned with a PID; fail closed if listener ownership cannot be asserted. */
  confirmDashboardListenerOwnership(childPid: number, host: string, port: number): Promise<{ ok: boolean; reason?: string }>;
}

function defaultAppRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..");
}

function drainChildStreams(child: ChildProcess): void {
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {});
}

function resolveViteBinJs(appRoot: string): string {
  const mapazappPkg = join(appRoot, "artifacts", "mapazapp", "package.json");
  const req = createRequire(mapazappPkg);
  const vitePkgJson = req.resolve("vite/package.json");
  return join(dirname(vitePkgJson), "bin", "vite.js");
}

function defaultSpawnSupervisedChild(appRoot: string) {
  const apiRoot = join(appRoot, "artifacts", "api-server");
  const dashboardRoot = join(appRoot, "artifacts", "mapazapp");
  let viteBin: string;
  try {
    viteBin = resolveViteBinJs(appRoot);
  } catch {
    throw new Error("mapazapp-api-dashboard-supervisor: failed to resolve vite CLI from @workspace/mapazapp");
  }

  return (
    spec:
      | { kind: "api-build"; env: NodeJS.ProcessEnv }
      | { kind: "api-start"; env: NodeJS.ProcessEnv }
      | { kind: "dashboard-build"; env: NodeJS.ProcessEnv }
      | { kind: "dashboard-dev"; env: NodeJS.ProcessEnv; host: string; port: number },
  ): ChildProcess => {
    if (spec.kind === "api-build") {
      return spawn(process.execPath, ["build.mjs"], {
        cwd: apiRoot,
        env: spec.env,
        stdio: ["inherit", "pipe", "pipe"],
        windowsHide: true,
      });
    }
    if (spec.kind === "api-start") {
      return spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
        cwd: apiRoot,
        env: spec.env,
        stdio: ["inherit", "pipe", "pipe"],
        windowsHide: true,
      });
    }
    if (spec.kind === "dashboard-build") {
      return spawn(process.execPath, [viteBin, "build", "--config", "vite.config.ts"], {
        cwd: dashboardRoot,
        env: spec.env,
        stdio: ["inherit", "pipe", "pipe"],
        windowsHide: true,
      });
    }
    if (spec.kind === "dashboard-dev") {
      return spawn(process.execPath, [
        viteBin,
        "--config",
        "vite.config.ts",
        "--host",
        spec.host,
        "--port",
        String(spec.port),
        "--strictPort",
      ], {
        cwd: dashboardRoot,
        env: spec.env,
        stdio: ["inherit", "pipe", "pipe"],
        windowsHide: true,
      });
    }
    throw new Error("mapazapp-api-dashboard-supervisor: unsupported spawn spec");
  };
}

async function defaultFetchText(
  url: string,
  signal: AbortSignal,
  headers?: Record<string, string>,
): Promise<FetchTextResult> {
  const res = await fetch(url, { signal, headers });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, bodyText };
}

function createDefaultWaitUntilListenGone(
  sleep: (ms: number) => Promise<void>,
): (host: string, port: number, deadlineMs: number) => Promise<boolean> {
  return async (host: string, port: number, deadlineMs: number): Promise<boolean> => {
    const deadline = Date.now() + deadlineMs;
    while (Date.now() < deadline) {
      const gone = await new Promise<boolean>((resolveGone) => {
        const socket = createConnection({ host, port });
        const timer = setTimeout(() => {
          socket.destroy();
          resolveGone(false);
        }, 1500);
        socket.once("connect", () => {
          clearTimeout(timer);
          socket.destroy();
          resolveGone(false);
        });
        socket.once("error", (err: NodeJS.ErrnoException) => {
          clearTimeout(timer);
          if (err.code === "ECONNREFUSED" || err.code === "EHOSTUNREACH") {
            resolveGone(true);
          } else {
            resolveGone(false);
          }
        });
      });
      if (gone) return true;
      await sleep(200);
    }
    return false;
  };
}

async function defaultConfirmDashboardListenerOwnership(
  _childPid: number,
  host: string,
  port: number,
): Promise<{ ok: boolean; reason?: string }> {
  void _childPid;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const up = await new Promise<boolean>((resolveUp) => {
      const socket = createConnection({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        resolveUp(false);
      }, 1500);
      socket.once("connect", () => {
        clearTimeout(timer);
        socket.destroy();
        resolveUp(true);
      });
      socket.once("error", () => {
        clearTimeout(timer);
        resolveUp(false);
      });
    });
    if (up) return { ok: true };
    await new Promise((r) => setTimeout(r, 200));
  }
  return { ok: false, reason: "dashboard_listen_probe_timeout" };
}

export function mergeApiDashboardSupervisorDeps(
  partial?: Partial<ApiDashboardSupervisorDeps>,
): ApiDashboardSupervisorDeps {
  const appRoot = partial?.appRoot ?? defaultAppRoot();
  const sleep = partial?.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const spawnSupervisedChild =
    partial?.spawnSupervisedChild ?? defaultSpawnSupervisedChild(appRoot);
  return {
    appRoot,
    checkPort: partial?.checkPort ?? defaultCheckPort,
    spawnSupervisedChild,
    fetchText: partial?.fetchText ?? defaultFetchText,
    now: partial?.now ?? (() => new Date().toISOString()),
    sleep,
    maxStopWaitMs: partial?.maxStopWaitMs ?? 12_000,
    maxPortReleaseWaitMs: partial?.maxPortReleaseWaitMs ?? 45_000,
    waitUntilListenGone: partial?.waitUntilListenGone ?? createDefaultWaitUntilListenGone(sleep),
    confirmDashboardListenerOwnership:
      partial?.confirmDashboardListenerOwnership ?? defaultConfirmDashboardListenerOwnership,
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

function assert127(host: string, label: string): { ok: boolean; error?: string } {
  if (host.trim() !== "127.0.0.1") {
    return { ok: false, error: `${label}_must_be_127_0_0_1` };
  }
  return { ok: true };
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
  deps: ApiDashboardSupervisorDeps,
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
  deps: ApiDashboardSupervisorDeps,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; body?: unknown; reason?: string }> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await deps.fetchText(url, ac.signal, headers);
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

async function waitUntilDashboardHttpOk(
  baseUrl: string,
  deadlineMs: number,
  deps: ApiDashboardSupervisorDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}/`;
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining < 30) break;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), Math.min(2000, remaining));
    try {
      const r = await deps.fetchText(url, ac.signal);
      if (r.ok && r.status >= 200 && r.status < 300) {
        return { ok: true };
      }
    } catch {
      /* retry */
    } finally {
      clearTimeout(t);
    }
    await deps.sleep(200);
  }
  return { ok: false, reason: "dashboard_http_timeout" };
}

async function fetchDashboardPathOk(
  url: string,
  deps: ApiDashboardSupervisorDeps,
): Promise<boolean> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await deps.fetchText(url, ac.signal);
    return r.ok && r.status >= 200 && r.status < 300;
  } catch {
    return false;
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

export async function runApiDashboardSupervisor(
  options: ApiDashboardSupervisorOptions,
  partialDeps?: Partial<ApiDashboardSupervisorDeps>,
): Promise<ApiDashboardSupervisorResult> {
  const deps = mergeApiDashboardSupervisorDeps(partialDeps);
  const errors: string[] = [];
  const warnings: string[] = [];
  let phase = "init";
  const command =
    "node ./dist/index.mjs (api-server) + node vite/bin/vite.js dev (mapazapp); MAPAZAPP_API_* ; VITE_MAPAZAPP_API_BASE_URL ; --strictPort on dashboard";

  const resultBase = (): ApiDashboardSupervisorResult => ({
    ok: false,
    phase,
    apiHost: options.apiHost,
    apiPort: options.apiPort,
    dashboardHost: options.dashboardHost,
    dashboardPort: options.dashboardPort,
    command,
    apiPid: null,
    dashboardPid: null,
    apiOwnedBySupervisor: false,
    dashboardOwnedBySupervisor: false,
    healthOk: null,
    runtimeStatusSummary: null,
    dashboardHttpOk: null,
    dashboardConfigHttpOk: null,
    corsOk: null,
    startedAt: null,
    stoppedAt: null,
    cleanupStatus: "pending",
    apiPortFreed: null,
    dashboardPortFreed: null,
    executionEnabledReported: null,
    readOnlyReported: null,
    noMt5: null,
    errors: [...errors],
    warnings: [...warnings],
    gitHead: deps.gitHead(),
    gitStatusInitial: deps.gitStatusShort(),
    gitStatusFinal: deps.gitStatusShort(),
  });

  phase = "preflight_api_host";
  const ah = assert127(options.apiHost, "api_host");
  if (!ah.ok) {
    errors.push(ah.error ?? "api_host_invalid");
    return resultBase();
  }
  phase = "preflight_dashboard_host";
  const dh = assert127(options.dashboardHost, "dashboard_host");
  if (!dh.ok) {
    errors.push(dh.error ?? "dashboard_host_invalid");
    return resultBase();
  }

  phase = "preflight_launcher_config";
  const launcherConfig = createDefaultLauncherConfig({
    apiHost: options.apiHost,
    apiPort: options.apiPort,
    dashboardPort: options.dashboardPort,
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

  phase = "preflight_api_port";
  const apiPortProbe = await deps.checkPort(options.apiPort);
  if (apiPortProbe === "occupied") {
    errors.push("api_port_occupied_by_other");
    phase = "blocked_api_port_occupied";
    return resultBase();
  }
  if (apiPortProbe === "error") {
    errors.push("api_port_probe_error");
    return resultBase();
  }

  phase = "preflight_dashboard_port";
  const dashPortProbe = await deps.checkPort(options.dashboardPort);
  if (dashPortProbe === "occupied") {
    errors.push("dashboard_port_occupied_by_other");
    phase = "blocked_dashboard_port_occupied";
    return resultBase();
  }
  if (dashPortProbe === "error") {
    errors.push("dashboard_port_probe_error");
    return resultBase();
  }

  let apiChild: ChildProcess | null = null;
  let dashChild: ChildProcess | null = null;
  let apiOwned = false;
  let dashOwned = false;

  const killApi = async (): Promise<{ status: "ok" | "failed"; detail: string }> => {
    if (!apiChild || !apiOwned) return { status: "ok", detail: "no_owned_api_child" };
    try {
      if (!apiChild.killed && apiChild.pid) {
        apiChild.kill("SIGTERM");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { status: "failed", detail: `api_kill_error:${msg}` };
    }
    const outcome = await waitChildExitOrTimeout(apiChild, deps.maxStopWaitMs);
    if (outcome === "timeout") return { status: "failed", detail: "api_stop_wait_timeout" };
    return { status: "ok", detail: "api_child_exited" };
  };

  const killDashboard = async (): Promise<{ status: "ok" | "failed"; detail: string }> => {
    if (!dashChild || !dashOwned) return { status: "ok", detail: "no_owned_dashboard_child" };
    try {
      if (!dashChild.killed && dashChild.pid) {
        dashChild.kill("SIGTERM");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { status: "failed", detail: `dashboard_kill_error:${msg}` };
    }
    const outcome = await waitChildExitOrTimeout(dashChild, deps.maxStopWaitMs);
    if (outcome === "timeout") return { status: "failed", detail: "dashboard_stop_wait_timeout" };
    return { status: "ok", detail: "dashboard_child_exited" };
  };

  const cleanupOrdered = async (): Promise<{ ok: boolean; detail: string }> => {
    const d1 = await killDashboard();
    const dashFree = await deps.waitUntilListenGone(
      options.dashboardHost,
      options.dashboardPort,
      deps.maxPortReleaseWaitMs,
    );
    const d2 = await killApi();
    const apiFree = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
    const parts = [`dashboard_stop:${d1.detail}`, `api_stop:${d2.detail}`];
    if (d1.status !== "ok" || d2.status !== "ok") {
      return { ok: false, detail: parts.join(";") };
    }
    if (!dashFree || !apiFree) {
      return { ok: false, detail: `${parts.join(";")};ports:${dashFree}/${apiFree}` };
    }
    return { ok: true, detail: parts.join(";") };
  };

  try {
    if (!options.skipBuild) {
      phase = "build_api";
      const bApi = deps.spawnSupervisedChild({ kind: "api-build", env: { ...process.env } });
      drainChildStreams(bApi);
      const buildApiCode = await waitChildExit(bApi);
      if (buildApiCode !== 0) {
        errors.push(`api_build_exit_nonzero:${buildApiCode}`);
        phase = "build_api_failed";
        return resultBase();
      }

      phase = "build_dashboard";
      const bDash = deps.spawnSupervisedChild({ kind: "dashboard-build", env: { ...process.env } });
      drainChildStreams(bDash);
      const buildDashCode = await waitChildExit(bDash);
      if (buildDashCode !== 0) {
        errors.push(`dashboard_build_exit_nonzero:${buildDashCode}`);
        phase = "build_dashboard_failed";
        return resultBase();
      }
    } else {
      warnings.push("skip_build_enabled");
    }

    phase = "start_api";
    const startedAt = deps.now();
    const apiEnv: NodeJS.ProcessEnv = {
      ...process.env,
      MAPAZAPP_API_HOST: options.apiHost,
      MAPAZAPP_API_PORT: String(options.apiPort),
      NODE_ENV: "development",
    };
    apiChild = deps.spawnSupervisedChild({ kind: "api-start", env: apiEnv });
    drainChildStreams(apiChild);
    if (!apiChild.pid) {
      errors.push("api_spawn_missing_pid");
      phase = "start_api_failed";
      const r = resultBase();
      r.startedAt = startedAt;
      r.stoppedAt = deps.now();
      r.cleanupStatus = "skipped";
      r.errors = [...errors];
      return r;
    }
    apiOwned = true;
    const apiPid = apiChild.pid;

    let apiEarlyExit: number | null = null;
    apiChild.once("exit", (code) => {
      apiEarlyExit = code;
    });

    const healthUrl = `http://127.0.0.1:${options.apiPort}/api/healthz`;
    const runtimeUrl = `http://127.0.0.1:${options.apiPort}/api/mapazapp/runtime/status`;

    phase = "health_api";
    const healthOutcome = await waitUntilHealthy(healthUrl, options.maxWaitMs, deps);
    if (apiEarlyExit !== null) {
      errors.push(`api_exited_during_health_wait:code=${apiEarlyExit}`);
      phase = "health_failed_early_exit";
      const r = resultBase();
      r.apiPid = apiPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.startedAt = startedAt;
      r.healthOk = false;
      const c = await killApi();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = true;
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }
    if (!healthOutcome.ok) {
      errors.push(healthOutcome.reason ?? "health_failed");
      phase = "health_failed";
      const r = resultBase();
      r.apiPid = apiPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.startedAt = startedAt;
      r.healthOk = false;
      const c = await killApi();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = true;
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    phase = "runtime_check_api";
    const rt = await fetchRuntimeJson(runtimeUrl, deps);
    if (!rt.ok || !rt.body) {
      errors.push(rt.reason ?? "runtime_fetch_invalid");
      const r = resultBase();
      r.apiPid = apiPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      const c = await killApi();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = true;
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    const envCheck = verifyRuntimeResponseEnvelope(rt.body);
    if (!envCheck.ok) {
      errors.push(envCheck.reason ?? "runtime_unsafe");
      const r = resultBase();
      r.apiPid = apiPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      const c = await killApi();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = true;
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    phase = "start_dashboard";
    const dashBase = `http://127.0.0.1:${options.dashboardPort}`;
    const dashEnv: NodeJS.ProcessEnv = {
      ...process.env,
      VITE_MAPAZAPP_API_BASE_URL: `http://127.0.0.1:${options.apiPort}`,
      NODE_ENV: "development",
    };
    try {
      dashChild = deps.spawnSupervisedChild({
        kind: "dashboard-dev",
        env: dashEnv,
        host: options.dashboardHost,
        port: options.dashboardPort,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`dashboard_spawn_error:${msg}`);
      phase = "start_dashboard_failed";
      const r = resultBase();
      r.apiPid = apiPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      r.runtimeStatusSummary = envCheck.summary;
      const c = await killApi();
      r.cleanupStatus = c.status === "ok" ? "ok" : "failed";
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = true;
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }
    drainChildStreams(dashChild);
    if (!dashChild.pid) {
      errors.push("dashboard_spawn_missing_pid");
      phase = "start_dashboard_failed";
      const r = resultBase();
      r.apiPid = apiPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      r.runtimeStatusSummary = envCheck.summary;
      const c = await cleanupOrdered();
      r.cleanupStatus = c.ok ? "ok" : "failed";
      if (!c.ok) errors.push(c.detail);
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = await deps.waitUntilListenGone(
        options.dashboardHost,
        options.dashboardPort,
        deps.maxPortReleaseWaitMs,
      );
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }
    const dashboardPid = dashChild.pid;
    dashOwned = true;
    const ownProbe = await deps.confirmDashboardListenerOwnership(dashboardPid, options.dashboardHost, options.dashboardPort);
    if (!ownProbe.ok) {
      errors.push(ownProbe.reason ?? "dashboard_listener_ownership_failed");
      phase = "dashboard_ownership_failed";
      const r = resultBase();
      r.apiPid = apiPid;
      r.dashboardPid = dashboardPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.dashboardOwnedBySupervisor = dashOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      r.runtimeStatusSummary = envCheck.summary;
      const c = await cleanupOrdered();
      r.cleanupStatus = c.ok ? "ok" : "failed";
      if (!c.ok) errors.push(c.detail);
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = await deps.waitUntilListenGone(
        options.dashboardHost,
        options.dashboardPort,
        deps.maxPortReleaseWaitMs,
      );
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    let dashEarly: number | null = null;
    dashChild.once("exit", (code) => {
      dashEarly = code;
    });

    phase = "dashboard_http";
    const dashHttp = await waitUntilDashboardHttpOk(dashBase, options.maxWaitMs, deps);
    if (dashEarly !== null) {
      errors.push(`dashboard_exited_during_http_wait:code=${dashEarly}`);
      phase = "dashboard_http_failed_early_exit";
      const r = resultBase();
      r.apiPid = apiPid;
      r.dashboardPid = dashboardPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.dashboardOwnedBySupervisor = dashOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      r.runtimeStatusSummary = envCheck.summary;
      r.dashboardHttpOk = false;
      const c = await cleanupOrdered();
      r.cleanupStatus = c.ok ? "ok" : "failed";
      if (!c.ok) errors.push(c.detail);
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = await deps.waitUntilListenGone(
        options.dashboardHost,
        options.dashboardPort,
        deps.maxPortReleaseWaitMs,
      );
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }
    if (!dashHttp.ok) {
      errors.push(dashHttp.reason ?? "dashboard_http_failed");
      phase = "dashboard_http_failed";
      const r = resultBase();
      r.apiPid = apiPid;
      r.dashboardPid = dashboardPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.dashboardOwnedBySupervisor = dashOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      r.runtimeStatusSummary = envCheck.summary;
      r.dashboardHttpOk = false;
      const c = await cleanupOrdered();
      r.cleanupStatus = c.ok ? "ok" : "failed";
      if (!c.ok) errors.push(c.detail);
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = await deps.waitUntilListenGone(
        options.dashboardHost,
        options.dashboardPort,
        deps.maxPortReleaseWaitMs,
      );
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    phase = "dashboard_config_http";
    const configUrl = `${dashBase}/config`;
    const configOk = await fetchDashboardPathOk(configUrl, deps);

    phase = "cors_runtime_check";
    const origin = `http://127.0.0.1:${options.dashboardPort}`;
    const corsRt = await fetchRuntimeJson(runtimeUrl, deps, { Origin: origin });
    if (!corsRt.ok || !corsRt.body) {
      errors.push(corsRt.reason ?? "cors_runtime_failed");
      phase = "cors_failed";
      const r = resultBase();
      r.apiPid = apiPid;
      r.dashboardPid = dashboardPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.dashboardOwnedBySupervisor = dashOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      r.runtimeStatusSummary = envCheck.summary;
      r.dashboardHttpOk = true;
      r.dashboardConfigHttpOk = configOk;
      r.corsOk = false;
      const c = await cleanupOrdered();
      r.cleanupStatus = c.ok ? "ok" : "failed";
      if (!c.ok) errors.push(c.detail);
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = await deps.waitUntilListenGone(
        options.dashboardHost,
        options.dashboardPort,
        deps.maxPortReleaseWaitMs,
      );
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }
    const corsEnv = verifyRuntimeResponseEnvelope(corsRt.body);
    if (!corsEnv.ok) {
      errors.push(corsEnv.reason ?? "cors_runtime_unsafe");
      phase = "cors_unsafe";
      const r = resultBase();
      r.apiPid = apiPid;
      r.dashboardPid = dashboardPid;
      r.apiOwnedBySupervisor = apiOwned;
      r.dashboardOwnedBySupervisor = dashOwned;
      r.startedAt = startedAt;
      r.healthOk = true;
      r.runtimeStatusSummary = envCheck.summary;
      r.dashboardHttpOk = true;
      r.dashboardConfigHttpOk = configOk;
      r.corsOk = false;
      const c = await cleanupOrdered();
      r.cleanupStatus = c.ok ? "ok" : "failed";
      if (!c.ok) errors.push(c.detail);
      r.stoppedAt = deps.now();
      r.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
      r.dashboardPortFreed = await deps.waitUntilListenGone(
        options.dashboardHost,
        options.dashboardPort,
        deps.maxPortReleaseWaitMs,
      );
      r.gitStatusFinal = deps.gitStatusShort();
      r.errors = [...errors];
      return r;
    }

    phase = "stop";
    const rOk = resultBase();
    rOk.ok = true;
    rOk.phase = "complete";
    rOk.apiPid = apiPid;
    rOk.dashboardPid = dashboardPid;
    rOk.apiOwnedBySupervisor = apiOwned;
    rOk.dashboardOwnedBySupervisor = dashOwned;
    rOk.startedAt = startedAt;
    rOk.healthOk = true;
    rOk.runtimeStatusSummary = envCheck.summary;
    rOk.dashboardHttpOk = true;
    rOk.dashboardConfigHttpOk = configOk;
    rOk.corsOk = true;
    rOk.executionEnabledReported = false;
    rOk.readOnlyReported = true;
    rOk.noMt5 = true;

    const c = await cleanupOrdered();
    rOk.cleanupStatus = c.ok ? "ok" : "failed";
    if (!c.ok) {
      rOk.ok = false;
      errors.push(c.detail);
    }
    rOk.stoppedAt = deps.now();
    await deps.sleep(800);
    rOk.dashboardPortFreed = await deps.waitUntilListenGone(
      options.dashboardHost,
      options.dashboardPort,
      deps.maxPortReleaseWaitMs,
    );
    rOk.apiPortFreed = await deps.waitUntilListenGone(options.apiHost, options.apiPort, deps.maxPortReleaseWaitMs);
    if (rOk.dashboardPortFreed === false || rOk.apiPortFreed === false) {
      rOk.ok = false;
      errors.push("port_not_freed_after_stop");
    }
    rOk.errors = [...errors];
    rOk.warnings = [...warnings];
    rOk.gitStatusFinal = deps.gitStatusShort();
    return rOk;
  } finally {
    /* children should be cleared by cleanup paths */
  }
}

export interface ApiDashboardSupervisorIo {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export async function runMapazappApiDashboardSupervisorCli(
  argv: string[],
  io: ApiDashboardSupervisorIo,
  partialDeps?: Partial<ApiDashboardSupervisorDeps>,
): Promise<number> {
  const parsed = parseApiDashboardSupervisorArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite("Try `mapazapp:api-dashboard-supervisor -- --help`.\n");
    return 2;
  }

  for (const line of API_DASHBOARD_SUPERVISOR_BANNER_LINES) {
    io.stdoutWrite(`${line}\n`);
  }
  io.stdoutWrite("\n");

  const result = await runApiDashboardSupervisor(
    {
      apiHost: parsed.apiHost,
      apiPort: parsed.apiPort,
      dashboardHost: parsed.dashboardHost,
      dashboardPort: parsed.dashboardPort,
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
    io.stdoutWrite(`dashboard: http://${result.dashboardHost}:${result.dashboardPort}\n`);
    io.stdoutWrite(`apiPid: ${result.apiPid ?? "null"}\n`);
    io.stdoutWrite(`dashboardPid: ${result.dashboardPid ?? "null"}\n`);
    io.stdoutWrite(`healthOk: ${result.healthOk}\n`);
    io.stdoutWrite(`dashboardHttpOk: ${result.dashboardHttpOk}\n`);
    io.stdoutWrite(`corsOk: ${result.corsOk}\n`);
    io.stdoutWrite(`cleanup: ${result.cleanupStatus}\n`);
    io.stdoutWrite(`apiPortFreed: ${result.apiPortFreed}\n`);
    io.stdoutWrite(`dashboardPortFreed: ${result.dashboardPortFreed}\n`);
    io.stdoutWrite(`gitHead: ${result.gitHead ?? "null"}\n`);
    if (result.runtimeStatusSummary) {
      io.stdoutWrite(`runtimeSummary: ${JSON.stringify(result.runtimeStatusSummary)}\n`);
    }
    for (const e of result.errors) io.stderrWrite(`error: ${e}\n`);
    for (const w of result.warnings) io.stdoutWrite(`warning: ${w}\n`);
  }

  return result.ok ? 0 : 1;
}

function defaultIo(): ApiDashboardSupervisorIo {
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
  runMapazappApiDashboardSupervisorCli(process.argv.slice(2), defaultIo()).then((code) => {
    process.exit(code);
  });
}
