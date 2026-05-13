# Mapazapp — TestEA Virtual Trade Simulation Implementation E5.3

## 1. Resumen

**E5.3** implementa la **simulación virtual de trades** dentro de **`Mapazapp_TestEA.mq5`**: candidatos creados tras **`setup_allowed`**, fill y gestión en **velas cerradas** del `InpExecutionTimeframe`, export de **filas** en `backtest_trades.csv`, eventos **`virtual_trade_*`**, y **métricas R** en `backtest_summary.json`. **Sin** `OrderSend`, **sin** `CTrade`, **sin** posiciones reales; `has_real_trading_orders` permanece **false**; `tester_only` **true**.

**Contrato congelado (diseño):** [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md). **Decisión outcome:** [`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md).

---

## 2. Inputs MQL5 (V1)

| Input | Default | Notas |
|--------|---------|--------|
| `InpEnableVirtualTrades` | `true` | Desactiva creación/gestión virtual (sigue bias/setup). |
| `InpVirtualEntryMode` | `fvg_midpoint` | V1 solo este modo. |
| `InpVirtualStopMode` | `fvg_boundary_with_buffer` | V1 solo este modo. |
| `InpVirtualStopBufferPoints` | `0` | Buffer en puntos × `_Point`. |
| `InpVirtualRiskReward` | `2.0` | Multiplicador TP en R. |
| `InpVirtualEntryExpiryBars` | `20` | Expira sin fill si `bars_waiting_entry` supera el umbral (regla estricta `>`). |
| `InpVirtualMaxBarsInTrade` | `40` | Tras fill, expira abierto si `bars_held` supera el umbral (`>`). |
| `InpVirtualAmbiguityMode` | `ambiguous` | Misma vela TP+SL → `ambiguous` / `result_r=0` / `exit_price=entry`. |
| `InpVirtualOneTradeAtATime` | `true` | Con trade activo: evento `virtual_trade_skipped` (`reason=trade_active`). |
| `InpWriteVirtualTrades` | `true` | Si `false`, no se añaden filas CSV (contadores de fila/export coherentes con no escritura). |

`InpBacktestMode` sigue en **`virtual`**. No se añaden inputs de cuenta, riesgo % real ni lotaje.

---

## 3. Lifecycle (orden por vela cerrada de ejecución)

1. **`VirtualManageOnNewClosedExecBar`** (gestión del trade activo: fill, expiración sin fill, SL/TP, `expired_open`, ambigüedad).
2. Detección FVG / gate bias y eventos `setup_*` como en E3.5–E3.6.
3. Tras **`setup_allowed`**: si virtual habilitado → **`VirtualOnSetupAllowed`** (crear candidato, intento de fill en la misma vela cerrada).

Una sola operación virtual activa cuando `InpVirtualOneTradeAtATime=true`.

---

## 4. Entry / SL / TP (V1)

- **Entry:** punto medio del FVG `(fvg_low + fvg_high) / 2`.
- **Long:** `SL = fvg_low - buffer×Point`, `risk = entry - SL`, `TP = entry + risk × RR`.
- **Short:** `SL = fvg_high + buffer×Point`, `risk = SL - entry`, `TP = entry - risk × RR`.
- Si `risk <= 0` o niveles no finitos → **`virtual_trade_skipped`** (`invalid_risk`), sin fila de trade.

---

## 5. Fill y gestión (solo vela cerrada índice 1)

- **Fill:** `low <= entry <= high` de la vela cerrada.
- **TP/SL** tras fill según reglas E5.2 (incl. misma vela TP+SL → `ambiguous` si el modo lo indica).
- **`expired_unfilled`:** incremento de `bars_waiting_entry` y comparación con `InpVirtualEntryExpiryBars`.
- **`expired_open`:** incremento de `bars_held` y comparación con `InpVirtualMaxBarsInTrade`; precio de salida = **close** de la vela.

---

## 6. Eventos `virtual_trade_*`

Tipos soportados en CSV y validador: `virtual_trade_candidate_created`, `virtual_trade_entry_filled`, `virtual_trade_closed`, `virtual_trade_expired`, `virtual_trade_ambiguous`, `virtual_trade_skipped`. Decisiones nuevas en wire: `created`, `filled`, `closed`, `expired`, `ambiguous`, `skipped` (además del set E3.6).

---

## 7. `backtest_trades.csv` (E5.3)

Cabecera extendida (incluye `setup_event_id`, `timestamp`, `entry_time`, `exit_time`, `exit_price`, `result_money` fijo `0` para silenciar avisos de import, `outcome`, modos virtual, FVG metadata, `bars_to_fill`, `bars_held`). **Una fila** por trade virtual **cerrado** (incl. expiraciones y ambigüedad). `trade_count` en JSON = número de filas exportadas.

---

## 8. `backtest_summary.json`

Nuevos / relevantes: `has_real_virtual_trade_logic`, `virtual_trade_count`, `trade_count`, contadores de outcome (`win_count`, `loss_count`, …), `total_r`, `average_r`, `winrate` (wins / (wins+losses)), `expectancy_r` (= `average_r` en V1), `max_drawdown_r` (drawdown simple sobre curva acumulada R; ver limitaciones), `last_trade_outcome`, `last_trade_result_r`. Se mantienen `has_full_ifvg_pipeline: false`, `has_real_trading_orders: false`, `tester_only: true`, `official_ea: Mapazapp_TestEA`.

---

## 9. Limitaciones (V1)

- Sin ticks intra-barra; orden TP vs SL en misma vela ambigua según contrato.
- `max_drawdown_r` es **MFE conservador** sobre equity en R acumulado (no simulación de posición parcial).
- `tester_orders` y API de órdenes siguen **fuera de alcance** (gate futuro).
- Sin pipeline IFVG completo (`has_full_ifvg_pipeline` sigue **false**).

---

## 10. Siguiente paso

**E5.4 — First virtual outcome smoke in Strategy Tester:** primera corrida en MT5 Strategy Tester con el EA compilado, revisión de CSV/JSON reales y ajuste fino si hiciera falta (sin este repositorio ejecutando MT5 en E5.3).

## 11. Nota E5.4.1 (post–primer smoke E5.4)

Tras el smoke E5.4 (**OK with warnings**), el repo endureció la simulación virtual (**`MZP_TestEA_E5_4_1`**): validación explícita de geometría tras `NormalizeDouble`, umbral **`InpVirtualMinTradeFvgPoints`** para no abrir trades virtuales sobre FVGs demasiado pequeños, `virtual_trade_skipped` con razones wire (`invalid_geometry_*`, `invalid_risk_nonpositive`, `fvg_below_virtual_trade_min`), cierre en **`OnDeinit`** con `virtual_trade_unresolved` / filas `unresolved` o `expired_unfilled` según estado, y alineación de validadores TS. Ver [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md). **E5.4.2 (operador):** smoke **limpio** post-fix — solo warning `BUNDLE_EVENTS_LARGE`; sin geometría CSV inválida — [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md). **Siguiente:** **E5.5** campaña métricas.

## 12. Nota E5.4.3 (política build / versioning)

Para trazabilidad de runs y builds en campaña: [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md).
