# Setup Readiness Decision Calibration Audit — E5.18.2

## Por qué existe E5.18.2

**E5.18** exporta score, grade, decisión (`candidate` / `wait` / `reject`), blockers y reasons por trade. **E5.18.1** smoke confirmó export válido en `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` (`trade_count` 1697, scores 34–94, avg 65.06), pero detectó el **caveat** de primera fila: `setup_readiness_score = 90`, `setup_readiness_grade = A`, `setup_readiness_decision = reject`, `setup_readiness_primary_blocker = pd_conflict`.

**E5.18.2** añade un auditor **research-only** en TypeScript que mide consistencia **score/grade vs decisión final**, matrices de decisión, comportamiento de blockers críticos y flags de interpretación — **sin** cambiar scoring MQL5, lógica de decisión, entry, TP ni aprobar edge.

---

## Qué mide

| Sección | Contenido |
|---------|-----------|
| **Overall** | `trade_count`, avg/min/max score, conteos de decisión y grade, avg blocker/warning count |
| **Score vs decision buckets** | `high_score_reject_count`, `high_score_wait_count`, `low_score_candidate_count`, `grade_a_reject_count`, `grade_b_reject_count`, `grade_weak_candidate_count`, `decision_override_count` |
| **Decision matrix** | grade × decision; score_band × decision (`0-44`, `45-69`, `70-84`, `85-100`) |
| **Primary blocker** | primary_blocker × decision / grade / score_band |
| **Critical blockers** | `pd_conflict`, `ifvg_conflict`, `target_missing`, `environment_weak`, `overtrading_warning`, `entry_fragile` — rejects y high-score rejects |
| **Outcome cross-tabs** | outcome × decision / grade / high_score_reject / primary_blocker (observacional; no optimizar) |
| **Examples** | hasta `--max-examples` por categoría: high score + reject, grade A/B + reject, low score + candidate, candidate con muchas warnings, wait con blocker fuerte |
| **Interpretation flags** | p.ej. `HIGH_SCORE_REJECTS_PRESENT`, `CRITICAL_BLOCKERS_OVERRIDE_SCORE`, `PD_CONFLICT_HARD_OVERRIDE_SUSPECTED`, `CHECKLIST_READY_FOR_DASHBOARD_WITH_EXPLANATION` |

### Definiciones (auditoría)

| Concepto | Regla |
|----------|-------|
| **high_score** | `setup_readiness_score >= 70` |
| **low_score** | `setup_readiness_score < 45` |
| **decision_override** | decisión ≠ esperada solo por umbrales de score (≥70 candidate, ≥45 wait, &lt;45 reject) **y** (`primary_blocker` ≠ none **o** `blocker_count > 0`) |
| **high_score_reject** | high_score + `decision = reject` |

---

## Restricciones (gobernanza)

- **No** cambiar scoring ni lógica de decisión del checklist MQL5.
- **No** cambiar entry oficial (50 % / CE), TP RR2 ni outcomes.
- **No** gates, live trading, `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`.
- **No** aprobar edge ni variantes alternativas.
- **No** commitear `*_DO_NOT_COMMIT.csv`.

---

## CLI (read-only, sin MT5)

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-readiness-decision-calibration-audit -- \
  --bundle "<RunDir>" \
  --json \
  --max-examples 10
```

Opciones:

| Flag | Default | Descripción |
|------|---------|-------------|
| `--max-examples` | `10` | Ejemplos por categoría |
| `--csv-output <path>` | — | CSV resumen (overall, crosstabs, critical blockers, flags) |
| `--search-root` / `--campaign-folder` | — | Igual que otros audits TestEA |
| `--strict` | — | exit 1 si bundle falla |

Módulo core: `APP/lib/mapazapp-core/src/testea-setup-readiness-decision-calibration-audit.ts`  
CLI: `APP/scripts/src/mapazapp-testea-setup-readiness-decision-calibration-audit.ts`  
Script: `mapazapp:testea-setup-readiness-decision-calibration-audit`

---

## Evidencia operador (E5.18.3 — cerrado)

[`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md) — PASS; bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; 466 high-score rejects; 1196 decision overrides; checklist útil para dashboard **con explicación**. **Política:** [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md). **Contrato UI:** [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md).

---

## Referencias

- Export: [`SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md`](./SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md)
- Smoke: [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md)
- Gobernanza: [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md)
- North Star: [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
