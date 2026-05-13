/**
 * Parse-only validation for `Mapazapp_TestEA` `backtest_events.csv` (E3.6 contract).
 * No disk, no MT5, no persistence.
 */

export interface BacktestEventsParseError {
  code: string;
  message: string;
  row?: number;
}

export interface BacktestEventsParseWarning {
  code: string;
  message: string;
  row?: number;
}

export interface BacktestEventsParseResult {
  ok: boolean;
  rowCount: number;
  errors: BacktestEventsParseError[];
  warnings: BacktestEventsParseWarning[];
  /** Populated when `bundleContract` option is used — counts of `event_type` per data row. */
  eventTypeCounts?: Record<string, number>;
}

/** Wire values for `bias_direction` / `setup_direction` (E3.6 / EXPORT_CONTRACT). */
export const MAPZ_TESTEA_BIAS_DIRECTIONS = ["bullish", "bearish", "neutral", "unknown", "none"] as const;
export const MAPZ_TESTEA_SETUP_DIRECTIONS = ["long", "short", "none"] as const;

const BIAS_DIR_SET = new Set<string>(MAPZ_TESTEA_BIAS_DIRECTIONS);
const SETUP_DIR_SET = new Set<string>(MAPZ_TESTEA_SETUP_DIRECTIONS);

const BUNDLE_REQUIRED_EVENT_TYPES = [
  "lifecycle_init",
  "skeleton_ready",
  "daily_bias_evaluated",
  "lifecycle_deinit",
] as const;

const SETUP_EVENT_TYPES = ["setup_detected", "setup_allowed", "setup_rejected", "setup_skipped"] as const;

export interface ParseBacktestEventsCsvOptions {
  /**
   * E4.1 bundle validation: require `event_id` / `timestamp`, wire directions,
   * required lifecycle event types, and emit `eventTypeCounts`.
   */
  bundleContract?: boolean;
}

const EVENTS_REQUIRED_HEADERS = [
  "run_id",
  "event_id",
  "timestamp",
  "symbol",
  "event_type",
  "bias_direction",
  "setup_direction",
  "decision",
  "reason",
  "details",
] as const;

/** Supported `event_type` values emitted by Mapazapp_TestEA E3.4.2+ (E3.6 frozen). */
export const MAPZ_TESTEA_SUPPORTED_EVENT_TYPES = [
  "lifecycle_init",
  "skeleton_ready",
  "daily_bias_evaluated",
  "setup_detected",
  "setup_allowed",
  "setup_rejected",
  "setup_skipped",
  "virtual_trade_candidate_created",
  "virtual_trade_entry_filled",
  "virtual_trade_closed",
  "virtual_trade_expired",
  "virtual_trade_ambiguous",
  "virtual_trade_skipped",
  "virtual_trade_unresolved",
  "lifecycle_deinit",
] as const;

/** Supported `decision` tokens from TestEA + contract doc (E3.6). */
export const MAPZ_TESTEA_SUPPORTED_DECISIONS = [
  "bias_recorded",
  "setup_candidate_allowed",
  "rejected_by_daily_bias",
  "skipped_neutral_bias",
  "missing_bias_context",
  "setup_ignored",
  "lifecycle",
  "detected",
  "ok",
  "noop",
  "created",
  "filled",
  "closed",
  "expired",
  "ambiguous",
  "skipped",
  "unresolved",
] as const;

const EVENT_TYPES = new Set<string>(MAPZ_TESTEA_SUPPORTED_EVENT_TYPES);
const DECISIONS = new Set<string>(MAPZ_TESTEA_SUPPORTED_DECISIONS);

function parseCsvLine(line: string): { cells: string[]; unbalancedQuote: boolean } {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuote = !inQuote;
    } else if (c === "," && !inQuote) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return { cells: out.map((s) => s.replace(/^"|"$/g, "")), unbalancedQuote: inQuote };
}

function splitCsvRows(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0);
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function resolveEventsHeaderIndex(headerCells: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerCells.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (!map.has(key)) map.set(key, i);
  });
  return map;
}

/**
 * Validates header + data rows for TestEA evidence events CSV.
 * Unknown `event_type` / `decision` → error (contract freeze).
 */
export function parseBacktestEventsCsv(
  csvText: string,
  options?: ParseBacktestEventsCsvOptions,
): BacktestEventsParseResult {
  const errors: BacktestEventsParseError[] = [];
  const warnings: BacktestEventsParseWarning[] = [];
  const bundleContract = options?.bundleContract === true;
  const eventTypeCounts: Record<string, number> = {};

  const rows = splitCsvRows(csvText);
  if (rows.length < 1) {
    errors.push({ code: "EVENTS_CSV_EMPTY", message: "CSV must include a header row." });
    return { ok: false, rowCount: 0, errors, warnings };
  }

  const headerParsed = parseCsvLine(rows[0]!);
  if (headerParsed.unbalancedQuote) {
    errors.push({ code: "EVENTS_CSV_UNBALANCED_QUOTE", message: "Unbalanced double-quote in header row." });
    return { ok: false, rowCount: 0, errors, warnings };
  }
  const headerCells = headerParsed.cells;
  const col = resolveEventsHeaderIndex(headerCells);

  for (const req of EVENTS_REQUIRED_HEADERS) {
    if (!col.has(req)) {
      errors.push({
        code: "EVENTS_CSV_MISSING_COLUMN",
        message: `Missing required column "${req}" (normalized header).`,
      });
    }
  }
  if (errors.length > 0) {
    return { ok: false, rowCount: 0, errors, warnings };
  }

  let dataRows = 0;
  for (let r = 1; r < rows.length; r++) {
    const rowNum = r + 1;
    const rowParsed = parseCsvLine(rows[r]!);
    if (rowParsed.unbalancedQuote) {
      errors.push({ code: "EVENTS_CSV_UNBALANCED_QUOTE", message: "Unbalanced double-quote in data row.", row: rowNum });
      continue;
    }
    const cells = rowParsed.cells;
    if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;
    if (cells.every((c) => c.trim() === "")) continue;
    dataRows++;

    const pick = (name: (typeof EVENTS_REQUIRED_HEADERS)[number]): string => {
      const idx = col.get(name);
      if (idx === undefined) return "";
      return cells[idx] ?? "";
    };

    const eventType = pick("event_type").trim();
    const decision = pick("decision").trim();
    if (!eventType) {
      errors.push({ code: "EVENTS_ROW_EVENT_TYPE", message: "Missing event_type", row: rowNum });
    } else if (!EVENT_TYPES.has(eventType)) {
      errors.push({
        code: "EVENTS_ROW_EVENT_TYPE_UNKNOWN",
        message: `Unsupported event_type: ${eventType}`,
        row: rowNum,
      });
    } else {
      eventTypeCounts[eventType] = (eventTypeCounts[eventType] ?? 0) + 1;
    }
    if (!decision) {
      errors.push({ code: "EVENTS_ROW_DECISION", message: "Missing decision", row: rowNum });
    } else if (!DECISIONS.has(decision)) {
      errors.push({
        code: "EVENTS_ROW_DECISION_UNKNOWN",
        message: `Unsupported decision: ${decision}`,
        row: rowNum,
      });
    }

    const details = pick("details");
    const dLower = details.toLowerCase();
    if (dLower.includes("c:\\users") || dLower.includes("\\users\\") || /\/home\/[^/\s]+/i.test(details)) {
      warnings.push({
        code: "EVENTS_DETAILS_POSSIBLE_PATH_LEAK",
        message: "details resembles a local user path; sanitize exports",
        row: rowNum,
      });
    }

    if (bundleContract) {
      const evId = pick("event_id").trim();
      const ts = pick("timestamp").trim();
      if (!evId) {
        errors.push({ code: "EVENTS_ROW_EVENT_ID", message: "Missing event_id", row: rowNum });
      }
      if (!ts) {
        errors.push({ code: "EVENTS_ROW_TIMESTAMP", message: "Missing timestamp", row: rowNum });
      }
      const biasRaw = pick("bias_direction").trim().toLowerCase();
      if (!BIAS_DIR_SET.has(biasRaw)) {
        errors.push({
          code: "EVENTS_ROW_BIAS_DIRECTION_UNKNOWN",
          message: `Unsupported bias_direction: ${pick("bias_direction").trim()}`,
          row: rowNum,
        });
      }
      const setupRaw = pick("setup_direction").trim().toLowerCase();
      if (!SETUP_DIR_SET.has(setupRaw)) {
        errors.push({
          code: "EVENTS_ROW_SETUP_DIRECTION_UNKNOWN",
          message: `Unsupported setup_direction: ${pick("setup_direction").trim()}`,
          row: rowNum,
        });
      }
    }
  }

  if (bundleContract && errors.length === 0) {
    for (const req of BUNDLE_REQUIRED_EVENT_TYPES) {
      if ((eventTypeCounts[req] ?? 0) < 1) {
        errors.push({
          code: "EVENTS_BUNDLE_MISSING_EVENT_TYPE",
          message: `Bundle contract requires at least one row with event_type "${req}"`,
        });
      }
    }
    const hasAnySetup = SETUP_EVENT_TYPES.some((t) => (eventTypeCounts[t] ?? 0) > 0);
    if (!hasAnySetup) {
      warnings.push({
        code: "BUNDLE_NO_SETUP_EVENTS",
        message: "No setup_detected / setup_allowed / setup_rejected / setup_skipped rows — may be OK for very short ranges",
      });
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    rowCount: dataRows,
    errors,
    warnings,
    ...(bundleContract ? { eventTypeCounts } : {}),
  };
}
