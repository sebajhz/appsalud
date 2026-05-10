/**
 * D4 — Runtime status model tests (pure TS, no I/O).
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRuntimeSafety,
  createDefaultRuntimeStatus,
  createManualImportRuntimeStatus,
  deriveOverallRuntimeStatus,
  serializeRuntimeStatus,
  type MapazappRuntimeStatus,
} from "./mapazapp-runtime-status";

const BANNED_JSON_SUBSTRINGS = [
  '"executionEnabled":true',
  '"sendToMt5Enabled":true',
  '"canAutoExecute":true',
  '"autoApprovalEnabled":true',
  '"registryMutationAllowed":true',
  '"approved":true',
  "ready to trade",
  "ready for trading",
  "execute order",
  "send order",
  "OrderSend",
  "CTrade",
  "MT5 connected",
  "bridge connected",
];

function assertNoBannedTokens(json: string) {
  for (const token of BANNED_JSON_SUBSTRINGS) {
    assert.equal(
      json.includes(token),
      false,
      `unexpected token sequence: ${token}`,
    );
  }
}

test("A. default status is safe", () => {
  const s = createDefaultRuntimeStatus();
  assert.equal(s.safety.executionEnabled, false);
  assert.equal(s.safety.sendToMt5Enabled, false);
  assert.equal(s.safety.canAutoExecute, false);
  assert.equal(s.safety.autoApprovalEnabled, false);
  assert.equal(s.safety.registryMutationAllowed, false);
  assert.equal(s.safety.manualReviewRequired, true);
  assert.equal(s.mt5.status, "not_configured");
  assert.equal(s.bridge.status, "not_configured");
  assert.notEqual(s.overall.status, "ok");
  const derived = deriveOverallRuntimeStatus(s);
  assert.notEqual(derived.status, "ok");
});

test("B. deterministic JSON with injected generatedAt", () => {
  const ts = "2026-05-09T12:00:00.000Z";
  const a = serializeRuntimeStatus(createDefaultRuntimeStatus({ generatedAt: ts }));
  const b = serializeRuntimeStatus(createDefaultRuntimeStatus({ generatedAt: ts }));
  assert.deepEqual(a, b);
});

test("C. manual import status — data ok, mt5/bridge not configured, no profitability claims", () => {
  const s = createManualImportRuntimeStatus({
    ok: true,
    symbol: "XAUUSD",
    timeframe: "M15",
    candleCount: 10,
    lastCandleTime: "2026-05-09T11:00:00.000Z",
    warnings: [],
    generatedAt: "2026-05-09T12:00:00.000Z",
  });
  assert.equal(s.data.status, "ok");
  assert.equal(s.mt5.status, "not_configured");
  assert.equal(s.bridge.status, "not_configured");
  assert.equal(s.safety.executionEnabled, false);
  assert.match(s.overall.message, /profitability|evidence/i);
});

test("D. unknown is not promoted to overall ok", () => {
  const s = createDefaultRuntimeStatus();
  const d = deriveOverallRuntimeStatus(s);
  assert.notEqual(d.status, "ok");
});

test("E. safety violations are detected", () => {
  const base = createDefaultRuntimeStatus();
  const flags: (keyof typeof base.safety)[] = [
    "executionEnabled",
    "sendToMt5Enabled",
    "canAutoExecute",
    "autoApprovalEnabled",
    "registryMutationAllowed",
  ];
  for (const flag of flags) {
    const bad: MapazappRuntimeStatus = {
      ...base,
      safety: { ...base.safety, [flag]: true },
    };
    const r = assertRuntimeSafety(bad);
    assert.equal(r.ok, false);
    assert.ok(r.errors.length > 0);
  }

  const noManual: MapazappRuntimeStatus = {
    ...base,
    safety: { ...base.safety, manualReviewRequired: false },
  };
  const rm = assertRuntimeSafety(noManual);
  assert.equal(rm.ok, false);
});

test("F. live-read-only future mode — still no execution; mt5/bridge issues degrade", () => {
  const base = createDefaultRuntimeStatus({ runtimeMode: "live-read-only" });
  assert.equal(base.safety.executionEnabled, false);

  const mt5Bad: MapazappRuntimeStatus = {
    ...base,
    mt5: {
      ...base.mt5,
      enabled: true,
      status: "not_found",
      terminalPath: "C:\\\\Program Files\\\\MetaTrader 5\\\\terminal64.exe",
    },
  };
  const om = deriveOverallRuntimeStatus(mt5Bad);
  assert.ok(om.status === "degraded" || om.status === "blocked");
  assert.notEqual(om.status, "ok");

  const bridgeStale: MapazappRuntimeStatus = {
    ...base,
    bridge: {
      ...base.bridge,
      enabled: true,
      status: "stale",
      bridgeFolder: "D:\\\\exports",
    },
  };
  const ob = deriveOverallRuntimeStatus(bridgeStale);
  assert.equal(ob.status, "degraded");

  const bridgeMissing: MapazappRuntimeStatus = {
    ...base,
    bridge: {
      ...base.bridge,
      enabled: true,
      status: "missing",
      bridgeFolder: "D:\\\\exports",
    },
  };
  assert.equal(deriveOverallRuntimeStatus(bridgeMissing).status, "degraded");
});

test("G. JSON serialization is finite and omits banned tokens for safe fixtures", () => {
  const s = createDefaultRuntimeStatus({ generatedAt: "2026-05-09T12:00:00.000Z" });
  const json = JSON.stringify(serializeRuntimeStatus(s));
  assert.equal(json.includes("NaN"), false);
  assert.equal(json.includes("Infinity"), false);
  assertNoBannedTokens(json);

  const manual = createManualImportRuntimeStatus({
    ok: true,
    symbol: "EURUSD",
    timeframe: "H1",
    candleCount: 3,
    generatedAt: "2026-05-09T12:00:00.000Z",
  });
  assertNoBannedTokens(JSON.stringify(serializeRuntimeStatus(manual)));

  const weird = createManualImportRuntimeStatus({
    ok: true,
    candleCount: Number.NaN,
    generatedAt: "2026-05-09T12:00:00.000Z",
  });
  const fixed = serializeRuntimeStatus(weird);
  assert.equal(fixed.data && (fixed.data as { candleCount: unknown }).candleCount, null);
});

test("H. default does not fake MT5/bridge connectivity", () => {
  const s = createDefaultRuntimeStatus();
  assert.ok(!["ok", "available", "detected"].includes(s.mt5.status));
  assert.ok(!["ok", "available", "detected"].includes(s.bridge.status));
});

test("I. overall ok only when UI slices are ok in mock/manual-import", () => {
  const ready = createDefaultRuntimeStatus({
    runtimeMode: "mock",
    apiStatus: "ok",
    dashboardStatus: "ok",
    generatedAt: "2026-05-09T12:00:00.000Z",
  });
  const patched: MapazappRuntimeStatus = {
    ...ready,
    api: {
      ...ready.api,
      url: "http://127.0.0.1:3001",
      port: 3001,
    },
    dashboard: {
      ...ready.dashboard,
      url: "http://127.0.0.1:5173",
      port: 5173,
    },
  };
  const derived = deriveOverallRuntimeStatus(patched);
  assert.equal(derived.status, "ok");
  assert.equal(assertRuntimeSafety({ ...patched, overall: derived }).ok, true);
});
