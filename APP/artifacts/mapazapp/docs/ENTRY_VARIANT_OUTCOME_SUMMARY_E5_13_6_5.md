# Entry Variant Outcome Summary — E5.13.6.5 (post-parity EVOS)

## Alcance

- **Checkpoint:** E5.13.6.5 — primer summary EVOS **después** de paridad 50 %/CE (**E5.13.6.3** / **E5.13.6.4**).
- **Build:** `MZP_TestEA_E5_13_6_3`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **CLI:** `mapazapp:testea-entry-variant-sim-summary`.
- **Paridad previa:** [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md) (`mismatch_rate = 0`).

Este documento registra el rerun del summary sobre el bundle benchmark. **No** aprueba cambio de entry oficial ni variantes alternativas.

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-summary -- \
  --bundle "$RunDir" --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `errors` | `[]` |
| `warnings` | `[]` |
| `has_logic` | `true` |
| `enabled` | `true` |

CSV local generado por el operador (no versionado):

`APP/artifacts/mapazapp/docs/_local_E5_13_6_5_entry_variant_sim_summary_DO_NOT_COMMIT.csv`

---

## Resultados por variante

### edge

| Métrica | Valor |
|---------|------:|
| `filled_count` | 1697 |
| `win_count` | 1453 |
| `loss_count` | 173 |
| `ambiguous_count` | 11 |
| `not_filled_count` | 0 |
| `invalid_risk_count` | 0 |
| `total_r` | 2733 |
| `expectancy_r` | 1.610489 |
| `winrate` | 0.893604 |
| `average_risk_points` | 280.860931 |

### 25 %

| Métrica | Valor |
|---------|------:|
| `filled_count` | 1405 |
| `win_count` | 411 |
| `loss_count` | 256 |
| `ambiguous_count` | 687 |
| `not_filled_count` | 292 |
| `invalid_risk_count` | 0 |
| `total_r` | 566 |
| `expectancy_r` | 0.402847 |
| `winrate` | 0.616192 |
| `average_risk_points` | 205.244840 |

### 50 % / CE (control oficial)

| Métrica | Valor |
|---------|------:|
| `filled_count` | 1355 |
| `win_count` | 411 |
| `loss_count` | 507 |
| `ambiguous_count` | 436 |
| `not_filled_count` | 342 |
| `invalid_risk_count` | 0 |
| `total_r` | 315 |
| `expectancy_r` | 0.232472 |
| `winrate` | 0.447712 |
| `average_risk_points` | 131.619188 |

Los conteos win/loss/ambiguous/not_filled de 50 % coinciden con el outcome virtual oficial en E5.13.6.4.

### 75 %

| Métrica | Valor |
|---------|------:|
| `filled_count` | 1235 |
| `win_count` | 188 |
| `loss_count` | 25 |
| `ambiguous_count` | 1021 |
| `not_filled_count` | 461 |
| `invalid_risk_count` | 1 |
| `total_r` | 351 |
| `expectancy_r` | 0.284211 |
| `winrate` | 0.882629 |
| `average_risk_points` | 63.240486 |

### adaptive

| Métrica | Valor |
|---------|------:|
| `filled_count` | 1405 |
| `win_count` | 412 |
| `loss_count` | 256 |
| `ambiguous_count` | 686 |
| `not_filled_count` | 292 |
| `invalid_risk_count` | 0 |
| `total_r` | 568 |
| `expectancy_r` | 0.404270 |
| `winrate` | 0.616766 |
| `average_risk_points` | 205.251246 |

---

## Summary rollups

| Campo | Valor |
|-------|-------|
| `best_variant_by_expectancy` | edge |
| `best_variant_by_total_r` | edge |
| `lowest_ambiguous_variant` | edge |
| `highest_fill_variant` | edge |

---

## Comparación vs E5.13.7 (pre-paridad)

| Aspecto | E5.13.7 (`MZP_TestEA_E5_13_6`) | E5.13.6.5 (`MZP_TestEA_E5_13_6_3`) |
|---------|-------------------------------|-----------------------------------|
| Control 50 %/CE | **No** reconciliaba con oficial | **Sí** — paridad confirmada en E5.13.6.4 |
| Confiabilidad del marco | Bloqueado para decisiones de entry | Comparación diagnóstica **confiable** vs control |
| 50 % ambiguous (sim) | 880 (desalineado) | 436 (alineado con oficial) |
| 50 % total_r (sim) | 585 (inflado por desalineación) | 315 (coherente con oficial) |

E5.13.6.5 es el **primer** summary EVOS en el que la variante 50 % actúa como control oficial válido.

---

## Interpretación estratégica (diagnóstico)

| Variante | Lectura en este bundle |
|----------|------------------------|
| **50 % / CE** | Baseline oficial; `total_r = 315`, `expectancy_r ≈ 0.23` |
| **25 % / adaptive** | Mejoran `total_r` vs 50 % (566–568 vs 315) y reducen losses, pero **suben ambiguous** de forma material (686–687 vs 436) |
| **75 %** | Poco atractivo: `ambiguous_count = 1021`, `filled_count` menor (1235), 1 `invalid_risk` |
| **edge** | Dominio agregado extremo (`total_r = 2733`, `expectancy_r ≈ 1.61`, fill 1697/1697); **no** implica aprobación — puede ser señal real o artefacto de modelado (geometría más superficial, riesgo más amplio, transiciones de fill/outcome) |

**Caveat edge:** el rollup marca edge como mejor en expectancy, total R, menor ambiguous y mayor fill. Eso **no** autoriza cambiar entry oficial sin una auditoría dedicada de geometría y transiciones.

---

## Decisión

| Veredicto | Alcance |
|-----------|---------|
| **PASS técnico summary** | CLI OK; `has_logic=true`; sin errores |
| **Marco EVOS usable** | Comparación edge/25/75/adaptive vs control 50 %/CE es diagnósticamente confiable post-paridad |
| **Mantener entry oficial** | CE/50 % sin cambio |
| **No aprobar edge** | Requiere sanity audit antes de cualquier conclusión estratégica |
| **No aprobar 25 % / adaptive** | Mejora agregada de R con costo alto en ambiguous; no es evidencia suficiente de mejora operativa |
| **No aprobar 75 %** | Alta ambiguous + menor fill |

---

## Siguiente recomendado

**E5.13.6.7 (docs)** — [`ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md): transition audit PASS; edge domina con riesgo ~2× vs 50 %; **no** aprobar variantes. **E5.13.6.8 (repo)** — [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md); CLI `mapazapp:testea-entry-edge-robustness-audit`.

---

## Referencias

- Paridad 50 %/CE: [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md)
- Summary pre-paridad (histórico): [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md)
- EVOS implementación: [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md)
