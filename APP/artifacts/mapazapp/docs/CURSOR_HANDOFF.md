# Cursor Handoff — Mapazapp Trading Guard Dashboard

**Repo layout:** planning specs = `00_START_HERE/` and `Mapazapp_Replit_Handoff_V1/` at repo root; this mock = `APP/artifacts/mapazapp/`. See `00_START_HERE/CURSOR_NAVIGATION_NOTE.md` for what to ignore (`mockup-sandbox`, `api-server`, `old/`, nested ZIPs).

**Before implementing strategy, MT5 bridge, scanner, backtesting or risk calculations, read the Symbol Precision / Tick / Pip Normalization addendum:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`.

**Before implementing the strategy engine, TestEA, scanner or risk-aware trade-ready logic, read Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md`.

**Before starting a new implementation checkpoint, read** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`.

**Before implementing CP18, read** `APP/artifacts/mapazapp/docs/CP18_SCOPE_FREEZE.md` — CP18 is a **gated future-phase readiness layer**; it **does not** enable real execution, `POST` command routes, MT5 command reading, or BridgeEA/TestEA logic changes.

**Before planning CP19+ or any execution/infrastructure expansion, read** `APP/artifacts/mapazapp/docs/CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md` — engine/heart proof is prioritized over execution plumbing, and profitability remains unproven at CP18.5.

**Roadmap V2 progress pointer:** `APP/artifacts/mapazapp/docs/V2_01_ENGINE_REALITY_AUDIT.md` — V2-01 expands deterministic engine fixtures/tests and documents current strengths/gaps before replay-phase work.
**Roadmap V2 replay pointer:** `APP/artifacts/mapazapp/docs/V2_02_CANDLE_REPLAY_TRADE_SIMULATOR.md` — V2-02 introduces deterministic candle replay outcomes (trigger/missed/expired/SL/TP/ambiguity + MAE/MFE), still review-only.
**Roadmap V2 entry/SL/TP pointer:** `APP/artifacts/mapazapp/docs/V2_03_ENTRY_SL_TP_MODEL_V1.md` — V2-03 adds `buildEntrySlTpPlan` (modes, dynamic buffer, R:R, timing v1) and `replayInputPreview` for `simulateReplayTrade`, still review-only.
**Roadmap V2 IFVG replay backtest pointer:** `APP/artifacts/mapazapp/docs/V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md` — V2-04 adds `runIfvgReplayBacktest` (detection → trade plan → Entry/SL/TP → replay → metrics in R), still review-only and non-profitability-proof.
**Roadmap V2-04.1:** `ZoneCandidate.candidateTiming` (`CandidateTimingMetadata` in `candidate-timing.ts`) propagates FVG/IFVG bar indices from detectors; replay prefers this over parsing `sourceIfvgId`. Full-series detection remains a v1 limitation.
**Roadmap V2-05 — Decision model / soft-score:** `evaluateDecisionModel` + replay trace fields (`decisionModelResult`, `effectiveScoreForReplay`, `legacyDefaultScore`); see `APP/artifacts/mapazapp/docs/V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md`.
**Roadmap V2-06 — Human-like tolerance calibration:** `evaluateToleranceCalibration` + optional `DecisionModelInput.toleranceCalibrationResult` / `toleranceIntegration`; see `APP/artifacts/mapazapp/docs/V2_06_HUMAN_LIKE_TOLERANCE_CALIBRATION.md`.
**Roadmap V2-07 — HTF bias / context:** `evaluateContextBias` + optional `DecisionModelInput.contextBiasResult` / `contextBiasIntegration`; optional `IfvgReplayBacktestInput.htfCandlesByTimeframe`; see `APP/artifacts/mapazapp/docs/V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md`.
**Roadmap V2-08 — Entry variant model:** `evaluateEntryVariant` + optional `DecisionModelInput.entryVariantResult` + optional `EntrySlTpModelInput.entryVariantResult` (warnings); see `APP/artifacts/mapazapp/docs/V2_08_ENTRY_VARIANT_MODEL.md`. Next roadmap items per `CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md` (e.g. symbol-ranking campaign) remain separate.

This document gives Cursor (or any future developer) everything needed to continue building Mapazapp from where the Replit mock phase left off.

---

## Shared core package (`@workspace/mapazapp-core`)

- **Location:** `APP/lib/mapazapp-core/`
- **Purpose:** Pure TypeScript — symbol normalization, zone/risk primitives, IFVG **lifecycle** skeleton, **checkpoint 2** strategy detection, **checkpoint 3** **trade review plan** evaluation (`evaluateTradeReviewPlan`), **checkpoint 6** account guard, **checkpoint 7** strategy/parameter-set registry (`evaluateParameterSetCompatibility`), **checkpoint 8** backtest run/trade model, CSV import skeleton, and advisory **`evaluateBacktestApproval`**, plus **checkpoint 10** BridgeEA **file contract parsers** (JSON + CSV on in-memory strings only — **no** disk path, **no** MT5 socket), plus **checkpoint 12** **offline scanner simulation** (`runScannerSimulation`, `runScannerSimulationFromBridgeCandlesCsv`, `bridgeCandleRowToCandle`, `scanner-fixtures`, `runCheckpoint12ScannerFixture` — **not** a live scanner daemon, **not** execution). **Checkpoint 13** adds a separate **MQL5 export-only EA** under `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` (not compiled by this repo); core parsers remain the validation target for wire format. **Checkpoint 14** adds **`Mapazapp_TestEA`** under `APP/artifacts/mt5/experts/Mapazapp_TestEA/` — **Strategy Tester only**, **virtual** CSV/JSON export (`MZP_TESTEA_V1`) aligned with **`importBacktestTradesFromCsv`**; **not** BridgeEA, **not** live orders. **Checkpoint 15** adds **`evaluateBacktestEvidence`** + **`createBacktestEvidenceBundleFromCsvTexts`** + advisory **`BacktestEvidenceApprovalProposal`** (multi-run splits; **no** registry mutation, **no** MT5 folder ingest). **Checkpoint 16** adds **`evaluateForwardMonitorSnapshot`** + **`forward-monitor-fixtures`** — observational forward/demo **monitor** over merged scanner snapshots (**no** file watcher, **no** DB, **no** WebSocket, **no** execution). **Checkpoint 17** adds **`validateAssistedExecutionIntent`** + **`assisted-execution-fixtures`** — **assisted execution contract** (gates, human confirmations, audit DTO) — **no** broker submission, **no** MT5 command channel, **no** automation (`executionEnabled` / `sendToMt5Enabled` / `canAutoExecute` always false on results). **Checkpoint 18** adds **`assisted-execution-invariants`** — assert / normalize / safety snapshot helpers and **`registryMutationAllowed: false`** / **`manualReviewRequired: true`** on results — still **no** execution. **No** React, HTTP, live MT5 from TypeScript, DB, WebSocket, or order execution in core.
- **Tests:** from `APP/` run `pnpm --filter @workspace/mapazapp-core test` and `pnpm --filter @workspace/mapazapp-core typecheck`. Strategy coverage in `tests/checkpoint2-strategy.test.ts`; trade plan coverage in `tests/checkpoint3-trade-plan.test.ts` (synthetic inputs only); backtest model / CSV / approval / TestEA-shaped CSV sample in `tests/checkpoint8-backtest.test.ts`; bridge contract parsers in **`tests/checkpoint10-bridge-contract.test.ts`**; scanner simulation in **`tests/checkpoint12-scanner-simulation.test.ts`**; multi-run evidence loop in **`tests/checkpoint15-backtest-evidence.test.ts`**; forward monitor in **`tests/checkpoint16-forward-monitor.test.ts`**; assisted execution contract in **`tests/checkpoint17-assisted-execution.test.ts`**; CP18 safety invariants in **`tests/checkpoint18-assisted-execution-invariants.test.ts`**; V2 replay in **`tests/v2-02-replay-trade-simulator.test.ts`**; V2 entry/SL/TP in **`tests/v2-03-entry-sl-tp-model.test.ts`**; V2 IFVG replay backtest in **`tests/v2-04-ifvg-replay-backtest.test.ts`**; V2 decision model in **`tests/v2-05-decision-model.test.ts`**; V2 tolerance calibration in **`tests/v2-06-tolerance-calibration.test.ts`**; V2 HTF context in **`tests/v2-07-context-bias-engine.test.ts`**; V2 entry variants in **`tests/v2-08-entry-variant-model.test.ts`**.
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
| `src/zone-candidate.ts` | Padded zone from IFVG + tick rounding; initial state `WAIT_RETEST` / `OBSERVE` only; optional `candidateTiming` (V2-04.1). |
| `src/candidate-timing.ts` | `CandidateTimingMetadata` + `buildCandidateTimingMetadataFromIfvg` for replay anti-lookahead. |
| `src/retest-detector.ts` | `full_zone` / `midpoint` / `edge` retest. |
| `src/confirmation-detector.ts` | Post-retest confirmation + optional wick rule. |
| `src/strategy-settings.ts` | Grouped `IfvgStrategySettings` + `createDefaultIfvgStrategySettingsForTests()`. |
| `src/strategy-score.ts` | Blueprint §17 weighted score + hard-gate cap. |
| `src/decision-model.ts` | V2-05 `evaluateDecisionModel` — hard gates + weighted soft score + variant + confidence band (review-only). |
| `src/decision-model-fixtures.ts` | Synthetic `DecisionModelInput` bundles for tests. |
| `src/tolerance-calibration.ts` | V2-06 `evaluateToleranceCalibration` — dynamic ATR/spread/tick tolerance matrix + optional decision-model blend hooks. |
| `src/tolerance-calibration-fixtures.ts` | Synthetic multi-symbol tolerance scenarios for tests. |
| `src/context-bias-engine.ts` | V2-07 `evaluateContextBias` — HTF swing/slope bias, range position, MTF conflict, chop proxy. |
| `src/context-bias-fixtures.ts` | Synthetic HTF candle bundles for context tests. |
| `src/entry-variant-model.ts` | V2-08 `evaluateEntryVariant` — entry style / timing / quality (review-only). |
| `src/entry-variant-fixtures.ts` | Synthetic entry-variant scenarios for tests. |
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
- **Checkpoint 4 / 7:** `DashboardMockDataSource` (`tradeReviewDataSource.ts` + `mockTradeReviewDataSource.ts`) — **`createMockDashboardDataSource()`** exposes **`getZonesForAccount`**, **`getTradeReviewPlansForAccount`** (includes **`registryCompatibility`** per row), **`getTradeReviewPlanByZoneId`**, **`getAlertsForAccount`**, and **`getAccountSnapshot`** (delegates to checkpoint 1). Mock zones are mapped through **`mapMockZoneToCore.ts`**, risk through **`mapMockRiskToTradePlanGuard.ts`** with registry-derived **`approvedParameterSetForAccount`**, symbols through **`mockSymbolProfiles.ts`**, then **`evaluateTradeReviewPlan`** from `@workspace/mapazapp-core`. **No** backend, MT5, execution, WebSocket, or DB.
- **Checkpoint 9:** **`StrategyRegistryReadModelDataSource`** (`strategyRegistryDataSource.ts` + **`mockStrategyRegistryDataSource.ts`**) — read-only registry + compatibility + CP8 advisory + **CP15** **`getParameterSetBacktestEvidenceBundle`** for inspector pages; **`strategyRegistryUi.ts`** for badges and summaries; **`backtestEvidenceUi.ts`** for CP15 plain-language lines. **No** `fetch`, **no** editing.
- **Checkpoint 10:** **`loadMockBridgeExportBundle()`** in **`bridgeMockExportDataSource.ts`** — parses **`bridge-fixtures.ts`** from core (fictional **`MZP_BRIDGE_V1`** / legacy **`QTG_BRIDGE_V1`** alias) via **`parseBridgeStatusJson`** + CSV parsers; **`bridgeImportUi.ts`** formats diagnostics. **`BridgePage.tsx`** surfaces schema, terminal, login, symbols, market row tick times, and aggregate import warnings/errors — **mock inspection only** (no file picker, no watcher, no backend).
- **UI wiring:** `HomePage` (review-ready strip + banner counts), `ZonesPage` (core status badge + reason line), and `ZoneDetailPage` (core review block + technical fields + link to **`/parameter-sets/:id`**) consume the dashboard data source. **`ParameterSetsPage`** / **`ParameterSetDetailPage`** use the checkpoint 9 read-only registry source. Other pages still use mock imports directly where unchanged.
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

### Strategy / parameter-set registry (checkpoint 7)

| Module | Role |
|--------|------|
| `strategy-registry-types.ts` | **`StrategyDefinition`**, **`ParameterSetDefinition`**, **`ParameterSetRegistry`**, compatibility result types, **`ParameterSetRequestedUsage`**. |
| `strategy-registry-settings.ts` | **`StrategyRegistryEvaluationSettings`** (broker mismatch vs warn-on-missing). |
| `strategy-registry-reasons.ts` | Human-readable labels for block/warning codes. |
| `strategy-registry-evaluator.ts` | **`evaluateParameterSetCompatibility`**, **`accountHasApprovedTradeReviewParameterSet`**. |
| `strategy-registry-fixtures.ts` | **`createCheckpoint7MockParameterSetRegistry()`** — mock/test doubles only. |
| `trade-plan-types.ts` | Optional **`TradePlanInput.registryCompatibility`**. |
| `trade-plan-reasons.ts` | Registry block → **`TradePlanReason`** mapping for **`APPROVED_PARAMETER_SET_REQUIRED`**. |
| Mock / dashboard | **`MOCK_CHECKPOINT7_STRATEGY_REGISTRY`** in **`mockTradeReviewDataSource.ts`**; per-row **`registryCompatibility`** on **`TradeReviewPlanRow`**; mock **`zones.ts`** / **`backtests.ts`** ids aligned with registry; Home / Zones / Zone Detail / Backtests minimal UI. |

**Rule:** **`TRADE_READY`** in core requires **`parameterSetStatus === approved_for_trade_review`** for that symbol and account (plus existing gates). **`approved_for_alerts`** and draft/validated rows must **not** produce trade-ready review — they surface as **`PARAMETER_SET_ALERTS_ONLY`** / **`PARAMETER_SET_DRAFT`** / **`PARAMETER_SET_NOT_VALIDATED`** in reasons when the parameter-set gate blocks.

### Backtest result model (checkpoint 8)

| Module / export | Role |
|-----------------|------|
| `backtest-types.ts` | `BacktestRun`, `BacktestTrade`, `BacktestSummary`, import/approval DTOs, `BacktestDatasetSplit`, `BacktestSourceType`. |
| `backtest-metrics.ts` | Pure **`calculateBacktestSummary`** (+ granular metric helpers) from trade arrays — empty-safe. |
| `backtest-importer.ts` | **`importBacktestTradesFromCsv`**, **`assembleBacktestRunFromImportedTrades`** — string CSV only; validates required columns. |
| `backtest-approval.ts` | **`evaluateBacktestApproval`** (advisory statuses; does **not** mutate registry), **`deriveRecommendedParameterSetStatusFromBacktest`**. |
| `backtest-fixtures.ts` | Fictional runs + **`getCheckpoint8MockApprovalForParameterSet`** for dashboard/tests. |

**Not implemented:** backend/dashboard **file ingest** of TestEA CSV from disk, persistence, registry auto-update from imports, or optimization loops. **Checkpoint 14** adds the **Mapazapp_TestEA** MQL5 exporter + fictional **`samples/`**; operators still copy CSV text manually into tooling using **`importBacktestTradesFromCsv`** until a watcher ships.

### Multi-run backtest evidence (checkpoint 15)

| Module | Role |
|--------|------|
| `backtest-evidence-types.ts` | `BacktestEvidenceBundle`, thresholds, split/run results, **`BacktestEvidenceApprovalProposal`**. |
| `backtest-evidence-evaluator.ts` | **`evaluateBacktestEvidence`**, **`createBacktestEvidenceBundleFromCsvTexts`**, grouping + **`candidate_*`** statuses only. |
| `backtest-evidence-fixtures.ts` | Fictional bundles for selected **`parameterSetId`** values (`getCheckpoint15MockEvidenceBundleByParameterSetId`). |

**Rule:** evidence may **recommend** registry statuses; **only** explicit human-controlled registry updates may **approve** a parameter set — **`registryMutationAllowed`** is always **`false`** on evaluation outputs; **`canAutoApply`** is **`false`** on proposals.

### Strategy / parameter set read-only UI (checkpoint 9 — dashboard)

| File | Role |
|------|------|
| `strategyRegistryDataSource.ts` | **`StrategyRegistryReadModelDataSource`** interface (read-only registry API). |
| `mockStrategyRegistryDataSource.ts` | **`createMockStrategyRegistryDataSource()`** — strategies + parameter sets from **`MOCK_CHECKPOINT7_STRATEGY_REGISTRY`**, **`evaluateParameterSetCompatibility`**, checkpoint-8 advisory lookup. |
| `strategyRegistryUi.ts` | Badge classification + Simple/Technical copy + IFVG **`settings` summary** helpers. |
| **`ParameterSetsPage.tsx`** | **`/parameter-sets`** — account-scoped table, **`supportsViewToggle`**. |
| **`ParameterSetDetailPage.tsx`** | **`/parameter-sets/:parameterSetId`** — TRADE_READY gate explanation, compatibility codes, CP8 advisory, **CP15 evidence** panel (mock bundle — **no** approve/upload), read-only settings. |

**Not implemented:** settings editing, optimization UI, registry persistence, server-backed registry, auto-approval from evidence.

### BridgeEA export contract parsers (checkpoint 10 — `@workspace/mapazapp-core` + minimal UI)

| Module / export | Role |
|-----------------|------|
| `bridge-types.ts` | Wire-aligned row/snapshot types (`BridgeStatusSnapshot`, `BridgeMarketSnapshotRow`, …). |
| `bridge-import-result.ts` | **`BridgeImportResult`**, stable **`BridgeDiagnosticCode`** list. |
| `bridge-parse-json.ts` | **`parseBridgeStatusJson`** — required fields per **`Mapazapp_MT5_Bridge_Connectivity_Contract_V1`** §9.1. |
| `bridge-parse-csv.ts` | **`parseBridgeMarketSnapshotCsv`**, account/candles/positions/orders/deals/errors — headers **exact** snake_case from contract + Build Spec. |
| `bridge-symbol-profile.ts` | **`deriveSymbolMarketSpecFromBridgeMarketSnapshot`** — builds **`SymbolMarketSpec`**; caller supplies **`canonicalSymbol`** + **`accountId`** (broker symbol ≠ canonical in production). |
| `bridge-account-key.ts` | **`makeBridgeAccountKey`** — composite string `terminal_id` + `account_login` + `account_server`; **no** persistence, **no** inferred app `accountId`. |
| `bridge-fixtures.ts` | Fictional export strings for tests + dashboard bundle. |

**Not implemented:** TypeScript **folder reads** / file watchers / backend ingest of live files, WebSocket tick stream, DB dedupe, inbound **command JSON**, live health polling from disk.

**Checkpoint 13 — MT5 BridgeEA (export-only MQL5):** source **`APP/artifacts/mt5/experts/Mapazapp_BridgeEA/Mapazapp_BridgeEA.mq5`** writes `bridge_status.json`, `latest_market_snapshot.csv` (includes **`last`** + **`session_status`** per CP10 parsers), `account_snapshot.csv`, `candles.csv`, `positions_open.csv`, `orders_pending.csv`, `deals_history.csv`, `bridge_errors.csv` under **`MQL5/Files/<InpExportRoot>/<InpTerminalId>/`** (default `Mapazapp\bridge\TERMINAL_A\`). **No** `OrderSend` / position close / `CTrade` / `WebRequest` / DLLs / inbound command files.

**Checkpoint 14 — MT5 TestEA (Strategy Tester export only):** source **`APP/artifacts/mt5/experts/Mapazapp_TestEA/Mapazapp_TestEA.mq5`** (`MZP_TESTEA_V1`) writes **`backtest_trades.csv`** + **`backtest_summary.json`** under **`MQL5/Files/<InpExportRoot>/<run_id>/`** (default `Mapazapp\testea\<run_id>\`). **`OnInit` fails on live charts** (`MQL_TESTER` guard). **Virtual export only** — **no** `OrderSend` / `CTrade`; placeholder trade row is **not** the IFVG engine and implies **no** profitability or registry promotion.

**CP14 real tester smoke note:** a manual Strategy Tester run **succeeded** (compile **0/0**); files were observed under the **local tester agent** sandbox (`MetaQuotes\Tester\…\Agent-…\MQL5\Files\…`), not necessarily under the interactive terminal data folder. **Do not** commit raw tester CSV/JSON; **`samples/`** stay fictional. Large placeholder **`result_r`** values are **not** performance evidence.

**Future flow:** BridgeEA writes exports → backend (or desktop agent) reads file **text** → core parsers validate → normalized models feed account/symbol/candle stores and UI. TestEA CSV → **`importBacktestTradesFromCsv`** → advisory **`evaluateBacktestApproval`** (still **no** registry mutation).

### Local mock HTTP API (checkpoint 11 — `@workspace/api-server`)

| Area | Role |
|------|------|
| `src/mapazapp/routes.ts` | Read-only **`GET /api/mapazapp/*`** — health, accounts, summaries, account guard, trade reviews, strategies, parameter sets, compatibility, backtests list + CP8 advisory, bridge mock import summary, **checkpoint 12** scanner simulation list/latest + per-account latest, **checkpoint 16** forward-monitor, **checkpoints 17–18** assisted-execution contract + **CP18** `/assisted-execution/safety` and `/assisted-execution/invariants` (still **no** `POST`). |
| `src/mapazapp/response.ts` | Stable JSON envelope (`ok`, `data`, `warnings`, `errors`, `source: "mock"`, `mockOnly: true`). |
| `src/mapazapp/mockData.ts` | In-memory duplicates of dashboard mock fixtures (no React / Vite `@/` imports). |
| `src/mapazapp/lib/tradeReviewLogic.ts` | Same core evaluation path as `createMockDashboardDataSource` (registry + trade plan). |

**Product rule:** responses are **review-only**; **`executionEnabled`** is always **false** in trade-review envelopes. **No** MT5, DB, WebSocket, execution routes, or file watchers.

### Scanner simulation (checkpoint 12 — core + dashboard + API)

| Area | Role |
|------|------|
| `scanner-simulation.ts` | **`runScannerSimulation`** — validates input, runs **`detectIfvgZoneCandidates`**, registry + account guard, per-candidate **`evaluateTradeReviewPlan`**; flags **`reviewOnly`**, **`executionEnabled: false`**, **`simulatedScanner: true`**. |
| `scanner-bridge-candles.ts` | **`bridgeCandleRowToCandle`**, **`runScannerSimulationFromBridgeCandlesCsv`** — Bridge CSV text → candles → simulation; attaches parser diagnostics. |
| `scanner-fixtures.ts` | Fictional candle paths + **`runCheckpoint12ScannerFixture`** shared by **api-server** adapter and **dashboard** mock data source. |
| **API** | `GET /api/mapazapp/scanner/simulations`, `/scanner/simulations/latest`, `/accounts/:accountId/scanner/simulations/latest` — same envelope + review flags. |
| **Dashboard** | Route **`/scanner`** — `ScannerSimulationPage` + **`createMockScannerSimulationDataSource()`** (in-process; no `fetch` required). Sidebar **Scanner (sim)**. |

**Not implemented:** POST scan/run, job queue, live candle feed, real BridgeEA folder watcher, or treating simulation as live trading advice.

### Forward / demo monitor (checkpoint 16 — core + dashboard + API)

| Area | Role |
|------|------|
| `forward-monitor-evaluator.ts` | **`evaluateForwardMonitorSnapshot`** — session validation → account guard → registry gate → optional merged **`ScannerSimulationResult[]`** → candidate summaries + events + status; flags **`reviewOnly`**, **`executionEnabled: false`**, **`mockOnly`**, **`simulated`**. |
| `forward-monitor-fixtures.ts` | Fictional **`ForwardMonitorInput`** builders (The5ers XAU, PropXP EUR, guard-block, registry-block, empty scanner) — **not** user MT5 exports. |
| **API** | `GET /api/mapazapp/forward-monitor/latest`, `/forward-monitor/sessions`, `/accounts/:accountId/forward-monitor/latest` — envelope **`reviewOnly`**, **`executionEnabled: false`**, **`mockOnly: true`**. |
| **Dashboard** | Route **`/forward-monitor`** — `ForwardMonitorPage` + **`createMockForwardMonitorDataSource()`** + **`forwardMonitorUi.ts`**. Sidebar **Forward Monitor**. |

**Not implemented:** live monitor daemon, BridgeEA automatic ingest, WebSocket push, DB persistence of sessions, execute / “start bot” controls.

### Assisted execution contract (checkpoint 17 — core + dashboard + API)

| Area | Role |
|------|------|
| `assisted-execution-contract.ts` | **`validateAssistedExecutionIntent`** — pure gates on **`TradeReviewPlan`**, account guard, registry, symbol profile, SL/TP/R:R, optional evidence + forward-monitor cross-check, dedupe, confirmations + phrase; **`FUTURE_SEND_TO_MT5_DISABLED`** always blocks. |
| `assisted-execution-invariants.ts` | **CP18** — **`assertAssistedExecutionDisabled`**, **`normalizeAssistedExecutionSafetyFlags`**, **`createAssistedExecutionSafetySnapshot`**; static **`ASSISTED_EXECUTION_CP18_POLICY_REASON_CODES`** — never enables execution. |
| `assisted-execution-fixtures.ts` | Fictional **`AssistedExecutionValidationInput`** rows — **not** real accounts. |
| **API** | `GET /api/mapazapp/assisted-execution/contract`, `/assisted-execution/safety`, `/assisted-execution/invariants`, `/assisted-execution/mock-validation`, `/accounts/:accountId/assisted-execution/mock-validation` — envelope **`contractOnly: true`**, **`mockOnly: true`**, **`executionEnabled: false`**, **`sendToMt5Enabled: false`**, **`canAutoExecute: false`**, **`registryMutationAllowed: false`**, **`manualReviewRequired: true`**. **No** `POST`. |
| **Dashboard** | Route **`/assisted-execution`** — `AssistedExecutionPage` + **`createMockAssistedExecutionDataSource()`** + **`assistedExecutionUi.ts`** (CP18 banner + safety checklist + future-phase copy). Sidebar **Assisted Execution**. |

**Not implemented:** any live execution path, BridgeEA command reader, registry mutation from assisted flows. **CP18** hardens read-only safety only; **CP19+** would still require explicit product approval before any gated execution.

**Dashboard:** unchanged default for zones — still **`createMockDashboardDataSource()`** in-process. Scanner page uses **`createMockScannerSimulationDataSource()`** in-process; forward monitor uses **`createMockForwardMonitorDataSource()`** in-process; assisted execution uses **`createMockAssistedExecutionDataSource()`** in-process. Future: optional `fetch` to `/api/mapazapp/...` behind a feature flag or env.

## What remains mock-only (dashboard + integration)

- **Live** IFVG scanner, MT5 bridge ingest, WebSocket, DB, order execution — unchanged. Core contains **offline** detection math; the UI still uses `src/mock/` zones. **Checkpoint 14** ships an MQL5 **TestEA** artifact for Strategy Tester **file** export only — **no** dashboard/API file watcher yet. See **What Is NOT Implemented** below.

---

## What This Is

Mapazapp is a **trading intelligence and risk management dashboard** for disciplined prop firm traders. It is built as a visual mock: multiple dashboard routes (including read-only **Strategy & sets** inspection), realistic UI, complete data model — but **zero real logic**.

**Multi-account and multi-broker by design.** Every record in the system is scoped to an `accountId`. This was established from day one so the real backend can be account-aware from the start.

---

## What Is NOT Implemented

| Item | Status | Notes |
|------|--------|-------|
| MT5 terminal connection | NOT IMPLEMENTED | Dashboard / API have **no** socket to MT5 |
| BridgeEA (Expert Advisor) | **PARTIAL (CP13)** | **MQL5 artifact** in `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` — **export-only** EA for operators to compile in MetaEditor; **no** dashboard ingest, **no** command channel, **no** execution from Mapazapp |
| TestEA (Strategy Tester export) | **PARTIAL (CP14)** | **MQL5 artifact** in `APP/artifacts/mt5/experts/Mapazapp_TestEA/` — **virtual** `backtest_trades.csv` / summary JSON for **`importBacktestTradesFromCsv`**; **no** live-chart use, **no** orders, **no** automatic registry approval |
| Real tick data | NOT IMPLEMENTED | All timestamps are `Date.now()` offsets |
| IFVG zone detection in **UI / API** | PARTIAL (CP12) | Dashboard **`/scanner`** + API scanner routes run **offline simulation** on fictional/fixture candles only — **not** live scanner; static **Market/Zones** mock list unchanged |
| Forward / demo monitor | **PARTIAL (CP16)** | Dashboard **`/forward-monitor`** + API **`GET …/forward-monitor/*`** show **snapshot-only** mock observability over scanner outputs — **not** a live watcher, **not** execution |
| Zone score in **UI** | NOT IMPLEMENTED | Page scores remain mock integers; core has `computeStrategyScore` for future integration |
| Risk Guard rule evaluation | NOT IMPLEMENTED | Risk states are static mock objects |
| Prop Firm Guard enforcement | NOT IMPLEMENTED | Prop firm state is static mock |
| Multi-account backend | NOT IMPLEMENTED | Account switching is React useState only |
| Multi-terminal MT5 bridge | NOT IMPLEMENTED | Bridge terminals are mock arrays |
| Backtest / Strategy Tester UI wiring | **PARTIAL (CP8 / CP14 / CP15)** | Backtests UI mixes mock rows with **CP8** advisory column + **CP15** mock multi-run **evidence** (parameter-set detail panel); **CP14 TestEA** CSV is for **manual** paste / tooling — **no** dashboard file picker, **no** upload route, **no** persistence of imports |
| Journal import from MT5 | NOT IMPLEMENTED | Journal entries are hardcoded |
| Real alert engine | NOT IMPLEMENTED | Alerts are hardcoded arrays |
| Alert persistence | NOT IMPLEMENTED | Acknowledge state is React useState only |
| Order execution | NOT IMPLEMENTED | No execution of any kind |
| Assisted execution (live) | NOT IMPLEMENTED | Checkpoint **17** defines **contract + validation** only (`validateAssistedExecutionIntent`); **no** MT5 send, **no** command channel, **no** `POST` execution routes |
| HTTP API (`@workspace/api-server`) | **PARTIAL (CP11+)** | Read-only **`GET /api/mapazapp/*`** mock envelope (`mockOnly: true`); serves registry, trade-review snapshots, bridge parser demo, scanner simulation, **CP15 evidence**, **CP16 forward-monitor**, **CP17–CP18 assisted-execution** contract + safety snapshot routes — **no** DB, **no** live MT5 socket, **no** folder watcher ingest |
| Python backend (Replit handoff stack) | NOT IMPLEMENTED | No Python services in this repo; Node mock API is **not** a production backend |
| Database | NOT IMPLEMENTED | No domain persistence; mock API is in-memory only |
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
| `BacktestsPage.tsx` | `/backtests` | Parameter set list with active-account compatibility column; link to Strategy & sets inspector |
| `ParameterSetsPage.tsx` | `/parameter-sets` | Read-only strategy + parameter set list (account-scoped compatibility, CP8 advisory hints) |
| `ParameterSetDetailPage.tsx` | `/parameter-sets/:parameterSetId` | Read-only detail: TRADE_READY registry gate, compatibility codes, CP8 advisory, IFVG settings summary |
| `BacktestDetailPage.tsx` | `/backtests/:id` | Stats, equity curve mock, sample trades |
| `JournalPage.tsx` | `/journal` | Account filter, account column, resultR, ruleCompliance |
| `PsychologyPage.tsx` | `/psychology` | Mood tracker, checklist, impulse trades |
| `AlertsPage.tsx` | `/alerts` | Account-tagged + global alerts, filter, acknowledge |
| `ConfigPage.tsx` | `/config` | Accounts, risk profiles, rules profiles, symbol mapping, notifications, zone scoring |
| `BridgePage.tsx` | `/bridge` | Multi-terminal grid + detail per terminal (ticks, log) |
| `ScannerSimulationPage.tsx` | `/scanner` | Mock scanner simulation summary (fixture replay; review-only flags) |
| `ForwardMonitorPage.tsx` | `/forward-monitor` | Mock forward/demo monitor snapshot (observational; manual-review copy; no execution controls) |
| `AssistedExecutionPage.tsx` | `/assisted-execution` | Assisted execution **contract** preview (CP18 “execution disabled” banner, safety checklist, validation + audit DTO; **no** execute / send / place-trade controls) |

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
