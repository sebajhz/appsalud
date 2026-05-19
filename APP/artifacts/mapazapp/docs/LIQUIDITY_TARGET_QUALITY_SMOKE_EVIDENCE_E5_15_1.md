# Liquidity Target Quality — Evidencia smoke E5.15.1 (operador)

## Alcance

- **Checkpoint:** E5.15.1 — humo técnico post-implementación **E5.15** (export Liquidity Target Quality V1).
- **Implementación repo (referencia):** commit `f066e58` — `feat(mapazapp): E5.15 export liquidity target quality`.
- **Build TestEA:** `MZP_TestEA_E5_15`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato export:** [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md), [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md).

Este documento registra el **smoke técnico** del export MQL5 Liquidity Target Quality. **No** cambia TP oficial, entry **50 % / CE**, ni outcomes; **no** aprueba edge, 25 %, adaptive; **no** autoriza live trading, gates ni ejecución real. Guardrail **manual / read-only** vigente.

---

## Compilación

| Campo | Valor |
|-------|-------|
| Resultado MetaEditor | **0 errors, 0 warnings** |
| EX5 archivado | `Mapazapp_TestEA_E5_15.ex5` |
| `TESTEA_BUILD` | `MZP_TestEA_E5_15` |

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
| `ea_build` | `MZP_TestEA_E5_15` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `has_real_trading_orders` | `false` |
| `has_liquidity_target_quality_v1_logic` | `true` |
| `liquidity_target_quality_enabled` | `true` |

### optimization_parameters (Liquidity Target V1)

| Clave | Valor |
|-------|-------|
| `liquidity_target_quality_v1_enabled` | `true` |
| `liquidity_target_lookback_bars` | 200 |
| `liquidity_target_swing_lookback_bars` | 2 |
| `liquidity_target_equal_level_tolerance_points` | 50 |
| `liquidity_target_min_distance_points` | 20 |
| `liquidity_target_score_enabled` | `true` |

---

## Summary — Liquidity Target Quality V1

| Métrica (operador / summary JSON) | Valor |
|-----------------------------------|------:|
| `liquidity_target_supported_count` | 406 |
| `liquidity_target_missing_count` | 42 |
| `liquidity_target_conflict_count` | 0 |
| `liquidity_target_reached_by_tp_count` | 406 |
| `liquidity_target_before_nearest_count` | 1249 |
| `liquidity_target_beyond_nearest_count` | 319 |
| `liquidity_target_too_far_beyond_count` | 0 |
| `liquidity_target_equal_level_count` | 1150 |
| `liquidity_target_swing_target_count` | 1697 |
| `liquidity_target_htf_external_target_count` | 1549 |
| `average_liquidity_target_score` | 8.536240 |
| `average_liquidity_target_official_tp_distance_points` | 280.860931 |
| `average_liquidity_target_nearest_distance_points` | 936.964643 |
| `liquidity_target_grade_a_count` | 203 |
| `liquidity_target_grade_b_count` | 203 |
| `liquidity_target_grade_c_count` | 1095 |
| `liquidity_target_grade_weak_count` | 153 |
| `liquidity_target_grade_none_count` | 43 |

---

## Interpretación (operador)

- **PASS técnico:** export + validación bundle coherentes a escala de campaña (1697 trades).
- **Cobertura de candidatos:** todo trade tiene candidato **swing** (`swing_target_count` = 1697); liquidez externa HTF en la mayoría (1549); equal-level frecuente (1150).
- **Sin conflicto V1:** `liquidity_target_conflict_count` = 0 — en este benchmark V1 no marca conflicto direccional de objetivo.
- **TP oficial vs liquidez más cercana:** solo **406/1697** trades con `liquidity_target_supported` (TP alcanza liquidez soportada); **1249** con TP **antes** del pool más cercano → el TP fijo RR2 suele ser **conservador** frente a la liquidez detectada más próxima (distancia media nearest ~937 pts vs TP ~281 pts).
- **Más allá del nearest:** 319 trades con TP beyond nearest; **0** con `too_far_beyond` en este bundle.
- **Grados:** predominio **C** (1095); A/B presentes (203 cada uno) pero no dominantes.
- **Solo diagnóstico:** no cambiar TP, entry oficial ni aprobar modelos de entrada desde este smoke.

---

## Decisión E5.15.1

| Ítem | Estado |
|------|--------|
| Smoke técnico MQL5 Liquidity Target Quality | **PASS** |
| Export + validación bundle | **PASS** (warning no bloqueante) |
| TP oficial (fixed RR) | **Sin cambio** |
| Entry oficial 50 % / CE | **Sin cambio** |
| Aprobación edge / 25 % / adaptive | **No** |
| Live / gates / automatización | **No** |
| Guardrail manual read-only | **Vigente** |
| Siguiente (decisión roadmap) | **E5.15.4** target policy research **o** **E5.16** session/spread/volatility |

---

## E5.15.2 — Target Realism audit (repo)

[`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md) — CLI `mapazapp:testea-liquidity-target-realism-audit`.

## E5.15.3 — Target Realism audit evidence (operador)

[`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md) — PASS; contadores alineados con este smoke; TP conservador vs nearest en ~74 % de trades; **no** cambiar TP ni entry.

---

## Referencias

- [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md)
- [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md)
- [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md)
