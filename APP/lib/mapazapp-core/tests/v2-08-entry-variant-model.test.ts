import { describe, expect, it } from "vitest";
import { evaluateEntryVariant } from "../src/entry-variant-model";
import {
  entryVariantFixtureDeepAcceptedBuy,
  entryVariantFixtureHighSpreadAcceptedBuy,
  entryVariantFixtureIdealBuy,
  entryVariantFixtureInvalidBuy,
  entryVariantFixtureLateChaseBuy,
  entryVariantFixtureMidpointBuy,
  entryVariantFixtureMissedBuy,
  entryVariantFixturePartialObserveBuy,
  entryVariantFixtureSellMirror,
} from "../src/entry-variant-fixtures";
import { evaluateDecisionModel } from "../src/decision-model";
import { createDecisionModelFixtureInputs } from "../src/decision-model-fixtures";
import { evaluateToleranceCalibration } from "../src/tolerance-calibration";
import { createDefaultToleranceCalibrationSettings } from "../src/tolerance-calibration-settings";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "../src/engine-reality-fixtures";

describe("V2-08 entry variant — A. ideal entry", () => {
  it("returns ideal_entry, strong quality, valid replay hint", () => {
    const r = evaluateEntryVariant(entryVariantFixtureIdealBuy());
    expect(r.classification).toBe("ideal_entry");
    expect(r.qualityScore).toBeGreaterThanOrEqual(82);
    expect(r.timingStatus).toBe("valid_now");
    expect(r.replayEntryModel).toBe("zone_touch");
    expect(r.preferredEntryStyle).toBe("zone_edge_touch");
    expect(r.reviewOnly).toBe(true);
  });
});

describe("V2-08 entry variant — B. accepted imperfect", () => {
  it("deep retest with marginal confirmation is accepted_entry", () => {
    const r = evaluateEntryVariant(entryVariantFixtureDeepAcceptedBuy());
    expect(r.classification).toBe("accepted_entry");
    expect(r.preferredEntryStyle).toBe("deep_zone_retest");
  });

  it("partial retest becomes accepted when tolerance retest_depth is acceptable", () => {
    const base = entryVariantFixturePartialObserveBuy();
    const tol = evaluateToleranceCalibration({
      settings: createDefaultToleranceCalibrationSettings(),
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.35,
      measurements: {
        retest_depth: { rawDistancePrice: 0.03, zoneTouchOccurred: true },
      },
    });
    const r = evaluateEntryVariant({ ...base, toleranceCalibrationResult: tol });
    expect(r.classification).toBe("accepted_entry");
    expect(r.reasonCodes).toContain("TOLERANCE_SUPPORTS_ACCEPTED");
  });
});

describe("V2-08 entry variant — C. weak observe", () => {
  it("missing confirmation lowers to weak_observe_entry", () => {
    const base = entryVariantFixtureIdealBuy();
    const r = evaluateEntryVariant({
      ...base,
      confirmationResult: {
        confirmed: false,
        direction: "NONE",
        quality: "NONE",
        body: 0.01,
      },
    });
    expect(r.classification).toBe("weak_observe_entry");
  });
});

describe("V2-08 entry variant — D. late chase", () => {
  it("detects late_chase timing and late_entry classification", () => {
    const r = evaluateEntryVariant(entryVariantFixtureLateChaseBuy());
    expect(r.timingStatus).toBe("late_chase");
    expect(r.classification).toBe("late_entry");
  });
});

describe("V2-08 entry variant — E. missed", () => {
  it("price moved toward TP beyond threshold → missed_entry", () => {
    const r = evaluateEntryVariant(entryVariantFixtureMissedBuy());
    expect(r.timingStatus).toBe("already_missed");
    expect(r.classification).toBe("missed_entry");
  });
});

describe("V2-08 entry variant — F. invalid", () => {
  it("wrong-side touch yields invalid_entry", () => {
    const r = evaluateEntryVariant(entryVariantFixtureInvalidBuy());
    expect(r.classification).toBe("invalid_entry");
    expect(r.quality).toBe("invalid");
  });
});

describe("V2-08 entry variant — G. sell mirror", () => {
  it("SELL zone classifies ideal-style path", () => {
    const r = evaluateEntryVariant(entryVariantFixtureSellMirror());
    expect(r.classification).toBe("ideal_entry");
    expect(r.preferredEntryStyle).toBe("zone_edge_touch");
    expect(r.replayEntryModel).toBe("zone_touch");
  });
});

describe("V2-08 entry variant — H. high spread imperfect accepted", () => {
  it("elevated spread still allows accepted_entry for marginal confirmation", () => {
    const r = evaluateEntryVariant(entryVariantFixtureHighSpreadAcceptedBuy());
    expect(["accepted_entry", "weak_observe_entry"]).toContain(r.classification);
    expect(r.reasonCodes).toContain("HIGH_SPREAD_IMPERFECT_ACCEPTED");
  });
});

describe("V2-08 entry variant — I. midpoint", () => {
  it("midpoint retest style", () => {
    const r = evaluateEntryVariant(entryVariantFixtureMidpointBuy());
    expect(r.preferredEntryStyle).toBe("zone_midpoint_touch");
    expect(r.replayEntryModel).toBe("midpoint_touch");
  });
});

describe("V2-08 entry variant — J. decision integration", () => {
  const fx = createDecisionModelFixtureInputs();

  it("ideal entry variant increases total soft score vs baseline", () => {
    const ev = evaluateEntryVariant(entryVariantFixtureIdealBuy());
    expect(ev.classification).toBe("ideal_entry");
    const a = evaluateDecisionModel(fx.primaryClean);
    const b = evaluateDecisionModel({ ...fx.primaryClean, entryVariantResult: ev });
    expect(b.softScore.totalScore).toBeGreaterThan(a.softScore.totalScore);
    expect(b.softScore.components.some((c) => c.reasonCodes.includes("ENTRY_VARIANT_IDEAL_BOOST"))).toBe(true);
  });

  it("missed entry variant forces invalid_variant", () => {
    const ev = evaluateEntryVariant(entryVariantFixtureMissedBuy());
    const r = evaluateDecisionModel({ ...fx.primaryClean, entryVariantResult: ev });
    expect(r.variant).toBe("invalid_variant");
  });

  it("weak observe entry variant forces weak_observe_variant", () => {
    const ev = evaluateEntryVariant({
      ...entryVariantFixtureIdealBuy(),
      confirmationResult: { confirmed: false, direction: "NONE", quality: "NONE", body: 0.01 },
    });
    const r = evaluateDecisionModel({ ...fx.primaryClean, entryVariantResult: ev });
    expect(ev.classification).toBe("weak_observe_entry");
    expect(r.variant).toBe("weak_observe_variant");
  });
});

describe("V2-08 entry variant — K. determinism", () => {
  it("same input yields identical qualityScore and classification", () => {
    const input = entryVariantFixtureIdealBuy();
    expect(evaluateEntryVariant(input)).toEqual(evaluateEntryVariant(input));
  });
});
