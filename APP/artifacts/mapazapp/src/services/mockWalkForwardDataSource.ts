import { getEngineEvidenceWalkForwardSnapshot } from "./engineEvidenceCoreSnapshots";
import type { WalkForwardDataSource, WalkForwardEvidenceSnapshot } from "./walkForwardDataSource";

export function createMockWalkForwardDataSource(): WalkForwardDataSource {
  return {
    getLatestMockSnapshot(): WalkForwardEvidenceSnapshot {
      return {
        walkForward: getEngineEvidenceWalkForwardSnapshot(),
        summaryNote:
          "Mock walk-forward only — split discipline and overfit hints on synthetic rows. Never marks a parameter set approved.",
        mockOnly: true,
        reviewOnly: true,
        executionEnabled: false,
        registryMutationAllowed: false,
        autoApprovalEnabled: false,
      };
    },
  };
}
