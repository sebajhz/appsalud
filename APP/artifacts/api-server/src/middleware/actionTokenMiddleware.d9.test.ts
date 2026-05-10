/**
 * D9.17 / D9.18 — action token middleware (temporary Express apps only; not mounted in app.ts).
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_ACTION_TOKEN_HEADER,
  createDefaultApiActionTokenConfig,
  validateApiActionTokenConfig,
} from "../config/apiActionTokenConfig";
import { createActionTokenMiddleware } from "./actionTokenMiddleware";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..");
const appTsPath = join(srcRoot, "app.ts");
const mapazappRoutesPath = join(srcRoot, "mapazapp", "routes.ts");

const FORBIDDEN_IN_RESPONSE = [
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

const LOGIN_RE = /\blogin\b/i;
const ACCOUNT_RE = /\baccount\b/i;
const BALANCE_RE = /\bbalance\b/i;
const EQUITY_RE = /\bequity\b/i;

function assertSafeActionTokenJson(raw: string, secretSubstring: string): void {
  expect(raw.includes(secretSubstring)).toBe(false);
  expect(raw.toLowerCase()).not.toContain("stack");
  const low = raw.toLowerCase();
  for (const frag of FORBIDDEN_IN_RESPONSE) {
    expect(low.includes(frag.toLowerCase()), `unexpected ${frag}`).toBe(false);
  }
  expect(LOGIN_RE.test(raw)).toBe(false);
  expect(ACCOUNT_RE.test(raw)).toBe(false);
  expect(BALANCE_RE.test(raw)).toBe(false);
  expect(EQUITY_RE.test(raw)).toBe(false);
}

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

describe("D9.17 / D9.18 — actionTokenMiddleware", () => {
  const secret = `mzpt-d9-${randomBytes(12).toString("hex")}`;
  const baseCfg = createDefaultApiActionTokenConfig();
  expect(validateApiActionTokenConfig(baseCfg).ok).toBe(true);

  function makeApp() {
    const app = express();
    const mw = createActionTokenMiddleware({
      config: baseCfg,
      getExpectedToken: () => secret,
    });
    app.get("/__test/action/ping", mw, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    return app;
  }

  it("C — missing token → 401 safe JSON, no stack", async () => {
    const res = await request(makeApp()).get("/__test/action/ping").expect(401);
    expect(res.body?.error?.code).toBe("ACTION_TOKEN_REQUIRED");
    assertSafeActionTokenJson(JSON.stringify(res.body), secret);
  });

  it("D — invalid token → 403, no echo of presented value", async () => {
    const res = await request(makeApp())
      .get("/__test/action/ping")
      .set(CANONICAL_ACTION_TOKEN_HEADER, "definitely-not-the-secret")
      .expect(403);
    expect(res.body?.error?.code).toBe("ACTION_TOKEN_INVALID");
    assertSafeActionTokenJson(JSON.stringify(res.body), secret);
    expect(JSON.stringify(res.body)).not.toContain("definitely-not-the-secret");
  });

  it("E — valid header passes to next", async () => {
    const res = await request(makeApp())
      .get("/__test/action/ping")
      .set(CANONICAL_ACTION_TOKEN_HEADER, secret)
      .expect(200);
    expect(res.body?.ok).toBe(true);
    assertSafeActionTokenJson(JSON.stringify(res.body), secret);
  });

  it("F — query token rejected even when header valid (token)", async () => {
    const res = await request(makeApp())
      .get("/__test/action/ping")
      .query({ token: "abc" })
      .set(CANONICAL_ACTION_TOKEN_HEADER, secret)
      .expect(400);
    expect(res.body?.error?.code).toBe("ACTION_TOKEN_QUERY_REJECTED");
    assertSafeActionTokenJson(JSON.stringify(res.body), secret);
  });

  it("F — query action_token rejected", async () => {
    const res = await request(makeApp())
      .get("/__test/action/ping")
      .query({ action_token: "abc" })
      .set(CANONICAL_ACTION_TOKEN_HEADER, secret)
      .expect(400);
    expect(res.body?.error?.code).toBe("ACTION_TOKEN_QUERY_REJECTED");
  });

  it("F — query x-mapazapp-action-token rejected", async () => {
    const res = await request(makeApp())
      .get("/__test/action/ping")
      .query({ "x-mapazapp-action-token": "abc" })
      .set(CANONICAL_ACTION_TOKEN_HEADER, secret)
      .expect(400);
    expect(res.body?.error?.code).toBe("ACTION_TOKEN_QUERY_REJECTED");
  });

  it("G — Cookie header does not satisfy middleware", async () => {
    const res = await request(makeApp())
      .get("/__test/action/ping")
      .set("Cookie", `${CANONICAL_ACTION_TOKEN_HEADER}=${secret}`)
      .expect(401);
    expect(res.body?.error?.code).toBe("ACTION_TOKEN_REQUIRED");
    assertSafeActionTokenJson(JSON.stringify(res.body), secret);
  });

  it("optional — actionTokenRequired false skips verification", async () => {
    const app = express();
    const cfg = createDefaultApiActionTokenConfig({
      actionTokenRequired: false,
      actionTokenPolicy: "disabled",
    });
    expect(validateApiActionTokenConfig(cfg).ok).toBe(true);
    const mw = createActionTokenMiddleware({
      config: cfg,
      getExpectedToken: () => secret,
    });
    app.get("/__test/open", mw, (_req, res) => res.status(200).json({ ok: true }));
    const res = await request(app).get("/__test/open").expect(200);
    expect(res.body?.ok).toBe(true);
  });

  describe("I — static scan (product wiring)", () => {
    it("app.ts does not mount actionTokenMiddleware", () => {
      const src = readFileSync(appTsPath, "utf8");
      expect(src.includes("actionTokenMiddleware")).toBe(false);
      expect(src.includes("./middleware/actionTokenMiddleware")).toBe(false);
    });

    it("mapazapp/routes.ts has no router.post(", () => {
      const raw = readFileSync(mapazappRoutesPath, "utf8");
      const src = stripLineComments(stripBlockComments(raw));
      expect(src.includes("router.post(")).toBe(false);
    });

    it("core sources omit /api/mapazapp/actions and forbidden literals", () => {
      const appSrc = readFileSync(appTsPath, "utf8");
      expect(appSrc.includes("/api/mapazapp/actions")).toBe(false);
      expect(appSrc.includes("child_process")).toBe(false);
      expect(appSrc.includes("spawn(")).toBe(false);
      expect(appSrc.includes("localStorage")).toBe(false);
      expect(appSrc.includes("WebSocket")).toBe(false);
    });
  });
});
