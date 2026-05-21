# Local Bundle Index CLI — Evidencia operador E5.20.1 / E5.20.1.1

## Alcance

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.1 implementación + **E5.20.1.1** fix derivación read-only |
| **Baseline Git (código)** | `b1a3850` o posterior — `fix(mapazapp): E5.20.1.1 derive index read-only posture` |
| **Implementación previa** | `9d9112d` — `feat(mapazapp): E5.20.1 add local bundle index CLI` |
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Build TestEA** | `MZP_TestEA_E5_18` |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, Strategy Tester, trading, dashboard, generación de informes |

Este documento registra el **re-run operador** del CLI de índice tras E5.20.1.1. El artefacto `bundles.index.json` permanece local (`*_DO_NOT_COMMIT`).

**Referencia implementación:** [`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md)

---

## Contexto — smoke E5.20.1 vs E5.20.1.1

| Fase | Resultado |
|------|-----------|
| **E5.20.1 (pre-fix)** | Mismo bundle clasificado **`invalid`** con error `INDEX_READ_ONLY_REQUIRED` porque el índice exigía `readOnly`/`live_trading_enabled` en JSON crudo. |
| **E5.20.1.1 (post-fix)** | Mismo bundle: **`report_missing`**, `readOnly=true`, `executionEnabled=false`, `errors=[]`. Alineado con `mapazapp:testea-export-validate` (`ok=true`, warning solo `BUNDLE_EVENTS_LARGE`). |

---

## Comando

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-bundle-index -- \
  --root "C:\Users\QuerlyPC\AppData\Roaming\MetaQuotes\Tester\A05F66FF4A995303E43EBDC7469BF577\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\TestEA" \
  --output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_1_bundle_index_DO_NOT_COMMIT\bundles.index.json" \
  --json
```

| Campo | Valor |
|-------|-------|
| **Exit code** | `0` (índice escrito) |
| **Raíz escaneada** | `...\MQL5\Files\Mapazapp\TestEA` |
| **Índice local** | `APP/artifacts/mapazapp/docs/_local_E5_20_1_bundle_index_DO_NOT_COMMIT/bundles.index.json` |

### Resumen JSON en stdout (`--json`)

| Campo | Valor |
|-------|-------|
| `schema_version` | `mapazapp_bundle_index_v1` |
| `total_bundles_scanned` | 1 |
| `valid_count` | 0 |
| `valid_warnings_count` | 0 |
| `invalid_count` | 0 |
| `stale_count` | 0 |
| `report_missing_count` | 1 |
| `output_bundle_count` | 1 |
| `latest_valid_by_key_count` | 1 |

---

## Artefacto local (no commitear)

| Artefacto | Ruta |
|-----------|------|
| Índice JSON | `APP/artifacts/mapazapp/docs/_local_E5_20_1_bundle_index_DO_NOT_COMMIT/bundles.index.json` |

`created_at_utc` del índice (operador): `2026-05-21T00:22:13.799Z`

---

## Resumen del índice

| Métrica | Valor |
|---------|-------|
| Bundles en `bundles[]` | 1 |
| Entradas `latest_valid_by_key` | 1 |
| Hojas detectadas bajo raíz TestEA | 1 (`E55/SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`) |

Jerarquía observada:

```text
Mapazapp/TestEA/
  E55/
    SET001_FVG2_RR2_00_BIASBODY0_RALIGN1/
      backtest_summary.json
      backtest_trades.csv
      backtest_events.csv
```

---

## Bundle detectado

| Campo | Valor |
|-------|-------|
| `bundle_id` | `E55/SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `bundle_name` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `valid_status` | **`report_missing`** |
| `symbol` | `XAUUSD` |
| `timeframe` | `M15` |
| `campaign_id` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1` |
| `parameter_set_id` | `MZP_IFVG_XAUUSD_V1_OUTCOME_OPT_FVG_SWEEP_001` |
| `strategy_id` | `MZP_IFVG_ZONE_REACTION_V1` |
| `ea_build` | `MZP_TestEA_E5_18` |
| `schema_version` | `backtest_ea_v1` |
| `trade_count` | 1697 |
| `created_at_utc` (summary) | `2026-05-08T23:56:59Z` |
| `summary_mtime_utc` | `2026-05-20T02:21:40.614Z` |
| `readOnly` | `true` (derivado — no presente en JSON crudo del summary) |
| `executionEnabled` | `false` (derivado) |
| `has_real_trading_orders` | `false` |
| `has_setup_readiness_checklist_v1_logic` | `true` |
| `report_json_path` | `null` |
| `report_markdown_path` | `null` |
| `report_html_path` | `null` |
| `warnings` | `[]` |
| `errors` | `[]` |

---

## `latest_valid_by_key`

| Campo | Valor |
|-------|-------|
| `key` | `\|MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1\|MZP_IFVG_XAUUSD_V1_OUTCOME_OPT_FVG_SWEEP_001\|XAUUSD\|M15` |
| `profile_id` | `null` (sin segmento `*_Profile_*` en ruta MT5; esperable en export directo bajo `TestEA/E55/...`) |
| `campaign_id` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1` |
| `parameter_set_id` | `MZP_IFVG_XAUUSD_V1_OUTCOME_OPT_FVG_SWEEP_001` |
| `symbol` | `XAUUSD` |
| `timeframe` | `M15` |
| `bundle_id` | `E55/SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `ambiguous_latest` | ausente (un solo run elegible para la clave) |

El bundle queda **elegible** para el siguiente paso operacional (E5.20.2: generar informe sobre último válido).

---

## Decisión PASS

| Criterio | Resultado |
|----------|-----------|
| CLI exit 0 | PASS |
| Bundle real SET001 ya no `invalid` | PASS |
| `readOnly` / `executionEnabled` derivados correctamente | PASS |
| `errors` vacío | PASS |
| `report_missing` con readiness activo y sin informe junto al bundle MT5 | PASS (esperado) |
| `latest_valid_by_key` con `bundle_id` asignado | PASS |
| Descubrimiento en raíz TestEA real del operador | PASS |

**Veredicto:** **PASS** — evidencia técnica E5.20.1 / E5.20.1.1 cerrada para el bundle SET001 en la raíz TestEA indicada.

---

## Interpretación de `report_missing`

- **No es `invalid`.** El triple canónico pasa validación de export; la postura read-only se deriva como en `mapazapp:testea-export-validate`.
- **Motivo:** no existe `setup_readiness_report.json` (ni `.md`/`.html`) en la carpeta del bundle ni en su padre inmediato bajo MT5.
- Los informes SET001 generados en E5.19.x viven bajo rutas `*_local_*_DO_NOT_COMMIT` en el repo — fuera del árbol `MQL5/Files/Mapazapp/TestEA`; el índice **no** los enlaza (diseño E5.20.1).
- **Siguiente acción producto:** E5.20.2 puede apuntar `mapazapp:testea-setup-readiness-report` al `bundle_path` del `latest_valid_by_key` y escribir informes en carpeta local operador o junto al run, según política.

---

## Relación con export-validate (referencia operador)

El mismo bundle fue validado previamente con:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<RunDir>" --json
```

Resultado coherente con el índice post E5.20.1.1: `ok=true`, `status=warning`, único warning `BUNDLE_EVENTS_LARGE`, `readOnly=true`, `executionEnabled=false`, `has_real_trading_orders=false`.

---

## Referencias

- [`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md)
- [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md)
- [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md)

**Siguiente recomendado:** **E5.20.2** — CLI generador de informe sobre último bundle válido / `latest_valid_by_key`.
