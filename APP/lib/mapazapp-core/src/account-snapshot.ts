import type { AccountId } from "./ids";

/** Core DTO for account summary — mirrors mock `AccountSnapshot` fields for the service layer. */
export interface AccountSnapshotDto {
  accountId: AccountId;
  displayName: string;
  broker: string;
  balance: number;
  equity: number;
  dailyPnL: number;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  openTrades: number;
  currency: string;
  challenge: string;
}
