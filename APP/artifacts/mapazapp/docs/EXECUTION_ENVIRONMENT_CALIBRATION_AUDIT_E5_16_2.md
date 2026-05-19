# Execution Environment Calibration Audit — E5.16.2

## Por qué existe E5.16.2

**E5.16** exporta contexto de sesión, spread y volatilidad por trade. **E5.16.1** smoke confirmó que la clasificación funciona en bundle benchmark (`SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, `trade_count` 1697), pero ~71.5 % de trades quedan en `volatility_extreme` bajo umbrales V1 (80 / 250 / 400 points ATR).

**E5.16.2** añade un auditor **research-only** en TypeScript que agrega conteos, crosstabs por outcome, estadísticas ATR/range, **simulación de umbrales alternativos** (sin cambiar MQL5) y flags de interpretación — **sin** modificar umbrales oficiales, TP RR2, entry 50 %/CE, outcomes ni aprobar edge.

---

## Qué mide

| Sección | Contenido |
|---------|-----------|
| **Overall counts** | `trade_count`, buckets de sesión/spread/volatilidad exportados, grades de entorno |
| **Outcome cross-tabs** | outcome × `session_bucket`, `spread_bucket`, `volatility_bucket`, `execution_environment_grade` |
| **ATR / range stats** | avg, median, p25, p75, p90, **p95** para ATR points, range points, range/ATR ratio |
| **Threshold sensitivity** | Re-clasificación por ATR exportado (sin MQL5): `mql5_v1_simulated`, `profile_xauusd_m15_candidate_a/b`, `profile_xauusd_m15_candidate_c` (percentiles p25/p75/p90) |
| **Examples** | hasta `--max-examples` por categoría: extreme vol actual, normal vol, grades Weak/None, grades A/B |
| **Interpretation flags** | p.ej. `VOLATILITY_THRESHOLDS_TOO_LOW_FOR_XAUUSD_M15`, `SPREAD_NOT_PRIMARY_ISSUE`, `PROFILE_SPECIFIC_THRESHOLDS_RECOMMENDED`, `CURRENT_THRESHOLDS_USABLE_AS_STRESS_LABEL_ONLY` |

### Perfiles de sensibilidad (solo simulación TS)

| Profile | Reglas ATR (points) |
|---------|---------------------|
| `mql5_v1_simulated` | low &lt; 80; high ≥ 250; extreme ≥ 400 |
| `profile_xauusd_m15_candidate_a` | low &lt; 150; high ≥ 500; extreme ≥ 900 |
| `profile_xauusd_m15_candidate_b` | low &lt; 200; high ≥ 700; extreme ≥ 1200 |
| `profile_xauusd_m15_candidate_c` | low &lt; p25; normal p25–p75; high p75–p90; extreme ≥ p90 (del bundle) |

---

## Restricciones (gobernanza)

- **No** cambiar umbrales MQL5 ni inputs TestEA en este hito.
- **No** cambiar TP oficial ni RR fijo.
- **No** cambiar entry oficial (50 % / CE).
- **No** aprobar edge ni variantes alternativas.
- **No** gates, live trading, `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`.
- **No** commitear `*_DO_NOT_COMMIT.csv`.

---

## CLI (read-only, sin MT5)

```bash
pnpm --filter @workspace/scripts mapazapp:testea-execution-environment-calibration-audit -- \
  --bundle "<RunDir>" \
  --json
```

Opciones:

| Flag | Default | Descripción |
|------|---------|-------------|
| `--max-examples` | `10` | Ejemplos por categoría |
| `--csv-output <path>` | — | CSV resumen (overall, crosstabs, sensitivity, flags) |
| `--search-root` / `--campaign-folder` | — | Igual que otros audits TestEA |
| `--strict` | — | exit 1 si bundle falla |

Módulo core: `APP/lib/mapazapp-core/src/testea-execution-environment-calibration-audit.ts`  
CLI: `APP/scripts/src/mapazapp-testea-execution-environment-calibration-audit.ts`  
Script: `mapazapp:testea-execution-environment-calibration-audit`

---

## Evidencia operador (E5.16.3)

**Cerrado — docs:** [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md) — PASS; bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; V1 extreme 1213/1697; candidatos B/C más plausibles; **no** cambiar umbrales aquí.

**Siguiente:** **E5.16.4** profile policy (research) **o** **E5.17** frequency/risk/discipline.

---

## Referencias

- Export: [`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md)
- Smoke: [`SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md`](./SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md)
- North Star: [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
