import type { AccountId, CanonicalSymbol } from "./ids";
import { spreadPointsToPrice } from "./normalize";
import type { BridgeImportWarning } from "./bridge-import-result";
import type { BridgeMarketSnapshotRow } from "./bridge-types";
import type { SymbolMarketSpec } from "./symbol-profile";

export interface DeriveSymbolMarketSpecOptions {
  accountId: AccountId;
  /** Canonical symbol for this row; never assume `row.symbol` is canonical in production. */
  canonicalSymbol: CanonicalSymbol;
}

export interface DeriveSymbolMarketSpecResult {
  spec: SymbolMarketSpec | null;
  warnings: BridgeImportWarning[];
}

/**
 * Build a `SymbolMarketSpec` from one `latest_market_snapshot.csv` row.
 * Uses `row.symbol` as `brokerSymbol`. Spread uses exported `spread_price` when finite;
 * otherwise derives `spreadPoints * point` and emits `BRIDGE_SYMBOL_PROFILE_INCOMPLETE`.
 */
export function deriveSymbolMarketSpecFromBridgeMarketSnapshot(
  row: BridgeMarketSnapshotRow,
  options: DeriveSymbolMarketSpecOptions,
): DeriveSymbolMarketSpecResult {
  const warnings: BridgeImportWarning[] = [];

  if (!Number.isFinite(row.point) || row.point <= 0) {
    warnings.push({
      code: "BRIDGE_SYMBOL_PROFILE_INCOMPLETE",
      message: "Invalid or non-positive point",
    });
    return { spec: null, warnings };
  }
  if (!Number.isFinite(row.tickSize) || row.tickSize <= 0) {
    warnings.push({
      code: "BRIDGE_SYMBOL_PROFILE_INCOMPLETE",
      message: "Invalid or non-positive tick_size",
    });
    return { spec: null, warnings };
  }
  if (!Number.isFinite(row.tickValue) || row.tickValue < 0) {
    warnings.push({
      code: "BRIDGE_SYMBOL_PROFILE_INCOMPLETE",
      message: "Invalid tick_value",
    });
    return { spec: null, warnings };
  }
  if (!Number.isFinite(row.contractSize) || row.contractSize <= 0) {
    warnings.push({
      code: "BRIDGE_SYMBOL_PROFILE_INCOMPLETE",
      message: "Invalid contract_size",
    });
    return { spec: null, warnings };
  }
  if (
    !Number.isFinite(row.volumeMin) ||
    !Number.isFinite(row.volumeMax) ||
    !Number.isFinite(row.volumeStep) ||
    row.volumeStep <= 0
  ) {
    warnings.push({
      code: "BRIDGE_SYMBOL_PROFILE_INCOMPLETE",
      message: "Invalid volume min/max/step",
    });
    return { spec: null, warnings };
  }

  let spreadPrice = row.spreadPrice;
  if (!Number.isFinite(spreadPrice) || spreadPrice < 0) {
    spreadPrice = spreadPointsToPrice(row.spreadPoints, row.point);
    warnings.push({
      code: "BRIDGE_SYMBOL_PROFILE_INCOMPLETE",
      message: "spread_price missing or invalid; derived from spread_points * point",
    });
  }

  const digits = Number.isFinite(row.digits) ? Math.max(0, Math.trunc(row.digits)) : 0;
  if (!Number.isFinite(row.spreadPoints) || row.spreadPoints < 0) {
    warnings.push({
      code: "BRIDGE_SYMBOL_PROFILE_INCOMPLETE",
      message: "Invalid spread_points",
    });
    return { spec: null, warnings };
  }

  const spec: SymbolMarketSpec = {
    accountId: options.accountId,
    canonicalSymbol: options.canonicalSymbol,
    brokerSymbol: row.symbol,
    digits,
    point: row.point,
    tickSize: row.tickSize,
    tickValue: row.tickValue,
    contractSize: row.contractSize,
    volumeMin: row.volumeMin,
    volumeMax: row.volumeMax,
    volumeStep: row.volumeStep,
    spreadPoints: row.spreadPoints,
    spreadPrice,
  };

  return { spec, warnings };
}
