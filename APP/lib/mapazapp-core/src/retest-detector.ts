import type { Candle } from "./candle";
import type { ZoneTradeDirection } from "./zone-candidate";

export type RetestMode = "full_zone" | "midpoint" | "edge";

export type RetestLifecycleHint = "RETEST_HIT" | "NONE";

export interface RetestResult {
  retested: boolean;
  retestMode: RetestMode;
  /** Representative touch price for logging (optional). */
  touchPrice: number | null;
  /** Maps to IFVG lifecycle `RETEST_HIT` when retested. */
  event: RetestLifecycleHint;
}

function intersectsZone(low: number, high: number, zLow: number, zHigh: number): boolean {
  return Math.max(low, zLow) <= Math.min(high, zHigh);
}

/**
 * Retest rules per blueprint §12 + Numerical Spec §14 + checkpoint modes.
 */
export function detectRetest(
  candle: Candle,
  zoneLow: number,
  zoneHigh: number,
  zoneMidpoint: number,
  direction: ZoneTradeDirection,
  mode: RetestMode,
): RetestResult {
  const { low, high } = candle;

  if (mode === "full_zone") {
    const hit = intersectsZone(low, high, zoneLow, zoneHigh);
    return {
      retested: hit,
      retestMode: "full_zone",
      touchPrice: hit ? Math.min(high, Math.max(low, zoneMidpoint)) : null,
      event: hit ? "RETEST_HIT" : "NONE",
    };
  }

  if (mode === "midpoint") {
    if (direction === "BUY") {
      const hit = low <= zoneMidpoint;
      return {
        retested: hit,
        retestMode: "midpoint",
        touchPrice: hit ? Math.min(low, zoneMidpoint) : null,
        event: hit ? "RETEST_HIT" : "NONE",
      };
    }
    const hit = high >= zoneMidpoint;
    return {
      retested: hit,
      retestMode: "midpoint",
      touchPrice: hit ? Math.max(high, zoneMidpoint) : null,
      event: hit ? "RETEST_HIT" : "NONE",
    };
  }

  if (direction === "BUY") {
    const hit = low <= zoneHigh;
    return {
      retested: hit,
      retestMode: "edge",
      touchPrice: hit ? low : null,
      event: hit ? "RETEST_HIT" : "NONE",
    };
  }
  const hit = high >= zoneLow;
  return {
    retested: hit,
    retestMode: "edge",
    touchPrice: hit ? high : null,
    event: hit ? "RETEST_HIT" : "NONE",
  };
}
