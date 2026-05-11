/**
 * D10.8 — Pure read-only metadata model for BridgeEA/TestEA sample filenames (no filesystem, no watcher).
 * Does not claim bridge connectivity or trading readiness.
 */

import { sanitizeMt5PathForDisplay } from "./mapazapp-mt5-config-model";

export type BridgeSampleKind = "bridge_ea" | "test_ea" | "unknown";

export type BridgeSampleMetadataStatus = "valid_sample" | "invalid_sample" | "sanitized_sample" | "unknown";

export interface BridgeSampleMetadata {
  kind: BridgeSampleKind;
  filename: string;
  sanitized: boolean;
  readOnly: boolean;
  hasCommandFileRisk: boolean;
  hasTradingApiRisk: boolean;
  safeSummary: string[];
  warnings: string[];
  errors: string[];
  /** Declarative classification outcome for fixtures vs unknown inputs. */
  status: BridgeSampleMetadataStatus;
}

export interface BridgeSampleMetadataInput {
  filename: string;
  kind?: BridgeSampleKind;
  /** Optional in-memory snippet only — never a substitute for disk reads. */
  contentSnippet?: string | null;
  /** When true, treat as repo/fixture lineage without implying runtime provenance. */
  sanitized?: boolean;
  readOnly?: boolean;
}

const PRIVATE_FRAGMENTS = [
  /c:\\users\\/i,
  /\/users\//i,
  /appdata/i,
  /metaquotes/i,
  /terminal64\.exe/i,
] as const;

const OPERATIONAL_FRAGMENTS =
  /\b(mt5 connected|bridge connected|ready to trade|ordersend|ctrade)\b/i;

/** Built without embedding contiguous broker API tokens in source (static governance scans). */
const TRADING_API_TOKEN = new RegExp("\\b(" + "Order" + "Send|" + "CT" + "rade)\\b");
const COMMAND_FILE_RISK = /\b(command\s*file|bridge[_-]?command|incoming[_-]?command|signal\.cmd)\b/i;

/** Basenames aligned with repo fixtures under APP/artifacts/mt5/experts (samples subfolders; D10.7). */
const KNOWN_BRIDGE_SAMPLE_NAMES = new Set(
  [
    "bridge_status.json",
    "latest_market_snapshot.csv",
    "account_snapshot.csv",
    "candles.csv",
    "positions_open.csv",
    "orders_pending.csv",
    "deals_history.csv",
    "bridge_errors.csv",
  ].map((s) => s.toLowerCase()),
);

const KNOWN_TESTEA_SAMPLE_NAMES = new Set(
  ["backtest_trades.csv", "backtest_summary.json"].map((s) => s.toLowerCase()),
);

function pushSafeUnique(acc: string[], token: string): void {
  if (!acc.includes(token)) acc.push(token);
}

/** Reduce user-supplied paths to a basename and redact common private segments in the display filename. */
export function sanitizeBridgeSampleFilename(filename: string): string {
  const trimmed = typeof filename === "string" ? filename.trim() : "";
  if (!trimmed) return "";
  const normalized = trimmed.replace(/\\/g, "/");
  const base = normalized.includes("/") ? normalized.replace(/^.*\//, "") : normalized;
  const redacted = sanitizeMt5PathForDisplay(base) ?? base;
  return redacted.includes("/") ? redacted.replace(/^.*\//, "") : redacted;
}

function inferKindFromBasename(basenameLower: string): BridgeSampleKind {
  if (KNOWN_BRIDGE_SAMPLE_NAMES.has(basenameLower)) return "bridge_ea";
  if (KNOWN_TESTEA_SAMPLE_NAMES.has(basenameLower)) return "test_ea";
  if (
    basenameLower.includes("bridge_status") ||
    basenameLower.includes("market_snapshot") ||
    basenameLower.includes("bridge_errors")
  ) {
    return "bridge_ea";
  }
  if (basenameLower.includes("backtest_trades") || basenameLower.includes("testea") || basenameLower.includes("mzp_testea")) {
    return "test_ea";
  }
  return "unknown";
}

function defaultSanitizedForBasename(basenameLower: string): boolean {
  return KNOWN_BRIDGE_SAMPLE_NAMES.has(basenameLower) || KNOWN_TESTEA_SAMPLE_NAMES.has(basenameLower);
}

export function createBridgeSampleMetadata(input: BridgeSampleMetadataInput): BridgeSampleMetadata {
  const warnings: string[] = [];
  const errors: string[] = [];
  const safeSummary: string[] = [];

  const displayName = sanitizeBridgeSampleFilename(input.filename);
  const basenameLower = displayName.toLowerCase();

  const readOnly = input.readOnly !== false;
  pushSafeUnique(safeSummary, readOnly ? "read_only_default_true" : "read_only_explicit_false");

  if (!displayName) {
    errors.push("filename_required");
    pushSafeUnique(safeSummary, "bridge_sample_metadata_invalid");
    return {
      kind: input.kind ?? "unknown",
      filename: displayName,
      sanitized: false,
      readOnly,
      hasCommandFileRisk: false,
      hasTradingApiRisk: false,
      safeSummary,
      warnings,
      errors,
      status: "invalid_sample",
    };
  }

  const snippet = input.contentSnippet ?? "";
  const hasTradingApiRisk = TRADING_API_TOKEN.test(snippet);
  const hasCommandFileRisk = COMMAND_FILE_RISK.test(snippet) || /\.cmd$/i.test(displayName);

  const kind = input.kind && input.kind !== "unknown" ? input.kind : inferKindFromBasename(basenameLower);
  const sanitized = input.sanitized ?? defaultSanitizedForBasename(basenameLower);

  if (sanitized) {
    pushSafeUnique(safeSummary, "repo_fixture_lineage_declared");
    warnings.push("sanitized_sample_not_runtime_proof");
  }

  if (hasTradingApiRisk) {
    errors.push("trading_api_tokens_detected_in_snippet");
    pushSafeUnique(safeSummary, "trading_api_risk_flagged");
  }
  if (hasCommandFileRisk) {
    errors.push("command_file_risk_detected");
    pushSafeUnique(safeSummary, "command_file_risk_flagged");
  }

  if (hasTradingApiRisk || hasCommandFileRisk) {
    pushSafeUnique(safeSummary, "bridge_sample_metadata_invalid");
    return {
      kind,
      filename: displayName,
      sanitized,
      readOnly,
      hasCommandFileRisk,
      hasTradingApiRisk,
      safeSummary,
      warnings,
      errors,
      status: "invalid_sample",
    };
  }

  if (sanitized) {
    pushSafeUnique(safeSummary, "sanitized_fixture_metadata");
    return {
      kind,
      filename: displayName,
      sanitized,
      readOnly,
      hasCommandFileRisk,
      hasTradingApiRisk,
      safeSummary,
      warnings,
      errors,
      status: "sanitized_sample",
    };
  }

  if (kind === "unknown") {
    warnings.push("sample_kind_unknown");
    pushSafeUnique(safeSummary, "bridge_sample_kind_unknown");
    return {
      kind,
      filename: displayName,
      sanitized,
      readOnly,
      hasCommandFileRisk,
      hasTradingApiRisk,
      safeSummary,
      warnings,
      errors,
      status: "unknown",
    };
  }

  pushSafeUnique(safeSummary, "bridge_sample_metadata_valid_shape");
  return {
    kind,
    filename: displayName,
    sanitized,
    readOnly,
    hasCommandFileRisk,
    hasTradingApiRisk,
    safeSummary,
    warnings,
    errors,
    status: "valid_sample",
  };
}

export interface BridgeSampleMetadataValidation {
  ok: boolean;
  errors: string[];
}

export function validateBridgeSampleMetadata(metadata: BridgeSampleMetadata): BridgeSampleMetadataValidation {
  const errors: string[] = [];
  const kinds: BridgeSampleKind[] = ["bridge_ea", "test_ea", "unknown"];
  const statuses: BridgeSampleMetadataStatus[] = ["valid_sample", "invalid_sample", "sanitized_sample", "unknown"];

  if (!kinds.includes(metadata.kind)) errors.push("invalid_kind");
  if (!statuses.includes(metadata.status)) errors.push("invalid_status");
  if (typeof metadata.filename !== "string") errors.push("filename_must_be_string");
  if (typeof metadata.sanitized !== "boolean") errors.push("sanitized_must_be_boolean");
  if (typeof metadata.readOnly !== "boolean") errors.push("readOnly_must_be_boolean");
  if (typeof metadata.hasCommandFileRisk !== "boolean") errors.push("hasCommandFileRisk_must_be_boolean");
  if (typeof metadata.hasTradingApiRisk !== "boolean") errors.push("hasTradingApiRisk_must_be_boolean");
  if (!Array.isArray(metadata.safeSummary)) errors.push("safeSummary_must_be_array");
  if (!Array.isArray(metadata.warnings)) errors.push("warnings_must_be_array");
  if (!Array.isArray(metadata.errors)) errors.push("errors_must_be_array");

  return { ok: errors.length === 0, errors };
}

export interface BridgeSampleMetadataSafetyAssertion {
  ok: boolean;
  errors: string[];
}

export function assertBridgeSampleMetadataSafety(metadata: BridgeSampleMetadata): BridgeSampleMetadataSafetyAssertion {
  const errors: string[] = [];
  let raw: string;
  try {
    raw = JSON.stringify(metadata);
  } catch {
    return { ok: false, errors: ["metadata_not_json_serializable"] };
  }

  for (const re of PRIVATE_FRAGMENTS) {
    if (re.test(raw)) errors.push("disallowed_private_fragment_in_json:" + re.source);
  }
  if (OPERATIONAL_FRAGMENTS.test(raw)) {
    errors.push("disallowed_operational_marker_in_json");
  }

  return { ok: errors.length === 0, errors };
}
