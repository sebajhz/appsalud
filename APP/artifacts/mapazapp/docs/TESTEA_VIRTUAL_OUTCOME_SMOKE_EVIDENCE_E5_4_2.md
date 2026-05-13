# Mapazapp — TestEA Virtual Outcome Smoke Evidence E5.4.2

## 1. Purpose

Este documento registra el **primer smoke limpio de outcome virtual** tras el endurecimiento de geometría **E5.4.1** en `Mapazapp_TestEA` (`MZP_TestEA_E5_4_1`).

- **No** constituye prueba final de campaña ni de ventaja estadística sostenida.
- **No** es trading en vivo ni ejecución por bróker.
- **No** usa órdenes nativas de MT5: los resultados son **filas virtuales** en CSV y campos del summary JSON.
- **Valida** que los outcomes virtuales se exportan de forma coherente y que la validación CLI del bundle queda **limpia de errores** y **sin advertencias de geometría**, salvo el aviso esperado por **tamaño del CSV de eventos**.

Política de build y trazabilidad de runs: [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md).

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint | E5.4.2 |
| Tipo de run | Smoke manual en MT5 Strategy Tester |
| Operador | Humano |
| Commit base | `47c440f` (`fix(mapazapp): E5.4.1 harden virtual trade geometry`) |
| EA | `Mapazapp_TestEA` |
| EA build (`ea_build`) | `MZP_TestEA_E5_4_1` |
| `run_id` | `TEST_E5_4_2_A` |
| Símbolo | XAUUSD |
| Timeframe de ejecución | M15 |
| Timeframe Daily Bias | D1 (`InpDailyBiasTimeframe` = `16408` en MT5 = PERIOD_D1) |
| Rango | 2025.01.01 00:00 → 2026.05.11 00:00 |
| Raíz de exportación | `Mapazapp\TestEA` |
| Modelado | Every tick generating (every tick based on real ticks) |
| Resultado global | **OK** con warning aceptable (`BUNDLE_EVENTS_LARGE`) |

### Inputs confirmados (operador)

| Input | Valor |
|--------|--------|
| `InpSchemaVersion` | `backtest_ea_v1` |
| `InpStrategyId` | `MZP_IFVG_ZONE_REACTION_V1` |
| `InpParameterSetId` | `MZP_IFVG_XAUUSD_V1_SET_003` |
| `InpCanonicalSymbol` | `XAUUSD` |
| `InpRunId` | `TEST_E5_4_2_A` |
| `InpExportRoot` | `Mapazapp\TestEA` |
| `InpExecutionTimeframe` | `15` (M15) |
| `InpDailyBiasTimeframe` | `16408` (D1) |
| `InpBacktestMode` | `virtual` |
| `InpEnableSetupDetection` | `true` |
| `InpRequireDailyBiasAlignment` | `true` |
| `InpEnableVirtualTrades` | `true` |
| `InpVirtualEntryMode` | `fvg_midpoint` |
| `InpVirtualStopMode` | `fvg_boundary_with_buffer` |
| `InpVirtualStopBufferPoints` | `0` |
| `InpVirtualRiskReward` | `2.0` |
| `InpVirtualEntryExpiryBars` | `20` |
| `InpVirtualMaxBarsInTrade` | `40` |
| `InpVirtualAmbiguityMode` | `ambiguous` |
| `InpVirtualOneTradeAtATime` | `true` |
| `InpVirtualMinTradeFvgPoints` | `2` |
| `InpWriteVirtualTrades` | `true` |

## 3. Compile result

- Compilación en **MetaEditor**: **OK**.
- **0** errores, **0** advertencias.
- **`Mapazapp_TestEA.ex5`** generado correctamente.

## 4. Strategy Tester execution

- El Strategy Tester **completó** la corrida; el test **pasó** en MT5.
- **Operaciones nativas MT5: 0** — esperado: no hay `OrderSend` / `CTrade`; el modo es **virtual** y las salidas van a CSV/JSON.
- **Sin** órdenes reales ni posiciones del tester como motor de outcome.
- Resultados virtuales en **`backtest_trades.csv`**, eventos en **`backtest_events.csv`**, métricas en **`backtest_summary.json`**.

## 5. Exported files

Archivos observados en el bundle:

- `backtest_summary.json`
- `backtest_events.csv`
- `backtest_trades.csv`

Tamaños aproximados (observados en el entorno del operador):

| Archivo | Tamaño aproximado (bytes) |
|---------|---------------------------|
| `backtest_summary.json` | ~2160 |
| `backtest_events.csv` | ~5 852 182 |
| `backtest_trades.csv` | ~581 622 |

Ruta observada (identificador de terminal **sanitizado**):

`MetaQuotes\Tester\<terminal-id>\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\TestEA\TEST_E5_4_2_A`

## 6. CLI validation result

Comando (referencia):

`pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "<run-folder>" --json`

Resultado documentado:

- `ok`: **true**
- `status`: **warning**
- `errors`: **[]**
- `warnings`: solo **`BUNDLE_EVENTS_LARGE`**
- `testEaStatus`: **valid**
- **Sin** advertencias `CSV_GEOMETRY_*`
- **Sin** `CSV_GEOMETRY_RISK_NONPOSITIVE`

## 7. Summary metrics

Valores tomados del `backtest_summary.json` / resumen validado (subset clave):

| Métrica | Valor |
|---------|--------|
| `trade_count` | 1697 |
| `virtual_trade_count` | 1697 |
| `filled_trade_count` | 1355 |
| `unfilled_expired_count` | 342 |
| `win_count` | 411 |
| `loss_count` | 507 |
| `ambiguous_count` | 436 |
| `expired_open_count` | 1 |
| `unresolved_count` | 0 |
| `invalid_risk_count` | 17 |
| `skipped_trade_active` | 1707 |
| `total_r` | 315 |
| `average_r` | 0.185622 |
| `winrate` | 0.447712 |
| `expectancy_r` | 0.185622 |
| `max_drawdown_r` | 13 |
| `total_setup_candidates` | 6698 |
| `allowed_setups` | 3421 |
| `rejected_by_daily_bias` | 3277 |
| `total_bias_evaluated` | 349 |

(Otros campos del summary, p. ej. `schema_version`, `official_ea`, flags de pipeline, siguen el contrato E3.6; este smoke usó `backtest_ea_v1`, `has_full_ifvg_pipeline: false`, lógica virtual real, sin órdenes reales.)

## 8. Interpretation

- El resultado es **alentador** para seguir con diseño de campaña, pero **no** sustituye evidencia de campaña formal ni walk-forward.
- Con **RR 2R** y **winrate ≈ 44,77%**, el modelo virtual OHLC es **matemáticamente favorable** en este run (punto de equilibrio breakeven a 2R ≈ 33,33% de aciertos netos sin costes).
- **`ambiguous_count`** es **alto**: en reporting futuro hay que **tratar aparte** los outcomes `ambiguous` (p. ej. `result_r = 0` en el modelo actual) para no confundirlos con wins/losses “limpios”.
- **`invalid_risk_count` = 17`**: casos mínimos o inválidos **filtrados** en origen (skipped / sin fila de trade mala exportada como operación cerrada).
- **`trade_count` == `virtual_trade_count`**: la paridad contable tras **E5.4.1** (geometría + deinit) se confirma en este smoke.
- **Ausencia de warnings de geometría** en la CLI: el fix **E5.4.1** cumplió el objetivo respecto a filas con riesgo no positivo / entry≈SL por FVG mínimos.

## 9. Remaining limitations

- Trades virtuales basados en **OHLC** de vela cerrada; no microestructura intra-barra.
- **Sin** ejecución nativa de órdenes MT5 en este modo.
- `has_full_ifvg_pipeline` sigue **false** (detección / simulación acotadas al alcance actual).
- Outcomes **ambiguous** modelados con **`result_r = 0`** en la versión actual.
- **`backtest_events.csv`** crece mucho en rangos largos → warning **`BUNDLE_EVENTS_LARGE`** esperado (~5,85 MB en este run).
- Un solo **parameter set** (`MZP_IFVG_XAUUSD_V1_SET_003`); no hay conclusión de optimización ni ranking multi-set aún.
- **Sin** conclusión de campaña Phase B hasta **E5.5** y el runbook de métricas — ver [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md).

## 10. Decision

**E5.4.2 = OK** con el único warning aceptable por tamaño de eventos.

**Siguiente paso recomendado:** **E5.5** — runbook de campaña XAUUSD con métricas de outcome y trazabilidad por run — [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md).

**Opcional antes de campaña:** **E5.4.4** — automatización ligera de etiquetado de build / scripts de copia de `.ex5` archivado local (solo si el operador lo desea; la política mínima ya está en **E5.4.3**).

---

## Document history

| Versión | Nota |
|---------|------|
| E5.4.3 v1 | Evidencia formal smoke E5.4.2 (commit docs) + enlace a política de versioning; sin ejecución MT5 desde este commit. |
| E5.4.2 v2 | Enlace al runbook de campaña outcome **E5.5**. |
