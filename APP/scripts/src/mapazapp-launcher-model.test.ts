/**
 * D8.2 — Launcher model skeleton tests (no subprocesses).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertLauncherModelSafety,
  createDefaultLauncherConfig,
  createDefaultLauncherProcessModel,
  createLauncherChildProcessRecord,
  deriveLauncherRuntimeStatus,
  serializeLauncherDerivedRuntimeStatus,
  serializeLauncherModel,
} from "./mapazapp-launcher-model";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAUNCHER_MODEL_SOURCE = readFileSync(
  join(__dirname, "mapazapp-launcher-model.ts"),
  "utf8",
);

const FORBIDDEN_SERIALIZED_SUBSTRINGS_LOWER = [
  "appdata",
  "metaquotes",
  "terminal64.exe",
  "c:\\\\users",
  "/users/",
  "ready to trade",
  "live trading",
  "real trading",
  "execute order",
  "send order",
  "ordersend",
  "ctrade",
  "mt5 connected",
  "bridge connected",
] as const;

const FORBIDDEN_WORD_BOUNDARY = /\b(login|account|balance|equity|server)\b/i;

test("A. default config is safe", () => {
  const c = createDefaultLauncherConfig();
  assert.equal(c.api.port, 3001);
  assert.equal(c.dashboard.port, 5173);
  assert.equal(c.mt5.enabled, false);
  assert.equal(c.bridge.enabled, false);
  assert.equal(c.dashboard.openBrowser, false);
  assert.equal(c.safety.executionEnabled, false);
  assert.equal(c.safety.manualReviewRequired, true);
});

test("B. default process model has no running children", () => {
  const m = createDefaultLauncherProcessModel();
  assert.equal(m.actionBridgeEnabled, false);
  assert.equal(m.mt5RuntimeEnabled, false);
  assert.equal(m.watcherEnabled, false);
  assert.equal(m.dbEnabled, false);
  assert.equal(m.websocketEnabled, false);
  for (const ch of Object.values(m.children)) {
    assert.equal(ch.status, "not_started");
    assert.equal(ch.pid, null);
  }
});

test("C. child process record is ownership-safe", () => {
  const idle = createLauncherChildProcessRecord("api");
  assert.equal(idle.ownedByLauncher, false);
  assert.equal(idle.pid, null);

  assert.throws(
    () =>
      createLauncherChildProcessRecord("api", {
        status: "running",
        pid: null,
      }),
    /requires a positive integer pid/i,
  );

  const bad = createDefaultLauncherProcessModel();
  bad.children.api = createLauncherChildProcessRecord("api", {
    pid: 1234,
    status: "running",
    ownedByLauncher: false,
  });
  const r = assertLauncherModelSafety(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("ownedByLauncher")));
});

test("D. unsafe safety flags blocked", () => {
  const flags = [
    "executionEnabled",
    "sendToMt5Enabled",
    "canAutoExecute",
    "autoApprovalEnabled",
    "registryMutationAllowed",
  ] as const satisfies ReadonlyArray<keyof ReturnType<typeof createDefaultLauncherConfig>["safety"]>;
  for (const key of flags) {
    const cfg = createDefaultLauncherConfig();
    const rec = cfg.safety as Record<string, boolean>;
    rec[key] = true;
    const m = createDefaultLauncherProcessModel({ config: cfg });
    const r = assertLauncherModelSafety(m);
    assert.equal(r.ok, false, `expected failure when ${key} is true`);
  }

  const cfgMr = createDefaultLauncherConfig();
  cfgMr.safety.manualReviewRequired = false;
  const mMr = createDefaultLauncherProcessModel({ config: cfgMr });
  assert.equal(assertLauncherModelSafety(mMr).ok, false);
});

test("E. future capabilities disabled", () => {
  const setCap = (
    mut: (m: ReturnType<typeof createDefaultLauncherProcessModel>) => void,
  ): void => {
    const m = createDefaultLauncherProcessModel();
    mut(m);
    assert.equal(assertLauncherModelSafety(m).ok, false);
  };
  setCap((m) => {
    m.actionBridgeEnabled = true;
  });
  setCap((m) => {
    m.mt5RuntimeEnabled = true;
  });
  setCap((m) => {
    m.watcherEnabled = true;
  });
  setCap((m) => {
    m.dbEnabled = true;
  });
  setCap((m) => {
    m.websocketEnabled = true;
  });
});

test("F. runtime status derivation conservative", () => {
  const idle = createDefaultLauncherProcessModel({
    nowIso: "2026-05-10T12:00:00.000Z",
  });
  const rsIdle = deriveLauncherRuntimeStatus(idle);
  assert.notEqual(rsIdle.api.status, "ok");
  assert.notEqual(rsIdle.dashboard.status, "ok");
  assert.equal(rsIdle.mt5.status, "not_configured");
  assert.equal(rsIdle.bridge.status, "not_configured");
  assert.equal(rsIdle.safety.executionEnabled, false);
  assert.notEqual(
    rsIdle.overall.status,
    "ok",
    "idle skeleton must not claim overall ok",
  );

  let running = createDefaultLauncherProcessModel({
    nowIso: "2026-05-10T12:00:00.000Z",
  });
  running.children.api = createLauncherChildProcessRecord("api", {
    pid: 100,
    status: "running",
    ownedByLauncher: true,
  });
  running.children.dashboard = createLauncherChildProcessRecord("dashboard", {
    pid: 101,
    status: "running",
    ownedByLauncher: true,
  });
  const rsRun = deriveLauncherRuntimeStatus(running);
  assert.equal(rsRun.api.status, "ok");
  assert.equal(rsRun.dashboard.status, "ok");
  assert.equal(rsRun.overall.status, "ok");
});

test("G. no private paths / operational tokens in serialized defaults", () => {
  const m = createDefaultLauncherProcessModel({
    nowIso: "2026-05-10T12:00:00.000Z",
  });
  const blob =
    JSON.stringify(serializeLauncherModel(m)) +
    JSON.stringify(serializeLauncherDerivedRuntimeStatus(m));

  const low = blob.toLowerCase();
  for (const s of FORBIDDEN_SERIALIZED_SUBSTRINGS_LOWER) {
    assert.ok(!low.includes(s), `forbidden substring ${s}`);
  }
  assert.ok(!FORBIDDEN_WORD_BOUNDARY.test(blob));
  assert.ok(!/"executionEnabled"\s*:\s*true\b/.test(blob));
});

test("H. module does not import forbidden process APIs", () => {
  const ban = [
    "child_process",
    "spawn(",
    "exec(",
    "taskkill",
    "powershell",
    "cmd.exe",
  ];
  const src = LAUNCHER_MODEL_SOURCE.toLowerCase();
  for (const b of ban) {
    assert.ok(!src.includes(b.toLowerCase()), `forbidden token ${b}`);
  }
});

test("I. deterministic generated timestamps", () => {
  const iso = "2026-05-10T12:00:00.000Z";
  const a = createDefaultLauncherProcessModel({ nowIso: iso });
  const b = createDefaultLauncherProcessModel({ nowIso: iso });
  assert.deepEqual(serializeLauncherModel(a), serializeLauncherModel(b));
});

test("J. MT5 enabled with private path markers fails safety", () => {
  const cfg = createDefaultLauncherConfig();
  cfg.mt5.enabled = true;
  cfg.mt5.terminalPath = "C:\\Users\\x\\AppData\\Roaming\\MetaQuotes\\Terminal\\x\\terminal64.exe";
  const m = createDefaultLauncherProcessModel({ config: cfg });
  const r = assertLauncherModelSafety(m);
  assert.equal(r.ok, false);
});
