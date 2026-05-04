# Mapazapp — MT5 TestEA Build Spec V1
Fecha: 2026-05-02

## Estado

Spec separado.
No integrar todavía al MD maestro.

Objetivo:
Definir cómo construir el Expert Advisor testeable en MT5 para validar la estrategia IFVG/Zonas en Strategy Tester.

EA objetivo:

`MZP_IFVG_ZoneReaction_TestEA_v1.mq5`

Este EA NO es el EA final de ejecución real.
Este EA sirve para:

- Detectar contexto.
- Detectar swing/sweep.
- Detectar FVG.
- Convertir FVG a IFVG.
- Crear zonas.
- Simular entradas.
- Exportar operaciones.
- Exportar no-trade reasons.
- Permitir optimización por parámetros.
- Probar por símbolo en MT5 Strategy Tester.

---

# 1. Principios de construcción

## 1.1 El EA no inventa estrategia

El EA implementa lo documentado.

No debe agregar lógica no definida.

## 1.2 El EA no debe usar lookahead

En Strategy Tester no puede usar velas futuras para tomar decisiones.

Ejemplo:
Un swing con `right_bars = 3` solo queda confirmado después de 3 velas cerradas.

## 1.3 Todo parámetro importante es input

Nada estratégico debe quedar hardcodeado.

## 1.4 Todo resultado debe poder auditarse

Cada trade debe poder responder:

- Por qué entró.
- En qué zona entró.
- Qué IFVG usó.
- Qué sweep usó.
- Qué score tenía.
- Qué regla bloqueó o permitió.
- Qué parámetro estaba activo.

---

# 2. Archivos esperados

## 2.1 EA principal

```text
MZP_IFVG_ZoneReaction_TestEA_v1.mq5
```

## 2.2 Includes sugeridos

```text
/Include/MZP/Core/Inputs.mqh
/Include/MZP/Core/Enums.mqh
/Include/MZP/Core/Logger.mqh
/Include/MZP/Core/Exporter.mqh
/Include/MZP/Indicators/ATR.mqh
/Include/MZP/Market/SwingDetector.mqh
/Include/MZP/Market/SweepDetector.mqh
/Include/MZP/Market/FVGDetector.mqh
/Include/MZP/Market/IFVGConverter.mqh
/Include/MZP/Market/ZoneEngine.mqh
/Include/MZP/Strategy/IFVGZoneReaction.mqh
/Include/MZP/Risk/TestRiskGuard.mqh
```

V1 puede empezar en un solo archivo si es necesario, pero la versión mantenible debe ir modular.

---

# 3. Estructura lógica del EA

```text
OnInit()
  ├── LoadInputs()
  ├── MapProfilesToActualValues()
  ├── ValidateInputs()
  ├── InitExportFiles()
  ├── InitState()
  └── LogRunHeader()

OnTick()
  ├── DetectNewBar()
  ├── OnNewBar()
  └── ManageOpenTestPositions()

OnNewBar()
  ├── UpdateRates()
  ├── UpdateATR()
  ├── DetectContext()
  ├── DetectSwings()
  ├── DetectSweeps()
  ├── DetectFVGs()
  ├── ConvertIFVGs()
  ├── BuildOrUpdateZones()
  ├── DetectRetests()
  ├── DetectConfirmations()
  ├── CalculateScores()
  ├── ApplyNoTradeRules()
  ├── SimulateOrOpenTestTrade()
  └── ExportEvents()

OnDeinit()
  ├── ExportSummary()
  └── CloseFiles()
```

---

# 4. Inputs

Los inputs deben respetar el archivo:

`Mapazapp_MT5_EA_Optimization_Input_Map_V1.md`

Ejemplo:

```mql5
input int swing_left_profile = 1;
input int swing_right_profile = 1;
input int sweep_tolerance_profile = 1;
input int reclaim_bars_profile = 1;
input int fvg_min_size_profile = 1;
input int ifvg_break_mode_profile = 0;
input int min_score_trade_profile = 1;
```

---

# 5. Mapeo de profiles

Crear funciones de mapeo.

Ejemplo conceptual:

```text
MapSwingLeft(profile):
  0 -> 2
  1 -> 3
  2 -> 5
```

```text
MapSweepTolerance(profile):
  0 -> 0.03
  1 -> 0.05
  2 -> 0.10
  3 -> 0.15
```

Todos los profiles deben exportarse como:

- valor profile.
- valor real.

Ejemplo:

```text
swing_left_profile = 1
swing_left_bars_actual = 3
```

---

# 6. Estructuras de datos sugeridas

## 6.1 Swing

```text
Swing {
  string id
  datetime time
  int bar_index
  string type // HIGH / LOW
  double price
  bool confirmed
  datetime confirmed_at
}
```

## 6.2 Sweep

```text
Sweep {
  string id
  datetime time
  string type // LOWER_SWEEP / UPPER_SWEEP
  double swept_level
  double extreme_price
  bool reclaimed
  int reclaim_bars_used
}
```

## 6.3 FVG

```text
FVG {
  string id
  datetime time
  string direction // BULLISH / BEARISH
  double low
  double high
  double size
  bool valid
  bool converted_to_ifvg
}
```

## 6.4 IFVG

```text
IFVG {
  string id
  string source_fvg_id
  datetime time
  string direction // BULLISH / BEARISH
  double low
  double high
  double midpoint
  string break_mode
  bool valid
}
```

## 6.5 Zone

```text
Zone {
  string id
  string source_ifvg_id
  datetime created_at
  datetime expires_at
  string direction // BUY / SELL
  double low
  double high
  double midpoint
  double invalidation_price
  string status
  int score
  string reason_simple
  string reason_technical
}
```

## 6.6 TradeCandidate

```text
TradeCandidate {
  string id
  string zone_id
  string direction
  datetime signal_time
  double entry
  double sl
  double tp
  double rr
  int score
  string entry_model
  string tp_model
  string status
}
```

---

# 7. New bar detection

El EA debe procesar lógica principal solo en nueva vela del `execution_tf`.

No recalcular estrategia completa en cada tick salvo para gestión de posición.

Pseudo:

```text
if current_bar_time != last_bar_time:
    last_bar_time = current_bar_time
    OnNewBar()
```

Esto reduce ruido y hace el backtest más consistente.

---

# 8. Context detector

Salida:

```text
BUY_ONLY
SELL_ONLY
NO_TRADE
```

Reglas V1:

## BUY_ONLY

```text
last_confirmed_swing_high > previous_confirmed_swing_high
AND
last_confirmed_swing_low >= previous_confirmed_swing_low
AND
close_H4 > midpoint(recent_H4_range)
AND
price not inside middle 40%-60% zone
```

## SELL_ONLY

```text
last_confirmed_swing_low < previous_confirmed_swing_low
AND
last_confirmed_swing_high <= previous_confirmed_swing_high
AND
close_H4 < midpoint(recent_H4_range)
AND
price not inside middle 40%-60% zone
```

## NO_TRADE

```text
mixed structure
OR price inside middle zone
OR insufficient data
```

Exportar:

```text
context_direction
context_reason
```

---

# 9. Swing detector

Debe correr sobre `zone_tf` o `sweep_tf`.

Regla:

Swing high:

```text
high[i] > max(left highs)
AND
high[i] > max(right highs)
```

Swing low:

```text
low[i] < min(left lows)
AND
low[i] < min(right lows)
```

Cuidado:

- El swing se confirma cuando pasaron `right_bars`.
- No usar el swing antes de confirmación.

---

# 10. Sweep detector

## Compra

Detectar sweep inferior:

```text
low[current] < swing_low - sweep_tolerance
```

Luego reclaim:

```text
close[j] > swing_low
```

donde:

```text
j <= current + reclaim_bars
```

## Venta

Detectar sweep superior:

```text
high[current] > swing_high + sweep_tolerance
```

Luego reclaim:

```text
close[j] < swing_high
```

Exportar:

```text
sweep_id
sweep_type
sweep_reclaimed
reclaim_bars_used
```

---

# 11. FVG detector

Usar tres velas cerradas.

## Bullish FVG

```text
low[i+1] > high[i-1]
```

Zona:

```text
fvg_low = high[i-1]
fvg_high = low[i+1]
```

## Bearish FVG

```text
high[i+1] < low[i-1]
```

Zona:

```text
fvg_low = high[i+1]
fvg_high = low[i-1]
```

Filtrar por tamaño:

```text
min_size <= fvg_size <= max_size
```

---

# 12. IFVG converter

## Bullish FVG -> Bearish IFVG

```text
close < fvg_low - break_buffer
```

o si modo wick:

```text
low < fvg_low - break_buffer
```

## Bearish FVG -> Bullish IFVG

```text
close > fvg_high + break_buffer
```

o si modo wick:

```text
high > fvg_high + break_buffer
```

No convertir si:

- FVG es demasiado viejo.
- Contexto contradice.
- Zona resultante es inválida.
- Spread/noticia bloquea si ese filtro está activo.

---

# 13. Zone Engine

Crear zona desde IFVG.

## Compra

```text
zone_direction = BUY
zone_low = ifvg_low
zone_high = ifvg_high
zone_midpoint = (zone_low + zone_high) / 2
```

## Venta

```text
zone_direction = SELL
zone_low = ifvg_low
zone_high = ifvg_high
zone_midpoint = (zone_low + zone_high) / 2
```

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

---

# 14. Retest detector

## full_zone

Compra/venta:

```text
bar_low <= zone_high
AND
bar_high >= zone_low
```

## midpoint

Compra:

```text
bar_low <= zone_midpoint
```

Venta:

```text
bar_high >= zone_midpoint
```

## edge

Compra:

```text
bar_low <= zone_high
```

Venta:

```text
bar_high >= zone_low
```

---

# 15. Confirmation detector

## Compra

Después del retesteo, dentro de `confirmation_bars`:

```text
close > open
AND close > zone_midpoint
AND close > previous_close
AND body_size >= ATR * confirmation_min_body_atr
```

## Venta

```text
close < open
AND close < zone_midpoint
AND close < previous_close
AND body_size >= ATR * confirmation_min_body_atr
```

Wick/rejection opcional según input.

---

# 16. Score calculator

Score total máximo: 100.

```text
context_alignment = 20
sweep_quality = 15
ifvg_quality = 20
retest_quality = 15
confirmation_quality = 10
rr_quality = 10
risk_conditions = 10
```

Exportar score completo y breakdown.

---

# 17. No-trade rules

Bloquear trade si:

```text
context_direction == NO_TRADE
zone invalidated
zone expired
spread > max_spread_points
news_blackout == true
rr < min_rr
sl_distance > max_sl_atr
max_trades_day reached
score < min_score_trade
```

Exportar:

```text
no_trade_reason
```

---

# 18. Entry simulation

V1 debe usar entrada simulada compatible con Strategy Tester.

Modelos:

```text
confirmation_close
zone_midpoint_limit
zone_edge_limit
```

Recomendación primera:

```text
confirmation_close
```

Motivo:
Más simple y auditable.

---

# 19. SL calculator

## Compra

```text
raw_sl = min(zone_low, sweep_low)
sl_buffer = max(ATR * sl_atr_factor, avg_spread * sl_spread_factor)
sl = raw_sl - sl_buffer
```

## Venta

```text
raw_sl = max(zone_high, sweep_high)
sl_buffer = max(ATR * sl_atr_factor, avg_spread * sl_spread_factor)
sl = raw_sl + sl_buffer
```

---

# 20. TP calculator

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
- Swing high relevante.
- High del día anterior.
- Zona de liquidez superior.

Venta:
- Swing low relevante.
- Low del día anterior.
- Zona de liquidez inferior.

V1 puede iniciar con `fixed_R`.

---

# 21. Gestión de posición en test

El EA debe abrir operaciones de prueba en Strategy Tester o simularlas internamente.

Recomendación:
Usar operaciones reales del tester con lotaje fijo o riesgo calculado, para que MT5 genere reportes.

Inputs:

```text
risk_model = fixed_lot / percent_risk
fixed_lot = 0.10
risk_percent = 0.25 / 0.50
```

Si la gestión por riesgo complica V1, usar fixed lot para test inicial y exportar resultado en R.

---

# 22. Exports CSV

## 22.1 Trades CSV

Nombre:

```text
MZP_IFVG_trades_{symbol}_{run_id}.csv
```

Columnas:

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
input_parameters_hash
```

## 22.2 Events CSV

Nombre:

```text
MZP_IFVG_events_{symbol}_{run_id}.csv
```

Columnas:

```text
timestamp
event_type
symbol
zone_id
fvg_id
ifvg_id
sweep_id
status
reason
score
price
context_direction
```

## 22.3 No-trade CSV

Nombre:

```text
MZP_IFVG_no_trade_{symbol}_{run_id}.csv
```

Columnas:

```text
timestamp
symbol
zone_id
reason
score
context_direction
spread
session
```

## 22.4 Summary CSV

Nombre:

```text
MZP_IFVG_summary_{symbol}_{run_id}.csv
```

Columnas:

```text
run_id
set_id
strategy_id
symbol
date_from
date_to
trades_total
winrate
profit_factor
expectancy_R
max_drawdown
max_losing_streak
best_day_dependency
input_parameters_hash
```

---

# 23. Sanity tests antes de optimizar

Antes de correr optimización:

## Test 1 — Compila

El EA compila sin errores.

## Test 2 — Datos suficientes

El EA detecta si falta histórico.

## Test 3 — No lookahead

Verificar que swings se confirman después de `right_bars`.

## Test 4 — FVG visual

En visual mode, FVG aparece donde corresponde.

## Test 5 — IFVG visual

IFVG aparece solo cuando el FVG se invalida.

## Test 6 — Zona visual

Zona se crea, retestea, confirma o invalida.

## Test 7 — No trade reasons

El EA exporta por qué no opera.

## Test 8 — Trade reason

Cada trade tiene zona, score y motivo.

---

# 24. Visual mode

El EA debe dibujar opcionalmente:

- FVG.
- IFVG.
- Zona activa.
- Swing high/low.
- Sweep.
- Entrada.
- SL.
- TP.
- Estado de zona.

Input:

```text
visual_markers = true/false
```

Colores no son prioridad, pero deben ser distinguibles.

---

# 25. Optimization workflow

## Paso 1

Correr sanity test con set fijo.

## Paso 2

Optimizar Block B — Swing/Sweep.

## Paso 3

Optimizar Block C — FVG/IFVG.

## Paso 4

Optimizar Block D — Retest/Confirmation.

## Paso 5

Optimizar Block E — Gestión.

## Paso 6

Exportar top sets.

## Paso 7

Validar fuera de muestra.

---

# 26. Criterios de fallo del EA

Detener o marcar error si:

- No hay suficientes barras.
- ATR no se calcula.
- Spread es inválido.
- No puede exportar CSV.
- Parámetro profile no tiene mapeo.
- Se intenta usar dirección desconocida.
- Se intenta operar sin zona.
- Se intenta operar sin SL/TP.
- Se detecta lookahead.

---

# 27. Lo que Cursor debe implementar

Cursor debe implementar:

- Inputs exactos.
- Mapeos exactos.
- Estructuras de datos.
- State machine de zona.
- Detectores.
- Score.
- No-trade rules.
- Export CSV.
- Visual markers.
- Sanity test mode.

Cursor no debe implementar:

- Estrategias extra.
- Cambios de fórmula.
- Ejecución live.
- Gestión avanzada no definida.
- Martingala/grid.
- Optimización por balance solamente.

---

# 28. Resultado esperado

Al terminar esta fase, debemos poder:

1. Abrir MT5.
2. Cargar `MZP_IFVG_ZoneReaction_TestEA_v1`.
3. Elegir XAUUSD.
4. Elegir período.
5. Correr visual test.
6. Ver zonas IFVG dibujadas.
7. Ver operaciones o no-trade reasons.
8. Optimizar parámetros.
9. Exportar resultados.
10. Importar resultados en la app externa.

---

# 29. Próximo documento

Crear:

`Mapazapp_Replit_Dashboard_Mock_Spec_V1.md`

Ese documento debe decirle a Replit cómo armar el prototipo visual usando datos mock:

- Estado del día.
- Zonas.
- Score.
- Risk Guard.
- Backtests.
- Journal.
- Configuración.
- Sin lógica real.
