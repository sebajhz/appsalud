import type { Candle } from "./candle";
import type { BacktestCampaignDataset } from "./backtest-campaign-types";
import { isSupportedBridgeSchemaVersion } from "./bridge-validators";
import { manualCandleDatasetError, manualCandleDatasetWarning } from "./manual-candle-dataset-reasons";
import type {
  CreateBacktestCampaignDatasetFromManualImportOptions,
  ManualCandleDataset,
  ManualCandleDatasetError,
  ManualCandleDatasetFormat,
  ManualCandleDatasetImportInput,
  ManualCandleDatasetImportResult,
  ManualCandleDatasetRow,
  ManualCandleDatasetSourceType,
  ManualCandleDatasetValidationSummary,
  ManualCandleDatasetWarning,
} from "./manual-candle-dataset-types";

const EPS = 1e-9;

const BRIDGE_REQUIRED = [
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

function countDelimiterUnquoted(line: string, d: string): number {
  let n = 0;
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQ = !inQ;
    } else if (!inQ && c === d) {
      n++;
    }
  }
  return n;
}

function firstLogicalLine(text: string): string {
  const t = text.replace(/^\uFEFF/, "");
  const m = t.match(/^[^\r\n]*/);
  return m ? m[0]! : "";
}

function detectDelimiter(line: string): "," | ";" | "\t" {
  const comma = countDelimiterUnquoted(line, ",");
  const semi = countDelimiterUnquoted(line, ";");
  const tab = countDelimiterUnquoted(line, "\t");
  if (semi > comma && semi >= tab && semi > 0) return ";";
  if (tab > comma && tab > semi && tab > 0) return "\t";
  return ",";
}

/** Delimited matrix (comma / semicolon / tab) with RFC4180-style quotes. */
function parseDelimitedTextToMatrix(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  const isSep = (c: string) => (delim === "\t" ? c === "\t" : c === delim);

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    if (row.length === 0 && cell === "") return;
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (isSep(c)) {
      pushCell();
    } else if (c === "\r") {
      if (s[i + 1] === "\n") i++;
      pushRow();
    } else if (c === "\n") {
      pushRow();
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) {
    pushCell();
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
}

function normalizeHeaderCell(h: string): string {
  let s = h.trim();
  if ((s.startsWith("<") && s.endsWith(">")) || (s.startsWith('"') && s.endsWith('"'))) {
    s = s.slice(1, -1).trim();
  }
  return s.toLowerCase().replace(/\s+/g, "_");
}

function buildNormalizedHeaderIndex(headerRow: string[]): Map<string, number> {
  const m = new Map<string, number>();
  headerRow.forEach((raw, i) => {
    const k = normalizeHeaderCell(raw);
    if (k && !m.has(k)) m.set(k, i);
  });
  return m;
}

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

function parseMt5DateTimeUtcMs(dateCell: string, timeCell: string): number | null {
  const d = dateCell.trim().replace(/\//g, ".");
  const tm = timeCell.trim();
  const dp = d.split(".");
  if (dp.length !== 3) return null;
  const y = Number(dp[0]);
  const mo = Number(dp[1]);
  const da = Number(dp[2]);
  if (![y, mo, da].every((x) => Number.isFinite(x))) return null;
  const tp = tm.split(":");
  const hh = Number(tp[0] ?? 0);
  const mm = Number(tp[1] ?? 0);
  const ss = Number(tp[2] ?? 0);
  if (![hh, mm, ss].every((x) => Number.isFinite(x))) return null;
  const ms = Date.UTC(y, mo - 1, da, hh, mm, ss);
  return Number.isFinite(ms) ? ms : null;
}

function parseTimeMsGeneric(raw: string): number | null {
  const t = Date.parse(raw);
  if (Number.isFinite(t)) return t;
  const m = raw.trim().match(/^(\d{4})[.\-/](\d{2})[.\-/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const hh = m[4] != null ? Number(m[4]) : 0;
  const mm = m[5] != null ? Number(m[5]) : 0;
  const ss = m[6] != null ? Number(m[6]) : 0;
  const ms = Date.UTC(y, mo - 1, da, hh, mm, ss);
  return Number.isFinite(ms) ? ms : null;
}

function ohlcConsistent(o: number, h: number, l: number, c: number): boolean {
  const hi = Math.max(o, c);
  const lo = Math.min(o, c);
  return h + EPS >= hi && l - EPS <= lo && h + EPS >= l;
}

function missingCols(ix: Map<string, number>, names: readonly string[]): string[] {
  return names.filter((n) => !ix.has(n));
}

type ResolvedFormat = Exclude<ManualCandleDatasetFormat, "auto_detect">;

function detectFormat(ix: Map<string, number>): ResolvedFormat | "unknown" {
  if (missingCols(ix, BRIDGE_REQUIRED).length === 0) return "mapazapp_bridge_candles_v1";
  const hasMt5 =
    ix.has("date") &&
    ix.has("time") &&
    ix.has("open") &&
    ix.has("high") &&
    ix.has("low") &&
    ix.has("close");
  if (hasMt5) return "mt5_rates_like";
  const timeKey = ["time", "timestamp", "candle_time_utc", "datetime", "date"].find((k) => ix.has(k));
  const hasGeneric =
    !!timeKey && ix.has("open") && ix.has("high") && ix.has("low") && ix.has("close");
  if (hasGeneric) return "generic_ohlc";
  return "unknown";
}

function resolveSourceType(
  hint: ManualCandleDatasetSourceType | undefined,
  fmt: ResolvedFormat | "unknown",
): ManualCandleDatasetSourceType {
  if (hint && hint !== "unknown") return hint;
  if (fmt === "mapazapp_bridge_candles_v1") return "bridge_candles_csv_text";
  if (fmt === "generic_ohlc") return "generic_ohlc_csv_text";
  if (fmt === "mt5_rates_like") return "mt5_export_csv_text";
  return "unknown";
}

function inferBrokerSymbol(input: ManualCandleDatasetImportInput): string | undefined {
  return input.brokerSymbol ?? input.canonicalSymbol;
}

export function importManualCandleDataset(input: ManualCandleDatasetImportInput): ManualCandleDatasetImportResult {
  const errors: ManualCandleDatasetError[] = [];
  const warnings: ManualCandleDatasetWarning[] = [];
  const emptySummary: ManualCandleDatasetValidationSummary = {
    delimiter: ",",
    resolvedFormat: "unknown",
    duplicateTimestampCount: 0,
    hadUnsortedInput: false,
    rowCount: 0,
    validRowCount: 0,
    skippedRowCount: 0,
  };

  const raw = input.csvText ?? "";
  if (!raw.trim()) {
    errors.push(manualCandleDatasetError("MANUAL_CSV_EMPTY", "CSV text is empty"));
    return { ok: false, dataset: null, errors, warnings, validationSummary: emptySummary };
  }

  const delim = detectDelimiter(firstLogicalLine(raw));
  const matrix = parseDelimitedTextToMatrix(raw, delim);
  if (matrix.length === 0) {
    errors.push(manualCandleDatasetError("MANUAL_CSV_EMPTY", "No CSV rows parsed"));
    return { ok: false, dataset: null, errors, warnings, validationSummary: { ...emptySummary, delimiter: delim } };
  }

  const headerCells = matrix[0]!.map((h) => String(h).trim());
  if (headerCells.length === 0 || headerCells.every((h) => h === "")) {
    errors.push(manualCandleDatasetError("MANUAL_MISSING_HEADER", "Missing CSV header row"));
    return { ok: false, dataset: null, errors, warnings, validationSummary: { ...emptySummary, delimiter: delim } };
  }

  const ix = buildNormalizedHeaderIndex(headerCells);
  let fmt: ResolvedFormat | "unknown" =
    input.formatHint && input.formatHint !== "auto_detect" ? input.formatHint : detectFormat(ix);

  if (input.formatHint && input.formatHint !== "auto_detect") {
    const detected = detectFormat(ix);
    if (detected !== input.formatHint) {
      errors.push(
        manualCandleDatasetError(
          "MANUAL_FORMAT_HINT_MISMATCH",
          `formatHint ${input.formatHint} does not match CSV shape (detected ${detected})`,
          `detected=${detected}`,
        ),
      );
      return {
        ok: false,
        dataset: null,
        errors,
        warnings,
        validationSummary: {
          delimiter: delim,
          resolvedFormat: detected === "unknown" ? "unknown" : detected,
          duplicateTimestampCount: 0,
          hadUnsortedInput: false,
          rowCount: matrix.length - 1,
          validRowCount: 0,
          skippedRowCount: 0,
        },
      };
    }
    fmt = input.formatHint;
  } else if (fmt === "unknown") {
    errors.push(
      manualCandleDatasetError(
        "MANUAL_FORMAT_UNRECOGNIZED",
        "Could not recognize candle CSV format (expected BridgeEA candles, generic OHLC, or MT5-like DATE/TIME + OHLC)",
      ),
    );
    return {
      ok: false,
      dataset: null,
      errors,
      warnings,
      validationSummary: {
        delimiter: delim,
        resolvedFormat: "unknown",
        duplicateTimestampCount: 0,
        hadUnsortedInput: false,
        rowCount: matrix.length - 1,
        validRowCount: 0,
        skippedRowCount: 0,
      },
    };
  }

  const body = matrix.slice(1);
  const rowCount = body.length;
  let skippedRowCount = 0;
  const parsedRows: ManualCandleDatasetRow[] = [];
  const timesInOrder: number[] = [];

  const pushParsed = (row: ManualCandleDatasetRow) => {
    parsedRows.push(row);
    timesInOrder.push(row.timeMs);
  };

  if (fmt === "mapazapp_bridge_candles_v1") {
    const miss = missingCols(ix, BRIDGE_REQUIRED);
    if (miss.length) {
      errors.push(
        manualCandleDatasetError(
          "MANUAL_MISSING_REQUIRED_COLUMNS",
          `Missing required column(s): ${miss.join(", ")}`,
        ),
      );
      return {
        ok: false,
        dataset: null,
        errors,
        warnings,
        validationSummary: {
          delimiter: delim,
          resolvedFormat: fmt,
          duplicateTimestampCount: 0,
          hadUnsortedInput: false,
          rowCount,
          validRowCount: 0,
          skippedRowCount: 0,
        },
      };
    }
  }

  if (fmt === "generic_ohlc") {
    const tk = (["time", "timestamp", "candle_time_utc", "datetime", "date"] as const).find((k) => ix.has(k));
    if (!tk) {
      errors.push(
        manualCandleDatasetError(
          "MANUAL_MISSING_REQUIRED_COLUMNS",
          "Generic OHLC format requires a time column (time, timestamp, date, datetime, or candle_time_utc)",
        ),
      );
      return {
        ok: false,
        dataset: null,
        errors,
        warnings,
        validationSummary: {
          delimiter: delim,
          resolvedFormat: fmt,
          duplicateTimestampCount: 0,
          hadUnsortedInput: false,
          rowCount,
          validRowCount: 0,
          skippedRowCount: 0,
        },
      };
    }
  }

  for (let r = 0; r < body.length; r++) {
    const row = body[r]!;
    const lineNo = r + 2;

    if (fmt === "mapazapp_bridge_candles_v1") {
      const schemaRaw = cell(ix, row, "schema_version");
      if (!isSupportedBridgeSchemaVersion(schemaRaw)) {
        warnings.push(
          manualCandleDatasetWarning("MANUAL_ROW_SKIPPED", `Row ${lineNo}: unsupported schema_version`, {
            rowIndex: lineNo,
            detail: schemaRaw,
          }),
        );
        skippedRowCount++;
        continue;
      }

      const o = parseFiniteNumber(cell(ix, row, "open"));
      const h = parseFiniteNumber(cell(ix, row, "high"));
      const l = parseFiniteNumber(cell(ix, row, "low"));
      const c = parseFiniteNumber(cell(ix, row, "close"));
      const tv = parseFiniteNumber(cell(ix, row, "tick_volume"));
      const sp = parseFiniteNumber(cell(ix, row, "spread_points"));
      const rv = parseFiniteNumber(cell(ix, row, "real_volume"));
      const isClosed = parseBoolLoose(cell(ix, row, "is_closed"));
      const tRaw = cell(ix, row, "candle_time_utc");
      const tMs = parseTimeMsGeneric(tRaw);
      if ([o, h, l, c, tv, sp, rv].some((x) => x === null) || isClosed === null || tMs === null) {
        warnings.push(
          manualCandleDatasetWarning("MANUAL_ROW_SKIPPED", `Row ${lineNo}: invalid numeric/time/boolean field`, {
            rowIndex: lineNo,
          }),
        );
        skippedRowCount++;
        continue;
      }
      if (!ohlcConsistent(o!, h!, l!, c!)) {
        warnings.push(
          manualCandleDatasetWarning("MANUAL_ROW_SKIPPED", `Row ${lineNo}: OHLC inconsistency`, { rowIndex: lineNo }),
        );
        skippedRowCount++;
        continue;
      }

      const csvSym = cell(ix, row, "symbol");
      const csvTf = cell(ix, row, "timeframe");
      if (csvSym && csvSym !== input.canonicalSymbol) {
        warnings.push(
          manualCandleDatasetWarning(
            "MANUAL_SYMBOL_MISMATCH",
            `Row ${lineNo}: CSV symbol "${csvSym}" differs from expected canonical "${input.canonicalSymbol}"`,
            { rowIndex: lineNo, detail: csvSym },
          ),
        );
      }
      if (csvTf && csvTf !== input.timeframe) {
        warnings.push(
          manualCandleDatasetWarning(
            "MANUAL_TIMEFRAME_MISMATCH",
            `Row ${lineNo}: CSV timeframe "${csvTf}" differs from expected "${input.timeframe}"`,
            { rowIndex: lineNo, detail: csvTf },
          ),
        );
      }

      const mRow: ManualCandleDatasetRow = {
        timeMs: tMs,
        open: o!,
        high: h!,
        low: l!,
        close: c!,
        tickVolume: tv!,
        spreadPoints: sp!,
        realVolume: rv!,
        isClosed: isClosed!,
        rawSymbol: csvSym || undefined,
        rawTimeframe: csvTf || undefined,
      };
      pushParsed(mRow);
      continue;
    }

    if (fmt === "generic_ohlc") {
      const timeKey = (["time", "timestamp", "candle_time_utc", "datetime", "date"] as const).find((k) => ix.has(k))!;
      const o = parseFiniteNumber(cell(ix, row, "open"));
      const h = parseFiniteNumber(cell(ix, row, "high"));
      const l = parseFiniteNumber(cell(ix, row, "low"));
      const c = parseFiniteNumber(cell(ix, row, "close"));
      const tRaw = cell(ix, row, timeKey);
      const tMs = parseTimeMsGeneric(tRaw);
      if ([o, h, l, c].some((x) => x === null) || tMs === null) {
        warnings.push(
          manualCandleDatasetWarning("MANUAL_ROW_SKIPPED", `Row ${lineNo}: invalid OHLC or time`, { rowIndex: lineNo }),
        );
        skippedRowCount++;
        continue;
      }
      if (!ohlcConsistent(o!, h!, l!, c!)) {
        warnings.push(
          manualCandleDatasetWarning("MANUAL_ROW_SKIPPED", `Row ${lineNo}: OHLC inconsistency`, { rowIndex: lineNo }),
        );
        skippedRowCount++;
        continue;
      }
      const tv = ix.has("tick_volume") ? parseFiniteNumber(cell(ix, row, "tick_volume")) : null;
      const sp = ix.has("spread_points") ? parseFiniteNumber(cell(ix, row, "spread_points")) : null;
      const ic = ix.has("is_closed") ? parseBoolLoose(cell(ix, row, "is_closed")) : null;
      const rv = ix.has("real_volume") ? parseFiniteNumber(cell(ix, row, "real_volume")) : null;
      const mRow: ManualCandleDatasetRow = {
        timeMs: tMs,
        open: o!,
        high: h!,
        low: l!,
        close: c!,
        tickVolume: tv ?? undefined,
        spreadPoints: sp ?? undefined,
        realVolume: rv ?? undefined,
        isClosed: ic ?? undefined,
      };
      pushParsed(mRow);
      continue;
    }

    if (fmt === "mt5_rates_like") {
      const o = parseFiniteNumber(cell(ix, row, "open"));
      const h = parseFiniteNumber(cell(ix, row, "high"));
      const l = parseFiniteNumber(cell(ix, row, "low"));
      const c = parseFiniteNumber(cell(ix, row, "close"));
      const d = cell(ix, row, "date");
      const tm = cell(ix, row, "time");
      const tMs = parseMt5DateTimeUtcMs(d, tm);
      if ([o, h, l, c].some((x) => x === null) || tMs === null) {
        warnings.push(
          manualCandleDatasetWarning("MANUAL_ROW_SKIPPED", `Row ${lineNo}: invalid MT5 OHLC or date/time`, {
            rowIndex: lineNo,
          }),
        );
        skippedRowCount++;
        continue;
      }
      if (!ohlcConsistent(o!, h!, l!, c!)) {
        warnings.push(
          manualCandleDatasetWarning("MANUAL_ROW_SKIPPED", `Row ${lineNo}: OHLC inconsistency`, { rowIndex: lineNo }),
        );
        skippedRowCount++;
        continue;
      }
      const tickvol =
        parseFiniteNumber(cell(ix, row, "tickvol")) ??
        parseFiniteNumber(cell(ix, row, "tick_volume")) ??
        parseFiniteNumber(cell(ix, row, "volume"));
      const realVol = parseFiniteNumber(cell(ix, row, "vol")) ?? parseFiniteNumber(cell(ix, row, "real_volume"));
      const spread =
        parseFiniteNumber(cell(ix, row, "spread")) ?? parseFiniteNumber(cell(ix, row, "spread_points"));

      const mRow: ManualCandleDatasetRow = {
        timeMs: tMs,
        open: o!,
        high: h!,
        low: l!,
        close: c!,
        tickVolume: tickvol ?? undefined,
        spreadPoints: spread ?? undefined,
        realVolume: realVol ?? undefined,
        isClosed: true,
      };
      pushParsed(mRow);
    }
  }

  if (parsedRows.length === 0) {
    errors.push(manualCandleDatasetError("MANUAL_NO_VALID_ROWS", "No valid candle rows after validation"));
    return {
      ok: false,
      dataset: null,
      errors,
      warnings,
      validationSummary: {
        delimiter: delim,
        resolvedFormat: fmt,
        duplicateTimestampCount: 0,
        hadUnsortedInput: false,
        rowCount,
        validRowCount: 0,
        skippedRowCount,
      },
    };
  }

  const sortedTimes = [...timesInOrder].sort((a, b) => a - b);
  let hadUnsortedInput = false;
  for (let i = 0; i < timesInOrder.length; i++) {
    if (timesInOrder[i] !== sortedTimes[i]) {
      hadUnsortedInput = true;
      break;
    }
  }
  if (hadUnsortedInput) {
    warnings.push(
      manualCandleDatasetWarning(
        "MANUAL_ROWS_REORDERED",
        "Rows were not strictly sorted by time; output candles are sorted ascending",
      ),
    );
  }

  const orderIdx = parsedRows.map((_, i) => i).sort((a, b) => parsedRows[a]!.timeMs - parsedRows[b]!.timeMs);
  const sortedRows = orderIdx.map((i) => parsedRows[i]!);
  const sortedCandles: Candle[] = sortedRows.map((pr) => ({
    time: pr.timeMs,
    open: pr.open,
    high: pr.high,
    low: pr.low,
    close: pr.close,
    ...(pr.tickVolume != null ? { tickVolume: pr.tickVolume } : {}),
    ...(pr.spreadPoints != null ? { spreadPoints: pr.spreadPoints } : {}),
    ...(pr.isClosed != null ? { isClosed: pr.isClosed } : {}),
  }));

  let duplicateTimestampCount = 0;
  for (let i = 1; i < sortedRows.length; i++) {
    if (sortedRows[i]!.timeMs === sortedRows[i - 1]!.timeMs) duplicateTimestampCount++;
  }
  if (duplicateTimestampCount > 0) {
    warnings.push(
      manualCandleDatasetWarning(
        "MANUAL_DUPLICATE_TIMESTAMPS",
        `Found ${duplicateTimestampCount} duplicate timestamp entr${duplicateTimestampCount === 1 ? "y" : "ies"} after sort`,
        { detail: String(duplicateTimestampCount) },
      ),
    );
  }

  if (input.minRows != null && sortedCandles.length < input.minRows) {
    warnings.push(
      manualCandleDatasetWarning(
        "MANUAL_LOW_ROW_COUNT",
        `Valid row count ${sortedCandles.length} is below minRows=${input.minRows}`,
        { detail: String(input.minRows) },
      ),
    );
  }

  const sourceType = resolveSourceType(input.sourceTypeHint, fmt);
  if (sourceType === "unknown") {
    warnings.push(
      manualCandleDatasetWarning(
        "MANUAL_UNKNOWN_SOURCE_TYPE",
        "sourceType resolved to unknown; set sourceTypeHint if you need a concrete provenance label",
      ),
    );
  }

  const dataset: ManualCandleDataset = {
    candles: sortedCandles,
    canonicalSymbol: input.canonicalSymbol,
    brokerSymbol: inferBrokerSymbol(input),
    timeframe: input.timeframe,
    datasetSplit: input.datasetSplit,
    sourceName: input.sourceName,
    sourceType,
    detectedFormat: fmt,
    rowCount,
    validRowCount: sortedCandles.length,
    skippedRowCount,
    ...(input.includeParsedRows ? { rows: sortedRows } : {}),
  };

  return {
    ok: true,
    dataset,
    errors,
    warnings,
    validationSummary: {
      delimiter: delim,
      resolvedFormat: fmt,
      duplicateTimestampCount,
      hadUnsortedInput,
      rowCount,
      validRowCount: sortedCandles.length,
      skippedRowCount,
    },
  };
}

export function createBacktestCampaignDatasetFromManualImport(
  result: ManualCandleDatasetImportResult,
  options: CreateBacktestCampaignDatasetFromManualImportOptions,
): BacktestCampaignDataset | null {
  if (!result.ok || !result.dataset) return null;
  const d = result.dataset;
  return {
    datasetId: options.datasetId,
    symbol: d.canonicalSymbol,
    brokerSymbol: d.brokerSymbol,
    timeframe: d.timeframe,
    candles: d.candles,
    symbolProfile: options.symbolProfile,
    datasetSplit: d.datasetSplit,
    sourceName: d.sourceName,
  };
}
