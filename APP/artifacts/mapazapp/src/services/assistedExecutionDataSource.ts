import type { AccountId, AssistedExecutionValidationResult } from "@workspace/mapazapp-core";

export interface AssistedExecutionDataSource {
  getMockAssistedExecutionValidation(accountId: AccountId): AssistedExecutionValidationResult;
}
