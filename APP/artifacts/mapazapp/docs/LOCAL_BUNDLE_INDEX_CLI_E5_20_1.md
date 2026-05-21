# Local Bundle Index CLI — E5.20.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.1 — índice local de bundles; **E5.20.1.1** corrección derivación read-only |
| **Baseline Git** | `9d9112d` (E5.20.1); fix E5.20.1.1 |
| **Alcance** | Escaneo filesystem + `bundles.index.json` (solo metadatos) |
| **Excluido** | Dashboard, generación de informes, MQL5, MT5, trading |

---

## Comando

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-bundle-index -- \
  --root "<RootDir>" \
  --output "<RootDir>/bundles.index.json" \
  --json
```

### Opciones

| Flag | Descripción |
|------|-------------|
| `--root <path>` | **Requerido.** Raíz operador (perfiles/campañas/runs o export MT5 directo). |
| `--output <path>` | Ruta del índice JSON (default: `<root>/bundles.index.json`). |
| `--json` | Resumen compacto en stdout. |
| `--max-depth <n>` | Profundidad máxima de escaneo (default: 12). |
| `--include-invalid` | Incluir bundles inválidos en el índice (default). |
| `--no-include-invalid` | Omitir entradas `invalid` del array `bundles`. |
| `--profile <id>` | Filtrar por segmento de carpeta `*_Profile_*` (p. ej. `XAUUSD_M15_Profile_V1`). |
| `--strict` | Promover warnings materiales a error (misma política que export-validate). |

**Códigos de salida:** `0` índice escrito; `1` raíz inexistente; `2` argumentos inválidos.

---

## Descubrimiento

Carpeta **hoja** = contiene los tres archivos canónicos:

- `backtest_summary.json`
- `backtest_trades.csv`
- `backtest_events.csv`

Jerarquía objetivo (E5.20):

```text
<root>/<profile>/<campaign>/<run>/  →  triple canónico
```

También soporta raíz apuntando a una carpeta hoja única o árbol MT5 plano.

Informes opcionales (misma carpeta o padre inmediato):

- `setup_readiness_report.json`
- `setup_readiness_report.md`
- `setup_readiness_report.html`

---

## Esquema `mapazapp_bundle_index_v1`

```json
{
  "schema_version": "mapazapp_bundle_index_v1",
  "created_at_utc": "...",
  "root": "...",
  "total_bundles_scanned": 0,
  "valid_count": 0,
  "valid_warnings_count": 0,
  "invalid_count": 0,
  "stale_count": 0,
  "report_missing_count": 0,
  "bundles": [],
  "latest_valid_by_key": []
}
```

Cada entrada en `bundles` incluye rutas, metadatos del summary, flags de seguridad, `valid_status`, `warnings` y `errors`. **No** se copian CSVs ni contenido masivo.

### `valid_status`

| Valor | Significado |
|-------|-------------|
| `valid` | Pasa validación E4.1 + gates read-only |
| `valid_warnings` | Válido con warnings documentados |
| `invalid` | No consumir automáticamente |
| `stale` | Superseded o informe incoherente con el bundle |
| `report_missing` | Válido y readiness-capable sin `setup_readiness_report.json` |

### `latest_valid_by_key`

Clave: `profile_id | campaign_id | parameter_set_id | symbol | timeframe`.

Orden: `created_at_utc` / `exported_at_utc` → `summary_mtime_utc` → ruta (solo desempate interno).

Si `created_at` y `mtime` empatan entre dos runs elegibles: `ambiguous_latest: true` y `candidate_bundle_ids` — **sin** promoción silenciosa.

---

## Validación

Core: `buildTestEaBundleIndex` / `indexTestEaBundleLeaf` en `@workspace/mapazapp-core` (`testea-bundle-index.ts`), reutilizando `validateTestEaExportBundleTexts`.

**E5.20.1.1 — Postura read-only:** `deriveTestEaBundleSafetyPosture` (en `testea-export-bundle-validate.ts`) alinea el índice con `mapazapp:testea-export-validate`. Los summary `backtest_ea_v1` reales (p. ej. SET001 / `MZP_TestEA_E5_18`) **no** incluyen `readOnly` / `executionEnabled` en JSON; se derivan de `tester_only`, `backtest_role`, `backtest_mode`, `official_ea`, `has_real_trading_orders` y `validation.testEa.summaryOk`. Evidencia operador E5.20.1 debe **re-ejecutarse** tras este fix.

Checklist consumo (alineado E5.20):

- `ok === true` (export validate)
- `readOnly === true` (explícito o derivado como export-validate)
- `executionEnabled === false`
- `has_real_trading_orders === false`
- Sin headers CSV duplicados
- `has_setup_readiness_checklist_v1_logic === true` → requerido para `report_missing`

---

## Anti-stale

Se marca `stale` cuando:

1. El informe JSON no coincide con build / `trade_count` / nombre de bundle del summary.
2. Existe un run válido más reciente para la misma clave (`latest_valid_by_key`).

Los datos en disco **no** se borran; solo se reportan.

---

## API core

| Símbolo | Uso |
|---------|-----|
| `buildTestEaBundleIndex(options, io)` | Escaneo completo |
| `indexTestEaBundleLeaf(input)` | Un bundle (tests) |
| `computeLatestValidByKey(bundles)` | Selección latest |
| `testEaBundleIndexToJson(index)` | Serialización |

---

## Tests

```bash
cd APP
pnpm --filter @workspace/mapazapp-core test -- tests/testea-bundle-index.test.ts
pnpm --filter @workspace/scripts test
```

---

## Siguiente paso

**E5.20.2** — CLI que valida el último bundle válido por clave y genera informe readiness en un solo flujo operador.

---

## Referencias

- [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md)
- [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md)
