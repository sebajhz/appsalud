# Setup Readiness Checklist V1 — Evidencia smoke E5.18.1 (operador)

## Alcance

- **Checkpoint:** E5.18.1 — humo técnico post-implementación **E5.18** (export Setup Readiness Checklist V1).
- **Implementación repo (referencia):** `0534c53` — `feat(mapazapp): E5.18 export setup readiness checklist`.
- **Build TestEA:** `MZP_TestEA_E5_18`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato export:** [`SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md`](./SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md).
- **Contexto previo:** [`FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md`](./FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md), [`CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md`](./CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md), [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **smoke técnico** del export Setup Readiness Checklist V1. **No** cambia TP oficial (RR2 fijo), entry **50 % / CE**, ni outcomes; **no** aprueba edge ni variantes; **no** autoriza live trading, gates ni ejecución real. Guardrail **manual / read-only** vigente.

---

## Compilación

| Campo | Valor |
|-------|-------|
| MetaEditor exit code (shell) | `1` (no bloqueante si el log de compilación es limpio) |
| Resultado compile log | **0 errors, 0 warnings** |
| EX5 archivado | `Mapazapp_TestEA_E5_18.ex5` |
| `TESTEA_BUILD` | `MZP_TestEA_E5_18` |

---

## Validación de bundle

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<RunDir>" \
  --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `status` | `warning` (solo `BUNDLE_EVENTS_LARGE`) |
| `errors` | `[]` |
| `ea_build` | `MZP_TestEA_E5_18` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `has_real_trading_orders` | `false` |
| `has_setup_readiness_checklist_v1_logic` | `true` |
| `setup_readiness_checklist_enabled` | `true` |

---

## Compatibilidad CSV (PowerShell)

| Comprobación | Resultado |
|--------------|-----------|
| `Import-Csv backtest_trades.csv` | **OK** |
| Filas importadas | **1697** (= `trade_count`) |
| Headers duplicados | **Ninguno** |
| Columnas readiness (primera fila) | `setup_readiness_score`, `setup_readiness_grade`, `setup_readiness_decision`, `setup_readiness_primary_blocker` exportadas |

**Primera fila (ejemplo operador):**

| Campo | Valor |
|-------|-------|
| `setup_readiness_score` | 90 |
| `setup_readiness_grade` | A |
| `setup_readiness_decision` | reject |
| `setup_readiness_primary_blocker` | pd_conflict |

---

## Verificación de score (0–100)

| Comprobación | Valor | OK |
|--------------|-------|-----|
| `average_setup_readiness_score` | **65.060695** | Sí (0–100) |
| Mínimo por fila | **34** | Sí (≥ 0) |
| Máximo por fila | **94** | Sí (≤ 100) |
| Average_Score_OK (operador) | `true` | Sí |
| Min_Row_Score_OK (operador) | `true` | Sí |
| Max_Row_Score_OK (operador) | `true` | Sí |

---

## Summary — Decisiones

| Decisión | Conteo | % de 1697 |
|----------|-------:|----------:|
| `candidate` | 247 | 14.6 % |
| `wait` | 150 | 8.8 % |
| `reject` | 1300 | 76.6 % |
| `unknown` | 0 | 0 % |

**Suma decisiones:** 247 + 150 + 1300 = **1697** (= `trade_count`). **Cero** `unknown` — decisiones pobladas en toda la campaña.

---

## Summary — Grades

| Grade | Conteo | % de 1697 |
|-------|-------:|----------:|
| `A` | 37 | 2.2 % |
| `B` | 676 | 39.8 % |
| `C` | 538 | 31.7 % |
| `Weak` | 437 | 25.8 % |
| `None` | 9 | 0.5 % |

**Suma grades:** 37 + 676 + 538 + 437 + 9 = **1697**.

---

## Summary — Contadores de componentes (blockers / warnings)

| Contador (summary JSON) | Valor |
|-------------------------|------:|
| `setup_readiness_bias_block_count` | 0 |
| `setup_readiness_liquidity_missing_count` | 99 |
| `setup_readiness_ifvg_weak_count` | 544 |
| `setup_readiness_ifvg_conflict_count` | 699 |
| `setup_readiness_mss_choch_late_count` | 0 |
| `setup_readiness_pd_conflict_count` | 596 |
| `setup_readiness_entry_fragile_count` | 457 |
| `setup_readiness_target_missing_count` | 42 |
| `setup_readiness_target_before_liquidity_count` | 1249 |
| `setup_readiness_environment_weak_count` | 1062 |
| `setup_readiness_overtrading_warning_count` | 1109 |
| `average_setup_readiness_blocker_count` | 1.047731 |
| `average_setup_readiness_warning_count` | 3.619328 |

**Lectura operador:** visibilidad útil de blockers/warnings a escala de campaña. Frecuencias altas en **target before liquidity**, **overtrading warning**, **environment weak**, **IFVG conflict**, **PD conflict** y **entry fragile**. **`Bias_Block = 0`** y **`MSS_CHOCH_Late = 0`** son valores **observados en este benchmark**, no invariantes permanentes del checklist.

---

## Caveat — Grade alto + decisión reject (override por blocker crítico)

El ejemplo de primera fila muestra **`setup_readiness_grade = A`** y **`setup_readiness_score = 90`** con **`setup_readiness_decision = reject`** y **`setup_readiness_primary_blocker = pd_conflict`**.

**Interpretación:** los **blockers críticos** (p. ej. `pd_conflict`) pueden forzar **`reject`** aunque el score/grade numérico sea alto. Esto es comportamiento de **decisión por override**, no un bug de export. Auditar con CLI E5.18.2: [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md).

---

## Interpretación (research / diagnóstico)

| Tema | Lectura |
|------|---------|
| **Smoke técnico** | **PASS** — export válido a escala de campaña; flags y contadores poblados. |
| **Score bounds** | Contrato 0–100 cumplido en media y extremos por fila. |
| **Decisiones** | Pobladas; sin `unknown`; mayoría `reject` en SET001 (esperable como diagnóstico agregado, no aprobación de estrategia). |
| **CSV** | Compatible con herramientas estándar; sin headers duplicados (hereda baseline E5.17.1.1). |
| **Blockers/warnings** | Checklist aporta visibilidad operativa; frecuencias altas en target/discipline/environment/IFVG/PD. |
| **No hacer** | No bloquear trades; no gates; no live; no aprobar edge; no cambiar entry/TP; no tratar como strategy approval. |

---

## Decisión

| Regla | Valor |
|-------|-------|
| E5.18.1 smoke técnico | **PASS** |
| Score bounds 0–100 | **Verificado** |
| CSV `Import-Csv` | **OK** |
| Cambio entry / TP / outcomes | **No** |
| Gates / live / edge | **No** |
| Cambio scoring/decision MQL5 | **No** (solo evidencia) |

---

## Siguiente recomendado

**E5.18.3** — evidencia operador del calibration audit sobre bundle SET001 (`mapazapp:testea-setup-readiness-decision-calibration-audit`). Repo E5.18.2: [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md).
