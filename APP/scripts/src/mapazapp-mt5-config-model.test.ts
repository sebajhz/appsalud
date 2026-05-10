/**
 * D10.1 — MT5 config model tests (pure validation; optional injected fs probes only).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertMt5ConfigSafety,
  createDefaultMt5Config,
  sanitizeMt5PathForDisplay,
  validateMt5Config,
} from "./mapazapp-mt5-config-model";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_SOURCE = readFileSync(join(__dirname, "mapazapp-mt5-config-model.ts"), "utf8");

test("A — default config is safe / not_configured", () => {
  const cfg = createDefaultMt5Config();
  const r = validateMt5Config(cfg);
  assert.equal(r.ok, true);
  assert.equal(r.status, "not_configured");
  assert.equal(assertMt5ConfigSafety(r).ok, true);
});

test("B — configured paths sanitize for display without leaking private segments", () => {
  const dirty =
    "C:\\Users\\alice\\AppData\\Roaming\\MetaQuotes\\Terminal\\ABC\\terminal64.exe";
  const s = sanitizeMt5PathForDisplay(dirty);
  assert.ok(s);
  assert.ok(!s!.toLowerCase().includes("users\\alice"));
  assert.ok(!s!.toLowerCase().includes("appdata"));
  assert.ok(!s!.toLowerCase().includes("metaquotes"));
  assert.ok(!s!.toLowerCase().includes("terminal64.exe"));
});

test("C — allowLaunch true is unsafe", () => {
  const r = validateMt5Config(
    createDefaultMt5Config({ enabled: true, allowLaunch: true }),
  );
  assert.equal(r.status, "unsafe");
  assert.equal(r.ok, false);
  assert.equal(assertMt5ConfigSafety(r).ok, true);
});

test("D — allowCommandFiles true is unsafe", () => {
  const r = validateMt5Config(
    createDefaultMt5Config({ enabled: true, allowCommandFiles: true }),
  );
  assert.equal(r.status, "unsafe");
  assert.equal(r.ok, false);
});

test("E — missing terminalPath is not fatal when MT5 disabled", () => {
  const r = validateMt5Config(createDefaultMt5Config({ terminalPath: null }));
  assert.equal(r.status, "not_configured");
  assert.equal(r.ok, true);
});

test("F — read-only structural validation with injected deps only", () => {
  const cfg = createDefaultMt5Config({
    enabled: true,
    terminalPath: "Z:\\mock\\terminal64.exe",
    allowedReadOnly: true,
  });
  const rNoDeps = validateMt5Config(cfg);
  assert.equal(rNoDeps.errors.length, 0);

  const rDeps = validateMt5Config(cfg, {
    pathExists: () => false,
  });
  assert.ok(rDeps.errors.includes("terminal_path_missing_on_disk"));
});

test("G — no unsafe tokens in JSON payload", () => {
  const r = validateMt5Config(
    createDefaultMt5Config({
      enabled: true,
      terminalPath: "D:\\apps\\terminal64.exe",
      allowedReadOnly: true,
    }),
  );
  const raw = JSON.stringify(r);
  assert.ok(!raw.toLowerCase().includes("c:\\\\users"));
  assert.ok(!raw.includes("OrderSend"));
  assert.equal(assertMt5ConfigSafety(r).ok, true);
});

test("H — static scan: model source bans runtime/process/trading hooks", () => {
  assert.ok(!MODEL_SOURCE.includes("child_process"));
  assert.ok(!MODEL_SOURCE.includes("child-process"));
  assert.ok(!/\bspawn\s*\(/.test(MODEL_SOURCE));
  assert.ok(!/\bexec(?:File|Sync)?\s*\(/.test(MODEL_SOURCE));
  assert.ok(!MODEL_SOURCE.includes("OrderSend"));
  assert.ok(!MODEL_SOURCE.includes("CTrade"));
  assert.ok(!MODEL_SOURCE.includes("mapazapp:dev-start"));
});
