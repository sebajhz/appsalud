# Symbol / Timeframe Execution Profile Policy — E5.16.4

**Status:** Research-only policy / governance document. **Not** an approval of MQL5 threshold changes, profile-calibrated gates, or live execution filters.  
**Official entry (unchanged):** **50 % / CE**.  
**Official TP (unchanged):** **fixed RR2** (benchmark `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`).  
**Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

**Evidence chain:** E5.16 export → E5.16.1 smoke → E5.16.2 calibration audit CLI → E5.16.3 operator evidence — [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md).  
**Related target policy:** [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md).

---

## 1. Why this checkpoint exists

**E5.16.3** showed that **volatility thresholds must not be globally hardcoded** across symbols and timeframes when used for **calibrated environment grading**.

On the benchmark bundle XAUUSD M15 (`trade_count` 1697, `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`):

- MQL5 V1 ATR thresholds **80 / 250 / 400** (points) classify **1213** trades (~71.5 %) as `volatility_extreme`.
- TypeScript re-simulation of the same thresholds on exported ATR matches the export (`EXPORTED_BUCKETS_MATCH_MQL5_V1_SIMULATION`).
- Research candidates **B** (200 / 700 / 1200) and **C** (percentile p25 / p75 / p90) produce more plausible distributions for this symbol/timeframe — but are **not approved** for MQL5 change.

**XAUUSD M15** therefore needs **profile-aware interpretation**: the same numeric bucket labels mean different things on EURUSD M15, NAS100 M15, or BTCUSD M15. Mapazapp must govern **how** execution-environment context is read before any future calibration changes TestEA inputs.

E5.16.4 closes the **policy** layer for the E5.16 session/spread/volatility block. It does **not** implement new thresholds in MQL5 or TypeScript.

---

## 2. Execution profile concept

An **execution profile** is a named, versioned configuration that describes how Mapazapp interprets **execution environment** for a **symbol + timeframe** (and optionally broker/session assumptions).

### Example profile IDs (future)

| Profile ID | Scope |
|------------|--------|
| `XAUUSD_M15_Profile_V1` | Primary laboratory — gold M15 |
| `BTCUSD_M15_Profile_V1` | High-volatility crypto M15 |
| `EURUSD_M15_Profile_V1` | Major FX M15 |
| `NAS100_M15_Profile_V1` | Index M15 |

Each profile **may** define (when validated):

| Dimension | Examples |
|-----------|----------|
| **Volatility** | `low` / `high` / `extreme` ATR point thresholds (not global 80/250/400) |
| **Spread** | `warning` / `high` / `extreme` point thresholds |
| **Session** | Preferred windows (London, NY, overlap); off-session handling |
| **Timezone** | `session_timezone_offset_hours` mapping policy |
| **Off-session** | Materiality rules (e.g. checklist flag vs hard block) |
| **Environment score** | How to read `execution_environment_grade` under this profile |

### Classification modes (vocabulary)

| Mode | Meaning |
|------|---------|
| **raw_v1** | Buckets from current MQL5 E5.16 V1 export (`session_bucket`, `spread_bucket`, `volatility_bucket`, `execution_environment_grade`) |
| **stress_label_v1** | Same export fields, interpreted as **stress / conservative** labels only — not final calibrated grade |
| **profile_calibrated** | Future: buckets recomputed or re-labeled using an **approved** profile — **not active** until governance approves |

Until a profile is approved, exports remain **raw_v1** / **stress_label_v1** only.

---

## 3. Current XAUUSD M15 policy

Based on E5.16.3 evidence (`MZP_TestEA_E5_16`, bundle SET001):

### Spread

| Bucket | Count | Policy note |
|--------|------:|-------------|
| `normal` | 1694 | **Spread is not the primary issue** on this ST benchmark |
| `warning` / `high` | 3 | Monitor in checklist; not a campaign blocker alone |
| `extreme` | 0 | |

### Session

| Bucket | Count | Policy note |
|--------|------:|-------------|
| `off_session` | 479 (~28 %) | **Material** — include in Setup Readiness Checklist |
| Other sessions | 1218 | Asian / London / overlap / NY populated |

### Volatility (MQL5 V1 export)

| Bucket | Count | Policy note |
|--------|------:|-------------|
| `normal` | 133 | |
| `high` | 351 | |
| `extreme` | 1213 | V1 **too strict** for calibrated classification on XAUUSD M15 |

### Research candidates (not approved)

| Candidate | Thresholds (ATR pts) | extreme count | Status |
|-----------|----------------------|--------------:|--------|
| MQL5 V1 (stress) | 80 / 250 / 400 | 1213 | **Official export** — use as **stress label only** |
| Candidate B | 200 / 700 / 1200 | 244 | Research — plausible for M15 gold |
| Candidate C | p25=374.5, p75=948.79, p90=1359.73 | 170 | Research — bundle-relative |

### Environment grades (V1 score)

Weak + None dominate (~62 %). Under V1, grades are **dominated by volatility extreme** (`ENV_SCORE_DOMINATED_BY_VOLATILITY`). Do **not** treat Weak/None as automatic trade rejection without profile context and other checklist dimensions.

### XAUUSD M15 policy summary

| Rule | Decision |
|------|----------|
| MQL5 V1 80/250/400 | **Too strict** for calibrated classification on XAUUSD M15 |
| V1 export buckets | Remain **useful as stress labels** |
| Candidate B / C | **Research only** — no MQL5 change from E5.16.4 |
| Threshold change | **Not approved** |

---

## 4. Governance rules

| Rule | Requirement |
|------|-------------|
| **Single-bundle approval** | A profile **cannot** be approved from one bundle only (e.g. SET001 alone). |
| **Multi-period evidence** | Threshold changes require consistent behavior across **multiple periods** / campaigns. |
| **Out-of-sample** | Holdout or forward segments must not degrade only in-sample. |
| **Walk-forward** | Walk-forward validation required before any production-facing calibration claim. |
| **Per-symbol comparison** | XAUUSD evidence does **not** transfer to EURUSD, BTCUSD, NAS100 without symbol-specific runs. |
| **Gates** | Profile labels **must not** be used as automated trade gates until **explicit governance** approves gate design. |
| **Dashboard / checklist first** | **Explain** environment context to the trader before any filtering automation. |
| **Official TP / entry** | Profile policy does **not** change fixed RR2 TP or 50 %/CE entry. |
| **Edge / variants** | No edge, 25 %, or adaptive approval from environment profiles. |
| **Live / orders** | No `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`; Mapazapp remains manual / read-only unless explicitly changed elsewhere. |

**Evidence bar for future MQL5 threshold change:** document profile ID, symbol, timeframe, before/after bucket distributions, outcome crosstabs (research), OOS/WF summary, and governance sign-off — separate hito from E5.16.4.

---

## 5. Setup Readiness Checklist integration (future E5.18)

When the Setup Readiness Checklist is implemented, each setup review should surface **execution environment** with explicit mode:

| Checklist field | Source / intent |
|-----------------|-----------------|
| **Profile used** | e.g. `XAUUSD_M15_Profile_V1` or `raw_v1` / `stress_label_v1` |
| **Session bucket** | `session_bucket` from export |
| **Spread bucket** | `spread_bucket` |
| **Volatility bucket** | `volatility_bucket` |
| **Environment grade** | `execution_environment_grade` |
| **Environment blocker reason** | Parsed from `execution_environment_reasons` + policy (e.g. off_session, volatility_extreme stress) |
| **Classification mode** | `raw_v1` \| `profile_calibrated` \| `stress_label_only` |

**Principle:** checklist **informs** wait/reject decisions by the trader; it does **not** auto-block virtual trades or exports without governance.

Combine with E5.15 target policy labels and E5.13 entry policy — environment is one **dimension**, not a standalone approval rule.

---

## 6. Relationship with multi-symbol vision

Mapazapp is **not** optimizing only for XAUUSD.

- **XAUUSD** is the **primary laboratory** (liquid, volatile, relevant to current goals).
- The **core setup** (structure, liquidity, FVG, official entry family, RR2 control) is symbol-agnostic at the research framework level.
- **Execution environment** (spread, session, volatility, ATR scale) is **symbol- and timeframe-dependent**.

Profile policy allows the system to **adapt interpretation** per symbol without corrupting the core strategy or overfitting one backtest:

- A threshold that is “extreme stress” on XAUUSD M15 may be “normal” on EURUSD M15.
- Future symbols (BTCUSD, NAS100, US30, etc.) receive **profiles only when evidence supports them** — not by copying XAUUSD numbers.

> Discover the setup first; measure which symbols express it best; calibrate **how** environment is read per profile — do not hardcode one symbol’s ATR scale globally.

---

## 7. Current decision (E5.16.4)

| Item | Status |
|------|--------|
| E5.16.4 policy document | **Closed** (docs/governance only) |
| MQL5 threshold change | **No** |
| Entry 50 % / CE | **No change** |
| TP fixed RR2 | **No change** |
| Edge / gates / live | **No** |
| E5.16 V1 in TestEA | Unchanged — **stress labels** remain valid |
| Profile-calibrated buckets in export | **Not implemented** |
| E5.16 block (policy) | **Closed** at governance level after E5.16.4 |

**Next recommended technical milestone:** **E5.17** — Frequency / Risk / Overtrading Discipline V1 (see [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)).

Optional later: implement checklist fields (E5.18) consuming E5.16 export + this policy vocabulary.

---

## References

- Export: [`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md)
- Smoke: [`SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md`](./SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md)
- Audit: [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md)
- Evidence: [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md)
