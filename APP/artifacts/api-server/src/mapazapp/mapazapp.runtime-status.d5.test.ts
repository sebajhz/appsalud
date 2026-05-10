import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

function assertNoOperationalExecutionTokens(json: string): void {
  expect(json).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"sendToMt5Enabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"canAutoExecute"\s*:\s*true\b/);
  expect(json).not.toMatch(/"autoApprovalEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"registryMutationAllowed"\s*:\s*true\b/);
  expect(json).not.toMatch(/"approved"\s*:\s*true\b/);
  const low = json.toLowerCase();
  expect(low).not.toContain("mt5 connected");
  expect(low).not.toContain("bridge connected");
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("ready for trading");
  expect(low).not.toContain("execute order");
  expect(low).not.toContain("send order");
  expect(low).not.toContain("ordersend");
  expect(low).not.toContain("ctrade");
}

const PRIVATE_PATH_MARKERS = [
  "AppData",
  "MetaQuotes",
  "terminal64.exe",
  "C:\\\\Users",
  "/Users/",
  "login",
  "balance",
  "equity",
  "server",
] as const;

/** Whole-token style: avoid false positives on unrelated words (e.g. substring noise). */
const ACCOUNT_MARKER = /\baccount\b/i;

describe("D5.1b GET /api/mapazapp/runtime/status", () => {
  it("A. returns 200", async () => {
    const res = await request(app).get("/api/mapazapp/runtime/status");
    expect(res.status).toBe(200);
  });

  it("B. envelope is mock read-only safe", async () => {
    const res = await request(app).get("/api/mapazapp/runtime/status");
    expect(res.body.ok).toBe(true);
    expect(res.body.mockOnly).toBe(true);
    expect(res.body.source).toBe("mock");
    expect(res.body.reviewOnly).toBe(true);
    expect(res.body.executionEnabled).toBe(false);
    expect(res.body.registryMutationAllowed).toBe(false);
    expect(res.body.autoApprovalEnabled).toBe(false);
  });

  it("C. runtime data is conservative — MT5/bridge not configured, dashboard not verified", async () => {
    const res = await request(app).get("/api/mapazapp/runtime/status");
    const d = res.body.data;
    expect(d).not.toBeNull();
    expect(d.mt5.enabled).toBe(false);
    expect(d.mt5.status).toBe("not_configured");
    expect(d.bridge.enabled).toBe(false);
    expect(d.bridge.status).toBe("not_configured");
    expect(d.dashboard.status).not.toBe("ok");
    expect(d.api.status).toBe("ok");
    expect(d.safety.executionEnabled).toBe(false);
    expect(d.safety.sendToMt5Enabled).toBe(false);
    expect(d.safety.canAutoExecute).toBe(false);
    expect(d.safety.autoApprovalEnabled).toBe(false);
    expect(d.safety.registryMutationAllowed).toBe(false);
    expect(d.safety.manualReviewRequired).toBe(true);
    expect(d.overall.status).not.toBe("ok");
    expect(d.readOnly).toBe(true);
  });

  it("D. no fake execution / connected copy in serialized body", async () => {
    const res = await request(app).get("/api/mapazapp/runtime/status");
    const raw = JSON.stringify(res.body);
    assertNoOperationalExecutionTokens(raw);
  });

  it("E. POST is not allowed (404 or 405), never 200", async () => {
    const res = await request(app).post("/api/mapazapp/runtime/status").send({});
    expect(res.status === 404 || res.status === 405).toBe(true);
    expect(res.status).not.toBe(200);
    assertNoOperationalExecutionTokens(JSON.stringify(res.body ?? {}));
  });

  it("F. MT5 and bridge operational status routes remain unimplemented (404)", async () => {
    for (const path of ["/api/mapazapp/mt5/status", "/api/mapazapp/bridge/status"] as const) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      assertNoOperationalExecutionTokens(JSON.stringify(res.body ?? {}));
    }
  });

  it("G. response body avoids private-path / account-like markers", async () => {
    const res = await request(app).get("/api/mapazapp/runtime/status");
    const raw = JSON.stringify(res.body);
    for (const m of PRIVATE_PATH_MARKERS) {
      expect(raw.includes(m)).toBe(false);
    }
    expect(ACCOUNT_MARKER.test(raw)).toBe(false);
  });
});
