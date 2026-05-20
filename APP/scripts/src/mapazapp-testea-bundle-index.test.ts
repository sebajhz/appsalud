/**
 * E5.20.1 — CLI tests for mapazapp:testea-bundle-index (no MT5, no report generation).
 */

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  V2_12_TESTEA_E342_EVENTS_CSV,
  V2_12_TESTEA_E342_SUMMARY_JSON,
  V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV,
} from "@workspace/mapazapp-core";
import {
  compactIndexSummary,
  runTestEaBundleIndexCli,
  type TestEaBundleIndexCliIo,
} from "./mapazapp-testea-bundle-index";

function writeFixtureBundle(dir: string): void {
  writeFileSync(join(dir, "backtest_summary.json"), V2_12_TESTEA_E342_SUMMARY_JSON);
  writeFileSync(join(dir, "backtest_events.csv"), V2_12_TESTEA_E342_EVENTS_CSV);
  writeFileSync(join(dir, "backtest_trades.csv"), V2_12_TESTEA_E342_TRADES_HEADER_ONLY_CSV);
}

function diskCliIo(
  hooks?: Partial<Pick<TestEaBundleIndexCliIo, "stdoutWrite" | "stderrWrite" | "writeFileUtf8">>,
): TestEaBundleIndexCliIo {
  return {
    pathExists: existsSync,
    isDirectory: (p) => statSync(p).isDirectory(),
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    fileMtimeUtc: (p) => new Date(statSync(p).mtimeMs).toISOString(),
    listDirectory: (p) => readdirSync(p),
    stdoutWrite: hooks?.stdoutWrite ?? (() => {}),
    stderrWrite: hooks?.stderrWrite ?? (() => {}),
    writeFileUtf8: hooks?.writeFileUtf8 ?? ((p, d) => writeFileSync(p, d, "utf8")),
    ensureDir: (d) => {
      if (!existsSync(d)) mkdirSync(d, { recursive: true });
    },
  };
}

test("CLI help exits 0", () => {
  let out = "";
  const code = runTestEaBundleIndexCli(["--help"], {
    pathExists: () => false,
    isDirectory: () => false,
    readFileUtf8: () => "",
    fileMtimeUtc: () => null,
    listDirectory: () => [],
    stdoutWrite: (s) => {
      out += s;
    },
    stderrWrite: () => {},
    writeFileUtf8: () => {},
    ensureDir: () => {},
  });
  assert.equal(code, 0);
  assert.match(out, /mapazapp-testea-bundle-index/);
});

test("CLI missing --root exits 2", () => {
  let err = "";
  const code = runTestEaBundleIndexCli([], {
    pathExists: () => false,
    isDirectory: () => false,
    readFileUtf8: () => "",
    fileMtimeUtc: () => null,
    listDirectory: () => [],
    stdoutWrite: () => {},
    stderrWrite: (s) => {
      err += s;
    },
    writeFileUtf8: () => {},
    ensureDir: () => {},
  });
  assert.equal(code, 2);
  assert.match(err, /missing required --root/);
});

test("CLI invalid root fails cleanly", () => {
  const code = runTestEaBundleIndexCli(
    ["--root", "/nonexistent-bundle-index-root-xyz"],
    diskCliIo(),
  );
  assert.equal(code, 1);
});

test("--root scans fixture and --output writes bundles.index.json", () => {
  const root = mkdtempSync(join(tmpdir(), "bundle-index-cli-"));
  writeFixtureBundle(root);
  const outPath = join(root, "bundles.index.json");
  try {
    let written = "";
    const code = runTestEaBundleIndexCli(
      ["--root", root, "--output", outPath],
      diskCliIo({
        writeFileUtf8: (p, d) => {
          written = d;
          writeFileSync(p, d, "utf8");
        },
      }),
    );
    assert.equal(code, 0);
    assert.ok(existsSync(outPath));
    const index = JSON.parse(readFileSync(outPath, "utf8")) as { schema_version: string; bundles: unknown[] };
    assert.equal(index.schema_version, "mapazapp_bundle_index_v1");
    assert.ok(index.bundles.length >= 1);
    assert.ok(!written.includes("lifecycle_init"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--json prints compact result", () => {
  const root = mkdtempSync(join(tmpdir(), "bundle-index-cli-json-"));
  writeFixtureBundle(root);
  const outPath = join(root, "bundles.index.json");
  try {
    let stdout = "";
    const code = runTestEaBundleIndexCli(
      ["--root", root, "--output", outPath, "--json"],
      diskCliIo({
        stdoutWrite: (s) => {
          stdout += s;
        },
      }),
    );
    assert.equal(code, 0);
    const summary = JSON.parse(stdout.trim()) as ReturnType<typeof compactIndexSummary>;
    assert.equal(summary.schema_version, "mapazapp_bundle_index_v1");
    assert.ok(summary.total_bundles_scanned >= 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--no-include-invalid omits invalid bundles from output", () => {
  const root = mkdtempSync(join(tmpdir(), "bundle-index-cli-filter-"));
  writeFixtureBundle(root);
  const badDir = join(root, "bad_leaf");
  mkdirSync(badDir, { recursive: true });
  writeFileSync(join(badDir, "backtest_summary.json"), "{}");
  writeFileSync(join(badDir, "backtest_events.csv"), "x");
  writeFileSync(join(badDir, "backtest_trades.csv"), "y");
  const outPath = join(root, "bundles.index.json");
  try {
    const code = runTestEaBundleIndexCli(
      ["--root", root, "--output", outPath, "--no-include-invalid"],
      diskCliIo(),
    );
    assert.equal(code, 0);
    const index = JSON.parse(readFileSync(outPath, "utf8")) as {
      bundles: { valid_status: string }[];
    };
    assert.ok(index.bundles.every((b) => b.valid_status !== "invalid"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("does not generate setup readiness report artifacts", () => {
  const root = mkdtempSync(join(tmpdir(), "bundle-index-cli-noreport-"));
  writeFixtureBundle(root);
  const outPath = join(root, "bundles.index.json");
  try {
    runTestEaBundleIndexCli(["--root", root, "--output", outPath], diskCliIo());
    assert.equal(existsSync(join(root, "setup_readiness_report.json")), false);
    assert.equal(existsSync(join(root, "setup_readiness_report.md")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
