import { describe, expect, it } from "vitest";
import {
  accountGuardResultToTradePlanAccountGuardInput,
  evaluateAccountGuard,
} from "../src/account-guard-evaluator";
import { createDefaultAccountGuardSettingsForTests } from "../src/account-guard-settings";
import type { AccountGuardInput } from "../src/account-guard-types";
import { validateAssistedExecutionIntent } from "../src/assisted-execution-contract";
import { createAssistedExecutionFixtureBlockedAccountGuard } from "../src/assisted-execution-fixtures";
import { evaluateTradeReviewPlan } from "../src/trade-plan-evaluator";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
import type { TradePlanInput } from "../src/trade-plan-types";
import type { ZoneCandidate } from "../src/zone-candidate";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

const defaultGuardSettings = (): ReturnType<typeof createDefaultAccountGuardSettingsForTests> =>
  createDefaultAccountGuardSettingsForTests();

function riskOk(over: Partial<AccountGuardInput["risk"]> = {}): AccountGuardInput["risk"] {
  return {
    balance: 100_000,
    equity: 100_000,
    dailyStartBalance: 100_000,
    dailyStartEquity: 100_000,
    dailyLossLimitAmount: 4000,
    dailyLossUsedAmount: 100,
    dailyLossRemainingAmount: 3900,
    maxLossLimitAmount: 8000,
    maxLossUsedAmount: 500,
    maxLossRemainingAmount: 7500,
    riskPerTradePercent: 1,
    tradesTakenToday: 0,
    maxTradesPerDay: 5,
    ...over,
  };
}

function baseGuardInput(over: Partial<AccountGuardInput> = {}): AccountGuardInput {
  return {
    accountId: "ACC_B1_TEST",
    operationalStatus: "TRADING_ALLOWED",
    tradingAllowed: true,
    risk: riskOk(),
    approvedParameterSetForAccount: true,
    bridgeConnected: true,
    spreadAllowed: true,
    ...over,
  };
}

function zoneBase(over: Partial<ZoneCandidate> = {}): ZoneCandidate {
  return {
    zoneId: "Z_B1_GUARD",
    strategyId: "MZP_IFVG_V1",
    parameterSetId: "PS_TEST",
    canonicalSymbol: "XAUUSD",
    direction: "BUY",
    zoneLow: 2000,
    zoneHigh: 2010,
    midpoint: 2005,
    invalidationPrice: 1990,
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceIfvgId: "ifvg-1",
    reasonSimple: "",
    reasonTechnical: "",
    initialState: "WAIT_RETEST",
    ...over,
  };
}

function tradePlanBase(over: Partial<TradePlanInput> = {}): TradePlanInput {
  const settings = createDefaultTradePlanEvaluationSettingsForTests();
  return {
    zoneCandidate: zoneBase(),
    symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
    tradePlanSettings: settings,
    retestResult: { retested: true, retestMode: "full_zone", touchPrice: 2004, event: "RETEST_HIT" },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "CLEAR",
      body: 2,
    },
    confirmationAtr: 2,
    confirmationClose: 2008,
    spreadPrice: V1_TEST_SYMBOL_PROFILES.XAUUSD.spreadPrice,
    score: { totalScore: 80 },
    accountGuard: {
      allowTradeReview: true,
      approvedParameterSetForAccount: true,
      spreadAllowed: true,
      operationalStatus: "TRADING_ALLOWED",
    },
    evaluationTimeIso: "2026-01-02T12:00:00.000Z",
    accountId: "ACC_B1_TEST",
    sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 1998 },
    ...over,
  };
}

const FORBIDDEN_SERIALIZATION_FRAGMENTS = [
  '"executionEnabled":true',
  '"canAutoExecute":true',
  '"sendToMt5Enabled":true',
  '"autoApprovalEnabled":true',
  '"approved":true',
  "OrderSend",
  "CTrade",
] as const;

function assertNoForbiddenSerialization(json: string): void {
  for (const frag of FORBIDDEN_SERIALIZATION_FRAGMENTS) {
    expect(json.includes(frag), `unexpected fragment in serialized output: ${frag}`).toBe(false);
  }
}

describe("B1 — account guard blocks actionable trade-plan output", () => {
  it("blocked guard (daily drawdown) → trade plan not TRADE_READY and serialization stays safe", () => {
    const agInput = baseGuardInput({ operationalStatus: "BLOCKED_DAILY_DRAWDOWN" });
    const g = evaluateAccountGuard(agInput, defaultGuardSettings());
    expect(g.allowTradeReview).toBe(false);

    const tpGuard = accountGuardResultToTradePlanAccountGuardInput(agInput, g);
    const r = evaluateTradeReviewPlan(
      tradePlanBase({
        accountId: agInput.accountId,
        accountGuard: tpGuard,
      }),
    );

    expect(r.plan.status).not.toBe("TRADE_READY");
    expect(r.plan.reviewReady).toBe(false);
    expect(r.passedHardGatesForTradeReady).toBe(false);
    assertNoForbiddenSerialization(JSON.stringify(r));
  });

  it("missing risk snapshot → guard blocks → trade plan serialization stays safe", () => {
    const agInput = baseGuardInput({
      risk: riskOk({ balance: Number.NaN }),
    });
    const g = evaluateAccountGuard(agInput, defaultGuardSettings());
    expect(g.allowTradeReview).toBe(false);

    const tpGuard = accountGuardResultToTradePlanAccountGuardInput(agInput, g);
    const r = evaluateTradeReviewPlan(
      tradePlanBase({
        accountId: agInput.accountId,
        accountGuard: tpGuard,
      }),
    );

    expect(r.plan.status).toBe("NO_TRADE");
    assertNoForbiddenSerialization(JSON.stringify(r));
  });

  it("assisted execution blocked fixture stays disabled with safe serialization", () => {
    const r = validateAssistedExecutionIntent(createAssistedExecutionFixtureBlockedAccountGuard());
    expect(r.executionEnabled).toBe(false);
    expect(r.canAutoExecute).toBe(false);
    expect(r.sendToMt5Enabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.manualReviewRequired).toBe(true);
    assertNoForbiddenSerialization(JSON.stringify(r));
  });
});
