/**
 * Read-only runtime status snapshot for GET /api/mapazapp/runtime/status (D5.1b).
 * Uses shared core model — no MT5/bridge probes, no filesystem paths, no execution.
 * D9.12.1: API URL/port match `createApiHardeningConfigFromEnv` (same as `index.ts` bootstrap).
 */
import {
  createDefaultRuntimeStatus,
  deriveOverallRuntimeStatus,
  serializeRuntimeStatus,
} from "@workspace/mapazapp-core";
import {
  createApiHardeningConfigFromEnv,
  isLoopbackHost,
  validateApiHardeningConfig,
} from "../../config/apiHardeningConfig";

type EnvBag = Record<string, string | undefined>;

function resolveApiUrlAndPort(env: EnvBag): {
  url: string | null;
  port: number | null;
} {
  const cfg = createApiHardeningConfigFromEnv(env);
  const validation = validateApiHardeningConfig(cfg);
  if (!validation.ok) {
    return { url: null, port: null };
  }

  const port = cfg.port;
  const hostForUrl = isLoopbackHost(cfg.host) ? "127.0.0.1" : cfg.host.trim();
  const url = `http://${hostForUrl}:${String(port)}`;
  return { url, port };
}

/** Mock snapshot: this process responded; dashboard not verified; MT5/bridge not configured. */
export function buildRuntimeStatusPayload(
  env: EnvBag = process.env as EnvBag,
): Record<string, unknown> {
  const { url, port } = resolveApiUrlAndPort(env);
  const base = createDefaultRuntimeStatus({
    runtimeMode: "mock",
    apiStatus: "ok",
    dashboardStatus: "unknown",
    generatedAt: new Date().toISOString(),
  });

  const withApi = {
    ...base,
    api: {
      ...base.api,
      url,
      port,
    },
  };

  const overall = deriveOverallRuntimeStatus(withApi);
  const serialized = serializeRuntimeStatus({
    ...withApi,
    overall,
  }) as Record<string, unknown>;
  serialized.readOnly = true;
  return serialized;
}
