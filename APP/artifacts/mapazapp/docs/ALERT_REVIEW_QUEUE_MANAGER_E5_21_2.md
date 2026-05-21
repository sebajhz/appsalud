# Alert Review Queue Manager — E5.21.2

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.21.2 — gestor local de cola JSONL (estados de revisión únicamente) |
| **Baseline Git** | `88f65a6` o posterior — E5.21.1.1 evidencia PASS |
| **Entrada** | `alert_review_queue.jsonl` (salida E5.21.1) |
| **Salida** | Cola JSONL actualizada (copia por defecto; `--in-place` opcional) |
| **Sin envío** | No Telegram, email, push, MT5, broker APIs, trading, gates |
| **Evidencia operador (E5.21.2.1)** | [`ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md`](./ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md) — **PASS** |

---

## Módulos

| Ruta | Rol |
|------|-----|
| `APP/lib/mapazapp-core/src/alert-review-queue.ts` | Carga JSONL, estados, validación wording, resumen |
| `APP/lib/mapazapp-core/tests/alert-review-queue.test.ts` | Tests Vitest |
| `APP/scripts/src/mapazapp-alert-review-queue.ts` | CLI |
| `APP/scripts/src/mapazapp-alert-review-queue.test.ts` | Tests CLI (`node:test`) |

**Script:** `pnpm --filter @workspace/scripts mapazapp:alert-review-queue`

---

## Estados soportados

| Estado | Descripción |
|--------|-------------|
| `new` | Default si `review_status` ausente |
| `reviewed` | Revisado manualmente (`--mark-reviewed`) |
| `dismissed` | Descartado (`--dismiss`) |
| `archived` | Archivado (`--archive-reviewed` sobre reviewed/dismissed) |

Campos de revisión añadidos/actualizados:

- `review_status`
- `reviewed_at_utc` (si reviewed)
- `dismissed_at_utc` (si dismissed)
- `archived_at_utc` (si archived)
- `review_note` (si `--review-note` proporcionado)
- `updated_at_utc` (en cada mutación)

---

## CLI

Desde `APP/`:

### Listar

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "<path>/alert_review_queue.jsonl" \
  --list \
  --json
```

### Marcar revisado

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "<path>/alert_review_queue.jsonl" \
  --output "<path>/alert_review_queue.updated.jsonl" \
  --mark-reviewed "<alert_id>" \
  --review-note "Reviewed manually" \
  --json
```

### Descartar

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "<path>/alert_review_queue.jsonl" \
  --output "<path>/alert_review_queue.updated.jsonl" \
  --dismiss "<alert_id>" \
  --review-note "Not relevant" \
  --json
```

### Archivar reviewed/dismissed

```bash
pnpm --filter @workspace/scripts mapazapp:alert-review-queue -- \
  --queue "<path>/alert_review_queue.jsonl" \
  --output "<path>/alert_review_queue.updated.jsonl" \
  --archive-reviewed \
  --json
```

| Opción | Descripción |
|--------|-------------|
| `--queue` | Cola JSONL de entrada (obligatorio) |
| `--output` | Ruta de salida (obligatorio en mutaciones salvo `--in-place`) |
| `--in-place` | Sobrescribe `--queue` (no usar con `--output`) |
| `--list` | Solo listar / resumen |
| `--mark-reviewed` / `--dismiss` / `--archive-reviewed` | Una mutación por invocación |
| `--review-note` | Nota opcional en mutación |
| `--skip-invalid` | Omite líneas JSONL inválidas con warning |
| `--force` | Permite review/dismiss en alertas `archived` |
| `--json` | Resumen compacto en stdout |

**Default:** no muta la cola de entrada; escribe `--output` salvo `--in-place`.

---

## Resumen (`mapazapp_alert_review_queue_summary_v1`)

```json
{
  "schema_version": "mapazapp_alert_review_queue_summary_v1",
  "ok": true,
  "queue_path": "...",
  "output_path": "...",
  "total_alerts": 0,
  "by_status": { "new": 0, "reviewed": 0, "dismissed": 0, "archived": 0 },
  "updated_alert_ids": [],
  "read_only_review": true,
  "no_live_trading": true,
  "no_gates": true,
  "errors": [],
  "warnings": []
}
```

---

## Gobernanza preservada

- Campos originales de alerta intactos (`alert_type`, `decision`, `title`, `message`, etc.)
- `governance_footer` sin cambios
- `delivery_status` permanece `queued_local_only`
- Validación de **forbidden wording** reutilizada de E5.21.1 (`FORBIDDEN_ALERT_WORDING`)
- Sin red, sin MT5, sin ejecución, sin gates

---

## Validación

Desde `APP/`:

```bash
pnpm run typecheck
pnpm --filter @workspace/mapazapp-core test
pnpm --filter @workspace/scripts test
```

---

## Siguiente recomendado

**E5.21.2.1:** evidencia operador **PASS** — [`ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md`](./ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md). **Siguiente:** E5.21.3 panel read-only o E5.21.4 Telegram (PM).
