# Roadmap intermedio — Humanización «trader profesional» (E5.11–E5.20)

## Por qué existe este roadmap

- El objetivo es acercar Mapazapp al **razonamiento de un trader discrecional real**, sin copiar cursos ni «influencers» de forma acrítica.
- **El FVG es una zona**, no una entrada automática por sí sola.
- **La toma de liquidez (sweep) no basta** para validar un setup.
- Un **candidato operable** necesita contexto, reacción, estructura, confirmación, objetivo, invalidación y conciencia de sesión/riesgo — todo **medible y auditable**.
- Cada concepto humano debe traducirse a **definición técnica**, **campos exportables**, **códigos de razón** y **contadores resumen**.
- **Primera implementación:** solo **observación** (export/diagnóstico). **Sin compuerta dura** hasta evidencia. **Sin aprobación de trading live**. **Sin** `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`.
- **Sin** bajar umbrales para fabricar grados A/B. **Sin** sobreajuste a una sola campaña.

## Cadena explícita E5.13.1 → E5.20 (orden de trabajo)

| ID | Nombre | Rol |
|----|--------|-----|
| **E5.13.1** | Premium/Discount **smoke evidence** | **cerrado — docs** — [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md) |
| **E5.13.2** | Entry Zone / **Fill Feasibility Audit** | **cerrado — repo** — [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md) |
| **E5.13.3** | Entry Fill Feasibility **smoke evidence** | **cerrado — docs** — [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md) |
| **E5.13.2.1** | Fill feasibility **reason-code dedup** fix | **cerrado — repo** (`MapzEffAppendReasonOnce`) |
| **E5.13.4** | Entry Variant Feasibility Audit | **cerrado — repo** — [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md) |
| **E5.13.5** | Entry Variant Feasibility **smoke evidence** | **siguiente** (operador) |
| **E5.14** | **IFVG / BISI / SIBI / Inversion FVG** V1 | planificado — §E |
| **E5.15** | **Liquidity Target Quality** V1 | planificado — §F |
| **E5.16** | **Session / News / Spread / Volatility** context V1 | planificado — §G |
| **E5.17** | **Frequency / Risk / Overtrading** discipline V1 | planificado — §H |
| **E5.18** | **BridgeEA / Dashboard** setup state contract | planificado — §I |
| **E5.19** | **Forward demo** read-only readiness | planificado — §J |
| **E5.20** | **Evidence-based gate / score** decision checkpoint | planificado — §K (solo tras evidencia multi-bundle; sin tuning ad-hoc) |

## Flujo humano intencional (no es señal automática)

Orden conceptual del producto:

1. Contexto HTF / sesgo  
2. Liquidez tomada  
3. Reacción tras el sweep  
4. Desplazamiento  
5. FVG / IFVG  
6. Retest / confirmación  
7. Candidato de entrada  
8. Invalidación  
9. Objetivo de liquidez lógico  
10. Controles de riesgo, frecuencia, sesión y noticias  

Mapazapp **no** debe tratar el FVG como disparador único de entrada; la cadena anterior es la narrativa que la ingeniería debe poder **explicar y medir**.

---

## A. Validación inmediata

### E5.10.7 — Liquidity Chain Reaction smoke evidence (**cerrado — docs**)

- **Evidencia registrada:** [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md) — build `MZP_TestEA_E5_10_6`, bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, validación OK con warning `BUNDLE_EVENTS_LARGE`; **PASS técnico**; reacción ya no queda tan restrictiva como en E5.10.5 (~5 confirmaciones → 1504) pero **no separa wins/losses**; `liquidity_chain_detected_count` sigue desalineado frente a FVG tras sweep → **cadena solo diagnóstico**, sin compuerta dura; sin cambios EQ / live / A/B fabricados.
- **Referencia técnica E5.10.6:** [`LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md`](./LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md).

---

## B. Estructura profesional (HTF)

### E5.11 — HTF Structure V1 (**export cerrado en repo**)

**Propósito:** sustituir un sesgo superficial «solo D1» por un **contexto de estructura H4/H1** exportable para análisis post-hoc.

**Referencia técnica:** [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md) — columnas CSV, summary, sufijo eventos, score observación 0–20, inputs; **sin** compuerta dura.

### E5.11.1 — HTF Structure smoke evidence (**cerrado — docs**)

- **Evidencia registrada:** [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md) — build `MZP_TestEA_E5_11`, bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, validación OK con warning `BUNDLE_EVENTS_LARGE`; **PASS técnico**; contexto HTF útil; separación leve wins vs ambiguous/expired en media de score HTF; losses con score HTF alto → **no** compuerta dura ni filtro standalone; `protected_level_missing` dominante → **observación-only**; sin cambios EQ / live / A/B fabricados ni tune solo por este bundle.

---

## C. Confirmación MSS / CHoCH

### E5.12 — MSS / CHoCH V1 (**export cerrado en repo**)

**Propósito:** complementar FVG + liquidez + HTF con **confirmación de estructura interna en el timeframe de ejecución** (por defecto M15), usando **solo velas cerradas** para MSS/CHoCH confirmados y marcando **wick-only** como diagnóstico.

**Referencia técnica:** [`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md) — columnas CSV, summary, sufijo compacto en eventos (`msc_en=…`), score observación separado (`mss_choch_score`, máx. 15 V1), **E5.12.2** scores temporales (`mss_temporal_relevance_score`, `choch_temporal_relevance_score`, 0–10), inputs y `optimization_parameters`; **sin** compuerta dura; **sin** modificar outcome logic ni EQ gate.

**Smoke cerrado (docs):** **E5.12.1** — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md) — build `MZP_TestEA_E5_12`, mismo bundle benchmark que HTF smoke; **PASS técnico**; MSS/CHoCH score **no** separa wins/losses → **no** compuerta; ambiguous con score/detection MSS más bajos → señal útil de **ruido**, no de edge standalone.

**Smoke cerrado (docs):** **E5.12.3** — [`MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md) — build `MZP_TestEA_E5_12_2`, mismo bundle; **PASS técnico** (`BUNDLE_EVENTS_LARGE`); relevancia temporal **observación-only**; confirma que muchas rupturas quedan **tarde o tras entrada** → explica en parte el hallazgo E5.12.1; **no** compuerta.

**Cadena siguiente (precio / zona de entrada):** §D — **E5.13** (export PD) → **E5.13.1** (smoke) → **E5.13.2** (audit zona/fill).

**Referencia E5.12.2 (repo):** [`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md) — columnas temporales + summary `has_mss_choch_temporal_relevance_v1_logic`; sigue **sin** compuerta.

## D. Premium / Discount / zona de precio

### E5.13 — Premium/Discount Context V1 (**export cerrado en repo**)

**Referencia:** [`PREMIUM_DISCOUNT_EXPORT_E5_13.md`](./PREMIUM_DISCOUNT_EXPORT_E5_13.md) — `Mapazapp_TestEA.mq5` build **`MZP_TestEA_E5_13`**; columnas `premium_discount_*` y `pd_*` (rango, midpoint, posición %, zona, validez direccional, fuera de rango, too deep/shallow, score 0–15); summary `has_premium_discount_v1_logic` + contadores/agregados; `optimization_parameters` (`premium_discount_*`); sufijo compacto en eventos `setup_allowed` y `virtual_trade_candidate_created` (`pd_en`, `pd_zone`, `pd_pos`, `pd_valid`, `pd_conflict`, `pd_score`); analizador E5.9 opcional `premium_discount_component_stats` si existe `premium_discount_score`; **sin** compuerta dura; **sin** cambiar generación de trades ni outcomes.

### E5.13.1 — Premium/Discount smoke evidence (**cerrado — docs**)

- **Evidencia:** [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md) — build `MZP_TestEA_E5_13`, bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, `ok=true`, `status=warning` solo por `BUNDLE_EVENTS_LARGE`, `testEaStatus=valid`; **PASS** técnico.
- **Hallazgo:** PD V1 **no** separa fuertemente wins vs losses por score medio; `expired_unfilled` con media PD más baja; muchos `zone_conflict` y `outside_range` → diagnóstico útil, **no** gate standalone.

### E5.13.2 — Entry Zone / Fill Feasibility Audit (**cerrado — repo**)

**Referencia:** [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md) — build **`MZP_TestEA_E5_13_2`**; diagnóstico **post-candidato** (retrace, near-miss, profundidad en FVG, `entry_fill_status`); summary `has_entry_fill_feasibility_v1_logic`; **no** mezclar `entry_fill_feasibility_score` con `entry_quality_score`; **sin** compuerta.

### E5.13.3 — Entry Fill Feasibility smoke evidence (**cerrado — docs**)

- **Evidencia:** [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md) — build `MZP_TestEA_E5_13_2`, bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, **PASS** técnico (`BUNDLE_EVENTS_LARGE`).
- **Hallazgo:** todos los trades tocan FVG; solo 1355/1697 CE+entry; 298 `missed_shallow_retrace` + 22 `near_miss` + 22 `expired_unfilled` en capa fill — el modelo CE/~50 % puede ser demasiado estricto para un subconjunto; **no** cambiar entry aún.
- **Caveat E5.13.3:** reason tokens inflados por barra — corregido en **E5.13.2.1** (`MapzEffAppendReasonOnce`).

### E5.13.2.1 — Reason-code dedup (**cerrado — repo**)

`MapzEffAppendReasonOnce` garantiza ≤ 1 token por trade en `entry_fill_feasibility_reasons`. No altera summary counters ni `entry_fill_status`.

### E5.13.4 — Entry Variant Feasibility Audit (**cerrado — repo**)

- **Referencia:** [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md) — build **`MZP_TestEA_E5_13_4`**; variantes hipotéticas edge / 25 % / 50 % / 75 % / adaptive; columnas `entry_variant_*` separadas del entry oficial; **sin** gate ni cambio de outcomes.

### E5.13.5 (**siguiente — operador**)

Smoke Strategy Tester post–E5.13.4; contrastar contadores `entry_variant_*` con evidencia E5.13.3.

---

## E. IFVG / BISI / SIBI

### E5.14 — IFVG / BISI / SIBI / clasificación Inversion FVG V1

**Propósito:** separar FVG «regular», implicado e **inversión** (IFVG) en comportamiento exportable.

**Conceptos a documentar/implementar como definiciones cerradas:**

- **BISI / SIBI** (convención interna; nombres exportables estables).
- FVG como zona de continuación «normal».
- IFVG como **FVG fallido** / zona de **reversión de rol**.
- Diagnósticos de **CE** (consequent encroachment), p. ej. **50%** de la zona — como campos observacionales, no como mantra mágico.

**Campos planificados:**

| Campo |
|-------|
| `fvg_type` (`regular` / `implied` / `inversion`) |
| `fvg_direction` |
| `fvg_role` (`support` / `resistance`) |
| `fvg_ce_price` |
| `fvg_retested` |
| `fvg_failed_and_inverted` |
| `inversion_confirmed` |
| `fvg_classification_reasons` |

---

## F. Calidad del objetivo

### E5.15 — Liquidity Target Quality V1

**Propósito:** ir más allá del modelo **RR fijo** como única forma de objetivo.

**Campos planificados (observación-first):**

| Campo |
|-------|
| `target_type` (`prior_high` / `prior_low` / `equal_high` / `equal_low` / `session_high` / `session_low` / `htf_liquidity` / `fixed_rr`) |
| `target_price` |
| `target_distance_r` |
| `target_liquidity_quality` |
| `target_before_opposing_liquidity` |
| `target_reason_codes` |

---

## G. Sesión / noticias / spread / volatilidad

### E5.16 — Session / News / Spread / Volatility Context V1

**Propósito:** medir si los setups se comportan distinto en **Asia**, **London**, **NY**, ventanas de **noticias**, **spread alto** o **volatilidad alta**.

**Postura:** **no** se asume que las noticias deban bloquearse siempre; **primero observar**.

**Campos planificados:**

| Campo |
|-------|
| `session_bucket` (`asia` / `london` / `ny_am` / `ny_pm` / `rollover` / `unknown`) |
| `near_high_impact_news` |
| `minutes_to_news` |
| `minutes_after_news` |
| `news_mode` (`observe` / `block_new_entries` / `allow`) |
| `spread_bucket` |
| `volatility_bucket` |
| `session_news_reason_codes` |

---

## H. Riesgo / sobreoperación

### E5.17 — Frequency / Risk / Overtrading Discipline V1

**Propósito:** evitar frecuencias irreales al escalar a **múltiples símbolos**.

**Campos planificados (observación-first):**

| Campo |
|-------|
| `trades_today_symbol` |
| `trades_today_global` |
| `trades_this_session` |
| `consecutive_losses` |
| `daily_r_exposure` |
| `overtrading_warning` |
| `risk_discipline_reason_codes` |

---

## I. Paridad BridgeEA / Dashboard

### E5.18 — BridgeEA / Dashboard Setup State Contract (live read-only)

**Propósito:** todo lo probado en TestEA debe ser **representable en vivo** vía BridgeEA/dashboard como **lectura**, sin ejecución.

**Estado de setup planificado (contrato):**

| Campo |
|-------|
| `setup_id` |
| `symbol` |
| `timeframe` |
| `direction` |
| `htf_context` |
| `liquidity_state` |
| `reaction_state` |
| `mss_choch_state` |
| `fvg_state` |
| `entry_zone` |
| `invalidation` |
| `target_liquidity` |
| `score_total` |
| `component_scores` |
| `blocking_reasons` |
| `observation_only` (flag) |

**Sin auto-trading.**

---

## J. Compuerta demo forward read-only

### E5.19 — Forward demo read-only readiness

**Propósito:** **no** aprobar trading basándose solo en Strategy Tester.

**Criterios de aceptación (dirección):**

- BridgeEA exporta el **mismo estado de setup** en vivo que el modelo conceptual de TestEA.
- El dashboard muestra **por qué** un setup es válido o rechazado.
- Las alertas explican **razonamiento** exportable.
- **No** se envían órdenes.
- Los datos forward pueden **compararse** con los conceptos ya probados en TestEA.

---

## K. Compuerta basada en evidencia (checkpoint explícito)

### E5.20 — Evidence-based gate / score decision checkpoint

**Propósito:** punto de decisión de producto sobre **compuertas** o uso de **score** en flujo real, **solo** cuando exista evidencia acumulada (múltiples bundles, calibración E5.9.x, smokes E5.x) y criterios explícitos — **no** activar gates ni retocar umbrales desde un único run.

**Postura:** reconciliar con [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md) §12 y [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) §15 antes de cualquier «aprobación» automática.

---

## Disciplina de ingeniería (invariantes)

- Cada concepto nuevo: **definición técnica** + **export** + **reason codes** + **summary counters**.
- Primera entrega por track: **observación-only**.
- **Sin compuerta dura** hasta evidencia.
- **Sin** ejecución live / `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest` en esta línea de trabajo hasta compuertas explícitas de producto.
- CSV locales `*_DO_NOT_COMMIT.csv` y runs MT5 **no** se versionan en Git salvo decisión explícita del PM.

## Documentos relacionados

- [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md)
- [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md)
- [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md) (§12 capacidades de score — reconciliar con esta numeración E5.11+)
- [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) (§15 roadmap histórico — reconciliar naming)
