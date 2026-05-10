import {
  createBacktestCampaignFixtures,
  runBacktestCampaign,
  type BacktestCampaignInput,
  type BacktestCampaignResult,
} from "@workspace/mapazapp-core";
import { replayStubForMockApi } from "../lib/replayStubForMockApi";

function withReplayStubs(input: BacktestCampaignInput): BacktestCampaignInput {
  const stub = replayStubForMockApi();
  return {
    ...input,
    datasets: input.datasets.map((d) => ({
      ...d,
      testOnlyReplayOverride: stub,
    })),
  };
}

let cached: BacktestCampaignResult | null = null;

/** Latest mock campaign: synthetic XAUUSD train/validation fixture, replay stubbed for fast API. */
export function getMockLatestBacktestCampaign(): BacktestCampaignResult {
  if (!cached) {
    const fx = createBacktestCampaignFixtures();
    cached = runBacktestCampaign(withReplayStubs(fx.XAUUSD_PROMISING_SYNTHETIC));
  }
  return cached;
}
