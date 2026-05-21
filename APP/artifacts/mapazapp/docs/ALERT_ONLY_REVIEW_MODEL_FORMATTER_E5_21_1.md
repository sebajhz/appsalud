# Alert-only Review — Modelo + Formatter E5.21.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.21.1 — modelo + formatter TS + CLI local |
| **Baseline Git** | `278dcfb` o posterior — plan E5.21 |
| **Contrato** | [`ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md`](./ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md) |
| **Entrada** | `dashboard_readonly_view.json` (E5.20.3) |
| **Salida** | `alert_review_queue.jsonl` + `alert_review_summary.json` |
| **Sin canales** | No Telegram, email, push, panel dashboard, MT5, trading |
| **Evidencia operador (E5.21.1.1)** | [`ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md`](./ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md) — **PASS** |
| **Cola local (E5.21.2)** | [`ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md`](./ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md) — gestor estados JSONL |
| **Evidencia cola (E5.21.2.1)** | [`ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md`](./ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md) — **PASS** |

---

## Módulos

| Ruta | Rol |
|------|-----|
| `APP/lib/mapazapp-core/src/alert-only-review.ts` | Modelo, reglas, generación, validación wording |
| `APP/lib/mapazapp-core/tests/alert-only-review.test.ts` | Tests Vitest |
| `APP/scripts/src/mapazapp-alert-only-review.ts` | CLI |
| `APP/scripts/src/mapazapp-alert-only-review.test.ts` | Tests CLI (`node:test`) |

**Script:** `pnpm --filter @workspace/scripts mapazapp:alert-only-review`

---

## CLI

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:alert-only-review -- \
  --view-json "<path>/dashboard_readonly_view.json" \
  --output "<path>/alert_review_queue.jsonl" \
  --summary-output "<path>/alert_review_summary.json" \
  [--language es|en] \
  [--json]
```

| Opción | Obligatorio | Descripción |
|--------|-------------|-------------|
| `--view-json` | Sí | Salida adaptador E5.20.3 |
| `--output` | Sí | Cola JSONL local |
| `--summary-output` | Sí | Resumen agregado |
| `--language` | No | `es` (default) o `en` |
| `--json` | No | Resumen compacto en stdout |

`delivery_status` siempre `queued_local_only` — **no envía** alertas.

---

## Alcance de generación (E5.21.1)

| Regla | Detalle |
|-------|---------|
| Tarjetas | Solo `trade_cards[]` del view (subconjunto ejemplo) |
| Por tarjeta | Máximo **una** alerta |
| Campaña completa | **No** — 1697 trades es trabajo futuro |
| Resumen | Siempre `report_ready`; opcional `missing_measurement_notice`, `validation_failed` |

---

## Reglas de clasificación (trade card)

| Condición | `alert_type` |
|-----------|----------------|
| `candidate` + `warning_count > 0` | `candidate_with_warnings` |
| `candidate` + `warning_count = 0` | `candidate_review` |
| `wait` | `wait_context` |
| `reject` + `score < 70` | `reject_explanation` |
| `reject` + `score >= 70` | `high_score_reject_review` |

---

## Esquema alerta (`mapazapp_alert_review_v1`)

Campos obligatorios: `alert_id`, `created_at_utc`, `source_bundle`, `symbol`, `timeframe`, `mode=read_only_review`, `alert_type`, `decision`, `decision_label`, `score`, `grade`, `blocker_or_main_reason`, `warning_count`, `top_reasons`, `casebook_refs`, `title`, `message`, `governance_footer[]`, `severity`, `delivery_status=queued_local_only`.

---

## Pie de gobernanza (ES)

Cada alerta incluye las 8 líneas definidas en E5.21 §6 (read-only, score no permiso, sin live, sin gates, entry 50 % CE, TP RR2, edge research-only, revisión manual).

---

## Wording prohibido

El formatter valida en runtime y los tests comprueban ausencia de frases de ejecución (lista `FORBIDDEN_ALERT_WORDING` en core).

---

## Validación

```bash
pnpm run typecheck
pnpm --filter @workspace/mapazapp-core test
pnpm --filter @workspace/scripts test
```

---

## Siguiente recomendado

**E5.21.1.1** — **PASS** — [`ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md`](./ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md): 12 alertas SET001; JSONL + summary local.

**Siguiente recomendado:** **E5.21.2** — gestor cola JSONL (estados) o decisión roadmap PM.

**Referencias:** [`READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md`](./READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md), [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md).
