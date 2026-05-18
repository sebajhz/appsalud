# Entry Variant Transition Audit — E5.13.6.6

## Por qué existe este checkpoint

**E5.13.6.5** mostró que la variante **edge** domina los rollups agregados (total R, expectancy, winrate) en el bundle benchmark `MZP_TestEA_E5_13_6_3`, mientras **25 %** y **adaptive** mejoran total R frente al control **50 %/CE** pero con mucha más **ambiguous**. El control **50 %/CE** ya es confiable tras **E5.13.6.3** / **E5.13.6.4** (`mismatch_rate = 0`).

Dominar un solo bundle **no** es evidencia suficiente para aprobar edge ni 25 % como entry model. **E5.13.6.6** añade un auditor diagnóstico que cruza el **outcome oficial** con cada variante EVOS trade a trade: transiciones, mejora/degradación, delta R, sanity de riesgo y geometría edge/25.

**Solo análisis.** No cambia `Mapazapp_TestEA.mq5`, generación oficial, EVOS en MQL5, gates ni trading.

---

## Qué inspecciona

Por variante (por defecto `edge`, `25`, `adaptive`; opcional `50`, `75`):

1. **Matriz de transición** — conteos `official_* → variant_*` para win / loss / ambiguous / not_filled / expired_unfilled.
2. **Buckets de mejora/degradación** — rescates (loss→win, ambiguous→win, expired→win), daños (win→loss/ambiguous/not_filled), parciales (loss→ambiguous), sin cambio.
3. **Delta R** — `variant_result_r − official_result_r`; para `not_filled` variante se asume **0 R** (documentado en JSON).
4. **Risk sanity** — percentiles de `risk_points`, ratio vs 50 %, conteos ratio > 1.5 / 2.0 / 3.0.
5. **Geometría edge** — entrada cerca del borde FVG, TP/SL distance, wins edge cuando 50 % no fill / loss / ambiguous.
6. **Sanity 25/adaptive** — fills y outcomes extra vs 50 %.

---

## Por qué importa la distancia de riesgo

En **E5.13.6.5**, edge promedió ~281 puntos de riesgo vs ~132 en 50 %. Con sizing de riesgo fijo, un SL más lejano implica menos tamaño de posición o TP más lejano; el total R alto puede ser **artefacto de geometría** más que señal operativa. El auditor cuantifica ratios y outliers antes de cualquier decisión de entry.

---

## Por qué 25/adaptive pueden ser más realistas que edge

Aunque edge gane en total R en un bundle, 25 % y adaptive suelen acercarse al entry CE con menor distorsión de riesgo y patrones de ambiguous ya visibles en el summary. La auditoría compara transiciones y `total_r_delta_vs_50` para ver si la mejora es **rescate selectivo** o **inflación de ambiguous**.

---

## Implementación (repo)

| Pieza | Ruta |
|--------|------|
| Core | `APP/lib/mapazapp-core/src/testea-entry-variant-transition-audit.ts` |
| CLI | `APP/scripts/src/mapazapp-testea-entry-variant-transition-audit.ts` |
| Script | `pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-transition-audit` |

**Entrada:** `backtest_summary.json` + `backtest_trades.csv` (columnas `entry_variant_*_sim_*`).

**Salida:** JSON (`--json`) y opcional CSV de buckets (`--csv-output`).

---

## Clasificación de mejora (conservadora)

| Transición | Clasificación |
|------------|----------------|
| loss → win | **improved** (`rescued_loss_to_win`) |
| ambiguous → win | **improved** (`rescued_ambiguous_to_win`) |
| expired_unfilled → win | **improved** (`rescued_expired_to_win`; **fill-model-sensitive**) |
| loss → ambiguous | **partial** (no cuenta en `improved_count`) |
| win → loss / ambiguous / not_filled | **degraded** |
| expired_unfilled → loss | **degraded** |
| mismo status | **unchanged** |

---

## Siguiente paso operador

Ejecutar sobre el bundle validado **E5_13_6_3**:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-variant-transition-audit -- \
  --bundle "<RunDir>" \
  --json \
  --variants edge,25,adaptive,50 \
  --max-examples 10
```

Opcional: `--csv-output artifacts/mapazapp/docs/_local_transition_audit_DO_NOT_COMMIT.csv` (no commitear `*_DO_NOT_COMMIT.csv`).

**No hay decisión de entry model** hasta revisar flags (`EDGE_DOMINATES_SINGLE_BUNDLE`, `EDGE_RISK_DISTANCE_HIGH`, etc.) y ejemplos por bucket.

---

## Referencias

- Summary post-paridad: [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md)
- EVOS contrato: [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md)
- Reconcile smoke: [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md)
