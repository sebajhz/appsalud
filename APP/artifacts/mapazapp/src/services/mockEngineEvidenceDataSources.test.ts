import { describe, expect, it } from "vitest";
import { createMockBacktestCampaignDataSource } from "./mockBacktestCampaignDataSource";
import { createMockManualCampaignDataSource } from "./mockManualCampaignDataSource";
import { createMockParameterGridDataSource } from "./mockParameterGridDataSource";
import { createMockWalkForwardDataSource } from "./mockWalkForwardDataSource";

describe("mock engine evidence data sources", () => {
  it("expose safety envelope on all snapshots", () => {
    const bt = createMockBacktestCampaignDataSource().getLatestMockSnapshot();
    const grid = createMockParameterGridDataSource().getLatestMockSnapshot();
    const wf = createMockWalkForwardDataSource().getLatestMockSnapshot();
    const manual = createMockManualCampaignDataSource().getLatestMockSnapshot();

    for (const snap of [bt, grid, wf, manual]) {
      expect(snap.mockOnly).toBe(true);
      expect(snap.reviewOnly).toBe(true);
      expect(snap.executionEnabled).toBe(false);
      expect(snap.registryMutationAllowed).toBe(false);
      expect(snap.autoApprovalEnabled).toBe(false);
    }
  });

  it("serialized snapshots do not include approved: true", () => {
    const wf = createMockWalkForwardDataSource().getLatestMockSnapshot();
    expect(JSON.stringify(wf).includes('"approved":true')).toBe(false);
    const grid = createMockParameterGridDataSource().getLatestMockSnapshot();
    expect(JSON.stringify(grid).includes('"approved":true')).toBe(false);
  });

  it("summary notes avoid execution and approval promises", () => {
    const bt = createMockBacktestCampaignDataSource().getLatestMockSnapshot();
    expect(bt.summaryNote.toLowerCase()).toMatch(/no execution|evidence/);
    expect(bt.summaryNote.toLowerCase()).not.toMatch(/ready to trade|\bapproved\b/);
  });
});
