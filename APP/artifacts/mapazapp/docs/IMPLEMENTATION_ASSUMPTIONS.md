# Mapazapp — Implementation assumptions (V1 checkpoint)

This file records **implementation-only** decisions and **test fixtures** that are not broker truth. Product rules remain in `Mapazapp_Replit_Handoff_V1/` and `APP/artifacts/mapazapp/docs/MOCK_DATA_CONTRACT.md`.

---

## 1. Test symbol profiles (`@workspace/mapazapp-core` tests)

The file `APP/lib/mapazapp-core/tests/test-symbol-profiles.ts` defines `V1_TEST_SYMBOL_PROFILES` for:

| Key | Purpose |
|-----|---------|
| `XAUUSD` | Metals-style tick (0.01), 2 decimals |
| `EURUSD` | FX 5 decimals, tick 1e-5 |
| `USDJPY` | JPY quote 3 decimals, tick 0.001 |
| `NAS100` | Index-style 0.1 tick |
| `BTCUSD` | Large spread in test dollars, 0.1 tick |

**`accountId`:** fixed test value `TEST_ACC_V1` on every profile row.

These numbers are **for unit tests only** until real **MT5 BridgeEA** symbol snapshots exist.

---

## 2. `tickSize`, `digits`, and `point`

- **`tickSize`:** minimum price increment used for rounding (`roundToTickSize`).
- **`digits`:** used by `formatPriceDisplay` in core (display only); tests focus on tick rounding.
- **`point`:** used in tests to derive `spreadPrice` from `spreadPoints` via `spreadPointsToPrice = spreadPoints * point`, aligned with common MT5 semantics **as an assumption** — production must use broker-exported `spread_price` when available.

---

## 3. Rounding

- `roundToTickSize` uses `Math.round` / `floor` / `ceil` on `price / tickSize`. Half-integers follow **JavaScript** `Math.round` (half-to-even). Documented so backtest parity checks account for this.
- Small **epsilon** `DEFAULT_FLOAT_EPS` (`1e-10`) is added only inside `floor`/`ceil` paths to reduce binary float edge noise — **not** a trading tolerance.
- After choosing tick index `n`, the price is normalized with `toFixed(d)` where `d` is the number of decimal places implied by `tickSize` (derived by scaling `tickSize` until it is numerically integral), then `parseFloat`, so values like `98123.4` match exactly for test assertions.

---

## 4. Float comparison in tests

- `nearlyEqual(a, b, eps)` uses `eps` default `1e-10` scaled by operand magnitude for spread equality checks in tests.

---

## 5. What is still mock-only (dashboard)

- All **UI** figures except the path through `AccountDataSource` for account snapshot on Home still come from existing `src/mock/` data.
- No **MT5 bridge**, no **order execution**, no **WebSocket**, no **database**, no **live scanner**, no **real backtest engine** wired to production data.

---

## 6. When BridgeEA data exists

Replace test profiles with **live** `SymbolMarketSpec` built from exported MT5 fields per `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md` and bridge contracts; keep this file updated if rounding or spread semantics change.

---

## 7. ATR in `@workspace/mapazapp-core` (checkpoint 2)

- **`calculateAtrSeries` / `calculateATR`:** Wilder / smoothed ATR on true range (first bar TR = high−low only; from bar 1 onward classic TR vs previous close). Seeding: first ATR at index `period` is the simple mean of `TR[1]…TR[period]`; subsequent bars use Wilder recurrence. This matches the common **MT5 `iATR`-style** behaviour closely enough for V1 **offline** parity; confirm against exported TestEA logs when the exporter exists.
- **Insufficient history:** indices before the first seeded ATR return `null`; callers must not treat `null` ATR as zero.

---

## 8. Strategy detection skeleton (checkpoint 2) — scope

- **Implemented:** pure detectors (swing, sweep / near-sweep / break-risk, displacement, FVG, IFVG conversion, zone candidate build, retest, confirmation, score skeleton, `detectIfvgZoneCandidates` orchestration) over **`Candle[]` in price units**, using `SymbolMarketSpec` for spread/tick and documented `max(ATR·k, spread·k, tick·n)` tolerances where specified in the blueprint.
- **Not implemented:** HTF context engine (BUY_ONLY / SELL_ONLY / middle-zone veto), multi-timeframe wiring (single series is reused for all logical TFs in the pipeline with an explicit warning), SL/TP/R:R execution, trade simulator, live scanner, persistence, UI wiring of scores.
- **`createDefaultIfvgStrategySettingsForTests()`:** values are **development / unit-test defaults only**, not optimized parameter sets; production must use **approved** parameter sets per symbol/account.

---

## 9. Synthetic candles in tests

- Arrays in `tests/checkpoint2-strategy.test.ts` are **hand-built fixtures** to exercise detectors and the pipeline smoke path. They are **not** broker ticks, not replay of real sessions, and **must not** be interpreted as performance or calibration truth.

---

## 10. Near-sweep behaviour

- **Near sweep** uses the documented dynamic `near_sweep_tolerance_price` band: for a **lower-pool** setup, a bar whose `low` has **not** crossed `swing_low - sweep_tolerance_price` but lies within `near_tolerance` **above** that line is classified `NEAR_SWEEP` (lower score in `computeStrategyScore`). Until forward/backtest evidence is recorded for Mapazapp, treat near-sweep–driven states as **test/dev only** for promotion to live alerts.

---

## 11. Zone candidate `invalidationPrice` (skeleton)

- For V1 core tests, **`invalidationPrice`** is set to `zoneLow - padding` (BUY) or `zoneHigh + padding` (SELL) with the **same** dynamic padding formula as zone edges, then rounded to tick — a **structural placeholder** until SL/invalidation rules from the blueprint §14 are fully wired with sweep references.

---

## 12. Score model

- **`computeStrategyScore`** implements blueprint §17 weights on **caller-supplied 0–1 sub-scores** plus `SweepStatus` liquidity mapping. It does **not** execute trades. **Hard gates** (`evaluateTradeHardGates`) cap the total when provided; they mirror documented gate precedence, not full Risk Guard logic.

---

## 13. Trade review plan (checkpoint 3)

- **`evaluateTradeReviewPlan`** builds a **`TradeReviewPlan`** from a **`ZoneCandidate`** plus pure inputs (symbol profile, retest/confirmation, score, ATR, spread, optional sweep highs/lows, account guard booleans, settings). **No** MT5, HTTP, orders, persistence, or scanner.
- **Target model V1:** only **`fixed_R`** is implemented (`tp` from `rrTarget` × risk in price units, both SL/TP rounded to `tickSize`). **`liquidity_target`** and **`hybrid`** exist as **enum placeholders** for future parameter-set work — no TP path is computed for them yet.
- **`referenceEntryPrice`:** defaults to **confirmation close** when `referenceEntryMode: CONFIRMATION_CLOSE` and a finite `confirmationClose` is supplied; otherwise the evaluator **falls back to zone midpoint** and emits reason code `REFERENCE_ENTRY_FALLBACK_MIDPOINT`.
- **Sweep for SL:** blueprint `min(zone_low, sweep_low)` / `max(zone_high, sweep_high)` — if `sweepLow` / `sweepHigh` are **omitted**, the structural level equals the zone boundary (min/max degenerates to the zone edge).
- **Near sweep:** **`allowNearSweepTradeReady`** defaults to **`false`**. With **`NEAR_SWEEP`** liquidity class, the plan may reach **`OBSERVE`** even when numeric R:R and account gates pass; it does **not** promote to **`TRADE_READY`** unless that flag is enabled.
- **Account / risk guard:** the evaluator **consumes** `TradePlanAccountGuardInput` flags and `operationalStatus` strings aligned with the mock contract — it does **not** compute prop-firm or drawdown math; a future backend supplies the snapshot.
- **Review-only:** **`TRADE_READY`** means “passes documented hard checks + score threshold for human review,” **not** auto-execution. Reason code **`TRADE_READY_REVIEW_ONLY`** is always attached when status is `TRADE_READY`.
- **`createDefaultTradePlanEvaluationSettingsForTests()`:** development defaults only (including **`maxSlAtr: 10`** so synthetic XAUUSD-style fixtures do not spuriously hit `SL_DISTANCE_ABOVE_MAX_ATR`). Tighten per approved parameter set in production.

---

## 14. Dashboard mock → core trade review (checkpoint 4)

- **`createMockDashboardDataSource()`** (`src/services/mockTradeReviewDataSource.ts`) is the **in-process** entry point: **`getTradeReviewPlansForAccount`**, **`getTradeReviewPlanByZoneId`**, **`getZonesForAccount`**, **`getAlertsForAccount`**, plus **`getAccountSnapshot`** (delegates to checkpoint-1 mock account source). **No** HTTP, fetch, DB, WebSocket, MT5, or execution.
- **Symbol profiles:** `getMockSymbolMarketSpec(accountId, symbol)` prefers `mockConfig.symbolMappings`; for symbols **not** in mappings (e.g. **GBPUSD**, **NAS100**, **BTCUSD**, **USDJPY**), a **documented fallback** table supplies tick/point/spread/volume compatible with `@workspace/mapazapp-core` — **not** broker truth; replace with BridgeEA exports later.
- **Mock ATR:** `getMockConfirmationAtr(symbol)` returns a **static** confirmation-TF ATR in **price units** per canonical symbol — not computed from candles.
- **Zone → `ZoneCandidate`:** `mockZoneBoundsFromDashboard` derives **`zoneLow` / `zoneHigh`** from mock **`entryPrice`** and **`invalidationPrice`** with a fixed **15%** span toward the entry side — mock JSON has **no IFVG gap**; this band is **UI adapter only**.
- **Retest / confirmation:** inferred from mock **`Zone.state`**: `CREATED`/`WATCHING` → no retest; **`RETESTING`** → retest only; **`CONFIRMED`** / **`TRADE_READY`** → retest + confirmation. **`confirmationClose`** uses **`entryPrice`** when confirmed.
- **Sweep:** `mockSweepStatusFromZoneState` maps narrative only: **`TRADE_READY`/`CONFIRMED`** → **`CONFIRMED_SWEEP`**; **`RETESTING`** → **`NEAR_SWEEP`**; else **`NO_SWEEP`**. Optional **`sweepLow`/`sweepHigh`** are synthetic ticks beyond invalidation/entry for SL geometry.
- **Invalidation probe:** `mockCurrentPriceForZone` uses **`entryPrice`** for live states; for mock **`INVALIDATED`** uses a price **past** `invalidationPrice` so the core evaluator marks **`INVALIDATED`**.
- **Lifecycle flags:** mock **`USED` / `EXPIRED` / `INVALIDATED`** set the evaluator’s **`zoneMarked*`** inputs in addition to price/date behaviour where applicable.
- **Parameter set approval (checkpoint 7):** `createMockDashboardDataSource()` loads **`MOCK_CHECKPOINT7_STRATEGY_REGISTRY`** from `@workspace/mapazapp-core` (`createCheckpoint7MockParameterSetRegistry`) and runs **`evaluateParameterSetCompatibility`** per zone (`strategy_id`, `parameter_set_id`, canonical symbol, account **`brokerSymbol`** from `getMockSymbolMarketSpec`, **`requestedUsage: "trade_review"`**). **`allowTradeReview`** from that result becomes **`approvedParameterSetForAccount`** in **`mapMockRiskToTradePlanGuard`**. The same compatibility snapshot is attached to **`TradePlanInput.registryCompatibility`** so **`APPROVED_PARAMETER_SET_REQUIRED`** surfaces stable registry reason codes (e.g. **`PARAMETER_SET_ALERTS_ONLY`**). **`mockBacktests`** remains a **separate** narrative list for the Backtests UI; ids are aligned with registry **`parameterSetId`** where they match.
- **Trade plan settings in UI:** `createDashboardTradePlanSettings()` clones core test defaults then sets **`testOrDevMode: false`**, **`requireAccountIdForGuard: true`**, and **`minScoreTrade`** from **`mockConfig.zoneScoring.minScoreForTradeReady`**.
- **Risk guard mapping:** `mapMockRiskToTradePlanGuard` maps **`operationalStatus`** / risk / prop into **`evaluateAccountGuard`**. **`approvedParameterSetForAccount`** is **`true` only when** the registry says the **zone’s** parameter set allows trade review for that account (per-row evaluation). **`getAccountGuardEvaluation(accountId)`** uses **`accountHasApprovedTradeReviewParameterSet`** (any **`approved_for_trade_review`** set on the registry that passes account + symbol rules) for the **headline** snapshot — zone rows can still differ.
- **Future path:** replace **`createMockDashboardDataSource`** with HTTP client implementations of the same interface → backend API → BridgeEA / scanner; keep **`evaluateTradeReviewPlan`** on the server or client from the same DTOs.

---

## 15. Trade review explanation UX (checkpoint 5)

- **`buildTradeReviewExplanation`** in `artifacts/mapazapp/src/services/tradeReviewExplanation.ts` is **pure**: input **`TradePlanEvaluationResult`** from core (or the same shape from a future API), output **`TradeReviewExplanation`**. It does **not** call **`evaluateTradeReviewPlan`** or network.
- **Reason codes:** every documented **`TradePlanReasonCode`** in `@workspace/mapazapp-core` plus **`TradePlanHardGate`** aliases used in UI risk lines map to **simple** (trader-facing), **technical** (audit), **severity** (`info` / `warning` / `danger` / `success`), and **category** (`zone` / `risk` / `account` / `score` / `spread` / `confirmation` / `system`). Unknown `code` strings fall back to simple **“Review required.”** and technical **= code**.
- **Manual review only:** **`manualReviewOnly`** is always **`true`** on the explanation object; **`TRADE_READY`** UI copy explicitly states **no automatic execution** (Mapazapp remains a decision assistant).
- **Tests:** `src/services/tradeReviewExplanation.test.ts` (Vitest, node env) covers trade-ready, wait-retest/confirmation, drawdown block, unknown code fallback, and technical preservation.

---

## 16. Account / risk guard core (checkpoint 6 — `@workspace/mapazapp-core`)

- **`evaluateAccountGuard(input, settings)`** (`account-guard-evaluator.ts`) is **pure eligibility** for **trade review** (not execution, not lot sizing). It consumes **`AccountGuardInput`** (account id, operational status, **`AccountRiskSnapshot`**, optional **`PropFirmRuleSnapshot`**, flags) and returns **`AccountGuardResult`** with **`allowTradeReview`**, **`AccountGuardStatus`**, **blocking** vs **warning** reasons, summaries, and **key metrics** (drawdown % used, remaining amounts, trades left, `riskPerTradeAmount` from equity × risk %).
- **`accountGuardResultToTradePlanAccountGuardInput`** maps the result into legacy **`TradePlanAccountGuardInput`** for **`collectTradePlanHardGateFailures`** / **`evaluateTradeReviewPlan`** without changing trade-plan semantics beyond aligned operational flags (e.g. bridge block sets **`operationalStatus`** to **`BRIDGE_DISCONNECTED`** when the guard blocks on bridge).
- **`TradePlanEvaluationSettings`** gained optional **`allowWatchOnlyForTradeReview`**, **`allowNewsBlackoutForTradeReview`**, **`requireBridgeConnectedForTradeReview`** — defaults in **`createDefaultTradePlanEvaluationSettingsForTests`** are mock-friendly (**bridge not required**). **`createDashboardTradePlanSettings()`** copies the booleans from **`createDefaultAccountGuardSettingsForTests()`** so account guard policy and trade-plan operational skips stay aligned.
- **Mock mapper:** `mapMockRiskToTradePlanGuard` builds **`AccountGuardInput`** from **`AccountRiskGuardState`** (+ optional prop), calls **`evaluateAccountGuard`**, returns **`{ tradePlanAccountGuard, accountGuardResult }`**. **`getAccountGuardEvaluation(accountId)`** uses registry-derived **`approvedParameterSetForAccount`** (see §14 / checkpoint 7).
- **Tests:** `APP/lib/mapazapp-core/tests/account-guard.test.ts` covers OK, drawdown/max/trades/news/prop/psych/bridge/parameter-set/watch-only, and trade-plan **NO_TRADE** when **`allowTradeReview`** is false.

---

## 17. Strategy / parameter-set registry (checkpoint 7 — `@workspace/mapazapp-core`)

- **Formal model:** `strategy-registry-types.ts` defines **`StrategyDefinition`**, **`ParameterSetDefinition`**, **`ParameterSetRegistry`**, statuses (`draft` … `approved_for_trade_review` … `rejected` / `retired`), **`ParameterSetCompatibilityResult`**, and **`evaluateParameterSetCompatibility`** (`strategy-registry-evaluator.ts`). **Only** **`approved_for_trade_review`** yields **`allowTradeReview: true`** for **`requestedUsage: "trade_review"`**. **`approved_for_alerts`** allows **`allowAlert`** but inserts **`PARAMETER_SET_ALERTS_ONLY`** in **`blockingReasons`** so trade-review paths stay blocked.
- **Mock fixture:** `strategy-registry-fixtures.ts` exports **`createCheckpoint7MockParameterSetRegistry()`** — **not** optimized, **not** profitable, **not** MT5-validated; real approval must come from future backtest import + governance.
- **Trade plan wiring:** optional **`TradePlanInput.registryCompatibility`** enriches **`APPROVED_PARAMETER_SET_REQUIRED`** → **`tradePlanReasonsForParameterSetHardGate`** in **`trade-plan-reasons.ts`**.
- **Product rule:** a detected mock zone must **not** become **`TRADE_READY`** unless strategy exists, parameter set exists, symbol/account/registry status, score, and account guard all align — see dashboard Vitest **`mockTradeReview.test.ts`** and core **`checkpoint7-strategy-registry.test.ts`**.

---

## 18. Backtest result model & CSV importer skeleton (checkpoint 8 — `@workspace/mapazapp-core`)

- **Domain modules:** `backtest-types.ts` (runs, trades, import/approval DTOs), `backtest-metrics.ts` (pure R/money summaries from trade arrays), `backtest-importer.ts` (**`importBacktestTradesFromCsv`** on in-memory CSV text only — **no disk, no MT5, no HTTP**), `backtest-approval.ts` (**`evaluateBacktestApproval`** — advisory only), `backtest-settings.ts` (**`createDefaultBacktestMetricThresholdsForTests`** — dev defaults), `backtest-reasons.ts`, `backtest-fixtures.ts` (fictional runs + pre-evaluated rows).
- **Product rule alignment:** real parameter-set promotion remains **explicit** in a future checkpoint; **`deriveRecommendedParameterSetStatusFromBacktest`** maps advisory tiers to suggested registry statuses **without** writing the registry.
- **CSV:** TestEA-style snake_case headers (`trade_id`, `result_r`, …); missing **`result_money`** → import continues with **warnings**; row-level parse failures → **`ok: false`** and **no trades** returned.
- **Metrics:** profit factor uses gross win R / gross loss R; **no losing trades** but wins → **`Infinity`** sentinel (approval treats as passing PF floor).
- **Dashboard:** Backtests list adds **CP8 import eval** from **`getCheckpoint8MockApprovalForParameterSet`**; detail page shows fixture split + advisory block when a fixture exists for that `parameter_set_id`. All values remain **mock fiction** — not Strategy Tester output.
- **Tests:** `lib/mapazapp-core/tests/checkpoint8-backtest.test.ts`; dashboard **`src/services/backtestCheckpoint8Display.test.ts`**.

---

## 19. Strategy / parameter set read-only UI (checkpoint 9 — dashboard)

- **Read-only data source:** **`strategyRegistryDataSource.ts`** defines **`StrategyRegistryReadModelDataSource`**; **`mockStrategyRegistryDataSource.ts`** implements it with **`MOCK_CHECKPOINT7_STRATEGY_REGISTRY`** + core **`evaluateParameterSetCompatibility`** + checkpoint-8 advisory (`getCheckpoint8MockApprovalForParameterSet`). **No** `fetch`, **no** edits, **no** persistence.
- **UI helpers:** **`strategyRegistryUi.ts`** — badge classification, simple-language stories, compact IFVG settings summaries (Simple vs Technical density).
- **Routes:** **`/parameter-sets`** (list + account-scoped compatibility table) and **`/parameter-sets/:parameterSetId`** (detail: registry gate for TRADE_READY, compatibility codes, CP8 advisory block, settings). **`Layout`** uses **`supportsViewToggle`** on these pages.
- **Links:** Zone Detail registry panel → inspector; Backtests → inspector; Configuration → short registry summary + link.
- **Product rule surfaced in UI:** copy states that a **detected setup alone is insufficient**; **`allowTradeReview`** must be true for the active account/symbol for core to permit **`TRADE_READY`** (other gates unchanged). Unapproved sets never imply live profitability.
- **Tests:** **`src/services/mockStrategyRegistryDataSource.test.ts`** (service + UI helper assertions).

---

## 20. BridgeEA file contract reader skeleton (checkpoint 10 — `@workspace/mapazapp-core` + dashboard)

- **Modules:** `bridge-types.ts`, `bridge-import-result.ts`, `bridge-validators.ts` (`MZP_BRIDGE_V1` + legacy **`QTG_BRIDGE_V1`** alias — compatibility only), `bridge-csv-table.ts`, `bridge-parse-json.ts`, `bridge-parse-csv.ts`, `bridge-symbol-profile.ts`, `bridge-account-key.ts`, `bridge-fixtures.ts` — all **pure**, **no `fs`**, **no HTTP**, **no WebSocket**.
- **Contract source of truth:** `Mapazapp_Replit_Handoff_V1/03_MT5_BRIDGE_AND_DATA_CONTRACT/Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md` + **`Mapazapp_BridgeEA_Build_Spec_V1.md`**. CSV parsers require the **full** documented header sets — including **`last`** and **`session_status`** on `latest_market_snapshot.csv` (§9.3), even if some UI briefs list only a subset; omitting columns is a **fatal** `BRIDGE_CSV_MISSING_COLUMN` result.
- **`deriveSymbolMarketSpecFromBridgeMarketSnapshot`:** uses exported `spread_price` when finite and ≥ 0; otherwise derives **`spread_points * point`** via **`spreadPointsToPrice`** and emits **`BRIDGE_SYMBOL_PROFILE_INCOMPLETE`** (still returns a spec if other fields valid).
- **Positions / orders / deals / errors CSV:** header-valid + **zero data rows** is **`ok: true`** (empty positions/orders files are valid BridgeEA outputs). Market, account, and candles imports require **≥ 1** valid parsed row or they return **`ok: false`** with **`BRIDGE_CSV_EMPTY`**.
- **Dashboard:** `bridgeMockExportDataSource.ts` + `bridgeImportUi.ts` + `BridgePage` mock panel — parses core fixtures in memory only.
- **Tests:** `lib/mapazapp-core/tests/checkpoint10-bridge-contract.test.ts`; `src/services/bridgeMockExportDataSource.test.ts`.

---

## 21. Local backend foundation (checkpoint 11 — `@workspace/api-server`)

- **Routes:** `APP/artifacts/api-server/src/mapazapp/routes.ts` — all **`GET`**, mounted at **`/api/mapazapp/`** (see `../api-server/README.md` for paths).
- **Envelope:** `{ ok, data, warnings, errors[], source: "mock", mockOnly: true }`; trade-review list/detail also set **`reviewOnly: true`**, **`executionEnabled: false`** on the envelope.
- **Data:** `mockData.ts` duplicates account registry, snapshots, risk, prop firm, symbol mappings, zones, and backtest list rows from `artifacts/mapazapp/src/mock/*` with **stable ISO timestamps** for zones (dashboard still uses `Date.now()`-relative mocks). **`lib/tradeReviewLogic.ts`** mirrors `createMockDashboardDataSource` evaluation (registry + `evaluateTradeReviewPlan`).
- **Duplication:** `lib/mapMockZoneToCore.ts`, `lib/mapMockRiskToTradePlanGuard.ts`, and `lib/mockSymbolProfiles.ts` are copies of dashboard service modules — keep aligned or extract a shared package later.
- **Not implemented:** `POST` / commands, SQLite, real BridgeEA folder ingest, frontend `fetch` wiring to this API (future checkpoint).
- **TypeScript:** `api-server/tsconfig.json` dropped **`references`** to composite libs to avoid `TS6305` when declaration outputs are not pre-built; workspace `pnpm` links still resolve `@workspace/api-zod` / `@workspace/mapazapp-core`.
- **Tests:** `artifacts/api-server/src/mapazapp/mapazapp.routes.test.ts` (Vitest + supertest).
