/**
 * D9.13 — CORS options derived from the API hardening model (allowlist by default).
 * No credentials; methods limited to GET, HEAD, OPTIONS (no Mapazapp action POST surface).
 */
import type { CorsOptions } from "cors";
import type { ApiHardeningConfig } from "./apiHardeningConfig";
import { createApiHardeningConfigFromEnv } from "./apiHardeningConfig";

const CORS_METHODS = ["GET", "HEAD", "OPTIONS"] as const;

export function createCorsOptions(config: ApiHardeningConfig): CorsOptions {
  const credentials = false;
  const methods = [...CORS_METHODS];

  if (config.corsPolicy === "disabled") {
    return {
      origin: false,
      credentials,
      methods,
    };
  }

  if (
    config.corsPolicy === "permissive_dev" &&
    config.actionTransportPolicy === "disabled"
  ) {
    return {
      origin: true,
      credentials,
      methods,
    };
  }

  const allowed = new Set(config.allowedOrigins);
  return {
    origin: (origin, callback) => {
      if (origin === undefined || origin === "") {
        callback(null, true);
        return;
      }
      callback(null, allowed.has(origin));
    },
    credentials,
    methods,
  };
}

export function createCorsOptionsFromEnv(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): CorsOptions {
  return createCorsOptions(createApiHardeningConfigFromEnv(env));
}
