import type { BacktestCampaignResult } from "@workspace/mapazapp-core";

/** Safety envelope for V2 engine evidence — mock UI must not imply execution or promotion. */
export interface EvidenceSafetyEnvelope {
  mockOnly: true;
  reviewOnly: true;
  executionEnabled: false;
  registryMutationAllowed: false;
  autoApprovalEnabled: false;
}

export interface BacktestCampaignEvidenceSnapshot extends EvidenceSafetyEnvelope {
  campaign: BacktestCampaignResult;
  summaryNote: string;
}

export interface BacktestCampaignDataSource {
  getLatestMockSnapshot(): BacktestCampaignEvidenceSnapshot;
}
