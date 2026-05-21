# Dashboard Read-only Data Adapter — E5.20.3

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.3 — adaptador TypeScript read-only |
| **Fix** | **E5.20.3.0.1** — fallback `main_reason` + conteos campaña vs tarjetas ejemplo |
| **Baseline Git** | `b4d3d5f` o posterior — E5.20.3 adaptador |
| **Tipo** | Capa de presentación / consumo UI — **sin** MQL5, MT5, Strategy Tester, trading, gates |
| **Política / casebook** | [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md), [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md) |
| **Contrato UI** | [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md) |
| **Informe fuente** | [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md) |
| **Latest valid** | [`LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md) |

---

## 1. Propósito

Producir **`dashboard_readonly_view.json`** (`schema_version`: `mapazapp_dashboard_readonly_view_v1`) a partir de artefactos locales ya generados. El adaptador **no** recalcula score, grade, decisión ni checklist; **no** implementa aceptación humanizada ni ejecución.

---

## 2. Módulos

| Ruta | Rol |
|------|-----|
| `APP/lib/mapazapp-core/src/dashboard-readonly-adapter.ts` | Core: parse + view model + casebook alignment |
| `APP/lib/mapazapp-core/tests/dashboard-readonly-adapter.test.ts` | Tests Vitest |
| `APP/scripts/src/mapazapp-dashboard-readonly-adapter.ts` | CLI |
| `APP/scripts/src/mapazapp-dashboard-readonly-adapter.test.ts` | Tests CLI (`node:test`) |

**Script:** `pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-adapter`

---

## 3. Entradas

| Input | Obligatorio | Uso |
|-------|-------------|-----|
| `setup_readiness_report.json` | Sí | Fuente primaria (header, executive_summary, example_cards) |
| `latest_valid_report_result.json` | No | Enriquece `selected_bundle_id`, `valid_status_before_report`, `timeframe` |
| `bundles.index.json` | No | Validación opcional; ausencia no falla |

---

## 4. Salida (`dashboard_readonly_view_v1`)

Campos principales:

- `ok`, `generated_at_utc`, `mode` = `backtest_research`, `read_only` = true
- `header` — bundle, build, símbolo, campaña, rutas fuente
- `campaign_summary` — promedios, conteos decisión, grades, `minimum_display_unit_enforced`
- `decision_summary` — conteos **campaña** (`executive_summary` / `latest_valid_report_result`)
- `trade_card_decision_summary` — conteos solo de `example_cards` (subconjunto)
- `blocker_summary` / `warning_summary`
- `trade_cards[]` — tarjetas UI con badges (high-score reject, candidate-with-warnings)
- `casebook_alignment` — referencias HA-001 … HA-010 sin inferir lógica nueva
- `governance` — invariantes producto (50 % CE, RR2, research-only edge, no gates)
- `warnings[]`, `errors[]`

---

## 5. Unidad mínima de display (trade card)

Cada tarjeta válida incluye **juntos**: `decision`, `score`, `grade`, `warning_count`, `top_reasons[]`, y **primary_blocker** (bloqueador duro) **o** `main_reason` (contextual).

**E5.20.3.0.1 — fallback `main_reason`** cuando `blocker_count = 0` y no hay bloqueador duro: orden → `main_reason` existente → `primary_blocker` → primer `top_reasons[]` → fallback por decisión (`candidate_with_warnings`, `wait_context_incomplete`, etc.) → `reason_not_available`. No se etiqueta como “bloqueador duro” si `blocker_count = 0`.

**Smoke operador (SET001):** E5.20.3 falló correctamente en VTR_000003 / VTR_000009 (`primary_blocker: none`, sin `main_reason`). Tras E5.20.3.0.1 el mismo run debe dar `ok=true`.

**Prohibido** tarjeta con solo puntaje.

---

## 6. Casebook alignment (E5.20.6)

Solo mapeo por tokens explícitos visibles:

| Token / contexto | Case ref |
|------------------|----------|
| `pd_conflict` | HA-004 |
| `ifvg_conflict` | HA-009 |
| `target_missing` | HA-006 |
| `overtrading_warning`, `discipline` | HA-005 |
| `edge_research_only`, `official_ce_not_filled` + contexto edge | HA-003 |
| News explícito | HA-008 (activo); si no → `missing_measurement` |
| Late/chase explícito | HA-007 (activo); si no → `missing_measurement` |
| HA-001, HA-002, HA-010 | `policy_only` salvo tokens `humanized_*` / near-miss documentados |

No forzar HA por `target_before_liquidity` salvo mapeo explícito en casebook.

---

## 7. CLI

```bash
pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-adapter -- \
  --report-json "<path>/setup_readiness_report.json" \
  --latest-result "<path>/latest_valid_report_result.json" \
  --index "<path>/bundles.index.json" \
  --output "<path>/dashboard_readonly_view.json" \
  --language es \
  --json
```

---

## 8. Validación

Desde `APP/`:

```bash
pnpm run typecheck
pnpm --filter @workspace/scripts test
pnpm --filter @workspace/mapazapp-core test
```

---

## 9. Siguiente recomendado

**E5.20.3.1** — **re-ejecutar** evidencia operador tras E5.20.3.0.1 usando salida de [`LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md) → `dashboard_readonly_view.json` (`ok=true`, `decision_summary` 247/150/1300).
