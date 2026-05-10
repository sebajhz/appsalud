import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  API_HARDENING_BODY_BYTES_HARD_MAX,
  API_HARDENING_BODY_BYTES_WARN_ABOVE,
  createApiHardeningConfigFromEnv,
  createDefaultApiHardeningConfig,
  normalizeApiHost,
  parseActionTransportPolicyFromEnv,
  parseAllowedOrigins,
  validateApiHardeningConfig,
} from "./apiHardeningConfig";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_SERIALIZED_FRAGMENTS = [
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
  '"approved":true',
] as const;

/** Whole-token style for ambiguous English words. */
const LOGIN_TOKEN = /\blogin\b/i;
const ACCOUNT_TOKEN = /\baccount\b/i;
const BALANCE_TOKEN = /\bbalance\b/i;
const EQUITY_TOKEN = /\bequity\b/i;
const SERVER_TOKEN = /\bserver\b/i;

function assertNoForbiddenPrivacyTokens(raw: string): void {
  for (const frag of FORBIDDEN_SERIALIZED_FRAGMENTS) {
    expect(raw.includes(frag), `unexpected fragment ${frag}`).toBe(false);
  }
  expect(LOGIN_TOKEN.test(raw)).toBe(false);
  expect(ACCOUNT_TOKEN.test(raw)).toBe(false);
  expect(BALANCE_TOKEN.test(raw)).toBe(false);
  expect(EQUITY_TOKEN.test(raw)).toBe(false);
  expect(SERVER_TOKEN.test(raw)).toBe(false);
}

describe("D9.10 — apiHardeningConfig", () => {
  describe("A — default config is safe", () => {
    it("uses conservative defaults and validates clean", () => {
      const cfg = createDefaultApiHardeningConfig();
      expect(cfg.host).toBe("127.0.0.1");
      expect(cfg.bindPolicy).toBe("loopback_only");
      expect(cfg.actionTransportPolicy).toBe("disabled");
      expect(cfg.actionTokenRequired).toBe(true);
      expect(cfg.allowedOrigins.length).toBeGreaterThan(0);
      expect(cfg.maxBodyBytes).toBeLessThanOrEqual(API_HARDENING_BODY_BYTES_WARN_ABOVE);

      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(true);
      expect(v.errors).toHaveLength(0);
    });
  });

  describe("B — env parsing", () => {
    it("reads host, port, origins, and booleans from env bag", () => {
      const cfg = createApiHardeningConfigFromEnv({
        MAPAZAPP_API_HOST: "localhost",
        PORT: "4000",
        MAPAZAPP_API_ALLOWED_ORIGINS: "http://127.0.0.1:5173 , http://localhost:5173 ",
        MAPAZAPP_ACTION_TOKEN_REQUIRED: "false",
        MAPAZAPP_ACTION_MAX_BODY_BYTES: "8192",
        MAPAZAPP_ACTION_RATE_LIMIT_WINDOW_MS: "120000",
        MAPAZAPP_ACTION_RATE_LIMIT_MAX: "10",
        MAPAZAPP_ACTION_IDEMPOTENCY_REQUIRED: "false",
        MAPAZAPP_LOG_REDACTION_ENABLED: "true",
        MAPAZAPP_SAFE_ERROR_ENVELOPE_ENABLED: "true",
      });

      expect(cfg.host).toBe("127.0.0.1");
      expect(cfg.port).toBe(4000);
      expect(cfg.allowedOrigins).toEqual([
        "http://127.0.0.1:5173",
        "http://localhost:5173",
      ]);
      expect(cfg.actionTokenRequired).toBe(false);
      expect(cfg.maxBodyBytes).toBe(8192);
      expect(cfg.rateLimitWindowMs).toBe(120000);
      expect(cfg.rateLimitMax).toBe(10);
      expect(cfg.idempotencyRequired).toBe(false);
      expect(cfg.logRedactionEnabled).toBe(true);
    });

    it("prefers MAPAZAPP_API_PORT over PORT", () => {
      const cfg = createApiHardeningConfigFromEnv({
        MAPAZAPP_API_PORT: "3002",
        PORT: "4000",
      });
      expect(cfg.port).toBe(3002);
    });

    it("parses action transport policy keywords", () => {
      expect(parseActionTransportPolicyFromEnv("planned")).toBe("planned");
      expect(parseActionTransportPolicyFromEnv("enabled")).toBe("enabled");
      expect(parseActionTransportPolicyFromEnv("false")).toBe("disabled");
    });
  });

  describe("C — transport enabled with 0.0.0.0 host", () => {
    it("validation fails", () => {
      const cfg = createDefaultApiHardeningConfig({
        host: "0.0.0.0",
        actionTransportPolicy: "enabled",
        corsPolicy: "allowlist",
      });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(false);
      expect(v.errors.join(" ")).toMatch(/0\.0\.0\.0|loopback/);
    });
  });

  describe("D — transport enabled with permissive CORS", () => {
    it("validation fails", () => {
      const cfg = createDefaultApiHardeningConfig({
        corsPolicy: "permissive_dev",
        actionTransportPolicy: "enabled",
      });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(false);
      expect(v.errors.some((e) => e.includes("permissive_dev"))).toBe(true);
    });
  });

  describe("E — transport enabled without token required", () => {
    it("validation fails", () => {
      const cfg = createDefaultApiHardeningConfig({
        actionTransportPolicy: "enabled",
        actionTokenRequired: false,
      });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(false);
      expect(v.errors.some((e) => e.includes("actionTokenRequired"))).toBe(true);
    });
  });

  describe("F — transport enabled missing safety switches", () => {
    it.each([
      ["idempotencyRequired", { idempotencyRequired: false }],
      ["logRedactionEnabled", { logRedactionEnabled: false }],
      ["safeErrorEnvelopeEnabled", { safeErrorEnvelopeEnabled: false }],
    ] as const)("rejects when %s is false", (_label, patch) => {
      const cfg = createDefaultApiHardeningConfig({
        actionTransportPolicy: "enabled",
        corsPolicy: "allowlist",
        ...patch,
      });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(false);
    });
  });

  describe("G — disabled transport tolerates permissive_dev with warnings", () => {
    it("ok with warnings only", () => {
      const cfg = createDefaultApiHardeningConfig({
        corsPolicy: "permissive_dev",
        actionTransportPolicy: "disabled",
      });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(true);
      expect(v.errors).toHaveLength(0);
      expect(v.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("H — body size and rate limit validation", () => {
    it("errors when maxBodyBytes exceeds hard max", () => {
      const cfg = createDefaultApiHardeningConfig({
        maxBodyBytes: API_HARDENING_BODY_BYTES_HARD_MAX + 1,
      });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(false);
      expect(v.errors.some((e) => e.includes("maxBodyBytes"))).toBe(true);
    });

    it("warns when maxBodyBytes above soft threshold", () => {
      const cfg = createDefaultApiHardeningConfig({
        maxBodyBytes: API_HARDENING_BODY_BYTES_WARN_ABOVE + 1,
      });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(true);
      expect(v.warnings.some((w) => w.includes("maxBodyBytes"))).toBe(true);
    });

    it("errors when rateLimitMax <= 0", () => {
      const cfg = createDefaultApiHardeningConfig({ rateLimitMax: 0 });
      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(false);
      expect(v.errors.some((e) => e.includes("rateLimitMax"))).toBe(true);
    });
  });

  describe("I — serialized outputs stay privacy-safe", () => {
    it("default config + validation JSON omit forbidden markers", () => {
      const cfg = createDefaultApiHardeningConfig();
      const v = validateApiHardeningConfig(cfg);
      const raw = JSON.stringify({ cfg, v });
      assertNoForbiddenPrivacyTokens(raw);
    });
  });

  describe("J — static scan of apiHardeningConfig.ts", () => {
    it("does not embed runtime wiring primitives", () => {
      const srcPath = join(__dirname, "apiHardeningConfig.ts");
      const src = readFileSync(srcPath, "utf8");
      expect(src.includes("cors(")).toBe(false);
      expect(src.includes("app.listen")).toBe(false);
      expect(src.toLowerCase().includes("express")).toBe(false);
      expect(src.includes("fetch(")).toBe(false);
      expect(src.includes("POST")).toBe(false);
      expect(src.includes("child_process")).toBe(false);
      expect(src.includes("spawn")).toBe(false);
      expect(src.includes("localStorage")).toBe(false);
      expect(src.includes("WebSocket")).toBe(false);
    });
  });

  describe("normalizeApiHost / parseAllowedOrigins helpers", () => {
    it("normalizes localhost to IPv4 loopback", () => {
      const r = normalizeApiHost("localhost");
      expect(r.normalizedHost).toBe("127.0.0.1");
      expect(r.isLoopback).toBe(true);
    });

    it("warns on 0.0.0.0 when transport is active", () => {
      const r = normalizeApiHost("0.0.0.0", { actionTransportPolicy: "planned" });
      expect(r.warnings.length).toBeGreaterThan(0);
    });

    it("parseAllowedOrigins trims entries", () => {
      expect(parseAllowedOrigins("http://a,http://b")).toEqual(["http://a", "http://b"]);
    });
  });
});
