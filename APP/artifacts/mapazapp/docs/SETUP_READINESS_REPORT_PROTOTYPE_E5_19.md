# Setup Readiness Report Prototype — E5.19

## Por qué existe E5.19

Tras **E5.18.5** (contrato dashboard/report), hace falta un **primer prototipo ejecutable** que genere informes legibles desde un bundle TestEA exportado — sin dashboard web, sin MT5, sin gates.

**E5.19** implementa un generador **read-only** en TypeScript + CLI que consume `backtest_summary.json` y `backtest_trades.csv` y produce **Markdown**, **JSON** y opcionalmente **HTML**.

---

## Alcance

| Incluido | Excluido |
|----------|----------|
| Informe estático para revisión operador | Dashboard React / live UI |
| Reutiliza auditor E5.18.2 internamente | Cambios MQL5 scoring/decision |
| Wording ES por defecto (EN opcional) | MT5 / Strategy Tester |
| Trade cards con decisión+score+grade+blocker | Gates / live trading |

**Referencias:** [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md), [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md).

---

## CLI

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-readiness-report -- \
  --bundle "<RunDir>" \
  --markdown-output "<path>/setup_readiness_report.md" \
  --json-output "<path>/setup_readiness_report.json" \
  --max-examples 10
```

Opciones:

| Flag | Default | Descripción |
|------|---------|-------------|
| `--html-output` | — | HTML estático (CSS embebido mínimo) |
| `--language` | `es` | `es` \| `en` |
| `--strict` | — | exit 1 si `ok=false` |
| `--verbose` | — | volcar advertencias detalladas a stderr |
| `--search-root` | — | Buscar bundles |

**Requisitos bundle:** `has_setup_readiness_checklist_v1_logic=true` en summary; CSV sin headers duplicados.

---

## Secciones del informe

1. **Header** — `bundle` (summary.bundle → `effective_export_folder_label` → basename de `--bundle`), build, symbol, timeframe, campaign, trade_count, read_only  
2. **Resumen ejecutivo** — score medio, decisiones, grades, blockers/warnings top  
3. **Distribución de decisiones** — % + interpretación (candidate ≠ perfecto; reject con score alto)  
4. **Puntaje y grade** — min/avg/max, high-score reject, candidate-with-warnings  
5. **Ranking de bloqueadores** — primary, high-score reject, matrix × decisión  
6. **Ranking de advertencias** — tokens recurrentes  
7. **Resumen de componentes** — bias, liquidity, IFVG, MSS, PD, entry, target, env, discipline  
8. **Ejemplos de trades** — cards por categoría (hasta `--max-examples`)  
9. **Outcome (research)** — crosstabs + disclaimer observacional  
10. **Gobernanza** — footer read-only  

---

## Módulos

| Artefacto | Ruta |
|-----------|------|
| Core | `APP/lib/mapazapp-core/src/testea-setup-readiness-report.ts` |
| CLI | `APP/scripts/src/mapazapp-testea-setup-readiness-report.ts` |
| Script | `mapazapp:testea-setup-readiness-report` |

---

## E5.19.0.1 — UX operador (metadata warnings)

- **E5.19.0.1:** `header.bundle` poblado; import CSV usa `run_id` / `parameter_set_id` del summary cuando existen; sin spam de warnings por fila en flujo normal; CLI escribe éxito en **stdout**; `--verbose` para detalle.

## E5.19.1 — Evidencia operador

- **PASS** — [`SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md`](./SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md).
- Bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, `MZP_TestEA_E5_18`, 1697 trades; `ok=true`, `warnings_count=0`; artefactos en `_local_E5_19_1_setup_readiness_report_DO_NOT_COMMIT/` (no commit).

---

## E5.19.2 — UX polish (presentación)

- [`SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md`](./SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md) — aliases warnings, headings, example dedup, component table, HTML spacing.
- **Sin** cambios de cálculo ni MQL5.

---

## E5.19.3 — Evidencia UX polish

- **PASS** — [`SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md`](./SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md).

---

## Siguiente recomendado

Bloque **Detection / Readiness / Report V1** cerrado (E5.19.3 PASS). Plan consumo dashboard: [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md).

**E5.20.1 cerrado:** [`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md). **Siguiente:** **E5.20.2** latest valid report generator CLI.
