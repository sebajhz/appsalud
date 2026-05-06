# Mapazapp — Official Implementation Checkpoint Roadmap (V1)

**Document type:** product and engineering sequencing reference.  
**Scope:** aligns completed work (through repo checkpoint commits) with planned future checkpoints.  
**Related:** `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`, `Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md`.  
**Latest roadmap refresh:** checkpoint **15** closure — see **Document control** for revision history.

This roadmap is the **official checkpoint narrative** for Mapazapp. It exists to prevent scope drift: implement only what the active checkpoint describes, and respect the sequencing rules below.

---

## Current status (checkpoint 15)

### Completed

- **CP0** — Replit dashboard mock + handoff docs  
- **CP1** — `mapazapp-core` foundation  
- **CP2** — IFVG detection skeleton  
- **CP3** — `TradeReviewPlan`  
- **CP4** — Account-aware mock integration  
- **CP5** — Decision explanation UX  
- **CP6** — Account / risk guard  
- **CP7** — Parameter-set registry  
- **CP8** — Backtest model + CSV importer  
- **CP9** — Strategy / parameter-set read-only UI  
- **CP10** — Bridge file contract parsers  
- **CP11** — Read-only mock API server (`@workspace/api-server`)  
- **CP12** — Offline scanner simulation  
- **CP13** — BridgeEA export-only; real MT5 smoke passed  
- **CP13.1** — BridgeEA severity-aware diagnostics; real smoke passed  
- **CP14** — TestEA Strategy Tester virtual export; real tester smoke passed  
- **CP15** — Backtest evidence loop / manual approval proposal (advisory-only; no registry mutation)  

### Next

- **CP16** — Forward / Demo Monitor  

### Still not implemented (do not assume in production)

| Area | Notes |
|------|--------|
| **Database / domain persistence** | No SQLite or app-owned durable store for registry/evidence/trades. |
| **Real file watchers** | No daemon watching BridgeEA or Strategy Tester output folders. |
| **Live scanner daemon** | Offline simulation only; no live tick-fed scanner service. |
| **Real MT5 folder ingest into backend** | Parsers accept **in-memory** strings; no automated ingest from terminal paths. |
| **Registry mutation workflow** | No API or UI that writes approval state; humans apply registry updates elsewhere. |
| **Auto-approval** | Evidence may recommend; it does **not** approve parameter sets. |
| **Order execution** | No broker submission from Mapazapp. |
| **WebSocket live stream** | No push feed from markets or MT5. |
| **Assisted execution** | Future checkpoint **17+** only as contract/product gates allow. |

---

## 1. Completed checkpoints (0–15) — summary table

| ID | Name |
|----|------|
| **Checkpoint 0** | Replit dashboard mock + handoff docs |
| **Checkpoint 1** | `mapazapp-core` foundation, symbol normalization, risk/zone primitives |
| **Checkpoint 2** | IFVG detection skeleton |
| **Checkpoint 3** | `TradeReviewPlan` / risk-aware candidate evaluation |
| **Checkpoint 4** | Account-aware mock trade review integration |
| **Checkpoint 5** | Trade review explanation and decision UX |
| **Checkpoint 6** | Account / risk guard core alignment |
| **Checkpoint 7** | Parameter Set / Strategy Profile Registry |
| **Checkpoint 8** | Backtest result model & CSV importer skeleton |
| **Checkpoint 9** | Strategy settings / parameter-set read-only UI |
| **Checkpoint 10** | Bridge file contract reader skeleton |
| **Checkpoint 11** | Local read-only mock API foundation |
| **Checkpoint 12** | Scanner simulation from imported / fixture candles |
| **Checkpoint 13** | MT5 BridgeEA export-only |
| **Checkpoint 13.1** | BridgeEA severity-aware diagnostics |
| **Checkpoint 14** | MT5 TestEA / Strategy Tester virtual export |
| **Checkpoint 15** | Backtest evidence loop / manual approval proposal |

---

## 2. What each completed checkpoint delivered (detail 0–6)

Narratives for **checkpoints 7–15** are maintained in the codebase (e.g. `APP/artifacts/mapazapp/docs/IMPLEMENTATION_ASSUMPTIONS.md`, `CURSOR_HANDOFF.md`, MT5 artifact READMEs) and core/API packages — not duplicated here in full.

### Checkpoint 0 — Replit dashboard mock + handoff docs

- **Dashboard mock:** multi-page Vite + React application under `APP/artifacts/mapazapp/` with realistic UI, account context, and rich mock data (`src/mock/`) — **no** live markets, **no** backend, **no** execution.
- **Handoff package:** numbered specs under `Mapazapp_Replit_Handoff_V1/`, navigation and architecture notes under `00_START_HERE/`, and Cursor-oriented docs under `APP/artifacts/mapazapp/docs/` so future work starts from the same product contract.

### Checkpoint 1 — `mapazapp-core` foundation, symbol normalization, risk/zone primitives

- **Shared package:** `@workspace/mapazapp-core` (`APP/lib/mapazapp-core/`) as pure TypeScript — **no** React, HTTP, MT5, DB, WebSocket, or order execution.
- **Symbol normalization:** canonical vs broker symbol concepts aligned with handoff addendum intent (tick/pip/point discipline; no “universal pips” assumption at the type level).
- **Risk / zone primitives:** building blocks for zones, scoring inputs, and risk-related types used by later checkpoints.

### Checkpoint 2 — IFVG detection skeleton

- **Offline pipeline:** candle → swing → liquidity sweep → displacement → FVG → IFVG → zone candidate → retest → confirmation, with `IfvgStrategySettings`, blueprint-oriented scoring, and `detectIfvgZoneCandidates` (synthetic / test inputs; not a live scanner).
- **Tests:** strategy detection coverage (e.g. checkpoint 2 test module) documenting assumptions in implementation notes — **not** broker truth.

### Checkpoint 3 — `TradeReviewPlan` / risk-aware candidate evaluation

- **`evaluateTradeReviewPlan`:** lifecycle precedence, hard gates (spread, R:R, SL width, parameter-set hooks, etc.), score integration, and `TRADE_READY` semantics as **review readiness**, not an order signal.
- **Types and settings:** `TradeReviewPlan`, evaluation settings with explicit test defaults, stable reason codes, targets/risk metrics in price / point / ticks (symbol-aware units, not a single global “pip” model for all instruments).

### Checkpoint 4 — Account-aware mock trade review integration

- **Dashboard data source:** mock service layer maps mock zones, risk, and symbol profiles into core inputs and calls `evaluateTradeReviewPlan` per account (`accountId`-scoped queries).
- **UI surfaces:** key pages show core-derived review status and technical fields while other areas may still read mock directly where unchanged — **no** backend, MT5, WebSocket, DB, or execution.

### Checkpoint 5 — Trade review explanation and decision UX

- **Explanation layer:** pure `buildTradeReviewExplanation` (and related UI helpers) turning evaluation results into human-readable copy, technical reason lists, and explicit **manual review only** positioning.
- **Components:** simple decision panel + technical reason list; pages wired for consistent messaging that **`TRADE_READY` ≠ place a trade**.

### Checkpoint 6 — Account / risk guard core alignment

- **Account guard in core:** `evaluateAccountGuard` (and related types/settings/reasons) determining whether an account may participate in trade review under mock-aligned rules; bridge to `TradePlanAccountGuardInput`.
- **Trade plan gates:** operational alignment (watch-only, news, bridge disconnected, etc.) integrated with evaluation settings so account state and plan gates stay **conceptually separated** but both required for **`TRADE_READY`** where applicable.
- **Mock mapping:** risk / operational mock data flows through the guard before trade plan evaluation — still **no** live risk engine, **no** real bridge.

---

## 3. Historical note — “not implemented” snapshot (pre–CP7 era)

Earlier editions of this roadmap listed gaps relative to checkpoints **0–6** only. As of **checkpoint 15**, use **Current status → Still not implemented** above as the authoritative product-wide list.

---

## 4. Future checkpoints (16–18)

Short titles below; each checkpoint should have its own spec or addendum before coding starts.

| ID | Name | Intent (high level) |
|----|------|------------------------|
| **Checkpoint 16** | Forward / Demo Monitor | Forward or demo monitoring of signals/state — validation path before any execution talk. |
| **Checkpoint 17** | Assisted Execution Contract | Human-in-the-loop execution **contract** only (APIs, states, safeguards) — **no** blind automation. |
| **Checkpoint 18** | Assisted Execution Gated Future Phase | Any production-assisted execution ships only after explicit approval, forward/demo evidence, and regulatory/product gates — treated as a **separate** phase from 0–17. |

---

## 5. Sequencing rules (non-negotiable)

1. **Do not wire live MT5 ingest** before **Bridge file contract reader** (Checkpoint 10) and **symbol / account registry** (Checkpoint 7 and related handoff types) are **stable** and tested.
2. **Do not implement a live scanner** before **parameter sets** (Checkpoint 7) and the **backtest result model** (Checkpoint 8) exist — otherwise UI and gates have nothing trustworthy to bind to.
3. **Do not implement execution** before **forward/demo validation** (Checkpoint 16) and product sign-off on risk — execution is never the first proof of correctness.
4. **Do not use unapproved parameter sets for `TRADE_READY`.** Approval state must be explicit in data and in tests; mock “approval” must mirror the same rules as future persistence.
5. **Do not assume universal pips.** Use per-symbol tick/point/pip semantics per normalization addendum and core types; never hard-code one pip size for all instruments.
6. **Do not assume a single account.** All services, types, and UI flows remain **`accountId`-scoped** unless the doc explicitly defines a global exception (rare).
7. **Do not skip tests.** New checkpoints extend or add tests in `mapazapp-core` and/or the dashboard package as appropriate; CI expectations stay green.
8. **Do not add real trading features** (live orders, unattended automation, broker-side submission from Mapazapp) **without explicit approval** — documented gate, not an implicit “next sprint” item.

---

## 6. Recommended immediate next checkpoint

**Checkpoint 16 — Forward / Demo Monitor.**

Rationale: Backtest evidence (checkpoint 15) is advisory-only and stops before registry mutation; forward/demo observation is the next validation layer before any assisted execution conversation.

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| V1 | 2026-05-04 | Initial official checkpoint roadmap; aligns through commit `bb29545`. |
| V1.1 | 2026-05-05 | Checkpoint **15** closure — **Current status** section; completed **0–15**; future table **16–18**; stale “next CP7” recommendation removed. |
