# Mapazapp — MT5 EA Optimization Input Map V1
Fecha: 2026-05-02

## Estado

Spec separado.
No integrar todavía al MD maestro.

Objetivo:
Mapear cada parámetro estratégico a un input real del EA de MT5 para que la estrategia IFVG/Zonas pueda probarse, optimizarse y exportar resultados correctamente.

Este documento será usado después por Cursor/MQL5 para crear el EA testeable:

`MZP_IFVG_ZoneReaction_TestEA_v1`

---

# 1. Principio

Todo número que afecte la estrategia debe ser:

- Input del EA.
- Versionado.
- Exportado en resultados.
- Asociado a un símbolo.
- Asociado a un run/set de backtest.
- Nunca hardcodeado sin motivo.

Cursor/MQL5 no deben inventar parámetros.

---

# 2. EA objetivo

Nombre tentativo:

```text
MZP_IFVG_ZoneReaction_TestEA_v1.mq5
```

Uso:

- Strategy Tester.
- Optimización por símbolo.
- Exportación de resultados.
- Validación de estrategia.
- No es el EA final de ejecución live.

---

# 3. Modo de operación del EA

Inputs generales:

| Input | Tipo | Valores | Optimizable | Descripción |
|---|---|---:|---|---|
| strategy_id | string | MZP_IFVG_ZONE_REACTION_V1 | No | Identificador de estrategia |
| symbol_profile | string | XAUUSD / EURUSD / GBPUSD | No | Perfil del símbolo |
| run_label | string | libre | No | Nombre de corrida |
| export_results | bool | true/false | No | Exporta CSV de trades/resultados |
| debug_mode | bool | true/false | No | Activa logs extendidos |
| visual_markers | bool | true/false | No | Dibuja zonas en visual tester |

---

# 4. Timeframes

| Input | Tipo | Valores | Optimizable | Descripción |
|---|---|---|---|---|
| higher_context_tf | enum | D1 | No V1 | Marco alto mayor |
| direction_tf | enum | H4 / H1 | Sí futuro | Timeframe para dirección |
| zone_tf | enum | M15 / M5 | Sí futuro | Timeframe donde se detecta FVG/IFVG |
| confirmation_tf | enum | M15 / M5 | Sí futuro | Timeframe de confirmación |
| execution_tf | enum | M15 / M5 | Sí futuro | Timeframe de ejecución simulada |

Recomendación V1:

```text
higher_context_tf = D1
direction_tf      = H4
zone_tf           = M15
confirmation_tf   = M15
execution_tf      = M15
```

No usar 30 segundos en V1.

---

# 5. ATR y datos base

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| atr_period_profile | int enum | 0/1 | 0 | 1 | 1 | Sí | Perfil de ATR |

Mapeo:

```text
0 => 14
1 => 20
```

Exportar como:

```text
atr_period_actual
```

---

# 6. Contexto / dirección

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| context_swing_lookback_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Cantidad de swings H4 a revisar |
| context_structure_bars_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Barras H4 para estructura |
| middle_zone_low_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Límite inferior zona media |
| middle_zone_high_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Límite superior zona media |
| allow_both_direction | bool | false/true | 0 | 1 | 1 | No V1 | Permite compras y ventas el mismo día |

## Mapeos

```text
context_swing_lookback_profile:
0 => 3
1 => 5
2 => 8
```

```text
context_structure_bars_profile:
0 => 50
1 => 100
2 => 150
```

```text
middle_zone_low_profile:
0 => 0.35
1 => 0.40
2 => 0.45
```

```text
middle_zone_high_profile:
0 => 0.55
1 => 0.60
2 => 0.65
```

## Output esperado

```text
context_direction = BUY_ONLY / SELL_ONLY / NO_TRADE
context_reason
```

---

# 7. Swing detector

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| swing_left_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Velas a izquierda |
| swing_right_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Velas a derecha |

## Mapeos

```text
swing_left_profile:
0 => 2
1 => 3
2 => 5
```

```text
swing_right_profile:
0 => 2
1 => 3
2 => 5
```

## Regla

Swing high:

```text
high[i] > max(high[i-left_bars : i-1])
AND
high[i] > max(high[i+1 : i+right_bars])
```

Swing low:

```text
low[i] < min(low[i-left_bars : i-1])
AND
low[i] < min(low[i+1 : i+right_bars])
```

## Cuidado

No usar lookahead en live.

En backtest, un swing queda confirmado recién cuando pasaron `right_bars`.

Exportar:

```text
swing_id
swing_type
swing_price
swing_confirmed_at
```

---

# 8. Liquidity Sweep

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| sweep_required | bool | false/true | 0 | 1 | 1 | Sí | Exige sweep o solo suma score |
| sweep_lookback_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Swings recientes a considerar |
| sweep_tolerance_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Tolerancia ATR |
| reclaim_bars_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Velas máximas para recuperar |
| sweep_ifvg_distance_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Distancia máxima sweep ↔ IFVG |

## Mapeos

```text
sweep_lookback_profile:
0 => 3
1 => 5
2 => 8
```

```text
sweep_tolerance_profile:
0 => 0.03
1 => 0.05
2 => 0.10
3 => 0.15
```

```text
reclaim_bars_profile:
0 => 1
1 => 2
2 => 3
3 => 5
```

```text
sweep_ifvg_distance_profile:
0 => 3
1 => 5
2 => 10
```

## Fórmula

```text
sweep_tolerance = ATR(M15, atr_period) * sweep_tolerance_atr
```

## Output esperado

```text
sweep_id
sweep_type = LOWER_SWEEP / UPPER_SWEEP
sweep_price
sweep_time
sweep_reclaimed = true/false
reclaim_bars_used
```

---

# 9. FVG detector

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| fvg_min_size_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Tamaño mínimo ATR |
| fvg_max_size_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Tamaño máximo ATR |

## Mapeos

```text
fvg_min_size_profile:
0 => 0.03
1 => 0.05
2 => 0.10
3 => 0.15
```

```text
fvg_max_size_profile:
0 => 0.50
1 => 0.75
2 => 1.00
```

## Bullish FVG

```text
low[i+1] > high[i-1]
```

Zona:

```text
fvg_low  = high[i-1]
fvg_high = low[i+1]
```

## Bearish FVG

```text
high[i+1] < low[i-1]
```

Zona:

```text
fvg_low  = high[i+1]
fvg_high = low[i-1]
```

## Filtro tamaño

```text
fvg_size >= ATR(zone_tf, atr_period) * fvg_min_size_atr
fvg_size <= ATR(zone_tf, atr_period) * fvg_max_size_atr
```

## Output esperado

```text
fvg_id
fvg_direction
fvg_low
fvg_high
fvg_size
fvg_created_at
```

---

# 10. IFVG converter

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| ifvg_break_mode_profile | int enum | 0/1 | 0 | 1 | 1 | Sí | Cierre o wick |
| ifvg_break_buffer_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Buffer ATR |
| max_bars_fvg_to_ifvg_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Máx barras desde FVG a IFVG |

## Mapeos

```text
ifvg_break_mode_profile:
0 => close
1 => wick
```

```text
ifvg_break_buffer_profile:
0 => 0.00
1 => 0.03
2 => 0.05
3 => 0.10
```

```text
max_bars_fvg_to_ifvg_profile:
0 => 5
1 => 10
2 => 20
3 => 40
```

## Regla bullish FVG → bearish IFVG

```text
close < fvg_low - ifvg_break_buffer
```

O si modo wick:

```text
low < fvg_low - ifvg_break_buffer
```

## Regla bearish FVG → bullish IFVG

```text
close > fvg_high + ifvg_break_buffer
```

O si modo wick:

```text
high > fvg_high + ifvg_break_buffer
```

## Output esperado

```text
ifvg_id
source_fvg_id
ifvg_direction
ifvg_low
ifvg_high
ifvg_created_at
ifvg_break_mode
```

---

# 11. Zone builder

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| zone_min_atr_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Tamaño mínimo zona |
| zone_max_atr_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Tamaño máximo zona |
| zone_expiry_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Vida máxima de zona |

## Mapeos

```text
zone_min_atr_profile:
0 => 0.03
1 => 0.05
2 => 0.10
```

```text
zone_max_atr_profile:
0 => 0.50
1 => 0.75
2 => 1.00
```

```text
zone_expiry_profile:
0 => 8
1 => 16
2 => 32
```

## Output esperado

```text
zone_id
zone_direction
zone_low
zone_high
zone_midpoint
zone_status
zone_created_at
zone_expires_at
zone_invalidation_price
```

---

# 12. Retest detector

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| retest_mode_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Cómo debe tocar la zona |
| retest_max_bars_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Máx barras desde IFVG |

## Mapeos

```text
retest_mode_profile:
0 => full_zone
1 => midpoint
2 => edge
```

```text
retest_max_bars_profile:
0 => 8
1 => 16
2 => 32
3 => 64
```

## Output esperado

```text
zone_retested = true/false
retest_time
retest_price
retest_mode_actual
```

---

# 13. Confirmation detector

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| confirmation_bars_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Máx velas para confirmar |
| confirmation_body_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Tamaño mínimo cuerpo ATR |
| wick_confirmation_enabled | bool | false/true | 0 | 1 | 1 | Sí | Exige wick/rechazo |
| wick_body_ratio_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Relación wick/cuerpo |

## Mapeos

```text
confirmation_bars_profile:
0 => 1
1 => 2
2 => 3
```

```text
confirmation_body_profile:
0 => 0.03
1 => 0.05
2 => 0.10
```

```text
wick_body_ratio_profile:
0 => 1.0
1 => 1.5
2 => 2.0
```

## Confirmación compra

```text
close > open
AND close > zone_midpoint
AND close > previous_close
AND body_size >= ATR(M15) * confirmation_min_body_atr
```

## Confirmación venta

```text
close < open
AND close < zone_midpoint
AND close < previous_close
AND body_size >= ATR(M15) * confirmation_min_body_atr
```

## Output esperado

```text
confirmation_detected = true/false
confirmation_time
confirmation_type
confirmation_body_size
confirmation_wick_ratio
```

---

# 14. Entry model

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| entry_model_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Modelo de entrada |

## Mapeo

```text
entry_model_profile:
0 => confirmation_close
1 => zone_midpoint_limit
2 => zone_edge_limit
```

Recomendación V1:
Empezar con `confirmation_close`.

---

# 15. SL / TP / gestión

## Inputs SL

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| sl_atr_factor_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Buffer ATR del SL |
| sl_spread_factor_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Buffer por spread |
| max_sl_atr_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | SL máximo permitido |

## Mapeos

```text
sl_atr_factor_profile:
0 => 0.05
1 => 0.10
2 => 0.15
3 => 0.25
```

```text
sl_spread_factor_profile:
0 => 3
1 => 5
2 => 8
```

```text
max_sl_atr_profile:
0 => 0.75
1 => 1.00
2 => 1.50
```

## Inputs TP

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| tp_model_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Modelo de TP |
| rr_target_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | R objetivo |

## Mapeos

```text
tp_model_profile:
0 => fixed_R
1 => liquidity_target
2 => hybrid
```

```text
rr_target_profile:
0 => 1.5
1 => 2.0
2 => 2.5
```

---

# 16. Score / filtros

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| min_score_alert_profile | int enum | 0/1 | 0 | 1 | 1 | Sí futuro | Score para alertar |
| min_score_trade_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Score para operar/testear |
| max_trades_day_profile | int enum | 0/1/2 | 0 | 1 | 2 | Sí | Máximo trades por día |
| max_spread_points | int | por broker | manual | manual | manual | Sí/manual | Spread máximo |

## Mapeos

```text
min_score_alert_profile:
0 => 55
1 => 65
```

```text
min_score_trade_profile:
0 => 65
1 => 75
2 => 85
```

```text
max_trades_day_profile:
0 => 1
1 => 2
2 => 3
```

---

# 17. Sesión / noticias

## Inputs

| Input | Tipo | Valores | Start | Step | Stop | Optimizable | Descripción |
|---|---|---:|---:|---:|---:|---|---|
| session_filter_profile | int enum | 0/1/2/3 | 0 | 1 | 3 | Sí | Filtro horario |
| news_filter_mode | int enum | 0/1 | 0 | 1 | 1 | No V1 | Noticias off/manual |

## Mapeos

```text
session_filter_profile:
0 => all_day
1 => london
2 => new_york
3 => london_new_york
```

```text
news_filter_mode:
0 => off
1 => manual_blackout
```

Nota:
V1 puede iniciar sin calendario automático, pero debe permitir blackout manual.

---

# 18. Outputs obligatorios del EA

Cada operación debe exportar:

```text
run_id
set_id
strategy_id
symbol
entry_time
exit_time
direction
entry_price
sl
tp
result_money
result_R
score_total
score_context
score_sweep
score_ifvg
score_retest
score_confirmation
score_rr
score_risk
zone_id
fvg_id
ifvg_id
sweep_id
entry_model
tp_model
exit_reason
spread_at_entry
session
context_direction
```

Cada no-trade relevante debe exportar opcionalmente:

```text
timestamp
symbol
strategy_id
zone_id
no_trade_reason
context_direction
score_total
spread
session
```

---

# 19. Parameter set ID

Cada corrida debe generar:

```text
parameter_set_id
```

Formato recomendado:

```text
MZP_IFVG_{SYMBOL}_V1_SET_{NUMBER}
```

Ejemplo:

```text
MZP_IFVG_XAUUSD_V1_SET_003
```

El hash de parámetros también debe guardarse:

```text
input_parameters_hash
```

---

# 20. Bloques de optimización

## Block A — Contexto

Inputs:

```text
context_swing_lookback_profile
context_structure_bars_profile
middle_zone_low_profile
middle_zone_high_profile
```

## Block B — Swing/Sweep

```text
swing_left_profile
swing_right_profile
sweep_required
sweep_lookback_profile
sweep_tolerance_profile
reclaim_bars_profile
sweep_ifvg_distance_profile
```

## Block C — FVG/IFVG

```text
fvg_min_size_profile
fvg_max_size_profile
ifvg_break_mode_profile
ifvg_break_buffer_profile
max_bars_fvg_to_ifvg_profile
```

## Block D — Retest/Confirmación

```text
retest_mode_profile
retest_max_bars_profile
confirmation_bars_profile
confirmation_body_profile
wick_confirmation_enabled
wick_body_ratio_profile
```

## Block E — Gestión

```text
entry_model_profile
sl_atr_factor_profile
sl_spread_factor_profile
max_sl_atr_profile
tp_model_profile
rr_target_profile
min_score_trade_profile
max_trades_day_profile
```

## Block F — Sesión/Noticias

```text
session_filter_profile
news_filter_mode
```

---

# 21. Reglas para Cursor/MQL5

Cursor debe implementar:

- Inputs con nombres exactos.
- Mapeos enum exactos.
- Exportación de valores reales y perfiles.
- Logs de zona, FVG, IFVG, sweep y trade.
- Sin lookahead.
- Sin modificar reglas sin instrucción.

Cursor no debe:

- Inventar parámetros.
- Cambiar rangos.
- Cambiar score.
- Cambiar fórmulas.
- Optimizar por balance solamente.
- Ejecutar live.

---

# 22. Próximo documento

Después de este archivo, crear:

`Mapazapp_MT5_TestEA_Build_Spec_V1.md`

Ese documento debe decir:

- Estructura del EA.
- Funciones MQL5.
- Archivos exportados.
- Cómo correr sanity test.
- Cómo correr optimización.
- Cómo validar visualmente.
- Cómo importar resultados a la app.
