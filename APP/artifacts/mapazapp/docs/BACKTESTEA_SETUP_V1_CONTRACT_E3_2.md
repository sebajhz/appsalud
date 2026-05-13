# Mapazapp — BacktestEA Setup V1 Contract E3.2

## 1. Purpose

- **E3.1** ([`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md)) corrigió el enfoque: el **backtest principal del setup proof** vive en **MT5 Strategy Tester**, no en TypeScript ni en CSV externo como motor.
- **E3.2** (**este documento**) **congela el contrato formal** del futuro EA de backtest (**`Mapazapp_BacktestEA`**, nombre conceptual) **antes** de escribir lógica nueva de IFVG/bias en MQL5.
- El **EA** será el **motor principal** de simulación del setup en tester; **Mapazapp** (dashboard / core) **lee y valida** la **evidencia exportada**.
- **E3.2 no implementa MQL5**, no ejecuta MT5 ni Strategy Tester.

> **Nota E3.4.1–E3.4.2:** el rol contractual *BacktestEA* vive en **`Mapazapp_TestEA`**. La carpeta temporal **`Mapazapp_BacktestEA`** (E3.3–E3.4) se **eliminó del árbol** en **E3.4.2** tras migrar la lógica; el historial permanece en Git.

**Relacionado:** [`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md), [`ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md`](./ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md), [`XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md`](./XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md), [`MT5_DATA_INTEGRATION.md`](./MT5_DATA_INTEGRATION.md), [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](./BACKTESTEA_DAILY_BIAS_V1_E3_4.md), [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](./BACKTESTEA_IFVG_SETUP_V1_E3_5.md), artefactos `APP/artifacts/mt5/experts/Mapazapp_TestEA/`, `Mapazapp_BridgeEA/`.

---

## 2. Current MT5 artifacts

### 2.1 Mapazapp_BridgeEA (`Mapazapp_BridgeEA.mq5`)

| Aspecto | Estado (CP13) |
|---------|----------------|
| Rol | **Export-only** hacia `MQL5/Files/…` (cuenta, mercado, velas, posiciones, órdenes, deals, errores, `bridge_status.json`). |
| Trading | **Sin** `OrderSend`, **sin** `CTrade`, **sin** ejecución. |
| Comandos / red | **Sin** ingest de command files, **sin** `WebRequest`, **sin** DLLs. |
| Uso | Terminal **live** (gráfico) para **lectura/estado/datos** hacia Mapazapp; **no** es el EA de Strategy Tester del setup proof. |

### 2.2 Mapazapp_TestEA (`Mapazapp_TestEA.mq5`) — **E3.4.2 (oficial)**

| Aspecto | Estado |
|---------|--------|
| Entorno | **Solo Strategy Tester** (`MQL_TESTER`); fuera → **`INIT_FAILED`**. |
| Trading | **Sin** `OrderSend` / **sin** `CTrade`; **sin** filas de trade sintéticas (CSV de trades solo cabecera). |
| Export | `backtest_trades.csv` (cabecera), `backtest_events.csv`, `backtest_summary.json`; escritura **atómica** (`*.tmp` + `FileMove`). |
| Daily Bias | **V1 implementado** — ver [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](./BACKTESTEA_DAILY_BIAS_V1_E3_4.md). |
| Schema summary | Default **`backtest_ea_v1`** (`official_ea: Mapazapp_TestEA`, `backtest_role: true`, flags `has_real_*`). |
| IFVG / setup | **E3.5** — detección **candidata FVG** (tres velas cerradas, alineada con `fvg-detector.ts` del core), gate Daily Bias, eventos `setup_*`; sin conversión IFVG completa ni órdenes — ver [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](./BACKTESTEA_IFVG_SETUP_V1_E3_5.md). |
| Import TS | CSV sin filas de datos → `importBacktestTradesFromCsv` devuelve **0 trades** con aviso `CSV_HEADER_ONLY_NO_TRADE_ROWS`; bundles legacy **`MZP_TESTEA_V1`** siguen validándose en fixtures. |

**Conclusión:** **`Mapazapp_TestEA`** es el **único EA físico oficial** del Strategy Tester para el rol BacktestEA / setup proof.

### 2.3 Histórico — `Mapazapp_BacktestEA` (E3.3–E3.4, **removido en E3.4.2**)

Entre **E3.3** y **E3.4** existió un tercer archivo `Mapazapp_BacktestEA.mq5` bajo `APP/artifacts/mt5/experts/Mapazapp_BacktestEA/` con esqueleto tester-only + Daily Bias V1. En **E3.4.2** esa lógica se **fusionó** en **`Mapazapp_TestEA.mq5`** y la carpeta se **eliminó** del repositorio activo (no borra el historial Git).

---

## 3. BacktestEA identity

| Campo | Definición |
|-------|------------|
| **Nombre conceptual** | `Mapazapp_BacktestEA` — producto lógico “EA de setup proof en Strategy Tester”. |
| **Opción A** | Nuevo archivo `Mapazapp_BacktestEA.mq5` (copia inicial desde TestEA, divergencia limpia). |
| **Opción B** | **Evolucionar** `Mapazapp_TestEA.mq5` in-place (mismo repo-path; renombrar `#property` / versión cuando el contenido deje de ser placeholder). |
| **Opción C (híbrida)** | Mantener `Mapazapp_TestEA` como **smoke mínimo** CP14 y crear `Mapazapp_BacktestEA` para Setup V1 (dos EAs; riesgo de duplicación de guardas). |

**Recomendación E3.2:** **Opción B o C híbrida ligera** — evolucionar **TestEA → BacktestEA** en el **mismo** módulo primero (conserva guard tester-only, `InpExportRoot`, run id, atomic write), y cuando el cuerpo deje de ser “test skeleton”, **renombrar** el archivo y `#property` a **`Mapazapp_BacktestEA`** en un checkpoint explícito (**E3.3+**), documentando el rename en changelog MT5. **Opción A** solo si se desea conservar TestEA **inmutable** para regresiones CP14.

---

## 4. Tester-only safety contract

**Obligatorio (fail-closed):**

| Condición | Comportamiento |
|-----------|------------------|
| `MQL_TESTER == false` | `INIT_FAILED`; **no** trading; **no** `OrderSend`; **no** `CTrade`; **no** señales reales; **no** exports que puedan confundirse con evidencia live (o export vacío con `execution_denied` en summary, según implementación **E3.3**). |
| `MQL_TESTER == true` | Permitida **lógica de backtest** y **export de evidencia** bajo `MQL5/Files`. |
| Órdenes del tester (si se activan en fase posterior) | Solo con **`InpBacktestMode == tester_orders`** y ramas explícitas `if(!MQLInfoInteger(MQL_TESTER)) return;` alrededor de **cada** envío; prohibido omitir la guarda. |

Sin **command files**, **sin** dependencia de API/dashboard/wrapper para arrancar el backtest.

---

## 5. Backtest mode decision

| Modo | Descripción | Cuándo |
|------|-------------|--------|
| **A — `virtual`** | Sin `OrderSend`; PnL/R y trades como **estructuras internas** + CSV/JSON; control total del esquema de evidencia. | **Fase inicial recomendada (E3.3 / E4)** para máxima seguridad y velocidad de iteración. |
| **B — `tester_orders`** | `CTrade` / `OrderSend` **solo** con `MQL_TESTER` y guardas adicionales; aprovecha **informes nativos** del Strategy Tester (spreads, fills simulados). | **Tras** gate explícito de revisión de código y checklist de seguridad (post–E4 smoke estable). |

**Decisión E3.2 para implementación:**

1. **E3.3 / primer smoke E4:** partir en modo **`virtual`** (alinea con el estado actual de TestEA: ya es virtual).
2. **Gate posterior:** documentar y aprobar antes de código un checklist “**tester_orders allowed**”; hasta entonces **`InpBacktestMode`** por defecto = **`virtual`**.

Si en **E3.3** no hay consenso seguro sobre órdenes: **no** introducir `CTrade`.

---

## 6. Setup V1 canonical contract

| Campo | Valor / regla congelada en E3.2 | Implementación |
|-------|----------------------------------|----------------|
| **setupName** | `IFVG_XAUUSD_V1` | **E3.5** (MQL5). |
| **symbol** | `XAUUSD` (`InpCanonicalSymbol`; broker suffix vía `_Symbol` en tester). | E3.3+. |
| **executionTimeframe** | **M15** por defecto (`InpExecutionTimeframe`, configurable a otro `ENUM_TIMEFRAMES`). | E3.3+. |
| **contextTimeframes** | **D1** obligatorio para **Daily Bias**; **H4** / **H1** opcionales (`InpUseH4Context`, `InpUseH1Context`). | E3.4+. |
| **direction** (setup) | `long` \| `short` | E3.5+. |
| **biasDirection** | `bullish` \| `bearish` \| `neutral` \| `unknown` | E3.4+. |
| **IFVG condition** | Criterio alineado conceptualmente a `strategy-detection` / replay TS (V2-04); **definición exacta MQL5** en spec técnico anexo a **E3.5**. | E3.5. |
| **Displacement** | Requerido según E1/E2; detalle numérico en **E3.5**. | E3.5. |
| **Entry trigger** | Modelo acotado (p. ej. variante única alineada a `entry-sl-tp-model` TS). | E3.5. |
| **Stop loss** | Regla desde zona + tolerancias (spread/point); coherente con `trade-plan-targets` / entry SLTP TS. | E3.5. |
| **Take profit** | RR desde `InpRrTarget` o regla explícita en inputs. | E3.5. |
| **Target liquidity** | Objetivo coherente con `target-objective-model` (TS como referencia); **E3.5**. | E3.5. |
| **Invalidation** | Reglas antes de fill (timeout, ruptura de estructura, etc.). | E3.5. |
| **Session filter** | Opcional (`InpSessionFilter` string o bitmask — formato a fijar en **E3.3**). | E3.3+. |
| **maxBars / expiry** | `InpMaxBars` (0 = usar default seguro); expiración de setup en **N** velas de ejecución — número en **E3.5**. | E3.3+. |
| **Spread filter** | `InpMaxSpreadPoints` (0 = desactivado). | E3.3+. |

**Definido en E3.2 (este doc):** nombres, TFs, enumeraciones, inputs obligatorios, modos de backtest, archivos de salida y contadores de bias. **Se implementa después:** fórmulas IFVG/displacement exactas en MQL5 (**E3.5**).

---

## 7. Daily Bias V1 contract in EA

### 7.1 Inputs

| Input | Descripción |
|-------|-------------|
| **Timeframe principal de bias** | **D1** (`InpDailyBiasTimeframe`, default `PERIOD_D1`). |
| **Contexto opcional** | `InpUseH4Context`, `InpUseH1Context` (bool) — si true, fusionar según reglas documentadas en **E3.4** (no en E3.2). |

### 7.2 Outputs (por barra de decisión o por evento)

| Campo | Valores |
|-------|---------|
| **biasDirection** | `bullish` \| `bearish` \| `neutral` \| `unknown` |
| **biasReasons** | Array de strings / códigos wire (serializado en CSV/JSON). |
| **biasStrength** | Opcional `0..1` o entero (TBD en **E3.4**). |

### 7.3 Reglas de gating

- **bullish** → solo setups **long** permitidos.
- **bearish** → solo setups **short**.
- **neutral** / **unknown** → **skip** (no entrada); evento `skipped_neutral_bias` o `missing_bias_context` según caso.
- Setup en dirección opuesta al bias → **`rejected_by_daily_bias`** (contador + fila en `backtest_events.csv`).

### 7.4 Contadores obligatorios (summary y/o eventos)

| Contador | Significado |
|----------|-------------|
| **totalBiasEvaluated** | Evaluaciones de bias ejecutadas (barras o ticks según diseño). |
| **alignedSetups** | Setups cuya dirección coincide con bias y pasan filtros previos. |
| **rejectedByDailyBias** | Setups rechazados por mismatch con bias. |
| **skippedNeutralBias** | Sin operar por bias neutral/unknown. |
| **missingBiasContext** | Sin datos suficientes (CopyRates fallido, gaps, etc.). |

---

## 8. Evidence / export contract

**Directorio por corrida:** `MQL5\Files\<InpExportRoot>\<run_id>\` (mismo patrón que TestEA CP14).

| Archivo | Rol |
|---------|-----|
| **`backtest_trades.csv`** | Una fila por trade **cerrado** (virtual o tester-order). |
| **`backtest_events.csv`** | **Nuevo** frente a CP14: línea de tiempo de **setup_detected**, **setup_rejected**, **trade_opened**, **trade_closed**, **skipped_neutral_bias**, **rejected_by_daily_bias**, etc. |
| **`backtest_summary.json`** | Agregados de corrida + contadores §7.4 + métricas. |

### 8.1 `backtest_trades.csv` — columnas mínimas (E3.2)

Orden sugerido (compatible con ampliar CP14 actual):

`run_id`, `trade_id`, `timestamp_open`, `timestamp_close`, `symbol`, `timeframe`, `direction`, `bias_direction`, `setup_direction`, `entry`, `sl`, `tp`, `result_r`, `exit_reason`, `setup_reason`, `bias_reason`, `rejection_reason` (vacío si no aplica), `strategy_id`, `parameter_set_id`, `account_id`, `broker_symbol`, … *(campos existentes CP14 como `result_money`, `commission`, etc. se mantienen si el importador TS los exige; ampliación acordada en **E3.6**).*

### 8.2 `backtest_events.csv` — campos mínimos

`run_id`, `event_time_utc`, `event_type`, `symbol`, `timeframe`, `bias_direction`, `setup_direction`, `payload_json` *(opcional string compacto)*, `reason_codes`.

**event_type** ∈ { `setup_detected`, `setup_rejected`, `trade_opened`, `trade_closed`, `skipped_neutral_bias`, `rejected_by_daily_bias`, … }.

### 8.3 `backtest_summary.json` — claves mínimas

`run_id`, `schema_version`, `ea_build`, `strategy_id`, `parameter_set_id`, `canonical_symbol`, `broker_symbol`, `execution_timeframe`, `tester_from`, `tester_to` *(pueden ser `null` en smoke inicial; relleno obligatorio cuando el EA lea APIs de tester de forma portable)*, `date_range_notes`, `trade_count`, `winrate`, `profit_factor`, `average_r`, `max_drawdown_r`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `total_bias_evaluated`, `aligned_setups`, `missing_bias_context`, `backtest_mode` (`virtual` \| `tester_orders`), `notes`.

---

## 9. Inputs / parameters (MQL5 esperados)

| Input | Tipo | Default sugerido | Notas |
|-------|------|------------------|--------|
| `InpSchemaVersion` | string | `MZP_TESTEA_V1` → evolucionar a `MZP_BACKTESTEA_V1` en **E3.6** | Bloquea runs con schema incompatible. |
| `InpStrategyId` | string | `MZP_IFVG_ZONE_REACTION_V1` | Metadatos. |
| `InpParameterSetId` | string | `MZP_IFVG_XAUUSD_V1_SET_003` | Metadatos. |
| `InpCanonicalSymbol` | string | `XAUUSD` | |
| `InpAccountId` | string | `TESTER_ACCOUNT` | |
| `InpExportRoot` | string | `Mapazapp\testea` o `Mapazapp\backtestea` | Sanitizar segmentos (patrón TestEA). |
| `InpRunId` | string | `""` | Auto-run id si vacío. |
| `InpDatasetSplit` | string | `validation` | |
| `InpExecutionTimeframe` | ENUM | `PERIOD_M15` | TF del gráfico tester vs input — documentar en **E3.3** si deben coincidir. |
| `InpDailyBiasTimeframe` | ENUM | `PERIOD_D1` | |
| `InpUseH4Context` | bool | `true` | |
| `InpUseH1Context` | bool | `true` | |
| `InpRiskMode` | ENUM/string | `fixed_r` | Detalle en **E3.5**. |
| `InpRrTarget` | double | `2.0` | |
| `InpMaxBars` | int | `0` | |
| `InpMaxSpreadPoints` | int | `0` | 0 = off. |
| `InpSessionFilter` | string | `""` | Formato TBD E3.3. |
| `InpBacktestMode` | ENUM | `virtual` | `virtual` \| `tester_orders`. |
| `InpWriteTradesCsv` | bool | `true` | |
| `InpWriteEventsCsv` | bool | `true` | **Nuevo** respecto CP14. |
| `InpWriteSummaryJson` | bool | `true` | |
| `InpMagic` | long | reservado | Solo si modo tester_orders. |

---

## 10. Relationship with existing TestEA

**Reutilizar (no reescribir desde cero):**

- Guard **`MQL_TESTER`** + `INIT_FAILED` fuera del tester.
- **Sanitización** de `InpExportRoot`, `SanitizeFolderNameSegment`, árbol de carpetas.
- **`ResolveRunId` / `MakeAutoRunId`**.
- **`WriteTextAtomic`** (`*.tmp` + `FileMove`).
- Patrón **`backtest_summary.json`** (ampliar claves, no romper `schema_version` sin bump).
- Cabecera y estilo **CSV** compatible con `importBacktestTradesFromCsv` (evolucionar con bump de schema en **E3.6**).

**Reemplazar / retirar:**

- `BuildPlaceholderTradeCsv` y fila **BUY** sintética.
- `PLACEHOLDER_VIRTUAL_SKELETON_NOT_IFVG` como sustituto de lógica real.
- `InpExportSignalsOnly` semántica de “una fila fake” → sustituir por flags de pipeline reales (p. ej. `InpEmitEmptyExportsOnNoTrades`) en **E3.3**.
- Ausencia de **IFVG**, **daily bias**, **`backtest_events.csv`**.

---

## 11. Relationship with mapazapp-core

- **`ifvg-replay-backtest.ts`**, **`context-bias-engine.ts`**, **`entry-sl-tp-model.ts`**, **`target-objective-model.ts`**, **`decision-model.ts`** son la **especificación de referencia** (algoritmos, casos borde, tests).
- **No** se importa TypeScript en MQL5; la implementación EA debe **reexpresar** las reglas en MQL5 con trazabilidad y tests manuales en tester.
- Los **exports** del EA deben poder **validarse** con parsers/scripts existentes o nuevos tests bajo `APP/lib/mapazapp-core` / `APP/scripts` (**E3.6**, **E6**).

---

## 12. Implementation checkpoints after E3.2

| ID | Entrega |
|----|---------|
| **E3.3** | Esqueleto BacktestEA + guard tester-only + wiring de inputs y exports vacíos/ampliados. **Implementado** como artefacto separado: `APP/artifacts/mt5/experts/Mapazapp_BacktestEA/Mapazapp_BacktestEA.mq5` + `README.md` (Mapazapp_TestEA se conserva como placeholder CP14). |
| **E3.4** | Daily Bias V1 en EA + contadores §7.4 en summary/eventos. **Implementado:** [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](./BACKTESTEA_DAILY_BIAS_V1_E3_4.md) + `Mapazapp_BacktestEA.mq5`. |
| **E3.5** | Detección Setup V1 IFVG en EA + entradas/salidas virtuales o tester_orders según §5. |
| **E3.6** | Esquema de evidencia versionado (`MZP_BACKTESTEA_V1`), compatibilidad import TS. |
| **E4** | Primer smoke Strategy Tester con evidencia real (sin placeholder). |
| **E5** | Campaña XAUUSD en tester. |
| **E6** | Import evidencia MT5 en Mapazapp. |
| **E7** | Diseño dashboard resultados. |
| **E8** | Setup decision gate. |

---

## 13. Non-goals

- Código **MQL5** nuevo más allá de lo ya existente en repo para CP14.
- Ejecutar MT5, Strategy Tester, live trading.
- Command files, **POST** / action endpoints, launcher, **`.exe`**, packaging.
- Implementación del dashboard de resultados (solo contrato aquí).
