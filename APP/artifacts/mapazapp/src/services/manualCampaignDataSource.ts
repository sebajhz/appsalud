import type { ManualCampaignResult } from "@workspace/mapazapp-core";
import type { EvidenceSafetyEnvelope } from "./backtestCampaignDataSource";

export interface ManualCampaignEvidenceSnapshot extends EvidenceSafetyEnvelope {
  manualCampaign: ManualCampaignResult;
  summaryNote: string;
}

export interface ManualCampaignDataSource {
  getLatestMockSnapshot(): ManualCampaignEvidenceSnapshot;
}
