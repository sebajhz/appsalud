# Entry Variant Outcome Reconciliation — Smoke Evidence E5.13.6.4

## Alcance

- **Checkpoint:** E5.13.6.4 — smoke operador post-fix **E5.13.6.3**.
- **Build TestEA:** `MZP_TestEA_E5_13_6_3`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Objetivo:** confirmar que EVOS **50 %/CE** funciona como control estricto del outcome virtual oficial.
- **Referencia fix:** [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md).

---

## Compile y bundle

| Campo | Valor |
|-------|-------|
| `TESTEA_BUILD` | `MZP_TestEA_E5_13_6_3` |
| MetaEditor compile | **0 errors, 0 warnings** |
| EX5 archivado | `Mapazapp_TestEA_E5_13_6_3.ex5` |
| Bundle validation `ok` | `true` |
| Bundle validation `status` | `warning` |
| `errors` | `[]` |
| Warning único | `BUNDLE_EVENTS_LARGE` |
| `ea_build` | `MZP_TestEA_E5_13_6_3` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |

### Event Counts

| Evento | Count |
|--------|------:|
| `virtual_trade_candidate_created` | 1697 |
| `virtual_trade_entry_filled` | 1355 |
| `virtual_trade_closed` | 918 |
| `virtual_trade_expired` | 342 |
| `virtual_trade_ambiguous` | 436 |
| `virtual_trade_unresolved` | 1 |

---

## Reconciliation CLI

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-reconcile -- \
  --bundle "$RunDir" --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `errors` | `[]` |
| `warnings` | ruido `parameter_set_id` / import-option; no bloquea |

---

## Summary

| Métrica | Valor |
|---------|------:|
| `trade_count` | 1697 |
| `official_win_count` | 411 |
| `official_loss_count` | 507 |
| `official_ambiguous_count` | 436 |
| `official_expired_unfilled_count` | 342 |
| `variant50_win_count` | 411 |
| `variant50_loss_count` | 507 |
| `variant50_ambiguous_count` | 436 |
| `variant50_not_filled_count` | 342 |
| `outcome_match_count` | 1697 |
| `mismatch_count` | **0** |
| `mismatch_rate` | **0** |

### Mismatch Diagnostics

| Contador | Valor |
|----------|------:|
| `entry_price_mismatch_count` | 0 |
| `sl_price_mismatch_count` | 0 |
| `tp_price_mismatch_count` | 0 |
| `fill_bar_mismatch_count` | 0 |
| `close_bar_mismatch_count` | 0 |
| `result_r_mismatch_count` | 0 |
| `same_bar_ambiguity_mismatch_count` | 0 |
| `invalid_risk_count` | 0 |
| `price_mismatch_counts.entry` | 0 |
| `price_mismatch_counts.sl` | 0 |
| `price_mismatch_counts.tp` | 0 |
| `bar_mismatch_counts.fill` | 0 |
| `bar_mismatch_counts.close` | 0 |
| `fill_bar_delta_histogram` | `{ "0": 1355 }` |
| `close_bar_delta_histogram` | `{ "0": 1355 }` |
| `mismatch_reason_counts` | `{}` |
| `tp_delta_points_max` | 0 |

### Buckets

| Bucket | Count |
|--------|------:|
| `official_loss_variant50_loss` | 507 |
| `official_ambiguous_variant50_ambiguous` | 436 |
| `official_win_variant50_win` | 411 |
| `official_expired_variant50_not_filled` | 342 |
| `official_expired_open_variant50_expired_open` | 1 |

`examples = []`

---

## Before vs After

| Diagnóstico | E5.13.6.2 | E5.13.6.4 |
|-------------|----------:|----------:|
| `mismatch_rate` | `0.4130819092516205` | **0** |
| `mismatch_count` | 701 | **0** |
| `tp_price_mismatch_count` | 700 | **0** |
| `fill_bar_mismatch_count` | 1354 | **0** |
| `close_bar_mismatch_count` | 1336 | **0** |
| `same_bar_ambiguity_mismatch_count` | 618 | **0** |
| `result_r_mismatch_count` | 82 | **0** |

---

## Interpretación

E5.13.6.4 es un **PASS fuerte**. EVOS **50 %/CE** ahora espeja la semántica oficial del virtual outcome en este benchmark: precios, fill bar, close bar, same-bar ambiguity, outcome y `result_r` quedan en paridad perfecta.

La desalineación detectada en E5.13.6.2 quedó resuelta para el control 50 %/CE. Con esto, EVOS vuelve a ser un marco confiable para comparar variantes hipotéticas contra el control oficial.

---

## Decisión

| Veredicto | Alcance |
|-----------|---------|
| **PASS técnico smoke** | Compile, bundle validation y reconcile CLI operativos |
| **PASS paridad 50 %/CE** | `mismatch_count = 0`, `mismatch_rate = 0` |
| **Confiable como framework diagnóstico** | edge / 25 % / 75 % / adaptive pueden compararse contra control oficial |
| **Mantener entry oficial** | No se cambia CE/50 % todavía |
| **No aprobar variante** | edge/25 % aún no son mejora estratégica hasta rerun y documentación del summary EVOS post-paridad |

---

## Siguiente recomendado

Summary EVOS post-paridad documentado en [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md).

**Siguiente:** **E5.13.6.6** — Entry Variant Edge/25 Sanity and Transition Audit.
