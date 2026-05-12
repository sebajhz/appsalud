# Mapazapp — Engine Inventory and Setup Contract Audit E2

## 1. Purpose

- **E1** ([`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md)) fijó el **plan maestro** (pausa runtime, foco motor, secuencia **E2–E10**, reglas de bias conceptuales).
- **E2** (**este documento**) **audita** el motor y la documentación **existentes** y **congela por escrito** el contrato propuesto **Setup V1** y **Daily Bias V1** alineado a lo que el código puede o no soportar hoy.
- **E2 no implementa** lógica nueva ni modifica core; solo inventario, gaps y contratos para preparar **E3** (datos) y **E4** (baseline de backtest).
- **Objetivo:** que el equipo sepa **qué existe**, **qué falta** y **qué habría que cablear** antes de una primera prueba seria del setup con histórico real.

**Relacionado:** [`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md), [`V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md`](./V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md), [`V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md`](./V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md), [`V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md`](./V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md), [`V2_08_ENTRY_VARIANT_MODEL.md`](./V2_08_ENTRY_VARIANT_MODEL.md), [`V2_09_TARGET_LIQUIDITY_OBJECTIVE_MODEL.md`](./V2_09_TARGET_LIQUIDITY_OBJECTIVE_MODEL.md), [`V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md`](./V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md), [`V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`](./V2_11_MANUAL_CANDLE_DATASET_IMPORT.md), [`V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`](./V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md), [`V2_14_PARAMETER_SET_GRID_RUNNER_V1.md`](./V2_14_PARAMETER_SET_GRID_RUNNER_V1.md), [`V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`](./V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md).

---

## 2. Executive summary

El **motor técnico** (IFVG, replay, decisión, campañas, grid, walk-forward, import CSV en memoria) está **materialmente avanzado** en `@workspace/mapazapp-core`. Se puede ejecutar (fuera del alcance de este doc) un **replay IFVG** sobre velas de ejecución y obtener **métricas agregadas** (`IfvgReplayBacktestSummary`) y **trazas** por candidato.

Sin embargo, la prueba alineada a **E1** — **Daily Bias V1** como compuerta **dura** (solo long si “bullish”, solo short si “bearish”, neutral → no trade, conteo `rejected_by_daily_bias`) **encima del pipeline de campaña por defecto** — está **solo parcialmente** respaldada hoy:

- Existe **HTF context / bias** (`evaluateContextBias`, `ContextBiasResult`, integración en `evaluateDecisionModel`) con **D1** entre los timeframes soportados, pero **no** hay un módulo separado llamado “dailyBias.ts”; el “daily bias” de negocio se mapea aquí al **resultado HTF** (ver §5).
- `runIfvgReplayBacktest` **sí** acepta `htfCandlesByTimeframe` y calcula `evaluateContextBias` por candidato cuando hay velas HTF y `symbolProfile` (`ifvg-replay-backtest.ts`).
- `runBacktestCampaign` (**`backtest-campaign-runner.ts`**) al llamar `runIfvgReplayBacktest` **no** pasa `htfCandlesByTimeframe` ni `contextBiasResultOverride`; por tanto las campañas estándar corren **sin** evaluación HTF salvo overrides de test en el dataset. Esto es un **gap bloqueante** para **E4/E5** tal como los definió **E1** sin trabajo adicional de cableado o contrato explícito en dataset.

**¿Can we run a meaningful first setup proof now?** → **Partial.**

- **Yes (parcial):** se puede correr **baseline de IFVG + replay + métricas** sobre CSV de velas de **ejecución** (M5/M15/…) con `runIfvgReplayBacktest` o `runBacktestCampaign` **sin** gate HTF estricto — útil como **E4-pre** mecánico, **no** como cumplimiento total de **E1 §4–§6**.
- **No (como E1 full):** no se puede afirmar aún una prueba **E1-canónica** de *daily bias rejection audit* sobre el **mismo** pipeline de campaña sin: (a) suministrar HTF candles al replay, y (b) fijar política `DecisionModelContextBiasIntegration` (hard block / no-trade invalidation) y contadores de rechazo en evidencia.

**Principal riesgo:** confundir **“bias suaviza score”** (default del decision model) con **“bias bloquea dirección”** (exigencia E1); hoy el producto **default** mantiene `contextBiasCanHardBlock: false` en settings de test del decision model y la campaña **no inyecta** HTF.

| Pregunta | Respuesta corta |
|----------|------------------|
| ¿Listos para **E3** (dataset / data health)? | **Sí**, con matices: el import manual y el CLI de validación existen; falta operador + dataset real + plantilla de informe E3. |
| ¿Listos para **E4** (baseline canónico **con** Daily Bias V1)? | **Parcial**: hace falta cableado o invocación directa de replay con HTF + política; si **E4** se define sin bias duro, se puede antes. |
| ¿Listos para **E5** (auditoría rechazo bias)? | **No** sin contadores y sin bias aplicado de forma uniforme en todos los trades candidatos. |

---

## 3. Engine inventory table

| Area | Existing code/docs | Status | Evidence path | Notes | Gap |
|------|---------------------|--------|---------------|-------|-----|
| Candle model | `candle.ts`, tipos compartidos | implemented | `lib/mapazapp-core/src/candle.ts` | OHLC + tiempo | — |
| CSV / manual import | `manual-candle-dataset-importer.ts`, `manual-candle-dataset-types.ts`, doc V2-11 | implemented | `lib/mapazapp-core/src/manual-candle-dataset-importer.ts` | Formatos OHLC / MT5-like / bridge schema | Operador debe proveer CSV y timezone explícito en E3 |
| Dataset validation | `ManualCandleDatasetValidationSummary`, reasons/warnings | partial | mismo importer + `manual-candle-dataset-reasons.ts` | Validación de filas, duplicados, OHLC | “Data health report” E3 aún es proceso/doc, no un solo JSON estándar en repo |
| Replay engine | `ifvg-replay-backtest.ts`, types V2-04 | implemented | `lib/mapazapp-core/src/ifvg-replay-backtest.ts` | Orquesta detección → plan → replay | Sin HTF no hay bias trace |
| Backtest simulator | `replay-trade-simulator.ts`, `replay-trade-types.ts` | implemented | `lib/mapazapp-core/src/replay-trade-simulator.ts` | Simulación bar-a-bar | — |
| IFVG detection | `strategy-detection.ts` | implemented | `lib/mapazapp-core/src/strategy-detection.ts` | `detectIfvgZoneCandidates` | tests `v2-04-ifvg-replay-backtest.test.ts` |
| Displacement / imbalance | `displacement.ts`, settings en strategy | implemented | `lib/mapazapp-core/src/displacement.ts` | Usado en replay | — |
| Entry model | `entry-sl-tp-model.ts`, V2-08 doc | implemented | `lib/mapazapp-core/src/entry-sl-tp-model.ts` | Variants en tipos/settings | Elegir **una** variante en Setup V1 contrato |
| SL model | `trade-plan-targets.ts`, `entry-sl-tp-*` | implemented | `trade-plan-targets.ts` | Buffer ATR/spread | — |
| TP model | `trade-plan-targets.ts` (RR) | implemented | mismo | RR desde settings | — |
| Target liquidity | `target-objective-model.ts`, V2-09 | implemented | `lib/mapazapp-core/src/target-objective-model.ts` | Usa `contextBiasResult` opcional | No sustituye gate direccional E1 |
| HTF bias | `context-bias-engine.ts`, `context-bias-types.ts`, V2-07 | implemented | `lib/mapazapp-core/src/context-bias-engine.ts` | `evaluateContextBias`; TF keys `M15\|H1\|H4\|D1` | Ver §5 “daily” vs HTF |
| Daily bias (nombre negocio E1) | Mapeo a `ContextBiasResult` + política decision model | partial | `decision-model.ts`, `decision-model-settings.ts` | No archivo `daily-bias.ts` | Contrato V1 + cableado campaña |
| Decision model | `decision-model.ts`, V2-05 | implemented | `lib/mapazapp-core/src/decision-model.ts` | Soft score + gates opcionales bias | Defaults de test no hard-block |
| Parameter set registry | `strategy-registry-*`, fixtures | implemented | `lib/mapazapp-core/src/` | IDs strategy/parameter set | — |
| Campaign runner | `backtest-campaign-runner.ts`, V2-10 | implemented | `lib/mapazapp-core/src/backtest-campaign-runner.ts` | **No** pasa HTF al replay | **Gap bloqueante** E4/E5 |
| Grid runner | `parameter-grid-runner.ts`, V2-14 | implemented | `lib/mapazapp-core/src/parameter-grid-runner.ts` | Llama `runBacktestCampaign` | Hereda gap HTF |
| Walk-forward evaluator | `walk-forward-evaluator.ts`, V2-15 | implemented | `lib/mapazapp-core/src/walk-forward-evaluator.ts` | Usa grid | Hereda gap HTF |
| Metrics / evidence | `IfvgReplayBacktestSummary`, `BacktestTrade`, traces; `BacktestCampaignRunResult` | partial | `ifvg-replay-backtest-types.ts`, `backtest-campaign-types.ts` | Winrate, PF, DD R, MAE/MFE medias | Sin `rejected_by_daily_bias`, sin trades-by-session |
| Dashboard/API exposure | GET `mock-latest` adapters, UI V2-16 | implemented | `artifacts/api-server/src/mapazapp/routes.ts`, `artifacts/mapazapp/src/` | Solo mock/fixtures | Fuera de foco E2–E4 |

---

## 4. Current setup-related components

| Componente | Qué hace | Implementación principal | Tests principales | Limitación |
|------------|----------|---------------------------|-------------------|--------------|
| IFVG + zonas | Detecta candidatos IFVG y zonas | `strategy-detection.ts` | `v2-04-ifvg-replay-backtest.test.ts` | Muchos flags/diagnósticos; requiere `symbolProfile` + settings coherentes |
| Replay | Después de confirmación, simula trade | `ifvg-replay-backtest.ts` + `replay-trade-simulator.ts` | `v2-04-*`, `v2-02-*` | Depende de índices de velas y calidad de datos |
| Entry variants | Modelo de entrada / SLTP plan | `entry-sl-tp-model.ts`, `trade-plan-evaluator.ts` | `v2-03-*`, `v2-08-*` | Hay que fijar variante única para V1 |
| SL / TP | Precios SL/TP desde zona + ATR + spread | `trade-plan-targets.ts`, `entry-sl-tp-model.ts` | tests entry SLTP | RR fijo según settings |
| HTF bias | Score + dirección preferida + `allowedDirections` | `context-bias-engine.ts` | `v2-07-context-bias-engine.test.ts` | No equivalente 1:1 a “solo D1 close”; es fusión multi-TF |
| Target liquidity | Objetivo y scoring con contexto | `target-objective-model.ts` | `v2-09-*` | Penaliza dirección vs bias pero no reemplaza gate E1 |
| Decision model | Soft score, gates, integración bias | `decision-model.ts` | `v2-05-*` | Por defecto bias suele ser **ajuste**; hard block es opt-in |
| Filtros / gates | Hard gates cuenta, spread, etc. | `trade-plan-gates.ts`, account guard | varios | No son “daily bias” |
| Reasons / explanations | Códigos de razón bias y decisión | `context-bias-reasons.ts`, `decision-model-reasons.ts` | v2-07, v2-05 | Bien para evidencia textual |
| Métricas replay | Resumen R, PF, winrate, etc. | `IfvgReplayBacktestSummary` en types | `v2-04`, `v2-10` | Agregados; no series temporales por sesión |

---

## 5. Daily Bias V1 audit

### 5.1 ¿Existe “daily bias” como tal?

- **No** como tipo o función con nombre `dailyBias` aislado.
- **Sí** existe capacidad equivalente vía **HTF context bias** (`evaluateContextBias`) que incluye velas **D1** en `ContextBiasTimeframeInput` y snapshots por TF en `ContextBiasResult.perTimeframe`.

### 5.2 ¿HTF sin “daily” explícito?

- El motor habla de **HTF / context bias** (V2-07). El **daily** de negocio E1 se interpreta aquí como **uso de la vela D1 (y contexto alineado H4/H1)** dentro de `evaluateContextBias`, **no** como un indicador económico separado (“fundamentals”).

### 5.3 Integración backtest

- En **`runIfvgReplayBacktest`**: si `htfCandlesByTimeframe` tiene series no vacías y hay `symbolProfile`, se llama `evaluateContextBias` con `directionToEvaluate` = dirección de la zona; resultado va a `decisionModel` y `trace.contextBiasResult` (`ifvg-replay-backtest.ts` ~436–455, ~518).
- En **`runBacktestCampaign`**: la llamada a `runIfvgReplayBacktest` **no** incluye `htfCandlesByTimeframe` (`backtest-campaign-runner.ts` ~275–309) → en campaña por defecto el bias HTF **no** se calcula.

### 5.4 Tabla de preguntas

| Question | Current answer | Evidence | Gap | Required for E4/E5 |
|----------|----------------|----------|-----|-------------------|
| ¿Existe daily bias como tal? | No como nombre; sí HTF+D1 en engine | `context-bias-engine.ts`, `context-bias-types.ts` | Contrato de naming E1 vs código | Documentar mapping en evidencia |
| ¿Salida bullish/bearish/neutral? | API de motor: `preferredDirection` es `buy_only` \| `sell_only` \| `both_allowed` \| `no_trade` \| `unclear` | `ContextBiasDirection` | Mapeo explícito a bullish/bearish/neutral E1 | Tabla de mapeo en contrato §7 |
| ¿Reasons? | Sí: `reasonCodes`, `explainability`, `summaryExplanation` | `ContextBiasResult` | — | Campos `biasReasons[]` en evidencia |
| ¿Bloquea trades contrarios o solo puntúa? | **Por defecto** mayormente **puntuación / ajuste**; hard block y no-trade invalidation son **opt-in** via `DecisionModelSettings.contextBiasIntegration` | `decision-model-settings.ts` | Falta política fijada + conteos | E5 |
| ¿Regla E1 “solo long si bullish”? | **No garantizada** sin configurar integración estricta y sin rechazo previo a simulación | `decision-model.ts` (~697+) | Implementación futura o política estricta | E3.5 / post-E3 |
| ¿Contador `rejected_by_daily_bias`? | **No** en summary estándar | `IfvgReplayBacktestSummary` | Falta agregación | E5 |

**Regla objetivo E1 (recordatorio):** bullish → solo longs; bearish → solo shorts; neutral/unknown → no trade; mismatch → `rejected_by_daily_bias`.

**Estado vs regla:** la lógica **puede aproximarse** con `preferredDirection` + políticas `contextBiasIntegration`, pero **no** está empacada como contrato único ni contada; **debe completarse** en una sub-fase **E3.5** (implementación + tests) **o** acotar E4 a “sin gate bias duro” explícitamente.

---

## 6. Setup V1 contract proposal

Propuesta congelada para prueba; campos marcados **existing** / **required gap**.

| Campo | Valor / regla | Status |
|-------|---------------|--------|
| **setupName** | `IFVG_XAUUSD_V1` | proposal |
| **setupVersion** | `1.0.0-e2-contract` | proposal |
| **symbol** | `XAUUSD` | proposal |
| **executionTimeframe** | `M15` (ajustable a `M5` si dataset y registry lo soportan); confirmar en E3 | proposal |
| **contextTimeframes** | `H1`, `H4`, `D1` alimentan `evaluateContextBias` | **required gap** en campaña (ver §3); **existing** en API de `runIfvgReplayBacktest` |
| **requiredData** | Velas ejecución + perfiles + settings IFVG + **velas HTF alineadas temporalmente** | partial |
| **dailyBiasRequirement** | Evaluación HTF antes de aceptar entrada; política E1 | **required gap** (política + datos) |
| **setupDirection** | `BUY` \| `SELL` desde zona IFVG | existing (`ZoneCandidate.direction`) |
| **IFVG / displacement** | Detección + `buildDisplacementAtBar` | existing |
| **entryTrigger** | Retest + confirmación según pipeline replay | existing (replay) |
| **SL rule** | Structural + buffer ATR/spread (`trade-plan-targets`) | existing |
| **TP rule** | RR desde `entrySlTpSettings` | existing |
| **targetLiquidityRule** | `evaluateTargetObjective` cuando se use en plan | existing / opcional según settings |
| **invalidationRules** | Precio invalidación zona + estados trade plan | existing |
| **skipRules** | `replayOnlyTradeReady`, `includeObserveCandidates`, gates | existing |
| **rejectionReasons** | Incluir futuro `rejected_by_daily_bias` | **required gap** |
| **evidenceFields** | runId, gitHead, datasetId, métricas summary, traces (sin paths privados) | partial — schema §13 |

**Disciplina:** no probar 10 variantes hasta cerrar baseline **E4** con **un** parameter set canónico del registry existente (ID a elegir en E3/E4).

---

## 7. Direction and bias contract

**Campos requeridos (evidencia futura):**

| Campo | Descripción |
|-------|-------------|
| `biasDirection` | `bullish` \| `bearish` \| `neutral` \| `unknown` — **derivado** de `ContextBiasResult.preferredDirection` + reglas de mapeo acordadas |
| `setupDirection` | `long` \| `short` — derivado de `BUY`/`SELL` |
| `allowedDirection` | Intersección bias × política sesión (E1 puede fijar igual a `biasDirection` discretizado) |
| `rejectionReason` | p. ej. `rejected_by_daily_bias`, `skipped_neutral_bias`, … |
| `biasConfidence` | Opcional: `ContextBiasResult.confidenceBand` + `contextScore` |
| `biasReasons` | `ContextBiasResult.reasonCodes` + strings explicables |
| `setupReasons` | Códigos de plan / decision model / detection |

**Reglas E1 (contrato):**

- Bias evaluado **antes** de considerar la entrada para simulación **cuando** el pipeline suministra `contextBiasResult` coherente en el instante del candidato.
- `bullish` + `short` → **reject** (`rejected_by_daily_bias`).
- `bearish` + `long` → **reject**.
- `neutral` / `unknown` → **skip** (default E1).
- Solo setups alineados llegan a `simulateReplayTrade` **si** la política implementada lo exige (hoy **no** garantizado en campaña).

**Mapeo sugerido `ContextBiasDirection` → E1 `biasDirection`:**

| `preferredDirection` | `biasDirection` (E1) |
|----------------------|----------------------|
| `buy_only` | `bullish` |
| `sell_only` | `bearish` |
| `no_trade` | `neutral` |
| `unclear` | `unknown` |
| `both_allowed` | **neutral** (tratar como no operar en E1 estricto) o `unknown` — **decidir en E3.5** |

---

## 8. Backtest readiness audit

| Need | Current support | Gap | Required before E4 |
|------|-----------------|-----|----------------------|
| Load candles from CSV | `importManualCandleDataset`, scripts `mapazapp-import-validate` | Operador + archivo | Dataset real E3 |
| Validate dataset | Importer + summary | Plantilla “data health” E3 | Informe E3 |
| Run setup over date range | `runIfvgReplayBacktest` / `runBacktestCampaign` | Sin HTF en campaña | Cableado o script dedicado |
| Simulate entry/SL/TP | `replay-trade-simulator.ts` | — | — |
| Count `rejected_by_daily_bias` | No | Agregación | E3.5 o instrumentación |
| Produce metrics | `IfvgReplayBacktestSummary` + campaign aggregates | Falta métricas por bias | E5 |
| Save/print evidence | Traces JSON en core; docs humanos | Estándar repo `SetupProofRun` §13 | E4 doc de run |

---

## 9. Dataset readiness audit (E3)

**Formatos soportados (código):** delimitado coma/semicolon/tab; formatos `mt5`, `bridge`, `ohlc` según `importManualCandleDataset` y CLI `mapazapp-import-validate` (`APP/scripts/src/mapazapp-import-validate.ts`).

**Checklist E3:** columnas, timezone, TF, símbolo, gaps, duplicados, OHLC, spread/tick volume si columnas existen, `datasetId`, rango fechas.

**Salida esperada E3:** informe **data health** (pass/fail, warnings, métricas de calidad, decisión de congelación), **sin** volcar CSV crudo en docs.

---

## 10. Metrics readiness audit

| Métrica | Estado | Notas |
|---------|--------|-------|
| Total trades | **existing** | `replayedTradeCount`, `tradeCount` |
| Win rate | **existing** | `IfvgReplayBacktestSummary.winRate` |
| Profit factor | **existing** | `profitFactor` |
| Expectancy | **derived possible** | desde trades R en campaña / import summary `BacktestSummary.expectancyR` (otro pipeline) |
| Average R | **existing** | `averageR` |
| Max drawdown | **existing** | `maxDrawdownR` |
| Max losing streak | **missing** en summary IFVG | derivar de serie trades |
| MAE/MFE | **existing** (medias) | `averageMaeR`, `averageMfeR` |
| Trades by month | **missing** | post-proceso |
| Trades by session | **missing** | requiere mapping horario sesiones |
| Trades by bias | **missing** | requiere bias por trade |
| `rejected_by_daily_bias` | **missing** | implementar conteo |
| `skipped_neutral_bias` | **missing** | idem |
| Invalidation reasons | **partial** | `reasonCodes` en trades / traces; histograma no estándar |

---

## 11. Gaps before first meaningful proof

### Blocking gaps

1. **HTF candles no inyectadas** en `runBacktestCampaign` → campañas **sin** `evaluateContextBias` en el camino principal.
2. **Política E1** (solo direcciones alineadas; neutral no trade) **no** estándar como único `DecisionModelSettings` + verificación explícita previa a replay.
3. **Contadores de rechazo** `rejected_by_daily_bias` / `skipped_neutral_bias` **ausentes** en summaries.
4. **Dataset real XAUUSD** aún no “congelado” con informe E3 (proceso, no código).

### Non-blocking gaps

- Métricas por mes/sesión (post-proceso puede bastar en E5).
- Equity curve desde trades (derivable offline).

### Nice-to-have

- Dashboard charts (E9/E10).
- MT5 live / watcher (fuera de alcance).

---

## 12. Recommended E3 / E4 path

1. **E3 — Dataset import / data health (XAUUSD):** importar CSV, validar, congelar `datasetId`, publicar informe.
2. **E3.5 — (si aplica tras E3)** **Daily Bias V1 wiring + policy:** extender `BacktestCampaignDataset` o el runner para pasar `htfCandlesByTimeframe`; fijar `DecisionModelSettings.contextBiasIntegration` y mapeo biasDirection; añadir contadores en resultado de replay o capa de campaña.
3. **E4 — Canonical setup baseline:** un parameter set, un dataset split claro, un run documentado con métricas y traces (sin paths privados).
4. **E5 — Daily bias rejection audit:** runs comparativos A/B **solo** si E3.5 está hecho; si no, E5 queda **bloqueado** o se redefine como “audit de código + diseño”.

---

## 13. Proposed evidence schema for setup proof

```text
SetupProofRun:
  runId: string
  gitHead: string
  datasetId: string
  symbol: string
  timeframe: string
  dateRange: { from: string; to: string }
  setupVersion: string
  biasVersion: string
  params: { strategyId; parameterSetId; key knobs redacted }
  metrics: IfvgReplayBacktestSummary + extras
  rejectionStats: { rejected_by_daily_bias: number; skipped_neutral_bias: number; ... }
  warnings: string[]
  conclusion: string

TradeEvidence:
  timestamp: string
  direction: "long"|"short"
  biasDirection: "bullish"|"bearish"|"neutral"|"unknown"
  setupDirection: "long"|"short"
  entry, sl, tp: number
  resultR: number
  reason: string
  rejectionReason?: string
  biasReasons: string[]
  setupReasons: string[]
```

---

## 14. Decision

| Pregunta | Decisión |
|----------|----------|
| ¿Ready for **E3**? | **Yes** — el import y validación existen; falta ejecutar el proceso con datos reales y plantilla de informe. |
| ¿Ready for **E4** (E1-canónico con bias duro)? | **Partial** — mecánica IFVG+replay lista; **bias duro + métricas de rechazo** requieren **E3.5** o invocación manual de `runIfvgReplayBacktest` con HTF hasta integrar campaña. |
| ¿Next checkpoint? | **E3** (data health). En paralelo diseñar **E3.5** si se confirma que E4 debe incluir gate bias desde campaña. |
| ¿Qué no hacer aún? | No expandir D14 runtime, no MT5 live, no POST, no empaquetado, no trading real. |

---

## 15. Non-goals

Confirmado fuera de alcance de **E2** y de la fase motor inmediata:

- Expansión runtime/launcher más allá del estado congelado en **E1**.
- MT5 live, watcher, command files.
- `POST` / action endpoints / ejecución / trading.
- Implementación de dashboard de resultados (**E9/E10**).
- Packaging, `.exe`, installer.
