# Buffered EVOS MQL5 Smoke Evidence — E5.13.6.12

## Alcance

- **Checkpoint:** E5.13.6.12 — evidencia operador post-implementación **E5.13.6.11** (MQL5 Buffered EVOS diagnostics).
- **Build TestEA:** `MZP_TestEA_E5_13_6_11` (compile fix **c3b9dcc** o posterior).
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato export:** [`BUFFERED_EVOS_EXPORT_E5_13_6_11.md`](./BUFFERED_EVOS_EXPORT_E5_13_6_11.md).
- **Decisión previa:** [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md).
- **Proxy TS (referencia):** [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **smoke técnico** del export MQL5 Buffered EVOS. **No** aprueba edge, 25 %, adaptive ni cambio de entry oficial **50 % / CE**; **no** autoriza live trading, gates, automatización ni ejecución real. Guardrail **manual / read-only** vigente.

---

## Compilación

| Campo | Valor |
|-------|-------|
| Resultado MetaEditor | **0 errors, 0 warnings** |
| EX5 archivado | `Mapazapp_TestEA_E5_13_6_11.ex5` |
| `TESTEA_BUILD` | `MZP_TestEA_E5_13_6_11` |

---

## Validación de bundle

Comando típico:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<RunDir>" \
  --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `status` | `warning` (solo `BUNDLE_EVENTS_LARGE`) |
| `errors` | `[]` |
| `ea_build` | `MZP_TestEA_E5_13_6_11` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `has_real_trading_orders` | `false` |
| `has_buffered_evos_v1_logic` | `true` |
| `buffered_evos_enabled` | `true` |

### optimization_parameters (buffered EVOS)

| Clave | Valor |
|-------|------:|
| `buffered_evos_v1_enabled` | `true` |
| `buffered_evos_buffer_a_points` | 0 |
| `buffered_evos_buffer_b_points` | 5 |
| `buffered_evos_buffer_c_points` | 10 |
| `buffered_evos_buffer_d_points` | 20 |
| `buffered_evos_buffer_e_points` | 30 |
| `buffered_evos_buffer_f_points` | 50 |
| `buffered_evos_min_effective_rr` | 1.5 |
| `buffered_evos_score_enabled` | `true` |

---

## Mejor variante por expectancy (agregados summary)

| Buffer | `buffered_evos_best_variant_by_expectancy_*` |
|--------|---------------------------------------------|
| b0 | **edge** |
| b30 | **edge** |
| b50 | **edge** |

---

## Resultados Buffered EVOS — edge

| Métrica | b0 | b30 | b50 |
|---------|---:|----:|----:|
| `total_r` | 2733.000 | 1629.352 | 1295.038 |
| `expectancy_r` | 1.610 | 1.013 | 0.843 |
| `win_count` | 1453 | 1364 | 1292 |
| `loss_count` | 173 | 173 | 173 |
| `ambiguous_count` | 11 | 11 | 11 |
| `unresolved_count` | 60 | 60 | 60 |
| `fragile_count` | 0 | 760 | 956 |
| `wins_failing_min_effective_rr_count` | — | 736 | 907 |

**Lectura edge:** domina expectancy en b0, b30 y b50 frente al resto de variantes en este bundle. La señal **no** es solo artefacto del proxy TypeScript (E5.13.6.8–6.9): el motor MQL5 confirma supervivencia relativa bajo buffer adversario. Aun así, **fragilidad material** a 30–50 pts: la mayoría de wins edge dejan de cumplir `min_effective_rr` 1.5 tras buffer — coherente con el proxy (~822 wins frágiles a 30 pts en E5.13.6.9).

---

## Comparación b30 — p25 / p50 / adaptive

| Variante | `total_r` | `expectancy_r` | wins | losses | ambiguous | `fragile_count` |
|----------|----------:|---------------:|-----:|-------:|----------:|------------------:|
| **edge** | (ver arriba) | **1.013** | 1364 | 173 | 11 | 760 |
| **p25** | 311.434 | 0.240 | 404 | 254 | 590 | 748 |
| **p50** | **-25.748** | **-0.022** | 368 | 465 | 336 | 825 |
| **adaptive** | 312.110 | 0.240 | 405 | 254 | 589 | 748 |

**Lectura comparativa:**

- **p50 / CE** a b30 pasa a expectancy **negativa** → refuerza que el entry **oficial** sigue siendo **control**, no el mejor candidato bajo estrés de ejecución.
- **p25** y **adaptive** quedan **modestamente positivos** a b30 pero muy por debajo de edge y con **ambigüedad alta** (≈590 trades).
- **edge** sigue siendo el único candidato con expectancy fuerte a b30/b50 en este benchmark; no implica aprobación operativa.

---

## Decisión E5.13.6.12

| Ítem | Estado |
|------|--------|
| Smoke técnico MQL5 Buffered EVOS | **PASS** |
| Export + validación bundle | **PASS** (warning no bloqueante) |
| Entry oficial 50 % / CE | **Sin cambio** |
| Aprobación edge | **No** |
| Aprobación 25 % / adaptive | **No** |
| Live / gates / automatización | **No** |
| Guardrail manual read-only | **Vigente** |
| Estatus edge en investigación | **Candidato serio de investigación** (antes: candidato interesante) |

**E5.13.6.13 —** política de candidatos documentada — [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md). **Siguiente técnico recomendado:** **E5.14** IFVG / BISI / SIBI.

---

## Referencias

- [`BUFFERED_EVOS_EXPORT_E5_13_6_11.md`](./BUFFERED_EVOS_EXPORT_E5_13_6_11.md)
- [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md)
- [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md)
