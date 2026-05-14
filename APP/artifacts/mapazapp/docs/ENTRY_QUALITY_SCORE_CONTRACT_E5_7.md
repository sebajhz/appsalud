# Mapazapp — Entry Quality Score V1 (contrato) — **E5.7**

**Tipo:** checkpoint **solo documentación** (contrato formal).  
**Estado:** **no** implementa puntuación en MQL5 ni TypeScript en este ID; define semántica, componentes, export futuro y cadena de evidencia.  
**Contexto:** post–**E5.6.2** ([`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md)); alineado a auditoría [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md).  
**Relacionado:** [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md).

---

## 1. Purpose

El setup actual en **TestEA** detecta **demasiados** candidatos a trade en ventanas de campaña representativas (p. ej. XAUUSD M15/D1 en **E5.5.1**): alta frecuencia mecánica que **no** replica cómo un trader profesional filtraría oportunidades.

Los outcomes **`ambiguous`** son el **bloqueador principal** entre una lectura “optimista” del baseline (`ambiguous` → 0R) y un riesgo operativo creíble: bajo supuestos conservadores (`conservative_loss`), el edge **no** se sostiene (evidencia **E5.6.2**).

Un trader profesional **no** tomaría **cada** FVG que cumple reglas mínimas. **Entry Quality Score V1** existe para mover el producto de **detección mecánica de patrón** hacia **soporte de decisión contextual** (estilo humano, auditables), reduciendo ruido y ambigüedad **sin** fijar aún umbrales como “verdad” única.

**Filosofía operativa:** el score comienza en modo **observación únicamente**. **No** debe bloquear trades en la primera implementación. La primera entrega técnica (**E5.8**) exportará **componentes** y **total**; las campañas (**E5.9+**) contrastarán si los trades de **mayor score** mejoran, entre otras:

- winrate  
- expectancy (en R)  
- drawdown (en R)  
- tasa y conteo de `ambiguous`  
- trades/día (y trades/sesión)

**No** se definen aquí umbrales finales como compuertas aprobadas: toda calibración numérica queda sujeta a **distribución**, **robustez conceptual** y **evidencia** posterior.

---

## 2. Current setup summary (TestEA baseline)

Comportamiento **actual** del candidato en **Strategy Tester** (`Mapazapp_TestEA`), a nivel documental (detalle en código/contratos E3–E5):

| Elemento | Descripción breve |
|----------|-------------------|
| **Sesgo D1** | Bias diario como contexto de dirección preferida. |
| **Detección FVG M15** | Identificación mecánica de huecos en velas cerradas M15 (parametrización p. ej. tamaño mínimo FVG en campañas). |
| **Alineación con bias diario** | Gate de coherencia direccional con el sesgo evaluado. |
| **Entrada virtual** | Punto medio (**midpoint**) conceptual de la zona FVG. |
| **Stop** | Anclado al **límite** del FVG según dirección. |
| **Take-profit** | **2R** respecto al riesgo definido por esa geometría. |
| **Outcome `ambiguous`** | Desenlace no resoluble de forma única con la resolución OHLC/M15 acordada para el orden intrabar SL vs TP. |
| **Export** | Bundles TestEA (`backtest_summary.json`, `backtest_trades.csv`, eventos según contrato) para análisis off-line. |

Este baseline es **útil** para medir motor, geometría virtual y sensibilidad a `ambiguous`, pero **no** representa aún un proceso discrecional profesional completo (liquidity narrative, retest humano, sesión/noticias, cartera multi-símbolo, etc.).

---

## 3. Score principles

| ID | Principio | Significado |
|----|-----------|-------------|
| **A** | **Observation first** | No usar el score como **compuerta dura** hasta que la evidencia lo respalde. Primero: exportar, segmentar, medir. |
| **B** | **Component transparency** | Cada punto debe tener **razón** trazable (códigos/texto estable en exports). |
| **C** | **BridgeEA parity** | Todo componente del score debe ser **representable** después en **BridgeEA** y en el **dashboard** (misma semántica; implementación puede diferir por entorno). |
| **D** | **Avoid overfitting** | Evitar explosión de umbrales “mágicos”; preferir **conceptos de mercado robustos** (liquidez, desplazamiento, estructura, sesión) con bandas amplias. |
| **E** | **Reduce ambiguity** | Objetivo explícito: bajar **`ambiguous_rate`**, no solo maximizar **TotalR**. |
| **F** | **Reduce overtrading** | Vigilar **trades/día** y **trades/sesión** como métricas de producto, no solo R acumulado. |

---

## 4. Proposed score components (weights provisional)

**Total borrador: 100 puntos.** Los pesos son **punto de partida**; deben **validarse** con campañas (**E5.9+**). Los nombres de campo exportables se alinean a §9.

### 4.1 HTF Narrative Score — **20 pt** (borrador)

**Propósito:** medir si el contexto **D1 / H4 / H1** apoya el trade (narrativa multi-timeframe).

**Señales orientativas (no exhaustivas):**

- Sesgo **D1** alineado con la dirección del setup.  
- **H4/H1** sin conflicto fuerte con la dirección.  
- Precio **no** “a mitad de rango” opaco sin estructura clara.  
- Estructura (swing / BOS conceptuales) coherente con la dirección.

**Nombre componente export:** `htf_narrative_score` (ver §9).

### 4.2 Liquidity Event Score — **20 pt** (borrador)

**Propósito:** medir si hubo **toma de liquidez** relevante antes o en el contexto del setup.

**Eventos posibles (detección/export primero en **E5.10**; aquí solo contrato conceptual):**

- Barrido **máximo/mínimo del día previo** (PDH/PDL).  
- Barrido **máximo/mínimo de la semana previa** (PWH/PWL).  
- Barrido de **máximo/mínimo de sesión** (definición de sesión acordada a inputs).  
- Barrido del rango **Asia**.  
- Barrido **London** high/low.  
- Barrido de **swing** local significativo.  
- Barrido de **equal highs / equal lows**.

**Nombre componente export:** `liquidity_event_score`; tipo/discretización: `liquidity_event_type` (§9).

**Regla explícita:** **no** convertir “liquidity sweep” en **compuerta dura** de inmediato; primero **detectar/exportar** y comparar en campañas.

### 4.3 Displacement / FVG Quality Score — **15 pt** (borrador)

**Propósito:** distinguir FVG **significativo** de ruido.

**Señales orientativas:**

- Tamaño del FVG en **puntos** vs **ATR** (o proxy de volatilidad).  
- Fuerza del cuerpo de la vela de **desplazamiento**.  
- Imbalance “limpio” vs micro-ruido.  
- **No** demasiado pequeño (umbral a calibrar con datos, no dogma).  
- **No** creado en “dead range” / chop evidente (proxy documentado en implementación).  
- **No** demasiado lejos del “origen” / desplazamiento que lo generó (definición en implementación).

**Nombre componente export:** `displacement_fvg_quality_score`.

### 4.4 Entry / Retest Confirmation Score — **15 pt** (borrador)

**Propósito:** medir si el comportamiento de entrada muestra **reacción** en la zona, no solo toque mecánico del midpoint.

**Señales orientativas:**

- Retest **limpio** de la zona.  
- Vela de **rechazo** o absorción razonable.  
- **Sin** atravesamiento inmediato completo “sin respeto” de la zona.  
- Entrada **no** excesivamente tardía respecto al desplazamiento.  
- **Sin** vela de riesgo ambiguo (rango extremo vs riesgo del trade).  
- Cierre de **confirmación** opcional según modo configurable.

**Nombre componente export:** `entry_confirmation_score`.

### 4.5 Target Quality Score — **10 pt** (borrador)

**Propósito:** evaluar si el **TP** tiene sentido contextual, no solo si la etiqueta “2R” existe.

**Señales orientativas:**

- TP orientado hacia **liquidez** / objetivo estructural creíble.  
- **RR** realista dado spread, volatilidad y estructura.  
- Objetivo **no** “dentro de” estructura opuesta inmediata obvia.  
- Stop **lógico** y **no** absurdamente ajustado vs ruido.  
- Camino esperado **no** bloqueado por nivel obvio intermedio (sin dogma de un solo threshold).

**Nombre componente export:** `target_quality_score`.

### 4.6 Session / News / Spread / Volatility Score — **10 pt** (borrador)

**Propósito:** medir si el **timing** y el **entorno** son aceptables para alerta humana.

**Señales orientativas:**

- Dentro de **ventana de trade** permitida (inputs).  
- **Spread** aceptable vs política.  
- **Volatilidad** no en bucket “extremo/ruidoso” según definición implementada.  
- **Modo noticias** permite nuevas entradas (o marca observación).  
- **No** durante rollover / mala liquidez **salvo** configuración explícita que lo permita.

**Nombre componente export:** `session_news_spread_score` (estado auxiliar: `session_bucket`, `news_mode`, `trade_window_status`, `spread_status` — §9).

### 4.7 Risk / Overtrading Score — **10 pt** (borrador)

**Propósito:** medir si el **sistema** debería permitir **otro** trade en ese contexto (cartera / sesión / día).

**Señales orientativas:**

- **Máx. trades/día** no superado.  
- **Máx. trades/sesión** no superado.  
- **Cooldown** post-pérdida respetado (si aplica).  
- **Límite de pérdida diaria** no alcanzado.  
- **Sin** duplicar exposición **correlacionada** obvia (definición en implementación).

**Nombre componente export:** `risk_overtrading_score`.

### 4.8 Total

`entry_quality_score` = suma ponderada de los siete componentes según la tabla de §4, **versión** `entry_quality_score_version` (campo futuro recomendado en summary o por trade — a definir en **E5.8** al congelar columnas).

---

## 5. Score grades (provisional — not approved thresholds)

| Grade | Meaning (draft) |
|-------|------------------|
| **A** | Candidato fuerte de **alerta** (alta calidad relativa en la muestra). |
| **B** | **Watchlist** / contexto; requiere confirmación humana explícita. |
| **C** | Detectado pero **baja calidad**; no promover a alerta estándar. |
| **Rejected** | Falla **condiciones requeridas** o calidad demasiado baja según política futura. |

**Bandas numéricas borrador (no aprobadas):**

| Grade | Band (draft) |
|-------|----------------|
| **A** | **≥ 80** |
| **B** | **65 – 79** |
| **C** | **50 – 64** |
| **Rejected** | **< 50** *(o hard gate — §6)* |

**Regla:** la primera implementación (**E5.8**) debe exportar `entry_quality_grade` **para análisis**, no como verdad operativa. La calibración final de bandas es **E5.9+** con distribución y revisión humana.

---

## 6. Hard gates vs soft score

### 6.1 Candidatos a **hard gate** (futuro — no activar todos en E5.8)

Condiciones que podrían **rechazar** el setup o marcar `Rejected` **sin** depender del score “suave”:

- Geometría de **riesgo inválida** (SL/TP/entry incoherentes o no computables).  
- **Sesgo diario faltante** o no evaluable según contrato (si el modo de campaña lo exige).  
- **Spread demasiado alto** vs política dura.  
- Fuera de **reglas bróker/prop** en modo estricto (si se implementa política explícita).  
- **Pérdida diaria máxima** ya alcanzada (riesgo cuenta / simulación asistente).  
- **Máximo trades/día** excedido.

### 6.2 **Soft score** (componentes suaves en E5.8+)

Deben puntuarse y exportarse primero como **observación**:

- Calidad de **liquidity** / evento de liquidez.  
- Calidad de **desplazamiento** / FVG.  
- Calidad de **objetivo** (TP) y stop “humano”.  
- Preferencia de **sesión** / entorno.  
- Confianza de **narrativa HTF**.  
- Calidad de **retest** / confirmación.

### 6.3 Regla explícita: liquidity sweep

**No** promover “sweep obligatorio” como compuerta dura en el primer ciclo. **Primero:** detectar, tipificar (`liquidity_event_type`) y **exportar**; comparar métricas con y sin filtro en campañas (**E5.10**–**E5.9**).

---

## 7. Ambiguity reduction link

El score debe ayudar a **anticipar** condiciones que correlacionan con **`ambiguous`** en el simulador actual, sin pretender sustituir la resolución formal del outcome.

**Features de riesgo de ambigüedad (orientativas):**

- FVG **muy pequeño** (geometría frágil).  
- Entry / SL / TP **demasiado cercanos** en el espacio de precio.  
- Rango de vela **grande** vs riesgo del trade (proxy de caos intrabar).  
- **SL y TP alcanzables** dentro de la **misma** vela bajo la resolución adoptada.  
- Bucket de **alta volatilidad**.  
- Entrada **tardía** tras el desplazamiento.  
- **Sin** confirmación de retest.  
- **Mala sesión** / condiciones ruidosas.

**Exports dedicados (futuro):**

- `ambiguous_risk_score` — sub-score o índice **observacional** (0–100 o escala acordada en **E5.8**).  
- `ambiguous_risk_reasons` — lista estable de códigos o texto compacto (misma regla de transparencia que §3.B).

Estos campos **no** sustituyen el outcome `ambiguous` del simulador; **alimentan** análisis y diseño de filtros.

---

## 8. Metrics required for future campaigns (E5.8 / E5.9+)

### 8.1 By score band (o grade A/B/C/Rejected)

Las campañas futuras deben poder agregar:

| Métrica | Notas |
|---------|--------|
| `trade_count` | Trades en la banda. |
| `trades_per_day` | Frecuencia diaria media (definición de “día” = contrato de campaña). |
| `winrate` | Sobre outcomes no ambiguos o según modo contable declarado. |
| `totalR` | Suma R. |
| `expectancyR` | Expectativa en R por trade contado. |
| `maxDrawdownR` | Peor racha/drawdown en R según definición actual del pipeline. |
| `ambiguous_count` | Conteo de `ambiguous`. |
| `ambiguous_rate` | `ambiguous` / trades relevantes (declarar denominador). |
| `conservative_loss_totalR` | Modo **E5.6** −1R por `ambiguous` (u homólogo documentado). |
| `skip_ambiguous_expectancy` | Expectativa sobre trades contados excluyendo ambiguos (u homólogo). |
| `score_A_count` / `score_B_count` / `score_C_count` / `rejected_count` | Conteos por **grade** exportado. |

### 8.2 By component (promedios en la cohorte)

Promedios aritméticos (u otra estadística declarada) de:

- `htf_narrative_score`  
- `liquidity_event_score`  
- `displacement_fvg_quality_score`  
- `entry_confirmation_score`  
- `target_quality_score`  
- `session_news_spread_score`  
- `risk_overtrading_score`  

**Objetivo:** ver qué componente explica mejor la mejora de `ambiguous_rate` y de `expectancyR` sin sobreajustar un solo umbral.

---

## 9. Data / export contract draft (future columns)

**No implementado en E5.7.** Campos previstos para `backtest_trades.csv` y/o `backtest_events.csv` (nombres en **snake_case**; orden final en **E5.8** + `EXPORT_CONTRACT.md`):

| Field | Role |
|-------|------|
| `entry_quality_score` | Total 0–100 (versión algoritmo en metadata separada). |
| `entry_quality_grade` | `A` / `B` / `C` / `Rejected` (según §5 provisional hasta evidencia). |
| `htf_narrative_score` | Puntos componente HTF. |
| `liquidity_event_score` | Puntos evento de liquidez. |
| `displacement_fvg_quality_score` | Puntos desplazamiento / FVG. |
| `entry_confirmation_score` | Puntos retest / confirmación. |
| `target_quality_score` | Puntos TP / path. |
| `session_news_spread_score` | Puntos sesión/noticias/spread/vol. |
| `risk_overtrading_score` | Puntos riesgo / sobre-operación. |
| `ambiguous_risk_score` | Sub-score riesgo de ambigüedad (§7). |
| `quality_reasons` | Razones **positivas** / ponderación (códigos o texto estable). |
| `reject_reasons` | Razones de **rechazo** o hard gate (códigos o texto estable). |
| `liquidity_event_type` | Enum / etiqueta del evento detectado (puede ser vacío si N/A). |
| `session_bucket` | Bucket de sesión (definición en implementación). |
| `news_mode` | Modo noticias vigente al evento. |
| `trade_window_status` | Dentro/fuera de ventana, etc. |
| `spread_status` | OK / warn / block (según política). |

**Compatibilidad:** cualquier nuevo campo debe pasar por validadores TS y documentación de esquema (**E3.6** / `EXPORT_CONTRACT.md`) en **E5.8**.

---

## 10. BridgeEA / dashboard implications

**BridgeEA** (live, read-only) debe converger a representar la misma **historia** que el tester:

- **Estado del setup** (máquina de estados futura: idle / candidate / armed / expired / …).  
- **Score total** y **grade**.  
- **Puntuaciones por componente** + **razones** (`quality_reasons` / `reject_reasons`).  
- **Liquidity swept** (flags + nivel referenciado cuando aplique).  
- **Sesgo HTF** (al menos D1 al inicio; H4/H1 cuando existan inputs).  
- **Zona FVG** activa o candidata (geometría).  
- **Entry / SL / TP / RR** teóricos.  
- Estado **sesión / noticias / spread / riesgo**.  
- **Alert eligibility** — si el setup **puede** generar alerta humana, sin ejecutar órdenes.

El **dashboard** no debe limitarse a “compra/vende”: debe **explicar** por qué el setup es o **no** es tradable en el sentido de asistente (transparencia §3.B).

---

## 11. Multi-symbol implications

XAUUSD solo ya mostró **alta frecuencia** de candidatos; multi-símbolo amplifica riesgo de **sobre-operación** y clusters correlacionados.

**Requisitos de producto (concepto):**

- Máximo **trades por símbolo / día**.  
- Máximo **trades totales / día** (cartera).  
- **Correlación** y exposición simultánea.  
- **Riesgo de cartera** agregado.  
- Conciencia de **exposición USD** y agrupación **risk-on / risk-off**.  
- **Cooldowns** tras pérdidas o eventos.

**Regla de diseño:** el Entry Quality Score **no** debe estar **hardcodeado** por símbolo; pesos, umbrales suaves y políticas deben ser **configurables por símbolo** (y por cuenta/modo en fases futuras).

---

## 12. Anti-overfitting rules

- **No** “aprobar” el score porque un único umbral mejora **una** campaña puntual.  
- Exigir **análisis de distribución** (histogramas, deciles, bins).  
- Planificar **out-of-sample** / **walk-forward** antes de declarar confianza en el setup (coherente con V2-15 y auditoría **E5.5.2**).  
- Preferir **bandas amplias** de score sobre micro-umbrales.  
- Conservar **exports crudos por componente** para análisis retrospectivo y revisiones de pesos.

---

## 13. Proposed next checkpoints

| ID | Contenido |
|----|-----------|
| **E5.7** | Contrato **Entry Quality Score V1** (este documento). |
| **E5.8** | Implementar **export** de score y componentes en **TestEA** — **solo observación**; sin bloqueo de trades. |
| **E5.9** | **Campaña de distribución** del score sobre candidatos FVG existentes; análisis off-line vs métricas §8. |
| **E5.10** | **Detección y export** de liquidity sweep (flags/tipos); sin compuerta dura inicial. |
| **E5.11** | Filtros / inputs configurables de **sesión** y **noticias**. |
| **E5.12** | Contrato **BridgeEA** de **setup-state** alineado a TestEA. |
| **E5.13** | Compuerta **forward demo / live-readiness** (lectura real; sin confundir con rentabilidad probada). |

---

## 14. Non-goals (E5.7)

- **No** aprobación de trading en vivo.  
- **No** `OrderSend` ni **`CTrade`**.  
- **No** `tester_orders` en este contrato.  
- **No** expansión de **dashboard** ni **launcher**.  
- **No** umbrales finales de score aprobados como política de producto.  
- **No** aprobación del **setup** como “listo para confianza operativa”.

---

## Historial

| Versión | Nota |
|---------|------|
| E5.7 v1 | Contrato formal: 7 componentes (100 pt borrador), grades provisionales, exports §9, métricas §8, parity BridgeEA §10. |
| E5.7 v1.1 | **E5.8** implementa la primera exportación en TestEA (observación) — ver [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md). |
