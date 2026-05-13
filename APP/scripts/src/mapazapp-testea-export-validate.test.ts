/**
 * E4.1 — CLI tests for mapazapp:testea-export-validate (no MT5).
 */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { TestEaBundleValidationResult } from "@workspace/mapazapp-core";
import { applyStrict, runTestEaExportValidateCli, type TestEaExportValidateIo } from "./mapazapp-testea-export-validate";

const samplesDir = join(dirname(fileURLToPath(import.meta.url)), "../../artifacts/mt5/experts/Mapazapp_TestEA/samples");

function readSample(name: "backtest_summary.json" | "backtest_events.csv" | "backtest_trades.csv"): string {
  return readFileSync(join(samplesDir, name), "utf8");
}

function captureIo(handlers: Partial<TestEaExportValidateIo>): TestEaExportValidateIo & { out: string; err: string } {
  let out = "";
  let err = "";
  return {
    readFileUtf8: handlers.readFileUtf8 ?? ((p) => readFileSync(p, "utf8")),
    pathExists: handlers.pathExists ?? (() => true),
    isDirectory: handlers.isDirectory ?? (() => true),
    fileByteLength: handlers.fileByteLength ?? (() => 100),
    stdoutWrite: (s) => {
      out += s;
    },
    stderrWrite: (s) => {
      err += s;
    },
    get out() {
      return out;
    },
    get err() {
      return err;
    },
  };
}

test("CLI help exits 0", () => {
  const io = captureIo({});
  const code = runTestEaExportValidateCli(["--help"], io);
  assert.equal(code, 0);
  assert.match(io.out, /mapazapp-testea-export-validate/);
});

test("CLI missing --bundle exits 2", () => {
  const io = captureIo({});
  const code = runTestEaExportValidateCli([], io);
  assert.equal(code, 2);
  assert.match(io.err, /missing required --bundle/);
});

test("CLI samples folder JSON exits 0", () => {
  const io = captureIo({
    pathExists: () => true,
    isDirectory: () => true,
    readFileUtf8: (p) => {
      const base = p.replace(/\\/g, "/").split("/").pop()!;
      if (base === "backtest_summary.json") return readSample("backtest_summary.json");
      if (base === "backtest_events.csv") return readSample("backtest_events.csv");
      if (base === "backtest_trades.csv") return readSample("backtest_trades.csv");
      throw new Error(`unexpected path ${p}`);
    },
    fileByteLength: (p) => (p.endsWith("backtest_events.csv") ? 5000 : 200),
  });
  const code = runTestEaExportValidateCli(["--bundle", samplesDir, "--json"], io);
  assert.equal(code, 0);
  const j = JSON.parse(io.out) as { ok: boolean; status: string; bundle: string };
  assert.equal(j.ok, true);
  assert.equal(j.status, "ok");
  assert.equal(j.bundle, "samples");
});

test("applyStrict converts warnings to failed", () => {
  const base = {
    ok: true,
    status: "warning" as const,
    errors: [] as TestEaBundleValidationResult["errors"],
    warnings: [
      { level: "warning" as const, code: "CSV_HEADER_ONLY_NO_TRADE_ROWS", message: "header only" },
      { level: "warning" as const, code: "W", message: "x" },
    ],
    files: { summary: "ok" as const, events: "ok" as const, trades: "header_only" as const },
    summary: {},
    eventCounts: {},
    testEa: { status: "valid_with_warnings" } as TestEaBundleValidationResult["testEa"],
  } as TestEaBundleValidationResult;
  const r = applyStrict(base);
  assert.equal(r.ok, false);
  assert.equal(r.status, "failed");
  assert.ok(r.warnings.some((w) => w.code === "CSV_HEADER_ONLY_NO_TRADE_ROWS"));
  assert.ok(r.errors.some((e) => e.code === "STRICT_W"));
});

test("applyStrict leaves header-only-only warnings unchanged", () => {
  const base = {
    ok: true,
    status: "ok" as const,
    errors: [],
    warnings: [{ level: "warning" as const, code: "CSV_HEADER_ONLY_NO_TRADE_ROWS", message: "h" }],
    files: { summary: "ok" as const, events: "ok" as const, trades: "header_only" as const },
    summary: {},
    eventCounts: {},
    testEa: { status: "valid_with_warnings" } as TestEaBundleValidationResult["testEa"],
  } as TestEaBundleValidationResult;
  const r = applyStrict(base);
  assert.deepEqual(r, base);
});

test("CLI temp bundle missing summary exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-testea-"));
  try {
    writeFileSync(join(dir, "backtest_events.csv"), "h\n");
    writeFileSync(join(dir, "backtest_trades.csv"), "h\n");
    const io = captureIo({});
    const code = runTestEaExportValidateCli(["--bundle", dir], io);
    assert.equal(code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI real samples path integration", () => {
  const io = captureIo({});
  const code = runTestEaExportValidateCli(["--bundle", samplesDir, "--max-events-preview", "2"], io);
  assert.equal(code, 0);
  assert.match(io.out, /Status: OK/);
});
