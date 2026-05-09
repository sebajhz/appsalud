import { describe, expect, it } from "vitest";
import { evaluateWalkForward } from "../src/walk-forward-evaluator";
import {
  walkForwardFixtureGoodTrainValNoForward,
  walkForwardFixtureHighVarianceUnstable,
  walkForwardFixtureMixedSymbolsUnstable,
  walkForwardFixtureOverfitTrainDominates,
  walkForwardFixtureStableThreeSplits,
  walkForwardFixtureUnknownOnly,
  walkForwardFixtureValidationRejected,
  walkForwardMinimalCampaign,
  wfSyntheticRun,
} from "../src/walk-forward-fixtures";
import { createDefaultWalkForwardSettingsForTests, createDefaultWalkForwardSplitRequirementsForTests } from "../src/walk-forward-settings";

function baseInput() {
  return {
    splitRequirements: createDefaultWalkForwardSplitRequirementsForTests(),
    settings: createDefaultWalkForwardSettingsForTests(),
  };
}

describe("V2-15 walk-forward evaluator", () => {
  it("A: missing validation → missing_required_splits and needs_more_data at symbol", () => {
    const campaign = walkForwardMinimalCampaign([
      wfSyntheticRun({
        symbol: "EURUSD",
        parameterSetId: "PS_A",
        datasetSplit: "train",
        rankScore: 60,
        tradeCount: 10,
        averageR: 0.3,
        profitFactor: 1.1,
        maxDrawdownR: 2,
      }),
    ]);
    const r = evaluateWalkForward({
      ...baseInput(),
      campaignResult: campaign,
    });
    expect(r.status).toBe("missing_required_splits");
    expect(r.parameterSetResults[0]?.symbolResults[0]?.recommendation).toBe("needs_more_data");
  });

  it("A: unknown-only evidence is not strong (not_rankable when exploration off)", () => {
    const campaign = walkForwardFixtureUnknownOnly();
    const r = evaluateWalkForward({
      campaignResult: campaign,
      splitRequirements: createDefaultWalkForwardSplitRequirementsForTests(),
      settings: { ...createDefaultWalkForwardSettingsForTests(), allowUnknownSplitForExplorationOnly: false },
    });
    expect(r.parameterSetResults[0]?.symbolResults[0]?.recommendation).toBe("not_rankable");
    expect(r.parameterSetResults[0]?.symbolResults[0]?.overfitRisk.level).toBe("unknown");
  });

  it("B: train strong and validation weak → overfit_risk high", () => {
    const r = evaluateWalkForward({
      ...baseInput(),
      campaignResult: walkForwardFixtureOverfitTrainDominates(),
    });
    const sym = r.parameterSetResults[0]?.symbolResults[0];
    expect(sym?.recommendation).toBe("overfit_risk");
    expect(sym?.overfitRisk.level).toBe("high");
  });

  it("C: train + validation good but forward required and missing → promising_but_unproven, not approved", () => {
    const r = evaluateWalkForward({
      campaignResult: walkForwardFixtureGoodTrainValNoForward(),
      splitRequirements: { requireTrain: true, requireValidation: true, requireForward: true },
      settings: createDefaultWalkForwardSettingsForTests(),
    });
    expect(r.status).toBe("missing_required_splits");
    expect(r.parameterSetResults[0]?.recommendation).toBe("promising_but_unproven");
    expect(r.executionEnabled).toBe(false);
  });

  it("D: train + validation + forward stable → candidate_for_more_testing, not approved", () => {
    const r = evaluateWalkForward({
      campaignResult: walkForwardFixtureStableThreeSplits(),
      splitRequirements: { requireTrain: true, requireValidation: true, requireForward: true },
      settings: createDefaultWalkForwardSettingsForTests(),
    });
    expect(r.status).toBe("completed");
    expect(r.parameterSetResults[0]?.recommendation).toBe("candidate_for_more_testing");
    expect((r as { approved?: boolean }).approved).toBeUndefined();
    expect(r.autoApprovalEnabled).toBe(false);
  });

  it("E: validation negative → rejected", () => {
    const r = evaluateWalkForward({
      ...baseInput(),
      campaignResult: walkForwardFixtureValidationRejected(),
    });
    expect(r.parameterSetResults[0]?.recommendation).toBe("rejected");
  });

  it("F: high variance across splits → unstable", () => {
    const r = evaluateWalkForward({
      ...baseInput(),
      campaignResult: walkForwardFixtureHighVarianceUnstable(),
    });
    expect(r.parameterSetResults[0]?.recommendation).toBe("unstable");
  });

  it("F: mixed symbols — one unstable slice rolls parameter set to unstable", () => {
    const r = evaluateWalkForward({
      ...baseInput(),
      campaignResult: walkForwardFixtureMixedSymbolsUnstable(),
    });
    expect(r.parameterSetResults[0]?.recommendation).toBe("unstable");
  });

  it("G: safety flags are always conservative", () => {
    const r = evaluateWalkForward({
      ...baseInput(),
      campaignResult: walkForwardFixtureStableThreeSplits(),
    });
    expect(r.reviewOnly).toBe(true);
    expect(r.executionEnabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.autoApprovalEnabled).toBe(false);
    const json = JSON.stringify(r);
    expect(json.includes('"approved":true')).toBe(false);
  });

  it("H: same input yields identical recommendations and status", () => {
    const input = {
      ...baseInput(),
      campaignResult: walkForwardFixtureStableThreeSplits(),
    };
    const a = evaluateWalkForward(input);
    const b = evaluateWalkForward(input);
    expect(a.status).toBe(b.status);
    expect(a.parameterSetResults.map((p) => p.recommendation)).toEqual(
      b.parameterSetResults.map((p) => p.recommendation),
    );
    expect(a.splitResults.length).toBe(b.splitResults.length);
  });
});
