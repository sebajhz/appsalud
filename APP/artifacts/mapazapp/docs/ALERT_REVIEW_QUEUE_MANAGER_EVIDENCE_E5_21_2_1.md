# Alert Review Queue Manager — Evidencia operador E5.21.2.1

## Alcance

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.21.2.1 — evidencia operador del CLI `mapazapp:alert-review-queue` |
| **Baseline Git (código)** | `14546dd` o posterior — `feat(mapazapp): E5.21.2 add local alert queue manager` |
| **Cola entrada** | `alert_review_queue.jsonl` de E5.21.1.1 (SET001, 12 alertas) |
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Symbol / TF** | `XAUUSD` / `M15` |
| **Veredicto** | **PASS** — evidencia técnica operador |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, Strategy Tester, Telegram, email, push, trading, gates |

Este documento registra el **run operador** del gestor de cola JSONL sobre la cola real generada en E5.21.1.1. Los artefactos JSONL de salida permanecen en `*_DO_NOT_COMMIT` (no commitear).

**Referencia implementación:** [`ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md`](./ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md)  
**Cola fuente:** [`ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md`](./ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md)  
**Contrato:** [`ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md`](./ALERT_ONLY_REVIEW_NOTIFICATIONS_PLAN_E5_21.md)

---

## Rutas (artefactos locales, no commitear)

| Rol | Ruta absoluta |
|-----|----------------|
| **Cola original** | `E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_1_1_alert_only_review_DO_NOT_COMMIT\alert_review_queue.jsonl` |
| **Directorio salida** | `E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_2_1_alert_queue_manager_DO_NOT_COMMIT\` |
| **Tras mark-reviewed** | `...\alert_review_queue.reviewed.jsonl` |
| **Tras dismiss** | `...\alert_review_queue.dismissed.jsonl` |
| **Tras archive-reviewed** | `...\alert_review_queue.archived.jsonl` |

---

## Resumen de comandos operador

Desde `APP/`:

| Paso | Acción | Entrada → Salida |
|------|--------|------------------|
| 1 | `--list --json` | Cola original |
| 2 | `--mark-reviewed` + `--review-note` | Original → `alert_review_queue.reviewed.jsonl` |
| 3 | `--dismiss` + `--review-note` | Reviewed → `alert_review_queue.dismissed.jsonl` |
| 4 | `--archive-reviewed` | Dismissed → `alert_review_queue.archived.jsonl` |

Todas las invocaciones usaron `--json` y **exit code 0** en el run exitoso documentado.

---

## 1. Listar cola original

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_1_1_alert_only_review_DO_NOT_COMMIT\alert_review_queue.jsonl" \
  --list \
  --json
```

| Campo | Valor |
|-------|-------|
| `schema_version` | `mapazapp_alert_review_queue_summary_v1` |
| `ok` | `true` |
| `total_alerts` | `12` |
| **by_status** | `new` 12 · `reviewed` 0 · `dismissed` 0 · `archived` 0 |
| `read_only_review` | `true` |
| `no_live_trading` | `true` |
| `no_gates` | `true` |
| `errors` | `[]` |
| `warnings` | `[]` |

---

## 2. Marcar revisado

**Alerta seleccionada:**

| Campo | Valor |
|-------|-------|
| `alert_id` | `e28c1f56-6439-4be1-835d-35a37f046b30` |
| `alert_type` | `candidate_with_warnings` |
| `decision` | `candidate` |

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_1_1_alert_only_review_DO_NOT_COMMIT\alert_review_queue.jsonl" \
  --output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_2_1_alert_queue_manager_DO_NOT_COMMIT\alert_review_queue.reviewed.jsonl" \
  --mark-reviewed "e28c1f56-6439-4be1-835d-35a37f046b30" \
  --review-note "Reviewed manually in E5.21.2.1 evidence" \
  --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `total_alerts` | `12` |
| **by_status** | `new` 11 · `reviewed` 1 · `dismissed` 0 · `archived` 0 |
| `updated_alert_ids` | `["e28c1f56-6439-4be1-835d-35a37f046b30"]` |
| `errors` | `[]` |
| `warnings` | `[]` |

---

## 3. Descartar

**Alerta seleccionada:**

| Campo | Valor |
|-------|-------|
| `alert_id` | `63e45eb4-c68d-492e-ada2-8d8d073a513f` |
| `alert_type` | `wait_context` |
| `decision` | `wait` |

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_2_1_alert_queue_manager_DO_NOT_COMMIT\alert_review_queue.reviewed.jsonl" \
  --output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_2_1_alert_queue_manager_DO_NOT_COMMIT\alert_review_queue.dismissed.jsonl" \
  --dismiss "63e45eb4-c68d-492e-ada2-8d8d073a513f" \
  --review-note "Dismissed manually in E5.21.2.1 evidence" \
  --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `total_alerts` | `12` |
| **by_status** | `new` 10 · `reviewed` 1 · `dismissed` 1 · `archived` 0 |
| `updated_alert_ids` | `["63e45eb4-c68d-492e-ada2-8d8d073a513f"]` |
| `errors` | `[]` |
| `warnings` | `[]` |

---

## 4. Archivar reviewed/dismissed

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_2_1_alert_queue_manager_DO_NOT_COMMIT\alert_review_queue.dismissed.jsonl" \
  --output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_21_2_1_alert_queue_manager_DO_NOT_COMMIT\alert_review_queue.archived.jsonl" \
  --archive-reviewed \
  --json
```

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `total_alerts` | `12` |
| **by_status** | `new` 10 · `reviewed` 0 · `dismissed` 0 · `archived` 2 |
| `updated_alert_ids` | `e28c1f56-6439-4be1-835d-35a37f046b30`, `63e45eb4-c68d-492e-ada2-8d8d073a513f` |
| `errors` | `[]` |
| `warnings` | `[]` |

---

## Validación cola final (`alert_review_queue.archived.jsonl`)

| Comprobación | Resultado |
|--------------|-----------|
| Líneas / alertas | `12` |
| **review_status** | `new` 10 · `archived` 2 |
| Alerta archivada (reviewed→archived) | `e28c1f56-…` · `candidate_with_warnings` · `candidate` · `review_note` presente |
| Alerta archivada (dismissed→archived) | `63e45eb4-…` · `wait_context` · `wait` · `review_note` presente |
| `delivery_status` en todas | `queued_local_only` |
| `governance_footer` en todas | presente (8 líneas) |
| Cola original intacta | sí — no se usó `--in-place` |

---

## Comprobaciones de seguridad

| Check | Resultado |
|-------|-----------|
| `Total_Alerts` | `12` |
| `All_LocalOnly` | `true` (`delivery_status` = `queued_local_only`) |
| `All_Have_Governance_Footer` | `true` |
| `Forbidden_Found` | `false` |
| `Original_Queue_Still_Exists` | `true` |
| `Reviewed_Output_Exists` | `true` |
| `Dismissed_Output_Exists` | `true` |
| `Archived_Output_Exists` | `true` |

---

## Nota operador: intento con `--summary-output`

El primer intento incluyó `--summary-output`, flag **no soportado** por `mapazapp:alert-review-queue` (heredado mentalmente del formatter E5.21.1). El CLI respondió:

```text
Unknown argument: --summary-output
```

**No es fallo de producto.** La evidencia se reejecutó sin ese flag; todos los pasos documentados arriba completaron con `ok: true`.

---

## Interpretación y veredicto

| Criterio | Estado |
|----------|--------|
| Lista cola local sin mutar | PASS |
| Marca `reviewed` con nota y timestamps | PASS |
| Descarta alerta `wait` sin cambiar decisión/título | PASS |
| Archiva solo reviewed/dismissed | PASS |
| Preserva gobernanza y entrega local-only | PASS |
| No envía alertas / sin canales | PASS |
| No muta cola original por defecto | PASS |

**Veredicto: PASS** — evidencia técnica operador E5.21.2.1.

---

## Flujo completado

```text
_local_E5_21_1_1_*/alert_review_queue.jsonl
  → --list
  → alert_review_queue.reviewed.jsonl   (--mark-reviewed)
  → alert_review_queue.dismissed.jsonl  (--dismiss)
  → alert_review_queue.archived.jsonl   (--archive-reviewed)
```

Cola E5.21.1.1 sin modificar. Sigue **read-only**: sin MT5, sin Strategy Tester, sin trading, sin Telegram/email/push.

---

## Referencias

- [`ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md`](./ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md)
- [`ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md`](./ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md)
- [`ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md`](./ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md)

**E5.21.2.2:** realineación engine-first — [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md). **E5.21.3 / E5.21.4** pausados hasta PM. **Siguiente recomendado:** **E5.22** Latest TestEA Compile + MT5 Strategy Tester Evidence Refresh.
