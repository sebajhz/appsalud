import type { Candle } from "./candle";
import type { ZoneTradeDirection } from "./zone-candidate";

export type ConfirmationDirection = "BULLISH" | "BEARISH" | "NONE";

export type ConfirmationQuality = "CLEAR" | "MARGINAL" | "NONE";

export interface ConfirmationSettings {
  confirmationMinBodyAtr: number;
  wickConfirmationEnabled: boolean;
  wickBodyRatio: number;
}

export interface ConfirmationResult {
  confirmed: boolean;
  direction: ConfirmationDirection;
  quality: ConfirmationQuality;
  body: number;
}

function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}

function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}

/**
 * Post-retest confirmation (Numerical Spec §15 + checkpoint rules).
 * `rejectionReference` defaults to `zoneMidpoint` when omitted.
 */
export function detectConfirmation(
  candle: Candle,
  previous: Candle | undefined,
  direction: ZoneTradeDirection,
  zoneMidpoint: number,
  atr: number | null,
  settings: ConfirmationSettings,
  rejectionReference?: number,
): ConfirmationResult {
  const ref = rejectionReference ?? zoneMidpoint;
  const body = Math.abs(candle.close - candle.open);
  if (atr == null || atr <= 0) {
    return { confirmed: false, direction: "NONE", quality: "NONE", body };
  }
  const minBody = atr * settings.confirmationMinBodyAtr;

  if (direction === "BUY") {
    const bullishShape = candle.close > candle.open;
    const aboveRef = candle.close > ref;
    const abovePrev = previous == null || candle.close > previous.close;
    const bodyOk = body >= minBody;
    let wickOk = true;
    if (settings.wickConfirmationEnabled && body > 0) {
      wickOk = lowerWick(candle) >= body * settings.wickBodyRatio;
    } else if (settings.wickConfirmationEnabled && body === 0) {
      wickOk = false;
    }
    const ok = bullishShape && aboveRef && abovePrev && bodyOk && wickOk;
    return {
      confirmed: ok,
      direction: ok ? "BULLISH" : "NONE",
      quality: ok ? (body >= minBody * 1.25 ? "CLEAR" : "MARGINAL") : "NONE",
      body,
    };
  }

  const bearishShape = candle.close < candle.open;
  const belowRef = candle.close < ref;
  const belowPrev = previous == null || candle.close < previous.close;
  const bodyOk = body >= minBody;
  let wickOk = true;
  if (settings.wickConfirmationEnabled && body > 0) {
    wickOk = upperWick(candle) >= body * settings.wickBodyRatio;
  } else if (settings.wickConfirmationEnabled && body === 0) {
    wickOk = false;
  }
  const ok = bearishShape && belowRef && belowPrev && bodyOk && wickOk;
  return {
    confirmed: ok,
    direction: ok ? "BEARISH" : "NONE",
    quality: ok ? (body >= minBody * 1.25 ? "CLEAR" : "MARGINAL") : "NONE",
    body,
  };
}
