/**
 * E5.6.1 — CLI tests for mapazapp:testea-ambiguity-sensitivity (no MT5).
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  findTestEaBundleRootDirs,
  runMapazappTesteaAmbiguitySensitivityCli,
  type AmbiguitySensitivityCliIo,
} from "./mapazapp-testea-ambiguity-sensitivity";

const SUMMARY = `{
  "schema_version": "backtest_ea_v1",
  "run_id": "RUN_CLI",
  "effective_run_id": "RUN_CLI",
  "campaign_id": "C",
  "parameter_set_id": "P1",
  "strategy_id": "IFVG_X",
  "symbol": "XAUUSD",
  "optimization_parameters": { "virtual_min_trade_fvg_points": 10 }
}`;

const TRADES = [
  "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,symbol,strategy_id,parameter_set_id,outcome",
  "t1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,1,1,2,XAUUSD,IFVG_X,P1,win",
  "t2,BUY,2026-01-02T10:00:00Z,2026-01-02T11:00:00Z,1,1,0,XAUUSD,IFVG_X,P1,ambiguous",
].join("\n");

function realIo(capture?: { out: string; err: string; csv?: Map<string, string> }): AmbiguitySensitivityCliIo {
  const cap = capture ?? { out: "", err: "", csv: new Map() };
  return {
    stdoutWrite: (s) => {
      cap.out += s;
    },
    stderrWrite: (s) => {
      cap.err += s;
    },
    existsSync,
    readFileUtf8: (p) => readFileSync(p, "utf8"),
    readdirSync,
    writeFileUtf8: (p, d) => {
      cap.csv?.set(p, d);
      writeFileSync(p, d, "utf8");
    },
  };
}

test("CLI help exits 0", () => {
  const cap = { out: "", err: "" };
  const io: AmbiguitySensitivityCliIo = {
    stdoutWrite: (s) => {
      cap.out += s;
    },
    stderrWrite: (s) => {
      cap.err += s;
    },
    existsSync: () => false,
    readFileUtf8: () => "",
    readdirSync: () => [],
    writeFileUtf8: () => {},
  };
  const code = runMapazappTesteaAmbiguitySensitivityCli(["--help"], io);
  assert.equal(code, 0);
  assert.match(cap.out, /ambiguity-sensitivity/);
});

test("CLI JSON includes all modes", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-amb-"));
  const cap = { out: "", err: "", csv: new Map<string, string>() };
  try {
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY, "utf8");
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES, "utf8");
    const code = runMapazappTesteaAmbiguitySensitivityCli(["--bundle", dir, "--json", "--mode", "all"], realIo(cap));
    assert.equal(code, 0);
    const j = JSON.parse(cap.out) as { rows: { mode: string }[] };
    const modes = new Set(j.rows.map((r) => r.mode));
    assert.ok(modes.has("neutral_zero"));
    assert.ok(modes.has("conservative_loss"));
    assert.ok(modes.has("skip_ambiguous"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI recursive search finds nested bundle", () => {
  const root = mkdtempSync(join(tmpdir(), "mzp-amb-walk-"));
  const cap = { out: "", err: "", csv: new Map<string, string>() };
  try {
    const leaf = join(root, "Mapazapp", "TestEA", "E55", "SET01");
    mkdirSync(leaf, { recursive: true });
    writeFileSync(join(leaf, "backtest_summary.json"), SUMMARY, "utf8");
    writeFileSync(join(leaf, "backtest_trades.csv"), TRADES, "utf8");
    const code = runMapazappTesteaAmbiguitySensitivityCli(
      ["--search-root", root, "--campaign-folder", "E55", "--json", "--mode", "neutral_zero"],
      realIo(cap),
    );
    assert.equal(code, 0);
    const j = JSON.parse(cap.out) as { rows: unknown[] };
    assert.ok(j.rows.length >= 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("incomplete bundle skipped without strict", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-amb-bad-"));
  const cap = { out: "", err: "", csv: new Map<string, string>() };
  try {
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY, "utf8");
    const code = runMapazappTesteaAmbiguitySensitivityCli(["--bundle", dir, "--json"], realIo(cap));
    assert.equal(code, 1);
    assert.match(cap.err + cap.out, /skip:|no bundle produced rows/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("strict fails on bad bundle", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-amb-bad2-"));
  const cap = { out: "", err: "", csv: new Map<string, string>() };
  try {
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY, "utf8");
    const code = runMapazappTesteaAmbiguitySensitivityCli(["--bundle", dir, "--strict", "--json"], realIo(cap));
    assert.equal(code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("csv-output writes file", () => {
  const dir = mkdtempSync(join(tmpdir(), "mzp-amb-csv-"));
  const cap = { out: "", err: "", csv: new Map<string, string>() };
  try {
    writeFileSync(join(dir, "backtest_summary.json"), SUMMARY, "utf8");
    writeFileSync(join(dir, "backtest_trades.csv"), TRADES, "utf8");
    const outPath = join(dir, "out.csv");
    const code = runMapazappTesteaAmbiguitySensitivityCli(
      ["--bundle", dir, "--csv-output", outPath, "--mode", "neutral_zero"],
      realIo(cap),
    );
    assert.equal(code, 0);
    assert.ok(readFileSync(outPath, "utf8").includes("neutral_zero"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findTestEaBundleRootDirs respects campaign token", () => {
  const root = mkdtempSync(join(tmpdir(), "mzp-find-"));
  try {
    const good = join(root, "x", "Mapazapp", "TestEA", "E55", "b1");
    const bad = join(root, "y", "Mapazapp", "TestEA", "E99", "b2");
    for (const d of [good, bad]) {
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, "backtest_summary.json"), SUMMARY, "utf8");
      writeFileSync(join(d, "backtest_trades.csv"), TRADES, "utf8");
    }
    const io = { existsSync, readdirSync };
    const dirs = findTestEaBundleRootDirs(root, io, { campaignFolderToken: "E55" });
    assert.ok(dirs.some((p) => p.replace(/\\/g, "/").includes("E55")));
    assert.ok(!dirs.some((p) => p.replace(/\\/g, "/").includes("E99")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
