/**
 * D9.13 — Unit tests for CORS options derived from ApiHardeningConfig.
 */
import { describe, expect, it } from "vitest";
import {
  createDefaultApiHardeningConfig,
  validateApiHardeningConfig,
} from "./apiHardeningConfig";
import { createCorsOptions, createCorsOptionsFromEnv } from "./apiCorsConfig";

function callOrigin(
  opts: ReturnType<typeof createCorsOptions>,
  origin: string | undefined,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (typeof opts.origin !== "function") {
      reject(new Error("expected origin callback"));
      return;
    }
    opts.origin(origin, (err, allow) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(allow === true);
    });
  });
}

const BANNED_METADATA_FRAGMENTS = [
  "AppData",
  "MetaQuotes",
  "terminal64.exe",
  "C:\\\\Users",
  "/Users/",
  "ready to trade",
  "live trading",
  "execute order",
  "OrderSend",
  "CTrade",
  "MT5 connected",
  "bridge connected",
] as const;

describe("D9.13 apiCorsConfig", () => {
  describe("A1 — default allowlist", () => {
    it("allows Vite dev origins and rejects unknown Origin", async () => {
      const cfg = createDefaultApiHardeningConfig();
      expect(cfg.allowedOrigins).toEqual([
        "http://127.0.0.1:5173",
        "http://localhost:5173",
      ]);
      expect(validateApiHardeningConfig(cfg).ok).toBe(true);

      const opts = createCorsOptions(cfg);
      expect(await callOrigin(opts, "http://127.0.0.1:5173")).toBe(true);
      expect(await callOrigin(opts, "http://localhost:5173")).toBe(true);
      expect(await callOrigin(opts, "http://evil.example")).toBe(false);
    });
  });

  describe("A2 — no Origin", () => {
    it("allows requests with missing Origin (curl / supertest / server-local)", async () => {
      const opts = createCorsOptions(createDefaultApiHardeningConfig());
      expect(await callOrigin(opts, undefined)).toBe(true);
    });
  });

  describe("A3 — permissive_dev vs transport", () => {
    it("permissive_dev + transport disabled uses reflective origin", () => {
      const cfg = createDefaultApiHardeningConfig({
        corsPolicy: "permissive_dev",
        actionTransportPolicy: "disabled",
      });
      expect(validateApiHardeningConfig(cfg).ok).toBe(true);
      const opts = createCorsOptions(cfg);
      expect(opts.origin).toBe(true);
    });

    it("enabled + permissive_dev fails model validation", () => {
      const cfg = createDefaultApiHardeningConfig({
        corsPolicy: "permissive_dev",
        actionTransportPolicy: "enabled",
      });
      expect(validateApiHardeningConfig(cfg).ok).toBe(false);
    });

    it("permissive_dev + planned falls back to allowlist behavior", async () => {
      const cfg = createDefaultApiHardeningConfig({
        corsPolicy: "permissive_dev",
        actionTransportPolicy: "planned",
      });
      const opts = createCorsOptions(cfg);
      expect(typeof opts.origin).toBe("function");
      expect(await callOrigin(opts, "http://127.0.0.1:5173")).toBe(true);
      expect(await callOrigin(opts, "http://evil.example")).toBe(false);
    });
  });

  describe("A4 — serialized metadata hygiene", () => {
    it("JSON snapshot of safe fields avoids banned fragments", () => {
      const opts = createCorsOptions(createDefaultApiHardeningConfig());
      const meta = JSON.stringify({
        credentials: opts.credentials,
        methods: opts.methods,
      });
      const low = meta.toLowerCase();
      for (const frag of BANNED_METADATA_FRAGMENTS) {
        expect(low.includes(frag.toLowerCase())).toBe(false);
      }
    });
  });

  it("createCorsOptionsFromEnv empty bag matches defaults", async () => {
    const opts = createCorsOptionsFromEnv({});
    expect(await callOrigin(opts, "http://localhost:5173")).toBe(true);
    expect(await callOrigin(opts, "http://evil.example")).toBe(false);
  });
});
