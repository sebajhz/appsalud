# Cursor Handoff — Mapazapp Trading Guard Dashboard

**Repo layout:** planning specs = `00_START_HERE/` and `Mapazapp_Replit_Handoff_V1/` at repo root; this mock = `APP/artifacts/mapazapp/`. See `00_START_HERE/CURSOR_NAVIGATION_NOTE.md` for what to ignore (`mockup-sandbox`, `api-server`, `old/`, nested ZIPs).

This document gives Cursor (or any future developer) everything needed to continue building Mapazapp from where the Replit mock phase left off.

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
| IFVG zone detection algorithm | NOT IMPLEMENTED | Zone states are hardcoded |
| Zone score calculation | NOT IMPLEMENTED | Scores are static mock integers |
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
