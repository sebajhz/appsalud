/**
 * D7.2 — Shared ActionResult model (`action-result.ts`): defaults, factories, safety assertions.
 */

import { describe, expect, it } from "vitest";
import {
  assertActionResultSafety,
  createActionNotAvailableResult,
  createBlockedActionResult,
  createDefaultActionSafety,
  createSuccessfulReadOnlyActionResult,
  MAPAZAPP_ACTION_IDS,
  serializeActionResult,
  type MapazappActionResult,
} from "../src/action-result";
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
  "live trading",
  "real trading",
  "execute order",
  "send order",
  "OrderSend",
  "CTrade",
  "MT5 connected",
  "bridge connected",
  "AppData",
  "MetaQuotes",
  "terminal64.exe",
  "C:\\\\Users",
  "/Users/",
];

function assertNoBannedTokens(json: string): void {
  const low = json.toLowerCase();
  for (const token of BANNED_JSON_SUBSTRINGS) {
    const needle = token.toLowerCase();
    expect(low.includes(needle), `unexpected banned token ${token}`).toBe(false);
  }
}

describe("D7.2 action result model (shared core)", () => {
  it("A. default safety is safe", () => {
    const s = createDefaultActionSafety();
    expect(s.executionEnabled).toBe(false);
    expect(s.sendToMt5Enabled).toBe(false);
    expect(s.canAutoExecute).toBe(false);
    expect(s.autoApprovalEnabled).toBe(false);
    expect(s.registryMutationAllowed).toBe(false);
    expect(s.manualReviewRequired).toBe(true);
  });

  it("B. not available result", () => {
    const ts = "2026-05-10T15:00:00.000Z";
    const r = createActionNotAvailableResult("validate_environment", undefined, {
      generatedAt: ts,
      source: "dashboard",
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe("not_available");
    expect(r.logsPreview).toEqual([]);
    expect(assertActionResultSafety(r).ok).toBe(true);
    expect(r.generatedAt).toBe(ts);
    expect(r.source).toBe("dashboard");
  });

  it("C. blocked result", () => {
    const r = createBlockedActionResult("validate_csv", "Policy blocked this action.", {
      generatedAt: "2026-05-10T15:01:00.000Z",
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe("blocked");
    expect(assertActionResultSafety(r).ok).toBe(true);
    expect(r.message).toBe("Policy blocked this action.");
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("D. successful read-only result", () => {
    const r = createSuccessfulReadOnlyActionResult(
      "show_runtime_status",
      "Read-only snapshot returned.",
      { source: "api", generatedAt: "2026-05-10T15:02:00.000Z" },
    );
    expect(r.ok).toBe(true);
    expect(r.status).toBe("ok");
    expect(assertActionResultSafety(r).ok).toBe(true);
    expect(r.safety.executionEnabled).toBe(false);
  });

  it("E. safety violation detection", () => {
    const base = createSuccessfulReadOnlyActionResult(
      "show_runtime_status",
      "ok",
      { generatedAt: "2026-05-10T15:03:00.000Z" },
    );

    const flags: (keyof typeof base.safety)[] = [
      "executionEnabled",
      "sendToMt5Enabled",
      "canAutoExecute",
      "autoApprovalEnabled",
      "registryMutationAllowed",
    ];
    for (const key of flags) {
      const bad: MapazappActionResult = {
        ...base,
        safety: { ...base.safety, [key]: true },
      };
      expect(assertActionResultSafety(bad).ok).toBe(false);
    }

    const noManual: MapazappActionResult = {
      ...base,
      safety: { ...base.safety, manualReviewRequired: false },
    };
    expect(assertActionResultSafety(noManual).ok).toBe(false);
  });

  it("F. private path detection", () => {
    const r1 = createActionNotAvailableResult("open_logs", "ok", {
      logsPreview: ["seen C:\\Users\\Someone\\logs"],
      generatedAt: "2026-05-10T15:04:00.000Z",
    });
    expect(assertActionResultSafety(r1).ok).toBe(false);

    const r2 = createBlockedActionResult("validate_mt5_config", "Found MetaQuotes terminal path.", {
      generatedAt: "2026-05-10T15:05:00.000Z",
    });
    expect(assertActionResultSafety(r2).ok).toBe(false);
  });

  it("G. no unsafe tokens in serialized default results", () => {
    const samples = [
      createActionNotAvailableResult("validate_environment", undefined, {
        generatedAt: "2026-05-10T15:06:00.000Z",
      }),
      createBlockedActionResult("validate_csv", "Policy blocked this action.", {
        generatedAt: "2026-05-10T15:07:00.000Z",
      }),
      createSuccessfulReadOnlyActionResult("show_runtime_status", "Read-only snapshot returned.", {
        generatedAt: "2026-05-10T15:08:00.000Z",
      }),
    ];
    for (const r of samples) {
      const json = JSON.stringify(serializeActionResult(r));
      assertNoBannedTokens(json);
    }
  });

  it("H. action IDs cover documented future actions", () => {
    expect(MAPAZAPP_ACTION_IDS).toHaveLength(8);
    expect(new Set(MAPAZAPP_ACTION_IDS).size).toBe(8);
    expect(MAPAZAPP_ACTION_IDS).toContain("validate_environment");
    expect(MAPAZAPP_ACTION_IDS).toContain("start_mapazapp_dev");
    expect(MAPAZAPP_ACTION_IDS).toContain("validate_csv");
    expect(MAPAZAPP_ACTION_IDS).toContain("show_runtime_status");
    expect(MAPAZAPP_ACTION_IDS).toContain("validate_mt5_config");
    expect(MAPAZAPP_ACTION_IDS).toContain("open_mt5");
    expect(MAPAZAPP_ACTION_IDS).toContain("stop_mapazapp");
    expect(MAPAZAPP_ACTION_IDS).toContain("open_logs");
  });

  it("I. module exported through @workspace/mapazapp-core public entry", () => {
    expect(typeof mapazappCoreIndex.createDefaultActionSafety).toBe("function");
    expect(typeof mapazappCoreIndex.assertActionResultSafety).toBe("function");
    expect(mapazappCoreIndex.MAPAZAPP_ACTION_IDS.length).toBe(8);
  });
});
