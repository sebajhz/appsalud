# Mapazapp Trade Detection North Star

**Document purpose:** define the long-term direction of Mapazapp so implementation, optimization, research, and future symbol expansion remain aligned.

**Status:** strategic governance document  
**Scope:** Mapazapp research / TestEA / backtest / diagnostics / future multi-symbol profile design  
**Current benchmark:** XAUUSD, but not XAUUSD-only  
**Important:** Cursor implements explicit instructions. Cursor must not infer trading decisions.

---

## 1. Core Purpose

Mapazapp is not a fixed-entry XAUUSD bot.

Mapazapp is a structured trade detection and decision-support system designed to discover, measure, and validate a repeatable discretionary-style setup.

The current primary laboratory is XAUUSD because it is liquid, volatile, relevant to the user’s goals, and provides strong movement for research. However, the system must not be architected as an XAUUSD-only optimizer.

The real purpose is:

> Discover a robust, measurable, humanized setup logic first on XAUUSD, then evaluate which symbols naturally express that setup best.

---

## 2. North Star

Mapazapp must become a framework that can:

1. Detect structured trade context.
2. Evaluate multiple logical entry expressions.
3. Measure entry quality, fill feasibility, outcome, robustness, and execution realism.
4. Avoid overfitting to one symbol or one backtest.
5. Build validated symbol profiles only when evidence supports them.
6. Support future read-only forward validation before any operational decision.
7. Protect the trader from overtrading, false confidence, and curve-fitted rules.

The main rule:

> We do not optimize the system to fit one symbol.  
> We discover the setup, then measure which symbols express it best.

---

## 3. Humanized Setup Philosophy

Mapazapp does not assume that a valid trade always has one fixed entry model.

A professional trader may enter the same structural idea from different logical locations depending on:

- market context
- volatility
- displacement
- liquidity behavior
- retracement depth
- FVG/IFVG quality
- spread and slippage
- session
- risk distance
- target quality
- market regime

Therefore, Mapazapp’s goal is not to discover one universal entry.

The goal is to discover a **structured setup family** with multiple possible entry expressions.

Mapazapp must adapt the entry model to the market context.  
It must not force the market into a fixed entry model.

The goal is not more trades.  
The goal is better contextual selection.

---

## 4. Ideal Trade Mental Model

A high-quality Mapazapp trade should be understood as a sequence, not as a single signal.

```text
Market Context
   ↓
HTF Structure / Bias
   ↓
Liquidity Event
   ↓
Reaction / Displacement
   ↓
FVG / IFVG / Imbalance
   ↓
Entry Family Selection
   ├── Edge
   ├── 25%
   ├── 50% / CE
   ├── 75%
   └── Adaptive
   ↓
Invalidation Logic
   ↓
Liquidity Target
   ↓
Risk / Execution / Session Filters
   ↓
Decision:
   Trade / Wait / Reject
```

A valid setup should have:

- context, not just a signal
- structural direction or a documented reason for uncertainty
- liquidity logic
- reaction evidence
- displacement or imbalance evidence
- a logical entry model
- clear invalidation
- a liquidity target
- realistic risk/reward
- execution viability
- acceptable ambiguity
- no forced trade when context is weak

---

## 5. XAUUSD as Laboratory, Not Cage

XAUUSD is the primary research laboratory and may remain one of the main production symbols.

However:

- XAUUSD must not become a cage.
- The system must not be hardcoded around one symbol’s behavior.
- XAUUSD performance alone cannot approve a trading model.
- XAUUSD is used to discover and stress the setup first.

The system must later support testing on symbols such as:

- BTCUSD
- EURUSD
- GBPUSD
- NAS100
- US30
- other MT5 symbols supported by the broker

Symbols are selected by evidence, not preference.

Some symbols may be active, some ignored, and some only valid under specific market regimes.

If XAUUSD performs poorly during a period but EURUSD or BTCUSD expresses the setup better, the system should eventually be able to detect that through evidence.

---

## 6. Parameterized Setup Discovery

Mapazapp is not a fixed-entry system.

Mapazapp is a parameterized setup-discovery framework.

The goal is not to force one entry model into every market.  
The goal is to discover which configuration of the setup best represents each symbol, regime, and execution condition.

Mapazapp must treat the following as configurable research dimensions:

- entry family
- risk/reward
- FVG geometry
- liquidity sweep sensitivity
- reaction window
- displacement logic
- MSS/CHoCH sensitivity
- HTF structure lookback
- entry expiry
- max bars in trade
- spread/slippage buffer
- volatility/session behavior
- target quality
- frequency and risk discipline

A symbol should not receive hardcoded logic.

A symbol should receive a validated profile.

---

## 7. Core Setup vs Implementation

The core setup is the market idea.

The implementation is the current technical representation of that idea.

| Concept | Current Representation |
|---|---|
| Structured direction | D1 bias, H4/H1 structure |
| Liquidity behavior | sweep and liquidity chain diagnostics |
| Market shift | MSS / CHoCH |
| Imbalance | FVG / IFVG and future BISI/SIBI classification |
| Entry expression | edge, 25%, 50/CE, 75%, adaptive |
| Entry realism | fill feasibility, transition audit, edge robustness |
| Control entry | 50/CE official control |
| Future profile | symbol-specific calibrated configuration |

The implementation can evolve, but the core setup philosophy must remain governed.

---

## 8. Entry Family Philosophy

There is no single universal entry.

Current and candidate entry families:

- edge entry
- 25% FVG entry
- 50% / CE entry
- 75% deep entry
- adaptive entry

Current status:

- 50/CE is the official control.
- EVOS 50/CE parity has been fixed and validated.
- edge is the strongest candidate in the current XAUUSD benchmark bundle.
- edge is not approved yet because it is coupled with higher risk distance and execution sensitivity.
- 25/adaptive are moderate candidates but increase ambiguity.
- 75 is not a primary candidate at this stage.

No entry model is approved only because it performs well in one XAUUSD bundle.

Every entry model must survive:

1. technical validation
2. reconciliation against official control
3. transition analysis
4. robustness testing
5. execution realism analysis
6. future multi-symbol validation
7. forward demo read-only validation

---

## 9. Current System Capabilities

Mapazapp currently has diagnostic/export support for:

- D1 bias
- real FVG setup context
- liquidity sweep
- liquidity chain
- HTF structure H4/H1
- MSS / CHoCH
- Premium / Discount
- entry fill feasibility
- entry variant feasibility
- entry variant outcome simulation
- EVOS 50/CE reconciliation
- variant transition audit
- edge robustness audit

The system is becoming more humanized because it no longer treats the setup as one rigid entry. It now investigates which entry expression is most defensible under context.

---

## 10. Current State

Current checkpoint family:

```text
E5.13.6.x — entry variant, edge transition, and edge robustness investigation
```

Current understanding:

- XAUUSD remains the active benchmark.
- The official entry remains CE/50%.
- EVOS 50/CE parity was fixed and validated.
- Edge is the strongest candidate in the current XAUUSD bundle.
- Edge is not approved yet.
- Edge dominance is coupled with risk distance around 2x versus CE/50.
- 25/adaptive improve some metrics but increase ambiguity.
- The project remains in research/diagnostic mode.
- No live trading or funding readiness is approved.

---

## 11. What We Are Optimizing

Mapazapp is not currently optimizing “gold performance”.

Mapazapp is optimizing:

- setup detection quality
- contextual entry selection
- robustness of entry families
- risk/reward realism
- ambiguity reduction
- fill feasibility
- execution realism
- future transferability across symbols
- evidence-driven profile creation

The best configuration is not the one with the highest total R.

The best configuration is the one with the most defensible balance between:

- expectancy
- robustness
- execution realism
- sample size
- drawdown
- ambiguity
- expired/unfilled rate
- risk distance
- effective RR
- walk-forward stability
- transferability

---

## 12. What We Will Not Do Yet

Do not:

- approve live trading
- approve funding account usage
- optimize only for XAUUSD
- approve edge entry only because it dominated one bundle
- change the official entry model without evidence
- convert diagnostics into hard gates too early
- lower thresholds just to improve backtest numbers
- add real order execution
- let Cursor infer strategy decisions
- force the setup to operate every symbol
- approve a profile without robustness and forward evidence

---

## 13. Evidence Ladder

Mapazapp decisions must follow an evidence ladder:

```text
Observation
   ↓
Export
   ↓
Validation
   ↓
Reconciliation
   ↓
Transition Audit
   ↓
Robustness Audit
   ↓
Walk-forward / Out-of-sample
   ↓
Multi-symbol Comparison
   ↓
Forward Demo Read-only
   ↓
Evidence-based Gate / Score Decision
```

A component cannot become a hard gate without evidence across backtest, robustness, and forward read-only validation.

---

## 14. Near-Term Roadmap

### E5.13.6.9 — Edge Robustness Evidence

Document the corrected robustness audit evidence.

Goal:

- confirm whether edge remains interesting after buffer, risk distance, speed, unresolved cases, and execution realism proxies
- do not approve edge yet
- decide whether exact MQL5 buffered EVOS is required

### E5.13.6.10 — Buffered EVOS Decision (**cerrado — docs**)

**Decisión:** [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md)

- TypeScript proxy robustness is **useful for direction**, **not sufficient** to approve edge or change official entry.
- **Exact MQL5 Buffered EVOS is required** before any entry-model decision.
- **Manual-control guardrail:** Mapazapp remains manual/read-only decision support; the trader decides; no automatic execution until separate governance approves it.

### E5.13.6.11 — MQL5 Buffered EVOS Diagnostics (**completed — repo**)

Buffered EVOS summary rollups in TestEA (`MZP_TestEA_E5_13_6_11`): edge / p25 / p50 / adaptive × buffers 0–50 pts; diagnostic only. [`BUFFERED_EVOS_EXPORT_E5_13_6_11.md`](./BUFFERED_EVOS_EXPORT_E5_13_6_11.md). **Operator next:** Strategy Tester evidence before any entry-model decision.

### E5.13.6.12 — Entry Model Candidate Policy (renumbered placeholder)

Define a candidate policy, not a fixed entry.

Example:

```text
If context A → edge candidate
If context B → 25/adaptive candidate
If context C → CE/50 candidate
If context weak → reject/wait
```

This should remain research-only until validated.

### E5.14 — IFVG / BISI / SIBI Classification

Classify imbalance quality more professionally:

- bullish imbalance / bearish imbalance
- IFVG behavior
- BISI / SIBI
- inversion behavior
- clean, mitigated, inverted, or weak FVG

### E5.15 — Liquidity Target Quality

Measure whether the trade has a logical target:

- internal liquidity
- external liquidity
- equal highs/lows
- previous session levels
- HTF liquidity
- reasonable TP location
- target quality relative to entry risk

### E5.16 — Session / News / Spread / Volatility Context

Add execution context:

- session
- spread
- volatility
- possible news risk
- time-of-day behavior
- market speed
- broker constraints

Initially observation-only, not hard blocking.

### E5.17 — Frequency / Risk / Discipline

Add discipline diagnostics:

- max setups per day
- loss streaks
- daily drawdown
- overtrading
- exposure by symbol
- symbol correlation
- prop-firm risk context
- manual lock / psychology controls

### E5.18 — Setup State Contract

Export setup state for BridgeEA/dashboard:

- waiting for liquidity
- sweep detected
- reaction confirmed
- imbalance detected
- retest waiting
- entry candidate
- invalidated
- target reached

### E5.19 — Forward Demo Read-only

Read market in demo without placing trades.

Goal:

- detect setups in real time
- compare live detection vs backtest expectation
- generate alerts
- collect forward evidence
- no live execution

### E5.20 — Evidence-Based Gate / Score Decision

Decide which components can become:

- score
- filter
- gate
- alert condition
- profile requirement

No component becomes a hard gate without sufficient evidence.

---

## 15. Future Multi-Symbol Expansion

After the setup logic is stable on XAUUSD, Mapazapp should evaluate other symbols using the same framework.

The expansion process should be:

```text
Core Setup
   ↓
Symbol Candidate
   ↓
Optimization Campaign
   ↓
Walk-forward / Robustness Validation
   ↓
Candidate Symbol Profile
   ↓
Forward Demo Read-only
   ↓
Operational Candidate
```

A symbol profile may include:

- preferred entry family
- RR range
- FVG depth behavior
- sweep sensitivity
- spread/slippage buffer
- session rules
- volatility filters
- max trade frequency
- risk constraints
- profile version

Example names:

- XAUUSD_Profile_V1
- BTCUSD_Profile_V1
- EURUSD_Profile_V1
- NAS100_Profile_V1

Profiles must be evidence-driven.

---

## 16. Cursor Governance

Cursor must not infer trading decisions.

Cursor implements only explicitly specified tasks.

All trading logic changes must be:

- documented
- evidence-driven
- testable
- validated
- reversible
- aligned with this North Star

Cursor must not:

- approve entries
- change strategy intent
- lower thresholds to improve results
- add live trading APIs
- convert diagnostics into gates unless explicitly instructed
- commit local evidence CSVs marked `*_DO_NOT_COMMIT.csv`

---

## 17. Key Rule

> Mapazapp must not chase the best number.  
> Mapazapp must discover the most defensible trade logic.

And:

> Mapazapp has one core setup philosophy, but many possible calibrated profiles.
