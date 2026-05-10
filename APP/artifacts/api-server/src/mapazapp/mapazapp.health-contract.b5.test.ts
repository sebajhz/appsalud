import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

const MOCK_LATEST_PATHS = [
  "/api/mapazapp/backtest-campaigns/mock-latest",
  "/api/mapazapp/parameter-grid/mock-latest",
  "/api/mapazapp/walk-forward/mock-latest",
  "/api/mapazapp/manual-campaign/mock-latest",
] as const;

const UNKNOWN_RUNTIME_PATHS = [
  "/api/mapazapp/runtime/status",
  "/api/mapazapp/mt5/status",
  "/api/mapazapp/bridge/status",
] as const;

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

function expectJsonFinite(root: unknown, label: string): void {
  const bad: { path: string; n: number }[] = [];
  visitFiniteNumbers(root, (path, n) => bad.push({ path, n }));
  expect(bad, `${label}: non-finite numbers`).toEqual([]);
}

/** B5 — obvious operational tokens must not appear serialized as approval/execution. */
function assertNoOperationalExecutionTokens(json: string): void {
  expect(json).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"canAutoExecute"\s*:\s*true\b/);
  expect(json).not.toMatch(/"sendToMt5Enabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"autoApprovalEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"approved"\s*:\s*true\b/);
  const low = json.toLowerCase();
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("ready for trading");
  expect(low).not.toContain("ordersend");
  expect(low).not.toContain("ctrade");
}

describe("B5 API health and mock-latest contracts", () => {
  it("A. GET /api/healthz — 200 and basic ok payload (no operational flags required)", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    assertNoOperationalExecutionTokens(JSON.stringify(res.body));
  });

  it("A2. GET /api/mapazapp/health — mock-only envelope, read-only, V2-16 evidence marker; never execution-enabled", async () => {
    const res = await request(app).get("/api/mapazapp/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mockOnly).toBe(true);
    expect(res.body.source).toBe("mock");
    expect(res.body.data?.service).toBe("mapazapp-api");
    expect(res.body.data?.readOnly).toBe(true);
    expect(res.body.data?.evidenceMockRoutesV2).toBe("v2-16");
    expect(res.body.executionEnabled === true).toBe(false);
    expect(res.body.autoApprovalEnabled === true).toBe(false);
    expect(res.body.canAutoExecute === true).toBe(false);
    expect(res.body.sendToMt5Enabled === true).toBe(false);
    expectJsonFinite(res.body, "mapazappHealth");
    assertNoOperationalExecutionTokens(JSON.stringify(res.body));
  });

  it("B. mock-latest GET routes — 200, envelope, artifacts, finite JSON, no approval tokens", async () => {
    for (const path of MOCK_LATEST_PATHS) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mockOnly).toBe(true);
      expect(res.body.reviewOnly).toBe(true);
      expect(res.body.executionEnabled).toBe(false);
      expect(res.body.registryMutationAllowed).toBe(false);
      expect(res.body.autoApprovalEnabled).toBe(false);
      expect(res.body.data).not.toBeNull();
      expectJsonFinite(res.body, path);
      const raw = JSON.stringify(res.body);
      assertNoOperationalExecutionTokens(raw);
      expect(raw.includes('"approved":true')).toBe(false);
    }
  });

  it("B2. mock-latest payloads expose core status fields", async () => {
    const bc = await request(app).get(MOCK_LATEST_PATHS[0]!);
    const grid = await request(app).get(MOCK_LATEST_PATHS[1]!);
    const wf = await request(app).get(MOCK_LATEST_PATHS[2]!);
    const manual = await request(app).get(MOCK_LATEST_PATHS[3]!);
    expect(bc.body.data?.campaign?.status).toBeDefined();
    expect(grid.body.data?.grid?.status).toBeDefined();
    expect(wf.body.data?.walkForward?.status).toBeDefined();
    expect(manual.body.data?.manualCampaign?.status).toBeDefined();
  });

  it("C. Gap note — runtime/MT5/bridge operational health is not implemented as live probes (unknown routes return 404)", async () => {
    /** Real runtime status, MT5 detection, and bridge process health are future phases; see A1 governance docs. */
    expect(UNKNOWN_RUNTIME_PATHS.length).toBeGreaterThan(0);
  });

  it("D. Unknown runtime/MT5/bridge status paths — 404, no fake connected payloads", async () => {
    for (const path of UNKNOWN_RUNTIME_PATHS) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      const raw = JSON.stringify(res.body ?? {});
      assertNoOperationalExecutionTokens(raw);
      const low = raw.toLowerCase();
      expect(low).not.toContain("mt5_connected");
      expect(low).not.toContain('"mt5detected":true');
      expect(low).not.toContain("runtime_ready");
    }
  });
});
