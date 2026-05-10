import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** V2-16 mock-latest evidence routes — strict safety envelope (B1). */
const MOCK_LATEST_PATHS = [
  "/api/mapazapp/backtest-campaigns/mock-latest",
  "/api/mapazapp/parameter-grid/mock-latest",
  "/api/mapazapp/walk-forward/mock-latest",
  "/api/mapazapp/manual-campaign/mock-latest",
] as const;

const FORBIDDEN_JSON_SUBSTRINGS = [
  '"executionEnabled":true',
  '"registryMutationAllowed":true',
  '"autoApprovalEnabled":true',
  '"approved":true',
  '"canAutoExecute":true',
  '"sendToMt5Enabled":true',
] as const;

describe("B1 — Mapazapp API safety envelope", () => {
  describe("A — mock-latest routes remain safe (200)", () => {
    it.each(MOCK_LATEST_PATHS)("GET %s", async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mockOnly).toBe(true);
      expect(res.body.executionEnabled).toBe(false);
      expect(res.body.registryMutationAllowed).toBe(false);
      expect(res.body.autoApprovalEnabled).toBe(false);
      expect(res.body.reviewOnly).toBe(true);
      const raw = JSON.stringify(res.body);
      for (const frag of FORBIDDEN_JSON_SUBSTRINGS) {
        expect(raw.includes(frag)).toBe(false);
      }
    });
  });

  describe("B — no operational POST on Mapazapp paths", () => {
    const POST_PATHS = [
      ...MOCK_LATEST_PATHS,
      "/api/mapazapp/execute",
      "/api/mapazapp/orders",
      "/api/mapazapp/trade",
      "/api/mapazapp/signals/execute",
    ] as const;

    it.each(POST_PATHS)("POST %s returns 404 or 405, never 200 with unsafe flags", async (path) => {
      const res = await request(app).post(path).send({});
      expect([404, 405]).toContain(res.status);
      expect(res.status).not.toBe(200);
      if (res.body && typeof res.body === "object") {
        const raw = JSON.stringify(res.body);
        expect(raw.includes('"executionEnabled":true')).toBe(false);
        expect(raw.includes('"approved":true')).toBe(false);
      }
    });
  });

  describe("C — routes.ts static guard (read-only Mapazapp router)", () => {
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

    it("routes.ts has no router.post / app.post and no dangerous execution paths", () => {
      const routesPath = join(__dirname, "routes.ts");
      const raw = readFileSync(routesPath, "utf8");
      const src = stripLineComments(stripBlockComments(raw));

      expect(src.includes("router.post(")).toBe(false);
      expect(src.includes("app.post(")).toBe(false);

      const dangerousSegments = ["/execute", "/orders", "/order/", "/send", "/mt5-command"];
      for (const seg of dangerousSegments) {
        expect(src.includes(seg), `unexpected segment ${seg} in routes.ts`).toBe(false);
      }

      const standaloneTradePath = /\/trade(?:\/|"|'|`|\)|,|\s|$)/;
      expect(standaloneTradePath.test(src), "unexpected standalone /trade route segment in routes.ts").toBe(false);

      expect(src.includes("/trade-reviews"), "expected review-only trade-reviews routes").toBe(true);
    });
  });
});
