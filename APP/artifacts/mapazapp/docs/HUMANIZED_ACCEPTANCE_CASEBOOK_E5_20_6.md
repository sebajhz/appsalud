# Humanized Acceptance Casebook V1 — E5.20.6

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.6 — casebook (docs-only) |
| **Tipo** | Ejemplos técnicos / gobernanza — **sin código** |
| **Baseline Git** | `321a18d` — `docs(mapazapp): align humanized setup acceptance with roadmap` |
| **Política padre** | [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md) |
| **Cursor** | **No** infiere lógica discrecional; solo documenta los casos definidos aquí |

---

## 1. Propósito

Traducir **E5.20.5** en **patrones de escenario concretos** que una futura implementación o dashboard pueda usar como referencia de wording, reason codes y relación con Setup Readiness.

Este documento **no** implementa reglas en MQL5/TypeScript, **no** aprueba edge/25/adaptive, **no** cambia entry oficial (**50 % / CE**) ni TP (**RR2**), y **no** crea gates ni ejecución live.

Si un campo medido requerido **no existe** hoy en exports TestEA, se marca explícitamente como **missing measurement / future field**. Cursor **no** rellena huecos por interpretación.

---

## 2. Invariantes canónicos (sin cambio)

| Tema | Estado |
|------|--------|
| Entry oficial | **50 % / CE** |
| TP oficial | **RR2** |
| Setup Readiness | **Read-only decision support** |
| Informes / dashboard | **Presentación**, no ejecución |
| Edge / 25 % / adaptive | **Solo investigación** |
| Aceptación humanizada | **Política**, no auto-ejecución |

---

## 3. Formato de caso

Cada caso sigue la estructura obligatoria: Case ID, Name, Scenario, Required measured conditions, Expected humanized label, Expected readiness relationship, Expected dashboard wording, Reason codes, What this does NOT approve, Missing measurements / future fields, Notes.

**Etiquetas humanizadas permitidas en este casebook:** `accept`, `wait`, `reject`, `observe`, `no-trade`, y compuestos documentados (`observe` / `accept-for-manual-review`, `research-candidate`) solo donde el caso lo fija.

---

## 4. Mapa de mediciones (referencia export actual)

| Concepto | Campos export típicos (si existen) | Fuente |
|----------|--------------------------------------|--------|
| Fill / near-miss | `entry_fill_status`, `missed_entry_by_points`, `entry_near_miss`, `entry_fill_feasibility_reasons` | E5.13.2 |
| Readiness | `setup_readiness_decision`, `setup_readiness_score`, `setup_readiness_primary_blocker`, `checklist_*` | E5.18 |
| PD / IFVG / target / env / discipline | `checklist_pd_conflict`, `checklist_ifvg_conflict`, `checklist_target_missing`, `checklist_environment_weak`, `checklist_overtrading_warning`, `discipline_*` | E5.18 + E5.17 |
| Liquidez | `liquidity_event_*`, `checklist_liquidity_ok` / `checklist_liquidity_missing` | E5.10 + E5.18 |
| MSS/CHoCH | `checklist_mss_choch_ok`, `checklist_mss_choch_late`, `mss_*`, `choch_*` | E5.12 + E5.18 |
| Variante edge (research) | `entry_variant_edge_sim_*` | E5.13.6 (si EVOS habilitado) |
| Official fill | Outcome virtual / `entry_fill_status` = `filled` | E5.3 + E5.13.2 |
| News / eventos | — | **No export canónico V1** (E5.16: sin calendar/news) |
| Chase / late entry explícito | — en fila trade oficial | **Missing** (V2-08 core only) |
| Reaction strength dedicado | — campo único | **Missing** (proxies: IFVG, cadena liquidez, MSS) |

---

## 5. Casos

### CASE HA-001 — Acceptable CE near-miss with strong reaction

**Case ID:** HA-001  
**Name:** Acceptable CE near-miss with strong reaction  

**Scenario:**  
Price does not touch official 50% / CE entry, but misses CE by a small measured distance and reacts strongly from inside/near the FVG.

**Required measured conditions:**
- official entry family = 50% / CE
- CE not filled
- `entry_fill_status` indicates `near_miss` or `missed_shallow_retrace`
- `missed_entry_by_points` is small relative to configured tolerance
- liquidity sweep is present
- IFVG/BISI/SIBI alignment is not conflict
- MSS/CHoCH is supportive or not late
- premium/discount is not conflict
- target quality is not missing
- execution environment is not hard-blocked
- discipline state is not hard-blocked

**Expected humanized label:**
- `observe` or `accept-for-manual-review`

**Expected readiness relationship:**  
May remain `wait` / `reject` in official backtest because official CE did not fill.  
Humanized policy may mark it as “acceptable near-miss for manual review”, not as official fill.

**Expected dashboard wording:**  
“CE no fue tocado, pero el precio quedó dentro de tolerancia y reaccionó con contexto válido. Revisar como near-miss aceptable.”

**Reason codes:**
- `humanized_near_miss_ce`
- `humanized_reaction_valid`
- `humanized_manual_review_required`

**What this does NOT approve:**
- Does not change official outcome.
- Does not approve edge.
- Does not auto-enter.
- Does not replace 50% / CE.

**Missing measurements / future fields:**
- Exact tolerance ratio may require calibrated near-miss threshold per symbol/profile.
- `humanized_*` reason codes are **policy-only** until a future export/checkpoint defines them.
- Dedicated **reaction strength** field not exported as single metric (use checklist/IFVG/MSS proxies only when those sub-conditions are true).

**Notes:**  
Map near-miss to `entry_fill_status` = `near_miss` and `missed_entry_by_points` ≤ `InpEntryFillFeasibilityNearMissPoints` (E5.13.2). “Strong reaction” is **not** a standalone export today — case requires supportive IFVG/MSS/liquidity checklist states, not invented reaction score.

---

### CASE HA-002 — Near-miss invalid because reaction is weak

**Case ID:** HA-002  
**Name:** Near-miss invalid because reaction is weak  

**Scenario:**  
Price almost reaches CE, but reaction is weak or ambiguous.

**Required measured conditions:**
- CE not filled
- near_miss detected
- IFVG grade weak or conflict
- displacement/reaction weak or absent
- target quality weak/missing OR environment weak
- no clear confirmation after near-miss

**Expected humanized label:**
- `observe` or `reject`

**Expected readiness relationship:**  
Not `candidate`.  
May be `wait` if context is incomplete, `reject` if blockers are critical.

**Expected dashboard wording:**  
“Near-miss detectado, pero la reacción no confirma intención. No perseguir entrada.”

**Reason codes:**
- `humanized_near_miss_weak_reaction`
- `humanized_no_chase`
- `humanized_observe_only`

**What this does NOT approve:**
- No manual chase.
- No late market entry.

**Missing measurements / future fields:**
- Reaction strength may need explicit exported field if not already represented by IFVG/MSS/CHoCH/reaction fields.
- `displacement/reaction weak or absent` — **no single export field**; proxy via `checklist_ifvg_weak` / `checklist_ifvg_conflict`, `checklist_mss_choch_late`, or missing `checklist_liquidity_ok` when applicable.

**Notes:**  
Do not infer weak reaction from near-miss alone; IFVG weak/conflict or environment/target weakness must be present per conditions above.

---

### CASE HA-003 — Edge reaction strong but still research-only

**Case ID:** HA-003  
**Name:** Edge reaction strong but still research-only  

**Scenario:**  
Price reacts from FVG edge and never reaches official CE.

**Required measured conditions:**
- official 50% / CE not filled
- edge variant filled in EVOS/research
- edge result may be win or strong reaction
- CE official remains unfilled
- context may be strong

**Expected humanized label:**
- `observe` / `research-candidate`

**Expected readiness relationship:**  
Can be shown as research insight only.  
Should not convert official entry to edge.

**Expected dashboard wording:**  
“Edge reaccionó, pero sigue siendo variante de investigación. No cambia la entrada oficial.”

**Reason codes:**
- `humanized_edge_research_only`
- `official_ce_not_filled`
- `no_entry_family_switch`

**What this does NOT approve:**
- Does not approve edge.
- Does not change official entry.
- Does not create gate.

**Missing measurements / future fields:**
- Future multi-bundle edge robustness evidence required before any approval discussion.
- Requires `has_entry_variant_outcome_sim_v1_logic` and `entry_variant_edge_sim_*` columns (E5.13.6); if EVOS disabled on bundle, edge sim fields **missing measurement** for this case.

**Notes:**  
`research-candidate` is a **display category** only, not an approved entry family.

---

### CASE HA-004 — Technically valid CE fill but skip due to PD conflict

**Case ID:** HA-004  
**Name:** Technically valid CE fill but skip due to PD conflict  

**Scenario:**  
Official CE is touched, but premium/discount context conflicts with trade direction.

**Required measured conditions:**
- official CE filled
- setup technically detected
- premium_discount conflict true OR checklist primary blocker = `pd_conflict`
- target/structure may be otherwise acceptable
- blocker_count > 0 or critical blocker present

**Expected humanized label:**
- `reject` / `no-trade`

**Expected readiness relationship:**  
High score may still become `reject` due to critical blocker.  
This matches E5.18.4 / E5.18.5 policy.

**Expected dashboard wording:**  
“Entrada oficial tocada, pero el contexto Premium/Discount invalida la aceptación humanizada.”

**Reason codes:**
- `humanized_valid_but_skip`
- `pd_conflict`
- `critical_blocker_override`

**What this does NOT approve:**
- No trade despite official fill.
- No score-only permission.

**Missing measurements / future fields:**
- None if `pd_conflict` is already exported (`checklist_pd_conflict`, `setup_readiness_primary_blocker` = `pd_conflict`).

**Notes:**  
Validated at scale in E5.18.3 (high-score rejects with `pd_conflict`).

---

### CASE HA-005 — Technically valid setup but no-trade due to overtrading / discipline

**Case ID:** HA-005  
**Name:** Technically valid setup but no-trade due to overtrading / discipline  

**Scenario:**  
Setup is structurally valid, but discipline context indicates overtrading, daily loss, revenge risk, or session frequency issue.

**Required measured conditions:**
- setup detected
- official CE may be filled or not
- discipline warning or blocker present
- `overtrading_warning`, `daily_loss_limit_warning`, revenge risk, or max trades context present
- context does not justify taking additional risk

**Expected humanized label:**
- `no-trade` or `wait`

**Expected readiness relationship:**  
`candidate` with warnings is possible, but humanized policy must display discipline warning clearly.  
If hard discipline blocker exists, `reject` / `no-trade`.

**Expected dashboard wording:**  
“El setup puede existir, pero el estado de disciplina recomienda no operar o esperar.”

**Reason codes:**
- `humanized_discipline_context`
- `humanized_no_trade`
- `overtrading_warning`

**What this does NOT approve:**
- No auto-block unless future gates are approved.
- No live execution.

**Missing measurements / future fields:**
- If discipline severity is not granular enough, mark future severity calibration.
- “Revenge risk” — use `discipline_overtrading_risk` / composite flags (E5.17) when present; no dedicated `revenge_trade` token confirmed in E5.18 checklist list.

**Notes:**  
`overtrading_warning` maps to `checklist_overtrading_warning`; `daily_loss_limit_warning` appears in E5.18 blocker examples.

---

### CASE HA-006 — Strong setup but target missing

**Case ID:** HA-006  
**Name:** Strong setup but target missing  

**Scenario:**  
Structure and entry are acceptable, but target/liquidity objective is missing or poor.

**Required measured conditions:**
- setup detected
- entry context acceptable
- `liquidity_target_missing` or target grade weak/none
- TP may be RR2 but not supported by liquidity
- target quality does not justify trade idea

**Expected humanized label:**
- `reject` / `no-trade` / `wait`

**Expected readiness relationship:**  
`reject` if target missing is critical.  
`wait` if target may form later.

**Expected dashboard wording:**  
“El setup tiene estructura, pero no hay objetivo de liquidez defendible.”

**Reason codes:**
- `humanized_target_missing`
- `valid_but_no_objective`
- `no_trade_without_target`

**What this does NOT approve:**
- No TP change.
- No alternate TP approval.
- No entry approval without target.

**Missing measurements / future fields:**
- Future target policy calibration may refine severity ([`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md)).
- Map `liquidity_target_missing` → `checklist_target_missing` / `setup_readiness_primary_blocker` = `target_missing`.

**Notes:**  
Official RR2 TP can exist while nearest liquidity target quality is weak — diagnostic only (E5.15).

---

### CASE HA-007 — Setup already moved too far / no chase

**Case ID:** HA-007  
**Name:** Setup already moved too far / no chase  

**Scenario:**  
The market reacts before the official entry, moves strongly toward TP, and later offers a late or poor entry.

**Required measured conditions:**
- reaction/displacement occurred before acceptable entry
- late entry distance or chase risk is high
- effective RR is degraded
- entry family would be `late_entry` or `missed_entry`
- target may be closer than risk justifies

**Expected humanized label:**
- `observe` / `no-trade`

**Expected readiness relationship:**  
May be valid market read but not valid trade execution.

**Expected dashboard wording:**  
“El movimiento era correcto, pero la entrada llegó tarde. No perseguir precio.”

**Reason codes:**
- `humanized_no_chase`
- `late_entry_observe_only`
- `rr_degraded`

**What this does NOT approve:**
- No market chase.
- No late automatic entry.

**Missing measurements / future fields:**
- May require explicit chase distance / effective RR after late entry.
- `late_entry` / `missed_entry` as **official trade-row labels** — **missing measurement** (V2-08 `evaluateEntryVariant` in core TS only, not TestEA CSV per trade).
- `effective_rr` available on **variant sim** columns (`entry_variant_*_sim_effective_rr`), not necessarily for official unfilled CE path.

**Notes:**  
Partial proxy: `entry_fill_status` = `expired_unfilled` + high `missed_entry_by_points` + outcome moved toward TP without fill — **does not alone prove** this case; operator/policy must not auto-map without future fields.

---

### CASE HA-008 — News or event context: caution, not automatic veto

**Case ID:** HA-008  
**Name:** News or event context: caution, not automatic veto  

**Scenario:**  
Recent news/event risk exists, but market structure remains clean.

**Required measured conditions:**
- event/news context present if available
- spread not extreme
- volatility context measured
- structure/liquidity/IFVG remain aligned
- no hard invalidation

**Expected humanized label:**
- `wait` / `observe` / `accept-for-manual-review` depending severity

**Expected readiness relationship:**  
News should be contextual weighting, not automatic reject in V1 unless future policy defines hard rule.

**Expected dashboard wording:**  
“Evento reciente: revisar con cautela. No es veto mecánico sin evidencia adicional.”

**Reason codes:**
- `humanized_news_context`
- `manual_review_required`
- `context_not_mechanical_filter`

**What this does NOT approve:**
- No automatic entry during news.
- No auto-veto unless governed.

**Missing measurements / future fields:**
- News/event feed is **not** currently a canonical input; mark as **future field** (E5.16 V1: no calendar/news handling).
- Spread/volatility: `session_*`, `spread_*`, `volatility_*` (E5.16) — **measurable_today** for non-news clauses only.

**Notes:**  
This case is **policy_only** for the news clause until a future export exists. Do not infer news from session bucket alone.

---

### CASE HA-009 — Valid structure but IFVG conflict

**Case ID:** HA-009  
**Name:** Valid structure but IFVG conflict  

**Scenario:**  
Bias, sweep, and FVG exist, but IFVG/BISI/SIBI classification conflicts with trade direction or setup quality.

**Required measured conditions:**
- setup detected
- IFVG conflict present OR `checklist_ifvg_quality` conflict/weak
- primary_blocker may be `ifvg_conflict`
- other components may score high

**Expected humanized label:**
- `reject`

**Expected readiness relationship:**  
High score + `reject` is acceptable due to critical blocker.

**Expected dashboard wording:**  
“Componentes fuertes, pero IFVG conflict bloquea la aceptación.”

**Reason codes:**
- `humanized_valid_but_skip`
- `ifvg_conflict`
- `critical_blocker_override`

**What this does NOT approve:**
- No score-only accept.
- No trade because other components are strong.

**Missing measurements / future fields:**
- None if IFVG conflict is exported (`checklist_ifvg_conflict`, `setup_readiness_primary_blocker` = `ifvg_conflict`).

**Notes:**  
E5.18.3: `ifvg_conflict` frequent primary blocker on SET001.

---

### CASE HA-010 — Wait state: setup forming but incomplete

**Case ID:** HA-010  
**Name:** Wait state: setup forming but incomplete  

**Scenario:**  
Liquidity and structure are forming, but entry/timing confirmation is incomplete.

**Required measured conditions:**
- bias/structure supportive
- liquidity event may exist
- entry not confirmed or retest incomplete
- no hard blocker
- no clear invalidation
- current state is not chase

**Expected humanized label:**
- `wait`

**Expected readiness relationship:**  
`wait` is not `reject`.  
`wait` means “observe for completion”.

**Expected dashboard wording:**  
“Setup en formación. Esperar confirmación; no entrar todavía.”

**Reason codes:**
- `humanized_wait_for_completion`
- `setup_incomplete`
- `no_hard_blocker`

**What this does NOT approve:**
- No early entry.
- No gate.
- No auto-alert as trade signal unless future alert policy approves wording.

**Missing measurements / future fields:**
- Future live/forward state tracking may be needed.
- “Entry not confirmed” — proxy via `setup_readiness_decision` = `wait`, `checklist_entry_feasible` false, or CE not filled without near-miss acceptance (HA-001 separate).

**Notes:**  
Aligns with E5.18 `wait` semantics (E5.18.4); humanized `wait` is observación de completitud, no señal de entrada.

---

## 6. Tabla resumen

| case_id | category | expected_label | primary_reason | implementation_status |
|---------|----------|----------------|----------------|------------------------|
| HA-001 | acceptable near-miss | observe / accept-for-manual-review | `humanized_near_miss_ce` | partially_measurable |
| HA-002 | invalid near-miss | observe / reject | `humanized_near_miss_weak_reaction` | partially_measurable |
| HA-003 | research-only entry family | observe / research-candidate | `humanized_edge_research_only` | partially_measurable |
| HA-004 | technically valid but skip | reject / no-trade | `humanized_valid_but_skip` | measurable_today |
| HA-005 | no-trade discipline/context | no-trade / wait | `humanized_discipline_context` | partially_measurable |
| HA-006 | target missing | reject / no-trade / wait | `humanized_target_missing` | measurable_today |
| HA-007 | missed trade / no chase | observe / no-trade | `humanized_no_chase` | missing_measurement |
| HA-008 | context caution (news) | wait / observe / accept-for-manual-review | `humanized_news_context` | missing_measurement |
| HA-009 | technically valid but skip (IFVG) | reject | `humanized_valid_but_skip` | measurable_today |
| HA-010 | setup incomplete | wait | `humanized_wait_for_completion` | partially_measurable |

### 6.1 Criterio de `implementation_status`

| Valor | Significado |
|-------|-------------|
| **policy_only** | Solo definido en política/casebook; sin regla ni campo `humanized_*` en export |
| **measurable_today** | Condiciones requeridas mapeables a columnas TestEA/checklist existentes sin campos futuros críticos |
| **partially_measurable** | Algunas condiciones medibles; otras requieren proxy o campo futuro |
| **missing_measurement** | Condición central sin export canónico V1 (p. ej. news, late_entry en fila oficial) |

**Nota:** Todos los `humanized_*` reason codes son **policy_only** hasta checkpoint de export explícito. La columna `implementation_status` refiere a las **condiciones medidas**, no a la existencia de reason codes en CSV.

---

## 7. Brechas de medición agregadas (no interpretar)

| Brecha | Casos afectados | Acción futura (gobernanza) |
|--------|-----------------|----------------------------|
| News / calendar feed | HA-008 | Export o integración externa; hasta entonces no aplicar cláusula news en automatización |
| Reaction strength (campo único) | HA-001, HA-002 | Export dedicado o reglas documentadas sobre proxies checklist |
| Late entry / chase en trade oficial | HA-007 | Export `late_entry` / chase distance / RR degradado post-movimiento |
| Tolerancia near-miss por perfil | HA-001 | Calibración por símbolo/timeframe (E5.16.4 perfiles) |
| Reason codes `humanized_*` en CSV | Todos | Checkpoint futuro; no inventar en E5.20.6 |
| Edge approval / multi-bundle | HA-003 | Evidencia E5.13.6.8+; fuera de alcance |

---

## 8. Relación con E5.20.3 (dashboard)

El adaptador (**E5.20.3**) y el mock HTML (**E5.20.4** — [`DASHBOARD_READONLY_MOCK_E5_20_4.md`](./DASHBOARD_READONLY_MOCK_E5_20_4.md); evidencia adaptador **PASS** [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md)) deben:

- Mostrar etiqueta humanizada **solo** como texto de apoyo, junto a readiness + blockers (E5.18.5).
- Usar wording de este casebook **sin** convertir `observe` / `accept-for-manual-review` en permiso de ejecución.
- Respetar casos **missing_measurement** — no mostrar news/late-entry como si estuvieran medidos.

---

## 9. Referencias

- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md)
- [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md)
- [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md)
- [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
