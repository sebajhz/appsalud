import { describe, expect, it } from "vitest";
import {
  CANONICAL_ACTION_TOKEN_HEADER,
  createApiActionTokenConfigFromEnv,
  createDefaultApiActionTokenConfig,
  normalizeActionTokenHeaderName,
  validateApiActionTokenConfig,
} from "./apiActionTokenConfig";

describe("D9.16 — apiActionTokenConfig", () => {
  describe("A — defaults safe", () => {
    it("uses canonical header, required posture, query rejection, redaction, validates clean", () => {
      const cfg = createDefaultApiActionTokenConfig();
      expect(cfg.tokenHeaderName).toBe(CANONICAL_ACTION_TOKEN_HEADER);
      expect(cfg.actionTokenRequired).toBe(true);
      expect(cfg.actionTokenPolicy).toBe("launcher_managed");
      expect(cfg.rejectQueryToken).toBe(true);
      expect(cfg.allowCookieAuth).toBe(false);
      expect(cfg.redactTokenInLogs).toBe(true);
      expect(cfg.safeErrorEnvelopeEnabled).toBe(true);
      expect(cfg.csrfPosture).toBe("header_token_only");

      const v = validateApiActionTokenConfig(cfg);
      expect(v.ok).toBe(true);
      expect(v.errors).toHaveLength(0);
    });

    it('policy "required" is valid when explicitly opted', () => {
      const cfg = createDefaultApiActionTokenConfig({ actionTokenPolicy: "required" });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(true);
    });
  });

  describe("B — env parsing", () => {
    it("normalizes header name to lowercase and parses booleans; does not embed secrets", () => {
      const cfg = createApiActionTokenConfigFromEnv({
        MAPAZAPP_ACTION_TOKEN_HEADER_NAME: "X-Mapazapp-Action-Token",
        MAPAZAPP_ACTION_TOKEN_REQUIRED: "true",
        MAPAZAPP_ACTION_REJECT_QUERY_TOKEN: "1",
        MAPAZAPP_ACTION_ALLOW_COOKIE_AUTH: "0",
        MAPAZAPP_ACTION_TOKEN_TTL_SECONDS: "",
        MAPAZAPP_ACTION_TOKEN_ROTATE_ON_LAUNCHER_RESTART: "yes",
        MAPAZAPP_ACTION_TOKEN_REDACT_LOGS: "on",
      });
      expect(cfg.tokenHeaderName).toBe(CANONICAL_ACTION_TOKEN_HEADER);
      expect(cfg.actionTokenRequired).toBe(true);
      expect(cfg.rejectQueryToken).toBe(true);
      expect(cfg.allowCookieAuth).toBe(false);
      expect(cfg.rotateOnLauncherRestart).toBe(true);
      expect(cfg.redactTokenInLogs).toBe(true);
      expect(validateApiActionTokenConfig(cfg).ok).toBe(true);

      const serialized = JSON.stringify(cfg);
      expect(serialized.toLowerCase()).not.toContain("bearer ");
      expect(serialized).not.toMatch(/secret|password/i);
    });

    it("MAPAZAPP_ACTION_TOKEN_REQUIRED false disables policy", () => {
      const cfg = createApiActionTokenConfigFromEnv({
        MAPAZAPP_ACTION_TOKEN_REQUIRED: "false",
      });
      expect(cfg.actionTokenRequired).toBe(false);
      expect(cfg.actionTokenPolicy).toBe("disabled");
      expect(validateApiActionTokenConfig(cfg).ok).toBe(true);
    });
  });

  describe("C — validation failures", () => {
    it("rejects empty canonical header when required", () => {
      const cfg = createDefaultApiActionTokenConfig({ tokenHeaderName: " " });
      const v = validateApiActionTokenConfig(cfg);
      expect(v.ok).toBe(false);
      expect(v.errors.some((e) => e.includes("tokenHeaderName"))).toBe(true);
    });

    it("rejects non-canonical header name", () => {
      const cfg = createDefaultApiActionTokenConfig({ tokenHeaderName: "authorization" });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(false);
    });

    it("rejects rejectQueryToken false", () => {
      const cfg = createDefaultApiActionTokenConfig({ rejectQueryToken: false });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(false);
    });

    it("rejects allowCookieAuth true with header_token_only", () => {
      const cfg = createDefaultApiActionTokenConfig({ allowCookieAuth: true });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(false);
    });

    it("rejects redactTokenInLogs false", () => {
      const cfg = createDefaultApiActionTokenConfig({ redactTokenInLogs: false });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(false);
    });

    it("rejects safeErrorEnvelopeEnabled false", () => {
      const cfg = createDefaultApiActionTokenConfig({ safeErrorEnvelopeEnabled: false });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(false);
    });

    it("rejects negative ttl", () => {
      const cfg = createDefaultApiActionTokenConfig({ tokenTtlSeconds: -1 });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(false);
    });

    it("rejects disabled policy with required flag true", () => {
      const cfg = createDefaultApiActionTokenConfig({
        actionTokenPolicy: "disabled",
        actionTokenRequired: true,
      });
      expect(validateApiActionTokenConfig(cfg).ok).toBe(false);
    });
  });

  describe("D — normalizeActionTokenHeaderName", () => {
    it("lowercases declared header names", () => {
      expect(normalizeActionTokenHeaderName("  X-Mapazapp-Action-Token  ")).toBe(
        CANONICAL_ACTION_TOKEN_HEADER,
      );
    });
  });
});
