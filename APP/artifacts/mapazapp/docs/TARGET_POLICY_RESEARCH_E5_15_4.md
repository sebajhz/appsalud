# Target Policy — Conservative RR vs Liquidity Target (Research E5.15.4)

**Status:** Research-only policy document. **Not** an approval of liquidity-aligned TP, extended TP, partial targets, or any change to official TP.  
**Official TP (unchanged):** **fixed RR2** on virtual trades (benchmark `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`).  
**Official entry (unchanged):** **50 % / CE**.  
**Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

**Evidence chain:** E5.15 export → E5.15.1 smoke → E5.15.2 audit CLI → E5.15.3 operator evidence — [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md).  
**Related entry policy:** [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md).

---

## 1. Why this checkpoint exists

**E5.15.3** showed that on the benchmark bundle (`trade_count` 1697):

- **1249** trades (~73.6 %) have official TP **before** nearest detected liquidity (`before_nearest_count`).
- Only **406** trades (~23.9 %) have TP **reaching** supported liquidity (`supported_count` = `reached_by_tp_count`).
- Median nearest/TP distance ratio ≈ **3.23×**; average official TP distance ≈ **280.86** points vs nearest liquidity ≈ **960.74** points.

Interpretation flags included `OFFICIAL_TP_OFTEN_CONSERVATIVE`, `LOW_SUPPORTED_TARGET_RATIO`, `TARGET_QUALITY_DOMINATED_BY_GRADE_C`, and `TARGET_REALISM_NEEDS_PROFILE_RESEARCH`.

**This does not mean the official RR2 TP is wrong.** Fixed RR2 is a deliberate, stable control: comparable across campaigns, aligned with virtual-trade outcome logic, and independent of discretionary pool selection. The audit means Mapazapp needs a **target policy vocabulary** so traders and future dashboards can explain:

- what the **official** target is doing;
- how **detected liquidity** relates to that target;
- when a setup might warrant **wait** or deeper research — without auto-switching TP or outcomes.

E5.15.4 closes the **policy** layer for the E5.15 target block. It does **not** implement new TP logic in MQL5 or TypeScript.

---

## 2. Target family roles

| Family | Definition | Role in Mapazapp | Status |
|--------|------------|------------------|--------|
| **Conservative RR Target** | Current **official fixed RR2 TP** (e.g. 2R from entry vs SL on virtual trades). | **Official control and benchmark.** Simple, stable, campaign-comparable. Outcomes and R metrics remain tied to this TP until explicit governance changes it. | **Official** (unchanged) |
| **Liquidity-Aligned Target** | Hypothetical TP placed near detected **swing / equal level / HTF external** liquidity (nearest pool, supported target). | **Research-only explanatory lens.** Uses E5.15 export fields (`liquidity_target_*`, `reached_by_tp`, grades). Explains “what liquidity would have implied” vs what RR2 actually took. | **Research** — **not approved** for live or gates |
| **Extended Liquidity Target** | Hypothetical TP **beyond** nearest liquidity (`beyond_nearest`, `extended_tp_beyond_liquidity` bucket). | **Research-only.** Valid only with **strong** structure/displacement/session context in future work; high risk of over-extension on one bundle. | **Research** — **not approved** |
| **Partial Target Concept** | Future idea: split reward between conservative RR slice and liquidity slice (e.g. scale-out). | **Planning only.** Not implemented in TestEA, exports, or outcomes. Any partial model must preserve auditability of official RR2 as control. | **Not implemented** |
| **No-Trade / Wait** | Valid when **no defensible target** exists (`missing_liquidity_target`), target quality is **Weak/None**, or effective RR at conservative execution is not defendable together with entry/context. | **Always allowed** for manual / read-only workflow. Future checklist may surface blockers; must not auto-block exports or virtual trades without governance. | **Allowed** (manual) |

**Key distinction:** *Official conservative RR* ≠ *best hypothetical target on one XAUUSD bundle*. E5.15.3 showed supported targets appear in **wins and losses** alike — target quality is **context**, not a standalone approval rule.

---

## 3. Governance decision

| Rule | Decision |
|------|----------|
| Official TP | Remains **fixed RR2** on virtual trades. **No change** from E5.15.4. |
| Liquidity Target Quality V1 | **Diagnostic / checklist** — explains target geometry vs detected pools. |
| Target policy vs outcomes | Policy labels **do not** change `outcome`, `result_r`, or official TP in exports. |
| Live / gates / automation | **No** target family is approved for live execution, hard gates, or `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`. |
| Edge / 25 % / adaptive entry | **No** approval; entry policy unchanged — [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md). |
| Thresholds / grades E5.15 | **No** change to MQL5 scoring thresholds from this document. |

**E5.15 target block:** **closed at policy level** after E5.15.4. Further work on targets without TP change flows through evidence bars below and future checklist (E5.18), not ad-hoc TP edits.

---

## 4. Relationship with entry candidate policy

Entry family and target family must be evaluated **together** in future humanization and dashboard copy:

| Combination | Policy stance |
|-------------|----------------|
| **edge** + poor target (missing, weak grade, not reached) | **Not** automatically good — high fill sensitivity **plus** weak target context increases research caution. |
| **50 % / CE** + strong target (supported, grade A/B) | **Not** automatically approved — control entry remains official; strong target is one checklist line only. |
| **edge** + aligned liquidity target (research lens) | Interesting for **explanation** only; does not override buffered EVOS fragility or entry non-approval. |
| Weak context + conservative RR only | May still be valid control trade; may also warrant **wait** if checklist blockers stack. |

**Target quality** is one **Setup Readiness Checklist** component (see §6), not a standalone rule. **Entry candidate** labels and **target family** labels are parallel vocabularies — neither replaces governance evidence bars.

---

## 5. Future evidence required before changing TP

No target family (including liquidity-aligned or extended) may replace **official fixed RR2 TP** without a documented governance decision and **all** of the following evidence classes (minimum bar):

| Evidence class | Purpose |
|----------------|---------|
| **Multi-period validation** | Same parameter discipline across distinct time windows on XAUUSD; not one segment. |
| **Out-of-sample** | Holdout or rolling validation per optimization governance. |
| **Walk-forward** | Stability of target realism metrics and outcomes across folds. |
| **Per-symbol profiles** | XAUUSD is laboratory; other symbols need their own target distance and liquidity profiles. |
| **Comparison by outcome and drawdown** | Wins-only analysis insufficient; losses, ambiguous, expired cohorts required. |
| **Execution / spread / session context** | **E5.16** and beyond — target achievability under realistic cost and time-of-day. |
| **Manual forward demo read-only** | Observation without execution approval. |
| **Dashboard reporting of target blockers** | Human-readable reasons (missing pool, before nearest, weak grade) aggregated read-only. |

Until then, **Conservative RR Target** remains the only TP that drives official outcomes and campaign comparability.

---

## 6. Setup Readiness Checklist integration (future E5.18)

The following **target-related** checklist items are specified for future read-only aggregation (not implemented as gates in E5.15.4):

| Checklist item | Source / signal (E5.15 export) |
|----------------|--------------------------------|
| **Target exists** | `liquidity_target_supported` or valid nearest distance ≥ 0; not `missing_liquidity_target` |
| **Target type** | Conservative RR (official) vs research lens: liquidity-aligned / extended (from `nearest_type`, swing/HTF flags) |
| **TP reaches liquidity** | `liquidity_target_reached_by_official_tp` |
| **TP before liquidity** | `liquidity_target_tp_before_nearest_liquidity` |
| **Target quality grade** | `liquidity_target_grade` (A/B/C/Weak/None) |
| **Target blocker reason** | `liquidity_target_reasons` + bucket (`missing`, `weak_target_quality`, `too_far_beyond`, etc.) |

Checklist output is **advisory** for trader review and dashboard explanation. It must not silently change TP, entry, or virtual-trade generation.

---

## 7. Current decision and next milestone

| Ítem | Estado |
|------|--------|
| E5.15 Liquidity Target Quality export | **Done** |
| E5.15.1 smoke | **Done** |
| E5.15.2 realism audit (repo) | **Done** |
| E5.15.3 realism audit evidence | **Done** |
| **E5.15.4 target policy (this doc)** | **Done** — research only |
| Official TP RR2 | **Unchanged** |
| Official entry 50 % / CE | **Unchanged** |
| Edge / variant approval | **No** |
| Live / gates | **No** |

**E5.16.4 (policy):** [`SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md`](./SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md). **Siguiente:** **E5.17+**.

**Optional later:** E5.18 Setup Readiness Checklist implementation consuming E5.15 target fields + E5.16 context + entry policy labels.

---

## References

- [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md)
- [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md)
- [`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md)
- [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md)
- [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md)
