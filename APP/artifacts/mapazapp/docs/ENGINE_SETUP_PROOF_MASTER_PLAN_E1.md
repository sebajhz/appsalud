# Mapazapp — Engine Setup Proof Master Plan E1

## 1. Purpose

- Mapazapp nació como **asistente de decisiones de trading** con gobernanza y evidencia; **no** como un sistema que deba ejecutar órdenes de forma automática o ciega.
- El **objetivo operativo actual** es **probar si el setup tiene edge** (ventaja estadística o estructural defendible) sobre datos históricos reproducibles, **antes** de ampliar superficie de runtime, empaquetado o ejecución.
- La rama **runtime / launcher / supervisores / wrapper** avanzó hasta prototipos documentados y código de wrapper mínimo (**D13.x–D14.7**); ahora se declara una **pausa estratégica** en la **expansión de runtime**: no se prioriza **`.exe`**, **installer**, **packaging**, **MT5 live**, **watcher**, **POST**, **action endpoints** ni trading real.
- **E1** (este documento) es el **plan maestro** para la fase **Engine Setup Proof**: ordenar **setup**, **daily bias**, **backtest**, **evidencia** y, **después**, visualización en dashboard.
- **E1 es solo documentación / análisis**: no implementa código ni ejecuta procesos.

**Relacionado:** [`ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md`](./ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md) (**E2** — inventario motor y contrato Setup V1 / Daily Bias V1), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md), [`TESTING_AND_VALIDATION_STRATEGY.md`](./TESTING_AND_VALIDATION_STRATEGY.md), [`V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md`](./V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md), [`V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md`](./V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md), [`V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md`](./V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md), [`V2_08_ENTRY_VARIANT_MODEL.md`](./V2_08_ENTRY_VARIANT_MODEL.md), [`V2_09_TARGET_LIQUIDITY_OBJECTIVE_MODEL.md`](./V2_09_TARGET_LIQUIDITY_OBJECTIVE_MODEL.md), [`V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md`](./V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md), [`V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`](./V2_11_MANUAL_CANDLE_DATASET_IMPORT.md), [`V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`](./V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md), [`V2_14_PARAMETER_SET_GRID_RUNNER_V1.md`](./V2_14_PARAMETER_SET_GRID_RUNNER_V1.md), [`V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`](./V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`REAL_WRAPPER_PROTOTYPE_GATE_D14.md`](./REAL_WRAPPER_PROTOTYPE_GATE_D14.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current project state

| Área | Estado (alto nivel) |
|------|---------------------|
| **Core de estrategia** | Modelos y piezas V2 (IFVG, decisión, contexto HTF, variantes de entrada, objetivos de liquidez, etc.) documentadas e implementadas en `@workspace/mapazapp-core`. |
| **Replay / backtest** | Pipelines de replay/backtest y campañas (`runBacktestCampaign`, ranking, grid, walk-forward) alineados a docs V2-10–V2-15. |
| **Import CSV / dataset manual** | Import en memoria, adaptadores de campaña y validación de muestras (V2-11, V2-12, V2-13). |
| **Parameter grid / walk-forward** | Herramientas para robustez y splits train/validation/forward (V2-14, V2-15). |
| **Dashboard / API / runtime local** | Capa mock/evidencia GET (V2-16), supervisores y wrapper local (**D13–D14.7**) existen como herramientas de desarrollo; **no** son el foco inmediato. |
| **Prueba seria del setup** | **Pendiente de sistematizar**: hace falta **contrato de setup V1**, **datasets** con diagnóstico, **métricas** y **evidencia** bajo una campaña única, con **daily bias** como compuerta explícita. |

**Mapazapp is not ready for live trading. The next proof must be about strategy validity, not runtime expansion.**

---

## 3. Strategic pause

- **D14.7** (wrapper real mínimo) **existe en el repo**, pero la **expansión de runtime** (nuevas features de launcher, empaquetado producto, `.exe`, installer, MT5 live, watcher, `POST` operativo, action transport) queda **en pausa** hasta tener **evidencia de motor/setup** creíble.
- **No** se avanza ahora con: **wrapper como producto**, **`.exe`**, **installer**, **packaging**, **MT5 live**, **watcher**, **`POST`**, **action endpoints**, **ejecución asistida en cuenta real**.
- **Prioridad reordenada:**
  1. **Setup** (definición canónica + reglas de invalidación).
  2. **Daily bias** (compuerta antes de entrada).
  3. **Backtest** (histórico reproducible).
  4. **Evidencia** (runs versionados, métricas, rechazos).
  5. **Dashboard de resultados** (solo **después** de evidencia; lectura/visualización, sin invertir el orden).

---

## 4. Core trading hypothesis

**Hipótesis principal:** el sistema debe detectar **setups alineados con el daily bias**. Si el daily bias es **bajista**, una entrada **alcista** debe **cancelarse**. Si el daily bias es **alcista**, una entrada **bajista** debe **cancelarse**.

**Reglas conceptuales (E1 / prueba inicial):**

- Daily bias **bullish** → solo **longs** permitidos.
- Daily bias **bearish** → solo **shorts** permitidos.
- Daily bias **neutral** / **unclear** → **no operar** por defecto en la prueba inicial (**E1**/**E2** de campaña de bias; ver §6).
- Setup **contrario al bias** → **invalidated** / rechazado.
- Setup **sin bias válido** → **skipped**.
- El **bias se calcula antes** del setup a nivel de decisión de la corrida (orden lógico de evaluación).
- El **setup no puede contradecir** el contexto mayor (HTF / daily) una vez fijada la regla de alineación.

---

## 5. Canonical setup definition

Para probar en serio hace falta **congelar un Setup V1** (una sola especificación) y **no** dispersarse en muchas variantes hasta tener baseline.

**Setup V1 (checklist mínimo):**

- **Símbolo inicial:** **XAUUSD**.
- **Contexto mayor:** **Daily / H4 / H1** según lo que el motor y el context engine expongan hoy (ver inventario **E2**).
- **Daily bias:** salida discretizada + razones (§6).
- **Estructura** y lectura de escenario (zonas, desplazamiento, desequilibrios según doc de estrategia).
- **Liquidity objective** (modelo V2-09).
- **IFVG / displacement / imbalance** (alineado a V2-04 y decision model).
- **Entry model** (V2-08 variantes — elegir **una** variante canónica para V1).
- **SL model** y **TP model** explícitos.
- **Reglas de invalidación** antes de fill.
- **Filtros de sesión/tiempo** si aplican al mercado objetivo.
- **Risk model en R** (tamaño relativo, sin apalancamiento discrecional en el backtest inicial).
- **Sin override discrecional** en el backtest inicial (todo codificado o parametrizado en el contrato).

**Regla de disciplina:** *No se deben probar 10 setups a la vez. Primero un setup canónico; después variantes acotadas (grid **E6**).*

---

## 6. Daily bias model

**Objetivo:** la bias actúa como **filtro duro** de dirección antes de permitir entrada.

**Entradas conceptuales:**

- Serie de velas (o agregados) en el **timeframe de bias** acordado (típicamente **D1**; confirmar en **E2** qué expone `mapazapp-core`).
- Opcionalmente contexto **H4/H1** si el motor ya fusiona HTF (V2-07).

**Salida discretizada:**

- `bullish`
- `bearish`
- `neutral`
- `invalid` / `unknown` (datos insuficientes, gaps críticos, errores de import)

**Razones:** cada evaluación debe poder registrar **motivos legibles** (p. ej. estructura, cierre vs nivel, sesgo de swing) para evidencia, **sin** filtrar secretos ni rutas privadas.

**Evidencia:** cada trade candidato o ejecutado en simulación debe poder referenciar `biasDirection`, `biasReasons[]`, y el resultado del chequeo.

**Reglas obligatorias:**

- Daily bias se evalúa **antes** de aceptar entrada.
- Bias **contrario** → **cancela** setup (`rejected_by_daily_bias`).
- **Neutral** → **no opera** en la **prueba inicial** (E1 y primera campaña de validación) **salvo** aprobación explícita posterior de un modo “neutral allowed”.
- Todo trade **debe** persistir en evidencia (estructura de run): `biasDirection`, `setupDirection` (long/short).
- Si `biasDirection != setupDirection` → **`rejected_by_daily_bias`** (tratamiento homogéneo en métricas §10).

---

## 7. Data sources

| Fuente | Rol en E1 |
|--------|-----------|
| **A. CSV manual / descargado** | Principal para arranque rápido; requiere diagnóstico completo (§8). |
| **B. CSV exportado desde MT5** | Aceptado como origen de velas; **mismo** pipeline de validación que A; **sin** asumir calidad por el hecho de venir de MT5. |
| **C. BridgeEA / TestEA** (bundles read-only validados) | Fase siguiente, cuando el contrato de datos esté cerrado (V2-12/V2-13). |
| **D. MT5 live read-only** | **Fuera** de esta fase. |

**Checklist CSV (obligatorio antes de “congelar” dataset):**

- Columnas esperadas y tipos.
- **Timezone** declarado y consistente.
- **Gaps** (huecos) detectados y política (rechazar tramo vs marcar warning).
- **Duplicados** de timestamp.
- **OHLC** válidos (orden, positividad, consistencia).
- **Spread** si existe columna; si no, documentar “N/A”.
- **Símbolo** y **timeframe** coherentes con el run.
- **Nunca** asumir dataset “bueno” sin **informe de data health**.

---

## 8. Dataset plan

**Arranque simple:**

- **Símbolo:** **XAUUSD**.
- **Timeframe de ejecución:** el que soporte el motor para el Setup V1 (p. ej. **M5** o **M15** — a fijar en **E2**/contrato).
- **Timeframes de contexto:** **H1 / H4 / D1** si el pipeline de contexto lo permite.
- **Rango mínimo inicial:** **3–6 meses** de historia limpia.
- **Rango ideal:** **1–2 años** cuando el import y el rendimiento lo permitan.
- **Splits:** **train / validation / forward**; **no** optimizar directamente sobre todo el universo temporal mezclado.
- Documentar **dataset id** versionado (hash o nombre + fecha + origen).

---

## 9. Backtest campaign plan

Etapas **conceptuales** de la campaña (nombres **E2–E7** aquí describen el **flujo de prueba**; véase §14 para la **numeración de checkpoints de repo** **E2–E10** y la tabla de alineación).

### E2 — Dataset readiness

- Importar CSV (o fuente acordada).
- Diagnosticar calidad (§7).
- **Congelar** dataset (versión + rango + timezone).
- Generar **reporte de data health** (resumen attachable a evidencia).

### E3 — First canonical setup backtest

- Ejecutar **Setup V1** único.
- **Sin** grid masivo todavía.
- Obtener **baseline** de métricas (§10).
- Archivar **evidencia** mínima (§11).

### E4 — Daily bias rejection audit

- Medir cuántos setups fueron **`rejected_by_daily_bias`**.
- Comparar métricas **con** y **sin** filtro de bias (dos runs controlados).
- Concluir si el filtro **mejora**, **empeora** o **no es significativo** (sin sesgo de una sola métrica).

### E5 — Parameter grid robustness

- Variantes **razonables** y acotadas (V2-14).
- Evitar sobreajuste: límites de búsqueda y validación en holdout / forward.

### E6 — Walk-forward proof

- Train / validation / forward (V2-15).
- Medir **degradación** fuera de train.
- Criterios de **robustez** explícitos (§10).

### E7 — Setup decision gate

Decisión documentada:

- **Setup viable** → avanzar a visualización de resultados y refinos acotados.
- **Setup dudoso** → más datos o ajuste de hipótesis antes de grid amplio.
- **Setup requiere rediseño** → volver a contrato y bias.
- **Setup descartado** → congelar lecciones; no invertir en packaging/runtime.

---

## 10. Metrics required

**Mínimos:**

- Total trades (y candidatos si se loguean rechazos).
- Win rate.
- Profit factor.
- Expectancy.
- Average **R**.
- Max drawdown.
- Max losing streak.
- Average win / average loss.
- **MAE / MFE** (si el simulador lo expone).
- Trades por mes.
- Trades por sesión (si aplica).
- Trades por **bias direction**.
- Count **`rejected_by_daily_bias`**.
- Count **`skipped_neutral_bias`** (u homólogo).
- Razones de **invalidación** de setup (histograma / top-N).

**Criterios de interpretación:**

- **No** validar un setup con **muy pocos** trades (umbral a fijar en **E2**/contrato).
- **No** validar por **una sola** métrica aislada.
- Buscar **estabilidad mensual** y comportamiento por **régimen** (volatilidad / sesión) cuando los datos lo permitan.

---

## 11. Evidence format

Cada run debe poder resumirse con:

- **git commit** (hash).
- **dataset id** (sin rutas absolutas privadas).
- **symbol**, **timeframe**, **date range**.
- **strategy version** / **setup version** / **bias model version**.
- **params** (serialización segura, sin secretos).
- **metrics** (§10).
- **rejection stats** (bias, neutral, invalidación).
- **sample trades** (anonimizado / indices, no filas completas de CSV en docs).
- **warnings** (data gaps, recortes, etc.).
- **conclusion** (una frase + detalle opcional).

**No guardar en docs de repo:** rutas privadas completas, secretos, tokens, ni **CSV crudo** completo.

---

## 12. Dashboard priority

El **dashboard de resultados** viene **después** de tener evidencia reproducible del motor.

**Orden correcto:**

1. El **motor** produce resultados numéricos y logs de run.
2. El **backtest** produce **evidencia** versionada.
3. El **dashboard** **muestra** esa evidencia (read-only).
4. **No** al revés (no diseñar UI “bonita” antes de saber qué métricas existen).

**Dashboard futuro (diseño E9, implementación E10) debería poder mostrar:**

- Data health del dataset usado.
- Distribución de daily bias.
- Rechazados por bias.
- Lista / detalle de trades (desde evidencia agregada).
- Curva de equity (derivada de métricas agregadas).
- Desglose mensual.
- Razones de setup e invalidación.
- Fallos y warnings del run.

---

## 13. What is out of scope now

**Fuera de alcance inmediato de la fase E (motor/setup proof):**

- MT5 **live**, lanzamiento de terminal, watcher, command files.
- **POST** / action transport / ejecución asistida en real / cuenta real conectada.
- Trading automático, órdenes reales, `OrderSend` / `CTrade`.
- **DB** persistente de runs, **WebSocket live** nuevo obligatorio.
- **Packaging**, **`.exe`**, **installer**.
- **Botones de acción** en dashboard que disparen operaciones.

---

## 14. Implementation checkpoints (repo sequence)

**Nueva secuencia propuesta (fase E — Engine Setup Proof):**

| ID | Contenido |
|----|-------------|
| **E1** | **Engine Setup Proof Master Plan** (este documento). |
| **E2** | **Engine inventory and setup contract audit** — qué existe en core, qué falta para bias+setup+evidencia; contrato escrito del Setup V1. |
| **E3** | **Dataset import / data health campaign** para XAUUSD — congelar dataset(s) y reportes. |
| **E4** | **Canonical setup backtest baseline** — un run referencia sin grid amplio. |
| **E5** | **Daily bias rejection audit** — A/B con y sin filtro. |
| **E6** | **Parameter grid robustness** — búsqueda acotada. |
| **E7** | **Walk-forward proof** — degradación y estabilidad. |
| **E8** | **Setup decision gate** — decisión documentada (viable / dudoso / rediseño / descartado). |
| **E9** | **Dashboard results design** — qué mostrar a partir de evidencia real. |
| **E10** | **Dashboard results implementation** — UI/API read-only alineada a E9. |

**Regla de retorno a runtime D14:** **no** reabrir prioridad de **expansión de runtime D14+** hasta cerrar al menos **E4** (baseline canónico) **y** **E5** (auditoría de bias), salvo hotfixes de seguridad acordados.

**Alineación §9 ↔ §14 (dos esquemas de numeración):**

| Checkpoint repo (§14) | Etapa de campaña (§9) |
|------------------------|------------------------|
| E3 | §9 **E2** Dataset readiness |
| E4 | §9 **E3** First canonical setup backtest |
| E5 | §9 **E4** Daily bias rejection audit |
| E6 | §9 **E5** Parameter grid robustness |
| E7 | §9 **E6** Walk-forward proof |
| E8 | §9 **E7** Setup decision gate |

**E2** (repo) = inventario y contrato; **precede** a la etapa de campaña “dataset readiness”.

---

## 15. Definition of done for E1

- [x] Documento **E1** creado en `APP/artifacts/mapazapp/docs/ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`.
- [x] Prioridad **motor / backtest** explícita frente a runtime.
- [x] Reglas de **daily bias** documentadas (§4, §6).
- [x] Secuencia **E2–E10** y campaña **§9** definidas, con nota de alineación.
- [x] **Runtime / launcher** marcado como **pausado** para expansión hasta evidencia.
- [x] **Sin código**, **sin procesos**, **sin MT5**, **sin trading** en el acto de **E1**.
