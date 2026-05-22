# SET001 Optimization Comparison Matrix Design — E5.23.2

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.23.2 — diseño matriz comparación optimización SET001 / `XAUUSD_M15_Profile_V1` |
| **Tipo** | Design / reporting spec — **sin implementación** |
| **Baseline Git** | `5ec47be` o posterior — `docs(mapazapp): E5.23.1 define XAUUSD M15 profile` |
| **Perfil lab** | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) |
| **Gobernanza padre** | [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) |
| **Decisión** | **Docs-only matrix design** — autoriza reporting futuro; **no** corrida optimizador ni cambio estrategia |
| **E5.23.3** | [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) — **cerrado (docs)** |
| **E5.23.4** | [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md) — **cerrado (docs)** |
| **Siguiente** | E5.24 robustez |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe esta matriz

**E5.23.1** definió el perfil lab [`XAUUSD_M15_Profile_V1`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) con conjuntos de comparación A–E y métricas obligatorias.

**E5.23.2** define la **matriz de comparación** para que campañas futuras de optimización sobre SET001 (y derivados bajo el mismo perfil) **no mezclen objetivos** ni produzcan curve-fitting:

| Problema sin matriz | Solución con matriz |
|---------------------|---------------------|
| “Mejor total R” opaco | Cada fila etiquetada `comparison_set` A/B/C/D/E |
| Readiness tratado como gate | Conjunto B separado — research-only |
| Edge promovido desde sim | Conjunto D aislado — no aprobación |
| Un solo bundle = promoción | Filas E + labels `needs_oos` / `needs_multi_bundle` |

La matriz es **diseño de reporting** — no ejecución de optimizador, no cambio MQL5, no aprobación de estrategia.

---

## 2. Fila baseline actual (SET001)

Referencia canónica para todas las filas futuras del perfil.

| Campo | Valor |
|-------|-------|
| **`profile_id`** | `XAUUSD_M15_Profile_V1` |
| **`bundle_id`** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **`parameter_set_id`** | `SET001` |
| **`ea_build`** | `MZP_TestEA_E5_18` |
| **`comparison_set`** | `official_baseline_set` (A) |
| **Entry oficial** | 50 % / CE |
| **TP oficial** | RR2 |

### Hechos baseline (evidencia E5.22.2.1)

| Métrica | Valor |
|---------|------:|
| `trade_count` | 1697 |
| `total_r` | +315 |
| `avg_r` | 0.185622 |
| `winrate` | 44.77 % |
| `max_drawdown_r` | 13 |
| `ambiguous_count` | 436 |
| `expired_unfilled_count` | 342 |
| Readiness `candidate` / `wait` / `reject` | 247 / 150 / 1300 |
| R `candidate` + `wait` | +429 |
| R `reject` | -114 |

Fuentes: [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md), [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md).

---

## 3. Conjuntos de comparación (filas / grupos de la matriz)

Cada **fila** de la matriz pertenece a **exactamente un** `comparison_set`. Varias filas pueden compartir el mismo bundle pero **nunca** el mismo `comparison_set` sin sub-etiqueta explícita.

### A — `official_baseline_set`

| Atributo | Valor |
|----------|-------|
| **Contenido** | Entrada oficial **50 % / CE** + TP **RR2** |
| **Rol** | Fuente de verdad del baseline actual |
| **Gate** | **No** — referencia canónica |

### B — `readiness_research_set`

| Atributo | Valor |
|----------|-------|
| **Contenido** | Segmentación `candidate` / `wait` / `reject` |
| **Rol** | Revelar valor diagnóstico de readiness |
| **Gate** | **Prohibido** desde un bundle |

Sub-filas típicas: `readiness_candidate`, `readiness_wait`, `readiness_reject`, `readiness_candidate_plus_wait`.

### C — `humanized_delta_research_set`

| Atributo | Valor |
|----------|-------|
| **Contenido** | Buckets [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md) |
| **Estado** | **No implementado** — diseño futuro (E5.22.5.2+) |
| **Gate** | **Prohibido** hasta simulador + reason codes |

### D — `entry_variant_research_set`

| Atributo | Valor |
|----------|-------|
| **Contenido** | Simulaciones 25 % / 75 % / adaptive / **edge** |
| **Rol** | Inspirar investigación — **no** aprobar variantes |
| **Gate** | **Prohibido** |

Sub-filas: `entry_50_official`, `entry_25`, `entry_75`, `entry_adaptive`, `entry_edge`.

### E — `robustness_validation_set`

| Atributo | Valor |
|----------|-------|
| **Contenido** | OOS / walk-forward / multi-bundle |
| **Estado** | **No disponible** aún para SET001 |
| **Promoción** | **Requerido** antes de nivel research ≥ 2 |

---

## 4. Columnas obligatorias de la matriz

Cada fila (presente o futura) **debe** poder completar estas columnas. Valores vacíos → `null` + flag en `governance_status`.

| Columna | Tipo / notas |
|---------|----------------|
| `profile_id` | p. ej. `XAUUSD_M15_Profile_V1` |
| `campaign_id` | Metadato campaña cuando exista |
| `bundle_id` | Carpeta export ST |
| `parameter_set_id` | SET001, SET002, … |
| `ea_build` | `MZP_TestEA_E5_xx` |
| `comparison_set` | A \| B \| C \| D \| E (+ sub-tag opcional) |
| `entry_model` | `official_50_ce` \| `entry_25` \| `entry_edge` \| … |
| `tp_model` | `RR2` \| research tag |
| `trade_count` | int |
| `filled_count` | int |
| `expired_unfilled_count` | int |
| `ambiguous_count` | int |
| `win_count` | int |
| `loss_count` | int |
| `winrate` | float 0–1 |
| `total_r` | float |
| `avg_r` | float |
| `expectancy_r` | float |
| `max_drawdown_r` | float |
| `daily_r_avg` | float |
| `worst_daily_r` | float |
| `best_daily_r` | float |
| `trades_per_day` | float |
| `overtrading_count` | int (flags true) |
| `candidate_count` | int (B) |
| `wait_count` | int (B) |
| `reject_count` | int (B) |
| `top_blockers` | string / JSON — top N blockers |
| `ifvg_conflict_total_r` | float segmento |
| `pd_conflict_total_r` | float segmento |
| `target_grade_summary` | string / JSON |
| `environment_grade_summary` | string / JSON |
| `discipline_grade_summary` | string / JSON |
| `notes` | hipótesis, caveats operador |
| `promotion_level` | ver §7 |
| `governance_status` | ver §7–8 |

**Schema futuro sugerido:** `mapazapp_optimization_comparison_matrix_v1`.

---

## 5. Valores iniciales SET001 (diseño — evidencia disponible)

Tabla de filas de diseño pobladas desde E5.22.2.1. Columnas abreviadas; implementación futura rellena el resto.

### Fila A0 — official baseline

| Campo | Valor |
|-------|-------|
| `comparison_set` | `official_baseline_set` |
| `entry_model` | `official_50_ce` |
| `tp_model` | `RR2` |
| `trade_count` | 1697 |
| `total_r` | +315 |
| `winrate` | 0.4477 |
| `ambiguous_count` | 436 |
| `max_drawdown_r` | 13 |
| `promotion_level` | `baseline_only` |
| `governance_status` | `research_observation` |

### Filas B — readiness research

| Sub-fila | Count | Total R | Notas |
|----------|------:|--------:|-------|
| `readiness_candidate` | 247 | +279 | avg_r ~1.13; winrate ~82.5 % |
| `readiness_wait` | 150 | +150 | avg_r 1.0; winrate ~82.4 % |
| `readiness_reject` | 1300 | -114 | avg_r ~-0.088; winrate ~27.3 % |
| `readiness_candidate_plus_wait` | 397 | +429 | **No** es trade set oficial |
| `promotion_level` | — | `research_observation` | |
| `governance_status` | — | `blocked_by_governance` si se infiere gate | |

### Filas C — humanized delta

| Campo | Valor |
|-------|-------|
| `comparison_set` | `humanized_delta_research_set` |
| Estado | **not_available** — buckets E5.22.5 solo como diseño |
| Buckets futuros | `baseline_kept`, `baseline_removed`, `rescued_reject`, `wait_promoted`, `candidate_downgraded`, `near_miss_added`, `ifvg_conflict_skipped`, `pd_conflict_rescued`, `no_chase_skipped` |
| `promotion_level` | `not_available` |

### Filas D — entry variants (sim)

| `entry_model` | `total_r` | Estado |
|---------------|----------:|--------|
| `official_50_ce` (ref A) | 315 | canónico |
| `entry_25` | 566 | research-only |
| `entry_adaptive` | 568 | research-only |
| `entry_edge` | 2733 | research-only; sim-sensitive |
| `entry_75` | 351 | research-only (alto ambiguous) |
| `promotion_level` | `research_observation` | |
| `governance_status` | `blocked_by_governance` para aprobación entry | |

### Fila E — robustness

| Campo | Valor |
|-------|-------|
| `comparison_set` | `robustness_validation_set` |
| Estado | **not_available** |
| Flags requeridos | `needs_oos`, `needs_walk_forward`, `needs_multi_bundle` |
| `promotion_level` | `not_available` |

---

## 6. Reglas de interpretación de la matriz

| Regla | Significado |
|-------|-------------|
| **A = source of truth** | Baseline oficial actual; toda comparación cita A explícitamente |
| **B = diagnóstico** | Puede revelar valor readiness; **no** gate desde un bundle |
| **C = vacío hasta spec** | No filas C válidas hasta simulador delta + reason codes |
| **D = inspiración** | Puede motivar hipótesis; **no** aprueba 25/edge/adaptive |
| **E = prerequisito promoción** | Sin filas E, máximo `baseline_only` / `research_observation` |
| **No ranking global** | Prohibido ordenar filas A–E por `total_r` en un solo leaderboard |
| **Coherencia trade cards** | Si blocker contradice [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md) → red flag |

---

## 7. Etiquetas de promoción (`promotion_level`)

Valores permitidos por fila — describen **interés research**, no live trading.

| Label | Uso |
|-------|-----|
| `not_available` | Conjunto C/E sin datos o spec pendiente |
| `baseline_only` | Fila A SET001 — nivel 0–1 máximo sin E |
| `research_observation` | B/D con evidencia single-bundle |
| `internally_interesting` | Hipótesis fuerte pero sin OOS (nivel 1 tentativo) |
| `needs_oos` | Falta out-of-sample |
| `needs_walk_forward` | Falta WF |
| `needs_multi_bundle` | Solo SET001 |
| `needs_forward_demo` | Nivel 3 bridge — futuro |
| `blocked_by_governance` | No promover: gate inferido, edge-only, etc. |

Mapeo a niveles 0–4: [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) §8.

---

## 8. Red flags en la matriz

Cualquier fila debe marcarse (en `governance_status` o flags JSON) si:

| Red flag | Condición |
|----------|-----------|
| `LOW_TRADE_COUNT` | `trade_count` por debajo del mínimo documentado |
| `HIGH_AMBIGUITY` | `ambiguous_count` / `trade_count` material (~26 % en A0) |
| `HIGH_DRAWDOWN` | `max_drawdown_r` fuera de límite campaña |
| `EDGE_SIM_ONLY` | Mejora depende solo de fila D edge |
| `OOS_MISSING` | Conjunto E vacío pero promoción solicitada |
| `WF_MISSING` | Sin ventanas walk-forward |
| `MULTI_BUNDLE_MISSING` | Solo SET001 |
| `HUMANIZED_REASON_CODES_MISSING` | Filas C sin `trade_set_delta_reason_codes` |
| `TRADE_CARD_CONTRADICTION` | Blocker vs narrativa E5.22.4.2 |
| `GATE_INFERENCE_FROM_ONE_BUNDLE` | Readiness/IFVG/PD promovidos a gate desde B |

---

## 9. Requisitos anti-curve-fit

**Prohibido promover** (cambiar `promotion_level` más allá de `research_observation`) desde:

| Origen inválido | Razón |
|-----------------|--------|
| Un solo run SET001 | Un bundle ≠ robustez |
| Solo `total_r` | Ignora ambiguous/unfilled/DD |
| Solo `winrate` | Ignora 436 ambiguous |
| Solo sim edge (D) | Sim-sensitive; sin fill audit |
| Trades removidos sin reason codes | Humanized opaco |
| `trade_count` trivial | Sin significancia |
| Sin OOS probado | Conjunto E vacío |
| Sin WF probado | Inestabilidad temporal |
| Sin revisión drawdown | DD 13R debe contextualizarse |
| Sin revisión ambiguity | 25.7 % ambiguous rate en A0 |

Alineado con [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md) y perfil [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) §9.

---

## 10. Diseño futuro CLI / reporting (no implementar en E5.23.2)

### Comando propuesto (futuro)

```bash
pnpm --filter @workspace/scripts mapazapp:testea-optimization-comparison-matrix -- \
  --bundle "<RunDir>" \
  --profile XAUUSD_M15_Profile_V1 \
  --setup-performance-audit "<audit.json>" \
  --humanized-delta "<delta.json>" \
  --entry-variant-summary "<variants.json>" \
  --json \
  --csv-output "<matrix.csv>" \
  --markdown-output "<matrix.md>"
```

### Inputs

| Input | Origen |
|-------|--------|
| Bundle path | Export ST validado |
| Setup performance audit | JSON/CSV [`setup-performance-baseline-audit`](./SETUP_PERFORMANCE_BASELINE_AUDIT_E5_22_2.md) |
| Humanized delta JSON | Opcional — E5.22.5.2+ |
| Entry variant summary | Opcional — sim audit |
| Profile metadata | `XAUUSD_M15_Profile_V1` |

### Outputs

| Archivo | Contenido |
|---------|-----------|
| `optimization_comparison_matrix.json` | Filas A–E + columnas §4 |
| `optimization_comparison_matrix.csv` | Vista tabular |
| `optimization_comparison_matrix.md` | Resumen humano + red flags |

**E5.23.2:** solo diseño — **no** implementar TypeScript ni invocar MT5.

---

## 11. Relación con E5.23.3

[`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) define el **contrato de carpetas** para que la matriz pueda:

- Añadir filas E (`robustness_validation_set`) por ventana IS/OOS/WF
- Comparar SET001 vs SET002+ bajo el mismo `profile_id`
- Etiquetar `campaign_id`, segmentos `01_in_sample` / `02_out_of_sample` / `03_walk_forward`

Hasta ejecutar campañas bajo ese contrato (E5.24), filas E en SET001 permanecen `not_available`.

---

## 12. Gobernanza

| Acción | Estado |
|--------|--------|
| Cambios MQL5 | **No** |
| Cambios TypeScript / CLI matrix | **No** en E5.23.2 |
| MT5 / Strategy Tester / optimizador | **No** |
| Gates / live trading | **No** |
| Cambio entry / TP oficial | **No** |
| Aprobación edge / 25 / adaptive | **No** |
| Telegram / dashboard / email / push | **No** |
| Commitear `_local_*_DO_NOT_COMMIT` | **No** |

---

## Referencias

- [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md)
- [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md)
- [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
- [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)
- [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
