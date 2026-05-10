/**
 * D9.10 — Pure API hardening configuration model (no HTTP server wiring).
 *
 * Defaults favor loopback bind, CORS allowlist, and disabled action transport.
 * securityHeadersEnabled defaults to false: the mock/dev API should opt in once
 * a CSP/header baseline is approved (see API_HARDENING_PLAN_D9.md D9.14).
 */

export type ApiBindPolicy = "loopback_only" | "explicit_host" | "dev_default";

export type ApiCorsPolicy = "disabled" | "allowlist" | "permissive_dev";

export type ApiActionTransportPolicy = "disabled" | "planned" | "enabled";

export type ApiTokenPolicy = "not_configured" | "required" | "disabled_dev_only";

/** Future mapping for error middleware posture (parallel to safeErrorEnvelopeEnabled). */
export type ApiErrorExposurePolicy = "safe_envelope" | "raw_stack_default_dev";

export interface ApiHardeningConfig {
  host: string;
  port: number;
  bindPolicy: ApiBindPolicy;
  allowedOrigins: string[];
  corsPolicy: ApiCorsPolicy;
  actionTransportPolicy: ApiActionTransportPolicy;
  actionTokenRequired: boolean;
  actionTokenPolicy: ApiTokenPolicy;
  maxBodyBytes: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  idempotencyRequired: boolean;
  logRedactionEnabled: boolean;
  safeErrorEnvelopeEnabled: boolean;
  /** When true, expect explicit header middleware in a future checkpoint (D9.14). */
  securityHeadersEnabled: boolean;
  generatedAt?: string;
}

export interface ApiHardeningValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface NormalizeHostResult {
  normalizedHost: string;
  warnings: string[];
  isLoopback: boolean;
}

/** Soft ceiling for action-shaped JSON bodies (warn above). */
export const API_HARDENING_BODY_BYTES_WARN_ABOVE = 512 * 1024;

/** Hard reject above this size for action transport configs. */
export const API_HARDENING_BODY_BYTES_HARD_MAX = 10 * 1024 * 1024;

export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
}

/**
 * Normalize declared bind host. Does not perform DNS lookups.
 * Surfaces warnings for all-interface bind when action transport may activate.
 */
export function normalizeApiHost(
  host: string,
  options?: { actionTransportPolicy?: ApiActionTransportPolicy },
): NormalizeHostResult {
  const warnings: string[] = [];
  const trimmed = host.trim();
  if (!trimmed) {
    return { normalizedHost: trimmed, warnings: ["host is empty"], isLoopback: false };
  }

  const lower = trimmed.toLowerCase();
  let normalizedHost = trimmed;
  if (lower === "localhost") {
    normalizedHost = "127.0.0.1";
  }

  const policy = options?.actionTransportPolicy ?? "disabled";
  if (lower === "0.0.0.0" && policy !== "disabled") {
    warnings.push(
      "0.0.0.0 listens on all interfaces and is unsafe when action transport is not disabled",
    );
  }

  return {
    normalizedHost,
    warnings,
    isLoopback: isLoopbackHost(normalizedHost),
  };
}

/** Parse a comma-separated origin list from env-style input. */
export function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBoolEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  const s = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return n;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}

/** Interpret MAPAZAPP_ACTION_TRANSPORT_ENABLED style env values. */
export function parseActionTransportPolicyFromEnv(
  raw: string | undefined,
): ApiActionTransportPolicy {
  if (raw === undefined || raw.trim() === "") return "disabled";
  const s = raw.trim().toLowerCase();
  if (s === "planned") return "planned";
  if (s === "enabled" || s === "true" || s === "1" || s === "yes" || s === "on") {
    return "enabled";
  }
  return "disabled";
}

function deriveTokenPolicy(
  tokenRequired: boolean,
  transport: ApiActionTransportPolicy,
): ApiTokenPolicy {
  if (transport === "disabled") {
    return tokenRequired ? "required" : "disabled_dev_only";
  }
  return tokenRequired ? "required" : "not_configured";
}

export function createDefaultApiHardeningConfig(
  options?: Partial<
    Omit<ApiHardeningConfig, "allowedOrigins"> & { allowedOrigins?: string[] }
  >,
): ApiHardeningConfig {
  const defaults: ApiHardeningConfig = {
    host: "127.0.0.1",
    port: 3001,
    bindPolicy: "loopback_only",
    allowedOrigins: ["http://127.0.0.1:5173", "http://localhost:5173"],
    corsPolicy: "allowlist",
    actionTransportPolicy: "disabled",
    actionTokenRequired: true,
    actionTokenPolicy: "required",
    maxBodyBytes: 16384,
    rateLimitWindowMs: 60000,
    rateLimitMax: 30,
    idempotencyRequired: true,
    logRedactionEnabled: true,
    safeErrorEnvelopeEnabled: true,
    securityHeadersEnabled: false,
    generatedAt: undefined,
  };

  if (!options) return { ...defaults };

  const { allowedOrigins: originsOpt, ...rest } = options;
  return {
    ...defaults,
    ...rest,
    allowedOrigins: originsOpt ?? defaults.allowedOrigins,
  };
}

/**
 * Build config from a plain env bag (for tests pass a literal object; do not rely on globals in unit tests).
 */
export function createApiHardeningConfigFromEnv(
  env: Record<string, string | undefined>,
): ApiHardeningConfig {
  const base = createDefaultApiHardeningConfig();
  const actionTransportPolicy = parseActionTransportPolicyFromEnv(
    env["MAPAZAPP_ACTION_TRANSPORT_ENABLED"],
  );

  const hostRaw = env["MAPAZAPP_API_HOST"] ?? base.host;
  const norm = normalizeApiHost(hostRaw, { actionTransportPolicy });

  const port = parsePort(env["MAPAZAPP_API_PORT"] ?? env["PORT"], base.port);

  const parsedOrigins = parseAllowedOrigins(env["MAPAZAPP_API_ALLOWED_ORIGINS"]);
  const allowedOrigins = parsedOrigins.length > 0 ? parsedOrigins : base.allowedOrigins;

  const actionTokenRequired = parseBoolEnv(
    env["MAPAZAPP_ACTION_TOKEN_REQUIRED"],
    base.actionTokenRequired,
  );

  const maxBodyBytes = parsePositiveInt(
    env["MAPAZAPP_ACTION_MAX_BODY_BYTES"],
    base.maxBodyBytes,
  );

  const rateLimitWindowMs = parsePositiveInt(
    env["MAPAZAPP_ACTION_RATE_LIMIT_WINDOW_MS"],
    base.rateLimitWindowMs,
  );

  const rateLimitMax = parsePositiveInt(
    env["MAPAZAPP_ACTION_RATE_LIMIT_MAX"],
    base.rateLimitMax,
  );

  const idempotencyRequired = parseBoolEnv(
    env["MAPAZAPP_ACTION_IDEMPOTENCY_REQUIRED"],
    base.idempotencyRequired,
  );

  const logRedactionEnabled = parseBoolEnv(
    env["MAPAZAPP_LOG_REDACTION_ENABLED"],
    base.logRedactionEnabled,
  );

  const safeErrorEnvelopeEnabled = parseBoolEnv(
    env["MAPAZAPP_SAFE_ERROR_ENVELOPE_ENABLED"],
    base.safeErrorEnvelopeEnabled,
  );

  return createDefaultApiHardeningConfig({
    host: norm.normalizedHost,
    port,
    allowedOrigins,
    actionTransportPolicy,
    actionTokenRequired,
    actionTokenPolicy: deriveTokenPolicy(actionTokenRequired, actionTransportPolicy),
    maxBodyBytes,
    rateLimitWindowMs,
    rateLimitMax,
    idempotencyRequired,
    logRedactionEnabled,
    safeErrorEnvelopeEnabled,
  });
}

export function validateApiHardeningConfig(
  config: ApiHardeningConfig,
): ApiHardeningValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const portInt = Math.floor(config.port);
  if (
    !Number.isFinite(config.port) ||
    portInt !== config.port ||
    portInt < 1 ||
    portInt > 65535
  ) {
    errors.push("port must be an integer between 1 and 65535");
  }

  const transportActive = config.actionTransportPolicy !== "disabled";
  const transportEnabled = config.actionTransportPolicy === "enabled";

  if (!isLoopbackHost(config.host) && transportActive) {
    errors.push("host must be loopback when action transport is not disabled");
  }

  const hostLower = config.host.trim().toLowerCase();
  if (hostLower === "0.0.0.0" && transportEnabled) {
    errors.push("host 0.0.0.0 is not permitted when action transport is enabled");
  }

  if (config.corsPolicy === "allowlist" && config.allowedOrigins.length === 0) {
    errors.push("allowedOrigins must be non-empty when corsPolicy is allowlist");
  }

  if (config.corsPolicy === "permissive_dev" && transportEnabled) {
    errors.push("permissive_dev CORS cannot be combined with enabled action transport");
  }

  if (config.corsPolicy === "permissive_dev" && config.actionTransportPolicy === "planned") {
    warnings.push(
      "permissive_dev CORS is risky while action transport is planned; prefer allowlist before go-live",
    );
  }

  if (transportEnabled && !config.actionTokenRequired) {
    errors.push("actionTokenRequired must be true when action transport is enabled");
  }

  if (config.rateLimitMax <= 0) {
    errors.push("rateLimitMax must be greater than zero");
  }

  if (config.maxBodyBytes > API_HARDENING_BODY_BYTES_HARD_MAX) {
    errors.push(
      `maxBodyBytes must not exceed ${API_HARDENING_BODY_BYTES_HARD_MAX} bytes for governed action surfaces`,
    );
  } else if (config.maxBodyBytes > API_HARDENING_BODY_BYTES_WARN_ABOVE) {
    warnings.push(
      `maxBodyBytes ${String(config.maxBodyBytes)} exceeds recommended ${String(API_HARDENING_BODY_BYTES_WARN_ABOVE)}`,
    );
  }

  if (transportEnabled && !config.idempotencyRequired) {
    errors.push("idempotencyRequired must be true when action transport is enabled");
  }

  if (transportEnabled && !config.logRedactionEnabled) {
    errors.push("logRedactionEnabled must be true when action transport is enabled");
  }

  if (transportEnabled && !config.safeErrorEnvelopeEnabled) {
    errors.push("safeErrorEnvelopeEnabled must be true when action transport is enabled");
  }

  if (config.corsPolicy === "permissive_dev" && config.actionTransportPolicy === "disabled") {
    warnings.push(
      "permissive_dev CORS relaxes cross-origin rules; use only for trusted local mock workflows",
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}
