# Dashboard Read-only Adapter — Evidencia operador E5.20.3.1

## Alcance

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.3.1 — evidencia operador del CLI `mapazapp:dashboard-readonly-adapter` |
| **Baseline Git (código)** | `ebb7c36` o posterior — `fix(mapazapp): E5.20.3.0.2 fix dashboard adapter campaign counts` |
| **Fixes previos** | **E5.20.3.0.1** — unidad mínima display + `main_reason` fallback; **E5.20.3.0.2** — `decision_summary` persistido = conteos campaña |
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Build TestEA** | `MZP_TestEA_E5_18` |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, Strategy Tester, trading, dashboard UI |

Este documento registra el **run operador** del adaptador dashboard read-only sobre artefactos locales generados por E5.20.2.1. Los JSON de salida permanecen en `*_DO_NOT_COMMIT` (no commitear).

**Referencia implementación:** [`DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md`](./DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md)  
**Informe fuente:** [`LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md)

---

## Comando

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-adapter -- \
  --report-json "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT\setup_readiness_report.json" \
  --latest-result "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT\latest_valid_report_result.json" \
  --index "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_1_bundle_index_DO_NOT_COMMIT\bundles.index.json" \
  --output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_3_1_dashboard_readonly_adapter_DO_NOT_COMMIT\dashboard_readonly_view.json" \
  --language es \
  --json
```

| Campo | Valor |
|-------|-------|
| **Exit code** | `0` |
| **Salida local** | `APP/artifacts/mapazapp/docs/_local_E5_20_3_1_dashboard_readonly_adapter_DO_NOT_COMMIT/dashboard_readonly_view.json` |

---

## Entradas (artefactos locales, no commitear)

| Archivo | Ruta relativa |
|---------|----------------|
| Informe setup readiness | `_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT/setup_readiness_report.json` |
| Resultado latest valid | `_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT/latest_valid_report_result.json` |
| Índice bundles | `_local_E5_20_1_bundle_index_DO_NOT_COMMIT/bundles.index.json` |

---

## Resumen JSON stdout (`--json`)

| Campo | Valor |
|-------|-------|
| `schema_version` | `mapazapp_dashboard_readonly_view_v1` |
| `ok` | `true` |
| `mode` | `backtest_research` |
| `bundle` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `trade_count` | `1697` |
| `candidate_count` | `247` |
| `wait_count` | `150` |
| `reject_count` | `1300` |
| `unknown_count` | `0` |
| `trade_cards_count` | `10` |
| `minimum_display_unit_enforced` | `true` |
| `errors` | `[]` |
| `warnings` | `[]` |

Los conteos compactos coinciden con `decision_summary` en el JSON persistido (campaña), no con `trade_card_decision_summary` (subconjunto ejemplo).

---

## Verificación JSON persistido (`dashboard_readonly_view.json`)

| Campo | Valor |
|-------|-------|
| Ok | `true` |
| Schema | `mapazapp_dashboard_readonly_view_v1` |
| Mode | `backtest_research` |
| Read_Only | `true` |
| Bundle | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| Selected_Bundle_Id | `E55/SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| Build | `MZP_TestEA_E5_18` |
| Symbol | `XAUUSD` |
| Timeframe | `M15` |
| Trade_Count | `1697` |
| **decision_summary** candidate / wait / reject / unknown | **247 / 150 / 1300 / 0** |
| **trade_card_decision_summary** candidate / wait / reject | **2 / 1 / 7** (10 tarjetas total) |
| Trade_Cards_Count | `10` |
| Minimum_Display_Unit_Enforced | `true` |
| Errors_Count | `0` |
| Warnings_Count | `0` |

### Gobernanza (`governance`)

| Campo | Valor |
|-------|-------|
| No_Live_Trading | `true` |
| No_Gates | `true` |
| Official_Entry | `50% / CE` |
| Official_Tp | `RR2` |
| Edge_Status | `research_only` |
| Score_Not_Permission | `true` |
| Dashboard_Is_Not_Execution_Logic | `true` |

### Casebook alignment (muestra)

| Campo | Valor |
|-------|-------|
| active_case_refs | `HA-004`, `HA-005`, `HA-006`, `HA-009` |
| missing_measurement_case_refs | `HA-007`, `HA-008` |
| policy_only_case_refs | `HA-001`, `HA-002`, `HA-010` |

---

## Tarjetas ejemplo verificadas (`trade_cards[]`)

Subconjunto de 10 tarjetas; cumplen unidad mínima de display tras E5.20.3.0.1 / 0.2.

| trade_id | decision | score | grade | primary_blocker | main_reason | blocker_count |
|----------|----------|-------|-------|-----------------|-------------|---------------|
| VTR_000001 | reject | 90 | A | `pd_conflict` | — (bloqueador duro) | 1 |
| VTR_000003 | candidate | 70 | B | `none` | `checklist_bias_ok` | 0 |
| VTR_000009 | candidate | 80 | B | `none` | `checklist_bias_ok` | 0 |
| VTR_000011 | wait | 60 | C | `none` | `Motivo principal` | 0 |
| VTR_000006 | reject | 64 | C | `ifvg_conflict` | — (bloqueador duro) | 2 |
| VTR_000007 | reject | 60 | C | `liquidity_missing` | — (bloqueador duro) | 2 |

Criterios validados por operador:

- Sin tarjetas “solo puntaje” (siempre decisión + grade + blocker o `main_reason` + `top_reasons`).
- Candidatos sin bloqueador duro (`blocker_count=0`, `primary_blocker=none`) incluyen `main_reason` no vacío.
- Rechazos con bloqueador duro mantienen `main_reason=null` y `primary_blocker` explícito.

---

## Nota de codificación (PowerShell / consola)

Las tablas `Format-Table` en Windows pueden mostrar **mojibake** en etiquetas españolas del JSON (p. ej. `Rechazado â€" bloqueo crÃ­tico`). El archivo `dashboard_readonly_view.json` conserva UTF-8 correcto (`label_es`: `Rechazado — bloqueo crítico`). Tratar como **problema de visualización de consola**, no como fallo E5.20.3.1. El mock UI / prototipo (E5.20.4) debe renderizar UTF-8.

**Lectura PowerShell de conteos:** `decision_summary` es un **array** de filas `{ decision, count, ... }`. No usar `$View.decision_summary.candidate.count`; usar:

```powershell
$View.decision_summary | Where-Object decision -eq 'candidate' | Select-Object -ExpandProperty count
```

---

## Decisión PASS

| Criterio | Resultado |
|----------|-----------|
| Adaptador produce `dashboard_readonly_view_v1` válido | OK — `ok=true`, `errors=[]` |
| Conteos campaña en `decision_summary` | OK — 247 / 150 / 1300 / 0 |
| Subconjunto tarjetas separado | OK — `trade_card_decision_summary` 2/1/7; `trade_cards_count=10` |
| Unidad mínima display | OK — `minimum_display_unit_enforced=true` |
| VTR_000003 / VTR_000009 con `main_reason` | OK — post E5.20.3.0.1 |
| Gobernanza read-only preservada | OK — sin live, sin gates, entry 50 % CE, TP RR2 |
| Sin recálculo de decisión/score | OK — capa presentación únicamente |

**Veredicto:** **PASS** — evidencia técnica operador para E5.20.3.1.

---

## Interpretación

- El adaptador entrega una **vista JSON lista para UI** a partir del informe E5.19 ya generado.
- Los conteos de campaña (1697 trades) están correctamente expuestos en `decision_summary` y en el resumen compacto CLI.
- Las 10 tarjetas ejemplo son **ilustrativas**; no sustituyen los totales de campaña.
- El adaptador **no** implementa lógica de trading, gates, ni aceptación humanizada ejecutable; alinea tokens con casebook E5.20.6 como referencia de presentación.

---

## Flujo completado

```text
_local_E5_20_2_1_* (setup_readiness_report.json + latest_valid_report_result.json)
  + _local_E5_20_1_* (bundles.index.json)
  → mapazapp:dashboard-readonly-adapter
  → _local_E5_20_3_1_*/dashboard_readonly_view.json
```

Sigue **read-only**: sin MT5, sin Strategy Tester, sin trading, sin modificar bundle MT5 ni informe fuente.

---

## Referencias

- [`DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md`](./DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md)
- [`LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md)
- [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)

**Siguiente recomendado:** **E5.20.4.1** — evidencia operador del mock HTML — [`DASHBOARD_READONLY_MOCK_E5_20_4.md`](./DASHBOARD_READONLY_MOCK_E5_20_4.md) (`mapazapp:dashboard-readonly-mock` → `dashboard_readonly_mock.html`).
