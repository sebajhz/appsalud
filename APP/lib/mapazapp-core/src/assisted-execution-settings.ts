import type { AssistedExecutionSettings } from "./assisted-execution-types";

export type { AssistedExecutionSettings } from "./assisted-execution-types";

/**
 * Defaults for tests / mock API — not live policy.
 * `confirmationTextRequired` is trader-facing copy; phrase match uses `expectedConfirmationPhrase`.
 */
export function createDefaultAssistedExecutionSettingsForTests(): AssistedExecutionSettings {
  return {
    requireBacktestEvidenceRecommendation: false,
    minTradePlanRr: 1.5,
    maxProposedRiskFractionOfEquity: 0.02,
    confirmationPhraseRequired: true,
    expectedConfirmationPhrase: "I understand this is manual review only",
    confirmationTextRequired: "I understand this is manual review only",
    allowNewsBlackoutAssistedProgress: false,
    requireAllHumanConfirmations: true,
  };
}
