import type { BacktestCampaignSettings } from "./backtest-campaign-types";

export function createDefaultBacktestCampaignSettingsForTests(): BacktestCampaignSettings {
  return {
    minTradesForRanking: 6,
    minTradesForTrust: 16,
    requireValidationSplit: true,
    requireForwardSplit: false,
    minValidationRunsForCandidate: 1,
    minForwardRunsForCandidate: 1,
    highVarianceScoreStdDev: 14,
    severeDiagnosticPenaltyPerHit: 0.2,
    warningPenaltyPerHit: 0.06,
    unknownSplitPenaltyMultiplier: 0.65,
    minSplitCoverageMultiplier: 0.55,
  };
}
