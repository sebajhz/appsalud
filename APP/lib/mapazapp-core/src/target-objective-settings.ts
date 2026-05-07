import type { TargetObjectiveSettings } from "./target-objective-types";

export function createDefaultTargetObjectiveSettingsForTests(): TargetObjectiveSettings {
  return {
    mode: "hybrid_best_available",
    minRr: 1,
    recommendedMinRr: 2,
    fixedRTarget: 2,
    tooCloseToTargetR: 0.25,
    bufferTicksForAlreadyReached: 2,
    targetTooFarAtrMultiple: 8,
    minMeaningfulRewardR: 0.25,
    allowRewardShorterThanRisk: false,
    swingLeftBars: 2,
    swingRightBars: 2,
    preferLiquidityWhenBeatsFixedR: true,
  };
}
