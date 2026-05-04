# Mapazapp — IFVG Strategy Blueprint Research V1
Fecha: 2026-05-02

## Estado

Research separado.
No integrar todavía al MD maestro.

Este archivo transforma ideas públicas de Fede Esses / IFVG / ICT-SMC en una propuesta propia, programable y testeable.

No se copia una estrategia.
Se extraen componentes útiles para mejorar el bot.

---

# 1. Principio central

El bot no debe buscar una entrada exacta.

Debe detectar:

- Zona de posible compra.
- Zona de posible venta.
- Zona de observación.
- Zona inválida.
- Zona donde no conviene operar.

La entrada es una consecuencia de que la zona siga válida, confirme y tenga riesgo aceptable.

---

# 2. Estrategia candidata

Nombre interno:

`MZP IFVG Zone Reaction V1`

Inspiración:

- IFVG.
- Daily Bias.
- Liquidity Sweep.
- Fair Value Gap.
- Confirmación por retesteo.
- Gestión de riesgo.
- No operar en zonas ambiguas.

Mercado inicial de prueba:

- XAUUSD.

Mercados fuente de la inspiración:

- NQ / ES en el material público de Fede Esses.
- Adaptación propia a XAUUSD.

---

# 3. Qué queremos rescatar

De Fede/ICT/SMC rescatamos:

1. No operar sin dirección.
2. Buscar liquidez antes de la entrada.
3. Esperar desplazamiento.
4. Usar IFVG como zona, no como señal mágica.
5. Esperar retesteo.
6. Tener invalidez clara.
7. Operar pocas veces.
8. Controlar riesgo.
9. Usar sesión y contexto.
10. Registrar si el modelo realmente funciona.

---

# 4. Qué NO queremos copiar

No copiamos:

- Claims de winrate.
- Operativa discrecional exacta.
- Mercado NQ/ES como si fuera igual a XAUUSD.
- Horarios sin validar.
- Parámetros sin backtest.
- Entrada “porque el trader lo ve”.
- Subjetividad imposible de programar.

---

# 5. Modelo simple para usuario

El dashboard debe decir cosas así:

## Compra

> “El oro tomó liquidez abajo, recuperó fuerza y dejó una zona donde podría aparecer compra. Esperar que vuelva a la zona y confirme.”

## Venta

> “El oro tomó liquidez arriba, perdió fuerza y dejó una zona donde podría aparecer venta. Esperar que vuelva a la zona y confirme.”

## No operar

> “El precio está en zona media o sin confirmación. No operar todavía.”

---

# 6. Modelo técnico resumido

Para compra:

1. Marco alto no contradice compras.
2. Precio barre liquidez inferior.
3. Aparece desplazamiento alcista.
4. Se invalida una zona bajista previa/FVG bajista.
5. Esa zona pasa a ser IFVG alcista.
6. Precio vuelve a testear la zona.
7. Hay confirmación.
8. SL queda lógico.
9. TP/R:R sirve.
10. Risk Guard permite operar.

Para venta:

1. Marco alto no contradice ventas.
2. Precio barre liquidez superior.
3. Aparece desplazamiento bajista.
4. Se invalida una zona alcista previa/FVG alcista.
5. Esa zona pasa a ser IFVG bajista.
6. Precio vuelve a testear la zona.
7. Hay confirmación.
8. SL queda lógico.
9. TP/R:R sirve.
10. Risk Guard permite operar.

---

# 7. Definiciones programables

## 7.1 Candle indexing

Para una vela central `i`:

- Vela izquierda: `i-1`.
- Vela central: `i`.
- Vela derecha: `i+1`.

---

## 7.2 Bullish FVG

Un FVG alcista existe si:

```text
low[i+1] > high[i-1]
```

Zona:

```text
fvg_low  = high[i-1]
fvg_high = low[i+1]
direction = bullish
```

Interpretación simple:

El precio subió con fuerza y dejó una zona sin intercambio completo.

---

## 7.3 Bearish FVG

Un FVG bajista existe si:

```text
high[i+1] < low[i-1]
```

Zona:

```text
fvg_low  = high[i+1]
fvg_high = low[i-1]
direction = bearish
```

Interpretación simple:

El precio cayó con fuerza y dejó una zona sin intercambio completo.

---

## 7.4 Tamaño mínimo de FVG

No aceptar FVG demasiado pequeños.

```text
fvg_size = abs(fvg_high - fvg_low)
min_fvg_size = ATR(zone_tf, atr_period) * fvg_min_size_atr
```

Aceptar solo si:

```text
fvg_size >= min_fvg_size
```

---

# 8. Conversión FVG → IFVG

## 8.1 Bullish FVG invalidado

Un FVG alcista se invalida si el precio cierra por debajo de su límite inferior.

```text
close < fvg_low
```

Entonces pasa a ser:

```text
IFVG bearish
```

Uso:

- Zona de posible venta.
- Puede actuar como resistencia en retesteo.

---

## 8.2 Bearish FVG invalidado

Un FVG bajista se invalida si el precio cierra por encima de su límite superior.

```text
close > fvg_high
```

Entonces pasa a ser:

```text
IFVG bullish
```

Uso:

- Zona de posible compra.
- Puede actuar como soporte en retesteo.

---

## 8.3 Modo wick/close

Parámetro configurable:

```text
ifvg_break_mode = close | wick
```

Recomendación V1:

- Empezar con `close`.
- `wick` queda para test.

Motivo:

El cierre suele reducir señales falsas.

---

# 9. Liquidity Sweep

## 9.1 Swing High

Un swing high es una vela cuyo máximo es mayor que los máximos de N velas a izquierda y derecha.

```text
high[i] > max(high[i-lookback : i-1])
high[i] > max(high[i+1 : i+lookback])
```

## 9.2 Swing Low

Un swing low es una vela cuyo mínimo es menor que los mínimos de N velas a izquierda y derecha.

```text
low[i] < min(low[i-lookback : i-1])
low[i] < min(low[i+1 : i+lookback])
```

## 9.3 Sweep de venta para buscar compra

El precio barre liquidez inferior si:

```text
low[current] < swing_low - sweep_tolerance
```

Y luego recupera:

```text
close[current_or_next_N] > swing_low
```

## 9.4 Sweep de compra para buscar venta

El precio barre liquidez superior si:

```text
high[current] > swing_high + sweep_tolerance
```

Y luego recupera hacia abajo:

```text
close[current_or_next_N] < swing_high
```

## 9.5 Tolerancia

```text
sweep_tolerance = ATR(sweep_tf, atr_period) * sweep_tolerance_atr
```

---

# 10. Dirección del día

No usar IFVG aislado.

El bot primero debe clasificar el día:

- Buscar compras.
- Buscar ventas.
- Neutral.
- No operar.

## 10.1 Dirección alcista candidata

Compra habilitada si se cumple una combinación mínima:

- D1/H4 no está en estructura claramente bajista.
- Precio recuperó un rango importante.
- Precio está en descuento relativo del rango reciente.
- Hay liquidez inferior tomada o cercana.
- Hay recorrido hacia liquidez superior.

## 10.2 Dirección bajista candidata

Venta habilitada si se cumple una combinación mínima:

- D1/H4 no está en estructura claramente alcista.
- Precio perdió un rango importante.
- Precio está en premium relativo del rango reciente.
- Hay liquidez superior tomada o cercana.
- Hay recorrido hacia liquidez inferior.

## 10.3 Neutral / no operar

No operar si:

- D1 y H4 se contradicen.
- Precio está en el medio del rango.
- No hay liquidez clara.
- Está demasiado extendido.
- Hay noticia bloqueante.
- Spread anormal.

---

# 11. Construcción de zona IFVG

Cada IFVG se guarda como zona.

Campos:

```json
{
  "zone_id": "XAUUSD_IFVG_2026_05_02_001",
  "symbol": "XAUUSD",
  "strategy": "MZP_IFVG_ZONE_REACTION_V1",
  "direction": "buy",
  "type": "ifvg_bullish",
  "price_from": 2320.50,
  "price_to": 2324.80,
  "origin_tf": "M15",
  "context_tf": "H1/H4",
  "created_at": "timestamp",
  "expires_at": "timestamp",
  "status": "watching",
  "invalidation_price": 2318.90,
  "score": 0,
  "reason_simple": "Zona de posible compra después de tomar liquidez inferior.",
  "reason_technical": "Bearish FVG invalidated upside + sweep sell-side + H4 non-bearish."
}
```

---

# 12. Estados de la zona

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

## CREATED

La zona fue detectada.

## WATCHING

La zona está activa, pero el precio todavía no volvió.

## RETESTING

El precio volvió a tocar la zona.

## CONFIRMED

Hay rechazo/cierre favorable.

## TRADE_READY

Cumple score, R:R, riesgo y reglas.

## INVALIDATED

La zona dejó de servir.

## EXPIRED

Pasó demasiado tiempo.

## USED

Ya generó una operación o alerta principal.

---

# 13. Retesteo de zona

Para compra:

```text
price_low <= zone_high
price_high >= zone_low
```

Para venta:

```text
price_high >= zone_low
price_low <= zone_high
```

Se considera que el precio interactuó con la zona si la vela toca cualquier parte del rango.

Opciones configurables:

```text
retest_mode = full_zone | midpoint | edge
```

Recomendación V1:

- `full_zone` para no exigir precisión extrema.
- Testear `midpoint` en optimización.

---

# 14. Confirmación de entrada

## 14.1 Confirmación para compra

Luego del retesteo:

- Cierre M15 alcista.
- Cierre por encima del 50% de la zona o por encima de la vela de rechazo.
- No cierra debajo de la zona.
- SL lógico debajo de zona/swing.
- R:R mínimo se cumple.

## 14.2 Confirmación para venta

Luego del retesteo:

- Cierre M15 bajista.
- Cierre por debajo del 50% de la zona o por debajo de la vela de rechazo.
- No cierra encima de la zona.
- SL lógico encima de zona/swing.
- R:R mínimo se cumple.

---

# 15. Invalidación

## Compra inválida si:

- Cierre debajo de `zone_low - invalidation_buffer`.
- Nueva estructura H4 contradice compra.
- R:R cae por debajo del mínimo.
- Precio alcanza objetivo antes de entrada.
- Noticia bloqueante.
- Spread anormal.
- Zona expira.
- Risk Guard bloquea.

## Venta inválida si:

- Cierre encima de `zone_high + invalidation_buffer`.
- Nueva estructura H4 contradice venta.
- R:R cae por debajo del mínimo.
- Precio alcanza objetivo antes de entrada.
- Noticia bloqueante.
- Spread anormal.
- Zona expira.
- Risk Guard bloquea.

---

# 16. Stop Loss

## Compra

```text
sl = min(zone_low, sweep_low) - sl_buffer
```

## Venta

```text
sl = max(zone_high, sweep_high) + sl_buffer
```

## Buffer

```text
sl_buffer = max(ATR(M15) * sl_atr_factor, avg_spread * sl_spread_factor)
```

---

# 17. Take Profit

Tres modelos para testear:

## 17.1 Fixed R

```text
tp = entry + (entry - sl) * rr_target
```

Para venta:

```text
tp = entry - (sl - entry) * rr_target
```

## 17.2 Liquidity target

Objetivo en liquidez opuesta reciente:

- Compra: swing high relevante / high del día anterior / liquidez superior.
- Venta: swing low relevante / low del día anterior / liquidez inferior.

## 17.3 Hybrid

- Parcial en 1R.
- Final en 2R o liquidez opuesta.

Recomendación V1:

- Testear primero `fixed_R`.
- Luego comparar con `liquidity_target`.

---

# 18. Score V1

Total 100.

```text
daily_direction_alignment = 20
liquidity_sweep = 15
ifvg_quality = 20
retest_quality = 15
confirmation = 10
rr_quality = 10
risk_news_spread_ok = 10
```

## Clasificación

```text
80-100 = fuerte
65-79  = válido con revisión
45-64  = observar
0-44   = no operar
```

## Uso

El score NO ejecuta solo.

El score define:

- Si se muestra.
- Si se alerta.
- Si se prepara operación.
- Si requiere confirmación humana.

---

# 19. No-trade rules

No operar si:

- No hay dirección clara.
- La zona es demasiado chica.
- La zona es demasiado grande.
- La zona está vieja.
- No hubo sweep cuando sweep_required=true.
- Precio está en rango medio.
- R:R menor que mínimo.
- SL demasiado grande para la cuenta.
- Spread alto.
- Noticia cerca.
- Daily drawdown comprometido.
- Ya se alcanzó máximo de trades.
- Hubo bloqueo psicológico.
- La configuración no está aprobada por backtest.

---

# 20. Inputs MT5 Strategy Tester

```text
strategy_id = MZP_IFVG_ZONE_REACTION_V1
symbol_profile = XAUUSD
direction_tf = H4
fvg_tf = M15
confirmation_tf = M15
atr_period = 14 / 20
fvg_min_size_atr = 0.05 / 0.10 / 0.15 / 0.20
ifvg_break_mode = close / wick
retest_mode = full_zone / midpoint / edge
sweep_required = true / false
sweep_lookback = 5 / 10 / 20
sweep_tolerance_atr = 0.05 / 0.10 / 0.15
reclaim_bars = 1 / 2 / 3 / 5
sl_atr_factor = 0.10 / 0.15 / 0.25
sl_spread_factor = 3 / 5 / 8
min_rr = 1.5 / 2.0
tp_model = fixed_R / liquidity_target / hybrid
max_spread_points = profile
min_score_trade = 65 / 75 / 85
zone_expiry_bars = 8 / 16 / 32
session_filter = all / london / new_york / london_ny
news_filter = off / manual
```

---

# 21. Outputs del EA de test

El EA debe exportar por operación:

```text
trade_id
symbol
date
strategy_id
direction
entry_price
sl
tp
risk_R
result_R
zone_id
zone_type
score_total
score_breakdown
sweep_detected
fvg_id
ifvg_id
retest_mode
confirmation_type
entry_reason
exit_reason
no_trade_reason_if_any
spread_at_entry
session
daily_direction
prop_guard_status
```

---

# 22. Métricas de aceptación

No aprobar por winrate solo.

Métricas mínimas a revisar:

- Profit factor.
- Expectancy en R.
- Max drawdown.
- Racha máxima perdedora.
- Trades por mes.
- Meses positivos/negativos.
- Resultado por sesión.
- Resultado por año.
- Sensibilidad a parámetros.
- Cumplimiento de reglas de fondeo.
- Comparación contra baseline Donchian/ATR.

---

# 23. Backtest loop

## Paso 1 — XAUUSD 2023-2025

Usar para exploración.

## Paso 2 — XAUUSD 2026 parcial

Usar como validación más reciente.

## Paso 3 — Separación de períodos

No optimizar y validar en el mismo tramo.

## Paso 4 — Comparar con baseline

Si IFVG no mejora al baseline, queda en revisión.

---

# 24. Cómo se vería en el dashboard

## Estado simple

```text
Oro: posible compra en observación.
Motivo: tomó liquidez abajo y dejó una zona invertida.
Acción: esperar retesteo. No entrar todavía.
```

## Cuando retestea

```text
Oro volvió a la zona de posible compra.
Falta confirmación. Esperar cierre favorable.
```

## Cuando confirma

```text
Setup listo para revisar.
Compra posible.
Riesgo estimado: 0.5%.
R:R estimado: 1.8.
Score: 82.
```

## Si invalida

```text
La zona de compra quedó inválida.
No operar esta idea.
```

---

# 25. Decisión de investigación

Esta estrategia sí sirve para mejorar el bot porque:

- Trabaja por zonas.
- Es modular.
- Se puede explicar simple.
- Se puede programar.
- Se puede backtestear.
- Permite invalidación.
- Permite score.
- Permite no operar.
- Se alinea con trading moderno sin depender de promesas.

Pero todavía no se aprueba.

Pasa a estado:

`CANDIDATE_FOR_BLUEPRINT_AND_MT5_TEST`

---

# 26. Próximo paso

Crear:

`Mapazapp_IFVG_MT5_Test_Spec_V1.md`

Ese archivo debe decirle a Cursor/MT5:

- Qué EA crear.
- Qué inputs usar.
- Qué outputs exportar.
- Qué optimizar.
- Qué no optimizar.
- Qué métricas generan aprobación.
- Cómo se importa a la app.
- Cómo se compara con baseline.

---

# 27. Fuentes públicas de apoyo

- Fede Esses YouTube / playlist IFVG - ICT x SMC.
- Sitio público Fede Esses Trading.
- TradeZella IFVG Trading Model.
- LuxAlgo Inversion Fair Value Gaps.
- DailyPriceAction Fair Value Gap / SMC.
- FluxCharts FVG / IFVG explanations.
- Capital.com FVG explanation.
- ACY confirmation model OB + FVG + liquidity sweep.

Las fuentes sirven para entender conceptos.
La validación final solo será con backtest y forward test.
