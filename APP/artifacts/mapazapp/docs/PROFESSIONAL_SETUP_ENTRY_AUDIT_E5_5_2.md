# Mapazapp — Auditoría profesional de setup y entrada (E5.5.2)

**Tipo:** documento vivo (auditoría de estrategia, decisiones de operador, dudas, hoja de ruta).  
**Alcance:** solo documentación. **No** sustituye informes numéricos por parámetro en la plantilla de campaña.  
**Contexto de campaña:** primera campaña válida de barrido FVG en XAUUSD M15/D1 con `Mapazapp_TestEA` build **`MZP_TestEA_E5_5_0_5`**; siete bundles exportados y validados (`ok=true`, `errors=0`); único warning recurrente: `BUNDLE_EVENTS_LARGE`.  
**Relacionado:** [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md), [`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md), [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md), [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md).

**Objetivo del documento:** que sesiones futuras (Cursor, ChatGPT u operador) puedan **reanudar** sin perder: estado técnico, interpretación de resultados, **límites de lo probado** (tester vs live), decisiones explícitas y siguiente secuencia de checkpoints.

---

## 1. Estado actual

| Área | Estado |
|------|--------|
| **TestEA + MT5 Strategy Tester** | El EA oficial de tester puede ejecutarse en el Strategy Tester; la campaña E5.5.1 de barrido FVG (parámetro de tamaño FVG) se completó con resultados coherentes y bundles válidos. |
| **Pipeline export / validación** | Funciona: CLI `mapazapp:testea-export-validate` + validadores core; bundles con `ok=true`, `errors=0`. |
| **Primera campaña FVG (outcome virtual)** | **Válida técnicamente**; resultados **prometedores en R acumulado y expectativa** pero **insuficientes para aprobar el setup** a nivel profesional (ver §3 y decisiones §4). |
| **Aprobación del setup** | **No aprobada.** El marco actual es un **esqueleto fuerte** en motor de tester, no una estrategia final auditada para despliegue o confianza operativa. |
| **BridgeEA + Mapazapp + dashboard en vivo** | **No existe prueba end-to-end** de que BridgeEA, Mapazapp y el dashboard lean el mercado **en vivo** y muestren **la misma lógica de setup** que TestEA en el tester. Eso es un **checkpoint futuro explícito** (§11, E5.12–E5.13). **No** se debe inferir “producción lista” solo porque la campaña en tester sea válida. |

**Corrección de producto (explícita):** Mapazapp **no** se concibe ahora como robot de trading automático. Es **asistente del trader**: leer contexto, detectar oportunidades candidatas, **explicarlas**, **puntuarlas**, **rechazar** las malas con criterio documentado y **alertar** al humano. La cadena objetivo a largo plazo: **TestEA** (tester / campañas) → **BridgeEA** (lectura live, representación en gráfico/dashboard) → **dashboard Mapazapp** (decisión legible).

---

## 2. Lógica de setup actual (TestEA — resumen conceptual)

Lo siguiente describe el comportamiento **actual** del candidato en tester (M15 + sesgo diario), a nivel de intención de diseño documentado en E3–E5; no sustituye el código fuente.

- **Sesgo D1 (Daily Bias):** evaluación en marco temporal diario (vela previa cerrada según contrato) que actúa como **compuerta de contexto** para dirección preferida del setup.
- **Detección FVG en M15:** identificación **mecánica** de huecos / FVG en velas cerradas M15 acotados por parámetros (p. ej. barrido de “tamaño mínimo” del FVG en la campaña).
- **Alineación con sesgo diario:** el candidato long/short debe ser **coherente** con el sesgo evaluado (gate documentado en E3.5+).
- **Entrada en punto medio virtual:** entrada simulada en **midpoint** conceptual de la zona (virtual), no ejecución de mercado real.
- **Stop en límite del FVG:** stop lógico anclado al **límite** de la estructura FVG según dirección.
- **Objetivo 2R:** take-profit simulado a **2R** respecto al riesgo definido por esa geometría.
- **Tratamiento `ambiguous`:** desenlaces donde el orden intrabar de SL vs TP no está univocamente resoluble con la resolución M15/OHLC acordada; el trade se marca **ambiguo** en exportes (no “ganado” ni “perdido” clásico).
- **Métricas exportadas:** conteos de trades, wins/losses/ambiguous, R total, expectativa en R, drawdown en R, ratios aproximados, etc., según contrato de CSV/summary/eventos.

---

## 3. Problemas principales detectados en la revisión

1. **Demasiados trades para un solo símbolo** en el rango de campaña (aprox. 2025-01-01 a 2026-05-11): ~1697 trades en el escenario más permisivo del barrido; extrapolado a multi-símbolo, riesgo claro de **sobre-operación**.
2. **Conteo `ambiguous` elevado** (p. ej. 436 en el bundle FVG 2): volumen **demasiado alto para ignorar**; puede mezclar volatilidad, calidad de entrada, stops “justos”, resolución temporal insuficiente o incluso señal mal modelada.
3. **Sesgo D1 actual demasiado simple** para narrativa HTF profesional (falta jerarquía D1/H4/H1 y calidad de desplazamiento).
4. **Detección FVG puramente mecánica** sin capas de “calidad de zona” (iFVG, reacción, premium/discount, etc.).
5. **Sin barrido de liquidez obligatorio** previo a la entrada: el modelo no exige aún evento de liquidez tomada (PDH/PDL, sesión, etc.).
6. **Sin narrativa human-style** en el producto: métricas sí, historia operativa legible para el trader **aún no** como entrega principal.
7. **Sin control robusto de sesión / noticias / riesgo de sobre-operación** en el asistente (ventanas, modos, reglas de prop firm configurables).
8. **Sin representación live completa** del setup en BridgeEA/dashboard (ver §1 y §11).

---

## 4. Decisiones del operador (registro explícito)

### A. Menos trades, mejor calidad

- **No** optimizar únicamente por `TotalR`.
- Seguir y comparar explícitamente: **trades/día**, **trades/sesión**, escalabilidad **multi-símbolo** y tasas de rechazo/selección.

### B. Setup no aprobado

- El estado oficial del setup queda: **“prometedor / bajo refinamiento profesional”**.
- Ninguna compuerta de “listo para confianza operativa” se cierra con esta campaña sola.

### C. `ambiguous` — estudiar, no descartar

- Analizar si representan: volatilidad extrema, entradas débiles, stops mal ubicados, **resolución temporal insuficiente** (M15 vs ticks), o posible **edge oculto** (hipótesis a contrastar con datos, no afirmación).

### D. Sesión configurable por tiempo

- **No** hardcodear “solo NY”.
- Ventanas **inicio/fin hora** configurables; el operador valora **noche/Asia** y **NY**, pero la política debe ser **parametrizable**, no fija en código como dogma.

### E. Noticias configurables (no bloqueo ciego total)

- Modos deseados (concepto): `allow`, `block_new_entries_only`, `strict_prop_firm`, `observe_only`.
- Si hay trade abierto **antes** de una ventana de noticia, **no** asumir cierre forzoso automático: las reglas de bróker/prop deben ser **configurables** y explícitas.

### F. Score primero como observación, no compuerta dura

- **No** bloquear de inmediato todo lo bajo un umbral.
- Primera fase: **exportar** puntuación y componentes; analizar **distribución** y correlación con resultados; **luego** fijar umbrales con evidencia.

### G. Paridad conceptual TestEA ↔ BridgeEA

- Toda regla nueva en TestEA debe planificarse para **replicarse o representarse** en BridgeEA y en el dashboard (mismo **contrato conceptual**, aunque la implementación difiera).

---

## 5. Auditoría desde la óptica del trader profesional

Qué falta (lista de trabajo intelectual / de producto), sin pretender exhaustividad cerrada:

- Narrativa **HTF** (D1 / H4 / H1) integrada, no solo un sesgo D1 mínimo.
- **Liquidity sweep** antes de validar entrada (PDH/PDL, PWH/PWL, sesión, Asia, London, swings locales, equal highs/lows).
- Contexto **premium/discount** respecto a rangos relevantes.
- Calidad de **desplazamiento** (impulse vs chop).
- Calidad **FVG / iFVG** (tamaño, edad, mitigación, reacción).
- Comportamiento de **retest** y reacción al precio en la zona.
- Contexto **sesión / hora del día**.
- Contexto **noticias** y modo de convivencia con reglas externas.
- Contexto **spread / volatilidad** (filtrado o puntuación, no ignorar).
- Lógica de **stop** más rica que “límite FVG” si el mercado lo exige.
- Calidad de **objetivo** (no solo 2R fijo si el contexto sugiere parcial o runners — a futuro).
- **Anti-sobre-operación** explícita (límites diarios, cooldowns, etc.).
- **Multi-símbolo:** correlación, concentración USD, riesgo de cartera.

---

## 6. Propuesta “Entry Quality Score V1” (solo observación)

**Contrato formal (pesos provisionales, grades, exports CSV, métricas de campaña, parity BridgeEA):** [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md) (**E5.7**). Este §6 conserva el resumen ejecutivo; la semántica versionada vive en el contrato.

**Principio:** observación primero; **sin pesos finales** como verdad; primera implementación futura = exportar **valores crudos por componente** + **total** (fórmula documentada pero **reversible**).

**Componentes propuestos (borrador):**

| Componente | Rol |
|------------|-----|
| HTF narrative score | Coherencia / fuerza de la historia multi-timeframe. |
| Liquidity event score | Proximidad o confirmación de barridos de liquidez relevantes. |
| Displacement / FVG quality score | Impulso, tamaño relativo, “limpieza” de la estructura. |
| Entry / retest confirmation score | Cómo entró el precio a la zona y reaccionó. |
| Target quality score | Razonabilidad del TP vs estructura y volatilidad. |
| Session / news / spread score | Entorno operativo permitido vs hostil. |
| Risk / overtrading score | Penalización por frecuencia, clusters, límites diarios. |

**Análisis obligatorio tras la primera exportación:**

- Distribución del score total y por componente.
- Conteos por grupos **A/B/C** (borrador §7).
- Winrate y expectativa **por bins de score**.
- Tasa y conteo de **ambiguous por score**.
- **Trades/día por score**.

---

## 7. Calidades de grado (borrador — umbrales NO aprobados)

| Grado | Significado preliminar |
|-------|-------------------------|
| **A** | Candidato fuerte de **alerta** (alta calidad relativa en la muestra). |
| **B** | Contexto / **lista de seguimiento**; operar solo con confirmación humana explícita. |
| **C** | Detectado pero **baja calidad**; no promover a alerta estándar. |
| **Rejected** | No trade / no alerta operativa según política futura. |

**Regla:** no aprobar umbrales numéricos hasta **campaña de distribución** y revisión humana (checkpoint E5.9 en §15).

---

## 8. Hoja de ruta “liquidity sweep” (puerta de calidad)

**Eventos posibles a detectar y exportar (lista de trabajo):**

- Barrido **máximo/mínimo del día previo** (PDH/PDL).
- Barrido **máximo/mínimo de la semana previa** (PWH/PWL).
- Barrido de **máximo/mínimo de sesión** (definición de sesión alineada a inputs).
- Barrido del rango **Asia**.
- Barrido **London** high/low.
- Barrido de **swing** local significativo.
- Barrido de **equal highs / equal lows**.

**Fases:**

1. **Detectar y exportar** flags/métricas sin bloquear entradas.
2. Campañas comparativas: **sin filtro**, **sweep requerido**, **sweep ponderado en score**.
3. Solo tras evidencia, valorar compuertas duras selectivas.

---

## 9. Sesión y noticias (diseño deseado)

**Sesión:**

- El mercado puede verse **24/5**; el asistente puede **observar** todo el día.
- **Alertas y “trade ideas”** deben respetar **ventanas configurables** (no hardcode NY-only).

**Noticias:**

- Respetar reglas de bróker/prop mediante **modos** (§4.E).
- No forzar cierre de posición simulada o real por defecto sin política explícita.

**Inputs conceptuales futuros (nombres orientativos):**

- `InpTradeWindowMode`
- `InpTradeStartHour` / `InpTradeEndHour`
- `InpNewsMode`
- `InpNewsBlockBeforeMinutes` / `InpNewsBlockAfterMinutes`

(Implementación = checkpoints E5.11+; contrato exacto en docs de contrato cuando exista.)

---

## 10. Hoja de ruta análisis `ambiguous` — plan E5.6

**Plan formal (cerrado docs-only):** [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md).

Objetivo: reducir incertidumbre **metodológica**, no “esconder” ambigüedades.

**Líneas de trabajo:**

- Tratar `ambiguous` como **0R baseline** vs **−1R conservador** en campañas de sensibilidad.
- Segmentar ambiguous por: **tamaño FVG**, **sesión**, **volatilidad** (proxy ATR/rango), **distancia de entrada** al midpoint.
- Evaluar si el Strategy Tester MQL5 permite **ordenación tick-level** fiable para sub-muestras (investigación técnica; no asumir factibilidad hasta leer limitaciones).
- **Exportar diagnósticos** específicos de ambiguous (campos extra en trades/events) para alimentar análisis off-line.

---

## 11. BridgeEA / representación live — hoja de ruta

BridgeEA y el dashboard deben converger a exportar/renderizar, como mínimo conceptual:

- Sesgo / narrativa **HTF** (aunque sea versión simplificada al inicio).
- **Liquidity swept** (flags y nivel referenciado).
- Zona **FVG / iFVG** activa o candidata.
- **Estado del setup** (idle / candidate / armed / expired / etc., según máquina de estados futura).
- **Dirección** del setup.
- **Entry / SL / TP** teóricos y **RR**.
- **Quality score** y **grado** A/B/C/Rejected.
- **Razones** de permiso o rechazo (texto o códigos estables).
- Estado **sesión / noticia / spread / riesgo**.
- **Elegibilidad de alerta** (sin ejecutar órdenes).

**Contrato compartido:** TestEA y BridgeEA deben compartir el **mismo contrato conceptual** de setup (nombres de campos, semántica, versionado); divergencias solo por limitaciones de entorno deben documentarse.

---

## 12. Riesgo multi-símbolo (futuro)

La frecuencia actual en **solo XAUUSD** es demasiado alta para **multiplicar** ingenuamente por N símbolos.

Motor de riesgo futuro (concepto):

- Máximo **trades/día total** (cartera).
- Máximo **trades/símbolo/día**.
- Máximo **exposición simultánea** (número de setups activos).
- **Correlación** (p. ej. metales + DXY + índices).
- Concentración **USD / risk-on / risk-off**.
- **Cooldown** tras pérdida o tras racha.
- **Bloqueo de pérdida diaria** (prop / operador).

---

## 13. Métricas para decidir cada mejora

Toda mejora se compara contra **baseline** de la campaña aprobada como referencia (p. ej. FVG 2 o el parámetro base elegido):

| Métrica | Uso |
|---------|-----|
| Total trades | Frecuencia bruta. |
| Trades/día | Sobre-operación. |
| Winrate | Calidad direccional (con cautela estadística). |
| TotalR / ExpectancyR | Edge agregado en R. |
| MaxDrawdownR | Riesgo de cola en R. |
| Ambiguous count/rate | Fricción del modelo y calidad de resolución. |
| Rejected count | Efecto de filtros/score. |
| Distribución de score | Calibración futura. |
| Expectativa por grupo A/B/C | Validar grades. |
| Out-of-sample / walk-forward | Anti-sobreajuste (obligatorio antes de “aprobar”). |
| Forward demo / live-read | Comportamiento fuera del tester (E5.13). |

---

## 14. Reglas anti-sobreajuste

- **No** añadir filtros solo porque mejoran **una** campaña cerrada.
- Evitar **explosión de parámetros**; preferir **conceptos robustos** (liquidity, sesión, calidad de desplazamiento) sobre thresholds mágicos sin teoría.
- Exigir evidencia **walk-forward / out-of-sample** antes de declarar setup “aprobado para confianza”.

---

## 15. Checkpoints propuestos (secuencia)

| ID | Contenido |
|----|-----------|
| **E5.5.2** | Este documento: auditoría profesional, decisiones, dudas, roadmap. |
| **E5.6** | Sensibilidad y diagnóstico `ambiguous` (plan cerrado + modos contables + opciones A/B/C) — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md). |
| **E5.6.2** | Evidencia CLI sensibilidad ambigüedad sobre bundles E5.5.1 (E55) — [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md). |
| **E5.7** | Contrato **Entry Quality Score V1** (observación únicamente; sin compuerta dura) — [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md). |
| **E5.8** | **Repo cerrado:** export de score/componentes en `Mapazapp_TestEA` **`MZP_TestEA_E5_8_0`** — [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md); **sin** gate de trading (`InpEntryQualityScoreGateEnabled=false`). |
| **E5.9** | Campaña de **distribución** de score y análisis off-line. |
| **E5.10** | Detección/export de **liquidity sweep** (sin bloqueo inicial). |
| **E5.11** | Filtros/config **sesión + noticias** (inputs acordados). |
| **E5.12** | Contrato BridgeEA de **setup-state** alineado a TestEA. |
| **E5.13** | Compuerta **forward demo / live-readiness** (lectura mercado real, sin confundir con rentabilidad probada). |

**Nota sobre numeración previa:** en documentos antiguos, “E5.6” aparecía como hueco para **`tester_orders`** opcional. Esa pista **no desaparece**: puede ejecutarse **después** de estabilizar calidad/ambigüedad o bajo otro sub-id explícito cuando se documente, para no mezclar dos riesgos distintos (calidad de simulación vs ejecución real en tester).

---

## Anexo — Interpretación de la campaña E5.5.1 (resumen numérico operador)

**Rango aproximado de la narrativa operativa:** 2025-01-01 → 2026-05-11 (según briefing; verificar en `backtest_summary.json` de cada bundle).

**Barrido FVG (tamaño mínimo creciente):** parámetros etiquetados FVG 2 … FVG 50 (según matriz de campaña del operador).

| Variante (FVG) | Trades (aprox.) | Wins / Losses / Ambiguous (FVG 2) | TotalR | ExpectancyR | MaxDD R (donde aplica) |
|----------------|-----------------|-------------------------------------|--------|---------------|------------------------|
| 2 | 1697 | 411 / 507 / **436** | 315 | 0.185622 | 13 |
| 10 | 1669 | (no desglosado en briefing) | 293 | 0.175554 | — |
| 18 | 1630 | — | 297 | 0.182209 | 12 |
| 26 | 1596 | — | 287 | 0.179825 | — |
| 34 | 1544 | — | 276 | 0.178756 | — |
| 42 | 1504 | — | 262 | 0.174202 | — |
| 50 | 1467 | — | 242 | 0.164963 | — |

**Lectura operador (capturada aquí):**

- Resultado **prometedor** en términos de R y expectativa **positiva** en la muestra, pero **insuficiente para aprobación**.
- **~1697 trades** en ~16 meses para **un símbolo** es **demasiada frecuencia** para un asistente que deba escalar a multi-símbolo sin controles; riesgo de **sobre-trading** y fatiga de señal.
- **436 ambiguous** en el escenario más denso es **demasiado alto** para ignorar: exige **estudio sistemático** (E5.6), no solo limpieza contable.
- Post–**E5.6.2**, el análisis de sensibilidad confirma edge en `neutral_zero` / `skip_ambiguous` y colapso bajo `conservative_loss` — ver [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md); el setup sigue **no aprobado**.

---

## Historial del documento

| Versión | Nota |
|---------|------|
| E5.5.2 v1 | Creación: auditoría profesional post–E5.5.1; decisiones y roadmap E5.6+. |
| E5.5.2 v1.1 | Puntero explícito al plan **E5.6** en doc dedicado `AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`. |
| E5.5.2 v1.2 | Puntero a evidencia **E5.6.2** + fila §15; lectura post-análisis ambigüedad. |
| E5.5.2 v1.3 | Puntero a contrato **E5.7** Entry Quality Score V1. |
| E5.5.2 v1.4 | §6: enlace explícito al contrato **E5.7** como fuente formal (weights, §8–§9, `ambiguous_risk_*`). |
| E5.5.2 v1.5 | §15: **E5.8** marcado como cerrado en repo (export score observación; build `MZP_TestEA_E5_8_0`). |
