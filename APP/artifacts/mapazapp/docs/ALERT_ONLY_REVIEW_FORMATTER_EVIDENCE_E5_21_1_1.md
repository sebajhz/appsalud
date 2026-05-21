# Alert-only Review Formatter — Evidencia operador E5.21.1.1

## Alcance

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.21.1.1 — evidencia operador del CLI `mapazapp:alert-only-review` |
| **Baseline Git (código)** | `f061fce` o posterior — `feat(mapazapp): E5.21.1 add alert-only review formatter` |
| **Entrada** | `dashboard_readonly_view.json` de E5.20.3.1 (SET001) |
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Symbol / TF** | `XAUUSD` / `M15` |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, Strategy Tester, Telegram, email, push, trading, gates |

Este documento registra el **run operador** del formatter alert-only sobre la vista JSON real de E5.20.3.1. Los artefactos JSONL/summary permanecen en `*_DO_NOT_COMMIT` (no commitear).

**Referencia implementación:** [`ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md`](./ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md)  
**Contrato:** [`ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md`](./ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md)  
**Vista fuente:** [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md)

---

## Comando

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:alert-only-review -- \
  --view-json "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_3_1_dashboard_readonly_adapter_DO_NOT_COMMIT\dashboard_readonly_view.json" \
  --output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_1_1_alert_only_review_DO_NOT_COMMIT\alert_review_queue.jsonl" \
  --summary-output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_1_1_alert_only_review_DO_NOT_COMMIT\alert_review_summary.json" \
  --language es \
  --json
```

| Campo | Valor |
|-------|-------|
| **Exit code** | `0` |
| **Cola local** | `_local_E5_21_1_1_alert_only_review_DO_NOT_COMMIT/alert_review_queue.jsonl` |
| **Resumen local** | `_local_E5_21_1_1_alert_only_review_DO_NOT_COMMIT/alert_review_summary.json` |

---

## Entrada (artefacto local, no commitear)

| Archivo | Ruta relativa |
|---------|----------------|
| Vista adaptador E5.20.3.1 | `_local_E5_20_3_1_dashboard_readonly_adapter_DO_NOT_COMMIT/dashboard_readonly_view.json` |

---

## Resumen JSON stdout (`--json`)

| Campo | Valor |
|-------|-------|
| `schema_version` | `mapazapp_alert_review_summary_v1` |
| `ok` | `true` |
| `source_bundle` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `symbol` | `XAUUSD` |
| `timeframe` | `M15` |
| `alerts_generated` | `12` |
| `read_only` | `true` |
| `no_live_trading` | `true` |
| `no_gates` | `true` |
| `delivery` | `queued_local_only` |
| `errors` | `[]` |
| `warnings` | `[]` |

---

## Resumen persistido (`alert_review_summary.json`)

| Campo | Valor |
|-------|-------|
| `alerts_generated` | `12` |
| **by_type** | `report_ready` 1 · `missing_measurement_notice` 1 · `high_score_reject_review` 5 · `candidate_with_warnings` 2 · `wait_context` 1 · `reject_explanation` 2 |
| **by_decision** | `n/a` 2 · `reject` 7 · `candidate` 2 · `wait` 1 |
| `scope_note` | Solo `trade_cards[]` ejemplo; campaña 1697 = futuro |

Coherencia: 2 resumen (`n/a`) + 10 tarjetas ejemplo = 12 alertas. Las 10 tarjetas coinciden con `trade_cards_count=10` en evidencia E5.20.3.1.

---

## Validación cola JSONL

| Criterio | Resultado |
|----------|-----------|
| `Total_Alerts` | `12` |
| `All_ReadOnly_Mode` | `true` — todas `mode=read_only_review` |
| `All_LocalOnly` | `true` — todas `delivery_status=queued_local_only` |
| `All_Have_Governance_Footer` | `true` — 8 líneas en cada alerta |
| Una alerta por `trade_id` | OK — sin duplicados en tarjetas |

---

## Muestras observadas (primeras líneas JSONL)

| Orden | `alert_type` | Notas |
|-------|--------------|-------|
| 1 | `report_ready` | Resumen campaña; `severity=info` |
| 2 | `missing_measurement_notice` | `casebook_refs`: HA-007, HA-008 |
| 3 | `high_score_reject_review` | `trade_id` VTR_000001; score 90; `pd_conflict` |
| 4 | `candidate_with_warnings` | `trade_id` VTR_000003; `warning_count=3` |
| 5 | `high_score_reject_review` | `trade_id` VTR_000002 |
| … | *(7 alertas trade adicionales)* | wait / reject / candidate según reglas E5.21.1 |

Textos ES verificados en JSON (UTF-8 correcto): «Candidato — revisar advertencias», «Puntaje alto, pero rechazado por bloqueo crítico», «Esperar — contexto incompleto», etc.

---

## Pie de gobernanza

Cada alerta incluye las 8 líneas obligatorias E5.21, p. ej.:

- Solo revisión read-only.
- El puntaje no es permiso para operar.
- Sin trading en vivo.
- Sin gates de ejecución.
- Entrada oficial: 50% / CE.
- TP oficial: RR2.
- Edge / 25% / adaptive permanecen solo investigación.
- Revisión manual requerida.

---

## Wording prohibido

| Ámbito | Resultado |
|--------|-----------|
| Cola JSONL (`Queue_Forbidden_Found`) | `false` |
| Summary JSON (`Summary_Forbidden_Found`) | `false` |

Sin «Comprar ahora», «Ejecutar», «Entrada aprobada», «Gate aprobado», «Entrar ahora», etc.

---

## Nota de codificación (PowerShell / consola)

Las tablas `Format-Table` pueden mostrar **mojibake** en etiquetas españolas (p. ej. `Candidato â€"`). Los archivos JSONL/summary conservan UTF-8 correcto (`Candidato — revisar advertencias`). Tratar como **problema de visualización de consola**, no como fallo E5.21.1.1.

---

## Decisión PASS

| Criterio | Resultado |
|----------|-----------|
| CLI genera JSONL + summary válidos | OK — `ok=true`, exit 0 |
| 12 alertas alineadas con 10 tarjetas + 2 resumen | OK |
| Tipos y decisiones coherentes con E5.21.1 | OK |
| Gobernanza en todas las alertas | OK |
| Sin wording prohibido | OK |
| Sin envío / canales / ejecución | OK — `queued_local_only` |
| Candidate ≠ permiso de entrada | OK — mensajes explícitos |

**Veredicto:** **PASS** — evidencia técnica operador para E5.21.1.1.

---

## Interpretación

- El formatter produce una **cola local de revisión** a partir de la vista read-only ya generada.
- Las alertas son **prompts explicativos** para revisión manual, no señales de mercado.
- **No** se envían alertas; **no** hay Telegram, email ni push en este checkpoint.
- La campaña completa (1697 trades) **no** se alerta en E5.21.1 — solo el subconjunto `trade_cards[]`.

---

## Flujo completado

```text
_local_E5_20_3_1_*/dashboard_readonly_view.json
  → mapazapp:alert-only-review
  → _local_E5_21_1_1_*/alert_review_queue.jsonl
  → _local_E5_21_1_1_*/alert_review_summary.json
```

Sigue **read-only**: sin MT5, sin Strategy Tester, sin trading, sin modificar vista fuente.

---

## Referencias

- [`ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md`](./ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md)
- [`ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md`](./ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md)
- [`READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md`](./READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md)
- [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md)

**E5.21.2:** gestor de cola JSONL — [`ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md`](./ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md).

**E5.21.2.1:** evidencia cola **PASS** — [`ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md`](./ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md).

**Siguiente recomendado:** decisión roadmap PM — E5.21.3 panel o E5.21.4 Telegram review-only.
