import type { RetestMode } from "./retest-detector";
import type { IfvgBreakMode } from "./ifvg-converter";

/** Timeframe labels for wiring multi-TF later; single series uses one TF for all in V1 skeleton. */
export interface IfvgStrategyTimeframes {
  directionTf: string;
  higherContextTf: string;
  zoneTf: string;
  confirmationTf: string;
  sweepTf: string;
  displacementTf: string;
}

export interface IfvgContextSettings {
  timeframes: IfvgStrategyTimeframes;
  contextSwingLookback: number;
  middleZoneLowPct: number;
  middleZoneHighPct: number;
}

export interface IfvgSwingSettings {
  swingLeftBars: number;
  swingRightBars: number;
}

export interface IfvgSweepSettings {
  sweepToleranceAtr: number;
  sweepSpreadFactor: number;
  minSweepTicks: number;
  nearSweepToleranceAtr: number;
  nearSweepSpreadFactor: number;
  minNearSweepTicks: number;
  reclaimBars: number;
}

export interface IfvgDisplacementSettings {
  displacementBodyFactor: number;
  closePositionMinBuy: number;
  closePositionMaxSell: number;
  minDisplacementAtr: number;
}

export interface IfvgFvgSettings {
  fvgMinSizeAtr: number;
  fvgMaxSizeAtr: number;
}

export interface IfvgIfvgSettings {
  ifvgBreakMode: IfvgBreakMode;
  ifvgBreakBufferAtr: number;
  ifvgBreakSpreadFactor: number;
  minIfvgBreakTicks: number;
  maxBarsFromFvgToIfvg: number;
}

export interface IfvgZoneSettings {
  zonePaddingAtrFactor: number;
  zonePaddingSpreadFactor: number;
  minZoneTicks: number;
  retestMode: RetestMode;
}

export interface IfvgRetestSettings {
  /** Mode stored at zone level; detector uses zone settings `retestMode`. */
  maxBarsAfterIfvg: number;
}

export interface IfvgConfirmationSettings {
  confirmationBars: number;
  confirmationMinBodyAtr: number;
  wickConfirmationEnabled: boolean;
  wickBodyRatio: number;
}

export interface IfvgScoreRiskSettings {
  minRrForQualityPoint: number;
}

export interface IfvgStrategySettings {
  atrPeriod: number;
  context: IfvgContextSettings;
  swing: IfvgSwingSettings;
  sweep: IfvgSweepSettings;
  displacement: IfvgDisplacementSettings;
  fvg: IfvgFvgSettings;
  ifvg: IfvgIfvgSettings;
  zone: IfvgZoneSettings;
  retest: IfvgRetestSettings;
  confirmation: IfvgConfirmationSettings;
  scoreRisk: IfvgScoreRiskSettings;
}

/**
 * **Test / development defaults only** — not optimized; replace with approved parameter sets before live use.
 */
export function createDefaultIfvgStrategySettingsForTests(): IfvgStrategySettings {
  return {
    atrPeriod: 14,
    context: {
      timeframes: {
        directionTf: "H4",
        higherContextTf: "D1",
        zoneTf: "M15",
        confirmationTf: "M15",
        sweepTf: "M15",
        displacementTf: "M15",
      },
      contextSwingLookback: 3,
      middleZoneLowPct: 0.4,
      middleZoneHighPct: 0.6,
    },
    swing: {
      swingLeftBars: 2,
      swingRightBars: 2,
    },
    sweep: {
      sweepToleranceAtr: 0.05,
      sweepSpreadFactor: 1,
      minSweepTicks: 2,
      nearSweepToleranceAtr: 0.02,
      nearSweepSpreadFactor: 0.5,
      minNearSweepTicks: 1,
      reclaimBars: 3,
    },
    displacement: {
      displacementBodyFactor: 0.3,
      closePositionMinBuy: 0.55,
      closePositionMaxSell: 0.45,
      minDisplacementAtr: 0,
    },
    fvg: {
      fvgMinSizeAtr: 0.02,
      fvgMaxSizeAtr: 2,
    },
    ifvg: {
      ifvgBreakMode: "close",
      ifvgBreakBufferAtr: 0.01,
      ifvgBreakSpreadFactor: 0.5,
      minIfvgBreakTicks: 1,
      maxBarsFromFvgToIfvg: 20,
    },
    zone: {
      zonePaddingAtrFactor: 0.05,
      zonePaddingSpreadFactor: 1,
      minZoneTicks: 2,
      retestMode: "full_zone",
    },
    retest: {
      maxBarsAfterIfvg: 32,
    },
    confirmation: {
      confirmationBars: 2,
      confirmationMinBodyAtr: 0.05,
      wickConfirmationEnabled: false,
      wickBodyRatio: 1,
    },
    scoreRisk: {
      minRrForQualityPoint: 1.5,
    },
  };
}
