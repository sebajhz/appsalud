# E5.18 — Setup Readiness Checklist V1 (export-only)

## Why E5.18 exists

After E5.17, Mapazapp exports many independent diagnostic layers (bias, liquidity, IFVG, MSS/CHoCH, premium/discount, entry feasibility, targets, execution environment, discipline). E5.18 adds a **read-only aggregation layer** that turns those existing fields into a single human-readable readiness snapshot per virtual trade — without changing trade generation, official entry (50/CE), TP, outcomes, or adding gates.

## Checklist philosophy

- **Not a trading gate** — no `OrderSend`, no live trading, no approval of edge/p25/adaptive variants.
- **Explanatory only** — answers: what was strong, what was weak, what warned or blocked from a diagnostic perspective.
- **Deterministic** — score 0–100 from existing exported state; does not alter underlying layer scores.

## Candidate / Wait / Reject

| Decision | Meaning (diagnostic) |
|----------|----------------------|
| `candidate` | Score ≥ `setup_readiness_min_candidate_score` (default 70) and no critical blockers |
| `wait` | Score ≥ `setup_readiness_min_wait_score` (default 45) but below candidate threshold or soft warnings |
| `reject` | Critical blockers and/or score below wait threshold |
| `unknown` | Checklist disabled or scoring disabled |

## Checklist components (10)

1. Bias / HTF structure  
2. Liquidity event  
3. IFVG / BISI / SIBI quality  
4. MSS / CHoCH + timing  
5. Premium / discount zone  
6. Entry feasibility + candidate family (official remains `official_50_ce` when filled)  
7. Liquidity target quality + type  
8. Execution environment  
9. Discipline / overtrading  
10. Final score, grade, decision, blockers, reasons  

## Score and grade

- **Score**: 0–100 additive from components; clamped; blockers/warnings affect decision more than raw sum in edge cases.
- **Grade**: `A` (≥85), `B` (≥70), `C` (≥55), `Weak` (≥40), `None` (&lt;40).

## Blockers vs warnings

- **Blockers** (examples): `bias_not_aligned`, `ifvg_conflict`, `target_missing`, `execution_environment_weak`, `pd_conflict`, `mss_choch_late`, `entry_fragile`, `liquidity_missing`, `daily_loss_limit_warning`
- **Warnings**: overtrading, weak IFVG, environment weak, target before liquidity, etc. (counted separately in summary)

## Reason codes (pipe-delimited)

`checklist_bias_ok`, `checklist_bias_block`, `checklist_liquidity_ok`, `checklist_liquidity_missing`, `checklist_ifvg_ok`, `checklist_ifvg_weak`, `checklist_ifvg_conflict`, `checklist_mss_choch_ok`, `checklist_mss_choch_late`, `checklist_pd_ok`, `checklist_pd_conflict`, `checklist_entry_feasible`, `checklist_entry_fragile`, `checklist_target_ok`, `checklist_target_missing`, `checklist_target_before_liquidity`, `checklist_environment_ok`, `checklist_environment_weak`, `checklist_discipline_ok`, `checklist_overtrading_warning`, `checklist_candidate`, `checklist_wait`, `checklist_reject`

## CSV fields (after discipline block)

See `SETUP_READINESS_TRADE_COLUMNS` in `APP/lib/mapazapp-core/src/setup-readiness-export-keys.ts`.

## Summary JSON

- Flag: `has_setup_readiness_checklist_v1_logic`
- Enabled: `setup_readiness_checklist_enabled`
- Decision counters, grade counters, component issue counters, averages
- `optimization_parameters`: `setup_readiness_checklist_v1_enabled`, `setup_readiness_score_enabled`, `setup_readiness_min_candidate_score`, `setup_readiness_min_wait_score`

## Events (compact)

Trade event `details` may include: `ready_score=`, `ready_decision=`, `ready_blocker=` via `MapzReadyCompactSuffix`.

## Dashboard and governance

- Future dashboard can filter/sort by `setup_readiness_decision` and `setup_readiness_primary_blocker`.
- Optimization governance: treat as **observation export** only; do not use as pass/fail gate until a separate policy approves it.

## Build

`TESTEA_BUILD = MZP_TestEA_E5_18`

## E5.18.1 smoke (operator — completed)

[`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md) — build `MZP_TestEA_E5_18`, bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, **PASS** técnico; `trade_count` 1697; scores 34–94 (avg 65.06); decisions populated (0 unknown); CSV `Import-Csv` OK. **Caveat:** grade A + score 90 puede ser `reject` por blocker crítico (`pd_conflict`) — ver evidencia E5.18.1.

## E5.18.2 decision calibration audit (repo)

[`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md) — auditor research-only score/grade vs decisión; CLI `mapazapp:testea-setup-readiness-decision-calibration-audit`. **No** cambia MQL5 ni scoring.

## E5.18.3 calibration evidence (operator — completed)

[`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md) — PASS; SET001; decisiones no puramente score-based; dashboard OK con score+grade+decision+blockers+reasons.

## Next recommended

**E5.18.4** — Setup Readiness Decision Policy Refinement (docs/research; no MQL5 scoring/decision change yet).
