/**
 * D9.12 — Listen host/port resolution aligned with bootstrap (`index.ts`).
 */
import { describe, expect, it } from "vitest";
import {
  createApiHardeningConfigFromEnv,
  validateApiHardeningConfig,
} from "./apiHardeningConfig";

/** Strings we must never emit in structured startup metadata (subset of governance scans). */
const BANNED_IN_STARTUP_METADATA = [
  "AppData",
  "MetaQuotes",
  "terminal64.exe",
  "C:\\\\Users",
  "/Users/",
  "login",
  "account",
  "balance",
  "equity",
  "investor",
  "ready to trade",
  "live trading",
  "execute order",
  "OrderSend",
  "CTrade",
  "MT5 connected",
  "bridge connected",
] as const;

describe("D9.12 — API listen config (env + validation)", () => {
  it("empty env defaults to loopback 127.0.0.1 and port 3001", () => {
    const cfg = createApiHardeningConfigFromEnv({});
    expect(cfg.host).toBe("127.0.0.1");
    expect(cfg.port).toBe(3001);
    const v = validateApiHardeningConfig(cfg);
    expect(v.ok).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("PORT env selects port when MAPAZAPP_API_PORT absent", () => {
    const cfg = createApiHardeningConfigFromEnv({ PORT: "3002" });
    expect(cfg.port).toBe(3002);
    expect(validateApiHardeningConfig(cfg).ok).toBe(true);
  });

  it("MAPAZAPP_API_PORT takes precedence over PORT", () => {
    const cfg = createApiHardeningConfigFromEnv({
      MAPAZAPP_API_PORT: "3003",
      PORT: "4000",
    });
    expect(cfg.port).toBe(3003);
  });

  it("MAPAZAPP_API_HOST=localhost normalizes to 127.0.0.1", () => {
    const cfg = createApiHardeningConfigFromEnv({
      MAPAZAPP_API_HOST: "localhost",
    });
    expect(cfg.host).toBe("127.0.0.1");
  });

  it("serializable host/port metadata for default config avoids banned tokens", () => {
    const cfg = createApiHardeningConfigFromEnv({});
    const payload = JSON.stringify({ host: cfg.host, port: cfg.port });
    const low = payload.toLowerCase();
    for (const token of BANNED_IN_STARTUP_METADATA) {
      expect(low.includes(token.toLowerCase())).toBe(false);
    }
  });
});
