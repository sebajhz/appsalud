# Engine-First Roadmap Realignment and Next Steps — E5.21.2.2

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.21.2.2 — realineación roadmap engine-first (docs-only) |
| **Tipo** | Checkpoint de planificación — **sin implementación** |
| **Baseline Git** | `400ed27` o posterior — `docs(mapazapp): E5.21.2.1 alert queue manager evidence` |
| **Upstream cerrado** | E5.20 read-only consumption + E5.21 alert-only local tooling (formatter, cola JSONL, queue manager evidence PASS) |
| **E5.22.0.1** | [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md) — alineación MT5/repo/estrategia |
| **E5.22** | [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md) — PASS técnico; `MZP_TestEA_E5_18`, SET001 refrescado |
| **E5.22.2** | [`SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md) — CLI `mapazapp:testea-setup-performance-baseline-audit` |
| **E5.22.2.1** | [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md) — **PASS** |
| **Siguiente recomendado** | **E5.22.4** HA measurability **o** **E5.23** optimization governance (PM) |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, MetaEditor, Strategy Tester, Telegram, email, push, gates, live trading, entry/TP, edge approval |

---

## 1. Por qué existe este checkpoint

Los bloques **E5.20** y **E5.21** entregaron capas útiles de **consumo read-only** y **herramientas locales de alertas para revisión**:

- índice local de bundles (E5.20.1)
- generador de último informe válido (E5.20.2)
- adaptador `dashboard_readonly_view` (E5.20.3)
- mock HTML dashboard (E5.20.4)
- formatter alert-only + cola JSONL + queue manager (E5.21.1–E5.21.2.1)

Esa infraestructura **sigue siendo válida** como soporte. No es el centro del sistema.

**Aclaración PM:** antes de continuar con paneles de notificación en dashboard, Telegram, email, push u otra expansión de alertas/UI, el proyecto debe **volver al motor core**:

- lógica de setup
- **Mapazapp_TestEA**
- evidencia en **MT5 Strategy Tester**
- compatibilidad de export
- rendimiento de backtest
- medibilidad humanizada del setup
- gobernanza de optimización multi-símbolo

Dashboard, informes, alertas y Telegram son **capas de soporte**. Son útiles, pero **no** son el corazón de Mapazapp.

**E5.21.2.2** documenta qué haremos a continuación y en qué orden. **No** implementa E5.22 ni reanuda tracks pausados.

---

## 2. Reinicio de prioridades

| Peso | Foco | Contenido |
|------|------|-----------|
| **80 %** | Motor / setup / TestEA / Strategy Tester / evidencia / optimización | Compilar TestEA, correr benchmark, validar export, medir números reales, auditar rendimiento, mapear HA, gobernar campañas por símbolo/perfil |
| **10 %** | Dashboard / visualización read-only | Consumir exports e informes ya generados; leer evidencia; sin sustituir el tester |
| **10 %** | Extras / canales / Telegram / alertas | Formatter y cola local existentes; **pausados** panel Telegram email push hasta evidencia engine refrescada |

---

## 3. Arquitectura de tres sistemas

### Sistema 1 — Mapazapp App / Core / Dashboard

| Rol | Detalle |
|-----|---------|
| Consume | Exports TestEA, bundles validados, informes JSON/MD/HTML |
| Valida | Bundles (`mapazapp:testea-export-validate`) |
| Genera | Informes readiness, adaptador dashboard, alertas locales de revisión |
| Muestra | Información read-only para operador |
| **No hace** | Reemplazar Strategy Tester; ejecutar trades; emitir órdenes |

### Sistema 2 — Mapazapp_BridgeEA

| Rol | Detalle |
|-----|---------|
| Puente | Read-only MT5 → archivos / dashboard |
| Futuro | Snapshots forward/demo/live de observación |
| Alimenta | Estado de mercado actual al dashboard (cuando exista evidencia TestEA sólida) |
| **No hace** | Órdenes; comandos de trading; `WebRequest`/flujo de órdenes salvo gobernanza futura explícita |

### Sistema 3 — Mapazapp_TestEA

| Rol | Detalle |
|-----|---------|
| Motor oficial | Prueba en **MT5 Strategy Tester** |
| Entrega | Backtest, validación histórica, outcomes virtuales, detección de setup, export fuente |
| Alimenta | Informes, dashboard, alertas (downstream) |
| **Prioridad actual** | **Sí** — todo el roadmap inmediato gira aquí |

---

## 4. Qué queda en pausa

**Pausado hasta que PM reanude explícitamente:**

| Track | ID / área |
|-------|-----------|
| Panel notificaciones dashboard | **E5.21.3** |
| Prototipo Telegram review-only | **E5.21.4** |
| Email / push | — |
| Canales externos de alerta | — |
| Pulido dashboard no necesario para prueba del motor | — |
| Gates | — |
| Live trading | — |
| Wording de ejecución | — |
| Aprobación prop / funding | — |
| Aprobación entry alternativa (edge / 25 % / adaptive) | — |
| Risk / prop firm mapping (numeración histórica V2-21; **no** es el nuevo E5.22) | diferido |

---

## 5. Qué sigue siendo útil de E5.20 / E5.21

**Mantener como herramientas de soporte / consumo** (ya implementadas o con evidencia PASS):

| Herramienta | Checkpoint | Rol |
|-------------|------------|-----|
| Índice local de bundles | E5.20.1 | Descubrir carpetas export |
| Generador último informe válido | E5.20.2 | Report desde bundle validado |
| Adaptador `dashboard_readonly_view` | E5.20.3 | JSON → vista dashboard |
| Mock HTML read-only | E5.20.4 | Prototipo visual |
| Formatter alert-only | E5.21.1 | Alertas locales de revisión |
| Queue manager JSONL | E5.21.2 / E5.21.2.1 | Estados reviewed/dismissed/archived |

**Importante:** estas capas **no** son el motor. No sustituyen compilar TestEA, correr Strategy Tester ni medir el setup en backtest. Tras E5.22 deben seguir consumiendo el **último export validado**, no evidencia obsoleta.

---

## 6. Secuencia del roadmap siguiente

### E5.22 — Latest TestEA Compile + MT5 Strategy Tester Evidence Refresh — **cerrado (PASS)**

**Evidencia:** [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md) — `MZP_TestEA_E5_18`, SET001 validado, winrate 0.447712, Total_R=315. Alineación: [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md).

### E5.22.1 — Latest Export Compatibility Audit

**Objetivo:** verificar que el export más reciente sigue alimentando consumidores E5.18–E5.21:

- readiness export / calibración
- report generator
- dashboard adapter
- mock HTML
- alert formatter
- queue manager

### E5.22.2 — Setup Performance Baseline Audit — **cerrado (repo)**

**Implementación:** [`SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md) — `mapazapp:testea-setup-performance-baseline-audit`.

**Objetivo:** analizar números reales del motor (ver dimensiones obligatorias en [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md) §9):

- `trade_count`, fills, wins/losses
- ambiguous, expired, unresolved
- expectancy, drawdown (si disponible)
- outcome/R por readiness, blocker, IFVG grade, target grade, environment, discipline, session, volatility, entry status, near-miss
- variantes 50 % vs 25/adaptive/edge (research)
- impacto ambiguity, overtrading, drawdown y daily R

### E5.22.3 — Trade Model Visual/Textual Representation

**Objetivo:** definir con precisión qué trade cree el sistema que está tomando:

- narrativa de setup
- zonas de chart (texto primero; objetos MT5 después)
- sweep, IFVG/FVG/BISI/SIBI
- MSS/CHoCH
- contexto PD
- entry 50 % / CE
- SL/TP, liquidez objetivo
- environment, discipline
- razones candidate / wait / reject

Puede ser **text-first**; visual/MT5 chart objects en fase posterior.

### E5.22.4 — Humanized Casebook Measurability Audit

**Objetivo:** mapear **HA-001 … HA-010** a campos actuales del export MQL5.

Clasificación por caso:

- `measurable_today`
- `partially_measurable`
- `missing_measurement`
- `TS-only` (derivable en post-proceso sin nuevo export)
- `future BridgeEA/forward measurement`

**Cursor no inventa** lógica discrecional de trading.

### E5.23 — Optimization Campaign Governance / Symbol Profiles

**Objetivo:** definir cómo funcionará la optimización por símbolo/perfil:

1. **XAUUSD_M15_Profile_V1** primero (laboratorio)
2. **EURUSD_M15_Profile_V1**
3. **NAS100_M15_Profile_V1**
4. **BTCUSD_M15_Profile_V1** si PM aprueba

**No** optimizar todos los símbolos a ciegas en un solo grid. Cada símbolo/perfil se evalúa **de forma independiente** con evidencia propia.

---

## 7. Flujo operador esperado (E5.22)

Pasos que el operador debe seguir en E5.22 (documentación; ejecución en tarea E5.22 dedicada):

1. Revisar `TESTEA_BUILD` en `Mapazapp_TestEA.mq5`
2. Copiar archivos TestEA a la carpeta Experts de MT5
3. Compilar en MetaEditor (0 errores / 0 warnings objetivo)
4. Archivar EX5 por build
5. Limpiar carpeta de run SET001 anterior si aplica
6. Ejecutar benchmark en Strategy Tester (SET001 o baseline aprobado)
7. Validar bundle: `pnpm --filter @workspace/scripts mapazapp:testea-export-validate`
8. Inspeccionar summary / events / trades
9. Generar último informe si hace falta (`mapazapp:latest-valid-report` o equivalente documentado)
10. Comparar contra evidencia previa (p. ej. `MZP_TestEA_E5_18` vs build actual)
11. Decidir siguiente mejora del motor (no UI/canales)

---

## 8. Campos de evidencia esperados (E5.22)

La evidencia E5.22 debe capturar como mínimo:

| Categoría | Campos |
|-----------|--------|
| Build | `TESTEA_BUILD`, resultado compile MetaEditor, ruta archivo EX5 archivado |
| Run | Carpeta Strategy Tester, `parameter_set_id`, símbolo/TF |
| Validación | `ok`, `status`, `errors`, `warnings` del validador |
| Trades | `trade_count`, conteos de eventos |
| Setup | candidatos / allowed / rejected |
| Outcomes | fills, expired, ambiguous, unresolved |
| Readiness | candidate / wait / reject (si export habilitado) |
| Calidad | target quality, session/spread/volatility, discipline |
| Humanización | mediciones HA disponibles vs faltantes (lista explícita) |
| Seguridad | `readOnly`, `executionEnabled`, `has_real_trading_orders` (y flags equivalentes del summary) |

---

## 9. Preguntas del motor que E5.22 debe responder

Tras E5.22 el proyecto debe poder responder:

| # | Pregunta |
|---|----------|
| 1 | ¿El TestEA más reciente compila limpio? |
| 2 | ¿Cuál es el `TESTEA_BUILD` actual? |
| 3 | ¿Seguimos usando evidencia `MZP_TestEA_E5_18` mientras el repo avanzó? → **E5.22.0.1:** sí, coherente; avance E5.19–E5.21 no cambia outcome oficial |
| 4 | ¿El export más reciente sigue validando? |
| 5 | ¿Informes / dashboard / alertas consumen el export más reciente? |
| 6 | ¿Cuáles son los números reales del setup actual? |
| 7 | ¿El setup es rentable en el benchmark? |
| 8 | ¿Dónde es débil? |
| 9 | ¿Las pérdidas vienen de target, entry, PD, IFVG, sesión, discipline, volatilidad o estructura? |
| 10 | ¿Qué casos HA son medibles hoy? |
| 11 | ¿Qué requiere trabajo de export MQL5? |
| 12 | ¿Qué requiere BridgeEA/forward? |
| 13 | ¿Qué optimizar primero (por perfil)? |

---

## 10. Dirección de optimización

| Regla | Detalle |
|-------|---------|
| XAUUSD | **Laboratorio**, no sistema mono-símbolo final |
| Diseño | Mapazapp es **multi-símbolo** por diseño (North Star) |
| Perfiles | Cada símbolo tiene perfil y evidencia propios |
| MT5 genetic/grid | Puede **descubrir** candidatos; **no** los aprueba |
| Promoción | Requiere validación, OOS, walk-forward, revisión drawdown, frecuencia, readiness, análisis blockers, evidencia forward/demo read-only |
| Anti–curve-fit | **No** curve-fittear un solo SET001 como veredicto final |

Referencia: [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md), [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md).

---

## 11. Relación con humanización

| Documento | Estado |
|-----------|--------|
| [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md) | Aprobado — gobernanza |
| [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md) | Aprobado — HA-001 … HA-010 |

**No** implementan aceptación humanizada en MQL5 todavía.

El trabajo engine inmediato (**E5.22.4**) debe identificar qué casos HA son medibles hoy y qué campos de export faltan.

**Cursor no inventa** lógica discrecional de trading fuera de casos y política documentados.

---

## 12. Relación Dashboard / Bridge

### Dashboard

- Consumidor **downstream**
- Útil para **leer** evidencia ya exportada
- **Pausado** para nuevas features (E5.21.3+) hasta refresh de evidencia engine (E5.22)

### BridgeEA

- Puente read-only **futuro** (forward/demo)
- Importante **después** de prueba TestEA sólida
- Sin órdenes; sin canal de comandos

---

## 13. Gobernanza bloqueada (sin cambio)

| Tema | Estado |
|------|--------|
| Live trading | Prohibido |
| Gates | Prohibido |
| Telegram / email / push (implementación) | Prohibido en esta fase |
| Wording de ejecución | Prohibido |
| `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest` | Prohibido |
| Entry oficial | **50 % / CE** |
| TP oficial | **RR2** |
| Edge / 25 % / adaptive | Solo investigación |
| Score | **No** es permiso para operar |
| Alertas | Solo revisión local read-only |

---

## Referencias

- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md`](./ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md)
- [`READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md`](./READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md)
- [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)

**Siguiente recomendado:** **E5.22.4** HA measurability audit **o** **E5.23** optimization governance (decisión PM). E5.22.2.1 baseline evidence — **PASS** — [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md).
