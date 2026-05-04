/**
 * Dashboard mock-only `SymbolMarketSpec` rows (not BridgeEA truth).
 * @see IMPLEMENTATION_ASSUMPTIONS.md checkpoint 4
 */
import type { AccountId, SymbolMarketSpec } from "@workspace/mapazapp-core";
import { mockConfig } from "@/mock/config";

/** Synthetic spread in points per canonical symbol for mock UI only. */
const MOCK_SPREAD_POINTS: Record<string, number> = {
  XAUUSD: 25,
  EURUSD: 12,
  USDJPY: 10,
  GBPUSD: 14,
  NAS100: 15,
  BTCUSD: 80,
};

const DEFAULT_CONTRACT: Pick<
  SymbolMarketSpec,
  "tickValue" | "contractSize" | "volumeMin" | "volumeMax" | "volumeStep"
> = {
  tickValue: 1,
  contractSize: 100000,
  volumeMin: 0.01,
  volumeMax: 100,
  volumeStep: 0.01,
};

const METALS: Partial<typeof DEFAULT_CONTRACT> = {
  contractSize: 100,
  tickValue: 1,
  volumeMax: 50,
};

const INDEX: Partial<typeof DEFAULT_CONTRACT> = {
  contractSize: 1,
  tickValue: 1,
  volumeMin: 0.1,
  volumeMax: 100,
  volumeStep: 0.1,
};

const CRYPTO: Partial<typeof DEFAULT_CONTRACT> = {
  contractSize: 1,
  tickValue: 0.01,
  volumeMax: 25,
  volumeStep: 0.01,
};

function contractForSymbol(symbol: string): Partial<typeof DEFAULT_CONTRACT> {
  if (symbol === "XAUUSD") return METALS;
  if (symbol === "NAS100") return INDEX;
  if (symbol === "BTCUSD") return CRYPTO;
  return {};
}

/**
 * Resolves `SymbolMarketSpec` for `accountId` + canonical symbol from `mockConfig.symbolMappings`
 * plus documented mock-only defaults for spread and volume.
 */
function specFromMappingRow(row: (typeof mockConfig.symbolMappings)[0]): SymbolMarketSpec {
  const spreadPts = MOCK_SPREAD_POINTS[row.canonicalSymbol] ?? 20;
  const spreadPrice = spreadPts * row.point;
  const extra = contractForSymbol(row.canonicalSymbol);
  return {
    accountId: row.accountId as AccountId,
    canonicalSymbol: row.canonicalSymbol,
    brokerSymbol: row.brokerSymbol,
    digits: row.digits,
    point: row.point,
    tickSize: row.tickSize,
    tickValue: extra.tickValue ?? DEFAULT_CONTRACT.tickValue,
    contractSize: extra.contractSize ?? DEFAULT_CONTRACT.contractSize,
    volumeMin: extra.volumeMin ?? DEFAULT_CONTRACT.volumeMin,
    volumeMax: extra.volumeMax ?? DEFAULT_CONTRACT.volumeMax,
    volumeStep: extra.volumeStep ?? DEFAULT_CONTRACT.volumeStep,
    spreadPoints: spreadPts,
    spreadPrice,
  };
}

/** Fallback when `mockConfig.symbolMappings` has no row (checkpoint 4 — not broker truth). */
function fallbackMockSpec(accountId: AccountId, canonicalSymbol: string): SymbolMarketSpec | undefined {
  const spreadPts = MOCK_SPREAD_POINTS[canonicalSymbol] ?? 20;
  switch (canonicalSymbol) {
    case "GBPUSD":
      return {
        accountId,
        canonicalSymbol,
        brokerSymbol: `${canonicalSymbol}m`,
        digits: 5,
        point: 1e-5,
        tickSize: 1e-5,
        tickValue: 1,
        contractSize: 100000,
        volumeMin: 0.01,
        volumeMax: 100,
        volumeStep: 0.01,
        spreadPoints: spreadPts,
        spreadPrice: spreadPts * 1e-5,
      };
    case "NAS100":
      return {
        accountId,
        canonicalSymbol,
        brokerSymbol: "USTEC",
        digits: 1,
        point: 0.1,
        tickSize: 0.1,
        tickValue: 1,
        contractSize: 1,
        volumeMin: 0.1,
        volumeMax: 100,
        volumeStep: 0.1,
        spreadPoints: spreadPts,
        spreadPrice: spreadPts * 0.1,
      };
    case "BTCUSD":
      return {
        accountId,
        canonicalSymbol,
        brokerSymbol: canonicalSymbol,
        digits: 1,
        point: 0.1,
        tickSize: 0.1,
        tickValue: 0.01,
        contractSize: 1,
        volumeMin: 0.01,
        volumeMax: 25,
        volumeStep: 0.01,
        spreadPoints: spreadPts,
        spreadPrice: spreadPts * 0.1,
      };
    case "USDJPY":
      return {
        accountId,
        canonicalSymbol,
        brokerSymbol: canonicalSymbol,
        digits: 3,
        point: 0.001,
        tickSize: 0.001,
        tickValue: 0.91,
        contractSize: 100000,
        volumeMin: 0.01,
        volumeMax: 100,
        volumeStep: 0.01,
        spreadPoints: spreadPts,
        spreadPrice: spreadPts * 0.001,
      };
    default:
      return undefined;
  }
}

export function getMockSymbolMarketSpec(accountId: AccountId, canonicalSymbol: string): SymbolMarketSpec | undefined {
  const row = mockConfig.symbolMappings.find(
    (m) => m.accountId === accountId && m.canonicalSymbol === canonicalSymbol,
  );
  if (row) return specFromMappingRow(row);
  return fallbackMockSpec(accountId, canonicalSymbol);
}

/**
 * Mock ATR (confirmation TF) in price units — static table for dashboard adapter only.
 */
export function getMockConfirmationAtr(canonicalSymbol: string): number {
  switch (canonicalSymbol) {
    case "XAUUSD":
      return 2.5;
    case "EURUSD":
    case "GBPUSD":
      return 0.00085;
    case "USDJPY":
      return 0.08;
    case "NAS100":
      return 45;
    case "BTCUSD":
      return 120;
    default:
      return 1;
  }
}
