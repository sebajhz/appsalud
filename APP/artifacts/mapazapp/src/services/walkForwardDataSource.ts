import type { WalkForwardResult } from "@workspace/mapazapp-core";
import type { EvidenceSafetyEnvelope } from "./backtestCampaignDataSource";

export interface WalkForwardEvidenceSnapshot extends EvidenceSafetyEnvelope {
  walkForward: WalkForwardResult;
  summaryNote: string;
}

export interface WalkForwardDataSource {
  getLatestMockSnapshot(): WalkForwardEvidenceSnapshot;
}
