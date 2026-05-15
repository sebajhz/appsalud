# HTF Structure V1 — Smoke evidence E5.11.1

## Contexto

Smoke ejecutado por el operador **después de E5.11 — HTF Structure V1**, con build **`MZP_TestEA_E5_11`**. Objetivo: evidencia reproducible de que el export HTF (estructura H4/H1, scores observacionales y razones) funciona en bundle real y permite analizar correlación con outcomes **sin** tratarlo como compuerta de trading.

**Referencias:** implementación y campos — [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md); roadmap siguiente — [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md).

---

## Validación de bundle / build

| Campo | Valor |
|--------|--------|
| `ea_build` | `MZP_TestEA_E5_11` |
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

## Summary — HTF Structure V1

| Métrica | Valor |
|---------|------:|
| `has_htf_structure_v1_logic` | `true` |
| `htf_structure_enabled` | `true` |
| `htf_structure_aligned_count` | 875 |
| `htf_structure_conflict_count` | 638 |
| `htf_structure_h4_bullish_count` | 825 |
| `htf_structure_h4_bearish_count` | 394 |
| `htf_structure_h4_range_count` | 380 |
| `htf_structure_h4_transition_count` | 98 |
| `htf_structure_h1_bullish_count` | 664 |
| `htf_structure_h1_bearish_count` | 427 |
| `htf_structure_h1_range_count` | 493 |
| `htf_structure_h1_transition_count` | 113 |
| `average_htf_structure_score` | 12.544490 |
| `average_entry_quality_score` | 52.812021 |
| `score_a_count` | 0 |
| `score_b_count` | 1 |
| `score_c_count` | 1053 |
| `score_rejected_count` | 643 |

---

## Combinaciones de estado H4 / H1 (frecuencias principales)

Formato: `h4_state` / `h1_state` (texto exportado estable).

| Combinación | Count |
|-------------|------:|
| `bullish_structure` / `bullish_structure` | 419 |
| `bullish_structure` / `range_structure` | 223 |
| `bearish_structure` / `bearish_structure` | 150 |
| `bullish_structure` / `bearish_structure` | 140 |
| `range_structure` / `range_structure` | 133 |
| `range_structure` / `bullish_structure` | 122 |
| `bearish_structure` / `range_structure` | 120 |
| `range_structure` / `bearish_structure` | 99 |
| `bearish_structure` / `bullish_structure` | 88 |

Las combinaciones restantes con **`transition_structure`** u otros cruces poco frecuentes quedaron documentadas en la salida completa del operador (no reproducidas aquí íntegramente).

---

## Flags `htf_structure_aligned` × `htf_structure_conflict`

Interpretación de filas como par `(aligned, conflict)`:

| `htf_structure_aligned` | `htf_structure_conflict` | Count |
|-------------------------|--------------------------|------:|
| `true` | `false` | 875 |
| `false` | `true` | 638 |
| `false` | `false` | 184 |

---

## Outcome — agregados (sin claims de rentabilidad)

| Outcome | Count | avgEntryScore | avgHtfScore | HtfAligned | HtfConflict | avgChainScore | avgAmbiguousRisk |
|---------|------:|--------------:|------------:|-----------:|------------:|--------------:|-----------------:|
| `ambiguous` | 436 | 51.9335 | 12.1697 | 218 | 177 | 6.9174 | 70.1147 |
| `expired_open` | 1 | 53 | 14 | — | — | — | — |
| `expired_unfilled` | 342 | 49.0409 | 12.2982 | 175 | 137 | 6.8713 | 36.5936 |
| `loss` | 507 | 54.5227 | 12.6982 | 259 | 180 | 6.8974 | 36.6864 |
| `win` | 411 | 54.7713 | 12.9538 | 223 | 144 | 6.91 | 37.0073 |

---

## Frecuencia — tokens / razones (top)

Conteos agregados reportados en el análisis del run (orden descendente por frecuencia):

| Token / razón | Count |
|---------------|------:|
| `protected_level_missing` | 1084 |
| `htf_structure_h4_aligned` | 737 |
| `htf_structure_h1_aligned` | 577 |
| `h1:htf_structure_range` | 493 |
| `htf_structure_h1_conflict` | 468 |
| `htf_structure_aligned` | 439 |
| `h4:htf_structure_range` | 380 |
| `htf_structure_h4_conflict` | 300 |
| `h4:external_liquidity_missing` | 282 |
| `h1:external_liquidity_missing` | 157 |
| `h1:htf_structure_transition` | 113 |
| `h4:htf_structure_transition` | 98 |
| `external_liquidity_missing` | 40 |

---

## Interpretación

- **PASS técnico:** validación CLI `ok=true`, `errors=[]`; único warning conocido `BUNDLE_EVENTS_LARGE`; export HTF presente y usable para post-proceso.
- **HTF Structure V1 aporta contexto de estructura** utilizable en CSV/summary (estados H4/H1, alineación/conflicto, score medio exportado).
- **Separación leve positiva por outcome:** las **wins** muestran media de **`htf_structure_score`** algo mayor que **ambiguous** y que los grupos **expired** (salvo `expired_open`, N=1).
- **Los losses también llevan HTF score relativamente alto**, por lo que **HTF Structure V1 no debe usarse como compuerta dura ni como único filtro de calidad** en este bundle.
- **Debilidad principal:** `protected_level_missing` domina (1084): el sistema **clasifica estructura con frecuencia pero no identifica un máximo/mínimo protegido claro** — limitante para uso discrecional serio (invalidación / calidad de estructura).
- **Postura coherente con roadmap:** HTF es **contexto**; hace falta **MSS/CHoCH**, **premium/discount**, **calidad de objetivo** y **mejor lógica de niveles protegidos** antes de plantear gates.

---

## Decisión (explícita)

- **PASS** técnico del smoke **E5.11.1**.
- Mantener **solo observación** (sin bloqueo de setups por HTF).
- **No** compuerta dura aprobada por HTF Structure V1.
- **No** aprobación de trading live derivada de este smoke.
- **No** cambios a umbrales globales de Entry Quality.
- **No** fabricar grados A/B.
- **No** afinar solo por outcome en **un** bundle.

---

## Notas de gobernanza

- CSV locales `*_DO_NOT_COMMIT.csv` y artefactos crudos del tester **no** se versionan salvo decisión explícita del PM.
- Este documento es **solo evidencia / decisión**; no modifica código ni umbrales en repo.

---

## Siguiente paso recomendado

**E5.12 — MSS / CHoCH V1** — ver [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md) §C.
