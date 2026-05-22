# Humanized Acceptance Trade-set Delta Design — E5.22.5

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.5 — diseño del audit trade-set delta (research-only) |
| **Tipo** | Design / spec — **sin implementación** |
| **Baseline Git** | `9b23099` o posterior — `docs(mapazapp): E5.22.4.2 add humanized textual trade cards` |
| **Prerrequisitos** | E5.22.2.1 baseline · E5.22.3 trade model · E5.22.4 medibilidad · E5.22.4.1 IDs · E5.22.4.2 trade cards |
| **Decisión** | **Design-only** — autoriza futuros audits de investigación, **no** reglas de trading |
| **E5.23** | [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) |
| **E5.23.1** | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) — perfil lab; delta policy §11 |
| **Siguiente** | E5.22.5.1 · E5.23.2 |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, simulator, gates, live, entry/TP, edge/25/adaptive, canales |

---

## 1. Por qué existe este diseño

La humanización **no puede quedarse** solo en reporting, wording de dashboard o alertas. Si la aceptación humanizada del setup se implementa algún día, debe ser **medible** como un **trade-set delta** frente al baseline oficial del Strategy Tester.

Hasta E5.22.4.2 tenemos:

| Capa | Entregable |
|------|------------|
| Performance | [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md) — SET001 oficial |
| Representación | [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md) |
| Medibilidad HA | [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md) |
| IDs reales | [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md) |
| Narrativa | [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md) |

**E5.22.5** define **cómo** comparar, en el futuro, el trade set bajo política humanizada research vs el trade set que el TestEA selecciona hoy con 50 % / CE + RR2 — sin ejecutar ese cambio.

**Regla PM:** humanización sin delta reproducible = solo reporting, no mejora de motor ([`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md) §9.3).

---

## 2. Baseline actual (oficial)

El baseline oficial **permanece** el del ST SET001 documentado en E5.22:

| Parámetro | Valor SET001 (oficial) |
|-----------|------------------------|
| Bundle | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| EA build | `MZP_TestEA_E5_18` |
| Symbol / TF | XAUUSD / M15 |
| **Entry oficial** | **50 % / CE** |
| **TP oficial** | **RR2** |
| `trade_count` | **1697** |
| `total_r` | **+315** |
| `winrate` | **44.77 %** (0.447712) |
| `ambiguous_count` | **436** |
| Gates humanizados en MQL5 | **No** |
| Aprobación edge / 25 % / adaptive | **No** |

Fuentes: [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md), [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md).

Readiness (candidate / wait / reject) es **diagnóstico** en export — **no** filtra el trade set oficial hoy.

---

## 3. Definición de trade-set delta

**Trade-set delta** = diferencia entre dos conjuntos de trades sobre el **mismo bundle exportado**, bajo reglas documentadas y reproducibles.

### 3.1 Baseline official trade set

Trades que el TestEA incluye hoy con la lógica oficial:

- Señal / setup detectado según motor MQL5 actual
- Entrada simulada **50 % / CE**
- TP **RR2**
- Outcome virtual oficial por trade (`win`, `loss`, `ambiguous`, `expired_unfilled`, etc.)
- **Sin** aplicar política humanizada como gate de selección

Unidad: una fila `trade_id` en `backtest_trades.csv` con outcome y R oficial.

### 3.2 Humanized research policy trade set (hipotético)

Conjunto **contrafactual research-only** que una política humanizada documentada **mantendría, quitaría, rescataría o añadiría**, incluyendo:

| Acción research | Descripción |
|-----------------|-------------|
| **Kept** | Trade oficial permanece en el set humanizado |
| **Rejected / skipped** | Trade oficial se excluiría (no operar / no simular como aceptado) |
| **Rescued from reject** | Readiness `reject` → `candidate` / `review` por blocker no dañino (p. ej. PD solo) |
| **Wait → candidate/review** | `wait` promovido cuando contexto casi completo |
| **Candidate downgraded** | `candidate` → `wait` / `reject` / `no_trade` por contexto frágil |
| **Near-miss accepted** | Trade **no** llenado oficialmente añadido al set humanizado |
| **Late/chase skipped** | Exclusión por `entry_filled_late` / no-chase cuando campos existan |
| **IFVG conflict skipped/downgraded** | Tras calibración multi-bundle |
| **PD conflict recalibrated** | PD ya no fuerza reject cuando evidencia lo permite |
| **Target / discipline / environment** | Permanecen **diagnósticos** salvo evidencia futura que justifique bloqueo |

El set humanizado **no sustituye** el oficial hasta aprobación explícita PM + evidencia multi-bundle.

### 3.3 Delta = comparación

Para cada `trade_id` (y trades solo-humanizados):

```
delta = humanized_policy(trade) − baseline_official(trade)
```

Agregados: conteos, R, winrate, drawdown, matrices de transición readiness/blocker, códigos de razón por fila.

---

## 4. Delta buckets

Cada trade (o near-miss añadido) se asigna a **un bucket primario** para reporting:

| Bucket | Significado |
|--------|-------------|
| `baseline_kept` | Trade oficial permanece aceptado en política research |
| `baseline_removed` | Trade oficial excluido por política humanizada |
| `rescued_reject` | `reject` → `candidate` / `review` (rescate) |
| `wait_promoted` | `wait` → `candidate` / `review` |
| `candidate_downgraded` | `candidate` → `wait` / `reject` / `no_trade` |
| `near_miss_added` | Trade no llenado oficial añadido (solo con medición) |
| `ifvg_conflict_skipped` | Excluido o degradado por IFVG conflict calibrado |
| `pd_conflict_rescued` | Reject por PD solo restaurado |
| `pd_plus_ifvg_confirmed_reject` | Reject confirmado con PD + blockers fuertes |
| `no_chase_skipped` | Late/chase excluido con campos no-chase |
| `target_missing_review` | Target missing → review, no hard reject |
| `discipline_no_trade` | No-trade por riesgo operativo / cuenta (forward/bridge) |

**Notas:**

- Un trade puede tener **bucket primario** + etiquetas secundarias (p. ej. `baseline_removed` + `no_chase_skipped`).
- `HA-003` (edge/25/adaptive) genera bucket paralelo **research variant set** — no mezclar con baseline oficial en métricas primarias.

---

## 5. Métricas obligatorias del delta audit

Cualquier implementación futura (E5.22.5.2+) **debe** emitir:

| Métrica | Descripción |
|---------|-------------|
| `baseline_trade_count` | Trades en set oficial |
| `humanized_trade_count` | Trades en set research |
| `trade_count_delta` | humanized − baseline |
| `filled_count_delta` | Cambio en fills efectivos |
| `skipped_count` | Excluidos por política |
| `added_trade_count` | Near-miss / añadidos no oficiales |
| `removed_trade_count` | Oficiales excluidos |
| `rescued_reject_count` | Rescates desde reject |
| `wait_promoted_count` | Promociones wait |
| `candidate_downgraded_count` | Degradaciones candidate |
| `total_r_delta` | Σ R humanizado − Σ R baseline (misma definición R) |
| `avg_r_delta` | Media R |
| `winrate_delta` | Winrate humanizado − baseline |
| `max_drawdown_delta` | Drawdown en R |
| `ambiguous_delta` | Δ ambiguous |
| `expired_unfilled_delta` | Δ expired_unfilled |
| Outcome distribution | Antes / después por outcome |
| Readiness transition matrix | baseline_decision × humanized_decision |
| Blocker transition matrix | primary_blocker × bucket |
| Reason code distribution | Conteo por `humanized_reason_code` |
| Per-trade delta reason | Una fila por trade con código + texto |

**Schema version propuesto (futuro):** `mapazapp_humanized_trade_set_delta_audit_v1`

---

## 6. Registro delta por trade (schema futuro)

Cada fila del audit delta research:

| Campo | Tipo / notas |
|-------|----------------|
| `trade_id` | `VTR_xxxxxx` (obligatorio) |
| `baseline_decision` | candidate \| wait \| reject \| n/a (near-miss added) |
| `baseline_outcome` | win \| loss \| ambiguous \| expired_* |
| `baseline_result_r` | número |
| `humanized_decision` | vocabulario §7 |
| `humanized_bucket` | bucket §4 |
| `humanized_reason_code` | código §10 |
| `humanized_reason_text` | narrativa corta |
| `affected_by_HA_case` | HA-001 … HA-010 (array o CSV) |
| `source_fields` | campos export usados |
| `missing_fields` | campos requeridos ausentes |
| `confidence` | low \| medium \| high (calibración) |
| `requires_manual_review` | boolean |
| `should_affect_official_today` | **siempre `false`** en fase research |
| `governance_note` | research-only; no gate; no live |

Ejemplo JSON (ilustrativo, no implementado):

```json
{
  "trade_id": "VTR_000001",
  "baseline_decision": "reject",
  "baseline_outcome": "win",
  "baseline_result_r": 2,
  "humanized_decision": "rescue_for_review",
  "humanized_bucket": "pd_conflict_rescued",
  "humanized_reason_code": "humanized_rescue_pd_conflict_only",
  "humanized_reason_text": "PD conflict without IFVG conflict; official +2R",
  "affected_by_HA_case": ["HA-004"],
  "should_affect_official_today": false
}
```

---

## 7. Vocabulario de decisión humanizada (research-only)

### 7.1 Decisiones permitidas

| Decisión | Uso |
|----------|-----|
| `keep` | Mantener en set humanizado como baseline |
| `remove` | Excluir del set humanizado |
| `rescue_for_review` | Rescatar reject → revisión / candidate research |
| `promote_to_review` | wait → candidate/review |
| `downgrade_to_wait` | candidate → wait |
| `downgrade_to_no_trade` | candidate/reject → no operar |
| `observe` | Sin cambio de set; solo etiqueta diagnóstica |
| `missing_measurement` | No decidir — falta campo export |

### 7.2 Prohibido (wording y decisiones)

No usar en specs, UI ni logs de delta:

- buy now / sell now
- execute / entry approved / signal confirmed
- gate passed / auto trade
- Cualquier implicación de ejecución live o aprobación de entrada

El delta audit describe **contrafactuales de research**, no señales de trading.

---

## 8. Ejemplos de política desde trade cards (E5.22.4.2)

Referencia cualitativa — reglas **no activas** hasta E5.22.5.3+ evidencia.

| Card | Trade | Bucket(s) esperado | Implicación |
|------|-------|-------------------|-------------|
| TC-01 | `VTR_000003` | `baseline_kept` | Candidate fuerte; **manual review** only — no auto-entry |
| TC-02 | `VTR_000061` | `candidate_downgraded` | Score 80 no basta; context_fragile + late |
| TC-03 | `VTR_000001` | `pd_conflict_rescued` / `rescued_reject` | Reject 90/A + PD → review; oficial +2R |
| TC-04 | `VTR_000021` | `pd_plus_ifvg_confirmed_reject`, `no_chase_skipped` | Reject compuesto; edge sim irrelevante |
| TC-05 | `VTR_000014` | `ifvg_conflict_skipped` (post-cal.) | Loss -1R; segmento tóxico |
| TC-06 | `VTR_000341` | excepción sobre `ifvg_conflict_skipped` | Rare winner — **no** gate binario |
| TC-07 | `VTR_000037` | `wait_promoted` (post-cal.) | Wait +2R → candidate/review |
| TC-08 | `VTR_000125` | `observe` / hold wait | Wait -1R — no auto-promote |
| TC-09 | `VTR_000002` | `near_miss_added` **solo** con `reaction_strength` | Hoy: `missing_measurement` |
| TC-10 | `VTR_000192` | `target_missing_review` | target_missing — review, no remove |

---

## 9. Mapeo HA-001 … HA-010 → impacto delta

| Caso | Impacto delta potencial | Condición |
|------|-------------------------|-----------|
| **HA-001** near-miss acceptable | `near_miss_added` | `reaction_strength` + tolerancia medidos |
| **HA-002** near-miss weak | `near_miss_rejected` / `no_chase_skipped` | medición reacción débil |
| **HA-003** edge/25/adaptive | Set research **alternativo** | **Research-only** — no approval oficial |
| **HA-004** PD conflict | `pd_conflict_rescued` o `pd_plus_ifvg_confirmed_reject` | según blockers compuestos |
| **HA-005** discipline | `discipline_no_trade` | solo con account/risk/manual state (bridge) |
| **HA-006** target missing | `target_missing_review` / downgrade suave | no hard reject hoy |
| **HA-007** no chase | `no_chase_skipped` | `no_chase_distance`, timing |
| **HA-008** news | **No delta hoy** | `humanized_missing_news_context` — bridge/forward |
| **HA-009** IFVG conflict | `ifvg_conflict_skipped` | multi-bundle confirmación |
| **HA-010** wait | `wait_promoted` u `observe` | calibración wait→candidate |

---

## 10. Códigos de razón (catálogo inicial)

| Código | Bucket típico |
|--------|---------------|
| `humanized_keep_candidate` | `baseline_kept` |
| `humanized_candidate_downgraded_context_fragile` | `candidate_downgraded` |
| `humanized_rescue_pd_conflict_only` | `pd_conflict_rescued` |
| `humanized_reject_pd_plus_ifvg` | `pd_plus_ifvg_confirmed_reject` |
| `humanized_skip_ifvg_conflict` | `ifvg_conflict_skipped` |
| `humanized_promote_wait_context_nearly_complete` | `wait_promoted` |
| `humanized_hold_wait_context_incomplete` | observe / wait hold |
| `humanized_near_miss_added_reaction_strong` | `near_miss_added` |
| `humanized_near_miss_rejected_reaction_weak` | baseline_removed / no add |
| `humanized_skip_no_chase_late_entry` | `no_chase_skipped` |
| `humanized_review_target_missing` | `target_missing_review` |
| `humanized_no_trade_discipline_risk` | `discipline_no_trade` |
| `humanized_missing_news_context` | missing_measurement (HA-008) |

Distribución de códigos es métrica obligatoria del audit (§5).

---

## 11. Mediciones faltantes antes de implementación

No implementar simulador delta ni lógica MQL5 hasta disponer (export o bridge):

| Campo | Casos HA / bucket |
|-------|-------------------|
| `reaction_strength` | HA-001, HA-002, near_miss |
| `near_miss_tolerance_profile` | HA-001 |
| `displacement_after_near_miss` | HA-001, HA-002 |
| `no_chase_distance` | HA-007 |
| `late_entry_reason` | HA-007 |
| `post_confirmation_extension` | HA-007 |
| `humanized_acceptance_reason_codes` | trazabilidad policy |
| `trade_set_delta_reason_codes` | audit por trade |
| `news_event_context` | HA-008 |
| `event_minutes_since` | HA-008 |
| `account/prop/manual_lock_state` | HA-005, discipline_no_trade |

Campos **ya disponibles** en SET001 (selector E5.22.4.1): readiness, blockers, IFVG/PD flags, entry fill status, variant sim, environment/discipline grades.

---

## 12. Ruta futura E5.22.5.x

| Checkpoint | Entregable | Tipo |
|------------|------------|------|
| **E5.22.5** | Este diseño | **Docs — cerrado** |
| **E5.22.5.1** | Revisión spec CLI delta audit + schema | Docs / review |
| **E5.22.5.2** | Simulador delta research-only (core + CLI) | Repo — sin MQL5 gate |
| **E5.22.5.3** | Evidencia operador SET001 delta | Evidencia |
| **E5.22.5.4** | Robustez multi-bundle delta | Evidencia |
| **E5.22.5.5** | Decisión PM: ¿alguna regla merece export/logic MQL5? | Gobernanza |

Ningún paso 5.2–5.5 aprueba live, entry, TP ni edge/25/adaptive por sí solo.

---

## 13. Qué no debe ocurrir aún

- Sin **gate** oficial
- Sin cambio al **trade set oficial**
- Sin modificación **MQL5**
- Sin cambio **entry / TP**
- Sin aprobación **edge / 25 % / adaptive**
- Sin **live trading**
- Sin trabajo **Telegram / dashboard / email / push**
- Sin wording **buy/sell/execute/signal confirmed**
- Sin promoción en **optimizador** basada en un solo bundle

---

## 14. Relación con E5.23 (optimization governance)

[`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md) y checkpoint **E5.23** deben usar este diseño para **no optimizar a ciegas**.

Toda campaña / grid / walk-forward debe comparar **por separado** (por símbolo/perfil):

| Conjunto | Uso en optimización |
|----------|---------------------|
| **Official baseline** | 50 % / CE + RR2 — referencia canónica |
| **Readiness-filtered research** | Segmentación diagnostic (no gate) |
| **Humanized-delta research set** | Contrafactual policy §3.2 |
| **Entry-variant research set** | HA-003 — nunca mezclado con oficial |

**Prohibido:** mezclar métricas de variantes edge/25/adaptive con baseline oficial en un único objetivo de optimización sin etiquetado explícito.

E5.22.5 entrega el **contrato de comparación**; E5.23 entrega la **gobernanza de cuándo** se permite usar cada conjunto en campañas.

---

## 15. Decisión

| Aspecto | Estado |
|---------|--------|
| **E5.22.5** | **Design-only checkpoint — cerrado (docs)** |
| Autoriza | Futuros audits research E5.22.5.1+ |
| No autoriza | Reglas de trading, gates, cambios MQL5, live |

---

## Referencias

- [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md) §9.3
- [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md) §6.3
- [`TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md`](./TRADE_MODEL_VISUAL_TEXTUAL_REPRESENTATION_E5_22_3.md) §17–18
