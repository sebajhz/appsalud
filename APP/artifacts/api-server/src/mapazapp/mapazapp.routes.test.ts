import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

describe("Mapazapp API (checkpoint 12)", () => {
  it("GET /api/mapazapp/health returns ok envelope", async () => {
    const res = await request(app).get("/api/mapazapp/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mockOnly).toBe(true);
    expect(res.body.source).toBe("mock");
    expect(res.body.data?.service).toBe("mapazapp-api");
    expect(res.body.data?.readOnly).toBe(true);
    expect(res.body.data?.checkpoint).toBe(12);
  });

  it("GET /api/mapazapp/accounts lists mock accounts", async () => {
    const res = await request(app).get("/api/mapazapp/accounts");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("GET unknown account summary returns 404", async () => {
    const res = await request(app).get("/api/mapazapp/accounts/UNKNOWN_ACCOUNT/summary");
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.errors[0]?.code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("GET trade-reviews marks reviewOnly and executionEnabled false", async () => {
    const res = await request(app).get("/api/mapazapp/accounts/ACC_THE5ERS_100K_PHASE1_A/trade-reviews");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.reviewOnly).toBe(true);
    expect(res.body.executionEnabled).toBe(false);
    expect(res.body.data.plans.length).toBeGreaterThan(0);
  });

  it("GET trade-reviews for unknown account returns 404", async () => {
    const res = await request(app).get("/api/mapazapp/accounts/UNKNOWN/trade-reviews");
    expect(res.status).toBe(404);
    expect(res.body.errors[0]?.code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("GET parameter-sets returns registry rows", async () => {
    const res = await request(app).get("/api/mapazapp/parameter-sets");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET compatibility for known account + parameter set", async () => {
    const res = await request(app).get(
      "/api/mapazapp/accounts/ACC_THE5ERS_100K_PHASE1_A/parameter-sets/MZP_IFVG_XAUUSD_V1_SET_003/compatibility",
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("allowTradeReview");
  });

  it("GET backtests advisory returns envelope", async () => {
    const res = await request(app).get("/api/mapazapp/backtests/MZP_IFVG_XAUUSD_V1_SET_003/advisory");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("advisory");
  });

  it("GET bridge mock-import-summary returns parser bundle", async () => {
    const res = await request(app).get("/api/mapazapp/bridge/mock-import-summary");
    expect(res.status).toBe(200);
    expect(res.body.data.status.ok).toBe(true);
    expect(res.body.data.market.parsedRowCount).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/mapazapp/scanner/simulations/latest returns ok and review flags", async () => {
    const res = await request(app).get("/api/mapazapp/scanner/simulations/latest");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.reviewOnly).toBe(true);
    expect(res.body.executionEnabled).toBe(false);
    expect(res.body.data?.simulatedScanner).toBe(true);
    expect(res.body.data?.run?.accountId).toBe("ACC_THE5ERS_100K_PHASE1_A");
  });

  it("GET /api/mapazapp/scanner/simulations returns list", async () => {
    const res = await request(app).get("/api/mapazapp/scanner/simulations");
    expect(res.status).toBe(200);
    expect(res.body.data?.simulations?.length).toBe(2);
  });

  it("GET account scanner latest returns scoped accountId", async () => {
    const res = await request(app).get(
      "/api/mapazapp/accounts/ACC_PROPXP_50K_PHASE1/scanner/simulations/latest",
    );
    expect(res.status).toBe(200);
    expect(res.body.data?.run?.accountId).toBe("ACC_PROPXP_50K_PHASE1");
    expect(res.body.data?.run?.canonicalSymbol).toBe("EURUSD");
  });

  it("GET account scanner latest for unknown account returns 404", async () => {
    const res = await request(app).get("/api/mapazapp/accounts/UNKNOWN_X/scanner/simulations/latest");
    expect(res.status).toBe(404);
    expect(res.body.errors[0]?.code).toBe("ACCOUNT_NOT_FOUND");
  });
});
