# Mapazapp — XAUUSD Dataset Import / Data Health Plan E3

## 1. Purpose

- **E1** ([`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md)) fijó el foco en **motor + setup** y la secuencia de prueba (bias, backtest, evidencia) con pausa en expansión de runtime.
- **E2** ([`ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md`](./ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md)) auditó el motor y concluyó que la **prueba de setup “E1-completa”** sigue **parcial** (campaña por defecto sin inyección HTF al replay, política de bias no unificada como gate duro, sin contadores de rechazo por bias en resúmenes).
- **E3** (este documento) **prepara el primer dataset real de XAUUSD**: contrato de entrega, formato CSV alineado al código actual, checklist de importación y **plantilla de informe de data health**. Sin un dataset **real** y **sano** no hay prueba seria reproducible del motor sobre mercado vivo.
- **E3 no prueba rentabilidad**, no ejecuta campañas de baseline de producto ni modifica el **Setup V1** congelado en E1/E2.
- **E3.5** (cableado Daily/HTF Bias como gate duro) queda **fuera del alcance de implementación** de E3; solo se documenta la dependencia (ver §11).

**Referencias técnicas existentes:** [`V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`](./V2_11_MANUAL_CANDLE_DATASET_IMPORT.md), [`V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`](./V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md), [`V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md`](./V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md), [`V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`](./V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md).

---

## 2. Current import capabilities

| Pieza | Ubicación / rol | Notas |
|-------|-----------------|--------|
| **Importer core** | `APP/lib/mapazapp-core/src/manual-candle-dataset-importer.ts` | Entrada: `csvText` (string en memoria) + `canonicalSymbol`, `timeframe`, `datasetSplit`, opciones (`formatHint`, `minRows`, `sourceTypeHint`, …). Salida: `ManualCandleDatasetImportResult` (`ok`, `dataset`, `errors`, `warnings`, `validationSummary`). |
| **Tipos** | `manual-candle-dataset-types.ts` | Formatos, códigos de error/warning, resumen de validación. |
| **Adaptador campaña** | `createBacktestCampaignDatasetFromManualImport` (mismo archivo) | Construye `BacktestCampaignDataset` con `datasetId` opcional aportado por el llamador; **no** infiere `SymbolMarketSpec` (sigue siendo responsabilidad del llamador). |
| **CLI read-only** | `APP/scripts/src/mapazapp-import-validate.ts` | `pnpm --filter @workspace/scripts mapazapp:import-validate -- --file … --symbol … --timeframe …` — lee archivo local, delega en `importManualCandleDataset`, imprime resumen humano o `--json`. **Sin** persistencia, **sin** MT5, **sin** ejecución de trading. |
| **Tests** | `mapazapp-import-validate.test.ts` (scripts), `v2-11-manual-candle-dataset-importer.test.ts`, `b2-mt5-data-format-validation.test.ts`, `c1-mt5-fixture-governance.c1.test.ts`, fixtures bajo `tests/fixtures/mt5/` | Los CSV en repo con nombre `*SYNTHETIC*` son **fixtures sintéticos**; **no** sustituyen evidencia de borde real ni “data health” de mercado. |
| **Pipeline campaña manual** | `runManualDatasetCampaign` (V2-13) | Orquesta import + validación de bundles + `runBacktestCampaign`; E3 **no** exige ejecutar esta campaña para cerrar el entregable documental. |

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

## 3. Required dataset for first proof

| Atributo | Requisito |
|----------|-----------|
| **symbol** | `XAUUSD` (canónico; alinear `brokerSymbol` si el CSV usa sufijo de broker). |
| **source** | CSV exportado desde MT5 (histórico / Rates) **o** CSV `candles.csv` estilo BridgeEA (`mapazapp_bridge_candles_v1`), u OHLC genérico si el operador controla el esquema. |
| **Timeframe de ejecución** | **M15** recomendado para la primera prueba seria de replay/campaña, salvo que el contrato de parámetros fije otro TF explícitamente. |
| **Contexto HTF / Daily bias** | Para alineación con E1/E2: series **H1, H4, D1** además del TF de ejecución (ver §7). |
| **Rango mínimo** | **3 a 6 meses** de velas M15 (aprox. orden de magnitud coherente con estadísticas iniciales). |
| **Rango ideal** | **1 a 2 años**. |
| **Timezone** | **Declarado por el operador** (offset o convención “velas en UTC / en hora del servidor MT5”); el código MT5-like asume composición UTC en el parseo — cualquier desajuste debe documentarse como **riesgo de bias temporal**. |
| **OHLC** | Completo y coherente en todas las filas válidas. |
| **Volumen / spread** | Opcional en CSV genérico y MT5-like; obligatorio en contrato Bridge completo según columnas requeridas. |
| **Duplicados** | Idealmente **ninguno**; si existen, el core solo **advierte** — el informe de salud debe marcarlo. |
| **Gaps** | Diagnosticados en el informe E3 (conteo / ventanas grandes); el importer **no** los calcula solo. |

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

## 7. Multi-timeframe requirement for bias

- **E4/E5** alineados a E1 requieren contexto **H1 / H4 / D1** para que `evaluateContextBias` y la política de decisión tengan sentido cuando se cablee `htfCandlesByTimeframe` al replay/campaña (**E3.5** / trabajo post-E2).
- Si el operador solo entrega **M15**, las opciones son:
  - **A.** Resample offline (herramienta externa o futura utilidad en core) hacia H1/H4/D1 — debe documentarse el método y riesgos de look-ahead.
  - **B.** Importar **CSV separados** por TF (recomendado para primera prueba seria): mismo bróker, misma convención de tiempo.
  - **C.** Posponer el **bias hard gate** y etiquetar cualquier run como **“sin HTF / sin bias gate”** (no baseline E1-completo).
  - **D.** Tratar **E3.5** como prerequisito si E4 debe llamarse baseline con bias duro.

**Recomendación E3:** para la primera prueba seria, pedir **M15 + H1 + H4 + D1** (cuatro archivos o un paquete equivalente) con la **misma fuente y TZ documentada**. **No** presentar resultados como “Daily Bias audit” si solo hay un TF sin resampleo validado.

**Estado del core:** el importador **no** resamplea; no hay evidencia en E3 de un resample oficial en repo — **B** o **D** son las vías conservadoras.

---

## 8. E3 deliverables

| Entregable | Estado |
|------------|--------|
| **Contrato de dataset** XAUUSD | §3–§4 de este documento. |
| **Checklist de import readiness** | §10 + verificación CLI opcional (`mapazapp-import-validate`) cuando exista CSV real. |
| **Plantilla de informe data health** | §9. |
| **Decisión de formato CSV** | Elegir entre Bridge / MT5-like / genérico según origen; si no encaja → convertir offline. |
| **Lista de archivos que debe proveer el usuario** | §10. |
| **Gaps para E3.5 / E4** | Sin CSV real en repo: **gap** operativo; sin HTF en campaña: **gap** técnico documentado en E2; sin contadores bias: **gap** E4/E5. |

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

**Opción mínima (solo mecánica de motor, sin HTF completo para bias E1):**

- `XAUUSD` **M15** CSV válido según §4, **3–6 meses**.

**Opción recomendada (alineada con E1/E2 y futura E3.5):**

- `XAUUSD` **M15**, **H1**, **H4**, **D1** (cuatro datasets).
- Misma fuente (mismo bróker / mismo export MT5 o mismo Bridge).
- Misma convención de tiempo documentada.
- **~1 año** de historia si es posible.

**Opción ideal:**

- **2 años** de datos.
- Incluir **spread** y **tick volume** cuando el export lo permita (Bridge ya los exige; MT5-like opcional).

**Política de repo:** no commitear CSV reales crudos; staging local (p. ej. carpetas ignoradas por `.gitignore` tipo `mt5-history`) según gobernanza existente.

---

## 11. Relationship with E3.5

- **E3** deja listo el **contrato de datos** y la **salud** esperada del primer dataset real.
- **E3.5** debe **cablear Daily/HTF Bias como gate duro** en el camino de campaña/replay por defecto (inyección `htfCandlesByTimeframe`, política unificada, contadores tipo `rejected_by_daily_bias` / `skipped_neutral_bias` en resúmenes) si E4 debe cumplir E1 al pie de la letra.
- **E4** no debe denominarse **“baseline real del setup E1”** hasta que existan **bias gate** uniforme y evidencia de rechazos — puede existir un **E4-pre** mecánico sin bias duro si se etiqueta explícitamente.

---

## 12. Decision

| Pregunta | Respuesta |
|----------|-----------|
| **¿Estamos listos para importar un dataset real?** | **Sí a nivel de herramientas** (`importManualCandleDataset` + CLI validate). Falta el **archivo real** aportado por el operador y completar el **informe §9** sobre ese archivo. |
| **¿Qué archivos se necesitan?** | Ver §10; recomendado M15+H1+H4+D1. |
| **¿Puede correr E4 después de E3?** | **E4-pre (mecánica)** sí, con M15 + perfil de símbolo y consciente de limitaciones E2. **E4 como baseline E1-completo** **no**, sin **E3.5** (y sin HTF inyectado). |
| **¿Es obligatorio E3.5?** | **Sí**, si la definición de E4 incluye **Daily Bias V1 como gate duro** y métricas de rechazo; **no**, si E4 se acota explícitamente a replay sin bias HTF. |

---

## 13. Non-goals

Fuera del alcance de **E3**:

- Probar rentabilidad o edge estadístico.
- Parameter grid, walk-forward productivos, optimización.
- Dashboard, API en marcha, supervisor, wrapper, `mapazapp:dev-start`.
- MT5 live, watcher, trading, órdenes, WebSocket, DB, push.
- Implementación de backtest nuevo o cambios al **Setup V1** documental.
