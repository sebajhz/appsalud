/**
 * E5.20.3 — Dashboard read-only data adapter CLI (no MT5, no trading, no gates).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDashboardReadonlyView,
  compactDashboardReadonlyViewSummary,
  dashboardReadonlyViewToJson,
  type DashboardReadonlyView,
  type SetupReadinessReportLanguage,
} from "@workspace/mapazapp-core";

const USAGE = `mapazapp-dashboard-readonly-adapter (read-only dashboard view model; no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-adapter -- \\
    --report-json "<path>/setup_readiness_report.json" \\
    [--latest-result "<path>/latest_valid_report_result.json"] \\
    [--index "<path>/bundles.index.json"] \\
    [--output "<path>/dashboard_readonly_view.json"] \\
    [--language es|en] \\
    [--strict] \\
    [--json]

Options:
  --report-json <path>     setup_readiness_report.json (required)
  --latest-result <path>   latest_valid_report_result.json (optional)
  --index <path>           bundles.index.json (optional)
  --output <path>          Write dashboard_readonly_view.json
  --language es|en         Labels language (default: es)
  --strict                 Treat adapter warnings as failure
  --json                   Print compact summary JSON to stdout
  --help, -h               Show this message

Exit codes:
  0  View built (ok=true, or ok=false without --strict)
  1  Invalid arguments or --strict with ok=false
  2  Missing required --report-json

Scope:
  Read-only consumption of existing report artifacts. No report generation, no trading.
`;

export type DashboardReadonlyAdapterCliIo = {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  existsSync(path: string): boolean;
  readFileUtf8(path: string): string;
  writeFileUtf8(path: string, data: string): void;
  mkdirSync(path: string): void;
};

type ParsedCli =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      reportJson: string;
      latestResult?: string;
      index?: string;
      output?: string;
      language: SetupReadinessReportLanguage;
      strict: boolean;
      json: boolean;
    };

function defaultIo(): DashboardReadonlyAdapterCliIo {
  return {
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    mkdirSync: (p) => mkdirSync(p, { recursive: true }),
  };
}

function parseArgv(argv: string[]): ParsedCli {
  if (argv.includes("--help") || argv.includes("-h")) return { kind: "help" };

  let reportJson: string | undefined;
  let latestResult: string | undefined;
  let index: string | undefined;
  let output: string | undefined;
  let language: SetupReadinessReportLanguage = "es";
  let strict = false;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--report-json") {
      reportJson = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--latest-result") {
      latestResult = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--index") {
      index = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--output") {
      output = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--language") {
      const lang = argv[++i];
      if (lang === "es" || lang === "en") language = lang;
      else return { kind: "error", message: `--language must be es or en (got ${lang ?? ""})` };
      continue;
    }
    if (a === "--strict") {
      strict = true;
      continue;
    }
    if (a === "--json") {
      json = true;
      continue;
    }
    return { kind: "error", message: `Unknown argument: ${a}` };
  }

  if (!reportJson) return { kind: "error", message: "--report-json is required" };
  return {
    kind: "run",
    reportJson,
    latestResult,
    index,
    output,
    language,
    strict,
    json,
  };
}

export function runDashboardReadonlyAdapterCli(
  argv: string[],
  io: DashboardReadonlyAdapterCliIo = defaultIo(),
): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(`${USAGE}\n`);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    return 2;
  }

  if (!io.existsSync(parsed.reportJson)) {
    io.stderrWrite(`Report JSON not found: ${parsed.reportJson}\n`);
    return 1;
  }

  if (parsed.latestResult && !io.existsSync(parsed.latestResult)) {
    io.stderrWrite(`Latest result JSON not found: ${parsed.latestResult}\n`);
    return 1;
  }

  if (parsed.index && !io.existsSync(parsed.index)) {
    io.stderrWrite(`Bundle index JSON not found: ${parsed.index}\n`);
    return 1;
  }

  const sourcePaths = {
    report_json: parsed.reportJson,
    latest_result_json: parsed.latestResult,
    bundle_index_json: parsed.index,
    output_json: parsed.output,
  };

  let reportText: string;
  try {
    reportText = io.readFileUtf8(parsed.reportJson);
  } catch (err) {
    io.stderrWrite(`Failed to read report JSON: ${String(err)}\n`);
    return 1;
  }

  const view: DashboardReadonlyView = buildDashboardReadonlyView({
    reportJsonText: reportText,
    latestResultJsonText: parsed.latestResult ? io.readFileUtf8(parsed.latestResult) : undefined,
    indexJsonText: parsed.index ? io.readFileUtf8(parsed.index) : undefined,
    language: parsed.language,
    sourcePaths,
    strict: parsed.strict,
  });

  if (parsed.output) {
    io.mkdirSync(dirname(parsed.output));
    io.writeFileUtf8(parsed.output, dashboardReadonlyViewToJson(view));
  }

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(compactDashboardReadonlyViewSummary(view))}\n`);
  } else if (!parsed.output) {
    io.stdoutWrite(dashboardReadonlyViewToJson(view));
  }

  if (!view.ok && parsed.strict) return 1;
  if (!view.ok && view.errors.some((e) => e.includes("could not be parsed"))) return 1;
  return view.ok ? 0 : parsed.strict ? 1 : 0;
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const code = runDashboardReadonlyAdapterCli(process.argv.slice(2));
  process.exit(code);
}
