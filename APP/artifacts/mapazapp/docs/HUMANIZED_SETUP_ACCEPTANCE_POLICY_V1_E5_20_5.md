# Humanized Setup Acceptance Policy V1 — E5.20.5 (governance alignment)

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.5 — alineación de gobernanza (docs-only) |
| **Tipo** | Política / roadmap — **sin código** |
| **Baseline Git** | `327c4d9` — `docs(mapazapp): E5.20.2.1 latest valid report generator evidence` |
| **Bloque upstream cerrado** | Detection / Readiness / Report V1 (E5.11–E5.19.3) + consumo read-only E5.20 / E5.20.1 / E5.20.2 |
| **Casebook** | **E5.20.6** — [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md) (HA-001 … HA-010) |
| **Bloquea** | **E5.20.3** (dashboard adapter) hasta revisión PM de E5.20.5 + casebook E5.20.6 |
| **No aprueba** | Gates, live trading, edge, 25 %, adaptive, cambio entry oficial, cambio TP, scoring MQL5, decisión checklist |

---

## 1. Por qué existe E5.20.5

El propietario aclaró que **«humanización» en Mapazapp no significa informes con IA ni solo dashboard/reporting**.

Los informes son útiles y deben permanecer, pero son la **capa de presentación**.

Antes de retomar **E5.20.3** (adaptador dashboard) o abrir nuevas pistas de implementación, el roadmap canónico debe colocar explícitamente la **política de aceptación humanizada del setup** como capa distinta de detección, readiness y reporting.

**E5.20.5** documenta esa alineación. **No** implementa la política en MQL5, TypeScript, MT5 ni UI.

---

## 2. Definición canónica de humanización

### 2.1 Qué **no** es humanización

| Confusión frecuente | Realidad en Mapazapp |
|---------------------|----------------------|
| Informes HTML/MD/JSON (E5.19) | **Presentación** — explican y muestran el setup |
| Dashboard read-only (E5.20.3+) | **Consumo visual** — no es lógica de aceptación |
| Setup Readiness `candidate` / `wait` / `reject` (E5.18) | **Diagnóstico agregado** — no sustituye criterio discrecional de aceptación |
| Scores y grades del checklist | **Señales contextuales** — no permiso para operar |
| Entry Quality Score (E5.8) | **Observación** — no gate |
| Variantes de entrada simuladas (E5.13.6) | **Investigación** — edge/25/adaptive **no aprobados** |

### 2.2 Qué **sí** es humanización

Humanización = dar al sistema (y al trader asistido) un **criterio discrecional tipo trader profesional** para decidir si un setup imperfecto pero significativo merece **aceptar, esperar, rechazar, observar o no operar**.

Dimensiones explícitas:

| Dimensión | Ejemplos ya medibles en el repo (inputs futuros de política) |
|-----------|---------------------------------------------------------------|
| **Tolerancia near-miss** | E5.13.2 fill feasibility, `near_miss`, retrace shallow — [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md) |
| **Reglas de aceptación / cancelación** | Invalidación, expiración, contexto que invalida un retest «casi válido» |
| **Incompleto pero operable vs válido pero skip** | Setup técnicamente detectado pero contexto débil; o checklist alto con blocker crítico (E5.18.3: 466 high-score rejects) |
| **Candidate / wait / reject como apoyo** | E5.18.4 — decisión diagnóstica, **no** ejecución |
| **Sesión / noticias / volatilidad / disciplina como contexto** | E5.16, E5.17 — observación-first, **no** filtros mecánicos rígidos por defecto |
| **Cuándo un setup imperfecto aún tiene sentido** | Near-miss con liquidez/reacción fuertes; retest profundo aceptable bajo tolerancia |
| **Cuándo un setup técnicamente válido debe omitirse** | Blockers críticos, ambigüedad, RR efectivo no defendible, sobreoperación |

**Frase de gobernanza (obligatoria en roadmap y handoff):**

> Detection / Readiness / Report V1 explains the setup, but does not complete humanized setup acceptance. Humanization requires a separate policy defining when a trader-like system would accept, wait, reject, observe, or no-trade based on imperfect but meaningful setup conditions.

---

## 3. Qué ya representa el roadmap sobre «humanización»

| Área | Documento / checkpoint | Rol respecto a humanización |
|------|------------------------|----------------------------|
| North Star — filosofía setup | [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md) §3, §8, ideal trade model §4 | Familia de entries contextuales; Trade / Wait / Reject en el flujo mental |
| Roadmap intermedio E5.11–E5.20 | [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md) | Cadena de **detección y diagnóstico** exportable |
| Near-miss / fill | E5.13.2, E5.13.3 | Evidencia de retraces y `near_miss` |
| Entry families (research) | [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md) | Familias candidatas + `no-trade/wait` — **sin** aprobación edge |
| Readiness checklist | E5.18 → E5.18.5 | Agregación + contrato UI |
| Readiness decision policy | [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md) | Interpretación de score/grade/decisión — **no** política de aceptación discrecional completa |
| Report + consumo | E5.19, E5.20, E5.20.1, E5.20.2 | Presentación y descubrimiento de bundles |
| Tolerancia dinámica (core V2) | [`V2_06_HUMAN_LIKE_TOLERANCE_CALIBRATION.md`](./V2_06_HUMAN_LIKE_TOLERANCE_CALIBRATION.md) | Matriz near-sweep / retest / spread — **motor TS de investigación**, no política E5 exportada aún |
| Variantes de entrada (core V2) | [`V2_08_ENTRY_VARIANT_MODEL.md`](./V2_08_ENTRY_VARIANT_MODEL.md) | `ideal_entry` / `accepted_entry` / `weak_observe_entry` — alinea concepto, **no** sustituye E5.20.5 |

**Conclusión:** el roadmap ya construye **piezas** de criterio humano (tolerancia, candidatos, readiness, contexto). **Falta** la capa unificada **Humanized Setup Acceptance Policy** que diga cómo combinarlas para **aceptación discrecional** sin confundirlas con reporting.

---

## 4. Brecha identificada

| Capa | Estado | Limitación |
|------|--------|------------|
| **Detection** (E5.10–E5.17 exports) | Cerrada en repo + smoke | Mide contexto; **no** decide aceptación discrecional final |
| **Readiness** (E5.18) | Cerrada | `candidate`/`wait`/`reject` es checklist V1; overrides por blocker ≠ criterio «operaría un trader» completo |
| **Report V1** (E5.19) | Cerrada | Explica; **no** es la humanización |
| **Consumo read-only** (E5.20.2) | Cerrada | Entrega informes; **no** añade política de aceptación |
| **Humanized acceptance policy** | **Esta tarea (E5.20.5)** | Marco V1 documentado; implementación en exports/UI **diferida** |
| **Dashboard adapter** (E5.20.3) | **Pausado** | Depende de E5.20.5 + E5.18.5; no debe sonar a permiso de trade |

---

## 5. Política de aceptación humanizada V1 (marco docs-only)

### 5.1 Vocabulario de decisión (discrecional, read-only)

| Decisión | Significado previsto (V1 governance) |
|----------|--------------------------------------|
| **accept** | El trader podría considerar el setup **operable** pese a imperfecciones medidas; no implica `OrderSend` ni gate |
| **wait** | Estructura o timing incompletos; merece observación sin rechazo definitivo |
| **reject** | Contexto o invalidación impiden tratar el setup como operable ahora |
| **observe** | Solo seguimiento / aprendizaje; sin intención de entrada en esta ventana |
| **no-trade** | Decisión explícita de no operar (disciplina, sesión, ambigüedad, target, frecuencia) |

**Regla:** estas etiquetas son **apoyo a decisión humana**. Deben mostrarse junto a razones exportables, no como semáforo verde/rojo de ejecución.

### 5.2 Inputs previstos (sin cambiar exports en E5.20.5)

La política V1 **referencia** diagnósticos existentes; **no** redefine sus umbrales en este checkpoint:

- `entry_fill_status`, near-miss, shallow retrace (E5.13.2)
- `setup_readiness_decision`, blockers, warnings (E5.18)
- Familia de entrada candidata research (E5.13.6.13) — **oficial sigue 50 % / CE**
- Sesión / spread / volatilidad (E5.16) — contexto, no bloqueo rígido por defecto
- Disciplina / frecuencia (E5.17)
- Calidad de target (E5.15) — diagnóstico; **TP oficial RR2 sin cambio**

### 5.3 Principios V1

1. **No score-only:** igual que E5.18.4 — un score alto no autoriza `accept`.
2. **No report-only:** generar informe bonito ≠ humanización completa.
3. **Contexto sobre filtro mecánico:** sesión/noticias/volatilidad informan; no sustituyen juicio sin evidencia multi-bundle.
4. **Imperfecto pero significativo:** near-miss y retest débil pueden ser `wait` o `accept` contextual, no auto-`reject`.
5. **Válido pero skip:** setup detectado con blocker crítico o ambigüedad → `reject` o `no-trade` aunque la geometría «exista».
6. **Antes de gates y alertas operativas:** cualquier copy de dashboard/alertas que suene a «entrar ahora» requiere esta política acordada (E5.21+).

---

## 6. Invariantes de producto (sin cambio en E5.20.5)

| Tema | Estado |
|------|--------|
| Entry oficial | **50 % / CE** |
| TP oficial | **RR2** |
| Edge / 25 % / adaptive | **Solo investigación** — no aprobados |
| Setup Readiness | **Read-only decision support** |
| Dashboard / reporting | **No** son lógica de ejecución |
| Gates / live / `OrderSend` | **No** en este checkpoint |
| MQL5 / TypeScript producto | **Sin cambios** en E5.20.5 |
| MT5 / Strategy Tester | **No ejecutar** desde esta tarea |
| Artefactos `*_DO_NOT_COMMIT` | **No** commitear |

---

## 7. Orden de trabajo actualizado (E5.20.x)

```text
E5.20     Plan consumo read-only          [done]
E5.20.1   Bundle index CLI                [done]
E5.20.2   Latest valid report CLI         [done]
E5.20.5   Humanized acceptance policy V1  [done — governance only]
E5.20.6   Humanized acceptance casebook   [done — HA-001 … HA-010, docs only]
E5.20.3   Dashboard read-only adapter       [paused — resume after PM review E5.20.5/E5.20.6]
E5.20.4   Dashboard mock / prototype      [paused — after E5.20.3]
E5.21+    Alerts / gates / live           [deferred — explicit governance only]
```

**Orden recomendado:** E5.20.5 → E5.20.6 → revisión PM → **E5.20.3** → E5.20.4 → E5.21.

**Casebook:** [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md) — patrones concretos; Cursor no infiere casos fuera de HA-001 … HA-010.

---

## 8. Trabajo futuro explícitamente fuera de E5.20.5

| Track | Cuándo | Notas |
|-------|--------|-------|
| Implementar política en exports MQL5 | Checkpoint futuro con gobernanza | No inferir por Cursor |
| Calibración multi-bundle de umbrales near-miss | Post evidencia | No un solo SET001 |
| Evidence-based gates (E5.20+ deferred) | Post E5.20.4 + multi-bundle | North Star §14 |
| Cambio entry / TP / edge approval | Decisiones PM separadas | Parameter governance |

---

## 9. Referencias

- North Star: [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
- Humanization roadmap: [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)
- Consumo dashboard: [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- Readiness policy: [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md)
- Report contract: [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md)
- Entry candidate research: [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md)
- Handoff: [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- Execution guide: [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- Casebook V1: [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
