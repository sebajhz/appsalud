import { describe, expect, it } from "vitest";
import {
  deriveSymbolMarketSpecFromBridgeMarketSnapshot,
  makeBridgeAccountKey,
  MOCK_BRIDGE_ACCOUNT_SNAPSHOT_CSV,
  MOCK_BRIDGE_CANDLES_CSV,
  MOCK_BRIDGE_DEALS_HISTORY_CSV,
  MOCK_BRIDGE_ERRORS_CSV,
  MOCK_BRIDGE_INVALID_JSON,
  MOCK_BRIDGE_MARKET_SNAPSHOT_CSV,
  MOCK_BRIDGE_MARKET_SNAPSHOT_CSV_BAD_HEADER,
  MOCK_BRIDGE_ORDERS_PENDING_CSV,
  MOCK_BRIDGE_POSITIONS_EMPTY_CSV,
  MOCK_BRIDGE_POSITIONS_ONE_CSV,
  MOCK_BRIDGE_STATUS_JSON,
  MOCK_BRIDGE_STATUS_JSON_QTG_ALIAS,
  nearlyEqual,
  parseBridgeAccountSnapshotCsv,
  parseBridgeCandlesCsv,
  parseBridgeDealsHistoryCsv,
  parseBridgeErrorsCsv,
  parseBridgeMarketSnapshotCsv,
  parseBridgeOrdersPendingCsv,
  parseBridgePositionsOpenCsv,
  parseBridgeStatusJson,
} from "../src/index";

describe("Checkpoint 10 — bridge_status.json", () => {
  it("parses valid fictional fixture", () => {
    const r = parseBridgeStatusJson(MOCK_BRIDGE_STATUS_JSON);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe("bridge_status_json");
    expect(r.parsedRowCount).toBe(1);
    expect(r.value?.schemaVersion).toBe("MZP_BRIDGE_V1");
    expect(r.value?.terminalId).toBe("MT5_TERMINAL_CP10");
    expect(r.value?.symbolsEnabled).toEqual(["XAUUSD", "EURUSD"]);
    expect(r.value?.diagnosticsCount).toBe(1);
    expect(r.value?.warningsCount).toBe(0);
    expect(r.value?.errorsCount).toBe(0);
  });

  it("accepts bridge_status.json without optional diagnostic counters (pre–CP13.1 wire)", () => {
    const legacy = `{
  "schema_version": "MZP_BRIDGE_V1",
  "exported_at_utc": "2026-05-04T12:00:00Z",
  "terminal_id": "MT5_TERMINAL_CP10",
  "account_login": 100200300,
  "account_server": "MockBroker-Demo",
  "account_currency": "USD",
  "bridge_version": "MZP_BridgeEA_v1",
  "ea_status": "RUNNING",
  "auto_trading_enabled": false,
  "connected": true,
  "last_tick_time_utc": "2026-05-04T11:59:58Z",
  "symbols_enabled": ["XAUUSD", "EURUSD"],
  "errors_count": 0,
  "last_error": ""
}`;
    const r = parseBridgeStatusJson(legacy);
    expect(r.ok).toBe(true);
    expect(r.value?.errorsCount).toBe(0);
    expect(r.value?.diagnosticsCount).toBeUndefined();
    expect(r.value?.warningsCount).toBeUndefined();
  });

  it("accepts QTG_BRIDGE_V1 schema alias", () => {
    const r = parseBridgeStatusJson(MOCK_BRIDGE_STATUS_JSON_QTG_ALIAS);
    expect(r.ok).toBe(true);
    expect(r.value?.schemaVersion).toBe("QTG_BRIDGE_V1");
  });

  it("returns BRIDGE_JSON_INVALID on invalid JSON", () => {
    const r = parseBridgeStatusJson(MOCK_BRIDGE_INVALID_JSON);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "BRIDGE_JSON_INVALID")).toBe(true);
  });

  it("returns error when required field missing", () => {
    const bad = MOCK_BRIDGE_STATUS_JSON.replace(`"terminal_id":`, `"terminal_missing":`);
    const r = parseBridgeStatusJson(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "BRIDGE_JSON_MISSING_FIELD")).toBe(true);
  });
});

describe("Checkpoint 10 — market snapshot CSV", () => {
  it("parses fictional two-symbol fixture", () => {
    const r = parseBridgeMarketSnapshotCsv(MOCK_BRIDGE_MARKET_SNAPSHOT_CSV);
    expect(r.ok).toBe(true);
    expect(r.parsedRowCount).toBe(2);
    expect(r.rows?.map((x) => x.symbol)).toEqual(["XAUUSD", "EURUSD"]);
  });

  it("fails when required contract column missing", () => {
    const r = parseBridgeMarketSnapshotCsv(MOCK_BRIDGE_MARKET_SNAPSHOT_CSV_BAD_HEADER);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "BRIDGE_CSV_MISSING_COLUMN")).toBe(true);
  });

  it("skips row with invalid numeric and derives symbol spec for XAUUSD row", () => {
    const lines = MOCK_BRIDGE_MARKET_SNAPSHOT_CSV.trim().split("\n");
    const header = lines[0]!;
    const goodXau = lines[1]!;
    const badEur =
      "MZP_BRIDGE_V1,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,EURUSD,not_a_number,1.1,1.1,1,0.1,0.00001,5,0.00001,1,100000,0.01,100,0.01,4,OPEN,2026-05-04T11:59:57Z";
    const r = parseBridgeMarketSnapshotCsv(`${header}\n${goodXau}\n${badEur}`);
    expect(r.ok).toBe(true);
    expect(r.parsedRowCount).toBe(1);
    expect(r.warnings.some((w) => w.code === "BRIDGE_NUMERIC_INVALID")).toBe(true);
    const xau = r.rows![0]!;
    expect(xau.symbol).toBe("XAUUSD");
    const d = deriveSymbolMarketSpecFromBridgeMarketSnapshot(xau, {
      accountId: "MOCK_ACC_CP10",
      canonicalSymbol: "XAUUSD",
    });
    expect(d.spec).not.toBeNull();
    expect(d.spec!.brokerSymbol).toBe("XAUUSD");
    expect(d.spec!.canonicalSymbol).toBe("XAUUSD");
    expect(d.spec!.point).toBe(0.01);
    expect(d.spec!.spreadPoints).toBe(10);
    expect(nearlyEqual(d.spec!.spreadPrice, 0.1)).toBe(true);
  });
});

describe("Checkpoint 10 — candles CSV", () => {
  it("parses candle row and boolean is_closed", () => {
    const r = parseBridgeCandlesCsv(MOCK_BRIDGE_CANDLES_CSV);
    expect(r.ok).toBe(true);
    expect(r.rows?.[0]?.isClosed).toBe(true);
    expect(r.rows?.[0]?.timeframe).toBe("M15");
  });

  it("warns and skips row with invalid OHLC", () => {
    const csv = `${MOCK_BRIDGE_CANDLES_CSV.trim()}\nMZP_BRIDGE_V1,EXP2,2026-05-04T12:00:00Z,MT5_TERMINAL_CP10,100200300,XAUUSD,M15,2026-05-04T11:30:00Z,bad,1,1,1,1,1,0,true,MT5_BRIDGE`;
    const r = parseBridgeCandlesCsv(csv);
    expect(r.ok).toBe(true);
    expect(r.parsedRowCount).toBe(1);
    expect(r.warnings.some((w) => w.code === "BRIDGE_NUMERIC_INVALID")).toBe(true);
  });
});

describe("Checkpoint 10 — account snapshot CSV", () => {
  it("parses booleans trade_allowed / trade_expert", () => {
    const r = parseBridgeAccountSnapshotCsv(MOCK_BRIDGE_ACCOUNT_SNAPSHOT_CSV);
    expect(r.ok).toBe(true);
    expect(r.rows?.[0]?.tradeAllowed).toBe(true);
    expect(r.rows?.[0]?.tradeExpert).toBe(false);
  });
});

describe("Checkpoint 10 — positions / orders / deals / errors", () => {
  it("parses header-only positions as ok with zero rows", () => {
    const r = parseBridgePositionsOpenCsv(MOCK_BRIDGE_POSITIONS_EMPTY_CSV);
    expect(r.ok).toBe(true);
    expect(r.parsedRowCount).toBe(0);
  });

  it("parses one mock position", () => {
    const r = parseBridgePositionsOpenCsv(MOCK_BRIDGE_POSITIONS_ONE_CSV);
    expect(r.ok).toBe(true);
    expect(r.parsedRowCount).toBe(1);
    expect(r.rows?.[0]?.positionTicket).toBe("900001");
  });

  it("parses header-only pending orders", () => {
    const r = parseBridgeOrdersPendingCsv(MOCK_BRIDGE_ORDERS_PENDING_CSV);
    expect(r.ok).toBe(true);
    expect(r.parsedRowCount).toBe(0);
  });

  it("parses one deal row", () => {
    const r = parseBridgeDealsHistoryCsv(MOCK_BRIDGE_DEALS_HISTORY_CSV);
    expect(r.ok).toBe(true);
    expect(r.rows?.[0]?.dealTicket).toBe("D9001");
  });

  it("parses one error row", () => {
    const r = parseBridgeErrorsCsv(MOCK_BRIDGE_ERRORS_CSV);
    expect(r.ok).toBe(true);
    expect(r.rows?.[0]?.severity).toBe("WARNING");
  });
});

describe("Checkpoint 10 — makeBridgeAccountKey", () => {
  it("returns stable composite key", () => {
    expect(
      makeBridgeAccountKey({
        terminalId: "T1",
        accountLogin: "100",
        accountServer: "Srv-A",
      }),
    ).toBe("T1|100|Srv-A");
    expect(
      makeBridgeAccountKey({
        terminalId: "T1",
        accountLogin: " 100 ",
        accountServer: "Srv-A",
      }),
    ).toBe("T1|100|Srv-A");
  });
});
