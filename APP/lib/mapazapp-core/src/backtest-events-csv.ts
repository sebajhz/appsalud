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
export function parseBacktestEventsCsv(csvText: string): BacktestEventsParseResult {
  const errors: BacktestEventsParseError[] = [];
  const warnings: BacktestEventsParseWarning[] = [];

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
  }

  const ok = errors.length === 0;
  return { ok, rowCount: dataRows, errors, warnings };
}
