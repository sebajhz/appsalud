# V2-01 — Engine Reality Audit / Test Fixtures Expansion

## Scope and safety

- Checkpoint focus: engine audit + synthetic fixture expansion + characterization tests.
- No execution added.
- No MT5 command channel added.
- No BridgeEA/TestEA logic modified.
- No DB/watcher/WebSocket/live scanner added.
- No POST endpoint or registry mutation added.
- No profitability claim.

## Fixtures added

New module: `APP/lib/mapazapp-core/src/engine-reality-fixtures.ts`

Included deterministic synthetic fixture sets:

- `CLEAN_BULLISH_IFVG`
  - Intended path: prior swing low -> sweep -> displacement/IFVG -> retest -> confirmation.
  - Intended outcome: candidate can become `TRADE_READY` only with account/registry/gate alignment.
- `NEAR_SWEEP_BULLISH_IFVG`
  - Imperfect liquidity interaction near dynamic tolerance.
  - Intended outcome: handled as `NEAR_SWEEP` style behavior (lower confidence, not auto-invalid).
- `OVER_SWEEP_BREAK_RISK`
  - Deep sweep without reclaim in probe window.
  - Intended outcome: `POSSIBLE_BREAK_RISK` characterization, lower confidence than clean setup.
- `LATE_TRADE_ALREADY_PASSED`
  - Zone idea with price already moved away.
  - Intended outcome: characterization only (current engine lacks explicit missed/late replay state).
- `BAD_RR_SETUP`
  - Valid-looking setup with strict R:R gate forcing rejection.
  - Intended outcome: non-`TRADE_READY` when `minRr` gate fails.
- `BEARISH_MIRROR_IFVG`
  - Sell-side mirror scenario.
  - Intended outcome: SELL path support (or explicit gap).

Also included:

- `ENGINE_REALITY_SYMBOL_PROFILES` for multi-symbol precision checks (`XAUUSD`, `EURUSD`, `USDJPY`, `NAS100`, `BTCUSD`).
- `createEngineRealityStrategySettings()` test-tuned deterministic settings (explicitly non-optimized, non-profitability evidence).

## Behaviors tested (human-analyst intent)

New test file: `APP/lib/mapazapp-core/tests/v2-01-engine-reality-fixtures.test.ts`

Coverage groups:

1. Fixture sanity: ordering, OHLC validity, minimum bars, stable metadata.
2. Dynamic tolerance: ATR/spread/tick scaling and non-universal values across symbols.
3. Clean bullish path: BUY candidate + `TRADE_READY` only when gates/approval are aligned.
4. Near-sweep characterization: imperfect liquidity is not discarded, stays constrained by current gating.
5. Over-sweep break-risk: explicitly riskier classification than clean sweep.
6. Bad R:R gate: `RR_BELOW_MINIMUM` blocks review-ready outcome.
7. Symbol precision: tolerance differs by symbol profile; no universal pip assumption.
8. Bearish mirror: SELL detection path is covered.
9. Late-trade characterization: current limitation documented via TODO for replay lifecycle.

## What current engine handles well

- Zone-first modeling (not fixed-point entries).
- Symbol-aware tick/point/spread handling.
- Dynamic tolerance formulas integrated in sweep/zone/ifvg/sl logic.
- Sweep classes (`CONFIRMED_SWEEP`, `NEAR_SWEEP`, `POSSIBLE_BREAK_RISK`) are usable in scoring and plan gating.
- Hard-gate discipline for R:R and account/approval constraints.
- Review-only semantics remain intact.

## What is partial

- Near-sweep policy is implemented but still calibration-dependent (no replay-based quality proof yet).
- Confidence score exists but broader context quality still depends on placeholder/synthetic components outside a full context engine.
- Trade lifecycle handles some states (`WAIT_*`, `INVALIDATED`, `EXPIRED`, `USED`) but is not replay-complete.

## What is missing

- Deterministic candle replay simulator for full lifecycle outcomes.
- Explicit missed/late-trade state and entry-window replay logic.
- MAE/MFE tracking and path-realistic outcome metrics.
- Rich context/bias engine (HTF/range/premium-discount/session depth).
- Full TP model variants beyond current fixed-R path.

## Honest checkpoint conclusion

- V2-01 improves observability and realism of fixture/test coverage.
- It does not prove profitability.
- It does not enable live trading.
- All fixtures are synthetic and test-oriented.

## Recommended next checkpoints

- V2-02: Candle replay trade simulator (deterministic lifecycle).
- V2-03: Entry/SL/TP model v1 upgrade over replay outputs.
