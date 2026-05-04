# Implementation Decisions — Mapazapp

## D001: Dark theme only

**Decision:** Single dark theme. No light mode.

**Reason:** Trading dashboards are used in active market hours, often in low-light environments. Dark theme reduces eye strain and fits the terminal aesthetic appropriate for prop firm tools.

---

## D002: Wouter for routing (not React Router)

**Decision:** Use Wouter instead of React Router v6.

**Reason:** Wouter is lightweight, has a simpler API, and requires zero configuration for path-based routing in Vite. React Router adds unnecessary complexity for a dashboard that doesn't need nested loaders or server-side routing.

**Note:** Never wrap Wouter `<Link>` inside an `<a>` tag — Link renders its own anchor. The pattern is `<Link href="/path" className="...">text</Link>` directly.

---

## D003: Simple / Technical view toggle per page

**Decision:** Each page that has technically rich data exposes a Simple / Technical toggle in the topbar.

**Reason:** This dashboard serves two audiences:
1. The trader (non-technical): needs clear, actionable summaries in plain English
2. The developer/debugger: needs to see raw field names, values, and data structure

The toggle is stored in `ViewContext` (Layout.tsx) and is per-session only (no persistence). Pages that use it destructure `isTechnical` from `useViewMode()`.

---

## D004: Multi-account from day one

**Decision:** Every entity in the system is scoped to an `accountId` from the start of the mock phase.

**Reason:** Real traders run multiple prop firm accounts simultaneously (e.g., one The5ers account and one PropXP account). A single-account architecture would require a ground-up rewrite when multi-account is needed. By making all mock data account-keyed now, the frontend is ready for a multi-account backend without structural changes.

**Implementation:**
- `mockConfig.accounts[]` is the account registry
- `AccountContext` in `Layout.tsx` manages `activeAccountId` via React state
- All pages use `useActiveAccount()` and look up `mockRiskByAccount[activeAccountId]`, etc.
- Journal entries, alerts, and bridge terminals each carry an `accountId` field

---

## D005: OperationalStatus as single trading gate

**Decision:** Introduce `OperationalStatus` (10 values) as the authoritative signal for whether trading is allowed on an account.

**Reason:** The original `RiskState: 'OK' | 'WARNING' | 'BLOCKED'` was too coarse to distinguish between different block reasons. The UI needs to show *why* trading is blocked (daily DD vs. news vs. bridge disconnected vs. no approved parameter set). A single enum makes this explicit and machine-readable.

**Values:** `TRADING_ALLOWED`, `WATCH_ONLY`, `BLOCKED_DAILY_DRAWDOWN`, `BLOCKED_MAX_DRAWDOWN`, `BLOCKED_NEWS`, `BLOCKED_MAX_TRADES`, `BLOCKED_CONSISTENCY`, `BLOCKED_PSYCHOLOGY`, `BRIDGE_DISCONNECTED`, `NO_APPROVED_PARAMETER_SET`.

---

## D006: Risk amounts stored in both $ and %

**Decision:** `AccountRiskGuardState` stores daily and max drawdown in both absolute dollar amounts and percentages (used, remaining, limit for each).

**Reason:** Prop firm rules are stated in percentages, but traders think in dollars. Showing both eliminates the need for the frontend to divide or multiply — all values are pre-computed. This also avoids floating-point UI bugs when calculating live.

---

## D007: Profit Target stored as amount and percent

**Decision:** `AccountPropFirmState` stores `profitTargetAmount`, `profitTargetPercent`, `profitAchievedAmount`, `profitAchievedPercent` — all four values explicit.

**Reason:** Same reasoning as D006. Prop firm rules quote profit targets as percentages (e.g., 8%). Traders track progress in dollars. Both are shown on the Prop Firm Guard page. Storing both avoids runtime division and potential precision errors.

---

## D008: Symbol mapping as explicit config

**Decision:** A `symbolMappings[]` array in `mockConfig` maps `canonicalSymbol → brokerSymbol` per account.

**Reason:** Different brokers suffix their symbols (e.g., `XAUUSD` at The5ers vs. `XAUUSDm` at PropXP). The system uses canonical symbols (XAUUSD, EURUSD, etc.) throughout zones, journal, and backtests. Only at the MT5 interface layer (BridgeEA order sending, tick subscription) does the canonical name get resolved to the broker-specific name. Explicit config is safer than string manipulation heuristics.

---

## D009: Journal has resultR and ruleCompliance fields

**Decision:** `JournalTrade` includes `resultR: number` (e.g., +2.1R) and `ruleCompliance: 'COMPLIANT' | 'MINOR_DEVIATION' | 'MAJOR_DEVIATION'`.

**Reason:**
- `resultR` measures how many R multiples were gained or lost. It normalises P&L across different position sizes and is the standard measure used in prop firm edge analysis.
- `ruleCompliance` is a self-assessment field. Traders log whether they followed their system rules. Systematic deviation tracking helps identify psychology-driven losses vs. system losses.

---

## D010: Alerts have accountId with null for global alerts

**Decision:** `Alert.accountId` is `string | null`. Null = global (system-wide, not account-specific).

**Reason:** Some alerts are account-scoped (risk guard blocked, bridge disconnected for account X), while others are system-wide (news blackout affecting all accounts, zone scanner restart). Null is explicit and avoids a separate `scope` field.

---

## D011: BacktestParameterSet has allowedAccountIds[]

**Decision:** Each `BacktestParameterSet` carries an `allowedAccountIds[]` array specifying which accounts are permitted to use that parameter set.

**Reason:** A parameter set might be backtested and approved on The5ers (which allows hedging and specific symbol suffixes) but not approved for PropXP (which uses different symbol specs or has tighter drawdown rules). The allowed accounts list is explicit rather than derived at runtime.

---

## D012: BridgeTerminal is one entity per account

**Decision:** `BridgeTerminal` is separate from `AccountConfig`. Each account has its own terminal entry in `mockBridgeTerminals[]`.

**Reason:** In the real system, each MT5 terminal runs independently on its own machine or VPS. Two accounts at different brokers will have different bridge states, different symbol ticks, and different connection logs. Keeping them separate in the data model reflects the real infrastructure.

---

## D013: SimpleMessage vs. Message on Alert

**Decision:** `Alert` has both `message` (technical) and `simpleMessage` (plain English).

**Reason:** The Simple/Technical view toggle (D003) applies to alerts too. Technical users want to see the raw alert message (e.g., `BRIDGE_STALE: last tick 45s ago, threshold 30s`). Non-technical users want a human-readable explanation. Storing both at the data level avoids runtime string parsing or conditional logic in the UI.
