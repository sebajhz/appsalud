/**
 * D14.7 — Real local launcher wrapper prototype: dry-run by default; optional one-shot
 * API + dashboard run via existing supervisor (D13.5). No MT5, no POST, no packaging.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runApiDashboardSupervisor,
  type ApiDashboardSupervisorOptions,
  type ApiDashboardSupervisorResult,
} from "./mapazapp-api-dashboard-supervisor";
import {
  buildLocalLauncherWrapperDryRunResult,
  type LocalLauncherWrapperDryRunOptions,
  type LocalLauncherWrapperDryRunResult,
} from "./mapazapp-local-launcher-wrapper-dry-run";

export const LOCAL_LAUNCHER_WRAPPER_BANNER_LINES = [
  "Mapazapp local launcher wrapper prototype (D14.7)",
  "Dry-run / safe default — no API or dashboard start unless --confirm-start with --mode run_once.",
  "Delegates real process orchestration to mapazapp-api-dashboard-supervisor (D13.5); not MapazappLauncher.exe.",
] as const;

const USAGE = `mapazapp-local-launcher-wrapper (D14.7 prototype)

Usage:
  pnpm --filter @workspace/scripts mapazapp:launcher-wrapper [--options]

Options:
  --help, -h                  Show this message
  --json                      Single JSON summary line on stdout at end
  --confirm-start             Required to allow a real supervisor run (API + dashboard)
  --mode dry_run|run_once     Default: dry_run (declarative plan only, exit 0, no processes)
  --created-at <iso8601>      Timestamp for the embedded D14.4 dry-run model (default: now)
  --api-host <addr>           Must be 127.0.0.1 (default: 127.0.0.1)
  --api-port <n>              Default: 3001
  --dashboard-host <addr>     Must be 127.0.0.1 (default: 127.0.0.1)
  --dashboard-port <n>        Default: 5173
  --skip-build                Forwarded to supervisor when running (default: build on)
  --max-wait-ms <n>           Forwarded to supervisor (default: 25000)

Exit codes:
  0  Dry-run OK, or supervised run completed successfully
  1  Blocked run_once without confirm, dry-run validation failure, or supervisor failure
  2  Invalid arguments or conflicting flags

Constraints:
  Default is dry-run only — no child processes from this entrypoint without explicit confirmation.
  Real runs reuse runApiDashboardSupervisor only — no duplicate spawn surface here.
  No MT5, watcher, command files, POST/action routes, packaging, or filesystem layout writes.
`;

export type LocalLauncherWrapperCliMode = "dry_run" | "run_once";

export type ParsedLocalLauncherWrapperArgv =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | { kind: "run"; options: LocalLauncherWrapperParsedRun };

export interface LocalLauncherWrapperParsedRun {
  json: boolean;
  /** Effective posture after applying defaults and --confirm-start. */
  effectiveMode: LocalLauncherWrapperCliMode;
  confirmStart: boolean;
  /** True if user passed --mode explicitly. */
  explicitMode: boolean;
  apiHost: string;
  apiPort: number;
  dashboardHost: string;
  dashboardPort: number;
  skipBuild: boolean;
  maxWaitMs: number;
  createdAt: string;
}

export interface LocalLauncherWrapperPlan {
  dryRunOptions: LocalLauncherWrapperDryRunOptions;
  supervisorOptions: ApiDashboardSupervisorOptions | null;
  /** When set, run is blocked before supervisor (exit 1). */
  blockReason: string | null;
  effectiveMode: LocalLauncherWrapperCliMode;
  confirmStart: boolean;
}

export interface LocalLauncherWrapperResult {
  ok: boolean;
  phase: string;
  mode: LocalLauncherWrapperCliMode;
  confirmStart: boolean;
  processStartAttempted: boolean;
  readOnly: boolean;
  executionEnabled: boolean;
  tradingEnabled: boolean;
  mt5LaunchEnabled: boolean;
  commandSummary: string;
  startedAt: string | null;
  stoppedAt: string | null;
  dryRun: LocalLauncherWrapperDryRunResult;
  supervisor: ApiDashboardSupervisorResult | null;
  errors: string[];
  warnings: string[];
}

export interface LocalLauncherWrapperIo {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

export interface LocalLauncherWrapperDeps {
  io: LocalLauncherWrapperIo;
  runDryRunBuild: (o: LocalLauncherWrapperDryRunOptions) => LocalLauncherWrapperDryRunResult;
  runSupervisor: (o: ApiDashboardSupervisorOptions) => Promise<ApiDashboardSupervisorResult>;
  now: () => string;
  argvSummary: (argv: string[]) => string;
}

function mergeDeps(partial?: Partial<LocalLauncherWrapperDeps>): LocalLauncherWrapperDeps {
  return {
    io:
      partial?.io ??
      ({
        stdoutWrite: (s) => {
          process.stdout.write(s);
        },
        stderrWrite: (s) => {
          process.stderr.write(s);
        },
      } satisfies LocalLauncherWrapperIo),
    runDryRunBuild: partial?.runDryRunBuild ?? buildLocalLauncherWrapperDryRunResult,
    runSupervisor: partial?.runSupervisor ?? ((o) => runApiDashboardSupervisor(o)),
    now: partial?.now ?? (() => new Date().toISOString()),
    argvSummary:
      partial?.argvSummary ??
      ((argv) => {
        const safe = argv.filter((a) => !a.includes("=") || a.startsWith("--"));
        return `mapazapp:launcher-wrapper ${safe.join(" ")}`.trim();
      }),
  };
}

function takeOptInt(raw: string | undefined, min: number, max: number): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/**
 * Parses argv after `node …/mapazapp-local-launcher-wrapper.ts` (slice already applied).
 */
export function parseLocalLauncherWrapperArgs(argv: string[]): ParsedLocalLauncherWrapperArgv {
  let json = false;
  let confirmStart = false;
  let modeFlag: LocalLauncherWrapperCliMode | undefined;
  let explicitMode = false;
  let apiHost: string | undefined;
  let apiPort: number | undefined;
  let dashboardHost: string | undefined;
  let dashboardPort: number | undefined;
  let skipBuild = false;
  let maxWaitMs: number | undefined;
  let createdAt: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { kind: "help" };
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--confirm-start") {
      confirmStart = true;
      continue;
    }
    if (a === "--skip-build") {
      skipBuild = true;
      continue;
    }
    if (a === "--mode") {
      const v = argv[i + 1];
      if (!v || v.startsWith("-")) return { kind: "error", message: "Missing value for --mode." };
      if (v !== "dry_run" && v !== "run_once") {
        return { kind: "error", message: "Invalid --mode (allowed: dry_run, run_once)." };
      }
      modeFlag = v;
      explicitMode = true;
      i++;
      continue;
    }
    if (a === "--created-at") {
      const v = argv[i + 1];
      if (!v || v.startsWith("-")) return { kind: "error", message: "Missing value for --created-at." };
      createdAt = v;
      i++;
      continue;
    }
    if (a === "--api-host") {
      const v = argv[i + 1];
      if (!v || v.startsWith("-")) return { kind: "error", message: "Missing value for --api-host." };
      apiHost = v;
      i++;
      continue;
    }
    if (a === "--api-port") {
      const v = takeOptInt(argv[i + 1], 1, 65535);
      if (v === null) return { kind: "error", message: "Invalid or missing value for --api-port (1-65535)." };
      apiPort = v;
      i++;
      continue;
    }
    if (a === "--dashboard-host") {
      const v = argv[i + 1];
      if (!v || v.startsWith("-")) return { kind: "error", message: "Missing value for --dashboard-host." };
      dashboardHost = v;
      i++;
      continue;
    }
    if (a === "--dashboard-port") {
      const v = takeOptInt(argv[i + 1], 1, 65535);
      if (v === null) return { kind: "error", message: "Invalid or missing value for --dashboard-port (1-65535)." };
      dashboardPort = v;
      i++;
      continue;
    }
    if (a === "--max-wait-ms") {
      const v = takeOptInt(argv[i + 1], 1, 600_000);
      if (v === null) return { kind: "error", message: "Invalid or missing value for --max-wait-ms (1-600000)." };
      maxWaitMs = v;
      i++;
      continue;
    }
    if (a.startsWith("-")) return { kind: "error", message: `Unknown argument: ${a}` };
    return { kind: "error", message: `Unexpected argument: ${a}` };
  }

  if (confirmStart && modeFlag === "dry_run") {
    return {
      kind: "error",
      message: "Conflicting flags: --confirm-start cannot be used with --mode dry_run. Use --mode run_once.",
    };
  }

  let effectiveMode: LocalLauncherWrapperCliMode;
  if (confirmStart) {
    effectiveMode = "run_once";
  } else if (modeFlag === "run_once") {
    effectiveMode = "run_once";
  } else {
    effectiveMode = "dry_run";
  }

  const nowIso = new Date().toISOString();

  return {
    kind: "run",
    options: {
      json,
      effectiveMode,
      confirmStart,
      explicitMode,
      apiHost: apiHost ?? "127.0.0.1",
      apiPort: apiPort ?? 3001,
      dashboardHost: dashboardHost ?? "127.0.0.1",
      dashboardPort: dashboardPort ?? 5173,
      skipBuild,
      maxWaitMs: maxWaitMs ?? 25_000,
      createdAt: createdAt ?? nowIso,
    },
  };
}

export function buildLocalLauncherWrapperPlan(parsed: LocalLauncherWrapperParsedRun): LocalLauncherWrapperPlan {
  const dryRunOptions: LocalLauncherWrapperDryRunOptions = {
    mode: "dry_run",
    rootStrategy: "undecided",
    createdAt: parsed.createdAt,
    strict: false,
  };

  if (parsed.effectiveMode === "run_once" && !parsed.confirmStart) {
    return {
      dryRunOptions,
      supervisorOptions: null,
      blockReason: "run_once_requires_confirm_start",
      effectiveMode: "run_once",
      confirmStart: false,
    };
  }

  if (parsed.confirmStart && parsed.effectiveMode === "run_once") {
    return {
      dryRunOptions,
      supervisorOptions: {
        apiHost: parsed.apiHost,
        apiPort: parsed.apiPort,
        dashboardHost: parsed.dashboardHost,
        dashboardPort: parsed.dashboardPort,
        skipBuild: parsed.skipBuild,
        maxWaitMs: parsed.maxWaitMs,
      },
      blockReason: null,
      effectiveMode: "run_once",
      confirmStart: true,
    };
  }

  return {
    dryRunOptions,
    supervisorOptions: null,
    blockReason: null,
    effectiveMode: "dry_run",
    confirmStart: false,
  };
}

function summarizeSupervisorForWrapper(s: ApiDashboardSupervisorResult): Record<string, unknown> {
  return {
    ok: s.ok,
    phase: s.phase,
    apiHost: s.apiHost,
    apiPort: s.apiPort,
    dashboardHost: s.dashboardHost,
    dashboardPort: s.dashboardPort,
    apiPid: s.apiPid,
    dashboardPid: s.dashboardPid,
    healthOk: s.healthOk,
    runtimeStatusSummary: s.runtimeStatusSummary,
    dashboardHttpOk: s.dashboardHttpOk,
    dashboardConfigHttpOk: s.dashboardConfigHttpOk,
    corsOk: s.corsOk,
    startedAt: s.startedAt,
    stoppedAt: s.stoppedAt,
    cleanupStatus: s.cleanupStatus,
    apiPortFreed: s.apiPortFreed,
    dashboardPortFreed: s.dashboardPortFreed,
    executionEnabledReported: s.executionEnabledReported,
    readOnlyReported: s.readOnlyReported,
    noMt5: s.noMt5,
    errors: s.errors,
    warnings: s.warnings,
    gitHead: s.gitHead,
    gitStatusInitial: s.gitStatusInitial,
    gitStatusFinal: s.gitStatusFinal,
  };
}

export function toLocalLauncherWrapperJsonPayload(result: LocalLauncherWrapperResult): Record<string, unknown> {
  const sup = result.supervisor ? summarizeSupervisorForWrapper(result.supervisor) : null;
  return {
    ok: result.ok,
    phase: result.phase,
    mode: result.mode,
    confirmStart: result.confirmStart,
    processStartAttempted: result.processStartAttempted,
    readOnly: result.readOnly,
    executionEnabled: result.executionEnabled,
    tradingEnabled: result.tradingEnabled,
    mt5LaunchEnabled: result.mt5LaunchEnabled,
    commandSummary: result.commandSummary,
    startedAt: result.startedAt,
    stoppedAt: result.stoppedAt,
    dryRun: {
      ok: result.dryRun.ok,
      mode: result.dryRun.mode,
      readOnly: result.dryRun.readOnly,
      processStartEnabled: result.dryRun.processStartEnabled,
      executionEnabled: result.dryRun.executionEnabled,
      tradingEnabled: result.dryRun.tradingEnabled,
      mt5LaunchEnabled: result.dryRun.mt5LaunchEnabled,
    },
    supervisor: sup,
    errors: result.errors,
    warnings: result.warnings,
  };
}

export type LocalLauncherWrapperMode = LocalLauncherWrapperCliMode;
export type LocalLauncherWrapperOptions = LocalLauncherWrapperParsedRun;

export function printLocalLauncherWrapperHuman(
  result: LocalLauncherWrapperResult,
  io?: LocalLauncherWrapperIo,
): void {
  const sink =
    io ??
    ({
      stdoutWrite: (s) => {
        process.stdout.write(s);
      },
      stderrWrite: (s) => {
        process.stderr.write(s);
      },
    } satisfies LocalLauncherWrapperIo);
  for (const line of LOCAL_LAUNCHER_WRAPPER_BANNER_LINES) {
    sink.stdoutWrite(`${line}\n`);
  }
  sink.stdoutWrite("\n");

  sink.stdoutWrite(`Command: ${result.commandSummary}\n`);
  sink.stdoutWrite(`Phase: ${result.phase}\n`);
  sink.stdoutWrite(`Mode: ${result.mode}\n`);
  sink.stdoutWrite(`confirmStart: ${String(result.confirmStart)}\n`);
  sink.stdoutWrite(`processStartAttempted: ${String(result.processStartAttempted)}\n`);
  sink.stdoutWrite(`ok: ${String(result.ok)}\n\n`);

  sink.stdoutWrite("Embedded D14.4 dry-run model (declarative):\n");
  sink.stdoutWrite(`- dryRun.ok=${String(result.dryRun.ok)} dryRun.mode=${result.dryRun.mode}\n`);
  sink.stdoutWrite(`- executionEnabled=${String(result.dryRun.safety.executionEnabled)} tradingEnabled=${String(result.dryRun.safety.tradingEnabled)}\n`);
  sink.stdoutWrite(`- mt5LaunchEnabled=${String(result.dryRun.safety.mt5LaunchEnabled)} processStartEnabled=${String(result.dryRun.safety.processStartEnabled)}\n\n`);

  if (result.mode === "dry_run" && !result.confirmStart) {
    sink.stdoutWrite("Safe default: no API, no dashboard, no supervisor child processes from this wrapper.\n");
    sink.stdoutWrite("For a real one-shot supervised run: --mode run_once --confirm-start (plus optional host/port flags).\n\n");
  }

  if (result.supervisor) {
    const s = result.supervisor;
    sink.stdoutWrite("Supervisor summary (D13.5 delegate):\n");
    sink.stdoutWrite(`- startedAt: ${s.startedAt ?? "null"} stoppedAt: ${s.stoppedAt ?? "null"}\n`);
    sink.stdoutWrite(`- apiPid: ${s.apiPid ?? "null"} dashboardPid: ${s.dashboardPid ?? "null"}\n`);
    sink.stdoutWrite(`- healthOk: ${String(s.healthOk)} dashboardHttpOk: ${String(s.dashboardHttpOk)} corsOk: ${String(s.corsOk)}\n`);
    sink.stdoutWrite(`- cleanupStatus: ${s.cleanupStatus} apiPortFreed: ${String(s.apiPortFreed)} dashboardPortFreed: ${String(s.dashboardPortFreed)}\n`);
    sink.stdoutWrite(`- gitStatusFinal: ${s.gitStatusFinal ?? "null"}\n\n`);
  }

  for (const w of result.warnings) sink.stdoutWrite(`warning: ${w}\n`);
  for (const e of result.errors) sink.stderrWrite(`error: ${e}\n`);

  sink.stdoutWrite("\nNext checkpoint: D14.8 — real wrapper run evidence (docs).\n");
}

export async function runLocalLauncherWrapper(
  argv: string[],
  partialDeps?: Partial<LocalLauncherWrapperDeps>,
): Promise<{ exitCode: number; result: LocalLauncherWrapperResult }> {
  const deps = mergeDeps(partialDeps);
  const io = deps.io;
  const parsed = parseLocalLauncherWrapperArgs(argv);

  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    const stubDry = deps.runDryRunBuild({
      mode: "dry_run",
      rootStrategy: "undecided",
      createdAt: deps.now(),
      strict: false,
    });
    const stub: LocalLauncherWrapperResult = {
      ok: true,
      phase: "help",
      mode: "dry_run",
      confirmStart: false,
      processStartAttempted: false,
      readOnly: true,
      executionEnabled: false,
      tradingEnabled: false,
      mt5LaunchEnabled: false,
      commandSummary: deps.argvSummary(["--help"]),
      startedAt: null,
      stoppedAt: null,
      dryRun: stubDry,
      supervisor: null,
      errors: [],
      warnings: [],
    };
    return { exitCode: 0, result: stub };
  }

  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite("Try `mapazapp:launcher-wrapper -- --help`.\n");
    const stubDry = deps.runDryRunBuild({
      mode: "dry_run",
      rootStrategy: "undecided",
      createdAt: deps.now(),
      strict: false,
    });
    const stub: LocalLauncherWrapperResult = {
      ok: false,
      phase: "argv_error",
      mode: "dry_run",
      confirmStart: false,
      processStartAttempted: false,
      readOnly: true,
      executionEnabled: false,
      tradingEnabled: false,
      mt5LaunchEnabled: false,
      commandSummary: deps.argvSummary(argv),
      startedAt: null,
      stoppedAt: null,
      dryRun: stubDry,
      supervisor: null,
      errors: [parsed.message],
      warnings: [],
    };
    return { exitCode: 2, result: stub };
  }

  const opt = parsed.options;
  const plan = buildLocalLauncherWrapperPlan(opt);
  const dryRun = deps.runDryRunBuild(plan.dryRunOptions);
  const commandSummary = deps.argvSummary(argv);

  const baseResult = (): LocalLauncherWrapperResult => ({
    ok: false,
    phase: "init",
    mode: plan.effectiveMode,
    confirmStart: plan.confirmStart,
    processStartAttempted: false,
    readOnly: true,
    executionEnabled: false,
    tradingEnabled: false,
    mt5LaunchEnabled: false,
    commandSummary,
    startedAt: null,
    stoppedAt: null,
    dryRun,
    supervisor: null,
    errors: [],
    warnings: [...dryRun.validation.warnings],
  });

  if (!dryRun.ok) {
    const r = baseResult();
    r.phase = "dry_run_model_failed";
    r.ok = false;
    r.errors.push(...dryRun.validation.errors);
    r.errors.push(...dryRun.safetyScan.errors);
    if (dryRun.strictWarningsFailed) r.errors.push("strict_warnings_failed");
    if (opt.json) io.stdoutWrite(`${JSON.stringify(toLocalLauncherWrapperJsonPayload(r))}\n`);
    else printLocalLauncherWrapperHuman(r, io);
    return { exitCode: 1, result: r };
  }

  if (plan.blockReason) {
    const r = baseResult();
    r.phase = "blocked";
    r.ok = false;
    r.errors.push(plan.blockReason);
    if (opt.json) io.stdoutWrite(`${JSON.stringify(toLocalLauncherWrapperJsonPayload(r))}\n`);
    else printLocalLauncherWrapperHuman(r, io);
    return { exitCode: 1, result: r };
  }

  if (!plan.supervisorOptions) {
    const r = baseResult();
    r.phase = "dry_run_only";
    r.ok = true;
    r.readOnly = true;
    r.executionEnabled = false;
    r.tradingEnabled = false;
    r.mt5LaunchEnabled = false;
    if (opt.json) io.stdoutWrite(`${JSON.stringify(toLocalLauncherWrapperJsonPayload(r))}\n`);
    else printLocalLauncherWrapperHuman(r, io);
    return { exitCode: 0, result: r };
  }

  const r = baseResult();
  r.processStartAttempted = true;
  r.phase = "supervisor_running";
  let supervisor: ApiDashboardSupervisorResult;
  try {
    supervisor = await deps.runSupervisor(plan.supervisorOptions);
  } catch (e) {
    r.phase = "supervisor_threw";
    r.ok = false;
    r.errors.push(e instanceof Error ? e.message : "supervisor_threw");
    if (opt.json) io.stdoutWrite(`${JSON.stringify(toLocalLauncherWrapperJsonPayload(r))}\n`);
    else printLocalLauncherWrapperHuman(r, io);
    return { exitCode: 1, result: r };
  }

  r.supervisor = supervisor;
  r.phase = supervisor.phase;
  r.ok = supervisor.ok;
  r.startedAt = supervisor.startedAt;
  r.stoppedAt = supervisor.stoppedAt;
  r.readOnly = supervisor.readOnlyReported !== false;
  r.executionEnabled = supervisor.executionEnabledReported === true;
  r.tradingEnabled = false;
  r.mt5LaunchEnabled = false;
  r.errors.push(...supervisor.errors);
  r.warnings.push(...supervisor.warnings);

  if (opt.json) io.stdoutWrite(`${JSON.stringify(toLocalLauncherWrapperJsonPayload(r))}\n`);
  else printLocalLauncherWrapperHuman(r, io);

  return { exitCode: r.ok ? 0 : 1, result: r };
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  runLocalLauncherWrapper(process.argv.slice(2)).then(({ exitCode }) => {
    process.exit(exitCode);
  });
}
