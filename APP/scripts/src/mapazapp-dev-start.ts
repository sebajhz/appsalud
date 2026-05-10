/**
 * D3.2 — Development-only coordinated API + dashboard start (not a launcher).
 * Runs D3.1 preflight, optional API build, then spawns API and dashboard child processes.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performDevPreflight } from "./mapazapp-dev-preflight";

export const DEV_START_BANNER_LINES = [
  "Mapazapp Dev Start",
  "Development helper only.",
  "This is not MapazappLauncher.exe.",
  "This does not start MT5, bridge, watcher, DB, WebSocket, or real trading.",
  "Execution remains disabled.",
] as const;

const USAGE = `mapazapp-dev-start (development-only)

Usage:
  pnpm --filter @workspace/scripts mapazapp:dev-start [--options]

Options:
  --api-port <n>           Default: 3001
  --dashboard-port <n>    Default: 5173
  --skip-build            Skip pnpm --filter @workspace/api-server build
  --json                  Print one initial status JSON line, then prefixed logs
  --help, -h              Show this message

Exit codes:
  0  Stopped after a normal interrupt (Ctrl+C / SIGTERM) once services were running
  1  Preflight failed, build/start failed, or a child exited unexpectedly
  2  Invalid arguments

This is not MapazappLauncher.exe.
Does not start MT5.
Does not open a browser, write log files, or enable real trading.
No real trading — evidence-only development helper.
`;

export type ParsedDevStartArgv =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      apiPort: number;
      dashboardPort: number;
      skipBuild: boolean;
      json: boolean;
    };

export function parseDevStartArgv(argv: string[]): ParsedDevStartArgv {
  let apiPort: number | undefined;
  let dashboardPort: number | undefined;
  let skipBuild = false;
  let json = false;

  const takeOptInt = (raw: string | undefined): number | null => {
    if (raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 65535) return null;
    return n;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      return { kind: "help" };
    }
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--skip-build") {
      skipBuild = true;
      continue;
    }
    if (a === "--api-port") {
      const v = takeOptInt(argv[i + 1]);
      if (v === null) {
        return {
          kind: "error",
          message: `Invalid or missing value for --api-port (expect integer 1-65535).`,
        };
      }
      apiPort = v;
      i++;
      continue;
    }
    if (a === "--dashboard-port") {
      const v = takeOptInt(argv[i + 1]);
      if (v === null) {
        return {
          kind: "error",
          message: `Invalid or missing value for --dashboard-port (expect integer 1-65535).`,
        };
      }
      dashboardPort = v;
      i++;
      continue;
    }
    if (a.startsWith("-")) {
      return { kind: "error", message: `Unknown argument: ${a}` };
    }
    return { kind: "error", message: `Unexpected argument: ${a}` };
  }

  return {
    kind: "run",
    apiPort: apiPort ?? 3001,
    dashboardPort: dashboardPort ?? 5173,
    skipBuild,
    json,
  };
}

export interface DevStartIo {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export interface DevStartDeps {
  appRoot: string;
  performPreflight: typeof performDevPreflight;
  spawnPnpm: (
    args: string[],
    env: NodeJS.ProcessEnv,
    stdio: "pipe" | "inherit",
  ) => ChildProcess;
  onSignal: (handler: () => void) => void;
  offSignal: (handler: () => void) => void;
}

function defaultAppRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..");
}

function defaultSpawnPnpm(appRoot: string) {
  return function spawnPnpm(
    args: string[],
    env: NodeJS.ProcessEnv,
    stdio: "pipe" | "inherit",
  ): ChildProcess {
    const cmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    return spawn(cmd, args, {
      cwd: appRoot,
      env,
      stdio: stdio === "pipe" ? ["inherit", "pipe", "pipe"] : "inherit",
      windowsHide: true,
    });
  };
}

export function mergeDevStartDeps(partial?: Partial<DevStartDeps>): DevStartDeps {
  const appRoot = partial?.appRoot ?? defaultAppRoot();
  return {
    appRoot,
    performPreflight: partial?.performPreflight ?? performDevPreflight,
    spawnPnpm: partial?.spawnPnpm ?? defaultSpawnPnpm(appRoot),
    onSignal:
      partial?.onSignal ??
      ((h: () => void) => {
        process.on("SIGINT", h);
        process.on("SIGTERM", h);
      }),
    offSignal:
      partial?.offSignal ??
      ((h: () => void) => {
        process.off("SIGINT", h);
        process.off("SIGTERM", h);
      }),
  };
}

export function pipeLinesPrefixed(
  prefix: string,
  stream: NodeJS.ReadableStream | null,
  write: (s: string) => void,
): void {
  if (!stream) return;
  let buffer = "";
  stream.on("data", (chunk: Buffer | string) => {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      write(`${prefix}${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buffer.length > 0) {
      write(`${prefix}${buffer}\n`);
    }
  });
}

export function waitChildExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === null && signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

export async function runMapazappDevStartCli(
  argv: string[],
  io: DevStartIo,
  partialDeps?: Partial<DevStartDeps>,
): Promise<number> {
  const deps = mergeDevStartDeps(partialDeps);
  const parsed = parseDevStartArgv(argv);

  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }

  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite(`Try \`mapazapp:dev-start -- --help\`.\n`);
    return 2;
  }

  const { apiPort, dashboardPort, skipBuild, json } = parsed;

  for (const line of DEV_START_BANNER_LINES) {
    io.stdoutWrite(`${line}\n`);
  }
  io.stdoutWrite("\n");

  const { ok, payload } = await deps.performPreflight(apiPort, dashboardPort);
  if (!ok) {
    io.stderrWrite("Preflight failed; not starting processes.\n");
    for (const e of payload.errors) {
      io.stderrWrite(`  - ${e}\n`);
    }
    return 1;
  }

  if (json) {
    io.stdoutWrite(
      `${JSON.stringify({
        ok: true,
        mode: "dev-start",
        startsProcesses: true,
        apiPort,
        dashboardPort,
        executionEnabled: false,
        mt5Runtime: false,
        launcher: false,
      })}\n`,
    );
  }

  if (!skipBuild) {
    io.stdoutWrite("Running API build (pnpm --filter @workspace/api-server build)…\n");
    const buildProc = deps.spawnPnpm(
      ["--filter", "@workspace/api-server", "build"],
      { ...process.env },
      "pipe",
    );
    pipeLinesPrefixed("[api-build]", buildProc.stdout, io.stdoutWrite);
    pipeLinesPrefixed("[api-build]", buildProc.stderr, io.stderrWrite);
    let buildCode: number;
    try {
      buildCode = await waitChildExit(buildProc);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      io.stderrWrite(`API build failed to spawn: ${msg}\n`);
      return 1;
    }
    if (buildCode !== 0) {
      io.stderrWrite(`API build failed with exit code ${buildCode}.\n`);
      return 1;
    }
    io.stdoutWrite("API build finished.\n\n");
  }

  const children: ChildProcess[] = [];
  let shuttingDown = false;

  const shutdownChildren = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    io.stdoutWrite("Shutting down Mapazapp dev processes…\n");
    for (const c of children) {
      try {
        if (!c.killed && c.pid) {
          c.kill("SIGTERM");
        }
      } catch {
        /* ignore */
      }
    }
  };

  let resolveSettled!: (code: number) => void;
  const settled = new Promise<number>((resolvePromise) => {
    resolveSettled = resolvePromise;
  });

  const signalHandler = () => {
    if (shuttingDown) return;
    deps.offSignal(signalHandler);
    shutdownChildren();
    resolveSettled(0);
  };

  deps.onSignal(signalHandler);

  const bail = (code: number) => {
    if (shuttingDown) return;
    deps.offSignal(signalHandler);
    shutdownChildren();
    resolveSettled(code);
  };

  const apiEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(apiPort),
    NODE_ENV: "development",
  };

  const apiProc = deps.spawnPnpm(
    ["--filter", "@workspace/api-server", "start"],
    apiEnv,
    "pipe",
  );

  children.push(apiProc);
  pipeLinesPrefixed("[api]", apiProc.stdout, io.stdoutWrite);
  pipeLinesPrefixed("[api]", apiProc.stderr, io.stderrWrite);

  apiProc.once("error", (err) => {
    if (shuttingDown) return;
    io.stderrWrite(`[api] process error: ${err.message}\n`);
    bail(1);
  });

  apiProc.once("exit", (code, signal) => {
    if (shuttingDown) return;
    io.stderrWrite(
      `[api] exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"})\n`,
    );
    bail(1);
  });

  const dashProc = deps.spawnPnpm(
    [
      "--filter",
      "@workspace/mapazapp",
      "dev",
      "--",
      "--port",
      String(dashboardPort),
    ],
    { ...process.env },
    "pipe",
  );

  children.push(dashProc);
  pipeLinesPrefixed("[dashboard]", dashProc.stdout, io.stdoutWrite);
  pipeLinesPrefixed("[dashboard]", dashProc.stderr, io.stderrWrite);

  dashProc.once("error", (err) => {
    if (shuttingDown) return;
    io.stderrWrite(`[dashboard] process error: ${err.message}\n`);
    bail(1);
  });

  dashProc.once("exit", (code, signal) => {
    if (shuttingDown) return;
    io.stderrWrite(
      `[dashboard] exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"})\n`,
    );
    bail(1);
  });

  io.stdoutWrite("\n");
  io.stdoutWrite("URLs:\n");
  io.stdoutWrite(`  API:       http://127.0.0.1:${apiPort}/api/healthz\n`);
  io.stdoutWrite(`  Dashboard: http://127.0.0.1:${dashboardPort}/\n`);
  io.stdoutWrite("\n");
  io.stdoutWrite(
    "Notes: dashboard may still use mock/in-process sources for much of the UI; API exposes mock/read-only GET routes. MT5 and live bridge status are not implemented here.\n",
  );
  io.stdoutWrite("\nPress Ctrl+C to stop (only child processes started by this script).\n");

  return await settled;
}

function defaultIo(): DevStartIo {
  return {
    stdoutWrite: (s) => {
      process.stdout.write(s);
    },
    stderrWrite: (s) => {
      process.stderr.write(s);
    },
  };
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  runMapazappDevStartCli(process.argv.slice(2), defaultIo()).then((code) => {
    process.exit(code);
  });
}
