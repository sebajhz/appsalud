/**
 * D10.8 — Bridge sample metadata tests (pure model; optional snippet scans only).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertBridgeSampleMetadataSafety,
  createBridgeSampleMetadata,
  sanitizeBridgeSampleFilename,
  validateBridgeSampleMetadata,
} from "./mapazapp-bridge-sample-metadata";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_SOURCE = readFileSync(join(__dirname, "mapazapp-bridge-sample-metadata.ts"), "utf8");

test("A — default-shaped repo sample metadata is safe", () => {
  const m = createBridgeSampleMetadata({ filename: "bridge_status.json" });
  assert.equal(m.status, "sanitized_sample");
  assert.equal(m.readOnly, true);
  assert.equal(m.hasTradingApiRisk, false);
  assert.equal(m.hasCommandFileRisk, false);
  assert.equal(validateBridgeSampleMetadata(m).ok, true);
  assert.equal(assertBridgeSampleMetadataSafety(m).ok, true);
});

test("B — BridgeEA/TestEA fixture names classify as sanitized samples", () => {
  const bridge = createBridgeSampleMetadata({ filename: "candles.csv" });
  assert.equal(bridge.kind, "bridge_ea");
  assert.equal(bridge.status, "sanitized_sample");

  const tester = createBridgeSampleMetadata({ filename: "backtest_trades.csv" });
  assert.equal(tester.kind, "test_ea");
  assert.equal(tester.status, "sanitized_sample");
});

test("C — private path segments are stripped/sanitized in filename field", () => {
  const dirty = "C:\\Users\\alice\\AppData\\Roaming\\MetaQuotes\\Terminal\\ABC\\bridge_status.json";
  const m = createBridgeSampleMetadata({ filename: dirty });
  assert.equal(m.filename, "bridge_status.json");
  assert.ok(!JSON.stringify(m).toLowerCase().includes("users"));
  assert.equal(assertBridgeSampleMetadataSafety(m).ok, true);
});

test("D — command file risk is flagged", () => {
  const m = createBridgeSampleMetadata({
    filename: "snapshot.csv",
    contentSnippet: "bridge_command payload",
    kind: "bridge_ea",
  });
  assert.equal(m.hasCommandFileRisk, true);
  assert.equal(m.status, "invalid_sample");
});

test("E — trading API tokens in snippet are flagged", () => {
  const m = createBridgeSampleMetadata({
    filename: "notes.txt",
    contentSnippet: "example OrderSend usage",
  });
  assert.equal(m.hasTradingApiRisk, true);
  assert.equal(m.status, "invalid_sample");
});

test("F — JSON payload avoids forbidden private markers", () => {
  const m = createBridgeSampleMetadata({ filename: "bridge_status.json" });
  const raw = JSON.stringify(m);
  assert.ok(!raw.toLowerCase().includes("appdata"));
  assert.ok(!raw.toLowerCase().includes("metaquotes"));
  assert.equal(assertBridgeSampleMetadataSafety(m).ok, true);
});

test("G — static scan forbids fs, watcher, spawn, and trading hooks in module source", () => {
  assert.ok(!MODULE_SOURCE.includes("node:fs"));
  assert.ok(!MODULE_SOURCE.includes('from "fs"'));
  assert.ok(!MODULE_SOURCE.includes("fs."));
  assert.ok(!/\bfs\.watch\b/.test(MODULE_SOURCE));
  assert.ok(!/\bwatch\s*\(/.test(MODULE_SOURCE));
  assert.ok(!MODULE_SOURCE.includes("child_process"));
  assert.ok(!/\bspawn\s*\(/.test(MODULE_SOURCE));
  assert.ok(!/\bexec(?:File|Sync)?\s*\(/.test(MODULE_SOURCE));
  assert.ok(!MODULE_SOURCE.includes("mapazapp:dev-start"));
  assert.ok(!MODULE_SOURCE.includes("OrderSend"));
  assert.ok(!MODULE_SOURCE.includes("CTrade"));
});

test("sanitizeBridgeSampleFilename handles relative paths", () => {
  assert.equal(sanitizeBridgeSampleFilename("folder/candles.csv"), "candles.csv");
});
