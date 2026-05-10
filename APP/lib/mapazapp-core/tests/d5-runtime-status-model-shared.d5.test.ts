/**
 * D5.1a — Runtime status model lives in `@workspace/mapazapp-core` (`runtime-status.ts`).
 * Equivalent coverage to former D4 tests in `@workspace/scripts`.
 */

import { describe, expect, it } from "vitest";
import {
  assertRuntimeSafety,
  createDefaultRuntimeStatus,
  createManualImportRuntimeStatus,
  deriveOverallRuntimeStatus,
  serializeRuntimeStatus,
  type MapazappRuntimeStatus,
} from "../src/runtime-status";
import * as mapazappCoreIndex from "../src/index";

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

function assertNoBannedTokens(json: string): void {
  for (const token of BANNED_JSON_SUBSTRINGS) {
    expect(json.includes(token)).toBe(false);
  }
}

describe("D5.1a runtime status model (shared core)", () => {
  it("A. default status is safe", () => {
    const s = createDefaultRuntimeStatus();
    expect(s.safety.executionEnabled).toBe(false);
    expect(s.safety.sendToMt5Enabled).toBe(false);
    expect(s.safety.canAutoExecute).toBe(false);
    expect(s.safety.autoApprovalEnabled).toBe(false);
    expect(s.safety.registryMutationAllowed).toBe(false);
    expect(s.safety.manualReviewRequired).toBe(true);
    expect(s.mt5.status).toBe("not_configured");
    expect(s.bridge.status).toBe("not_configured");
    expect(s.overall.status).not.toBe("ok");
    const derived = deriveOverallRuntimeStatus(s);
    expect(derived.status).not.toBe("ok");
  });

  it("B. deterministic JSON with injected generatedAt", () => {
    const ts = "2026-05-09T12:00:00.000Z";
    const a = serializeRuntimeStatus(createDefaultRuntimeStatus({ generatedAt: ts }));
    const b = serializeRuntimeStatus(createDefaultRuntimeStatus({ generatedAt: ts }));
    expect(a).toEqual(b);
  });

  it("C. manual import status — data ok, mt5/bridge not configured, no profitability claims", () => {
    const s = createManualImportRuntimeStatus({
      ok: true,
      symbol: "XAUUSD",
      timeframe: "M15",
      candleCount: 10,
      lastCandleTime: "2026-05-09T11:00:00.000Z",
      warnings: [],
      generatedAt: "2026-05-09T12:00:00.000Z",
    });
    expect(s.data.status).toBe("ok");
    expect(s.mt5.status).toBe("not_configured");
    expect(s.bridge.status).toBe("not_configured");
    expect(s.safety.executionEnabled).toBe(false);
    expect(s.overall.message).toMatch(/profitability|evidence/i);
  });

  it("D. unknown is not promoted to overall ok", () => {
    const s = createDefaultRuntimeStatus();
    const d = deriveOverallRuntimeStatus(s);
    expect(d.status).not.toBe("ok");
  });

  it("E. safety violations are detected", () => {
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
      expect(r.ok).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    }

    const noManual: MapazappRuntimeStatus = {
      ...base,
      safety: { ...base.safety, manualReviewRequired: false },
    };
    const rm = assertRuntimeSafety(noManual);
    expect(rm.ok).toBe(false);
  });

  it("F. live-read-only future mode — still no execution; mt5/bridge issues degrade", () => {
    const base = createDefaultRuntimeStatus({ runtimeMode: "live-read-only" });
    expect(base.safety.executionEnabled).toBe(false);

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
    expect(om.status === "degraded" || om.status === "blocked").toBe(true);
    expect(om.status).not.toBe("ok");

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
    expect(ob.status).toBe("degraded");

    const bridgeMissing: MapazappRuntimeStatus = {
      ...base,
      bridge: {
        ...base.bridge,
        enabled: true,
        status: "missing",
        bridgeFolder: "D:\\\\exports",
      },
    };
    expect(deriveOverallRuntimeStatus(bridgeMissing).status).toBe("degraded");
  });

  it("G. JSON serialization is finite and omits banned tokens for safe fixtures", () => {
    const s = createDefaultRuntimeStatus({ generatedAt: "2026-05-09T12:00:00.000Z" });
    const json = JSON.stringify(serializeRuntimeStatus(s));
    expect(json.includes("NaN")).toBe(false);
    expect(json.includes("Infinity")).toBe(false);
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
    expect(fixed.data && (fixed.data as { candleCount: unknown }).candleCount).toBe(null);
  });

  it("H. default does not fake MT5/bridge connectivity", () => {
    const s = createDefaultRuntimeStatus();
    expect(["ok", "available", "detected"]).not.toContain(s.mt5.status);
    expect(["ok", "available", "detected"]).not.toContain(s.bridge.status);
  });

  it("I. overall ok only when UI slices are ok in mock/manual-import", () => {
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
    expect(derived.status).toBe("ok");
    expect(assertRuntimeSafety({ ...patched, overall: derived }).ok).toBe(true);
  });

  it("J. barrel export — runtime helpers reachable via package index", () => {
    expect(typeof mapazappCoreIndex.createDefaultRuntimeStatus).toBe("function");
    expect(typeof mapazappCoreIndex.serializeRuntimeStatus).toBe("function");
    expect(typeof mapazappCoreIndex.deriveOverallRuntimeStatus).toBe("function");
    expect(typeof mapazappCoreIndex.assertRuntimeSafety).toBe("function");
  });
});
