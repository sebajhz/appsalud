import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertLocalLauncherWrapperModelSafetyFromSerializedJson,
  assertLocalLauncherWrapperSafety,
  createDefaultLocalLauncherWrapperModel,
  createLocalLauncherWrapperActionPlan,
  serializeLocalLauncherWrapperModel,
  validateLocalLauncherWrapperModel,
} from "./mapazapp-local-launcher-wrapper-model";

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelSourcePath = join(__dirname, "mapazapp-local-launcher-wrapper-model.ts");

function setSafetyFlag(
  model: ReturnType<typeof createDefaultLocalLauncherWrapperModel>,
  key: "tradingEnabled" | "mt5LaunchEnabled" | "postRoutesEnabled" | "actionTransportEnabled" | "processStartEnabled" | "filesystemWritesEnabled",
  value: boolean,
): void {
  (model as unknown as { safety: Record<string, boolean> }).safety[key] = value;
}

test("D14.4 A — defaults are safe and design_only", () => {
  const m = createDefaultLocalLauncherWrapperModel();
  assert.equal(m.mode, "design_only");
  assert.equal(m.safety.executionEnabled, false);
  assert.equal(m.safety.tradingEnabled, false);
  assert.equal(m.safety.mt5LaunchEnabled, false);
  assert.equal(m.safety.actionTransportEnabled, false);
  assert.equal(m.safety.postRoutesEnabled, false);
  assert.equal(m.safety.commandFilesEnabled, false);
  assert.equal(m.safety.filesystemWritesEnabled, false);
  assert.equal(m.safety.processStartEnabled, false);
  assert.equal(m.safety.installerEnabled, false);
  assert.equal(m.safety.manualApprovalRequired, true);
});

test("D14.4 B — determinism: injectable createdAt and stable JSON", () => {
  const a = createDefaultLocalLauncherWrapperModel({ createdAt: "2020-05-01T00:00:00.000Z" });
  const b = createDefaultLocalLauncherWrapperModel({ createdAt: "2020-05-01T00:00:00.000Z" });
  assert.equal(serializeLocalLauncherWrapperModel(a), serializeLocalLauncherWrapperModel(b));
});

test("D14.4 C — default validates ok", () => {
  const m = createDefaultLocalLauncherWrapperModel();
  const r = validateLocalLauncherWrapperModel(m);
  assert.equal(r.ok, true);
  const s = assertLocalLauncherWrapperSafety(m);
  assert.equal(s.ok, true);
});

test("D14.4 D — unsafe safety flags fail validation", () => {
  const base = createDefaultLocalLauncherWrapperModel();
  for (const key of [
    "tradingEnabled",
    "mt5LaunchEnabled",
    "postRoutesEnabled",
    "actionTransportEnabled",
    "filesystemWritesEnabled",
  ] as const) {
    const m = createDefaultLocalLauncherWrapperModel();
    setSafetyFlag(m, key, true);
    const r = validateLocalLauncherWrapperModel(m);
    assert.equal(r.ok, false, key);
  }

  const mDesign = createDefaultLocalLauncherWrapperModel({ mode: "design_only" });
  setSafetyFlag(mDesign, "processStartEnabled", true);
  assert.equal(validateLocalLauncherWrapperModel(mDesign).ok, false);
});

test("D14.4 E — action plan: design_only blocks start/stop; validate/status are declarative", () => {
  const m = createDefaultLocalLauncherWrapperModel();
  const plan = createLocalLauncherWrapperActionPlan(m, { createdAt: m.createdAt });
  const start = plan.steps.find((s) => s.actionId === "start");
  const stop = plan.steps.find((s) => s.actionId === "stop");
  assert.equal(start?.state, "blocked");
  assert.equal(stop?.state, "blocked");

  for (const id of ["validate_layout", "validate_config", "validate_ports", "status"] as const) {
    const row = m.actions.find((a) => a.actionId === id);
    assert.equal(row?.requiresProcessStart, false);
    const step = plan.steps.find((s) => s.actionId === id);
    assert.equal(step?.state, "allowed");
  }

  for (const row of m.actions) {
    assert.equal(row.requiresFilesystemWrite, false);
  }
});

test("D14.4 F — layout folders are conceptual and writesAllowed stays false", () => {
  const m = createDefaultLocalLauncherWrapperModel();
  assert.equal(m.layout.writesAllowed, false);
  assert.ok(m.layout.folders.launcher.includes("launcher"));
  assert.ok(m.layout.folders.apiServer.includes("api-server"));
  assert.ok(m.layout.folders.dashboard.includes("dashboard"));
  assert.ok(m.layout.folders.config.includes("config"));
  assert.ok(m.layout.folders.logs.includes("logs"));
  assert.ok(m.layout.folders.evidence.includes("evidence"));
  assert.ok(m.layout.folders.runtime.includes("runtime"));
  assert.ok(m.layout.folders.backups.includes("backups"));
  assert.ok(m.layout.folders.support.includes("support"));
});

test("D14.4 G — serialization snapshot avoids sensitive markers", () => {
  const m = createDefaultLocalLauncherWrapperModel({
    notes: ["note_only"],
  });
  const json = serializeLocalLauncherWrapperModel(m);
  assert.ok(!/c:\\\\users/i.test(json));
  assert.ok(!/\/users\//i.test(json));
  assert.ok(!/appdata/i.test(json));
  assert.ok(!/metaquotes/i.test(json));
  assert.ok(!/terminal64\.exe/i.test(json));
  const lower = json.toLowerCase();
  const scrubbedForTokenProbe = lower.replace(/actiontokenrequired/g, "");
  assert.ok(!scrubbedForTokenProbe.includes("token"));
  const banned = [
    "secret",
    "ordersend",
    "ctrade",
    "ready to trade",
    "live trading",
    '"executionenabled":true',
    '"tradingenabled":true',
    '"mt5launchenabled":true',
    '"filesystemwritesenabled":true',
    '"processstartenabled":true',
  ];
  for (const frag of banned) {
    assert.ok(!lower.includes(frag), frag);
  }
  const scan = assertLocalLauncherWrapperModelSafetyFromSerializedJson(json);
  assert.equal(scan.ok, true);
});

test("D14.4 H — static scan: model source avoids runtime-only APIs", () => {
  const raw = readFileSync(modelSourcePath, "utf8");
  assert.ok(!raw.includes("child_process"));
  assert.ok(!raw.includes("spawn"));
  assert.ok(!raw.includes("process.kill"));
  assert.ok(!raw.includes("taskkill"));
  assert.ok(!raw.includes("fs.mkdir"));
  assert.ok(!raw.includes("writeFile"));
  assert.ok(!raw.includes("appendFile"));
  assert.ok(!raw.includes("localStorage"));
  assert.ok(!raw.includes("WebSocket"));
  assert.ok(!raw.includes("OrderSend"));
  assert.ok(!raw.includes("CTrade"));
  assert.ok(!raw.includes("terminal64.exe"));
  assert.ok(!raw.includes("POST"));

  assert.ok(!/\bexec(File|Sync)?\s*\(/.test(raw));
  assert.ok(!/\bexec\s*\(/.test(raw));
});

test("D14.4 I — dry_run outlines start/stop without allowing execution", () => {
  const m = createDefaultLocalLauncherWrapperModel({ mode: "dry_run" });
  const plan = createLocalLauncherWrapperActionPlan(m);
  const start = plan.steps.find((s) => s.actionId === "start");
  const stop = plan.steps.find((s) => s.actionId === "stop");
  assert.equal(start?.state, "dry_run_outline");
  assert.equal(stop?.state, "dry_run_outline");
});
