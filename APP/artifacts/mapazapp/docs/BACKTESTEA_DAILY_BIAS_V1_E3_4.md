# Mapazapp — BacktestEA Daily Bias V1 (E3.4)

## 1. Qué se implementó

- Lógica **Daily Bias V1** dentro de **`Mapazapp_BacktestEA.mq5`** (solo **Strategy Tester**).
- Evaluación en **vela cerrada previa** del timeframe configurado (`InpDailyBiasTimeframe`, por defecto D1).
- Eventos **`daily_bias_evaluated`** en `backtest_events.csv`.
- **`backtest_summary.json`** con `has_real_daily_bias_logic: true` y contadores de outcome de bias.
- Función **`ApplyDailyBiasGatePlaceholder`** lista para **E3.5** (dirección de setup `long` / `short` / `none` vs bias); en E3.4 no se incrementan `rejected_by_daily_bias` ni `skipped_neutral_bias` desde setups (no hay IFVG).

## 2. Regla V1

| Condición | `bias_direction` | Código de razón (campo `reason`) |
|-----------|-------------------|-----------------------------------|
| `close > open` (vela cerrada previa) | bullish | `previous_daily_close_above_open` |
| `close < open` | bearish | `previous_daily_close_below_open` |
| `close == open` | neutral | `previous_daily_close_equals_open` |
| Cuerpo en puntos &lt; `InpDailyBiasMinBodyPoints` (si el input &gt; 0) | neutral | `previous_daily_body_too_small` |
| Sin barra cerrada / datos insuficientes / fallo de evaluación | unknown | `missing_daily_bias_data` |

**No** se usa la vela actual en formación (solo índice **1** en el TF de bias).

## 3. Limitaciones

- **Sin** fusión H4/H1: los inputs `InpUseH4Context` / `InpUseH1Context` se conservan para fases posteriores.
- **Sin** IFVG ni trades: `has_real_ifvg_logic` y `has_real_trading_orders` permanecen en `false`.
- `rejected_by_daily_bias` y `skipped_neutral_bias` en summary siguen en **0** hasta que E3.5 conecte el gate con candidatos de setup.

## 4. Por qué aún no hay IFVG

E3.4 acota el riesgo y el alcance: primero **bias estable y auditable**; la detección de zonas IFVG y entradas virtuales van en **E3.5** según el contrato E3.2.

## 5. Qué exporta

- **`daily_bias_evaluated`**: `bias_recorded`, `setup_direction=none`, detalles con TF de bias, tiempo UTC de la vela cerrada y puntos de cuerpo.
- **Summary**: contadores de evaluaciones y outcomes, `missing_bias_context`, notas de build.

## 6. Preparación de E3.5

- **`ApplyDailyBiasGatePlaceholder(setupDirection)`** devuelve: `allowed`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context` según bias actual vs `long`/`short`/`none`.
- El EA ya mantiene **`g_lastBiasEnum`** tras cada evaluación para que el gate sea barato en el siguiente hito.

## 7. Seguridad tester-only

- Misma guarda **`MQL_TESTER`** / `INIT_FAILED` que E3.3.
- Sin ejecución de órdenes, sin APIs de red en el EA, sin uso operativo en gráfico live.

**Relacionado:** [`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](./BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md), [`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md).
