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
  EntryVariantOutcomeSimSlot,
  EntryVariantOutcomeSimTradeFields,
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

type CsvColIndex = Map<string, number>;

function parseOptionalEntryVariantSimSlot(
  cells: string[],
  col: CsvColIndex,
  prefix: string,
  rowNum: number,
  warnings: BacktestImportWarning[],
): EntryVariantOutcomeSimSlot | undefined {
  if (!col.has(`${prefix}_sim_status`)) return undefined;
  const slot: EntryVariantOutcomeSimSlot = {};
  const statusRaw = pick(cells, col, `${prefix}_sim_status`);
  if (statusRaw?.trim()) slot.status = statusRaw.trim();
  const assignNum = (raw: string | undefined, label: string, set: (v: number) => void) => {
    if (raw === undefined || raw.trim() === "") return;
    const p = parseNumber(raw, label, rowNum);
    if (p.ok) set(p.value);
    else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
  };
  assignNum(pick(cells, col, `${prefix}_sim_result_r`), `${prefix}_sim_result_r`, (v) => {
    slot.resultR = v;
  });
  assignNum(pick(cells, col, `${prefix}_sim_entry_price`), `${prefix}_sim_entry_price`, (v) => {
    slot.entryPrice = v;
  });
  assignNum(pick(cells, col, `${prefix}_sim_sl_price`), `${prefix}_sim_sl_price`, (v) => {
    slot.slPrice = v;
  });
  assignNum(pick(cells, col, `${prefix}_sim_tp_price`), `${prefix}_sim_tp_price`, (v) => {
    slot.tpPrice = v;
  });
  assignNum(pick(cells, col, `${prefix}_sim_risk_points`), `${prefix}_sim_risk_points`, (v) => {
    slot.riskPoints = v;
  });
  assignNum(pick(cells, col, `${prefix}_sim_effective_rr`), `${prefix}_sim_effective_rr`, (v) => {
    slot.effectiveRr = v;
  });
  assignNum(pick(cells, col, `${prefix}_sim_bars_to_fill`), `${prefix}_sim_bars_to_fill`, (v) => {
    slot.barsToFill = Math.trunc(v);
  });
  assignNum(pick(cells, col, `${prefix}_sim_bars_to_close`), `${prefix}_sim_bars_to_close`, (v) => {
    slot.barsToClose = Math.trunc(v);
  });
  const ambRaw = pick(cells, col, `${prefix}_sim_ambiguous`);
  if (ambRaw !== undefined && ambRaw.trim() !== "") {
    const b = parseOptionalCsvBool(ambRaw, `${prefix}_sim_ambiguous`, rowNum);
    if (b.ok) slot.ambiguous = b.val;
    else warnings.push({ code: "CSV_EVOS_BOOL_INVALID", message: b.message, row: rowNum });
  }
  const invRaw = pick(cells, col, `${prefix}_sim_invalid_risk`);
  if (invRaw !== undefined && invRaw.trim() !== "") {
    const b = parseOptionalCsvBool(invRaw, `${prefix}_sim_invalid_risk`, rowNum);
    if (b.ok) slot.invalidRisk = b.val;
    else warnings.push({ code: "CSV_EVOS_BOOL_INVALID", message: b.message, row: rowNum });
  }
  return slot;
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
    const barsFillRaw = pick(cells, col, "bars_to_fill");
    if (barsFillRaw !== undefined && barsFillRaw.trim() !== "") {
      const p = parseNumber(barsFillRaw, "bars_to_fill", rowNum);
      if (p.ok) trade.barsToFill = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    const barsHeldRaw = pick(cells, col, "bars_held");
    if (barsHeldRaw !== undefined && barsHeldRaw.trim() !== "") {
      const p = parseNumber(barsHeldRaw, "bars_held", rowNum);
      if (p.ok) trade.barsHeld = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
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
    const mssTempScrRaw = pick(cells, col, "mss_temporal_relevance_score");
    const chochTempScrRaw = pick(cells, col, "choch_temporal_relevance_score");

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
    if (mssTempScrRaw !== undefined && mssTempScrRaw.trim() !== "") {
      const p = parseNumber(mssTempScrRaw, "mss_temporal_relevance_score", rowNum);
      if (p.ok) trade.mssTemporalRelevanceScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (chochTempScrRaw !== undefined && chochTempScrRaw.trim() !== "") {
      const p = parseNumber(chochTempScrRaw, "choch_temporal_relevance_score", rowNum);
      if (p.ok) trade.chochTemporalRelevanceScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }

    const pdEnRaw = pick(cells, col, "premium_discount_enabled");
    const pdSrcRaw = pick(cells, col, "pd_range_source");
    const pdHiRaw = pick(cells, col, "pd_range_high");
    const pdLoRaw = pick(cells, col, "pd_range_low");
    const pdMidRaw = pick(cells, col, "pd_midpoint_50");
    const pdPosRaw = pick(cells, col, "pd_position_pct");
    const pdZoneRaw = pick(cells, col, "pd_entry_zone");
    const pdPrRaw = pick(cells, col, "pd_entry_in_premium");
    const pdDisRaw = pick(cells, col, "pd_entry_in_discount");
    const pdEqRaw = pick(cells, col, "pd_entry_in_equilibrium");
    const pdOutRaw = pick(cells, col, "pd_entry_outside_range");
    const pdValDirRaw = pick(cells, col, "pd_entry_zone_valid_for_direction");
    const pdCnfRaw = pick(cells, col, "pd_entry_zone_conflict");
    const pdDeepRaw = pick(cells, col, "pd_entry_too_deep");
    const pdShalRaw = pick(cells, col, "pd_entry_too_shallow");
    const pdSzRaw = pick(cells, col, "pd_range_size_points");
    const pdDistMidRaw = pick(cells, col, "pd_entry_distance_to_midpoint_points");
    const pdScrRaw = pick(cells, col, "premium_discount_score");
    const pdGrdRaw = pick(cells, col, "premium_discount_grade");
    const pdRsnRaw = pick(cells, col, "premium_discount_reasons");

    if (pdEnRaw !== undefined && pdEnRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdEnRaw, "premium_discount_enabled", rowNum);
      if (b.ok) trade.premiumDiscountEnabled = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdSrcRaw?.trim()) trade.pdRangeSource = pdSrcRaw.trim();
    if (pdHiRaw !== undefined && pdHiRaw.trim() !== "") {
      const p = parseNumber(pdHiRaw, "pd_range_high", rowNum);
      if (p.ok) trade.pdRangeHigh = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (pdLoRaw !== undefined && pdLoRaw.trim() !== "") {
      const p = parseNumber(pdLoRaw, "pd_range_low", rowNum);
      if (p.ok) trade.pdRangeLow = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (pdMidRaw !== undefined && pdMidRaw.trim() !== "") {
      const p = parseNumber(pdMidRaw, "pd_midpoint_50", rowNum);
      if (p.ok) trade.pdMidpoint50 = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (pdPosRaw !== undefined && pdPosRaw.trim() !== "") {
      const p = parseNumber(pdPosRaw, "pd_position_pct", rowNum);
      if (p.ok) trade.pdPositionPct = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (pdZoneRaw?.trim()) trade.pdEntryZone = pdZoneRaw.trim();
    if (pdPrRaw !== undefined && pdPrRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdPrRaw, "pd_entry_in_premium", rowNum);
      if (b.ok) trade.pdEntryInPremium = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdDisRaw !== undefined && pdDisRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdDisRaw, "pd_entry_in_discount", rowNum);
      if (b.ok) trade.pdEntryInDiscount = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdEqRaw !== undefined && pdEqRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdEqRaw, "pd_entry_in_equilibrium", rowNum);
      if (b.ok) trade.pdEntryInEquilibrium = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdOutRaw !== undefined && pdOutRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdOutRaw, "pd_entry_outside_range", rowNum);
      if (b.ok) trade.pdEntryOutsideRange = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdValDirRaw !== undefined && pdValDirRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdValDirRaw, "pd_entry_zone_valid_for_direction", rowNum);
      if (b.ok) trade.pdEntryZoneValidForDirection = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdCnfRaw !== undefined && pdCnfRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdCnfRaw, "pd_entry_zone_conflict", rowNum);
      if (b.ok) trade.pdEntryZoneConflict = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdDeepRaw !== undefined && pdDeepRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdDeepRaw, "pd_entry_too_deep", rowNum);
      if (b.ok) trade.pdEntryTooDeep = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdShalRaw !== undefined && pdShalRaw.trim() !== "") {
      const b = parseOptionalCsvBool(pdShalRaw, "pd_entry_too_shallow", rowNum);
      if (b.ok) trade.pdEntryTooShallow = b.val;
      else warnings.push({ code: "CSV_PD_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (pdSzRaw !== undefined && pdSzRaw.trim() !== "") {
      const p = parseNumber(pdSzRaw, "pd_range_size_points", rowNum);
      if (p.ok) trade.pdRangeSizePoints = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (pdDistMidRaw !== undefined && pdDistMidRaw.trim() !== "") {
      const p = parseNumber(pdDistMidRaw, "pd_entry_distance_to_midpoint_points", rowNum);
      if (p.ok) trade.pdEntryDistanceToMidpointPoints = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (pdScrRaw !== undefined && pdScrRaw.trim() !== "") {
      const p = parseNumber(pdScrRaw, "premium_discount_score", rowNum);
      if (p.ok) trade.premiumDiscountScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (pdGrdRaw?.trim()) trade.premiumDiscountGrade = pdGrdRaw.trim();
    if (pdRsnRaw?.trim()) trade.premiumDiscountReasons = pdRsnRaw.trim();

    const ifvgEnRaw = pick(cells, col, "ifvg_bisi_sibi_enabled");
    const fvgClassRaw = pick(cells, col, "fvg_class");
    const fvgDirRaw = pick(cells, col, "fvg_direction");
    const fvgUpRaw = pick(cells, col, "fvg_upper_price");
    const fvgLoRaw = pick(cells, col, "fvg_lower_price");
    const fvgCeRaw = pick(cells, col, "fvg_ce_price");
    const fvgSzRaw = pick(cells, col, "fvg_size_points");
    const fvgAgeRaw = pick(cells, col, "fvg_age_bars_at_entry");
    const fvgMitRaw = pick(cells, col, "fvg_mitigation_state");
    const fvgMitDpRaw = pick(cells, col, "fvg_mitigation_depth_pct");
    const fvgCeTRaw = pick(cells, col, "fvg_ce_touched");
    const fvgFillRaw = pick(cells, col, "fvg_fully_filled");
    const fvgWickRaw = pick(cells, col, "fvg_wick_only_fill");
    const ifvgInvDetRaw = pick(cells, col, "ifvg_inversion_detected");
    const ifvgInvCloseRaw = pick(cells, col, "ifvg_inversion_confirmed_close");
    const ifvgInvWickRaw = pick(cells, col, "ifvg_inversion_wick_only");
    const ifvgInvBarsRaw = pick(cells, col, "ifvg_inversion_bars_after_fvg");
    const ifvgInvPxRaw = pick(cells, col, "ifvg_inversion_close_price");
    const ifvgRetDetRaw = pick(cells, col, "ifvg_retest_detected");
    const ifvgRetBarsRaw = pick(cells, col, "ifvg_retest_bars_after_inversion");
    const ifvgRetDpRaw = pick(cells, col, "ifvg_retest_depth_pct");
    const ifvgValRaw = pick(cells, col, "ifvg_valid_for_trade_direction");
    const ifvgCnfRaw = pick(cells, col, "ifvg_conflict_with_trade_direction");
    const ifvgScrRaw = pick(cells, col, "ifvg_bisi_sibi_score");
    const ifvgGrdRaw = pick(cells, col, "ifvg_bisi_sibi_grade");
    const ifvgRsnRaw = pick(cells, col, "ifvg_bisi_sibi_reasons");

    if (ifvgEnRaw !== undefined && ifvgEnRaw.trim() !== "") {
      const b = parseOptionalCsvBool(ifvgEnRaw, "ifvg_bisi_sibi_enabled", rowNum);
      if (b.ok) trade.ifvgBisiSibiEnabled = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (fvgClassRaw?.trim()) trade.fvgClass = fvgClassRaw.trim();
    if (fvgDirRaw?.trim()) trade.fvgDirection = fvgDirRaw.trim();
    if (fvgUpRaw !== undefined && fvgUpRaw.trim() !== "") {
      const p = parseNumber(fvgUpRaw, "fvg_upper_price", rowNum);
      if (p.ok) trade.fvgUpperPrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (fvgLoRaw !== undefined && fvgLoRaw.trim() !== "") {
      const p = parseNumber(fvgLoRaw, "fvg_lower_price", rowNum);
      if (p.ok) trade.fvgLowerPrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (fvgCeRaw !== undefined && fvgCeRaw.trim() !== "") {
      const p = parseNumber(fvgCeRaw, "fvg_ce_price", rowNum);
      if (p.ok) trade.fvgCePrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (fvgSzRaw !== undefined && fvgSzRaw.trim() !== "") {
      const p = parseNumber(fvgSzRaw, "fvg_size_points", rowNum);
      if (p.ok) trade.fvgSizePoints = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (fvgAgeRaw !== undefined && fvgAgeRaw.trim() !== "") {
      const p = parseNumber(fvgAgeRaw, "fvg_age_bars_at_entry", rowNum);
      if (p.ok) trade.fvgAgeBarsAtEntry = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (fvgMitRaw?.trim()) trade.fvgMitigationState = fvgMitRaw.trim();
    if (fvgMitDpRaw !== undefined && fvgMitDpRaw.trim() !== "") {
      const p = parseNumber(fvgMitDpRaw, "fvg_mitigation_depth_pct", rowNum);
      if (p.ok) trade.fvgMitigationDepthPct = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (fvgCeTRaw !== undefined && fvgCeTRaw.trim() !== "") {
      const b = parseOptionalCsvBool(fvgCeTRaw, "fvg_ce_touched", rowNum);
      if (b.ok) trade.fvgCeTouched = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (fvgFillRaw !== undefined && fvgFillRaw.trim() !== "") {
      const b = parseOptionalCsvBool(fvgFillRaw, "fvg_fully_filled", rowNum);
      if (b.ok) trade.fvgFullyFilled = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (fvgWickRaw !== undefined && fvgWickRaw.trim() !== "") {
      const b = parseOptionalCsvBool(fvgWickRaw, "fvg_wick_only_fill", rowNum);
      if (b.ok) trade.fvgWickOnlyFill = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ifvgInvDetRaw !== undefined && ifvgInvDetRaw.trim() !== "") {
      const b = parseOptionalCsvBool(ifvgInvDetRaw, "ifvg_inversion_detected", rowNum);
      if (b.ok) trade.ifvgInversionDetected = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ifvgInvCloseRaw !== undefined && ifvgInvCloseRaw.trim() !== "") {
      const b = parseOptionalCsvBool(ifvgInvCloseRaw, "ifvg_inversion_confirmed_close", rowNum);
      if (b.ok) trade.ifvgInversionConfirmedClose = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ifvgInvWickRaw !== undefined && ifvgInvWickRaw.trim() !== "") {
      const b = parseOptionalCsvBool(ifvgInvWickRaw, "ifvg_inversion_wick_only", rowNum);
      if (b.ok) trade.ifvgInversionWickOnly = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ifvgInvBarsRaw !== undefined && ifvgInvBarsRaw.trim() !== "") {
      const p = parseNumber(ifvgInvBarsRaw, "ifvg_inversion_bars_after_fvg", rowNum);
      if (p.ok) trade.ifvgInversionBarsAfterFvg = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (ifvgInvPxRaw !== undefined && ifvgInvPxRaw.trim() !== "") {
      const p = parseNumber(ifvgInvPxRaw, "ifvg_inversion_close_price", rowNum);
      if (p.ok) trade.ifvgInversionClosePrice = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (ifvgRetDetRaw !== undefined && ifvgRetDetRaw.trim() !== "") {
      const b = parseOptionalCsvBool(ifvgRetDetRaw, "ifvg_retest_detected", rowNum);
      if (b.ok) trade.ifvgRetestDetected = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ifvgRetBarsRaw !== undefined && ifvgRetBarsRaw.trim() !== "") {
      const p = parseNumber(ifvgRetBarsRaw, "ifvg_retest_bars_after_inversion", rowNum);
      if (p.ok) trade.ifvgRetestBarsAfterInversion = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (ifvgRetDpRaw !== undefined && ifvgRetDpRaw.trim() !== "") {
      const p = parseNumber(ifvgRetDpRaw, "ifvg_retest_depth_pct", rowNum);
      if (p.ok) trade.ifvgRetestDepthPct = p.value;
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (ifvgValRaw !== undefined && ifvgValRaw.trim() !== "") {
      const b = parseOptionalCsvBool(ifvgValRaw, "ifvg_valid_for_trade_direction", rowNum);
      if (b.ok) trade.ifvgValidForTradeDirection = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ifvgCnfRaw !== undefined && ifvgCnfRaw.trim() !== "") {
      const b = parseOptionalCsvBool(ifvgCnfRaw, "ifvg_conflict_with_trade_direction", rowNum);
      if (b.ok) trade.ifvgConflictWithTradeDirection = b.val;
      else warnings.push({ code: "CSV_IFVG_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (ifvgScrRaw !== undefined && ifvgScrRaw.trim() !== "") {
      const p = parseNumber(ifvgScrRaw, "ifvg_bisi_sibi_score", rowNum);
      if (p.ok) trade.ifvgBisiSibiScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (ifvgGrdRaw?.trim()) trade.ifvgBisiSibiGrade = ifvgGrdRaw.trim();
    if (ifvgRsnRaw?.trim()) trade.ifvgBisiSibiReasons = ifvgRsnRaw.trim();

    const effEnRaw = pick(cells, col, "entry_fill_feasibility_enabled");
    const effStatRaw = pick(cells, col, "entry_fill_status");
    const effScrRaw = pick(cells, col, "entry_fill_feasibility_score");
    const effGrdRaw = pick(cells, col, "entry_fill_feasibility_grade");
    const effRsnRaw = pick(cells, col, "entry_fill_feasibility_reasons");
    const effEntryRaw = pick(cells, col, "entry_price_for_fill_audit");
    const effNearRaw = pick(cells, col, "fvg_near_edge_price");
    const effFarRaw = pick(cells, col, "fvg_far_edge_price");
    const effCeRaw = pick(cells, col, "fvg_ce_price");
    const effDepthRaw = pick(cells, col, "entry_depth_in_fvg_pct");
    const effDistNearRaw = pick(cells, col, "entry_distance_from_near_edge_points");
    const effDistFarRaw = pick(cells, col, "entry_distance_from_far_edge_points");
    const effDistCeRaw = pick(cells, col, "entry_distance_from_ce_points");
    const effFvgTouchRaw = pick(cells, col, "fvg_touch_reached");
    const effCeTouchRaw = pick(cells, col, "fvg_ce_touch_reached");
    const effEntryTouchRaw = pick(cells, col, "entry_price_reached");
    const effMaxRetPctRaw = pick(cells, col, "max_retrace_into_fvg_pct");
    const effMaxRetPxRaw = pick(cells, col, "max_retrace_price");
    const effMaxRetDistRaw = pick(cells, col, "max_retrace_to_entry_distance_points");
    const effMissRaw = pick(cells, col, "missed_entry_by_points");
    const effBarsFvgRaw = pick(cells, col, "bars_to_fvg_touch");
    const effBarsCeRaw = pick(cells, col, "bars_to_ce_touch");
    const effBarsFillRaw = pick(cells, col, "bars_to_entry_fill");
    const effBarsMaxRaw = pick(cells, col, "bars_to_max_retrace");
    const effBarsUntilRaw = pick(cells, col, "bars_until_expiration_or_resolution");
    const effExpUnfRaw = pick(cells, col, "entry_expired_unfilled");
    const effShallowRaw = pick(cells, col, "entry_missed_shallow_retrace");
    const effTooDeepRaw = pick(cells, col, "entry_too_deep_for_retest");
    const effNearMissRaw = pick(cells, col, "entry_near_miss");
    const effFillFastRaw = pick(cells, col, "entry_filled_fast");
    const effFillLateRaw = pick(cells, col, "entry_filled_late");
    const effInvRaw = pick(cells, col, "entry_invalidated_before_fill");
    const effOutsideRaw = pick(cells, col, "entry_outside_fvg");
    const effGeomUnkRaw = pick(cells, col, "entry_geometry_unknown");

    if (effEnRaw !== undefined && effEnRaw.trim() !== "") {
      const b = parseOptionalCsvBool(effEnRaw, "entry_fill_feasibility_enabled", rowNum);
      if (b.ok) trade.entryFillFeasibilityEnabled = b.val;
      else warnings.push({ code: "CSV_EFF_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (effStatRaw?.trim()) trade.entryFillStatus = effStatRaw.trim();
    if (effScrRaw !== undefined && effScrRaw.trim() !== "") {
      const p = parseNumber(effScrRaw, "entry_fill_feasibility_score", rowNum);
      if (p.ok) trade.entryFillFeasibilityScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (effGrdRaw?.trim()) trade.entryFillFeasibilityGrade = effGrdRaw.trim();
    if (effRsnRaw?.trim()) trade.entryFillFeasibilityReasons = effRsnRaw.trim();
    const effNum = (raw: string | undefined, label: string, set: (v: number) => void) => {
      if (raw === undefined || raw.trim() === "") return;
      const p = parseNumber(raw, label, rowNum);
      if (p.ok) set(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    };
    effNum(effEntryRaw, "entry_price_for_fill_audit", (v) => {
      trade.entryPriceForFillAudit = v;
    });
    effNum(effNearRaw, "fvg_near_edge_price", (v) => {
      trade.fvgNearEdgePrice = v;
    });
    effNum(effFarRaw, "fvg_far_edge_price", (v) => {
      trade.fvgFarEdgePrice = v;
    });
    effNum(effCeRaw, "fvg_ce_price", (v) => {
      trade.fvgCePrice = v;
    });
    effNum(effDepthRaw, "entry_depth_in_fvg_pct", (v) => {
      trade.entryDepthInFvgPct = v;
    });
    effNum(effDistNearRaw, "entry_distance_from_near_edge_points", (v) => {
      trade.entryDistanceFromNearEdgePoints = v;
    });
    effNum(effDistFarRaw, "entry_distance_from_far_edge_points", (v) => {
      trade.entryDistanceFromFarEdgePoints = v;
    });
    effNum(effDistCeRaw, "entry_distance_from_ce_points", (v) => {
      trade.entryDistanceFromCePoints = v;
    });
    effNum(effMaxRetPctRaw, "max_retrace_into_fvg_pct", (v) => {
      trade.maxRetraceIntoFvgPct = v;
    });
    effNum(effMaxRetPxRaw, "max_retrace_price", (v) => {
      trade.maxRetracePrice = v;
    });
    effNum(effMaxRetDistRaw, "max_retrace_to_entry_distance_points", (v) => {
      trade.maxRetraceToEntryDistancePoints = v;
    });
    effNum(effMissRaw, "missed_entry_by_points", (v) => {
      trade.missedEntryByPoints = v;
    });
    const effInt = (raw: string | undefined, label: string, set: (v: number) => void) => {
      if (raw === undefined || raw.trim() === "") return;
      const p = parseNumber(raw, label, rowNum);
      if (p.ok) set(Math.trunc(p.value));
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    };
    effInt(effBarsFvgRaw, "bars_to_fvg_touch", (v) => {
      trade.barsToFvgTouch = v;
    });
    effInt(effBarsCeRaw, "bars_to_ce_touch", (v) => {
      trade.barsToCeTouch = v;
    });
    effInt(effBarsFillRaw, "bars_to_entry_fill", (v) => {
      trade.barsToEntryFill = v;
    });
    effInt(effBarsMaxRaw, "bars_to_max_retrace", (v) => {
      trade.barsToMaxRetrace = v;
    });
    effInt(effBarsUntilRaw, "bars_until_expiration_or_resolution", (v) => {
      trade.barsUntilExpirationOrResolution = v;
    });
    const effBool = (raw: string | undefined, label: string, set: (v: boolean) => void) => {
      if (raw === undefined || raw.trim() === "") return;
      const b = parseOptionalCsvBool(raw, label, rowNum);
      if (b.ok) set(b.val);
      else warnings.push({ code: "CSV_EFF_BOOL_INVALID", message: b.message, row: rowNum });
    };
    effBool(effFvgTouchRaw, "fvg_touch_reached", (v) => {
      trade.fvgTouchReached = v;
    });
    effBool(effCeTouchRaw, "fvg_ce_touch_reached", (v) => {
      trade.fvgCeTouchReached = v;
    });
    effBool(effEntryTouchRaw, "entry_price_reached", (v) => {
      trade.entryPriceReached = v;
    });
    effBool(effExpUnfRaw, "entry_expired_unfilled", (v) => {
      trade.entryExpiredUnfilled = v;
    });
    effBool(effShallowRaw, "entry_missed_shallow_retrace", (v) => {
      trade.entryMissedShallowRetrace = v;
    });
    effBool(effTooDeepRaw, "entry_too_deep_for_retest", (v) => {
      trade.entryTooDeepForRetest = v;
    });
    effBool(effNearMissRaw, "entry_near_miss", (v) => {
      trade.entryNearMiss = v;
    });
    effBool(effFillFastRaw, "entry_filled_fast", (v) => {
      trade.entryFilledFast = v;
    });
    effBool(effFillLateRaw, "entry_filled_late", (v) => {
      trade.entryFilledLate = v;
    });
    effBool(effInvRaw, "entry_invalidated_before_fill", (v) => {
      trade.entryInvalidatedBeforeFill = v;
    });
    effBool(effOutsideRaw, "entry_outside_fvg", (v) => {
      trade.entryOutsideFvg = v;
    });
    effBool(effGeomUnkRaw, "entry_geometry_unknown", (v) => {
      trade.entryGeometryUnknown = v;
    });

    const evEnRaw = pick(cells, col, "entry_variant_feasibility_enabled");
    const evScrRaw = pick(cells, col, "entry_variant_feasibility_score");
    const evGrdRaw = pick(cells, col, "entry_variant_feasibility_grade");
    const evRsnRaw = pick(cells, col, "entry_variant_feasibility_reasons");
    const evEdgePxRaw = pick(cells, col, "entry_variant_edge_price");
    const ev25PxRaw = pick(cells, col, "entry_variant_25_price");
    const ev50PxRaw = pick(cells, col, "entry_variant_50_price");
    const ev75PxRaw = pick(cells, col, "entry_variant_75_price");
    const evAdPxRaw = pick(cells, col, "entry_variant_adaptive_price");
    const evAdTypeRaw = pick(cells, col, "entry_variant_adaptive_type");
    const evEdgeReachRaw = pick(cells, col, "entry_variant_edge_reached");
    const ev25ReachRaw = pick(cells, col, "entry_variant_25_reached");
    const ev50ReachRaw = pick(cells, col, "entry_variant_50_reached");
    const ev75ReachRaw = pick(cells, col, "entry_variant_75_reached");
    const evAdReachRaw = pick(cells, col, "entry_variant_adaptive_reached");
    const evBestRaw = pick(cells, col, "entry_variant_best_reached");
    const evBestDepthRaw = pick(cells, col, "entry_variant_best_reached_depth_pct");
    const evOfficialDepthRaw = pick(cells, col, "entry_variant_official_depth_pct");
    const evFillGapRaw = pick(cells, col, "entry_variant_fill_gap_pct");
    const evShallowRaw = pick(cells, col, "entry_variant_shallow_would_fill");
    const evDeeperRaw = pick(cells, col, "entry_variant_deeper_would_not_fill");

    if (evEnRaw !== undefined && evEnRaw.trim() !== "") {
      const b = parseOptionalCsvBool(evEnRaw, "entry_variant_feasibility_enabled", rowNum);
      if (b.ok) trade.entryVariantFeasibilityEnabled = b.val;
      else warnings.push({ code: "CSV_EV_BOOL_INVALID", message: b.message, row: rowNum });
    }
    if (evScrRaw !== undefined && evScrRaw.trim() !== "") {
      const p = parseNumber(evScrRaw, "entry_variant_feasibility_score", rowNum);
      if (p.ok) trade.entryVariantFeasibilityScore = Math.trunc(p.value);
      else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
    }
    if (evGrdRaw?.trim()) trade.entryVariantFeasibilityGrade = evGrdRaw.trim();
    if (evRsnRaw?.trim()) trade.entryVariantFeasibilityReasons = evRsnRaw.trim();
    if (evAdTypeRaw?.trim()) trade.entryVariantAdaptiveType = evAdTypeRaw.trim();
    if (evBestRaw?.trim()) trade.entryVariantBestReached = evBestRaw.trim();
    effNum(evEdgePxRaw, "entry_variant_edge_price", (v) => {
      trade.entryVariantEdgePrice = v;
    });
    effNum(ev25PxRaw, "entry_variant_25_price", (v) => {
      trade.entryVariant25Price = v;
    });
    effNum(ev50PxRaw, "entry_variant_50_price", (v) => {
      trade.entryVariant50Price = v;
    });
    effNum(ev75PxRaw, "entry_variant_75_price", (v) => {
      trade.entryVariant75Price = v;
    });
    effNum(evAdPxRaw, "entry_variant_adaptive_price", (v) => {
      trade.entryVariantAdaptivePrice = v;
    });
    effNum(evBestDepthRaw, "entry_variant_best_reached_depth_pct", (v) => {
      trade.entryVariantBestReachedDepthPct = v;
    });
    effNum(evOfficialDepthRaw, "entry_variant_official_depth_pct", (v) => {
      trade.entryVariantOfficialDepthPct = v;
    });
    effNum(evFillGapRaw, "entry_variant_fill_gap_pct", (v) => {
      trade.entryVariantFillGapPct = v;
    });
    effBool(evEdgeReachRaw, "entry_variant_edge_reached", (v) => {
      trade.entryVariantEdgeReached = v;
    });
    effBool(ev25ReachRaw, "entry_variant_25_reached", (v) => {
      trade.entryVariant25Reached = v;
    });
    effBool(ev50ReachRaw, "entry_variant_50_reached", (v) => {
      trade.entryVariant50Reached = v;
    });
    effBool(ev75ReachRaw, "entry_variant_75_reached", (v) => {
      trade.entryVariant75Reached = v;
    });
    effBool(evAdReachRaw, "entry_variant_adaptive_reached", (v) => {
      trade.entryVariantAdaptiveReached = v;
    });
    effBool(evShallowRaw, "entry_variant_shallow_would_fill", (v) => {
      trade.entryVariantShallowWouldFill = v;
    });
    effBool(evDeeperRaw, "entry_variant_deeper_would_not_fill", (v) => {
      trade.entryVariantDeeperWouldNotFill = v;
    });

    const evosEnRaw = pick(cells, col, "entry_variant_outcome_sim_enabled");
    const evosRsnRaw = pick(cells, col, "entry_variant_outcome_sim_reasons");
    const evosBestVarRaw = pick(cells, col, "entry_variant_best_sim_variant");
    const evosBestRRaw = pick(cells, col, "entry_variant_best_sim_result_r");
    const evosBestStatRaw = pick(cells, col, "entry_variant_best_sim_status");
    const evosBestRsnRaw = pick(cells, col, "entry_variant_best_sim_reasons");
    const hasEvosCols =
      col.has("entry_variant_edge_sim_status") ||
      col.has("entry_variant_25_sim_status") ||
      col.has("entry_variant_outcome_sim_enabled");
    if (hasEvosCols) {
      const evos: EntryVariantOutcomeSimTradeFields = {};
      if (evosEnRaw !== undefined && evosEnRaw.trim() !== "") {
        const b = parseOptionalCsvBool(evosEnRaw, "entry_variant_outcome_sim_enabled", rowNum);
        if (b.ok) evos.enabled = b.val;
        else warnings.push({ code: "CSV_EVOS_BOOL_INVALID", message: b.message, row: rowNum });
      }
      if (evosRsnRaw?.trim()) evos.reasons = evosRsnRaw.trim();
      const edgeSlot = parseOptionalEntryVariantSimSlot(cells, col, "entry_variant_edge", rowNum, warnings);
      if (edgeSlot) evos.edge = edgeSlot;
      const p25Slot = parseOptionalEntryVariantSimSlot(cells, col, "entry_variant_25", rowNum, warnings);
      if (p25Slot) evos.p25 = p25Slot;
      const p50Slot = parseOptionalEntryVariantSimSlot(cells, col, "entry_variant_50", rowNum, warnings);
      if (p50Slot) evos.p50 = p50Slot;
      const p75Slot = parseOptionalEntryVariantSimSlot(cells, col, "entry_variant_75", rowNum, warnings);
      if (p75Slot) evos.p75 = p75Slot;
      const adSlot = parseOptionalEntryVariantSimSlot(cells, col, "entry_variant_adaptive", rowNum, warnings);
      if (adSlot) evos.adaptive = adSlot;
      if (evosBestVarRaw?.trim()) evos.bestVariant = evosBestVarRaw.trim();
      if (evosBestRRaw !== undefined && evosBestRRaw.trim() !== "") {
        const p = parseNumber(evosBestRRaw, "entry_variant_best_sim_result_r", rowNum);
        if (p.ok) evos.bestResultR = p.value;
        else warnings.push({ code: "CSV_OPTIONAL_NUMERIC", message: p.message, row: rowNum });
      }
      if (evosBestStatRaw?.trim()) evos.bestStatus = evosBestStatRaw.trim();
      if (evosBestRsnRaw?.trim()) evos.bestReasons = evosBestRsnRaw.trim();
      trade.entryVariantOutcomeSim = evos;
    }

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
