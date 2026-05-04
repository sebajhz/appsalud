import type { AccountId, BrokerSymbol, CanonicalSymbol } from "./ids";

/**
 * Market specification for one account + canonical symbol, aligned with
 * Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1 (MT5-sourced in production).
 */
export interface SymbolMarketSpec {
  accountId: AccountId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol: BrokerSymbol;
  digits: number;
  /** Minimal price increment in quote currency (MT5 `point` / terminal convention). */
  point: number;
  tickSize: number;
  tickValue: number;
  contractSize: number;
  volumeMin: number;
  volumeMax: number;
  volumeStep: number;
  spreadPoints: number;
  /** Spread expressed in price units (not pips). */
  spreadPrice: number;
}
