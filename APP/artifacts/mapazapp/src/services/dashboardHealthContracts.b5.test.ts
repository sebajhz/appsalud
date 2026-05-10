import { describe, expect, it } from "vitest";
import { createMockBacktestCampaignDataSource } from "./mockBacktestCampaignDataSource";
import { createMockManualCampaignDataSource } from "./mockManualCampaignDataSource";
import { createMockParameterGridDataSource } from "./mockParameterGridDataSource";
import { createMockWalkForwardDataSource } from "./mockWalkForwardDataSource";

function visitFiniteNumbers(value: unknown, onBad: (path: string, n: number) => void, path = "root"): void {
  if (value === null || value === undefined) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) onBad(path, value);
    return;
  }
  const t = typeof value;
  if (t !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => visitFiniteNumbers(v, onBad, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    visitFiniteNumbers(v, onBad, `${path}.${k}`);
  }
}

function expectSnapshotFinite(snap: unknown, label: string): void {
  const bad: { path: string; n: number }[] = [];
  visitFiniteNumbers(snap, (path, n) => bad.push({ path, n }));
  expect(bad, `${label}`).toEqual([]);
}

function assertDashboardSafeJson(json: string): void {
  expect(json).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"approved"\s*:\s*true\b/);
  expect(json).not.toMatch(/"autoApprovalEnabled"\s*:\s*true\b/);
  const low = json.toLowerCase();
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("ready for trading");
  expect(low).not.toContain("real trading");
  expect(low).not.toContain("live trading");
}

function assertEvidenceSummaryNote(note: string): void {
  const low = note.toLowerCase();
  expect(low).toMatch(/mock|synthetic|fixture/);
  expect(low).toMatch(/evidence|not approval|no approval|never marks|no execution|review/);
  assertDashboardSafeJson(note);
}

describe("B5 dashboard mock evidence data sources", () => {
  const factories = [
    ["backtestCampaign", createMockBacktestCampaignDataSource],
    ["parameterGrid", createMockParameterGridDataSource],
    ["walkForward", createMockWalkForwardDataSource],
    ["manualCampaign", createMockManualCampaignDataSource],
  ] as const;

  it("E. Mock evidence data sources — getLatestMockSnapshot safe flags and non-empty payload", () => {
    for (const [name, factory] of factories) {
      const snap = factory().getLatestMockSnapshot();
      expect(snap.mockOnly).toBe(true);
      expect(snap.reviewOnly).toBe(true);
      expect(snap.executionEnabled).toBe(false);
      expect(snap.registryMutationAllowed).toBe(false);
      expect(snap.autoApprovalEnabled).toBe(false);
      expect(snap.summaryNote.length).toBeGreaterThan(20);
      assertEvidenceSummaryNote(snap.summaryNote);
      const artifactKey =
        name === "backtestCampaign"
          ? "campaign"
          : name === "parameterGrid"
            ? "grid"
            : name === "walkForward"
              ? "walkForward"
              : "manualCampaign";
      expect((snap as unknown as Record<string, unknown>)[artifactKey]).toBeTruthy();
      const raw = JSON.stringify(snap);
      expectSnapshotFinite(snap, name);
      assertDashboardSafeJson(raw);
    }
  });

  it("E2. Snapshots are stable for the same factory call (deterministic mocks)", () => {
    for (const [, factory] of factories) {
      const a = JSON.stringify(factory().getLatestMockSnapshot());
      const b = JSON.stringify(factory().getLatestMockSnapshot());
      expect(a).toBe(b);
    }
  });

  it("F. Gap — dashboard evidence services do not expose runtimeStatus / mt5Status / bridgeStatus / launcherStatus", () => {
    /** Live runtime, MT5 terminal detection, bridge process, and launcher are not modeled in dashboard service layer yet. */
    expect(true).toBe(true);
  });

  it("G. Gap — no formal shared empty/error-state factory for engine evidence snapshots (UI uses loaded mock only)", () => {
    /** Empty/error boundaries for evidence panels are not centralized in data-source helpers; future API wiring may add them. */
    expect(true).toBe(true);
  });
});
