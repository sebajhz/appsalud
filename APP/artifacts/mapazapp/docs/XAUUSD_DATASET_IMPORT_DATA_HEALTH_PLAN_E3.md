# Mapazapp — XAUUSD Dataset Import / Data Health Plan E3

> **Corrección E3.1:** el **backtest principal del setup** se ejecuta en **MT5 Strategy Tester** con el futuro EA **`Mapazapp_BacktestEA`**. Este documento describe **salud de datos y contratos de archivos CSV/JSON** como **exportación / evidencia** hacia Mapazapp (validación, import), **no** como sustituto del Strategy Tester. Ver [`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md).

## 1. Purpose

- **E1** ([`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md)) fijó el foco en **motor + setup** y la secuencia de prueba (bias, backtest, evidencia) con pausa en expansión de runtime.
- **E2** ([`ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md`](./ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md)) auditó el motor TypeScript; la **prueba canónica del setup** se reorientó a **MQL5 + Strategy Tester** (**E3.1**).
- **E3** (este documento) define **contratos y data health** para archivos que **salen de MT5** (export EA, export Bridge, rates CSV auxiliar) o que se **importan en Mapazapp** para análisis: checklist, formatos reconocidos por el importador actual y **plantilla de informe de calidad**. **No** posiciona CSV externo como motor principal del backtest.
- **E3 no prueba rentabilidad** ni sustituye una corrida oficial en el tester; no modifica el **Setup V1** documental.
- El **Daily Bias como gate duro principal** para la prueba de setup se implementará en el **EA** (fases **E3.4** / **E3.5** MQL5 según [`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md) §9), no como hito TypeScript “E3.5” previo.

**Referencias técnicas existentes:** [`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md), [`V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`](./V2_11_MANUAL_CANDLE_DATASET_IMPORT.md), [`V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`](./V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md), [`V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md`](./V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md), [`V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`](./V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md).

---

## 2. Current import capabilities

| Pieza | Ubicación / rol | Notas |
|-------|-----------------|--------|
| **Importer core** | `APP/lib/mapazapp-core/src/manual-candle-dataset-importer.ts` | Entrada: `csvText` (string en memoria) + `canonicalSymbol`, `timeframe`, `datasetSplit`, opciones (`formatHint`, `minRows`, `sourceTypeHint`, …). Salida: `ManualCandleDatasetImportResult` (`ok`, `dataset`, `errors`, `warnings`, `validationSummary`). |
| **Tipos** | `manual-candle-dataset-types.ts` | Formatos, códigos de error/warning, resumen de validación. |
| **Adaptador campaña** | `createBacktestCampaignDatasetFromManualImport` (mismo archivo) | Construye `BacktestCampaignDataset` con `datasetId` opcional aportado por el llamador; **no** infiere `SymbolMarketSpec` (sigue siendo responsabilidad del llamador). |
| **CLI read-only** | `APP/scripts/src/mapazapp-import-validate.ts` | `pnpm --filter @workspace/scripts mapazapp:import-validate -- --file … --symbol … --timeframe …` — lee archivo local, delega en `importManualCandleDataset`, imprime resumen humano o `--json`. **Sin** persistencia, **sin** MT5, **sin** ejecución de trading. |
| **Tests** | `mapazapp-import-validate.test.ts` (scripts), `v2-11-manual-candle-dataset-importer.test.ts`, `b2-mt5-data-format-validation.test.ts`, `c1-mt5-fixture-governance.c1.test.ts`, fixtures bajo `tests/fixtures/mt5/` | Los CSV en repo con nombre `*SYNTHETIC*` son **fixtures sintéticos**; **no** sustituyen evidencia de borde real ni “data health” de mercado. |
| **Pipeline campaña manual** | `runManualDatasetCampaign` (V2-13) | Orquesta import + validación de bundles + `runBacktestCampaign`; uso **auxiliar** (no motor principal del setup proof; ver **E3.1**). |

**Validaciones que el importer ya realiza (resumen):**

- CSV no vacío; cabecera presente; delimitador `,` / `;` / `\t` detectado por primera línea; celdas citadas estilo RFC4180.
- Reconocimiento de formato: `mapazapp_bridge_candles_v1`, `generic_ohlc`, `mt5_rates_like` (o error `MANUAL_FORMAT_UNRECOGNIZED` / `MANUAL_FORMAT_HINT_MISMATCH`).
- OHLC finitos y coherentes (`high` / `low` vs `open`/`close` con tolerancia numérica); filas inválidas → skip con warning cuando aplica.
- Timestamps parseables; salida **ordenada** por tiempo; aviso `MANUAL_ROWS_REORDERED` si el archivo no venía ordenado.
- Conteo de **duplicados de timestamp** tras ordenar → warning `MANUAL_DUPLICATE_TIMESTAMPS` (**no** deduplica).
- Bridge: mismatch símbolo/timeframe en fila vs input → warnings; `schema_version` no soportada → skip de fila.
- Opcional: `minRows` → warning `MANUAL_LOW_ROW_COUNT` si hay menos velas válidas que el umbral.

**Limitaciones explícitas (v1):**

- **No** calcula gaps de sesión, recuento de velas “esperadas” por calendario, ni outliers estadísticos; **no** emite un JSON único estándar de “data health” en el repo (E3 define plantilla operativa).
- `mt5_rates_like`: fecha+hora se componen con **`Date.UTC`** (interpretación **naive**; **no** modela zona horaria del terminal en el parser).
- **No** hay resampleo automático M15→H1/H4/D1 en el importador.
- `SymbolMarketSpec` debe ser provisto aparte para usar el dataset en `runBacktestCampaign` (sin perfil → run insuficiente).

---

## 3. Required evidence / export quality (XAUUSD)

| Atributo | Requisito |
|----------|-----------|
| **symbol** | `XAUUSD` (canónico; alinear sufijo de broker en export EA/MT5). |
| **source** | **Preferente:** export de evidencia desde **`Mapazapp_BacktestEA`** o artefactos Bridge acordados. **Auxiliar:** CSV rates desde MT5 solo para validación de forma / tests, **no** como definición del backtest principal. |
| **Timeframe de ejecución** | **M15** recomendado para la primera campaña XAUUSD en tester, salvo contrato distinto en **E3.2**. |
| **Contexto HTF / Daily bias** | En el **EA** el tester provee multi-TF nativo; los CSV de evidencia deben documentar qué TF exporta cada archivo si aplica. |
| **Rango mínimo** | **3 a 6 meses** de historia en tester (o longitud equivalente en export agregado). |
| **Rango ideal** | **1 a 2 años**. |
| **Timezone** | Declarado en el export / runbook; coherente con la sesión del bróker en MT5. |
| **OHLC** (si el export incluye velas) | Completo y coherente en filas válidas. |
| **Volumen / spread** | Opcional según export; recomendado si el EA los emite. |
| **Duplicados** | Idealmente ninguno en series temporales exportadas. |
| **Gaps** | Diagnosticados en el informe E3; el importer core **no** sustituye al análisis de calidad del run en tester. |

---

## 4. CSV format contract

El código reconoce **tres** familias. Los nombres de cabecera se **normalizan** a minúsculas y espacios → `_`.

### 4.1 `mapazapp_bridge_candles_v1` (BridgeEA)

Columnas **requeridas** (todas deben existir): `schema_version`, `export_id`, `exported_at_utc`, `terminal_id`, `account_login`, `symbol`, `timeframe`, `candle_time_utc`, `open`, `high`, `low`, `close`, `tick_volume`, `spread_points`, `real_volume`, `is_closed`, `source`.

- Tiempo: `candle_time_utc` parseado vía `Date.parse` / ISO.
- Filas con `schema_version` no soportada: skip con warning.

### 4.2 `generic_ohlc`

- **Tiempo (una columna):** primera coincidencia entre `time`, `timestamp`, `candle_time_utc`, `datetime`, `date`.
- **OHLC:** `open`, `high`, `low`, `close`.
- **Opcionales:** `tick_volume`, `spread_points`, `real_volume`, `is_closed`.

### 4.3 `mt5_rates_like`

- **Requeridas:** `date`, `time`, `open`, `high`, `low`, `close` (cabeceras MT5 `<DATE>`, `<TIME>` se normalizan a `date`, `time`).
- **Volumen / spread opcionales:** `tickvol` **o** `tick_volume` **o** `volume`; `vol` **o** `real_volume`; `spread` **o** `spread_points`.
- **Formato fecha:** `YYYY.MM.DD` (también acepta `/` normalizado a `.`); hora `HH:MM:SS`.

### 4.4 Gaps / variantes

- Delimitador: coma, punto y coma o tab.
- Si el CSV real usa otro esquema de columnas → **gap**: extender importer o convertir offline a uno de los tres formatos.
- **Símbolo/timeframe en fila:** en Bridge se comparan con `canonicalSymbol` / `timeframe` del input; en MT5-like **no** hay columnas obligatorias de símbolo/TF en el detector — el TF y símbolo vienen del **CLI/input** del llamador.

---

## 5. Data health checks

**Cubierto directamente por `importManualCandleDataset` / CLI validate:**

- Esquema reconocible y columnas mínimas por formato.
- Parseo de timestamps y números OHLC.
- Ordenación ascendente de salida + detección de desorden de entrada.
- Duplicados de timestamp (conteo y warning).
- Reglas OHLC (high/low vs open/close).
- Implícitamente precios no “no-finitos”; no hay chequeo explícito de “precio negativo” como categoría separada (un OHLC negativo en oro sería capturado como dato anómalo en revisión manual / outliers).

**Recomendado en el informe E3 (proceso operador / hoja o script futuro, no todo en core hoy):**

- Rango de fechas declarado vs primera/última vela importada.
- Conteo de velas vs **conteo esperado** para M15 en el rango (ajustado por calendario del bróker / cierres).
- **Missing candles** (huecos mayores que el paso del TF).
- **Large gaps** (mantenimiento, festivos, datos corruptos).
- **Weekend / cierres de mercado** esperados vs gaps inesperados intrasemana.
- **Coincidencia** símbolo/timeframe declarados vs contenido (Bridge).
- **Timezone warning** explícito (coherencia UTC vs hora broker).
- **Outliers** (spikes OHLC, spreads absurdos si columna existe).
- **Valores faltantes** en columnas opcionales.
- **Estado de calidad** agregado (`pass` / `pass_with_warnings` / `fail`) según umbrales acordados con el equipo.

---

## 6. Dataset identity

Concepto recomendado (el código acepta `datasetId` string en el adaptador; el operador/versionado define la cadena):

`datasetId = symbol + "_" + timeframe + "_" + slug(source) + "_" + dateFrom + "_" + dateTo + "_" + shortHash`

Donde `shortHash` puede ser hash del archivo original (SHA-256 truncado) para detectar cambios.

**Metadatos a conservar junto al dataset (runbook / sidecar JSON manual, fuera de E3 code):**

| Campo | Descripción |
|-------|-------------|
| `symbol` | Canónico (p. ej. `XAUUSD`). |
| `timeframe` | `M15`, `H1`, etc. |
| `source` | `mt5_export`, `bridge_candles`, `generic_csv`, … |
| `importedAt` | ISO UTC de cuando se validó/importó. |
| `dateFrom` / `dateTo` | Primera y última vela **válida** post-import. |
| `candleCount` | Número de velas en `dataset.candles`. |
| `warnings` | Lista de códigos/mensajes del importer + notas manuales (gaps, TZ). |
| `qualityStatus` | `pass` \| `pass_with_warnings` \| `fail`. |

---

## 7. Multi-timeframe and Daily Bias (EA vs import)

- **En MT5 Strategy Tester**, el **`Mapazapp_BacktestEA`** debe obtener **H1 / H4 / D1** (y TF de ejecución) **desde el propio terminal/tester** para Daily Bias y Setup V1; **no** depende de CSV externos como fuente principal.
- Los archivos CSV/JSON tratados en E3 sirven para **evidencia exportada** o **validación offline** de forma compatible con el importador TypeScript.
- Si solo se dispusiera de un CSV de velas **sin** corrida en tester, debe etiquetarse como **auxiliar / legacy**, no como baseline oficial del setup (ver **E3.1**).
- El gate duro de bias en producto **pasa al EA** (fases **E3.4–E3.5** MQL5 en la secuencia **E3.1** §9), no al cableado previo de `runBacktestCampaign`.

---

## 8. E3 deliverables

| Entregable | Estado |
|------------|--------|
| **Contrato de dataset** XAUUSD | §3–§4 de este documento. |
| **Checklist de import readiness** | §10 + verificación CLI opcional (`mapazapp-import-validate`) cuando exista CSV real. |
| **Plantilla de informe data health** | §9. |
| **Decisión de formato CSV** | Elegir entre Bridge / MT5-like / genérico según origen; si no encaja → convertir offline. |
| **Lista de archivos que debe proveer el usuario** | §10. |
| **Gaps para E3.6 / E4** | Sin export de evidencia: **gap** operativo; sin esquema EA acordado: **gap** contrato (**E3.2** / **E3.6**). |

---

## 9. Data health report template

```yaml
datasetId: "<symbol>_<tf>_<sourceSlug>_<from>_<to>_<shortHash>"
sourceFile: "<nombre archivo local o referencia externa, sin path sensible>"
symbol: "XAUUSD"
timeframe: "M15"
timezoneDeclared: "<ej. UTC broker-stated / Europe-Berlin export>"
dateRange:
  from: "<ISO>"
  to: "<ISO>"
candleCount: 0
expectedCandleCount: null  # o entero si se calculó con calendario
missingCandles: null      # estimado
duplicateTimestamps: 0
ohlcErrors: 0             # filas skipped / invalid
outliersFlagged: []
gaps:
  count: null
  largestMs: null
  notes: ""
importerWarnings: []      # códigos MANUAL_*
importerErrors: []
warnings: []               # manuales + importer
status: "pass"            # pass | pass_with_warnings | fail
nextAction: ""
```

---

## 10. User-provided files needed

**Opción mínima (validación de pipeline de import / forma de archivo):**

- Muestra de **export CSV/JSON** desde el futuro **`Mapazapp_BacktestEA`** o CSV rates auxiliar válido según §4, etiquetado como **evidencia**, no como sustituto del tester.

**Opción recomendada (alineada con E3.1):**

- Ejecutar (cuando exista EA) **Strategy Tester** en MT5 y conservar **export de evidencia** acordado (trades, bias, métricas).
- Documentar símbolo, TF, rango y versión del EA en el runbook.

**Opción ideal:**

- Campaña de tester con **histórico largo** (1–2 años) y export completo de métricas y **`rejected_by_daily_bias`**.

**Política de repo:** no commitear datos operativos crudos; staging local ignorado por Git.

---

## 11. Relationship with E3.1 and the new E-phase sequence

- **E3.1** redefine el **motor de backtest principal** → **MT5 Strategy Tester + `Mapazapp_BacktestEA`** ([`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md)).
- **E3** (este doc) sigue aplicando a **calidad de exportes** y validación de CSV/JSON **hacia Mapazapp**.
- La secuencia **E3.4–E3.6** MQL5 sustituye la antigua expectativa de un **“E3.5” TypeScript** como gate principal de Daily Bias; el trabajo TypeScript opcional queda **auxiliar** (ver E2).

---

## 12. Decision

| Pregunta | Respuesta |
|----------|-----------|
| **¿Estamos listos para importar evidencia CSV/JSON?** | **Sí a nivel de herramientas** (`importManualCandleDataset` + CLI) cuando exista **export** desde el EA o Bridge; el **backtest oficial** del setup es en **tester**. |
| **¿Qué archivos se necesitan?** | Ver §10: prioridad a **exports del BacktestEA** una vez existan (**E3.6**). |
| **¿Puede correr E4 después de E3?** | **E4** en la nueva secuencia es **primer smoke en Strategy Tester** (**E3.1** §9), no “E4” como campaña TypeScript previa. |
| **¿Sigue siendo relevante cablear bias en TypeScript?** | Solo como **auxiliar**; el **gate principal** va al **EA** (**E3.4**). |

---

## 13. Non-goals

Fuera del alcance de **E3**:

- Probar rentabilidad o edge estadístico.
- Parameter grid, walk-forward productivos, optimización.
- Dashboard, API en marcha, supervisor, wrapper, `mapazapp:dev-start`.
- MT5 live, watcher, trading, órdenes, WebSocket, DB, push.
- Implementación de backtest nuevo o cambios al **Setup V1** documental.
