/**
 * Duplicated from `mapazapp/src/services/mapMockRiskToTradePlanGuard.ts` (checkpoint 11 backend).
 */
import type {
  AccountGuardInput,
  AccountGuardResult,
  AccountGuardSettings,
  AccountId,
  TradePlanAccountGuardInput,
} from "@workspace/mapazapp-core";
import {
  accountGuardResultToTradePlanAccountGuardInput,
  createDefaultAccountGuardSettingsForTests,
  evaluateAccountGuard,
} from "@workspace/mapazapp-core";
import type { AccountPropFirmState, AccountRiskGuardState } from "../types";

export function mapMockRiskToTradePlanGuard(
  risk: AccountRiskGuardState,
  approvedParameterSetForAccount: boolean,
  options?: {
    propFirm?: AccountPropFirmState;
    spreadAllowed?: boolean;
    accountMode?: string;
    bridgeConnected?: boolean;
    accountGuardSettings?: AccountGuardSettings;
  },
): { tradePlanAccountGuard: TradePlanAccountGuardInput; accountGuardResult: AccountGuardResult } {
  const settings = options?.accountGuardSettings ?? createDefaultAccountGuardSettingsForTests();

  const bridgeConnected =
    options?.bridgeConnected ?? (risk.operationalStatus === "BRIDGE_DISCONNECTED" ? false : true);

  const input: AccountGuardInput = {
    accountId: risk.accountId as AccountId,
    operationalStatus: risk.operationalStatus,
    tradingAllowed: risk.tradingAllowed,
    accountMode: options?.accountMode,
    risk: {
      balance: risk.balance,
      equity: risk.equity,
      dailyStartBalance: risk.dailyStartBalance,
      dailyStartEquity: risk.dailyStartEquity,
      dailyLossLimitAmount: risk.dailyLossLimitAmount,
      dailyLossUsedAmount: risk.dailyLossUsedAmount,
      dailyLossRemainingAmount: risk.dailyLossRemainingAmount,
      maxLossLimitAmount: risk.maxLossLimitAmount,
      maxLossUsedAmount: risk.maxLossUsedAmount,
      maxLossRemainingAmount: risk.maxLossRemainingAmount,
      riskPerTradePercent: risk.riskPerTradePercent,
      tradesTakenToday: risk.tradesTakenToday,
      maxTradesPerDay: risk.maxTradesPerDay,
    },
    prop: options?.propFirm
      ? {
          propFirmBlocked: options.propFirm.status === "BREACHED",
          firmProgramLabel: options.propFirm.programName,
        }
      : { propFirmBlocked: false },
    newsBlackout: risk.operationalStatus === "BLOCKED_NEWS",
    psychologicalLock: risk.operationalStatus === "BLOCKED_PSYCHOLOGY",
    bridgeConnected,
    approvedParameterSetForAccount,
    spreadAllowed: options?.spreadAllowed ?? true,
  };

  const accountGuardResult = evaluateAccountGuard(input, settings);
  const tradePlanAccountGuard = accountGuardResultToTradePlanAccountGuardInput(input, accountGuardResult);
  return { tradePlanAccountGuard, accountGuardResult };
}
