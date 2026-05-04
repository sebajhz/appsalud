import type { AccountId, AccountSnapshotDto } from "@workspace/mapazapp-core";
import { mockAccountSnapshots } from "@/mock/account";
import type { AccountSnapshot } from "@/mock/types";
import type { AccountDataSource } from "./accountDataSource";

function toDto(s: AccountSnapshot): AccountSnapshotDto {
  return {
    accountId: s.accountId,
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

export function createMockAccountDataSource(): AccountDataSource {
  return {
    getAccountSnapshot(accountId: AccountId): AccountSnapshotDto | undefined {
      const row = mockAccountSnapshots[accountId];
      if (!row) return undefined;
      return toDto(row);
    },
  };
}
