# Latest Valid Report Generator CLI — Evidencia operador E5.20.2.1

## Alcance

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.2.1 — evidencia operador del CLI `mapazapp:testea-latest-valid-report` |
| **Baseline Git (código)** | `65720b0` o posterior — `feat(mapazapp): E5.20.2 add latest valid report generator CLI` |
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Build TestEA** | `MZP_TestEA_E5_18` |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, Strategy Tester, trading, dashboard |

Este documento registra el **run operador** del CLI latest-valid-report sobre la raíz TestEA real. Los artefactos generados permanecen locales (`*_DO_NOT_COMMIT`).

**Referencia implementación:** [`LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md)  
**Índice previo (E5.20.1.1):** [`LOCAL_BUNDLE_INDEX_CLI_EVIDENCE_E5_20_1_1.md`](./LOCAL_BUNDLE_INDEX_CLI_EVIDENCE_E5_20_1_1.md)

---

## Comando

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-latest-valid-report -- \
  --root "C:\Users\QuerlyPC\AppData\Roaming\MetaQuotes\Tester\A05F66FF4A995303E43EBDC7469BF577\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\TestEA" \
  --output-dir "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT" \
  --symbol XAUUSD \
  --timeframe M15 \
  --json
```

| Campo | Valor |
|-------|-------|
| **Exit code** | `0` |
| **Raíz TestEA** | `...\MQL5\Files\Mapazapp\TestEA` |
| **Salida local** | `APP/artifacts/mapazapp/docs/_local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT/` |

---

## Artefactos locales (no commitear)

| Archivo | Ruta relativa bajo `OutDir` |
|---------|------------------------------|
| Resultado CLI | `latest_valid_report_result.json` |
| Informe Markdown | `setup_readiness_report.md` |
| Informe JSON | `setup_readiness_report.json` |
| Informe HTML | `setup_readiness_report.html` |

La carpeta MT5 del bundle **no** recibió copias de informes ni CSVs.

---

## Resumen JSON stdout (`--json`)

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `selected_bundle_id` | `E55/SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `selected_bundle_name` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `selected_key` | `\|MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1\|MZP_IFVG_XAUUSD_V1_OUTCOME_OPT_FVG_SWEEP_001\|XAUUSD\|M15` |
| `valid_status_before_report` | **`report_missing`** |
| `report_markdown_path` | `<OutDir>\setup_readiness_report.md` |
| `report_json_path` | `<OutDir>\setup_readiness_report.json` |
| `report_html_path` | `<OutDir>\setup_readiness_report.html` |
| `ea_build` | `MZP_TestEA_E5_18` (vía informe / bundle) |
| `symbol` | `XAUUSD` |
| `timeframe` | `M15` |
| `trade_count` | `1697` |
| `average_score` | `65.06069534472599` |
| `decision_counts.reject` | `1300` |
| `decision_counts.candidate` | `247` |
| `decision_counts.wait` | `150` |
| `errors` | `[]` |
| `warnings` | `[]` |

---

## Verificación operador (PowerShell)

| Campo | Valor |
|-------|-------|
| Ok | `True` |
| Selected_Bundle_Id | `E55/SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| Selected_Bundle_Name | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| Valid_Status | `report_missing` |
| Build | `MZP_TestEA_E5_18` |
| Symbol | `XAUUSD` |
| Timeframe | `M15` |
| Trade_Count | `1697` |
| Candidate_Count | `247` |
| Wait_Count | `150` |
| Reject_Count | `1300` |
| Warnings_Count | `0` |
| Errors_Count | `0` |

---

## Decisión PASS

| Criterio | Resultado |
|----------|-----------|
| Selección desde raíz TestEA + filtros symbol/timeframe | OK — un solo `latest_valid_by_key` |
| Re-validación previa al informe | OK — `errors=[]` |
| Generación informe E5.19 (MD/JSON/HTML) | OK — cuatro archivos en `OutDir` |
| Bundle MT5 sin modificación | OK — informes solo en `*_DO_NOT_COMMIT` |
| Flujo operador completo | OK — TestEA root → latest valid → report |

**Veredicto:** **PASS** — evidencia técnica operador para E5.20.2.

---

## Interpretación `report_missing`

Antes del run, el índice (E5.20.1.1) ya clasificaba el bundle como **`report_missing`**: export válido con Setup Readiness V1 pero **sin** `setup_readiness_report.json` junto al run MT5. Eso es **esperado** y elegible para E5.20.2.

El CLI:

1. Refrescó el índice en memoria desde `--root`
2. Seleccionó el único latest valid para `XAUUSD` / `M15`
3. Re-validó el bundle
4. Generó informes en `--output-dir` local

`valid_status_before_report=report_missing` confirma el estado previo; `ok=true` confirma generación exitosa **sin** escribir en la carpeta del bundle MT5.

---

## Nota de nombres — `average_score` vs PowerShell

En `latest_valid_report_result.json` el campo expuesto es **`average_score`** (no `average_setup_readiness_score`).

El operador formateó el objeto con `$Result.average_setup_readiness_score`, por lo que **Average_Score** apareció vacío en la vista PowerShell aunque el JSON del CLI y el archivo de resultado incluyen `average_score ≈ 65.06`.

| Fuente | Campo |
|--------|-------|
| CLI `--json` / `latest_valid_report_result.json` | `average_score` |
| Display operador (propiedad inexistente) | `average_setup_readiness_score` → vacío |

**No es fallo de run.** Documentado para futuras consultas PowerShell; **sin cambio de código** en esta tarea docs-only.

---

## Flujo completado

```text
Mapazapp/TestEA (raíz operador)
  → mapazapp:testea-latest-valid-report (--root, --symbol, --timeframe)
  → SET001 bundle (report_missing → informe generado)
  → _local_E5_20_2_1_latest_valid_report_DO_NOT_COMMIT/
```

Sigue **read-only** respecto al bundle fuente: sin MT5, sin Strategy Tester, sin trading, sin dashboard.

---

## Referencias

- [`LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md)
- [`LOCAL_BUNDLE_INDEX_CLI_EVIDENCE_E5_20_1_1.md`](./LOCAL_BUNDLE_INDEX_CLI_EVIDENCE_E5_20_1_1.md)
- [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md)

**Siguiente recomendado:** **E5.20.3** — adaptador de datos read-only para dashboard (`setup_readiness_report.json` → vista trade).
