/**
 * D3.1 — Development-only preflight: port/script checks and safe start hints.
 * Does not spawn processes, open browsers, or simulate runtime/bridge status.
 */

import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type PortProbeResult = "available" | "occupied" | "error";

export interface PreflightIo {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export interface PreflightDeps {
  checkPort(port: number): Promise<PortProbeResult>;
  readTextFile(absPath: string): string;
  resolvePaths(): {
    apiServerPackageJson: string;
    dashboardPackageJson: string;
    scriptsPackageJson: string;
  };
}

export const BANNER_LINES = [
  "Mapazapp Dev Preflight",
  "Development helper only.",
  "This is not MapazappLauncher.exe.",
  "This does not start MT5, bridge, watcher, DB, WebSocket, or real trading.",
  "Execution remains disabled.",
] as const;

const USAGE = `mapazapp-dev-preflight (development-only)

Usage:
  pnpm --filter @workspace/scripts mapazapp:dev-preflight [--options]

Options:
  --api-port <n>           Default: 3001
  --dashboard-port <n>    Default: 5173
  --json                  Machine-readable summary on stdout
  --help, -h              Show this message

Exit codes:
  0  Ports available and expected package scripts are present
  1  Port occupied / port probe error / expected script missing
  2  Invalid arguments

Scope:
  Read-only checks only. Does not start API, dashboard, MT5, watchers, DB, or WebSockets.
  Does not open a browser, write log files, or claim launcher/runtime/bridge connectivity.
  Dashboard remains largely mock/in-process; API serves health + mock GET routes only.

This is not MapazappLauncher.exe.
This tool does not start MT5.
No real trading — evidence-only development helper.
`;

export type ParsedPreflightArgv =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | { kind: "run"; apiPort: number; dashboardPort: number; json: boolean };

export function parseDevPreflightArgv(argv: string[]): ParsedPreflightArgv {
  let apiPort: number | undefined;
  let dashboardPort: number | undefined;
  let json = false;

  const takeOptInt = (raw: string | undefined): number | null => {
    if (raw === undefined) {
      return null;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      return null;
    }
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
    json,
  };
}

export async function defaultCheckPort(port: number): Promise<PortProbeResult> {
  const host = "127.0.0.1";
  return await new Promise((resolvePromise) => {
    const server = createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolvePromise("occupied");
        return;
      }
      resolvePromise("error");
    });
    server.listen(port, host, () => {
      server.close(() => {
        resolvePromise("available");
      });
    });
  });
}

function defaultResolvePaths(): {
  apiServerPackageJson: string;
  dashboardPackageJson: string;
  scriptsPackageJson: string;
} {
  const here = dirname(fileURLToPath(import.meta.url));
  const appRoot = join(here, "..", "..");
  return {
    apiServerPackageJson: join(appRoot, "artifacts", "api-server", "package.json"),
    dashboardPackageJson: join(appRoot, "artifacts", "mapazapp", "package.json"),
    scriptsPackageJson: join(here, "..", "package.json"),
  };
}

function defaultDeps(): PreflightDeps {
  return {
    checkPort: defaultCheckPort,
    readTextFile: (p) => readFileSync(p, "utf8"),
    resolvePaths: defaultResolvePaths,
  };
}

export interface ScriptPresence {
  apiServer: boolean;
  dashboard: boolean;
  scriptsPkg: boolean;
}

export function evaluateExpectedScripts(
  apiPkgText: string,
  dashboardPkgText: string,
  scriptsPkgText: string,
): ScriptPresence {
  const readScripts = (text: string): Record<string, string> | undefined => {
    try {
      const parsed = JSON.parse(text) as { scripts?: Record<string, string> };
      return parsed.scripts;
    } catch {
      return undefined;
    }
  };

  const api = readScripts(apiPkgText);
  const dash = readScripts(dashboardPkgText);
  const scr = readScripts(scriptsPkgText);

  const apiOk = Boolean(
    api?.build && api.start && api.dev,
  );
  const dashOk = Boolean(dash?.dev && dash.build && dash.serve);
  const scriptsOk = Boolean(
    scr?.["mapazapp:import-validate"] && scr?.["mapazapp:dev-preflight"],
  );

  return {
    apiServer: apiOk,
    dashboard: dashOk,
    scriptsPkg: scriptsOk,
  };
}

export interface PreflightJsonPayload {
  ok: boolean;
  apiPort: number;
  dashboardPort: number;
  ports: {
    api: PortProbeResult;
    dashboard: PortProbeResult;
  };
  scripts: {
    apiServer: boolean;
    dashboard: boolean;
    scripts: boolean;
  };
  executionEnabled: false;
  readOnly: true;
  startsProcesses: false;
  mt5Runtime: false;
  launcher: false;
  warnings: string[];
  errors: string[];
}

export function mergeDeps(partial?: Partial<PreflightDeps>): PreflightDeps {
  const d = defaultDeps();
  return {
    checkPort: partial?.checkPort ?? d.checkPort,
    readTextFile: partial?.readTextFile ?? d.readTextFile,
    resolvePaths: partial?.resolvePaths ?? d.resolvePaths,
  };
}

export async function runMapazappDevPreflightCli(
  argv: string[],
  io: PreflightIo,
  deps?: Partial<PreflightDeps>,
): Promise<number> {
  const merged = mergeDeps(deps);
  const parsed = parseDevPreflightArgv(argv);

  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }

  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite(`Try \`mapazapp:dev-preflight -- --help\`.\n`);
    return 2;
  }

  const { apiPort, dashboardPort, json } = parsed;
  const warnings: string[] = [];
  const errors: string[] = [];

  const paths = merged.resolvePaths();
  let apiPkgText: string;
  let dashPkgText: string;
  let scriptsPkgText: string;
  try {
    apiPkgText = merged.readTextFile(paths.apiServerPackageJson);
    dashPkgText = merged.readTextFile(paths.dashboardPackageJson);
    scriptsPkgText = merged.readTextFile(paths.scriptsPackageJson);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to read workspace package.json files.";
    errors.push(msg);
    const payload: PreflightJsonPayload = {
      ok: false,
      apiPort,
      dashboardPort,
      ports: { api: "error", dashboard: "error" },
      scripts: { apiServer: false, dashboard: false, scripts: false },
      executionEnabled: false,
      readOnly: true,
      startsProcesses: false,
      mt5Runtime: false,
      launcher: false,
      warnings,
      errors,
    };
    if (json) {
      io.stdoutWrite(`${JSON.stringify(payload)}\n`);
    } else {
      for (const line of BANNER_LINES) {
        io.stdoutWrite(`${line}\n`);
      }
      io.stdoutWrite("\n");
      io.stderrWrite(`${msg}\n`);
    }
    return 1;
  }

  const scriptPresence = evaluateExpectedScripts(
    apiPkgText,
    dashPkgText,
    scriptsPkgText,
  );

  if (!scriptPresence.apiServer) {
    errors.push(
      "Missing expected scripts on @workspace/api-server (need dev, build, start).",
    );
  }
  if (!scriptPresence.dashboard) {
    errors.push(
      "Missing expected scripts on @workspace/mapazapp (need dev, build, serve).",
    );
  }
  if (!scriptPresence.scriptsPkg) {
    errors.push(
      "Missing expected scripts on @workspace/scripts (need mapazapp:import-validate and mapazapp:dev-preflight).",
    );
  }

  const apiPortStatus = await merged.checkPort(apiPort);
  const dashPortStatus = await merged.checkPort(dashboardPort);

  if (apiPortStatus === "occupied") {
    errors.push(`API port ${apiPort} is occupied on 127.0.0.1 (cannot bind).`);
  } else if (apiPortStatus === "error") {
    errors.push(`API port ${apiPort} probe failed (unexpected error).`);
  }

  if (dashPortStatus === "occupied") {
    errors.push(
      `Dashboard port ${dashboardPort} is occupied on 127.0.0.1 (cannot bind).`,
    );
  } else if (dashPortStatus === "error") {
    errors.push(`Dashboard port ${dashboardPort} probe failed (unexpected error).`);
  }

  const scriptsOk =
    scriptPresence.apiServer && scriptPresence.dashboard && scriptPresence.scriptsPkg;
  const portsOk =
    apiPortStatus === "available" && dashPortStatus === "available";
  const ok = scriptsOk && portsOk;

  const payload: PreflightJsonPayload = {
    ok,
    apiPort,
    dashboardPort,
    ports: {
      api: apiPortStatus,
      dashboard: dashPortStatus,
    },
    scripts: {
      apiServer: scriptPresence.apiServer,
      dashboard: scriptPresence.dashboard,
      scripts: scriptPresence.scriptsPkg,
    },
    executionEnabled: false,
    readOnly: true,
    startsProcesses: false,
    mt5Runtime: false,
    launcher: false,
    warnings,
    errors,
  };

  if (json) {
    io.stdoutWrite(`${JSON.stringify(payload)}\n`);
    return ok ? 0 : 1;
  }

  for (const line of BANNER_LINES) {
    io.stdoutWrite(`${line}\n`);
  }
  io.stdoutWrite("\n");

  if (apiPortStatus === "available") {
    io.stdoutWrite(`API port available (${apiPort}).\n`);
  } else if (apiPortStatus === "occupied") {
    io.stdoutWrite(`API port occupied (${apiPort}).\n`);
  } else {
    io.stdoutWrite(`API port check failed (${apiPort}).\n`);
  }

  if (dashPortStatus === "available") {
    io.stdoutWrite(`Dashboard port available (${dashboardPort}).\n`);
  } else if (dashPortStatus === "occupied") {
    io.stdoutWrite(`Dashboard port occupied (${dashboardPort}).\n`);
  } else {
    io.stdoutWrite(`Dashboard port check failed (${dashboardPort}).\n`);
  }

  io.stdoutWrite("\n");
  io.stdoutWrite("Expected package scripts:\n");
  io.stdoutWrite(
    `- @workspace/api-server: ${scriptPresence.apiServer ? "ok" : "missing"}\n`,
  );
  io.stdoutWrite(
    `- @workspace/mapazapp: ${scriptPresence.dashboard ? "ok" : "missing"}\n`,
  );
  io.stdoutWrite(
    `- @workspace/scripts: ${scriptPresence.scriptsPkg ? "ok" : "missing"}\n`,
  );

  io.stdoutWrite("\n");
  io.stdoutWrite(
    "Use separate terminals for API and dashboard. This helper does not start child processes.\n",
  );
  io.stdoutWrite(
    "Dashboard today relies on mock/in-process data sources for much of the UI; API serves /api/healthz plus mock GET routes only.\n",
  );
  io.stdoutWrite(
    "There is no MT5 runtime integration here, no live bridge status, and no claim of connectivity.\n",
  );

  io.stdoutWrite("\nRecommended commands (PowerShell, from APP/):\n\n");
  io.stdoutWrite(
    `$env:PORT="${apiPort}"; pnpm --filter @workspace/api-server build; pnpm --filter @workspace/api-server start\n\n`,
  );
  io.stdoutWrite(
    `pnpm --filter @workspace/mapazapp dev -- --port ${dashboardPort}\n`,
  );

  io.stdoutWrite("\nRecommended commands (Bash / Git Bash, from APP/):\n\n");
  io.stdoutWrite(
    `PORT=${apiPort} pnpm --filter @workspace/api-server build && PORT=${apiPort} pnpm --filter @workspace/api-server start\n\n`,
  );
  io.stdoutWrite(
    `pnpm --filter @workspace/mapazapp dev -- --port ${dashboardPort}\n`,
  );

  io.stdoutWrite("\nExpected URLs (after services are started manually):\n");
  io.stdoutWrite(`- API health: http://127.0.0.1:${apiPort}/api/healthz\n`);
  io.stdoutWrite(`- Dashboard: http://127.0.0.1:${dashboardPort}/\n`);

  if (errors.length > 0) {
    io.stdoutWrite("\nIssues:\n");
    for (const e of errors) {
      io.stdoutWrite(`- ${e}\n`);
    }
  }

  return ok ? 0 : 1;
}

function defaultIo(): PreflightIo {
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
  runMapazappDevPreflightCli(process.argv.slice(2), defaultIo()).then((code) => {
    process.exit(code);
  });
}
