# Trade Model Visual/Textual Representation — E5.22.3

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.3 — representación textual/spec del modelo de trade (docs-only) |
| **Tipo** | Documentación de modelo — **sin implementación** |
| **Baseline Git** | `f5f659d` o posterior — `docs(mapazapp): E5.22.2.1 setup performance baseline evidence` |
| **Evidencia previa** | [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md) — **PASS** |
| **E5.22.4** | [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md) — **cerrado (docs)** |
| **E5.22.4.1** | [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md) — selector CLI |
| **Siguiente recomendado** | Evidencia SET001 E5.22.4.1 · **E5.22.4.2** trade cards · **E5.22.5** delta design |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, gates, live, entry/TP, edge/25/adaptive, dashboard/Telegram |

---

## 1. Por qué existe este documento

Tras **E5.22.2.1** sabemos que el motor en SET001 es **positivo en R pero ruidoso** (+315R oficial, ~26 % ambigüedad, readiness que separa fuerte candidate/wait vs reject). Eso no basta para operar ni para gates.

El siguiente paso **engine-first** es describir con claridad **qué cree el sistema que está operando**: el setup que detecta, por qué acepta en sentido de `candidate` / `wait` / `reject`, y cómo eso se relaciona con el concepto de setup humanizado que documenta el casebook (E5.20.6).

Este documento:

- **No** es implementación de código.
- **No** es feature de dashboard ni canal Telegram/alertas.
- **No** es un renderizador de gráficos MT5 todavía.

Es una **representación estructurada textual + spec visual** del trade model, reutilizable para auditorías, ejemplos futuros y el puente hacia **E5.22.4** (medibilidad HA).

---

## 2. Modelo oficial de trade (hoy)

| Dimensión | Estado actual |
|-----------|---------------|
| **Symbol lab** | XAUUSD M15 (bundle benchmark SET001) |
| **HTF bias** | D1 / contexto HTF bias exportado por TestEA |
| **Entry oficial** | **50 % / CE** |
| **TP oficial** | **RR2** |
| **SL** | Modelo de stop del TestEA exportado (virtual/backtest) |
| **Outcome** | Solo virtual / Strategy Tester — sin ejecución live |
| **Readiness** | **Diagnóstico** — candidate/wait/reject, score, grades, blockers |
| **Gates** | **Ninguno** |
| **Live trading** | **Prohibido** en esta fase |
| **Edge / 25 % / adaptive** | **Research-only** — no entry oficial |

**Invariante:** lo que el sistema “tradea” en evidencia es la simulación virtual con la política oficial de entry/TP; readiness describe calidad de setup para revisión humana, no permiso de entrada.

---

## 3. Narrativa de setup en tres etapas

El trade se representa como secuencia **A → B → C**, alineada con exports TestEA y checklist readiness.

### Stage A — Context

| Elemento | Rol en el modelo |
|----------|------------------|
| HTF bias | Dirección estructural de marco superior |
| Market direction | Alineación operativa M15 vs bias |
| Session | Bucket de sesión (asian, london, overlap, off_session, …) |
| Volatility / spread | Etiquetas V1 — hoy **stress/diagnóstico**, no gate duro |
| PD / premium-discount | Zona relativa al rango — conflictos `pd_conflict` frecuentes en reject |
| Liquidity target | Disponibilidad / calidad de objetivo de liquidez |

**Pregunta del trader:** ¿El contexto macro y de sesión justifican buscar setup en esta dirección?

### Stage B — Setup formation

| Elemento | Rol en el modelo |
|----------|------------------|
| Sweep / liquidity event | Activación de narrativa de liquidez |
| FVG / IFVG / BISI / SIBI | Zona de ineficiencia y clasificación |
| MSS / CHoCH / structure | Confirmación o conflicto estructural |
| Inversion / retest / conflict | `ifvg_conflict`, `retest_detected` — alto impacto en SET001 |
| Entry zone creation | Zona CE / 50 % y factibilidad de fill |

**Pregunta del trader:** ¿Se formó el patrón que el playbook describe (sweep → shift → zona → retest)?

### Stage C — Entry decision

| Elemento | Rol en el modelo |
|----------|------------------|
| Official CE/50 % entry | Precio/nivel de entrada simulado |
| Fill feasibility | filled / missed_shallow_retrace / near_miss / expired_unfilled |
| Target RR2 | TP oficial vs liquidez cercana |
| Readiness | `candidate` / `wait` / `reject` + score + grade |
| Blockers / warnings | Lista checklist — calibración en curso |
| Discipline context | overtrading, revenge, daily limits — etiquetas de riesgo |
| Outcome | win / loss / ambiguous / expired_* → `result_r` |

**Pregunta del trader:** ¿Entraría yo aquí, esperaría, o descartaría — y coincide con lo que dice readiness?

---

## 4. Modelo «candidate»

### Definición operativa (hoy)

| Aspecto | Significado |
|---------|-------------|
| **Qué es** | Contexto **suficientemente fuerte** para **revisión manual** — no permiso de entrada |
| **Warnings** | Pueden seguir presentes (en SET001, 100 % de candidates tienen warnings en calibración E5.18.3) |
| **Qué debe mostrar** | Score, decision, grade, **primary blocker**, warnings — no solo el número de score |
| **Qué no es** | Gate, señal live, ni “go trade” |

### Hechos SET001 (E5.22.2.1)

| Métrica | Valor |
|---------|------:|
| Count | 247 |
| Total R | +279 |
| Avg R | 1.129555 |
| Winrate | 82.5 % |

**Lectura:** en este bundle, `candidate` correlaciona con outcome fuerte; eso **refuerza** que readiness es significativo, pero **no** aprueba usar candidate como gate desde un solo bundle.

---

## 5. Modelo «wait»

### Definición operativa (hoy)

| Aspecto | Significado |
|---------|-------------|
| **Qué es** | Contexto **incompleto** pero **no invalidado** — observar evolución |
| **Urgencia** | Ninguna — no es reject duro |
| **Acción humana esperada** | Observar completitud (estructura, fill, PD, IFVG) |
| **Calibración** | En SET001 performa casi al nivel de candidate → posible mezcla de “casi listo” |

### Hechos SET001 (E5.22.2.1)

| Métrica | Valor |
|---------|------:|
| Count | 150 |
| Total R | +150 |
| Avg R | 1.0 |
| Winrate | 82.3 % |

**Lectura:** `wait` no es “basura”; puede contener setups casi listos que merecen **revisión de umbrales** en futura calibración (sin cambiar entry/TP en esta fase).

---

## 6. Modelo «reject»

### Definición operativa (hoy)

| Aspecto | Significado |
|---------|-------------|
| **Qué es** | Sistema detectó blocker y/o readiness bajo — **descartar para revisión automática** |
| **Agregado SET001** | Negativo en R y winrate |
| **Excepción crítica** | Sigue conteniendo **winners** (reject_win en ejemplos del audit) |
| **Gate** | **No** calibrado como hard reject todavía |

### Hechos SET001 (E5.22.2.1)

| Métrica | Valor |
|---------|------:|
| Count | 1300 |
| Total R | -114 |
| Avg R | -0.087692 |
| Winrate | 27.2 % |

**Lectura:** reject **filtra mucho ruido** pero **no** es binario perfecto; calibración por blocker (especialmente `pd_conflict`, `execution_environment_weak`) es obligatoria antes de cualquier gate.

---

## 7. Modelo de interpretación de blockers

Basado en [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md):

| Blocker | Comportamiento SET001 | Acción recomendada |
|---------|----------------------|-------------------|
| **ifvg_conflict** | Fuertemente tóxico (-248R, winrate ~0.8 %) | Candidato fuerte a **calibración futura**; **no** gate aprobado |
| **pd_conflict** | Sorprendentemente positivo (+157R, winrate ~82 %) | **No** hard reject sin recalibración |
| **execution_environment_weak** | Positivo (+136R) | **No** usar como reject fiable aún |
| **structure_conflict** | Mixto (+108R, winrate ~44 %) | Segmentación más profunda |
| **entry_fragile** | Mixto, muchos unfilled (+27R) | Revisar con fill / near-miss |

**Principio:** un blocker en checklist es una **hipótesis de riesgo**, no un veredicto final hasta validación multi-bundle y alineación con casebook HA.

---

## 8. Plantilla textual «chart image»

Plantilla reutilizable para representar **cualquier trade** (fila CSV / ejemplo JSON) sin render gráfico:

```text
═══════════════════════════════════════════════════════════
 TRADE CARD — Mapazapp TestEA (textual spec)
═══════════════════════════════════════════════════════════
Trade ID:              <VTR_xxxxxx>
Direction:             <long|short>
Time/session:          <bar time> | <session_bucket>
HTF bias:              <bias field / checklist_bias_*>
Market context:        <direction, volatility_bucket, spread_bucket>

── Stage A: Context ──
Liquidity sweep:       <yes/no + detail from export>
PD zone:               <premium|discount|conflict>
Nearest liquidity:     <type, distance, before-TP flag>

── Stage B: Formation ──
Structure shift:       <MSS|CHoCH|conflict>
FVG/IFVG zone:         <zone bounds / grade>
BISI/SIBI:             <classification>
Inversion/retest:      <ifvg_conflict, retest_detected>
Entry zone:            <CE 50% bounds>

── Stage C: Decision ──
Official entry:        50% / CE @ <price>
Fill result:           <filled|missed_shallow_retrace|near_miss|expired_*>
SL:                    <stop model / price>
Official TP RR2:       <tp price / R multiple>
Target quality:        <target_grade, supported, tp_before_nearest>

Readiness decision:    <candidate|wait|reject>
Score / grade:         <score> / <setup_readiness_grade>
Primary blocker:       <setup_readiness_primary_blocker>
Warnings:              <checklist warnings list>
Discipline context:    <discipline_grade, overtrading, revenge>

── Outcome ──
Outcome:               <win|loss|ambiguous|expired_*>
Result R:              <result_r>

── Human layer ──
Humanized interpretation:  <accept review|wait|reject|observe|no-trade — policy only>
What trader checks visually: <HTF, sweep, zone, retest, session, target>
Why candidate/wait/reject:   <score override vs blocker narrative>
What is missing:             <fields not in export — mark explicitly>
═══════════════════════════════════════════════════════════
```

Esta plantilla es la base para **E5.22.3.1+** (trade cards con IDs reales) y para **E5.22.4** (mapear campos HA).

---

## 9. Tipos de ejemplo (a rellenar después)

Los siguientes tipos se **definen** aquí; el contenido con trade IDs reales es trabajo futuro (**E5.22.3.1**).

| Tipo | Propósito |
|------|-----------|
| **A. Candidate winner** | Modelo ideal actual — readiness + outcome alineados |
| **B. Wait winner** | Setup incompleto pero válido visualmente |
| **C. Reject winner** | Calibración de blocker posiblemente incorrecta (`reject_win`, `pd_conflict_win`) |
| **D. IFVG conflict loser** | Patrón tóxico (`ifvg_conflict`, retest_detected) |
| **E. PD conflict winner** | Por qué PD no puede ser hard reject aún |
| **F. Near-miss / expired unfilled** | Aceptación humanizada vs 0R en sim |
| **G. Edge variant win / official loss** | Solo research — contraste 50 % vs edge |

Fuente de datos: `backtest_trades.csv` + ejemplos en JSON de E5.22.2.1 (`reject_win`, `candidate_win`, `edge_variant_win_where_official_lost`, etc.).

---

## 10. Interpretación del setup humanizado

| Principio | Detalle |
|-----------|---------|
| **Qué es** | Interpretación **basada en reglas** de condiciones de mercado imperfectas pero significativas |
| **Qué no es** | IA generativa ni discreción libre sin trazabilidad a checklist/export |
| **Estados objetivo (futuro)** | accept for manual review, wait, reject, observe, no-trade |
| **Estado hoy** | Gobernanza + casebook ([`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)) — **no** lógica MQL5 de aceptación oficial |
| **Futuro (PM)** | Debe **afectar el trade set** (oficial o research) — no solo informes |

Readiness **informa** la capa humanizada; no la sustituye. La humanización **real** no es válida si solo cambia wording: debe poder medirse como **cambio en qué trades entran al conjunto simulado** (ver §17).

**E5.22.2.1** demuestra que readiness separa outcome, pero el outcome MT5 oficial sigue siendo 50 %/CE sin filtros humanizados activos.

---

## 11. Qué hace bien el modelo actual

Basado en E5.22.2.1:

| Fortaleza | Evidencia |
|-----------|-----------|
| Readiness separa calidad | candidate/wait +429R vs reject -114R |
| Candidate/wait fuertes en SET001 | winrate ~82 %+ |
| IFVG conflict significativo | -417R segmento conflict=true |
| Oficial 50 %/CE positivo | +315R agregado |
| Export rico para análisis | trades, readiness, grades, variantes, disciplina |

---

## 12. Qué hace mal o es incierto

| Debilidad | Evidencia |
|-----------|-----------|
| Reject contiene winners | reject_win, pd_conflict_win en ejemplos |
| PD conflict posiblemente mal clasificado | +157R bajo reject |
| Environment/volatility no son gates fiables | vol extreme mayoría trades; env weak positivo |
| Overtrading no degrada R aquí | avg_r positivo con flag true |
| Target quality no rankea claro | supported false mejor avg_r en SET001 |
| Ambigüedad alta | 25.7 % ambiguous, 0R |
| Variantes prometedoras pero sim-sensitive | edge +2733R research-only |

---

## 13. Qué no debe cambiarse aún

| Regla | Estado |
|-------|--------|
| Entry oficial 50 % / CE | **Sin cambio** |
| TP RR2 | **Sin cambio** |
| Aprobar edge / 25 % / adaptive | **Prohibido** |
| Gates MQL5 / live | **Prohibido** |
| Candidate = permiso de entrada | **Prohibido** |
| Readiness = gate final desde un bundle | **Prohibido** |

---

## 14. Camino futuro de implementación visual

| Etapa | Alcance | Tipo |
|-------|---------|------|
| **E5.22.3.1** | Elegir trade IDs reales SET001 por tipo §9 | Docs / ejemplos |
| **E5.22.3.2** | Trade cards textuales desde filas CSV | Docs / scripts locales opcionales |
| **E5.22.3.3** | Spec objetos gráficos MT5 (opcional) | Spec only |
| **E5.22.3.4** | Representación snapshot BridgeEA forward | Futuro |
| **Dashboard chart card** | Visual en UI | **Futuro** — tras gates PM; track pausado |

Ninguna etapa anterior implica cambiar entry/TP ni aprobar variantes.

---

## 15. Relación con E5.22.4

**E5.22.4 — Humanized Casebook Measurability Audit** — **cerrado:** [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md). El audit original debía:

1. Tomar casos **HA-001…HA-010** del casebook.
2. Mapearlos a campos disponibles en esta representación (Stage A/B/C + plantilla §8).
3. Clasificar **cada concepto** en una de estas cinco categorías (obligatorio):

| # | Categoría | Significado |
|---|-----------|-------------|
| 1 | **Measurable humanized** | Medible hoy con export + post-proceso TS |
| 2 | **Policy-only** | Solo E5.20.5/20.6; no altera trades |
| 3 | **Could change trade set later** | Puede incluir/excluir/reclasificar trades tras calibración |
| 4 | **Explain/report only today** | Solo explica readiness/outcome actual (dashboard, alertas, informes) |
| 5 | **Requires new export fields** | Bloqueado hasta nuevo campo MQL5 |

4. Marcar **missing measurement** donde el export no alcanza.
5. Priorizar gaps que impiden **trade-set delta** futuro (§17), no solo wording.

Este documento es el **puente** entre audit de performance (E5.22.2.1) y medibilidad de aceptación humanizada (E5.22.4).

---

## 17. Requisito futuro — trade-set delta audit

**No implementar en E5.22.3 / E5.22.4.** Documentar como requisito de verdad para humanización activa.

Cuando exista una política humanizada **research** (sin cambiar entry/TP oficial aún), todo activation checkpoint debe comparar contra **baseline oficial 50 % / CE**:

| Bucket research (ejemplos) | Efecto esperado en trade set |
|----------------------------|------------------------------|
| Accepted trades | Incluidos en conjunto humanizado |
| Rejected trades | Excluidos vs baseline |
| Rescued rejects | Re-incluidos (p. ej. `pd_conflict` no dañino) |
| Wait → candidate | Reclasificación + posible inclusión |
| Near-miss accepted | Puede **aumentar** `filled_count` |
| No-chase skipped | Puede **reducir** trades perseguidos |
| IFVG-conflict skipped | Reduce trades tóxicos (E5.22.2.1: -248R segmento) |
| PD-conflict recalibrated | Reclasifica sin hard reject |

**Métricas delta obligatorias:**

- `trade_count`, `filled_count`, `skipped_count`
- `total_r`, `avg_r`, `winrate`
- `max_drawdown_r`, `ambiguous_count`, `expired_unfilled_count`
- Matriz `candidate` / `wait` / `reject` (transiciones)
- **Razón por trade** añadido, eliminado o reclasificado (trazabilidad HA + blocker)

La humanización solo cuenta como implementada en motor si este delta es **reproducible** en bundle benchmark (SET001+), no si solo cambia etiquetas en UI.

---

## 18. Checkpoint futuro — E5.22.5

| Campo | Valor |
|-------|-------|
| **ID** | E5.22.5 — Humanized Acceptance Activation / Trade-set Delta Design |
| **Tipo** | Docs + spec (research-only) — **sin** MQL5/TS en fase design |
| **Propósito** | Diseñar cómo una política humanizada **research** se compara al baseline oficial sin cambiar entry/TP oficial |
| **Entregable** | Spec del delta audit §17 + reglas de buckets + criterios PASS para activación research |
| **Prerrequisitos** | E5.22.4 cerrado (medibilidad HA) |
| **Prohibido en E5.22.5 design** | Gates live, cambio entry/TP, aprobación edge/25/adaptive |

---

## 16. Gobernanza

| Acción | Estado |
|--------|--------|
| Cambios MQL5 / TypeScript | **No** |
| MT5 / Strategy Tester | **No** en esta tarea |
| Renderizador visual / dashboard | **No** |
| Gates / live / Telegram / email / push | **No** |
| Entry / TP / edge approval | **Prohibido** |
| Commitear `_local_*_DO_NOT_COMMIT` | **Prohibido** |

---

## Referencias

- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md)
- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
- [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md)
