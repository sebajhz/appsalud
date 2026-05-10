import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  scanExportSamplePrivacy,
  validateBridgeEaExportSample,
  validateExportSampleBundle,
  validateTestEaExportSample,
} from "../src/export-sample-validation";
import type { ExportSampleFileText } from "../src/export-sample-validation-types";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

/**
 * C2 — BridgeEA/TestEA export sample governance (on-disk fixtures under tests/fixtures/mt5-export-samples).
 * Uses existing validators only; no production edits.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_ROOT = join(__dirname, "fixtures", "mt5-export-samples");

const testEaImportOpts = {
  importOptions: {
    strategyId: "MZP_IFVG_ZONE_REACTION_V1" as const,
    parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003" as const,
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSDm",
    datasetSplit: "validation" as const,
    sourceType: "mapazapp_testea_csv" as const,
    runId: "C2_EXPORT_SAMPLE_GOV",
  },
};

const FORBIDDEN_COMMAND_FILES = new Set([
  "commands.csv",
  "commands.json",
  "orders.csv",
  "orders.json",
  "mt5_commands.csv",
  "mt5_commands.json",
]);

function loadFlatBundle(subDir: string): ExportSampleFileText[] {
  const dir = join(FIXTURE_ROOT, subDir);
  const names = readdirSync(dir).filter((n) => !n.startsWith(".") && n !== "README.md");
  return names.map((fileName) => ({
    fileName,
    text: readFileSync(join(dir, fileName), "utf8"),
  }));
}

function listFilesRecursive(root: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, ent.name);
    if (ent.isDirectory()) out.push(...listFilesRecursive(p));
    else out.push(p);
  }
  return out;
}

const MQL5_TRADE_API_RE = /\b(OrderSend|CTrade)\b/i;
const JSON_EXEC_TRUE_RE = /["']?executionEnabled["']?\s*[:=]\s*true/i;

describe("C2 BridgeEA/TestEA export sample governance", () => {
  it("A. README governance — synthetic/sanitized, no real account data, export-only, no execution", () => {
    const readme = readFileSync(join(FIXTURE_ROOT, "README.md"), "utf8");
    const lower = readme.toLowerCase();
    expect(lower).toContain("synthetic");
    expect(lower).toContain("sanitized");
    expect(lower).toContain("not real broker or account data");
    expect(lower).toContain("no large exports");
    expect(lower).toContain("real mt5 exports must stay outside the repo");
    expect(lower).toContain("export-only");
    expect(lower).toContain("execution");
  });

  it("B. Valid BridgeEA sanitized bundle from disk — validators accept; candles parse; no trade API tokens", () => {
    const files = loadFlatBundle("bridge-valid-sanitized");
    const strictPrivacy = scanExportSamplePrivacy(files, "strict");
    expect(strictPrivacy.passed).toBe(true);

    const bridge = validateBridgeEaExportSample({
      bundleKind: "bridge_ea_export_bundle",
      files,
      expectedCanonicalSymbol: "XAUUSD",
      expectedTimeframe: "M15",
      symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
      privacyMode: "relaxed",
    });
    expect(bridge.statusJsonOk).toBe(true);
    expect(bridge.candlesManualImport?.ok).toBe(true);
    expect(bridge.candlesManualImport?.dataset?.validRowCount).toBe(2);
    expect(bridge.marketSnapshotOk).toBe(true);
    expect(bridge.accountSnapshotOk).toBe(true);

    const bundle = validateExportSampleBundle(
      {
        bundleKind: "bridge_ea_export_bundle",
        files,
        expectedCanonicalSymbol: "XAUUSD",
        expectedTimeframe: "M15",
        symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
        privacyMode: "strict",
      },
      testEaImportOpts,
    );
    expect(bundle.status).not.toBe("invalid");
    expect(bundle.privacy.passed).toBe(true);
    expect(bundle.executionEnabled).toBe(false);

    const blob = JSON.stringify(files);
    expect(MQL5_TRADE_API_RE.test(blob)).toBe(false);
    expect(JSON_EXEC_TRUE_RE.test(blob)).toBe(false);
  });

  it("C. Privacy-violation BridgeEA bundle — strict bundle validation fails privacy check", () => {
    const files = loadFlatBundle("bridge-privacy-violation");
    const privacy = scanExportSamplePrivacy(files, "strict");
    expect(privacy.passed).toBe(false);
    expect(privacy.findings.some((f) => f.code === "PRIVACY_ACCOUNT_LOGIN_LONG")).toBe(true);
    expect(privacy.findings.some((f) => f.code === "PRIVACY_ACCOUNT_SERVER_SENSITIVE")).toBe(true);

    const bundle = validateExportSampleBundle(
      {
        bundleKind: "bridge_ea_export_bundle",
        files,
        expectedCanonicalSymbol: "XAUUSD",
        expectedTimeframe: "M15",
        symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
        privacyMode: "strict",
      },
      testEaImportOpts,
    );
    expect(bundle.status).toBe("invalid");
    expect(bundle.privacy.passed).toBe(false);
    expect(bundle.diagnostics.some((d) => d.code === "PRIVACY_CHECK_FAILED")).toBe(true);
  });

  it("D. Valid TestEA sanitized bundle from disk — trades + summary contract; strict privacy passes", () => {
    const files = loadFlatBundle("testea-valid-sanitized");
    expect(scanExportSamplePrivacy(files, "strict").passed).toBe(true);

    const r = validateTestEaExportSample(
      {
        bundleKind: "testea_export_bundle",
        files,
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.status === "valid" || r.status === "valid_with_warnings").toBe(true);
    expect(r.tradesImport?.ok).toBe(true);
    expect(r.tradeCount).toBe(1);
    expect(r.summaryOk).toBe(true);
    expect(r.summaryJson?.["execution_mode"]).toBe("virtual_export_only");
    expect(r.summaryJson?.["live_trading_enabled"]).toBe(false);

    const blob = JSON.stringify(files);
    expect(MQL5_TRADE_API_RE.test(blob)).toBe(false);
  });

  it("E. TestEA invalid live flag bundle — must not validate as safe export sample", () => {
    const files = loadFlatBundle("testea-privacy-violation");
    const r = validateTestEaExportSample(
      {
        bundleKind: "testea_export_bundle",
        files,
        privacyMode: "relaxed",
      },
      testEaImportOpts,
    );
    expect(r.status).toBe("invalid");
    expect(r.summaryOk).toBe(false);
    expect(r.diagnostics.some((d) => d.code === "TESTEA_SUMMARY_LIVE_FLAG")).toBe(true);
  });

  it("F. Export-only posture — no command/order routing files; fixtures omit MQL5 trade APIs", () => {
    const paths = listFilesRecursive(FIXTURE_ROOT);
    for (const p of paths) {
      const base = p.split(/[/\\]/).pop() ?? "";
      expect(FORBIDDEN_COMMAND_FILES.has(base.toLowerCase()), base).toBe(false);
    }
    let merged = "";
    for (const p of paths) {
      if (p.endsWith(".md")) continue;
      merged += readFileSync(p, "utf8");
    }
    expect(MQL5_TRADE_API_RE.test(merged)).toBe(false);
  });

  it("G. File governance — size, extensions, expected subdirs, contract filenames", () => {
    const maxBytes = 20 * 1024;
    const allowedExt = new Set([".md", ".json", ".csv"]);
    const expectedDirs = new Set([
      "bridge-valid-sanitized",
      "bridge-privacy-violation",
      "testea-valid-sanitized",
      "testea-privacy-violation",
    ]);
    const top = readdirSync(FIXTURE_ROOT, { withFileTypes: true });
    const dirNames = top.filter((e) => e.isDirectory()).map((e) => e.name);
    expect(new Set(dirNames)).toEqual(expectedDirs);

    for (const abs of listFilesRecursive(FIXTURE_ROOT)) {
      const st = statSync(abs);
      expect(st.size).toBeLessThanOrEqual(maxBytes);
      const lower = abs.toLowerCase();
      const ext = lower.match(/\.[^./\\]+$/)?.[0] ?? "";
      expect(allowedExt.has(ext), abs).toBe(true);
    }
  });

  it("H. Valid sanitized samples — no live-broker leakage patterns; strict privacy passes", () => {
    const safeDirs = ["bridge-valid-sanitized", "testea-valid-sanitized"] as const;
    const leakageRe = /ICMarkets-Live|\b\d{12,}\b(?=[^\d]|$)|@[a-z0-9.-]+\.[a-z]{2,}/i;
    for (const d of safeDirs) {
      const files = loadFlatBundle(d);
      expect(scanExportSamplePrivacy(files, "strict").passed).toBe(true);
      const blob = files.map((f) => f.text).join("\n");
      expect(leakageRe.test(blob), d).toBe(false);
      expect(JSON_EXEC_TRUE_RE.test(blob)).toBe(false);
    }
  });
});
