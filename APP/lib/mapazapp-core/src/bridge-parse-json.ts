import { emptyBridgeImportResult, type BridgeImportResult } from "./bridge-import-result";
import type { BridgeStatusSnapshot } from "./bridge-types";
import { isSupportedBridgeSchemaVersion, parseBridgeEaStatus } from "./bridge-validators";

/**
 * Parse `bridge_status.json` text (contract §9.1). No file I/O.
 */
export function parseBridgeStatusJson(jsonText: string): BridgeImportResult<BridgeStatusSnapshot, never> {
  const out = emptyBridgeImportResult<BridgeStatusSnapshot, never>("bridge_status_json");
  out.rawRowCount = 1;

  let root: unknown;
  try {
    root = JSON.parse(jsonText) as unknown;
  } catch (e) {
    out.errors.push({
      code: "BRIDGE_JSON_INVALID",
      message: "JSON parse failed",
      detail: e instanceof Error ? e.message : String(e),
    });
    return out;
  }

  if (root === null || typeof root !== "object" || Array.isArray(root)) {
    out.errors.push({
      code: "BRIDGE_JSON_NOT_OBJECT",
      message: "Root JSON value must be an object",
    });
    return out;
  }

  const o = root as Record<string, unknown>;

  const reqStr = (k: string): string | null => {
    const v = o[k];
    if (v === undefined || v === null) return null;
    if (typeof v !== "string" || v.trim() === "") return null;
    return v.trim();
  };

  const reqNum = (k: string): number | null => {
    const v = o[k];
    if (v === undefined || v === null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const reqBool = (k: string): boolean | null => {
    const v = o[k];
    if (v === undefined || v === null) return null;
    if (typeof v === "boolean") return v;
    return null;
  };

  const schema = reqStr("schema_version");
  if (!schema) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing schema_version" });
    return out;
  }
  if (!isSupportedBridgeSchemaVersion(schema)) {
    out.errors.push({
      code: "BRIDGE_SCHEMA_UNSUPPORTED",
      message: `Unsupported schema_version: ${schema}`,
      detail: "Expected MZP_BRIDGE_V1 or QTG_BRIDGE_V1",
    });
    return out;
  }

  const exportedAtUtc = reqStr("exported_at_utc");
  if (!exportedAtUtc) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing exported_at_utc" });
    return out;
  }

  const terminalId = reqStr("terminal_id");
  if (!terminalId) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing terminal_id" });
    return out;
  }

  const accountLogin = reqNum("account_login");
  if (accountLogin === null) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing or invalid account_login" });
    return out;
  }

  const accountServer = reqStr("account_server");
  if (!accountServer) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing account_server" });
    return out;
  }

  const bridgeVersion = reqStr("bridge_version");
  if (!bridgeVersion) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing bridge_version" });
    return out;
  }

  const eaRaw = reqStr("ea_status");
  if (!eaRaw) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing ea_status" });
    return out;
  }
  const eaStatus = parseBridgeEaStatus(eaRaw);
  if (!eaStatus) {
    out.errors.push({
      code: "BRIDGE_JSON_FIELD_TYPE",
      message: "Invalid ea_status",
      detail: eaRaw,
    });
    return out;
  }

  const connected = reqBool("connected");
  if (connected === null) {
    out.errors.push({ code: "BRIDGE_JSON_MISSING_FIELD", message: "Missing or invalid connected (boolean required)" });
    return out;
  }

  const sym = o["symbols_enabled"];
  if (!Array.isArray(sym)) {
    out.errors.push({
      code: "BRIDGE_JSON_FIELD_TYPE",
      message: "symbols_enabled must be an array of strings",
    });
    return out;
  }
  const symbolsEnabled: string[] = [];
  for (const item of sym) {
    if (typeof item !== "string") {
      out.errors.push({
        code: "BRIDGE_JSON_FIELD_TYPE",
        message: "symbols_enabled must contain only strings",
      });
      return out;
    }
    symbolsEnabled.push(item);
  }

  const errorsCount = reqNum("errors_count");
  if (errorsCount === null || !Number.isFinite(errorsCount) || errorsCount < 0) {
    out.errors.push({
      code: "BRIDGE_JSON_MISSING_FIELD",
      message: "Missing or invalid errors_count",
    });
    return out;
  }

  const accountCurrency = reqStr("account_currency") ?? undefined;
  const autoTradingEnabled =
    typeof o["auto_trading_enabled"] === "boolean" ? o["auto_trading_enabled"] : undefined;
  const lastTickTimeUtc = reqStr("last_tick_time_utc") ?? undefined;
  const lastError = typeof o["last_error"] === "string" ? o["last_error"] : undefined;

  const snap: BridgeStatusSnapshot = {
    schemaVersion: schema,
    exportedAtUtc,
    terminalId,
    accountLogin,
    accountServer,
    accountCurrency,
    bridgeVersion,
    eaStatus,
    autoTradingEnabled,
    connected,
    lastTickTimeUtc,
    symbolsEnabled,
    errorsCount,
    lastError,
  };

  out.ok = true;
  out.value = snap;
  out.parsedRowCount = 1;
  return out;
}
