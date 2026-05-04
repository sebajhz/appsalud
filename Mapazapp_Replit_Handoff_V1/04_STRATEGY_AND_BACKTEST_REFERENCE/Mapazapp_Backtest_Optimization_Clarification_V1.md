# Mapazapp — Backtest & Optimization Clarification V1
Fecha: 2026-05-02

## Objetivo

Dejar claro, en un archivo corto, cómo vamos a manejar backtesting, combinaciones de parámetros y configuración por símbolo.

Este punto ya fue explicado en documentos anteriores, pero queda aquí resumido para evitar confusión.

---

# 1. ¿Ya lo explicamos?

Sí.

Está principalmente en estos archivos:

1. `Mapazapp_IFVG_Numerical_Detection_MT5_Backtest_Spec_V1.md`
   - Define números, fórmulas, timeframes, swings, sweep, FVG, IFVG, confirmación, SL, TP, score y outputs para MT5.

2. `Mapazapp_Optimization_Matrix_Symbol_Parameter_Selection_V1.md`
   - Define cómo combinar parámetros, optimizar por bloques, elegir sets robustos y aprobar configuraciones por símbolo.

3. `Mapazapp_Strategy_Definition_Testing_Loop_D1_V1.md`
   - Define el ciclo: idea → documento → fórmula → EA testeable → backtest → validación → forward test → aprobación o descarte.

4. `Mapazapp_Strategy_Engine_Modular_Architecture_V1.md`
   - Define que la estrategia debe ser modular e intercambiable, para cambiarla sin rehacer todo el sistema.

---

# 2. Decisión central

No vamos a hardcodear números importantes.

Todo número que afecte la estrategia debe ser:

- Parámetro.
- Versionado.
- Testeable.
- Exportado en resultados.
- Asociado a un símbolo.
- Aprobado antes de usarlo en vivo.

Ejemplo:

```text
swing_left_bars
swing_right_bars
sweep_tolerance_atr
reclaim_bars
fvg_min_size_atr
ifvg_break_buffer_atr
confirmation_bars
min_score_trade
rr_target
```

---

# 3. Cada símbolo tiene su propio set

No se usa la misma configuración para oro, euro o libra.

Ejemplo:

```text
MZP_IFVG_XAUUSD_V1_SET_003
MZP_IFVG_EURUSD_V1_SET_001
MZP_IFVG_GBPUSD_V1_SET_002
```

Cada set tiene:

- Símbolo.
- Estrategia.
- Parámetros.
- Período de entrenamiento.
- Período de validación.
- Métricas.
- Estado de aprobación.

---

# 4. Cómo se prueban combinaciones

No se prueba todo junto.

Se optimiza por bloques:

```text
Block A — Contexto
Block B — Swing/Sweep
Block C — FVG/IFVG
Block D — Retest/Confirmación
Block E — Gestión SL/TP/Score
Block F — Sesión/Noticias
```

Ejemplo:

```text
swing_left_bars      = 3 valores
swing_right_bars     = 3 valores
sweep_tolerance_atr  = 4 valores
reclaim_bars         = 4 valores
sweep_required       = 2 valores

Total = 3 * 3 * 4 * 4 * 2 = 288 combinaciones
```

Esto se puede correr en MT5 Strategy Tester.

---

# 5. Cómo se elige la mejor configuración

No gana la configuración con más plata.

Gana la configuración más robusta.

Se evalúa:

- Profit factor.
- Expectancy en R.
- Drawdown.
- Cantidad de trades.
- Rachas perdedoras.
- Meses buenos/malos.
- Consistencia.
- Reglas de fondeo.
- Resultado en validación.
- Sensibilidad de parámetros.

---

# 6. Flujo de aprobación

```text
draft
↓
tested_train
↓
validated
↓
approved_for_demo
↓
approved_for_alerts
↓
approved_for_assisted_execution
```

Nunca se pasa directo de backtest a ejecución real.

---

# 7. Regla anti-sobreoptimización

No queremos un set que solo funcionó en el pasado.

Por eso:

1. Se entrena en un período.
2. Se valida en otro.
3. Se prueba en forward/demo.
4. Se revisa sensibilidad.
5. Se compara contra baseline.
6. Se aprueba solo si sobrevive.

---

# 8. Respuesta simple

Sí, esto ya quedó explicado.

Pero queda oficialmente resumido así:

> El bot tendrá parámetros optimizables por símbolo. MT5 probará combinaciones por bloques. La app externa importará resultados, calculará robustez y solo habilitará sets aprobados. Replit/Cursor no inventan los números: implementan el sistema para probar, guardar y usar configuraciones validadas.

---

# 9. Próximo paso relacionado

Cuando pasemos a implementación, crear:

`Mapazapp_MT5_EA_Optimization_Input_Map_V1.md`

Ese archivo debe mapear cada parámetro del documento a un input real del EA de MT5, con:

- Nombre del input.
- Tipo.
- Valores permitidos.
- Start/Step/Stop o enum.
- Descripción.
- Bloque de optimización.
- Si se exporta o no en resultados.
