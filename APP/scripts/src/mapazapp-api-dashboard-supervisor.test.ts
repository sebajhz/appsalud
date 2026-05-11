/**
 * D13.5 — API + dashboard supervisor tests (mocked processes; no real stack in unit tests).
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { ChildProcess } from "node:child_process";
import type { FetchTextResult } from "./mapazapp-api-only-supervisor";
import {
  parseApiDashboardSupervisorArgv,
  runApiDashboardSupervisor,
  runMapazappApiDashboardSupervisorCli,
  type ApiDashboardSupervisorDeps,
  type ApiDashboardSupervisorIo,
} from "./mapazapp-api-dashboard-supervisor";
import type { PortProbeResult } from "./mapazapp-dev-preflight";

const supervisorSrcPath = resolve(dirname(fileURLToPath(import.meta.url)), "mapazapp-api-dashboard-supervisor.ts");

function captureIo(): ApiDashboardSupervisorIo & { getOut: () => string; getErr: () => string } {
  const state = { out: "", err: "" };
  return {
    stdoutWrite: (s: string) => {
      state.out += s;
    },
    stderrWrite: (s: string) => {
      state.err += s;
    },
    getOut: () => state.out,
    getErr: () => state.err,
  };
}

function mockChild(pid: number, opts?: { exitOnKill?: boolean }): ChildProcess {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  stdout.resume();
  stderr.resume();
  const ee = new EventEmitter();
  const proc = ee as unknown as ChildProcess & { killed: boolean };
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.stdin = null;
  proc.pid = pid;
  proc.killed = false;
  proc.exitCode = null;
  proc.signalCode = null;
  proc.kill = ((sig?: NodeJS.Signals) => {
    if (proc.killed) return true;
    proc.killed = true;
    if (opts?.exitOnKill !== false) {
      proc.exitCode = 0;
      proc.signalCode = sig ?? "SIGTERM";
      queueMicrotask(() => {
        ee.emit("exit", 0, sig ?? "SIGTERM");
      });
    }
    return true;
  }) as ChildProcess["kill"];

  return proc;
}

const safeRuntimeBody = {
  ok: true,
  data: {
    readOnly: true,
    runtimeMode: "mock",
    safety: {
      executionEnabled: false,
      sendToMt5Enabled: false,
      canAutoExecute: false,
      autoApprovalEnabled: false,
      registryMutationAllowed: false,
      manualReviewRequired: true,
    },
    mt5: { enabled: false, status: "not_configured" },
    bridge: { enabled: false, status: "not_configured" },
    overall: { status: "unknown", message: "x" },
  },
  mockOnly: true,
  reviewOnly: true,
  executionEnabled: false,
  registryMutationAllowed: false,
  autoApprovalEnabled: false,
};

test("A. --help is API+dashboard scoped; no MT5 launch / trading / ready to trade wording", async () => {
  const io = captureIo();
  const code = await runMapazappApiDashboardSupervisorCli(["--help"], io);
  assert.equal(code, 0);
  const out = io.getOut();
  const err = io.getErr();
  const t = `${out}\n${err}`.toLowerCase();
  assert.match(out, /api.*dashboard|dashboard.*api/i);
  assert.match(out, /usage/i);
  assert.doesNotMatch(out, /launch mt5/i);
  assert.doesNotMatch(out, /trading/i);
  assert.equal(t.includes("ready to trade"), false);
});

test("B. port 3001 occupied blocks all start — no spawns", async () => {
  let spawns = 0;
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async (p: number) => (p === 3001 ? "occupied" : "available") as PortProbeResult,
    spawnSupervisedChild: () => {
      spawns++;
      return mockChild(1);
    },
    fetchText: async () => ({ ok: false, status: 0, bodyText: "" }),
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    gitHead: () => "abc",
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 1000,
    },
    deps,
  );
  assert.equal(spawns, 0);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("api_port_occupied")));
});

test("C. port 5173 occupied blocks all start — no spawns", async () => {
  let spawns = 0;
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async (p: number) => (p === 5173 ? "occupied" : "available") as PortProbeResult,
    spawnSupervisedChild: () => {
      spawns++;
      return mockChild(1);
    },
    fetchText: async () => ({ ok: false, status: 0, bodyText: "" }),
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    gitHead: () => "abc",
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 1000,
    },
    deps,
  );
  assert.equal(spawns, 0);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("dashboard_port_occupied")));
});

test("D. API health failure cleans API and never starts dashboard", async () => {
  const spawns: string[] = [];
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => {
      spawns.push(spec.kind);
      return mockChild(spec.kind === "api-start" ? 111 : 222);
    },
    fetchText: async () => ({ ok: false, status: 503, bodyText: "" }),
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    maxStopWaitMs: 2000,
    maxPortReleaseWaitMs: 500,
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: true }),
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 400,
    },
    deps,
  );
  assert.equal(r.ok, false);
  assert.equal(r.healthOk, false);
  assert.ok(spawns.includes("api-start"));
  assert.equal(spawns.includes("dashboard-dev"), false);
});

test("E. runtime unsafe cleans API and never starts dashboard", async () => {
  const spawns: string[] = [];
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => {
      spawns.push(spec.kind);
      return mockChild(333);
    },
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      const body = {
        ...safeRuntimeBody,
        data: {
          ...(safeRuntimeBody.data as object),
          safety: {
            executionEnabled: true,
            sendToMt5Enabled: false,
            canAutoExecute: false,
            autoApprovalEnabled: false,
            registryMutationAllowed: false,
            manualReviewRequired: true,
          },
        },
      };
      return { ok: true, status: 200, bodyText: JSON.stringify(body) };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: true }),
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 2000,
    },
    deps,
  );
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("safety_executionEnabled")));
  assert.equal(spawns.includes("dashboard-dev"), false);
});

test("F. dashboard start failure cleans API", async () => {
  let apiKills = 0;
  const spawns: string[] = [];
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => {
      spawns.push(spec.kind);
      if (spec.kind === "api-start") {
        const c = mockChild(444);
        const o = c.kill?.bind(c);
        c.kill = ((sig?: NodeJS.Signals) => {
          apiKills++;
          return o ? o(sig) : true;
        }) as ChildProcess["kill"];
        return c;
      }
      throw new Error("dashboard_spawn_boom");
    },
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      return { ok: true, status: 200, bodyText: JSON.stringify(safeRuntimeBody) };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: true }),
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 2000,
    },
    deps,
  );
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("dashboard_spawn")));
  assert.ok(apiKills >= 1);
});

test("G. dashboard listener ownership failure cleans both", async () => {
  let dashKills = 0;
  let apiKills = 0;
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => {
      if (spec.kind === "api-start") {
        const c = mockChild(501);
        const o = c.kill?.bind(c);
        c.kill = ((sig?: NodeJS.Signals) => {
          apiKills++;
          return o ? o(sig) : true;
        }) as ChildProcess["kill"];
        return c;
      }
      if (spec.kind === "dashboard-dev") {
        const c = mockChild(502);
        const o = c.kill?.bind(c);
        c.kill = ((sig?: NodeJS.Signals) => {
          dashKills++;
          return o ? o(sig) : true;
        }) as ChildProcess["kill"];
        return c;
      }
      return mockChild(0);
    },
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      return { ok: true, status: 200, bodyText: JSON.stringify(safeRuntimeBody) };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: false, reason: "dashboard_port_mismatch" }),
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 2000,
    },
    deps,
  );
  assert.equal(r.ok, false);
  assert.ok(dashKills >= 1);
  assert.ok(apiKills >= 1);
});

test("H. CORS failure cleans both", async () => {
  let dashKills = 0;
  let apiKills = 0;
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => {
      if (spec.kind === "api-start") {
        const c = mockChild(601);
        const o = c.kill?.bind(c);
        c.kill = ((sig?: NodeJS.Signals) => {
          apiKills++;
          return o ? o(sig) : true;
        }) as ChildProcess["kill"];
        return c;
      }
      const c = mockChild(602);
      const o = c.kill?.bind(c);
      c.kill = ((sig?: NodeJS.Signals) => {
        dashKills++;
        return o ? o(sig) : true;
      }) as ChildProcess["kill"];
      return c;
    },
    fetchText: async (url: string, _sig: AbortSignal, headers?: Record<string, string>): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      if (url.includes("runtime/status") && headers?.Origin?.includes("5173")) {
        return { ok: false, status: 403, bodyText: "cors" };
      }
      if (url.includes("runtime/status")) {
        return { ok: true, status: 200, bodyText: JSON.stringify(safeRuntimeBody) };
      }
      if (url.endsWith("/5173/") || url.includes(":5173/")) {
        return { ok: true, status: 200, bodyText: "<html></html>" };
      }
      if (url.includes("/config")) {
        return { ok: true, status: 200, bodyText: "<html></html>" };
      }
      return { ok: false, status: 404, bodyText: "" };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: true }),
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 2000,
    },
    deps,
  );
  assert.equal(r.ok, false);
  assert.equal(r.corsOk, false);
  assert.ok(dashKills >= 1);
  assert.ok(apiKills >= 1);
});

test("I. successful run with mocked deps", async () => {
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => mockChild(spec.kind === "api-start" ? 701 : 702),
    fetchText: async (url: string, _sig: AbortSignal, headers?: Record<string, string>): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      if (url.includes("runtime/status")) {
        return { ok: true, status: 200, bodyText: JSON.stringify(safeRuntimeBody) };
      }
      if (url.includes(":5173")) {
        return { ok: true, status: 200, bodyText: "<html></html>" };
      }
      return { ok: false, status: 404, bodyText: "" };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: true }),
    gitHead: () => "deadbeef",
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 2000,
    },
    deps,
  );
  assert.equal(r.ok, true);
  assert.equal(r.healthOk, true);
  assert.equal(r.dashboardHttpOk, true);
  assert.equal(r.corsOk, true);
  assert.equal(r.cleanupStatus, "ok");
});

test("J. stop order — dashboard kill before API kill", async () => {
  const order: string[] = [];
  const dash = mockChild(801);
  const api = mockChild(802);
  const od = dash.kill?.bind(dash);
  dash.kill = ((sig?: NodeJS.Signals) => {
    order.push("dashboard");
    return od ? od(sig) : true;
  }) as ChildProcess["kill"];
  const oa = api.kill?.bind(api);
  api.kill = ((sig?: NodeJS.Signals) => {
    order.push("api");
    return oa ? oa(sig) : true;
  }) as ChildProcess["kill"];

  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => (spec.kind === "api-start" ? api : dash),
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      if (url.includes("runtime/status")) {
        return { ok: true, status: 200, bodyText: JSON.stringify(safeRuntimeBody) };
      }
      if (url.includes(":5173")) {
        return { ok: true, status: 200, bodyText: "<html></html>" };
      }
      return { ok: false, status: 404, bodyText: "" };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: true }),
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 2000,
    },
    deps,
  );
  assert.equal(r.ok, true);
  assert.deepEqual(order, ["dashboard", "api"]);
});

test("K. stop only owned — port occupied never spawns, no kills", async () => {
  let killCalls = 0;
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "occupied" as PortProbeResult,
    spawnSupervisedChild: () => {
      const c = mockChild(1);
      const o = c.kill?.bind(c);
      c.kill = ((sig?: NodeJS.Signals) => {
        killCalls++;
        return o ? o(sig) : true;
      }) as ChildProcess["kill"];
      return c;
    },
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiDashboardSupervisor(
    {
      apiHost: "127.0.0.1",
      apiPort: 3001,
      dashboardHost: "127.0.0.1",
      dashboardPort: 5173,
      skipBuild: true,
      maxWaitMs: 100,
    },
    deps,
  );
  assert.equal(killCalls, 0);
  assert.equal(r.apiOwnedBySupervisor, false);
  assert.equal(r.dashboardOwnedBySupervisor, false);
  assert.equal(r.ok, false);
});

test("L. JSON output safe — no forbidden markers", async () => {
  const io = captureIo();
  const deps: Partial<ApiDashboardSupervisorDeps> = {
    checkPort: async () => "available",
    spawnSupervisedChild: (spec) => mockChild(spec.kind === "api-start" ? 901 : 902),
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      if (url.includes("runtime/status")) {
        return { ok: true, status: 200, bodyText: JSON.stringify(safeRuntimeBody) };
      }
      if (url.includes(":5173")) {
        return { ok: true, status: 200, bodyText: "<html></html>" };
      }
      return { ok: false, status: 404, bodyText: "" };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    confirmDashboardListenerOwnership: async () => ({ ok: true }),
    gitHead: () => "abc123",
    gitStatusShort: () => null,
  };
  const code = await runMapazappApiDashboardSupervisorCli(["--json", "--skip-build"], io, deps);
  assert.equal(code, 0);
  const line = io.getOut().split("\n").find((l) => l.startsWith("{") && l.includes("phase"));
  assert.ok(line);
  const low = line!.toLowerCase();
  for (const bad of [
    "appdata",
    "metaquotes",
    "terminal64.exe",
    "c:\\\\users",
    "/users/",
    "token",
    "secret",
    "ready to trade",
    "live trading",
    "ordersend",
    "ctrade",
    '"executionenabled":true',
    '"sendtomt5enabled":true',
    '"autoapprovalenabled":true',
    '"registrymutationallowed":true',
  ]) {
    assert.equal(low.includes(bad), false, `forbidden substring: ${bad}`);
  }
});

test("M. static scan — supervisor source constraints", () => {
  const src = readFileSync(supervisorSrcPath, "utf8");
  assert.equal(/taskkill/i.test(src), false);
  assert.equal(/\bOrderSend\b/i.test(src), false);
  assert.equal(/\bCTrade\b/i.test(src), false);
  assert.equal(/websocket/i.test(src), false);
  assert.equal(src.includes("localStorage"), false);
  assert.equal(src.includes("mapazapp:dev-start"), false);
  assert.ok(src.includes("node:child_process"));
  assert.match(src, /spawn\(/);
});

test("parse argv defaults", () => {
  const p = parseApiDashboardSupervisorArgv([]);
  assert.equal(p.kind, "run");
  if (p.kind === "run") {
    assert.equal(p.apiPort, 3001);
    assert.equal(p.dashboardPort, 5173);
    assert.equal(p.apiHost, "127.0.0.1");
    assert.equal(p.dashboardHost, "127.0.0.1");
    assert.equal(p.skipBuild, false);
  }
});
