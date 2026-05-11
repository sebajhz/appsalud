import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertLauncherProcessLifecycleSafety,
  createChildProcessRecord,
  createDefaultLauncherProcessLifecycleModel,
  markChildFailed,
  markChildRunning,
  markChildStopped,
  markChildStarting,
  requestLauncherShutdown,
  sanitizeLifecycleFailureToken,
} from "./mapazapp-launcher-process-lifecycle";

test("D11.4 A — default lifecycle model is safe", () => {
  const m = createDefaultLauncherProcessLifecycleModel({ generatedAt: "2026-01-01T00:00:00.000Z" });
  const s = assertLauncherProcessLifecycleSafety(m);
  assert.equal(s.ok, true);
  assert.equal(m.mt5.status, "not_started");
});

test("D11.4 B — child records start as not_started", () => {
  const m = createDefaultLauncherProcessLifecycleModel({ generatedAt: "t0" });
  assert.equal(m.api.status, "not_started");
  assert.equal(m.dashboard.status, "not_started");
  assert.equal(m.bridge.status, "not_started");
});

test("D11.4 C — running without ownership yields transition warning", () => {
  let m = createDefaultLauncherProcessLifecycleModel({ generatedAt: "t0" });
  m = markChildRunning(m, "api", { pid: 42, nowIso: "t1", ownedByLauncher: false });
  assert.equal(m.api.status, "running");
  assert.ok(m.transitionWarnings.includes("running_without_launcher_ownership"));
  const s = assertLauncherProcessLifecycleSafety(m);
  assert.equal(s.ok, true);
  assert.ok(s.warnings.some((w) => w.includes("api")));
});

test("D11.4 D — shutdown request does not change child PIDs or OS", () => {
  const m0 = createDefaultLauncherProcessLifecycleModel({ generatedAt: "t0" });
  const m1 = requestLauncherShutdown(m0, "t1");
  assert.equal(m1.shutdownRequested, true);
  assert.equal(m1.api.pid, null);
  assert.equal(m1.api.status, "not_started");
});

test("D11.4 E — failed state uses sanitized token", () => {
  const m0 = createDefaultLauncherProcessLifecycleModel({ generatedAt: "t0" });
  const raw = "C:\\Users\\Someone\\AppData\\Local\\failure";
  const m1 = markChildFailed(m0, "dashboard", raw, "t2");
  assert.equal(m1.dashboard.status, "failed");
  assert.equal(m1.lastError, "error_redacted_private_marker");
  const joined = JSON.stringify(m1).toLowerCase();
  assert.ok(!joined.includes("someone"));
});

test("D11.4 F — JSON safety on default model", () => {
  const m = createDefaultLauncherProcessLifecycleModel({ generatedAt: "t0" });
  const s = assertLauncherProcessLifecycleSafety(m);
  assert.equal(s.ok, true);
});

test("D11.4 G — static scan avoids OS process control APIs", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "mapazapp-launcher-process-lifecycle.ts"), "utf8");
  assert.ok(!src.includes("child_process"));
  assert.ok(!src.includes("spawn"));
  assert.ok(!src.includes("exec("));
  assert.ok(!src.includes("taskkill"));
  assert.ok(!src.includes("process.kill"));
  assert.ok(!src.includes("mapazapp:dev-start"));
});

test("D11.4 — markChildStopped ignored when not owned", () => {
  let m = markChildRunning(
    createDefaultLauncherProcessLifecycleModel({ generatedAt: "t0" }),
    "api",
    { pid: 9, nowIso: "t1", ownedByLauncher: false },
  );
  m = markChildStopped(m, "api", "t2");
  assert.equal(m.api.status, "running");
  assert.ok(m.transitionWarnings.includes("stop_ignored_not_owned_by_launcher"));
});

test("D11.4 — createChildProcessRecord rejects shell-like labels", () => {
  assert.throws(() => createChildProcessRecord({ kind: "api", commandLabel: "rm -rf /" }));
});
