# Humanized Textual Trade Cards — E5.22.4.2

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.4.2 — trade cards textuales desde ejemplos reales SET001 |
| **Tipo** | Documentación — **sin implementación** |
| **Baseline Git** | `2a7ff2f` o posterior — `docs(mapazapp): E5.22.4.1 humanized casebook examples evidence` |
| **Fuente de IDs** | [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md) |
| **Plantilla base** | [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md) §8 |
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` · XAUUSD M15 · `MZP_TestEA_E5_18` |
| **Siguiente** | **E5.22.5** — trade-set delta design (baseline oficial vs política humanizada research) |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, renderer, dashboard, gates, live, entry/TP, edge/25/adaptive, canales |

---

## 1. Por qué existe este documento

**E5.22.4.1** seleccionó trade IDs reales del bundle SET001 y los agrupó por caso HA y categorías de calibración. Eso demostró que la humanización puede anclarse a filas concretas del export, pero los JSON/CSV del selector no son legibles como narrativa de trading.

**E5.22.4.2** convierte esos ejemplos seleccionados en **trade cards textuales**: representación humana del mismo trade — contexto, formación implícita, entrada, blockers, outcome y hipótesis humanizada futura.

El objetivo es entender el setup **como lo haría un trader**: qué vio el sistema, qué revisaría en el gráfico, y qué implicaría una política humanizada **sin** cambiar hoy el trade set oficial.

| No es | Sí es |
|-------|-------|
| Implementación / renderer / dashboard | Spec textual docs-only |
| Gate o permiso de entrada | Referencia cualitativa para E5.22.5 |
| Aprobación edge/25/adaptive | Contraste research-only donde aplica |

**Datos:** campos tomados del selector local [`_local_E5_22_4_1_humanized_casebook_examples_DO_NOT_COMMIT/`](./_local_E5_22_4_1_humanized_casebook_examples_DO_NOT_COMMIT/) (no commiteado). Precios/zonas FVG no están en el JSON del selector — se marcan como revisión visual.

---

## 2. Formato de card

Cada card sigue esta estructura:

| Bloque | Contenido |
|--------|-----------|
| **Card ID** | TC-01 … TC-10 |
| **Trade ID** | `VTR_xxxxxx` |
| **HA / categoría** | Caso casebook y bucket del selector |
| **Direction** | BUY / SELL |
| **Entry time / session** | ISO + bucket sesión |
| **Outcome / result R** | Outcome oficial + R |
| **Readiness** | decision / score / grade / primary_blocker |
| **Snapshot IFVG / PD / target / env / discipline** | Grades y flags exportados |
| **Snapshot entry/fill** | fill_status, near-miss, late |
| **Snapshot variantes** | edge/25/adaptive sim si relevante |
| **Qué vio el sistema** | Narrativa desde checklist + campos export |
| **Qué revisaría un trader** | Lista visual (HTF, sweep, zona, retest, sesión, target) |
| **Utilidad para humanización** | Por qué este trade educa la política futura |
| **Hipótesis humanizada futura** | Acción research — no activa hoy |
| **Qué NO debe cambiar hoy** | Gobernanza por card |

---

## 3. Trade cards (10)

---

### TC-01 — Clean candidate winner

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-01 |
| **Trade ID** | `VTR_000003` |
| **HA / categoría** | CAL · `candidate_winner` |
| **Direction** | BUY |
| **Entry time / session** | 2025-01-02T12:00:00Z · `london_new_york_overlap` |
| **Outcome / result R** | win · **+2R** |
| **Readiness** | candidate · score **70** · grade **B** · blocker **none** |
| **IFVG / PD / target / env / discipline** | IFVG B · no conflict · PD ok · target C · env B · discipline A · vol high · spread normal |
| **Entry / fill** | filled · no near-miss · no late |
| **Variantes** | edge win (+2R sim) · 25 ambiguous |

**Qué vio el sistema**

Checklist alineado: bias, liquidez, IFVG, entry feasible, target before liquidity, environment ok, discipline ok → **candidate**. Sin blocker primario. Trade oficial CE llenado y TP RR2 alcanzado (+2R).

**Qué revisaría un trader**

Sesión overlap Londres/NY; alineación HTF bias con BUY; calidad del retest IFVG (grade B); si el target C es liquidez defendible o solo RR2 mecánico; confirmación de sweep/MSS en M15.

**Utilidad para humanización**

Modelo de **candidate fuerte**: readiness y outcome coinciden. Sirve de ancla positiva sin convertir `candidate` en gate automático.

**Hipótesis humanizada futura**

Mantener en baseline oficial; en política futura podría ser **prioridad de revisión** (no auto-entry) cuando multi-bundle confirme separación candidate vs reject.

**Qué NO debe cambiar hoy**

No tratar candidate como permiso de entrada; no alterar 50%/CE; no gate MQL5.

---

### TC-02 — Candidate loser

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-02 |
| **Trade ID** | `VTR_000061` |
| **HA / categoría** | CAL · `candidate_loser` |
| **Direction** | BUY |
| **Entry time / session** | 2025-01-22T14:00:00Z · `london_new_york_overlap` |
| **Outcome / result R** | loss · **-1R** |
| **Readiness** | candidate · score **80** · grade **B** · blocker **entry_fragile** |
| **IFVG / PD / target / env / discipline** | IFVG C · no conflict · PD ok · target C · env B · discipline C · overtrading warning |
| **Entry / fill** | filled · **entry_filled_late** true |
| **Variantes** | edge win (+2R sim) · 25 loss |

**Qué vio el sistema**

Score alto (80) y decisión **candidate**, pero `entry_fragile` y fill tardío. Outcome oficial **loss -1R**. Sim edge muestra win — contraste timing/entry, no aprobación de variante.

**Qué revisaría un trader**

¿Entrada tardía (chase) tras ruptura? Calidad IFVG C vs contexto; overlap con volatilidad alta; disciplina C y overtrading warning; si el SL fue alcanzado por mala ubicación de CE.

**Utilidad para humanización**

Demuestra que **candidate ≠ garantía**. Una política basada solo en score/decisión fallaría sin contexto de fill y fragilidad.

**Hipótesis humanizada futura**

Posible **downgrade** candidate→wait o reject cuando `entry_fragile` + `entry_filled_late` — solo tras calibración multi-bundle.

**Qué NO debe cambiar hoy**

No gate candidate-only; no promover edge por sim win; no cambiar entry oficial.

---

### TC-03 — High-score reject / PD conflict winner

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-03 |
| **Trade ID** | `VTR_000001` |
| **HA / categoría** | HA-004 · `pd_conflict_winner` · CAL `reject_winner` · `high_score_reject_winner` |
| **Direction** | BUY |
| **Entry time / session** | 2025-01-02T03:00:00Z · `asian` |
| **Outcome / result R** | win · **+2R** |
| **Readiness** | reject · score **90** · grade **A** · blocker **pd_conflict** |
| **IFVG / PD / target / env / discipline** | IFVG B · **pd_conflict** · target A · env B · discipline A |
| **Entry / fill** | filled · no late |
| **Variantes** | edge win · 25 ambiguous |

**Qué vio el sistema**

Checklist casi perfecto (score 90, grade A) pero **pd_conflict** → **reject**. CE oficial llenado; resultado **+2R**. El sistema “rechazó” un trade ganador por PD.

**Qué revisaría un trader**

¿El precio de entrada estaba realmente en zona premium/discount conflictiva? MSS/CHOCH y liquidez; si PD conflict es falso positivo o severidad excesiva en SET001.

**Utilidad para humanización**

Prueba clave: **PD conflict no puede ser hard reject** en este bundle sin destruir R positivo.

**Hipótesis humanizada futura**

**Rescued reject**: recalibrar severidad PD (downgrade a wait, no skip total) en política research E5.22.5.

**Qué NO debe cambiar hoy**

No activar reject PD en MQL5; no modificar trade set; no gate.

---

### TC-04 — PD + IFVG conflict loser (multi-HA)

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-04 |
| **Trade ID** | `VTR_000021` |
| **HA / categoría** | HA-004 `pd_conflict_loser` · HA-007 `no_chase_late_entry` · HA-009 `ifvg_conflict_loser` · HA-003 `variant_research_better_than_official` |
| **Direction** | BUY |
| **Entry time / session** | 2025-01-09T03:00:00Z · `asian` |
| **Outcome / result R** | loss · **-1R** |
| **Readiness** | reject · score **60** · grade **C** · blocker **ifvg_conflict** (también pd_conflict en reasons) |
| **IFVG / PD / target / env / discipline** | IFVG C · **ifvg_conflict** · **pd_conflict** · target C · env B · discipline A · overtrading warning |
| **Entry / fill** | filled · **entry_filled_late** true · entry_fragile |
| **Variantes** | edge win · 25 win (+2R sim) |

**Qué vio el sistema**

Combinación tóxica: IFVG conflict + PD conflict + entry frágil/tardío → reject acertado en espíritu. Pérdida oficial -1R. Sim edge/25 **ganan** — uplift research-only.

**Qué revisaría un trader**

Conflicto IFVG con dirección; PD en zona incorrecta; chase en sesión asiática; si el movimiento era válido pero la entrada oficial fue mala (explica sim edge win).

**Utilidad para humanización**

Muestra cuándo **reject tiene sentido** (blockers compuestos) vs cuándo PD solo (TC-03) no basta.

**Hipótesis humanizada futura**

**Confirmed reject** en delta E5.22.5; posible skip IFVG-conflict + late entry; variantes permanecen research.

**Qué NO debe cambiar hoy**

No aprobar edge/25; no skip automático MQL5; no cambiar CE.

---

### TC-05 — IFVG conflict loser

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-05 |
| **Trade ID** | `VTR_000014` |
| **HA / categoría** | HA-009 `ifvg_conflict_loser` · HA-003 `variant_research_better_than_official` |
| **Direction** | SELL |
| **Entry time / session** | 2025-01-07T03:00:00Z · `asian` |
| **Outcome / result R** | loss · **-1R** |
| **Readiness** | reject · score **60** · grade **C** · blocker **ifvg_conflict** |
| **IFVG / PD / target / env / discipline** | IFVG C · **ifvg_conflict** · PD ok · target C · env B · discipline A |
| **Entry / fill** | filled · no late |
| **Variantes** | edge win · 25 win (+2R sim) |

**Qué vio el sistema**

IFVG en conflicto con dirección SELL → reject. Pérdida oficial. Segmento agregado IFVG-conflict muy negativo en SET001 (~-417R en baseline). Sim edge/25 ganan — patrón “oficial mal, variante mejor”.

**Qué revisaría un trader**

Inversión/retest IFVG vs bias; si el trade era contra estructura IFVG; calidad del CE; sesión y liquidez asiática.

**Utilidad para humanización**

Ancla del comportamiento **tóxico IFVG conflict** — candidato fuerte a downgrade futuro, no gate inmediato.

**Hipótesis humanizada futura**

Posible **skip o downgrade** IFVG-conflict tras confirmación multi-bundle; variantes **no** sustituyen entry oficial.

**Qué NO debe cambiar hoy**

No gate IFVG en MQL5; no edge approval.

---

### TC-06 — Rare IFVG conflict winner

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-06 |
| **Trade ID** | `VTR_000341` |
| **HA / categoría** | HA-009 · `ifvg_conflict_rare_winner` |
| **Direction** | BUY |
| **Entry time / session** | 2025-04-14T04:30:00Z · `asian` |
| **Outcome / result R** | win · **+2R** |
| **Readiness** | reject · score **54** · grade **Weak** · blocker **ifvg_conflict** |
| **IFVG / PD / target / env / discipline** | IFVG Weak · **ifvg_conflict** · target C · env Weak · discipline C · vol extreme · overtrading |
| **Entry / fill** | filled · **entry_filled_late** |
| **Variantes** | edge win · 25 loss |

**Qué vio el sistema**

IFVG conflict + reject + score bajo — pero outcome **win +2R**. Excepción rara frente al segmento negativo global. También late entry y entorno débil.

**Qué revisaría un trader**

¿Falso positivo de IFVG conflict? Contexto extremo de volatilidad; si el win fue lucky o estructura válida; por qué readiness subestimó el trade.

**Utilidad para humanización**

Impide convertir IFVG conflict en **gate binario** desde un solo bundle.

**Hipótesis humanizada futura**

**Exception handling** en E5.22.5: reglas de severidad, no prohibición absoluta; posible lista de rescate con condiciones estrictas.

**Qué NO debe cambiar hoy**

No skip IFVG global; no promover late entry.

---

### TC-07 — Wait winner

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-07 |
| **Trade ID** | `VTR_000037` |
| **HA / categoría** | HA-010 · `wait_winner` |
| **Direction** | SELL |
| **Entry time / session** | 2025-01-14T19:30:00Z · `off_session` |
| **Outcome / result R** | win · **+2R** |
| **Readiness** | wait · score **64** · grade **C** · blocker **execution_environment_weak** |
| **IFVG / PD / target / env / discipline** | IFVG C · PD ok · target C · env **Weak** · discipline B · overtrading |
| **Entry / fill** | filled · no late |
| **Variantes** | edge win · 25 loss |

**Qué vio el sistema**

Decisión **wait** (contexto incompleto — entorno débil) pero trade oficial ejecutado y **+2R**. En SET001 el segmento wait es fuerte en agregado (+150R en baseline).

**Qué revisaría un trader**

Si “wait” debió ser candidate; calidad off-session; target before liquidity; spread/vol en off_session.

**Utilidad para humanización**

**Wait ≠ reject**. Muchos waits son setups fuertes pendientes de calibración de entorno/target.

**Hipótesis humanizada futura**

**Wait→candidate** review en política research; no auto-promoción sin reglas.

**Qué NO debe cambiar hoy**

No convertir wait en entry automática; no gate wait.

---

### TC-08 — Wait loser

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-08 |
| **Trade ID** | `VTR_000125` |
| **HA / categoría** | HA-010 · `wait_loser` |
| **Direction** | BUY |
| **Entry time / session** | 2025-02-11T05:45:00Z · `asian` |
| **Outcome / result R** | loss · **-1R** |
| **Readiness** | wait · score **64** · grade **C** · blocker **execution_environment_weak** |
| **IFVG / PD / target / env / discipline** | IFVG C · target **Weak** · target_missing_proxy · env **None** · vol **extreme** |
| **Entry / fill** | filled · no late |
| **Variantes** | edge loss · 25 ambiguous |

**Qué vio el sistema**

Misma familia wait que TC-07 pero **loss -1R**. Entorno extremo y target débil. Demuestra incertidumbre del bucket wait.

**Qué revisaría un trader**

Sesión asiática + vol extreme; liquidez/target; si wait fue correcto operativamente (no operar) aunque el tester igual ejecutó.

**Utilidad para humanización**

Evita **auto-promover** todos los wait a candidate.

**Hipótesis humanizada futura**

Wait permanece **uncertain** en delta; filtros adicionales (env + target) antes de promoción.

**Qué NO debe cambiar hoy**

No política wait→candidate en MQL5.

---

### TC-09 — Near-miss / shallow retrace unfilled

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-09 |
| **Trade ID** | `VTR_000002` |
| **HA / categoría** | HA-001 `near_miss_ce_acceptable` · HA-002 `near_miss_weak_reaction` |
| **Direction** | BUY |
| **Entry time / session** | 2025-01-02T08:15:00Z · `asian` |
| **Outcome / result R** | expired_unfilled · **0R** |
| **Readiness** | reject · score **70** · grade **B** · blocker **entry_fragile** |
| **IFVG / PD / target / env / discipline** | IFVG A · no conflict · target None · target_missing_proxy · env B · overtrading |
| **Entry / fill** | **missed_shallow_retrace** · CE no llenado |
| **Variantes** | edge win (+2R sim) · 25 not_filled |

**Qué vio el sistema**

CE oficial **no llenado** (0R). Checklist con IFVG A y bias ok, pero entry_fragile + target_missing. Sim **edge win** sugiere que un fill alternativo habría ganado — sin campo `reaction_strength` en export.

**Qué revisaría un trader**

¿Retroceso shallow válido sin reacción medida? Tolerancia CE 50%; vela de rechazo; si aceptar near-miss es prudente sin reaction_strength.

**Utilidad para humanización**

Define el problema **HA-001/002**: near-miss no aceptable hasta medir reacción y tolerancia.

**Hipótesis humanizada futura**

Posible **trade añadido** al set humanizado solo tras export de `reaction_strength` + calibración — no hoy.

**Qué NO debe cambiar hoy**

No cambiar selección 50%/CE; no añadir trades near-miss al set oficial.

---

### TC-10 — Target missing winner

| Campo | Valor |
|-------|-------|
| **Card ID** | TC-10 |
| **Trade ID** | `VTR_000192` |
| **HA / categoría** | HA-006 · `target_missing_winner` |
| **Direction** | SELL |
| **Entry time / session** | 2025-02-28T16:15:00Z · `new_york` |
| **Outcome / result R** | win · **+2R** |
| **Readiness** | reject · score **74** · grade **B** · blocker **target_missing** |
| **IFVG / PD / target / env / discipline** | IFVG A · target None · **target_missing_proxy** · env Weak · vol extreme · overtrading |
| **Entry / fill** | filled |
| **Variantes** | edge win · 25 win |

**Qué vio el sistema**

**target_missing** como blocker primario → reject, pero RR2 oficial **+2R**. Target grade None — liquidez objetivo no defendida en checklist aunque TP mecánico exista.

**Qué revisaría un trader**

Nearest liquidity vs TP RR2; sesión NY y vol extreme; si el target “missing” es diagnóstico o error de clasificación.

**Utilidad para humanización**

Target/discipline labels son **diagnósticos**, no hard gates (alternativa TC-10: `VTR_000036` discipline pressure winner — misma lección).

**Hipótesis humanizada futura**

Downgrade o wait por target policy **calibrada** — no reject automático por target_missing solo.

**Qué NO debe cambiar hoy**

No hard reject target en MQL5; no cambiar TP RR2.

---

## 4. Resumen de interpretación humanizada

| Tema | Lectura SET001 (desde cards) |
|------|------------------------------|
| **Candidate** | Útil (TC-01) pero insuficiente para gate (TC-02 pierde con score 80). |
| **Wait** | Contiene setups valiosos (TC-07) y pérdidas (TC-08) — requiere calibración, no auto-promoción. |
| **Reject** | Mezcla tóxicos reales (TC-04, TC-05) y falsos positivos (TC-03). |
| **PD conflict** | Mal calibrado como blocker duro (TC-03 gana; TC-04 pierde con IFVG). |
| **IFVG conflict** | Fuertemente negativo en agregado, con excepciones raras (TC-06). |
| **Near-miss** | No aceptable sin `reaction_strength` (TC-09). |
| **Target / env / discipline** | Diagnóstico (TC-10, TC-07/08) — no bloqueo automático hoy. |
| **Edge/25/adaptive** | Research-only (TC-04, TC-05, TC-09) — no aprobación. |

---

## 5. Implicaciones para trade-set delta (E5.22.5)

| Card | Trade | Implicación delta research |
|------|-------|---------------------------|
| TC-01 | candidate winner | **Baseline kept** — referencia positiva |
| TC-02 | candidate loser | Posible **downgrade** futuro |
| TC-03 | PD conflict winner | Posible **rescued reject** |
| TC-04 | PD+IFVG loser | Posible **confirmed reject** |
| TC-05 | IFVG conflict loser | Posible **skip/downgrade** futuro |
| TC-06 | IFVG rare winner | **Exception handling** — no gate absoluto |
| TC-07 | wait winner | Posible **wait→candidate** |
| TC-08 | wait loser | Wait **uncertain** — no auto-promote |
| TC-09 | near-miss unfilled | Posible **trade añadido** solo con reaction_strength |
| TC-10 | target missing winner | Label **diagnostic** — no block automático |

E5.22.5 debe auditar: **trade set baseline oficial** vs **trade set hipotético** bajo política humanizada documentada — sin ejecutar cambios en MQL5.

---

## 6. Qué no debe cambiar hoy

- Sin cambio al **trade set oficial**
- Sin **gates** ni live trading
- Sin cambios **entry / TP**
- Sin aprobación **edge / 25 % / adaptive**
- Sin cambios **MQL5**
- Sin **dashboard / Telegram / email / push**
- Sin commitear artefactos `_local_*_DO_NOT_COMMIT`

---

## 7. Relación con E5.22.5

Las diez cards forman el **primer conjunto de referencia cualitativa** para **E5.22.5 — Humanized activation / trade-set delta design**:

1. Cada card etiqueta si el trade permanecería, se rescataría, degradaría o excluiría en un escenario humanizado **research-only**.
2. El delta audit comparará conteos y R agregados: oficial 50%/CE vs hipótesis documentada (rescued reject, confirmed reject, wait promotion, near-miss add, etc.).
3. No sustituyen evidencia multi-bundle ni aprobación PM — preceden el diseño del audit spec.

**Orden engine-first:** E5.22.4.1 (IDs) → E5.22.4.2 (cards, este doc) → **E5.22.5** (delta design) → E5.24+ robustez multi-bundle antes de cualquier activación MQL5.

---

## Referencias

- [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md)
- [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md)
- [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
