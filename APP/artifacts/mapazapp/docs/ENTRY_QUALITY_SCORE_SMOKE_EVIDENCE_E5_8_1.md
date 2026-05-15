# Mapazapp — Entry Quality Score: evidencia de smoke E5.8.1 (**E5.8.1**)

**Tipo:** checkpoint **solo documentación** (evidencia de smoke operador + interpretación y calibración).  
**Contexto:** post–**E5.8** ([`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md)); contrato [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md).  
**Relacionado:** [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md), [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md).

---

## 1. Propósito

Registrar una corrida de **smoke** segura del operador sobre **Strategy Tester** con el EA **E5.8** recompilado, y documentar **qué quedó validado**:

- Que la cadena de **export** (summary, trades, eventos) incorpora el **Entry Quality Score V1** en modo **solo observación**.
- Que la **validación** off-line del bundle (`ok=true`, sin errores) sigue cumpliéndose con los nuevos campos.
- Que los **conteos por grado A/B/C** y la ausencia de A/B en esta muestra se interpretan como **hallazgo de calibración**, no como veredicto final sobre la estrategia.

Este documento **no** aprueba compuertas, umbrales ni trading en vivo.

---

## 2. Configuración del smoke

| Campo | Valor |
|--------|--------|
| **Build TestEA** | `MZP_TestEA_E5_8_0` |
| **Ruta del bundle (relativa típica MT5)** | `Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Validación (CLI / bundle)** | `ok=true`, `testEaStatus=valid`, `errors=[]` |
| **Archivos generados** | `backtest_summary.json`, `backtest_events.csv`, `backtest_trades.csv` |
| **Warnings** | Solo **`BUNDLE_EVENTS_LARGE`** |

---

## 3. Flags de resumen del score (valores exactos)

Valores tomados del `backtest_summary.json` del bundle smoke (operador):

- `has_entry_quality_score_logic` = **true**
- `score_observation_only` = **true**
- `score_gate_enabled` = **false**
- `average_entry_quality_score` = **51.428992**
- `average_ambiguous_risk_score` = **45.327048**
- `score_a_count` = **0**
- `score_b_count` = **0**
- `score_c_count` = **1343**
- `score_rejected_count` = **354**

---

## 4. Validación técnica

- El CSV **`backtest_trades.csv`** incluye las columnas de score esperadas (muestra revisada por el operador), entre ellas: `entry_quality_score`, `entry_quality_grade`, `htf_narrative_score`, `liquidity_event_score`, `displacement_fvg_quality_score`, `entry_confirmation_score`, `target_quality_score`, `session_news_spread_score`, `risk_overtrading_score`, `ambiguous_risk_score`, `missing_quality_components`.
- El bundle **valida** con **`ok=true`** y **lista de errores vacía** (`errors=[]`), coherente con la cadena E4.1 / validadores TypeScript documentados en **E5.8**.

**Conclusión técnica:** la exportación **E5.8** funciona a nivel de **pipeline y esquema**; el score está **activo como observación** y **no bloquea** la creación de trades virtuales.

---

## 5. Advertencia de calibración (crítica): A/B = 0

**No** interpretar `score_a_count = 0` y `score_b_count = 0` como prueba definitiva de que **no existen** trades “buenos” en el sentido profesional del producto.

Ese resultado **puede** deberse a una o más causas simultáneas:

1. **Sistema de score incompleto:** varios componentes “profesionales” siguen **sin implementar** o **parciales** (ver §6), de modo que el total **no puede** reflejar aún la narrativa completa que los grades A/B pretenden etiquetar.
2. **Umbrales provisionales A/B demasiado estrictos** para un score **parcial**: se estarían aplicando bandas pensadas para un modelo **futuro** contra un agregado que **aún no** alcanza esos rangos de forma realista.
3. **Calidad mecánica realmente baja** en la cohorte: es **posible**, pero **no** es conclusión operativa hasta **calibración** (distribución, percentiles, techo alcanzable con componentes actuales) y hasta incorporar componentes faltantes.

**Reglas de interpretación:**

- **No** aprobar el score como **compuerta operativa**.
- **No** rechazar la estrategia solo porque A/B = 0 en este smoke.
- Tratar A/B = 0 como **hallazgo de calibración** que exige análisis (**E5.9**), no como fallo técnico del export.

---

## 6. Componentes aún ausentes o parciales (recordatorio)

| Área | Estado (E5.8 / smoke) |
|------|------------------------|
| **Liquidity event** | **No implementado** (puntuación y tipo en modo “none” / marcadores de faltante según EA). |
| **Sesión / noticias / spread** | **No implementado** (buckets de observación; sin señal completa). |
| **Estructura H4/H1 “completa”** | **Parcial / no implementada** como narrativa HTF rica (sesgo D1 + flags de contexto; sin estructura H4/H1 simulada). |
| **Confirmación de entrada / retest** | **Parcial** (midpoint / fill; sin confirmación de vela “humana” completa). |
| **Calidad de objetivo / liquidez del TP** | **Parcial** (geometría y RR; liquidez de objetivo no modelada del todo). |
| **Riesgo / sobre-operación** | **Parcial** (bonus / heurísticas; límites diarios duros no completos). |

---

## 7. Decisión (este checkpoint)

| Decisión | Estado |
|----------|--------|
| **Smoke E5.8 — evidencia técnica** | **PASS** (export y validación coherentes). |
| **Score como filtro / compuerta** | **No aprobado** (permanece observación-only; `score_gate_enabled` debe seguir **false** en esta fase). |
| **Estrategia / setup como “aprobado para confianza operativa”** | **No aprobado** (sigue la línea **E5.5.2**: prometedor bajo refinamiento; sin salto de fase). |
| **Modo score** | **Solo observación**; sin bloqueo de trades virtuales. |
| **Umbrales A/B/C (borrador contrato E5.7 §5)** | **No aprobados** como política de producto ni como gate. |

---

## 8. Dirección E5.9 — calibración y análisis de distribución

**E5.9** debe enmarcarse explícitamente como **calibración y análisis de distribución** del score **antes** de cualquier decisión de umbral o compuerta.

Sobre cohortes exportadas (p. ej. bundles de campaña o smoke ampliado), medir como mínimo:

- `score_min`, `score_max`, media (`score_average` / homólogo en agregados).
- Percentiles **P10, P25, P50, P75, P90** del `entry_quality_score` (y, si aplica, por componente clave).
- Score **por outcome** (`win` / `loss` / `ambiguous` / otros según contrato de conteo declarado).
- Score **por** trades **ambigüos vs no ambiguos**.
- Score **por** bucket / parámetro **FVGMin** (o `InpVirtualMinTradeFvgPoints` / etiqueta de campaña equivalente).
- Comparativas de **colas**: top **10%**, top **25%**, bottom **25%** del score vs métricas de resultado (R, tasa `ambiguous`, frecuencia).
- **Frecuencia** de `missing_quality_components` (y códigos dominantes).
- **Separación:** si el score relativo **separa** mejor vs peor resultado en la muestra disponible.
- **Correlación operativa:** si score alto (relativo) **reduce** tasa o conteo de `ambiguous`; si score alto **reduce** trades/día de forma útil o demasiado agresiva.

**Prerequisito implícito:** contrastar el **máximo alcanzable** con los componentes **actuales** frente al techo teórico de 100 pt del contrato, para no “condenar” umbrales antes de completar pesos y señales.

**Implementación repo (analizador off-line):** [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md) — CLI `mapazapp:testea-score-calibration` (sin MT5).

**E5.9.1 (evidencia):** mismo bundle smoke; salida JSON post–**E5.9.0.1** (`ambiguous_rate` de cohorte); interpretación A/B=0 + decisión “mejorar componentes, no relajar umbrales” — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md).

---

## 9. No objetivos (E5.8.1)

- **No** aprobación de umbrales ni hard gate por score.
- **No** aprobación del setup como listo para despliegue o confianza operativa.
- **No** trading en vivo, **`OrderSend`**, **`CTrade`**, ni expansión de **dashboard** / **launcher**.
- **No** trabajo de API, supervisor, wrapper ni automatización de Strategy Tester desde el repo en este ID.

---

## Historial

| Versión | Nota |
|---------|------|
| E5.8.1 v1 | Evidencia smoke operador + interpretación A/B=0 + dirección E5.9 calibración; docs-only. |
| E5.8.1 v1.1 | Enlace al analizador **E5.9** en repo — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). |
| E5.8.1 v1.2 | Puntero a evidencia operador **E5.9.1** — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md). |
