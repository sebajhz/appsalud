import type { ParameterGridResult } from "@workspace/mapazapp-core";
import type { EvidenceSafetyEnvelope } from "./backtestCampaignDataSource";

export interface ParameterGridEvidenceSnapshot extends EvidenceSafetyEnvelope {
  grid: ParameterGridResult;
  summaryNote: string;
}

export interface ParameterGridDataSource {
  getLatestMockSnapshot(): ParameterGridEvidenceSnapshot;
}
