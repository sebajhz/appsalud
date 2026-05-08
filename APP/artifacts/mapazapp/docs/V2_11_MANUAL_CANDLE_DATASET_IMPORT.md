# V2-11 — Manual Candle Dataset Import / Replay Campaign Input

## Por qué existe

Mapazapp necesita alimentar el motor IFVG y el runner de campañas (V2-10) con series OHLC **controladas** sin automatización MT5 ni lectura de carpetas del terminal. Este checkpoint añade una capa **puramente en core**: texto CSV en memoria → `Candle[]` + metadatos → adaptador opcional a `BacktestCampaignDataset`.

No sustituye exportes reales de BridgeEA: la validación de muestras reales saneadas queda en **V2-12**.

## Alcance y límites explícitos

- **Sí:** `importManualCandleDataset(csvText)` (solo string), detección razonable de delimitador, cabeceras normalizadas, diagnósticos (warnings/errors), `createBacktestCampaignDatasetFromManualImport`.
- **No:** watchers, persistencia en DB, escaneo de carpetas MT5, ejecución de órdenes, lectura de comandos MT5, WebSocket, scanner live, mutación de registry, auto-aprobación.
- **No** se deben commitear exportes crudos reales del terminal; los fixtures en repo son **sintéticos**.

## Formatos soportados

| Formato (`detectedFormat`) | Origen típico | Notas |
|----------------------------|---------------|--------|
| `mapazapp_bridge_candles_v1` | `candles.csv` BridgeEA (`MZP_BRIDGE_V1` / alias legacy en validador) | Requiere el conjunto completo de columnas del contrato BridgeEA para velas. |
| `generic_ohlc` | CSV mínimo OHLC | Columna de tiempo: `time`, `timestamp`, `date`, `datetime` o `candle_time_utc` + `open`,`high`,`low`,`close`. Opcionales: `tick_volume`, `spread_points`, `real_volume`, `is_closed`. |
| `mt5_rates_like` | Exportes estilo historial MT5 | Cabeceras tipo `<DATE>`, `<TIME>` (se normalizan); `date` + `time` + OHLC; delimitador frecuente `;`. Volúmenes/spread opcionales (`tickvol`/`vol`/`spread`). |

`formatHint` puede forzar el formato; si no coincide con la forma del CSV, el import falla con `MANUAL_FORMAT_HINT_MISMATCH`.

`sourceType` en el dataset usa `sourceTypeHint` si se proporciona; si no, se infiere del formato (`bridge_candles_csv_text`, `generic_ohlc_csv_text`, `mt5_export_csv_text`) o queda `unknown` con aviso.

## Mapeo BridgeEA `candles.csv` → `Candle`

| CSV (snake_case) | Core |
|------------------|------|
| `candle_time_utc` | `Candle.time` (ms UTC vía `Date.parse` / ISO) |
| `open` / `high` / `low` / `close` | OHLC |
| `tick_volume` | `tickVolume` |
| `spread_points` | `spreadPoints` |
| `is_closed` | `isClosed` |

`real_volume` se conserva en el modelo de fila interno (`ManualCandleDatasetRow`) cuando aplica; **`Candle` no incluye `real_volume`** en el tipo actual del core.

## Mapeo CSV genérico

Una sola columna temporal parseable (ISO recomendado) + OHLC. Campos opcionales se copian a `Candle` solo si están presentes y son válidos.

## Reglas de validación

- Números OHLC finitos; coherencia **high ≥ max(open, close)** y **low ≤ min(open, close)** (tolerancia numérica mínima).
- Tiempo parseable; salida **ordenada ascendente** por tiempo (aviso `MANUAL_ROWS_REORDERED` si el archivo no venía ordenado).
- **Timestamps duplicados:** no se eliminan automáticamente; se emite `MANUAL_DUPLICATE_TIMESTAMPS` (el motor downstream debe asumir riesgo de duplicados).
- **Símbolo / timeframe** en fila BridgeEA: si difieren de los esperados en `ManualCandleDatasetImportInput`, **warning** (`MANUAL_SYMBOL_MISMATCH` / `MANUAL_TIMEFRAME_MISMATCH`), sin abortar si la fila es válida.
- Filas inválidas: **skip** con `MANUAL_ROW_SKIPPED` cuando es posible.
- Fallo duro si faltan cabeceras requeridas para el formato elegido o si **no queda ninguna** vela válida (`MANUAL_NO_VALID_ROWS`).
- `minRows`: si se define y `validRowCount < minRows`, aviso `MANUAL_LOW_ROW_COUNT` (el resultado puede seguir siendo `ok: true` si hay velas).

## Limitaciones (v1 import)

- Detección de delimitador por **primera línea**; comas dentro de campos citados pueden confundir heurísticas en casos patológicos.
- `mt5_rates_like` asume composición **UTC** de `date` + `time` vía `Date.UTC` (interpretación naive; zonas horarias del terminal no modeladas).
- Formatos fuera de los tres reconocidos → `MANUAL_FORMAT_UNRECOGNIZED`.
- No hay inferencia de `SymbolMarketSpec`; el adaptador de campaña exige que el llamador pase `symbolProfile`.

## Siguiente checkpoint

**V2-12 — Real Export Sample Validation from BridgeEA/TestEA:** validación reproducible sobre muestras **saneadas** locales, sin incluir exportes crudos reales en el repositorio.

## API (core)

- `importManualCandleDataset(input: ManualCandleDatasetImportInput): ManualCandleDatasetImportResult`
- `createBacktestCampaignDatasetFromManualImport(result, options): BacktestCampaignDataset | null`
- Tipos: `manual-candle-dataset-types.ts`; razones: `manual-candle-dataset-reasons.ts`; fixtures sintéticos: `manual-candle-dataset-fixtures.ts`.
