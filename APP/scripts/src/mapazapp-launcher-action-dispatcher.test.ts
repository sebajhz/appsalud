/**
 * D9.3 — Launcher internal action dispatcher tests (no subprocesses).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertActionGateDecisionSafety,
  assertActionResultSafety,
  type MapazappActionId,
  type MapazappActionResult,
} from "@workspace/mapazapp-core";
import type { PreflightDeps } from "./mapazapp-dev-preflight";
import {
  dispatchLauncherAction,
  LAUNCHER_ACTION_DISPATCH_DEFAULT_CALLER,
} from "./mapazapp-launcher-action-dispatcher";
import {
  createDefaultLauncherProcessModel,
  type LauncherProcessModel,
} from "./mapazapp-launcher-model";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SOURCE = readFileSync(
  join(__dirname, "mapazapp-launcher-action-dispatcher.ts"),
  "utf8",
);

const minimalApiPkg = JSON.stringify({
  scripts: { dev: "x", build: "x", start: "x" },
});
const minimalDashPkg = JSON.stringify({
  scripts: { dev: "x", build: "x", serve: "x" },
});
const minimalScriptsPkg = JSON.stringify({
  scripts: {
    "mapazapp:import-validate": "x",
    "mapazapp:dev-preflight": "x",
  },
});

function depsHappy(): PreflightDeps {
  const paths = {
    apiServerPackageJson: "api-server/package.json",
    dashboardPackageJson: "artifacts/mapazapp/package.json",
    scriptsPackageJson: "scripts/package.json",
  };
  return {
    checkPort: async () => "available",
    readTextFile: (p: string) => {
      if (p === paths.apiServerPackageJson) return minimalApiPkg;
      if (p === paths.dashboardPackageJson) return minimalDashPkg;
      if (p === paths.scriptsPackageJson) return minimalScriptsPkg;
      throw new Error(`unexpected path in test mock: ${p}`);
    },
    resolvePaths: () => paths,
  };
}

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
    assert.ok(!low.includes(needle), `unexpected banned token ${token}`);
  }
}

test("A. validate_environment happy path — gate allowed, preflight ok, safe snapshot", async () => {
  const iso = "2026-05-10T20:00:00.000Z";
  const res = await dispatchLauncherAction({
    actionId: "validate_environment",
    callerSource: "launcher",
    nowIso: iso,
    preflightOptions: { preflightDeps: depsHappy(), generatedAt: iso },
  });
  assert.equal(res.gateDecision.allowed, true);
  assert.equal(res.actionResult.ok, true);
  assert.equal(res.actionResult.actionId, "validate_environment");
  assert.ok(res.processModel);
  for (const ch of Object.values(res.processModel!.children)) {
    assert.notEqual(ch.status, "running");
  }
  assert.equal(res.runtimeStatus?.mt5.status, "not_configured");
  assert.equal(res.runtimeStatus?.bridge.status, "not_configured");
  assert.equal(assertActionResultSafety(res.actionResult).ok, true);
  assert.equal(assertActionGateDecisionSafety(res.gateDecision).ok, true);
});

test("B. dashboard caller cannot run validate_environment — no preflight", async () => {
  let calls = 0;
  const iso = "2026-05-10T20:01:00.000Z";
  const res = await dispatchLauncherAction(
    {
      actionId: "validate_environment",
      callerSource: "dashboard",
      nowIso: iso,
      preflightOptions: { preflightDeps: depsHappy() },
    },
    {
      runValidateEnvironmentPreflight: async () => {
        calls += 1;
        throw new Error("preflight must not run for dashboard caller");
      },
    },
  );
  assert.equal(calls, 0);
  assert.equal(res.gateDecision.allowed, false);
  assert.equal(res.actionResult.ok, false);
  assert.equal(assertActionResultSafety(res.actionResult).ok, true);
  assert.equal(res.processModel, null);
});

test("C. process lifecycle actions blocked — no preflight", async () => {
  let calls = 0;
  const deps = {
    runValidateEnvironmentPreflight: async () => {
      calls += 1;
      throw new Error("unexpected");
    },
  };
  for (const id of ["start_mapazapp_dev", "stop_mapazapp"] as const) {
    const res = await dispatchLauncherAction(
      { actionId: id, callerSource: "launcher", nowIso: "2026-05-10T20:02:00.000Z" },
      deps,
    );
    assert.equal(res.actionResult.ok, false);
    assert.equal(calls, 0);
    assert.equal(assertActionResultSafety(res.actionResult).ok, true);
  }
});

test("D. MT5 actions blocked — no MT5 connected copy", async () => {
  for (const id of ["validate_mt5_config", "open_mt5"] as const) {
    const res = await dispatchLauncherAction({
      actionId: id,
      callerSource: "launcher",
      nowIso: "2026-05-10T20:03:00.000Z",
    });
    assert.equal(res.actionResult.ok, false);
    const low = JSON.stringify(res).toLowerCase();
    assert.ok(!low.includes("mt5 connected"));
    assert.equal(assertActionResultSafety(res.actionResult).ok, true);
  }
});

test("E. unknown actionId — controlled outcome, no throw", async () => {
  const bad = "not_a_real_action" as MapazappActionId;
  const res = await dispatchLauncherAction({
    actionId: bad,
    callerSource: "launcher",
    nowIso: "2026-05-10T20:04:00.000Z",
  });
  assert.equal(res.gateDecision.allowed, false);
  assert.equal(res.actionResult.ok, false);
  assert.equal(assertActionResultSafety(res.actionResult).ok, true);
});

test("F. permissive policy still cannot execute non-validate_environment", async () => {
  const permissive = {
    allowReadOnlyStatus: true,
    allowLauncherSidePreflight: true,
    allowFileValidation: true,
    allowProcessLifecycle: true,
    allowLogsOpen: true,
    allowMt5ConfigValidation: true,
    allowMt5Launch: true,
    transportGateEnabled: true,
    launcherAvailable: true,
  };

  const iso = "2026-05-10T20:05:00.000Z";

  const statusRes = await dispatchLauncherAction({
    actionId: "show_runtime_status",
    callerSource: "launcher",
    nowIso: iso,
    policy: permissive,
  });
  assert.equal(statusRes.gateDecision.allowed, true);
  assert.equal(statusRes.actionResult.ok, false);
  assert.equal(statusRes.actionResult.status, "blocked");

  const csvRes = await dispatchLauncherAction({
    actionId: "validate_csv",
    callerSource: "launcher",
    nowIso: iso,
    policy: permissive,
    params: {},
    hasFileConsent: true,
  });
  assert.equal(csvRes.gateDecision.allowed, true);
  assert.equal(csvRes.actionResult.ok, false);

  const logsRes = await dispatchLauncherAction({
    actionId: "open_logs",
    callerSource: "launcher",
    nowIso: iso,
    policy: permissive,
    hasUserConfirmation: true,
  });
  assert.equal(logsRes.actionResult.ok, false);
});

test("G. deterministic output with fixed nowIso and mocks", async () => {
  const iso = "2026-05-10T20:06:00.000Z";
  const opts = { preflightDeps: depsHappy(), generatedAt: iso };
  const a = await dispatchLauncherAction({
    actionId: "validate_environment",
    nowIso: iso,
    preflightOptions: opts,
  });
  const b = await dispatchLauncherAction({
    actionId: "validate_environment",
    nowIso: iso,
    preflightOptions: opts,
  });
  assert.deepEqual(
    { ok: a.actionResult.ok, ports: a.processModel?.ports, pre: a.processModel?.preflight?.ok },
    { ok: b.actionResult.ok, ports: b.processModel?.ports, pre: b.processModel?.preflight?.ok },
  );
});

test("H. safety assertions on default paths", async () => {
  const samples = await Promise.all([
    dispatchLauncherAction({
      actionId: "validate_environment",
      nowIso: "2026-05-10T20:07:00.000Z",
      preflightOptions: { preflightDeps: depsHappy() },
    }),
    dispatchLauncherAction({
      actionId: "open_mt5",
      callerSource: "launcher",
      nowIso: "2026-05-10T20:07:01.000Z",
    }),
  ]);
  for (const s of samples) {
    assert.equal(assertActionResultSafety(s.actionResult).ok, true);
    assert.equal(assertActionGateDecisionSafety(s.gateDecision).ok, true);
  }
});

test("I. static scan — dispatcher source forbids dangerous patterns", () => {
  const src = DISPATCHER_SOURCE.toLowerCase();
  const banned = [
    "child_process",
    "spawn(",
    "exec(",
    "powershell",
    "cmd.exe",
    "taskkill",
    "fetch(",
    "websocket",
    "localstorage",
    "mapazapp:dev-start",
  ];
  for (const b of banned) {
    assert.ok(!src.includes(b.toLowerCase()), `forbidden token ${b}`);
  }
});

test("J. no banned tokens in serialized dispatch samples", async () => {
  const iso = "2026-05-10T20:08:00.000Z";
  const bundle = await Promise.all([
    dispatchLauncherAction({
      actionId: "validate_environment",
      nowIso: iso,
      preflightOptions: { preflightDeps: depsHappy(), generatedAt: iso },
    }),
    dispatchLauncherAction({
      actionId: "show_runtime_status",
      nowIso: iso,
      policy: { allowReadOnlyStatus: true },
    }),
    dispatchLauncherAction({ actionId: "stop_mapazapp", callerSource: "launcher", nowIso: iso }),
  ]);
  assertNoBannedTokens(JSON.stringify(bundle));
});

test("K. default caller is launcher", () => {
  assert.equal(LAUNCHER_ACTION_DISPATCH_DEFAULT_CALLER, "launcher");
});

test("L. deps injection can replace preflight implementation", async () => {
  const iso = "2026-05-10T20:09:00.000Z";
  const fakeModel = createDefaultLauncherProcessModel({ nowIso: iso });
  const fakeResult: MapazappActionResult = {
    ok: true,
    actionId: "validate_environment",
    status: "ok",
    source: "launcher",
    message: "Injected read-only stub.",
    safety: {
      executionEnabled: false,
      sendToMt5Enabled: false,
      canAutoExecute: false,
      autoApprovalEnabled: false,
      registryMutationAllowed: false,
      manualReviewRequired: true,
    },
    logsPreview: [],
    warnings: [],
    errors: [],
    generatedAt: iso,
  };
  const res = await dispatchLauncherAction(
    { actionId: "validate_environment", nowIso: iso },
    {
      runValidateEnvironmentPreflight: async (): Promise<{
        model: LauncherProcessModel;
        actionResult: MapazappActionResult;
      }> => ({ model: fakeModel, actionResult: fakeResult }),
    },
  );
  assert.strictEqual(res.processModel, fakeModel);
  assert.strictEqual(res.actionResult.message, "Injected read-only stub.");
});
