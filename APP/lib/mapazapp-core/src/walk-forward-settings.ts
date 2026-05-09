import type { WalkForwardSettings, WalkForwardSplitRequirements } from "./walk-forward-types";

export function createDefaultWalkForwardSplitRequirementsForTests(): WalkForwardSplitRequirements {
  return {
    requireTrain: true,
    requireValidation: true,
    requireForward: false,
  };
}

export function createDefaultWalkForwardSettingsForTests(): WalkForwardSettings {
  return {
    minTradesTrain: 4,
    minTradesValidation: 4,
    minTradesForward: 4,
    minTotalTrades: 12,
    maxAllowedTrainValidationAvgRDrop: 0.35,
    maxAllowedValidationForwardAvgRDrop: 0.4,
    maxTrainToValidationRankScoreRatio: 1.45,
    maxDrawdownR: 6,
    minAverageRValidation: -0.05,
    minProfitFactorValidation: 0.85,
    allowUnknownSplitForExplorationOnly: true,
    highVarianceRankScoreStdDev: 12,
  };
}
