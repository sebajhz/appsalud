# Liquidity Target Realism Audit — Evidencia operador E5.15.3

## Alcance

- **Checkpoint:** E5.15.3 — evidencia operador post–**E5.15.2** (CLI target realism audit).
- **Build TestEA:** `MZP_TestEA_E5_15`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Contrato auditor:** [`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md).
- **Export / smoke previos:** [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md), [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento registra el **re-run** del audit de realismo TP vs liquidez sobre el bundle benchmark. **No** cambia TP oficial (RR2 fijo), entry **50 % / CE**, outcomes ni umbrales del export; **no** aprueba edge ni variantes; **no** autoriza live trading, gates ni ejecución real.

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-liquidity-target-realism-audit -- \
  --bundle "$RunDir" \
  --json \
  --max-examples 10
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `trade_count` | 1697 |
| `errors` | `[]` |
| `warnings` | solo metadatos de import (`run_id` sintetizado; `parameter_set_id` del CSV vs opciones de import) — **no invalidan** el audit |
| CLI / core | post-commit **`7ab9050`** (E5.15.2) o posterior |

---

## Overall counts

| Métrica | Valor | Nota |
|---------|------:|------|
| `trade_count` | 1697 | Alineado smoke E5.15.1 |
| `supported_count` | 406 | ~23.9 % del universo |
| `missing_count` | 42 | ~2.5 % |
| `reached_by_tp_count` | 406 | = `supported_count` en este bundle |
| `before_nearest_count` | 1249 | ~73.6 % — TP antes que nearest |
| `beyond_nearest_count` | 319 | ~18.8 % |
| `too_far_beyond_count` | 0 | Sin exceso marcado como too-far |
| `equal_level_count` | 1150 | |
| `swing_target_count` | 1697 | Swing presente en todos los trades |
| `htf_external_count` | 1549 | |

---

## Distance stats (points)

### Official TP distance

| Stat | Valor |
|------|------:|
| count | 1697 |
| average | 280.860931 |
| median | 150 |
| p25 | 62 |
| p75 | 320 |
| p90 | 624.8 |

### Nearest liquidity distance

| Stat | Valor |
|------|------:|
| count | 1655 |
| average | 960.742598 |
| median | 460 |
| p25 | 187 |
| p75 | 1013.5 |
| p90 | 2147.4 |

### Liquidity / TP distance ratio (nearest ÷ TP)

| Stat | Valor |
|------|------:|
| count | 1655 |
| average | 11.312268 |
| median | 3.234694 |
| p25 | 1.229738 |
| p75 | 8.666087 |
| p90 | 23.024955 |

### TP shortfall to nearest (when `before_nearest`)

| Stat | Valor |
|------|------:|
| count | 1249 |
| average | 988.524420 |
| median | 466 |
| p25 | 183 |
| p75 | 1045 |
| p90 | 2187.6 |

### TP excess beyond nearest (when `beyond_nearest`)

| Stat | Valor |
|------|------:|
| count | 319 |
| average | 323.021944 |
| median | 205 |
| p25 | 96.5 |
| p75 | 341 |
| p90 | 580.6 |

**Lectura:** la liquidez nearest está **materialmente más lejos** que el TP oficial (mediana nearest 460 vs TP 150; ratio mediano ~3.2×). Cuando el TP queda antes de nearest, el shortfall típico es grande (mediana 466 pts).

---

## Interpretation buckets

| Bucket | Count | % de 1697 |
|--------|------:|----------:|
| `conservative_tp_before_liquidity` | 1249 | 73.6 % |
| `aligned_tp_reaches_liquidity` | 406 | 23.9 % |
| `extended_tp_beyond_liquidity` | 319 | 18.8 % |
| `missing_liquidity_target` | 42 | 2.5 % |
| `weak_target_quality` | 196 | 11.5 % |
| `strong_target_quality` | 406 | 23.9 % |

*(Un trade puede aparecer en más de un bucket; los porcentajes no suman 100 %.)*

---

## Outcome cross-tabs (interpretación)

### Outcome × `liquidity_target_supported`

| Outcome | supported=true | supported=false |
|---------|---------------:|----------------:|
| win | 96 | 315 |
| loss | 148 | 359 |
| ambiguous | 54 | 382 |
| expired_unfilled | 107 | 235 |
| expired_open | 1 | 0 |

**Lectura:** `supported` **no** implica mejor outcome. Hay **148** losses con target supported y **96** wins — útil como componente explicativo / checklist, **no** como filtro de aprobación standalone.

### Outcome × `before_nearest`

| Outcome | before=true | before=false |
|---------|------------:|-------------:|
| win | 303 | 108 |
| loss | 347 | 160 |
| ambiguous | 371 | 65 |
| expired_unfilled | 228 | 114 |
| expired_open | 0 | 1 |

**Lectura:** el patrón “TP conservador antes de nearest” aparece en **todos** los outcomes, incluidos wins y losses. No es un predictor simple de resultado.

---

## Interpretation flags (CLI)

| Flag | Lectura |
|------|---------|
| `OFFICIAL_TP_OFTEN_CONSERVATIVE` | 1249/1697 con TP antes de nearest |
| `LOW_SUPPORTED_TARGET_RATIO` | 406/1697 supported (~24 %) |
| `TARGET_QUALITY_DOMINATED_BY_GRADE_C` | predominio grado C en export (smoke E5.15.1) |
| `TARGET_REALISM_NEEDS_PROFILE_RESEARCH` | realismo depende de perfil / política de objetivo, no de un solo umbral |

---

## Decisión E5.15.3

| Ítem | Estado |
|------|--------|
| Audit técnico target realism | **PASS** |
| Coherencia con smoke E5.15.1 | **PASS** (mismos contadores overall) |
| TP oficial (fixed RR2) | **Sin cambio** |
| Entry oficial 50 % / CE | **Sin cambio** |
| Aprobación edge / variantes | **No** |
| Gates / live / automatización | **No** |
| Target quality como filtro único | **No recomendado** — solo diagnóstico / checklist futuro |

**Conclusión operativa:** el TP RR2 oficial es **a menudo conservador** respecto a la liquidez nearest detectada. El diagnóstico E5.15 es valioso para **explicar** geometría de objetivo, no para aprobar edge ni sustituir la política de TP sin gobernanza explícita.

---

## E5.15.4 — Target policy (cerrado, research only)

**Documento:** [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md) — vocabulario de familias de objetivo, gobernanza, checklist futuro, barras de evidencia antes de cambiar TP. **No** cambia TP RR2 ni entry.

---

## Siguiente (decisión roadmap)

| Opción | Descripción |
|--------|-------------|
| **E5.16** | **Recomendado** — Session / Spread / Volatility Context V1 (export diagnóstico) |
