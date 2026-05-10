/**
 * D9.14.1 — Body limits + safe global error handler (supertest).
 */
import { readFileSync } from "fs";
import express from "express";
import request from "supertest";
import { dirname, join } from "path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "url";
import { createApiHardeningConfigFromEnv } from "./apiHardeningConfig";
import app from "../app";
import { safeErrorHandler } from "../middleware/safeErrorHandler";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..");
const mapazappRoutesPath = join(srcRoot, "mapazapp", "routes.ts");
const appTsPath = join(srcRoot, "app.ts");

const FORBIDDEN_ERROR_BODY_FRAGMENTS = [
  "AppData",
  "MetaQuotes",
  "terminal64.exe",
  "C:\\\\Users",
  "/Users/",
  "investor",
  "ready to trade",
  "live trading",
  "real trading",
  "execute order",
  "send order",
  "OrderSend",
  "CTrade",
  "MT5 connected",
  "bridge connected",
  '"executionEnabled":true',
  '"sendToMt5Enabled":true',
  '"canAutoExecute":true',
  '"autoApprovalEnabled":true',
  '"registryMutationAllowed":true',
] as const;

const LOGIN_TOKEN = /\blogin\b/i;
const ACCOUNT_TOKEN = /\baccount\b/i;
const BALANCE_TOKEN = /\bbalance\b/i;
const EQUITY_TOKEN = /\bequity\b/i;

function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripLineComments(src: string): string {
  return src
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.indexOf("//");
      if (idx === -1) return line;
      return line.slice(0, idx);
    })
    .join("\n");
}

function assertSafeErrorPayload(raw: string): void {
  const low = raw.toLowerCase();
  for (const frag of FORBIDDEN_ERROR_BODY_FRAGMENTS) {
    expect(low.includes(frag.toLowerCase()), `unexpected fragment ${frag}`).toBe(false);
  }
  expect(LOGIN_TOKEN.test(raw)).toBe(false);
  expect(ACCOUNT_TOKEN.test(raw)).toBe(false);
  expect(BALANCE_TOKEN.test(raw)).toBe(false);
  expect(EQUITY_TOKEN.test(raw)).toBe(false);
  expect(raw.toLowerCase()).not.toContain("stack");
}

describe("D9.14.1 — body limits and safe error handling", () => {
  describe("A — normal GET still works", () => {
    it("GET /api/healthz returns 200", async () => {
      const res = await request(app).get("/api/healthz");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    it("GET /api/mapazapp/runtime/status returns 200", async () => {
      const res = await request(app).get("/api/mapazapp/runtime/status");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe("B — oversized JSON body", () => {
    it("returns safe JSON error without stack or HTML", async () => {
      const cfg = createApiHardeningConfigFromEnv({});
      const padLen = cfg.maxBodyBytes + 4096;
      const payload = JSON.stringify({ pad: "x".repeat(padLen) });
      expect(Buffer.byteLength(payload, "utf8")).toBeGreaterThan(cfg.maxBodyBytes);

      const res = await request(app)
        .post("/api/healthz")
        .set("Content-Type", "application/json")
        .send(payload);

      expect(res.status).toBe(413);
      expect(res.headers["content-type"]).toMatch(/json/i);
      expect(res.body.ok).toBe(false);
      expect(res.body.error?.code).toBe("PAYLOAD_TOO_LARGE");
      expect(res.body.error?.message).toBe("Request body is too large.");

      const raw = JSON.stringify(res.body);
      assertSafeErrorPayload(raw);
      expect(raw).not.toMatch(/<!DOCTYPE/i);
    });
  });

  describe("C — invalid JSON body", () => {
    it("returns safe JSON error without stack or HTML", async () => {
      const res = await request(app)
        .post("/api/healthz")
        .set("Content-Type", "application/json")
        .send("{ not-json");

      expect(res.status).toBe(400);
      expect(res.headers["content-type"]).toMatch(/json/i);
      expect(res.body.ok).toBe(false);
      expect(res.body.error?.code).toBe("INVALID_JSON");
      expect(res.body.error?.message).toBe("Invalid JSON request body.");

      const raw = JSON.stringify(res.body);
      assertSafeErrorPayload(raw);
      expect(raw).not.toMatch(/<!DOCTYPE/i);
    });
  });

  describe("D — unexpected error via test-only middleware (no productive route)", () => {
    it("returns 500 JSON without leaking private path details from err.message", async () => {
      const probe = express();
      const cfg = createApiHardeningConfigFromEnv({});
      probe.use(express.json({ limit: cfg.maxBodyBytes }));
      probe.use((req, _res, next) => {
        if (req.path !== "/__error_probe") {
          next();
          return;
        }
        next(
          new Error(
            String.raw`C:\Users\Someone\AppData\Roaming\MetaQuotes\Terminal\terminal64.exe`,
          ),
        );
      });
      probe.use(safeErrorHandler);

      const res = await request(probe).get("/__error_probe");

      expect(res.status).toBe(500);
      expect(res.body.ok).toBe(false);
      expect(res.body.error?.code).toBe("INTERNAL_SERVER_ERROR");
      expect(res.body.error?.message).toBe("Unexpected server error.");

      const raw = JSON.stringify(res.body);
      assertSafeErrorPayload(raw);
      expect(raw).not.toContain("AppData");
      expect(raw).not.toContain("MetaQuotes");
    });
  });

  describe("E — CORS unchanged for healthz", () => {
    it("still reflects allowed Origin", async () => {
      const res = await request(app)
        .get("/api/healthz")
        .set("Origin", "http://127.0.0.1:5173");
      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
    });

    it("still omits Allow-Origin for disallowed Origin", async () => {
      const res = await request(app)
        .get("/api/healthz")
        .set("Origin", "http://evil.example");
      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("F — Mapazapp router policy", () => {
    it("has no router.post in mapazapp/routes.ts", () => {
      const raw = readFileSync(mapazappRoutesPath, "utf8");
      const src = stripLineComments(stripBlockComments(raw));
      expect(src.includes("router.post(")).toBe(false);
    });
  });

  describe("G — static scan of app.ts", () => {
    it("omits banned patterns", () => {
      const src = readFileSync(appTsPath, "utf8");
      expect(src.includes("/api/mapazapp/actions")).toBe(false);
      expect(src.includes("router.post(")).toBe(false);
      expect(src.includes("ACTION_TOKEN =")).toBe(false);
      expect(src.includes("child_process")).toBe(false);
      expect(src.includes("spawn")).toBe(false);
      expect(src.includes("mapazapp:dev-start")).toBe(false);
    });
  });
});
