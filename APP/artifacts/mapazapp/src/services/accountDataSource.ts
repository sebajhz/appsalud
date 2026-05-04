import type { AccountId, AccountSnapshotDto } from "@workspace/mapazapp-core";

/**
 * In-process data access for account-scoped dashboard data.
 * Checkpoint 1: backed by `src/mock/` only — no HTTP, no persistence.
 */
export interface AccountDataSource {
  getAccountSnapshot(accountId: AccountId): AccountSnapshotDto | undefined;
}
