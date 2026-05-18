# Entry Variant Outcome / Risk Simulation — E5.13.6

## Contexto

**E5.13.5** cerró el smoke de **Entry Variant Feasibility** (edge / 25 % / 50 % CE / 75 % / adaptive): confirma que variantes más superficiales alcanzan más precios, pero **fillability ≠ profitability**.

**E5.13.6** añade una capa **hipotética** de simulación de outcome y riesgo por variante, exportada **aparte** del outcome oficial del virtual trade.

## Por qué no basta la factibilidad (E5.13.4–E5.13.5)

Una entrada más superficial puede:

- Aumentar fills hipotéticos
- Cambiar distancia al SL (mismo invalidation reference)
- Recalcular TP con el mismo `InpVirtualRiskReward`
- Alterar win / loss / ambiguous / unresolved
- Cambiar R hipotético, expectativa y drawdown comparativo

Sin simular outcome + riesgo, no se puede comparar variantes de forma justa.

## Modelo de simulación (observación únicamente)

| Regla | Detalle |
|--------|---------|
| Dirección | Igual que el virtual trade oficial |
| Fill hipotético | Primera vela cerrada que toca el precio de la variante (E5.13.4) |
| Sin fill | `not_filled` |
| Outcome | Misma semántica TestEA: TP primero → win; SL primero → loss; misma vela TP+SL → ambiguous si `InpVirtualAmbiguityMode == ambiguous` |
| Ventana | Tras fill: `InpVirtualMaxBarsInTrade`; si no resuelve → `unresolved` |
| Datos | Solo barras cerradas disponibles; **sin** lookahead antes del fill |
| Riesgo | Mismo SL/invalidation oficial; `risk_points` = \|entry_variant − SL\|; TP = entry_variant ± risk × RR |
| Geometría inválida | `invalid_risk` |

**No** es gate, **no** aprueba trades, **no** modifica entry oficial CE/50 %, **no** altera `result_r` oficial ni generación de trades virtuales.

## Inputs EA

- `InpEnableEntryVariantOutcomeSimulationV1` (default `true`)
- `InpEntryVariantOutcomeSimulationScoreEnabled` (default `true`)

Build: `MZP_TestEA_E5_13_6`

## Export

### Trades CSV (prefijo `entry_variant_*_sim_*`)

Por variante (edge, 25, 50, 75, adaptive): `status`, `result_r`, precios, `risk_points`, `effective_rr`, `bars_to_fill`, `bars_to_close`, `ambiguous`, `invalid_risk`.

Agregados por trade: `entry_variant_best_sim_*`.

### Summary JSON

- `has_entry_variant_outcome_sim_v1_logic = true`
- `entry_variant_outcome_sim_enabled`
- Rollups por variante: filled / win / loss / ambiguous / not_filled / invalid_risk / total_r / expectancy_r / winrate / average_risk_points
- Comparadores: `entry_variant_outcome_sim_best_variant_by_expectancy`, `_by_total_r`, `lowest_ambiguous_variant`, `highest_fill_variant`
- `optimization_parameters`: `entry_variant_outcome_sim_v1_enabled`, `entry_variant_outcome_sim_score_enabled`

### Reason codes (diagnóstico)

`entry_variant_sim_filled`, `entry_variant_sim_not_filled`, `entry_variant_sim_win`, `entry_variant_sim_loss`, `entry_variant_sim_ambiguous`, `entry_variant_sim_unresolved`, `entry_variant_sim_invalid_risk`, `entry_variant_sim_sl_invalid_for_variant`, `entry_variant_sim_tp_invalid_for_variant`, `entry_variant_sim_same_bar_ambiguous`, más referencias de fillability (`entry_variant_sim_edge_more_fillable`, etc.).

## Tooling repo (sin MT5)

- **Importer:** columnas opcionales `entry_variant_*_sim_*` en `entryVariantOutcomeSim`
- **Validación samples:** si `has_entry_variant_outcome_sim_v1_logic === true`, exige campos summary + header trades mínimos
- **Analyzer:** `@workspace/mapazapp-core` → `testea-entry-variant-outcome-simulation.ts`
- **CLI:** `pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-summary -- --bundle <path> [--json]`

Bundles legacy **sin** el flag siguen parseando sin error.

## Decisión de ingeniería

El entry oficial **no cambia** en E5.13.6. Los campos `entry_variant_*_sim_result_r` son **hipotéticos** — no reportar como R real de la estrategia.

## Smoke E5.13.7 (cerrado — docs)

**E5.13.7** — evidencia operador — [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md) (**PASS** técnico; `MZP_TestEA_E5_13_6`; bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`). Export y CLI OK; variante **50 % / CE** **no** reconcilia con outcome oficial (p. ej. ambiguous 880 vs 436; totalR 585 vs 315) — **bloqueado** para decisiones de entry hasta reconciliación.

## Reconciliación E5.13.6.1 (repo)

Analizador + CLI `mapazapp:testea-entry-variant-sim-reconcile` — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md). Compara oficial vs `entry_variant_50_sim_*` por `trade_id` (buckets, precios, barras, ejemplos).

## Reconcile smoke E5.13.6.2 (cerrado — docs)

[`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md) — reconcile CLI OK; `mismatch_rate` ≈ 41 %; entry/SL alineados; TP/barras/ambiguous no.

## Paridad control 50 %/CE — E5.13.6.3 (cerrado — repo)

Build `MZP_TestEA_E5_13_6_3`: variante 50 espeja outcome oficial (TP/entry/SL oficiales; fill/close/ambiguous vía hooks, no sim bar-a-bar independiente). Detalle: [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md).

## Siguiente paso

**E5.13.6.4 cerrado:** [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md) confirma paridad perfecta del control 50 %/CE (`mismatch_rate = 0`) en el bundle benchmark.

**Siguiente:** rerun del summary EVOS sobre el bundle `MZP_TestEA_E5_13_6_3`. Aún no aprobar edge/25 % como mejora estratégica sin esa evidencia post-paridad.
