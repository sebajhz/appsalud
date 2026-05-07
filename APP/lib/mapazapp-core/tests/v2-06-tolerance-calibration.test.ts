import { describe, expect, it } from "vitest";
import { evaluateToleranceCalibration, evaluateTolerancePriceDistanceDimension } from "../src/tolerance-calibration";
import { createDefaultToleranceCalibrationSettings } from "../src/tolerance-calibration-settings";
import { createToleranceCalibrationFixtures } from "../src/tolerance-calibration-fixtures";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "../src/engine-reality-fixtures";
import { evaluateDecisionModel } from "../src/decision-model";
import { createDecisionModelFixtureInputs } from "../src/decision-model-fixtures";

const settings = createDefaultToleranceCalibrationSettings();
const tolFx = createToleranceCalibrationFixtures();
const dmFx = createDecisionModelFixtureInputs();

describe("V2-06 tolerance calibration — A. dynamic bands", () => {
  it("tolerancePrice equals max(ATR·k, spread·k, tick·n) for a dimension", () => {
    const p = ENGINE_REALITY_SYMBOL_PROFILES.EURUSD;
    const atr = 0.001;
    const r = evaluateTolerancePriceDistanceDimension("near_sweep", 0.00001, {
      settings,
      symbolProfile: p,
      atr,
    });
    const f = settings.dimensionFactors.near_sweep;
    const atrPart = atr * f.atrMultiplier;
    const spreadPart = p.spreadPrice * f.spreadMultiplier;
    const tickPart = p.tickSize * f.minTicks;
    expect(r.band.components.atrPart).toBeCloseTo(atrPart, 12);
    expect(r.band.components.spreadPart).toBeCloseTo(spreadPart, 12);
    expect(r.band.components.tickPart).toBeCloseTo(tickPart, 12);
    expect(r.tolerancePrice).toBeCloseTo(Math.max(atrPart, spreadPart, tickPart), 12);
  });

  it("different dimensions produce different tolerance bands for the same context", () => {
    const p = ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD;
    const atr = 2.0;
    const near = evaluateTolerancePriceDistanceDimension("near_sweep", 0.01, { settings, symbolProfile: p, atr });
    const zone = evaluateTolerancePriceDistanceDimension("zone_padding", 0.01, { settings, symbolProfile: p, atr });
    expect(zone.tolerancePrice).not.toBe(near.tolerancePrice);
    expect(zone.tolerancePrice).toBeGreaterThan(near.tolerancePrice);
  });
});

describe("V2-06 tolerance calibration — B. symbol precision", () => {
  it("XAUUSD vs EURUSD vs USDJPY vs NAS100 vs BTCUSD produce different near_sweep tolerances (no universal pip assumption)", () => {
    const atrXau = 3.0;
    const atrEur = 0.0008;
    const atrJpy = 0.05;
    const atrNas = 40;
    const atrBtc = 900;
    const bands = [
      evaluateTolerancePriceDistanceDimension("near_sweep", 0.01, {
        settings,
        symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
        atr: atrXau,
      }).tolerancePrice,
      evaluateTolerancePriceDistanceDimension("near_sweep", 0.01, {
        settings,
        symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.EURUSD,
        atr: atrEur,
      }).tolerancePrice,
      evaluateTolerancePriceDistanceDimension("near_sweep", 0.01, {
        settings,
        symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.USDJPY,
        atr: atrJpy,
      }).tolerancePrice,
      evaluateTolerancePriceDistanceDimension("near_sweep", 0.01, {
        settings,
        symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.NAS100,
        atr: atrNas,
      }).tolerancePrice,
      evaluateTolerancePriceDistanceDimension("near_sweep", 0.01, {
        settings,
        symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.BTCUSD,
        atr: atrBtc,
      }).tolerancePrice,
    ];
    const uniq = new Set(bands.map((b) => b.toExponential(6)));
    expect(uniq.size).toBe(bands.length);
  });
});

describe("V2-06 tolerance calibration — C. near sweep", () => {
  it("small miss is acceptable or weak_but_usable", () => {
    const r = evaluateToleranceCalibration(tolFx.eurusdTinyMissAccepted);
    expect(["acceptable", "weak_but_usable", "ideal"]).toContain(r.byDimension.near_sweep!.quality);
  });

  it("larger miss becomes observe_only or invalid", () => {
    const p = ENGINE_REALITY_SYMBOL_PROFILES.EURUSD;
    const atr = 0.0008;
    const r = evaluateToleranceCalibration({
      settings,
      symbolProfile: p,
      atr,
      measurements: { near_sweep: { rawDistancePrice: 0.0012 } },
    });
    expect(["observe_only", "invalid"]).toContain(r.byDimension.near_sweep!.quality);
  });
});

describe("V2-06 tolerance calibration — D. over-sweep / break risk", () => {
  it("deep over-sweep is classified as break risk / invalid", () => {
    const r = evaluateToleranceCalibration(tolFx.xauusdOverSweepBreakRisk);
    expect(["observe_only", "invalid"]).toContain(r.byDimension.over_sweep_break_risk!.quality);
    expect(r.byDimension.over_sweep_break_risk!.reasonCodes).toContain("BREAK_RISK_DEPTH");
  });
});

describe("V2-06 tolerance calibration — E. entry chase", () => {
  it("price too far toward TP (R) becomes observe_only or invalid", () => {
    const r = evaluateToleranceCalibration(tolFx.entryChaseTooLate);
    expect(["observe_only", "invalid"]).toContain(r.byDimension.entry_chase!.quality);
    expect(r.byDimension.entry_chase!.reasonCodes).toContain("ENTRY_CHASE_TOO_LATE");
  });
});

describe("V2-06 tolerance calibration — F. spread cost", () => {
  it("elevated / expensive spread lowers score and can yield observe_only", () => {
    const r = evaluateToleranceCalibration(tolFx.elevatedSpreadObserveOnly);
    expect(r.profile.spreadRegime).not.toBe("normal_spread");
    expect(r.byDimension.spread_cost!.score).toBeLessThanOrEqual(78);
  });
});

describe("V2-06 tolerance calibration — G. decision model integration", () => {
  const integration = {
    blendToleranceIntoSoftScore: true,
    invalidToleranceInvalidatesVariant: true,
    invalidToleranceAsHardBlock: false,
    criticalInvalidDimensions: ["entry_chase"] as const,
  };

  it("near-sweep with strong tolerance compensation can lift sweep soft score (blend)", () => {
    const atr = dmFx.acceptedNearSweep.confirmationAtr!;
    const tol = evaluateToleranceCalibration({
      settings,
      symbolProfile: dmFx.acceptedNearSweep.symbolProfile!,
      atr,
      measurements: {
        near_sweep: { rawDistancePrice: 0.01 },
        liquidity_sweep: { rawDistancePrice: 0.004 },
        over_sweep_break_risk: { rawDistancePrice: 0.02 },
      },
    });
    const base = evaluateDecisionModel(dmFx.acceptedNearSweep);
    const adj = evaluateDecisionModel({
      ...dmFx.acceptedNearSweep,
      settings: { ...dmFx.acceptedNearSweep.settings, toleranceIntegration: { ...integration, criticalInvalidDimensions: [] } },
      toleranceCalibrationResult: tol,
    });
    const sb = base.softScore.components.find((c) => c.id === "sweepQuality")!.score;
    const sa = adj.softScore.components.find((c) => c.id === "sweepQuality")!.score;
    expect(sa).toBeGreaterThan(sb);
    expect(adj.softScore.components.find((c) => c.id === "sweepQuality")!.reasonCodes).toContain("TOLERANCE_CALIBRATION_ADJUSTED");
  });

  it("expensive spread calibration lowers spreadVolatilityQuality when blended", () => {
    const atr = dmFx.primaryClean.confirmationAtr!;
    const p = dmFx.primaryClean.symbolProfile!;
    const tol = evaluateToleranceCalibration({
      settings,
      symbolProfile: { ...p, spreadPrice: Math.max(p.spreadPrice * 25, atr * 0.9), spreadPoints: p.spreadPoints * 25 },
      atr,
      measurements: { spread_cost: {} },
    });
    expect(tol.byDimension.spread_cost!.score).toBeLessThan(55);
    const base = evaluateDecisionModel(dmFx.primaryClean);
    const adj = evaluateDecisionModel({
      ...dmFx.primaryClean,
      settings: { ...dmFx.primaryClean.settings, toleranceIntegration: { ...integration, criticalInvalidDimensions: [] } },
      toleranceCalibrationResult: tol,
    });
    const sb = base.softScore.components.find((c) => c.id === "spreadVolatilityQuality")!.score;
    const sa = adj.softScore.components.find((c) => c.id === "spreadVolatilityQuality")!.score;
    expect(sa).toBeLessThan(sb);
    expect(adj.softScore.components.find((c) => c.id === "spreadVolatilityQuality")!.reasonCodes).toContain(
      "TOLERANCE_CALIBRATION_ADJUSTED",
    );
  });

  it("invalid tolerance on a critical dimension can force invalid_variant without hard gate", () => {
    const atr = dmFx.primaryClean.confirmationAtr!;
    const tol = evaluateToleranceCalibration({
      settings,
      symbolProfile: dmFx.primaryClean.symbolProfile!,
      atr,
      measurements: { entry_chase: { chaseTowardTpR: 0.95 } },
    });
    const r = evaluateDecisionModel({
      ...dmFx.primaryClean,
      settings: {
        ...dmFx.primaryClean.settings,
        toleranceIntegration: {
          blendToleranceIntoSoftScore: false,
          invalidToleranceInvalidatesVariant: true,
          invalidToleranceAsHardBlock: false,
          criticalInvalidDimensions: ["entry_chase"],
        },
      },
      toleranceCalibrationResult: tol,
    });
    expect(r.hardGates.hardGatePassed).toBe(true);
    expect(r.variant).toBe("invalid_variant");
  });

  it("invalid tolerance as hard block fails gates", () => {
    const atr = dmFx.primaryClean.confirmationAtr!;
    const tol = evaluateToleranceCalibration({
      settings,
      symbolProfile: dmFx.primaryClean.symbolProfile!,
      atr,
      measurements: { entry_chase: { chaseTowardTpR: 0.95 } },
    });
    const r = evaluateDecisionModel({
      ...dmFx.primaryClean,
      settings: {
        ...dmFx.primaryClean.settings,
        toleranceIntegration: {
          blendToleranceIntoSoftScore: false,
          invalidToleranceInvalidatesVariant: false,
          invalidToleranceAsHardBlock: true,
          criticalInvalidDimensions: ["entry_chase"],
        },
      },
      toleranceCalibrationResult: tol,
    });
    expect(r.hardGates.hardGatePassed).toBe(false);
    expect(r.hardGates.blockingReasons.some((b) => b.code === "TOLERANCE_CALIBRATION_INVALID")).toBe(true);
  });
});

describe("V2-06 tolerance calibration — H. determinism", () => {
  it("same input yields identical scores, reasons, and tolerances", () => {
    const input = tolFx.xauusdNearSweepAccepted;
    const a = evaluateToleranceCalibration(input);
    const b = evaluateToleranceCalibration(input);
    expect(a.measuredAggregateScore).toBe(b.measuredAggregateScore);
    expect(a.byDimension.near_sweep).toEqual(b.byDimension.near_sweep);
    expect(a.summaryExplanation).toBe(b.summaryExplanation);
  });
});

describe("V2-06 tolerance calibration — fixtures smoke", () => {
  it("retest imperfect-but-acceptable fixture upgrades quality with zone touch compensation", () => {
    const r = evaluateToleranceCalibration(tolFx.retestImperfectButAcceptable);
    expect(r.byDimension.retest_depth!.reasonCodes).toContain("ZONE_TOUCH_COMPENSATION");
    expect(["acceptable", "weak_but_usable", "ideal"]).toContain(r.byDimension.retest_depth!.quality);
  });
});
