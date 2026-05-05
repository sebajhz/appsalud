import type { AccountId, AccountSnapshotDto } from "@workspace/mapazapp-core";
import {
  MAPAZAPP_MOCK_ACCOUNTS,
  MAPAZAPP_MOCK_SNAPSHOTS,
} from "../mockData";
import type { AppAccountConfig } from "../types";

export function findAccount(accountId: string): AppAccountConfig | undefined {
  return MAPAZAPP_MOCK_ACCOUNTS.find((a) => a.accountId === accountId);
}

export function listAccounts(): AppAccountConfig[] {
  return MAPAZAPP_MOCK_ACCOUNTS;
}

function toDto(s: (typeof MAPAZAPP_MOCK_SNAPSHOTS)[string]): AccountSnapshotDto {
  return {
    accountId: s.accountId as AccountId,
    displayName: s.displayName,
    broker: s.broker,
    balance: s.balance,
    equity: s.equity,
    dailyPnL: s.dailyPnL,
    dailyDrawdownPct: s.dailyDrawdownPct,
    maxDrawdownPct: s.maxDrawdownPct,
    openTrades: s.openTrades,
    currency: s.currency,
    challenge: s.challenge,
  };
}

export function getAccountSnapshotDto(accountId: string): AccountSnapshotDto | undefined {
  const row = MAPAZAPP_MOCK_SNAPSHOTS[accountId];
  if (!row) return undefined;
  return toDto(row);
}

export interface AccountSummaryPayload {
  accountId: string;
  config: AppAccountConfig;
  snapshot: AccountSnapshotDto;
}

export function getAccountSummary(accountId: string): AccountSummaryPayload | undefined {
  const cfg = findAccount(accountId);
  const snap = getAccountSnapshotDto(accountId);
  if (!cfg || !snap) return undefined;
  return { accountId, config: cfg, snapshot: snap };
}
