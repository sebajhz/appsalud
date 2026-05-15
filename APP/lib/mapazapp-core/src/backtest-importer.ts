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

function parseOptionalCsvBool(raw: string | undefined, colLabel: string, rowNum: number): { ok: true; val: boolean } | { ok: false; message: string } {
  if (raw === undefined || raw.trim() === "") return { ok: true, val: false };
  const u = raw.trim().toLowerCase();
  if (u === "true" || u === "1") return { ok: true, val: true };
  if (u === "false" || u === "0") return { ok: true, val: false };
  return { ok: false, message: `Row ${rowNum}: ${colLabel} must be true/false/0/1` };
}

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
  /** TestEA E5.8 — optional quality column; maps to `scoreTotal` for advisory imports. */
  entry_quality_score: "score_total",
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

    const liqScoreRaw = pick(cells, col, "liquidity_event_score");
    let liquidityEventScore: number | undefined;
    if (liqScoreRaw !== undefined && liqScoreRaw.trim() !== "") {
      const p = parseNumber(liqScoreRaw, "liquidity_event_score", rowNum);
      if (p.ok) liquidityEventScore = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const liqDetRaw = pick(cells, col, "liquidity_event_detected");
    const liqTypeRaw = pick(cells, col, "liquidity_event_type");
    const liqDirRaw = pick(cells, col, "liquidity_event_direction");
    const liqAgeRaw = pick(cells, col, "liquidity_event_age_bars");
    const liqLvlRaw = pick(cells, col, "liquidity_event_level");
    const liqSweepPxRaw = pick(cells, col, "liquidity_event_sweep_price");
    const liqDistRaw = pick(cells, col, "liquidity_event_distance_points");
    const liqRsnRaw = pick(cells, col, "liquidity_event_reasons");

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
    if (liquidityEventScore !== undefined) trade.liquidityEventScore = liquidityEventScore;
    if (liqDetRaw !== undefined && liqDetRaw.trim() !== "") {
      const u = liqDetRaw.trim().toLowerCase();
      if (u === "true" || u === "1") trade.liquidityEventDetected = true;
      else if (u === "false" || u === "0") trade.liquidityEventDetected = false;
      else
        warnings.push({
          code: "CSV_LIQUIDITY_DETECTED_INVALID",
          message: `Row ${rowNum}: liquidity_event_detected must be true/false/0/1`,
          row: rowNum,
        });
    }
    if (liqTypeRaw?.trim()) trade.liquidityEventType = liqTypeRaw.trim();
    if (liqDirRaw?.trim()) trade.liquidityEventDirection = liqDirRaw.trim();
    if (liqAgeRaw !== undefined && liqAgeRaw.trim() !== "") {
      const p = parseNumber(liqAgeRaw, "liquidity_event_age_bars", rowNum);
      if (p.ok) trade.liquidityEventAgeBars = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqLvlRaw !== undefined && liqLvlRaw.trim() !== "") {
      const p = parseNumber(liqLvlRaw, "liquidity_event_level", rowNum);
      if (p.ok) trade.liquidityEventLevel = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqSweepPxRaw !== undefined && liqSweepPxRaw.trim() !== "") {
      const p = parseNumber(liqSweepPxRaw, "liquidity_event_sweep_price", rowNum);
      if (p.ok) trade.liquidityEventSweepPrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqDistRaw !== undefined && liqDistRaw.trim() !== "") {
      const p = parseNumber(liqDistRaw, "liquidity_event_distance_points", rowNum);
      if (p.ok) trade.liquidityEventDistancePoints = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqRsnRaw?.trim()) trade.liquidityEventReasons = liqRsnRaw.trim();

    const liqQRaw = pick(cells, col, "liquidity_sweep_quality_score");
    const liqQGradeRaw = pick(cells, col, "liquidity_sweep_quality_grade");
    const liqQRecRaw = pick(cells, col, "liquidity_sweep_recency_score");
    const liqQDirRaw = pick(cells, col, "liquidity_sweep_directional_score");
    const liqQReactRaw = pick(cells, col, "liquidity_sweep_reaction_score");
    const liqQDispRaw = pick(cells, col, "liquidity_sweep_displacement_score");
    const liqQDistRaw = pick(cells, col, "liquidity_sweep_distance_score");
    const liqQRsnRaw = pick(cells, col, "liquidity_sweep_quality_reasons");
    if (liqQRaw !== undefined && liqQRaw.trim() !== "") {
      const p = parseNumber(liqQRaw, "liquidity_sweep_quality_score", rowNum);
      if (p.ok) trade.liquiditySweepQualityScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqQGradeRaw?.trim()) trade.liquiditySweepQualityGrade = liqQGradeRaw.trim();
    if (liqQRecRaw !== undefined && liqQRecRaw.trim() !== "") {
      const p = parseNumber(liqQRecRaw, "liquidity_sweep_recency_score", rowNum);
      if (p.ok) trade.liquiditySweepRecencyScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqQDirRaw !== undefined && liqQDirRaw.trim() !== "") {
      const p = parseNumber(liqQDirRaw, "liquidity_sweep_directional_score", rowNum);
      if (p.ok) trade.liquiditySweepDirectionalScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqQReactRaw !== undefined && liqQReactRaw.trim() !== "") {
      const p = parseNumber(liqQReactRaw, "liquidity_sweep_reaction_score", rowNum);
      if (p.ok) trade.liquiditySweepReactionScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqQDispRaw !== undefined && liqQDispRaw.trim() !== "") {
      const p = parseNumber(liqQDispRaw, "liquidity_sweep_displacement_score", rowNum);
      if (p.ok) trade.liquiditySweepDisplacementScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqQDistRaw !== undefined && liqQDistRaw.trim() !== "") {
      const p = parseNumber(liqQDistRaw, "liquidity_sweep_distance_score", rowNum);
      if (p.ok) trade.liquiditySweepDistanceScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (liqQRsnRaw?.trim()) trade.liquiditySweepQualityReasons = liqQRsnRaw.trim();

    const lcDetRaw = pick(cells, col, "liquidity_chain_detected");
    const lcGradeRaw = pick(cells, col, "liquidity_chain_grade");
    const lcScoreRaw = pick(cells, col, "liquidity_chain_score");
    const lcStRaw = pick(cells, col, "liquidity_chain_sweep_to_setup_bars");
    const lcSfRaw = pick(cells, col, "liquidity_chain_sweep_to_fvg_bars");
    const lcRxRaw = pick(cells, col, "liquidity_chain_reaction_confirmed");
    const lcDpRaw = pick(cells, col, "liquidity_chain_displacement_confirmed");
    const lcFvgRaw = pick(cells, col, "liquidity_chain_fvg_created_after_sweep");
    const lcDistRaw = pick(cells, col, "liquidity_chain_distance_to_fvg_points");
    const lcRsnRaw = pick(cells, col, "liquidity_chain_reasons");
    const lcRxFailRaw = pick(cells, col, "liquidity_chain_reaction_failure_reason");
    const lcRxClsRaw = pick(cells, col, "liquidity_chain_reaction_close_price");
    const lcRxLvlRaw = pick(cells, col, "liquidity_chain_reaction_level");
    const lcRxBarsRaw = pick(cells, col, "liquidity_chain_reaction_bars_checked");

    if (lcDetRaw !== undefined && lcDetRaw.trim() !== "") {
      const b = parseOptionalCsvBool(lcDetRaw, "liquidity_chain_detected", rowNum);
      if (b.ok) trade.liquidityChainDetected = b.val;
      else warnings.push({ code: "CSV_CHAIN_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (lcGradeRaw?.trim()) trade.liquidityChainGrade = lcGradeRaw.trim();
    if (lcScoreRaw !== undefined && lcScoreRaw.trim() !== "") {
      const p = parseNumber(lcScoreRaw, "liquidity_chain_score", rowNum);
      if (p.ok) trade.liquidityChainScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (lcStRaw !== undefined && lcStRaw.trim() !== "") {
      const p = parseNumber(lcStRaw, "liquidity_chain_sweep_to_setup_bars", rowNum);
      if (p.ok) trade.liquidityChainSweepToSetupBars = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (lcSfRaw !== undefined && lcSfRaw.trim() !== "") {
      const p = parseNumber(lcSfRaw, "liquidity_chain_sweep_to_fvg_bars", rowNum);
      if (p.ok) trade.liquidityChainSweepToFvgBars = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (lcRxRaw !== undefined && lcRxRaw.trim() !== "") {
      const b = parseOptionalCsvBool(lcRxRaw, "liquidity_chain_reaction_confirmed", rowNum);
      if (b.ok) trade.liquidityChainReactionConfirmed = b.val;
      else warnings.push({ code: "CSV_CHAIN_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (lcDpRaw !== undefined && lcDpRaw.trim() !== "") {
      const b = parseOptionalCsvBool(lcDpRaw, "liquidity_chain_displacement_confirmed", rowNum);
      if (b.ok) trade.liquidityChainDisplacementConfirmed = b.val;
      else warnings.push({ code: "CSV_CHAIN_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (lcFvgRaw !== undefined && lcFvgRaw.trim() !== "") {
      const b = parseOptionalCsvBool(lcFvgRaw, "liquidity_chain_fvg_created_after_sweep", rowNum);
      if (b.ok) trade.liquidityChainFvgCreatedAfterSweep = b.val;
      else warnings.push({ code: "CSV_CHAIN_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (lcDistRaw !== undefined && lcDistRaw.trim() !== "") {
      const p = parseNumber(lcDistRaw, "liquidity_chain_distance_to_fvg_points", rowNum);
      if (p.ok) trade.liquidityChainDistanceToFvgPoints = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (lcRsnRaw?.trim()) trade.liquidityChainReasons = lcRsnRaw.trim();

    if (lcRxFailRaw?.trim()) trade.liquidityChainReactionFailureReason = lcRxFailRaw.trim();
    if (lcRxClsRaw !== undefined && lcRxClsRaw.trim() !== "") {
      const p = parseNumber(lcRxClsRaw, "liquidity_chain_reaction_close_price", rowNum);
      if (p.ok) trade.liquidityChainReactionClosePrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (lcRxLvlRaw !== undefined && lcRxLvlRaw.trim() !== "") {
      const p = parseNumber(lcRxLvlRaw, "liquidity_chain_reaction_level", rowNum);
      if (p.ok) trade.liquidityChainReactionLevel = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (lcRxBarsRaw !== undefined && lcRxBarsRaw.trim() !== "") {
      const p = parseNumber(lcRxBarsRaw, "liquidity_chain_reaction_bars_checked", rowNum);
      if (p.ok) trade.liquidityChainReactionBarsChecked = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const htfEnRaw = pick(cells, col, "htf_structure_enabled");
    const h4StRaw = pick(cells, col, "h4_structure_state");
    const h1StRaw = pick(cells, col, "h1_structure_state");
    const h4DirRaw = pick(cells, col, "h4_structure_direction");
    const h1DirRaw = pick(cells, col, "h1_structure_direction");
    const htfAliRaw = pick(cells, col, "htf_structure_aligned");
    const htfCnfRaw = pick(cells, col, "htf_structure_conflict");
    const htfScrRaw = pick(cells, col, "htf_structure_score");
    const h4PhRaw = pick(cells, col, "h4_protected_high");
    const h4PlRaw = pick(cells, col, "h4_protected_low");
    const h1PhRaw = pick(cells, col, "h1_protected_high");
    const h1PlRaw = pick(cells, col, "h1_protected_low");
    const h4ElhRaw = pick(cells, col, "h4_external_liquidity_high");
    const h4EllRaw = pick(cells, col, "h4_external_liquidity_low");
    const h1ElhRaw = pick(cells, col, "h1_external_liquidity_high");
    const h1EllRaw = pick(cells, col, "h1_external_liquidity_low");
    const htfRsnRaw = pick(cells, col, "htf_structure_reasons");

    if (htfEnRaw !== undefined && htfEnRaw.trim() !== "") {
      const b = parseOptionalCsvBool(htfEnRaw, "htf_structure_enabled", rowNum);
      if (b.ok) trade.htfStructureEnabled = b.val;
      else warnings.push({ code: "CSV_HTF_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (h4StRaw?.trim()) trade.h4StructureState = h4StRaw.trim();
    if (h1StRaw?.trim()) trade.h1StructureState = h1StRaw.trim();
    if (h4DirRaw?.trim()) trade.h4StructureDirection = h4DirRaw.trim();
    if (h1DirRaw?.trim()) trade.h1StructureDirection = h1DirRaw.trim();
    if (htfAliRaw !== undefined && htfAliRaw.trim() !== "") {
      const b = parseOptionalCsvBool(htfAliRaw, "htf_structure_aligned", rowNum);
      if (b.ok) trade.htfStructureAligned = b.val;
      else warnings.push({ code: "CSV_HTF_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (htfCnfRaw !== undefined && htfCnfRaw.trim() !== "") {
      const b = parseOptionalCsvBool(htfCnfRaw, "htf_structure_conflict", rowNum);
      if (b.ok) trade.htfStructureConflict = b.val;
      else warnings.push({ code: "CSV_HTF_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (htfScrRaw !== undefined && htfScrRaw.trim() !== "") {
      const p = parseNumber(htfScrRaw, "htf_structure_score", rowNum);
      if (p.ok) trade.htfStructureScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h4PhRaw !== undefined && h4PhRaw.trim() !== "") {
      const p = parseNumber(h4PhRaw, "h4_protected_high", rowNum);
      if (p.ok) trade.h4ProtectedHigh = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h4PlRaw !== undefined && h4PlRaw.trim() !== "") {
      const p = parseNumber(h4PlRaw, "h4_protected_low", rowNum);
      if (p.ok) trade.h4ProtectedLow = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h1PhRaw !== undefined && h1PhRaw.trim() !== "") {
      const p = parseNumber(h1PhRaw, "h1_protected_high", rowNum);
      if (p.ok) trade.h1ProtectedHigh = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h1PlRaw !== undefined && h1PlRaw.trim() !== "") {
      const p = parseNumber(h1PlRaw, "h1_protected_low", rowNum);
      if (p.ok) trade.h1ProtectedLow = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h4ElhRaw !== undefined && h4ElhRaw.trim() !== "") {
      const p = parseNumber(h4ElhRaw, "h4_external_liquidity_high", rowNum);
      if (p.ok) trade.h4ExternalLiquidityHigh = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h4EllRaw !== undefined && h4EllRaw.trim() !== "") {
      const p = parseNumber(h4EllRaw, "h4_external_liquidity_low", rowNum);
      if (p.ok) trade.h4ExternalLiquidityLow = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h1ElhRaw !== undefined && h1ElhRaw.trim() !== "") {
      const p = parseNumber(h1ElhRaw, "h1_external_liquidity_high", rowNum);
      if (p.ok) trade.h1ExternalLiquidityHigh = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (h1EllRaw !== undefined && h1EllRaw.trim() !== "") {
      const p = parseNumber(h1EllRaw, "h1_external_liquidity_low", rowNum);
      if (p.ok) trade.h1ExternalLiquidityLow = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (htfRsnRaw?.trim()) trade.htfStructureReasons = htfRsnRaw.trim();

    const mscEnRaw = pick(cells, col, "mss_choch_enabled");
    const mssDetRaw = pick(cells, col, "mss_detected");
    const mssDirRaw = pick(cells, col, "mss_direction");
    const mssLvlRaw = pick(cells, col, "mss_break_level");
    const mssClsRaw = pick(cells, col, "mss_close_price");
    const mssAfterRaw = pick(cells, col, "mss_bars_after_sweep");
    const mssBeforeRaw = pick(cells, col, "mss_bars_before_entry");
    const mssVcRaw = pick(cells, col, "mss_valid_close");
    const chochDetRaw = pick(cells, col, "choch_detected");
    const chochDirRaw = pick(cells, col, "choch_direction");
    const chochLvlRaw = pick(cells, col, "choch_break_level");
    const chochClsRaw = pick(cells, col, "choch_close_price");
    const chochVcRaw = pick(cells, col, "choch_valid_close");
    const wickOnlyRaw = pick(cells, col, "wick_break_only");
    const ishRaw = pick(cells, col, "internal_swing_high");
    const islRaw = pick(cells, col, "internal_swing_low");
    const ishAgeRaw = pick(cells, col, "internal_swing_high_age_bars");
    const islAgeRaw = pick(cells, col, "internal_swing_low_age_bars");
    const mscScrRaw = pick(cells, col, "mss_choch_score");
    const mscRsnRaw = pick(cells, col, "mss_choch_reasons");

    if (mscEnRaw !== undefined && mscEnRaw.trim() !== "") {
      const b = parseOptionalCsvBool(mscEnRaw, "mss_choch_enabled", rowNum);
      if (b.ok) trade.mssChochEnabled = b.val;
      else warnings.push({ code: "CSV_MSC_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (mssDetRaw !== undefined && mssDetRaw.trim() !== "") {
      const b = parseOptionalCsvBool(mssDetRaw, "mss_detected", rowNum);
      if (b.ok) trade.mssDetected = b.val;
      else warnings.push({ code: "CSV_MSC_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (mssDirRaw?.trim()) trade.mssDirection = mssDirRaw.trim();
    if (mssLvlRaw !== undefined && mssLvlRaw.trim() !== "") {
      const p = parseNumber(mssLvlRaw, "mss_break_level", rowNum);
      if (p.ok) trade.mssBreakLevel = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (mssClsRaw !== undefined && mssClsRaw.trim() !== "") {
      const p = parseNumber(mssClsRaw, "mss_close_price", rowNum);
      if (p.ok) trade.mssClosePrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (mssAfterRaw !== undefined && mssAfterRaw.trim() !== "") {
      const p = parseNumber(mssAfterRaw, "mss_bars_after_sweep", rowNum);
      if (p.ok) trade.mssBarsAfterSweep = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (mssBeforeRaw !== undefined && mssBeforeRaw.trim() !== "") {
      const p = parseNumber(mssBeforeRaw, "mss_bars_before_entry", rowNum);
      if (p.ok) trade.mssBarsBeforeEntry = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (mssVcRaw !== undefined && mssVcRaw.trim() !== "") {
      const b = parseOptionalCsvBool(mssVcRaw, "mss_valid_close", rowNum);
      if (b.ok) trade.mssValidClose = b.val;
      else warnings.push({ code: "CSV_MSC_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (chochDetRaw !== undefined && chochDetRaw.trim() !== "") {
      const b = parseOptionalCsvBool(chochDetRaw, "choch_detected", rowNum);
      if (b.ok) trade.chochDetected = b.val;
      else warnings.push({ code: "CSV_MSC_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (chochDirRaw?.trim()) trade.chochDirection = chochDirRaw.trim();
    if (chochLvlRaw !== undefined && chochLvlRaw.trim() !== "") {
      const p = parseNumber(chochLvlRaw, "choch_break_level", rowNum);
      if (p.ok) trade.chochBreakLevel = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (chochClsRaw !== undefined && chochClsRaw.trim() !== "") {
      const p = parseNumber(chochClsRaw, "choch_close_price", rowNum);
      if (p.ok) trade.chochClosePrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (chochVcRaw !== undefined && chochVcRaw.trim() !== "") {
      const b = parseOptionalCsvBool(chochVcRaw, "choch_valid_close", rowNum);
      if (b.ok) trade.chochValidClose = b.val;
      else warnings.push({ code: "CSV_MSC_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (wickOnlyRaw !== undefined && wickOnlyRaw.trim() !== "") {
      const b = parseOptionalCsvBool(wickOnlyRaw, "wick_break_only", rowNum);
      if (b.ok) trade.wickBreakOnly = b.val;
      else warnings.push({ code: "CSV_MSC_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ishRaw !== undefined && ishRaw.trim() !== "") {
      const p = parseNumber(ishRaw, "internal_swing_high", rowNum);
      if (p.ok) trade.internalSwingHigh = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (islRaw !== undefined && islRaw.trim() !== "") {
      const p = parseNumber(islRaw, "internal_swing_low", rowNum);
      if (p.ok) trade.internalSwingLow = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (ishAgeRaw !== undefined && ishAgeRaw.trim() !== "") {
      const p = parseNumber(ishAgeRaw, "internal_swing_high_age_bars", rowNum);
      if (p.ok) trade.internalSwingHighAgeBars = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (islAgeRaw !== undefined && islAgeRaw.trim() !== "") {
      const p = parseNumber(islAgeRaw, "internal_swing_low_age_bars", rowNum);
      if (p.ok) trade.internalSwingLowAgeBars = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (mscScrRaw !== undefined && mscScrRaw.trim() !== "") {
      const p = parseNumber(mscScrRaw, "mss_choch_score", rowNum);
      if (p.ok) trade.mssChochScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (mscRsnRaw?.trim()) trade.mssChochReasons = mscRsnRaw.trim();

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
