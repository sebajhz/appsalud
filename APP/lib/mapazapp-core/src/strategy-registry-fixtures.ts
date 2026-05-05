/**
 * **Mock / test registry only** — not optimized, not broker truth, not live approval.
 * Dashboard and Vitest share this fixture to avoid drift.
 */

import { createDefaultIfvgStrategySettingsForTests } from "./strategy-settings";
import type { ParameterSetRegistry, StrategyDefinition, ParameterSetDefinition } from "./strategy-registry-types";

const ISO = "2026-05-04T12:00:00.000Z";

export const CHECKPOINT7_MOCK_STRATEGY_ID = "MZP_IFVG_ZONE_REACTION_V1" as const;

export function createCheckpoint7MockParameterSetRegistry(): ParameterSetRegistry {
  const baseSettings = createDefaultIfvgStrategySettingsForTests();

  const strategy: StrategyDefinition = {
    strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
    name: "Mapazapp IFVG zone reaction (V1 skeleton)",
    version: "1.0.0",
    family: "IFVG_ZONE_REACTION",
    description:
      "IFVG zone lifecycle + retest/confirmation pipeline per blueprint — registry entry for mock dashboard and tests only.",
    supportedSymbols: ["XAUUSD", "EURUSD", "NAS100", "GBPUSD"],
    requiredSettingsGroups: [
      "atr",
      "context",
      "swing",
      "sweep",
      "displacement",
      "fvg",
      "ifvg",
      "zone",
      "retest",
      "confirmation",
      "scoreRisk",
    ],
    status: "active",
    liveTradingEnabled: false,
    notes: "Not live-trading enabled. No MT5 export implied. Checkpoint 7 mock registry.",
  };

  const sets: ParameterSetDefinition[] = [
    {
      parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      canonicalSymbol: "XAUUSD",
      brokerSymbol: "XAUUSD",
      status: "approved_for_trade_review",
      approvalLevel: "trade_review",
      allowedAccountIds: ["ACC_THE5ERS_100K_PHASE1_A"],
      blockedAccountIds: [],
      settings: { ...baseSettings },
      source: "mock",
      createdAt: ISO,
      updatedAt: ISO,
      validationSummary: "Synthetic mock validation — not from real Strategy Tester.",
      notes: "Mock only. Replace with real MT5 backtest linkage in a later checkpoint.",
    },
    {
      parameterSetId: "MZP_IFVG_EURUSD_V1_SET_001",
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      canonicalSymbol: "EURUSD",
      status: "approved_for_alerts",
      approvalLevel: "alerts_only",
      allowedAccountIds: ["ACC_THE5ERS_100K_PHASE1_A", "ACC_PROPXP_50K_PHASE1"],
      blockedAccountIds: [],
      settings: { ...baseSettings },
      source: "mock",
      createdAt: ISO,
      updatedAt: ISO,
      notes: "Alerts-only approval — must not yield TRADE_READY in core review.",
    },
    {
      parameterSetId: "MZP_IFVG_NAS100_V1_SET_001",
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      canonicalSymbol: "NAS100",
      status: "validated",
      approvalLevel: "internal",
      allowedAccountIds: ["ACC_THE5ERS_100K_PHASE1_A", "ACC_PROPXP_50K_PHASE1"],
      blockedAccountIds: [],
      settings: { ...baseSettings },
      source: "mock",
      createdAt: ISO,
      updatedAt: ISO,
      validationSummary: "Lab validation only — not approved_for_trade_review.",
      notes: "Mock validated row — still blocks trade-ready review.",
    },
    {
      parameterSetId: "MZP_IFVG_GBPUSD_V1_SET_DRAFT",
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      canonicalSymbol: "GBPUSD",
      status: "draft",
      approvalLevel: "none",
      allowedAccountIds: ["ACC_THE5ERS_100K_PHASE1_A"],
      blockedAccountIds: [],
      settings: { ...baseSettings },
      source: "mock",
      createdAt: ISO,
      updatedAt: ISO,
      notes: "Draft parameter set — blocks trade review and alerts.",
    },
    {
      parameterSetId: "MZP_IFVG_NAS100_LEGACY_REJECTED",
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      canonicalSymbol: "NAS100",
      status: "rejected",
      approvalLevel: "none",
      allowedAccountIds: [],
      blockedAccountIds: [],
      settings: { ...baseSettings },
      source: "mock",
      createdAt: ISO,
      updatedAt: ISO,
      notes: "Legacy mock rejected NAS row aligned with dashboard backtests list.",
    },
    {
      parameterSetId: "MZP_IFVG_REJECTED_STUB",
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      canonicalSymbol: "USDJPY",
      status: "rejected",
      approvalLevel: "none",
      allowedAccountIds: ["ACC_THE5ERS_100K_PHASE1_A"],
      blockedAccountIds: [],
      settings: { ...baseSettings },
      source: "mock",
      createdAt: ISO,
      updatedAt: ISO,
      notes: "Vitest-only rejected row.",
    },
    {
      parameterSetId: "MZP_IFVG_EURUSD_BLOCK_TEST",
      strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
      canonicalSymbol: "EURUSD",
      status: "approved_for_trade_review",
      approvalLevel: "trade_review",
      allowedAccountIds: ["ACC_THE5ERS_100K_PHASE1_A"],
      blockedAccountIds: ["ACC_PROPXP_50K_PHASE1"],
      settings: { ...baseSettings },
      source: "mock",
      createdAt: ISO,
      updatedAt: ISO,
      notes: "Fixture row for Vitest — explicit blockedAccountIds (PropXP blocked).",
    },
  ];

  return { strategies: [strategy], parameterSets: sets };
}
