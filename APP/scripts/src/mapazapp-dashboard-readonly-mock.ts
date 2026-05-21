/**
 * E5.20.4 — Dashboard read-only mock HTML generator CLI (no MT5, no trading, no gates).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compactDashboardReadonlyMockSummary,
  parseDashboardReadonlyViewJson,
  renderDashboardReadonlyMockHtml,
} from "@workspace/mapazapp-core";
import type { SetupReadinessReportLanguage } from "@workspace/mapazapp-core";

const USAGE = `mapazapp-dashboard-readonly-mock (read-only HTML mock from dashboard_readonly_view.json)

Usage:
  pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-mock -- \\
    --view-json "<path>/dashboard_readonly_view.json" \\
    --output "<path>/dashboard_readonly_mock.html" \\
    [--metadata "<path>/dashboard_readonly_mock.meta.json"] \\
    [--language es|en] \\
    [--json]

Options:
  --view-json <path>   dashboard_readonly_view.json (required)
  --output <path>      Write dashboard_readonly_mock.html (required)
  --metadata <path>    Optional compact metadata JSON
  --language es|en     UI labels (default: es)
  --json               Print compact summary JSON to stdout
  --help, -h           Show this message

Exit codes:
  0  HTML generated
  1  Invalid view or write failure
  2  Missing required arguments

Scope:
  Presentation-only mock. Consumes adapter output only. No trading, no gates, no recalculation.
`;

export type DashboardReadonlyMockCliIo = {
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
      viewJson: string;
      output: string;
      metadata?: string;
      language: SetupReadinessReportLanguage;
      json: boolean;
    };

function defaultIo(): DashboardReadonlyMockCliIo {
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

  let viewJson: string | undefined;
  let output: string | undefined;
  let metadata: string | undefined;
  let language: SetupReadinessReportLanguage = "es";
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--view-json") {
      viewJson = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--output") {
      output = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--metadata") {
      metadata = resolve(argv[++i] ?? "");
      continue;
    }
    if (a === "--language") {
      const lang = argv[++i];
      if (lang === "es" || lang === "en") language = lang;
      else return { kind: "error", message: `--language must be es or en (got ${lang ?? ""})` };
      continue;
    }
    if (a === "--json") {
      json = true;
      continue;
    }
    return { kind: "error", message: `Unknown argument: ${a}` };
  }

  if (!viewJson) return { kind: "error", message: "--view-json is required" };
  if (!output) return { kind: "error", message: "--output is required" };
  return { kind: "run", viewJson, output, metadata, language, json };
}

export function runDashboardReadonlyMockCli(
  argv: string[],
  io: DashboardReadonlyMockCliIo = defaultIo(),
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

  if (!io.existsSync(parsed.viewJson)) {
    io.stderrWrite(`View JSON not found: ${parsed.viewJson}\n`);
    return 1;
  }

  let viewText: string;
  try {
    viewText = io.readFileUtf8(parsed.viewJson);
  } catch (err) {
    io.stderrWrite(`Failed to read view JSON: ${String(err)}\n`);
    return 1;
  }

  const view = parseDashboardReadonlyViewJson(viewText);
  if (!view) {
    io.stderrWrite("dashboard_readonly_view.json could not be parsed or has invalid schema\n");
    if (parsed.json) {
      io.stdoutWrite(
        `${JSON.stringify({ ok: false, errors: ["dashboard_readonly_view.json could not be parsed"] })}\n`,
      );
    }
    return 1;
  }

  const html = renderDashboardReadonlyMockHtml(view, { language: parsed.language });
  try {
    io.mkdirSync(dirname(parsed.output));
    io.writeFileUtf8(parsed.output, html);
  } catch (err) {
    io.stderrWrite(`Failed to write HTML: ${String(err)}\n`);
    return 1;
  }

  if (parsed.metadata) {
    try {
      io.mkdirSync(dirname(parsed.metadata));
      io.writeFileUtf8(
        parsed.metadata,
        `${JSON.stringify(compactDashboardReadonlyMockSummary(view, parsed.output), null, 2)}\n`,
      );
    } catch (err) {
      io.stderrWrite(`Failed to write metadata: ${String(err)}\n`);
      return 1;
    }
  }

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(compactDashboardReadonlyMockSummary(view, parsed.output))}\n`);
  }

  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const code = runDashboardReadonlyMockCli(process.argv.slice(2));
  process.exit(code);
}
