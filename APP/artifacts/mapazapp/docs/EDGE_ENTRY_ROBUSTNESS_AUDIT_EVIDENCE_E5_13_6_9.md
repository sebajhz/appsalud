# Edge Entry Robustness Audit — Evidencia operador E5.13.6.9

## Alcance

- **Checkpoint:** E5.13.6.9 — evidencia operador post–**E5.13.6.8** / **E5.13.6.8.1** (CLI edge robustness audit).
- **Build TestEA:** `MZP_TestEA_E5_13_6_3`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato auditor:** [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md).
- **Transition previo:** [`ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **re-run** del robustness audit tras el fix **E5.13.6.8.1** (`fast_fill_close_count` per-bucket). **No** aprueba edge, 25 %, adaptive ni 75 %; **no** cambia entry oficial **50 % / CE**; **no** autoriza live trading, gates ni ejecución real.

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-edge-robustness-audit -- \
  --bundle "$RunDir" \
  --json \
  --max-examples 10
```

Opcional (CSV local operador):

```bash
  --csv-output APP/artifacts/mapazapp/docs/_local_E5_13_6_9_edge_robustness_audit_DO_NOT_COMMIT.csv
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `trade_count` | 1697 |
| `control_variant` | `50` |
| `errors` | `[]` |
| `warnings` | ruido `parameter_set_id` / import-option; **no bloquea** |
| CLI / core | post-commit **`cb6bc7c`** (E5.13.6.8.1) o posterior |

CSV local (**no versionado**): `_local_E5_13_6_9_edge_robustness_audit_DO_NOT_COMMIT.csv`

---

## Verificación E5.13.6.8.1 (fast_fill_close_count)

Tras el fix, `transition_robustness.fast_fill_close_count` es **por bucket** y cumple `fast_fill_close_count ≤ count`:

| Bucket | `count` | `fast_fill_close` (notas CSV) |
|--------|--------:|------------------------------:|
| `official_loss_variant_win` | 371 | 330 |
| `official_ambiguous_variant_win` | 412 | 384 |
| `official_expired_unfilled_variant_win` | 334 | 231 |
| `official_win_variant_loss` | 18 | 0 |
| `official_win_variant_ambiguous` | 6 | 0 |
| `official_win_variant_unresolved` | 51 | 0 |

**Definición:** `edge_bars_to_fill ≤ 1` **y** `edge_bars_to_close ≤ 1`.  
**Lectura:** la mayoría de rescates loss/ambiguous/expired→edge_win son **rápidos** (fill+close en 0–1 barras), lo que refuerza la necesidad de realismo de ejecución, no de aprobación edge.

---

## Interpretation flags (CLI)

Flags típicos del JSON de salida (proxy buffer / riesgo / velocidad; **diagnóstico**):

| Flag | Lectura breve |
|------|----------------|
| `EDGE_DOMINATES_SINGLE_BUNDLE` | `total_delta_r_vs_official` > 0 (alineado E5.13.6.7) |
| `EDGE_RISK_DISTANCE_HIGH` | `average_risk_ratio_vs_50` ≈ 2.0 |
| `EDGE_RISK_RATIO_GT_2` | 344 trades con ratio > 2.0 (wins edge: 302 con ratio > 2) |
| `EDGE_WINS_FRAGILE_AT_30PTS_BUFFER` | 822 / ~1453 edge wins fallan effective RR a 30 pts |
| `EDGE_FAST_FILL_CLOSE_HEAVY` | 1217 edge wins con fill+close rápidos |
| `EDGE_EXPIRED_RESCUES_FRAGILE_AT_BUFFER` | rescates expired→win frágiles bajo buffer (si > umbral CLI) |
| `EDGE_UNRESOLVED_PRESENT` | 60 edge `unresolved` |
| `VARIANT_25_IMPROVES_R_BUT_INCREASES_AMBIGUITY` | lens 25 % vs 50 % (E5.13.6.7) |
| `VARIANT_ADAPTIVE_IMPROVES_R_BUT_INCREASES_AMBIGUITY` | lens adaptive vs 50 % |

**Nota:** `EDGE_BUFFER_SENSITIVE_30PTS` depende de `fail_effective_rr_count / total_edge_trades > 50 %` → 846/1697 ≈ **49.9 %** (borde; puede no dispararse según redondeo exacto del JSON).

---

## Edge summary (alineado E5.13.6.7)

| Métrica | Valor |
|---------|------:|
| `improved_count` | 1117 |
| `degraded_count` | 24 |
| `unchanged_count` | 473 |
| `rescued_loss_to_win_count` | 371 |
| `rescued_expired_to_win_count` | 334 |
| `rescued_ambiguous_to_win_count` | 412 |
| `harmed_win_to_loss_count` | 18 |
| `harmed_win_to_ambiguous_count` | 6 |
| `total_delta_r_vs_official` | 2418 |
| `average_delta_r_vs_official` | 1.4249 |
| `average_risk_points` | 280.86 |
| `median_risk_points` | 150 |
| `edge_unresolved_count` | 60 |

---

## Buffer / cost stress (proxy spread+slippage)

Umbrales CLI: `--min-effective-rr 1.5`, buffers `5,10,20,30,50` points.

| Buffer (pts) | `average_effective_rr` | `fail_effective_rr_count` | `edge_wins_failing_effective_rr` |
|-------------:|-----------------------:|--------------------------:|---------------------------------:|
| 5 | 1.801 | 152 | 152 |
| 10 | 1.663 | 348 | 347 |
| 20 | 1.462 | 638 | 627 |
| 30 | 1.314 | 846 | 822 |
| 50 | 1.098 | 1117 | 1068 |

**Lectura:**

- A **30 pts** de buffer adversario, **~57 %** de edge wins (~822/1453) no pasan effective RR ≥ 1.5.
- A **50 pts**, la mayoría del universo edge (~1068 wins) falla el proxy de RR ejecutable.
- El headline R de edge (E5.13.6.7) **no** sobrevive supuestos conservadores de coste sin re-simulación OHLC exacta.

**Limitación:** proxy geométrico; no P/L bar-a-bar. Ver [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md).

---

## Transition robustness (buffer 30 pts)

| Bucket | `count` | `fail` @30pts | `avg_eff_rr` @30pts | `fast_fill_close` |
|--------|--------:|--------------:|--------------------:|------------------:|
| `official_loss_variant_win` | 371 | 201 | 1.298 | 330 |
| `official_ambiguous_variant_win` | 412 | 305 | 1.009 | 384 |
| `official_expired_unfilled_variant_win` | 334 | 142 | 1.426 | 231 |
| `official_win_variant_loss` | 18 | 4 | 1.697 | 0 |
| `official_win_variant_ambiguous` | 6 | 3 | 1.528 | 0 |
| `official_win_variant_unresolved` | 51 | 0 | 1.797 | 0 |

**Lectura:** los tres bloques de **rescate** hacia edge win (loss, ambiguous, expired) concentran la fragilidad bajo buffer y alta velocidad fill+close.

---

## Risk-ratio stress

| Métrica | Valor |
|---------|------:|
| `average_risk_ratio_vs_50` | 1.999 |
| `median_risk_ratio_vs_50` | 2.000 |
| `p90_risk_ratio_vs_50` | ~2.01 (E5.13.6.7) |
| `count_risk_ratio_gt_1_5` | 1695 |
| `count_risk_ratio_gt_2_0` | 344 |
| Edge wins `ratio ≤ 2` | 1151 |
| Edge wins `ratio > 2` | 302 |

**Lectura:** edge opera con distancia de riesgo ~**2×** vs CE/50 % en casi todo el cohorte; sizing y exposición real serían materialmente distintos aunque el sim headline R fuera correcto.

---

## Speed / same-bar realism

| Métrica | Valor |
|---------|------:|
| `edge_win_fill_and_close_fast_count` | 1217 |
| `official_expired_to_edge_win_fast_count` | (alto; 231 fast en bucket expired→win) |
| `official_ambiguous_to_edge_win_fast_count` | (384 fast en bucket ambiguous→win) |
| `official_loss_to_edge_win_fast_count` | (330 fast en bucket loss→win) |

**Lectura:** ~**84 %** de edge wins (1217/1453) cierran con fill+close en ≤1 barra — patrón **muy optimista** para ejecución real; coherente con rescates fill-model-sensitive del transition audit.

---

## Unresolved edge

| Métrica | Valor |
|---------|------:|
| `edge_unresolved_count` | 60 |
| Bucket `official_win_variant_unresolved` | 51 (mayoría wins oficiales con edge unresolved) |

**Lectura:** 60 casos edge sin status resuelto en sim; no bloquean el headline R pero impiden confianza operativa hasta clarificar semántica EVOS.

---

## Variant comparison (lens robustness — resumen)

Comparación ligera edge vs **25 %** vs **adaptive** bajo la misma lente de buffers (detalle en JSON CLI; alineado E5.13.6.7):

| Variante | Total ΔR vs 50 % (orden magnitud) | Ambiguity vs 50 % | Robustness lens |
|----------|-----------------------------------|-------------------|-----------------|
| **edge** | Dominante (+ headline) | Reduce ambiguous vs oficial | **Alta fragilidad** buffer + velocidad |
| **25 %** | Moderado (~+251 vs oficial en transition) | **Aumenta** ambiguous | Menos extremo que edge; aún no aprobado |
| **adaptive** | ~igual 25 % | **Aumenta** ambiguous | Similar a 25 % |

**Lectura:** 25 % / adaptive no ganan el headline de edge pero muestran perfil **menos extremo** en riesgo y velocidad; **ninguno** cumple escalera de evidencia para aprobar entry.

---

## Decisión de ingeniería (E5.13.6.9)

| Decisión | Estado |
|----------|--------|
| Robustness audit diagnóstico (post-8.1) | **PASS** |
| `fast_fill_close_count` per-bucket | **PASS** (≤ count) |
| Edge sigue **interesante** para investigación | **SÍ** (hipótesis, un bundle) |
| Aprobar edge como entry | **NO** |
| Aprobar 25 % / adaptive | **NO** |
| Cambiar entry oficial 50 % / CE | **NO** |
| Live / funding / gates | **NO** |
| Proxy TS suficiente para decisión final | **NO** — ver E5.13.6.10 |

**Síntesis (North Star + governance):**

1. Edge **domina** el bundle en R sim pero queda **frágil** bajo buffers 30–50 pts, **riesgo ~2×**, wins **rápidos** y rescates desde estados difíciles del oficial.
2. Un solo bundle XAUUSD **no** aprueba entry; XAUUSD sigue siendo **laboratorio**, no jaula de producto.
3. Edge permanece **candidato de investigación**, no candidato operativo.
4. Entry oficial **50 % / CE** se mantiene.

---

## Siguiente recomendado

**E5.13.6.10 (docs) — cerrado:** [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md) — proxy TS **no** basta; **Buffered EVOS MQL5 requerido**; guardrail control manual vigente.

**E5.13.6.11 —** implementar diagnósticos MQL5 Buffered EVOS (ver decisión § alcance futuro).

---

## Referencias

- Implementación: [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md)
- Fix contadores: commit `cb6bc7c` (E5.13.6.8.1)
- Transition evidence: [`ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md)
- Summary EVOS: [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md)
