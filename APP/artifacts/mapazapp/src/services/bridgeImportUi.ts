import type { BridgeImportError, BridgeImportWarning } from '@workspace/mapazapp-core';

export function formatBridgeDiagnostics(errors: BridgeImportError[], warnings: BridgeImportWarning[]): string {
  const parts: string[] = [];
  if (errors.length) parts.push(`${errors.length} error(s)`);
  if (warnings.length) parts.push(`${warnings.length} warning(s)`);
  return parts.length ? parts.join(' · ') : 'No import issues';
}

export function bridgeDiagnosticCodes(errors: BridgeImportError[], warnings: BridgeImportWarning[]): string[] {
  return [...errors.map((e) => e.code), ...warnings.map((w) => w.code)];
}
