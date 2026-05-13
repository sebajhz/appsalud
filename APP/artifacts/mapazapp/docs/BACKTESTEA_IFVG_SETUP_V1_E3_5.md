# Mapazapp — IFVG Setup V1 (E3.5) en Mapazapp_TestEA

## 1. Alcance

- **E3.5** añade la **primera detección real** de candidatos de setup **IFVG_XAUUSD_V1** en **`Mapazapp_TestEA.mq5`** (solo **Strategy Tester**).
- Es **detección de FVG de tres velas cerradas** alineada con el núcleo TypeScript **`fvg-detector.ts`** (`detectFvgAtIndex`): mismas desigualdades y mismos extremos de zona; **no** se aplica aún conversión FVG→IFVG (`tryConvertFvgToIfvg`), ni filtros ATR del detector del core, ni entradas ni órdenes.

## 2. Regla FVG V1 (MQL5)

- Timeframe de ejecución: **`InpExecutionTimeframe`** (p. ej. M15).
- Velas **A = shift 3**, **B = shift 2**, **C = shift 1** (tres cerradas; no se usa la vela en formación, shift 0).
- **Bullish FVG (candidato long):** `C.low > A.high` → zona `[A.high, C.low]`.
- **Bearish FVG (candidato short):** `C.high < A.low` → zona `[C.high, A.low]`.
- Equivale a **A = i−1, B = i, C = i+1** en una serie temporal creciente como en el core.

## 3. Daily Bias gate (E3.4 + E3.5)

- Tras detectar un FVG válido (tamaño en puntos ≥ `InpMinFvgPoints` si el input &gt; 0), se evalúa **`ApplyDailyBiasGateToSetup`** frente a **`g_lastBiasEnum`** (Daily Bias V1).
- **Bullish bias + long** → permitido (`setup_candidate_allowed`); **bullish + short** → `rejected_by_daily_bias`.
- **Bearish bias + short** → permitido; **bearish + long** → `rejected_by_daily_bias`.
- **Neutral** → `skipped_neutral_bias` (evento `setup_skipped`).
- **Unknown** → `missing_bias_context` (evento `setup_skipped`).
- Si **`InpRequireDailyBiasAlignment = false`**, el gate devuelve siempre **`setup_candidate_allowed`** (solo diagnóstico; no implica trade).

## 4. Eventos (`backtest_events.csv`)

Tipos añadidos / usados en E3.5:

| `event_type` | Uso |
|--------------|-----|
| `setup_detected` | FVG válido detectado (`decision`: `detected`). |
| `setup_allowed` | Gate alineado con bias (`decision`: `setup_candidate_allowed`). |
| `setup_rejected` | Desalineado (`decision`: `rejected_by_daily_bias`). |
| `setup_skipped` | Neutral / unknown / gap demasiado pequeño (`decision` según caso). |

El campo **`details`** incluye `fvg_low`, `fvg_high`, `fvg_points`, `candle_time`, `daily_bias_reason`, `gate_result` en texto ASCII (sin rutas privadas).

## 5. Summary (`backtest_summary.json`)

- **`has_real_ifvg_logic`: `true`** (detección FVG/candidato); **`has_real_trading_orders`: `false`**.
- Contadores de setup: `total_setup_candidates`, `bullish_setup_candidates`, `bearish_setup_candidates`, `allowed_setups`, `ignored_small_fvg`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, más `last_setup_*` y `last_fvg_points`.
- **`trade_count`** sigue en **0**; no hay métricas de profit ni winrate.

## 6. Limitaciones

- No **`OrderSend`** / **`CTrade`**; no filas sintéticas en `backtest_trades.csv` (solo cabecera).
- No inversión IFVG ni pipeline completo del core (sweeps, displacement, etc.).
- **`InpMaxSetupAgeBars`:** si &gt; 0, la edad de la barra A (`iBarShift` respecto al presente) no debe superar el umbral; por defecto 20 con patrón fijo en shift 3 suele ser no restrictivo.

## 7. Próximo paso

- **E3.6** — cierre de esquema de export / evidencia hacia Mapazapp, o **E4** — primer smoke manual en Strategy Tester cuando el operador lo apruebe.
