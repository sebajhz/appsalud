/**
 * D3.1 — Dev preflight CLI tests (no subprocesses).
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  BANNER_LINES,
  evaluateExpectedScripts,
  parseDevPreflightArgv,
  runMapazappDevPreflightCli,
  type PreflightDeps,
  type PreflightIo,
  type PortProbeResult,
} from "./mapazapp-dev-preflight";

function captureIo(): PreflightIo & { getOut: () => string; getErr: () => string } {
  let out = "";
  let err = "";
  return {
    stdoutWrite: (s: string) => {
      out += s;
    },
    stderrWrite: (s: string) => {
      err += s;
    },
    getOut: () => out,
    getErr: () => err,
  };
}

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

function depsAlwaysAvailable(): PreflightDeps {
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

test("A. --help exits 0, usage, not launcher, no MT5, no real trading scope", async () => {
  const io = captureIo();
  const code = await runMapazappDevPreflightCli(["--help"], io);
  assert.equal(code, 0);
  const o = io.getOut();
  assert.match(o, /usage/i);
  assert.match(o, /not MapazappLauncher/i);
  assert.match(o, /does not start MT5/i);
  assert.match(o, /no real trading/i);
});

test("B. defaults — apiPort 3001, dashboardPort 5173, execution disabled, no child processes", () => {
  const p = parseDevPreflightArgv([]);
  assert.equal(p.kind, "run");
  if (p.kind === "run") {
    assert.equal(p.apiPort, 3001);
    assert.equal(p.dashboardPort, 5173);
    assert.equal(p.json, false);
  }
  assert.ok(BANNER_LINES.join("\n").includes("Execution remains disabled."));
});

test("C. --json parseable, safety flags, no executionEnabled true", async () => {
  const io = captureIo();
  const code = await runMapazappDevPreflightCli(["--json"], io, depsAlwaysAvailable());
  assert.equal(code, 0);
  const line = io.getOut().trim();
  const j = JSON.parse(line) as Record<string, unknown>;
  assert.equal(j.executionEnabled, false);
  assert.equal(j.readOnly, true);
  assert.equal(j.mt5Runtime, false);
  assert.equal(j.launcher, false);
  assert.equal(j.startsProcesses, false);
  assert.equal(io.getOut().includes('"executionEnabled":true'), false);
});

test("D. ports available — injectable checker, no external processes", async () => {
  const io = captureIo();
  const code = await runMapazappDevPreflightCli([], io, depsAlwaysAvailable());
  assert.equal(code, 0);
  assert.match(io.getOut(), /API port available/);
  assert.match(io.getOut(), /Dashboard port available/);
});

test("E. port occupied — exit 1, clear issue, no kill language", async () => {
  const io = captureIo();
  const checkPort = async (port: number): Promise<PortProbeResult> =>
    port === 3001 ? "occupied" : "available";
  const deps: PreflightDeps = {
    ...depsAlwaysAvailable(),
    checkPort,
  };
  const code = await runMapazappDevPreflightCli([], io, deps);
  assert.equal(code, 1);
  assert.match(io.getOut(), /occupied/);
  assert.equal(io.getOut().toLowerCase().includes("kill"), false);
  assert.equal(io.getOut().toLowerCase().includes("terminate"), false);

  const ioJson = captureIo();
  const codeJson = await runMapazappDevPreflightCli(["--json"], ioJson, deps);
  assert.equal(codeJson, 1);
  const j = JSON.parse(ioJson.getOut()) as { ok: boolean; errors: string[] };
  assert.equal(j.ok, false);
  assert.ok(j.errors.some((e) => /occupied/i.test(e)));
});

test("F. invalid --api-port — exit 2", async () => {
  const io = captureIo();
  const code = await runMapazappDevPreflightCli(["--api-port", "abc"], io, depsAlwaysAvailable());
  assert.equal(code, 2);
  assert.match(io.getErr(), /invalid/i);
});

test("G. expected scripts — detects missing script in mocked package.json", () => {
  const badScripts = JSON.stringify({
    scripts: { "mapazapp:import-validate": "x" },
  });
  const v = evaluateExpectedScripts(minimalApiPkg, minimalDashPkg, badScripts);
  assert.equal(v.scriptsPkg, false);
  assert.equal(v.apiServer, true);
  assert.equal(v.dashboard, true);
});

test("H. recommended commands — PowerShell, Bash, dashboard line", async () => {
  const io = captureIo();
  await runMapazappDevPreflightCli([], io, depsAlwaysAvailable());
  const o = io.getOut();
  assert.match(o, /\$env:PORT=/);
  assert.match(o, /PORT=3001 pnpm --filter @workspace\/api-server build/);
  assert.match(o, /pnpm --filter @workspace\/mapazapp dev -- --port 5173/);
});

test("I. safety copy — forbidden promotional/trading phrases absent", async () => {
  const io = captureIo();
  await runMapazappDevPreflightCli([], io, depsAlwaysAvailable());
  const o = io.getOut();
  assert.doesNotMatch(o, /ready to trade/i);
  assert.doesNotMatch(o, /live trading/i);
  assert.doesNotMatch(o, /execute order/i);
  assert.doesNotMatch(o, /send order/i);
  assert.doesNotMatch(o, /MT5 connected/i);
  assert.doesNotMatch(o, /bridge connected/i);
});
