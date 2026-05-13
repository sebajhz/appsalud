import type { AccountId, BacktestRunId, BacktestTradeId } from "./ids";
import { calculateBacktestSummary } from "./backtest-metrics";
import type {
  BacktestDatasetSplit,
  BacktestImportError,
  BacktestImportResult,
  BacktestImportWarning,
  BacktestRun,
  BacktestSourceType,
  BacktestTrade,
  BacktestTradeDirection,
  ImportBacktestCsvOptions,
  IsoDateTimeString,
} from "./backtest-types";

/** TestEA E5.3 virtual / placeholder outcomes accepted in `backtest_trades.csv`. */
export const MAPZ_TESTEA_TRADE_OUTCOMES = [
  "win",
  "loss",
  "expired_unfilled",
  "expired_open",
  "ambiguous",
  "invalid_risk",
  "unresolved",
] as const;

const OUTCOME_SET = new Set<string>(MAPZ_TESTEA_TRADE_OUTCOMES);

const REQUIRED_HEADERS = [
  "trade_id",
  "direction",
  "entry_time",
  "exit_time",
  "entry_price",
  "exit_price",
  "result_r",
] as const;

/** Maps alternative header names → canonical (post-normalization). */
const HEADER_ALIASES: Record<string, string> = {
  id: "trade_id",
  tradeid: "trade_id",
  result_rr: "result_r",
  resultr: "result_r",
  r: "result_r",
  pnl_r: "result_r",
  rr: "result_r",
  /** Mapazapp_TestEA E3.4.2+ compact header: `entry` column is entry price. */
  entry: "entry_price",
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
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
  return out.map((s) => s.replace(/^"|"$/g, ""));
}

function splitCsvRows(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0);
}

function parseDirection(raw: string, row: number): BacktestTradeDirection | null {
  const u = raw.trim().toUpperCase();
  if (u === "BUY" || u === "LONG") return "BUY";
  if (u === "SELL" || u === "SHORT") return "SELL";
  return null;
}

function parseNumber(raw: string, field: string, row: number): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") return { ok: false, message: `${field} is empty (row ${row})` };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, message: `${field} is not a finite number: ${raw} (row ${row})` };
  return { ok: true, value: n };
}

function resolveHeaderIndex(headerCells: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerCells.forEach((h, i) => {
    let key = normalizeHeader(h);
    key = HEADER_ALIASES[key] ?? key;
    if (!map.has(key)) map.set(key, i);
  });
  const normHeaders = headerCells.map((h) => normalizeHeader(h));
  const idxOf = (name: string): number => normHeaders.indexOf(name);
  // Legacy E3.4.2 compact CSV: single `timestamp` → entry_time / exit_time when missing.
  if (!map.has("entry_time")) {
    const ts = idxOf("timestamp");
    if (ts >= 0) map.set("entry_time", ts);
  }
  if (!map.has("exit_time")) {
    const ts = idxOf("timestamp");
    if (ts >= 0) map.set("exit_time", ts);
  }
  if (!map.has("exit_price") && normHeaders.includes("entry") && map.has("entry_price")) {
    map.set("exit_price", map.get("entry_price")!);
  }
  return map;
}

function pick(
  row: string[],
  col: Map<string, number>,
  name: string,
): string | undefined {
  const idx = col.get(name);
  if (idx === undefined) return undefined;
  return row[idx];
}

/**
 * Pure CSV → trades. Does not read disk, call MT5, or persist.
 * Header row required; snake_case columns as in TestEA-style export (flexible aliases).
 */
export function importBacktestTradesFromCsv(csvText: string, options: ImportBacktestCsvOptions): BacktestImportResult {
  const errors: BacktestImportError[] = [];
  const warnings: BacktestImportWarning[] = [];
  const trades: BacktestTrade[] = [];

  const rows = splitCsvRows(csvText);
  if (rows.length < 1) {
    errors.push({ code: "CSV_EMPTY", message: "CSV must include a header row." });
    return { ok: false, trades: [], errors, warnings };
  }

  let dataRowCount = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = parseCsvLine(rows[r]!);
    if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;
    const allEmpty = cells.every((c) => c.trim() === "");
    if (allEmpty) continue;
    dataRowCount++;
  }

  const headerCells = parseCsvLine(rows[0]!);
  const col = resolveHeaderIndex(headerCells);

  for (const req of REQUIRED_HEADERS) {
    if (!col.has(req)) {
      errors.push({
        code: "CSV_MISSING_COLUMN",
        message: `Missing required column "${req}" (normalized header).`,
      });
    }
  }
  if (errors.length > 0) {
    return { ok: false, trades: [], errors, warnings };
  }

  if (dataRowCount === 0) {
    warnings.push({
      code: "CSV_HEADER_ONLY_NO_TRADE_ROWS",
      message: "CSV contains a header but no trade data rows; nothing imported.",
    });
    return { ok: true, trades: [], errors, warnings };
  }

  let runId = options.runId?.trim();
  if (!runId) {
    runId = `synthetic-run-${options.parameterSetId}-${rows.length - 1}`;
    warnings.push({
      code: "CSV_RUN_ID_SYNTHETIC",
      message: "run_id not provided in options; synthesized run id for import assembly.",
    });
  }

  const importedAt = options.importedAt ?? "1970-01-01T00:00:00.000Z";

  for (let r = 1; r < rows.length; r++) {
    const rowNum = r + 1;
    const cells = parseCsvLine(rows[r]!);
    if (cells.length === 1 && cells[0] === "") continue;

    const tradeIdRaw = pick(cells, col, "trade_id");
    if (!tradeIdRaw?.trim()) {
      errors.push({ code: "CSV_ROW_TRADE_ID", message: "Missing trade_id", row: rowNum });
      continue;
    }

    const dirRaw = pick(cells, col, "direction") ?? "";
    const direction = parseDirection(dirRaw, rowNum);
    if (!direction) {
      errors.push({ code: "CSV_ROW_DIRECTION", message: `Invalid direction: ${dirRaw}`, row: rowNum });
      continue;
    }

    const entryTime = pick(cells, col, "entry_time")?.trim();
    const exitTime = pick(cells, col, "exit_time")?.trim();
    if (!entryTime) {
      errors.push({ code: "CSV_ROW_ENTRY_TIME", message: "Missing entry_time", row: rowNum });
      continue;
    }
    if (!exitTime) {
      errors.push({ code: "CSV_ROW_EXIT_TIME", message: "Missing exit_time", row: rowNum });
      continue;
    }

    const ep = parseNumber(pick(cells, col, "entry_price") ?? "", "entry_price", rowNum);
    const xp = parseNumber(pick(cells, col, "exit_price") ?? "", "exit_price", rowNum);
    const rr = parseNumber(pick(cells, col, "result_r") ?? "", "result_r", rowNum);
    if (!ep.ok) {
      errors.push({ code: "CSV_ROW_NUMERIC", message: ep.message, row: rowNum });
      continue;
    }
    if (!xp.ok) {
      errors.push({ code: "CSV_ROW_NUMERIC", message: xp.message, row: rowNum });
      continue;
    }
    if (!rr.ok) {
      errors.push({ code: "CSV_ROW_NUMERIC", message: rr.message, row: rowNum });
      continue;
    }

    const rowStrategy = pick(cells, col, "strategy_id")?.trim() || options.strategyId;
    const rowPs = pick(cells, col, "parameter_set_id")?.trim() || options.parameterSetId;
    const rowSym = pick(cells, col, "symbol")?.trim() || options.canonicalSymbol;

    if (pick(cells, col, "strategy_id")?.trim() && pick(cells, col, "strategy_id")!.trim() !== options.strategyId) {
      warnings.push({
        code: "CSV_STRATEGY_OVERRIDE",
        message: `Row ${rowNum}: strategy_id in CSV differs from import options (using CSV value).`,
        row: rowNum,
      });
    }
    if (pick(cells, col, "parameter_set_id")?.trim() && pick(cells, col, "parameter_set_id")!.trim() !== options.parameterSetId) {
      warnings.push({
        code: "CSV_PARAMETER_SET_OVERRIDE",
        message: `Row ${rowNum}: parameter_set_id in CSV differs from import options (using CSV value).`,
        row: rowNum,
      });
    }

    let resultMoney = 0;
    const moneyRaw = pick(cells, col, "result_money");
    if (moneyRaw !== undefined && moneyRaw.trim() !== "") {
      const m = parseNumber(moneyRaw, "result_money", rowNum);
      if (!m.ok) {
        warnings.push({ code: "CSV_RESULT_MONEY_INVALID", message: m.message, row: rowNum });
      } else {
        resultMoney = m.value;
      }
    } else {
      warnings.push({
        code: "CSV_RESULT_MONEY_MISSING",
        message: `Row ${rowNum}: result_money missing — defaulted to 0 (R remains source of truth for metrics).`,
        row: rowNum,
      });
    }

    const brokerSymbol = pick(cells, col, "broker_symbol")?.trim() || options.brokerSymbol;
    const accountCell = pick(cells, col, "account_id")?.trim();
    const accountId = (accountCell || options.accountId) as AccountId | undefined;

    const slRaw = pick(cells, col, "sl");
    let sl: number | undefined;
    if (slRaw !== undefined && slRaw.trim() !== "") {
      const p = parseNumber(slRaw, "sl", rowNum);
      if (p.ok) sl = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const tpRaw = pick(cells, col, "tp");
    let tp: number | undefined;
    if (tpRaw !== undefined && tpRaw.trim() !== "") {
      const p = parseNumber(tpRaw, "tp", rowNum);
      if (p.ok) tp = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const zoneId = pick(cells, col, "zone_id")?.trim();
    const exitReason = pick(cells, col, "exit_reason")?.trim();
    const outcomeRaw = pick(cells, col, "outcome")?.trim() ?? "";
    if (outcomeRaw !== "" && !OUTCOME_SET.has(outcomeRaw)) {
      errors.push({
        code: "CSV_ROW_OUTCOME_UNKNOWN",
        message: `Unsupported outcome: ${outcomeRaw}`,
        row: rowNum,
      });
      continue;
    }

    const csvRunId = pick(cells, col, "run_id")?.trim();
    const tradeRunId = (csvRunId || runId) as BacktestRunId;
    if (
      csvRunId &&
      options.runId?.trim() &&
      csvRunId !== options.runId.trim()
    ) {
      warnings.push({
        code: "CSV_RUN_ID_OVERRIDE",
        message: `Row ${rowNum}: run_id in CSV differs from import options (using CSV value).`,
        row: rowNum,
      });
    }

    const commissionRaw = pick(cells, col, "commission");
    let commission: number | undefined;
    if (commissionRaw !== undefined && commissionRaw.trim() !== "") {
      const p = parseNumber(commissionRaw, "commission", rowNum);
      if (p.ok) commission = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const swapRaw = pick(cells, col, "swap");
    let swap: number | undefined;
    if (swapRaw !== undefined && swapRaw.trim() !== "") {
      const p = parseNumber(swapRaw, "swap", rowNum);
      if (p.ok) swap = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const spreadRaw = pick(cells, col, "spread_at_entry");
    let spreadAtEntry: number | undefined;
    if (spreadRaw !== undefined && spreadRaw.trim() !== "") {
      const p = parseNumber(spreadRaw, "spread_at_entry", rowNum);
      if (p.ok) spreadAtEntry = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const scoreRaw = pick(cells, col, "score_total");
    let scoreTotal: number | undefined;
    if (scoreRaw !== undefined && scoreRaw.trim() !== "") {
      const p = parseNumber(scoreRaw, "score_total", rowNum);
      if (p.ok) scoreTotal = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const trade: BacktestTrade = {
      tradeId: tradeIdRaw.trim() as BacktestTradeId,
      runId: tradeRunId,
      strategyId: rowStrategy,
      parameterSetId: rowPs,
      canonicalSymbol: rowSym,
      brokerSymbol,
      accountId,
      direction,
      entryTime,
      exitTime,
      entryPrice: ep.value,
      exitPrice: xp.value,
      sl,
      tp,
      resultMoney,
      resultR: rr.value,
      exitReason,
    };
    if (zoneId) trade.zoneId = zoneId;
    if (commission !== undefined) trade.commission = commission;
    if (swap !== undefined) trade.swap = swap;
    if (spreadAtEntry !== undefined) trade.spreadAtEntry = spreadAtEntry;
    if (scoreTotal !== undefined) trade.scoreTotal = scoreTotal;
    if (outcomeRaw !== "") trade.outcome = outcomeRaw;

    if (direction === "BUY" && sl !== undefined && sl >= ep.value) {
      warnings.push({
        code: "CSV_GEOMETRY_LONG_SL",
        message: `Row ${rowNum}: LONG trade has SL >= entry (check CSV geometry)`,
        row: rowNum,
      });
    }
    if (direction === "BUY" && tp !== undefined && tp <= ep.value) {
      warnings.push({
        code: "CSV_GEOMETRY_LONG_TP",
        message: `Row ${rowNum}: LONG trade has TP <= entry (check CSV geometry)`,
        row: rowNum,
      });
    }
    if (direction === "SELL" && sl !== undefined && sl <= ep.value) {
      warnings.push({
        code: "CSV_GEOMETRY_SHORT_SL",
        message: `Row ${rowNum}: SHORT trade has SL <= entry (check CSV geometry)`,
        row: rowNum,
      });
    }
    if (direction === "SELL" && tp !== undefined && tp >= ep.value) {
      warnings.push({
        code: "CSV_GEOMETRY_SHORT_TP",
        message: `Row ${rowNum}: SHORT trade has TP >= entry (check CSV geometry)`,
        row: rowNum,
      });
    }
    if (sl !== undefined) {
      const riskAbs = direction === "BUY" ? ep.value - sl : sl - ep.value;
      if (!Number.isFinite(riskAbs) || riskAbs <= 0) {
        warnings.push({
          code: "CSV_GEOMETRY_RISK_NONPOSITIVE",
          message: `Row ${rowNum}: implied risk (entry vs SL) is not positive`,
          row: rowNum,
        });
      }
    }

    trades.push(trade);
  }

  const ok = errors.length === 0;
  return { ok, trades: ok ? trades : [], errors, warnings };
}


/** Build a `BacktestRun` envelope from successful CSV import + options (still pure / in-memory). */
export function assembleBacktestRunFromImportedTrades(
  importResult: BacktestImportResult,
  options: ImportBacktestCsvOptions,
): BacktestRun | null {
  if (!importResult.ok || importResult.trades.length === 0) return null;

  const runId = importResult.trades[0]!.runId;
  const importedAt = options.importedAt ?? "1970-01-01T00:00:00.000Z";
  const dateFrom =
    options.dateFrom ??
    importResult.trades.reduce((a, t) => (t.entryTime < a ? t.entryTime : a), importResult.trades[0]!.entryTime);
  const dateTo =
    options.dateTo ??
    importResult.trades.reduce((a, t) => (t.exitTime > a ? t.exitTime : a), importResult.trades[0]!.exitTime);

  const summary = calculateBacktestSummary(importResult.trades);

  return {
    runId,
    strategyId: options.strategyId,
    parameterSetId: options.parameterSetId,
    canonicalSymbol: options.canonicalSymbol,
    brokerSymbol: options.brokerSymbol,
    accountId: options.accountId,
    sourceType: options.sourceType,
    datasetSplit: options.datasetSplit,
    dateFrom,
    dateTo,
    importedAt,
    rawFileName: options.rawFileName,
    summary,
    trades: importResult.trades,
    warnings: importResult.warnings,
    notes: "Assembled from in-memory CSV import — Mapazapp_TestEA (E3.6+) Strategy Tester export; legacy MZP_TESTEA_V1 rows still parse when present.",
  };
}

/** Convenience: parse CSV and assemble run when `ok`. */
export function importBacktestRunFromCsvText(
  csvText: string,
  options: ImportBacktestCsvOptions,
): { importResult: BacktestImportResult; run: BacktestRun | null } {
  const importResult = importBacktestTradesFromCsv(csvText, options);
  const run = importResult.ok ? assembleBacktestRunFromImportedTrades(importResult, options) : null;
  return { importResult, run };
}
