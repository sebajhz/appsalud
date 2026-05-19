# Execution Environment Calibration Audit — Evidencia operador E5.16.3

## Alcance

- **Checkpoint:** E5.16.3 — evidencia operador post–**E5.16.2** (CLI execution environment calibration audit).
- **Build TestEA:** `MZP_TestEA_E5_16`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato auditor:** [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md).
- **Export / smoke previos:** [`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md), [`SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md`](./SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **re-run** del audit de calibración de entorno de ejecución sobre el bundle benchmark. **No** cambia umbrales MQL5 V1, TP oficial (RR2 fijo), entry **50 % / CE**, outcomes ni aprobación de edge; **no** autoriza live trading, gates ni ejecución real.

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-execution-environment-calibration-audit -- \
  --bundle "<RunDir>" \
  --json \
  --max-examples 10
```

CSV local (operador, no commitear):

```bash
# mismo bundle + --csv-output → _local_E5_16_3_execution_environment_calibration_audit_DO_NOT_COMMIT.csv
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `trade_count` | 1697 |
| `errors` | `[]` |
| `warnings` | solo metadatos de import (`run_id` sintetizado; `parameter_set_id` del CSV vs opciones de import) — **no invalidan** el audit |
| CLI / core | post-commit **`20dd54c`** (E5.16.2) o posterior |

---

## Overall buckets

### Session

| `session_bucket` | Count | % (1697) |
|------------------|------:|---------:|
| `asian` | 457 | 26.9 % |
| `london` | 370 | 21.8 % |
| `london_new_york_overlap` | 306 | 18.0 % |
| `new_york` | 85 | 5.0 % |
| `off_session` | 479 | 28.2 % |

### Spread

| `spread_bucket` | Count | % |
|-----------------|------:|--:|
| `normal` | 1694 | 99.8 % |
| `warning` | 2 | |
| `high` | 1 | |
| `extreme` | 0 | |

### Volatility (exportado MQL5 V1)

| `volatility_bucket` | Count | % |
|---------------------|------:|--:|
| `normal` | 133 | 7.8 % |
| `high` | 351 | 20.7 % |
| `extreme` | 1213 | **71.5 %** |
| `low` | 0 | 0 % |

### Execution environment grade

| Grade | Count | % |
|-------|------:|--:|
| A | 3 | 0.2 % |
| B | 262 | 15.4 % |
| C | 370 | 21.8 % |
| Weak | 670 | 39.5 % |
| None | 392 | 23.1 % |

---

## Outcome × volatility bucket

| Outcome | normal | high | extreme |
|---------|-------:|-----:|--------:|
| `win` | 24 | 93 | 294 |
| `loss` | 43 | 104 | 360 |
| `ambiguous` | 38 | 86 | 312 |
| `expired_unfilled` | 28 | 68 | 246 |

**Lectura:** la dominancia `extreme` se reparte en todos los outcomes; no es artefacto de un solo resultado.

---

## ATR / range statistics

### ATR points (`volatility_atr_points`)

| Stat | Valor |
|------|------:|
| count | 1697 |
| average | 773.263052 |
| median | 588.14 |
| p25 | 374.5 |
| p75 | 948.79 |
| p90 | 1359.732 |
| p95 | 1846.302 |

### Range points (`volatility_range_points`)

| Stat | Valor |
|------|------:|
| average | 803.031821 |
| median | 585 |
| p25 | 337 |
| p75 | 960 |
| p90 | 1553.8 |
| p95 | 2154.4 |

### Range / ATR ratio

| Stat | Valor |
|------|------:|
| average | 1.064692 |
| median | 0.9531 |
| p25 | 0.7141 |
| p75 | 1.2781 |
| p90 | 1.71878 |
| p95 | 2.0433 |

---

## Threshold sensitivity (re-simulación TS desde ATR exportado)

| Profile | low | normal | high | extreme |
|---------|----:|-------:|-----:|--------:|
| **MQL5 V1** (80 / 250 / 400) | 0 | 133 | 351 | **1213** |
| **XAUUSD M15 candidate A** (150 / 500 / 900) | 8 | 664 | 553 | 472 |
| **XAUUSD M15 candidate B** (200 / 700 / 1200) | 46 | 970 | 437 | 244 |
| **Percentile candidate C** (p25 / p75 / p90) | 423 | 849 | 255 | 170 |

Umbrales percentile C (del bundle):

| Percentil | ATR (points) |
|-----------|-------------:|
| p25 (low below) | 374.5 |
| p75 (high at) | 948.79 |
| p90 (extreme at) | 1359.732 |

**Lectura:**

- `EXPORTED_BUCKETS_MATCH_MQL5_V1_SIMULATION` — conteos V1 exportados = re-simulación 80/250/400.
- Candidate **B** y **C** reparten volatilidad de forma más plausible para XAUUSD M15 que V1 fijo.
- Umbrales V1 actuales siguen útiles como **etiqueta de estrés**, no como clasificación final calibrada por perfil.

---

## Interpretation flags (audit)

| Flag | Significado en este bundle |
|------|----------------------------|
| `SPREAD_NOT_PRIMARY_ISSUE` | Spread casi todo `normal` |
| `OFF_SESSION_MATERIAL_COUNT` | ~28 % off-session — mantener en checklist futuro |
| `VOLATILITY_THRESHOLDS_TOO_LOW_FOR_XAUUSD_M15` | 1213/1697 extreme bajo V1 |
| `EXPORTED_BUCKETS_MATCH_MQL5_V1_SIMULATION` | Coherencia export ↔ TS |
| `PROFILE_SPECIFIC_THRESHOLDS_RECOMMENDED` | Candidatos A/B/C reducen extreme vs V1 |
| `CURRENT_THRESHOLDS_USABLE_AS_STRESS_LABEL_ONLY` | No usar V1 como grade final sin calibración |
| `ENV_SCORE_DOMINATED_BY_VOLATILITY` | Weak/None + extreme vol + score bajo |

---

## Interpretación (operador)

- **PASS técnico** del audit sobre bundle benchmark.
- Sesión y spread coherentes con smoke E5.16.1.
- Volatilidad V1 **extreme-dominated** confirmada; candidatos B y C más realistas para M15 oro.
- Off-session material para Setup Readiness Checklist (E5.18).
- **No** recalibrar umbrales MQL5 en este checkpoint.

---

## Decisión E5.16.3

| Ítem | Estado |
|------|--------|
| Audit calibration E5.16.3 | **PASS** |
| Umbrales MQL5 V1 | **Sin cambio** |
| TP oficial RR2 | **Sin cambio** |
| Entry 50 % / CE | **Sin cambio** |
| Edge / gates / live | **No** |
| Guardrail manual read-only | **Vigente** |

---

## Futuro (solo planificación): E5.16.4 — Symbol/Timeframe Execution Profile Policy

**Propósito (docs/research only):** definir política de umbrales de entorno **por símbolo y timeframe** — p.ej. `XAUUSD_M15_Profile_V1` — integrando evidencia E5.16.3 (candidate B/C, percentiles) con gobernanza North Star.

Posibles entregables:

- Vocabulario de perfiles (stress V1 vs calibrated profile).
- Criterios de aprobación antes de cambiar inputs MQL5.
- Relación con Setup Readiness Checklist (E5.18).

**Restricciones E5.16.4:** no modificar umbrales MQL5 salvo hito explícito aprobado; no gates; no live.

---

## Siguiente (decisión roadmap)

| Opción | Descripción |
|--------|-------------|
| **E5.16.4** | **Recomendado** — Symbol/Timeframe Execution Profile Policy (research docs) |
| **E5.17** | Frequency / Risk / Overtrading discipline V1 |

---

## Referencias

- Audit repo: [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md)
- Smoke: [`SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md`](./SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md)
