# CSV Header Cleanup — Verificación bundle real E5.17.1.1 (operador)

## Alcance

- **Checkpoint:** E5.17.1.1 — verificación operador del cleanup de header CSV duplicado **`fvg_ce_price`**.
- **Implementación repo (referencia):** `20dbadf` — `fix(mapazapp): E5.17.1.1 cleanup duplicate CSV header`.
- **Build TestEA:** `MZP_TestEA_E5_17_1_1`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` (mismo benchmark que E5.17.1).
- **Smoke previo (sigue válido):** [`FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md`](./FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md) (`MZP_TestEA_E5_17_0_1`).
- **Contrato export:** [`FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md`](./FREQUENCY_RISK_DISCIPLINE_EXPORT_E5_17.md).

Este documento registra la **verificación técnica en bundle exportado real** tras recompilar con E5.17.1.1. **No** cambia TP oficial (RR2 fijo), entry **50 % / CE**, ni outcomes; **no** aprueba edge ni variantes; **no** autoriza live trading, gates ni ejecución real.

---

## Compilación

| Campo | Valor |
|-------|-------|
| `TESTEA_BUILD` | `MZP_TestEA_E5_17_1_1` |
| EX5 | `Mapazapp_TestEA_E5_17_1_1.ex5` (operador) |

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
| `warnings` | `BUNDLE_EVENTS_LARGE` únicamente |
| `ea_build` | `MZP_TestEA_E5_17_1_1` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |

---

## Verificación Import-Csv (PowerShell)

| Comprobación | Resultado |
|--------------|-----------|
| `Import-Csv backtest_trades.csv` | **OK** (sin error de miembro duplicado) |
| Filas importadas | **1697** (= `trade_count`) |
| Headers duplicados | **Ninguno** |
| Columna `fvg_ce_price` | **Disponible** (única) |
| Columna `discipline_score` | **Disponible** |

**Interpretación:** el cleanup E5.17.1.1 queda confirmado en export real; herramientas CSV estándar (PowerShell, Excel, analizadores simples) pueden consumir el bundle.

---

## Verificación de score (regresión E5.17.0.1 / E5.17.1)

| Comprobación | Valor | OK |
|--------------|-------|-----|
| `average_discipline_score` | **10.533883** | Sí (≤ 15) |
| Average_Score_OK (operador) | `true` | Sí |
| Max_Trade_Discipline_Score (máx. por fila) | **15** | Sí (≤ 15) |
| Max_Row_Score_OK (operador) | `true` | Sí |

Los bounds **0–15** se mantienen idénticos al smoke E5.17.1; el fix de header **no** alteró acumulación ni scoring de discipline.

---

## Decisión

| Regla | Valor |
|-------|-------|
| Verificación bundle real E5.17.1.1 | **PASS** |
| Cleanup header `fvg_ce_price` | **Confirmado** |
| Compatibilidad CSV estándar | **Confirmada** |
| Smoke E5.17.1 (discipline export) | **Sigue válido** + CSV OK |
| Cambio entry / TP / outcomes | **No** |
| Gates / live / edge | **No** |

---

## Siguiente recomendado

~~**E5.18** smoke operador~~ **Done** — [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md) (`MZP_TestEA_E5_18`, SET001, `Import-Csv` OK). **Siguiente:** E5.18.4 policy refinement ([`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md)).
