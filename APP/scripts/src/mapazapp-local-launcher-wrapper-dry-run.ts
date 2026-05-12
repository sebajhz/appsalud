/**
 * D14.5 — Local launcher wrapper dry-run CLI (declarative only).
 * Does not start processes, does not write to disk, does not open network clients.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertLocalLauncherWrapperSafety,
  createDefaultLocalLauncherWrapperModel,
  createLocalLauncherWrapperActionPlan,
  serializeLocalLauncherWrapperModel,
  type LocalLauncherWrapperActionPlan,
  type LocalLauncherWrapperLayoutRootStrategy,
  type LocalLauncherWrapperModel,
  type LocalLauncherWrapperMode,
  type LocalLauncherWrapperSafety,
  type LocalLauncherWrapperSafetyAssertion,
  type LocalLauncherWrapperValidationResult,
  validateLocalLauncherWrapperModel,
} from "./mapazapp-local-launcher-wrapper-model";

const DEFAULT_CREATED_AT = "1970-01-01T00:00:00.000Z";

const CLI_MODES: readonly LocalLauncherWrapperMode[] = ["design_only", "dry_run"];

const USAGE = `mapazapp-local-launcher-wrapper-dry-run (read-only planning)

Usage:
  pnpm --filter @workspace/scripts mapazapp:launcher-wrapper-dry-run [--options]

Options:
  --help, -h                 Show this message
  --json                     Machine-readable summary on stdout
  --mode <design_only|dry_run>   Wrapper posture (default: design_only)
  --root-strategy <portable|appData|undecided>   Layout root strategy (default: undecided)
  --created-at <iso8601>     Fixed timestamp for deterministic output
  --include-actions          Include action policy table in human output (default: on)
  --no-include-actions       Omit action table from human output
  --include-layout           Include conceptual layout folders in human output
  --include-evidence         Include evidence policy lines in human output
  --strict                   Treat validation warnings as failure (exit 1)

Exit codes:
  0  Model validated and safety scan passed
  1  Validation or safety assertion failed (or strict warnings)
  2  Invalid arguments

Scope:
  Builds the D14.4 wrapper model in memory only.
  No API, dashboard, supervisor, MT5, watchers, or disk writes.
  No process start. No filesystem writes. No operational trading claims.
  Next gate: D14.6 — real wrapper prototype (explicit approval only).
`;

export type ParsedLocalLauncherWrapperDryRunArgv =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | { kind: "run"; options: LocalLauncherWrapperDryRunCliFlags };

export interface LocalLauncherWrapperDryRunCliFlags {
  json: boolean;
  mode: LocalLauncherWrapperMode;
  rootStrategy: LocalLauncherWrapperLayoutRootStrategy;
  createdAt: string;
  includeActions: boolean;
  includeLayout: boolean;
  includeEvidence: boolean;
  strict: boolean;
}

export interface LocalLauncherWrapperDryRunOptions {
  mode: LocalLauncherWrapperMode;
  rootStrategy: LocalLauncherWrapperLayoutRootStrategy;
  createdAt: string;
  strict: boolean;
}

export interface LocalLauncherWrapperDryRunResult {
  ok: boolean;
  mode: LocalLauncherWrapperMode;
  generatedAt: string;
  readOnly: true;
  executionEnabled: false;
  tradingEnabled: false;
  mt5LaunchEnabled: false;
  actionTransportEnabled: false;
  processStartEnabled: false;
  filesystemWritesEnabled: false;
  safety: LocalLauncherWrapperSafety;
  validation: LocalLauncherWrapperValidationResult;
  safetyScan: LocalLauncherWrapperSafetyAssertion;
  actionPlan: LocalLauncherWrapperActionPlan;
  model: LocalLauncherWrapperModel;
  strictWarningsFailed: boolean;
  serializedWrapperModelJson: string;
}

export interface LocalLauncherWrapperDryRunIo {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
}

function isCliMode(s: string): s is LocalLauncherWrapperMode {
  return (CLI_MODES as readonly string[]).includes(s);
}

function isRootStrategy(s: string): s is LocalLauncherWrapperLayoutRootStrategy {
  return s === "portable" || s === "appData" || s === "undecided";
}

/**
 * Parses argv after `node …/mapazapp-local-launcher-wrapper-dry-run.ts` (slice already applied).
 */
export function parseLocalLauncherWrapperDryRunArgs(argv: string[]): ParsedLocalLauncherWrapperDryRunArgv {
  let json = false;
  let mode: LocalLauncherWrapperMode = "design_only";
  let rootStrategy: LocalLauncherWrapperLayoutRootStrategy = "undecided";
  let createdAt = DEFAULT_CREATED_AT;
  let includeActions = true;
  let includeLayout = false;
  let includeEvidence = false;
  let strict = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { kind: "help" };
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--strict") {
      strict = true;
      continue;
    }
    if (a === "--include-actions") {
      includeActions = true;
      continue;
    }
    if (a === "--no-include-actions") {
      includeActions = false;
      continue;
    }
    if (a === "--include-layout") {
      includeLayout = true;
      continue;
    }
    if (a === "--include-evidence") {
      includeEvidence = true;
      continue;
    }
    if (a === "--mode") {
      const v = argv[i + 1];
      if (!v || v.startsWith("-")) return { kind: "error", message: "Missing value for --mode" };
      if (!isCliMode(v)) return { kind: "error", message: `Invalid --mode (allowed: ${CLI_MODES.join(", ")})` };
      mode = v;
      i++;
      continue;
    }
    if (a === "--root-strategy") {
      const v = argv[i + 1];
      if (!v || v.startsWith("-")) return { kind: "error", message: "Missing value for --root-strategy" };
      if (!isRootStrategy(v)) {
        return { kind: "error", message: "Invalid --root-strategy (allowed: portable, appData, undecided)" };
      }
      rootStrategy = v;
      i++;
      continue;
    }
    if (a === "--created-at") {
      const v = argv[i + 1];
      if (!v || v.startsWith("-")) return { kind: "error", message: "Missing value for --created-at" };
      createdAt = v;
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
    options: {
      json,
      mode,
      rootStrategy,
      createdAt,
      includeActions,
      includeLayout,
      includeEvidence,
      strict,
    },
  };
}

/**
 * Builds wrapper dry-run artifacts in memory (no I/O).
 */
export function buildLocalLauncherWrapperDryRunResult(
  options: LocalLauncherWrapperDryRunOptions,
): LocalLauncherWrapperDryRunResult {
  const model = createDefaultLocalLauncherWrapperModel({
    mode: options.mode,
    createdAt: options.createdAt,
    layout: { rootStrategy: options.rootStrategy },
  });
  const validation = validateLocalLauncherWrapperModel(model);
  const safetyScan = assertLocalLauncherWrapperSafety(model);
  const actionPlan = createLocalLauncherWrapperActionPlan(model, { createdAt: options.createdAt });
  const serializedWrapperModelJson = serializeLocalLauncherWrapperModel(model);

  const strictWarningsFailed = options.strict && validation.warnings.length > 0;
  const ok =
    validation.ok &&
    safetyScan.ok &&
    !strictWarningsFailed;

  return {
    ok,
    mode: model.mode,
    generatedAt: options.createdAt,
    readOnly: true,
    executionEnabled: false,
    tradingEnabled: false,
    mt5LaunchEnabled: false,
    actionTransportEnabled: false,
    processStartEnabled: false,
    filesystemWritesEnabled: false,
    safety: model.safety,
    validation,
    safetyScan,
    actionPlan,
    model,
    strictWarningsFailed,
    serializedWrapperModelJson,
  };
}

export function toLocalLauncherWrapperDryRunJsonPayload(result: LocalLauncherWrapperDryRunResult): Record<string, unknown> {
  return {
    ok: result.ok,
    mode: result.mode,
    safety: result.safety,
    actionPlan: result.actionPlan,
    layout: result.model.layout,
    evidence: result.model.evidence,
    validation: result.validation,
    safetyScan: result.safetyScan,
    readOnly: result.readOnly,
    processStartEnabled: result.processStartEnabled,
    filesystemWritesEnabled: result.filesystemWritesEnabled,
    executionEnabled: result.executionEnabled,
    tradingEnabled: result.tradingEnabled,
    mt5LaunchEnabled: result.mt5LaunchEnabled,
    actionTransportEnabled: result.actionTransportEnabled,
    generatedAt: result.generatedAt,
    createdAt: result.model.createdAt,
    strictWarningsFailed: result.strictWarningsFailed,
    serializedWrapperModelJson: result.serializedWrapperModelJson,
  };
}

export function printLocalLauncherWrapperDryRunHuman(
  result: LocalLauncherWrapperDryRunResult,
  io: LocalLauncherWrapperDryRunIo,
  flags: Pick<LocalLauncherWrapperDryRunCliFlags, "includeActions" | "includeLayout" | "includeEvidence">,
): void {
  io.stdoutWrite("Local launcher wrapper dry-run\n");
  io.stdoutWrite("Read-only declarative snapshot — not an executable launcher.\n\n");

  io.stdoutWrite(`Mode: ${result.mode}\n`);
  io.stdoutWrite(`Layout root strategy: ${result.model.layout.rootStrategy}\n`);
  io.stdoutWrite(`Created at (injected): ${result.model.createdAt}\n\n`);

  io.stdoutWrite("Safety posture (all must remain conservative):\n");
  io.stdoutWrite(`- executionEnabled=${String(result.safety.executionEnabled)} tradingEnabled=${String(result.safety.tradingEnabled)}\n`);
  io.stdoutWrite(`- mt5LaunchEnabled=${String(result.safety.mt5LaunchEnabled)} processStartEnabled=${String(result.safety.processStartEnabled)}\n`);
  io.stdoutWrite(`- filesystemWritesEnabled=${String(result.safety.filesystemWritesEnabled)} manualApprovalRequired=${String(result.safety.manualApprovalRequired)}\n`);
  io.stdoutWrite(`- actionTransportEnabled=${String(result.safety.actionTransportEnabled)} postRoutesEnabled=${String(result.safety.postRoutesEnabled)}\n\n`);

  io.stdoutWrite("Non-goals (this CLI):\n");
  io.stdoutWrite("- No process start, no child orchestration, no supervisor run.\n");
  io.stdoutWrite("- No filesystem writes, no folder materialization, no packaging.\n");
  io.stdoutWrite("- No MT5 launch, no bridge watcher, no dashboard or API servers started.\n");
  io.stdoutWrite("- No network clients, no database, no live socket sessions.\n\n");

  if (flags.includeActions) {
    io.stdoutWrite("Declarative action plan (allowed / blocked / outline):\n");
    for (const step of result.actionPlan.steps) {
      io.stdoutWrite(`- ${step.actionId}: ${step.state} — ${step.reason}\n`);
    }
    io.stdoutWrite("\n");
  }

  if (flags.includeLayout) {
    io.stdoutWrite("Conceptual layout folders (D14.1 — not created on disk):\n");
    const f = result.model.layout.folders;
    io.stdoutWrite(`- launcher=${f.launcher}\n- api-server=${f.apiServer}\n- dashboard=${f.dashboard}\n`);
    io.stdoutWrite(`- config=${f.config}\n- logs=${f.logs}\n- evidence=${f.evidence}\n`);
    io.stdoutWrite(`- runtime=${f.runtime}\n- backups=${f.backups}\n- support=${f.support}\n`);
    io.stdoutWrite(`- writesAllowed=${String(result.model.layout.writesAllowed)}\n\n`);
  }

  if (flags.includeEvidence) {
    io.stdoutWrite("Evidence slot (declarative):\n");
    io.stdoutWrite(`- exportFormat=${result.model.evidence.exportFormat} redactionPolicy=${result.model.evidence.redactionPolicy}\n`);
    io.stdoutWrite(`- safeSummary=${result.model.evidence.safeSummary.join(",")}\n\n`);
  }

  if (!result.validation.ok || !result.safetyScan.ok || result.strictWarningsFailed) {
    io.stdoutWrite("Validation status: FAILED\n");
    for (const e of result.validation.errors) io.stdoutWrite(`- validation: ${e}\n`);
    for (const e of result.safetyScan.errors) io.stdoutWrite(`- safety_scan: ${e}\n`);
    if (result.strictWarningsFailed) {
      for (const w of result.validation.warnings) io.stdoutWrite(`- strict_warning: ${w}\n`);
    }
  } else {
    io.stdoutWrite("Validation status: OK (declarative only).\n");
    if (result.validation.warnings.length > 0) {
      io.stdoutWrite("Warnings (non-fatal unless --strict):\n");
      for (const w of result.validation.warnings) io.stdoutWrite(`- ${w}\n`);
    }
  }

  io.stdoutWrite("\nNext checkpoint: D14.6 — real wrapper prototype gate (explicit approval, preconditions in D14.3 §10).\n");
}

/**
 * End-to-end dry-run: parse argv, build model, optionally print JSON or human summary.
 * Returns exit code (0 / 1 / 2). Does not call process.exit.
 */
export function runLocalLauncherWrapperDryRun(
  argv: string[],
  io: LocalLauncherWrapperDryRunIo,
): number {
  const parsed = parseLocalLauncherWrapperDryRunArgs(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    io.stderrWrite("Try `mapazapp:launcher-wrapper-dry-run -- --help`.\n");
    return 2;
  }

  const f = parsed.options;
  const result = buildLocalLauncherWrapperDryRunResult({
    mode: f.mode,
    rootStrategy: f.rootStrategy,
    createdAt: f.createdAt,
    strict: f.strict,
  });

  if (f.json) {
    io.stdoutWrite(`${JSON.stringify(toLocalLauncherWrapperDryRunJsonPayload(result))}\n`);
    return result.ok ? 0 : 1;
  }

  printLocalLauncherWrapperDryRunHuman(result, io, f);
  return result.ok ? 0 : 1;
}

function defaultIo(): LocalLauncherWrapperDryRunIo {
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
  const code = runLocalLauncherWrapperDryRun(process.argv.slice(2), defaultIo());
  process.exit(code);
}
