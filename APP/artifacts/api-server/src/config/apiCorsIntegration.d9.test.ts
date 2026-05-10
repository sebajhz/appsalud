/**
 * D9.13 — HTTP-level CORS checks (supertest).
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

describe("D9.13 CORS integration — GET /api/healthz", () => {
  it("reflects Access-Control-Allow-Origin for http://127.0.0.1:5173", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", "http://127.0.0.1:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:5173",
    );
  });

  it("reflects Access-Control-Allow-Origin for http://localhost:5173", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", "http://localhost:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("does not send Allow-Origin for disallowed Origin (no 500)", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", "http://evil.example");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("succeeds without Origin header", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
  });
});
