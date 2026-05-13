# Mapazapp — TestEA export bundle validation (E4.1)

## 1. Purpose

- **E4.1** entrega un **CLI read-only** para validar **carpetas reales** exportadas por **`Mapazapp_TestEA`** tras un run en **MetaTrader 5 Strategy Tester**.
- Comprueba los tres archivos canónicos del contrato **E3.6** / evidencia **E4**, preparando el flujo hacia **E5** (campañas XAUUSD en tester) sin medir rentabilidad.
- **No** ejecuta MT5, **no** abre Strategy Tester, **no** modifica archivos, **no** hace trading, **no** usa dashboard/API.

## 2. Command

Desde el directorio **`APP/`** del monorepo (recomendado), usando **ruta absoluta** al folder del run (evita ambigüedad con el `cwd` del paquete `scripts`):

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "<ruta-absoluta-a-carpeta-run>"
```

Ejemplo con samples del repo:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "e:/MAPAZAPP/APP/artifacts/mt5/experts/Mapazapp_TestEA/samples" --json
```

Opciones:

| Flag | Rol |
|------|-----|
| `--bundle <path>` | Carpeta **hoja** que contiene exactamente `backtest_summary.json`, `backtest_events.csv`, `backtest_trades.csv` (puede ser anidada bajo `…/TestEA/<campaign_id>/<folder_leaf>/` — **E5.5.0**). |
| `--json` | Salida JSON (`ok`, `status`, `errors`, `warnings`, `summary` recortado, `files`, `eventCounts`, `bundle` = basename). |
| `--strict` | Promueve **warnings materiales** a errores (exit 1). **No** aplica a `CSV_HEADER_ONLY_NO_TRADE_ROWS` (cabecera sin filas es esperable con `trade_count = 0`). |
| `--max-events-preview <n>` | Con `--json`, incluye hasta `n` líneas iniciales del CSV de eventos (tope interno 40). |
| `--events-large-warn-bytes <n>` | Umbral para aviso de CSV de eventos grande (default 1_500_000 bytes). |

Códigos de salida: **0** éxito, **1** fallo de validación / lectura, **2** argumentos inválidos.

## 3. Core API

- **`validateTestEaExportBundleTexts`** (`@workspace/mapazapp-core`) — validación en memoria sobre **strings** UTF-8 de los tres archivos (útil para tests y tooling sin `fs` en el core).
- **`parseBacktestEventsCsv(..., { bundleContract: true })`** — exige `event_id`, `timestamp`, direcciones wire, y tipos de evento mínimos (`lifecycle_init`, `skeleton_ready`, `daily_bias_evaluated`, `lifecycle_deinit`).

## 4. Validaciones (resumen)

- **E5.5.0+ (rutas anidadas):** el importador usa `summary.effective_run_id` cuando existe, de modo que el **basename** de la carpeta puede diferir de `summary.run_id` sin invalidar el bundle — ver [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md).
- **Archivos:** los tres nombres exactos, no vacíos.
- **Summary (`backtest_ea_v1`):** `schema_version`, `official_ea`, `tester_only`, `backtest_role`, flags IFVG/bias/órdenes/pipeline según E3.6; `symbol`, `execution_timeframe`, `daily_bias_timeframe`; contadores numéricos `total_bias_evaluated`, `total_setup_candidates`, `allowed_setups`, `rejected_by_daily_bias`. **`trade_count`:** por defecto (post–E5.3) debe **coincidir** con filas CSV; opción `requireTradeCountZero: true` fuerza `trade_count === 0` (bundles legacy E4.x). Si `trade_count > 0`, se exige **`has_real_virtual_trade_logic: true`**.
- **Events:** `parseBacktestEventsCsv` + reglas bundle; heurística de **ruta privada** en `details` (warning); aviso si falta cualquier evento `setup_*` (rango corto — no siempre bug).
- **Trades:** cabecera válida; filas con `trade_count = 0` → **warning** `TESTEA_TRADE_ROWS_WHILE_TRADE_COUNT_ZERO` (no error por defecto); mismatch distinto → error vía `validateTestEaExportSample`.

## 5. Estados OK / WARNING / FAILED

| Estado | Significado |
|--------|-------------|
| **OK** | Sin errores; sin warnings “materiales” (pueden quedar avisos ignorados para estado, p. ej. CSV solo cabecera). |
| **WARNING** | Sin errores; hay warnings (p. ej. CSV grande, heurística `testea` minúscula en ruta, sin eventos setup). |
| **FAILED** | Errores de contrato, JSON inválido, eventos inválidos, summary incoherente, etc. Con `--strict`, warnings materiales pasan a errores `STRICT_*`. |

## 6. Uso post Strategy Tester

1. Ejecutar el smoke o campaña en **Strategy Tester** (solo tester).
2. Copiar la carpeta del `run_id` (tres archivos) a una ubicación accesible.
3. Correr el CLI con `--bundle` apuntando a esa carpeta (ruta absoluta recomendada).
4. Si **FAILED** o **strict** con errores: revisar export, versión del EA, o rango de datos antes de **E5**.

## 7. Relación con E5

- **E5** ([`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md)) exige tratar la validación E4.1 como **paso obligatorio por run**: cada carpeta de export (summary + events + trades) debe pasar por este CLI (o `validateTestEaExportBundleTexts` en tooling) **antes** de consolidarla en informes de campaña o índices.
- El CLI **no** sustituye análisis de edge ni rentabilidad; solo **integridad de bundle** y coherencia con el contrato congelado.

## 8. Referencias

- [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md)
- [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md)
- [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md)
- `APP/scripts/src/mapazapp-testea-export-validate.ts`
- `APP/lib/mapazapp-core/src/testea-export-bundle-validate.ts`
