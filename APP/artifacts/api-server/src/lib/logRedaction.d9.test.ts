/**
 * D9.14.2 — Unit tests for log redaction helpers.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "url";
import {
  LOG_REDACTED_PLACEHOLDER,
  getApiLoggerRedactPaths,
  sanitizeLogString,
  sanitizeLogValue,
} from "./logRedaction";

const __dirname = dirname(fileURLToPath(import.meta.url));
const loggerTsPath = join(__dirname, "logger.ts");
const safeErrorHandlerPath = join(__dirname, "..", "middleware", "safeErrorHandler.ts");

const FORBIDDEN_IN_HELPER_OUTPUT = [
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

function assertHelperPayloadClean(raw: string): void {
  const low = raw.toLowerCase();
  for (const frag of FORBIDDEN_IN_HELPER_OUTPUT) {
    expect(low.includes(frag.toLowerCase()), `unexpected fragment ${frag}`).toBe(false);
  }
  expect(LOGIN_TOKEN.test(raw)).toBe(false);
  expect(ACCOUNT_TOKEN.test(raw)).toBe(false);
  expect(BALANCE_TOKEN.test(raw)).toBe(false);
  expect(EQUITY_TOKEN.test(raw)).toBe(false);
  expect(low.includes("stack")).toBe(false);
}

describe("D9.14.2 — logRedaction helpers", () => {
  describe("A — Windows private paths", () => {
    it("scrubs Users/AppData/MetaQuotes/terminal markers", () => {
      const input = String.raw`C:\Users\sebastian\AppData\Roaming\MetaQuotes\Terminal\terminal64.exe`;
      const out = sanitizeLogString(input);
      expect(out.toLowerCase()).not.toContain("c:\\users");
      expect(out.toLowerCase()).not.toContain("appdata");
      expect(out.toLowerCase()).not.toContain("metaquotes");
      expect(out.toLowerCase()).not.toContain("terminal64.exe");
    });
  });

  describe("B — Unix user paths", () => {
    it("scrubs /Users/… segments", () => {
      const input = "/Users/sebastian/.config/foo/bar";
      const out = sanitizeLogString(input);
      expect(out).not.toContain("/Users/sebastian");
    });
  });

  describe("C — token-like fragments", () => {
    it("removes bearer and query-style secrets", () => {
      const secret = `${String.fromCharCode(97, 98, 99)}${String.fromCharCode(49, 50, 51)}`;
      const pwd = `${String.fromCharCode(115, 101, 99, 114, 101, 116)}`;
      const input = [
        `Authorization: Bearer ${secret}`,
        `token=${secret}`,
        `access_token=${secret}`,
        `password=${pwd}`,
      ].join("\n");
      const out = sanitizeLogString(input);
      expect(out).not.toContain(secret);
      expect(out).not.toContain(pwd);
      expect(out).toContain(LOG_REDACTED_PLACEHOLDER);
    });
  });

  describe("D — sanitizeLogValue sensitive keys", () => {
    it("drops sensitive keys and redacts nested strings", () => {
      const input = {
        ok: true,
        authorization: "should-not-appear",
        Cookie: "sid=1",
        TOKEN: "x",
        accessToken: "y",
        refreshToken: "z",
        password: "p",
        secret: "s",
        nested: { note: String.raw`C:\Users\x\leak` },
      };
      const out = sanitizeLogValue(input) as Record<string, unknown>;
      expect(out.authorization).toBeUndefined();
      expect(out.password).toBeUndefined();
      expect(out.secret).toBeUndefined();
      expect(out.nested).toBeDefined();
      expect(String((out.nested as { note: string }).note)).not.toContain("Users");
    });
  });

  describe("E — immutability", () => {
    it("does not mutate the source object", () => {
      const input = {
        a: 1,
        password: "keep-me-in-source-only",
        nested: { b: "x" },
      };
      const snapshot = JSON.stringify(input);
      sanitizeLogValue(input);
      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });

  describe("F — logger.ts static expectations", () => {
    it("uses centralized redact paths and avoids req.body serialization hooks", () => {
      const src = readFileSync(loggerTsPath, "utf8");
      expect(src.includes("getApiLoggerRedactPaths")).toBe(true);
      expect(src.includes("req.body")).toBe(false);
      expect(src.includes("ACTION_TOKEN =")).toBe(false);
      expect(src.includes("Bearer ey")).toBe(false);
    });

    it("getApiLoggerRedactPaths covers auth/cookie/action-token placeholders", () => {
      const paths = getApiLoggerRedactPaths().join(" ");
      expect(paths).toContain("authorization");
      expect(paths).toContain("cookie");
      expect(paths.toLowerCase()).toContain("set-cookie");
      expect(paths.toLowerCase()).toContain("x-mapazapp-action-token");
    });
  });

  describe("D9.18 — Mapazapp action-token log fragments", () => {
    it("sanitizeLogString scrubs X-Mapazapp-Action-Token header values", () => {
      const opaque = "opaque-at-secret-val-997";
      const line = `X-Mapazapp-Action-Token: ${opaque}`;
      const out = sanitizeLogString(line);
      expect(out).not.toContain(opaque);
      expect(out).toContain(LOG_REDACTED_PLACEHOLDER);
    });

    it("sanitizeLogString scrubs query-shaped x-mapazapp-action-token pairs", () => {
      const opaque = "querypair792";
      const s = `trace x-mapazapp-action-token=${opaque} tail`;
      const out = sanitizeLogString(s);
      expect(out).not.toContain(opaque);
    });

    it("sanitizeLogValue omits X-Mapazapp-Action-Token keys", () => {
      const out = sanitizeLogValue({
        "X-Mapazapp-Action-Token": "hidden-value",
        ok: true,
      }) as Record<string, unknown>;
      expect(out["X-Mapazapp-Action-Token"]).toBeUndefined();
      expect(out.ok).toBe(true);
    });
  });

  describe("G — safeErrorHandler stays non-leaky", () => {
    it("does not reference err.stack in HTTP responses", () => {
      const src = readFileSync(safeErrorHandlerPath, "utf8");
      expect(src.includes("err.stack")).toBe(false);
      expect(src).toMatch(/Unexpected server error/);
    });
  });

  describe("H — helper outputs stay governance-clean", () => {
    it("JSON snapshots of sanitized samples omit banned governance tokens", () => {
      const secret = `${String.fromCharCode(88, 89, 90)}`;
      const dirty = [
        `Authorization: Bearer ${secret}`,
        String.raw`C:\Users\op\AppData\Roaming\MetaQuotes\Terminal\terminal64.exe`,
        "login=999",
        "1999.01.01,1.2,1.3,1.1,1.25,100,1000,1001,1002,1003,1004",
      ].join("\n");
      const sanitizedString = sanitizeLogString(dirty);
      const sanitizedObj = sanitizeLogValue({
        safe: "ok",
        nested: { path: String.raw`C:\Users\z` },
        authorization: "drop",
      });
      const raw = JSON.stringify({ sanitizedString, sanitizedObj });
      assertHelperPayloadClean(raw);
      expect(raw).not.toContain(secret);
    });
  });

  describe("I — long CSV-like rows", () => {
    it("redacts comma-heavy numeric rows", () => {
      const row =
        "1999.01.01 00:00:00,1.23456,1.23556,1.23356,1.23406,12345,12346,12347,12348,12349,12350";
      expect(row.length).toBeGreaterThanOrEqual(60);
      const out = sanitizeLogString(row);
      expect(out).toBe(LOG_REDACTED_PLACEHOLDER);
    });
  });
});
