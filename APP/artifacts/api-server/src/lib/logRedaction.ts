/**
 * D9.14.2 — Pure helpers for sanitizing diagnostic strings/objects before logging.
 * Does not mutate inputs; safe for structured previews and future transport logs.
 */

export const LOG_REDACTED_PLACEHOLDER = "***";

const MAX_OBJECT_DEPTH = 10;

/** Keys dropped entirely from sanitized object snapshots (case-insensitive). */
const SENSITIVE_OBJECT_KEYS = new Set([
  "authorization",
  "cookie",
  "cookies",
  "set-cookie",
  "token",
  "accesstoken",
  "refreshtoken",
  "password",
  "secret",
  "x-mapazapp-action-token",
]);

export function getApiLoggerRedactPaths(): string[] {
  return [
    "req.headers.authorization",
    "req.headers.cookie",
    'req.headers["set-cookie"]',
    'req.headers["x-mapazapp-action-token"]',
    "res.headers['set-cookie']",
  ];
}

function isSensitiveObjectKey(key: string): boolean {
  return SENSITIVE_OBJECT_KEYS.has(key.trim().toLowerCase());
}

function looksLikeLongNumericCsvLine(line: string): boolean {
  if (line.length < 60) return false;
  const commaCount = (line.match(/,/g) ?? []).length;
  if (commaCount < 6) return false;
  /** Candle / OHLC exports: digits, separators, spaces; no letters that imply prose. */
  return /^[\d.,:\sTZ+-]+$/i.test(line);
}

/**
 * Best-effort scrub for tokens, profile paths, MT5 markers, and crude CSV-like OHLC rows.
 */
export function sanitizeLogString(value: string): string {
  if (value.length === 0) return value;

  let s = value;

  s = s.replace(/Authorization\s*:\s*Bearer\s+\S+/gi, `Authorization: ${LOG_REDACTED_PLACEHOLDER}`);
  s = s.replace(
    /\bx-mapazapp-action-token\s*:\s*\S+/gi,
    `x-mapazapp-action-token: ${LOG_REDACTED_PLACEHOLDER}`,
  );
  s = s.replace(
    /\bx-mapazapp-action-token\s*=\s*[^\s&;,]+/gi,
    `x-mapazapp-action-token=${LOG_REDACTED_PLACEHOLDER}`,
  );
  s = s.replace(
    /\b(access_token|refresh_token|token|password|secret)\s*=\s*[^\s&;,]+/gi,
    `$1=${LOG_REDACTED_PLACEHOLDER}`,
  );
  s = s.replace(/\b(login|account|balance|equity|investor|server)\s*[:=]\s*\S+/gi, LOG_REDACTED_PLACEHOLDER);

  s = s.replace(/C:\\Users\\[^\r\n;]+/gi, LOG_REDACTED_PLACEHOLDER);
  s = s.replace(/\/Users\/[^\r\n;]+/g, LOG_REDACTED_PLACEHOLDER);

  s = s.replace(/\bAppData\b/gi, LOG_REDACTED_PLACEHOLDER);
  s = s.replace(/\bMetaQuotes\b/gi, LOG_REDACTED_PLACEHOLDER);
  s = s.replace(/\bterminal64\.exe\b/gi, LOG_REDACTED_PLACEHOLDER);

  s = s.replace(/^[^\r\n]+$/gm, (line) =>
    looksLikeLongNumericCsvLine(line) ? LOG_REDACTED_PLACEHOLDER : line,
  );

  return s;
}

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_OBJECT_DEPTH) return LOG_REDACTED_PLACEHOLDER;

  try {
    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === "string") return sanitizeLogString(value as string);
    if (t === "number" || t === "boolean") return value;
    if (t === "bigint" || t === "symbol" || t === "function") return LOG_REDACTED_PLACEHOLDER;

    if (Array.isArray(value)) {
      return (value as unknown[]).map((v) => sanitizeLogValue(v, depth + 1));
    }

    if (t === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (isSensitiveObjectKey(k)) continue;
        out[k] = sanitizeLogValue(v, depth + 1);
      }
      return out;
    }

    return LOG_REDACTED_PLACEHOLDER;
  } catch {
    return LOG_REDACTED_PLACEHOLDER;
  }
}
