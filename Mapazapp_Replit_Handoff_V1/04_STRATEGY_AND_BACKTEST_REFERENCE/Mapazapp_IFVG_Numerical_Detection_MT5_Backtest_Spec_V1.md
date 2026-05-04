# Mapazapp — IFVG Numerical Detection & MT5 Backtest Spec V1
Fecha: 2026-05-02

## Estado

Research/spec separado.
No integrar todavía al MD maestro.

Objetivo:
Bajar la estrategia IFVG/Zonas a reglas numéricas, parámetros optimizables y estructura de backtest en MT5.

---

# 1. Principio central

El bot no busca una entrada exacta.

Busca zonas y estados:

- Zona de posible compra.
- Zona de posible venta.
- Zona de observación.
- Zona inválida.
- Zona bloqueada por riesgo/noticia/spread.

La entrada solo se considera cuando:

1. Hay contexto.
2. Hay zona.
3. Hay retesteo.
4. Hay confirmación.
5. Hay invalidez clara.
6. Hay R:R suficiente.
7. Risk Guard permite operar.
8. La configuración fue aprobada por backtest.

---

# 2. Timeframes V1

## Timeframes para XAUUSD V1

```text
direction_tf      = H4
higher_context_tf = D1
zone_tf           = M15
confirmation_tf   = M15
execution_tf      = M15
```

## Por qué no 30 segundos en V1

No usar 30s en V1 porque:

- Aumenta ruido.
- Hace más pesado el backtest.
- Puede depender demasiado del broker/spread.
- Es más cercano a scalping.
- Complica fondeo por noticias y ejecución.

## Qué sí se puede hacer después

M5 puede testearse después como confirmación más fina.

```text
confirmation_tf_candidates = M15 / M5
```

---

# 3. Estructura de módulos

El EA de test debe tener estas capas:

```text
1. Data loader
2. Context detector
3. Swing detector
4. Liquidity sweep detector
5. FVG detector
6. IFVG converter
7. Zone state machine
8. Retest detector
9. Confirmation detector
10. SL/TP calculator
11. Score calculator
12. Risk/No-trade filter
13. Trade simulator/executor for Strategy Tester
14. Result exporter
```

---

# 4. Datos mínimos requeridos

Para cada símbolo/timeframe:

```text
time
open
high
low
close
tick_volume
spread
```

Para backtest realista:

- Usar datos del broker/prop donde se operará cuando sea posible.
- Guardar spread al momento de señal.
- Registrar sesión.
- Registrar fecha/hora exacta.
- Registrar todos los no-trade reasons.

---

# 5. Parámetros globales V1

Estos valores son iniciales y deben ser inputs optimizables en MT5.

```text
atr_period = 14 / 20
max_spread_points = profile_by_symbol
min_rr = 1.5 / 2.0
risk_per_trade = 0.25% / 0.50%
max_trades_per_day = 1 / 2 / 3
zone_expiry_bars = 8 / 16 / 32
min_score_alert = 55 / 65
min_score_trade = 65 / 75 / 85
```

---

# 6. Contexto: dirección del día

## 6.1 Salidas posibles

```text
BUY_ONLY
SELL_ONLY
BOTH_ALLOWED
NO_TRADE
```

V1 recomienda usar:
- BUY_ONLY.
- SELL_ONLY.
- NO_TRADE.

Evitar BOTH_ALLOWED al inicio para no sobreoperar.

---

## 6.2 Rango de contexto H4

Usar últimos N swings H4 para definir dirección.

Inputs:

```text
context_swing_lookback = 3 / 5 / 8
context_structure_bars = 50 / 100 / 150
```

---

## 6.3 Dirección alcista H4

Opción programable V1:

```text
last_confirmed_swing_high > previous_confirmed_swing_high
AND
last_confirmed_swing_low >= previous_confirmed_swing_low
```

Resultado:

```text
context_direction = BUY_ONLY
```

Filtro adicional:

```text
close_H4 > midpoint(last_H4_range)
```

---

## 6.4 Dirección bajista H4

```text
last_confirmed_swing_low < previous_confirmed_swing_low
AND
last_confirmed_swing_high <= previous_confirmed_swing_high
```

Resultado:

```text
context_direction = SELL_ONLY
```

Filtro adicional:

```text
close_H4 < midpoint(last_H4_range)
```

---

## 6.5 No operar por contexto

```text
if H4 swings are mixed:
    context_direction = NO_TRADE

if current_price is inside middle zone of recent H4 range:
    context_direction = NO_TRADE
```

Middle zone:

```text
range_low  = recent_H4_swing_low
range_high = recent_H4_swing_high
range_mid_low  = range_low + (range_high - range_low) * 0.40
range_mid_high = range_low + (range_high - range_low) * 0.60
```

Si precio está entre 40% y 60% del rango:

```text
NO_TRADE or score penalty
```

Input:

```text
middle_zone_low_pct = 0.40
middle_zone_high_pct = 0.60
```

---

# 7. Swing detector

## 7.1 Swing High

Una vela `i` es swing high si:

```text
high[i] > max(high[i-left_bars : i-1])
AND
high[i] > max(high[i+1 : i+right_bars])
```

Inputs:

```text
swing_left_bars = 2 / 3 / 5
swing_right_bars = 2 / 3 / 5
```

Nota:
En live, un swing con right_bars necesita esperar confirmación.
No usar información futura en live.

---

## 7.2 Swing Low

```text
low[i] < min(low[i-left_bars : i-1])
AND
low[i] < min(low[i+1 : i+right_bars])
```

---

## 7.3 Swings para backtest vs live

En backtest:
- Puede calcularse swing confirmado cuando ya pasaron `right_bars`.

En live:
- El swing solo se marca después de que pasaron esas velas.
- No se permite lookahead.

Regla:

```text
swing_confirmed_at = swing_time + right_bars * timeframe
```

---

# 8. Liquidity Sweep detector

## 8.1 Sweep inferior para buscar compra

Condición:

```text
low[current] < swing_low - sweep_tolerance
```

Y recuperación:

```text
close[bar_j] > swing_low
```

donde:

```text
bar_j <= current + reclaim_bars
```

Inputs:

```text
sweep_tf = M15
sweep_lookback_swings = 3 / 5 / 8
sweep_tolerance_atr = 0.03 / 0.05 / 0.10 / 0.15
reclaim_bars = 1 / 2 / 3 / 5
```

Cálculo:

```text
sweep_tolerance = ATR(M15, atr_period) * sweep_tolerance_atr
```

---

## 8.2 Sweep superior para buscar venta

```text
high[current] > swing_high + sweep_tolerance
```

Y recuperación:

```text
close[bar_j] < swing_high
```

donde:

```text
bar_j <= current + reclaim_bars
```

---

## 8.3 Sweep válido

Un sweep es válido si:

- Toma un swing confirmado.
- Recupera dentro de `reclaim_bars`.
- No ocurre dentro de spread anormal.
- No ocurre en noticia bloqueante.
- No es demasiado pequeño.

---

# 9. FVG detector

## 9.1 Bullish FVG

Con velas:

```text
A = i-1
B = i
C = i+1
```

Condición:

```text
low[C] > high[A]
```

Zona:

```text
fvg_low  = high[A]
fvg_high = low[C]
fvg_direction = bullish
```

---

## 9.2 Bearish FVG

```text
high[C] < low[A]
```

Zona:

```text
fvg_low  = high[C]
fvg_high = low[A]
fvg_direction = bearish
```

---

## 9.3 Tamaño mínimo de FVG

```text
fvg_size = abs(fvg_high - fvg_low)
min_fvg_size = ATR(fvg_tf, atr_period) * fvg_min_size_atr
```

Aceptar si:

```text
fvg_size >= min_fvg_size
```

Inputs:

```text
fvg_tf = M15
fvg_min_size_atr = 0.03 / 0.05 / 0.10 / 0.15 / 0.20
```

---

## 9.4 FVG demasiado grande

Evitar zonas enormes.

```text
max_fvg_size = ATR(fvg_tf, atr_period) * fvg_max_size_atr
```

Inputs:

```text
fvg_max_size_atr = 0.50 / 0.75 / 1.00
```

Aceptar si:

```text
fvg_size <= max_fvg_size
```

---

# 10. IFVG converter

## 10.1 Bullish FVG → Bearish IFVG

Un FVG alcista pasa a IFVG bajista si:

```text
close < fvg_low - ifvg_break_buffer
```

o en modo wick:

```text
low < fvg_low - ifvg_break_buffer
```

Inputs:

```text
ifvg_break_mode = close / wick
ifvg_break_buffer_atr = 0.00 / 0.03 / 0.05 / 0.10
```

```text
ifvg_break_buffer = ATR(M15, atr_period) * ifvg_break_buffer_atr
```

---

## 10.2 Bearish FVG → Bullish IFVG

```text
close > fvg_high + ifvg_break_buffer
```

o en modo wick:

```text
high > fvg_high + ifvg_break_buffer
```

---

## 10.3 IFVG válido

Un IFVG es válido si:

- El FVG original tenía tamaño válido.
- La invalidación fue clara.
- No pasó demasiado tiempo desde su creación.
- El contexto no contradice la dirección.
- Hay o hubo sweep relacionado.
- Está dentro de un rango operable, no en zona media.

Inputs:

```text
max_bars_from_fvg_to_ifvg = 5 / 10 / 20 / 40
```

---

# 11. Relación Sweep + IFVG

## 11.1 Modo estricto

Para compra:

```text
sweep_lower_detected before/near IFVG bullish
AND
IFVG bullish exists
```

Para venta:

```text
sweep_upper_detected before/near IFVG bearish
AND
IFVG bearish exists
```

Input:

```text
sweep_required = true
sweep_ifvg_max_distance_bars = 3 / 5 / 10
```

---

## 11.2 Modo flexible

Si no hay sweep, el IFVG puede existir pero pierde score.

```text
sweep_required = false
sweep_missing_penalty = -15
```

Recomendación V1:
- Backtestear ambos.
- Para fondeo, preferir modo estricto si genera suficientes trades.

---

# 12. Zone builder

Cuando se detecta IFVG válido, crear zona.

## 12.1 Zona compra

IFVG bullish:

```text
zone_direction = BUY
zone_low = ifvg_low
zone_high = ifvg_high
```

## 12.2 Zona venta

IFVG bearish:

```text
zone_direction = SELL
zone_low = ifvg_low
zone_high = ifvg_high
```

## 12.3 Ancho mínimo y máximo de zona

```text
zone_size = zone_high - zone_low
min_zone_size = ATR(M15) * zone_min_atr
max_zone_size = ATR(M15) * zone_max_atr
```

Inputs:

```text
zone_min_atr = 0.03 / 0.05 / 0.10
zone_max_atr = 0.50 / 0.75 / 1.00
```

---

# 13. Zone state machine

Estados:

```text
CREATED
WATCHING
RETESTING
CONFIRMED
TRADE_READY
INVALIDATED
EXPIRED
USED
```

## CREATED → WATCHING

Automático si:

- Zona válida.
- Contexto no bloquea.
- Spread normal.

## WATCHING → RETESTING

Si precio toca zona.

Compra:

```text
low <= zone_high AND high >= zone_low
```

Venta:

```text
high >= zone_low AND low <= zone_high
```

## RETESTING → CONFIRMED

Si aparece confirmación.

## CONFIRMED → TRADE_READY

Si score >= min_score_trade y Risk Guard permite.

## Cualquier estado → INVALIDATED

Si invalida.

## Cualquier estado → EXPIRED

Si supera `zone_expiry_bars`.

---

# 14. Retest detector

Inputs:

```text
retest_mode = full_zone / midpoint / edge
retest_max_bars_after_ifvg = 8 / 16 / 32 / 64
```

## full_zone

Cualquier toque de la zona.

## midpoint

Debe tocar 50% de la zona.

Compra:

```text
low <= zone_midpoint
```

Venta:

```text
high >= zone_midpoint
```

## edge

Debe tocar borde inicial.

Compra:

```text
low <= zone_high
```

Venta:

```text
high >= zone_low
```

Recomendación:
- V1 empieza con full_zone.
- Optimizar midpoint después.

---

# 15. Confirmation detector

## 15.1 Confirmación compra V1

Después del retesteo, dentro de N velas:

```text
close > open
AND
close > zone_midpoint
AND
close > previous_close
```

Inputs:

```text
confirmation_bars = 1 / 2 / 3
confirmation_min_body_atr = 0.03 / 0.05 / 0.10
```

Body:

```text
body_size = abs(close - open)
min_body = ATR(M15) * confirmation_min_body_atr
```

Aceptar si:

```text
body_size >= min_body
```

---

## 15.2 Confirmación venta V1

```text
close < open
AND
close < zone_midpoint
AND
close < previous_close
AND
body_size >= min_body
```

---

## 15.3 Confirmación con rechazo/wick

Opcional para test:

Compra:

```text
lower_wick >= body_size * wick_body_ratio
```

Venta:

```text
upper_wick >= body_size * wick_body_ratio
```

Inputs:

```text
wick_confirmation_enabled = true / false
wick_body_ratio = 1.0 / 1.5 / 2.0
```

---

# 16. SL calculator

## Compra

```text
raw_sl = min(zone_low, sweep_low)
sl_buffer = max(ATR(M15) * sl_atr_factor, avg_spread * sl_spread_factor)
sl = raw_sl - sl_buffer
```

## Venta

```text
raw_sl = max(zone_high, sweep_high)
sl_buffer = max(ATR(M15) * sl_atr_factor, avg_spread * sl_spread_factor)
sl = raw_sl + sl_buffer
```

Inputs:

```text
sl_atr_factor = 0.05 / 0.10 / 0.15 / 0.25
sl_spread_factor = 3 / 5 / 8
max_sl_atr = 0.75 / 1.00 / 1.50
```

No operar si:

```text
abs(entry - sl) > ATR(M15) * max_sl_atr
```

---

# 17. Entry model

No punto exacto, sino zona de entrada.

## Modelos a testear

```text
entry_model = confirmation_close / zone_midpoint_limit / zone_edge_limit
```

### confirmation_close

Entrada al cierre de la vela confirmadora.

Ventaja:
- Más realista/simple.

Riesgo:
- Puede entrar tarde.

### zone_midpoint_limit

Orden límite en 50% de zona luego de confirmación.

Ventaja:
- Mejor R:R.

Riesgo:
- Puede no llenar.

### zone_edge_limit

Orden límite en borde de zona.

Ventaja:
- Stop más ajustado.

Riesgo:
- Menos fills.

Recomendación V1:
- Empezar con confirmation_close.
- Luego testear midpoint_limit.

---

# 18. TP model

Inputs:

```text
tp_model = fixed_R / liquidity_target / hybrid
rr_target = 1.5 / 2.0 / 2.5
```

## fixed_R

Compra:

```text
tp = entry + (entry - sl) * rr_target
```

Venta:

```text
tp = entry - (sl - entry) * rr_target
```

## liquidity_target

Compra:
- TP en swing high relevante o PDH.

Venta:
- TP en swing low relevante o PDL.

## hybrid

- parcial 1R.
- final 2R o liquidez.

Recomendación V1:
- Backtest fixed_R primero.
- Luego comparar liquidity_target.

---

# 19. Score engine V1

```text
score = 0
```

## Componentes

```text
context_alignment = 20
sweep_quality = 15
ifvg_quality = 20
retest_quality = 15
confirmation_quality = 10
rr_quality = 10
risk_conditions = 10
```

## Score breakdown

### context_alignment

```text
20 = H4 alineado y no está en zona media
10 = H4 no contradice, pero no es fuerte
0  = contradictorio/no operar
```

### sweep_quality

```text
15 = sweep claro + reclaim rápido
8  = sweep débil
0  = sin sweep
```

### ifvg_quality

```text
20 = IFVG tamaño válido + break claro + reciente
10 = IFVG válido pero débil
0  = sin IFVG válido
```

### retest_quality

```text
15 = retest limpio y rápido
8  = retest tardío
0  = sin retest
```

### confirmation_quality

```text
10 = confirmación clara
5  = confirmación mínima
0  = sin confirmación
```

### rr_quality

```text
10 = R:R >= 2.0
6  = R:R >= 1.5
0  = R:R < mínimo
```

### risk_conditions

```text
10 = spread ok + sin noticia + risk ok
0  = alguna condición bloquea
```

---

# 20. No-trade rules obligatorias

No operar si:

```text
context_direction == NO_TRADE
zone_status in INVALIDATED/EXPIRED/USED
spread > max_spread_points
news_blackout == true
rr < min_rr
sl_distance > max_sl_atr
daily_drawdown_limit_near == true
max_trades_per_day_reached == true
score < min_score_trade
configuration_backtest_approved == false
```

---

# 21. Parámetros por símbolo

Ejemplo XAUUSD inicial.

```json
{
  "symbol": "XAUUSD",
  "digits_mode": "broker_specific",
  "direction_tf": "H4",
  "zone_tf": "M15",
  "confirmation_tf": "M15",
  "atr_period": 14,
  "max_spread_points": "to_measure_by_broker",
  "risk_per_trade": 0.005,
  "min_rr": 1.5,
  "max_trades_per_day": 2,
  "news_blackout_minutes_before": 2,
  "news_blackout_minutes_after": 2
}
```

Nota:
`max_spread_points` no se define a ciegas. Se mide por broker y luego se fija.

---

# 22. Inputs optimizables MT5

## Grupo A — Contexto

```text
context_swing_lookback = 3 / 5 / 8
context_structure_bars = 50 / 100 / 150
middle_zone_low_pct = 0.35 / 0.40 / 0.45
middle_zone_high_pct = 0.55 / 0.60 / 0.65
```

## Grupo B — Swing/Sweep

```text
swing_left_bars = 2 / 3 / 5
swing_right_bars = 2 / 3 / 5
sweep_tolerance_atr = 0.03 / 0.05 / 0.10 / 0.15
reclaim_bars = 1 / 2 / 3 / 5
sweep_required = true / false
```

## Grupo C — FVG/IFVG

```text
fvg_min_size_atr = 0.03 / 0.05 / 0.10 / 0.15
fvg_max_size_atr = 0.50 / 0.75 / 1.00
ifvg_break_mode = close / wick
ifvg_break_buffer_atr = 0.00 / 0.03 / 0.05 / 0.10
max_bars_from_fvg_to_ifvg = 5 / 10 / 20 / 40
```

## Grupo D — Retest/Confirmación

```text
retest_mode = full_zone / midpoint / edge
retest_max_bars_after_ifvg = 8 / 16 / 32 / 64
confirmation_bars = 1 / 2 / 3
confirmation_min_body_atr = 0.03 / 0.05 / 0.10
wick_confirmation_enabled = true / false
wick_body_ratio = 1.0 / 1.5 / 2.0
```

## Grupo E — Gestión

```text
entry_model = confirmation_close / zone_midpoint_limit
sl_atr_factor = 0.05 / 0.10 / 0.15 / 0.25
sl_spread_factor = 3 / 5 / 8
max_sl_atr = 0.75 / 1.00 / 1.50
tp_model = fixed_R / liquidity_target
rr_target = 1.5 / 2.0 / 2.5
min_score_trade = 65 / 75 / 85
```

---

# 23. Optimización por etapas

No optimizar todo junto.

## Etapa 1 — Sanity test

Fijar casi todo.
Probar que el EA detecte zonas correctamente.

## Etapa 2 — FVG/IFVG

Optimizar solo:

```text
fvg_min_size_atr
ifvg_break_mode
ifvg_break_buffer_atr
max_bars_from_fvg_to_ifvg
```

## Etapa 3 — Sweep

Optimizar:

```text
sweep_required
sweep_tolerance_atr
reclaim_bars
swing_left_bars
swing_right_bars
```

## Etapa 4 — Confirmación

Optimizar:

```text
retest_mode
confirmation_bars
confirmation_min_body_atr
wick_confirmation_enabled
```

## Etapa 5 — Gestión

Optimizar:

```text
entry_model
sl_atr_factor
tp_model
rr_target
min_score_trade
```

## Etapa 6 — Validación

Tomar mejores sets y probar fuera de muestra.

---

# 24. División de histórico

Para evitar sobreoptimización:

```text
Train:      2023-01-01 a 2024-12-31
Validation: 2025-01-01 a 2025-12-31
Forward:    2026-01-01 en adelante
```

Ajustar según datos reales disponibles.

---

# 25. Outputs mínimos del backtest

El EA debe exportar CSV:

```text
run_id
set_id
symbol
timeframe
date_from
date_to
input_parameters_hash
trade_id
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
no_trade_reason
spread_at_entry
session
context_direction
```

---

# 26. Métricas de aprobación

No se aprueba por una curva linda.

Revisar:

```text
net_profit
profit_factor
expectancy_R
max_drawdown
relative_drawdown
max_losing_streak
trades_total
trades_per_month
winrate
avg_win_R
avg_loss_R
monthly_profit_distribution
worst_month
best_day_dependency
prop_firm_rule_violations
```

---

# 27. Criterios mínimos sugeridos

Estos valores son iniciales, no definitivos.

```text
trades_total_train >= 80
trades_total_validation >= 30
profit_factor_train >= 1.20
profit_factor_validation >= 1.10
expectancy_R_validation > 0
max_losing_streak <= tolerancia psicológica definida
max_drawdown <= límite interno de fondeo
best_day_dependency <= regla de consistencia si aplica
```

Si el sistema da muy pocos trades:
- No se aprueba todavía.
- Se revisa si filtra demasiado.

Si da demasiados trades:
- Se sube score mínimo.
- Se limita sesión.
- Se exige sweep/confirmación más clara.

---

# 28. Cómo el bot vivo usa esto

El bot externo no inventa.

Carga configuración aprobada:

```text
strategy_id
symbol_profile
parameter_set_id
min_score_trade
risk_rules
news_rules
```

Luego:

1. Lee datos desde MT5 Bridge.
2. Detecta contexto.
3. Detecta zona.
4. Detecta estado.
5. Calcula score.
6. Muestra alerta simple.
7. Bloquea si riesgo/noticia.
8. Guarda todo en journal.

---

# 29. Cómo se adapta a futuro

Si en backtest se ve que:

- 5 velas funciona mal.
- 6 velas funciona mejor.
- reclaim_bars 2 es mejor que 5.
- M5 confirma mejor que M15.
- sweep_required reduce operaciones pero mejora drawdown.

Entonces se crea un nuevo `parameter_set`.

No se toca código.

Se cambia configuración aprobada.

---

# 30. Regla final

Todo número que afecte la estrategia debe ser:

- parámetro,
- versionado,
- testeable,
- exportado en resultados,
- asociado al símbolo,
- aprobado antes de live.

Nada importante debe quedar hardcodeado.
