import type { ParameterGridSettings } from "./parameter-grid-types";

export function createDefaultParameterGridSettingsForTests(): ParameterGridSettings {
  return {
    behaviorRatePenaltyWeight: 12,
    conservativeScoreMultiplier: 0.92,
    documentOnlyEngineSettings: true,
  };
}
