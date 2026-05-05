import { buildHeaderIndex, parseCsvTextToMatrix } from "./bridge-csv-table";
import { emptyBridgeImportResult, type BridgeImportError, type BridgeImportResult } from "./bridge-import-result";
import type {
  BridgeAccountSnapshotRow,
  BridgeCandleRow,
  BridgeDealHistoryRow,
  BridgeErrorRow,
  BridgeMarketSnapshotRow,
  BridgeOrderPendingRow,
  BridgePositionOpenRow,
  BridgeSchemaVersion,
} from "./bridge-types";
import { isSupportedBridgeSchemaVersion } from "./bridge-validators";

function cell(ix: Map<string, number>, row: string[], name: string): string {
  const i = ix.get(name);
  if (i === undefined || row[i] === undefined) return "";
  return String(row[i]).trim();
}

function parseFiniteNumber(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseBoolLoose(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

function parseSchemaCell(raw: string, errors: BridgeImportError[]): BridgeSchemaVersion | null {
  const v = raw.trim();
  if (!v) {
    errors.push({ code: "BRIDGE_CSV_MISSING_COLUMN", message: "Empty schema_version cell" });
    return null;
  }
  if (!isSupportedBridgeSchemaVersion(v)) {
    errors.push({
      code: "BRIDGE_SCHEMA_UNSUPPORTED",
      message: `Unsupported schema_version: ${v}`,
    });
    return null;
  }
  return v;
}

const MARKET_COLS = [
  "schema_version",
  "exported_at_utc",
  "terminal_id",
  "account_login",
  "symbol",
  "bid",
  "ask",
  "last",
  "spread_points",
  "spread_price",
  "point",
  "digits",
  "tick_size",
  "tick_value",
  "contract_size",
  "volume_min",
  "volume_max",
  "volume_step",
  "trade_mode",
  "session_status",
  "last_tick_time_utc",
] as const;

const ACCOUNT_COLS = [
  "schema_version",
  "exported_at_utc",
  "terminal_id",
  "account_login",
  "account_server",
  "currency",
  "balance",
  "equity",
  "margin",
  "free_margin",
  "margin_level",
  "profit_open",
  "leverage",
  "trade_allowed",
  "trade_expert",
  "company",
] as const;

const CANDLE_COLS = [
  "schema_version",
  "export_id",
  "exported_at_utc",
  "terminal_id",
  "account_login",
  "symbol",
  "timeframe",
  "candle_time_utc",
  "open",
  "high",
  "low",
  "close",
  "tick_volume",
  "spread_points",
  "real_volume",
  "is_closed",
  "source",
] as const;

const POSITION_COLS = [
  "schema_version",
  "exported_at_utc",
  "terminal_id",
  "account_login",
  "position_ticket",
  "symbol",
  "type",
  "volume",
  "price_open",
  "sl",
  "tp",
  "price_current",
  "profit",
  "swap",
  "commission",
  "magic",
  "comment",
  "time_open_utc",
  "strategy_id",
  "source_tag",
] as const;

const ORDER_COLS = [
  "schema_version",
  "exported_at_utc",
  "terminal_id",
  "account_login",
  "order_ticket",
  "symbol",
  "type",
  "volume_initial",
  "volume_current",
  "price_open",
  "sl",
  "tp",
  "price_current",
  "magic",
  "comment",
  "time_setup_utc",
  "expiration_utc",
  "strategy_id",
  "source_tag",
] as const;

const DEAL_COLS = [
  "schema_version",
  "exported_at_utc",
  "terminal_id",
  "account_login",
  "deal_ticket",
  "order_ticket",
  "position_id",
  "symbol",
  "deal_type",
  "entry_type",
  "volume",
  "price",
  "profit",
  "commission",
  "swap",
  "fee",
  "time_utc",
  "magic",
  "comment",
  "reason",
  "strategy_id",
  "source_tag",
] as const;

const ERROR_COLS = [
  "schema_version",
  "exported_at_utc",
  "terminal_id",
  "account_login",
  "error_code",
  "error_message",
  "module",
  "severity",
  "context",
] as const;

function missingCols(ix: Map<string, number>, names: readonly string[]): string[] {
  return names.filter((n) => !ix.has(n));
}

function startCsvResult<TRow>(
  kind: BridgeImportResult<undefined, TRow>["kind"],
  matrix: string[][],
): BridgeImportResult<undefined, TRow> {
  const r = emptyBridgeImportResult<undefined, TRow>(kind);
  if (matrix.length === 0) {
    r.errors.push({ code: "BRIDGE_CSV_EMPTY", message: "CSV text is empty" });
    return r;
  }
  r.rawRowCount = Math.max(0, matrix.length - 1);
  return r;
}

/** Shared first-line validation; returns header index or null on fatal. */
function parseCsvHeader<TRow>(
  csvText: string,
  kind: BridgeImportResult<undefined, TRow>["kind"],
  required: readonly string[],
): { ix: Map<string, number>; body: string[][]; result: BridgeImportResult<undefined, TRow> | null } {
  const matrix = parseCsvTextToMatrix(csvText);
  const base = startCsvResult<TRow>(kind, matrix);
  if (matrix.length === 0) {
    return { ix: new Map(), body: [], result: base };
  }
  const header = matrix[0]!.map((h) => h.trim());
  if (header.length === 0 || header.every((h) => h === "")) {
    base.errors.push({ code: "BRIDGE_CSV_MISSING_HEADER", message: "Missing CSV header row" });
    return { ix: new Map(), body: [], result: base };
  }
  const ix = buildHeaderIndex(header);
  const miss = missingCols(ix, required);
  if (miss.length) {
    base.errors.push({
      code: "BRIDGE_CSV_MISSING_COLUMN",
      message: `Missing required column(s): ${miss.join(", ")}`,
    });
    return { ix, body: [], result: base };
  }
  return { ix, body: matrix.slice(1), result: null };
}

export function parseBridgeMarketSnapshotCsv(
  csvText: string,
): BridgeImportResult<undefined, BridgeMarketSnapshotRow> {
  const { ix, body, result } = parseCsvHeader<BridgeMarketSnapshotRow>(csvText, "market_snapshot_csv", MARKET_COLS);
  if (result) return result;

  const out = emptyBridgeImportResult<undefined, BridgeMarketSnapshotRow>("market_snapshot_csv");
  out.rawRowCount = body.length;
  const rows: BridgeMarketSnapshotRow[] = [];

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const line = r + 2;
    const errs: BridgeImportError[] = [];
    const schema = parseSchemaCell(cell(ix, row, "schema_version"), errs);
    if (!schema || errs.length) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: invalid schema or cells`,
        rowIndex: line,
        detail: errs[0]?.message,
      });
      continue;
    }
    const nums: Record<string, number | null> = {};
    for (const k of [
      "bid",
      "ask",
      "last",
      "spread_points",
      "spread_price",
      "point",
      "digits",
      "tick_size",
      "tick_value",
      "contract_size",
      "volume_min",
      "volume_max",
      "volume_step",
    ] as const) {
      nums[k] = parseFiniteNumber(cell(ix, row, k));
      if (nums[k] === null) {
        out.warnings.push({
          code: "BRIDGE_NUMERIC_INVALID",
          message: `Row ${line}: invalid number for ${k}`,
          rowIndex: line,
        });
      }
    }
    if (Object.values(nums).some((v) => v === null)) continue;

    const exportedAtUtc = cell(ix, row, "exported_at_utc");
    const terminalId = cell(ix, row, "terminal_id");
    const accountLogin = cell(ix, row, "account_login");
    const sym = cell(ix, row, "symbol");
    const tradeMode = cell(ix, row, "trade_mode");
    const sessionStatus = cell(ix, row, "session_status");
    const lastTickTimeUtc = cell(ix, row, "last_tick_time_utc");
    if (!exportedAtUtc || !terminalId || !accountLogin || !sym || !tradeMode || !lastTickTimeUtc) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: missing required string field`,
        rowIndex: line,
      });
      continue;
    }

    rows.push({
      schemaVersion: schema,
      exportedAtUtc,
      terminalId,
      accountLogin,
      symbol: sym,
      bid: nums.bid!,
      ask: nums.ask!,
      last: nums.last!,
      spreadPoints: nums.spread_points!,
      spreadPrice: nums.spread_price!,
      point: nums.point!,
      digits: nums.digits!,
      tickSize: nums.tick_size!,
      tickValue: nums.tick_value!,
      contractSize: nums.contract_size!,
      volumeMin: nums.volume_min!,
      volumeMax: nums.volume_max!,
      volumeStep: nums.volume_step!,
      tradeMode,
      sessionStatus,
      lastTickTimeUtc,
    });
  }

  out.rows = rows;
  out.parsedRowCount = rows.length;
  if (rows.length === 0) {
    out.errors.push({
      code: "BRIDGE_CSV_EMPTY",
      message: "No valid market snapshot rows parsed",
    });
    out.ok = false;
  } else {
    out.ok = true;
  }
  return out;
}

export function parseBridgeAccountSnapshotCsv(
  csvText: string,
): BridgeImportResult<undefined, BridgeAccountSnapshotRow> {
  const { ix, body, result } = parseCsvHeader<BridgeAccountSnapshotRow>(csvText, "account_snapshot_csv", ACCOUNT_COLS);
  if (result) return result;

  const out = emptyBridgeImportResult<undefined, BridgeAccountSnapshotRow>("account_snapshot_csv");
  out.rawRowCount = body.length;
  const rows: BridgeAccountSnapshotRow[] = [];

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const line = r + 2;
    const errs: BridgeImportError[] = [];
    const schema = parseSchemaCell(cell(ix, row, "schema_version"), errs);
    if (!schema || errs.length) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: invalid schema`,
        rowIndex: line,
      });
      continue;
    }

    const nums = {
      balance: parseFiniteNumber(cell(ix, row, "balance")),
      equity: parseFiniteNumber(cell(ix, row, "equity")),
      margin: parseFiniteNumber(cell(ix, row, "margin")),
      freeMargin: parseFiniteNumber(cell(ix, row, "free_margin")),
      marginLevel: parseFiniteNumber(cell(ix, row, "margin_level")),
      profitOpen: parseFiniteNumber(cell(ix, row, "profit_open")),
      leverage: parseFiniteNumber(cell(ix, row, "leverage")),
    };
    if (Object.values(nums).some((v) => v === null)) {
      out.warnings.push({
        code: "BRIDGE_NUMERIC_INVALID",
        message: `Row ${line}: invalid numeric account field`,
        rowIndex: line,
      });
      continue;
    }

    const tradeAllowed = parseBoolLoose(cell(ix, row, "trade_allowed"));
    const tradeExpert = parseBoolLoose(cell(ix, row, "trade_expert"));
    if (tradeAllowed === null || tradeExpert === null) {
      out.warnings.push({
        code: "BRIDGE_BOOLEAN_INVALID",
        message: `Row ${line}: trade_allowed / trade_expert must be boolean-like`,
        rowIndex: line,
      });
      continue;
    }

    const exportedAtUtc = cell(ix, row, "exported_at_utc");
    const terminalId = cell(ix, row, "terminal_id");
    const accountLogin = cell(ix, row, "account_login");
    const accountServer = cell(ix, row, "account_server");
    const currency = cell(ix, row, "currency");
    const company = cell(ix, row, "company");
    if (!exportedAtUtc || !terminalId || !accountLogin || !accountServer || !currency || !company) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: missing required string field`,
        rowIndex: line,
      });
      continue;
    }

    rows.push({
      schemaVersion: schema,
      exportedAtUtc,
      terminalId,
      accountLogin,
      accountServer,
      currency,
      balance: nums.balance!,
      equity: nums.equity!,
      margin: nums.margin!,
      freeMargin: nums.freeMargin!,
      marginLevel: nums.marginLevel!,
      profitOpen: nums.profitOpen!,
      leverage: nums.leverage!,
      tradeAllowed,
      tradeExpert,
      company,
    });
  }

  out.ok = rows.length > 0;
  out.rows = rows;
  out.parsedRowCount = rows.length;
  if (rows.length === 0) {
    out.errors.push({
      code: "BRIDGE_CSV_EMPTY",
      message: "No valid account snapshot rows parsed",
    });
    out.ok = false;
  }
  return out;
}

export function parseBridgeCandlesCsv(csvText: string): BridgeImportResult<undefined, BridgeCandleRow> {
  const { ix, body, result } = parseCsvHeader<BridgeCandleRow>(csvText, "candles_csv", CANDLE_COLS);
  if (result) return result;

  const out = emptyBridgeImportResult<undefined, BridgeCandleRow>("candles_csv");
  out.rawRowCount = body.length;
  const rows: BridgeCandleRow[] = [];

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const line = r + 2;
    const errs: BridgeImportError[] = [];
    const schema = parseSchemaCell(cell(ix, row, "schema_version"), errs);
    if (!schema || errs.length) {
      out.warnings.push({ code: "BRIDGE_ROW_SKIPPED", message: `Row ${line}: invalid schema`, rowIndex: line });
      continue;
    }

    const ohlc = ["open", "high", "low", "close"] as const;
    const ohlcNums: Record<string, number | null> = {};
    for (const k of ohlc) {
      ohlcNums[k] = parseFiniteNumber(cell(ix, row, k));
    }
    const tv = parseFiniteNumber(cell(ix, row, "tick_volume"));
    const sp = parseFiniteNumber(cell(ix, row, "spread_points"));
    const rv = parseFiniteNumber(cell(ix, row, "real_volume"));
    if ([...Object.values(ohlcNums), tv, sp, rv].some((v) => v === null)) {
      out.warnings.push({
        code: "BRIDGE_NUMERIC_INVALID",
        message: `Row ${line}: invalid OHLC/volume/spread numeric`,
        rowIndex: line,
      });
      continue;
    }

    const isClosed = parseBoolLoose(cell(ix, row, "is_closed"));
    if (isClosed === null) {
      out.warnings.push({
        code: "BRIDGE_BOOLEAN_INVALID",
        message: `Row ${line}: is_closed invalid`,
        rowIndex: line,
      });
      continue;
    }

    const exportId = cell(ix, row, "export_id");
    const exportedAtUtc = cell(ix, row, "exported_at_utc");
    const terminalId = cell(ix, row, "terminal_id");
    const accountLogin = cell(ix, row, "account_login");
    const symbol = cell(ix, row, "symbol");
    const timeframe = cell(ix, row, "timeframe");
    const candleTimeUtc = cell(ix, row, "candle_time_utc");
    const source = cell(ix, row, "source");
    if (!exportId || !exportedAtUtc || !terminalId || !accountLogin || !symbol || !timeframe || !candleTimeUtc || !source) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: missing required string field`,
        rowIndex: line,
      });
      continue;
    }

    rows.push({
      schemaVersion: schema,
      exportId,
      exportedAtUtc,
      terminalId,
      accountLogin,
      symbol,
      timeframe,
      candleTimeUtc,
      open: ohlcNums.open!,
      high: ohlcNums.high!,
      low: ohlcNums.low!,
      close: ohlcNums.close!,
      tickVolume: tv!,
      spreadPoints: sp!,
      realVolume: rv!,
      isClosed,
      source,
    });
  }

  out.ok = rows.length > 0;
  out.rows = rows;
  out.parsedRowCount = rows.length;
  if (rows.length === 0) {
    out.errors.push({ code: "BRIDGE_CSV_EMPTY", message: "No valid candle rows parsed" });
    out.ok = false;
  }
  return out;
}

export function parseBridgePositionsOpenCsv(
  csvText: string,
): BridgeImportResult<undefined, BridgePositionOpenRow> {
  const { ix, body, result } = parseCsvHeader<BridgePositionOpenRow>(csvText, "positions_open_csv", POSITION_COLS);
  if (result) return result;

  const out = emptyBridgeImportResult<undefined, BridgePositionOpenRow>("positions_open_csv");
  out.rawRowCount = body.length;
  const rows: BridgePositionOpenRow[] = [];

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const line = r + 2;
    const errs: BridgeImportError[] = [];
    const schema = parseSchemaCell(cell(ix, row, "schema_version"), errs);
    if (!schema || errs.length) {
      out.warnings.push({ code: "BRIDGE_ROW_SKIPPED", message: `Row ${line}: invalid schema`, rowIndex: line });
      continue;
    }

    const volume = parseFiniteNumber(cell(ix, row, "volume"));
    const priceOpen = parseFiniteNumber(cell(ix, row, "price_open"));
    const sl = parseFiniteNumber(cell(ix, row, "sl"));
    const tp = parseFiniteNumber(cell(ix, row, "tp"));
    const priceCurrent = parseFiniteNumber(cell(ix, row, "price_current"));
    const profit = parseFiniteNumber(cell(ix, row, "profit"));
    const swap = parseFiniteNumber(cell(ix, row, "swap"));
    const commission = parseFiniteNumber(cell(ix, row, "commission"));
    if ([volume, priceOpen, sl, tp, priceCurrent, profit, swap, commission].some((v) => v === null)) {
      out.warnings.push({
        code: "BRIDGE_NUMERIC_INVALID",
        message: `Row ${line}: invalid position numeric`,
        rowIndex: line,
      });
      continue;
    }

    const str = (k: string) => cell(ix, row, k);
    if (
      !str("exported_at_utc") ||
      !str("terminal_id") ||
      !str("account_login") ||
      !str("position_ticket") ||
      !str("symbol") ||
      !str("type") ||
      !str("time_open_utc") ||
      !str("strategy_id") ||
      !str("source_tag")
    ) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: missing required string field`,
        rowIndex: line,
      });
      continue;
    }

    rows.push({
      schemaVersion: schema,
      exportedAtUtc: str("exported_at_utc"),
      terminalId: str("terminal_id"),
      accountLogin: str("account_login"),
      positionTicket: str("position_ticket"),
      symbol: str("symbol"),
      type: str("type"),
      volume: volume!,
      priceOpen: priceOpen!,
      sl: sl!,
      tp: tp!,
      priceCurrent: priceCurrent!,
      profit: profit!,
      swap: swap!,
      commission: commission!,
      magic: str("magic"),
      comment: str("comment"),
      timeOpenUtc: str("time_open_utc"),
      strategyId: str("strategy_id"),
      sourceTag: str("source_tag"),
    });
  }

  out.ok = true;
  out.rows = rows;
  out.parsedRowCount = rows.length;
  return out;
}

export function parseBridgeOrdersPendingCsv(
  csvText: string,
): BridgeImportResult<undefined, BridgeOrderPendingRow> {
  const { ix, body, result } = parseCsvHeader<BridgeOrderPendingRow>(csvText, "orders_pending_csv", ORDER_COLS);
  if (result) return result;

  const out = emptyBridgeImportResult<undefined, BridgeOrderPendingRow>("orders_pending_csv");
  out.rawRowCount = body.length;
  const rows: BridgeOrderPendingRow[] = [];

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const line = r + 2;
    const errs: BridgeImportError[] = [];
    const schema = parseSchemaCell(cell(ix, row, "schema_version"), errs);
    if (!schema || errs.length) {
      out.warnings.push({ code: "BRIDGE_ROW_SKIPPED", message: `Row ${line}: invalid schema`, rowIndex: line });
      continue;
    }

    const volumeInitial = parseFiniteNumber(cell(ix, row, "volume_initial"));
    const volumeCurrent = parseFiniteNumber(cell(ix, row, "volume_current"));
    const priceOpen = parseFiniteNumber(cell(ix, row, "price_open"));
    const sl = parseFiniteNumber(cell(ix, row, "sl"));
    const tp = parseFiniteNumber(cell(ix, row, "tp"));
    const priceCurrent = parseFiniteNumber(cell(ix, row, "price_current"));
    if ([volumeInitial, volumeCurrent, priceOpen, sl, tp, priceCurrent].some((v) => v === null)) {
      out.warnings.push({
        code: "BRIDGE_NUMERIC_INVALID",
        message: `Row ${line}: invalid order numeric`,
        rowIndex: line,
      });
      continue;
    }

    const str = (k: string) => cell(ix, row, k);
    if (
      !str("exported_at_utc") ||
      !str("terminal_id") ||
      !str("account_login") ||
      !str("order_ticket") ||
      !str("symbol") ||
      !str("type") ||
      !str("time_setup_utc") ||
      !str("expiration_utc") ||
      !str("strategy_id") ||
      !str("source_tag")
    ) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: missing required string field`,
        rowIndex: line,
      });
      continue;
    }

    rows.push({
      schemaVersion: schema,
      exportedAtUtc: str("exported_at_utc"),
      terminalId: str("terminal_id"),
      accountLogin: str("account_login"),
      orderTicket: str("order_ticket"),
      symbol: str("symbol"),
      type: str("type"),
      volumeInitial: volumeInitial!,
      volumeCurrent: volumeCurrent!,
      priceOpen: priceOpen!,
      sl: sl!,
      tp: tp!,
      priceCurrent: priceCurrent!,
      magic: str("magic"),
      comment: str("comment"),
      timeSetupUtc: str("time_setup_utc"),
      expirationUtc: str("expiration_utc"),
      strategyId: str("strategy_id"),
      sourceTag: str("source_tag"),
    });
  }

  out.ok = true;
  out.rows = rows;
  out.parsedRowCount = rows.length;
  return out;
}

export function parseBridgeDealsHistoryCsv(
  csvText: string,
): BridgeImportResult<undefined, BridgeDealHistoryRow> {
  const { ix, body, result } = parseCsvHeader<BridgeDealHistoryRow>(csvText, "deals_history_csv", DEAL_COLS);
  if (result) return result;

  const out = emptyBridgeImportResult<undefined, BridgeDealHistoryRow>("deals_history_csv");
  out.rawRowCount = body.length;
  const rows: BridgeDealHistoryRow[] = [];

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const line = r + 2;
    const errs: BridgeImportError[] = [];
    const schema = parseSchemaCell(cell(ix, row, "schema_version"), errs);
    if (!schema || errs.length) {
      out.warnings.push({ code: "BRIDGE_ROW_SKIPPED", message: `Row ${line}: invalid schema`, rowIndex: line });
      continue;
    }

    const volume = parseFiniteNumber(cell(ix, row, "volume"));
    const price = parseFiniteNumber(cell(ix, row, "price"));
    const profit = parseFiniteNumber(cell(ix, row, "profit"));
    const commission = parseFiniteNumber(cell(ix, row, "commission"));
    const swap = parseFiniteNumber(cell(ix, row, "swap"));
    const fee = parseFiniteNumber(cell(ix, row, "fee"));
    if ([volume, price, profit, commission, swap, fee].some((v) => v === null)) {
      out.warnings.push({
        code: "BRIDGE_NUMERIC_INVALID",
        message: `Row ${line}: invalid deal numeric`,
        rowIndex: line,
      });
      continue;
    }

    const str = (k: string) => cell(ix, row, k);
    if (
      !str("exported_at_utc") ||
      !str("terminal_id") ||
      !str("account_login") ||
      !str("deal_ticket") ||
      !str("order_ticket") ||
      !str("position_id") ||
      !str("symbol") ||
      !str("deal_type") ||
      !str("entry_type") ||
      !str("time_utc") ||
      !str("strategy_id") ||
      !str("source_tag")
    ) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: missing required string field`,
        rowIndex: line,
      });
      continue;
    }

    rows.push({
      schemaVersion: schema,
      exportedAtUtc: str("exported_at_utc"),
      terminalId: str("terminal_id"),
      accountLogin: str("account_login"),
      dealTicket: str("deal_ticket"),
      orderTicket: str("order_ticket"),
      positionId: str("position_id"),
      symbol: str("symbol"),
      dealType: str("deal_type"),
      entryType: str("entry_type"),
      volume: volume!,
      price: price!,
      profit: profit!,
      commission: commission!,
      swap: swap!,
      fee: fee!,
      timeUtc: str("time_utc"),
      magic: str("magic"),
      comment: str("comment"),
      reason: str("reason"),
      strategyId: str("strategy_id"),
      sourceTag: str("source_tag"),
    });
  }

  out.rows = rows;
  out.parsedRowCount = rows.length;
  out.ok = true;
  return out;
}

export function parseBridgeErrorsCsv(csvText: string): BridgeImportResult<undefined, BridgeErrorRow> {
  const { ix, body, result } = parseCsvHeader<BridgeErrorRow>(csvText, "bridge_errors_csv", ERROR_COLS);
  if (result) return result;

  const out = emptyBridgeImportResult<undefined, BridgeErrorRow>("bridge_errors_csv");
  out.rawRowCount = body.length;
  const rows: BridgeErrorRow[] = [];

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const line = r + 2;
    const errs: BridgeImportError[] = [];
    const schema = parseSchemaCell(cell(ix, row, "schema_version"), errs);
    if (!schema || errs.length) {
      out.warnings.push({ code: "BRIDGE_ROW_SKIPPED", message: `Row ${line}: invalid schema`, rowIndex: line });
      continue;
    }

    const str = (k: string) => cell(ix, row, k);
    if (
      !str("exported_at_utc") ||
      !str("terminal_id") ||
      !str("account_login") ||
      !str("error_code") ||
      !str("error_message") ||
      !str("module") ||
      !str("severity") ||
      !str("context")
    ) {
      out.warnings.push({
        code: "BRIDGE_ROW_SKIPPED",
        message: `Row ${line}: missing required string field`,
        rowIndex: line,
      });
      continue;
    }

    rows.push({
      schemaVersion: schema,
      exportedAtUtc: str("exported_at_utc"),
      terminalId: str("terminal_id"),
      accountLogin: str("account_login"),
      errorCode: str("error_code"),
      errorMessage: str("error_message"),
      module: str("module"),
      severity: str("severity"),
      context: str("context"),
    });
  }

  out.rows = rows;
  out.parsedRowCount = rows.length;
  out.ok = true;
  return out;
}
