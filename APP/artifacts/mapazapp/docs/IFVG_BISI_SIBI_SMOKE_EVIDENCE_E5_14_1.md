# IFVG / BISI / SIBI — Evidencia smoke E5.14.1 (operador)

## Alcance

- **Checkpoint:** E5.14.1 — humo técnico post-implementación **E5.14** (export IFVG / BISI / SIBI V1).
- **Implementación repo (referencia):** commit `949a06d` — `feat(mapazapp): E5.14 export IFVG BISI SIBI context`.
- **Build TestEA:** `MZP_TestEA_E5_14`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato export:** [`IFVG_BISI_SIBI_EXPORT_E5_14.md`](./IFVG_BISI_SIBI_EXPORT_E5_14.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md), [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md).

Este documento registra el **smoke técnico** del export MQL5 IFVG / BISI / SIBI. **No** aprueba edge, 25 %, adaptive ni cambio de entry oficial **50 % / CE**; **no** autoriza live trading, gates, automatización ni ejecución real. Guardrail **manual / read-only** vigente.

---

## Compilación

| Campo | Valor |
|-------|-------|
| Resultado MetaEditor | **0 errors, 0 warnings** |
| EX5 archivado | `Mapazapp_TestEA_E5_14.ex5` |
| `TESTEA_BUILD` | `MZP_TestEA_E5_14` |

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
| `ea_build` | `MZP_TestEA_E5_14` |
| `trade_count` | 1697 |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `has_real_trading_orders` | `false` |
| `has_ifvg_bisi_sibi_v1_logic` | `true` |
| `ifvg_bisi_sibi_enabled` | `true` |

---

## Summary — IFVG / BISI / SIBI V1

| Métrica | Valor |
|---------|------:|
| BISI_Count | 1028 |
| SIBI_Count | 669 |
| Unknown_Class | 0 |
| Clean_Count | 248 |
| Touched_Count | 1449 |
| CE_Touched_Count | 1355 |
| Fully_Filled_Count | 700 |
| Wick_Only_Fill_Count | 736 |
| Inversion_Detected | 1149 |
| Inversion_Close | 699 |
| Inversion_Wick_Only | 737 |
| Retest_Detected | 176 |
| Aligned_With_Trade | 998 |
| Conflict_With_Trade | 699 |
| Avg_IFVG_Score | 8.114909 |
| Grade_A | 414 |
| Grade_B | 293 |
| Grade_C | 446 |
| Grade_Weak | 544 |
| Grade_None | 0 |

---

## Interpretación (operador)

- **PASS técnico:** export + validación bundle coherentes a escala de campaña (1697 trades).
- **Clasificación completa:** `Unknown_Class = 0` confirma que todos los trades recibieron **BISI** o **SIBI**.
- **Mitigación útil:** la mayoría de trades **tocaron** el FVG y muchos alcanzaron **CE** — el estado de mitigación aporta contexto diagnóstico.
- **Inversión:** inversión confirmada por **cierre** y por **wick-only** son ambas frecuentes; mantenerlas **separadas** es importante (no tratar wick-only como confirmación).
- **Retest:** retest tras inversión es **relativamente bajo** frente al conteo de inversión → diagnóstico útil para investigación futura.
- **Alineación:** alineación / conflicto IFVG con dirección del trade puede ser un componente explicativo relevante más adelante.
- **Solo diagnóstico:** no aprobar edge ni ningún modelo de entrada desde este smoke; entry oficial **50 % / CE** sin cambio.

---

## Decisión E5.14.1

| Ítem | Estado |
|------|--------|
| Smoke técnico MQL5 IFVG / BISI / SIBI | **PASS** |
| Export + validación bundle | **PASS** (warning no bloqueante) |
| Entry oficial 50 % / CE | **Sin cambio** |
| Aprobación edge / 25 % / adaptive | **No** |
| Live / gates / automatización | **No** |
| Guardrail manual read-only | **Vigente** |
| Siguiente técnico recomendado | **E5.15** Liquidity Target Quality V1 — [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md) (repo); operator smoke pending |

---

## Futuro (solo planificación): Mapazapp Setup Readiness Checklist

Concepto de dashboard/reporting **futuro** (no implementación en E5.14.1): checklist automático similar al de un trader discrecional, generado desde diagnósticos Mapazapp.

**Ítems candidatos:** HTF bias / estructura alineada; evento de liquidez; reacción / desplazamiento; calidad IFVG / BISI / SIBI; contexto MSS / CHoCH; premium / discount; familia de entrada candidata (edge / 25 / 50 / adaptive / wait); Buffered EVOS / robustez de ejecución; calidad del objetivo de liquidez; sesión / spread / volatilidad; riesgo / disciplina; decisión final read-only: **Candidate / Wait / Reject**.

**Objetivo de reporting:** persistir **razones de bloqueo** para informes agregados (p. ej. IFVG débil, conflicto HTF, objetivo pobre, entrada frágil, ambigüedad excesiva, sesión/spread/volatilidad, bloqueo de disciplina de riesgo).

**Restricción:** no es panel de ejecución en vivo; permanece **read-only** y alineado a control manual hasta aprobación explícita de gobernanza.

---

## Referencias

- [`IFVG_BISI_SIBI_EXPORT_E5_14.md`](./IFVG_BISI_SIBI_EXPORT_E5_14.md)
- [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md)
- [`BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md`](./BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md)
