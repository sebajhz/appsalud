# Session / Spread / Volatility Context — Evidencia smoke E5.16.1 (operador)

## Alcance

- **Checkpoint:** E5.16.1 — humo técnico post-implementación **E5.16** (export Session / Spread / Volatility Context V1).
- **Implementación repo (referencia):** commit `13cf909` — `feat(mapazapp): E5.16 export session spread volatility context`.
- **Build TestEA:** `MZP_TestEA_E5_16`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato export:** [`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md).
- **Contexto previo:** [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md), [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **smoke técnico** del export MQL5 Session / Spread / Volatility V1. **No** cambia TP oficial, entry **50 % / CE**, ni outcomes; **no** ajusta umbrales V1 en este hito; **no** aprueba edge ni variantes; **no** autoriza live trading, gates ni ejecución real. Guardrail **manual / read-only** vigente.

---

## Compilación

| Campo | Valor |
|-------|-------|
| MetaEditor exit code (shell) | `1` (no bloqueante si el log de compilación es limpio) |
| Resultado compile log | **0 errors, 0 warnings** |
| EX5 archivado | `Mapazapp_TestEA_E5_16.ex5` |
| `TESTEA_BUILD` | `MZP_TestEA_E5_16` |

---

## Validación de bundle

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
| `ea_build` | `MZP_TestEA_E5_16` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `has_real_trading_orders` | `false` |
| `has_session_spread_volatility_v1_logic` | `true` |
| `session_spread_volatility_enabled` | `true` |

---

## Summary — Session (V1 hour buckets)

| Métrica (summary JSON) | Valor | % de 1697 |
|------------------------|------:|----------:|
| `session_asian_count` | 457 | 26.9 % |
| `session_london_count` | 370 | 21.8 % |
| `session_new_york_count` | 85 | 5.0 % |
| `session_overlap_count` | 306 | 18.0 % |
| `session_off_count` | 479 | 28.2 % |
| `session_unknown_count` | 0 | 0 % |

**Lectura:** clasificación de sesión operativa; **cero** `unknown` confirma timestamps válidos y ventanas aplicadas. Overlap + London concentran ~40 % del universo; off-session ~28 % — coherente con checklist futuro (sesión activa vs fuera de ventana).

---

## Summary — Spread

| Métrica | Valor |
|---------|------:|
| `spread_normal_count` | 1694 |
| `spread_warning_count` | 2 |
| `spread_high_count` | 1 |
| `spread_extreme_count` | 0 |
| `spread_unknown_count` | 0 |
| `average_spread_points` | 6.976429 |

**Lectura:** spread **mayormente normal** en este benchmark (Strategy Tester). Contexto spread exportable y estable; no prueba spread variable live.

---

## Summary — Volatility (ATR V1, M15)

| Métrica | Valor | % de 1697 |
|---------|------:|----------:|
| `volatility_low_count` | 0 | 0 % |
| `volatility_normal_count` | 133 | 7.8 % |
| `volatility_high_count` | 351 | 20.7 % |
| `volatility_extreme_count` | 1213 | 71.5 % |
| `volatility_unknown_count` | 0 | 0 % |
| `average_volatility_atr_points` | 773.263027 |
| `average_volatility_range_points` | 803.031821 |
| `average_volatility_range_to_atr_ratio` | 1.064691 |

**Lectura:** volatilidad clasificada correctamente a escala de campaña, pero **dominada por bucket `extreme`** bajo umbrales V1 actuales (`InpVolatilityExtremeAtrPoints` = 400 en points). Puede reflejar volatilidad real elevada en XAUUSD M15 **o** umbrales demasiado bajos para este símbolo/timeframe. **No** recalibrar umbrales en E5.16.1 — ver **E5.16.2** (research).

---

## Summary — Execution environment score (0–15, diagnostic)

| Métrica | Valor | % de 1697 |
|---------|------:|----------:|
| `average_execution_environment_score` | 4.661167 | — |
| `execution_environment_grade_a_count` | 3 | 0.2 % |
| `execution_environment_grade_b_count` | 262 | 15.4 % |
| `execution_environment_grade_c_count` | 370 | 21.8 % |
| `execution_environment_grade_weak_count` | 670 | 39.5 % |
| `execution_environment_grade_none_count` | 392 | 23.1 % |

**Lectura:** score medio bajo; predominio **Weak** + **None**, impulsado por penalización volatilidad `extreme` y mezcla off-session. Útil como **componente explicativo** del checklist (North Star E5.18), **no** como filtro de aprobación standalone.

---

## Interpretación (operador)

- **PASS técnico:** export E5.16 + validación bundle coherentes (`trade_count` 1697, `testEaStatus` valid).
- **Sesión:** buckets poblados; `session_unknown_count` = 0.
- **Spread:** casi todo `normal`; contexto spread funcional en ST.
- **Volatilidad:** funcional pero **sesgada a extreme** — investigar calibración por símbolo/perfil antes de usar grades como gate.
- **Entorno de ejecución:** score/grades bajos en promedio; esperable con volatilidad extreme dominante; no invalida el export.
- **Solo diagnóstico:** no cambiar TP, entry, umbrales V1, ni aprobar edge desde este smoke.

---

## Decisión E5.16.1

| Ítem | Estado |
|------|--------|
| Smoke técnico Session / Spread / Volatility V1 | **PASS** |
| Compilación `MZP_TestEA_E5_16` | **PASS** (0/0 en log) |
| Validación bundle | **PASS** (warning no bloqueante) |
| TP oficial (fixed RR2) | **Sin cambio** |
| Entry oficial 50 % / CE | **Sin cambio** |
| Umbrales V1 (spread/volatility) | **Sin cambio** en este hito |
| Aprobación edge / variantes | **No** |
| Gates / live / automatización | **No** |
| Guardrail manual read-only | **Vigente** |

---

## E5.16.2 — Calibration audit (repo)

**Cerrado (TypeScript research):** [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md) — CLI `mapazapp:testea-execution-environment-calibration-audit`; simula perfiles ATR alternativos **sin** cambiar MQL5.

**Siguiente:** **E5.16.3** evidencia operador post-audit sobre bundle benchmark **o** **E5.17+**.

---

## Siguiente (decisión roadmap)

| Opción | Descripción |
|--------|-------------|
| **E5.16.3** | Ejecutar audit en `SET001_…` y documentar evidencia |
| **E5.17+** | Continuar roadmap humanization / checklist según North Star |

---

## Referencias

- Export: [`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md)
- Target policy: [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md)
