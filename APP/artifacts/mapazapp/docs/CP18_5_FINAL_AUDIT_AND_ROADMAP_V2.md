# CP18.5 — Final CP0–CP18 Audit and Roadmap V2 (engine/heart first)

## 1) Executive summary

- CP0–CP18 built a solid foundation: pure core modules, read-only dashboard/API surfaces, and separated MT5 artifacts (BridgeEA export-only and TestEA Strategy Tester virtual export-only).
- The plumbing is strong for a review-only phase: contracts exist, invariants are explicit, and safety posture is consistent (`executionEnabled: false`, `canAutoExecute: false`, no MT5 command channel).
- The trading engine is not yet proven profitable. Current strategy outputs are technically coherent but still heavily skeletonized in key areas (context, replay realism, lifecycle outcomes, and evidence loop depth).
- Roadmap V2 should prioritize proving and improving the engine/heart before adding execution or heavy infrastructure.

## 2) Architecture status

### `@workspace/mapazapp-core`

- **What exists:** IFVG pipeline modules, trade review plan evaluator, registry compatibility evaluator, account guard evaluator, backtest evidence evaluator, scanner simulation, forward monitor, assisted execution contract + CP18 invariants.
- **What is real:** Pure deterministic TypeScript domain logic and unit-tested gates/reason codes.
- **What is mock/simulated:** Single-series TF assumption in detection, synthetic scoring inputs in scanner simulation, synthetic sweep geometry in scanner simulation, advisory evidence statuses, no true candle-by-candle trade replay.
- **What is proven:** Structural correctness of module contracts and safety invariants in tests; review-only semantics are enforced.
- **What is not proven:** Strategy profitability, production robustness across symbols/brokers, and realistic execution-like outcomes from entry to exit on replayed candles.
- **What should come next:** Replay-based simulator + upgraded entry/SL/TP/lifecycle model + stronger context engine + out-of-sample evidence campaign.

### `dashboard` (`APP/artifacts/mapazapp`)

- **What exists:** Multi-page read-only UI with scanner simulation, forward monitor, assisted execution contract/safety pages.
- **What is real:** UI composition, account-scoped views, explanation surfaces, safety messaging.
- **What is mock:** Most datasets and monitor/scanner feeds are fixture-driven and in-process.
- **What is proven:** UX can present review states and explain blocks/reasons.
- **What is not proven:** UI decisions tied to a profitability-proven engine.
- **What should come next:** Keep UI stable with light cleanup while engine replay/evidence path matures.

### `api-server` (`APP/artifacts/api-server`)

- **What exists:** GET-only mock API endpoints for mapazapp domains, including scanner/forward monitor/assisted execution read-only contract surfaces.
- **What is real:** Envelope conventions, route contracts, safety flags and invariant surfaces.
- **What is mock:** In-memory fixtures; no persistence, no ingest daemon, no real market data stream.
- **What is proven:** Safety posture on API side (no execution endpoints, no POST execution path).
- **What is not proven:** Production data integration and model quality under real imported flow.
- **What should come next:** Minimal contract cleanup once engine/backtest model is stronger; avoid expanding infrastructure early.

### `BridgeEA` (`APP/artifacts/mt5/experts/Mapazapp_BridgeEA`)

- **What exists:** Export-only MT5 EA artifact with documented contract and smoke validation.
- **What is real:** Real compilation and real terminal smoke for export behavior.
- **What is mock:** Repo samples are fixtures; no live backend ingestion in app path.
- **What is proven:** Export discipline and separation (no execution, no command reader).
- **What is not proven:** End-to-end operational value because downstream live ingest/watch loop is absent by design.
- **What should come next:** Keep stable; later connect through controlled file import path after engine replay path is validated.

### `TestEA` (`APP/artifacts/mt5/experts/Mapazapp_TestEA`)

- **What exists:** Strategy Tester-only virtual exporter with contract and smoke validation.
- **What is real:** Real Strategy Tester compile/smoke and export artifact behavior.
- **What is mock:** Placeholder/virtual export semantics; not full IFVG strategy execution equivalence.
- **What is proven:** Artifact can produce structured tester-like outputs for import workflows.
- **What is not proven:** Strategy profitability or realistic trade outcome modeling equivalent to intended human-like engine.
- **What should come next:** Use as data source in a stricter replay/backtest evidence loop; avoid over-trusting placeholder rows.

## 3) Engine/Heart audit (direct answers)

| Question | Status | Assessment |
|---|---|---|
| A. Detect zones instead of fixed points? | **implemented** + **needs backtest proof** | `zone-candidate` builds padded zone ranges and midpoint, not a single fixed entry. |
| B. Symbol-aware precision? | **implemented** + **needs backtest proof** | `SymbolMarketSpec` + tick-based rounding/normalization are in place. |
| C. Dynamic ATR/spread/tick tolerance? | **implemented** + **needs backtest proof** | `normalize.ts` formulas are used in sweep/zone/ifvg/sl buffers. |
| D. Near-sweep / imperfect grabs? | **implemented (partial)** + **needs backtest proof** | `NEAR_SWEEP` exists and influences score/trade-ready gating, but calibration quality is unproven. |
| E. Confidence scoring? | **partial** | Weight model exists, but scanner currently injects placeholder components for context/risk quality. |
| F. SL/TP/R:R generation? | **partial** + **needs backtest proof** | `fixed_R` path exists in plan evaluator; other TP models remain placeholders. |
| G. Know when trade already passed? | **partial** | Lifecycle handles `USED/EXPIRED/INVALIDATED`; no full replay lifecycle proving missed/late trigger path over candle evolution. |
| H. Reject bad R:R? | **implemented** + **needs backtest proof** | Hard gate for `RR_BELOW_MINIMUM` exists in trade-plan gate flow. |
| I. Understand bias/context enough? | **skeleton** | HTF context model is explicitly not implemented in detection pipeline. |
| J. Human analyst behavior vs rule skeleton? | **mostly skeleton/partial** | Good building blocks exist, but still far from a fully contextual, replay-validated analyst engine. |

### Honest conclusion

Current core is not just empty scaffolding; it has meaningful primitives and guardrails. But the strategic intelligence layer is still incomplete for trust: context/bias depth, replay realism, lifecycle outcome simulation, and evidence robustness are not yet at the level required to treat the engine as proven.

## 4) Strategy profitability status

- We do not yet know if the current Mapazapp implementation is profitable.
- External IFVG concepts can be promising, but Mapazapp must validate its own implementation and parameterization.
- No parameter set should be trusted for serious decision support until it passes robust train/validation/forward evidence with out-of-sample discipline.

## 5) Backtest realism audit (current model capability)

| Capability | Status | Notes |
|---|---|---|
| Entry area | **implemented** | Entry zone bounds are represented. |
| Reference entry | **implemented (partial)** | Midpoint/confirmation-close logic exists; still simplified. |
| SL | **implemented (partial)** | Dynamic buffer model exists; structural depth is still limited. |
| TP | **partial** | `fixed_R` implemented; other target models not complete. |
| R:R | **implemented** | Computed and hard-gated in plan evaluation. |
| Invalidation | **partial** | Invalidation price and lifecycle check exist; path realism still limited. |
| Trade expiration | **partial** | Expiry field/check exists but not fully replay-driven. |
| Missed trade / already passed | **partial/missing** | No full trigger-window replay engine for robust missed/late classification. |
| Partial confirmation | **partial** | Confirmation quality exists, but lifecycle nuance is basic. |
| Outcome by candle path | **missing** | No deterministic full replay simulator from setup to outcome across bar evolution. |
| Max adverse excursion (MAE) | **missing** | Not tracked as replay metric in engine evidence flow. |
| Max favorable excursion (MFE) | **missing** | Not tracked as replay metric in engine evidence flow. |
| Spread modeling | **partial** | Spread enters formulas/gates; path-level slippage/spread evolution not fully modeled. |
| Symbol precision | **implemented** | Tick/point/digits semantics are strongly represented. |
| Account/risk guard | **implemented** | Guard evaluator and hard gate integration are present. |
| Parameter set approval gate | **implemented** | Registry compatibility enforces approval state for review tiers. |

## 6) Required engine improvements before more infrastructure

Priority order:

1. **True replay-based trade simulator over candles**
   - Deterministic bar-by-bar simulation from zone creation to terminal outcome.
   - Track trigger, invalidation, TP/SL, expiry, missed/late scenarios, MAE/MFE.

2. **Entry trigger model v1**
   - Support: retest entry, confirmation-close entry, midpoint/edge/full-zone entry mode.
   - Explicit trigger windows and “already passed” logic.

3. **SL model v1 upgrade**
   - Structure-aware stop options: beyond sweep, beyond zone, ATR/spread/tick buffer mix.
   - Strict tick normalization with symbol-specific constraints.

4. **TP model v1 upgrade**
   - Add opposing liquidity / prior high-low / hybrid TP models.
   - Compare model outcomes consistently in replay.

5. **Trade lifecycle state machine expansion**
   - `waiting`, `triggered`, `missed`, `invalidated`, `stopped`, `take_profit`, `expired`.
   - Event logging for each transition to support explainability and testing.

6. **Human-like tolerance calibration**
   - Near-sweep acceptance policy, wick-vs-close distinction, ATR/spread/tick-proportional tolerances.
   - Per-symbol calibration and stability testing.

7. **Bias/context engine upgrade**
   - HTF trend, range position, premium/discount context, session filters, manual/news blackout input.
   - Use context as weighted and gated signal, not decorative metadata.

8. **Confidence model refinement**
   - Replace placeholders with measured components from replay and context outputs.
   - Define hard gates vs soft score clearly and test both.

9. **Backtest evidence robustness**
   - Walk-forward protocol, train/validation/forward governance, symbol ranking campaign.

## 7) Roadmap V2 proposal (engine proof first)

### V2-01 — Engine Reality Audit / Test Fixtures Expansion
- **Goal:** expose all current skeleton assumptions with deterministic scenarios.
- **Adds:** richer synthetic + edge-case fixtures, gap coverage map.
- **Must not add:** execution, MT5 command channel, POST execution endpoints, DB/watchers.
- **Validation required:** failing tests first for missing behaviors, then green with explicit assumptions.
- **Definition of done:** documented coverage matrix for engine behaviors and open gaps.

### V2-02 — Candle Replay Trade Simulator
- **Goal:** simulate lifecycle outcomes over candle path.
- **Adds:** replay engine with deterministic event timeline and MAE/MFE tracking.
- **Must not add:** real execution or broker connectivity.
- **Validation required:** deterministic replay tests and scenario snapshots.
- **Definition of done:** reproducible outputs for trigger/miss/invalidate/SL/TP/expiry across fixtures.

### V2-03 — Entry/SL/TP Model v1
- **Goal:** implement realistic trigger and exit models aligned with blueprint.
- **Adds:** entry modes, SL/TP variants, explicit rule parameters.
- **Must not add:** auto-trading or command transport.
- **Validation required:** outcome tests per mode and symbol precision constraints.
- **Definition of done:** model outputs are reproducible and explainable with reason codes.

### V2-04 — IFVG Strategy Replay Backtest
- **Goal:** connect IFVG detection to replay outcomes, not just snapshot plan scoring.
- **Adds:** replay backtest orchestrator on historical candle runs.
- **Must not add:** claims of profitability beyond measured results.
- **Validation required:** regression suite with known scenario outcomes.
- **Definition of done:** backtest run artifacts include lifecycle metrics + event trace.

### V2-05 — Decision Model / Soft-Score Redesign
- **Goal:** separate **hard gates** from a **weighted soft score**, classify variants (primary / accepted / weak-observe / invalid), attach explainability, and feed IFVG replay traces without claiming profitability.
- **Adds:** `evaluateDecisionModel` + `IfvgReplayBacktestCandidateTrace.decisionModelResult` (optional `useDecisionModelScore` on replay settings).
- **Must not add:** execution, MT5 command channel, registry mutation, live infra.
- **Validation required:** `tests/v2-05-decision-model.test.ts` + existing replay regression tests.
- **Definition of done:** documented in `APP/artifacts/mapazapp/docs/V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md`.
- **Note:** older drafts that labeled “V2-05” as tolerance-only should use **V2-06** for tolerance calibration after this insertion.

### V2-06 — Human-like Tolerance Calibration
- **Goal:** unify near-sweep / oversweep / retest / chase / spread / wick / TP-distance tolerances into a **symbol-aware calibration matrix** that scores imperfect-but-valid behavior vs structurally broken conditions — without fixed universal pip ladders.
- **Adds:** `evaluateToleranceCalibration` (`tolerance-calibration*.ts`), `createToleranceCalibrationFixtures()`, optional `DecisionModelInput.toleranceCalibrationResult` + `DecisionModelSettings.toleranceIntegration` (blend / variant invalidation / optional hard gate), tests `tests/v2-06-tolerance-calibration.test.ts`.
- **Must not add:** live execution, MT5 command channel, profitability claims, replacement of `liquidity-sweep.ts` core geometry.
- **Validation required:** `pnpm --filter @workspace/mapazapp-core test` + typecheck; workspace `pnpm typecheck`.
- **Definition of done:** documented in `APP/artifacts/mapazapp/docs/V2_06_HUMAN_LIKE_TOLERANCE_CALIBRATION.md` (limitations + next step V2-07).

### V2-07 — HTF Bias / Context Engine v1
- **Goal:** measurable HTF bias (buy/sell/no-trade lean), premium/discount, trend/range/chop proxy, and H4/H1 conflict flag — feeding `contextQuality` instead of placeholder when data is supplied.
- **Adds:** `evaluateContextBias` (`context-bias*.ts`), `createContextBiasFixtureInputs()`, `DecisionModelInput.contextBiasResult`, `DecisionModelSettings.contextBiasIntegration`, optional `IfvgReplayBacktestInput.htfCandlesByTimeframe` / trace `contextBiasResult`, tests `tests/v2-07-context-bias-engine.test.ts`.
- **Must not add:** live execution, MT5 command channel, BridgeEA/TestEA edits, DB/watcher/WebSocket/live scanner, registry mutation, profitability claims, session engine (deferred).
- **Validation required:** `pnpm --filter @workspace/mapazapp-core test` + typecheck; workspace `pnpm typecheck`; dashboard build unchanged functionally.
- **Definition of done:** `APP/artifacts/mapazapp/docs/V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md` (limitations + next step V2-08).

### V2-08 — Entry Variant Model
- **Goal:** classify human-like entry styles (ideal / accepted / observe / late / missed / invalid) vs rigid exact-level thinking — depth in zone, timing vs plan, optional link to tolerance calibration — **review-only**.
- **Adds:** `evaluateEntryVariant` (`entry-variant*.ts`), `createEntryVariantFixtures()` inputs, optional `DecisionModelInput.entryVariantResult`, optional `EntrySlTpModelInput.entryVariantResult` (warnings only), tests `tests/v2-08-entry-variant-model.test.ts`.
- **Must not add:** execution, MT5 command channel, BridgeEA/TestEA edits, DB/watcher/WebSocket/live scanner, registry mutation, profitability claims.
- **Validation required:** `pnpm --filter @workspace/mapazapp-core test` + typecheck; workspace `pnpm typecheck`.
- **Definition of done:** `APP/artifacts/mapazapp/docs/V2_08_ENTRY_VARIANT_MODEL.md` (limitations + honest scope).
- **Note:** an older roadmap draft labeled “parameter-set optimization matrix” as V2-08 is **deferred** and not part of this checkpoint.

### V2-09 — Symbol Ranking Backtest Campaign
- **Goal:** rank symbols by robustness, not peak return.
- **Adds:** cross-symbol comparison on robustness metrics (PF/expectancy/DD/stability).
- **Must not add:** cross-symbol parameter reuse without validation.
- **Validation required:** out-of-sample reports and ranking rationale.
- **Definition of done:** shortlist of symbols + candidate sets with explicit risk notes.

### V2-10 — Dashboard/API Connection Cleanup
- **Goal:** reduce mock drift and align contracts to replay/evidence outputs.
- **Adds:** DTO cleanup and minimal wiring updates.
- **Must not add:** execution endpoints or command APIs.
- **Validation required:** API/dashboard tests with replay-driven payload fixtures.
- **Definition of done:** UI/API consume consistent evidence-first contracts.

### V2-11 — Local File Import from BridgeEA/TestEA exports
- **Goal:** controlled local import path for real exported files.
- **Adds:** explicit manual import workflow (read-only ingestion path).
- **Must not add:** file watcher daemon or command channel.
- **Validation required:** real export import tests with malformed-file handling.
- **Definition of done:** reproducible manual import checklist and parser reliability.

### V2-12 — Persistence Decision / SQLite local store
- **Goal:** decide if local persistence is required for evidence/session history.
- **Adds:** decision record and minimal schema only if justified.
- **Must not add:** premature heavy infra or live execution dependencies.
- **Validation required:** design review + migration/rollback plan.
- **Definition of done:** approved persistence decision with scope boundaries.

### V2-13 — Forward Demo Read-only Monitor with real imported files
- **Goal:** monitor replay/read-only outcomes using real imported data snapshots.
- **Adds:** stronger observational monitor based on imported artifacts.
- **Must not add:** auto-trading or order routing.
- **Validation required:** monitor consistency tests against replay/backtest state.
- **Definition of done:** reliable read-only monitor pipeline with audit-ready logs.

### V2-14 — Alerts/Notifications review-only
- **Goal:** provide disciplined review alerts from proven replay/context conditions.
- **Adds:** notification rules derived from validated engine states.
- **Must not add:** actionable execution automation.
- **Validation required:** false-positive/false-negative review on sample windows.
- **Definition of done:** alert quality thresholds and suppression rules documented.

### V2-15 — Re-evaluate assisted execution after proof
- **Goal:** re-assess whether assisted execution should evolve beyond contract-only.
- **Adds:** governance checkpoint decision, not automatic implementation.
- **Must not add:** direct execution by default.
- **Validation required:** evidence dossier (replay + out-of-sample + forward monitor).
- **Definition of done:** explicit go/no-go decision document for any CP19+ scope.

## 8) Immediate recommendation

**Recommendation: B — prioritize improving/proving the engine first.**

Reason: the heart (strategy detection + trade lifecycle realism + evidence robustness) represents ~80% of product value. Dashboard/API/executable wiring without a proven engine risks polished scaffolding around unproven decision quality.

Secondary note: light executable/startup scripts can be useful later, but only after the engine backtest/replay loop is stable and trusted.

## 9) Executables/startup plan (future, not immediate priority)

Planned operational convenience once engine loop is stronger:

- One command to start dashboard.
- One command to start api-server.
- One command/checklist for BridgeEA operator flow.
- One command/checklist for TestEA Strategy Tester export flow.
- Later packaging of Windows launchers (`.bat` / `.ps1`) for repeatable dev starts.

Current recommendation: defer packaging effort until replay/backtest proof path is mature.

## 10) Safety and scope confirmation

- No execution now.
- No auto-trading.
- No MT5 command channel.
- No DB/watchers/WebSocket unless explicitly planned in future checkpoint scope.
- No profitability claims at current stage.

## 11) Risk register

| Risk | Impact | Mitigation focus |
|---|---|---|
| Strategy not profitable | High | Replay realism + out-of-sample evidence before expansion. |
| Overfitting | High | Block-based optimization, walk-forward governance, sensitivity checks. |
| Fake confidence from placeholders | High | Replace synthetic score/context inputs with measured replay outputs. |
| Broker/symbol differences | Medium/High | Keep symbol-aware normalization + per-symbol calibration. |
| Spread/slippage under-modeled | High | Improve path-level cost modeling in replay and evidence metrics. |
| HTF bias/context too weak | Medium/High | Implement context engine and validate effect on quality. |
| UI maturity > engine maturity | Medium | Keep explicit “review-only / unproven profitability” messaging. |
| Execution-contract distraction | Medium/High | Freeze execution scope until engine proof checkpoint passes. |

## 12) Required tests for Roadmap V2

- Deterministic candle replay tests.
- Synthetic scenario tests (edge cases, near-sweep, break-risk, invalidation timing).
- Real MT5 export import tests (BridgeEA/TestEA file contract and parser robustness).
- Strategy replay tests (from detection through lifecycle outcome).
- SL/TP outcome tests across entry/SL/TP mode variants.
- Symbol precision tests (tick/point/digits normalization and rounding invariants).
- Multi-symbol parameter tests (no cross-symbol assumption leakage).
- Out-of-sample validation tests (train/validation/forward discipline).

## 13) Documentation updates for CP18.5

This checkpoint introduces:

- `APP/artifacts/mapazapp/docs/CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md` (this document).

And should keep pointer alignment in:

- `APP/artifacts/mapazapp/docs/CURSOR_HANDOFF.md`
- `APP/artifacts/mapazapp/docs/IMPLEMENTATION_ASSUMPTIONS.md`
- `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`

## 14) Final decision framing

Mapazapp after CP18 is a strong review-only foundation with meaningful engine primitives and strict safety boundaries. It is not yet a proven decision engine. Roadmap V2 should therefore optimize for strategy truth-finding, replay realism, and evidence quality first; infrastructure and any future assisted execution re-evaluation should remain downstream of that proof.
