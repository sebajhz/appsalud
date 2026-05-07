/**
 * V2-06 — synthetic tolerance calibration scenarios (not broker truth).
 */

import { ENGINE_REALITY_SYMBOL_PROFILES } from "./engine-reality-fixtures";
import type { ToleranceCalibrationInput } from "./tolerance-calibration-types";
import { createDefaultToleranceCalibrationSettings } from "./tolerance-calibration-settings";

const settings = createDefaultToleranceCalibrationSettings();

export function createToleranceCalibrationFixtures(): {
  xauusdNearSweepAccepted: ToleranceCalibrationInput;
  xauusdOverSweepBreakRisk: ToleranceCalibrationInput;
  eurusdTinyMissAccepted: ToleranceCalibrationInput;
  usdjpyPrecisionCase: ToleranceCalibrationInput;
  nas100LargeTickVol: ToleranceCalibrationInput;
  btcusdLargeSpreadVol: ToleranceCalibrationInput;
  entryChaseTooLate: ToleranceCalibrationInput;
  elevatedSpreadObserveOnly: ToleranceCalibrationInput;
  retestImperfectButAcceptable: ToleranceCalibrationInput;
} {
  const xau = ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD;
  const eur = ENGINE_REALITY_SYMBOL_PROFILES.EURUSD;
  const jpy = ENGINE_REALITY_SYMBOL_PROFILES.USDJPY;
  const nas = ENGINE_REALITY_SYMBOL_PROFILES.NAS100;
  const btc = ENGINE_REALITY_SYMBOL_PROFILES.BTCUSD;

  const atrXau = 3.2;
  const atrEur = 0.0009;
  const atrJpy = 0.045;
  const atrNas = 55;
  const atrBtc = 1200;

  return {
    xauusdNearSweepAccepted: {
      settings,
      symbolProfile: xau,
      atr: atrXau,
      measurements: {
        near_sweep: { rawDistancePrice: 0.06 },
        liquidity_sweep: { rawDistancePrice: 0.02 },
      },
    },
    xauusdOverSweepBreakRisk: {
      settings,
      symbolProfile: xau,
      atr: atrXau,
      measurements: {
        over_sweep_break_risk: { rawDistancePrice: 4.8 },
        liquidity_sweep: { rawDistancePrice: 0.9 },
      },
    },
    eurusdTinyMissAccepted: {
      settings,
      symbolProfile: eur,
      atr: atrEur,
      measurements: {
        near_sweep: { rawDistancePrice: 0.000018 },
      },
    },
    usdjpyPrecisionCase: {
      settings,
      symbolProfile: jpy,
      atr: atrJpy,
      measurements: {
        near_sweep: { rawDistancePrice: 0.0008 },
        zone_padding: { rawDistancePrice: 0.0015 },
      },
    },
    nas100LargeTickVol: {
      settings,
      symbolProfile: nas,
      atr: atrNas,
      referenceAtr: 40,
      measurements: {
        near_sweep: { rawDistancePrice: 2.2 },
        zone_padding: { rawDistancePrice: 6.0 },
      },
    },
    btcusdLargeSpreadVol: {
      settings,
      symbolProfile: btc,
      atr: atrBtc,
      measurements: {
        near_sweep: { rawDistancePrice: 35 },
        spread_cost: { spreadToAtrRatio: btc.spreadPrice / atrBtc },
      },
    },
    entryChaseTooLate: {
      settings,
      symbolProfile: xau,
      atr: atrXau,
      measurements: {
        entry_chase: { chaseTowardTpR: 0.92 },
      },
    },
    elevatedSpreadObserveOnly: {
      settings,
      symbolProfile: { ...btc, spreadPrice: 280, spreadPoints: 2800 },
      atr: atrBtc,
      measurements: {
        spread_cost: { spreadToAtrRatio: 280 / atrBtc },
      },
    },
    retestImperfectButAcceptable: {
      settings,
      symbolProfile: eur,
      atr: atrEur,
      measurements: {
        retest_depth: { rawDistancePrice: 0.00022, zoneTouchOccurred: true },
      },
    },
  };
}
