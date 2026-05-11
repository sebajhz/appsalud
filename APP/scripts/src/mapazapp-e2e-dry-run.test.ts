import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildE2eDryRunPayload,
  E2E_DRY_RUN_PLANNED_STEPS,
  parseE2eDryRunArgv,
  runMapazappE2eDryRunCli,
} from "./mapazapp-e2e-dry-run";

const minimalWorkspacePackages = {
  api: JSON.stringify({
    scripts: { dev: "x", build: "x", start: "x" },
  }),
  dash: JSON.stringify({
    scripts: { dev: "x", build: "x", serve: "x" },
  }),
  scripts: JSON.stringify({
    scripts: {
      "mapazapp:import-validate": "x",
      "mapazapp:dev-preflight": "x",
      "mapazapp:e2e-dry-run": "x",
    },
  }),
};

test("D11.2 A — --help is safe and exits 0", () => {
  let out = "";
  const code = runMapazappE2eDryRunCli(["--help"], {
    stdoutWrite: (s) => {
      out += s;
    },
    stderrWrite: () => {},
  });
  assert.equal(code, 0);
  assert.ok(out.includes("mapazapp-e2e-dry-run"));
});

test("D11.2 B — default dry-run does not start processes (payload build only)", () => {
  const texts = new Map<string, string>([
    ["a", minimalWorkspacePackages.api],
    ["b", minimalWorkspacePackages.dash],
    ["c", minimalWorkspacePackages.scripts],
  ]);
  const deps = {
    readTextFile: (p: string) => {
      const v = texts.get(p);
      if (!v) throw new Error(p);
      return v;
    },
    resolvePaths: () => ({
      apiServerPackageJson: "a",
      dashboardPackageJson: "b",
      scriptsPackageJson: "c",
    }),
  };

  const built = buildE2eDryRunPayload(deps);
  assert.equal(built.ok, true);
  if (built.ok) {
    assert.equal(built.payload.startsProcesses, false);
    assert.equal(built.payload.mt5Runtime, false);
    assert.equal(built.payload.launcherExecutable, false);
  }
});

test("D11.2 C — human output contains planned steps", () => {
  let out = "";
  const texts = new Map<string, string>([
    ["a", minimalWorkspacePackages.api],
    ["b", minimalWorkspacePackages.dash],
    ["c", minimalWorkspacePackages.scripts],
  ]);
  const merged = {
    readTextFile: (p: string) => {
      const v = texts.get(p);
      if (!v) throw new Error(p);
      return v;
    },
    resolvePaths: () => ({
      apiServerPackageJson: "a",
      dashboardPackageJson: "b",
      scriptsPackageJson: "c",
    }),
  };

  const code = runMapazappE2eDryRunCli([], { stdoutWrite: (s) => { out += s; }, stderrWrite: () => {} }, merged);
  assert.equal(code, 0);
  for (const step of E2E_DRY_RUN_PLANNED_STEPS) {
    assert.ok(out.includes(step), `missing step ${step}`);
  }
});

test("D11.2 D — output avoids forbidden operational phrases", () => {
  let out = "";
  const texts = new Map<string, string>([
    ["a", minimalWorkspacePackages.api],
    ["b", minimalWorkspacePackages.dash],
    ["c", minimalWorkspacePackages.scripts],
  ]);
  const merged = {
    readTextFile: (p: string) => {
      const v = texts.get(p);
      if (!v) throw new Error(p);
      return v;
    },
    resolvePaths: () => ({
      apiServerPackageJson: "a",
      dashboardPackageJson: "b",
      scriptsPackageJson: "c",
    }),
  };
  const code = runMapazappE2eDryRunCli([], { stdoutWrite: (s) => { out += s; }, stderrWrite: () => {} }, merged);
  assert.equal(code, 0);
  const low = out.toLowerCase();
  assert.ok(!low.includes("ready to trade"));
  assert.ok(!low.includes("mt5 connected"));
});

test("D11.2 E — static scan forbids spawn/child_process/fetch/dev-start literal", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "mapazapp-e2e-dry-run.ts"), "utf8");
  assert.ok(!src.includes("spawn"));
  assert.ok(!src.includes("child_process"));
  assert.ok(!src.includes("fetch("));
  assert.ok(!src.includes("mapazapp:dev-start"));
});

test("D11.2 — parse errors for unknown flags", () => {
  const p = parseE2eDryRunArgv(["--nope"]);
  assert.equal(p.kind, "error");
});
