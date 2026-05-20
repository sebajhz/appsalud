# Setup Readiness Decision Calibration Audit — Evidencia operador E5.18.3

## Alcance

- **Checkpoint:** E5.18.3 — evidencia operador post–**E5.18.2** (CLI setup readiness decision calibration audit).
- **Build TestEA:** `MZP_TestEA_E5_18`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato auditor:** [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md).
- **Export / smoke previos:** [`SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md`](./SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md), [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md), [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md).

Este documento registra el **re-run** del audit de calibración decisión/score/grade sobre el bundle benchmark E5.18. **No** cambia scoring MQL5, lógica de decisión del checklist, entry **50 % / CE**, TP RR2, outcomes ni aprobación de edge; **no** autoriza live trading, gates ni ejecución real.

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-readiness-decision-calibration-audit -- \
  --bundle "<RunDir>" \
  --json \
  --max-examples 10
```

CSV local (operador, **no commitear**):

```bash
# mismo bundle + --csv-output → _local_E5_18_3_setup_readiness_decision_calibration_audit_DO_NOT_COMMIT.csv
```

**Nota PowerShell:** si `node.exe` aparece como `NativeCommandError` al imprimir `Wrote ...csv`, el archivo puede existir igualmente (`Test-Path` = True). **No** invalida el audit.

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `trade_count` | 1697 |
| `errors` | `[]` |
| `warnings` | solo metadatos de import (`run_id` sintetizado; `parameter_set_id` del CSV vs opciones de import) — **no invalidan** el audit |
| CLI / core | post-commit **`6bfba03`** (E5.18.2) o posterior |

---

## Overall — score, decision, grade

| Métrica | Valor |
|---------|------:|
| `average_setup_readiness_score` | 65.060695 |
| `min_setup_readiness_score` | 34 |
| `max_setup_readiness_score` | 94 |
| `average_blocker_count` | 1.047731 |
| `average_warning_count` | 3.619328 |

### Decision counts

| `setup_readiness_decision` | Count | % (1697) |
|----------------------------|------:|---------:|
| `reject` | 1300 | 76.6 % |
| `candidate` | 247 | 14.5 % |
| `wait` | 150 | 8.8 % |
| `unknown` | 0 | 0 % |

### Grade counts

| `setup_readiness_grade` | Count | % |
|-------------------------|------:|--:|
| B | 676 | 39.8 % |
| C | 538 | 31.7 % |
| Weak | 437 | 25.8 % |
| A | 37 | 2.2 % |
| None | 9 | 0.5 % |

---

## Score vs decision buckets

| Bucket | Count | % (1697) | Lectura |
|--------|------:|---------:|---------|
| `high_score_reject_count` (score ≥ 70, reject) | 466 | 27.5 % | Override dominante en banda alta |
| `high_score_wait_count` | 0 | 0 % | Sin wait con score alto |
| `low_score_candidate_count` (score &lt; 45, candidate) | 0 | 0 % | Sin candidatos con score bajo |
| `grade_a_reject_count` | 19 | 1.1 % | Grade A no implica candidate |
| `grade_b_reject_count` | 447 | 26.3 % | Mayoría de rejects en grade B |
| `grade_weak_candidate_count` | 0 | 0 % | Sin Weak→candidate |
| `decision_override_count` | 1196 | 70.5 % | Decisión ≠ umbral score por blockers |
| `candidate_with_warnings_count` | 247 | 100 % de candidates | **Todos** los candidate tienen warnings |

**Conclusión:** las decisiones **no** son puramente score-based. Los blockers críticos pueden forzar `reject` con score alto. `candidate` **no** significa setup perfecto.

---

## Grade × decision

| Grade | reject | wait | candidate |
|-------|-------:|-----:|----------:|
| A | 19 | 0 | 18 |
| B | 447 | 0 | 229 |
| C | 423 | 115 | 0 |
| Weak | 402 | 35 | 0 |
| None | 9 | 0 | 0 |

**Lectura:** solo grades **A** y **B** producen `candidate` en este bundle. Grade A puede ser `reject` (19) o `candidate` (18) — confirma override por blocker.

---

## Score band × decision

| Score band | reject | wait | candidate |
|------------|-------:|-----:|----------:|
| 85–100 | 19 | 0 | 18 |
| 70–84 | 447 | 0 | 229 |
| 45–69 | 730 | 150 | 0 |
| 0–44 | 104 | 0 | 0 |

**Lectura:** toda la banda **70–84** con decisión distinta de reject es `candidate` (229); la misma banda tiene 447 `reject` — mitad aprox. de la banda alta rechazada por override.

---

## Primary blocker × decision

| `setup_readiness_primary_blocker` | reject | wait | candidate |
|-----------------------------------|-------:|-----:|----------:|
| `structure_conflict` | 490 | 93 | 55 |
| `ifvg_conflict` | 400 | 0 | 0 |
| `pd_conflict` | 206 | 0 | 0 |
| `entry_fragile` | 105 | 4 | 27 |
| `liquidity_missing` | 85 | 0 | 0 |
| `execution_environment_weak` | 6 | 48 | 83 |
| `target_missing` | 7 | 0 | 0 |
| `daily_loss_limit_warning` | 0 | 2 | 3 |
| `none` | 1 | 3 | 79 |

**Lectura:** `structure_conflict` es el primary blocker más frecuente en `reject` (490). `ifvg_conflict` y `pd_conflict` son rechazos duros (sin wait/candidate). `execution_environment_weak` aparece más en wait/candidate que en reject como primary.

---

## Critical blocker stats (lista auditor E5.18.2)

| Blocker | `reject_as_primary` | `high_score_reject_as_primary` |
|---------|--------------------:|---------------------------------:|
| `ifvg_conflict` | 400 | 168 |
| `pd_conflict` | 206 | 156 |
| `entry_fragile` | 105 | 37 |
| `target_missing` | 7 | 6 |
| `environment_weak` | 0 | 0 |
| `overtrading_warning` | 0 | 0 |

**Lectura:** `pd_conflict` e `ifvg_conflict` concentran la mayoría de high-score rejects atribuibles a primary blocker crítico. `environment_weak` / `overtrading_warning` no aparecen como primary en esta lista (pueden estar en reasons/warnings).

---

## Outcome cross-tabs (observacional — no optimizar)

### Outcome × `setup_readiness_decision`

| Outcome | reject | candidate | wait |
|---------|-------:|----------:|-----:|
| `loss` | 456 | 33 | 18 |
| `expired_unfilled` | 342 | 0 | 0 |
| `ambiguous` | 331 | 57 | 48 |
| `win` | 171 | 156 | 84 |

### High-score reject × outcome

| Outcome | Count |
|---------|------:|
| `loss` | 164 |
| `expired_unfilled` | 101 |
| `ambiguous` | 91 |
| `win` | 110 |

**Lectura:** high-score reject aparece en todos los outcomes; **no** usar como filtro de edge ni aprobación de estrategia.

---

## Interpretation flags (audit JSON)

| Flag | Presente |
|------|----------|
| `HIGH_SCORE_REJECTS_PRESENT` | sí |
| `CRITICAL_BLOCKERS_OVERRIDE_SCORE` | sí |
| `DECISION_SCORE_CALIBRATION_REVIEW_NEEDED` | sí |
| `CHECKLIST_READY_FOR_DASHBOARD_WITH_EXPLANATION` | sí |
| `CANDIDATES_WITH_WARNINGS_PRESENT` | sí |
| `PD_CONFLICT_HARD_OVERRIDE_SUSPECTED` | no (umbral auditor: ≥35 % de high-score rejects; pd ≈ 33.5 %) |
| `LOW_SCORE_CANDIDATES_PRESENT` | no |

---

## Decisión del checkpoint

| Regla | Valor |
|-------|-------|
| E5.18.3 audit técnico | **PASS** |
| Analyzer funciona en bundle benchmark | **Verificado** |
| Consistencia score-only | **No** — override por blockers es el modelo actual |
| Listo para dashboard/reporting | **Sí, con explicación** — mostrar score, grade, decision, primary_blocker, blocker_count, warning_count, reasons juntos |
| Cambio scoring/decision MQL5 | **No** (política E5.18.4 cerrada; cambios MQL5 solo con gobernanza) |
| Gates / live / edge approval | **No** |

---

## Caveat — high score + reject

**High score + reject no es automáticamente un bug.** Refleja el modelo actual de **override por blockers críticos** (p. ej. `pd_conflict`, `ifvg_conflict`). Requiere **calibración y política de wording** antes de fijar UX de dashboard o textos de decision-support.

Caso smoke E5.18.1 (primera fila: score 90, grade A, reject, `pd_conflict`) queda **explicado** a escala de campaña: 466 high-score rejects; 19 grade-A rejects.

---

## Siguiente recomendado

~~**E5.18.4** policy.~~ [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md). ~~**E5.18.5** contract.~~ [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md). ~~**E5.19** report CLI.~~ [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md). ~~**E5.19.1** evidence.~~ [`SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md`](./SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md). **Siguiente:** E5.19.2 o E5.18.6+.

---

## Referencias

- Repo audit: [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md)
- Smoke: [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md)
