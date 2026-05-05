/**
 * Common parse/import envelope for BridgeEA export payloads (in-memory text only).
 * @see Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md
 */

export type BridgeExportKind =
  | "bridge_status_json"
  | "market_snapshot_csv"
  | "account_snapshot_csv"
  | "candles_csv"
  | "positions_open_csv"
  | "orders_pending_csv"
  | "deals_history_csv"
  | "bridge_errors_csv";

/** Stable diagnostic codes for parsers (errors and warnings). */
export type BridgeDiagnosticCode =
  | "BRIDGE_JSON_INVALID"
  | "BRIDGE_JSON_NOT_OBJECT"
  | "BRIDGE_CSV_EMPTY"
  | "BRIDGE_CSV_MISSING_HEADER"
  | "BRIDGE_CSV_MISSING_COLUMN"
  | "BRIDGE_SCHEMA_UNSUPPORTED"
  | "BRIDGE_NUMERIC_INVALID"
  | "BRIDGE_BOOLEAN_INVALID"
  | "BRIDGE_DATE_INVALID"
  | "BRIDGE_ROW_SKIPPED"
  | "BRIDGE_SYMBOL_PROFILE_INCOMPLETE"
  | "BRIDGE_JSON_MISSING_FIELD"
  | "BRIDGE_JSON_FIELD_TYPE";

export interface BridgeImportError {
  code: BridgeDiagnosticCode;
  message: string;
  detail?: string;
}

export interface BridgeImportWarning {
  code: BridgeDiagnosticCode;
  message: string;
  detail?: string;
  rowIndex?: number;
}

export interface BridgeImportResult<TValue = unknown, TRow = unknown> {
  ok: boolean;
  kind: BridgeExportKind;
  /** Present for JSON bridge status. */
  value?: TValue;
  /** Present for CSV exports (parsed rows). */
  rows?: TRow[];
  errors: BridgeImportError[];
  warnings: BridgeImportWarning[];
  /** Data lines seen (excluding header); for JSON, 1 if a root object was parsed, else 0. */
  rawRowCount: number;
  /** Successfully validated rows (or 1 for successful JSON snapshot). */
  parsedRowCount: number;
}

export function emptyBridgeImportResult<TValue = unknown, TRow = unknown>(
  kind: BridgeExportKind,
): BridgeImportResult<TValue, TRow> {
  return {
    ok: false,
    kind,
    errors: [],
    warnings: [],
    rawRowCount: 0,
    parsedRowCount: 0,
  };
}
