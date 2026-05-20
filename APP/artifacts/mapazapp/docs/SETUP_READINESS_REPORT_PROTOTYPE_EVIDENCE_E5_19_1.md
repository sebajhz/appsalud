# Setup Readiness Report Prototype — Evidencia operador E5.19.1

## Alcance

- **Checkpoint:** E5.19.1 — evidencia operador del **informe Setup Readiness** (CLI report prototype).
- **Build TestEA:** `MZP_TestEA_E5_18`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Prerequisitos repo:** [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md) (E5.19), fix UX **E5.19.0.1** (`8bb8fd0` o posterior).
- **Contrato / policy:** [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md), [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md).
- **Auditor interno reutilizado:** [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md); evidencia previa [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **re-run** del CLI de informe tras **E5.19.0.1**. **No** cambia scoring MQL5, lógica de decisión del checklist, entry **50 % / CE**, TP RR2, outcomes ni aprobación de edge; **no** autoriza live trading, gates ni ejecución real.

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-readiness-report -- \
  --bundle "<RunDir>" \
  --markdown-output "<local>/setup_readiness_report.md" \
  --json-output "<local>/setup_readiness_report.json" \
  --html-output "<local>/setup_readiness_report.html" \
  --max-examples 10 \
  --language es
```

| Campo | Valor |
|-------|-------|
| Salida CLI (stdout) | `Wrote report for SET001_FVG2_RR2_00_BIASBODY0_RALIGN1 (ok=true, trades=1697)` |
| `ok` | `true` |
| `warnings_count` | `0` (sin spam de metadata post E5.19.0.1) |
| CLI / core | post-commit **`8bb8fd0`** (E5.19.0.1) o posterior |

---

## Artefactos locales (no commitear)

| Archivo | Ruta local |
|---------|------------|
| Markdown | `APP/artifacts/mapazapp/docs/_local_E5_19_1_setup_readiness_report_DO_NOT_COMMIT/setup_readiness_report.md` |
| JSON | `APP/artifacts/mapazapp/docs/_local_E5_19_1_setup_readiness_report_DO_NOT_COMMIT/setup_readiness_report.json` |
| HTML | `APP/artifacts/mapazapp/docs/_local_E5_19_1_setup_readiness_report_DO_NOT_COMMIT/setup_readiness_report.html` |

Los artefactos generados permanecen **untracked** / `*_DO_NOT_COMMIT` — solo este doc de evidencia entra al repo.

---

## JSON — resumen

### Header

| Campo | Valor |
|-------|-------|
| `header.bundle` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `header.bundle_name` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `header.ea_build` | `MZP_TestEA_E5_18` |
| `header.symbol` | `XAUUSD` |
| `header.trade_count` | 1697 |
| `header.read_only` | `true` |
| `header.execution_enabled` | `false` |
| `minimum_display_unit_enforced` | `true` |

### Executive summary

| Métrica | Valor |
|---------|------:|
| `average_setup_readiness_score` | 65.060695 |
| `average_blocker_count` | 1.05 |
| `average_warning_count` | 3.62 |

| `setup_readiness_decision` | Count | % (1697) |
|--------------------------|------:|---------:|
| `reject` | 1300 | 76.6 % |
| `candidate` | 247 | 14.6 % |
| `wait` | 150 | 8.8 % |

### Score / grade

| Métrica | Valor |
|---------|------:|
| `min_score` | 34 |
| `max_score` | 94 |
| `average_score` | 65.06 |
| `high_score_reject_count` | 466 |
| `candidate_with_warnings_count` | 247 |

| `setup_readiness_grade` | Count |
|-------------------------|------:|
| A | 37 |
| B | 676 |
| C | 538 |
| Weak | 437 |
| None | 9 |

---

## Contenido del informe — verificado

### Header y gobernanza

- Bundle, build, symbol XAUUSD, campaign, parameter set, trade count, `read_only=true`, `execution_enabled=false`, `ok=true`.
- Footer de gobernanza incluye: informe read-only; sin live trading; sin gates; el score **no** es permiso de entrada; blockers críticos pueden anular score; entry oficial **50 % / CE**; edge / p25 / adaptive solo investigación; TP oficial RR2.

### Bloqueadores principales (leaderboard)

| Primary blocker | Count |
|-----------------|------:|
| `structure_conflict` | 638 |
| `ifvg_conflict` | 400 |
| `pd_conflict` | 206 |
| `execution_environment_weak` | 137 |
| `entry_fragile` | 136 |
| `liquidity_missing` | 85 |
| `target_missing` | 7 |

### Advertencias principales (leaderboard)

| Token (alias observado) | Count |
|-------------------------|------:|
| `target_before_liquidity` / `checklist_target_before_liquidity` | 1249 |
| `overtrading_warning` / `checklist_overtrading_warning` | 1109 |
| `environment_weak` / `checklist_environment_weak` | 1062 |
| `entry_fragile` / `checklist_entry_fragile` | 457 |

### Secciones presentes

- Resumen ejecutivo y distribución de decisiones (con interpretación).
- Puntaje y grade; high-score reject; candidate-with-warnings.
- Ranking de bloqueadores; matrix blocker × decisión.
- Resumen de componentes (bias, liquidity, IFVG, MSS, PD, entry, target, env, discipline).
- Tarjetas de ejemplo por categoría (hasta `--max-examples`).
- Outcome research (observacional) + disclaimer.
- Flags de interpretación y footer de gobernanza.

**Coherencia con E5.18.3:** mismos conteos de decisión/score/grade en el mismo bundle; el informe E5.19 es una **vista legible** del mismo dataset, no un recálculo de política.

---

## Decisión del checkpoint

| Regla | Valor |
|-------|-------|
| E5.19.1 evidencia técnica | **PASS** |
| CLI genera md/json/html | **Verificado** |
| `header.bundle` poblado | **Verificado** (post E5.19.0.1) |
| Sin warnings de metadata en JSON | **Verificado** (`warnings_count = 0`) |
| `minimum_display_unit_enforced` | **true** |
| Cambio scoring/decision MQL5 | **No** |
| Gates / live / edge approval | **No** |

---

## E5.19.2 — Polish UX (cerrado en repo)

Los ítems siguientes se documentaron como no bloqueantes en E5.19.1 y se corrigieron en **E5.19.2** — [`SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md`](./SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md). **Re-run operador recomendado:** E5.19.3.

Observaciones originales (referencia histórica):

1. **Warning leaderboard — aliases duplicados:** el ranking muestra pares `checklist_*` y token corto (`target_before_liquidity` / `checklist_target_before_liquidity`, etc.). Futuro: normalizar aliases en una sola etiqueta UI.
2. **Markdown — subheading vacío:** bajo «Ranking de advertencias» aparece `###` sin título. Futuro: eliminar o etiquetar.
3. **Example cards — repetición entre categorías:** algunos trades aparecen en más de una categoría (p. ej. high-score reject y reject). Futuro: deduplicar o marcar membresía múltiple.
4. **Primary blocker vs `blocker_count=0`:** en algunos ejemplos candidate/wait hay `primary_blocker` con `blocker_count=0`. Futuro: aclarar primary_reason vs hard blocker en wording.
5. **Component summary — Blocker=0:** todas las filas muestran Blocker=0 mientras el leaderboard de primary blocker tiene conteos altos. Futuro: alinear semántica componente vs primary blocker global.

---

## Siguiente recomendado

- ~~**E5.19.3** post UX polish.~~ **Done** — [`SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md`](./SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md).
- **E5.20** BridgeEA consumption plan, o E5.18.6+.

---

## Referencias

- Prototype: [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md)
- Contract: [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md)
- Calibration evidence: [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md)
