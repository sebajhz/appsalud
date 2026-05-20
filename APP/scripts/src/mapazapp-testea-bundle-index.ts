/**
 * E5.20.1 — Local bundle index CLI (read-only filesystem scan; no MT5, no report generation).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTestEaBundleIndex,
  testEaBundleIndexToJson,
  type TestEaBundleIndexFsIo,
  type TestEaBundleIndexV1,
} from "@workspace/mapazapp-core";

const USAGE = `mapazapp-testea-bundle-index (read-only local bundle discovery, no MT5)

Usage:
  pnpm --filter @workspace/scripts mapazapp:testea-bundle-index -- \\
    --root "<RootDir>" \\
    [--output "<RootDir>/bundles.index.json"] \\
    [--json] [--max-depth <n>] [--include-invalid] [--profile <id>] [--strict]

Required:
  --root <path>   Root folder to scan for TestEA export bundle leaves

Options:
  --output <path>       Write index JSON (default: <root>/bundles.index.json)
  --json                Print compact index summary JSON to stdout
  --max-depth <n>       Max directory depth when scanning (default: 12)
  --include-invalid     Include invalid bundles in index (default: true)
  --no-include-invalid  Omit invalid bundles from index output
  --profile <profile_id> Only index bundles under matching profile folder segment
  --strict              Treat validation warnings as failures
  --help, -h            Show this message

Exit codes:
  0  Index built successfully
  1  Root missing or not a directory
  2  Invalid arguments

Scope:
  Metadata-only index. Does not copy CSVs, generate reports, run MT5, or trade.
`;

export type TestEaBundleIndexCliIo = TestEaBundleIndexFsIo & {
  stdoutWrite(s: string): void;
  stderrWrite(s: string): void;
  writeFileUtf8(path: string, data: string): void;
  ensureDir(path: string): void;
};

type ParsedCli =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | {
      kind: "run";
      root: string;
      output: string;
      json: boolean;
      maxDepth: number;
      includeInvalid: boolean;
      profile?: string;
      strict: boolean;
    };

function parseArgv(argv: string[]): ParsedCli {
  let root: string | undefined;
  let output: string | undefined;
  let json = false;
  let maxDepth = 12;
  let includeInvalid = true;
  let profile: string | undefined;
  let strict = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") return { kind: "help" };
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--strict") {
      strict = true;
      continue;
    }
    if (a === "--include-invalid") {
      includeInvalid = true;
      continue;
    }
    if (a === "--no-include-invalid") {
      includeInvalid = false;
      continue;
    }
    if (!a.startsWith("--")) {
      return { kind: "error", message: `unexpected argument: ${a}` };
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      return { kind: "error", message: `missing value for --${key}` };
    }
    i++;
    switch (key) {
      case "root":
        root = next;
        break;
      case "output":
        output = next;
        break;
      case "max-depth": {
        const n = Number(next);
        if (!Number.isFinite(n) || n < 0) {
          return { kind: "error", message: "--max-depth must be a non-negative number" };
        }
        maxDepth = Math.floor(n);
        break;
      }
      case "profile":
        profile = next;
        break;
      default:
        return { kind: "error", message: `unknown option: --${key}` };
    }
  }

  if (!root) {
    return { kind: "error", message: "missing required --root <path>" };
  }

  const absRoot = resolve(root);
  const outPath = output ? resolve(output) : resolve(absRoot, "bundles.index.json");

  return {
    kind: "run",
    root: absRoot,
    output: outPath,
    json,
    maxDepth,
    includeInvalid,
    profile,
    strict,
  };
}

export function compactIndexSummary(index: TestEaBundleIndexV1): Record<string, unknown> {
  return {
    schema_version: index.schema_version,
    root: index.root,
    total_bundles_scanned: index.total_bundles_scanned,
    valid_count: index.valid_count,
    valid_warnings_count: index.valid_warnings_count,
    invalid_count: index.invalid_count,
    stale_count: index.stale_count,
    report_missing_count: index.report_missing_count,
    output_bundle_count: index.bundles.length,
    latest_valid_by_key_count: index.latest_valid_by_key.length,
  };
}

/** Returns process exit code (does not call process.exit). */
export function runTestEaBundleIndexCli(argv: string[], io: TestEaBundleIndexCliIo): number {
  const parsed = parseArgv(argv);
  if (parsed.kind === "help") {
    io.stdoutWrite(USAGE);
    return 0;
  }
  if (parsed.kind === "error") {
    io.stderrWrite(`${parsed.message}\n`);
    return 2;
  }

  if (!io.pathExists(parsed.root) || !io.isDirectory(parsed.root)) {
    io.stderrWrite("root path not found or not a directory\n");
    return 1;
  }

  const index = buildTestEaBundleIndex(
    {
      root: parsed.root,
      maxDepth: parsed.maxDepth,
      includeInvalid: parsed.includeInvalid,
      profileFilter: parsed.profile,
      strict: parsed.strict,
    },
    io,
  );

  const jsonText = testEaBundleIndexToJson(index);
  io.ensureDir(dirname(parsed.output));
  io.writeFileUtf8(parsed.output, jsonText);

  if (parsed.json) {
    io.stdoutWrite(`${JSON.stringify(compactIndexSummary(index))}\n`);
  } else {
    io.stdoutWrite(`Mapazapp bundle index written: ${parsed.output}\n`);
    io.stdoutWrite(`Bundles scanned: ${index.total_bundles_scanned}\n`);
    io.stdoutWrite(
      `valid=${index.valid_count} valid_warnings=${index.valid_warnings_count} invalid=${index.invalid_count} stale=${index.stale_count} report_missing=${index.report_missing_count}\n`,
    );
  }

  return 0;
}

function defaultIo(): TestEaBundleIndexCliIo {
  return {
    pathExists: (p) => existsSync(p),
    isDirectory: (p) => statSync(p).isDirectory(),
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    fileMtimeUtc: (p) => {
      try {
        return new Date(statSync(p).mtimeMs).toISOString();
      } catch {
        return null;
      }
    },
    listDirectory: (dir) => readdirSync(dir),
    stdoutWrite: (s) => process.stdout.write(s),
    stderrWrite: (s) => process.stderr.write(s),
    writeFileUtf8: (p, d) => writeFileSync(p, d, "utf8"),
    ensureDir: (dir) => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    },
  };
}

const executedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (executedDirectly) {
  process.exit(runTestEaBundleIndexCli(process.argv.slice(2), defaultIo()));
}
