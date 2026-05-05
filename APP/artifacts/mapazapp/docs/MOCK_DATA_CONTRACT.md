# Mock Data Contract — Mapazapp

This document describes every mock entity, its TypeScript interface, field meanings, and the future real data source that should replace it.

> **Important:** All data in `src/mock/` is static, hardcoded, and fictional. No values are computed, fetched, or derived from real trading data, real prices, or any algorithm.

---

## Overview — Account-Scoped Data Model

All entities are scoped to an `accountId`. The account registry lives in `config.ts`.

```
mockConfig.accounts[]           ← account registry (source of truth)
mockAccountSnapshots[accountId] ← balance, equity, daily P&L per account
mockRiskByAccount[accountId]    ← risk guard state per account
mockPropFirmByAccount[accountId]← prop firm guard state per account
mockBridgeTerminals[]           ← one terminal entry per account
mockJournalTrades[]             ← trades tagged with accountId
mockAlerts[]                    ← alerts tagged with accountId (null = global)
mockBacktests[]                 ← parameter set *stories* for Backtests UI (ids aligned with registry where applicable)
MOCK_CHECKPOINT7_STRATEGY_REGISTRY ← formal mock strategy + parameter-set definitions (from `@workspace/mapazapp-core` fixture; not MT5)
bridge-fixtures (`@workspace/mapazapp-core`) ← **fictional** BridgeEA `MZP_BRIDGE_V1` JSON/CSV **text** for checkpoint 10 parser tests + `BridgePage` mock panel (not read from `MQL5_COMMON_FILES`, not live MT5)
`@workspace/api-server` `src/mapazapp/mockData.ts` ← **duplicate** of the same logical account/zone/risk/registry inputs for **read-only HTTP** mock API (checkpoint 11); not wired into the Vite app by default
mockZones[]                     ← symbol-scoped (shared across accounts in mock)
mockPsychologyEntries[]         ← global (not account-scoped in mock)
```

---

## AccountConfig (`config.ts`)

```typescript
interface AccountConfig {
  accountId: string;        // 'ACC_THE5ERS_100K_PHASE1_A'
  displayName: string;      // 'The5ers 100k — Phase 1 A'
  firmName: string;         // 'The5ers'
  programName: string;      // 'The5ers 100k Challenge'
  challengePhase: string;   // 'Phase 1'
  mode: 'challenge' | 'funded' | 'demo' | 'personal';
  status: 'active' | 'watch_only' | 'archived';
  brokerName: string;       // 'IC Markets'
  accountServer: string;    // 'ICMarkets-Demo02'
  accountLogin: number;     // 123456
  accountSize: number;      // 100000
  currency: string;         // 'USD'
  riskProfileId: string;    // references RiskProfile
  rulesProfileId: string;   // references RulesProfile
}
```

**Future source:** `GET /api/accounts` — user-managed account registry with MT5 credentials stored server-side.

---

## RiskProfile (`config.ts`)

```typescript
interface RiskProfile {
  id: string;                  // 'RP_THE5ERS_CONSERVATIVE'
  name: string;                // 'The5ers Conservative'
  maxDailyDrawdownPct: number; // 4 (%)
  maxTotalDrawdownPct: number; // 8 (%)
  maxOpenRiskPct: number;      // 2 (%)
  maxTradesPerDay: number;     // 5
  riskPerTradePct: number;     // 1 (%)
}
```

**Future source:** `GET /api/risk-profiles` — user-configurable risk templates.

---

## RulesProfile (`config.ts`)

```typescript
interface RulesProfile {
  id: string;                        // 'RULES_THE5ERS_100K_P1'
  name: string;                      // 'The5ers 100k Phase 1'
  firmName: string;
  programName: string;
  profitTargetPct: number;           // 8 (%)
  maxDailyLossPct: number;           // 4 (%)
  maxTotalLossPct: number;           // 8 (%)
  consistencyEnabled: boolean;       // best day < 50% of total profit
  minimumTradingDaysRequired: number;// 0 = no requirement
  profitableDaysRequired: number;    // 0 = no requirement
  newsTradingAllowed: boolean;
  blackoutBeforeMinutes: number;     // 0 if news allowed
  blackoutAfterMinutes: number;
}
```

**Future source:** `GET /api/rules-profiles` — pre-seeded per prop firm, user-editable.

---

## SymbolMapping (`config.ts`)

```typescript
interface SymbolMapping {
  accountId: string;         // which account this mapping belongs to
  canonicalSymbol: string;   // 'XAUUSD'
  brokerSymbol: string;      // 'XAUUSDm' (broker-specific name in MT5)
  digits: number;            // price decimal places
  lotStep: number;           // minimum lot increment
}
```

**Future source:** Auto-resolved from MT5 `SymbolInfo()` call after bridge connects.

---

## AccountSnapshot (`account.ts`)

```typescript
interface AccountSnapshot {
  accountId: string;
  balance: number;           // 101245.80
  equity: number;            // 101490.20
  dailyPnL: number;          // +450.40
  dailyDrawdownPct: number;  // 0.31
  maxDrawdownPct: number;    // 0.93
  openTrades: number;        // 1
  currency: string;          // 'USD'
  broker: string;
  challenge: string;
}
```

**Future source:** `GET /api/accounts/:accountId/summary` — derived from MT5 AccountInfo() pushed by BridgeEA.

---

## AccountRiskGuardState (`risk.ts`)

The richest account-scoped entity. Fields are grouped by concept.

```typescript
interface AccountRiskGuardState {
  accountId: string;
  operationalStatus: OperationalStatus;  // primary gate — see full value list
  tradingAllowed: boolean;               // true only when status === TRADING_ALLOWED
  reason: string | null;                 // human-readable block reason if blocked

  // Account balances (snapshot of last bridge tick)
  balance: number;
  equity: number;
  dailyStartBalance: number;
  dailyStartEquity: number;

  // Daily loss limits
  dailyLossLimitAmount: number;          // absolute $ limit for the day
  dailyLossLimitPercent: number;         // % limit (e.g. 4.0)
  dailyLossUsedAmount: number;           // $ drawn down today
  dailyLossUsedPercent: number;          // % drawn down today
  dailyLossRemainingAmount: number;      // $ left before breach
  dailyLossRemainingPercent: number;     // % left before breach

  // Max total loss limits
  maxLossLimitAmount: number;
  maxLossLimitPercent: number;
  maxLossUsedAmount: number;
  maxLossRemainingAmount: number;

  // Trade limits
  tradesTakenToday: number;
  maxTradesPerDay: number;
  riskPerTradePercent: number;

  // Violations
  violations: Array<{
    rule: string;
    description: string;
    triggeredAt: string;  // ISO timestamp
  }>;
}
```

**OperationalStatus values:**

| Value | Meaning |
|-------|---------|
| `TRADING_ALLOWED` | All rules pass |
| `WATCH_ONLY` | Account is in monitoring mode |
| `BLOCKED_DAILY_DRAWDOWN` | Daily DD limit reached |
| `BLOCKED_MAX_DRAWDOWN` | Max DD limit reached |
| `BLOCKED_NEWS` | News event blackout active |
| `BLOCKED_MAX_TRADES` | Trade count cap hit |
| `BLOCKED_CONSISTENCY` | Consistency rule violated |
| `BLOCKED_PSYCHOLOGY` | Pre-flight checklist not done |
| `BRIDGE_DISCONNECTED` | MT5 terminal offline |
| `NO_APPROVED_PARAMETER_SET` | No approved backtest for this symbol |

**Future source:** `GET /api/accounts/:accountId/risk` — computed by the Python risk engine on every tick.

---

## AccountPropFirmState (`propfirm.ts`)

```typescript
interface AccountPropFirmState {
  accountId: string;
  firmName: string;           // 'The5ers'
  programName: string;        // 'The5ers 100k Challenge'
  challengePhase: string;     // 'Phase 1'
  accountSize: number;        // 100000
  status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

  // Profit target
  profitTargetAmount: number;   // 8000
  profitTargetPercent: number;  // 8.0
  profitAchievedAmount: number; // 3250.40
  profitAchievedPercent: number;// 3.25

  // Drawdown rules (thresholds, not current usage — current usage is in risk state)
  dailyDrawdownRule: number;   // 4.0 (%)
  maxDrawdownRule: number;     // 8.0 (%)

  // Consistency rule
  consistencyEnabled: boolean;
  bestDayProfit: number;
  totalProfitForPhase: number;
  consistencyStatus: 'COMPLIANT' | 'AT_RISK' | 'VIOLATED';

  // Trading days
  minimumTradingDaysRequired: number;
  currentTradingDays: number;
  profitableDaysRequired: number;
  currentProfitableDays: number;

  // News trading
  newsTradingAllowed: boolean;
  blackoutBeforeMinutes: number;
  blackoutAfterMinutes: number;

  warnings: string[];
}
```

**Future source:** `GET /api/accounts/:accountId/prop-firm` — evaluated by the rules engine using the active `RulesProfile`.

---

## BridgeTerminal (`bridgeStatus.ts`)

One entry per MT5 terminal (one per account in the mock).

```typescript
interface BridgeTerminal {
  terminalId: string;      // 'TERMINAL_THE5ERS_A'
  accountId: string;
  brokerName: string;
  accountLogin: number;
  accountServer: string;
  state: BridgeState;      // BRIDGE_OK | BRIDGE_STALE | BRIDGE_DOWN | MT5_DISCONNECTED
  lastUpdate: string;      // ISO timestamp of last received tick
  staleSince: string | null;

  symbolTicks: Array<{
    symbol: string;        // canonical symbol name
    lastTick: string;      // ISO timestamp
    freshness: 'FRESH' | 'STALE' | 'MISSING';
  }>;

  connectionLog: Array<{
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
  }>;
}
```

**Future source:** `GET /api/accounts/:accountId/bridge` + WebSocket `ws://…/bridge/:terminalId` for live updates.

---

## JournalTrade (`journal.ts`)

```typescript
interface JournalTrade {
  id: string;
  accountId: string;
  accountDisplayName: string;
  date: string;                 // ISO timestamp
  symbol: string;               // canonical
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  pnlUsd: number;
  pnlPct: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  resultR: number;              // e.g. +2.1R or -1.0R
  riskRewardRatio: number;      // planned R:R ratio
  emotionalState: 'CALM' | 'RUSHED' | 'FEARFUL' | 'CONFIDENT' | 'IMPULSIVE';
  isImpulseTrade: boolean;
  ruleCompliance: 'COMPLIANT' | 'MINOR_DEVIATION' | 'MAJOR_DEVIATION';
  notes: string;
  zoneId: string | null;
  parameterSetId: string | null;
}
```

**Future source:** `GET /api/accounts/:accountId/journal` — imported from MT5 trade history, enriched with zone references and user-entered notes/compliance.

---

## Alert (`alerts.ts`)

```typescript
interface Alert {
  id: string;
  accountId: string | null;     // null = global (not account-specific)
  accountDisplayName: string | null;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: string;               // 'BRIDGE' | 'RISK_GUARD' | 'ZONE_SCANNER' | 'PROP_FIRM'
  message: string;              // technical message
  simpleMessage: string;        // user-friendly plain English message
  acknowledged: boolean;
}
```

**Future source:** `GET /api/alerts?accountId=…` — pushed by the alert engine; stored in DB with ack state.

---

## BacktestParameterSet (`backtests.ts`)

```typescript
interface BacktestParameterSet {
  id: string;                   // 'PS_XAUUSD_H1_IFVG_V1'
  name: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  strategy_id: string;
  symbol: string;               // canonical
  timeframe: string;            // 'H1'
  dateRangeFrom: string;
  dateRangeTo: string;
  allowedAccountIds: string[];  // which accounts may use this parameter set

  // Results (null if PENDING)
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  netProfitPct: number;
  totalTrades: number;
  approvedAt: string | null;
  rejectedReason: string | null;

  trades: BacktestTrade[];      // sample trades for detail page
}
```

**Future source:** `GET /api/backtests` + `GET /api/backtests/:id/account-compatibility` — stored in DB, run against MT5 Strategy Tester results.

**Checkpoint 8 (core + UI copy):** `@workspace/mapazapp-core` defines a **separate** canonical backtest run/trade model and a **pure CSV text** importer skeleton for future TestEA-style rows. The dashboard may show an **advisory** “CP8 import eval” line from **fictional core fixtures** (`getCheckpoint8MockApprovalForParameterSet`) when the mock row’s `id` matches a fixture parameter set — this does **not** replace `mockBacktests` numbers, does **not** read uploaded files, and is **not** MT5 output.

---

## Zone (`zones.ts`)

```typescript
interface Zone {
  id: string;
  symbol: string;               // canonical
  direction: 'BUY' | 'SELL';
  state: ZoneState;             // CREATED | WATCHING | RETESTING | CONFIRMED | TRADE_READY | INVALIDATED | EXPIRED | USED
  score: number;                // 0–100
  ifvgType: string;             // 'FVG_BULLISH' | 'FVG_BEARISH' | 'ICT_OB_BULL' | ...
  zoneHigh: number;
  zoneLow: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  parameter_set_id: string;     // which backtest parameter set generated this zone
  createdAt: string;
  lastUpdatedAt: string;
  simpleDescription: string;    // plain English for Simple view
  notes: string;
}
```

**Future source:** `GET /api/zones?symbol=…` — detected by the Python IFVG scanner, scored in real time.

**Checkpoint 4 (dashboard only):** the same static `Zone` rows are **adapted in-process** (see `src/services/mapMockZoneToCore.ts` + `docs/IMPLEMENTATION_ASSUMPTIONS.md` §14) into **`TradePlanInput`** and passed to **`evaluateTradeReviewPlan`** so Home / Zones / Zone Detail can show **core-derived review status** (`TRADE_READY`, `WAIT_RETEST`, etc.) alongside mock fields. This does **not** change the mock schema, does **not** add real detection, and is **not** execution.

**Checkpoint 5:** the same **`TradePlanEvaluationResult`** is passed through **`buildTradeReviewExplanation`** (`src/services/tradeReviewExplanation.ts`) for **human-readable decision copy** (status titles, blockers, missing retest/confirmation, risk summary, technical reason list). Still **no** schema change to mock JSON; still **no** execution.

**Checkpoint 6:** mock risk/prop rows are mapped through **`evaluateAccountGuard`** in `@workspace/mapazapp-core` before **`evaluateTradeReviewPlan`**.

**Checkpoint 7:** mock zones carry **`strategy_id`** (e.g. **`MZP_IFVG_ZONE_REACTION_V1`**) and **`parameter_set_id`** aligned with **`createCheckpoint7MockParameterSetRegistry()`** in core. The dashboard data source evaluates **`evaluateParameterSetCompatibility`** per zone + account and feeds **`approvedParameterSetForAccount`** from **`allowTradeReview`** (not from `mockBacktests.status` alone). **`getAccountGuardEvaluation`** uses **`accountHasApprovedTradeReviewParameterSet`** for the headline “any trade-review-approved set for this account?” flag. Mock JSON remains static fiction; registry rows are explicitly **non-optimized** test doubles.

**Checkpoint 9:** routes **`/parameter-sets`** and **`/parameter-sets/:parameterSetId`** show the same **in-memory** registry rows (**read-only**): strategy metadata, parameter set status/approval, per-**`activeAccountId`** compatibility (**`allowTradeReview`** / block codes), compact **IFVG settings** from each set’s `settings` object, and checkpoint-8 **advisory** metrics when a fixture id exists. This is **UI inspection only** — no edits, no proof of live profitability, no MT5.

---

## PsychologyEntry (`psychology.ts`)

```typescript
interface PsychologyEntry {
  id: string;
  date: string;
  mood: 'GREAT' | 'GOOD' | 'NEUTRAL' | 'BAD' | 'TERRIBLE';
  preFlightCompleted: boolean;
  impulseTradeCount: number;
  notes: string;
  checklistItems: Array<{
    label: string;
    completed: boolean;
  }>;
}
```

**Future source:** `GET /api/psychology` — user-entered daily check-ins, stored in DB.
