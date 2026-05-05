import { describe, expect, it } from "vitest";
import {
  accountHasApprovedTradeReviewParameterSet,
  createCheckpoint7MockParameterSetRegistry,
  createDefaultStrategyRegistryEvaluationSettings,
  evaluateParameterSetCompatibility,
  evaluateTradeReviewPlan,
} from "../src/index";
import { createDefaultTradePlanEvaluationSettingsForTests } from "../src/trade-plan-settings";
import type { ZoneCandidate } from "../src/zone-candidate";
import type { TradePlanInput } from "../src/trade-plan-types";
import { V1_TEST_SYMBOL_PROFILES } from "./test-symbol-profiles";

const REG = createCheckpoint7MockParameterSetRegistry();
const SID = "MZP_IFVG_ZONE_REACTION_V1";
const EV = createDefaultStrategyRegistryEvaluationSettings();

function compat(
  over: Partial<{
    parameterSetId: string;
    canonicalSymbol: string;
    accountId: string;
    brokerSymbol: string | undefined;
    requestedUsage: "observe" | "alert" | "trade_review" | "backtest" | "validation";
  }> = {},
) {
  return evaluateParameterSetCompatibility(
    {
      strategyRegistry: REG,
      strategyId: SID,
      parameterSetId: over.parameterSetId ?? "MZP_IFVG_XAUUSD_V1_SET_003",
      canonicalSymbol: over.canonicalSymbol ?? "XAUUSD",
      brokerSymbol: over.brokerSymbol,
      accountId: over.accountId ?? "ACC_THE5ERS_100K_PHASE1_A",
      requestedUsage: over.requestedUsage ?? "trade_review",
    },
    EV,
  );
}

describe("Checkpoint 7 — registry compatibility", () => {
  it("A: approved_for_trade_review + matching symbol/account => allowTradeReview", () => {
    const c = compat();
    expect(c.allowTradeReview).toBe(true);
    expect(c.compatible).toBe(true);
  });

  it("B: approved_for_alerts => allowAlert true, allowTradeReview false", () => {
    const c = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
        canonicalSymbol: "EURUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "alert",
      },
      EV,
    );
    expect(c.allowAlert).toBe(true);
    expect(c.allowTradeReview).toBe(false);
    const tr = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
        canonicalSymbol: "EURUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    expect(tr.allowTradeReview).toBe(false);
  });

  it("C: validated => no trade review, backtest may be compatible", () => {
    const tr = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_NAS100_V1_SET_001",
        canonicalSymbol: "NAS100",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    expect(tr.allowTradeReview).toBe(false);
    const bt = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_NAS100_V1_SET_001",
        canonicalSymbol: "NAS100",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "backtest",
      },
      EV,
    );
    expect(bt.compatible).toBe(true);
  });

  it("D: draft blocks trade review", () => {
    const draft = REG.parameterSets.find((p) => p.parameterSetId === "MZP_IFVG_GBPUSD_V1_SET_DRAFT")!;
    const c = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: draft.parameterSetId,
        canonicalSymbol: "GBPUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    expect(c.allowTradeReview).toBe(false);
    expect(c.blockingReasons).toContain("PARAMETER_SET_DRAFT");
  });

  it("D2: rejected blocks trade review", () => {
    const c = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_REJECTED_STUB",
        canonicalSymbol: "USDJPY",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    expect(c.allowTradeReview).toBe(false);
    expect(c.blockingReasons).toContain("PARAMETER_SET_REJECTED");
  });

  it("E: symbol mismatch blocks", () => {
    const c = compat({ canonicalSymbol: "EURUSD" });
    expect(c.blockingReasons).toContain("PARAMETER_SET_SYMBOL_MISMATCH");
    expect(c.allowTradeReview).toBe(false);
  });

  it("F: allowedAccountIds excludes account => block", () => {
    const c = compat({ accountId: "ACC_PROPXP_50K_PHASE1" });
    expect(c.blockingReasons).toContain("PARAMETER_SET_ACCOUNT_NOT_ALLOWED");
    expect(c.allowTradeReview).toBe(false);
  });

  it("F2: blockedAccountIds includes account => block", () => {
    const c = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_EURUSD_BLOCK_TEST",
        canonicalSymbol: "EURUSD",
        accountId: "ACC_PROPXP_50K_PHASE1",
        requestedUsage: "trade_review",
      },
      EV,
    );
    expect(c.blockingReasons).toContain("PARAMETER_SET_ACCOUNT_BLOCKED");
  });

  it("G: missing strategy / set", () => {
    const r1 = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: "MISSING_STRATEGY",
        parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
        canonicalSymbol: "XAUUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    expect(r1.blockingReasons).toContain("STRATEGY_NOT_FOUND");

    const r2 = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MISSING_SET",
        canonicalSymbol: "XAUUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    expect(r2.blockingReasons).toContain("PARAMETER_SET_NOT_FOUND");
  });

  it("G2: accountHasApprovedTradeReviewParameterSet", () => {
    expect(accountHasApprovedTradeReviewParameterSet(REG, "ACC_THE5ERS_100K_PHASE1_A", EV)).toBe(true);
    expect(accountHasApprovedTradeReviewParameterSet(REG, "ACC_PROPXP_50K_PHASE1", EV)).toBe(false);
  });

  it("H: broker symbol mismatch blocks when configured", () => {
    const c = compat({ brokerSymbol: "XAUUSDm" });
    expect(c.blockingReasons).toContain("PARAMETER_SET_BROKER_SYMBOL_MISMATCH");
    expect(c.allowTradeReview).toBe(false);
  });
});

function zoneTradeReady(over: Partial<ZoneCandidate> = {}): ZoneCandidate {
  return {
    zoneId: "Z_CP7",
    strategyId: SID,
    parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
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

function tradeInput(over: Partial<TradePlanInput> = {}): TradePlanInput {
  const settings = createDefaultTradePlanEvaluationSettingsForTests();
  return {
    zoneCandidate: zoneTradeReady(),
    symbolProfile: V1_TEST_SYMBOL_PROFILES.XAUUSD,
    tradePlanSettings: { ...settings, testOrDevMode: false, requireApprovedParameterSet: true },
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
    accountId: "ACC_THE5ERS_100K_PHASE1_A",
    sweep: { sweepStatus: "CONFIRMED_SWEEP", sweepLow: 1998 },
    ...over,
  };
}

describe("Checkpoint 7 — trade plan + registry integration", () => {
  it("H: approved registry + guards OK can reach TRADE_READY", () => {
    const rc = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
        canonicalSymbol: "XAUUSD",
        brokerSymbol: "XAUUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    const r = evaluateTradeReviewPlan(
      tradeInput({
        registryCompatibility: rc,
        accountGuard: {
          allowTradeReview: true,
          approvedParameterSetForAccount: true,
          spreadAllowed: true,
          operationalStatus: "TRADING_ALLOWED",
        },
      }),
    );
    expect(r.plan.status).toBe("TRADE_READY");
  });

  it("H: unapproved parameter set (alerts-only compat) does not become TRADE_READY", () => {
    const rc = evaluateParameterSetCompatibility(
      {
        strategyRegistry: REG,
        strategyId: SID,
        parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
        canonicalSymbol: "EURUSD",
        accountId: "ACC_THE5ERS_100K_PHASE1_A",
        requestedUsage: "trade_review",
      },
      EV,
    );
    const sym = V1_TEST_SYMBOL_PROFILES.EURUSD;
    const z = zoneTradeReady({
      canonicalSymbol: "EURUSD",
      parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
      zoneLow: 1.08,
      zoneHigh: 1.081,
      midpoint: (1.08 + 1.081) / 2,
      invalidationPrice: 1.0825,
      direction: "SELL",
    });
    const r = evaluateTradeReviewPlan(
      tradeInput({
        zoneCandidate: z,
        symbolProfile: sym,
        confirmationAtr: 0.001,
        spreadPrice: sym.spreadPrice,
        registryCompatibility: rc,
        accountGuard: {
          allowTradeReview: true,
          approvedParameterSetForAccount: false,
          spreadAllowed: true,
          operationalStatus: "TRADING_ALLOWED",
        },
        sweep: { sweepHigh: 1.0815, sweepStatus: "CONFIRMED_SWEEP" },
        confirmationClose: 1.0802,
        confirmationResult: {
          confirmed: true,
          direction: "BEARISH",
          quality: "CLEAR",
          body: 0.0003,
        },
      }),
    );
    expect(r.plan.status).toBe("NO_TRADE");
    expect(r.plan.noTradeReasons.some((x) => x.code === "PARAMETER_SET_ALERTS_ONLY")).toBe(true);
  });
});
