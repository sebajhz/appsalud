/**
 * D10.6 — Bridge folder readiness model tests (injected probes only; no real filesystem required).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertMt5BridgeReadinessSafety,
  createDefaultMt5BridgeReadinessConfig,
  evaluateMt5BridgeReadiness,
  sanitizeBridgePathForDisplay,
  validateMt5BridgeReadinessConfig,
} from "./mapazapp-mt5-bridge-readiness";

const __dirname = dirname(fileURLToPath(import.meta.url));
const READINESS_SOURCE = readFileSync(join(__dirname, "mapazapp-mt5-bridge-readiness.ts"), "utf8");

test("A — default config is not_configured and safe", () => {
  const cfg = createDefaultMt5BridgeReadinessConfig();
  const v = validateMt5BridgeReadinessConfig(cfg);
  assert.equal(v.ok, true);

  const r = evaluateMt5BridgeReadiness(cfg);
  assert.equal(r.ok, true);
  assert.equal(r.status, "not_configured");
  assert.equal(assertMt5BridgeReadinessSafety(r).ok, true);
});

test("B — allowCommandFiles true is unsafe", () => {
  const r = evaluateMt5BridgeReadiness(
    createDefaultMt5BridgeReadinessConfig({ enabled: true, allowCommandFiles: true, bridgeFolder: "Z:\\mock\\bridge" }),
  );
  assert.equal(r.status, "unsafe");
  assert.equal(r.ok, false);
  assert.equal(assertMt5BridgeReadinessSafety(r).ok, true);
});

test("C — enabled without bridgeFolder is invalid", () => {
  const r = evaluateMt5BridgeReadiness(
    createDefaultMt5BridgeReadinessConfig({ enabled: true, bridgeFolder: "   " }),
  );
  assert.equal(r.status, "invalid");
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes("bridge_folder_required_when_enabled"));
});

test("D — injected deps can report expected files present (ready for read-only validation)", () => {
  const cfg = createDefaultMt5BridgeReadinessConfig({
    enabled: true,
    bridgeFolder: "Z:\\mock\\bridge",
    expectedFiles: ["candles.csv", "bridge_status.json"],
  });
  const r = evaluateMt5BridgeReadiness(cfg, {
    exists: () => true,
    listFiles: () => ["bridge_status.json", "candles.csv", "other.txt"],
  });
  assert.equal(r.ok, true);
  assert.equal(r.status, "ready");
  assert.deepEqual(new Set(r.presentFiles), new Set(["candles.csv", "bridge_status.json"]));
  assert.ok(r.safeSummary.includes("ready_for_read_only_validation"));
});

test("E — injected deps with missing expected files returns missing", () => {
  const cfg = createDefaultMt5BridgeReadinessConfig({
    enabled: true,
    bridgeFolder: "Z:\\mock\\bridge",
    expectedFiles: ["candles.csv"],
  });
  const r = evaluateMt5BridgeReadiness(cfg, {
    exists: () => true,
    listFiles: () => ["readme.txt"],
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, "missing");
  assert.ok(r.errors.includes("expected_bridge_files_missing"));
});

test("F — paths sanitize for display without leaking private segments", () => {
  const dirty =
    "C:\\Users\\alice\\AppData\\Roaming\\MetaQuotes\\Terminal\\ABC\\terminal64.exe\\bridge";
  const s = sanitizeBridgePathForDisplay(dirty);
  assert.ok(s);
  assert.ok(!s!.toLowerCase().includes("users\\alice"));
  assert.ok(!s!.toLowerCase().includes("appdata"));
  assert.ok(!s!.toLowerCase().includes("metaquotes"));
  assert.ok(!s!.toLowerCase().includes("terminal64.exe"));
});

test("G — no unsafe tokens in JSON payload", () => {
  const r = evaluateMt5BridgeReadiness(
    createDefaultMt5BridgeReadinessConfig({
      enabled: true,
      bridgeFolder: "Z:\\staging\\bridge",
      expectedFiles: [],
    }),
    { exists: () => true },
  );
  const raw = JSON.stringify(r);
  assert.ok(!raw.toLowerCase().includes("c:\\\\users"));
  assert.ok(!raw.includes("OrderSend"));
  assert.equal(assertMt5BridgeReadinessSafety(r).ok, true);
});

test("H — static scan: readiness source bans runtime/process/trading hooks", () => {
  assert.ok(!READINESS_SOURCE.includes("child_process"));
  assert.ok(!READINESS_SOURCE.includes("child-process"));
  assert.ok(!/\bspawn\s*\(/.test(READINESS_SOURCE));
  assert.ok(!/\bexec(?:File|Sync)?\s*\(/.test(READINESS_SOURCE));
  assert.ok(!READINESS_SOURCE.includes("OrderSend"));
  assert.ok(!READINESS_SOURCE.includes("CTrade"));
  assert.ok(!READINESS_SOURCE.includes("mapazapp:dev-start"));
  assert.ok(!READINESS_SOURCE.includes("fs."));
  assert.ok(!READINESS_SOURCE.includes('from "node:fs"'));
  assert.ok(!READINESS_SOURCE.includes("node:fs"));
  assert.ok(!/\bfs\.watch\b/.test(READINESS_SOURCE));
  assert.ok(!/\bwatch\s*\(/.test(READINESS_SOURCE));
  assert.ok(!READINESS_SOURCE.includes("setInterval"));
  assert.ok(!READINESS_SOURCE.includes("setTimeout"));
});
