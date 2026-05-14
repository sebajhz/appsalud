# Mapazapp — Sensibilidad y diagnósticos de ambigüedad (E5.6)

**Tipo:** plan de checkpoint (documentación viva).  
**Alcance E5.6:** solo **documentación** y definición de camino de implementación futura. **No** cambia lógica de trading en este commit salvo decisión explícita posterior.  
**Prerrequisitos:** [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) (**E5.5.2**); campaña **E5.5.1** válida (`MZP_TestEA_E5_5_0_5`, 7 bundles validados).  
**Relacionado:** [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md), [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md), [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md).

---

## 1. Propósito

Los desenlaces **`ambiguous`** son **críticos antes de aprobar el setup** porque el resumen de campaña **depende de cómo se contabilicen** en R. En la simulación virtual actual, **`ambiguous` aporta 0R**; si una fracción grande de operaciones queda en esa categoría, el **TotalR y la ExpectancyR** del `backtest_summary` reflejan una hipótesis contable **optimista** respecto a lo que un trader conservador o un prop firm podrían considerar “resultado no resuelto a favor”.

Sin cerrar esta brecha metodológica, cualquier lectura de “edge positivo” puede **colapsar** bajo supuestos más conservadores sobre el mismo CSV de trades — **riesgo de decisión** para el operador y para el producto asistente.

---

## 2. Comportamiento actual de la ambigüedad

**Simulación virtual (contrato E5.2+ / implementación E5.3):**

- Existe un desenlace explícito **`ambiguous`** cuando, con la resolución acordada (p. ej. barra M15 / reglas OHLC), **no** se puede determinar de forma única si el precio alcanzó primero el SL o el TP intrabar.
- En el cómputo agregado habitual de la campaña, **`ambiguous` se trata como 0R** (no suma +1R ni −1R en el total “oficial” del escenario baseline documentado hasta ahora).
- Los resultados **E5.5.1** (TotalR, ExpectancyR, drawdowns reportados) **dependen fuertemente** de esa convención: un conteo alto de `ambiguous` **no** penaliza el TotalR bajo el baseline contable actual.

---

## 3. Matemática de sensibilidad (baseline E5.5.1)

**Aproximación conservadora documentada:** asignar **−1R** a cada trade `ambiguous` y recalcular el total ajustado como:

`total_r_adjusted ≈ total_r_reported − ambiguous_count`

(suponiendo que cada trade ambiguo “destruye” 1R de edge frente al baseline 0R; es una **cota de estrés simple**, no un modelo de probabilidad intrabar).

| Variante (FVG mín.) | TotalR (reportado) | Ambiguous (conteo) | TotalR ajustado (−1R / ambiguous) |
|---------------------|-------------------:|-------------------:|----------------------------------:|
| **FVG 2** | 315 | 436 | **−121** |
| **FVG 18** | 297 | 399 | **−102** |
| **FVG 50** | 242 | 298 | **−56** |

**Lectura:** bajo este estrés **lineal**, el escenario FVG 2 pasa de **+315R** a aproximadamente **−121R**. Por tanto la **ambigüedad es riesgo decisorio**: el setup **no** puede considerarse robusto solo porque brilla con `ambiguous = 0R` sin más análisis.

*(Los conteos `ambiguous` de FVG 18 y FVG 50 deben verificarse en los `backtest_summary.json` / CSV de cada bundle si hubiera discrepancia con el operador; aquí se toman los valores facilitados en el briefing E5.6.)*

---

## 4. Modos de contabilidad de ambigüedad (definición futura)

| Modo | Identificador propuesto | Comportamiento |
|------|---------------------------|----------------|
| Neutral cero | `neutral_zero` | `ambiguous` **= 0R** en agregados (baseline actual conceptual). |
| Pérdida conservadora | `conservative_loss` | `ambiguous` **= −1R** cada uno en agregados ajustados (estrés de cola simple). |
| Excluir del outcome | `skip_trade` | Trades `ambiguous` **excluidos** del cómputo de winrate/expectancy “limpio”, pero **contados** en `ambiguous_count` y tasas (evita mezclar 0R con wins/losses sin etiqueta). |
| Orden por ticks (investigación) | `tick_order_attempt` | Resolver SL vs TP usando **orden de toques en ticks del Strategy Tester** cuando MQL5 lo permita de forma **fiable**; si no es fiable, el modo debe degradar a `neutral_zero` o marcar “no resuelto”. |

**Nota:** `tick_order_attempt` es **investigación futura**; no asumir viabilidad ni determinismo completo hasta revisión técnica MQL5 y pruebas controladas.

---

## 5. Diagnósticos a exportar (por trade `ambiguous`)

Para cada trade con outcome `ambiguous`, las exportaciones futuras deberían incluir (mínimo deseado):

- **Dirección** (long/short).
- **Entry**, **SL**, **TP** (precios teóricos de la simulación).
- **OHLC** de la vela (o velas) relevantes para la resolución.
- **Rango en puntos** de la vela clave (high−low, normalizado según contrato de símbolo).
- **Riesgo en puntos** (distancia entry→SL o equivalente documentado).
- **Tamaño del FVG** (puntos o unidad acordada en el EA).
- **Sesión / bucket horario** (según inputs futuros de ventana).
- **Barras en trade** (tiempo simulado en velas hasta la ambigüedad).
- **Flag:** SL y TP **ambos dentro del rango de la misma vela** (proxy de “vela ruidosa”).
- **Distancias** desde entry a SL y a TP (puntos).
- **Bucket de volatilidad** si existe proxy (p. ej. ATR M15 relativo, percentil de rango, etc.).

Estos campos alimentan segmentación (§6) y humanización BridgeEA (§9).

---

## 6. Métricas a comparar

Para **cada** `FVGMin` (o `parameter_set_id`) y **cada** modo de ambigüedad (§4):

| Métrica | Uso |
|---------|-----|
| `trade_count` | Base de frecuencia. |
| `ambiguous_count` | Magnitud del problema. |
| `ambiguous_rate` | `ambiguous_count / trade_count`. |
| `total_r_adjusted` | R bajo la convención del modo. |
| `expectancy_r_adjusted` | Expectativa bajo el modo. |
| `winrate_adjusted` | Winrate con reglas explícitas para `ambiguous` (p. ej. excluido en `skip_trade`). |
| `max_drawdown_r_adjusted` | Drawdown bajo el mismo ajuste (recalcular serie de equity en R). |
| `trades_per_day` | Anti-sobre-operación bajo cada modo. |
| Impacto en **score** (futuro E5.7–E5.9) | Correlación bins de score × modo de ambigüedad. |

---

## 7. Reglas de decisión (aprobar setup)

El setup **no** puede aprobarse si **solo** es rentable cuando **`ambiguous = 0R`** y bajo `conservative_loss` o `skip_trade` deja de ser aceptable sin otra mitigación.

Un setup **robusto** debe, como mínimo, una de:

1. Permanecer **aceptable** bajo supuestos **conservadores** sobre `ambiguous` (o bajo `skip_trade` con tasas y riesgo acotados), **o**
2. **Reducir materialmente** la tasa de `ambiguous` con mejores reglas de entrada / SL / timeframe de resolución, **o**
3. **Resolver** la ambigüedad con **sub-timeframe o lógica de ticks** donde sea fiable, reduciendo el volumen de `ambiguous` “verdaderamente irresolutos”.

---

## 8. Opciones de implementación siguiente

| Opción | Descripción | Pros / contras |
|--------|-------------|----------------|
| **A** | **Sin cambio MQL5:** post-proceso en **TypeScript** sobre bundles ya exportados (CSV trades + summary): recalcular métricas por modo §4. | Rápido, reproducible, sin recompilar EA; depende de que el CSV tenga columnas suficientes hoy o en un paso mínimo de export ya existente. |
| **B** | Añadir **`InpVirtualAmbiguityAccountingMode`** (o equivalente) en **TestEA** para que el **`backtest_summary.json`** refleje agregados bajo el modo elegido en un **nuevo pase** de tester. | Un solo lugar “oficial” para números; requiere cambio MQL5 + posible actualización de validadores/contrato. |
| **C** | Ampliar **CSV de trades / eventos** con columnas de diagnóstico §5 para cada `ambiguous`. | Máxima transparencia para análisis y ML ligero; más trabajo de contrato y validadores. |

**Recomendación para el siguiente paso de implementación (fuera de E5.6 docs-only):**

1. **Empezar por A o B:** **A** si los exports actuales ya permiten recomputar sin tocar el EA; **B** si se prefiere un summary “oficial” por modo en el próximo run.  
2. **Añadir C** si tras A/B sigue faltando granularidad para segmentar (sesión, vela ruidosa, distancias).

**E5.6 no aprueba estrategia** ni implementa código: solo fija el plan y el orden recomendado.

---

## 9. Implicaciones BridgeEA (producto asistente)

En **live**, BridgeEA (y el dashboard) deberían poder **marcar** situaciones de riesgo análogo a `ambiguous` o previas a ella, por ejemplo:

- **Alta volatilidad** (rango/spread anómalo).
- **SL/TP demasiado cercanos** respecto al rango de la vela o al ruido esperado.
- **Vela ruidosa** / chop (patrón compatible con SL y TP “alcanzables” en la misma agregación temporal).
- **Riesgo chop / evitar** como etiqueta de humanización (sin ejecutar órdenes).

Esto conecta la métrica técnica `ambiguous` con el objetivo de **explicación y alerta** al trader, alineado con **E5.5.2** §11.

---

## 10. No objetivos (E5.6)

- **No** `OrderSend` ni ejecución real.  
- **No** `CTrade`.  
- **No** trading live.  
- **No** expansión de dashboard en este checkpoint.  
- **No** aprobación del setup como conclusión de E5.6.  
- **No** ejecutar MT5, Strategy Tester, API, supervisor ni wrapper en el cierre de este documento.

---

## Historial del documento

| Versión | Nota |
|---------|------|
| E5.6 v1 | Plan sensibilidad/diagnósticos `ambiguous`; opciones A/B/C; métricas y reglas de aprobación. |
