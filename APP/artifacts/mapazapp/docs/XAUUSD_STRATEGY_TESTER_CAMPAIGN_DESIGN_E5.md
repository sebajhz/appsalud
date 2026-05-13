# Mapazapp — XAUUSD Strategy Tester Campaign Design E5

## 1. Purpose

- **E5** documenta el **diseño** de la campaña de prueba del setup **IFVG_XAUUSD_V1** en **MetaTrader 5 Strategy Tester**, centrada en **XAUUSD**, usando el EA oficial **`Mapazapp_TestEA`**.
- **MT5 Strategy Tester** es el **motor oficial** del backtest del setup; **Mapazapp** (core, dashboard, scripts) **no** reemplaza al Strategy Tester como motor canónico.
- **E5 no ejecuta** ninguna campaña en este checkpoint: es **solo documentación**. No se lanza MT5 ni se automatiza el tester desde el repo.
- **E5 no mide rentabilidad todavía**: el EA actual exporta candidatos y compuertas, pero **`trade_count = 0`**, **`has_real_trading_orders: false`**, y el CSV de trades permanece **solo cabecera** hasta existir un **motor de outcome** implementado según la decisión formal [**E5.1**](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md) y los contratos **E5.2+**.
- **E5 prepara** parámetros, naming, evidencia, validación con **E4.1** y la **decisión obligatoria** sobre cómo medir resultados de trades, para que las métricas de edge no se **falseen** interpretando señales como si fueran trades cerrados.

**Relacionado:** [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md), [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md), [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md), [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md), [**E5.1 — decisión modo outcome (virtual primero)**](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md).

---

## 2. Current state

**`Mapazapp_TestEA` hoy (fase candidato / compuerta):**

- Corre **solo** en **Strategy Tester** (`MQL_TESTER`); falla fuera del tester.
- Calcula **Daily Bias V1** en el timeframe configurado (por defecto **D1** sobre la vela diaria previa cerrada).
- Detecta **FVG / Setup V1** como **candidatos** (IFVG en sentido de detección; **`has_full_ifvg_pipeline: false`**).
- Aplica la **compuerta Daily Bias** (`allowed` vs `rejected_by_daily_bias` según alineación requerida).
- Exporta **`backtest_summary.json`**, **`backtest_events.csv`**, **`backtest_trades.csv`** (contrato **E3.6**).
- **`backtest_trades.csv`**: **cabecera válida**, sin filas de datos en la fase actual.
- Summary típico: **`trade_count: 0`**, **`has_real_trading_orders: false`**, **`has_full_ifvg_pipeline: false`**.

**Qué se puede medir ya (Phase A — honest metrics):**

- `total_bias_evaluated` y conteos de bias (alcista / bajista / neutral si aplica en summary).
- Candidatos de setup: `total_setup_candidates`, `allowed_setups`, `rejected_by_daily_bias`, `skipped_neutral_bias`, etc. (según campos presentes en summary).
- Dirección de setups en **eventos** (`setup_detected`, `setup_allowed`, `setup_rejected`, …) y distribución temporal vía timestamps.
- Tamaños / contexto exportados en eventos o notas cuando el EA los emite (p. ej. filtros por puntos de FVG si están en logs de evento).
- **Volumen de señales** y **tasa de rechazo por bias** como lectura de “ruido vs filtro”.

**Qué NO se puede medir todavía (sin outcome engine):**

- Winrate, profit factor, expectancy, drawdown monetario.
- `result_r`, calidad real de entradas/salidas, SL/TP ejecutados o simulados de forma consistente en export.
- “Performance del setup” en sentido **rentabilidad** o **edge estadístico de trades**.

---

## 3. Campaign objective

**Objetivo final de campaña (visión producto):** determinar si **IFVG_XAUUSD_V1** tiene **edge** bajo **Daily Bias** y qué **parameter set** merece seguimiento hacia monitorización / dashboard.

**Objetivo de E5 (este documento):** fijar **cómo** se ejecutará y documentará esa campaña **sin pretender métricas de rentabilidad** que el sistema aún no produce.

**Preguntas que la campaña debe poder responder (en fases):**

| Fase | Pregunta |
|------|----------|
| **Ahora (Phase A)** | ¿Cuántos setups aparecen? ¿Cuántos pasan o fallan el gate de Daily Bias? ¿En qué franjas horarias/fechas se concentran? ¿Qué parámetros reducen ruido (tamaño FVG, edad en barras, cuerpo mínimo del bias)? |
| **Después (Phase B)** | Con outcome engine: winrate, R múltiple, drawdown, expectancy, estabilidad por ventana temporal. |

**Regla anti–falsa precisión:** no interpretar “muchos candidatos permitidos” como “estrategia rentable” hasta tener **outcomes** coherentes con SL/TP y reglas de salida acordadas.

---

## 4. Campaign modes

### Phase A — Candidate / gate campaign

- **Disponible hoy** con el EA actual.
- **Mide:** bias, candidatos, permitidos/rechazados, frecuencia, distribución temporal, señales de tamaño (cuando consten en summary/eventos), lectura cualitativa vía eventos.
- **No mide:** profit, edge de trades, winrate, drawdown.

### Phase B — Outcome campaign

Requiere **implementación** previa y decisión **E5.1** entre:

**Option 1 — Virtual trade simulation**

- El EA **no** abre órdenes reales en bróker.
- Calcula **entry, SL, TP** y **outcome** (p. ej. `result_r`) **en memoria** según contrato a definir (**E5.2+**).
- Exporta filas en **`backtest_trades.csv`** y actualiza **`trade_count`** / campos de summary acorde al contrato revisado.
- **Ventaja:** más control, menos superficie de riesgo operativo; **no** depende del reporte nativo de órdenes del tester.

**Option 2 — Tester orders**

- El EA usa **`OrderSend` / `CTrade` u equivalente** **solo** bajo guardas **`MQL_TESTER`** y política explícita de producto.
- Aprovecha reportes nativos del Strategy Tester donde aporte valor.
- **Requisitos:** gate de activación documentado, revisión de seguridad, **prohibido live** desde este rol.

**Recomendación de diseño (E5):** avanzar primero con **diseño e implementación de simulación virtual de trades** (Opción 1); valorar **tester_orders** (Opción 2) después si aporta métricas que la virtual no cubra y el riesgo/guardas son aceptables.

---

## 5. Initial campaign scope

| Dimensión | Valor inicial |
|-----------|----------------|
| **Symbol** | **XAUUSD** únicamente |
| **Execution timeframe** | **M15** |
| **Daily Bias timeframe** | **D1** |
| **Context flags** | **H4 / H1** en inputs (`InpUseH4Context`, `InpUseH1Context`) **true** por baseline; la fuerza del gate principal sigue siendo **bias D1 + alineación** hasta que el contrato amplíe contexto HTF. |

**Rangos de fechas sugeridos (operador):**

| Tipo | Duración orientativa | Uso |
|------|------------------------|-----|
| Smoke | ~**1 semana** | Sanity de export, tamaño de CSV, validación E4.1 |
| Short | ~**1 mes** | Exploración de densidad de señales |
| Baseline | ~**3 meses** | Lectura estable de filtros |
| Canonical | **6–12 meses** | Comparación seria de parameter sets (post outcome) |
| Ideal | hasta **~24 meses** | Cuando lógica y contrato de outcome estén maduros |

**Advertencia:** no ejecutar campañas **largas** con objetivo de **rentabilidad** antes de existir **Phase B** (outcome); en Phase A solo tiene sentido acotar coste de CSV y validar pipeline de evidencia.

---

## 6. Parameter dimensions (Phase A)

Inputs reales en **`Mapazapp_TestEA.mq5`** (nombres canónicos). Valores iniciales para rejilla **ligera** — evitar explosión combinatoria hasta **E5.5**.

| Input | Valores sugeridos (grid inicial) | Notas |
|-------|----------------------------------|--------|
| `InpDailyBiasMinBodyPoints` | **0**, **50**, **100** | Filtra velas D1 “débiles” para bias |
| `InpMinFvgPoints` | **0**, **20**, **50**, **100** | Filtra FVG pequeños (ruido) |
| `InpMaxSetupAgeBars` | **20** (default); otros solo si se confirma uso en código | Ya usado en lógica de edad |
| `InpRequireDailyBiasAlignment` | **true** (baseline); **false** solo en ramas **A/B** explícitas de comparación, no como modo principal |
| `InpUseH4Context` | **true** | Baseline documental |
| `InpUseH1Context` | **true** | Baseline documental |
| `InpBacktestMode` | **`virtual`** | Coherente con modo actual; sin órdenes hasta decisión E5.1+ |

---

## 7. Run naming convention

**`run_id` (carpeta / identidad de run sugerida):**

```text
MZP_E5_XAUUSD_M15_D1_CANDIDATE_<YYYYMMDD>_<SEQ>
```

Ejemplo: `MZP_E5_XAUUSD_M15_D1_CANDIDATE_20260512_001`

**`parameter_set_id` (rejilla / familia de parámetros):**

```text
MZP_IFVG_XAUUSD_V1_CANDIDATE_SET_<NNN>
```

Ejemplo: `MZP_IFVG_XAUUSD_V1_CANDIDATE_SET_001`

Debe poder leerse en el summary: estrategia, símbolo, TF ejecución, TF bias, fase (**CANDIDATE** vs futuro **OUTCOME**), número de set.

---

## 8. Evidence bundle workflow

Cada run en tester debe producir (misma carpeta de export del run):

1. `backtest_summary.json`
2. `backtest_events.csv`
3. `backtest_trades.csv`

**Después de copiar la carpeta del run** a un lugar accesible (ver §9):

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "<ruta-absoluta-carpeta-run>" --json
```

- **FAILED:** no consolidar el run en informes de campaña; revisar EA, fechas o corrupción de export.
- **OK / WARNING:** aceptable para índice de campaña **Phase A** si las warnings son entendidas (p. ej. CSV grande, sin `setup_*` en rango muy corto).

---

## 9. Evidence storage policy

- **No** commitear en el repo de Git exports reales grandes (CSV de millones de líneas, paths absolutos del operador).
- Preferir: carpeta **local fuera del repo**, carpeta **gitignored**, o almacén de evidencia futuro acordado con el PM.
- En documentación del repo: **resúmenes sanitizados**, métricas agregadas, **rutas redactadas**, huellas opcionales (hash), observaciones cualitativas.

---

## 10. Campaign report template (futuro)

**Archivo futuro sugerido (no obligatorio crear ahora):** `APP/artifacts/mapazapp/docs/XAUUSD_STRATEGY_TESTER_CAMPAIGN_REPORT_E5.md`

Plantilla mínima de contenido cuando existan runs consolidados:

| Campo | Descripción |
|-------|--------------|
| `campaign_id` | Identificador lógico de campaña |
| `symbol` | p. ej. XAUUSD |
| `broker_server_label` | Etiqueta humana (sin secretos) |
| `ea_build` | Build / versión del EA |
| `date_range` | Desde–hasta del test |
| `timeframe` | M15 + D1 bias |
| `parameter_sets` | Lista de `parameter_set_id` |
| `runs` | Lista de `run_id` + estado validación E4.1 |
| `validation_status` | Resumen OK/WARN/FAILED por run |
| `total_bias_evaluated` | Agregado o por run |
| `setup_candidates` / `allowed` / `rejected` | Agregados |
| `session_distribution` | Notas o tabla si se deriva de timestamps |
| `warnings` | Operativas (tamaño CSV, etc.) |
| `conclusion_candidate_gate` | Interpretación Phase A |
| `outcome_unavailable_until` | Referencia explícita a **E5.x** trade model |

---

## 11. Required next implementation before profitability

**Checkpoint obligatorio siguiente:**

### E5.1 — TestEA trade outcome mode decision

**Estado:** **cerrado (docs-only)** — ver [**TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md**](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md).

Decidir **una** o **secuencia** de:

- **Virtual trade simulation** (recomendado como primer eje).
- **Tester orders** (solo con spec de seguridad y gate).
- **Ambos** en secuencia (virtual primero; tester_orders si aporta valor).

**Decisión formal (E5.1):** [**TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md**](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md) — camino aprobado: **simulación virtual dentro de `Mapazapp_TestEA` en el Strategy Tester primero**; **tester_orders** pospuesto a **gate opcional E5.6**.

**Cadena sugerida post decisión:**

| ID | Contenido |
|----|------------|
| **E5.2** | Contrato de simulación virtual (campos summary/trades/eventos). |
| **E5.3** | Implementación MQL5 + ajustes validadores TS si el contrato cambia. |
| **E5.4** | Primer smoke de outcome virtual en Strategy Tester (evidencia acotada). |
| **E5.5** | Campaña XAUUSD con **métricas de outcome virtual**. |
| **E5.6** (opcional) | Gate **tester_orders** + spec de seguridad si hace falta tras la virtual. |

Si en algún momento se activa **tester_orders**: spec aparte de **gate**, documentación **`MQL_TESTER`**, y prohibición explícita de uso en live para este rol.

---

## 12. Humanization / trader interpretation

La campaña **Phase A** debe producir lecturas útiles para el trader, no solo contadores:

- “El bias diario estaba **alcista** y el setup **long** fue **permitido**.”
- “El setup **short** fue **rechazado** por ir **contra** el bias.”
- “Hay **demasiados** candidatos; conviene subir **`InpMinFvgPoints`** o revisar sesión.”
- “Hay muchas señales **permitidas**, pero **aún no sabemos si ganan** hasta definir SL/TP y outcome (**E5.2–E5.3+**).”
- “El siguiente paso honesto es **medir resultado** con reglas de salida fijadas en contrato.”

---

## 13. Non-goals (E5)

E5 **no** incluye:

- Ejecutar la campaña ahora ni orquestar Strategy Tester desde código.
- Medir rentabilidad ni afirmar edge.
- Implementar trades, órdenes, ni ampliar MQL5 (salvo otra decisión explícita fuera de E5).
- Dashboard, API productiva, DB, WebSocket, launcher/runtime expansión.
- Live trading o automatización desde Mapazapp hacia MT5.

---

## 14. Document history

| Versión | Nota |
|---------|------|
| E5 v1 | Diseño inicial docs-only; HEAD repo al cierre del checkpoint de diseño. |
