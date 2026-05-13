# Mapazapp — TestEA Trade Outcome Mode Decision E5.1

## 1. Purpose

- **E5.1** fija **formalmente** cómo **`Mapazapp_TestEA`** medirá **resultados de setup** (outcomes) dentro de **MetaTrader 5 Strategy Tester**.
- El **backtest oficial del setup** sigue siendo **MT5 Strategy Tester**; **no** se crea ni se promueve un **backtester principal fuera de MT5** (TypeScript/core/dashboard validan, consolidan y visualizan evidencia; **no** sustituyen al tester como motor canónico).
- **E5.1 no implementa** trades, simulación virtual ni MQL5 en este checkpoint: es **solo documentación** y desbloquea **E5.2** (contrato) y **E5.3** (implementación en el EA).

**Relacionado:** [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md), [`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](./BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md), [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md).

---

## 2. Current state

**`Mapazapp_TestEA` hoy:**

- Corre en **Strategy Tester** (tester-only).
- Calcula **Daily Bias V1**.
- Detecta **FVG / Setup V1** candidatos y aplica **compuerta Daily Bias**.
- Exporta **`backtest_summary.json`**, **`backtest_events.csv`**, **`backtest_trades.csv`**.
- **`trade_count = 0`**, **`has_real_trading_orders: false`**, **`has_full_ifvg_pipeline: false`**.
- **No** mide rentabilidad, winrate, expectancy ni drawdown de trades.

**Qué falta para Phase B honesta:**

- Reglas de **entrada**, **SL**, **TP**, **expiry** y **outcome** acordadas y reproducibles.
- **`result_r`**, conteo real o virtual de trades, **winrate**, **expectancy**, **drawdown** (en unidades R o según contrato E5.2).
- Métricas de **campaña** agregables sin confundir señales con trades cerrados.

---

## 3. Non-negotiable architecture decision

| Regla | Texto |
|-------|--------|
| **N1** | **Mapazapp no tendrá backtester principal fuera de MT5** para el setup oficial. |
| **N2** | El **outcome** se calcula **dentro de** **MT5 Strategy Tester** y **dentro de** **`Mapazapp_TestEA.mq5`** (o módulos incluidos por ese EA en el mismo build tester). |
| **N3** | **Mapazapp app / core / dashboard / scripts:** validan exports, consolidan evidencia, visualizan, humanizan; **no** reemplazan al Strategy Tester como motor del backtest del setup. |

La simulación virtual descrita en E5.1/E5.2 ocurre **en el EA bajo el tester**, no como motor TypeScript paralelo sustitutivo.

---

## 4. Options

### Option A — Virtual trade simulation inside TestEA

- El EA **no** abre órdenes. Tras **`setup_allowed`**, crea un **trade virtual** con entry/SL/TP/expiry.
- Recorre **velas o ticks del tester** según acuerde **E5.2** para resolver resultado.
- Escribe **filas** en **`backtest_trades.csv`** y actualiza **summary** con métricas acordadas.

**Ventajas:** más seguro; sin `OrderSend`/`CTrade`; control del schema y `result_r`; buena primera validación lógica.

**Desventajas:** no usa reportes nativos de balance MT5; hay que especificar fill, spread, ambigüedad OHLC; puede diferir de órdenes simuladas del tester.

### Option B — Tester orders inside Strategy Tester

- Uso de **`OrderSend` / `CTrade` solo** con **`MQL_TESTER`** y política explícita.
- Aprovecha métricas nativas (balance, equity, drawdown del reporte).

**Ventajas:** cercano al modelo de ejecución del tester; spread/simulación del entorno.

**Desventajas:** superficie de riesgo y confusión con live; requiere **gate** adicional, revisión de seguridad y tests estáticos que acoten dónde aparecen APIs de trading.

### Option C — Sequential approach

1. **Primero:** simulación virtual (Opción A) **dentro de TestEA** en el tester.
2. **Después (opcional):** gate separado para **tester_orders** (Opción B) si aporta valor tras la campaña virtual.

**Ventajas:** velocidad con seguridad; valida el setup antes de activar órdenes; permite comparar luego con reportes nativos si se desea.

**Recomendación de producto (E5.1):** **Opción C**, comenzando por **A**.

---

## 5. Recommended decision

**Camino aprobado (documental):**

| Fase | ID | Contenido |
|------|-----|------------|
| Contrato | **E5.2** | Contrato de **simulación virtual de trades** (campos CSV, summary, eventos si aplica). |
| Código | **E5.3** | Implementación en **`Mapazapp_TestEA`** + ajustes de validadores TS / `EXPORT_CONTRACT.md` según contrato. |
| Evidencia | **E5.4** | Primer **smoke de outcome virtual** en Strategy Tester (run acotado + bundle E4.1). |
| Campaña | **E5.5** | Campaña **XAUUSD** con **métricas de outcome virtual**. |
| Opcional | **E5.6** | **Gate** explícito para **tester_orders** solo si hace falta, con spec de seguridad aparte. |

**Aclaración:** la simulación virtual es **lógica dentro del EA** ejecutándose **en el Strategy Tester**; **no** es un backtest sustituto en TypeScript.

---

## 6. Minimum outcome model for virtual simulation

Cuando un evento **`setup_allowed`** (o equivalente acordado en E5.2) dispare un candidato, el modelo mínimo de **trade virtual** incluirá (nombres orientativos; E5.2 puede afinar snake_case / JSON):

- `trade_id`
- `setup_event_id` (enlace al `event_id` del CSV de eventos)
- `entry_time`, `entry_price`
- `direction`, `bias_direction`, `setup_direction`
- `fvg_low`, `fvg_high`, `fvg_points`
- `sl`, `tp`, `rr`
- `expiry_bars`
- **`outcome`:** `win` | `loss` | `expired` | `unresolved` | `ambiguous`
- `result_r`
- `exit_time`, `exit_price`, `exit_reason`

---

## 7. Initial entry / SL / TP assumptions (for E5.2 contract only)

**Supuestos de diseño — no implementación E5.1.**

**Long:**

- Entrada: **punto medio de la zona FVG** o **retest** a la zona (modo a fijar en E5.2).
- SL: **por debajo del FVG low** o **swing low** (modo a fijar).
- TP: **objetivo fijo en R**, default **2R**.

**Short:** simétrico (entrada en zona; SL por encima de **FVG high** o **swing high**; TP **2R** por defecto).

**Inputs futuros (ejemplo):**

- `InpEntryMode`: `fvg_midpoint` | `fvg_edge` | `close_confirmation`
- `InpStopMode`: `fvg_boundary` | `swing`
- `InpRiskReward` = `2.0`
- `InpExpiryBars` = `20`
- `InpUseSpreadBuffer` = true
- `InpSpreadBufferPoints` = configurable

---

## 8. Fill and ambiguity rules

**E5.2** debe definir de forma explícita:

- Cómo se considera **llenada** una entrada (touch intra-bar, cierre, etc.).
- **SL y TP en la misma vela** sin orden temporal claro → tratar como **`ambiguous`** o **`worst_case_loss`** (modo conservador por defecto recomendado en ausencia de ticks).
- No llenado antes de **expiry** → `expired`.
- Uso de **OHLC** vs **ticks** del tester según fase y fidelidad deseada.
- Impacto del **spread** en entry/SL/TP y buffers.
- Cancelación por **cambio de bias** o reglas de invalidación (si aplica).

**Propuesta conservadora inicial:** si SL y TP pueden interpretarse como simultáneos sin tick data → **`ambiguous`** o **`worst_case_loss`**; documentar el modo en summary (`notes` o flag de política).

---

## 9. Export schema impact

**`backtest_trades.csv` (futuro post E5.2+):** además de la cabecera actual, se esperan columnas adicionales o alineación estricta con el contrato, por ejemplo:

`trade_id`, `setup_event_id`, `entry_time`, `exit_time`, `entry_price`, `exit_price`, `sl`, `tp`, `rr`, `result_r`, `outcome`, `exit_reason`, `bars_held`, `fvg_low`, `fvg_high`, `fvg_points`, `bias_direction`, `setup_direction`, `parameter_set_id` (y campos ya existentes como `run_id`, `symbol`, `timeframe` según **`EXPORT_CONTRACT.md`**).

**`backtest_summary.json` (futuro):** además de `trade_count`, campos agregados orientativos: `win_count`, `loss_count`, `expired_count`, `ambiguous_count`, `winrate`, `average_r`, `total_r`, `max_drawdown_r`, `expectancy_r`, `profit_factor_r` (opcional / derivado).

**Nota:** E3.6 documenta el estado **congelado pre-outcome**; la **extensión** numérica y de columnas se versiona en **E5.2** y revisión coordinada de **`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`** + validadores TS.

---

## 10. Safety rules

**Simulación virtual:**

- **Sin** `OrderSend`.
- **Sin** `CTrade`.
- **Sin** órdenes reales.
- Sigue siendo **tester-only** (`MQL_TESTER`); sin comportamiento live desde este modo.

**Tester orders (futuro E5.6):**

- **Gate** de producto y de código **separado** del modo virtual.
- Guard **`MQL_TESTER`** obligatorio; sin gráfico live como requisito de este rol; inputs explícitos para activar.
- Tests estáticos: permitir tokens `OrderSend`/`CTrade` **solo** en rutas o fases claramente etiquetadas como **tester_orders-gated** (política a detallar con implementación).

---

## 11. Humanization impact

La evidencia futura debe poder sustentar frases como:

- “Setup **permitido** por bias.”
- “Entrada virtual **no fue llenada**.”
- “Ganadora por **TP 2R**.”
- “Perdedora por **SL**.”
- “**Ambigua**: SL y TP en la misma vela sin orden claro.”
- “Setup **rechazado** por ir contra bias.”
- “Demasiados candidatos de **baja calidad**.”

Esto alimentará **dashboard** y narrativa del **asistente del trader** sin confundir señal con PnL real.

---

## 12. Decision

**Approved path:**

- **Option C** (secuencial).
- **Primero:** **simulación virtual de trades** **dentro de `Mapazapp_TestEA`** en **MT5 Strategy Tester**.
- **Tester orders** quedan **pospuestos** a un **gate opcional E5.6** tras campaña de outcome virtual con sentido.

**Contrato de simulación V1 (E5.2):** [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md) — parámetros por defecto aprobados para **E5.3:** entrada `fvg_midpoint`, stop `fvg_boundary_with_buffer` (buffer 0 configurable), **RR 2.0**, expiración entrada **20** barras, máximo **40** barras en trade, ambigüedad **`ambiguous`**, **una** operación virtual activa, sin `OrderSend`/`CTrade`.

---

## 13. Non-goals (E5.1)

E5.1 **no** incluye:

- Cambios a **MQL5**, compilación, ejecución de **MT5** o **Strategy Tester**.
- Implementación de trades u órdenes.
- Dashboard, DB, WebSocket, launcher/runtime expandido.
- Backtester principal en **TypeScript** u otro runtime externo.

---

## 14. Document history

| Versión | Nota |
|---------|------|
| E5.1 v1 | Decisión formal docs-only; siguiente **E5.2** contrato simulación virtual. |
