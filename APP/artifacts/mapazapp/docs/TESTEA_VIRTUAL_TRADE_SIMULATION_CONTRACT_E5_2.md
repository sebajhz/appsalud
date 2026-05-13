# Mapazapp — TestEA Virtual Trade Simulation Contract E5.2

## 1. Purpose

- **E5.2** define el **contrato formal** de la **simulación virtual de trades** para **`Mapazapp_TestEA`** **antes** de escribir lógica MQL5 (**E5.3**).
- La simulación virtual ocurre **dentro de `Mapazapp_TestEA`** mientras corre en **MT5 Strategy Tester**; **no** es un backtester externo (TypeScript/core no sustituyen al tester).
- **No** abre órdenes reales; **no** usa `CTrade` / `OrderSend` / apertura de posiciones; solo **filas de datos** y **métricas en exports**.
- Este documento **prepara E5.3** (implementación) y **E5.4** (smoke de outcome).

**Relacionado:** [`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md), [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md), [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md), [`EXPORT_CONTRACT.md`](../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md).

---

## 2. Current state before virtual outcomes

- **`Mapazapp_TestEA`** corre **solo** en **Strategy Tester** (`MQL_TESTER`).
- **Daily Bias V1** operativo; detección **FVG / Setup V1** candidata operativa; **compuerta Daily Bias** permite o rechaza setups.
- Esquema de export **E3.6** congelado como baseline; **E4** smoke OK; **E4.1** valida bundles read-only.
- **`trade_count = 0`**, sin **`result_r`** en datos reales; **`backtest_trades.csv`** solo **cabecera** hasta **E5.3+**.

---

## 3. Virtual trade lifecycle

Orden lógico (por cada candidato que califique):

1. Evento **`setup_detected`** (ya existente).
2. Evaluación **Daily Bias gate** (ya existente).
3. Evento **`setup_allowed`** (ya existente) — **no** implica trade ejecutado; indica **elegibilidad** para simulación.
4. Si política de una-operación-activa lo permite → **`virtual_trade_candidate_created`** (nuevo evento futuro).
5. **Espera fill de entrada** en velas **cerradas** del **execution timeframe** (V1 = OHLC, sin tick-order).
6. Si hay fill → monitorizar **SL**, **TP** y **expiry de gestión** bar a bar (velas cerradas).
7. Cierre del trade virtual como uno de: **`win`**, **`loss`**, **`expired_unfilled`**, **`expired_open`**, **`ambiguous`**, **`invalid_risk`**, **`unresolved`** (ver §§9–11).
8. Escribir **fila** en **`backtest_trades.csv`** cuando el ciclo termine en un estado exportable (incl. expired/ambiguous según reglas).
9. **Actualizar métricas** en **`backtest_summary.json`** al finalizar la corrida (o incrementalmente si el EA lo documenta en E5.3).

**Reglas de elegibilidad:**

- **`setup_rejected`** / **`setup_skipped`** → **no** crean candidato virtual.
- **`setup_allowed`** → puede crear candidato **solo** si además se cumplen §4 (dirección/bias) y §13 (capacidad de nueva operación).

---

## 4. Direction rules

| Caso | Trade virtual |
|------|-----------------|
| **Long** | Solo si **`setup_direction = long`**. Permitido si bias **alcista** **o** si el requisito de alineación bias está **desactivado** explícitamente en inputs (modo comparación; no baseline de producto). |
| **Short** | Solo si **`setup_direction = short`**. Permitido si bias **bajista** **o** bias requirement off. |
| **Rechazado por gate** | **No** trade. |
| **Bias neutral / contexto faltante** según política actual del EA | **No** trade (equivalente a skip ya cubierto por eventos existentes). |

---

## 5. Entry model V1

**Input futuro:** `InpVirtualEntryMode` (string o enum documentado en MQL5).

| Valor | Significado |
|-------|-------------|
| `fvg_midpoint` | Entrada en punto medio de la zona FVG (**recomendación V1**). |
| `fvg_near_edge` | Reservado; requiere spec adicional antes de E5.3 si se activa. |
| `close_confirmation` | **No** en V1 por defecto; queda para **gate posterior**. |

**Reglas V1 (`fvg_midpoint`):**

- **Long y Short:** `entry_price = midpoint(fvg_low, fvg_high)` (misma fórmula geométrica; la dirección del trade la fija §4).

**No** “market entry” instantánea en apertura de señal: el precio debe **tocar** el nivel de entrada **dentro** de la ventana de **entry expiry** (§8).

---

## 6. Stop loss model V1

**Input futuro:** `InpVirtualStopMode`.

| Valor | Uso V1 |
|-------|--------|
| `fvg_boundary` | SL en borde FVG sin buffer extra. |
| `fvg_boundary_with_buffer` | **Recomendación V1.** |
| `swing` | **Fase futura** si no hay soporte claro en código. |

**Reglas V1 (`fvg_boundary_with_buffer`):**

- **Long:** `sl = fvg_low - InpVirtualStopBufferPoints` (puntos del símbolo según convención del EA).
- **Short:** `sl = fvg_high + InpVirtualStopBufferPoints`.
- **`InpVirtualStopBufferPoints`:** default **0**, configurable.

V1 debe ser **simple y reproducible**; swing SL queda explícitamente fuera del camino mínimo salvo extensión acordada.

---

## 7. Take profit model V1

**Input futuro:** `InpVirtualRiskReward` — default **`2.0`**.

**Reglas:**

- **Long:** `risk = entry_price - sl`; `tp = entry_price + risk * rr`.
- **Short:** `risk = sl - entry_price`; `tp = entry_price - risk * rr`.

**Validación:**

- Requiere **`risk > 0`**. Si **`risk <= 0`** → candidato descartado con outcome **`invalid_risk`** (exportación exacta: fila omitida vs fila con `outcome`/campos vacíos — **una sola política** documentada en **E5.3**).

---

## 8. Expiry model V1

**Inputs futuros (recomendados):**

- `InpVirtualEntryExpiryBars` — default **20**: máximo de barras **desde la vela de referencia del setup** (la misma ancla que use el EA en E5.3, documentada allí) para conseguir **fill** de entrada.
- `InpVirtualMaxBarsInTrade` — default **40**: máximo de barras **tras el fill** para alcanzar SL/TP; si no → **`expired_open`**.

**Modo simple (alternativa):** un solo `InpVirtualExpiryBars` para **ambos** plazos; **E5.3** debe declarar cuál modo implementa. **Este contrato aprueba por defecto el modo dos-input** arriba.

**Outcomes de expiración:**

- Sin fill dentro de entry expiry → **`expired_unfilled`**.
- Fill pero sin SL/TP dentro de max bars in trade → **`expired_open`**.

---

## 9. Fill rules

- **Solo velas cerradas** del **execution timeframe** (p. ej. M15 alineado a la campaña E5).
- **No** usar la vela **en formación** para decisiones de fill ni de salida.
- **Long entry fill:** existe fill si para una vela cerrada `low <= entry_price <= high`.
- **Short entry fill:** misma condición (el precio **toca** el nivel dentro del rango OHLC).

**V1:** datos **OHLC** del tester; **sin** orden temporal intra-barra. Si más adelante se requiere fidelidad de **ticks**, será **extensión** explícita (nueva versión de contrato).

---

## 10. Win / loss rules

Tras el fill, barra a barra en velas cerradas:

**Long:**

- **TP tocado** si `high >= tp`.
- **SL tocado** si `low <= sl`.

**Short:**

- **TP tocado** si `low <= tp`.
- **SL tocado** si `high >= sl`.

**Outcomes cerrados (dominio):** `win`, `loss`, `expired_unfilled`, `expired_open`, `ambiguous`, `invalid_risk`, `unresolved` (reservado para estados no clasificados o error interno documentado).

**`result_r`:** múltiplo **R** respecto al **riesgo inicial** (`risk` de §7); **0** o vacío según política para expired/ambiguous (definido en **E5.3** de forma única y reflejado en validadores).

---

## 11. Ambiguity rules

**Caso:** en la **misma vela cerrada** pueden interpretarse **tocados** tanto **SL** como **TP** (solape OHLC sin orden intra-barra).

**Input futuro:** `InpVirtualAmbiguityMode`:

| Modo | Comportamiento |
|------|----------------|
| `conservative_loss` | Cuenta como pérdida conservadora. |
| `ambiguous` | **Recomendación V1.** |
| `prefer_tp` / `prefer_sl` | No default V1. |

**Reglas de conteo honesto:**

- **`ambiguous` no cuenta como `win`.** No inflar winrate: va a **`ambiguous_count`**; opcionalmente en fases posteriores el summary puede exponer `ambiguous_as_loss` para escenarios conservadores **sin** sobrescribir el outcome primario.

---

## 12. Spread / buffer policy

- **V1:** buffer numérico configurable (`InpVirtualStopBufferPoints`, `InpSpreadBufferPoints` / `InpUseSpreadBuffer`); **sin** modelo complejo de spread bid/ask separado.
- El Strategy Tester tiene modelo de spread propio; la simulación virtual V1 se basa en **OHLC + buffers** documentados.

**Recomendación:** mantener **simple** en **E5.3**; no sobre-optimizar antes del **primer smoke E5.4**.

---

## 13. One-trade-at-a-time policy

| Opción | Descripción |
|--------|-------------|
| **A** | **Una** operación virtual **activa** a la vez (**recomendación V1**). |
| **B** | Múltiples operaciones concurrentes — **no** V1. |

**Razones V1:** menor explosión de trades; más fácil de validar y de explicar al trader.

**Comportamiento si ya hay trade activo** y llega **`setup_allowed`:**

- **No** crear nuevo trade virtual.
- Emitir evento del tipo **`virtual_trade_skipped`** (o `setup_allowed_but_trade_active` mapeado a `virtual_trade_skipped` con `reason=trade_active`) con referencia al `trade_id` activo si existe.

---

## 14. Trade export schema (`backtest_trades.csv`)

**Cabecera existente (E3.6) — mantener compatibilidad conceptual:**

`run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason`

**Mapping mínimo si NO se amplía cabecera en E5.3 (opción compat):**

| Columna existente | Uso propuesto |
|-------------------|----------------|
| `timestamp` | Hora de **referencia del setup** o de **entrada** — **E5.3 debe fijar una sola semántica** y reflejarla en `EXPORT_CONTRACT.md`. |
| `entry`, `sl`, `tp` | Precios **entry_price**, **sl**, **tp** numéricos. |
| `exit_reason` | Codificación de **outcome** + detalle corto (p. ej. `win:tp`, `loss:sl`, `ambiguous`, `expired_unfilled`). |
| `result_r` | Múltiplo R al cierre (o vacío/`0` según política para no-cerrados). |
| `setup_reason` / `bias_reason` | Texto ASCII breve o códigos wire; sin rutas privadas. |

**Columnas adicionales recomendadas si se **amplía** cabecera en E5.3 (opción extendida):**

`setup_event_id`, `entry_time`, `exit_time`, `entry_price`, `exit_price`, `rr`, `outcome`, `bars_to_fill`, `bars_held`, `fvg_low`, `fvg_high`, `fvg_points`, `parameter_set_id`, `ambiguity_mode`, `entry_mode`, `stop_mode`

**Decisión para E5.3:** elegir **(a)** cabecera extendida + bump de `schema_version` o subnotas en summary, **o** **(b)** cabecera legacy + mapping estricto; en ambos casos actualizar **`EXPORT_CONTRACT.md`** y validadores TS.

---

## 15. Summary metrics schema (futuro)

Campos **orientativos** a añadir o derivar cuando existan trades virtuales (nombres exactos acordados en **E5.3**):

- Conteos: `trade_count`, `virtual_trade_count`, `filled_trade_count`, `unfilled_expired_count`, `win_count`, `loss_count`, `ambiguous_count`, `expired_open_count`, `invalid_risk_count`, `allowed_setups_without_trade`, `skipped_trade_active`.
- Rendimiento en R: `total_r`, `average_r`, `winrate`, `expectancy_r`, `max_drawdown_r`, `profit_factor_r` (opcional / derivado).

**Aclaraciones:**

- Métricas = **simulación virtual**, **no** reporte nativo de cuenta MT5.
- **`tester_orders`** (futuro E5.6) podría usar **métricas separadas** o flags explícitos para no mezclar series.

---

## 16. Event schema impact

Nuevos `event_type` propuestos (sujetos a validación TS en E5.3):

- `virtual_trade_candidate_created`
- `virtual_trade_entry_filled`
- `virtual_trade_closed`
- `virtual_trade_expired`
- `virtual_trade_ambiguous`
- `virtual_trade_skipped`

Cada evento debe poder referenciar: **`trade_id`**, **`setup_event_id`**, **direcciones**, **entry/sl/tp**, **outcome** / **result_r** si aplica, **`reason`** corto ASCII.

---

## 17. Inputs contract for E5.3 (lista — no implementar en E5.2)

| Input | Default / tipo | Notas |
|-------|------------------|--------|
| `InpEnableVirtualTrades` | `true` | Master switch virtual. |
| `InpVirtualEntryMode` | `fvg_midpoint` | §5. |
| `InpVirtualStopMode` | `fvg_boundary_with_buffer` | §6. |
| `InpVirtualStopBufferPoints` | `0` | Puntos. |
| `InpVirtualRiskReward` | `2.0` | §7. |
| `InpVirtualEntryExpiryBars` | `20` | §8. |
| `InpVirtualMaxBarsInTrade` | `40` | §8. |
| `InpVirtualAmbiguityMode` | `ambiguous` | §11. |
| `InpVirtualOneTradeAtATime` | `true` | §13. |
| `InpWriteVirtualTrades` | `true` | Export filas trades. |
| `InpUseSpreadBuffer` | `false` | V1 simple; puede activarse. |
| `InpSpreadBufferPoints` | configurable | §12. |

---

## 18. Safety rules

- **Sin** `OrderSend`, **sin** `CTrade`, **sin** `PositionOpen` u otras APIs de cuenta viva para esta función.
- **Sin** mutación de cuenta; trades virtuales = **solo filas y contadores**.
- Sigue vigente el guard **`MQL_TESTER`** del EA.
- No live trading desde este modo.

---

## 19. Validation rules (E5.3 / E5.4 / TS validators)

Los validadores futuros deben comprobar (lista mínima):

- Coherencia **`trade_count`** con número de filas **cerradas** exportadas (definición exacta en E5.3).
- **`result_r`** numérico para **`win`** / **`loss`** cerrados estándar.
- Manejo explícito de **`expired_*`** / **`ambiguous`** / **`invalid_risk`**.
- Sin **`trade_id`** duplicados; sin geometría imposible SL/TP vs entry.
- **No** afirmar winrate si `trade_count = 0`.
- **No** afirmar profit nativo MT5 desde exports virtuales.

---

## 20. Humanization examples

- “El setup fue **permitido** por bias, pero la **entrada no fue llenada** (expiró).”
- “La entrada se llenó y alcanzó **TP 2R**.”
- “La entrada tocó **SL** antes que TP.”
- “La vela tocó **SL y TP**; el resultado se marca como **ambiguo**.”
- “Se **ignoró** un nuevo setup porque ya había una **operación virtual activa**.”
- “El setup fue **rechazado** por Daily Bias.”

---

## 21. Decision

**Aprobado para E5.3 (implementación MQL5 + exports):**

- Simulación **virtual** **dentro de `Mapazapp_TestEA`** en **Strategy Tester**.
- **Entry mode:** `fvg_midpoint`.
- **Stop mode:** `fvg_boundary_with_buffer` con buffer default **0** (configurable).
- **RR:** **2.0**.
- **Entry expiry:** **20** barras (`InpVirtualEntryExpiryBars`).
- **Max bars in trade:** **40** (`InpVirtualMaxBarsInTrade`).
- **Ambiguity mode:** **`ambiguous`**.
- **Policy:** **una** operación virtual activa a la vez.
- **Sin** órdenes reales ni APIs de trading.

---

## 22. Non-goals (E5.2)

E5.2 **no** incluye: implementación MQL5; ejecución MT5/Strategy Tester; **tester_orders**; dashboard/DB/WebSocket; launcher/runtime expandido; motor de backtest externo.

---

## 23. Document history

| Versión | Nota |
|---------|------|
| E5.2 v1 | Contrato V1 docs-only; siguiente **E5.3** implementación. |
