import type { AccountId } from "@workspace/mapazapp-core";
import {
  createForwardMonitorFixtureInputPropXpEur,
  createForwardMonitorFixtureInputThe5ersXau,
  evaluateForwardMonitorSnapshot,
} from "@workspace/mapazapp-core";
import type { ForwardMonitorDataSource } from "./forwardMonitorDataSource";

export function createMockForwardMonitorDataSource(): ForwardMonitorDataSource {
  return {
    getLatestForwardMonitorForAccount(accountId: AccountId) {
      if (accountId === "ACC_PROPXP_50K_PHASE1") {
        return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputPropXpEur());
      }
      return evaluateForwardMonitorSnapshot(createForwardMonitorFixtureInputThe5ersXau());
    },
  };
}
