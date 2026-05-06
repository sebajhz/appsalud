import type { AccountId } from "@workspace/mapazapp-core";
import {
  createAssistedExecutionFixtureBlockedAccountGuard,
  createAssistedExecutionFixtureValidManualChecklist,
  validateAssistedExecutionIntent,
} from "@workspace/mapazapp-core";
import type { AssistedExecutionDataSource } from "./assistedExecutionDataSource";

export function createMockAssistedExecutionDataSource(): AssistedExecutionDataSource {
  return {
    getMockAssistedExecutionValidation(accountId: AccountId) {
      if (accountId === "ACC_FORWARD_MONITOR_GUARD_BLOCK") {
        return validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedAccountGuard());
      }
      const base = createAssistedExecutionFixtureValidManualChecklist();
      return validateAssistedExecutionIntent({
        ...base,
        accountId,
        tradeReviewPlan: base.tradeReviewPlan ? { ...base.tradeReviewPlan, accountId } : null,
        accountGuardResult: { ...base.accountGuardResult, accountId },
        symbolProfile: base.symbolProfile ? { ...base.symbolProfile, accountId } : null,
        auditId: `ae_dash_${accountId}`,
      });
    },
  };
}
