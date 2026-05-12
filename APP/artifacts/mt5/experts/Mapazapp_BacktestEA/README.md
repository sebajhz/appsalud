# Mapazapp_BacktestEA (E3.4)

**Propósito:** EA del **backtest principal del Setup V1** en **MetaTrader 5 Strategy Tester**, con exportación de evidencia (CSV/JSON) bajo `MQL5\Files`. **E3.4** añade **Daily Bias V1 real**; **E3.5** añadirá detección IFVG; **E3.6** alineará el esquema de evidencia con importadores TS.

**Relación con `Mapazapp_TestEA`:** `Mapazapp_TestEA` sigue siendo el **placeholder CP14**. **`Mapazapp_BacktestEA`** es el artefacto oficial para el tester del setup.

**Documentación técnica Daily Bias V1:** [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](../../../mapazapp/docs/BACKTESTEA_DAILY_BIAS_V1_E3_4.md) (ruta repo: `APP/artifacts/mapazapp/docs/BACKTESTEA_DAILY_BIAS_V1_E3_4.md`).

---

## Instalación en MT5

1. Copiar la carpeta `Mapazapp_BacktestEA` bajo `MQL5\Experts\Mapazapp_BacktestEA\`.
2. Abrir `Mapazapp_BacktestEA.mq5` en **MetaEditor** y compilar (**F7**).
3. En el **Strategy Tester**, adjuntar el EA al gráfico del símbolo/periodo deseado.

---

## Uso: solo Strategy Tester

| Regla | Detalle |
|--------|---------|
| **Strategy Tester** | `OnInit` exige `MQLInfoInteger(MQL_TESTER) != 0`. Fuera del tester → **`INIT_FAILED`**. |
| **Gráfico live** | **No usar** en cuenta real ni gráfico live. |
| **Ejecución** | Modo **virtual** (`InpBacktestMode` por defecto `virtual`): sin órdenes al bróker, sin clase `CTrade`, sin `OrderSend` (E3.4 sigue sin operaciones). |
| **Red / comandos** | Sin `WebRequest`, sin ingest de archivos de comando, sin DLLs de red. |

---

## Daily Bias V1 (E3.4)

- **Fuente:** última vela **cerrada** del timeframe `InpDailyBiasTimeframe` (índice 1 respecto a la serie del terminal: no la vela en formación).
- **Clasificación:**
  - `close > open` → **bullish** (`previous_daily_close_above_open`).
  - `close < open` → **bearish** (`previous_daily_close_below_open`).
  - `close == open` → **neutral** (`previous_daily_close_equals_open`).
  - Sin datos suficientes / punto inválido → **unknown** (`missing_daily_bias_data`).
- **Filtro opcional:** `InpDailyBiasMinBodyPoints` (0 = desactivado). Si el cuerpo en puntos es **menor** que el umbral → **neutral** (`previous_daily_body_too_small`).
- **Cuándo se evalúa:** al iniciar (si hay datos) y en **`OnTick`** solo cuando cambia el tiempo de la última vela cerrada del TF de bias (evita spam por tick).
- **Evento CSV:** `daily_bias_evaluated` con `decision=bias_recorded`, `setup_direction=none`.
- **Resumen JSON:** `has_real_daily_bias_logic: true`; `has_real_ifvg_logic: false`; `has_real_trading_orders: false`; contadores `total_bias_evaluated`, `bullish_bias_count`, `bearish_bias_count`, `neutral_bias_count`, `unknown_bias_count`, `missing_bias_context`, y `rejected_by_daily_bias` / `skipped_neutral_bias` en **0** hasta que E3.5 use la política de gate con setups reales.

---

## Qué exporta

Bajo **`MQL5\Files\<InpExportRoot>\<run_id>\`**:

| Archivo | Contenido (E3.4) |
|---------|-------------------|
| `backtest_trades.csv` | Solo **cabecera** (sin filas de trade). |
| `backtest_events.csv` | Ciclo de vida + **`daily_bias_evaluated`** por cada nueva vela cerrada de bias. |
| `backtest_summary.json` | Metadatos, flags anteriores, contadores de bias, `tester_only: true`. |

Escritura atómica: `*.tmp` + `FileMove`.

---

## Qué **no** hace todavía

- **IFVG** ni detección de setup (E3.5).
- **Trades** reales o simulados en CSV.
- Contexto H4/H1 en el cálculo de bias (inputs reservados; lógica reservada para evolución).

---

## Próximos pasos

| Fase | Entrega |
|------|---------|
| **E3.5** | Setup V1 IFVG en BacktestEA + uso de `ApplyDailyBiasGatePlaceholder` con dirección de setup. |
| **E3.6** | Esquema de evidencia versionado. |
| **E4** | Primer smoke en Strategy Tester. |

---

## Advertencias

- **No** usar en **cuenta real** ni para **trading live**.
- Los exportes documentan **bias y pipeline**; no sustituyen validación completa del setup hasta IFVG y evidencia E3.6.

---

## Referencias

- Contrato Setup V1: `APP/artifacts/mapazapp/docs/BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`
- Daily Bias V1 (E3.4): `APP/artifacts/mapazapp/docs/BACKTESTEA_DAILY_BIAS_V1_E3_4.md`
- Alineación tester: `APP/artifacts/mapazapp/docs/MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`
- Integración MT5: `APP/artifacts/mapazapp/docs/MT5_DATA_INTEGRATION.md`
