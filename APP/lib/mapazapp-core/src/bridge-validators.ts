import type { BridgeEaStatus, BridgeSchemaVersion } from "./bridge-types";

/** Supported `schema_version` wire values (Mapazapp + legacy QTG alias). */
export const SUPPORTED_BRIDGE_SCHEMA_VERSIONS: readonly BridgeSchemaVersion[] = [
  "MZP_BRIDGE_V1",
  "QTG_BRIDGE_V1",
] as const;

export function isSupportedBridgeSchemaVersion(v: string): v is BridgeSchemaVersion {
  return (SUPPORTED_BRIDGE_SCHEMA_VERSIONS as readonly string[]).includes(v);
}

const EA_STATUSES: readonly BridgeEaStatus[] = [
  "STARTING",
  "RUNNING",
  "WARNING",
  "ERROR",
  "STOPPED",
];

export function parseBridgeEaStatus(raw: string): BridgeEaStatus | null {
  const u = raw.trim().toUpperCase();
  return (EA_STATUSES as readonly string[]).includes(u) ? (u as BridgeEaStatus) : null;
}
