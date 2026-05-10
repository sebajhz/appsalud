/**
 * Read-only runtime status snapshot for GET /api/mapazapp/runtime/status (D5.1b).
 * Uses shared core model — no MT5/bridge probes, no filesystem paths, no execution.
 */
import {
  createDefaultRuntimeStatus,
  deriveOverallRuntimeStatus,
  serializeRuntimeStatus,
} from "@workspace/mapazapp-core";

function parseListenPort(): number | null {
  const raw = process.env.PORT;
  if (raw === undefined || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 65535) return null;
  return n;
}

/** Mock snapshot: this process responded; dashboard not verified; MT5/bridge not configured. */
export function buildRuntimeStatusPayload(): Record<string, unknown> {
  const port = parseListenPort();
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
      url: port !== null ? `http://127.0.0.1:${port}` : null,
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
