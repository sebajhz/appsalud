# Entry Variant Transition Audit — Evidencia operador E5.13.6.7

## Alcance

- **Checkpoint:** E5.13.6.7 — evidencia operador post–**E5.13.6.6** (CLI transition audit).
- **Build TestEA:** `MZP_TestEA_E5_13_6_3`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato auditor:** [`ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md).
- **Summary previo:** [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md).

Este documento registra el primer transition audit ejecutado sobre el bundle benchmark. **No** aprueba edge, 25 %, adaptive ni 75 %; **no** cambia entry oficial CE/50 %.

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-transition-audit -- \
  --bundle "$RunDir" \
  --json \
  --variants "edge,25,adaptive,50,75" \
  --max-examples 10
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `trade_count` | 1697 |
| `control_variant` | `50` |
| `errors` | `[]` |
| `warnings` | ruido `parameter_set_id` / import-option; **no bloquea** |

CSV local (no versionado):

`APP/artifacts/mapazapp/docs/_local_E5_13_6_7_entry_variant_transition_audit_DO_NOT_COMMIT.csv`

---

## Interpretation flags

| Flag |
|------|
| `EDGE_DOMINATES_SINGLE_BUNDLE` |
| `EDGE_RISK_DISTANCE_HIGH` |
| `EDGE_RISK_RATIO_GT_2` |
| `VARIANT_25_IMPROVES_TOTAL_R_VS_OFFICIAL` |
| `VARIANT_25_INCREASES_AMBIGUITY` |
| `VARIANT_ADAPTIVE_IMPROVES_TOTAL_R_VS_OFFICIAL` |
| `VARIANT_ADAPTIVE_INCREASES_AMBIGUITY` |
| `VARIANT_25_IMPROVES_TOTAL_R_BUT_INCREASES_AMBIGUITY` |
| `VARIANT_75_HIGH_AMBIGUITY` |

---

## Control 50 % / CE

| Métrica | Valor |
|---------|------:|
| `improved_count` | 0 |
| `degraded_count` | 0 |
| `unchanged_count` | 1697 |
| `total_delta_r_vs_official` | 0 |
| `average_risk_ratio_vs_50` | 1 |

Matriz alineada con outcome oficial:

| Bucket | Count |
|--------|------:|
| `official_loss_variant_loss` | 507 |
| `official_ambiguous_variant_ambiguous` | 436 |
| `official_win_variant_win` | 411 |
| `official_expired_unfilled_variant_not_filled` | 342 |
| `official_expired_open_variant_expired_open` | 1 |

**Conclusión:** el control 50 %/CE sigue siendo la referencia oficial válida en este bundle.

---

## Variante edge

### Conteos oficial / variante

| Clase | Oficial | Edge |
|-------|--------:|-----:|
| win | 411 | 1453 |
| loss | 507 | 173 |
| ambiguous | 436 | 11 |
| expired_unfilled | 342 | — |
| expired_open | 1 | — |
| unresolved | — | 60 |

### Mejora / degradación / delta R

| Métrica | Valor |
|---------|------:|
| `improved_count` | 1117 |
| `degraded_count` | 24 |
| `unchanged_count` | 473 |
| `partial_improvement_loss_to_ambiguous_count` | 2 |
| `rescued_loss_to_win_count` | 371 |
| `rescued_expired_to_win_count` | 334 |
| `rescued_ambiguous_to_win_count` | 412 |
| `harmed_win_to_loss_count` | 18 |
| `harmed_win_to_ambiguous_count` | 6 |
| `total_delta_r_vs_official` | 2418 |
| `average_delta_r_vs_official` | 1.4249 |
| `median_delta_r_vs_official` | 2 |
| `positive_delta_count` | 1119 |
| `negative_delta_count` | 96 |
| `zero_delta_count` | 482 |

### Risk / geometría edge

| Métrica | Valor |
|---------|------:|
| `average_risk_points` | 280.86 |
| `median_risk_points` | 150 |
| `p10_risk_points` | 26 |
| `p90_risk_points` | 624.80 |
| `average_risk_ratio_vs_50` | 1.999 |
| `median_risk_ratio_vs_50` | 2.000 |
| `p90_risk_ratio_vs_50` | 2.012 |
| `count_risk_ratio_gt_1_5` | 1695 |
| `count_risk_ratio_gt_2_0` | 344 |
| `count_risk_ratio_gt_3_0` | 0 |
| `edge_entry_equals_near_edge_count` | 1697 |
| `edge_entry_outside_fvg_count` | 0 |
| `edge_invalid_risk_count` | 0 |
| `edge_win_while_official_not_filled_count` | 334 |
| `edge_win_while_official_50_loss_count` | 371 |
| `edge_win_while_official_50_ambiguous_count` | 412 |

### Buckets de transición principales

| Bucket | Count |
|--------|------:|
| `official_ambiguous_variant_win` | 412 |
| `official_loss_variant_win` | 371 |
| `official_win_variant_win` | 336 |
| `official_expired_unfilled_variant_win` | 334 |
| `official_loss_variant_loss` | 134 |
| `official_win_variant_unresolved` | 51 |
| `official_ambiguous_variant_loss` | 21 |
| `official_win_variant_loss` | 18 |
| `official_win_variant_ambiguous` | 6 |
| `official_loss_variant_ambiguous` | 2 |
| `official_expired_open_variant_unresolved` | 1 |

**Lectura:** edge es la variante más fuerte en este bundle único, pero el dominio está **acoplado** a distancia de riesgo ~2× vs 50 %/CE y a rescates masivos desde loss / ambiguous / expired_unfilled hacia win (muchos **fill-model-sensitive**). Geometría FVG near-edge es consistente (1697/1697), pero eso no prueba robustez de ejecución.

---

## Variante 25 %

| Métrica | Valor |
|---------|------:|
| `improved_count` | 237 |
| `degraded_count` | 192 |
| `unchanged_count` | 962 |
| `total_delta_r_vs_official` | 251 |
| `average_delta_r_vs_official` | 0.1479 |
| `average_risk_points` | ~210.67 |
| `average_risk_ratio_vs_50` | ~1.501 |

Buckets relevantes:

| Bucket | Count |
|--------|------:|
| `official_ambiguous_variant_ambiguous` | 297 |
| `official_expired_unfilled_variant_not_filled` | 292 |
| `official_loss_variant_ambiguous` | 220 |
| `official_loss_variant_loss` | 199 |

**Lectura:** 25 % mejora total R vs oficial de forma moderada, pero **aumenta ambiguous de forma material** y deja muchos expired como `not_filled`. Más realista que edge en ratio de riesgo, pero no candidato aprobado.

---

## Variante adaptive

| Métrica | Valor |
|---------|------:|
| `improved_count` | 237 |
| `degraded_count` | 191 |
| `unchanged_count` | 963 |
| `total_delta_r_vs_official` | 253 |
| `average_delta_r_vs_official` | 0.1491 |
| `average_risk_points` | ~210.68 |
| `average_risk_ratio_vs_50` | ~1.501 |

**Lectura:** perfil casi idéntico a 25 % (ligera mejora de delta R, mismo patrón de ambiguous).

---

## Variante 75 %

| Métrica | Valor |
|---------|------:|
| `improved_count` | 109 |
| `degraded_count` | 332 |
| `unchanged_count` | 839 |
| `total_delta_r_vs_official` | 36 |
| `average_delta_r_vs_official` | 0.0212 |
| `average_risk_points` | ~70.29 |
| `average_risk_ratio_vs_50` | ~0.501 |

Buckets relevantes:

| Bucket | Count |
|--------|------:|
| `official_loss_variant_ambiguous` | 414 |
| `official_ambiguous_variant_ambiguous` | 396 |
| `official_expired_unfilled_variant_not_filled` | 341 |
| `official_win_variant_ambiguous` | 211 |
| `official_win_variant_not_filled` | 120 |

**Lectura:** 75 % **no** es candidato primario; alta degradación y ambiguous.

---

## Decisión de ingeniería (E5.13.6.7)

| Decisión | Estado |
|----------|--------|
| Transition audit diagnóstico | **PASS** |
| Aprobar edge | **NO** |
| Aprobar 25 % / adaptive | **NO** |
| Aprobar 75 % | **NO** |
| Cambiar entry oficial CE/50 % | **NO** |
| Live / funding / gates | **NO** |

**Síntesis:**

- Edge domina en un solo bundle, pero con **risk_ratio ≈ 2** vs control y rescates masivos desde estados difíciles del oficial.
- 25 % y adaptive mejoran total R vs oficial con costo alto en ambiguous; perfil más moderado que edge, insuficiente para aprobación.
- 75 % permanece poco atractivo.
- El siguiente paso lógico es **robustez/realismo de edge**, no decisión de entry model.

---

## Siguiente recomendado

**E5.13.6.9 (docs) —** [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md) — evidencia robustness PASS; edge no aprobado. **Siguiente:** **E5.13.6.10** Buffered EVOS decision.
- Impacto práctico de `risk_ratio ≈ 2` en sizing y exposición.
- **Sin** decisión de entry model hasta completar robustness audit.

---

## Referencias

- Implementación audit: [`ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md)
- Summary EVOS: [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md)
- Paridad control: [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md)
