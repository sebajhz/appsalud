# Dashboard Read-only Mock — Evidencia operador E5.20.4.1

## Alcance

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20.4.1 — evidencia operador del CLI `mapazapp:dashboard-readonly-mock` |
| **Baseline Git (código)** | `f944745` o posterior — `feat(mapazapp): E5.20.4 add dashboard read-only mock` |
| **Entrada** | `dashboard_readonly_view.json` de E5.20.3.1 (SET001) |
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Build TestEA** | `MZP_TestEA_E5_18` |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, Strategy Tester, trading, gates, cálculos de informe/adaptador |

Este documento registra el **run operador** del generador mock HTML read-only sobre la vista JSON real producida por E5.20.3.1. Los artefactos HTML/metadata permanecen en `*_DO_NOT_COMMIT` (no commitear).

**Referencia implementación:** [`DASHBOARD_READONLY_MOCK_E5_20_4.md`](./DASHBOARD_READONLY_MOCK_E5_20_4.md)  
**Vista fuente:** [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md)

---

## Comando

Desde `APP/`:

```bash
pnpm --filter @workspace/scripts mapazapp:dashboard-readonly-mock -- \
  --view-json "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_3_1_dashboard_readonly_adapter_DO_NOT_COMMIT\dashboard_readonly_view.json" \
  --output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_4_1_dashboard_readonly_mock_DO_NOT_COMMIT\dashboard_readonly_mock.html" \
  --metadata "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_20_4_1_dashboard_readonly_mock_DO_NOT_COMMIT\dashboard_readonly_mock_metadata.json" \
  --language es \
  --json
```

| Campo | Valor |
|-------|-------|
| **Exit code** | `0` |
| **Salida local HTML** | `_local_E5_20_4_1_dashboard_readonly_mock_DO_NOT_COMMIT/dashboard_readonly_mock.html` |
| **Salida local metadata** | `_local_E5_20_4_1_dashboard_readonly_mock_DO_NOT_COMMIT/dashboard_readonly_mock_metadata.json` |

---

## Entrada (artefacto local, no commitear)

| Archivo | Ruta relativa |
|---------|----------------|
| Vista adaptador E5.20.3.1 | `_local_E5_20_3_1_dashboard_readonly_adapter_DO_NOT_COMMIT/dashboard_readonly_view.json` |

---

## Resumen JSON stdout (`--json`)

| Campo | Valor |
|-------|-------|
| `generator_version` | `mapazapp_dashboard_readonly_mock_v1` |
| `schema_version` | `mapazapp_dashboard_readonly_view_v1` |
| `ok` | `true` |
| `bundle` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `trade_count` | `1697` |
| `trade_cards_rendered` | `10` |
| `read_only` | `true` |
| `no_live_trading` | `true` |
| `no_gates` | `true` |
| `has_governance_banner` | `true` |
| `has_trade_cards` | `true` |
| `errors` | `[]` |
| `warnings` | `[]` |

---

## Verificación metadata persistido (`dashboard_readonly_mock_metadata.json`)

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `schema_version` | `mapazapp_dashboard_readonly_view_v1` |
| `bundle` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `trade_count` | `1697` |
| `trade_cards_rendered` | `10` |
| `output_html` | ruta absoluta al HTML generado (ver nota §Notas operador) |
| `read_only` / `no_live_trading` / `no_gates` | `true` / `true` / `true` |
| `has_governance_banner` / `has_trade_cards` | `true` / `true` |
| `errors` / `warnings` | `[]` / `[]` |

---

## Comprobaciones HTML (operador)

| Criterio | Resultado |
|----------|-----------|
| `<meta charset="utf-8"/>` presente | OK |
| Texto read-only / solo lectura | OK |
| Texto sin gates | OK |
| Entry oficial 50 % / CE | OK |
| TP RR2 | OK |
| Wording candidato / rechazo | OK |
| Referencias casebook / HA | OK |
| Sin `submit`, `POST`, `OrderSend`, `CTrade`, `PositionOpen` | OK |
| Sin botones/acciones de ejecución | OK |

---

## Revisión visual en navegador

| Sección | Contenido verificado |
|---------|----------------------|
| **Header** | Mapazapp — Dashboard read-only (mock); badges Solo lectura / Investigación-backtest / Sin trading en vivo / Sin gates; bundle, build, XAUUSD/M15, 1697 trades, entry 50%/CE, TP RR2 |
| **Banner gobernanza** | Puntaje no es permiso; sin live; sin gates; entry/TP oficiales sin cambio; edge/25/adaptive research-only |
| **Resumen campaña** | candidate 247, wait 150, reject 1300, unknown 0; subconjunto tarjetas ejemplo separado |
| **Tablas bloqueadores** | structure_conflict, ifvg_conflict, pd_conflict, etc. |
| **Tablas advertencias** | target_before_liquidity, overtrading_warning, environment_weak, discipline_warning, entry_fragile |
| **Tarjetas trade** | 10 tarjetas ejemplo: decisión, score, grade, blocker/main reason, reasons, outcome con disclaimer backtest/investigación, notas read-only |
| **Casebook humanizado** | HA activos; HA-007/HA-008 missing measurement; HA-001/HA-002/HA-010 policy-only |
| **UTF-8 español** | Etiquetas españolas correctas en navegador (sin mojibake) |

---

## Notas operador (no bloqueantes)

1. **Regex PowerShell `No live trading|sin live`:** la expresión devolvió `Has_NoLive=False` porque el HTML usa **«Sin trading en vivo»**. Es un fallo de patrón de validación en consola, **no** del mock.
2. **Campo `$Meta.output` vacío en display:** el CLI compacto expone `output_html`, no `output`. El metadata persistido incluye `output_html` correctamente.
3. **Sin cambio de código** requerido para cerrar E5.20.4.1.

---

## Decisión PASS

| Criterio | Resultado |
|----------|-----------|
| Generador produce HTML + metadata válidos | OK — `ok=true`, `errors=[]` |
| Schema / bundle / trade_count alineados con vista E5.20.3.1 | OK — 1697 trades, SET001 |
| 10 tarjetas ejemplo renderizadas | OK — `trade_cards_rendered=10` |
| Gobernanza read-only en HTML | OK — banner, sin live, sin gates, entry 50 % CE, TP RR2 |
| Sin superficie de ejecución en HTML | OK — sin POST/OrderSend/botones |
| UTF-8 correcto en navegador | OK — español legible |
| Mock no recalcula decisión/score/readiness | OK — capa presentación únicamente |

**Veredicto:** **PASS** — evidencia técnica y visual operador para E5.20.4.1.

---

## Interpretación

- El mock entrega **HTML estático legible** a partir de `dashboard_readonly_view.json` sin modificar lógica upstream.
- Los conteos de campaña (247/150/1300/0) provienen del adaptador; las 10 tarjetas son **ilustrativas**.
- El mock **no** implementa trading, gates, alertas operativas ni aprobación de edge.
- Casebook HA se muestra como **referencia de política**, no señal de entrada.

---

## Flujo completado

```text
_local_E5_20_3_1_*/dashboard_readonly_view.json
  → mapazapp:dashboard-readonly-mock
  → _local_E5_20_4_1_*/dashboard_readonly_mock.html
  → revisión navegador (UTF-8, gobernanza, sin ejecución)
```

Sigue **read-only**: sin MT5, sin Strategy Tester, sin trading, sin modificar vista fuente ni informe upstream.

---

## Referencias

- [`DASHBOARD_READONLY_MOCK_E5_20_4.md`](./DASHBOARD_READONLY_MOCK_E5_20_4.md)
- [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md)
- [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)

**Bloque E5.20 cerrado:** [`READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md`](./READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md).

**E5.21.1.1 evidencia PASS:** [`ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md`](./ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md). **Siguiente:** E5.21.2 cola JSONL (PM).
