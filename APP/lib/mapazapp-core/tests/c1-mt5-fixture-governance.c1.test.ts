import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importManualCandleDataset } from "../src/manual-candle-dataset-importer";

/**
 * C1 — Formal MT5-shaped fixture governance (synthetic files under tests/fixtures/mt5).
 * Uses existing `importManualCandleDataset` only; no production/parser edits.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_DIR = join(__dirname, "fixtures", "mt5");

const baseInput = {
  canonicalSymbol: "XAUUSD",
  brokerSymbol: "XAUUSD.synth",
  timeframe: "M15" as const,
  datasetSplit: "unknown" as const,
  sourceName: "c1-mt5-fixture-governance",
};

function loadFixtureUtf8(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

const OPERATIONAL_TOKENS_RE =
  /executionEnabled|autoApproval|sendToMt5|canAutoExecute|registryMutationAllowed/i;

function assertImportJsonHasNoOperationalTokens(obj: unknown): void {
  expect(OPERATIONAL_TOKENS_RE.test(JSON.stringify(obj))).toBe(false);
}

function assertCandlesFinite(candles: { time: number; open: number; high: number; low: number; close: number }[]): void {
  for (const c of candles) {
    for (const [k, v] of Object.entries(c)) {
      if (typeof v === "number") {
        expect(Number.isFinite(v), `${k} must be finite`).toBe(true);
      }
    }
  }
}

describe("C1 MT5 synthetic fixture governance", () => {
  it("A. Fixture README exists and states synthetic / non-history / small / no large commits", () => {
    const readme = readFileSync(join(FIXTURE_DIR, "README.md"), "utf8");
    const lower = readme.toLowerCase();
    expect(lower.length).toBeGreaterThan(0);
    expect(lower).toContain("synthetic");
    expect(lower).toContain("not real market history");
    expect(lower).toContain("no account data");
    expect(lower).toContain("committed fixtures are intentionally small");
    expect(lower).toContain("large mt5 exports must not be committed");
  });

  it("B. Valid fixture parses — candles > 0, finite, deterministic, no operational tokens", () => {
    const csvText = loadFixtureUtf8("XAUUSD_M15_SYNTHETIC_VALID.csv");
    const a = importManualCandleDataset({ ...baseInput, csvText });
    const b = importManualCandleDataset({ ...baseInput, csvText });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.dataset?.detectedFormat).toBe("mt5_rates_like");
    expect(a.dataset?.candles.length).toBeGreaterThan(0);
    assertCandlesFinite(a.dataset!.candles);
    assertImportJsonHasNoOperationalTokens(a);
    expect(JSON.stringify(a.dataset!.candles)).toBe(JSON.stringify(b.dataset!.candles));
  });

  it("C. Duplicate timestamp fixture — importer emits duplicate warning (contract: warnings, import may succeed)", () => {
    const csvText = loadFixtureUtf8("XAUUSD_M15_SYNTHETIC_DUPLICATE_TIMESTAMP.csv");
    const r = importManualCandleDataset({ ...baseInput, csvText });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "MANUAL_DUPLICATE_TIMESTAMPS")).toBe(true);
    expect(r.validationSummary.duplicateTimestampCount).toBeGreaterThan(0);
    assertCandlesFinite(r.dataset!.candles);
    assertImportJsonHasNoOperationalTokens(r);
  });

  it("D. Invalid OHLC fixture — no successful dataset (rows skipped / MANUAL_NO_VALID_ROWS)", () => {
    const csvText = loadFixtureUtf8("XAUUSD_M15_SYNTHETIC_INVALID_OHLC.csv");
    const r = importManualCandleDataset({ ...baseInput, csvText });
    expect(r.ok).toBe(false);
    expect(r.dataset).toBeNull();
    expect(r.errors.some((e) => e.code === "MANUAL_NO_VALID_ROWS")).toBe(true);
    assertImportJsonHasNoOperationalTokens(r);
  });

  it("E. Empty fixture — header only produces no valid candles; bare empty CSV errors", () => {
    const headerOnly = loadFixtureUtf8("XAUUSD_M15_SYNTHETIC_EMPTY.csv");
    const r1 = importManualCandleDataset({ ...baseInput, csvText: headerOnly });
    expect(r1.ok).toBe(false);
    expect(r1.dataset).toBeNull();
    expect(r1.errors.some((e) => e.code === "MANUAL_NO_VALID_ROWS")).toBe(true);

    const r2 = importManualCandleDataset({ ...baseInput, csvText: "" });
    expect(r2.ok).toBe(false);
    expect(r2.errors.some((e) => e.code === "MANUAL_CSV_EMPTY")).toBe(true);
  });

  it("F. fixtures/mt5 — size cap, extensions, SYNTHETIC CSV names, safe filenames", () => {
    const maxBytes = 20 * 1024;
    const bannedNameSubstrings = ["live", "real", "broker", "account", "export-real"];
    const entries = readdirSync(FIXTURE_DIR);
    for (const name of entries) {
      const full = join(FIXTURE_DIR, name);
      const st = statSync(full);
      expect(st.size, `${name} must stay small`).toBeLessThanOrEqual(maxBytes);
      const lower = name.toLowerCase();
      if (lower.endsWith(".csv")) {
        expect(name.includes("SYNTHETIC"), `${name} must include SYNTHETIC`).toBe(true);
      }
      const ext = lower.endsWith(".csv") ? ".csv" : lower.endsWith(".md") ? ".md" : "";
      expect(ext, `${name} must be .csv or .md`).not.toBe("");
      for (const ban of bannedNameSubstrings) {
        expect(lower.includes(ban), `${name} must not suggest ${ban}`).toBe(false);
      }
    }
  });

  it("G. CSV fixtures — no private/account-like tokens in cell data", () => {
    const bannedInCsv =
      /\b(real\s+account|live\s+account)\b|\b(balance|equity|email|phone)\b|\b(login|server)\b|\baccount\b/i;
    const csvFiles = readdirSync(FIXTURE_DIR).filter((n) => n.toLowerCase().endsWith(".csv"));
    expect(csvFiles.length).toBeGreaterThan(0);
    for (const name of csvFiles) {
      const text = loadFixtureUtf8(name);
      expect(bannedInCsv.test(text), `${name} must not contain sensitive tokens`).toBe(false);
    }
  });
});
