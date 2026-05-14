# Mapazapp — Contrato Entry Quality Score V1 (E5.7)

**Tipo:** contrato de producto / motor (solo documentación en este checkpoint).  
**Prerrequisitos:** evidencia ambigüedad [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md) (**E5.6.2**); auditoría [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) (**E5.5.2**).  
**Relacionado:** [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

**Alcance E5.7:** define **qué** debe medir Mapazapp como calidad de entrada **antes** de que un setup sea candidato a alerta operable. **No** implementa score en MQL5 ni en TypeScript en este commit.

---

## 1. Propósito

- El setup actual en TestEA **genera demasiadas operaciones** en la muestra XAUUSD M15/D1 (alta frecuencia frente a un asistente multi-contexto).
- Los outcomes **`ambiguous`** son el **bloqueador principal** frente a aprobación bajo supuestos conservadores (E5.6.2).
- Un trader profesional **no** toma cada FVG mecánico: filtra por contexto, liquidez tomada, calidad del desplazamiento, retest, objetivo y régimen de sesión/volatilidad.
- **Entry Quality Score V1** mueve el foco de “detección puramente mecánica de patrón” hacia **soporte a la decisión con contexto**, alineado con el rol de Mapazapp como asistente.
- El score debe **reducir ruido** y **presionar a la baja** la tasa de ambiguos **sin** sustituir aún la compuerta humana por umbrales rígidos no validados (riesgo de sobreajuste).

---

## 2. Resumen del setup actual (TestEA)

Comportamiento documentado hasta E5.5.x / E5.6.x (baseline de campaña):

- **Sesgo D1** como compuerta de contexto.
- **Detección de FVG en M15** como disparador de candidato.
- **Alineación con sesgo diario** (coherencia direccional).
- **Entrada virtual en punto medio** del FVG (simulación acordada E5.2+).
- **Stop en límite del FVG** (geometría virtual).
- **Objetivo 2R** en el escenario de campaña documentado.
- Outcome virtual incluyendo **`ambiguous`** cuando SL y TP son ambiguos intrabar bajo reglas OHLC acordadas.
- **Exports** vía bundles TestEA (`backtest_summary.json`, `backtest_trades.csv`, eventos según contrato).

Este baseline es **útil para evidencia y sensibilidad**, pero **no** representa aún un proceso discrecional profesional completo. El score V1 formaliza el puente hacia ese estándar, empezando en modo **observación**.

---

## 3. Principios del score

| ID | Principio | Descripción |
|----|-------------|-------------|
| **A** | **Observación primero** | No usar el score como **compuerta dura** hasta que campañas (E5.9+) demuestren utilidad y estabilidad fuera de un solo barrido. |
| **B** | **Transparencia por componente** | Cada punto debe ser **explicable** (razones legibles humano + máquina). |
| **C** | **Paridad BridgeEA** | Todo componente debe ser **representable** después en BridgeEA/dashboard (misma semántica, distinto transporte). |
| **D** | **Evitar sobreajuste** | Pocos umbrales “mágicos”; preferir **conceptos de mercado robustos** y bandas anchas. |
| **E** | **Reducir ambigüedad** | Objetivo explícito: bajar **`ambiguous_rate`**, no solo maximizar `TotalR` bajo `neutral_zero`. |
| **F** | **Reducir sobre-trading** | Vigilar **trades/día** y **trades/sesión** como señales de calidad operativa y fatiga de señal. |

---

## 4. Componentes propuestos del score (pesos provisionales)

**Total borrador: 100 puntos.** Los pesos son **punto de partida**; deben **validarse** con campañas (E5.8–E5.9) y análisis de distribución.

### 4.1 HTF Narrative Score — **20 pt** (provisional)

**Propósito:** medir si el contexto D1/H4/H1 apoya la operación.

**Señales (no exhaustivo):** sesgo D1 alineado; H4/H1 no en conflicto fuerte; precio no en “medio rango” opaco sin estructura; estructura (BOS/CHoCH u equivalente documentado) coherente con la dirección.

### 4.2 Liquidity Event Score — **20 pt** (provisional)

**Propósito:** medir si hubo **toma de liquidez** antes del setup.

**Eventos posibles (catálogo inicial):** sweep PDH/PDL; PWH/PWL; máximos/mínimos de sesión; rango Asia; London high/low; swing local; equal highs/lows.

**Nota:** en V1 **no** convertir liquidez en compuerta dura de inmediato; primero **detectar/exportar** y contrastar con métricas (E5.10 puede profundizar).

### 4.3 Displacement / FVG Quality Score — **15 pt** (provisional)

**Propósito:** distinguir FVG **significativo** de ruido.

**Señales:** tamaño del FVG vs puntos/ATR; fuerza del cuerpo de vela de desplazamiento; imbalance “limpio”; no demasiado pequeño; no creado en rango muerto; distancia razonable al origen del impulso.

### 4.4 Entry / Retest Confirmation Score — **15 pt** (provisional)

**Propósito:** medir si la entrada muestra **reacción**, no solo toque mecánico del midpoint.

**Señales:** retest limpio; vela de rechazo; sin atravesada inmediata completa; entrada no excesivamente tardía; vela de riesgo de ambigüedad no dominante; cierre de confirmación opcional si se define en contrato de simulación.

### 4.5 Target Quality Score — **10 pt** (provisional)

**Propósito:** coherencia del TP con liquidez y estructura.

**Señales:** TP orientado hacia liquidez visible; RR realista; TP no directamente contra estructura opuesta inmediata; SL lógico y no absurdamente estrecho; camino esperado no bloqueado por nivel obvio sin explicación.

### 4.6 Session / News / Spread / Volatility Score — **10 pt** (provisional)

**Propósito:** timing aceptable para el modo de operación.

**Señales:** dentro de ventana de operación permitida; spread aceptable; volatilidad no en cubeta “extrema/ruidosa” salvo modo explícito; modo noticias permite nuevas entradas; evitar rollover / mala liquidez salvo configuración consciente.

### 4.7 Risk / Overtrading Score — **10 pt** (provisional)

**Propósito:** si el **sistema** debe permitir otra operación en ese contexto.

**Señales:** no superar máx. trades/día; máx. trades/sesión; cooldown tras pérdida; límite de pérdida diaria no alcanzado; sin duplicar exposición correlacionada obvia.

---

## 5. Grados de calidad (provisionales)

Solo para **etiquetado y análisis** en la primera implementación; **no** son umbrales aprobados oficialmente.

| Grado | Rol sugerido |
|--------|----------------|
| **A** | Candidato de alerta de **alta** calidad. |
| **B** | Watchlist / contexto favorable pero no prioritario. |
| **C** | Detectado; baja calidad relativa. |
| **Rejected** | Incumple condiciones mínimas o score demasiado bajo. |

**Bandas numéricas borrador (no aprobadas):**

| Grado | Rango puntos (borrador) |
|--------|-------------------------|
| A | ≥ 80 |
| B | 65–79 |
| C | 50–64 |
| Rejected | Por debajo de 50 puntos (borrador) |

La primera implementación debe **exportar** `entry_quality_score` y `entry_quality_grade` para análisis; **no** bloquear trades automáticamente por estas bandas.

---

## 6. Compuestas duras vs score blando

### 6.1 Candidatas a **compuerta dura** (solo tras contrato y evidencia; no en E5.7)

- Geometría de riesgo inválida.
- Sesgo diario ausente cuando el modo de operación lo exige.
- Spread por encima de umbral de seguridad acordado.
- Fuera de reglas broker/prop en **modo estricto** documentado.
- Pérdida diaria máxima alcanzada.
- Máximo trades/día alcanzado.

### 6.2 Componentes que deben empezar **blandos** (score + razones)

- Calidad de liquidez tomada.
- Calidad de desplazamiento / FVG.
- Calidad de objetivo.
- Preferencia de sesión.
- Confianza narrativa HTF.
- Calidad de retest.

**Importante:** el **liquidity sweep** no debe ser compuerta dura en el primer pase; primero **detección + export + campaña** (alineado E5.10).

---

## 7. Vínculo con reducción de `ambiguous`

El score debe orientar features hacia **menor riesgo de empate SL/TP intrabar** y geometrías “frágiles”.

**Ejemplos de factores de riesgo de ambigüedad (catálogo inicial):**

- FVG muy pequeño.
- SL/TP demasiado cercanos en puntos o vs rango de vela.
- Rango de vela grande vs distancia de riesgo.
- SL y TP alcanzables en la misma agregación temporal bajo reglas actuales.
- Cubeta de alta volatilidad.
- Entrada tardía tras el desplazamiento.
- Sin confirmación de retest.
- Sesión ruidosa / condiciones desfavorables.

**Export mínimo futuro (conceptual):**

- `ambiguous_risk_score` (sub-score o índice 0–N acordado en implementación).
- `ambiguous_risk_reasons` (tokens o texto controlado para análisis; sin fugas de datos sensibles).

---

## 8. Métricas exigidas en campañas futuras (E5.8 / E5.9)

### 8.1 Por **banda de score** (A / B / C / Rejected)

- `trade_count`
- `trades_per_day`
- `winrate`
- `totalR`
- `expectancyR`
- `maxDrawdownR`
- `ambiguous_count`
- `ambiguous_rate`
- `conservative_loss_totalR` (o equivalente reproducible vía analizador E5.6.1)
- `skip_ambiguous_expectancy`
- `score_A_count`, `score_B_count`, `score_C_count`, `rejected_count`

### 8.2 Por **componente** (promedios en la cohorte)

- Media **HTF Narrative**
- Media **Liquidity Event**
- Media **Displacement / FVG Quality**
- Media **Entry / Retest Confirmation**
- Media **Target Quality**
- Media **Session / News / Spread / Volatility**
- Media **Risk / Overtrading**
- (Opcional) media **`ambiguous_risk_score`**

---

## 9. Borrador de contrato de datos / export (futuro)

**No implementar en E5.7.** Campos candidatos en `backtest_trades.csv` y/o `backtest_events.csv`:

- `entry_quality_score`
- `entry_quality_grade`
- `htf_narrative_score`
- `liquidity_event_score`
- `displacement_fvg_quality_score`
- `entry_confirmation_score`
- `target_quality_score`
- `session_news_spread_score`
- `risk_overtrading_score`
- `ambiguous_risk_score`
- `quality_reasons`
- `reject_reasons`
- `liquidity_event_type`
- `session_bucket`
- `news_mode`
- `trade_window_status`
- `spread_status`

La versión final de nombres, tipos y obligatoriedad se congelará al alinear **`EXPORT_CONTRACT.md`** en el checkpoint de implementación (E5.8+).

---

## 10. Implicaciones BridgeEA / dashboard

**BridgeEA** (fase posterior) deberá poder representar, como mínimo:

- Estado de setup coherente con TestEA.
- Score total y grado.
- Puntuaciones por componente.
- Razones (`quality_reasons` / `reject_reasons` / sub-razones).
- Liquidez tomada (tipo de evento).
- Sesgo HTF y zona FVG.
- Entrada / SL / TP / RR (según contrato de exposición al trader).
- Estado de sesión / noticias / spread / riesgo.
- **Elegibilidad de alerta** como etiqueta explicativa, no como “orden lista”.

El **dashboard** no debe limitarse a buy/sell: debe **explicar** por qué el setup es o no operable en el marco asistente, sin expandir alcance de ejecución antes de decisión explícita del PM.

---

## 11. Implicaciones multi-símbolo

La campaña XAUUSD ya mostró **frecuencia alta** de trades; en multi-símbolo se requiere:

- Máximo trades por **símbolo** / día.
- Máximo trades **totales** / día.
- Conciencia de **correlación** y exposición duplicada.
- Riesgo de **cartera** (agregación).
- Conciencia de exposición **USD** y agrupación risk-on / risk-off.
- **Cooldowns** entre operaciones correlacionadas.

El Entry Quality Score **no** debe estar hardcodeado por símbolo: parámetros y umbrales (donde existan) deben ser **configurables por símbolo** y por modo de operación.

---

## 12. Reglas anti-sobreajuste

- No “aprobar” el score porque un único umbral funciona en **una** campaña.
- Exigir **análisis de distribución** (colas, estabilidad por banda, robustez vs `ambiguous`).
- Planificar **out-of-sample / walk-forward** en fases posteriores (fuera del alcance mínimo de E5.7).
- Preferir **bandas anchas** de score frente a cortes exactos.
- Conservar **export crudo de componentes** para ML ligero o revisión humana posterior.

---

## 13. Checkpoints propuestos (secuencia)

| ID | Contenido |
|----|-----------|
| **E5.7** | Contrato Entry Quality Score V1 (**este documento**). |
| **E5.8** | Implementar export de score en TestEA, **solo observación**. |
| **E5.9** | Campaña de distribución de score sobre candidatos FVG existentes. |
| **E5.10** | Detección y export de **liquidity sweep**. |
| **E5.11** | Filtros sesión + noticias configurables. |
| **E5.12** | Contrato BridgeEA **setup-state** alineado a TestEA. |
| **E5.13** | Compuerta forward demo / live-readiness (sin confundir con rentabilidad probada). |

---

## 14. No objetivos (E5.7)

- No aprobación de trading en vivo.
- No `OrderSend` / `CTrade`.
- No track **`tester_orders`** en este hilo.
- No expansión de dashboard ni nuevas rutas de acción.
- No trabajo de launcher.
- No fijación de **umbrales finales** de score como verdad oficial.
- No aprobación del setup motor; E5.7 solo **contrata** el camino.

---

## Historial

| Versión | Nota |
|---------|------|
| E5.7 v1 | Contrato formal score V1; implementación diferida a E5.8+. |
