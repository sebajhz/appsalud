/**
 * D13.2 — API-only supervisor tests (mocked processes; no real API start in unit tests).
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { ChildProcess } from "node:child_process";
import {
  parseApiOnlySupervisorArgv,
  runApiOnlySupervisor,
  runMapazappApiOnlySupervisorCli,
  verifyRuntimeResponseEnvelope,
  type ApiOnlySupervisorDeps,
  type ApiOnlySupervisorIo,
  type FetchTextResult,
} from "./mapazapp-api-only-supervisor";
import type { PortProbeResult } from "./mapazapp-dev-preflight";

const supervisorSrcPath = resolve(dirname(fileURLToPath(import.meta.url)), "mapazapp-api-only-supervisor.ts");

function captureIo(): ApiOnlySupervisorIo & { getOut: () => string; getErr: () => string } {
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

test("A. --help is API-only scoped; no MT5 launch / trading / ready to trade wording", async () => {
  const io = captureIo();
  const code = await runMapazappApiOnlySupervisorCli(["--help"], io);
  assert.equal(code, 0);
  const out = io.getOut();
  const err = io.getErr();
  const t = `${out}\n${err}`.toLowerCase();
  assert.match(out, /api-only/i);
  assert.match(out, /usage/i);
  assert.doesNotMatch(out, /launch mt5/i);
  assert.doesNotMatch(out, /trading/i);
  assert.equal(t.includes("ready to trade"), false);
});

test("B. port occupied blocks start — spawn not called", async () => {
  let spawnCalls = 0;
  const deps: Partial<ApiOnlySupervisorDeps> = {
    checkPort: async () => "occupied" as PortProbeResult,
    spawnPnpm: () => {
      spawnCalls++;
      return mockChild(999001);
    },
    fetchText: async () => ({ ok: false, status: 0, bodyText: "" }),
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    gitHead: () => "abc",
    gitStatusShort: () => null,
  };
  const r = await runApiOnlySupervisor(
    { apiHost: "127.0.0.1", apiPort: 3001, skipBuild: true, maxWaitMs: 1000 },
    deps,
  );
  assert.equal(spawnCalls, 0);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("occupied")));
});

test("C. successful run with mocked deps", async () => {
  let spawnCalls = 0;
  const deps: Partial<ApiOnlySupervisorDeps> = {
    checkPort: async () => "available",
    spawnPnpm: () => {
      spawnCalls++;
      return mockChild(424_211);
    },
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      const body = {
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
      return { ok: true, status: 200, bodyText: JSON.stringify(body) };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    gitHead: () => "deadbeef",
    gitStatusShort: () => null,
  };
  const r = await runApiOnlySupervisor(
    { apiHost: "127.0.0.1", apiPort: 3001, skipBuild: true, maxWaitMs: 2000 },
    deps,
  );
  assert.equal(spawnCalls, 1);
  assert.equal(r.ok, true);
  assert.equal(r.healthOk, true);
  assert.equal(r.cleanupStatus, "ok");
  assert.equal(r.portFreed, true);
});

test("D. health timeout fails closed and cleanup attempted", async () => {
  let killCalled = false;
  const deps: Partial<ApiOnlySupervisorDeps> = {
    checkPort: async () => "available",
    spawnPnpm: () => {
      const c = mockChild(424_333);
      const orig = c.kill?.bind(c);
      c.kill = ((sig?: NodeJS.Signals) => {
        killCalled = true;
        return orig ? orig(sig) : true;
      }) as ChildProcess["kill"];
      return c;
    },
    fetchText: async () => ({ ok: false, status: 503, bodyText: "" }),
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    maxStopWaitMs: 2000,
    maxPortReleaseWaitMs: 500,
    waitUntilListenGone: async () => true,
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiOnlySupervisor(
    { apiHost: "127.0.0.1", apiPort: 3001, skipBuild: true, maxWaitMs: 400 },
    deps,
  );
  assert.equal(r.ok, false);
  assert.equal(r.healthOk, false);
  assert.equal(killCalled, true);
});

test("E. unsafe runtime envelope fails closed", async () => {
  const deps: Partial<ApiOnlySupervisorDeps> = {
    checkPort: async () => "available",
    spawnPnpm: () => mockChild(424_444),
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      const body = {
        ok: true,
        data: {
          readOnly: true,
          runtimeMode: "mock",
          safety: {
            executionEnabled: true,
            sendToMt5Enabled: false,
            canAutoExecute: false,
            autoApprovalEnabled: false,
            registryMutationAllowed: false,
            manualReviewRequired: true,
          },
          mt5: { enabled: false, status: "not_configured" },
          bridge: { enabled: false, status: "not_configured" },
          overall: { status: "blocked", message: "unsafe" },
        },
        mockOnly: true,
        reviewOnly: true,
        executionEnabled: false,
        registryMutationAllowed: false,
        autoApprovalEnabled: false,
      };
      return { ok: true, status: 200, bodyText: JSON.stringify(body) };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    gitHead: () => null,
    gitStatusShort: () => null,
  };
  const r = await runApiOnlySupervisor(
    { apiHost: "127.0.0.1", apiPort: 3001, skipBuild: true, maxWaitMs: 2000 },
    deps,
  );
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("safety_executionEnabled")));
});

test("F. stop only when owned — port occupied never spawns", async () => {
  let killCalls = 0;
  const deps: Partial<ApiOnlySupervisorDeps> = {
    checkPort: async () => "occupied",
    spawnPnpm: () => {
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
  const r = await runApiOnlySupervisor(
    { apiHost: "127.0.0.1", apiPort: 3001, skipBuild: true, maxWaitMs: 100 },
    deps,
  );
  assert.equal(killCalls, 0);
  assert.equal(r.ownedByLauncher, false);
  assert.equal(r.ok, false);
});

test("G. JSON output from CLI is free of forbidden markers", async () => {
  const io = captureIo();
  const deps: Partial<ApiOnlySupervisorDeps> = {
    checkPort: async () => "available",
    spawnPnpm: () => mockChild(424_555),
    fetchText: async (url: string): Promise<FetchTextResult> => {
      if (url.includes("healthz")) {
        return { ok: true, status: 200, bodyText: JSON.stringify({ status: "ok" }) };
      }
      const body = {
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
          overall: { status: "unknown", message: "ok" },
        },
        mockOnly: true,
        reviewOnly: true,
        executionEnabled: false,
        registryMutationAllowed: false,
        autoApprovalEnabled: false,
      };
      return { ok: true, status: 200, bodyText: JSON.stringify(body) };
    },
    now: () => "2026-01-01T00:00:00.000Z",
    sleep: async () => {},
    waitUntilListenGone: async () => true,
    gitHead: () => "abc123",
    gitStatusShort: () => null,
  };
  const code = await runMapazappApiOnlySupervisorCli(["--json", "--skip-build"], io, deps);
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

test("H. static scan — supervisor source constraints", () => {
  const src = readFileSync(supervisorSrcPath, "utf8");
  assert.equal(/taskkill/i.test(src), false);
  assert.equal(src.includes("@workspace/mapazapp"), false);
  assert.equal(/\bOrderSend\b/i.test(src), false);
  assert.equal(/\bCTrade\b/i.test(src), false);
  assert.equal(/websocket/i.test(src), false);
  assert.equal(src.includes("localStorage"), false);
  assert.ok(src.includes("node:child_process"));
  assert.match(src, /spawn\(/);
});

test("verifyRuntimeResponseEnvelope accepts safe mock API body", () => {
  const body = {
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
      overall: { status: "unknown", message: "m" },
    },
    mockOnly: true,
    reviewOnly: true,
    executionEnabled: false,
    registryMutationAllowed: false,
    autoApprovalEnabled: false,
  };
  const v = verifyRuntimeResponseEnvelope(body);
  assert.equal(v.ok, true);
});

test("parse defaults", () => {
  const p = parseApiOnlySupervisorArgv([]);
  assert.equal(p.kind, "run");
  if (p.kind === "run") {
    assert.equal(p.apiPort, 3001);
    assert.equal(p.apiHost, "127.0.0.1");
    assert.equal(p.skipBuild, false);
  }
});
