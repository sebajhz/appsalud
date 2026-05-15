# Roadmap intermedio — Humanización «trader profesional» (E5.11–E5.19)

## Por qué existe este roadmap

- El objetivo es acercar Mapazapp al **razonamiento de un trader discrecional real**, sin copiar cursos ni «influencers» de forma acrítica.
- **El FVG es una zona**, no una entrada automática por sí sola.
- **La toma de liquidez (sweep) no basta** para validar un setup.
- Un **candidato operable** necesita contexto, reacción, estructura, confirmación, objetivo, invalidación y conciencia de sesión/riesgo — todo **medible y auditable**.
- Cada concepto humano debe traducirse a **definición técnica**, **campos exportables**, **códigos de razón** y **contadores resumen**.
- **Primera implementación:** solo **observación** (export/diagnóstico). **Sin compuerta dura** hasta evidencia. **Sin aprobación de trading live**. **Sin** `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`.
- **Sin** bajar umbrales para fabricar grados A/B. **Sin** sobreajuste a una sola campaña.

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

### E5.12 — MSS / CHoCH V1

**Propósito:** evitar tratar **cada retest de FVG** como entrada válida; exigir **confirmación estructural** medible.

**Idea técnica (borrador):**

- `bullish_mss` solo si una **vela cerrada** rompe **por encima** del **swing alto interno confirmado**.
- `bearish_mss` solo si una **vela cerrada** rompe **por debajo** del **swing bajo interno confirmado**.
- Roturas **solo por mecha** → **diagnóstico**, no confirmación operativa.

**Campos planificados:**

| Campo |
|-------|
| `mss_detected` |
| `mss_direction` |
| `mss_break_level` |
| `mss_close_price` |
| `mss_bars_after_sweep` |
| `mss_valid_close` |
| `choch_detected` |
| `choch_direction` |
| `mss_reason_codes` |

---

## D. Premium / Discount / zona de precio

### E5.13 — Premium/Discount Context V1

**Propósito:** evitar largos en **premium** o cortos en **discount** salvo **justificación explícita** exportada (razones).

**Campos planificados (observación-first):**

| Campo |
|-------|
| `pd_range_high` |
| `pd_range_low` |
| `pd_midpoint_50` |
| `price_zone` (`premium` / `discount` / `equilibrium`) |
| `entry_zone_valid_for_direction` |
| `ote_zone_touched` |
| `price_zone_reason_codes` |

---

## E. IFVG / BISI / SIBI

### E5.14 — IFVG / clasificación Inversion FVG V1

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

### E5.16 — Session and News Context V1

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

### E5.17 — Frequency and Risk Discipline V1

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

### E5.18 — Setup State Contract (live read-only)

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

## Disciplina de ingeniería (invariantes)

- Cada concepto nuevo: **definición técnica** + **export** + **reason codes** + **summary counters**.
- Primera entrega por track: **observación-only**.
- **Sin compuerta dura** hasta evidencia.
- **Sin** ejecución live / `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest` en esta línea de trabajo hasta compuertas explícitas de producto.
- CSV locales `*_DO_NOT_COMMIT.csv` y runs MT5 **no** se versionan en Git salvo decisión explícita del PM.

## Documentos relacionados

- [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md)
- [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md) (§12 capacidades de score — reconciliar con esta numeración E5.11+)
- [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) (§15 roadmap histórico — reconciliar naming)
