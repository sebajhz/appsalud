/**
 * D7.3 — Dashboard action client: definitions coverage, safe results, no network/process hooks.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MAPAZAPP_ACTION_IDS,
  assertActionResultSafety,
  serializeActionResult,
  type MapazappActionId,
} from "@workspace/mapazapp-core";
import {
  createActionDefinitionList,
  createUnavailableDashboardActionClient,
} from "./actionClient";

const _here = dirname(fileURLToPath(import.meta.url));

const BANNED_RESULT_SUBSTRINGS = [
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
] as const;

const BANNED_DEFINITION_SUBSTRINGS = [
  "appdata",
  "metaquotes",
  "c:\\users",
  "/users/",
  "login",
  "account",
  "balance",
  "equity",
  "server",
] as const;

function assertNoBannedDefinitionLeak(haystack: string): void {
  const low = haystack.toLowerCase();
  for (const s of BANNED_DEFINITION_SUBSTRINGS) {
    expect(low.includes(s.toLowerCase()), `unexpected leak: ${s}`).toBe(false);
  }
}

function assertNoBannedResultTokens(json: string): void {
  const low = json.toLowerCase();
  for (const token of BANNED_RESULT_SUBSTRINGS) {
    expect(low.includes(token.toLowerCase()), `unexpected token ${token}`).toBe(false);
  }
}

describe("D7.3 dashboard action client", () => {
  const client = createUnavailableDashboardActionClient({
    nowIso: "2026-05-10T18:00:00.000Z",
  });

  it("A. action definitions cover all documented IDs", () => {
    const defs = client.getAvailableActions();
    const ids = new Set(defs.map((d) => d.actionId));
    expect(defs).toHaveLength(MAPAZAPP_ACTION_IDS.length);
    for (const id of MAPAZAPP_ACTION_IDS) {
      expect(ids.has(id)).toBe(true);
    }
    expect(createActionDefinitionList()).toHaveLength(MAPAZAPP_ACTION_IDS.length);
  });

  it("B. default unavailable client returns safe not_available", async () => {
    const r = await client.runAction("validate_environment");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("not_available");
    expect(r.safety.executionEnabled).toBe(false);
    expect(r.safety.manualReviewRequired).toBe(true);
    expect(r.message).toBe("Dashboard action bridge is not implemented yet.");
    expect(assertActionResultSafety(r).ok).toBe(true);
  });

  it("C. dangerous actions are not executable", async () => {
    const dangerous: MapazappActionId[] = ["start_mapazapp_dev", "open_mt5", "stop_mapazapp"];
    for (const id of dangerous) {
      const r = await client.runAction(id);
      expect(r.ok).toBe(false);
      expect(r.status === "blocked" || r.status === "not_available").toBe(true);
      expect(assertActionResultSafety(r).ok).toBe(true);
      expect(r.safety.executionEnabled).toBe(false);
    }
  });

  it("D. no POST/fetch/script side effects by source scan", () => {
    const src = readFileSync(join(_here, "actionClient.ts"), "utf8");
    expect(src.includes("fetch(")).toBe(false);
    expect(src.includes("POST")).toBe(false);
    expect(src.includes("child_process")).toBe(false);
    expect(src.includes("spawn")).toBe(false);
    expect(src.includes("exec(")).toBe(false);
    expect(src.includes("localStorage")).toBe(false);
    expect(src.includes("WebSocket")).toBe(false);
    expect(src.includes("mapazapp:dev-start")).toBe(false);
    expect(src.includes("terminal64.exe")).toBe(false);
  });

  it("E. no unsafe tokens in serialized results", async () => {
    for (const id of MAPAZAPP_ACTION_IDS) {
      const r = await client.runAction(id);
      const json = JSON.stringify(serializeActionResult(r));
      assertNoBannedResultTokens(json);
    }
  });

  it("F. assertActionResultSafety passes for all default results", async () => {
    for (const id of MAPAZAPP_ACTION_IDS) {
      const r = await client.runAction(id);
      expect(assertActionResultSafety(r).ok).toBe(true);
    }
  });

  it("G. definitions do not imply availability for launcher-bound actions", () => {
    const defs = createActionDefinitionList();
    const byId = Object.fromEntries(defs.map((d) => [d.actionId, d])) as Record<
      MapazappActionId,
      (typeof defs)[number]
    >;

    const mustBeDisabled: MapazappActionId[] = [
      "start_mapazapp_dev",
      "open_mt5",
      "stop_mapazapp",
      "validate_mt5_config",
      "open_logs",
    ];
    for (const id of mustBeDisabled) {
      expect(byId[id]?.enabled).toBe(false);
      expect(byId[id]?.reason.length).toBeGreaterThan(10);
      expect(byId[id]?.reason.toLowerCase()).toContain("not implemented");
    }
  });

  it("H. no private path leaks in definitions/results", async () => {
    let big = "";
    for (const d of createActionDefinitionList()) {
      big += `${d.label}\n${d.description}\n${d.reason}\n`;
    }
    assertNoBannedDefinitionLeak(big);

    for (const id of MAPAZAPP_ACTION_IDS) {
      const r = await client.runAction(id);
      big += `${r.message}\n${r.errors.join("\n")}\n${r.warnings.join("\n")}\n`;
    }
    assertNoBannedDefinitionLeak(big);
  });
});
