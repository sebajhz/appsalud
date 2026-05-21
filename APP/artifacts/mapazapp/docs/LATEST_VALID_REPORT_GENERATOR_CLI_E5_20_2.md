# Latest Valid Report Generator CLI — E5.20.2

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.2 — informe Setup Readiness para el último bundle válido indexado |
| **Baseline Git** | `65720b0` o posterior — E5.20.2 implementación |
| **Evidencia operador** | **PASS** — [`LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md) |
| **Depende de** | E5.20.1 (`mapazapp:testea-bundle-index`), E5.19 (`mapazapp:testea-setup-readiness-report`) |
| **Alcance** | Selección desde `latest_valid_by_key` + re-validación + artefactos MD/JSON/HTML |
| **Excluido** | Dashboard, MQL5, MT5, Strategy Tester, trading, mutación de carpetas bundle MT5 por defecto |

---

## Comando

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-latest-valid-report -- \
  --root "<TestEaRoot>" \
  --output-dir "<ReportOutputDir>" \
  --json
```

Alternativa con índice pregenerado:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-latest-valid-report -- \
  --index "<RootDir>/bundles.index.json" \
  --no-refresh-index \
  --output-dir "<ReportOutputDir>"
```

### Opciones

| Flag | Descripción |
|------|-------------|
| `--root <path>` | Raíz TestEA (requerido salvo `--index` con `--no-refresh-index`). |
| `--index <path>` | `bundles.index.json` existente. |
| `--output-dir <path>` | **Requerido.** Carpeta de salida local para informes. |
| `--profile`, `--campaign`, `--parameter-set`, `--symbol`, `--timeframe` | Filtros sobre `latest_valid_by_key`. |
| `--bundle-id <id>` | Selección explícita (omite filtros de clave). |
| `--max-examples <n>` | Tarjetas de ejemplo (default: 10). |
| `--language es\|en` | Idioma del informe (default: `es`). |
| `--html` / `--no-html` | HTML (default: escribir). |
| `--markdown` / `--no-markdown` | Markdown (default: escribir). |
| `--report-json` / `--no-report-json` | JSON de informe (default: escribir). |
| `--refresh-index` / `--no-refresh-index` | Re-escanear `--root` en memoria (default: refresh si hay `--root`). |
| `--update-index` | Opcional: actualizar solo rutas de informe en `bundles.index.json`. |
| `--strict` | Promover warnings de validación a error. |
| `--json` | Imprime resumen compacto (`latest_valid_report_result`) en stdout. |

**Códigos de salida:** `0` informe generado; `1` selección/validación/informe fallido; `2` argumentos inválidos.

---

## Modelo de selección

1. Si `--bundle-id` → bundle indexado con `valid_status` ∈ `valid`, `valid_warnings`, `report_missing`.
2. Si no → filtrar `latest_valid_by_key` por filtros opcionales.
3. Exactamente **una** clave coincidente → usar su `bundle_id`.
4. Varias claves → error con lista de `key`.
5. Ninguna → error claro.
6. `ambiguous_latest=true` → error con `candidate_bundle_ids` (no auto-selección).
7. No elegir `invalid` ni `stale`.

---

## Re-validación previa al informe

Tras seleccionar el bundle, el core re-ejecuta `validateTestEaExportBundleTexts` y exige:

- `ok=true` o `status=warning` sin errores
- `readOnly=true`
- `executionEnabled=false`
- `has_real_trading_orders=false`
- `has_setup_readiness_checklist_v1_logic=true`
- Sin cabeceras CSV duplicadas en `backtest_trades.csv`

El cálculo del informe reutiliza **E5.19** sin cambiar scoring ni decisiones.

---

## Salida en `--output-dir`

```text
<output-dir>/
  setup_readiness_report.md
  setup_readiness_report.json
  setup_readiness_report.html
  latest_valid_report_result.json
```

`latest_valid_report_result.json` incluye: `ok`, bundle seleccionado, rutas de informe, `ea_build`, `symbol`, `timeframe`, `trade_count`, `decision_counts`, `average_score`, `warnings[]`, `errors[]`.

**Regla local:** usar carpetas `*_DO_NOT_COMMIT` bajo `APP/artifacts/mapazapp/docs/` para salidas de operador; no commitear artefactos generados.

---

## Seguridad

- Solo lectura del bundle fuente (no copia CSVs al destino).
- Por defecto **no** escribe en la carpeta MT5 del bundle.
- Por defecto **no** muta `bundles.index.json` (solo con `--update-index`).
- Sin `OrderSend`, WebRequest, ni ejecución live.

---

## Implementación

| Artefacto | Ruta |
|-----------|------|
| Core | `APP/lib/mapazapp-core/src/testea-latest-valid-report.ts` |
| Tests core | `APP/lib/mapazapp-core/tests/testea-latest-valid-report.test.ts` |
| CLI | `APP/scripts/src/mapazapp-testea-latest-valid-report.ts` |
| Tests CLI | `APP/scripts/src/mapazapp-testea-latest-valid-report.test.ts` |

---

## Siguiente paso

**E5.20.3** — adaptador dashboard read-only que consume `setup_readiness_report.json`.
