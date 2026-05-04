# Cursor Handoff — Mapazapp Trading Guard Dashboard

**Repo layout:** planning specs = `00_START_HERE/` and `Mapazapp_Replit_Handoff_V1/` at repo root; this mock = `APP/artifacts/mapazapp/`. See `00_START_HERE/CURSOR_NAVIGATION_NOTE.md` for what to ignore (`mockup-sandbox`, `api-server`, `old/`, nested ZIPs).

**Before implementing strategy, MT5 bridge, scanner, backtesting or risk calculations, read the Symbol Precision / Tick / Pip Normalization addendum:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`.

**Before implementing the strategy engine, TestEA, scanner or risk-aware trade-ready logic, read Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md`.

**Before starting a new implementation checkpoint, read** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`.

This document gives Cursor (or any future developer) everything needed to continue building Mapazapp from where the Replit mock phase left off.

---

## Shared core package (`@workspace/mapazapp-core`)

- **Location:** `APP/lib/mapazapp-core/`
- **Purpose:** Pure TypeScript — symbol normalization, zone/risk primitives, IFVG **lifecycle** skeleton, **checkpoint 2** strategy detection, and **checkpoint 3** **trade review plan** evaluation (`evaluateTradeReviewPlan`). **No** React, HTTP, MT5, DB, WebSocket, order execution, or live scanner.
- **Tests:** from `APP/` run `pnpm --filter @workspace/mapazapp-core test` and `pnpm --filter @workspace/mapazapp-core typecheck`. Strategy coverage in `tests/checkpoint2-strategy.test.ts`; trade plan coverage in `tests/checkpoint3-trade-plan.test.ts` (synthetic inputs only).
- **Test fixtures:** documented in `docs/IMPLEMENTATION_ASSUMPTIONS.md` (not broker truth).

### Strategy detection modules (checkpoint 2)

| Module | Role |
|--------|------|
| `src/candle.ts` | Normalized `Candle` (OHLC + optional volume/spread/isClosed). |
| `src/atr.ts` | True range + Wilder ATR series / last ATR. |
| `src/swing-detector.ts` | Swing high/low with configurable left/right bars + confirmation index. |
| `src/liquidity-sweep.ts` | Lower-pool / upper-pool sweep with dynamic tolerances (`normalize` helpers). |
| `src/displacement.ts` | Bullish/bearish displacement vs ATR + close position. |
| `src/fvg-detector.ts` | 3-candle FVG + ATR size filter. |
| `src/ifvg-converter.ts` | FVG → IFVG with dynamic break buffer + close/wick mode. |
| `src/zone-candidate.ts` | Padded zone from IFVG + tick rounding; initial state `WAIT_RETEST` / `OBSERVE` only. |
| `src/retest-detector.ts` | `full_zone` / `midpoint` / `edge` retest. |
| `src/confirmation-detector.ts` | Post-retest confirmation + optional wick rule. |
| `src/strategy-settings.ts` | Grouped `IfvgStrategySettings` + `createDefaultIfvgStrategySettingsForTests()`. |
| `src/strategy-score.ts` | Blueprint §17 weighted score + hard-gate cap. |
| `src/strategy-detection.ts` | `detectIfvgZoneCandidates` pipeline (single-series assumption; see assumptions doc). |
| `src/no-trade-reason.ts` | Pipeline warning string union (complements hard-gate codes in `risk-primitives`). |

### Trade review plan (checkpoint 3)

| Module | Role |
|--------|------|
| `src/trade-plan-types.ts` | `TradeReviewPlan`, `TradePlanInput`, `TradePlanStatus` / `TradePlanAction`, guard + evaluation result types. |
| `src/trade-plan-settings.ts` | `TradePlanEvaluationSettings` + **`createDefaultTradePlanEvaluationSettingsForTests()`** (non-optimized defaults). |
| `src/trade-plan-reasons.ts` | Stable **`TradePlanReasonCode`** values + `tradePlanReason()` helper text. |
| `src/trade-plan-targets.ts` | SL buffer (`slBufferPrice`), **`fixed_R`** TP, entry band, **`computeTradePlanRiskMetrics`** (risk/reward/R:R, distances in price / point / ticks). |
| `src/trade-plan-gates.ts` | `collectTradePlanHardGateFailures` + `scoreBlocksTradeReady` — account/spread/parameter-set/R:R/SL-width gates (subset of blueprint H1–H8 style). |
| `src/trade-plan-evaluator.ts` | **`evaluateTradeReviewPlan`** — lifecycle precedence (USED / EXPIRED / INVALIDATED → retest → confirmation → gates → score → near-sweep rule → `TRADE_READY`). |

**Consumption:** future UI or backend calls **`evaluateTradeReviewPlan`** with a **`ZoneCandidate`** from `detectIfvgZoneCandidates` (or persisted mirror), merges **account/risk snapshot** into `accountGuard`, passes **score** from `computeStrategyScore`, and surfaces **`plan.simpleSummary`**, **`plan.status`**, and **`plan.reasons`** / **`plan.noTradeReasons`** — still **no order placement**, no BridgeEA, no WebSocket.

## In-process service layer (`src/services/`)

- **Checkpoint 1:** `AccountDataSource` + `createMockAccountDataSource()` — reads existing `src/mock/` data, requires `accountId`, **no** `fetch`, no Express.
- **Checkpoint 4:** `DashboardMockDataSource` (`tradeReviewDataSource.ts` + `mockTradeReviewDataSource.ts`) — **`createMockDashboardDataSource()`** exposes **`getZonesForAccount`**, **`getTradeReviewPlansForAccount`**, **`getTradeReviewPlanByZoneId`**, **`getAlertsForAccount`**, and **`getAccountSnapshot`** (delegates to checkpoint 1). Mock zones are mapped through **`mapMockZoneToCore.ts`**, risk through **`mapMockRiskToTradePlanGuard.ts`**, symbols through **`mockSymbolProfiles.ts`**, then **`evaluateTradeReviewPlan`** from `@workspace/mapazapp-core`. **No** backend, MT5, execution, WebSocket, or DB.
- **UI wiring:** `HomePage` (review-ready strip + banner counts), `ZonesPage` (core status badge + reason line), and `ZoneDetailPage` (core review block + technical fields) consume the dashboard data source. Other pages still use mock imports directly where unchanged.
- **Copy / UX:** “Review-ready”, “manual review only”, and **`TradeReviewStatusBadge`** reinforce that **`TRADE_READY`** is **not** an order signal.

### Trade review explanation layer (checkpoint 5)

| Module / component | Role |
|--------------------|------|
| `src/services/tradeReviewExplanation.ts` | Pure **`buildTradeReviewExplanation(evaluation)`** — maps `TradePlanEvaluationResult` → **`TradeReviewExplanation`** (titles, “what it means”, missing items, blocking/positive reasons, **`technicalReasons`** for audit, **`manualReviewOnly: true`**). **`mapReasonCode`** maps stable **`TradePlanReasonCode`** / hard-gate strings → user + technical copy, severity, category; unknown codes → simple “Review required.”, technical = raw code. |
| `src/services/tradeReviewUi.ts` | Thin helpers: **`primaryReviewMessage`** / **`simpleLanguageForReviewStatus`** delegate to the explanation layer where useful. |
| `src/components/TradeReviewExplanationCard.tsx` | Simple-mode decision panel (no reason-code table — that stays in Technical). |
| `src/components/ReasonCodeList.tsx` | Technical list: code, category, technical line. |
| **Pages** | **`HomePage`**: review-ready strip uses explanation summary + “Manual review only” + up to two reason lines. **`ZonesPage`**: short review line + missing/blocked hints. **`ZoneDetailPage`**: full explanation card (Simple) + **`ReasonCodeList`** + enriched **`core_trade_review`** rows (plan `strategyId` / `parameterSetId` / `canonicalSymbol` / `accountId`, SL/TP/R:R, hard gates). |

**Contract:** a future backend may return **`TradeReviewPlan`** / evaluation DTOs unchanged; the frontend (or another client) can still run **`buildTradeReviewExplanation`** for consistent copy. **No** execution, MT5, WebSocket, or DB.

### Account / risk guard core (checkpoint 6)

| Module | Role |
|--------|------|
| `account-guard-types.ts` | **`AccountGuardInput`**, **`AccountGuardResult`**, **`AccountGuardStatus`**, **`AccountGuardReasonCode`**, **`AccountRiskSnapshot`**, **`PropFirmRuleSnapshot`**, **`AccountGuardSettings`**, **`AccountTradePermission`**, metrics. |
| `account-guard-settings.ts` | **`createDefaultAccountGuardSettingsForTests()`** — dev defaults only. |
| `account-guard-reasons.ts` | Stable **`AccountGuardReason`** text factory. |
| `account-guard-evaluator.ts` | **`evaluateAccountGuard`**, **`accountGuardResultToTradePlanAccountGuardInput`**. |
| `trade-plan-gates.ts` | Conditional operational hard gate: watch-only / news / bridge respect **`TradePlanEvaluationSettings`** alignment flags. |
| Mock | **`mapMockRiskToTradePlanGuard`** → core guard → **`TradePlanAccountGuardInput`**; **`getAccountGuardEvaluation`** on dashboard data source. |

**Separation:** account guard answers **whether the account may participate in trade review**; trade plan evaluator answers **whether a zone candidate passes lifecycle + score + R:R + spread gates** for **`TRADE_READY`**. Both must pass for **`TRADE_READY`** (account guard still flows through **`TradePlanAccountGuardInput`**).

## What remains mock-only (dashboard + integration)

- **Live** IFVG scanner, MT5 bridge, WebSocket, DB, order execution, real Strategy Tester / backtest wiring — unchanged. Core now contains **offline** detection math only; the UI still uses `src/mock/` zones. See **What Is NOT Implemented** below.

---

## What This Is

Mapazapp is a **trading intelligence and risk management dashboard** for disciplined prop firm traders. It is built as a visual mock: 12 pages, realistic UI, complete data model — but **zero real logic**.

**Multi-account and multi-broker by design.** Every record in the system is scoped to an `accountId`. This was established from day one so the real backend can be account-aware from the start.

---

## What Is NOT Implemented

| Item | Status | Notes |
|------|--------|-------|
| MT5 terminal connection | NOT IMPLEMENTED | No MQL5, no terminal API |
| BridgeEA (Expert Advisor) | NOT IMPLEMENTED | No MQL5, no DLL |
| Real tick data | NOT IMPLEMENTED | All timestamps are `Date.now()` offsets |
| IFVG zone detection in **UI / API** | NOT IMPLEMENTED | Dashboard zones still mock; core has **offline** `detectIfvgZoneCandidates` for tests/future wiring |
| Zone score in **UI** | NOT IMPLEMENTED | Page scores remain mock integers; core has `computeStrategyScore` for future integration |
| Risk Guard rule evaluation | NOT IMPLEMENTED | Risk states are static mock objects |
| Prop Firm Guard enforcement | NOT IMPLEMENTED | Prop firm state is static mock |
| Multi-account backend | NOT IMPLEMENTED | Account switching is React useState only |
| Multi-terminal MT5 bridge | NOT IMPLEMENTED | Bridge terminals are mock arrays |
| Backtest / Strategy Tester | NOT IMPLEMENTED | Stats are hardcoded |
| Journal import from MT5 | NOT IMPLEMENTED | Journal entries are hardcoded |
| Real alert engine | NOT IMPLEMENTED | Alerts are hardcoded arrays |
| Alert persistence | NOT IMPLEMENTED | Acknowledge state is React useState only |
| Order execution | NOT IMPLEMENTED | No execution of any kind |
| Python backend | NOT IMPLEMENTED | No server exists |
| Database | NOT IMPLEMENTED | No persistence |
| Authentication | NOT IMPLEMENTED | No auth |
| WebSockets | NOT IMPLEMENTED | No live data |

---

## Multi-Account Architecture

### Core principle
Every entity in the system has an `accountId`. Risk state, prop firm guard, journal entries, alerts, bridge terminals, and backtest compatibility are all account-scoped.

### Account selector
- The topbar has a `<select>` dropdown populated from `mockConfig.accounts[]`
- Selecting an account calls `setActiveAccountId()` from `AccountContext` in `Layout.tsx`
- All pages use `useActiveAccount()` to get `activeAccountId` and look up account-specific mock data

### Account-scoped mock data pattern
```typescript
// config.ts — source of truth
accounts: [
  { accountId: 'ACC_THE5ERS_100K_PHASE1_A', ... },
  { accountId: 'ACC_PROPXP_50K_PHASE1', ... },
]
activeAccountId: 'ACC_THE5ERS_100K_PHASE1_A'

// risk.ts — account-keyed record
export const mockRiskByAccount: Record<string, AccountRiskGuardState> = {
  ACC_THE5ERS_100K_PHASE1_A: { ... },
  ACC_PROPXP_50K_PHASE1: { ... },
}

// Usage in any page
const { activeAccountId } = useActiveAccount();
const risk = mockRiskByAccount[activeAccountId];
```

---

## File Map

### Mock data (`src/mock/`)

| File | Contents |
|------|----------|
| `config.ts` | `mockConfig`: `accounts[]`, `activeAccountId`, `riskProfiles[]`, `rulesProfiles[]`, `symbolMappings[]`, `notifications`, `zoneScoring` |
| `types.ts` | All TypeScript interfaces: `AccountConfig`, `RiskProfile`, `RulesProfile`, `SymbolMapping`, `BridgeTerminal`, `AccountRiskGuardState`, `AccountPropFirmState`, `AccountSnapshot`, `Zone`, `BacktestParameterSet`, `JournalTrade`, `Alert`, `PsychologyEntry`, `OperationalStatus`, etc. |
| `account.ts` | `mockAccountSnapshots: Record<string, AccountSnapshot>` — balance, equity, daily P&L, drawdown per account. Legacy `mockAccount` re-exported. |
| `risk.ts` | `mockRiskByAccount: Record<string, AccountRiskGuardState>` — full account-scoped risk state with daily/max DD amounts and percentages. Legacy `mockRiskState` re-exported. |
| `propfirm.ts` | `mockPropFirmByAccount: Record<string, AccountPropFirmState>` — profit targets, drawdown rules, consistency, trading days per account. Legacy `mockPropFirmState` re-exported. |
| `journal.ts` | `mockJournalTrades: JournalTrade[]` — each entry has `accountId`, `accountDisplayName`, `resultR`, `ruleCompliance` |
| `alerts.ts` | `mockAlerts: Alert[]` — each alert has `accountId` (null for global) and `accountDisplayName` |
| `backtests.ts` | `mockBacktests: BacktestParameterSet[]` — each has `allowedAccountIds[]` |
| `bridgeStatus.ts` | `mockBridgeTerminals: BridgeTerminal[]` — one terminal per account. Legacy `mockBridgeStatus` re-exported. |
| `zones.ts` | `mockZones: Zone[]` — symbol-scoped (not account-scoped in mock) |
| `psychology.ts` | `mockPsychologyEntries: PsychologyEntry[]` |

### Components (`src/components/`)

| File | Key exports |
|------|-------------|
| `Layout.tsx` | `Layout`, `useViewMode()`, `useActiveAccount()`, `AccountContext`, `ViewContext` |
| `Sidebar.tsx` | `Sidebar` — shows active account context below logo (name, firm, mode, MT5 login) |
| `StatusBadge.tsx` | `ZoneStateBadge`, `BridgeStateBadge`, `RiskStateBadge`, `OperationalStatusBadge`, `BacktestStatusBadge`, `AlertSeverityBadge`, `DirectionBadge` |

### Pages (`src/pages/`)

| File | Route | Key features |
|------|-------|--------------|
| `HomePage.tsx` | `/` | Account-aware snapshot, risk status, bridge state, trade-ready zones, recent alerts |
| `ZonesPage.tsx` | `/zones` | Zone list with state/score filter |
| `ZoneDetailPage.tsx` | `/zones/:id` | Full zone detail |
| `RiskPage.tsx` | `/risk` | Account-scoped: daily/max DD in $ and %, trades, violations, `operationalStatus` |
| `PropFirmPage.tsx` | `/propfirm` | Account-scoped: profit target, drawdown rules, consistency, news trading |
| `BacktestsPage.tsx` | `/backtests` | Parameter set list with active-account compatibility column |
| `BacktestDetailPage.tsx` | `/backtests/:id` | Stats, equity curve mock, sample trades |
| `JournalPage.tsx` | `/journal` | Account filter, account column, resultR, ruleCompliance |
| `PsychologyPage.tsx` | `/psychology` | Mood tracker, checklist, impulse trades |
| `AlertsPage.tsx` | `/alerts` | Account-tagged + global alerts, filter, acknowledge |
| `ConfigPage.tsx` | `/config` | Accounts, risk profiles, rules profiles, symbol mapping, notifications, zone scoring |
| `BridgePage.tsx` | `/bridge` | Multi-terminal grid + detail per terminal (ticks, log) |

---

## OperationalStatus Values

`AccountRiskGuardState.operationalStatus` is the primary gate for all trading decisions:

| Value | Meaning |
|-------|---------|
| `TRADING_ALLOWED` | All rules pass — trading is permitted |
| `WATCH_ONLY` | Account is in monitoring mode — no trading |
| `BLOCKED_DAILY_DRAWDOWN` | Daily drawdown limit reached |
| `BLOCKED_MAX_DRAWDOWN` | Max drawdown limit reached |
| `BLOCKED_NEWS` | High-impact news event blackout active |
| `BLOCKED_MAX_TRADES` | Max trades per day reached |
| `BLOCKED_CONSISTENCY` | Consistency rule violation detected |
| `BLOCKED_PSYCHOLOGY` | Pre-flight checklist not completed |
| `BRIDGE_DISCONNECTED` | MT5 terminal is offline |
| `NO_APPROVED_PARAMETER_SET` | No approved backtest for this symbol |

---

## Symbol Mapping

Different brokers name the same instrument differently:

| Canonical | The5ers MT5 | PropXP MT5 |
|-----------|-------------|------------|
| XAUUSD | XAUUSD | XAUUSDm |
| EURUSD | EURUSD | EURUSDm |
| GBPUSD | GBPUSD | GBPUSDm |

`mockConfig.symbolMappings[]` maps `canonicalSymbol → brokerSymbol` per `accountId`. Cursor must implement broker symbol resolution when sending orders or subscribing to tick data.

---

## How to Continue — Step-by-Step Plan

### Step 1: Python backend foundation
- Implement `GET /api/accounts` returning the account registry
- Implement `GET /api/accounts/:accountId/summary` returning balance/equity/dailyPnL
- Implement `GET /api/accounts/:accountId/risk` returning `AccountRiskGuardState`
- Implement `GET /api/accounts/:accountId/prop-firm` returning `AccountPropFirmState`

### Step 2: Replace mock imports with API calls
- Replace `mockRiskByAccount[activeAccountId]` with React Query: `useQuery(['risk', activeAccountId], fetchRisk)`
- Replace `mockAccountSnapshots[activeAccountId]` with account summary API call
- Replace `mockPropFirmByAccount[activeAccountId]` with prop firm API call
- Keep mock files as test fixtures and dev fallbacks

### Step 3: MT5 BridgeEA + WebSocket
- Implement MQL5 BridgeEA that pushes tick data + account state to the Python backend
- Add WebSocket endpoint: `ws://…/api/ws/accounts/:accountId/bridge`
- Update `BridgePage.tsx` to subscribe to live terminal state

### Step 4: Real Zone Scanner (IFVG algorithm)
- Implement IFVG detection in Python using historical and live tick data
- Replace `mockZones` with `GET /api/accounts/:accountId/zones`
- Replace zone scores (currently static integers) with real scoring algorithm output

### Step 5: Real Risk Guard
- Implement rule evaluation engine in Python
- Evaluate `operationalStatus` on every tick using account state + prop firm rules
- Push updates via WebSocket to Risk Guard page

---

## Future API Endpoints (Account-Aware)

```
GET  /api/accounts
POST /api/accounts
GET  /api/accounts/:accountId/summary
GET  /api/accounts/:accountId/risk
GET  /api/accounts/:accountId/prop-firm
GET  /api/accounts/:accountId/journal
POST /api/accounts/:accountId/journal
GET  /api/accounts/:accountId/alerts
POST /api/accounts/:accountId/alerts/:alertId/acknowledge
GET  /api/accounts/:accountId/bridge
GET  /api/accounts/:accountId/positions
GET  /api/accounts/:accountId/zones
GET  /api/backtests
GET  /api/backtests/:parameterSetId
GET  /api/backtests/:parameterSetId/account-compatibility
GET  /api/psychology
POST /api/psychology
```

---

## Critical Rules for Cursor

1. **Never assume a single account.** Every query, mutation, and display must be scoped to an `accountId`.
2. **Do not break the account context pattern.** Pages use `useActiveAccount()` from `Layout.tsx` — preserve this hook.
3. **Keep `OperationalStatus` as the gate.** The Risk Guard's `operationalStatus` is the primary trading permission signal.
4. **Symbol mapping is required.** When sending orders or subscribing to data, resolve `canonicalSymbol → brokerSymbol` for the active account's broker.
5. **Mock files are fixtures, not dead code.** When replacing mock imports with API calls, keep mock files for unit tests and dev fallbacks.
6. **Broker-neutral canonical symbols.** All zone detection, scoring, and journal records use canonical symbols. Only the MT5 interface layer resolves to broker-specific names.
