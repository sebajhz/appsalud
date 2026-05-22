# MT5 / Repo / Strategy Alignment Check — E5.22.0.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.0.1 — alineación MT5 / repo / estrategia (docs-only) |
| **Tipo** | Checkpoint de interpretación — **sin implementación** |
| **Baseline Git** | `f7aa4c1` o posterior — `docs(mapazapp): E5.21.2.2 realign roadmap engine first` |
| **Upstream** | E5.21.2.2 engine-first; evidencia operador E5.22 (compile + ST SET001) |
| **E5.22 evidencia** | [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md) — PASS técnico; confirma alineación |
| **E5.22.2** | [`SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md) — implementado |
| **E5.22.2.1** | [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md) — **PASS** |
| **E5.22.3** | [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md) |
| **E5.22.4** | [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md) — **cerrado (docs)** |
| **E5.23** | [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) |
| **E5.23.1** | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) |
| **Siguiente recomendado** | E5.23.2 |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, MetaEditor, Strategy Tester, Telegram, gates, live trading, entry/TP, aprobación edge/25/adaptive |

---

## 1. Preocupación del operador (PM)

Durante la recolección de evidencia **E5.22**, el operador observó:

- El TestEA compilado más reciente sigue siendo **`MZP_TestEA_E5_18`**.
- El benchmark oficial (entrada **50 % / CE**, TP **RR2**, sin gates) sigue reportando un **winrate oficial ≈ 44,77 %** (`winrate = 0.447712`).
- El proyecto avanzó con muchos módulos (E5.14–E5.21): export diagnóstico, calidad de target, entorno de ejecución, disciplina, readiness, informes, dashboard read-only, alertas locales.

**Preocupación:** si hubo tantas mejoras, ¿por qué el resultado oficial en MT5 Strategy Tester no cambió de forma material?

**Necesidad:** distinguir de forma explícita:

| Tipo | Efecto en outcome oficial MT5 |
|------|-------------------------------|
| **Adiciones diagnósticas / read-only / reporting** | No cambian trades oficiales aceptados |
| **Adiciones que cambian estrategia** | Sí cambiarían winrate, fills, R, etc. |

Este checkpoint documenta que la estabilidad del ~44,77 % **es coherente** con el estado actual del repo y **no** implica por sí sola desincronización MT5↔repo.

---

## 2. Hechos MT5 actuales (evidencia operador E5.22)

Evidencia capturada en la corrida de alineación (SET001, benchmark oficial):

| Categoría | Valor |
|-----------|-------|
| **TESTEA_BUILD** | `MZP_TestEA_E5_18` |
| **Compile MetaEditor** | 0 errores / 0 warnings |
| **EX5** | Generado y archivado (build coincidente) |
| **Carpeta run SET001** | Limpiada y regenerada |
| **Validación bundle** | `ok = true` |
| **Status validador** | `warning` — único warning: `BUNDLE_EVENTS_LARGE` |
| **executionEnabled** | `false` |
| **readOnly** | `true` |
| **has_real_trading_orders** | `false` |

### Métricas de outcome (summary exportado)

| Métrica | Valor |
|---------|-------|
| **trade_count** | 1697 |
| **win_count** | 411 |
| **loss_count** | 507 |
| **ambiguous_count** | 436 |
| **expired_unfilled** | 342 |
| **winrate** | 0.447712 (~44,77 %) |
| **expectancy_r** | 0.185622 |
| **total_r** | 315 |

**Nota:** `winrate` aquí es la métrica oficial del summary exportado (wins sobre outcomes resueltos según contrato virtual existente), no una promoción de estrategia ni aprobación de funding.

---

## 3. Interpretación de alineación

### MT5 **no** parece desincronizado a nivel archivo/export

| Verificación | Resultado |
|--------------|-----------|
| Fuente `Mapazapp_TestEA.mq5` del repo copiada a carpeta Experts MT5 | Sí |
| MetaEditor compiló la copia (no un artefacto stale distinto) | Sí — 0/0 |
| EX5 archivado con build coincidente | Sí — `MZP_TestEA_E5_18` |
| Strategy Tester generó archivos frescos tras limpieza de run | Sí |
| Validador TS acepta el bundle | Sí — `ok=true` |
| Summary exportado reporta el mismo build | Sí — `MZP_TestEA_E5_18` |

**Conclusión de sincronización:** el pipeline operador (repo → Experts → compile → ST → validate → summary) está **alineado**. El resultado ~44,77 % refleja la **estrategia oficial actual en MQL5**, no un export viejo ignorado ni un EX5 de otro build.

### Repo avanzó en capas que **no** alteran el outcome oficial

Entre **E5.19** y **E5.21** el avance fue principalmente:

- TypeScript: generadores de informe, adaptador dashboard, índice de bundles, alert formatter, queue manager
- Docs: política humanizada, casebook HA, realineación engine-first
- Presentación y consumo read-only de exports ya existentes

Ninguna de esas capas, por diseño de gobernanza, modifica la política de entrada oficial, TP, gates ni bloqueo de trades en `Mapazapp_TestEA` para el benchmark SET001.

---

## 4. Por qué el winrate oficial puede permanecer sin cambio

La estrategia **oficial** del motor sigue usando:

| Elemento | Estado oficial |
|----------|----------------|
| Entrada | **50 % / CE** |
| TP | **RR2** |
| Gates / score como permiso | **No** — observation-only |
| Setup readiness | Diagnóstico / decisión en export — **sin gate oficial** |
| Target quality (E5.15) | Diagnóstico — **sin cambio de TP** |
| Session / spread / volatility (E5.16) | Diagnóstico / stress label — **sin gate** |
| Discipline (E5.17) | Diagnóstico — **sin bloqueo de trades** |
| Humanización E5.20.5 / casebook E5.20.6 | Gobernanza docs — **sin MQL5 de aceptación aún** |
| Edge / 25 % / adaptive (E5.13.6+) | **Research-only** — no entry oficial |
| Dashboard / alertas (E5.20–E5.21) | Presentación / revisión local |

Por tanto, es **esperado** que el winrate oficial MT5 permanezca cerca del valor histórico del benchmark SET001 mientras no se cambie explícitamente (con evidencia y gobernanza):

- política de entrada
- política de aceptación de trades
- filtros / gates
- TP / SL
- lógica de detección de setup
- expiración / invalidación
- reglas operativas de sesión, volatilidad o disciplina **como compuertas**

---

## 5. Módulos: ¿cambian el outcome oficial MT5?

| Módulo / checkpoint | ¿Cambia outcome oficial MT5? | Rol actual |
|---------------------|------------------------------|------------|
| E5.14 IFVG / BISI / SIBI export | Mayormente **no** (contexto/diagnóstico) | Contexto de setup; no sustituye entry 50 %/CE oficial |
| E5.15 target quality | **No** | Diagnóstico liquidez/target; TP oficial RR2 sin cambio |
| E5.16 session / spread / volatility | **No** | Diagnóstico / stress label; sin gate operativo |
| E5.17 discipline | **No** | Diagnóstico frecuencia/riesgo; sin trade blocking |
| E5.18 setup readiness | **No** (decisión en export, sin gate) | candidate / wait / reject para reporting |
| E5.19 report generator | **No** | Presentación JSON/MD/HTML desde export |
| E5.20 dashboard / read-only consumption | **No** | Consumo de bundles validados |
| E5.21 alerts / queue manager | **No** | Revisión local JSONL; sin canal live |
| E5.20.5 humanized acceptance policy | **No** | Gobernanza docs; sin MQL5 acceptance |
| E5.20.6 humanized casebook HA-001…010 | **No** | Casos y medibilidad futura; sin implementación MQL5 |
| E5.13.6 entry variant / edge research | **No** (variantes no oficiales) | Simulación hipotética; edge/25/adaptive **no aprobados** |
| E5.8 entry quality score | **No** | `score_gate_enabled: false` — observación |
| E5.6 ambiguity modes (TS post-proceso) | **No** en MQL5 | Análisis alternativo de bundles ya exportados |

**Regla práctica:** si el cambio no está en `Mapazapp_TestEA.mq5` como política de aceptación/fill/TP/entry **oficial**, no debe mover el benchmark SET001 oficial.

---

## 6. Advertencia — variantes de entrada (research)

Auditorías de variantes (E5.13.6.x) muestran resultados **mucho más fuertes** en simulación que el oficial 50 %/CE:

| Variante | Observación research | Estado gobernanza |
|----------|----------------------|-------------------|
| **25 % / adaptive** | Mejor que oficial en rollups simulados | **No aprobados** |
| **edge** | Dramáticamente mejor en simulación | **No aprobado** — frágil bajo auditorías buffer/velocidad/riesgo |

**Riesgos de interpretación:**

- Supuestos de simulación (fill, TP, barras, ambiguous) pueden inflar resultados vs outcome oficial.
- Reconciliación E5.13.6.3+ validó paridad control 50 %/CE; variantes no oficiales **no** reconcilian 1:1 con el motor aceptado hoy.
- **No** cambiar entry oficial ni promover edge/25/adaptive sin auditoría específica, multi-bundle, OOS/WF y decisión PM explícita.

---

## 7. Conclusión clave

### El 44,77 % no es automáticamente “malo”

Con **RR2**, un winrate ~44,77 % puede ser **rentable en R**:

- **total_r = +315**
- **expectancy_r ≈ +0.1856 R** por trade en el benchmark documentado

Eso indica que el setup oficial **genera expectativa positiva en este bundle**, no que el motor esté “roto” por desincronización.

### No es suficiente para aprobación de estrategia / funding

| Hallazgo | Implicación |
|----------|-------------|
| Un solo bundle (SET001) | Insuficiente para promover entry alternativa |
| **ambiguous_count = 436** (~26 % del trade_count) | Incertidumbre material en contabilidad |
| **expired_unfilled = 342** | Fricción de fill / zona |
| Overtrading (1697 trades) | Presión de disciplina y coste de decisión |
| Target-before-liquidity / weak execution environment | Débil según auditorías E5.15–E5.16 |
| Conflictos structure / IFVG / PD | Blockers frecuentes en readiness (E5.18) |
| Sin OOS / walk-forward / multi-símbolo | No cumple escalera de evidencia para cambio oficial |

**Resumen:** resultado estable y alineado ≠ listo para aprobar cambio de entry, gates o live.

---

## 8. Qué debe ocurrir después (orden engine-first)

**No** cambiar estrategia en este checkpoint. Secuencia documentada en E5.21.2.2:

| Paso | Tarea | Objetivo |
|------|-------|----------|
| 1 | **E5.22.1** — Latest Export Compatibility Audit | Confirmar que consumidores E5.18–E5.21 siguen alimentándose del export E5.18 actual |
| 2 | **E5.22.2** — Setup Performance Baseline Audit | Medir rendimiento real y segmentar por dimensiones diagnósticas |
| 3 | **E5.22.3** — Trade Model Visual/Textual Representation | Narrativa precisa del trade que el sistema cree tomar |
| 4 | **E5.22.4** — Humanized Casebook Measurability Audit | HA-001…HA-010 vs campos export |
| 5 | **E5.23** — Optimization governance — [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) (**cerrado docs**) |

Opcional inmediato: cerrar **documento de evidencia E5.22 final** (patrón smoke existente) citando este alignment check.

---

## 9. Análisis requerido en E5.22.2

**E5.22.2** debe producir (sobre el bundle benchmark validado, sin re-ejecutar MT5 salvo nueva tarea operador):

| Dimensión de corte | Métricas esperadas |
|--------------------|-------------------|
| Readiness decision | outcome / R por candidate / wait / reject |
| Primary blocker | outcome / R por blocker dominante |
| IFVG grade | outcome / R por grado (si columnas presentes) |
| Target grade | outcome / R por calidad de target |
| Environment grade | outcome / R por grado entorno ejecución |
| Discipline grade | outcome / R por grado disciplina |
| Session | outcome / R por sesión |
| Volatility bucket | outcome / R por bucket |
| Entry status | outcome / R por estado de entrada |
| Near-miss | impacto en outcome / R |
| Entry variants | oficial 50 % vs 25 % / adaptive / edge (research, etiquetado no oficial) |
| Ambiguity | impacto en winrate, expectancy, total R bajo modos E5.6 |
| Overtrading | trades/día, clustering, coste en R |
| Drawdown / daily R | si derivable del export o post-proceso TS |

Salida esperada: informe de auditoría docs (+ artefactos `_local_*_DO_NOT_COMMIT` solo si el operador los genera; **no** commitear CSV locales).

---

## 10. Gobernanza — sin cambio de estrategia

| Acción | Estado en E5.22.0.1 |
|--------|---------------------|
| Cambio de estrategia (entry, TP, gates, MQL5) | **Prohibido** |
| Aprobar edge | **Prohibido** |
| Aprobar 25 % / adaptive | **Prohibido** |
| Añadir gates | **Prohibido** |
| Cambiar TP / entry | **Prohibido** |
| Modificar MQL5 | **Prohibido** |
| Más corridas MT5 / Strategy Tester | **Prohibido** en esta tarea |
| Implementar E5.22.1 / E5.22.2 | **Prohibido** en esta tarea |
| Dashboard notification panel / Telegram | **Prohibido** — tracks pausados |
| Live trading | **Prohibido** |

Este documento es un **checkpoint docs-only** antes de evidencia E5.22 final o sub-tareas E5.22.1+.

---

## Referencias

- [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md) — baseline SET001 histórico
- [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md)
- [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md)
- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)

**E5.22 cerrado:** [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md). **Siguiente:** **E5.22.1** export compatibility audit.
