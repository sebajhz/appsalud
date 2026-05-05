import {
  MOCK_BRIDGE_ACCOUNT_SNAPSHOT_CSV,
  MOCK_BRIDGE_CANDLES_CSV,
  MOCK_BRIDGE_DEALS_HISTORY_CSV,
  MOCK_BRIDGE_ERRORS_CSV,
  MOCK_BRIDGE_MARKET_SNAPSHOT_CSV,
  MOCK_BRIDGE_ORDERS_PENDING_CSV,
  MOCK_BRIDGE_POSITIONS_EMPTY_CSV,
  MOCK_BRIDGE_STATUS_JSON,
  parseBridgeAccountSnapshotCsv,
  parseBridgeCandlesCsv,
  parseBridgeDealsHistoryCsv,
  parseBridgeErrorsCsv,
  parseBridgeMarketSnapshotCsv,
  parseBridgeOrdersPendingCsv,
  parseBridgePositionsOpenCsv,
  parseBridgeStatusJson,
} from "@workspace/mapazapp-core";

export function loadMockBridgeImportSummary() {
  return {
    status: parseBridgeStatusJson(MOCK_BRIDGE_STATUS_JSON),
    market: parseBridgeMarketSnapshotCsv(MOCK_BRIDGE_MARKET_SNAPSHOT_CSV),
    account: parseBridgeAccountSnapshotCsv(MOCK_BRIDGE_ACCOUNT_SNAPSHOT_CSV),
    candles: parseBridgeCandlesCsv(MOCK_BRIDGE_CANDLES_CSV),
    positions: parseBridgePositionsOpenCsv(MOCK_BRIDGE_POSITIONS_EMPTY_CSV),
    orders: parseBridgeOrdersPendingCsv(MOCK_BRIDGE_ORDERS_PENDING_CSV),
    deals: parseBridgeDealsHistoryCsv(MOCK_BRIDGE_DEALS_HISTORY_CSV),
    errors: parseBridgeErrorsCsv(MOCK_BRIDGE_ERRORS_CSV),
  };
}
