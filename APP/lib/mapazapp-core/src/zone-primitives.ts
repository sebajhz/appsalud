import { roundToTickSize } from "./normalize";

export interface ZoneBounds {
  zoneLow: number;
  zoneHigh: number;
}

/**
 * Build padded zone from IFVG range (blueprint §11).
 * Bounds are rounded to tickSize for consistency.
 */
export function buildZoneBounds(
  ifvgLow: number,
  ifvgHigh: number,
  paddingPrice: number,
  tickSize: number,
): ZoneBounds {
  if (ifvgLow > ifvgHigh) {
    throw new Error("buildZoneBounds: ifvgLow must be <= ifvgHigh");
  }
  const rawLow = ifvgLow - paddingPrice;
  const rawHigh = ifvgHigh + paddingPrice;
  return {
    zoneLow: roundToTickSize(rawLow, tickSize, "down"),
    zoneHigh: roundToTickSize(rawHigh, tickSize, "up"),
  };
}

export function zoneMidpoint(bounds: ZoneBounds): number {
  return (bounds.zoneLow + bounds.zoneHigh) / 2;
}
