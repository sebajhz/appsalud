/**
 * Fictional assisted execution validation inputs — no real accounts, no broker data.
 */

import type { AccountGuardResult } from "./account-guard-types";
import { accountGuardReason } from "./account-guard-reasons";
import type { AccountId } from "./ids";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import {
  CHECKPOINT7_MOCK_STRATEGY_ID,
  createCheckpoint7MockParameterSetRegistry,
} from "./strategy-registry-fixtures";
import { evaluateParameterSetCompatibility } from "./strategy-registry-evaluator";
import { createDefaultStrategyRegistryEvaluationSettings } from "./strategy-registry-settings";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { TradeReviewPlan } from "./trade-plan-types";
import type { AssistedExecutionValidationInput } from "./assisted-execution-types";
import { createDefaultAssistedExecutionSettingsForTests } from "./assisted-execution-settings";

const REG = createCheckpoint7MockParameterSetRegistry();
const REGEV = createDefaultStrategyRegistryEvaluationSettings();

const ACC_OK = "ACC_THE5ERS_100K_PHASE1_A" as AccountId;

function fictionalXauProfile(accountId: AccountId): SymbolMarketSpec {
  return {
    accountId,
    canonicalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    digits: 2,
    point: 0.01,
    tickSize: 0.01,
    tickValue: 1.0,
    contractSize: 100,
    volumeMin: 0.01,
    volumeMax: 50,
    volumeStep: 0.01,
    spreadPoints: 25,
    spreadPrice: 0.25,
  };
}

function fictionalEurProfile(accountId: AccountId): SymbolMarketSpec {
  return {
    accountId,
    canonicalSymbol: "EURUSD",
    brokerSymbol: "EURUSD",
    digits: 5,
    point: 0.00001,
    tickSize: 0.00001,
    tickValue: 1.0,
    contractSize: 100000,
    volumeMin: 0.01,
    volumeMax: 100,
    volumeStep: 0.01,
    spreadPoints: 12,
    spreadPrice: 0.00012,
  };
}

function guardOk(accountId: AccountId): AccountGuardResult {
  return {
    accountId,
    status: "ACCOUNT_OK",
    allowTradeReview: true,
    blockingReasons: [],
    warningReasons: [],
    simpleSummary: "Fixture: account guard OK.",
    technicalSummary: "ACCOUNT_OK",
    metrics: null,
  };
}

function guardBlocked(accountId: AccountId): AccountGuardResult {
  return {
    accountId,
    status: "BLOCKED_DAILY_DRAWDOWN",
    allowTradeReview: false,
    blockingReasons: [accountGuardReason("DAILY_DRAWDOWN_BLOCKED", "blocking")],
    warningReasons: [],
    simpleSummary: "Fixture: drawdown blocks review.",
    technicalSummary: "DAILY_DRAWDOWN_BLOCKED",
    metrics: null,
  };
}

function compatTradeReviewXau(accountId: AccountId): ParameterSetCompatibilityResult {
  return evaluateParameterSetCompatibility(
    {
      strategyRegistry: REG,
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
      canonicalSymbol: "XAUUSD",
      brokerSymbol: "XAUUSD",
      accountId,
      requestedUsage: "trade_review",
    },
    REGEV,
  );
}

function compatAlertsEur(accountId: AccountId): ParameterSetCompatibilityResult {
  return evaluateParameterSetCompatibility(
    {
      strategyRegistry: REG,
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
      canonicalSymbol: "EURUSD",
      brokerSymbol: "EURUSD",
      accountId,
      requestedUsage: "trade_review",
    },
    REGEV,
  );
}

function tradeReadyPlanXau(accountId: AccountId): TradeReviewPlan {
  return {
    status: "TRADE_READY",
    action: "TRADE_READY",
    direction: "BUY",
    canonicalSymbol: "XAUUSD",
    zoneId: "CP17_FIXTURE_ZONE_XAU_1",
    strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
    parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
    accountId,
    targetModel: "fixed_R",
    entryAreaLow: 2000,
    entryAreaHigh: 2010,
    referenceEntryPrice: 2005,
    stopLoss: 1990,
    takeProfit: 2035,
    metrics: {
      riskPrice: 15,
      rewardPrice: 30,
      rr: 2,
      slDistancePrice: 15,
      slDistancePoints: 1500,
      slDistanceTicks: 1500,
    },
    reasons: [
      { code: "ZONE_VALID", messageSimple: "Zone valid (fixture)." },
      { code: "TRADE_READY_REVIEW_ONLY", messageSimple: "Review only (fixture)." },
    ],
    noTradeReasons: [],
    failedHardGates: [],
    simpleSummary: "Fixture TRADE_READY review-only.",
    reviewReady: true,
  };
}

function tradeReadyPlanEur(accountId: AccountId): TradeReviewPlan {
  const p = tradeReadyPlanXau(accountId);
  return {
    ...p,
    canonicalSymbol: "EURUSD",
    zoneId: "CP17_FIXTURE_ZONE_EUR_1",
    parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
    entryAreaLow: 1.08,
    entryAreaHigh: 1.085,
    referenceEntryPrice: 1.082,
    stopLoss: 1.078,
    takeProfit: 1.09,
    metrics: {
      riskPrice: 0.004,
      rewardPrice: 0.008,
      rr: 2,
      slDistancePrice: 0.004,
      slDistancePoints: 40,
      slDistanceTicks: 40,
    },
  };
}

const FULL_CONFIRMATIONS = {
  reviewedSetup: true,
  reviewedRisk: true,
  reviewedPropFirmRules: true,
  reviewedNoAutoExecution: true,
  reviewedManualOnly: true,
  reviewedStopLoss: true,
  reviewedPositionSizing: true,
  reviewedNewsRisk: true,
};

const SETTINGS = createDefaultAssistedExecutionSettingsForTests();
const PHRASE = SETTINGS.expectedConfirmationPhrase;

/** Valid TRADE_READY path: all gates and confirmations — still executionDisabled in CP17. */
export function createAssistedExecutionFixtureValidManualChecklist(): AssistedExecutionValidationInput {
  return {
    settings: SETTINGS,
    intent: {
      requestedAction: "MANUAL_EXECUTION_CHECKLIST",
      humanConfirmations: FULL_CONFIRMATIONS,
      confirmationPhrase: PHRASE,
      intentDedupeKey: "CP17_FIXTURE_ZONE_XAU_1",
    },
    accountId: ACC_OK,
    tradeReviewPlan: tradeReadyPlanXau(ACC_OK),
    accountGuardResult: guardOk(ACC_OK),
    registryCompatibility: compatTradeReviewXau(ACC_OK),
    symbolProfile: fictionalXauProfile(ACC_OK),
    backtestEvidenceRecommendationPresent: false,
    existingActiveIntentKeys: ["OTHER_ZONE_ACTIVE"],
    createdAtUtc: "2026-05-05T10:00:00.000Z",
    auditId: "ae_fixture_cp17_valid",
    notes: "Fictional valid candidate — manual checklist only.",
  };
}

export function createAssistedExecutionFixtureBlockedAccountGuard(): AssistedExecutionValidationInput {
  const base = createAssistedExecutionFixtureValidManualChecklist();
  return {
    ...base,
    accountGuardResult: guardBlocked(ACC_OK),
    auditId: "ae_fixture_cp17_guard",
    notes: "Fixture: account guard blocks.",
  };
}

export function createAssistedExecutionFixtureBlockedParameterSet(): AssistedExecutionValidationInput {
  return {
    settings: SETTINGS,
    intent: {
      requestedAction: "REVIEW_ONLY",
      humanConfirmations: FULL_CONFIRMATIONS,
      confirmationPhrase: PHRASE,
    },
    accountId: ACC_OK,
    tradeReviewPlan: tradeReadyPlanEur(ACC_OK),
    accountGuardResult: guardOk(ACC_OK),
    registryCompatibility: compatAlertsEur(ACC_OK),
    symbolProfile: fictionalEurProfile(ACC_OK),
    createdAtUtc: "2026-05-05T10:00:00.000Z",
    auditId: "ae_fixture_cp17_registry",
    notes: "Fixture: parameter set not approved for trade review.",
  };
}

export function createAssistedExecutionFixtureBlockedMissingConfirmation(): AssistedExecutionValidationInput {
  const base = createAssistedExecutionFixtureValidManualChecklist();
  return {
    ...base,
    intent: {
      ...base.intent,
      humanConfirmations: { ...FULL_CONFIRMATIONS, reviewedNewsRisk: false },
    },
    auditId: "ae_fixture_cp17_confirm",
    notes: "Fixture: missing human confirmation.",
  };
}

export function createAssistedExecutionFixtureBlockedFutureMt5(): AssistedExecutionValidationInput {
  const base = createAssistedExecutionFixtureValidManualChecklist();
  return {
    ...base,
    intent: {
      ...base.intent,
      requestedAction: "FUTURE_SEND_TO_MT5_DISABLED",
    },
    auditId: "ae_fixture_cp17_mt5",
    notes: "Fixture: disabled future MT5 send action.",
  };
}
