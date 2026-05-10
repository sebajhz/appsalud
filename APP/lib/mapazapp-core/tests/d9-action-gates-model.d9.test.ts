/**
 * D9.2 — Local action gate model (`action-gates.ts`): definitions, evaluation, safety, ActionResult bridge.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertActionGateDecisionSafety,
  createActionGateActionResult,
  createActionGateDefinitionList,
  createDefaultActionGatePolicy,
  evaluateActionGate,
  getActionGateDefinition,
  serializeActionGateDecision,
  type MapazappActionGateDefinition,
  type MapazappActionGateDecision,
  type MapazappActionId,
} from "../src/action-gates";
import { assertActionResultSafety, MAPAZAPP_ACTION_IDS } from "../src/action-result";
import * as mapazappCoreIndex from "../src/index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GATES_SOURCE = readFileSync(join(__dirname, "../src/action-gates.ts"), "utf8");

const BANNED_JSON_SUBSTRINGS = [
  '"executionEnabled":true',
  '"sendToMt5Enabled":true',
  '"canAutoExecute":true',
  '"autoApprovalEnabled":true',
  '"registryMutationAllowed":true',
  '"approved":true',
  '"allowsTrading":true',
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

describe("D9.2 local action gate model (shared core)", () => {
  it("A. definitions cover all 8 action IDs — no missing, no duplicates", () => {
    const defs = createActionGateDefinitionList();
    const ids = defs.map((d) => d.actionId);
    expect(ids.length).toBe(MAPAZAPP_ACTION_IDS.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of MAPAZAPP_ACTION_IDS) {
      expect(ids.includes(id), `missing definition for ${id}`).toBe(true);
    }
  });

  it("B. show_runtime_status allowed read-only by default", () => {
    const decision = evaluateActionGate({
      actionId: "show_runtime_status",
      callerSource: "dashboard",
      nowIso: "2026-05-10T18:00:00.000Z",
    });
    expect(decision.allowed).toBe(true);
    expect(decision.status).toBe("allowed");
    expect(decision.riskLevel).toBe("low");
    expect(decision.requirements.launcherRequired).toBe(false);
    expect(assertActionGateDecisionSafety(decision).ok).toBe(true);
  });

  it("C. validate_environment caller rules", () => {
    const policy = createDefaultActionGatePolicy();
    const dash = evaluateActionGate(
      {
        actionId: "validate_environment",
        callerSource: "dashboard",
        nowIso: "2026-05-10T18:01:00.000Z",
      },
      policy,
    );
    expect(dash.allowed).toBe(false);
    expect(["requires_transport_gate", "requires_launcher"]).toContain(dash.status);

    const dashTransport = evaluateActionGate(
      {
        actionId: "validate_environment",
        callerSource: "dashboard",
        transportGatePresent: true,
        launcherAvailable: true,
        nowIso: "2026-05-10T18:01:01.000Z",
      },
      { ...policy, transportGateEnabled: true, launcherAvailable: true },
    );
    expect(dashTransport.allowed).toBe(false);
    expect(dashTransport.status).toBe("requires_launcher");

    const launcherOk = evaluateActionGate(
      {
        actionId: "validate_environment",
        callerSource: "launcher",
        nowIso: "2026-05-10T18:01:02.000Z",
      },
      policy,
    );
    expect(launcherOk.allowed).toBe(true);
    expect(assertActionGateDecisionSafety(launcherOk).ok).toBe(true);
  });

  it("D. process lifecycle blocked by default", () => {
    const policy = createDefaultActionGatePolicy();
    for (const id of ["start_mapazapp_dev", "stop_mapazapp"] as const) {
      const d = evaluateActionGate(
        {
          actionId: id,
          callerSource: "launcher",
          hasUserConfirmation: true,
          launcherAvailable: true,
          nowIso: "2026-05-10T18:02:00.000Z",
        },
        { ...policy, allowProcessLifecycle: true, launcherAvailable: true },
      );
      expect(d.allowed).toBe(false);
      expect(d.requirements.launcherRequired).toBe(true);
      expect(getActionGateDefinition(id)?.allowsTrading).toBe(false);
    }
  });

  it("E. file validation requires consent and policy", () => {
    const policy = createDefaultActionGatePolicy();
    const noConsent = evaluateActionGate(
      {
        actionId: "validate_csv",
        callerSource: "dashboard",
        transportGatePresent: true,
        nowIso: "2026-05-10T18:03:00.000Z",
      },
      { ...policy, transportGateEnabled: true, allowFileValidation: true },
    );
    expect(noConsent.allowed).toBe(false);
    expect(noConsent.status).toBe("requires_file_consent");

    const consentNoPolicy = evaluateActionGate(
      {
        actionId: "validate_csv",
        callerSource: "dashboard",
        hasFileConsent: true,
        transportGatePresent: true,
        nowIso: "2026-05-10T18:03:01.000Z",
      },
      { ...policy, transportGateEnabled: true },
    );
    expect(consentNoPolicy.allowed).toBe(false);
    expect(consentNoPolicy.status).toBe("not_available");
  });

  it("F. MT5 actions blocked until D10 policy flags", () => {
    const policy = createDefaultActionGatePolicy();
    for (const id of ["validate_mt5_config", "open_mt5"] as const) {
      const d = evaluateActionGate(
        {
          actionId: id,
          callerSource: "launcher",
          hasUserConfirmation: true,
          launcherAvailable: true,
          nowIso: "2026-05-10T18:04:00.000Z",
        },
        policy,
      );
      expect(d.allowed).toBe(false);
      expect(["not_available", "blocked"].includes(d.status)).toBe(true);
      expect(getActionGateDefinition(id)?.allowsTrading).toBe(false);
    }
    const blob = JSON.stringify(
      createActionGateDefinitionList().map((x) => serializeActionGateDecision(baseDecisionFromDef(x))),
    );
    assertNoBannedTokens(blob.toLowerCase());
  });

  it("G. unknown actionId returns error without throw", () => {
    const badId = "totally_unknown_action" as MapazappActionId;
    const d = evaluateActionGate({
      actionId: badId,
      callerSource: "script",
      nowIso: "2026-05-10T18:05:00.000Z",
    });
    expect(d.allowed).toBe(false);
    expect(d.status).toBe("error");
    expect(assertActionGateDecisionSafety(d).ok).toBe(true);
  });

  it("H. safety assertion catches unsafe decisions", () => {
    const def = getActionGateDefinition("show_runtime_status")!;
    const tradingAllowed: MapazappActionGateDecision = {
      allowed: true,
      status: "allowed",
      actionId: "show_runtime_status",
      callerSource: "dashboard",
      actionClass: "trading_execution",
      riskLevel: "forbidden",
      message: "safe message",
      safety: createDefaultActionSafetyLike(),
      requirements: {
        launcherRequired: false,
        transportGateRequired: false,
        userConfirmationRequired: false,
        fileConsentRequired: false,
      },
      generatedAt: "2026-05-10T18:06:00.000Z",
      errors: [],
      warnings: [],
    };
    expect(assertActionGateDecisionSafety(tradingAllowed).ok).toBe(false);

    const allowsTradingJson: MapazappActionGateDecision & { allowsTrading?: boolean } = {
      allowed: false,
      status: "blocked",
      actionId: def.actionId,
      callerSource: "dashboard",
      actionClass: def.actionClass,
      riskLevel: def.riskLevel,
      message: "blocked",
      safety: createDefaultActionSafetyLike(),
      requirements: {
        launcherRequired: false,
        transportGateRequired: false,
        userConfirmationRequired: false,
        fileConsentRequired: false,
      },
      generatedAt: "2026-05-10T18:06:01.000Z",
      errors: [],
      warnings: [],
      allowsTrading: true,
    };
    expect(assertActionGateDecisionSafety(allowsTradingJson as MapazappActionGateDecision).ok).toBe(false);

    const highAllowed: MapazappActionGateDecision = {
      allowed: true,
      status: "allowed",
      actionId: "start_mapazapp_dev",
      callerSource: "launcher",
      actionClass: "process_lifecycle",
      riskLevel: "high",
      message: "should not allow high risk",
      safety: createDefaultActionSafetyLike(),
      requirements: {
        launcherRequired: true,
        transportGateRequired: false,
        userConfirmationRequired: true,
        fileConsentRequired: false,
      },
      generatedAt: "2026-05-10T18:06:02.000Z",
      errors: [],
      warnings: [],
    };
    expect(assertActionGateDecisionSafety(highAllowed).ok).toBe(false);

    const badSafety: MapazappActionGateDecision = {
      allowed: false,
      status: "blocked",
      actionId: "show_runtime_status",
      callerSource: "dashboard",
      actionClass: "read_only_status",
      riskLevel: "low",
      message: "ok",
      safety: {
        executionEnabled: true,
        sendToMt5Enabled: false,
        canAutoExecute: false,
        autoApprovalEnabled: false,
        registryMutationAllowed: false,
        manualReviewRequired: true,
      },
      requirements: {
        launcherRequired: false,
        transportGateRequired: false,
        userConfirmationRequired: false,
        fileConsentRequired: false,
      },
      generatedAt: "2026-05-10T18:06:03.000Z",
      errors: [],
      warnings: [],
    };
    expect(assertActionGateDecisionSafety(badSafety).ok).toBe(false);
  });

  it("I. createActionGateActionResult — blocked and read-only allowed", () => {
    const blocked = evaluateActionGate({
      actionId: "start_mapazapp_dev",
      callerSource: "launcher",
      nowIso: "2026-05-10T18:07:00.000Z",
    });
    const br = createActionGateActionResult(blocked);
    expect(br.ok).toBe(false);
    expect(assertActionResultSafety(br).ok).toBe(true);

    const ok = evaluateActionGate({
      actionId: "show_runtime_status",
      callerSource: "api",
      nowIso: "2026-05-10T18:07:01.000Z",
    });
    const ar = createActionGateActionResult(ok);
    expect(ar.ok).toBe(true);
    expect(assertActionResultSafety(ar).ok).toBe(true);
  });

  it("J. static scan — action-gates.ts forbids operational APIs", () => {
    const src = GATES_SOURCE.toLowerCase();
    const banned = [
      "fetch(",
      "post ",
      "child_process",
      "spawn(",
      "exec(",
      "powershell",
      "cmd.exe",
      "taskkill",
      "websocket",
      "localstorage",
    ];
    for (const b of banned) {
      expect(src.includes(b.toLowerCase()), `forbidden token ${b}`).toBe(false);
    }
  });

  it("K. no unsafe tokens in serialized definitions and sample decisions", () => {
    const defs = createActionGateDefinitionList();
    const samples: MapazappActionGateDecision[] = [
      evaluateActionGate({
        actionId: "show_runtime_status",
        callerSource: "dashboard",
        nowIso: "2026-05-10T18:08:00.000Z",
      }),
      evaluateActionGate({
        actionId: "validate_environment",
        callerSource: "launcher",
        nowIso: "2026-05-10T18:08:01.000Z",
      }),
      evaluateActionGate({
        actionId: "validate_environment",
        callerSource: "dashboard",
        nowIso: "2026-05-10T18:08:02.000Z",
      }),
    ];
    const payload = JSON.stringify({
      defs,
      samples,
      results: samples.map((s) => createActionGateActionResult(s)),
    });
    assertNoBannedTokens(payload);
  });

  it("L. exports through @workspace/mapazapp-core index", () => {
    expect(typeof mapazappCoreIndex.evaluateActionGate).toBe("function");
    expect(typeof mapazappCoreIndex.createActionGateDefinitionList).toBe("function");
    expect(typeof mapazappCoreIndex.assertActionGateDecisionSafety).toBe("function");
  });
});

function createDefaultActionSafetyLike(): MapazappActionGateDecision["safety"] {
  return {
    executionEnabled: false,
    sendToMt5Enabled: false,
    canAutoExecute: false,
    autoApprovalEnabled: false,
    registryMutationAllowed: false,
    manualReviewRequired: true,
  };
}

/** Minimal decision shell for definition JSON scan (not evaluated). */
function baseDecisionFromDef(def: MapazappActionGateDefinition): MapazappActionGateDecision {
  return {
    allowed: false,
    status: "not_available",
    actionId: def.actionId,
    callerSource: "launcher",
    actionClass: def.actionClass,
    riskLevel: def.riskLevel,
    message: def.reason,
    safety: createDefaultActionSafetyLike(),
    requirements: {
      launcherRequired: def.requiresLauncher,
      transportGateRequired: def.requiresTransportGate,
      userConfirmationRequired: def.requiresUserConfirmation,
      fileConsentRequired: def.requiresFileConsent,
    },
    generatedAt: "2026-05-10T18:04:01.000Z",
    errors: [],
    warnings: [],
  };
}
