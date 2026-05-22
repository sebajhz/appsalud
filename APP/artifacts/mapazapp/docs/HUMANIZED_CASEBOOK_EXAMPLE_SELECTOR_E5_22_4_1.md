# Humanized Casebook Example Selector — E5.22.4.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.4.1 — selector de trade IDs reales SET001 para HA + calibración |
| **Tipo** | Core + CLI (read-only research) |
| **Baseline Git** | `8a980af` o posterior — `docs(mapazapp): E5.22.4 audit humanized casebook measurability` |
| **Prerrequisito** | [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md) |
| **Implementación** | `@workspace/mapazapp-core` + `mapazapp:testea-humanized-casebook-example-selector` |
| **Sin cambios** | MQL5, MT5, ST, gates, live, entry/TP, edge approval, canales |

---

## 1. Propósito

Tras **E5.22.4** (medibilidad HA), el siguiente paso engine-first es anclar la humanización a **trade IDs reales** del bundle SET001 antes de diseñar el trade-set delta (**E5.22.5**).

Este selector:

- Lee `backtest_summary.json` + `backtest_trades.csv` (no `backtest_events.csv`).
- Elige ejemplos representativos por **HA-001…HA-010** y categorías de calibración.
- Incluye interpretación, acción humanizada futura y nota de gobernanza por fila.
- **No** modifica estrategia ni aprobación de gates.

---

## 2. CLI

```bash
pnpm --filter @workspace/scripts mapazapp:testea-humanized-casebook-example-selector -- \
  --bundle "<RunDir>" \
  --json \
  --csv-output "<path>_DO_NOT_COMMIT.csv" \
  --max-examples-per-case 5
```

| Opción | Descripción |
|--------|-------------|
| `--bundle` | Carpeta bundle (obligatorio) |
| `--json` | JSON completo en stdout |
| `--csv-output` | CSV aplanado (usar sufijo `_DO_NOT_COMMIT`) |
| `--max-examples-per-case` | Máximo por bucket HA/calibración (default 5) |
| `--strict` | Exit 1 si el bundle falla |

**Exit codes:** 0 éxito · 1 fallo strict · 2 argumentos inválidos

---

## 3. Schema de salida

`schema_version`: `mapazapp_humanized_casebook_example_selector_v1`

```json
{
  "ok": true,
  "schema_version": "mapazapp_humanized_casebook_example_selector_v1",
  "bundle": "...",
  "ea_build": "MZP_TestEA_E5_18",
  "symbol": "XAUUSD",
  "timeframe": "M15",
  "trade_count": 1697,
  "examples_by_case": { "HA-001": [], "HA-008": [] },
  "examples_by_calibration_category": { "candidate_winner": [] },
  "missing_cases": ["HA-008"],
  "field_availability": { "news_event_fields": false },
  "warnings": [],
  "errors": [],
  "research_only_note": "..."
}
```

---

## 4. Categorías HA

| Caso | Criterio de selección | Notas |
|------|----------------------|-------|
| **HA-001** | `near_miss` / `missed_shallow_retrace`, contexto fuerte, variante edge win opcional | Puede quedar vacío si no hay near-miss en bundle |
| **HA-002** | Near-miss + IFVG conflict/weak o outcome malo | `reaction_strength` ausente — proxies |
| **HA-003** | Oficial loss/ambiguous/unfilled + edge/25 sim win | **Research-only** |
| **HA-004** | `pd_conflict` winner + loser | Muestra por qué PD no es hard reject |
| **HA-005** | overtrading/revenge/daily risk — winner + loser | No gate aprobado |
| **HA-006** | target missing/weak — winner + loser | Diagnóstico |
| **HA-007** | `entry_filled_late` o proxy expired/unfilled | `missing_measurement` si no hay chase explícito |
| **HA-008** | **Siempre `missing_cases`** | Sin feed news en export — no inventar |
| **HA-009** | IFVG conflict loser + rare winner | Calibración fuerte, no gate |
| **HA-010** | wait winner + wait loser | Calibración wait fuerte en SET001 |

---

## 5. Categorías de calibración adicionales

| Categoría | Uso |
|-----------|-----|
| `candidate_winner` / `candidate_loser` | Referencia readiness candidate |
| `reject_winner` / `reject_loser` | Calibración reject imperfecto |
| `high_score_reject_winner` / `high_score_reject_loser` | No score-only |
| `structure_conflict_winner` / `structure_conflict_loser` | Blocker mixto |
| `execution_environment_weak_winner` / `execution_environment_weak_loser` | No hard reject env |
| `ifvg_weak_loser` | Segmento tóxico Weak |
| `ifvg_ab_winner` | Segmento positivo A/B |

---

## 6. CSV aplanado

Columnas: `case_id`, `category`, `trade_id`, `outcome`, `result_r`, `decision`, `score`, `grade`, `primary_blocker`, `ifvg_grade`, `target_grade`, `environment_grade`, `discipline_grade`, `session`, `volatility`, `entry_status`, `reason_selected`, `interpretation`, `future_humanized_action`, `governance_note`

---

## 7. Evidencia operador — **PASS**

[`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_EVIDENCE_E5_22_4_1.md) — SET001 real, `ok=true`, HA-001…HA-010 anclados (HA-008 vacío esperado).

Salida local (no commitear): `APP/artifacts/mapazapp/docs/_local_E5_22_4_1_humanized_casebook_examples_DO_NOT_COMMIT/`

**Siguiente:** E5.22.4.2 — trade cards textuales · **E5.22.5** — trade-set delta design

---

## 8. Gobernanza

| Acción | Estado |
|--------|--------|
| MQL5 / MT5 / ST | **No** |
| Gates / live / canales | **No** |
| Cambio entry/TP / edge approval | **No** |
| Commitear `_local_*` | **No** |

---

## Referencias

- [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
- Core: `APP/lib/mapazapp-core/src/testea-humanized-casebook-example-selector.ts`
- CLI: `APP/scripts/src/mapazapp-testea-humanized-casebook-example-selector.ts`
