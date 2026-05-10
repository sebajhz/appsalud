import { getEngineEvidenceManualCampaignSnapshot } from "./engineEvidenceCoreSnapshots";
import type { ManualCampaignDataSource, ManualCampaignEvidenceSnapshot } from "./manualCampaignDataSource";

export function createMockManualCampaignDataSource(): ManualCampaignDataSource {
  return {
    getLatestMockSnapshot(): ManualCampaignEvidenceSnapshot {
      return {
        manualCampaign: getEngineEvidenceManualCampaignSnapshot(),
        summaryNote:
          "Mock manual pipeline only — CSV import fixture in memory. No file upload UI here. No execution.",
        mockOnly: true,
        reviewOnly: true,
        executionEnabled: false,
        registryMutationAllowed: false,
        autoApprovalEnabled: false,
      };
    },
  };
}
