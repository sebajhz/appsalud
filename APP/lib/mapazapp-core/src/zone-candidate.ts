import type { CanonicalSymbol, ParameterSetId, StrategyId, ZoneId } from "./ids";
import type { InversionFairValueGap } from "./ifvg-converter";
import { buildZoneBounds, zoneMidpoint } from "./zone-primitives";
import { roundToTickSize, zonePaddingPrice } from "./normalize";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { SweepStatus } from "./liquidity-sweep";

export type ZoneTradeDirection = "BUY" | "SELL";

/** Initial lifecycle for a candidate — never TRADE_READY from builder alone (checkpoint rule). */
export type ZoneCandidateInitialState = "WAIT_RETEST" | "OBSERVE";

export interface ZoneCandidate {
  zoneId: ZoneId;
  strategyId: StrategyId;
  parameterSetId?: ParameterSetId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol?: string;
  direction: ZoneTradeDirection;
  zoneLow: number;
  zoneHigh: number;
  midpoint: number;
  invalidationPrice: number;
  createdAt: string;
  expiresAt?: string;
  sourceIfvgId: string;
  sourceSweepId?: string;
  reasonSimple: string;
  reasonTechnical: string;
  initialState: ZoneCandidateInitialState;
}

export interface ZoneCandidateBuildInput {
  ifvg: InversionFairValueGap;
  symbolProfile: SymbolMarketSpec;
  atr: number;
  zonePaddingAtrFactor: number;
  zonePaddingSpreadFactor: number;
  minZoneTicks: number;
  zoneId: ZoneId;
  strategyId: StrategyId;
  parameterSetId?: ParameterSetId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol?: string;
  sweepStatus?: SweepStatus;
  createdAtIso: string;
}

function directionFromIfvg(ifvg: InversionFairValueGap): ZoneTradeDirection {
  return ifvg.direction === "BULLISH" ? "BUY" : "SELL";
}

function initialStateFromSweep(s: SweepStatus | undefined): ZoneCandidateInitialState {
  if (s === "CONFIRMED_SWEEP") return "WAIT_RETEST";
  return "OBSERVE";
}

/**
 * Builds a padded zone candidate from IFVG range (blueprint §11). Does not assign TRADE_READY.
 */
export function buildZoneCandidateFromIfvg(input: ZoneCandidateBuildInput): ZoneCandidate {
  const { ifvg, symbolProfile } = input;
  const pad = zonePaddingPrice({
    atr: input.atr,
    zonePaddingAtrFactor: input.zonePaddingAtrFactor,
    spreadPrice: symbolProfile.spreadPrice,
    zonePaddingSpreadFactor: input.zonePaddingSpreadFactor,
    tickSize: symbolProfile.tickSize,
    minZoneTicks: input.minZoneTicks,
  });
  const bounds = buildZoneBounds(ifvg.ifvgLow, ifvg.ifvgHigh, pad, symbolProfile.tickSize);
  const mid = zoneMidpoint(bounds);
  const dir = directionFromIfvg(ifvg);
  const rawInv = dir === "BUY" ? bounds.zoneLow - pad : bounds.zoneHigh + pad;
  const invalidationPrice = roundToTickSize(
    rawInv,
    symbolProfile.tickSize,
    dir === "BUY" ? "down" : "up",
  );

  return {
    zoneId: input.zoneId,
    strategyId: input.strategyId,
    parameterSetId: input.parameterSetId,
    canonicalSymbol: input.canonicalSymbol,
    brokerSymbol: input.brokerSymbol,
    direction: dir,
    zoneLow: bounds.zoneLow,
    zoneHigh: bounds.zoneHigh,
    midpoint: mid,
    invalidationPrice,
    createdAt: input.createdAtIso,
    sourceIfvgId: ifvg.id,
    reasonSimple:
      dir === "BUY"
        ? "Inverted bearish gap — watch for long reaction in zone."
        : "Inverted bullish gap — watch for short reaction in zone.",
    reasonTechnical: `IFVG ${ifvg.direction} from FVG ${ifvg.sourceFvgId}; padding=${pad.toFixed(6)}`,
    initialState: initialStateFromSweep(input.sweepStatus),
  };
}
