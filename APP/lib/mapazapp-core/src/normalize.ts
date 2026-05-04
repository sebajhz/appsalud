/**
 * Price / tick / spread / volume normalization — formulas from
 * Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1 + Symbol Precision addendum.
 * Pure functions only; callers supply ATR/spread/tick from MT5 or tests.
 */

export type RoundMode = "nearest" | "down" | "up";

/** Default relative tolerance for float equality in tests (documented in IMPLEMENTATION_ASSUMPTIONS). */
export const DEFAULT_FLOAT_EPS = 1e-10;

export function nearlyEqual(a: number, b: number, eps = DEFAULT_FLOAT_EPS): boolean {
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * Convert spread from points to price distance using terminal point size.
 * Assumption: spreadPrice ≈ spreadPoints * point (documented; broker rounding may differ).
 */
export function spreadPointsToPrice(spreadPoints: number, point: number): number {
  return spreadPoints * point;
}

/**
 * Round price to valid tick grid. Uses half-away-from-zero for "nearest".
 */
/** Decimal places implied by tickSize (e.g. 0.1 → 1, 0.00001 → 5) for stable rounding. */
function tickDecimalPlaces(tickSize: number): number {
  let d = 0;
  let x = tickSize;
  while (d < 16 && Math.abs(x - Math.round(x)) > 1e-9) {
    x *= 10;
    d++;
  }
  return d;
}

export function roundToTickSize(price: number, tickSize: number, mode: RoundMode = "nearest"): number {
  if (tickSize <= 0 || !Number.isFinite(price) || !Number.isFinite(tickSize)) {
    throw new Error("roundToTickSize: tickSize must be > 0 and inputs finite");
  }
  const q = price / tickSize;
  const n =
    mode === "down"
      ? Math.floor(q + DEFAULT_FLOAT_EPS)
      : mode === "up"
        ? Math.ceil(q - DEFAULT_FLOAT_EPS)
        : Math.round(q);
  const dp = tickDecimalPlaces(tickSize);
  return parseFloat((n * tickSize).toFixed(dp));
}

/** Clamp lot to [volumeMin, volumeMax] and snap to volumeStep (toward zero for snap). */
export function normalizeVolume(
  lots: number,
  volumeMin: number,
  volumeMax: number,
  volumeStep: number,
): number {
  if (volumeStep <= 0 || volumeMin > volumeMax) {
    throw new Error("normalizeVolume: invalid volume constraints");
  }
  const clamped = Math.min(volumeMax, Math.max(volumeMin, lots));
  const steps = Math.round(clamped / volumeStep);
  let out = steps * volumeStep;
  out = Math.min(volumeMax, Math.max(volumeMin, out));
  return out;
}

export interface SweepToleranceInput {
  atr: number;
  sweepToleranceAtr: number;
  spreadPrice: number;
  sweepSpreadFactor: number;
  tickSize: number;
  minSweepTicks: number;
}

/** Blueprint: max(ATR·f, spread·f, tick·n) */
export function sweepTolerancePrice(i: SweepToleranceInput): number {
  const a = i.atr * i.sweepToleranceAtr;
  const b = i.spreadPrice * i.sweepSpreadFactor;
  const c = i.tickSize * i.minSweepTicks;
  return Math.max(a, b, c);
}

export interface NearSweepToleranceInput {
  atr: number;
  nearSweepToleranceAtr: number;
  spreadPrice: number;
  nearSweepSpreadFactor: number;
  tickSize: number;
  minNearSweepTicks: number;
}

export function nearSweepTolerancePrice(i: NearSweepToleranceInput): number {
  return Math.max(
    i.atr * i.nearSweepToleranceAtr,
    i.spreadPrice * i.nearSweepSpreadFactor,
    i.tickSize * i.minNearSweepTicks,
  );
}

export interface ZonePaddingInput {
  atr: number;
  zonePaddingAtrFactor: number;
  spreadPrice: number;
  zonePaddingSpreadFactor: number;
  tickSize: number;
  minZoneTicks: number;
}

export function zonePaddingPrice(i: ZonePaddingInput): number {
  return Math.max(
    i.atr * i.zonePaddingAtrFactor,
    i.spreadPrice * i.zonePaddingSpreadFactor,
    i.tickSize * i.minZoneTicks,
  );
}

export interface SlBufferInput {
  atr: number;
  slAtrFactor: number;
  spreadPrice: number;
  slSpreadFactor: number;
  tickSize: number;
  minSlTicks: number;
}

export function slBufferPrice(i: SlBufferInput): number {
  return Math.max(i.atr * i.slAtrFactor, i.spreadPrice * i.slSpreadFactor, i.tickSize * i.minSlTicks);
}

/** Format price for display using `digits` (does not round to tick — use roundToTickSize first if needed). */
export function formatPriceDisplay(price: number, digits: number): string {
  return price.toFixed(digits);
}
