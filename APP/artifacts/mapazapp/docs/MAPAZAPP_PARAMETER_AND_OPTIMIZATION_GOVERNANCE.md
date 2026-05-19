# Mapazapp Parameter and Optimization Governance

**Document purpose:** define how Mapazapp parameters, optimization campaigns, symbol profiles, and evidence-based decisions must be governed so the system remains configurable without becoming chaotic or overfit.

**Status:** governance document  
**Scope:** parameters, campaigns, optimization, profiles, anti-overfit, validation rules  
**Primary lab:** XAUUSD  
**Future scope:** multi-symbol profile validation

---

## 1. Core Principle

Mapazapp must be configurable, but not chaotic.

The system must support parameterized discovery of a setup, but it must not become a collection of uncontrolled knobs optimized only to make one backtest look good.

Main rule:

> Configurability is allowed only when it serves the setup logic and is validated by evidence.

### 1.1 Manual-control guardrail (E5.13.6.10)

Mapazapp is **manual / read-only decision support** until explicitly approved otherwise. It may detect, classify, export, score, alert, and explain setup states; it must **not** execute trades automatically. The final trade decision remains **manual**. See [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md).

---

## 2. Optimization Philosophy

Mapazapp does not perform “simple backtests”.

Mapazapp should support structured discovery campaigns where parameters are varied in controlled ranges to understand how the setup behaves under different market conditions.

The goal is not:

```text
Find the numbers that make XAUUSD look best.
```

The goal is:

```text
Discover which parameter ranges express the setup best under a given symbol, period, regime, and execution condition.
```

Symbol adaptation must be evidence-based, not curve-fitted.

---

## 3. Parameter Families

Parameters should be classified by governance level.

### A. Core Logic Parameters

These represent the setup’s market theory.

Examples:

- HTF structure
- liquidity sweep concept
- reaction logic
- displacement logic
- FVG / IFVG concept
- MSS / CHoCH concept
- invalidation logic
- liquidity target logic

Governance:

- change rarely
- require strong reasoning
- require docs
- require tests
- must not be modified just to improve backtest numbers

### B. Calibratable Parameters

These may vary by symbol, campaign, or profile.

Examples:

- `InpVirtualRiskReward`
- entry depth / entry family
- FVG minimum size
- sweep lookback
- local swing lookback
- MSS/CHoCH lookback
- HTF structure lookback
- entry expiry bars
- max bars in trade
- reaction window
- displacement threshold
- spread/slippage buffer
- session rules
- volatility filter
- min effective RR

Governance:

- can be optimized in controlled campaigns
- must use reasonable ranges
- must be documented
- cannot be approved by one metric only
- must pass robustness and validation rules

### C. Experimental Parameters

These are active research ideas.

Current examples:

- edge entry
- 25% entry
- adaptive entry
- buffered EVOS
- dynamic entry model candidate policy
- session/news/spread filters
- future profile auto-selection

Governance:

- observation/research only until approved
- no live usage
- no hard gate unless evidence ladder is completed
- must remain reversible

### D. Protected / Prohibited Changes

These must not be changed casually.

Examples:

- official outcome logic
- official control entry semantics
- thresholds lowered only to improve numbers
- hard gates created from one bundle
- live trading APIs
- broker execution code
- profile approval without out-of-sample evidence

Governance:

- require explicit owner approval
- require docs, tests, and evidence
- require clear rollback path

---

## 4. Backtest Campaign Governance

A valid campaign must define:

- symbol
- timeframe
- date range
- modeling assumptions
- parameter ranges
- optimization step sizes
- benchmark/control configuration
- expected export folder
- validation CLI commands
- evidence files
- decision criteria

A campaign should not be judged only by total R.

Minimum metrics:

- trade count
- win/loss count
- ambiguous count
- expired/unfilled count
- total R
- expectancy R
- winrate on decided trades
- ambiguous ratio
- expired ratio
- risk points
- effective RR
- drawdown
- max losing streak
- sample size
- parameter stability
- walk-forward behavior
- spread/slippage sensitivity
- forward read-only consistency

---

## 5. Anti-Overfit Rules

A configuration is not approved if:

- it only works in one period
- it only works due to one extreme parameter
- it has low sample size
- it has excessive ambiguous trades
- it has excessive expired/unfilled trades
- it depends on unrealistic fills
- it fails buffer/spread/slippage robustness
- it performs poorly out-of-sample
- it cannot be explained by market logic
- it beats the control but destroys execution realism
- it requires lowering thresholds without reason

Hard rule:

> The best configuration is not the one with the highest total R.  
> The best configuration is the most defensible balance between expectancy, robustness, execution realism, sample size, and transferability.

---

## 6. Symbol Profiles

A symbol profile is a validated configuration layer for one market.

A symbol profile is not a random optimized set.

A profile may include:

- symbol
- timeframe
- entry family preference
- RR range
- FVG behavior
- sweep sensitivity
- structure lookback
- volatility assumptions
- spread/slippage buffer
- session behavior
- max trade frequency
- risk constraints
- profile version
- validation status

Example profile names:

```text
XAUUSD_Profile_V1
BTCUSD_Profile_V1
EURUSD_Profile_V1
NAS100_Profile_V1
```

A profile can be created only after:

1. backtest evidence
2. robustness evidence
3. walk-forward/out-of-sample evidence
4. profile comparison against controls
5. forward demo read-only evidence

---

## 7. Entry Model Governance

Entry models are expressions of the setup, not separate strategies.

Current entry families:

- edge
- 25%
- 50% / CE
- 75%
- adaptive

Current control:

- 50% / CE

Current candidate:

- edge is strongest in the XAUUSD benchmark, but not approved
- 25/adaptive are moderate candidates, but ambiguous-heavy
- 75 is not a primary candidate

Rules:

- no entry model is approved from a single bundle
- no entry model is approved without reconciliation
- no entry model is approved without transition audit
- no entry model is approved without robustness audit
- no entry model is approved without execution realism analysis
- no entry model is approved before multi-period validation
- no entry model is approved for production before forward demo read-only

---

## 8. Risk and Execution Governance

A configuration must be evaluated under execution realism.

Required checks:

- spread/slippage buffer
- effective RR after buffer
- minimum effective RR
- risk distance
- TP distance
- entry distance from FVG
- bars to fill
- bars to close
- same-bar ambiguity
- unresolved trades
- broker point/tick behavior
- symbol volatility

Execution-sensitive findings must not be ignored.

If TypeScript proxy analysis is inconclusive, the next escalation should be exact MQL5 simulation, not approval.

---

## 9. Evidence Ladder for Parameter Approval

A parameter or entry model can move through stages:

### Stage 0 — Idea

A trading concept or parameter hypothesis.

### Stage 1 — Exported Observation

The system exports relevant fields.

### Stage 2 — Validated Bundle

The export contract validates correctly.

### Stage 3 — Control Reconciliation

The diagnostic does not contradict the official control.

### Stage 4 — Transition Audit

The system explains how outcomes change.

### Stage 5 — Robustness Audit

The idea survives buffer, risk, speed, and realism checks.

### Stage 6 — Walk-forward / Out-of-sample

The idea survives different periods.

### Stage 7 — Multi-symbol Comparison

The idea is tested on other symbols.

### Stage 8 — Forward Demo Read-only

The idea works in live market observation without trading.

### Stage 9 — Candidate Policy

The idea may become part of a candidate rule/policy.

### Stage 10 — Gate / Score / Alert

Only after sufficient evidence.

---

## 10. Campaign Result Decision States

A campaign can end with one of these states:

- **Rejected** — not useful or invalid
- **Diagnostic only** — useful insight, not a candidate
- **Needs exact simulation** — proxy evidence is not enough
- **Candidate for further testing** — promising but not approved
- **Candidate profile component** — may be included in a symbol profile
- **Forward demo candidate** — ready for read-only live observation
- **Approved gate/score candidate** — only after full evidence ladder

---

## 11. Configuration Scope

Mapazapp should eventually support three layers:

### Global Setup Defaults

Shared setup philosophy and default parameters.

### Symbol Profile

Market-specific calibrated profile.

### Campaign Override

Temporary research override used in backtest only.

Hierarchy:

```text
Global Setup Defaults
   ↓
Symbol Profile
   ↓
Campaign Override
```

Campaign overrides must not silently become production rules.

---

## 12. Documentation Requirements

Every major parameter change must document:

- why it exists
- what hypothesis it tests
- what files changed
- what metrics are expected
- what evidence is needed
- what is explicitly not approved
- how to validate
- how to roll back

Evidence docs must include:

- command run
- bundle path/name
- build
- trade count
- validation status
- important metrics
- interpretation
- decision
- next step

---

## 13. Cursor Governance

Cursor must implement only explicit instructions.

Cursor must not:

- infer trading strategy
- approve entry models
- lower thresholds without direction
- convert diagnostics into gates
- add live trading APIs
- commit local `*_DO_NOT_COMMIT.csv` files
- optimize by chasing numbers
- change official outcome semantics unless explicitly instructed

Cursor should:

- preserve existing contracts
- update tests
- update docs
- keep changes reversible
- report final git status
- keep MT5/Strategy Tester separate unless explicitly instructed

---

## 14. Current Immediate Governance Status

Current active family:

```text
E5.13.6.x — Entry variant and edge robustness research
```

Current rules:

- official entry remains 50/CE
- edge is not approved
- 25/adaptive are not approved
- 75 is not approved
- edge robustness evidence must be documented
- **E5.13.6.10 decided:** exact MQL5 buffered EVOS **is required** before entry-model decision — [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md)
- no live/funding/gates
- continue toward E5.14+ after the entry-model research checkpoint is closed or bounded

---

## 15. Recommended Near-Term Execution

1. ~~Document E5.13.6.9 edge robustness evidence.~~ **Done.**
2. ~~Decide E5.13.6.10 buffered EVOS.~~ **Done** — MQL5 required; see [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md).
3. ~~E5.13.6.11 MQL5 Buffered EVOS diagnostics.~~ **Done** — [`BUFFERED_EVOS_EXPORT_E5_13_6_11.md`](./BUFFERED_EVOS_EXPORT_E5_13_6_11.md).
4. ~~E5.13.6.12 smoke ST.~~ **Done** — [`BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md`](./BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md).
5. ~~E5.13.6.13 entry candidate policy (research).~~ **Done** — [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md).
6. ~~E5.14 IFVG/BISI/SIBI export (diagnostic).~~ **Done (repo)** — [`IFVG_BISI_SIBI_EXPORT_E5_14.md`](./IFVG_BISI_SIBI_EXPORT_E5_14.md).
7. ~~E5.14.1 IFVG/BISI/SIBI smoke ST.~~ **Done** — [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md). **No** edge approval without explicit governance.
8. ~~E5.15 Liquidity Target Quality export.~~ **Done (repo)** — [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md).
9. ~~E5.15.1 Liquidity Target Quality smoke ST.~~ **Done** — [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md). **No** TP change; **no** edge approval.
4. Define entry model candidate policy only if buffered evidence supports it (post-11).
4. Continue roadmap:
   - ~~**E5.15.1** liquidity target smoke ST.~~ **Done** — [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md).
   - ~~**E5.15.2** target realism audit (research).~~ **Done (repo)** — [`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md).
   - ~~**E5.15.3** operator evidence post-audit.~~ **Done** — [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md); PASS; **no** TP/entry change.
   - ~~**E5.15.4** target policy research.~~ **Done** — [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md); official TP RR2 unchanged.
   - ~~**E5.16** session/spread/volatility context V1 export.~~ **Done (repo)** — [`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md); build `MZP_TestEA_E5_16`.
   - ~~**E5.16.1** operator smoke + bundle validation.~~ **Done** — [`SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md`](./SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md); PASS; **no** threshold/TP/entry change.
   - ~~**E5.16.2** execution environment calibration audit.~~ **Done (repo)** — [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md); CLI `mapazapp:testea-execution-environment-calibration-audit`.
   - **E5.16.3** operator evidence post-calibration audit (next)
   - E5.17 frequency/risk/discipline
   - E5.18 setup state contract
   - E5.19 forward demo read-only
   - E5.20 evidence-based gate/score decision

---

## 16. Final Governance Rule

> Mapazapp can be configurable, but every configurable dimension must have a purpose, a range, a metric, and an evidence requirement.

If a parameter cannot be explained by setup logic, it should not be optimized.
