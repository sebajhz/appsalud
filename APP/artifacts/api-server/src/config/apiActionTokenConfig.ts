/**
 * D9.16 — Pure API action-token / CSRF posture configuration (no HTTP wiring).
 * Does not read secrets, generate tokens, or persist credentials.
 */

export type ApiActionTokenPolicy = "disabled" | "required" | "launcher_managed";

export type ApiCsrfPosture =
  | "header_token_only"
  | "cookie_csrf_required_future"
  | "disabled_dev_only";

export interface ApiActionTokenConfig {
  actionTokenRequired: boolean;
  actionTokenPolicy: ApiActionTokenPolicy;
  /** Normalized to lowercase; validated canonical value only. */
  tokenHeaderName: string;
  rejectQueryToken: boolean;
  allowCookieAuth: boolean;
  csrfPosture: ApiCsrfPosture;
  tokenTtlSeconds: number | null;
  rotateOnLauncherRestart: boolean;
  redactTokenInLogs: boolean;
  safeErrorEnvelopeEnabled: boolean;
}

export interface ApiActionTokenValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Only header name accepted for Mapazapp action transport (D9.15). */
export const CANONICAL_ACTION_TOKEN_HEADER = "x-mapazapp-action-token";

function parseBoolEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  const s = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}

export function normalizeActionTokenHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

export interface CreateDefaultApiActionTokenConfigOptions
  extends Partial<ApiActionTokenConfig> {}

/**
 * Defaults favor launcher-mediated secrets (D9.15): token required, header-only CSRF posture,
 * query tokens rejected, logs redacted, safe JSON errors.
 */
export function createDefaultApiActionTokenConfig(
  options?: CreateDefaultApiActionTokenConfigOptions,
): ApiActionTokenConfig {
  const defaults: ApiActionTokenConfig = {
    actionTokenRequired: true,
    actionTokenPolicy: "launcher_managed",
    tokenHeaderName: CANONICAL_ACTION_TOKEN_HEADER,
    rejectQueryToken: true,
    allowCookieAuth: false,
    csrfPosture: "header_token_only",
    tokenTtlSeconds: null,
    rotateOnLauncherRestart: true,
    redactTokenInLogs: true,
    safeErrorEnvelopeEnabled: true,
  };
  if (!options) return { ...defaults };
  return { ...defaults, ...options };
}

/**
 * Build config from an env bag (tests pass literals; production passes process.env shape).
 * Never reads a shared secret / token value — only policy flags and header name.
 */
export function createApiActionTokenConfigFromEnv(
  env: Record<string, string | undefined>,
): ApiActionTokenConfig {
  const base = createDefaultApiActionTokenConfig();
  const requiredRaw = env["MAPAZAPP_ACTION_TOKEN_REQUIRED"];
  const actionTokenRequired =
    requiredRaw === undefined || requiredRaw === ""
      ? base.actionTokenRequired
      : parseBoolEnv(requiredRaw, base.actionTokenRequired);

  const headerRaw = env["MAPAZAPP_ACTION_TOKEN_HEADER_NAME"];
  const tokenHeaderName = headerRaw?.trim()
    ? normalizeActionTokenHeaderName(headerRaw)
    : base.tokenHeaderName;

  const rejectQueryToken = parseBoolEnv(
    env["MAPAZAPP_ACTION_REJECT_QUERY_TOKEN"],
    base.rejectQueryToken,
  );
  const allowCookieAuth = parseBoolEnv(
    env["MAPAZAPP_ACTION_ALLOW_COOKIE_AUTH"],
    base.allowCookieAuth,
  );

  const ttlRaw = env["MAPAZAPP_ACTION_TOKEN_TTL_SECONDS"];
  let tokenTtlSeconds: number | null = base.tokenTtlSeconds;
  if (ttlRaw !== undefined && ttlRaw.trim() !== "") {
    const n = Number.parseInt(ttlRaw, 10);
    tokenTtlSeconds = Number.isNaN(n) ? base.tokenTtlSeconds : n;
  }

  const rotateOnLauncherRestart = parseBoolEnv(
    env["MAPAZAPP_ACTION_TOKEN_ROTATE_ON_LAUNCHER_RESTART"],
    base.rotateOnLauncherRestart,
  );
  const redactTokenInLogs = parseBoolEnv(
    env["MAPAZAPP_ACTION_TOKEN_REDACT_LOGS"],
    base.redactTokenInLogs,
  );

  let actionTokenPolicy: ApiActionTokenPolicy = base.actionTokenPolicy;
  if (!actionTokenRequired) {
    actionTokenPolicy = "disabled";
  } else if (actionTokenPolicy === "disabled") {
    actionTokenPolicy = "launcher_managed";
  }

  return {
    ...base,
    actionTokenRequired,
    actionTokenPolicy,
    tokenHeaderName,
    rejectQueryToken,
    allowCookieAuth,
    tokenTtlSeconds,
    rotateOnLauncherRestart,
    redactTokenInLogs,
  };
}

export function validateApiActionTokenConfig(
  config: ApiActionTokenConfig,
): ApiActionTokenValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalizedHeader = normalizeActionTokenHeaderName(config.tokenHeaderName);
  if (normalizedHeader !== CANONICAL_ACTION_TOKEN_HEADER) {
    errors.push(
      `tokenHeaderName must normalize to ${CANONICAL_ACTION_TOKEN_HEADER}; got ${JSON.stringify(normalizedHeader)}`,
    );
  }

  if (config.actionTokenRequired && normalizedHeader.length === 0) {
    errors.push("actionTokenRequired is true but tokenHeaderName is empty");
  }

  if (!config.rejectQueryToken) {
    errors.push("rejectQueryToken must be true for governed action-token posture");
  }

  if (config.allowCookieAuth && config.csrfPosture === "header_token_only") {
    errors.push("allowCookieAuth cannot be true when csrfPosture is header_token_only");
  }

  if (!config.redactTokenInLogs) {
    errors.push("redactTokenInLogs must be true");
  }

  if (!config.safeErrorEnvelopeEnabled) {
    errors.push("safeErrorEnvelopeEnabled must be true");
  }

  if (config.tokenTtlSeconds !== null && config.tokenTtlSeconds < 0) {
    errors.push("tokenTtlSeconds must be null or non-negative");
  }

  if (config.actionTokenPolicy === "disabled" && config.actionTokenRequired) {
    errors.push("actionTokenPolicy disabled requires actionTokenRequired false");
  }

  if (
    config.actionTokenPolicy !== "disabled" &&
    !config.actionTokenRequired &&
    (config.actionTokenPolicy === "required" || config.actionTokenPolicy === "launcher_managed")
  ) {
    warnings.push("actionTokenPolicy implies verification but actionTokenRequired is false");
  }

  return { ok: errors.length === 0, errors, warnings };
}
