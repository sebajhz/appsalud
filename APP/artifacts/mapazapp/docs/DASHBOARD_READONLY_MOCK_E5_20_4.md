# Dashboard Read-only Mock — E5.20.4

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.4 — mock / prototipo HTML read-only |
| **Baseline Git** | `4db3185` o posterior — E5.20.3.1 evidencia PASS |
| **Entrada** | `dashboard_readonly_view.json` (`mapazapp_dashboard_readonly_view_v1`) |
| **Salida** | `dashboard_readonly_mock.html` (+ metadata JSON opcional) |
| **Tipo** | Presentación / mock estático — **sin** MQL5, MT5, Strategy Tester, trading, gates |
| **Adaptador upstream** | [`DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md`](./DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md) |
| **Evidencia adaptador** | [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md) |
| **Evidencia mock (E5.20.4.1)** | [`DASHBOARD_READONLY_MOCK_EVIDENCE_E5_20_4_1.md`](./DASHBOARD_READONLY_MOCK_EVIDENCE_E5_20_4_1.md) — **PASS** |

---

## 1. Propósito

Generar un **HTML legible por humanos** a partir de la salida del adaptador E5.20.3. El mock **no** recalcula score, grade, decisión, readiness ni aceptación humanizada. **No** es integración con el dashboard live de Mapazapp.

**Elección de implementación:** no existe app `web/dashboard` activa en el repo; se implementó un **generador HTML estático** (core + CLI), alineado con el patrón de informes HTML de E5.19.

---

## 2. Módulos

| Ruta | Rol |
|------|-----|
| `APP/lib/mapazapp-core/src/dashboard-readonly-mock.ts` | Render HTML + parse view JSON |
| `APP/lib/mapazapp-core/tests/dashboard-readonly-mock.test.ts` | Tests Vitest |
| `APP/scripts/src/mapazapp-dashboard-readonly-mock.ts` | CLI |
| `APP/scripts/src/mapazapp-dashboard-readonly-mock.test.ts` | Tests CLI (`node:test`) |

**Script:** `pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-mock`

---

## 3. CLI

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-mock -- \
  --view-json "<path>/dashboard_readonly_view.json" \
  --output "<path>/dashboard_readonly_mock.html" \
  [--metadata "<path>/dashboard_readonly_mock.meta.json"] \
  [--language es|en] \
  [--json]
```

| Opción | Obligatorio | Descripción |
|--------|-------------|-------------|
| `--view-json` | Sí | Salida del adaptador E5.20.3 |
| `--output` | Sí | HTML UTF-8 (`<meta charset="utf-8"/>`) |
| `--metadata` | No | JSON compacto de generación |
| `--language` | No | `es` (default) o `en` |
| `--json` | No | Resumen compacto en stdout |

---

## 4. Secciones renderizadas

1. **Header** — Mapazapp, badges read-only / backtest, bundle, build, symbol/TF, trade_count, entry 50 % / CE, TP RR2, sin live / sin gates.
2. **Banner de gobernanza** — puntaje no es permiso; sin live; sin gates; entry/TP oficiales; edge/25/adaptive research-only.
3. **Resumen campaña** — conteos desde `decision_summary` (campaña); `trade_card_decision_summary` etiquetado como solo tarjetas ejemplo.
4. **Bloqueadores / advertencias** — `blocker_summary` y `warning_summary`; “Sin datos disponibles” si vacío.
5. **Tarjetas trade** — `trade_cards[]` con unidad mínima de display; badges high-score reject y candidate-with-warnings; `Motivo principal` cuando `primary_blocker=none`.
6. **Casebook** — refs HA con disclaimer “Referencia de política / casebook, no señal de entrada.”
7. **Outcome** — si presente, etiquetado “solo investigación / backtest”.

**Prohibido en HTML:** botones de ejecución, POST, OrderSend, gates, trading live.

---

## 5. Flujo operador recomendado

```text
E5.20.2.1 → setup_readiness_report.json
E5.20.3   → dashboard_readonly_view.json
E5.20.4   → dashboard_readonly_mock.html   (abrir en navegador)
```

Artefactos locales en `*_DO_NOT_COMMIT` — no commitear.

---

## 6. Validación

```bash
pnpm run typecheck
pnpm --filter @workspace/scripts test
pnpm --filter @workspace/mapazapp-core test
```

---

## 7. Evidencia operador y siguiente

**E5.20.4.1** — **PASS** — [`DASHBOARD_READONLY_MOCK_EVIDENCE_E5_20_4_1.md`](./DASHBOARD_READONLY_MOCK_EVIDENCE_E5_20_4_1.md): HTML desde `dashboard_readonly_view.json` real (SET001); UTF-8 verificado en navegador.

**Siguiente recomendado:** **E5.21** — alert-only review notifications (sin ejecución).
