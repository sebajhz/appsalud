# Entry Variant Outcome Reconciliation — E5.13.6.3 (EVOS 50 %/CE parity control)

## Por qué existe E5.13.6.3

Tras **E5.13.6.2**, el reconciler demostró que la variante **50 %/CE** no podía usarse como control estricto del outcome virtual oficial (`mismatch_rate` ≈ 0.413). Entry y SL coincidían; **TP, barras de fill/close y ambiguous** no. E5.13.7 ya había mostrado desvío agregado (p. ej. ambiguous sim 880 vs oficial 436).

E5.13.6.3 es un **fix de paridad** en `Mapazapp_TestEA` — no mejora estrategia, no toca generación oficial ni outcome virtual oficial.

---

## Qué fallaba en E5.13.6.2 (diagnóstico)

| Contador | Valor E5.13.6.2 | Causa raíz en EVOS pre-6.3 |
|----------|----------------:|----------------------------|
| `tp_price_mismatch_count` | 700 | `MapzEvosPrepareSlot` recalculaba TP con RR desde entry variante, no el TP oficial |
| `fill_bar_mismatch_count` | 1354 | Sim independiente con `bars_observed` vs `bars_waiting_entry` oficial |
| `close_bar_mismatch_count` | 1336 | `bars_since_fill++` antes de evaluar TP/SL; resolución en barra de fill vs oficial que retorna tras fill |
| `same_bar_ambiguity_mismatch_count` | 618 | Sim resolvía ambiguous con timing distinto al oficial |
| `result_r_mismatch_count` | 82 | Consecuencia de outcomes/timing distintos |

---

## Cambios (repo)

**Build:** `MZP_TestEA_E5_13_6_3`

### Variante 50 — modo control estricto

- `MapzEvosPrepareSlotStrictOfficial`: entry/SL/TP = `g_vt.entry`, `g_vt.sl`, `g_vt.tp` (sin recalcular TP).
- `strict_official_parity` en `MapzVariantSimSlot`; razón `entry_variant_sim_p50_official_control`.
- **No** simulación bar-a-bar independiente para p50: se omiten `MapzEvosTryFillSlot` / `MapzEvosResolveSlotBar` en p50.
- Espejo del estado oficial en hooks existentes:
  - `MapzEvosSyncP50StrictOnOfficialFill` — al fill oficial (`VirtualTryFillCurrentBar`), con `bars_to_fill` = lógica oficial (`bars_waiting_entry` o `eff.bars_observed`).
  - `MapzEvosSyncP50StrictOnOfficialClose` — win/loss/ambiguous/expired_open/expired_unfilled/deinit, copiando `outcome`, `result_r`, `bars_held`.

### Otras variantes (sin cambio de rol)

- edge / 25 / 75 / adaptive siguen **hipotéticos** (TP por RR desde precio de variante).

### Summary JSON

- `has_entry_variant_outcome_sim_v1_parity_control`: `true`

### Reconciler (core)

- Histogramas `fill_bar_delta_histogram`, `close_bar_delta_histogram`.
- `mismatch_reason_counts`, `tp_delta_points_max`.
- Paridad `expired_open` y `unresolved` en `outcomeParityMatch`.

---

## Verificación esperada (E5.13.6.4 — operador)

Recompilar MT5, re-export bundle, rerun:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-sim-reconcile -- \
  --bundle "<RunDir>" --json
```

**Objetivo (no hardcodeado):** `tp_price_mismatch_count` ≈ 0; fill/close/ambiguous mismatches reducidos de forma material; `mismatch_rate` mucho menor que 0.413 para cohorte con build `MZP_TestEA_E5_13_6_3`.

---

## Residuales conocidos

- Variantes edge/25/75/adaptive **no** son control oficial; pueden seguir desviándose.
- Bundles exportados con `MZP_TestEA_E5_13_6` (pre-6.3) conservan el comportamiento antiguo en CSV histórico.
- Paridad p50 depende de que el trade oficial use entry CE/50 % alineado con `g_vt.entry` (modelo actual `fvg_midpoint`).

---

## Referencias

- E5.13.6.2 smoke: [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md)
- Contrato reconcile: [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md)
- EVOS: [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md)

**Siguiente:** **E5.13.6.4** — smoke reconcile post-fix (operador).
