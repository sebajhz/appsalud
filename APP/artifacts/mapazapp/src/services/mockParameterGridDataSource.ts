import { getEngineEvidenceParameterGridSnapshot } from "./engineEvidenceCoreSnapshots";
import type { ParameterGridDataSource, ParameterGridEvidenceSnapshot } from "./parameterGridDataSource";

export function createMockParameterGridDataSource(): ParameterGridDataSource {
  return {
    getLatestMockSnapshot(): ParameterGridEvidenceSnapshot {
      return {
        grid: getEngineEvidenceParameterGridSnapshot(),
        summaryNote:
          "Mock parameter grid only — comparative replay on shared synthetic slice. Not an optimizer. No approval.",
        mockOnly: true,
        reviewOnly: true,
        executionEnabled: false,
        registryMutationAllowed: false,
        autoApprovalEnabled: false,
      };
    },
  };
}
