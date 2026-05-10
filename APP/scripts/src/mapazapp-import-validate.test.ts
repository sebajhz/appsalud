/**
 * C3.1 — CLI validator tests (subprocess-free via runImportValidateCli).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSafeSummary, runImportValidateCli } from "./mapazapp-import-validate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_MT5 = resolve(__dirname, "../../lib/mapazapp-core/tests/fixtures/mt5");

function fixturePath(name: string): string {
  return join(FIXTURE_MT5, name);
}

function captureIo() {
  let out = "";
  let err = "";
  return {
    io: {
      readFileUtf8: (p: string) => readFileSync(p, "utf8"),
      stdoutWrite: (s: string) => {
        out += s;
      },
      stderrWrite: (s: string) => {
        err += s;
      },
    },
    getOut: () => out,
    getErr: () => err,
  };
}

test("A. --help exits 0, usage present, no execution hints", () => {
  const { io, getOut } = captureIo();
  const code = runImportValidateCli(["--help"], io);
  assert.equal(code, 0);
  const o = getOut();
  assert.match(o, /usage/i);
  assert.match(o, /--file/i);
  assert.doesNotMatch(o, /OrderSend/i);
  assert.equal(o.includes("executionEnabled: true"), false);
});

test("B. valid synthetic fixture — ok, candles, readOnly, safe tokens", () => {
  const { io, getOut } = captureIo();
  const path = fixturePath("XAUUSD_M15_SYNTHETIC_VALID.csv");
  const code = runImportValidateCli(["--file", path, "--symbol", "XAUUSD", "--timeframe", "M15"], io);
  assert.equal(code, 0);
  const o = getOut();
  assert.match(o, /readOnly:\s*true/);
  assert.match(o, /executionEnabled:\s*false/);
  assert.match(o, /candleCount:\s*[1-9]/);
  assert.equal(o.includes("executionEnabled: true"), false);
  assert.equal(o.includes("autoApproval"), false);
  assert.equal(o.includes("sendToMt5"), false);
});

test("C. missing file — non-zero, file not found", () => {
  const { io, getErr } = captureIo();
  const path = join(FIXTURE_MT5, "___does_not_exist___.csv");
  const code = runImportValidateCli(["--file", path, "--symbol", "XAUUSD", "--timeframe", "M15"], io);
  assert.notEqual(code, 0);
  assert.match(getErr(), /file not found/i);
});

test("D. invalid OHLC — failure, no dataset candles invented", () => {
  const path = fixturePath("XAUUSD_M15_SYNTHETIC_INVALID_OHLC.csv");
  const csvText = readFileSync(path, "utf8");
  const summary = buildSafeSummary(
    {
      kind: "run",
      filePath: path,
      symbol: "XAUUSD",
      timeframe: "M15",
      format: "auto",
      json: false,
    },
    csvText,
  );
  assert.equal(summary.ok, false);
  assert.equal(summary.candleCount, 0);
  assert.ok(summary.errors.length > 0);
});

test("E. empty / header-only — failure, controlled error", () => {
  const path = fixturePath("XAUUSD_M15_SYNTHETIC_EMPTY.csv");
  const { io, getOut, getErr } = captureIo();
  const code = runImportValidateCli(["--file", path, "--symbol", "XAUUSD", "--timeframe", "M15"], io);
  assert.notEqual(code, 0);
  assert.equal(getErr(), "");
  assert.match(getOut(), /MANUAL_NO_VALID_ROWS|errors/i);

  const emptySummary = buildSafeSummary(
    {
      kind: "run",
      filePath: "-",
      symbol: "XAUUSD",
      timeframe: "M15",
      format: "auto",
      json: false,
    },
    "",
  );
  assert.equal(emptySummary.ok, false);
  assert.ok(emptySummary.errors.some((e) => e.code === "MANUAL_CSV_EMPTY"));

  const { io: io2, getErr: getErr2 } = captureIo();
  const code2 = runImportValidateCli(
    ["--file", path, "--symbol", "XAUUSD", "--timeframe", "M15"],
    {
      ...io2,
      readFileUtf8: () => "",
    },
  );
  assert.notEqual(code2, 0);
  assert.match(getErr2(), /empty csv/i);
});

test("F. --json parseable, no execution flags, no banned trading tokens", () => {
  const { io, getOut } = captureIo();
  const path = fixturePath("XAUUSD_M15_SYNTHETIC_VALID.csv");
  const code = runImportValidateCli(
    ["--file", path, "--symbol", "XAUUSD", "--timeframe", "M15", "--json"],
    io,
  );
  assert.equal(code, 0);
  const raw = getOut().trim();
  const j = JSON.parse(raw) as Record<string, unknown>;
  assert.equal(j.executionEnabled, false);
  assert.notEqual(j.approved, true);
  const s = raw.toLowerCase();
  assert.equal(s.includes("ordersend"), false);
  assert.equal(s.includes("ctrade"), false);
  assert.equal(Number.isFinite(j.candleCount as number), true);
  assert.notEqual(j.candleCount, Number.NaN);
});

test("G. output does not echo full CSV rows", () => {
  const { io, getOut } = captureIo();
  const path = fixturePath("XAUUSD_M15_SYNTHETIC_VALID.csv");
  const code = runImportValidateCli(
    ["--file", path, "--symbol", "XAUUSD", "--timeframe", "M15", "--json"],
    io,
  );
  assert.equal(code, 0);
  const dangerousRow = "2020.01.02;10:00:00;1900.25;1902.10;1899.40;1901.05;50;0;12";
  assert.equal(getOut().includes(dangerousRow), false);
});
