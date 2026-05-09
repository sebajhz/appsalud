## Addendum V2-13

- Checkpoint: `V2-13 — Campaign Runner over Manual Datasets` (core only, texto en memoria).
- Orquestacion: `runManualDatasetCampaign` conecta import manual V2-11, validacion de export V2-12 y `runBacktestCampaign` (V2-10).
- Documentacion: `APP/artifacts/mapazapp/docs/V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`.
- Siguiente en plan maestro V2: **V2-14** (parameter set grid runner v1).

## Addendum V2-12

- Checkpoint: `V2-12 — Real Export Sample Validation from BridgeEA/TestEA` (core only, texto en memoria).
- Validacion de bundles saneados: BridgeEA (`parseBridgeStatusJson`, parsers CSV, `importManualCandleDataset` para velas) y TestEA (`importBacktestTradesFromCsv`, contrato `backtest_summary.json`).
- Documentacion: `APP/artifacts/mapazapp/docs/V2_12_REAL_EXPORT_SAMPLE_VALIDATION.md`.
- Consumo: pipeline V2-13 (`runManualDatasetCampaign`).

## Addendum V2-11

- Checkpoint: `V2-11 — Manual Candle Dataset Import / Replay Campaign Input` (core only).
- Importacion determinista de CSV de velas como texto (`importManualCandleDataset`) y adaptador a `BacktestCampaignDataset` (`createBacktestCampaignDatasetFromManualImport`).
- Documentacion: `APP/artifacts/mapazapp/docs/V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`.

## Addendum V2-10.5

- Plan maestro autoritativo para ejecucion Roadmap V2: `APP/artifacts/mapazapp/docs/ROADMAP_V2_MASTER_EXECUTION_PLAN.md`.
- Este addendum fija la secuencia operativa V2-11..V2-25 y mantiene enfoque engine-first con invariantes de seguridad.

## Addendum V2-10

- Checkpoint: `V2-10 — Symbol Ranking / Backtest Campaign Runner`.
- Scope kept in core only (pure TS logic).
- Provides campaign orchestration across symbols/datasets/parameter sets with conservative ranking and recommendation output.
- Keeps safety posture: no execution path, no registry mutation, no auto-approval.
- Uses synthetic fixtures for baseline behavior; real-data governance remains pending.
# Mapazapp — Official Implementation Checkpoint Roadmap (V1)

**Document type:** product and engineering sequencing reference.  
**Scope:** aligns completed work (through repo checkpoint commits) with planned future checkpoints.  
**Related:** `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`, `Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md`.  
**Latest roadmap refresh:** checkpoint **18** closure + **CP18.5 final audit/roadmap-v2 pointer** — see **Document control** for revision history.

**Before implementing CP18, read** `APP/artifacts/mapazapp/docs/CP18_SCOPE_FREEZE.md`. **CP18 implementation** adds safety/invariant hardening only — execution stays disabled; **CP19+** is required for any real execution decision.

**Before defining CP19+ scope, read** `APP/artifacts/mapazapp/docs/CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md`. CP18.5 concludes that engine/backtest proof is the immediate priority over execution plumbing.

**Roadmap V2 progress:** V2-01 completion/audit is documented at `APP/artifacts/mapazapp/docs/V2_01_ENGINE_REALITY_AUDIT.md` (fixtures + characterization tests; no execution changes).
**Roadmap V2 replay checkpoint:** V2-02 scope/results are documented at `APP/artifacts/mapazapp/docs/V2_02_CANDLE_REPLAY_TRADE_SIMULATOR.md` (deterministic candle replay lifecycle, MAE/MFE, no execution changes).
**Roadmap V2 entry/SL/TP checkpoint:** V2-03 scope/results are documented at `APP/artifacts/mapazapp/docs/V2_03_ENTRY_SL_TP_MODEL_V1.md` (replay-ready entry/SL/TP plan + R:R/timing v1, no execution changes).
**Roadmap V2 IFVG replay backtest checkpoint:** V2-04 scope/results are documented at `APP/artifacts/mapazapp/docs/V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md` (detection → plan → Entry/SL/TP → replay → summary in R, no execution changes).
**Roadmap V2-04.1:** Candidate bar timing metadata (`ZoneCandidate.candidateTiming` / `CandidateTimingMetadata`) and replay index resolution — same doc (`V2_04_…`) § anti-lookahead; core-only, no BridgeEA/TestEA changes.
**Roadmap V2-05:** Decision model / soft-score redesign — `APP/artifacts/mapazapp/docs/V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md`.
**Roadmap V2-06:** Human-like tolerance calibration matrix — `APP/artifacts/mapazapp/docs/V2_06_HUMAN_LIKE_TOLERANCE_CALIBRATION.md`.
**Roadmap V2-07:** HTF bias / context engine v1 — `APP/artifacts/mapazapp/docs/V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md`.
**Roadmap V2-08:** Entry variant model — `APP/artifacts/mapazapp/docs/V2_08_ENTRY_VARIANT_MODEL.md`.
**Roadmap V2-09:** Target / liquidity objective model v1 — `APP/artifacts/mapazapp/docs/V2_09_TARGET_LIQUIDITY_OBJECTIVE_MODEL.md` (Entry/SL/TP + decision model hooks; review-only).
**Roadmap V2-11:** Manual candle dataset CSV import — `APP/artifacts/mapazapp/docs/V2_11_MANUAL_CANDLE_DATASET_IMPORT.md` (`importManualCandleDataset`, campaign dataset adapter; in-memory CSV only).
**Roadmap V2-12:** Export sample validation — `APP/artifacts/mapazapp/docs/V2_12_REAL_EXPORT_SAMPLE_VALIDATION.md` (`validateExportSampleBundle`; sanitized bundles only).
**Roadmap V2-13:** Manual dataset campaign pipeline — `APP/artifacts/mapazapp/docs/V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md` (`runManualDatasetCampaign`; no live ingest).

This roadmap is the **official checkpoint narrative** for Mapazapp. It exists to prevent scope drift: implement only what the active checkpoint describes, and respect the sequencing rules below.

---

## Current status (checkpoint 18)

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
- **CP16** — Forward / demo monitor (snapshot-only mock; observational review discipline; no watcher / no DB / no WebSocket / no execution)  
- **CP17** — Assisted execution contract (typed gates + human confirmation model + audit DTO; no execution / no MT5 command path / no registry mutation)  
- **CP18** — Assisted execution safety hardening (`assisted-execution-invariants`, extended DTO flags, **`GET .../assisted-execution/safety`** + **`/invariants`**, dashboard UX; **still no** execution / **no** `POST` / **no** MT5 command path)  

### Next

- **CP19+** — Any **real** assisted execution or broker routing requires a **new** explicit checkpoint, approval, and scope — **not** implied by CP17–CP18.  

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
| **Assisted execution (live / MT5)** | **Not implemented** — checkpoints **17–18** define **contract + validation + safety invariants only**; any routed execution remains **CP19+** with explicit approval. |

---

## 1. Completed checkpoints (0–18) — summary table

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
| **Checkpoint 16** | Forward / demo monitor (mock snapshot observability) |
| **Checkpoint 17** | Assisted execution contract (validation model only; no execution) |
| **Checkpoint 18** | Assisted execution safety / invariant hardening (read-only; execution still disabled) |

---

## 2. What each completed checkpoint delivered (detail 0–6)

Narratives for **checkpoints 7–16** are maintained in the codebase (e.g. `APP/artifacts/mapazapp/docs/IMPLEMENTATION_ASSUMPTIONS.md`, `CURSOR_HANDOFF.md`, MT5 artifact READMEs) and core/API packages — not duplicated here in full.

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

Earlier editions of this roadmap listed gaps relative to checkpoints **0–6** only. As of **checkpoint 18**, use **Current status → Still not implemented** above as the authoritative product-wide list.

---

## 4. Future checkpoints (19+)

Short titles below; each checkpoint should have its own spec or addendum before coding starts.

| ID | Name | Intent (high level) |
|----|------|------------------------|
| **Checkpoint 19+** | (TBD — explicit approval required) | **Real** assisted execution or broker/MT5 routing, if ever approved — **separate** from CP17–CP18 contract/mock work; requires new scope doc, legal/risk gates, and operational controls. |

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

**After CP18:** do **not** extend Mapazapp into live execution without a **new** checkpoint (e.g. **CP19+**), product/legal sign-off, and a written scope. **CP17–CP18** remain **contract + mock validation + safety invariants only** — **`executionEnabled`** stays **false** everywhere in this lineage.

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| V1 | 2026-05-04 | Initial official checkpoint roadmap; aligns through commit `bb29545`. |
| V1.1 | 2026-05-05 | Checkpoint **15** closure — **Current status** section; completed **0–15**; future table **16–18**; stale “next CP7” recommendation removed. |
| V1.2 | 2026-05-05 | Checkpoint **16** closure — **Current status** completed through **CP16**; **Next** = CP17; summary table includes CP16; recommended next checkpoint updated. |
| V1.3 | 2026-05-05 | Checkpoint **17** closure — **Current status** completed through **CP17**; **Next** = CP18; summary table includes CP17; future table starts at CP18; sequencing note for CP18 explicit approval. |
| V1.4 | 2026-05-06 | **CP18 scope freeze** pointer — `APP/artifacts/mapazapp/docs/CP18_SCOPE_FREEZE.md`; **Next** / future table / §6 aligned: CP18 = readiness only; real execution = CP19+ with new approval. |
| V1.5 | 2026-05-06 | **CP18 implementation** closure — **Current status** through **CP18**; summary table **0–18**; **Next** = CP19+; future table starts at 19+. |
| V1.6 | 2026-05-06 | **CP18.5 audit pointer** — add explicit reference to `APP/artifacts/mapazapp/docs/CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md` before CP19+ planning; emphasizes engine-proof-first sequencing. |
| V1.7 | 2026-05-06 | **V2-01 progress pointer** — add reference to `APP/artifacts/mapazapp/docs/V2_01_ENGINE_REALITY_AUDIT.md` for engine fixture expansion/characterization results before V2-02 replay work. |
| V1.8 | 2026-05-06 | **V2-02 replay pointer** — add reference to `APP/artifacts/mapazapp/docs/V2_02_CANDLE_REPLAY_TRADE_SIMULATOR.md` for candle-by-candle lifecycle outcomes and MAE/MFE coverage. |
| V1.9 | 2026-05-06 | **V2-03 entry/SL/TP pointer** — add reference to `APP/artifacts/mapazapp/docs/V2_03_ENTRY_SL_TP_MODEL_V1.md` for `buildEntrySlTpPlan`, dynamic buffer, and replay integration. |
| V1.10 | 2026-05-06 | **V2-04 IFVG replay backtest pointer** — add reference to `APP/artifacts/mapazapp/docs/V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md` for `runIfvgReplayBacktest` full-chain replay metrics. |
| V1.11 | 2026-05-06 | **V2-04.1 pointer** — `candidateTiming` on `ZoneCandidate`, replay prefers explicit bar indices; see `V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md` + `IMPLEMENTATION_ASSUMPTIONS.md` §28. |
| V1.12 | 2026-05-07 | **V2-11 pointer** — manual candle CSV import + campaign dataset adapter; `V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`; addendum § V2-11. |
| V1.13 | 2026-05-07 | **V2-12 pointer** — export sample validation (BridgeEA/TestEA text bundles); `V2_12_REAL_EXPORT_SAMPLE_VALIDATION.md`; addendum § V2-12. |
