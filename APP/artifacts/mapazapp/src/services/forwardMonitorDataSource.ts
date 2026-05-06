import type { AccountId, ForwardMonitorResult } from "@workspace/mapazapp-core";

export interface ForwardMonitorDataSource {
  getLatestForwardMonitorForAccount(accountId: AccountId): ForwardMonitorResult;
}
