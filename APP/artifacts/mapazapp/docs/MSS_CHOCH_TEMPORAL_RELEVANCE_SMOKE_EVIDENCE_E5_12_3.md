# MSS / CHoCH — Relevancia temporal — Evidencia de smoke E5.12.3

## Contexto

Smoke ejecutado por el operador **después de E5.12.2 — MSS/CHoCH temporal relevance audit**, con build **`MZP_TestEA_E5_12_2`**. Objetivo: evidencia reproducible de que el export de **relevancia temporal** (scores 0–10, grados, *flags*, barras y razones tokenizadas) funciona en el **mismo bundle benchmark** que E5.12.1 y permite interpretar **cuándo** la confirmación MSS/CHoCH es útil respecto al sweep, FVG y ventana de entrada — **sin** usarlo como compuerta de trading.

**Referencias:** audit temporal — [`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md); export MSS/CHoCH V1 — [`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md); smoke MSS/CHoCH score (E5.12.1) — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md); roadmap — [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md) §C.

---

## Validación de bundle / build

| Campo | Valor |
|--------|--------|
| `ea_build` | `MZP_TestEA_E5_12_2` |
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

## Summary — MSS / CHoCH + relevancia temporal

| Métrica | Valor |
|---------|------:|
| `has_mss_choch_v1_logic` | `true` |
| `has_mss_choch_temporal_relevance_v1_logic` | `true` |
| `average_mss_temporal_relevance_score` | 2.058338 |
| `average_choch_temporal_relevance_score` | 0.649381 |
| `mss_after_sweep_count` | 789 |
| `mss_before_entry_count` | 212 |
| `mss_near_entry_window_count` | 789 |
| `mss_too_early_count` | 0 |
| `mss_too_late_count` | 577 |
| `mss_after_fvg_count` | 0 |
| `mss_before_fvg_count` | 0 |
| `choch_after_sweep_count` | 274 |
| `choch_before_entry_count` | 47 |
| `choch_near_entry_window_count` | 274 |
| `choch_too_early_count` | 0 |
| `choch_too_late_count` | 227 |
| `choch_after_fvg_count` | 0 |
| `choch_before_fvg_count` | 0 |
| `average_mss_choch_score` | 9.923984 |
| `average_entry_quality_score` | 52.812021 |
| `score_a_count` | 0 |
| `score_b_count` | 1 |
| `score_c_count` | 1053 |
| `score_rejected_count` | 643 |

---

## Distribución de grados — relevancia temporal MSS

| Grado | Count |
|-------|------:|
| None | 908 |
| C | 521 |
| A | 195 |
| Weak | 56 |
| B | 17 |

---

## Distribución de grados — relevancia temporal CHoCH

| Grado | Count |
|-------|------:|
| None | 1423 |
| C | 226 |
| A | 47 |
| Weak | 1 |

---

## Outcome — agregados (temporal + MSS score; sin claims de rentabilidad)

| Outcome | Count | avgEntryScore | avgMssChochScore | avgMssTemporal | avgChochTemporal | MssAfterSweep |
|---------|------:|--------------:|-----------------:|---------------:|-----------------:|--------------:|
| `ambiguous` | 436 | 51.9335 | 8.8899 | 0.9977 | 0.4954 | 157 |
| `expired_open` | 1 | 53 | 15 | 3 | 0 | — |
| `expired_unfilled` | 342 | 49.0409 | 11.3538 | 5.4795 | 1.2368 | 212 |
| `loss` | 507 | 54.5227 | 10.0000 | 1.3116 | 0.5030 | 233 |
| `win` | 411 | 54.7713 | 9.7251 | 1.2555 | 0.5061 | 186 |

*(Celdas con —: métrica no aplicable o no reportada en el extracto del operador para `expired_open`, N=1.)*

---

## Frecuencia — razones temporales MSS (reportadas)

| Razón | Count |
|-------|------:|
| `mss_temporal_unknown` | 908 |
| `mss_after_sweep` | 789 |
| `mss_near_entry_window` | 789 |
| `mss_after_entry` | 577 |
| `mss_too_late` | 577 |
| `mss_before_entry` | 212 |
| `mss_temporally_relevant` | 195 |

---

## Frecuencia — razones temporales CHoCH (reportadas)

| Razón | Count |
|-------|------:|
| `choch_temporal_unknown` | 1423 |
| `choch_after_sweep` | 274 |
| `choch_near_entry_window` | 274 |
| `choch_after_entry` | 227 |
| `choch_too_late` | 227 |
| `choch_before_entry` | 47 |
| `choch_temporally_relevant` | 47 |

---

## Interpretación

- **PASS técnico:** validación CLI `ok=true`, `errors=[]`; único warning `BUNDLE_EVENTS_LARGE`; `has_mss_choch_temporal_relevance_v1_logic=true`; export temporal presente y usable para post-proceso.
- **El audit E5.12.2 explica en parte por qué E5.12.1 no separaba wins/losses con `mss_choch_score`:** muchas confirmaciones MSS/CHoCH ocurren **demasiado tarde** o **después** del contexto de entrada (`mss_after_entry` / `mss_too_late` 577; `choch_after_entry` / `choch_too_late` 227). Solo **212** trades tienen MSS **antes** de la entrada; solo **47** tienen CHoCH **antes** de la entrada.
- **La media más alta de score temporal MSS en este corte aparece en `expired_unfilled`**, no en wins — coherente con un modelo de entrada/retest/fill que a menudo espera un nivel que el precio **no** revisita, mientras la estructura puede seguir «confirmándose» más tarde en el tiempo.
- **Contadores `mss_after_fvg_count` / `mss_before_fvg_count` y análogos CHoCH en cero** en el summary agregado: reflejan la heurística actual de anclas FVG en el export (p. ej. contexto no disponible o clasificación no aplicable en la mayoría de filas); **no** invalidan el PASS técnico del export ni implican tuning ciego desde un solo bundle.

---

## Decisión (explícita)

- **PASS** técnico del smoke **E5.12.3**.
- Mantener **solo observación** (sin compuerta dura por MSS/CHoCH ni por relevancia temporal).
- **No** aprobación de trading live derivada de este smoke.
- **No** cambios a umbrales globales de Entry Quality.
- **No** fabricar grados A/B.
- **No** seguir afinando MSS/CHoCH **a ciegas** solo por este bundle.
- **Siguiente recomendado:** **E5.13 — Premium/Discount Context V1**, con atención a **calidad de zona de entrada** y a si las entradas son **demasiado profundas o tardías** respecto al contexto de precio.

---

## Notas de gobernanza

- CSV locales `*_DO_NOT_COMMIT.csv` y artefactos crudos del tester **no** se versionan salvo decisión explícita del PM.
- Este documento es **solo evidencia / decisión**; no modifica código ni umbrales en repo.
