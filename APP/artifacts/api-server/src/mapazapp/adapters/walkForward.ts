import {
  createDefaultWalkForwardSettingsForTests,
  evaluateWalkForward,
  walkForwardFixtureStableThreeSplits,
  type WalkForwardResult,
} from "@workspace/mapazapp-core";

let cached: WalkForwardResult | null = null;

/** Latest mock walk-forward: stable train/validation/forward synthetic rows. */
export function getMockLatestWalkForward(): WalkForwardResult {
  if (!cached) {
    cached = evaluateWalkForward({
      campaignResult: walkForwardFixtureStableThreeSplits(),
      splitRequirements: { requireTrain: true, requireValidation: true, requireForward: true },
      settings: createDefaultWalkForwardSettingsForTests(),
    });
  }
  return cached;
}
