# Humanized Casebook Measurability Audit — E5.22.4

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.4 — auditoría de medibilidad casebook HA-001…HA-010 (docs-only) |
| **Tipo** | Auditoría de gobernanza / mapeo export — **sin código** |
| **Baseline Git** | `1dd7900` — `docs(mapazapp): PM humanization must affect trade set` |
| **Bundle benchmark** | SET001 — `MZP_TestEA_E5_18`, XAUUSD M15 |
| **Fuentes** | [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md), [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md), [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md), [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md), [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md), [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md) |
| **Decisión** | **PASS docs** — medibilidad mapeada; **sin** activación MQL5/gates |
| **Siguiente recomendado** | **E5.22.4.1** (trade IDs ejemplo) o **E5.22.5** (trade-set delta design) |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe esta auditoría

Tras **E5.20.5 / E5.20.6** (política + casebook) y **E5.22.2.1 / E5.22.3** (baseline performance + trade model), el PM exigió que la humanización **no** quede solo en reporting: debe poder medirse eventualmente como **cambio en el trade set**, no solo como wording.

**E5.22.4** responde:

- ¿Qué casos HA son medibles hoy con el export TestEA actual?
- ¿Qué falta en MQL5, BridgeEA o contexto forward?
- ¿Qué puede estudiarse en SET001 sin cambiar el motor?
- ¿Qué podría cambiar trades más adelante vs qué solo explica hoy?
- ¿Qué **no** debe implementarse como lógica aún?

**No** implementa campos, gates, entry, TP ni política activa.

---

## 2. Estado actual del motor (referencia SET001)

| Dimensión | Valor |
|-----------|-------|
| Entry oficial | **50 % / CE** |
| TP oficial | **RR2** |
| Gates humanizados | **Ninguno** |
| Outcome oficial | +315R, winrate ~44.8 %, 1697 trades |
| Readiness | Diagnóstico — candidate/wait/reject **no** gate |
| Humanización MQL5 | **No activa** |

La humanización documentada **no** altera `trade_count` ni `filled_count` oficial hoy.

---

## 3. Modelo de clasificación obligatorio

Cada caso HA recibe **todas** las etiquetas aplicables de la tabla siguiente (no son mutuamente excluyentes salvo donde se indica).

| # | Etiqueta | Significado |
|---|----------|-------------|
| 1 | **measurable_today** | Export TestEA contiene campos suficientes para evaluar el caso directamente en post-proceso |
| 2 | **partially_measurable** | Proxies existen; regla operativa final requiere campos o calibración adicional |
| 3 | **policy_only** | Caso definido en gobernanza; sin medición canónica aún (p. ej. `humanized_*` reason codes) |
| 4 | **missing_measurement** | Condición central sin columna export V1 |
| 5 | **bridge_or_forward_required** | Requiere tiempo real, noticias, gráfico actual, cuenta/prop o estado externo |
| 6 | **research_only** | Medible pero **prohibido** como entry oficial hasta robustness/OOS/WF |
| 7 | **could_change_trade_set_later** | Podría añadir, quitar, rescatar, degradar o reclasificar trades tras calibración multi-bundle |
| 8 | **explain_report_only_today** | Solo explica en informes/dashboard/alertas; **no** afecta selección oficial hoy |

### 3.1 Clasificación PM complementaria (E5.20.5 §9.4)

| Clase PM | Mapeo típico en E5.22.4 |
|----------|-------------------------|
| Measurable humanized | `measurable_today` y/o `partially_measurable` con campos checklist |
| Policy-only | `policy_only` + `explain_report_only_today` |
| Could change trade set later | `could_change_trade_set_later` |
| Explain/report only today | `explain_report_only_today` (casi todos los HA hoy) |
| Requires new export fields | `missing_measurement` |

### 3.2 Qué **no** implementar aún (todos los HA)

| Prohibido ahora | Razón |
|-----------------|-------|
| Gates MQL5 desde readiness/blocker | Un bundle (SET001) — riesgo overfit |
| Hard reject `pd_conflict` | +157R bajo reject en SET001 |
| Hard reject `execution_environment_weak` | Positivo en SET001 |
| Entry oficial edge/25/adaptive | Research-only; edge +2733R sim-sensitive |
| News veto automático | Sin feed export |
| Near-miss → fill oficial sin tolerancia calibrada | Riesgo chasing |
| `humanized_*` en CSV sin checkpoint | Policy-only |

---

## 4. Familias de campos disponibles (TestEA SET001)

| Familia | Campos / tokens representativos | Casos HA |
|---------|--------------------------------|----------|
| **outcome / result_r** | `outcome`, `result_r`, win/loss/ambiguous/expired_* | Todos |
| **readiness** | `setup_readiness_decision`, `setup_readiness_score`, `setup_readiness_grade`, `setup_readiness_primary_blocker`, `checklist_*` | HA-004, HA-005, HA-009, HA-010 |
| **IFVG / BISI / SIBI** | `ifvg_conflict_with_trade_direction`, `ifvg_valid_for_trade_direction`, `ifvg_bisi_sibi_grade`, inversion/retest | HA-001, HA-002, HA-009 |
| **PD** | `checklist_pd_conflict`, premium/discount exports | HA-001, HA-004 |
| **target quality** | `liquidity_target_missing`, `liquidity_target_grade`, `liquidity_target_supported`, `liquidity_target_before_nearest`, TP distance | HA-006 |
| **entry fill / near-miss** | `entry_fill_status`, `entry_near_miss`, `missed_entry_by_points`, `entry_missed_shallow_retrace`, `entry_fill_feasibility_*` | HA-001, HA-002, HA-007 |
| **variants (research)** | `entry_variant_25_*`, `entry_variant_50_*`, `entry_variant_75_*`, `entry_variant_adaptive_*`, `entry_variant_edge_*` | HA-003 |
| **session / spread / volatility** | `session_*`, `spread_*`, `volatility_*`, `execution_environment_grade` | HA-005, HA-008 (parcial) |
| **discipline** | `discipline_grade`, `discipline_overtrading_risk`, revenge/daily limit flags | HA-005 |
| **structure / MSS** | `checklist_mss_choch_*`, `structure_conflict` | HA-001, HA-002 |

Fuente operador: [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md) §14; métricas: [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md).

---

## 5. Tabla de casos HA-001 … HA-010

### HA-001 — Near-miss CE acceptable

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-001 |
| **Name** | Acceptable CE near-miss with strong reaction |
| **Humanized intent** | CE no tocado pero near-miss dentro de tolerancia con contexto válido → `observe` / accept-for-manual-review |
| **Current measurability status** | **partially_measurable** |
| **Clasificación modelo** | partially_measurable · missing_measurement (reaction) · could_change_trade_set_later · explain_report_only_today · policy_only (`humanized_*` codes) |
| **Available fields** | `entry_fill_status` (`near_miss`, `missed_shallow_retrace`), `entry_near_miss`, `missed_entry_by_points`, `entry_fill_feasibility_reasons`, CE/FVG context, `checklist_ifvg_*`, `checklist_mss_choch_*`, `checklist_pd_conflict`, `checklist_target_missing`, `setup_readiness_*`, `outcome`, `result_r` |
| **Missing fields** | `reaction_strength`, wick/body post near-miss, `displacement_after_near_miss`, `near_miss_tolerance_profile` (per symbol/TF) |
| **Can be analyzed in SET001?** | **Sí** — 22 `near_miss` + 298 `missed_shallow_retrace` (0R oficial); segmentar por checklist proxies |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — podría **añadir** trades que CE oficial no llenó |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | E5.22.4.1: IDs ejemplo near-miss + checklist fuerte; calibrar tolerancia multi-bundle antes de research policy |
| **Risk if implemented too early** | Chasing / fills simulados inflados; aceptar near-miss sin reaction_strength |

---

### HA-002 — Near-miss but weak reaction

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-002 |
| **Name** | Near-miss invalid because reaction is weak |
| **Humanized intent** | Near-miss sin confirmación → `observe` / `reject`; no perseguir |
| **Current measurability status** | **partially_measurable** |
| **Clasificación modelo** | partially_measurable · missing_measurement · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | Mismos proxies fill que HA-001 + `checklist_ifvg_weak` / `checklist_ifvg_conflict`, `checklist_mss_choch_late`, `checklist_environment_weak`, `checklist_target_missing`, readiness |
| **Missing fields** | `weak_reaction_classification`, continuation/displacement quality, invalidation post near-miss |
| **Can be analyzed in SET001?** | **Sí** — cruzar near-miss con IFVG weak/conflict y outcome |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — podría **prevenir** malos near-miss / chasing |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | Definir reglas proxy documentadas (no inventar score); E5.22.4.1 ejemplos weak vs strong |
| **Risk if implemented too early** | Rechazar near-miss válidos solo por proximidad a CE |

---

### HA-003 — Edge / alternative entry research

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-003 |
| **Name** | Edge reaction strong but still research-only |
| **Humanized intent** | Edge/variantes reaccionan pero **no** cambian entry oficial |
| **Current measurability status** | **measurable_today** + **research_only** |
| **Clasificación modelo** | measurable_today · research_only · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `entry_variant_25_*`, `entry_variant_50_*`, `entry_variant_75_*`, `entry_variant_adaptive_*`, `entry_variant_edge_*`, official `outcome` / `result_r`, CE unfilled flags |
| **Missing fields** | Multi-bundle robustness evidence; anti-overfit OOS/WF antes de cualquier switch |
| **Can be analyzed in SET001?** | **Sí** — variant totals: 50 +315R, 25 +566R, adaptive +568R, edge +2733R (research) |
| **Can affect official decision today?** | **No** — research-only |
| **Could change trade set later?** | **Sí** — cambiaría fills/outcomes **dramáticamente** si se promoviera (prohibido ahora) |
| **Explain/report only today?** | **Sí** (contraste oficial vs variant en informes) |
| **Recommended next step** | E5.24 multi-bundle robustness; mantener edge/25/adaptive no aprobados |
| **Risk if implemented too early** | Sim-inflation edge; cambio entry sin WF |

---

### HA-004 — CE fill plus PD conflict

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-004 |
| **Name** | Technically valid CE fill but skip due to PD conflict |
| **Humanized intent** | Fill oficial pero PD invalida aceptación humanizada → `reject` / `no-trade` |
| **Current measurability status** | **measurable_today** — **calibration_needed** |
| **Clasificación modelo** | measurable_today · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `entry_fill_status`=filled, `checklist_pd_conflict`, `setup_readiness_primary_blocker`=`pd_conflict`, score/blockers, `outcome`, `result_r` |
| **Missing fields** | Severidad PD granular; `humanized_valid_but_skip` en export |
| **Can be analyzed in SET001?** | **Sí** — pd_conflict: +157R, winrate ~82 % bajo reject (E5.22.2.1) |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — **rescatar** rejects o **reclasificar**; hard reject PD rechazaría winners |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | Tratar PD como calibración, no gate; incluir en trade-set delta design E5.22.5 |
| **Risk if implemented too early** | Hard reject PD elimina +157R segmento en SET001 |

---

### HA-005 — Discipline / no-trade context

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-005 |
| **Name** | Valid setup but no-trade due to discipline |
| **Humanized intent** | Setup existe pero disciplina recomienda no operar → `no-trade` / `wait` |
| **Current measurability status** | **partially_measurable** |
| **Clasificación modelo** | partially_measurable · bridge_or_forward_required (cuenta/prop/lock) · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `discipline_grade`, `discipline_overtrading_risk`, `discipline_revenge_trade_risk`, `discipline_daily_loss_limit_warning`, `checklist_overtrading_warning`, daily/session trade counts en summary |
| **Missing fields** | `manual_lock_state`, live account risk, prop-firm limits live, psychology state |
| **Can be analyzed in SET001?** | **Sí** — overtrading/revenge etiquetados; no degradan R en SET001 (diagnóstico) |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — podría **reducir** frecuencia operativa |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | BridgeEA forward para estado cuenta; no gate desde ST histórico solo |
| **Risk if implemented too early** | Bloquear trades rentables por flag que no correlaciona R en SET001 |

---

### HA-006 — Target missing / poor target

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-006 |
| **Name** | Strong setup but target missing |
| **Humanized intent** | Estructura OK pero objetivo liquidez débil → `reject` / `wait` / `no-trade` |
| **Current measurability status** | **measurable_today** — **diagnostic_only** |
| **Clasificación modelo** | measurable_today · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `liquidity_target_missing`, `liquidity_target_grade`, `liquidity_target_supported`, `liquidity_target_before_nearest`, nearest liquidity type, official TP distance, `checklist_target_missing`, `outcome`, `result_r` |
| **Missing fields** | Política severidad target refinada (E5.15.4 futuro) |
| **Can be analyzed in SET001?** | **Sí** — target quality no rankea outcome claramente (supported false mejor avg_r) |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — podría **quitar** o degradar trades sin objetivo defendible |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | Mantener diagnóstico; segmentar en E5.22.5 delta buckets |
| **Risk if implemented too early** | Hard reject por target elimina trades RR2 positivos |

---

### HA-007 — No chase / too late

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-007 |
| **Name** | Setup already moved too far / no chase |
| **Humanized intent** | Movimiento correcto pero entrada tarde → `observe` / `no-trade` |
| **Current measurability status** | **partially_measurable** (proxies) + **missing_measurement** (chase explícito) |
| **Clasificación modelo** | partially_measurable · missing_measurement · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `entry_fill_status`, `missed_entry_by_points`, `entry_missed_shallow_retrace`, `expired_unfilled`, variant `entry_variant_*_sim_effective_rr` (research path) |
| **Missing fields** | `no_chase_distance`, `late_entry_reason`, `time_since_displacement`, `entry_filled_late`, post-confirmation extension en fila oficial |
| **Can be analyzed in SET001?** | **Parcial** — proxies unfilled/expired; no prueba chase sin campos |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — podría **reducir** late/chase trades |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | Export MQL5 futuro: late_entry / chase distance; hasta entonces alert `missing_measurement_notice` |
| **Risk if implemented too early** | Mapear `expired_unfilled` a no-chase sin evidencia |

---

### HA-008 — News / event caution

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-008 |
| **Name** | News or event context: caution, not automatic veto |
| **Humanized intent** | Evento reciente → cautela contextual, no veto mecánico V1 |
| **Current measurability status** | **bridge_or_forward_required** + **missing_measurement** (news) |
| **Clasificación modelo** | bridge_or_forward_required · missing_measurement · policy_only (cláusula news) · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `session_*`, `spread_*`, `volatility_*` — **no** news/event |
| **Missing fields** | `economic_calendar_event`, `event_severity`, `event_minutes_since`, symbol relevance, spread/slippage post-event |
| **Can be analyzed in SET001?** | **No** para cláusula news; **parcial** para spread/vol stress |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — solo tras feed de datos |
| **Explain/report only today?** | **Sí** (wording cautela sin dato news) |
| **Recommended next step** | Integración calendar externa + export; no inferir news desde sesión |
| **Risk if implemented too early** | Veto news adivinado; falsos positivos sesión overlap |

---

### HA-009 — IFVG conflict

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-009 |
| **Name** | Valid structure but IFVG conflict |
| **Humanized intent** | Componentes fuertes pero IFVG conflict → `reject` humanizado |
| **Current measurability status** | **measurable_today** — **strong_calibration_candidate** |
| **Clasificación modelo** | measurable_today · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `ifvg_conflict_with_trade_direction`, `ifvg_valid_for_trade_direction`, `ifvg_bisi_sibi_grade`, inversion/retest, `checklist_ifvg_conflict`, `setup_readiness_primary_blocker`, `outcome`, `result_r` |
| **Missing fields** | `humanized_valid_but_skip` export; severidad IFVG multi-nivel operativa |
| **Can be analyzed in SET001?** | **Sí** — conflict true: -417R; false: +732R; retest_detected tóxico |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — podría **quitar** o degradar trades IFVG-conflict |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | E5.24 multi-bundle antes de gate; priorizar en trade-set delta E5.22.5 |
| **Risk if implemented too early** | Gate IFVG desde un bundle; rare ifvg_conflict_win perdidos |

---

### HA-010 — Wait / incomplete context

| Campo | Valor |
|-------|-------|
| **HA ID** | HA-010 |
| **Name** | Wait state: setup forming but incomplete |
| **Humanized intent** | Formación en curso → `wait`; observar completitud |
| **Current measurability status** | **measurable_today** — **calibration_needed** |
| **Clasificación modelo** | measurable_today · could_change_trade_set_later · explain_report_only_today |
| **Available fields** | `setup_readiness_decision`=`wait`, `setup_readiness_score`, grade, blocker/warning counts, `checklist_entry_feasible`, CE not filled proxies, `outcome`, `result_r` |
| **Missing fields** | Live/forward state tracking; `humanized_wait_for_completion` export |
| **Can be analyzed in SET001?** | **Sí** — wait: +150R, winrate 82.3 % (150 trades) |
| **Can affect official decision today?** | **No** |
| **Could change trade set later?** | **Sí** — wait→candidate conversion podría **añadir** revisión trades |
| **Explain/report only today?** | **Sí** |
| **Recommended next step** | No promover wait a gate; E5.22.5 matriz wait→candidate |
| **Risk if implemented too early** | Tratar wait como reject o candidate gate desde un bundle |

---

## 6. Humanization must eventually produce a trade-set delta

### 6.1 Estado actual

| Afirmación | Evidencia |
|------------|-----------|
| Humanización documentada | E5.20.5, E5.20.6, este audit E5.22.4 |
| Parcialmente medible | HA-003, 004, 006, 009, 010 measurable; 001, 002, 005, 007 partial; 008 bridge |
| Outcome MT5 oficial | 50 %/CE + RR2, sin gates humanizados |
| Efecto en trade_count hoy | **Cero** — humanización no cambia official outcomes |

Reporting, readiness y dashboard **explican** setups; **no** completan aceptación humanizada activa en el motor.

### 6.2 Baseline oficial vs política humanizada research (futura)

| Lado | Definición |
|------|------------|
| **Baseline official** | Trades actuales 50 %/CE + RR2 como SET001 (`filled_count` 1355, `total_r` 315) |
| **Humanized research policy** | Conjunto hipotético post-reglas HA calibradas — **research-only**, sin cambiar entry/TP oficial en fase design |

Buckets futuros a comparar:

- accepted trades
- rejected trades
- rescued rejects (p. ej. PD no dañino)
- wait-to-candidate conversions
- near-miss accepted trades
- no-chase skipped trades
- IFVG-conflict skipped trades
- PD-conflict recalibrated trades

### 6.3 Required future delta audit (E5.22.5+)

| Métrica delta | Obligatoria |
|---------------|-------------|
| `trade_count` | Sí |
| `filled_count` | Sí |
| `skipped_count` | Sí |
| `total_r`, `avg_r`, `winrate` | Sí |
| `max_drawdown_r` | Sí |
| `ambiguous_count`, `expired_unfilled_count` | Sí |
| Matriz candidate / wait / reject (transiciones) | Sí |
| Razón por trade añadido / eliminado / reclasificado | Sí — trazabilidad HA + blocker |

**Checkpoint planificado:** **E5.22.5** — Humanized Acceptance Activation / Trade-set Delta Design ([`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md) §18).

**Regla PM:** humanización sin delta reproducible = solo reporting, no mejora de motor.

---

## 7. Matriz resumen

| case_id | measurable_today | partially_measurable | policy_only | missing_measurement | bridge_or_forward | research_only | could_change_trade_set_later | explain_report_only_today |
|---------|:----------------:|:--------------------:|:-----------:|:-------------------:|:-----------------:|:-------------:|:----------------------------:|:---------------------------:|
| HA-001 | | ✓ | ✓ (codes) | ✓ (reaction) | | | ✓ | ✓ |
| HA-002 | | ✓ | | ✓ (reaction) | | | ✓ | ✓ |
| HA-003 | ✓ | | | | | ✓ | ✓ | ✓ |
| HA-004 | ✓ | | | | | | ✓ | ✓ |
| HA-005 | | ✓ | | | ✓ (account) | | ✓ | ✓ |
| HA-006 | ✓ | | | | | | ✓ | ✓ |
| HA-007 | | ✓ | | ✓ (chase) | | | ✓ | ✓ |
| HA-008 | | | ✓ (news) | ✓ (news) | ✓ | | ✓ | ✓ |
| HA-009 | ✓ | | | | | | ✓ | ✓ |
| HA-010 | ✓ | | | | | | ✓ | ✓ |

### 7.1 Respuestas directas del objetivo E5.22.4

| Pregunta | Respuesta corta |
|----------|----------------|
| ¿Medibles hoy? | HA-003, 004, 006, 009, 010 |
| ¿Parcialmente medibles? | HA-001, 002, 005, 007 |
| ¿Solo política? | Cláusula news HA-008; todos los `humanized_*` reason codes |
| ¿Faltan exports MQL5? | reaction_strength, chase/late, news, tolerance profile, delta reason codes |
| ¿Bridge/forward? | HA-005 (cuenta/prop), HA-008 (news live) |
| ¿Research-only? | HA-003 variantes |
| ¿SET001 analizable? | Todos salvo cláusula news de HA-008 |
| ¿Afectan decisión oficial hoy? | **Ninguno** |
| ¿Podrían cambiar trade set? | **Todos** tras calibración — con riesgos distintos |
| ¿Solo explican hoy? | **Todos** en producción oficial |

---

## 8. Inventario de campos faltantes (agregado)

| Campo futuro | Casos | Prioridad |
|-------------|-------|-----------|
| `reaction_strength` | HA-001, HA-002 | Alta — desbloquea near-miss operativo |
| `displacement_after_entry_or_near_miss` | HA-001, HA-002 | Alta |
| `near_miss_tolerance_profile` | HA-001 | Media — perfil símbolo E5.16.4 |
| `weak_reaction_classification` | HA-002 | Alta |
| `no_chase_distance` / `late_entry_reason` | HA-007 | Alta |
| `entry_filled_late` (oficial row) | HA-007 | Alta |
| `economic_calendar_event` / `event_minutes_since` | HA-008 | Alta — bridge |
| `manual_lock_state` / account risk live | HA-005 | Media — forward |
| `humanized_acceptance_reason_codes` | Todos | Media — trazabilidad |
| `trade_set_delta_reason_codes` | Delta audit | Alta — E5.22.5 |

---

## 9. Análisis de riesgos

| Riesgo | Mitigación |
|--------|------------|
| Readiness → gate desde un bundle | Exigir E5.24 multi-bundle + E5.22.5 delta |
| PD conflict hard reject | SET001: +157R — recalibrar, no veto |
| Environment weak hard reject | Positivo en SET001 — diagnóstico only |
| Edge variant sim-inflated | Mantener research-only; robustness audit |
| News logic sin datos | No implementar hasta feed |
| Near-miss → chasing | Exigir reaction_strength + tolerancia |
| Humanización solo reporting | Exigir trade-set delta reproducible |
| Humanización delta prematura | Design E5.22.5 antes de MQL5 |

---

## 10. Próximos pasos recomendados

| ID | Tarea | Tipo |
|----|-------|------|
| **E5.22.4.1** | Seleccionar trade IDs reales SET001 por caso HA | Docs |
| **E5.22.4.2** | Generar trade cards textuales para ejemplos HA | Docs |
| **E5.22.5** | Humanized Acceptance Activation / Trade-set Delta Design | Docs/spec |
| **E5.23** | Optimization governance / symbol profiles | Docs |
| **E5.24** | Multi-bundle robustness antes de gates | Evidencia |

---

## 11. Gobernanza (confirmación)

| Acción | Estado |
|--------|--------|
| Cambios MQL5 | **No** |
| Cambios TypeScript | **No** |
| MT5 / Strategy Tester | **No ejecutado** |
| Live trading | **No** |
| Gates / entry / TP / edge approval | **No** |
| Telegram / dashboard / email / push | **No** |
| Commitear `_local_*_DO_NOT_COMMIT` | **No** |

---

## Referencias

- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md)
- [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md)
