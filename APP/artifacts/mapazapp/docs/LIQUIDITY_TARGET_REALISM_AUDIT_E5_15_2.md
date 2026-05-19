# Target Realism / TP vs Liquidity Distance Audit — E5.15.2

## Por qué existe E5.15.2

**E5.15** exporta diagnóstico **Liquidity Target Quality V1** por trade (TP oficial vs liquidez detectada). **E5.15.1** smoke confirmó columnas y contadores en bundle benchmark (`SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, `trade_count` 1697): TP RR2 oficial suele quedar **antes** de la liquidez más cercana (`before_nearest` >> `reached_by_tp`).

**E5.15.2** añade un auditor **research-only** en TypeScript que agrega conteos, crosstabs por outcome, estadísticas de distancia, buckets interpretativos y flags — **sin** modificar MQL5, TP oficial, entry 50 %/CE, outcomes ni aprobar edge.

---

## Qué mide

| Sección | Contenido |
|---------|-----------|
| **Overall counts** | `trade_count`, `supported`, `missing`, `reached_by_tp`, `before_nearest`, `beyond_nearest`, `too_far_beyond`, `equal_level`, `swing_target`, `htf_external` |
| **Outcome cross-tabs** | outcome × grade, supported, reached_by_tp, before_nearest, beyond_nearest |
| **Distance stats** | TP oficial y nearest (avg, median, p25, p75, p90); ratio nearest/TP; shortfall cuando `before_nearest`; excess cuando `beyond_nearest` |
| **Buckets** | `conservative_tp_before_liquidity`, `aligned_tp_reaches_liquidity`, `extended_tp_beyond_liquidity`, `missing_liquidity_target`, `weak_target_quality`, `strong_target_quality` |
| **Examples** | hasta `--max-examples` por bucket (trade_id, outcome, direction, precios/distancias, score/grade/reasons) |
| **Interpretation flags** | p.ej. `OFFICIAL_TP_OFTEN_CONSERVATIVE`, `TARGET_QUALITY_DOMINATED_BY_GRADE_C`, `LOW_SUPPORTED_TARGET_RATIO`, `TARGET_LIQUIDITY_AVAILABLE_BUT_BEYOND_TP`, `TARGET_REALISM_NEEDS_PROFILE_RESEARCH` |

---

## Restricciones (gobernanza)

- **No** cambiar TP oficial ni RR fijo.
- **No** cambiar entry oficial (50 % / CE).
- **No** aprobar edge ni variantes alternativas.
- **No** gates, live trading, `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`.
- **No** commitear `*_DO_NOT_COMMIT.csv`.

---

## CLI (read-only, sin MT5)

```bash
pnpm --filter @workspace/scripts mapazapp:testea-liquidity-target-realism-audit -- \
  --bundle "<RunDir>" \
  --json
```

Opciones:

| Flag | Default | Descripción |
|------|---------|-------------|
| `--max-examples` | `10` | Ejemplos por bucket |
| `--csv-output <path>` | — | CSV resumen (overall, buckets, crosstabs) |
| `--search-root` / `--campaign-folder` | — | Igual que otros audits TestEA |
| `--strict` | — | exit 1 si bundle falla |

Módulo core: `APP/lib/mapazapp-core/src/testea-liquidity-target-realism-audit.ts`  
CLI: `APP/scripts/src/mapazapp-testea-liquidity-target-realism-audit.ts`  
Script: `mapazapp:testea-liquidity-target-realism-audit`

---

## Evidencia operador (E5.15.3)

**Cerrado — docs:** [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md) — PASS; 1249/1697 TP antes de nearest; 406 supported; flags conservador + bajo supported + grado C; **no** cambiar TP ni entry.

**E5.15.4 (policy):** [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md) — cerrado research-only. **Siguiente:** **E5.16** session/spread/volatility.

---

## Referencias

- Export: [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md)
- Smoke: [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md)
- North Star E5.15.2: [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
