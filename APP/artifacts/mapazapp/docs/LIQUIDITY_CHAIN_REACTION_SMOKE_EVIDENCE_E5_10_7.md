# Liquidity Chain Reaction — Smoke evidence E5.10.7

## Contexto

Smoke ejecutado por el operador **después de E5.10.6**, con build **`MZP_TestEA_E5_10_6`**. Objetivo: evidencia reproducible de que la auditoría/heurística de reacción en cadena (**E5.10.6**) exporta bien y permite valorar balance diagnóstico **sin** convertirla en compuerta dura.

**Referencias:** implementación y campos — [`LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md`](./LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md); roadmap siguiente — [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md).

---

## Validación de bundle / build

| Campo | Valor |
|--------|--------|
| `ea_build` | `MZP_TestEA_E5_10_6` |
| `ok` | `true` |
| `status` | `warning` |
| `errors` | `[]` |
| Warning único | `BUNDLE_EVENTS_LARGE` |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `trade_count` | 1697 |
| Bundle (parameter set) | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |

---

## Summary — auditoría de reacción (cadena)

| Métrica | Valor |
|---------|------:|
| `has_liquidity_chain_v1_logic` | `true` |
| `has_liquidity_chain_reaction_audit_v1_logic` | `true` |
| `liquidity_chain_detected_count` | 1 |
| `liquidity_chain_reaction_checked_count` | 3059 |
| `liquidity_chain_reaction_confirmed_count` | 1504 |
| `liquidity_chain_reaction_fail_close_not_back_inside_count` | 120 |
| `liquidity_chain_reaction_fail_no_candle_after_sweep_count` | 0 |
| `liquidity_chain_reaction_fail_wrong_level_count` | 362 |
| `liquidity_chain_reaction_fail_sweep_after_fvg_count` | 0 |
| `liquidity_chain_reaction_fail_other_count` | 0 |
| `liquidity_chain_displacement_confirmed_count` | 606 |
| `liquidity_chain_fvg_after_sweep_count` | 1697 |
| `average_liquidity_chain_score` | 6.900412 |
| `average_entry_quality_score` | 58.267531 |
| `score_a_count` | 0 |
| `score_b_count` | 1 |
| `score_c_count` | 1693 |
| `score_rejected_count` | 3 |

---

## Frecuencia por trade — razón de fallo de reacción (top)

Conteos agregados a nivel trade sobre tokens de `liquidity_chain_reaction_failure_reason` (frecuencias reportadas en el análisis del run):

| Token / razón | Count |
|---------------|------:|
| `liquidity_chain_reaction_ok` | 1504 |
| `liquidity_chain_reaction_fail_wrong_level` | 99 |
| `liquidity_chain_reaction_fail_close_not_back_inside` | 94 |

*(Otros contadores de fallo están desglosados en el bloque summary anterior.)*

---

## Outcome — agregados (sin claims de rentabilidad)

| Outcome | Count | avgEntryScore | avgChainScore | reactionConfirmed | displacementConfirmed | fvgAfterSweep | avgAmbiguousRisk |
|---------|------:|--------------:|--------------:|------------------:|----------------------:|--------------:|-----------------:|
| `ambiguous` | 436 | 57.7638 | 6.9174 | 380 | 151 | 436 | 70.1147 |
| `expired_open` | 1 | 57 | 7 | — | — | — | — |
| `expired_unfilled` | 342 | 54.7427 | 6.8713 | 308 | 124 | 342 | 36.5936 |
| `loss` | 507 | 59.8245 | 6.8974 | 454 | 185 | 507 | 36.6864 |
| `win` | 411 | 59.8175 | 6.91 | 361 | 145 | 411 | 37.0073 |

---

## Interpretación

- **PASS técnico:** validación CLI OK; export de auditoría de reacción operativo.
- La heurística **ya no es demasiado estricta** en el sentido E5.10.5: `liquidity_chain_reaction_confirmed_count` pasó de órdenes de magnitud muy bajos (5 en E5.10.5) a **1504** en este smoke.
- **`reaction_confirmed` es amplio:** las medias por outcome (win / loss / ambiguous / etc.) **no separan** de forma útil el resultado; la etiqueta sirve sobre todo como **diagnóstico narrativo**, no como filtro discriminatorio por sí sola.
- **Cadena causal completa sigue muy restrictiva o incompleta:** `liquidity_chain_detected_count` = **1** frente a `liquidity_chain_fvg_after_sweep_count` = **1697** y `liquidity_chain_reaction_confirmed_count` = **1504** — la pieza «cadena detectada» no alinea con el volumen de trades con FVG tras sweep ni con confirmaciones de reacción.
- **Postura de producto:** la liquidez/cadena permanece **solo observación / export**; **no** como compuerta dura aprobada.

---

## Decisión (explícita)

- **No** compuerta dura por cadena/reacción.
- **No** aprobación de trading live derivada de este smoke.
- **No** cambios a umbrales globales de Entry Quality.
- **No** fabricar grados A/B.
- **No** seguir tuneando solo la reacción **sin** contexto más amplio de estructura de mercado.
- **Siguiente paso estratégico recomendado:** **E5.11 — HTF Structure V1** quedó **implementado en repo** (`MZP_TestEA_E5_11`) — ver [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md). **Siguiente evidencia operador:** **E5.11.1** (smoke tras recompilar y correr Strategy Tester).

---

## Notas de gobernanza

- CSV locales `*_DO_NOT_COMMIT.csv` y artefactos crudos del tester **no** se versionan salvo decisión explícita del PM.
- Este documento es **solo evidencia / decisión**; no modifica código ni umbrales.
