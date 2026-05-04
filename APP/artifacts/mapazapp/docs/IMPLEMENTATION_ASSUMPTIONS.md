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
- **Parameter set approval:** `isMockParameterSetApprovedForAccount` requires **`mockBacktests`** row **`status === APPROVED`**, **`allowedAccountIds`** contains the account, and **`symbol`** field (comma-separated for multi-symbol sets) contains the zone’s **`symbol`**. Example: **`ps_alpha_01`** is **XAUUSD-only** — a mock **EURUSD** row with `ps_alpha_01` will evaluate with **`APPROVED_PARAMETER_SET_REQUIRED`** (intentional mismatch for gate demos).
- **Trade plan settings in UI:** `createDashboardTradePlanSettings()` clones core test defaults then sets **`testOrDevMode: false`**, **`requireAccountIdForGuard: true`**, and **`minScoreTrade`** from **`mockConfig.zoneScoring.minScoreForTradeReady`**.
- **Risk guard mapping:** `mapMockRiskToTradePlanGuard` sets **`allowTradeReview: risk.tradingAllowed`**, maps **`operationalStatus`** to drawdown/news/trade blocks, **`approvedParameterSetForAccount`** per zone evaluation, and **`propFirmBlocked`** only when mock prop status is **`BREACHED`** (no other prop rule math).
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
- **Mock mapper:** `mapMockRiskToTradePlanGuard` builds **`AccountGuardInput`** from **`AccountRiskGuardState`** (+ optional prop), calls **`evaluateAccountGuard`**, returns **`{ tradePlanAccountGuard, accountGuardResult }`**. **`getAccountGuardEvaluation(accountId)`** on the dashboard data source evaluates with **`approvedParameterSetForAccount: true`** (headline account snapshot, **not** zone-specific PS approval).
- **Tests:** `APP/lib/mapazapp-core/tests/account-guard.test.ts` covers OK, drawdown/max/trades/news/prop/psych/bridge/parameter-set/watch-only, and trade-plan **NO_TRADE** when **`allowTradeReview`** is false.
