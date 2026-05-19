# Entry Candidate Policy — Research E5.13.6.13

**Status:** Research-only policy document. **Not** an approval of edge, 25 %, adaptive, or any change to official entry.  
**Official entry (unchanged):** **50 % / CE** (FVG midpoint / confluence entry as configured in TestEA virtual trades).  
**Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

**Evidence chain:** E5.13.6.9 proxy robustness → E5.13.6.10 MQL5 required → E5.13.6.11 export → E5.13.6.12 smoke — [`BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md`](./BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md).

---

## 1. Why this checkpoint exists

E5.13.6.12 promoted **edge** from an *interesting* research lens to a **serious research candidate**:

- Edge is best by expectancy at buffered **b0**, **b30**, and **b50** on the benchmark bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` (1697 trades).
- Edge survives **exact MQL5** adverse-buffer diagnostics — the signal is not merely a TypeScript proxy artifact.

Governance **still prevents** approving edge from **one** XAUUSD bundle:

- Edge remains **execution-sensitive** (760 fragile at b30; 907 wins failing min effective RR at b50).
- p25/adaptive are ambiguity-heavy; p50/CE is negative at b30 under buffer stress.
- North Star and optimization governance require **multi-period**, **out-of-sample**, and **multi-context** evidence before any official entry change.

E5.13.6.13 defines **how Mapazapp should think** about entry families — for future dashboards, alerts, and trader explanation — without mechanical selection or live execution.

---

## 2. Entry family roles

| Family | Role in Mapazapp | Status |
|--------|------------------|--------|
| **50 % / CE** | **Official control and baseline.** Virtual trades, EVOS strict parity, campaign comparability. | **Official** (unchanged) |
| **edge** | **Strongest research candidate.** Highest buffered expectancy on current benchmark; high reward potential; **high execution fragility**. | **Serious research** — **not approved** |
| **25 %** | **Moderate candidate.** More conservative fill depth than edge; modest positive R at b30 in smoke; **ambiguity-heavy** (~590 ambiguous at b30). | **Experimental** — **not approved** |
| **adaptive** | **Similar to 25 %.** Potential future **dynamic** depth selection; same ambiguity profile as 25 % in current evidence. | **Experimental** — **not approved** |
| **75 %** | Deeper retest lens. **Not primary** in current roadmap (not in Buffered EVOS v1 matrix). | **Deferred** |
| **no-trade / wait** | **Valid decision** when context is weak, target poor, ambiguity high, or effective RR is not defendable under conservative execution. | **Always allowed** (manual) |

**Key distinction:** *Official control* (50 %/CE) ≠ *best candidate under execution stress* on a single bundle. Smoke evidence shows p50/CE **b30 expectancy negative** while edge remains positive — that reinforces control vs. candidacy separation, not an automatic switch to edge.

---

## 3. Candidate policy concept

Mapazapp **must not** choose entries mechanically from summary rollups or a single score.

It should **evaluate context** and **mark possible candidate entry families** for human review — read-only explanation, future dashboard tiles, and alert copy.

### Illustrative future policy (research — not implemented as gates)

| Context signal (examples) | Possible candidate marking |
|---------------------------|----------------------------|
| Structure + liquidity + displacement + target + execution robustness **strong**; buffered fragility **low** for setup class | **edge candidate** |
| Setup valid but edge **too fragile** (high `fragile_count` / wins failing min RR at b30–b50); shallower fill still plausible | **25 % or adaptive candidate** |
| Deeper retest more realistic; edge overextended; official depth aligns with bias/PD | **50 % / CE candidate** (control alignment) |
| Weak context, poor target, high ambiguity, effective RR not defendable at conservative buffer | **no-trade / wait** |

### Anti-patterns (forbidden without explicit governance)

- Auto-switching official entry from summary `buffered_evos_best_variant_by_expectancy_*` alone.
- Hard gates that block virtual trades or exports based on candidate labels.
- Live `OrderSend` / automation from candidate policy.
- Approving edge from one Strategy Tester campaign.

---

## 4. Evidence required before any candidate becomes official

No entry family becomes **official** without a documented governance decision and **all** of the following classes of evidence (minimum bar — PM may tighten):

| Evidence class | Purpose |
|----------------|---------|
| **Multi-period XAUUSD validation** | Same parameter discipline across distinct time windows; not one lucky segment. |
| **Walk-forward / out-of-sample** | Holdout or rolling validation; anti-overfit per [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md). |
| **Target quality** | TP realism, RR achievability, and outcome stability — not R alone. |
| **IFVG / BISI / SIBI classification** | Imbalance quality and setup taxonomy — **E5.14** export + **E5.14.1** smoke PASS — [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md). |
| **Session / spread / volatility context** | Execution conditions beyond closed-candle geometry. |
| **Multi-symbol comparison** | XAUUSD is laboratory; other symbols need their own profiles. |
| **Forward demo read-only** | Observation under live-like conditions without execution approval. |

Buffered EVOS (E5.13.6.11–6.12) is **necessary** but **not sufficient** for approval.

---

## 5. Manual-control guardrail

Candidate policy is for:

- **Read-only** explanation in exports and future UI.
- **Future** dashboard / alert copy (“edge candidate — fragile under 30 pt buffer”).
- **Trader education** aligned with North Star.

It **must not**:

- Place trades or send orders.
- Auto-select live entries.
- Replace trader judgment.

**Final decision remains manual.** Mapazapp is decision support until separate governance approves execution.

---

## 6. Current decision (E5.13.6.13)

| Decision | Status |
|----------|--------|
| Edge | **Serious research candidate** — **not approved** as official entry |
| 25 % / adaptive | **Experimental** — **not approved** |
| 50 % / CE | **Official entry** — **unchanged** |
| 75 % | **Not primary** in current track |
| Live / gates / automation | **Not approved** |
| Buffered EVOS | **Implemented and smoke-validated** — use for research, not for auto-approval |
| IFVG / BISI / SIBI smoke | **PASS** — [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md) |
| Next technical roadmap | **E5.15** Liquidity Target Quality V1 (diagnostic-only) |

Edge candidate research is **parked under governance** while setup-quality and classification work proceeds.

---

## 7. Suggested next step

**Recommend: E5.15 — Liquidity Target Quality V1.**

**Reason:** IFVG / BISI / SIBI classification is **smoke-validated** ([`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md)). The next research gap is whether the trade has a **logical liquidity target** (internal/external liquidity, session levels, TP realism) — not R alone.

Entry policy research (this document) stays valid as the **governance frame**; IFVG exports supply **setup taxonomy** inputs to future candidate marking and the future **Setup Readiness Checklist** (read-only; see North Star).

---

## References

- [`BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md`](./BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md)
- [`BUFFERED_EVOS_EXPORT_E5_13_6_11.md`](./BUFFERED_EVOS_EXPORT_E5_13_6_11.md)
- [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md)
- [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md)
- [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
- [`IFVG_BISI_SIBI_EXPORT_E5_14.md`](./IFVG_BISI_SIBI_EXPORT_E5_14.md)
- [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
