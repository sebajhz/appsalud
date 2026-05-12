/**
 * D14.7 — Local launcher wrapper prototype tests (mocked supervisor; no real stack in unit tests).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { ApiDashboardSupervisorOptions, ApiDashboardSupervisorResult } from "./mapazapp-api-dashboard-supervisor";
import { buildLocalLauncherWrapperDryRunResult } from "./mapazapp-local-launcher-wrapper-dry-run";
import {
  buildLocalLauncherWrapperPlan,
  parseLocalLauncherWrapperArgs,
  runLocalLauncherWrapper,
  toLocalLauncherWrapperJsonPayload,
  type LocalLauncherWrapperIo,
} from "./mapazapp-local-launcher-wrapper";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wrapperSrcPath = join(__dirname, "mapazapp-local-launcher-wrapper.ts");

function captureIo(): LocalLauncherWrapperIo & { getOut: () => string; getErr: () => string } {
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

const fixedNow = "2026-05-11T12:00:00.000Z";

function minimalSupervisorOk(): ApiDashboardSupervisorResult {
  return {
    ok: true,
    phase: "complete",
    apiHost: "127.0.0.1",
    apiPort: 3001,
    dashboardHost: "127.0.0.1",
    dashboardPort: 5173,
    command: "mock-supervisor",
    apiPid: 9001,
    dashboardPid: 9002,
    apiOwnedBySupervisor: true,
    dashboardOwnedBySupervisor: true,
    healthOk: true,
    runtimeStatusSummary: { executionEnabled: false, readOnly: true },
    dashboardHttpOk: true,
    dashboardConfigHttpOk: true,
    corsOk: true,
    startedAt: "2026-05-11T12:00:01.000Z",
    stoppedAt: "2026-05-11T12:00:02.000Z",
    cleanupStatus: "ok",
    apiPortFreed: true,
    dashboardPortFreed: true,
    executionEnabledReported: false,
    readOnlyReported: true,
    noMt5: true,
    errors: [],
    warnings: [],
    gitHead: "deadbeef",
    gitStatusInitial: null,
    gitStatusFinal: "",
  };
}

function minimalSupervisorFail(): ApiDashboardSupervisorResult {
  const b = minimalSupervisorOk();
  return {
    ...b,
    ok: false,
    phase: "build_api_failed",
    healthOk: null,
    dashboardHttpOk: null,
    corsOk: null,
    errors: ["api_build_exit_nonzero:1"],
  };
}

test("D14.7 A — --help safe: prototype, dry-run default, --confirm-start; no trading claims", async () => {
  const io = captureIo();
  const { exitCode, result } = await runLocalLauncherWrapper(["--help"], { io, now: () => fixedNow });
  assert.equal(exitCode, 0);
  const t = io.getOut().toLowerCase();
  assert.match(io.getOut(), /wrapper|prototype|d14\.7/i);
  assert.match(t, /dry.run|dry_run/);
  assert.match(t, /confirm-start/);
  assert.equal(t.includes("ready to trade"), false);
  assert.equal(t.includes("live trading"), false);
  assert.equal(result.processStartAttempted, false);
});

test("D14.7 B — default no start: no supervisor, ok, dry_run, processStartAttempted false", async () => {
  let supervisorCalls = 0;
  const io = captureIo();
  const { exitCode, result } = await runLocalLauncherWrapper(["--created-at", fixedNow], {
    io,
    now: () => fixedNow,
    runSupervisor: async (_o: ApiDashboardSupervisorOptions) => {
      supervisorCalls++;
      return minimalSupervisorOk();
    },
  });
  assert.equal(supervisorCalls, 0);
  assert.equal(exitCode, 0);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry_run");
  assert.equal(result.processStartAttempted, false);
  assert.ok(io.getOut().includes("Safe default") || io.getOut().toLowerCase().includes("dry"));
});

test("D14.7 C — --json default safe flags", async () => {
  const io = captureIo();
  const { exitCode, result } = await runLocalLauncherWrapper(["--json", "--created-at", fixedNow], {
    io,
    now: () => fixedNow,
    runSupervisor: async () => minimalSupervisorOk(),
  });
  assert.equal(exitCode, 0);
  const row = JSON.parse(io.getOut().trim()) as Record<string, unknown>;
  assert.equal(row.ok, true);
  assert.equal(row.readOnly, true);
  assert.equal(row.confirmStart, false);
  const dry = row.dryRun as Record<string, unknown>;
  assert.equal(dry.processStartEnabled, false);
  assert.equal(dry.executionEnabled, false);
  assert.equal(dry.tradingEnabled, false);
  assert.equal(dry.mt5LaunchEnabled, false);
  assert.equal(result.supervisor, null);
});

test("D14.7 D — run_once without --confirm-start blocked, supervisor not called", async () => {
  let supervisorCalls = 0;
  const io = captureIo();
  const { exitCode, result } = await runLocalLauncherWrapper(
    ["--mode", "run_once", "--json", "--created-at", fixedNow],
    {
      io,
      now: () => fixedNow,
      runSupervisor: async () => {
        supervisorCalls++;
        return minimalSupervisorOk();
      },
    },
  );
  assert.equal(supervisorCalls, 0);
  assert.equal(exitCode, 1);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("run_once_requires")));
});

test("D14.7 E — --confirm-start delegates to supervisor once", async () => {
  let calls = 0;
  let lastOpts: ApiDashboardSupervisorOptions | undefined;
  const io = captureIo();
  const { exitCode } = await runLocalLauncherWrapper(
    ["--mode", "run_once", "--confirm-start", "--skip-build", "--json", "--created-at", fixedNow],
    {
      io,
      now: () => fixedNow,
      runSupervisor: async (o) => {
        calls++;
        lastOpts = o;
        return minimalSupervisorOk();
      },
    },
  );
  assert.equal(exitCode, 0);
  assert.equal(calls, 1);
  assert.equal(lastOpts?.apiPort, 3001);
  assert.equal(lastOpts?.dashboardPort, 5173);
  assert.equal(lastOpts?.skipBuild, true);
  const row = JSON.parse(io.getOut().trim()) as Record<string, unknown>;
  assert.ok(row.supervisor);
});

test("D14.7 F — supervisor success fields propagate", async () => {
  const io = captureIo();
  const { result } = await runLocalLauncherWrapper(
    ["--confirm-start", "--skip-build", "--json", "--created-at", fixedNow],
    {
      io,
      now: () => fixedNow,
      runSupervisor: async () => minimalSupervisorOk(),
    },
  );
  const s = result.supervisor;
  assert.ok(s);
  assert.equal(s?.healthOk, true);
  assert.equal(s?.dashboardHttpOk, true);
  assert.equal(s?.corsOk, true);
  assert.equal(s?.cleanupStatus, "ok");
  assert.equal(s?.apiPortFreed, true);
  assert.equal(s?.dashboardPortFreed, true);
});

test("D14.7 G — supervisor failure fail-closed, errors only (no stack in JSON line)", async () => {
  const io = captureIo();
  const { exitCode, result } = await runLocalLauncherWrapper(
    ["--confirm-start", "--skip-build", "--json", "--created-at", fixedNow],
    {
      io,
      now: () => fixedNow,
      runSupervisor: async () => minimalSupervisorFail(),
    },
  );
  assert.equal(exitCode, 1);
  assert.equal(result.ok, false);
  const line = io.getOut().trim();
  assert.equal(line.includes("    at "), false);
  assert.equal(line.includes("stack"), false);
  const row = JSON.parse(line) as { errors: string[] };
  assert.ok(row.errors.length > 0);
});

test("D14.7 H — invalid args exit 2, no stack on stderr", async () => {
  const io = captureIo();
  const { exitCode } = await runLocalLauncherWrapper(["--mode", "nope", "--json"], { io, now: () => fixedNow });
  assert.equal(exitCode, 2);
  assert.equal(io.getErr().includes("    at "), false);

  const io2 = captureIo();
  const { exitCode: c2 } = await runLocalLauncherWrapper(["--api-port", "0", "--json"], { io: io2, now: () => fixedNow });
  assert.equal(c2, 2);
  assert.equal(io2.getErr().includes("    at "), false);
});

test("D14.7 I — JSON payload string excludes forbidden fragments", async () => {
  const io = captureIo();
  await runLocalLauncherWrapper(["--json", "--created-at", fixedNow], {
    io,
    now: () => fixedNow,
    runSupervisor: async () => minimalSupervisorOk(),
  });
  const raw = io.getOut().trim().toLowerCase();
  const banned = [
    "c:\\\\users",
    "/users/",
    "appdata",
    "metaquotes",
    "terminal64.exe",
    "token",
    "secret",
    "ordersend",
    "ctrade",
    "ready to trade",
    "live trading",
    '"executionenabled":true',
    '"tradingenabled":true',
    '"mt5launchenabled":true',
    '"sendtomt5enabled":true',
    '"autoapprovalenabled":true',
  ];
  for (const b of banned) {
    assert.equal(raw.includes(b), false, `unexpected fragment: ${b}`);
  }
});

test("D14.7 J — static scan wrapper source", () => {
  const src = readFileSync(wrapperSrcPath, "utf8");
  assert.equal(src.includes("taskkill"), false);
  assert.equal(/process\.kill\s*\(/i.test(src), false);
  assert.equal(src.includes("OrderSend"), false);
  assert.equal(src.includes("CTrade"), false);
  assert.equal(src.includes("terminal64.exe"), false);
  assert.equal(src.includes("localStorage"), false);
  assert.equal(src.includes("fs.mkdir"), false);
  assert.equal(src.includes("mkdirSync"), false);
  assert.equal(src.includes("writeFileSync"), false);
  assert.equal(src.includes("appendFileSync"), false);
  assert.equal(src.includes('from "node:child_process"'), false);
  assert.equal(src.includes("spawn("), false);
  assert.equal(src.includes("router.post"), false);
});

test("D14.7 K — plan blocks run_once without confirm", () => {
  const p = buildLocalLauncherWrapperPlan({
    json: true,
    effectiveMode: "run_once",
    confirmStart: false,
    explicitMode: true,
    apiHost: "127.0.0.1",
    apiPort: 3001,
    dashboardHost: "127.0.0.1",
    dashboardPort: 5173,
    skipBuild: false,
    maxWaitMs: 25000,
    createdAt: fixedNow,
  });
  assert.ok(p.blockReason);
  assert.equal(p.supervisorOptions, null);
});

test("D14.7 parse — confirm alone implies run_once in parsed options", () => {
  const r = parseLocalLauncherWrapperArgs(["--confirm-start", "--created-at", fixedNow]);
  assert.equal(r.kind, "run");
  if (r.kind === "run") {
    assert.equal(r.options.effectiveMode, "run_once");
    assert.equal(r.options.confirmStart, true);
  }
});

test("D14.7 — toLocalLauncherWrapperJsonPayload shape", () => {
  const parsed = parseLocalLauncherWrapperArgs(["--created-at", fixedNow]);
  assert.equal(parsed.kind, "run");
  if (parsed.kind !== "run") throw new Error("unreachable");
  const plan = buildLocalLauncherWrapperPlan(parsed.options);
  const dry = buildLocalLauncherWrapperDryRunResult(plan.dryRunOptions);
  const payload = toLocalLauncherWrapperJsonPayload({
    ok: true,
    phase: "dry_run_only",
    mode: "dry_run",
    confirmStart: false,
    processStartAttempted: false,
    readOnly: true,
    executionEnabled: false,
    tradingEnabled: false,
    mt5LaunchEnabled: false,
    commandSummary: "test",
    startedAt: null,
    stoppedAt: null,
    dryRun: dry,
    supervisor: null,
    errors: [],
    warnings: [],
  });
  assert.equal(payload.confirmStart, false);
});
