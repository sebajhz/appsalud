import {
  getCheckpoint15MockEvidenceBundleByParameterSetId,
  listCheckpoint15MockEvidenceSummaries,
} from "@workspace/mapazapp-core";

export function listBacktestEvidenceSummaries() {
  return listCheckpoint15MockEvidenceSummaries();
}

export function evidenceBundleForParameterSet(parameterSetId: string) {
  return getCheckpoint15MockEvidenceBundleByParameterSetId(parameterSetId);
}

export function approvalProposalForParameterSet(parameterSetId: string) {
  return evidenceBundleForParameterSet(parameterSetId)?.proposal ?? null;
}
