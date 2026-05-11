/**
 * D11.2 — Developer end-to-end dry-run (declarative only).
 * Does not start OS child processes, does not start API/dashboard/MT5, does not fetch URLs.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateExpectedScripts } from "./mapazapp-dev-preflight";
import {
  assertLauncherConfigSafety,
  createDefaultLauncherConfig,
  validateLauncherConfig,
} from "./mapazapp-launcher-config-model";

export const E2E_DRY_RUN_BANNER_LINES = [
  "Mapazapp E2E Dry Run",
  "Planning helper only.",
  "This is not MapazappLauncher.exe.",
  "This does not start API, dashboard, MT5, watchers, DB, WebSocket, or real trading.",
  "No process supervisor; no subprocess orchestration from this helper.",
] as const;

export const E2E_DRY_RUN_PLANNED_STEPS = [
  "workspace_typecheck_and_tests_when_integrating_changes",
  "validate_local_launcher_config_model_declarative_only",
  "verify_expected_workspace_scripts_present_in_package_json_read_only",
  "optional_manual_dev_preflight_for_ports_when_starting_services",
  "manual_separate_terminals_for_api_and_dashboard_if_needed",
  "manual_verify_http_endpoints_documented_elsewhere",
  "maintain_no_post_action_routes_no_mt5_launch_from_mapazapp",
] as const;

const USAGE = `mapazapp-e2e-dry-run (development planning only)

Usage:
  pnpm --filter @workspace/scripts mapazapp:e2e-dry-run [--options]

Options:
  --json                  Machine-readable summary on stdout
  --help, -h              Show this message

Exit codes:
  0  Plan printed and declarative checks succeeded
  1  Unable to read workspace package.json summaries or validation failed
  2  Invalid arguments

Scope:
  Read-only package.json inspection (same layout as dev-preflight).
  Validates the D11.1 local launcher config model defaults only.
  Does not run pnpm build/start, dev-start, port listeners, or open browsers.

This is not MapazappLauncher.exe.
No real trading — evidence-only planning helper.
`;

export type ParsedE2eDryRunArgv = { kind: "help" } | { kind: "error"; message: string } | { kind: "run"; json: boolean };

export function parseE2eDryRunArgv(argv: string[]): ParsedE2eDryRunArgv {
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { kind: "help" };
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a.startsWith("-")) {
      return { kind: "error", message: `Unknown argument: ${a}` };
    }
    return { kind: "error", message: `Unexpected argument: ${a}` };
  }
  return { kind: "run", json };
}

export interface E2eDryRunIo {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export interface E2eDryRunDeps {
  readTextFile(absPath: string): string;
  resolvePaths(): {
    apiServerPackageJson: string;
    dashboardPackageJson: string;
    scriptsPackageJson: string;
  };
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

function defaultDeps(): E2eDryRunDeps {
  return {
    readTextFile: (p) => readFileSync(p, "utf8"),
    resolvePaths: defaultResolvePaths,
  };
}

export interface E2eDryRunJsonPayload {
  kind: "mapazapp_e2e_dry_run";
  steps: readonly string[];
  launcherConfig: {
    ok: boolean;
    status: string;
    safeSummary: string[];
  };
  scripts: {
    apiServer: boolean;
    dashboard: boolean;
    scripts: boolean;
  };
  disclaimers: readonly string[];
  executionEnabled: false;
  startsProcesses: false;
  mt5Runtime: false;
  launcherExecutable: false;
}

export function mergeE2eDryRunDeps(partial?: Partial<E2eDryRunDeps>): E2eDryRunDeps {
  const d = defaultDeps();
  return {
    readTextFile: partial?.readTextFile ?? d.readTextFile,
    resolvePaths: partial?.resolvePaths ?? d.resolvePaths,
  };
}

export function buildE2eDryRunPayload(deps: E2eDryRunDeps): { ok: true; payload: E2eDryRunJsonPayload } | { ok: false; errors: string[] } {
  const paths = deps.resolvePaths();
  let apiText: string;
  let dashText: string;
  let scriptsText: string;
  try {
    apiText = deps.readTextFile(paths.apiServerPackageJson);
    dashText = deps.readTextFile(paths.dashboardPackageJson);
    scriptsText = deps.readTextFile(paths.scriptsPackageJson);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to read workspace package.json files.";
    return { ok: false, errors: [msg] };
  }

  const scripts = evaluateExpectedScripts(apiText, dashText, scriptsText);
  if (!scripts.apiServer || !scripts.dashboard || !scripts.scriptsPkg) {
    return { ok: false, errors: ["expected_workspace_scripts_missing_in_package_json"] };
  }

  const cfg = createDefaultLauncherConfig();
  const validation = validateLauncherConfig(cfg);
  const safety = assertLauncherConfigSafety(validation);
  if (!validation.ok || !safety.ok) {
    const errs = [
      ...validation.errors,
      ...(safety.ok ? [] : safety.errors),
    ];
    return { ok: false, errors: errs.length > 0 ? errs : ["launcher_config_validation_failed"] };
  }

  const payload: E2eDryRunJsonPayload = {
    kind: "mapazapp_e2e_dry_run",
    steps: E2E_DRY_RUN_PLANNED_STEPS,
    launcherConfig: {
      ok: validation.ok,
      status: validation.status,
      safeSummary: validation.safeSummary,
    },
    scripts: {
      apiServer: scripts.apiServer,
      dashboard: scripts.dashboard,
      scripts: scripts.scriptsPkg,
    },
    disclaimers: [
      "declarative_plan_only",
      "no_live_connectivity_claim",
      "no_automatic_service_start",
    ],
    executionEnabled: false,
    startsProcesses: false,
    mt5Runtime: false,
    launcherExecutable: false,
  };

  return { ok: true, payload };
}

export function runMapazappE2eDryRunCli(
  argv: string[],
  io: E2eDryRunIo,
  partialDeps?: Partial<E2eDryRunDeps>,
): number {
  const deps = mergeE2eDryRunDeps(partialDeps);
  const parsed = parseE2eDryRunArgv(argv);

  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite("Try `mapazapp:e2e-dry-run -- --help`.\n");
    return 2;
  }

  for (const line of E2E_DRY_RUN_BANNER_LINES) {
    io.stdoutWrite(`${line}\n`);
  }
  io.stdoutWrite("\n");

  const built = buildE2eDryRunPayload(deps);
  if (!built.ok) {
    for (const e of built.errors) {
      io.stderrWrite(`${e}\n`);
    }
    return 1;
  }

  const { payload } = built;

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(payload)}\n`);
    return 0;
  }

  io.stdoutWrite("Planned steps (declarative; not executed here):\n");
  for (const s of payload.steps) {
    io.stdoutWrite(`- ${s}\n`);
  }
  io.stdoutWrite("\n");
  io.stdoutWrite("Local launcher config model (defaults):\n");
  io.stdoutWrite(`- validation_ok=${String(payload.launcherConfig.ok)} status=${payload.launcherConfig.status}\n`);
  io.stdoutWrite(`- safe_summary_tokens=${payload.launcherConfig.safeSummary.join(",")}\n`);
  io.stdoutWrite("\n");
  io.stdoutWrite("Workspace script presence (read-only):\n");
  io.stdoutWrite(`- api-server scripts: ${payload.scripts.apiServer ? "ok" : "missing"}\n`);
  io.stdoutWrite(`- mapazapp scripts: ${payload.scripts.dashboard ? "ok" : "missing"}\n`);
  io.stdoutWrite(`- scripts package mapazapp scripts: ${payload.scripts.scripts ? "ok" : "missing"}\n`);
  io.stdoutWrite("\n");
  io.stdoutWrite("Disclaimers:\n");
  for (const d of payload.disclaimers) {
    io.stdoutWrite(`- ${d}\n`);
  }
  io.stdoutWrite(
    "\nNext manual phase (not automated here): start services only when you intentionally run the documented pnpm commands.\n",
  );

  return 0;
}

function defaultIo(): E2eDryRunIo {
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
  const code = runMapazappE2eDryRunCli(process.argv.slice(2), defaultIo());
  process.exit(code);
}
