# Mapazapp — Official Implementation Checkpoint Roadmap (V1)

**Document type:** product and engineering sequencing reference.  
**Scope:** aligns completed work (through repo checkpoint commits) with planned future checkpoints.  
**Related:** `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`, `Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md`.  
**Latest aligned commit (at authoring):** `bb29545` — feat(mapazapp-core): checkpoint 6 account risk guard alignment.

This roadmap is the **official checkpoint narrative** for Mapazapp. It exists to prevent scope drift: implement only what the active checkpoint describes, and respect the sequencing rules below.

---

## 1. Completed checkpoints (0–6)

| ID | Name |
|----|------|
| **Checkpoint 0** | Replit dashboard mock + handoff docs |
| **Checkpoint 1** | `mapazapp-core` foundation, symbol normalization, risk/zone primitives |
| **Checkpoint 2** | IFVG detection skeleton |
| **Checkpoint 3** | `TradeReviewPlan` / risk-aware candidate evaluation |
| **Checkpoint 4** | Account-aware mock trade review integration |
| **Checkpoint 5** | Trade review explanation and decision UX |
| **Checkpoint 6** | Account / risk guard core alignment |

---

## 2. What each completed checkpoint delivered

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

## 3. Explicitly not implemented (as of this roadmap)

The following remain **out of scope** for completed checkpoints 0–6 and must **not** be assumed to exist in production form:

| Area | Status |
|------|--------|
| Real MT5 integration | **Not implemented** |
| BridgeEA (real) | **Not implemented** |
| TestEA (real) | **Not implemented** |
| Backend Python (real services) | **Not implemented** |
| SQLite / domain persistence | **Not implemented** |
| WebSocket | **Not implemented** |
| Live scanner | **Not implemented** |
| Real market data | **Not implemented** |
| Real backtest import | **Not implemented** |
| Optimization loop | **Not implemented** |
| Order execution | **Not implemented** |
| Automated trading | **Not implemented** |

---

## 4. Proposed next checkpoints (7–18)

Short titles below; each future checkpoint should have its own spec or addendum before coding starts.

| ID | Name | Intent (high level) |
|----|------|------------------------|
| **Checkpoint 7** | Parameter Set / Strategy Profile Registry | Canonical registry for strategy IDs, parameter sets, approval state, and account/symbol compatibility — single source of truth before UI and gates depend on “approved” sets. |
| **Checkpoint 8** | Backtest Result Model & Importer Skeleton | Domain model for imported backtest results (metrics, run metadata, linkage to parameter sets); importer interfaces and validation **without** assuming live MT5. |
| **Checkpoint 9** | Strategy Settings / Parameter Set read-only UI | Dashboard surfaces to browse approved parameter sets and linked strategy settings **read-only** (no optimization, no execution). |
| **Checkpoint 10** | Bridge File Contract Reader Skeleton | Versioned contract for files the BridgeEA would produce/consume; parser/validator in TypeScript or backend stub **without** requiring a live terminal. |
| **Checkpoint 11** | Local Backend Foundation | Minimal local API (language per project decision) for health, config, and serving registry/read models — **no** full prop stack required on day one. |
| **Checkpoint 12** | Scanner Simulation from Imported Candles | Offline / batch scanner path using **imported** candles only — proves pipeline and UI integration **before** any live feed. |
| **Checkpoint 13** | MT5 BridgeEA export-only | Real EA writes bridge contract files / payloads **outbound only** — still **no** order execution from Mapazapp. |
| **Checkpoint 14** | MT5 TestEA / Strategy Tester Export | Export of tester-compatible inputs/outputs aligned with handoff TestEA specs; still not Mapazapp-driven live trading. |
| **Checkpoint 15** | Backtest Optimization Loop | Controlled optimization workflow per symbol/account rules — **after** backtest model and parameter registry are stable. |
| **Checkpoint 16** | Forward / Demo Monitor | Forward or demo monitoring of signals/state — validation path before any execution talk. |
| **Checkpoint 17** | Assisted Execution Contract | Human-in-the-loop execution **contract** only (APIs, states, safeguards) — **no** blind automation. |
| **Checkpoint 18** | Assisted Execution Gated Future Phase | Any production-assisted execution ships only after explicit approval, forward/demo evidence, and regulatory/product gates — treated as a **separate** phase from 0–17. |

---

## 5. Sequencing rules (non-negotiable)

1. **Do not implement MT5** before the **Bridge file contract reader** (Checkpoint 10) and **symbol / account registry** (Checkpoint 7 and related handoff types) are **stable** and tested.
2. **Do not implement a live scanner** before **parameter sets** (Checkpoint 7) and the **backtest result model** (Checkpoint 8) exist — otherwise UI and gates have nothing trustworthy to bind to.
3. **Do not implement execution** before **forward/demo validation** (Checkpoint 16) and product sign-off on risk — execution is never the first proof of correctness.
4. **Do not use unapproved parameter sets for `TRADE_READY`.** Approval state must be explicit in data and in tests; mock “approval” must mirror the same rules as future persistence.
5. **Do not assume universal pips.** Use per-symbol tick/point/pip semantics per normalization addendum and core types; never hard-code one pip size for all instruments.
6. **Do not assume a single account.** All services, types, and UI flows remain **`accountId`-scoped** unless the doc explicitly defines a global exception (rare).
7. **Do not skip tests.** New checkpoints extend or add tests in `mapazapp-core` and/or the dashboard package as appropriate; CI expectations stay green.
8. **Do not add real trading features** (live orders, unattended automation, broker-side submission from Mapazapp) **without explicit approval** — documented gate, not an implicit “next sprint” item.

---

## 6. Recommended immediate next checkpoint

**Checkpoint 7 — Parameter Set / Strategy Profile Registry.**

Rationale: Checkpoints 3–6 already reference parameter-set and account-aware gates in core and UI. Without a **first-class registry** (IDs, versioning, approval, compatibility matrices), later backtest import, scanner simulation, and MT5 export will each invent incompatible ad-hoc structures. Checkpoint 7 reduces that risk and keeps `TRADE_READY` semantics honest.

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| V1 | 2026-05-04 | Initial official checkpoint roadmap; aligns through commit `bb29545`. |
