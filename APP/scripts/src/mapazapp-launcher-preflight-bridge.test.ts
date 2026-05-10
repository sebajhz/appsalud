/**
 * D8.3 — Launcher preflight bridge tests (no subprocesses).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assertActionResultSafety } from "@workspace/mapazapp-core";
import type { PreflightDeps } from "./mapazapp-dev-preflight";
import { deriveLauncherRuntimeStatus } from "./mapazapp-launcher-model";
import { runLauncherValidateEnvironmentPreflight } from "./mapazapp-launcher-preflight-bridge";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIDGE_SOURCE = readFileSync(
  join(__dirname, "mapazapp-launcher-preflight-bridge.ts"),
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

function depsApiPortOccupied(): PreflightDeps {
  const inner = depsHappy();
  return {
    ...inner,
    checkPort: async (port: number) => (port === 3001 ? "occupied" : "available"),
  };
}

test("A. happy path — ActionResult ok, model ports updated, runtime conservative", async () => {
  const iso = "2026-05-10T14:00:00.000Z";
  const { model, actionResult } = await runLauncherValidateEnvironmentPreflight({
    generatedAt: iso,
    preflightDeps: depsHappy(),
  });

  assert.equal(actionResult.ok, true);
  assert.equal(actionResult.actionId, "validate_environment");
  assert.equal(actionResult.source, "launcher");
  assert.equal(assertActionResultSafety(actionResult).ok, true);

  assert.equal(model.preflight?.ok, true);
  assert.equal(model.ports.api, "available");
  assert.equal(model.ports.dashboard, "available");

  const rs = deriveLauncherRuntimeStatus(model);
  assert.equal(rs.api.status, "not_started");
  assert.equal(rs.dashboard.status, "not_started");
  assert.notEqual(rs.overall.status, "ok");
});

test("B. occupied API port — ActionResult error, api slice error", async () => {
  const iso = "2026-05-10T14:01:00.000Z";
  const { model, actionResult } = await runLauncherValidateEnvironmentPreflight({
    generatedAt: iso,
    preflightDeps: depsApiPortOccupied(),
  });

  assert.equal(actionResult.ok, false);
  assert.equal(actionResult.status, "error");
  assert.equal(assertActionResultSafety(actionResult).ok, true);

  assert.equal(model.ports.api, "occupied");
  const rs = deriveLauncherRuntimeStatus(model);
  assert.equal(rs.api.status, "error");
});

test("C. bridge module forbids OS process spawning APIs in source", () => {
  const src = BRIDGE_SOURCE.toLowerCase();
  const ban = ["child_process", "spawn(", "exec(", "taskkill", "powershell", "cmd.exe"];
  for (const b of ban) {
    assert.ok(!src.includes(b.toLowerCase()), `forbidden token ${b}`);
  }
});
