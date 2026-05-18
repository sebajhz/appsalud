# Entry Variant Outcome Reconciliation — Evidencia smoke E5.13.6.2 (operador)

## Alcance

- **Checkpoint:** E5.13.6.2 — humo diagnóstico post–**E5.13.6.1** (CLI `mapazapp:testea-entry-variant-sim-reconcile`).
- **Contrato reconcile:** [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md).
- **Bundle origen:** export E5.13.7 — [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md).
- **Implementación reconcile (referencia):** commit `68c962f` — `feat(mapazapp): E5.13.6.1 add variant outcome reconciliation audit`.

Este documento registra la ejecución del reconciler sobre el bundle benchmark; **no** cierra paridad 50 %/CE ni habilita decisiones de entry.

---

## Comando y bundle

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-reconcile -- \
  --bundle "<RunDir>" --json
```

| Campo | Valor |
|-------|--------|
| Bundle | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `ea_build` (export) | `MZP_TestEA_E5_13_6` |
| `ok` | `true` |
| `errors` | `[]` |
| Warnings | ruido `parameter_set_id` / import-option — **no** bloquean la conclusión de reconcile |

**Veredicto técnico reconcile CLI:** **PASS** (herramienta operativa; JSON parseable).

---

## Summary (reconcile)

| Métrica | Valor |
|---------|------:|
| `trade_count` | 1697 |
| `official_win_count` | 411 |
| `official_loss_count` | 507 |
| `official_ambiguous_count` | 436 |
| `official_expired_unfilled_count` | 342 |
| `variant50_win_count` | 353 |
| `variant50_loss_count` | 121 |
| `variant50_ambiguous_count` | 880 |
| `variant50_not_filled_count` | 342 |
| `outcome_match_count` | 996 |
| `mismatch_count` | 701 |
| `mismatch_rate` | **0.413** (~41.3 %) |

Los conteos agregados oficial/v50 coinciden con E5.13.7; el reconcile añade **desglose por trade** y diagnósticos de geometría/timing.

---

## Diagnóstico de mismatch (por dimensión)

| Contador | Valor | Lectura |
|----------|------:|---------|
| `entry_price_mismatch_count` | **0** | Entry 50 % alineado con oficial |
| `sl_price_mismatch_count` | **0** | SL compartido correcto en export |
| `tp_price_mismatch_count` | **700** | TP variante ≠ TP oficial (recalculo RR / redondeo / barra de referencia) |
| `fill_bar_mismatch_count` | **1354** | Barra de fill hipotético ≠ `bars_to_fill` oficial |
| `close_bar_mismatch_count` | **1336** | `bars_to_close` sim ≠ `bars_held` oficial |
| `result_r_mismatch_count` | 82 | R distinto con outcome resuelto (no ambiguous) |
| `same_bar_ambiguity_mismatch_count` | **618** | Flag/outcome ambiguous no coincide entre capas |
| `invalid_risk_count` | 0 | Sin geometría inválida en v50 |

**Hallazgo central:** entry y SL coinciden; **TP, barras y semántica de ambiguous** no.

---

## Buckets principales (cross-tab)

| Bucket | Count | Notas |
|--------|------:|-------|
| `official_ambiguous_variant50_ambiguous` | 349 | Paridad ambiguous×ambiguous |
| `official_expired_variant50_not_filled` | 342 | Paridad expired×not_filled |
| `official_loss_variant50_ambiguous` | 328 | Loss oficial → ambiguous en sim |
| `official_win_variant50_ambiguous` | 203 | Win oficial → ambiguous en sim |
| `official_win_variant50_win` | 199 | Paridad win×win |
| `official_loss_variant50_loss` | 106 | Paridad loss×loss |
| `official_ambiguous_variant50_win` | 81 | Ambiguous oficial → win sim |
| `official_loss_variant50_win` | 73 | Loss oficial → win sim |
| `official_win_variant50_loss` | 9 | Win oficial → loss sim |
| `official_ambiguous_variant50_loss` | 6 | |
| `official_expired_open_variant50_unresolved` | 1 | Caso marginal |

La masa de desvíos está en **loss/win oficial re-clasificados como ambiguous** en sim 50 %, coherente con `variant50_ambiguous_count = 880` vs oficial `436`.

---

## Interpretación (causas probables — hipótesis de ingeniería)

1. **Fill una barra después:** EVOS puede empezar la simulación post-touch en la barra **siguiente** a la que usa el virtual trade oficial (`fill_bar_mismatch` ≈ cohorte filled).
2. **Cierre una barra después:** resolución TP/SL en barra distinta (`close_bar_mismatch` ≈ cohorte filled).
3. **Ambiguous misma vela:** manejo distinto cuando TP y SL se tocan en la misma vela cerrada (`same_bar_ambiguity_mismatch` = 618).
4. **TP recalculado:** variante 50 recalcula TP desde entry variante × RR en lugar de reutilizar el TP oficial como control estricto (`tp_price_mismatch` = 700 con entry/SL ya alineados).

Estas hipótesis **no** están verificadas en código en este checkpoint; guían **E5.13.6.3**.

---

## Decisión de ingeniería (E5.13.6.2)

| Veredicto | Alcance |
|-----------|---------|
| **PASS diagnóstico** | Reconciler funciona; cuantifica desalineación 50 %/CE |
| **FAIL paridad control** | 50 % sim **no** replica semántica outcome oficial |
| **Bloqueado estrategia** | Conclusiones EVOS edge/25/75/adaptive; aprobación de entry alternativo |
| **Mantener** | Entry oficial CE/50 % |
| **No usar** | edge `totalR` / winrate como evidencia de rentabilidad |
| **No avanzar** | **E5.14** IFVG/BISI/SIBI hasta paridad 50 %/CE corregida o explicada |

**Siguiente recomendado:** **E5.13.6.3** — alinear EVOS 50 %/CE con semántica de outcome virtual oficial (fill bar, close bar, ambiguous misma vela, TP control); re-ejecutar reconcile hasta `mismatch_rate` acotado en cohorte control.

---

## Referencias cruzadas

- Reconcile E5.13.6.1: [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md)  
- Smoke EVOS E5.13.7: [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md)  
- Roadmap: [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)  
- Handoff: [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
