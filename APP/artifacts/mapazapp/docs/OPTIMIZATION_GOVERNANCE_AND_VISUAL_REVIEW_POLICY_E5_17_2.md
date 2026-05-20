# Optimization Governance and MT5 Visual Review Policy — E5.17.2

**Status:** Policy only (governance). **No** code, parameter, MT5 optimization implementation, visual mode, gates, or live trading.

**Baseline:** E5.17 export complete — [`FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md`](./FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md) (`MZP_TestEA_E5_17`).

**Related:** [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md), [`SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md`](./SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md), [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md).

---

## 1. Why this checkpoint exists

Mapazapp now exports rich diagnostics: setup quality, liquidity chain, HTF structure, MSS/CHoCH, premium/discount, IFVG/BISI/SIBI, liquidity target geometry, session/spread/volatility, execution environment, and frequency/risk discipline. That stack supports **explanation and research**, not automatic promotion of parameters.

Before multi-symbol and multi-profile calibration, optimization must be **governed**. Without policy, the natural failure mode is:

- curve-fitting XAUUSD M15 in one period;
- copying “winning” inputs to EURUSD, BTCUSD, or indices without validation;
- optimizing net profit while ignoring ambiguous outcomes, target quality, execution stress, and overtrading;
- treating MT5 genetic optimization winners as production-ready.

**E5.17.2** formalizes how Mapazapp will be optimized in the future across symbols and timeframes. Mapazapp is **not** an XAUUSD-only bot. **XAUUSD is the primary laboratory**; other instruments follow the same setup logic under **symbol/timeframe profiles**.

---

## 2. Optimization philosophy

| Principle | Meaning |
|-----------|---------|
| **Optimize the setup, not the symbol** | Parameters must express Setup V1 logic (bias, sweep, displacement/FVG, structure, entry, target, discipline) — not accidental quirks of one chart. |
| **XAUUSD = laboratory** | Discovery, smoke, audits, and first profile drafts run on XAUUSD M15; results are **hypotheses**, not universal defaults. |
| **Profiles, not global knobs** | Each symbol/timeframe gets a named profile (e.g. `XAUUSD_M15_Profile_V1`) with its own calibratable ranges after evidence. |
| **Export-first evidence** | Tester runs produce CSV/JSON bundles; decisions happen **outside** MT5 via validators, audits, and governance review. |
| **Manual final decision** | Mapazapp remains read-only decision support until explicitly approved otherwise; optimization informs, it does not auto-trade. |

> Find parameter ranges that make the **setup** robust under a profile — not numbers that make **one** backtest green.

---

## 3. Optimization levels

Levels are cumulative in rigor; skipping levels is not allowed for **profile approval**.

| Level | Purpose | Typical tooling | Promotion |
|-------|---------|-----------------|-----------|
| **Single-run smoke** | Wiring, export schema, build sanity | One ST run, `mapazapp:testea-export-validate` | None — technical only |
| **Parameter sweep** | Local sensitivity, grid on few calibratable dims | Scripted grids / small Cartesian sweeps on exported bundles | Research notes only |
| **MT5 genetic optimization** | Broad discovery of ranges | Strategy Tester optimization mode | **Candidates only** — must export and analyze externally |
| **Train / validation / forward** | Holdout discipline | Split periods; train tune, validation select, forward confirm | Required before profile draft |
| **Walk-forward** | Stability across rolling windows | Rolling train/test windows on same profile | Required for profile approval |
| **Multi-symbol comparison** | Transfer and contrast | Same setup logic, different profiles (EURUSD, BTCUSD, NAS100, …) | No single-symbol approval |
| **Forward demo read-only** | Human + live-like context without execution | Read-only forward monitor / demo observation | Required capstone before any live discussion |

**Rule:** Higher levels cannot be replaced by more runs at a lower level.

---

## 4. Symbol / timeframe profiles

Future profiles (V1 naming convention):

| Profile ID | Role (initial) |
|------------|----------------|
| `XAUUSD_M15_Profile_V1` | Primary laboratory; first calibrated profile target |
| `EURUSD_M15_Profile_V1` | FX transfer test; spread/session differ from metals |
| `BTCUSD_M15_Profile_V1` | Crypto regime; volatility/spread unlike FX/metals |
| `NAS100_M15_Profile_V1` | Index CFD; session and gap behavior differ |

Each profile may eventually own **calibratable** subsets of:

- Volatility / spread / session thresholds (E5.16 family)
- FVG / IFVG parameters (E5.14 family)
- Sweep / MSS / CHoCH parameters
- Premium / discount parameters
- Entry candidate policy (research — official remains 50 % / CE until governance approves change)
- Target policy (research — official TP remains fixed RR2 until governance approves change)
- Frequency / risk / discipline thresholds (E5.17 family)

Profiles **do not** redefine core setup meaning (protected parameters). They adapt **ranges** and **stress labels** to instrument behavior. See [`SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md`](./SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md).

---

## 5. Parameter governance

Classification (aligns with [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)):

| Class | Description | Optimization |
|-------|-------------|----------------|
| **Core / protected** | Market theory of Setup V1: bias role, sweep concept, FVG/IFVG definition, MSS/CHoCH role, invalidation, official entry (50 % / CE), official TP (RR2), virtual outcome rules | **Cannot** be optimized casually; change requires governance + docs + tests |
| **Calibrable** | Profile-specific thresholds: lookbacks, point buffers, session hours, spread/ATR buckets, discipline caps, score weights (diagnostic) | Optimize only within **documented ranges** per profile |
| **Experimental** | Edge entry variants (25 %, adaptive), adaptive TP, gates, auto filters | **Research-only** — export and audit; no promotion without explicit decision doc |
| **Prohibited** | Anything that changes strategy meaning, hides losses, disables ambiguity reporting, or optimizes to a single metric (e.g. net profit only) | **Forbidden** |

Every optimizable parameter must have: **purpose**, **allowed range**, **metric(s)**, and **evidence requirement**.

---

## 6. Anti-overfit rules

A symbol/timeframe profile **cannot** be approved from one bundle or one genetic optimization pass.

**Minimum evidence bar for profile draft (not live):**

1. **Multi-period validation** — performance and diagnostics stable across ≥2 non-overlapping validation windows.
2. **Out-of-sample** — parameters chosen on train/validation must be reported on held-out forward slice(s).
3. **Walk-forward** — at least one walk-forward protocol documented (window length, step, pass/fail criteria).
4. **Minimum trade count** — sufficient virtual trades for statistical sanity (profile-specific floor TBD in campaign design; never approve on &lt;30 trades without explicit exception doc).
5. **Drawdown review** — max daily R, consecutive losses, discipline flags reviewed (E5.17).
6. **R expectancy review** — expectancy R and distribution, not only win rate.
7. **Robustness under execution stress** — session/spread/volatility buckets (E5.16); flag concentration in `extreme` spread or `unknown` session.
8. **Manual forward demo read-only** — operator confirms behavior matches exported narrative before any live conversation.

**Automatic reject signals (research):**

- Best params only on one narrow date range.
- Profit concentrated in &lt;10 % of trades.
- Rising ambiguous/unresolved rate when “optimizing.”
- Discipline warnings ignored (overtrading, revenge, daily loss limit context).
- Target quality or liquidity target conflicts worsening while profit rises.

---

## 7. Optimization scoring

**Do not optimize only for net profit** (or MT5 default custom max).

Future **profile scoring** (campaign-level, outside MT5) should combine:

| Dimension | Source (current / planned) |
|-----------|---------------------------|
| Expectancy R | `result_r`, summary metrics |
| Drawdown | Daily R, discipline, equity curve if exported |
| Trade frequency | Discipline pre-trade counts, trades/day |
| Win rate | Outcomes — secondary to expectancy |
| Profit factor | If available — secondary |
| Ambiguous / unresolved rate | Outcome mode, ambiguity audits |
| Target quality | E5.15 liquidity target export |
| Execution environment | E5.16 session/spread/volatility + calibration audit |
| Discipline risk | E5.17 flags and score |
| Setup quality checklist | **E5.18** (future) — composite readiness |

Scoring is **multi-objective** or **weighted diagnostic index** — weights are governance decisions per profile, not hard-coded in TestEA without approval.

---

## 8. MT5 optimization usage

**Allowed:** Strategy Tester **genetic optimization** (and complete/grid where feasible) for **parameter discovery** on calibratable inputs, with:

- `optimization_safe_exports` / short folder labels when running large campaigns ([`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md)).
- Full `optimization_parameters` + summary flags preserved in JSON.
- Every promising pass exported as a bundle and validated:  
  `pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "<path>" --json`

**Not allowed:**

- Treating optimization pass #1 as approved profile.
- Optimizing core/protected parameters without governance.
- Approving edge entry or non-RR2 TP via optimization alone.
- Live `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest` from TestEA.

**Workflow:** MT5 discovers candidates → export → TypeScript validators/audits → governance doc → optional profile version bump. **Promotion is always outside MT5.**

---

## 9. MT5 Visual Trace Mode (future concept)

**Optional future mode** for Strategy Tester **visual review** (not for bulk optimization).

**May display (read-only overlay / objects):**

- FVG / IFVG / BISI / SIBI zones
- Liquidity sweep levels and direction
- MSS / CHoCH breaks
- Premium / discount range and entry zone
- Entry candidates: edge / 25 % / 50 % / adaptive (research visualization only)
- Official TP / SL geometry
- Nearest liquidity target vs official TP
- Session / spread / volatility context
- Discipline state (counts, cooldown, risk flags)
- **Setup Readiness Checklist** summary (E5.18)
- Final read-only decision label: **Candidate** / **Wait** / **Reject**

**Governance:**

- Visual Trace Mode is **explanatory** — same as CSV diagnostics; **not** a gate and **not** auto-execution.
- **Disabled during large optimization runs** — would slow MT5 and encourage visual overfitting.
- Implementation is **not** part of E5.17.2; this section defines intent only.

---

## 10. Setup Readiness Checklist relationship

Optimization should eventually consume **blocker reasons** and checklist components (North Star **E5.18**), including:

| Blocker theme | Typical diagnostic source |
|---------------|---------------------------|
| Weak IFVG | E5.14 classification score / reasons |
| Target poor | E5.15 liquidity target quality |
| Session poor | E5.16 session bucket / off-session |
| Volatility profile mismatch | E5.16 volatility bucket vs profile policy |
| Overtrading risk | E5.17 discipline flags |
| Entry fragile | Entry fill / variant feasibility exports |
| Discipline blocker | E5.17 daily/session limits, loss streak, cooldown |

Campaign review should **penalize** parameter sets that increase checklist **Reject** or **Wait** rates without improving expectancy R on validation. Checklist is the bridge between raw optimization metrics and **professional trader** decision quality.

---

## 11. Current decision

| Item | Decision |
|------|----------|
| E5.17.2 policy document | **Adopted** (this file) |
| MQL5 / TypeScript changes | **None** |
| Parameter changes | **None** |
| MT5 optimization implementation | **Not yet** |
| Visual Trace Mode | **Not yet** |
| Gates / live trading | **No** |
| Official entry (50 % / CE) | **Unchanged** |
| Official TP (fixed RR2) | **Unchanged** |
| Edge / 25 % / adaptive | **Not approved** |

**Next recommended sequence:**

1. ~~**E5.17.1** operator smoke.~~ **Done** — [`FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md`](./FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md).
2. ~~**E5.17.1.1** CSV header cleanup.~~ **Done** — [`CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md`](./CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md).
3. ~~**E5.18** smoke operador.~~ **Done** — [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md) (observation-only; no gate).
4. ~~**E5.18.2** decision calibration audit (repo).~~ **Done** — [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md). **Siguiente:** E5.18.3 evidencia operador.
5. Profile-specific calibration campaigns under this policy (XAUUSD first, then cross-symbol).

---

## References

- Parameter governance: [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
- Execution profile vocabulary: [`SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md`](./SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md)
- Discipline export: [`FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md`](./FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md)
- Humanization roadmap: [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)
