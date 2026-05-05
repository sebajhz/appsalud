/**
 * Types for future MZP_BridgeEA_v1 file exports (contract V1).
 * Naming: TS fields are camelCase; CSV/JSON wire names are snake_case per contract.
 *
 * Schema string: prefer `MZP_BRIDGE_V1`. `QTG_BRIDGE_V1` is accepted as a legacy
 * alias (historical QuerlyTrader Guard naming) — compatibility only, same column set.
 */

export type BridgeSchemaVersion = "MZP_BRIDGE_V1" | "QTG_BRIDGE_V1";

export type BridgeTerminalId = string;

export type BridgeEaStatus = "STARTING" | "RUNNING" | "WARNING" | "ERROR" | "STOPPED";

export interface BridgeStatusSnapshot {
  schemaVersion: BridgeSchemaVersion;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: number;
  accountServer: string;
  accountCurrency?: string;
  bridgeVersion: string;
  eaStatus: BridgeEaStatus;
  autoTradingEnabled?: boolean;
  connected: boolean;
  lastTickTimeUtc?: string;
  symbolsEnabled: string[];
  errorsCount: number;
  lastError?: string;
}

/** One row of `latest_market_snapshot.csv` (contract §9.3 / Build Spec §16). */
export interface BridgeMarketSnapshotRow {
  schemaVersion: BridgeSchemaVersion;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  spreadPoints: number;
  spreadPrice: number;
  point: number;
  digits: number;
  tickSize: number;
  tickValue: number;
  contractSize: number;
  volumeMin: number;
  volumeMax: number;
  volumeStep: number;
  tradeMode: string;
  sessionStatus: string;
  lastTickTimeUtc: string;
}

export interface BridgeAccountSnapshotRow {
  schemaVersion: BridgeSchemaVersion;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: string;
  accountServer: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  profitOpen: number;
  leverage: number;
  tradeAllowed: boolean;
  tradeExpert: boolean;
  company: string;
}

export interface BridgePositionOpenRow {
  schemaVersion: BridgeSchemaVersion;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: string;
  positionTicket: string;
  symbol: string;
  type: string;
  volume: number;
  priceOpen: number;
  sl: number;
  tp: number;
  priceCurrent: number;
  profit: number;
  swap: number;
  commission: number;
  magic: string;
  comment: string;
  timeOpenUtc: string;
  strategyId: string;
  sourceTag: string;
}

export interface BridgeOrderPendingRow {
  schemaVersion: BridgeSchemaVersion;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: string;
  orderTicket: string;
  symbol: string;
  type: string;
  volumeInitial: number;
  volumeCurrent: number;
  priceOpen: number;
  sl: number;
  tp: number;
  priceCurrent: number;
  magic: string;
  comment: string;
  timeSetupUtc: string;
  expirationUtc: string;
  strategyId: string;
  sourceTag: string;
}

export interface BridgeDealHistoryRow {
  schemaVersion: BridgeSchemaVersion;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: string;
  dealTicket: string;
  orderTicket: string;
  positionId: string;
  symbol: string;
  dealType: string;
  entryType: string;
  volume: number;
  price: number;
  profit: number;
  commission: number;
  swap: number;
  fee: number;
  timeUtc: string;
  magic: string;
  comment: string;
  reason: string;
  strategyId: string;
  sourceTag: string;
}

export interface BridgeCandleRow {
  schemaVersion: BridgeSchemaVersion;
  exportId: string;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: string;
  symbol: string;
  timeframe: string;
  candleTimeUtc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume: number;
  spreadPoints: number;
  realVolume: number;
  isClosed: boolean;
  source: string;
}

export interface BridgeErrorRow {
  schemaVersion: BridgeSchemaVersion;
  exportedAtUtc: string;
  terminalId: BridgeTerminalId;
  accountLogin: string;
  errorCode: string;
  errorMessage: string;
  module: string;
  severity: string;
  context: string;
}
