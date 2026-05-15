# MSS / CHoCH V1 — Evidencia de smoke E5.12.1

## Contexto

Smoke ejecutado por el operador **después de E5.12 — MSS / CHoCH V1**, con build **`MZP_TestEA_E5_12`**. Objetivo: evidencia reproducible de que el export MSS/CHoCH (estructura interna en TF de ejecución, solo velas cerradas, `wick_break_only`, scores y razones) funciona en bundle real y permite analizar correlación con outcomes **sin** tratarlo como compuerta de trading.

**Referencias:** implementación y campos — [`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md); roadmap — [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md) §C; HTF (contexto distinto) — [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md).

---

## Validación de bundle / build

| Campo | Valor |
|--------|--------|
| `ea_build` | `MZP_TestEA_E5_12` |
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

## Summary — MSS / CHoCH V1

| Métrica | Valor |
|---------|------:|
| `has_mss_choch_v1_logic` | `true` |
| `mss_choch_enabled` | `true` |
| `mss_detected_count` | 789 |
| `bullish_mss_count` | 501 |
| `bearish_mss_count` | 288 |
| `choch_detected_count` | 274 |
| `bullish_choch_count` | 158 |
| `bearish_choch_count` | 116 |
| `wick_break_only_count` | 243 |
| `mss_valid_close_count` | 789 |
| `choch_valid_close_count` | 274 |
| `mss_aligned_with_trade_count` | 716 |
| `mss_against_trade_count` | 73 |
| `choch_aligned_with_trade_count` | 273 |
| `choch_against_trade_count` | 1 |
| `average_mss_choch_score` | 9.923984 |
| `average_entry_quality_score` | 52.812021 |
| `score_a_count` | 0 |
| `score_b_count` | 1 |
| `score_c_count` | 1053 |
| `score_rejected_count` | 643 |

---

## Frecuencia — tokens / razones (reportadas)

| Token / razón | Count |
|---------------|------:|
| `mss_valid_close` | 789 |
| `mss_aligned_with_trade` | 716 |
| `mss_not_found` | 391 |
| `choch_not_found` | 391 |
| `structure_confirmation_unknown` | 391 |
| `choch_valid_close` | 274 |
| `choch_aligned_with_trade` | 273 |
| `wick_break_only` | 243 |
| `mss_against_trade` | 73 |
| `choch_against_trade` | 1 |

---

## Outcome — agregados (sin claims de rentabilidad)

| Outcome | Count | avgEntryScore | avgMssChochScore | MssDetected | ChochDetected | WickOnly | MssValidClose | ChochValidClose | AvgHtfScore | AvgAmbiguousRisk |
|---------|------:|--------------:|-----------------:|------------:|--------------:|---------:|--------------:|----------------:|------------:|-----------------:|
| `ambiguous` | 436 | 51.9335 | 8.8899 | 157 | 72 | 81 | 157 | 72 | 12.1697 | 70.1147 |
| `expired_open` | 1 | 53 | 15 | — | — | — | — | — | — | — |
| `expired_unfilled` | 342 | 49.0409 | 11.3538 | 212 | 47 | 26 | 212 | 47 | 12.2982 | 36.5936 |
| `loss` | 507 | 54.5227 | 10.0000 | 233 | 85 | 74 | 233 | 85 | 12.6982 | 36.6864 |
| `win` | 411 | 54.7713 | 9.7251 | 186 | 70 | 62 | 186 | 70 | 12.9538 | 37.0073 |

*(Celdas con —: métricas no aplicables o no reportadas en el extracto del operador para `expired_open`, N=1.)*

---

## Dirección MSS × outcome

| Dirección MSS | ambiguous | expired_open | expired_unfilled | loss | win |
|---------------|----------:|-------------:|-----------------:|-----:|----:|
| bearish | 61 | 1 | 75 | 93 | 58 |
| bullish | 96 | — | 137 | 140 | 128 |
| none | 279 | — | 130 | 274 | 225 |

---

## Dirección CHoCH × outcome

| Dirección CHoCH | ambiguous | expired_open | expired_unfilled | loss | win |
|-----------------|----------:|-------------:|-----------------:|-----:|----:|
| bearish | 37 | — | 20 | 28 | 31 |
| bullish | 35 | — | 27 | 57 | 39 |
| none | 364 | 1 | 295 | 422 | 341 |

---

## Interpretación

- **PASS técnico:** validación CLI `ok=true`, `errors=[]`; único warning conocido `BUNDLE_EVENTS_LARGE`; export MSS/CHoCH presente y usable para post-proceso (`has_mss_choch_v1_logic=true`).
- **MSS/CHoCH V1 exporta diagnósticos válidos** de confirmación de estructura con **cierre** (contadores `mss_valid_close` / `choch_valid_close` coherentes con detecciones; `wick_break_only` identificado para rechazo por mecha).
- **El score MSS/CHoCH no separa wins de losses en este bundle:** media wins **9.7251** vs losses **10.0000**; **expired_unfilled** aún mayor (**11.3538**). Por tanto **no** debe usarse como **compuerta dura** ni como **filtro standalone de calidad** hasta evidencia adicional.
- **Señal útil parcial:** el grupo **ambiguous** muestra **menor** `avgMssChochScore` y **menor** tasa de detección MSS que otros outcomes — el componente puede ayudar a marcar **ruido/incertidumbre**, pero **no** identifica de forma fiable trades rentables con la V1 actual.
- **Postura coherente con roadmap:** MSS/CHoCH sigue siendo **observación**; investigaciones siguientes razonables incluyen **relevancia temporal** de la señal (p. ej. **E5.12.2**) y/o continuar con **Premium/Discount** (**E5.13**) sin tunear solo por outcome en **un** bundle.

---

## Decisión (explícita)

- **PASS** técnico del smoke **E5.12.1**.
- Mantener **solo observación** (sin bloqueo de setups por MSS/CHoCH).
- **No** compuerta dura aprobada por MSS/CHoCH V1.
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

- **E5.12.2** — auditoría / refinamiento de **relevancia temporal** MSS/CHoCH (investigación opcional), **o**
- **E5.13 — Premium/Discount Context V1** — ver [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md) §D.
