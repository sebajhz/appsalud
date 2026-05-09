# V2-12 — Real Export Sample Validation (BridgeEA / TestEA)

## Por qué existe

Tras V2-11 el core puede convertir `candles.csv` estilo BridgeEA en `ManualCandleDataset` / `BacktestCampaignDataset` usando solo texto en memoria. V2-12 añade una **capa de validación reproducible** para comprobar que **muestras saneadas** (ficticias o redactadas) de exportes BridgeEA y TestEA encajan con los parsers/importers existentes, **sin** commitear exportes crudos reales y **sin** leer carpetas del terminal.

No sustituye un producto de ingest en vivo: no hay watcher, no hay escaneo de `MQL5/Files`, no hay base de datos.

## Qué valida el core

### BridgeEA (texto en memoria)

| Artefacto | Comportamiento |
|-----------|----------------|
| `bridge_status.json` | `parseBridgeStatusJson`; se espera contrato `MZP_BRIDGE_V1` (alias legacy `QTG_BRIDGE_V1` admite aviso). |
| `candles.csv` | `importManualCandleDataset` (formato auto / Bridge); opcional `createBacktestCampaignDatasetFromManualImport` si se pasa `symbolProfile`. |
| `latest_market_snapshot.csv`, `account_snapshot.csv`, `positions_open.csv`, `orders_pending.csv`, `deals_history.csv`, `bridge_errors.csv` | Parsers Bridge existentes; si falta un archivo opcional, aviso informativo; fallo si el CSV no cumple cabecera/contrato. |

### TestEA

| Artefacto | Comportamiento |
|-----------|----------------|
| `backtest_trades.csv` | `importBacktestTradesFromCsv` con opciones de import (sin aprobación ni ejecución). |
| `backtest_summary.json` | JSON parseado; `schema_version` debe ser `MZP_TESTEA_V1`; `execution_mode` debe ser `virtual_export_only`; `live_trading_enabled` debe ser `false`; `trade_count` numérico ≥ 0. |

## API principal

- `validateBridgeEaExportSample(input)` → `BridgeExportValidationResult`
- `validateTestEaExportSample(input, { importOptions })` → `TestEaExportValidationResult`
- `validateExportSampleBundle(input, testEaOptions?)` → `ExportSampleValidationResult` (mezcla Bridge + TestEA según `bundleKind` o detección por nombres de archivo)
- `scanExportSamplePrivacy(files, mode)` → heurísticas conservadoras (login largo, servidor “live”, métricas enormes en snapshot de cuenta)
- `inferExportSampleFileKind(fileName)` → tipo de archivo por nombre estándar

`ExportSampleValidationInput` solo acepta `{ fileName, text, fileKind? }[]`: **sin rutas**, **sin `fs`**.

## Privacidad y saneamiento

- Modo **`strict`**: hallazgos sensibles pueden marcar `privacy.passed === false` y elevar el bundle a **`invalid`** (p. ej. login con muchos dígitos, `account_server` con patrón broker live).
- Modo **`relaxed`**: mismos patrones suelen ser **warning** sin fallar el chequeo de privacidad.
- **No** incluir en repos: logins reales, servidores reales, balances/equity reales, precios live, resultados de trades reales.
- Los fixtures en `export-sample-validation-fixtures.ts` son **100 % sintéticos**.

## Diferencia respecto a “watch” de carpetas

Este checkpoint **no** observa el sistema de archivos del MT5 ni sincroniza exportes automáticamente. El operador copia/pega o carga texto en un flujo futuro (p. ej. UI/CLI V2-17); el core solo valida el **texto recibido**.

## Relación con V2-13

V2-13 (`runManualDatasetCampaign`) ejecuta el runner de campañas sobre datasets construidos desde CSV manual y/o bundles validados aquí; V2-12 asegura que la forma de los exportes encaja con el core **antes** de mezclar evidencia multi-run. Un bundle **solo TestEA** valida evidencia de backtest exportado, no suministra velas OHLC para replay IFVG.

## Limitaciones

- Heurísticas de privacidad son **conservadoras pero no completas**; la responsabilidad final de no filtrar datos sigue siendo humana.
- Validar un bundle no implica rentabilidad, calidad de mercado ni paridad con un terminal concreto.
- `tester_from` / `tester_to` en el JSON de resumen pueden ser `null` según contrato TestEA.

## Archivos de referencia

- Implementación: `APP/lib/mapazapp-core/src/export-sample-validation*.ts`
- Tests: `APP/lib/mapazapp-core/tests/v2-12-export-sample-validation.test.ts`
- Contratos: `EXPORT_CONTRACT.md` en carpetas BridgeEA / TestEA bajo `APP/artifacts/mt5/experts/`.
