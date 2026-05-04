# Mapazapp — Optimization Matrix & Symbol Parameter Selection V1
Fecha: 2026-05-02

## Estado

Spec separado.
No integrar todavía al MD maestro.

Objetivo:
Definir cómo vamos a combinar parámetros, correr optimizaciones en MT5 y elegir la mejor configuración por símbolo sin caer en sobreoptimización.

---

# 1. Problema

Tener parámetros como:

```text
swing_left_bars = 2 / 3 / 5
swing_right_bars = 2 / 3 / 5
sweep_tolerance_atr = 0.03 / 0.05 / 0.10 / 0.15
```

no alcanza.

Necesitamos definir:

1. Cómo se combinan.
2. Qué se prueba primero.
3. Qué se congela.
4. Qué se optimiza después.
5. Cómo se elige el mejor set.
6. Cómo se valida fuera de muestra.
7. Cómo se adapta por símbolo.
8. Cómo evitar que el bot quede “optimizado para el pasado”.

---

# 2. Principio central

No se elige la configuración con más ganancia.

Se elige la configuración más robusta.

Una configuración robusta es la que:

- Gana en train.
- Sigue viva en validation.
- No rompe fondeo.
- Tiene drawdown tolerable.
- No depende de un solo día/mes.
- No necesita parámetros extremadamente precisos.
- Tiene resultados parecidos si se mueven un poco los parámetros.
- Genera cantidad razonable de operaciones.
- No requiere asumir condiciones irreales.

---

# 3. Backtest por símbolo

Cada símbolo tiene su propio proceso.

No reutilizar settings de oro para EURUSD.

## XAUUSD

Puede necesitar:
- Zonas más amplias.
- Mayor tolerancia ATR.
- Mayor filtro de spread.
- Menos trades diarios.
- Más cuidado con noticias.

## EURUSD

Puede necesitar:
- Zonas más pequeñas.
- Menor tolerancia ATR.
- Spread más estable.
- Más setups posibles.
- Sesiones Londres/NY más relevantes.

## GBPUSD

Puede necesitar:
- Más tolerancia que EURUSD.
- Cuidado con barridas fuertes.
- Filtro de noticias GBP/USD.

---

# 4. Estructura de optimización

No optimizar todo junto.

Se trabaja por bloques:

```text
Block A — Contexto
Block B — Swing/Sweep
Block C — FVG/IFVG
Block D — Retest/Confirmation
Block E — Gestión SL/TP/Score
Block F — Sesión/Noticias
```

El objetivo es reducir combinaciones y entender qué afecta cada parte.

---

# 5. Cálculo de combinaciones

Si probamos:

```text
swing_left_bars      = 3 valores
swing_right_bars     = 3 valores
sweep_tolerance_atr  = 4 valores
reclaim_bars         = 4 valores
```

Combinaciones:

```text
3 * 3 * 4 * 4 = 144
```

Eso es razonable.

Pero si metemos 15 parámetros con 4 valores cada uno:

```text
4^15 = 1,073,741,824 combinaciones
```

Eso no es práctico.

Por eso se optimiza por bloques.

---

# 6. Matriz inicial por bloques

## Block A — Contexto

```text
context_swing_lookback = 3 / 5 / 8
context_structure_bars = 50 / 100 / 150
middle_zone_low_pct    = 0.35 / 0.40 / 0.45
middle_zone_high_pct   = 0.55 / 0.60 / 0.65
```

Combinaciones:

```text
3 * 3 * 3 * 3 = 81
```

Objetivo:
Encontrar contexto que evite operar en el medio y no filtre demasiado.

---

## Block B — Swing/Sweep

```text
swing_left_bars       = 2 / 3 / 5
swing_right_bars      = 2 / 3 / 5
sweep_tolerance_atr   = 0.03 / 0.05 / 0.10 / 0.15
reclaim_bars          = 1 / 2 / 3 / 5
sweep_required        = true / false
```

Combinaciones:

```text
3 * 3 * 4 * 4 * 2 = 288
```

Objetivo:
Detectar barridas útiles sin sobreexigir precisión.

---

## Block C — FVG/IFVG

```text
fvg_min_size_atr          = 0.03 / 0.05 / 0.10 / 0.15
fvg_max_size_atr          = 0.50 / 0.75 / 1.00
ifvg_break_mode           = close / wick
ifvg_break_buffer_atr     = 0.00 / 0.03 / 0.05 / 0.10
max_bars_from_fvg_to_ifvg = 5 / 10 / 20 / 40
```

Combinaciones:

```text
4 * 3 * 2 * 4 * 4 = 384
```

Objetivo:
Encontrar IFVG suficientemente claro sin filtrar todo.

---

## Block D — Retest/Confirmation

```text
retest_mode               = full_zone / midpoint / edge
retest_max_bars_after_ifvg = 8 / 16 / 32 / 64
confirmation_bars         = 1 / 2 / 3
confirmation_min_body_atr = 0.03 / 0.05 / 0.10
wick_confirmation_enabled = true / false
wick_body_ratio           = 1.0 / 1.5 / 2.0
```

Combinaciones:

```text
3 * 4 * 3 * 3 * 2 * 3 = 648
```

Objetivo:
Encontrar confirmación que no entre tarde ni demasiado temprano.

---

## Block E — Gestión

```text
entry_model      = confirmation_close / zone_midpoint_limit
sl_atr_factor    = 0.05 / 0.10 / 0.15 / 0.25
sl_spread_factor = 3 / 5 / 8
max_sl_atr       = 0.75 / 1.00 / 1.50
tp_model         = fixed_R / liquidity_target
rr_target        = 1.5 / 2.0 / 2.5
min_score_trade  = 65 / 75 / 85
```

Combinaciones:

```text
2 * 4 * 3 * 3 * 2 * 3 * 3 = 1296
```

Objetivo:
Encontrar SL/TP/score que sea operable y compatible con fondeo.

---

# 7. Método correcto: optimización por etapas

## Etapa 0 — Sanity check visual

Antes de optimizar:

- Correr un set fijo.
- Ver en visual mode si detecta bien zonas.
- Revisar que no use velas futuras.
- Revisar que las zonas tienen sentido.
- Revisar que el EA exporta datos.
- Revisar que no opera sin zona.

Si falla esto, no optimizar.

---

## Etapa 1 — Bloque base

Fijar casi todo.

Probar solo:

```text
swing_left_bars
swing_right_bars
sweep_tolerance_atr
reclaim_bars
```

Mantener fijos:
- FVG.
- IFVG.
- TP.
- SL.
- Score.

Elegir top 10 sets por robustez, no por ganancia.

---

## Etapa 2 — IFVG

Tomar top 10 de Etapa 1.

Optimizar:

```text
fvg_min_size_atr
fvg_max_size_atr
ifvg_break_mode
ifvg_break_buffer_atr
max_bars_from_fvg_to_ifvg
```

Quedarse con top 10 combinaciones globales.

---

## Etapa 3 — Retest/confirmación

Tomar top 10 de Etapa 2.

Optimizar:

```text
retest_mode
retest_max_bars_after_ifvg
confirmation_bars
confirmation_min_body_atr
wick_confirmation_enabled
wick_body_ratio
```

---

## Etapa 4 — Gestión

Tomar top 10 de Etapa 3.

Optimizar:

```text
entry_model
sl_atr_factor
sl_spread_factor
max_sl_atr
tp_model
rr_target
min_score_trade
```

---

## Etapa 5 — Validación fuera de muestra

Los mejores sets NO se aprueban todavía.

Se prueban en:

```text
validation period
forward period
```

Si se caen, se descartan.

---

# 8. Cómo usar MT5 Optimization

En MT5, cada input del EA debe tener:

```text
Value
Start
Step
Stop
```

Ejemplo:

```text
swing_left_bars:
Value = 3
Start = 2
Step  = 1
Stop  = 5
```

Si solo queremos valores 2, 3, 5 y no 4, hay dos opciones:

## Opción A — Permitir 4 también

```text
Start = 2
Step = 1
Stop = 5
```

Valores:
```text
2, 3, 4, 5
```

## Opción B — Usar enum interno

```text
swing_left_profile = 0 / 1 / 2
```

Mapeo:

```text
0 => 2
1 => 3
2 => 5
```

Recomendación:
Usar enums para listas específicas.

---

# 9. Parámetros como enums

Para valores no lineales, usar índices.

## Ejemplo sweep_tolerance_atr

Input MT5:

```text
sweep_tolerance_profile = 0 / 1 / 2 / 3
```

Mapeo en EA:

```text
0 => 0.03
1 => 0.05
2 => 0.10
3 => 0.15
```

Ventaja:
- Controlamos valores exactos.
- Evitamos probar números inútiles.
- Facilitamos comparar resultados.

---

# 10. Ejemplo de combinación

Supongamos:

```text
swing_left_profile = 1  => 3
swing_right_profile = 1 => 3
sweep_tolerance_profile = 2 => 0.10
reclaim_bars_profile = 1 => 2
```

El EA guarda:

```text
swing_left_bars = 3
swing_right_bars = 3
sweep_tolerance_atr = 0.10
reclaim_bars = 2
```

Y exporta:

```text
parameter_set_id = MZP_IFVG_XAUUSD_B1_00034
```

---

# 11. Optimización genética vs completa

## Completa

Prueba todas las combinaciones.

Usar cuando:
- Hay pocas combinaciones.
- Estamos validando un bloque chico.
- Queremos comparar todo.

## Genética

Prueba una parte inteligente del espacio.

Usar cuando:
- Hay muchas combinaciones.
- Queremos explorar rápido.
- El número total sería muy grande.

Regla:

```text
if total_combinations <= 5000:
    usar complete optimization
else:
    usar genetic optimization
```

---

# 12. Custom optimization score

No optimizar por balance máximo.

Crear métrica propia del EA:

```text
robustness_score
```

Propuesta:

```text
robustness_score =
    profit_factor_score
  + expectancy_score
  + drawdown_score
  + trade_count_score
  + consistency_score
  + prop_firm_score
  - overfit_penalty
```

---

# 13. Fórmula sugerida de ranking

## 13.1 Normalizaciones

```text
profit_factor_score =
    clamp((profit_factor - 1.0) / 1.0, 0, 1) * 20
```

```text
expectancy_score =
    clamp(expectancy_R / 0.50, 0, 1) * 20
```

```text
drawdown_score =
    clamp(1 - (max_drawdown_pct / max_allowed_drawdown_pct), 0, 1) * 20
```

```text
trade_count_score =
    clamp(trades_total / target_trades, 0, 1) * 10
```

```text
consistency_score =
    monthly_consistency_ratio * 20
```

```text
prop_firm_score =
    10 if no_prop_rule_violations else 0
```

Total máximo:

```text
100
```

---

## 13.2 Penalizaciones

```text
overfit_penalty = 0
```

Sumar penalización si:

```text
best_month_profit > 40% of total_profit
overfit_penalty += 10
```

```text
validation_profit_factor < train_profit_factor * 0.70
overfit_penalty += 20
```

```text
trades_total too low
overfit_penalty += 15
```

```text
max_losing_streak > allowed_losing_streak
overfit_penalty += 10
```

---

# 14. Cómo elegir el mejor set

No elegir solo el primero del ranking.

Proceso:

1. Tomar top 20 por robustness_score en train.
2. Probar esos 20 en validation.
3. Descartar los que caen fuerte.
4. Tomar top 5 sobrevivientes.
5. Probar forward/2026.
6. Revisar sensibilidad.
7. Elegir set aprobado.

---

# 15. Sensibilidad de parámetros

Un set es sospechoso si solo funciona con una combinación exacta.

Ejemplo malo:

```text
swing_left = 3 funciona
swing_left = 2 pierde todo
swing_left = 4 pierde todo
```

Ejemplo bueno:

```text
swing_left = 2, 3, 4 tienen resultados parecidos
```

Regla:
Preferir zonas de estabilidad, no picos aislados.

---

# 16. Heatmap de parámetros

MT5 permite revisar resultados por combinación, pero la app externa debería importar resultados y mostrar:

- Heatmap sweep_tolerance vs reclaim_bars.
- Heatmap fvg_min_size vs ifvg_break_buffer.
- Heatmap rr_target vs min_score_trade.

Objetivo:
Ver si hay región estable o solo un punto mágico.

---

# 17. Workflow por símbolo

## 17.1 XAUUSD

1. Medir spread promedio del broker.
2. Definir max_spread_points inicial.
3. Ejecutar sanity test.
4. Optimizar Block B.
5. Optimizar Block C.
6. Optimizar Block D.
7. Optimizar Block E.
8. Validar.
9. Aprobar parameter_set_id.

## 17.2 EURUSD

No copiar XAUUSD.

1. Medir spread.
2. Medir ATR.
3. Ajustar rangos si hace falta.
4. Repetir optimización.
5. Comparar robustez.
6. Aprobar set separado.

---

# 18. Parameter Set Registry

Todo set aprobado se guarda.

```json
{
  "parameter_set_id": "MZP_IFVG_XAUUSD_V1_SET_003",
  "strategy_id": "MZP_IFVG_ZONE_REACTION_V1",
  "symbol": "XAUUSD",
  "status": "approved_for_demo",
  "trained_on": "2023-01-01_to_2024-12-31",
  "validated_on": "2025-01-01_to_2025-12-31",
  "forward_on": "2026-01-01_to_2026-05-02",
  "inputs": {
    "swing_left_profile": 1,
    "swing_right_profile": 1,
    "sweep_tolerance_profile": 2,
    "reclaim_bars_profile": 1
  },
  "metrics": {
    "profit_factor_train": 1.42,
    "profit_factor_validation": 1.22,
    "expectancy_R_validation": 0.18,
    "max_drawdown_pct": 3.8,
    "trades_validation": 46
  }
}
```

---

# 19. Estados del set

```text
draft
tested_train
validated
approved_for_demo
approved_for_alerts
approved_for_assisted_execution
rejected
retired
```

Nunca pasar directo a ejecución.

---

# 20. Reglas para aprobar por fase

## approved_for_demo

Requiere:

```text
train ok
validation ok
no severe prop violations
```

## approved_for_alerts

Requiere:

```text
demo/forward test manual ok
alerts match backtest logic
journal confirms quality
```

## approved_for_assisted_execution

Requiere:

```text
minimum live sample
risk guard tested
kill switch tested
operator approval
```

---

# 21. Cómo evitar combinaciones inútiles

Antes de optimizar:

- Eliminar parámetros redundantes.
- Limitar rangos absurdos.
- No probar timeframes demasiado bajos en V1.
- No optimizar noticia si todavía no tenemos calendario confiable.
- No optimizar más de 5-7 parámetros por etapa.
- No mezclar símbolo A con símbolo B.

---

# 22. Example: combinaciones para XAUUSD Block B

Inputs:

```text
swing_left_profile = 0, 1, 2
swing_right_profile = 0, 1, 2
sweep_tolerance_profile = 0, 1, 2, 3
reclaim_bars_profile = 0, 1, 2, 3
sweep_required = 0, 1
```

Total:

```text
3 * 3 * 4 * 4 * 2 = 288
```

MT5 corre 288 pasadas si usamos complete optimization.

Cada pasada exporta:
- inputs.
- trades.
- metrics.
- robustness_score.

La app importa y rankea.

---

# 23. Example: reducción de sets

Después de 288 pasadas:

```text
Top 20 train
↓
Top 10 validation
↓
Top 5 forward
↓
Top 1-3 approved_for_demo
```

No buscamos “el ganador único”.
Buscamos 1 a 3 sets robustos.

---

# 24. Comparación entre símbolos

No comparar XAUUSD vs EURUSD solo por profit.

Comparar por:

- expectancy_R.
- profit_factor.
- drawdown.
- trades/month.
- estabilidad.
- reglas de fondeo.
- costo spread.
- facilidad psicológica.

Si EURUSD tiene menos ganancia pero más estabilidad, puede ser mejor para fondeo.

---

# 25. Qué debe hacer el bot externo

La app externa debe permitir:

1. Importar resultados MT5.
2. Agrupar por símbolo.
3. Agrupar por strategy_id.
4. Agrupar por parameter_set_id.
5. Calcular robustness_score.
6. Mostrar top sets.
7. Comparar train/validation/forward.
8. Marcar set aprobado.
9. Enviar set aprobado al scanner live.
10. Retirar sets viejos.

---

# 26. Qué NO debe hacer

No debe:

- Aprobar automáticamente por balance.
- Copiar settings entre símbolos.
- Cambiar parámetros sin registro.
- Usar un set no validado.
- Ejecutar con configuración draft.
- Optimizar todos los parámetros juntos desde el inicio.

---

# 27. Respuesta directa a la pregunta

¿Cómo detectamos los números que mejor se adaptan a cada símbolo?

Respuesta:

1. Convertimos cada número en input optimizable.
2. Agrupamos inputs por bloques.
3. Corremos optimización MT5 por símbolo.
4. Exportamos todas las pasadas.
5. Calculamos ranking de robustez.
6. Validamos fuera de muestra.
7. Revisamos sensibilidad.
8. Aprobamos un parameter_set por símbolo.
9. El bot live usa solo sets aprobados.

---

# 28. Regla final

La mejor configuración no es la que más gana.

La mejor configuración es la que sobrevive mejor al cambio de período, spread, meses malos y reglas de fondeo.

