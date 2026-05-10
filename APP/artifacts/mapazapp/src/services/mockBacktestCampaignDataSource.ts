import { getEngineEvidenceBacktestCampaignSnapshot } from "./engineEvidenceCoreSnapshots";
import type { BacktestCampaignDataSource, BacktestCampaignEvidenceSnapshot } from "./backtestCampaignDataSource";

export function createMockBacktestCampaignDataSource(): BacktestCampaignDataSource {
  return {
    getLatestMockSnapshot(): BacktestCampaignEvidenceSnapshot {
      return {
        campaign: getEngineEvidenceBacktestCampaignSnapshot(),
        summaryNote:
          "Mock campaign only — synthetic XAUUSD train/validation fixture. Evidence, not approval. No execution.",
        mockOnly: true,
        reviewOnly: true,
        executionEnabled: false,
        registryMutationAllowed: false,
        autoApprovalEnabled: false,
      };
    },
  };
}
