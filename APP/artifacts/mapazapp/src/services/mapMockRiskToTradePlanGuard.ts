/**
 * Maps mock `AccountRiskGuardState` (+ optional prop firm) into `TradePlanAccountGuardInput`.
 * Does not evaluate prop rules — consumes mock flags only (checkpoint 4).
 */
import type { TradePlanAccountGuardInput } from "@workspace/mapazapp-core";
import type { AccountId } from "@workspace/mapazapp-core";
import type { AccountPropFirmState, AccountRiskGuardState, OperationalStatus } from "@/mock/types";

export function mapMockRiskToTradePlanGuard(
  risk: AccountRiskGuardState,
  approvedParameterSetForAccount: boolean,
  options?: {
    propFirm?: AccountPropFirmState;
    spreadAllowed?: boolean;
  },
): TradePlanAccountGuardInput {
  const op = risk.operationalStatus as OperationalStatus;
  return {
    accountId: risk.accountId as AccountId,
    operationalStatus: op,
    dailyDrawdownBlocked: op === "BLOCKED_DAILY_DRAWDOWN",
    maxDrawdownBlocked: op === "BLOCKED_MAX_DRAWDOWN",
    maxTradesReached: op === "BLOCKED_MAX_TRADES",
    newsBlackout: op === "BLOCKED_NEWS",
    propFirmBlocked: options?.propFirm?.status === "BREACHED",
    psychologicalLock: op === "BLOCKED_PSYCHOLOGY",
    approvedParameterSetForAccount,
    spreadAllowed: options?.spreadAllowed ?? true,
    allowTradeReview: risk.tradingAllowed,
  };
}
