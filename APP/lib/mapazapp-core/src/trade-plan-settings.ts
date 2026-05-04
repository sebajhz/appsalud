/**
 * Trade plan evaluation settings — **development / test defaults only**, not optimized parameter sets.
 * Production must use approved parameter sets per symbol/account (blueprint §5 / §16).
 */

export type TradePlanTargetModel = "fixed_R" | "liquidity_target" | "hybrid";

export type TradePlanReferenceEntryMode = "CONFIRMATION_CLOSE" | "ZONE_MIDPOINT";

export interface TradePlanEvaluationSettings {
  rrTarget: number;
  minRr: number;
  minScoreTrade: number;
  slAtrFactor: number;
  slSpreadFactor: number;
  minSlTicks: number;
  /** Reject SL distance when `slDistancePrice / confirmationAtr` exceeds this (ATR units). */
  maxSlAtr: number;
  targetModel: TradePlanTargetModel;
  referenceEntryMode: TradePlanReferenceEntryMode;
  /** When true, setups without confirmed sweep may still reach OBSERVE paths where applicable. */
  allowObserveWithoutConfirmedSweep: boolean;
  /** When false, NEAR_SWEEP alone cannot yield TRADE_READY even if all numeric gates pass. */
  allowNearSweepTradeReady: boolean;
  requireConfirmationForTradeReady: boolean;
  /** When true, `approvedParameterSetForAccount` must be true unless `testOrDevMode`. */
  requireApprovedParameterSet: boolean;
  testOrDevMode: boolean;
  /** When true, `accountId` must be present on input if account guard fields are used. */
  requireAccountIdForGuard: boolean;
  /** Optional absolute spread ceiling in price units (in addition to `spreadAllowed` on guard). */
  maxSpreadPrice?: number;
}

/**
 * Defaults for unit tests / local development — **not** live-tuned values.
 */
export function createDefaultTradePlanEvaluationSettingsForTests(): TradePlanEvaluationSettings {
  return {
    rrTarget: 2,
    minRr: 1.5,
    minScoreTrade: 75,
    slAtrFactor: 0.05,
    slSpreadFactor: 1,
    minSlTicks: 2,
    /** Wide enough for synthetic XAUUSD-style fixtures (~10 price risk / ATR 2 ≈ 5 ATR); tighten per approved parameter set in production. */
    maxSlAtr: 10,
    targetModel: "fixed_R",
    referenceEntryMode: "CONFIRMATION_CLOSE",
    allowObserveWithoutConfirmedSweep: true,
    allowNearSweepTradeReady: false,
    requireConfirmationForTradeReady: true,
    requireApprovedParameterSet: true,
    testOrDevMode: true,
    requireAccountIdForGuard: false,
    maxSpreadPrice: undefined,
  };
}
