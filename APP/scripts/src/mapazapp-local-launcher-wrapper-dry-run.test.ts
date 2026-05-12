import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildLocalLauncherWrapperDryRunResult,
  parseLocalLauncherWrapperDryRunArgs,
  runLocalLauncherWrapperDryRun,
  toLocalLauncherWrapperDryRunJsonPayload,
} from "./mapazapp-local-launcher-wrapper-dry-run";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliSourcePath = join(__dirname, "mapazapp-local-launcher-wrapper-dry-run.ts");

test("D14.5 A — --help safe, exit 0, dry-run scope", () => {
  let out = "";
  const code = runLocalLauncherWrapperDryRun(["--help"], {
    stdoutWrite: (s) => {
      out += s;
    },
    stderrWrite: () => {},
  });
  assert.equal(code, 0);
  assert.ok(out.toLowerCase().includes("dry-run"));
  assert.ok(out.includes("No process start"));
  assert.ok(out.includes("No filesystem writes"));
  assert.ok(!out.toLowerCase().includes("ready to trade"));
  assert.ok(!out.toLowerCase().includes("live trading"));
});

test("D14.5 B — default human output design_only and safe flags", () => {
  let out = "";
  const code = runLocalLauncherWrapperDryRun(
    ["--created-at", "2021-01-02T00:00:00.000Z"],
    { stdoutWrite: (s) => { out += s; }, stderrWrite: () => {} },
  );
  assert.equal(code, 0);
  assert.ok(out.includes("design_only"));
  assert.ok(out.includes("Read-only") || out.toLowerCase().includes("read-only"));
  assert.ok(out.includes("processStartEnabled=false"));
  assert.ok(out.includes("filesystemWritesEnabled=false"));
  assert.ok(out.includes("tradingEnabled=false"));
  assert.ok(out.includes("mt5LaunchEnabled=false"));
});

test("D14.5 C — JSON output safe booleans", () => {
  let out = "";
  const code = runLocalLauncherWrapperDryRun(
    ["--json", "--created-at", "2021-01-03T00:00:00.000Z"],
    { stdoutWrite: (s) => { out += s; }, stderrWrite: () => {} },
  );
  assert.equal(code, 0);
  const row = JSON.parse(out.trim()) as Record<string, unknown>;
  assert.equal(row.ok, true);
  assert.equal(row.readOnly, true);
  assert.equal(row.executionEnabled, false);
  assert.equal(row.tradingEnabled, false);
  assert.equal(row.mt5LaunchEnabled, false);
  assert.equal(row.processStartEnabled, false);
  assert.equal(row.filesystemWritesEnabled, false);
});

test("D14.5 D — dry_run mode: start/stop outline, no real process start", () => {
  const r = buildLocalLauncherWrapperDryRunResult({
    mode: "dry_run",
    rootStrategy: "portable",
    createdAt: "2022-01-01T00:00:00.000Z",
    strict: false,
  });
  assert.equal(r.mode, "dry_run");
  const start = r.actionPlan.steps.find((s) => s.actionId === "start");
  const stop = r.actionPlan.steps.find((s) => s.actionId === "stop");
  assert.equal(start?.state, "dry_run_outline");
  assert.equal(stop?.state, "dry_run_outline");
  assert.equal(r.safety.processStartEnabled, false);
});

test("D14.5 E — invalid mode exit 2, safe message, no stack", () => {
  let err = "";
  const code = runLocalLauncherWrapperDryRun(["--mode", "supervisor_backed"], {
    stdoutWrite: () => {},
    stderrWrite: (s) => {
      err += s;
    },
  });
  assert.equal(code, 2);
  assert.ok(err.includes("Invalid --mode"));
  assert.ok(!err.includes("at "));
});

test("D14.5 F — determinism same JSON for same flags", () => {
  const a = JSON.stringify(
    toLocalLauncherWrapperDryRunJsonPayload(
      buildLocalLauncherWrapperDryRunResult({
        mode: "design_only",
        rootStrategy: "appData",
        createdAt: "2019-06-01T12:00:00.000Z",
        strict: false,
      }),
    ),
  );
  const b = JSON.stringify(
    toLocalLauncherWrapperDryRunJsonPayload(
      buildLocalLauncherWrapperDryRunResult({
        mode: "design_only",
        rootStrategy: "appData",
        createdAt: "2019-06-01T12:00:00.000Z",
        strict: false,
      }),
    ),
  );
  assert.equal(a, b);
});

test("D14.5 G — action plan: no POST/MT5/trading requirements in steps", () => {
  const r = buildLocalLauncherWrapperDryRunResult({
    mode: "design_only",
    rootStrategy: "undecided",
    createdAt: "1970-01-01T00:00:00.000Z",
    strict: false,
  });
  for (const row of r.model.actions) {
    assert.equal(row.requiresFilesystemWrite, false);
  }
  const exportStep = r.actionPlan.steps.find((s) => s.actionId === "export_evidence");
  assert.ok(exportStep);
  const validateLayout = r.actionPlan.steps.find((s) => s.actionId === "validate_layout");
  assert.equal(validateLayout?.state, "allowed");
  const status = r.actionPlan.steps.find((s) => s.actionId === "status");
  assert.equal(status?.state, "allowed");
});

test("D14.5 H — root strategy and layout conceptual", () => {
  const r = buildLocalLauncherWrapperDryRunResult({
    mode: "design_only",
    rootStrategy: "portable",
    createdAt: "1970-01-01T00:00:00.000Z",
    strict: false,
  });
  assert.equal(r.model.layout.rootStrategy, "portable");
  assert.equal(r.model.layout.writesAllowed, false);
  assert.ok(r.model.layout.folders.launcher.length > 0);
});

test("D14.5 I — JSON serialization avoids sensitive markers", () => {
  const r = buildLocalLauncherWrapperDryRunResult({
    mode: "design_only",
    rootStrategy: "undecided",
    createdAt: "1970-01-01T00:00:00.000Z",
    strict: false,
  });
  const json = JSON.stringify(toLocalLauncherWrapperDryRunJsonPayload(r));
  assert.ok(!/c:\\\\users/i.test(json));
  assert.ok(!/\/users\//i.test(json));
  assert.ok(!/appdata/i.test(json));
  assert.ok(!/metaquotes/i.test(json));
  assert.ok(!/terminal64\.exe/i.test(json));
  const lower = json.toLowerCase();
  const scrubbed = lower.replace(/actiontokenrequired/g, "");
  assert.ok(!scrubbed.includes("token"));
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
});

test("D14.5 J — static scan forbids runtime hooks", () => {
  const raw = readFileSync(cliSourcePath, "utf8");
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
  assert.ok(!raw.includes("router.post"));
  assert.ok(!raw.includes("fetch("));
  assert.ok(!raw.includes("POST"));
  assert.ok(!/\bexec\s*\(/.test(raw));
  assert.ok(!/\bexec(File|Sync)?\s*\(/.test(raw));
});

test("D14.5 K — parse rejects unknown flag", () => {
  const p = parseLocalLauncherWrapperDryRunArgs(["--not-a-real-flag"]);
  assert.equal(p.kind, "error");
});

test("D14.5 L — strict fails on packaged_future warnings via build helper", () => {
  const r = buildLocalLauncherWrapperDryRunResult({
    mode: "packaged_future",
    rootStrategy: "undecided",
    createdAt: "1970-01-01T00:00:00.000Z",
    strict: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.strictWarningsFailed, true);
});
