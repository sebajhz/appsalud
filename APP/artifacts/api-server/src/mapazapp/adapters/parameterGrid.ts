import {
  createDefaultBacktestCampaignSettingsForTests,
  createDefaultParameterGridSettingsForTests,
  gridInputThreeCandidatesSameXauDataset,
  runParameterGrid,
  type ParameterGridResult,
} from "@workspace/mapazapp-core";
import { replayStubForMockApi } from "../lib/replayStubForMockApi";

let cached: ParameterGridResult | null = null;

/** Latest mock grid: three parameter sets on shared XAUUSD validation slice (replay stubbed). */
export function getMockLatestParameterGrid(): ParameterGridResult {
  if (!cached) {
    const base = gridInputThreeCandidatesSameXauDataset();
    const stubA = replayStubForMockApi();
    const stubB = replayStubForMockApi({
      summary: {
        ...stubA.summary,
        replayedTradeCount: 2,
        totalR: 0.5,
        averageR: 0.25,
        wins: 1,
        losses: 1,
      },
    });
    const stubC = replayStubForMockApi({
      summary: {
        ...stubA.summary,
        replayedTradeCount: 6,
        totalR: 2.1,
        averageR: 0.35,
        wins: 4,
        losses: 2,
      },
    });
    cached = runParameterGrid({
      datasets: base.datasets,
      candidates: base.candidates,
      campaignSettings: createDefaultBacktestCampaignSettingsForTests(),
      gridSettings: createDefaultParameterGridSettingsForTests(),
      testOnlyReplayStubByParameterSetId: {
        GRID_SET_A: stubA,
        GRID_SET_B: stubB,
        GRID_SET_C: stubC,
      },
    });
  }
  return cached;
}
