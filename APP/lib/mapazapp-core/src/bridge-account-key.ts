import type { BridgeTerminalId } from "./bridge-types";

export interface BridgeAccountKeyParts {
  terminalId: BridgeTerminalId;
  accountLogin: string;
  accountServer: string;
}

/**
 * Stable composite key for terminal + MT5 login + server (no persistence; no real `AccountId` inference).
 */
export function makeBridgeAccountKey(parts: BridgeAccountKeyParts): string {
  const login = String(parts.accountLogin).trim();
  const server = parts.accountServer.trim();
  const term = parts.terminalId.trim();
  return `${term}|${login}|${server}`;
}
