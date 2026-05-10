/**
 * D10.3 — MT5 runtime status mapping tests.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assertRuntimeSafety } from "@workspace/mapazapp-core";
import {
  createDefaultMt5Config,
  validateMt5Config,
} from "./mapazapp-mt5-config-model";
import {
  createMt5RuntimeStatusFromConfig,
  createSafeMt5RuntimeSummary,
  mapMt5ConfigValidationToRuntimeStatus,
} from "./mapazapp-mt5-runtime-status";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME_SOURCE = readFileSync(join(__dirname, "mapazapp-mt5-runtime-status.ts"), "utf8");

const BANNED = [
  "mt5 connected",
  "bridge connected",
  "ready to trade",
  "c:\\\\users",
  "appdata",
  "metaquotes",
  "terminal64.exe",
  '"executionEnabled":true',
  '"sendToMt5Enabled":true',
] as const;

function assertNoBannedJson(raw: string): void {
  const low = raw.toLowerCase();
  for (const t of BANNED) {
    assert.ok(!low.includes(t.toLowerCase()), `unexpected token ${t}`);
  }
}

test("default → mt5 not_configured", () => {
  const cfg = createDefaultMt5Config();
  const status = createMt5RuntimeStatusFromConfig(cfg);
  assert.equal(status.mt5.status, "not_configured");
  assert.equal(status.mt5.enabled, false);
  assert.equal(assertRuntimeSafety(status).ok, true);
});

test("valid read-only shaped terminal → detected, never connected language", () => {
  const cfg = createDefaultMt5Config({
    enabled: true,
    terminalPath: "D:\\Apps\\terminal64.exe",
    allowedReadOnly: true,
  });
  const v = validateMt5Config(cfg);
  const slice = mapMt5ConfigValidationToRuntimeStatus(cfg, v, { generatedAt: "2026-05-10T12:00:00.000Z" });
  assert.equal(slice.status, "detected");
  assert.equal(slice.enabled, true);
  const raw = JSON.stringify(slice);
  assertNoBannedJson(raw);
  assert.ok(!raw.toLowerCase().includes("connected"));
});

test("unsafe flags → blocked", () => {
  const cfg = createDefaultMt5Config({ enabled: true, allowLaunch: true });
  const v = validateMt5Config(cfg);
  const slice = mapMt5ConfigValidationToRuntimeStatus(cfg, v);
  assert.equal(slice.status, "blocked");
  assert.equal(slice.enabled, false);
});

test("paths in slice are sanitized", () => {
  const cfg = createDefaultMt5Config({
    enabled: true,
    terminalPath: "C:\\Users\\x\\AppData\\Roaming\\MetaQuotes\\Terminal\\ABC\\terminal64.exe",
    dataFolder: "C:\\Users\\x\\AppData\\Roaming\\MetaQuotes\\Terminal\\ABC",
    mql5FilesFolder: "C:\\Users\\x\\AppData\\Roaming\\MetaQuotes\\Terminal\\ABC\\MQL5\\Files",
    allowedReadOnly: true,
  });
  const v = validateMt5Config(cfg);
  const slice = mapMt5ConfigValidationToRuntimeStatus(cfg, v);
  const raw = JSON.stringify(slice);
  assertNoBannedJson(raw);
});

test("JSON payload omits forbidden tokens", () => {
  const cfg = createDefaultMt5Config({
    enabled: true,
    terminalPath: "E:\\mt5\\terminal64.exe",
    allowedReadOnly: true,
  });
  const status = createMt5RuntimeStatusFromConfig(cfg, { generatedAt: "2026-01-01T00:00:00.000Z" });
  assertNoBannedJson(JSON.stringify(status));
  const summary = createSafeMt5RuntimeSummary(validateMt5Config(cfg));
  assertNoBannedJson(JSON.stringify(summary));
});

test("static scan — no spawn / child_process / trading hooks", () => {
  assert.ok(!RUNTIME_SOURCE.includes("child_process"));
  assert.ok(!/\bspawn\s*\(/.test(RUNTIME_SOURCE));
  assert.ok(!/\bexec(?:File|Sync)?\s*\(/.test(RUNTIME_SOURCE));
  assert.ok(!RUNTIME_SOURCE.includes("OrderSend"));
  assert.ok(!RUNTIME_SOURCE.includes("CTrade"));
});
