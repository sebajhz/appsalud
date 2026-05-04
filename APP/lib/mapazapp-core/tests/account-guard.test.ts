import { describe, expect, it } from "vitest";
import { evaluateAccountGuard } from "../src/account-guard-evaluator";
import { createDefaultAccountGuardSettingsForTests } from "../src/account-guard-settings";
import type { AccountGuardInput, AccountGuardSettings } from "../src/account-guard-types";
import { evaluateTradeReviewPlan } from "../src/trade-plan-evaluator";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
import type { TradePlanInput } from "../src/trade-plan-types";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";
import type { ZoneCandidate } from "../src/zone-candidate";

const defaultSettings = (): AccountGuardSettings => createDefaultAccountGuardSettingsForTests();

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

function baseInput(over: Partial<AccountGuardInput> = {}): AccountGuardInput {
  return {
    accountId: "ACC_TEST",
    operationalStatus: "TRADING_ALLOWED",
    tradingAllowed: true,
    risk: riskOk(),
    approvedParameterSetForAccount: true,
    bridgeConnected: true,
    spreadAllowed: true,
    ...over,
  };
}

describe("Checkpoint 6 — evaluateAccountGuard", () => {
  it("A. account OK => allowTradeReview true", () => {
    const r = evaluateAccountGuard(baseInput(), defaultSettings());
    expect(r.allowTradeReview).toBe(true);
    expect(r.status).toBe("ACCOUNT_OK");
    expect(r.blockingReasons).toHaveLength(0);
    expect(r.metrics?.riskPerTradeAmount).toBe(1000);
  });

  it("B. daily drawdown blocked => false", () => {
    const r = evaluateAccountGuard(
      baseInput({ operationalStatus: "BLOCKED_DAILY_DRAWDOWN" }),
      defaultSettings(),
    );
    expect(r.allowTradeReview).toBe(false);
    expect(r.blockingReasons.map((x) => x.code)).toContain("DAILY_DRAWDOWN_BLOCKED");
  });

  it("B. daily drawdown near limit => warning, still allowed", () => {
    const r = evaluateAccountGuard(
      baseInput({
        risk: riskOk({
          dailyLossUsedAmount: 3300,
          dailyLossRemainingAmount: 700,
        }),
      }),
      { ...defaultSettings(), dailyDrawdownWarningPercent: 80 },
    );
    expect(r.allowTradeReview).toBe(true);
    expect(r.warningReasons.map((w) => w.code)).toContain("DAILY_DRAWDOWN_NEAR_LIMIT_WARNING");
  });

  it("C. max drawdown blocked => false", () => {
    const r = evaluateAccountGuard(
      baseInput({ operationalStatus: "BLOCKED_MAX_DRAWDOWN" }),
      defaultSettings(),
    );
    expect(r.allowTradeReview).toBe(false);
    expect(r.blockingReasons.map((x) => x.code)).toContain("MAX_DRAWDOWN_BLOCKED");
  });

  it("C. max drawdown near limit => warning", () => {
    const r = evaluateAccountGuard(
      baseInput({
        risk: riskOk({
          maxLossUsedAmount: 6500,
          maxLossRemainingAmount: 1500,
        }),
      }),
      { ...defaultSettings(), maxDrawdownWarningPercent: 80 },
    );
    expect(r.allowTradeReview).toBe(true);
    expect(r.warningReasons.map((w) => w.code)).toContain("MAX_DRAWDOWN_NEAR_LIMIT_WARNING");
  });

  it("D. max trades reached => false", () => {
    const r = evaluateAccountGuard(
      baseInput({
        risk: riskOk({ tradesTakenToday: 5, maxTradesPerDay: 5 }),
      }),
      defaultSettings(),
    );
    expect(r.allowTradeReview).toBe(false);
    expect(r.blockingReasons.map((x) => x.code)).toContain("MAX_TRADES_REACHED");
  });

  it("D. one trade remaining => warning", () => {
    const r = evaluateAccountGuard(
      baseInput({
        risk: riskOk({ tradesTakenToday: 4, maxTradesPerDay: 5 }),
      }),
      defaultSettings(),
    );
    expect(r.allowTradeReview).toBe(true);
    expect(r.warningReasons.map((w) => w.code)).toContain("TRADES_REMAINING_LOW_WARNING");
  });

  it("E. news blackout blocks by default", () => {
    const r = evaluateAccountGuard(baseInput({ operationalStatus: "BLOCKED_NEWS" }), defaultSettings());
    expect(r.allowTradeReview).toBe(false);
    expect(r.blockingReasons.map((x) => x.code)).toContain("NEWS_BLACKOUT_ACTIVE");
  });

  it("E. news allowed when allowNewsReview", () => {
    const r = evaluateAccountGuard(baseInput({ operationalStatus: "BLOCKED_NEWS" }), {
      ...defaultSettings(),
      allowNewsReview: true,
    });
    expect(r.allowTradeReview).toBe(true);
  });

  it("E. prop firm blocked", () => {
    const r = evaluateAccountGuard(
      baseInput({ prop: { propFirmBlocked: true } }),
      defaultSettings(),
    );
    expect(r.allowTradeReview).toBe(false);
    expect(r.blockingReasons.map((x) => x.code)).toContain("PROP_FIRM_RULE_BLOCKED");
  });

  it("E. psychological lock", () => {
    const r = evaluateAccountGuard(
      baseInput({ operationalStatus: "BLOCKED_PSYCHOLOGY" }),
      defaultSettings(),
    );
    expect(r.allowTradeReview).toBe(false);
  });

  it("F. bridge blocks only when requireBridgeForReview", () => {
    const blocked = evaluateAccountGuard(
      baseInput({ bridgeConnected: false }),
      { ...defaultSettings(), requireBridgeForReview: true },
    );
    expect(blocked.allowTradeReview).toBe(false);
    expect(blocked.blockingReasons.map((b) => b.code)).toContain("BRIDGE_DISCONNECTED");

    const warn = evaluateAccountGuard(
      baseInput({ bridgeConnected: false }),
      { ...defaultSettings(), requireBridgeForReview: false },
    );
    expect(warn.allowTradeReview).toBe(true);
    expect(warn.warningReasons.map((w) => w.code)).toContain("BRIDGE_DISCONNECTED_WARNING");
  });

  it("F. parameter set not approved blocks when required", () => {
    const r = evaluateAccountGuard(
      baseInput({ approvedParameterSetForAccount: false }),
      { ...defaultSettings(), requireApprovedParameterSet: true },
    );
    expect(r.allowTradeReview).toBe(false);
    expect(r.blockingReasons.map((x) => x.code)).toContain("PARAMETER_SET_NOT_APPROVED_FOR_ACCOUNT");
  });

  it("F. parameter set not required => OK", () => {
    const r = evaluateAccountGuard(
      baseInput({ approvedParameterSetForAccount: false }),
      { ...defaultSettings(), requireApprovedParameterSet: false },
    );
    expect(r.allowTradeReview).toBe(true);
  });

  it("missing account id => insufficient", () => {
    const r = evaluateAccountGuard(baseInput({ accountId: "  " }), defaultSettings());
    expect(r.allowTradeReview).toBe(false);
    expect(r.status).toBe("INSUFFICIENT_ACCOUNT_DATA");
  });

  it("watch only blocks unless allowWatchOnlyReview", () => {
    const blocked = evaluateAccountGuard(
      baseInput({ operationalStatus: "WATCH_ONLY" }),
      defaultSettings(),
    );
    expect(blocked.allowTradeReview).toBe(false);

    const ok = evaluateAccountGuard(
      baseInput({ operationalStatus: "WATCH_ONLY", tradingAllowed: true }),
      {
        ...defaultSettings(),
        allowWatchOnlyReview: true,
      },
    );
    expect(ok.allowTradeReview).toBe(true);
  });
});

function zoneBase(over: Partial<ZoneCandidate> = {}): ZoneCandidate {
  return {
    zoneId: "Z_TEST_GUARD",
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
    accountId: "TEST_ACC_V1",
    sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 1998 },
    ...over,
  };
}

describe("Checkpoint 6 — G. TradePlan integration", () => {
  it("account guard blocks => NO_TRADE", () => {
    const input = tradePlanBase({
      accountGuard: {
        allowTradeReview: false,
        approvedParameterSetForAccount: true,
        spreadAllowed: true,
        operationalStatus: "TRADING_ALLOWED",
      },
    });
    const r = evaluateTradeReviewPlan(input);
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.failedHardGates).toContain("TRADE_REVIEW_NOT_ALLOWED");
  });

  it("account guard OK allows TRADE_READY when other inputs pass", () => {
    const r = evaluateTradeReviewPlan(tradePlanBase());
    expect(r.plan.status).toBe("TRADE_READY");
  });
});
