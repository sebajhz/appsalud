# Entry Variant Outcome Reconciliation — E5.13.6.1

## Por qué existe este checkpoint

**E5.13.7** fue **PASS técnico**: export EVOS (`MZP_TestEA_E5_13_6`), validación bundle y CLI `mapazapp:testea-entry-variant-sim-summary` funcionan.

Quedó **bloqueado a nivel estrategia** porque la variante control **50 % / CE** no reconcilia con el outcome virtual **oficial** en el bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, aunque fill/not_filled sí alinean.

Hasta reconciliar, **no** confiar en conclusiones sobre edge / 25 % / 75 % / adaptive.

## Qué se compara (por `trade_id`)

| Oficial | Variante 50 sim |
|---------|-----------------|
| `outcome`, `result_r` | `entry_variant_50_sim_status`, `entry_variant_50_sim_result_r` |
| `entry`, `sl`, `tp` | `entry_variant_50_sim_entry_price`, `_sl_price`, `_tp_price` |
| `bars_to_fill`, `bars_held` | `entry_variant_50_sim_bars_to_fill`, `_bars_to_close` |
| — | `entry_variant_50_sim_ambiguous`, `_invalid_risk` |

## Desajuste conocido (E5.13.7, agregados)

| Métrica | Oficial | 50 % sim |
|---------|--------:|---------:|
| filled | 1355 | 1355 |
| win | 411 | 353 |
| loss | 507 | 121 |
| ambiguous | 436 | **880** |
| not_filled / expired | 342 | 342 |
| totalR | 315 | **585** |

La simulación 50 % **no** reproduce la distribución oficial de outcomes; el analizador E5.13.6.1 cuantifica **por trade** en qué celdas cae cada desvío.

## Tooling (repo, sin MT5)

- **Módulo:** `@workspace/mapazapp-core` → `testea-entry-variant-outcome-reconciliation.ts`
- **CLI:** `pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-reconcile -- --bundle <path> [--json] [--csv-output <path>] [--max-examples 10]`

Salida JSON: `ok`, `bundleName`, `summary` (conteos oficial/v50, `mismatch_count`, `mismatch_rate`, price/bar mismatches), `buckets` (cross-tab + fill alignment), `examples` (muestras por bucket).

Buckets cross-tab incluyen: `official_win_variant50_*`, `official_loss_variant50_*`, `official_ambiguous_variant50_*`, `official_expired_variant50_*`, `official_filled_variant50_not_filled`, `official_not_filled_variant50_filled`, más contadores de precio/barra/R/ambigüedad.

Bundles **sin** `has_entry_variant_outcome_sim_v1_logic` o sin columnas `entry_variant_50_sim_*`: warning controlado, `ok: false` (no crash).

## Reglas

- **Solo diagnóstico** — no cambia lógica oficial ni sim EVOS salvo bug documentado aparte.
- **No** aprobar edge ni 25 %.
- **No** gates, live trading, ni APIs de orden.

## Smoke E5.13.6.2 (cerrado — docs)

**E5.13.6.2** — evidencia operador — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md) (**PASS** diagnóstico CLI; `mismatch_rate` ≈ 0.413; entry/SL OK; TP/barras/ambiguous no). **No** paridad 50 %/CE.

**E5.13.6.3 (cerrado — repo):** paridad control 50 %/CE — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md); build `MZP_TestEA_E5_13_6_3`.

**Siguiente:** **E5.13.6.4** — smoke reconcile post-fix (operador).

## Referencias

- Smoke E5.13.7: [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md)
- Implementación EVOS: [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md)
