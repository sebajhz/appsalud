/**
 * D3.2 — Dev start CLI tests (no real child processes).
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import test from "node:test";
import type { ChildProcess } from "node:child_process";
import {
  DEV_START_BANNER_LINES,
  parseDevStartArgv,
  pipeLinesPrefixed,
  runMapazappDevStartCli,
  waitChildExit,
  type DevStartDeps,
  type DevStartIo,
} from "./mapazapp-dev-start";
import type { PreflightJsonPayload } from "./mapazapp-dev-preflight";

function captureIo(): DevStartIo & { getOut: () => string; getErr: () => string } {
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

function mockChild(opts?: {
  exitAfterSpawn?: { code: number | null; signal: NodeJS.Signals | null };
}): ChildProcess {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  stdout.end();
  stderr.end();
  const ee = new EventEmitter();
  const proc = ee as unknown as ChildProcess & { killed: boolean };
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.stdin = null;
  proc.pid = 424200 + Math.floor(Math.random() * 1000);
  proc.killed = false;
  proc.kill = ((sig?: NodeJS.Signals) => {
    if (proc.killed) return true;
    proc.killed = true;
    ee.emit("exit", null, sig ?? "SIGTERM");
    return true;
  }) as ChildProcess["kill"];

  if (opts?.exitAfterSpawn) {
    const { code, signal } = opts.exitAfterSpawn;
    queueMicrotask(() => {
      ee.emit("exit", code, signal);
    });
  }

  return proc;
}

test("A. --help exits 0, usage, not launcher, no MT5, no real trading scope", async () => {
  const io = captureIo();
  const code = await runMapazappDevStartCli(["--help"], io);
  assert.equal(code, 0);
  const o = io.getOut();
  assert.match(o, /usage/i);
  assert.match(o, /not MapazappLauncher/i);
  assert.match(o, /does not start MT5/i);
  assert.match(o, /no real trading/i);
});

test("B. defaults — apiPort 3001, dashboardPort 5173, skipBuild false", () => {
  const p = parseDevStartArgv([]);
  assert.equal(p.kind, "run");
  if (p.kind === "run") {
    assert.equal(p.apiPort, 3001);
    assert.equal(p.dashboardPort, 5173);
    assert.equal(p.skipBuild, false);
    assert.equal(p.json, false);
  }
});

test("C. invalid ports — exit 2", async () => {
  const io = captureIo();
  assert.equal(
    await runMapazappDevStartCli(["--api-port", "abc"], io),
    2,
  );
  assert.match(io.getErr(), /invalid/i);

  const io2 = captureIo();
  assert.equal(
    await runMapazappDevStartCli(["--dashboard-port", "nope"], io2),
    2,
  );
  assert.match(io2.getErr(), /invalid/i);
});

test("D. preflight failure — no spawn, exit 1", async () => {
  const io = captureIo();
  const badPayload: PreflightJsonPayload = {
    ok: false,
    apiPort: 3001,
    dashboardPort: 5173,
    ports: { api: "occupied", dashboard: "available" },
    scripts: { apiServer: true, dashboard: true, scripts: true },
    executionEnabled: false,
    readOnly: true,
    startsProcesses: false,
    mt5Runtime: false,
    launcher: false,
    warnings: [],
    errors: ["API port 3001 is occupied on 127.0.0.1 (cannot bind)."],
  };

  const spawns: string[][] = [];
  const deps: Partial<DevStartDeps> = {
    performPreflight: async () => ({ ok: false, payload: badPayload }),
    spawnPnpm: (args) => {
      spawns.push(args);
      return mockChild();
    },
    onSignal: () => {
      /* noop */
    },
    offSignal: () => {
      /* noop */
    },
    appRoot: "APP",
  };

  const code = await runMapazappDevStartCli([], io, deps);
  assert.equal(code, 1);
  assert.equal(spawns.length, 0);
  assert.match(io.getErr(), /Preflight failed/i);
});

test("E. build failure — no API/dashboard spawn, exit 1", async () => {
  const io = captureIo();
  const okPayload: PreflightJsonPayload = {
    ok: true,
    apiPort: 3001,
    dashboardPort: 5173,
    ports: { api: "available", dashboard: "available" },
    scripts: { apiServer: true, dashboard: true, scripts: true },
    executionEnabled: false,
    readOnly: true,
    startsProcesses: false,
    mt5Runtime: false,
    launcher: false,
    warnings: [],
    errors: [],
  };

  const spawns: string[][] = [];
  const deps: Partial<DevStartDeps> = {
    performPreflight: async () => ({ ok: true, payload: okPayload }),
    spawnPnpm: (args) => {
      spawns.push([...args]);
      if (args.includes("build")) {
        return mockChild({ exitAfterSpawn: { code: 1, signal: null } });
      }
      return mockChild();
    },
    onSignal: () => {
      /* noop */
    },
    offSignal: () => {
      /* noop */
    },
    appRoot: "APP",
  };

  const code = await runMapazappDevStartCli([], io, deps);
  assert.equal(code, 1);
  assert.equal(spawns.length, 1);
  assert.ok(spawns[0].includes("build"));
  assert.match(io.getErr(), /build failed/i);
});

test("F. happy path spawn order — build, api start, dashboard dev", async () => {
  const io = captureIo();
  const okPayload: PreflightJsonPayload = {
    ok: true,
    apiPort: 3001,
    dashboardPort: 5173,
    ports: { api: "available", dashboard: "available" },
    scripts: { apiServer: true, dashboard: true, scripts: true },
    executionEnabled: false,
    readOnly: true,
    startsProcesses: false,
    mt5Runtime: false,
    launcher: false,
    warnings: [],
    errors: [],
  };

  const spawns: string[][] = [];
  let sigHandler: (() => void) | undefined;

  const deps: Partial<DevStartDeps> = {
    performPreflight: async () => ({ ok: true, payload: okPayload }),
    spawnPnpm: (args, env) => {
      spawns.push([...args]);
      if (args.includes("build")) {
        return mockChild({ exitAfterSpawn: { code: 0, signal: null } });
      }
      if (args.includes("start")) {
        assert.equal(env.PORT, "3001");
        assert.equal(env.NODE_ENV, "development");
      }
      if (args.includes("dev")) {
        const i = args.indexOf("--port");
        assert.ok(i >= 0);
        assert.equal(args[i + 1], "5173");
      }
      return mockChild();
    },
    onSignal: (h) => {
      sigHandler = h;
    },
    offSignal: () => {
      sigHandler = undefined;
    },
    appRoot: "APP",
  };

  const p = runMapazappDevStartCli([], io, deps);
  await new Promise<void>((resolveImmediate) => setImmediate(resolveImmediate));
  sigHandler?.();

  const code = await p;
  assert.equal(code, 0);
  assert.equal(spawns.length, 3);
  assert.ok(spawns[0].includes("build"));
  assert.ok(spawns[1].includes("start"));
  assert.ok(spawns[2].includes("dev"));
});

test("G. --skip-build skips build; starts API + dashboard", async () => {
  const io = captureIo();
  const okPayload: PreflightJsonPayload = {
    ok: true,
    apiPort: 3001,
    dashboardPort: 5173,
    ports: { api: "available", dashboard: "available" },
    scripts: { apiServer: true, dashboard: true, scripts: true },
    executionEnabled: false,
    readOnly: true,
    startsProcesses: false,
    mt5Runtime: false,
    launcher: false,
    warnings: [],
    errors: [],
  };

  const spawns: string[][] = [];
  let sigHandler: (() => void) | undefined;

  const deps: Partial<DevStartDeps> = {
    performPreflight: async () => ({ ok: true, payload: okPayload }),
    spawnPnpm: (args) => {
      spawns.push([...args]);
      return mockChild();
    },
    onSignal: (h) => {
      sigHandler = h;
    },
    offSignal: () => {
      sigHandler = undefined;
    },
    appRoot: "APP",
  };

  const p = runMapazappDevStartCli(["--skip-build"], io, deps);
  await new Promise<void>((resolveImmediate) => setImmediate(resolveImmediate));
  sigHandler?.();

  const code = await p;
  assert.equal(code, 0);
  assert.equal(spawns.length, 2);
  assert.ok(!spawns.some((a) => a.includes("build")));
});

test("H. shutdown kills only spawned children", async () => {
  const io = captureIo();
  const okPayload: PreflightJsonPayload = {
    ok: true,
    apiPort: 3001,
    dashboardPort: 5173,
    ports: { api: "available", dashboard: "available" },
    scripts: { apiServer: true, dashboard: true, scripts: true },
    executionEnabled: false,
    readOnly: true,
    startsProcesses: false,
    mt5Runtime: false,
    launcher: false,
    warnings: [],
    errors: [],
  };

  const killed: boolean[] = [];
  let sigHandler: (() => void) | undefined;

  const deps: Partial<DevStartDeps> = {
    performPreflight: async () => ({ ok: true, payload: okPayload }),
    spawnPnpm: (args) => {
      if (args.includes("build")) {
        return mockChild({ exitAfterSpawn: { code: 0, signal: null } });
      }
      const ch = mockChild();
      const origKill = ch.kill.bind(ch);
      ch.kill = ((sig?: NodeJS.Signals) => {
        killed.push(true);
        return origKill(sig);
      }) as ChildProcess["kill"];
      return ch;
    },
    onSignal: (h) => {
      sigHandler = h;
    },
    offSignal: () => {
      sigHandler = undefined;
    },
    appRoot: "APP",
  };

  const p = runMapazappDevStartCli([], io, deps);
  await new Promise<void>((resolveImmediate) => setImmediate(resolveImmediate));
  sigHandler?.();

  await p;
  assert.ok(killed.length >= 2);
  assert.match(io.getOut(), /Shutting down Mapazapp dev processes/);
});

test("I. safety copy — banned phrases absent from banner/help", async () => {
  const io = captureIo();
  await runMapazappDevStartCli(["--help"], io);
  const o = io.getOut();
  assert.doesNotMatch(o, /ready to trade/i);
  assert.doesNotMatch(o, /MT5 connected/i);
  assert.doesNotMatch(o, /bridge connected/i);
  assert.doesNotMatch(o, /live trading/i);
  assert.doesNotMatch(o, /execute order/i);
  assert.doesNotMatch(o, /send order/i);
  assert.ok(DEV_START_BANNER_LINES.join("\n").includes("does not start MT5"));
});

test("pipeLinesPrefixed emits prefixed lines", async () => {
  let received = "";
  const pt = new PassThrough();
  pipeLinesPrefixed("[x]", pt, (s) => {
    received += s;
  });
  pt.end("a\nb");
  await finished(pt);
  assert.match(received, /\[x\]a\n/);
  assert.match(received, /\[x\]b\n/);
});

test("waitChildExit resolves exit code", async () => {
  const ch = mockChild({ exitAfterSpawn: { code: 3, signal: null } });
  assert.equal(await waitChildExit(ch), 3);
});

test("B (json). initial JSON includes executionEnabled false when --json", async () => {
  const io = captureIo();
  const okPayload: PreflightJsonPayload = {
    ok: true,
    apiPort: 3001,
    dashboardPort: 5173,
    ports: { api: "available", dashboard: "available" },
    scripts: { apiServer: true, dashboard: true, scripts: true },
    executionEnabled: false,
    readOnly: true,
    startsProcesses: false,
    mt5Runtime: false,
    launcher: false,
    warnings: [],
    errors: [],
  };

  let sigHandler: (() => void) | undefined;
  const deps: Partial<DevStartDeps> = {
    performPreflight: async () => ({ ok: true, payload: okPayload }),
    spawnPnpm: (args) => {
      if (args.includes("build")) {
        return mockChild({ exitAfterSpawn: { code: 0, signal: null } });
      }
      return mockChild();
    },
    onSignal: (h) => {
      sigHandler = h;
    },
    offSignal: () => {
      sigHandler = undefined;
    },
    appRoot: "APP",
  };

  const p = runMapazappDevStartCli(["--json", "--skip-build"], io, deps);
  await new Promise<void>((resolveImmediate) => setImmediate(resolveImmediate));
  sigHandler?.();

  await p;
  const firstLine = io.getOut().split("\n").find((l) => l.startsWith("{"));
  assert.ok(firstLine);
  const j = JSON.parse(firstLine!) as Record<string, unknown>;
  assert.equal(j.executionEnabled, false);
  assert.equal(j.startsProcesses, true);
  assert.equal(j.mode, "dev-start");
});
