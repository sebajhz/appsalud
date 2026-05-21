# BridgeEA / Dashboard Read-only Consumption Plan — E5.20

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.20 — plan de arquitectura / gobernanza (docs-only) |
| **Baseline Git** | `499843e` o posterior — `docs(mapazapp): E5.19.3 setup readiness report UX polish evidence` |
| **Bloque cerrado upstream** | Detection / Readiness / Report V1 (E5.18 → E5.19.3) |
| **Implementación** | **E5.20.1** índice — [`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md); **E5.20.2** informe latest valid — [`LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_E5_20_2.md); **E5.20.2.1 evidencia PASS** — [`LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md`](./LATEST_VALID_REPORT_GENERATOR_CLI_EVIDENCE_E5_20_2_1.md); **E5.20.5** aceptación humanizada — [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md); **E5.20.3** adaptador — [`DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md`](./DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md); **E5.20.3.1 evidencia PASS** — [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md); **E5.20.4+** mock UI pendiente |
| **Referencia contrato UI** | [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md) |
| **Referencia informe CLI** | [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md) |

---

## 1. Por qué existe E5.20

Tras cerrar el bloque **Detection / Readiness / Report V1**, Mapazapp dispone de:

- Export TestEA con Setup Readiness Checklist V1 (`E5.18`).
- Política de decisión y contrato de presentación (`E5.18.4`, `E5.18.5`).
- Generador de informe read-only en CLI (`E5.19`–`E5.19.3`) con evidencia SET001 verificada.

**E5.20** define el **siguiente paso operacional**: cómo Mapazapp **consumirá de forma segura** bundles exportados (TestEA / futuro BridgeEA) y los informes derivados, para **mostrarlos al operador** en dashboard o vistas de revisión — **sin** ejecutar trades, **sin** gates automáticos y **sin** aprobar edge/entry/TP.

**Importante:** informes y dashboard son **capa de presentación**, no la humanización completa. La aceptación discrecional del setup está documentada en **E5.20.5** — [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md). **E5.20.3** (adaptador dashboard) consume informes y alinea casebook **E5.20.6** sin ejecutar aceptación.

Este checkpoint es un **corte de gobernanza** antes de cualquier trabajo de dashboard o adaptadores de datos. Responde: *¿qué entra, cómo se encuentra, cómo se valida, qué puede mostrar la UI y qué está prohibido?*

**Hechos verificados (referencia SET001, no re-ejecutar en E5.20):**

| Campo | Valor |
|-------|-------|
| Bundle | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| Build | `MZP_TestEA_E5_18` |
| `trade_count` | 1697 |
| `ok` | true |
| candidate / wait / reject | 247 / 150 / 1300 |
| `average_setup_readiness_score` | 65.06 |
| `minimum_display_unit_enforced` | true |
| `warnings_count` | 0 |

**Invariantes de producto (sin cambio en E5.20):**

- Entry oficial: **50 % / CE**.
- TP oficial: **RR2**.
- Edge / p25 / adaptive: **solo investigación**.
- Informe y futuro dashboard: **read-only**, sin gates, sin live trading.

---

## 2. Alcance

### Incluido (E5.20)

- Plan de arquitectura docs-only para consumo read-only BridgeEA / Dashboard.
- Modelo de descubrimiento de bundles, validación previa, generación de informes y contrato de consumo UI.
- Workflow operador V1 manual.
- Tracks de implementación futuros numerados (E5.20.x, E5.21, E5.22).
- Relación explícita con roadmap V2-16 … V2-20.

### Excluido (E5.20 y hasta aprobación explícita posterior)

| Exclusión | Notas |
|-----------|-------|
| Cambios MQL5 | Sin modificar `Mapazapp_TestEA.mq5` ni `Mapazapp_BridgeEA.mq5` |
| Cambios TypeScript de producto | Sin adaptadores, sin dashboard, sin nuevos CLI en este hito |
| MT5 / Strategy Tester | No ejecutar tester desde el repo en E5.20 |
| Implementación dashboard | Solo plan; mock/prototype en **E5.20.4** cuando se apruebe |
| Gates / alertas / live | Sin compuertas, sin `OrderSend`, sin envío de alertas operativas |
| Cambio de scoring / decisión / checklist | Congelado post E5.18.4 |
| Commit de artefactos locales | `*_DO_NOT_COMMIT` permanecen fuera de Git |

---

## 3. Inputs a consumir

Artefactos **soportados** para consumo futuro (dashboard, CLI índice, revisión humana):

| Artefacto | Rol | Consumidor primario |
|-----------|-----|---------------------|
| `backtest_summary.json` | Metadatos de run, flags de seguridad, contadores, build, schema | Validación + índice + header informe |
| `backtest_trades.csv` | Filas por trade/setup con columnas readiness | Informe + trade cards dashboard |
| `backtest_events.csv` | Trazabilidad de eventos (diagnóstico) | Investigación; no panel principal readiness |
| `setup_readiness_report.json` | Resumen normalizado + ejemplos + flags `minimum_display_unit_enforced` | **Dashboard (fuente primaria)** |
| `setup_readiness_report.md` | Revisión humana / diff / archivo | Operador, no parser UI obligatorio |
| `setup_readiness_report.html` | Revisión visual estática | Operador, no parser UI obligatorio |

**Regla:** el dashboard debe preferir **`setup_readiness_report.json`** cuando exista y sea coherente con el bundle validado; Markdown/HTML son vistas de revisión, no sustitutos del contrato estructurado.

**Generación de informes:** CLI existente `mapazapp:testea-setup-readiness-report` — ver [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md).

---

## 4. Modelo de descubrimiento de bundles

### Jerarquía de carpetas (convención objetivo)

```text
<configured_root>/                    # raíz operador (config / env / settings)
  <symbol_profile>/                   # p. ej. XAUUSD_M15_Profile_V1/
    <campaign_folder>/                # p. ej. E55, XAUUSD_OUTCOME_V1/
      <run_folder>/                   # hoja: contiene los 3 archivos canónicos
        backtest_summary.json
        backtest_events.csv
        backtest_trades.csv
```

- **Raíz configurada:** ruta absoluta definida por operador; CLI **`mapazapp:testea-bundle-index`** (`E5.20.1`). No hardcodear rutas MT5 `MQL5/Files` en el core sin capa de configuración.
- **Carpeta perfil/símbolo:** agrupa campañas del mismo `symbol` + `execution_timeframe` + política de ejecución ([`SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md`](./SYMBOL_TIMEFRAME_EXECUTION_PROFILE_POLICY_E5_16_4.md)).
- **Carpeta campaña:** alineada a `campaign_id` / `InpExportCampaignFolder` (E5.5.0+).
- **Carpeta run (hoja):** contiene exactamente el triple E3.6/E4.1; puede ser anidada bajo rutas cortas de optimización ([`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md)).

### Detección del último run válido

Criterios **obligatorios** para considerar un run “latest valid” dentro de un perfil/campaña:

1. Los tres archivos canónicos existen y son legibles.
2. `mapazapp:testea-export-validate` devuelve `ok: true` (warnings documentados permitidos si política del operador lo acepta; errores → descartar).
3. `readOnly === true` y `executionEnabled === false` en summary (o equivalentes documentados en schema).
4. `has_real_trading_orders === false`.
5. Sin headers CSV duplicados (E5.17.1.1).
6. `schema_version` / `ea_build` compatibles con el build mínimo aceptado por la herramienta de consumo.
7. Para vistas **Setup Readiness:** `has_setup_readiness_checklist_v1_logic === true`.

**Orden de preferencia entre runs válidos:**

1. `created_at` / timestamp de export en summary (si existe).
2. Si empate o ausencia: `mtime` de `backtest_summary.json` en disco.
3. Si ambigüedad persiste: **no** auto-promover; exigir selección explícita del operador.

### Evitar runs obsoletos (stale)

| Riesgo | Mitigación planificada |
|--------|------------------------|
| Run antiguo con build obsoleto | Índice guarda `ea_build`; UI muestra badge “build mismatch” si ≠ build mínimo soportado |
| Carpeta parcial / export corrupto | Validación E4.1 obligatoria antes de indexar |
| Duplicado de `parameter_set_id` con distintas fechas | Índice por `(profile, campaign, parameter_set_id, run_id)` — no sobrescribir silenciosamente |
| Informe JSON de otro bundle | Hash o `bundle` + `run_id` en header del informe debe coincidir con summary del run seleccionado |

---

## 5. Modelo de validación

**Antes** de indexar, generar informe o alimentar dashboard:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<RunDir>" --json
```

### Checklist obligatorio (consumo readiness)

| Check | Fuente | Requerido para dashboard readiness |
|-------|--------|-----------------------------------|
| `ok === true` | CLI JSON | Sí |
| `readOnly === true` | summary | Sí |
| `executionEnabled === false` | summary | Sí |
| `has_real_trading_orders === false` | summary | Sí |
| Headers CSV duplicados ausentes | validador trades | Sí |
| Schema / build compatibility | summary + política de versión | Sí |
| `has_setup_readiness_checklist_v1_logic === true` | summary | Sí (vistas readiness) |

### Estados derivados para índice (propuesta)

| Estado | Significado |
|--------|-------------|
| `valid` | Pasa checklist; apto para informe y dashboard |
| `valid_warnings` | Pasa checklist con warnings documentados (p. ej. `BUNDLE_EVENTS_LARGE`) |
| `invalid` | No consumir en UI automática |
| `stale` | Válido pero superseded por run más reciente del mismo `parameter_set_id` |
| `report_missing` | Bundle válido sin `setup_readiness_report.json` — ofrecer generación CLI |

**Referencia:** [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md).

---

## 6. Modelo de generación de informes

### Flujo operador (E5.20.2 implementado)

```text
1. mapazapp:testea-bundle-index (o índice existente)
2. mapazapp:testea-latest-valid-report — selección latest_valid + re-validación + informe E5.19
3. Artefactos en --output-dir local *_DO_NOT_COMMIT
4. Dashboard lee setup_readiness_report.json (E5.20.3+)
5. Revisión humana .md / .html opcional
```

### Comando recomendado (E5.20.2)

```bash
pnpm --filter @workspace/scripts mapazapp:testea-latest-valid-report -- \
  --root "<TestEaRoot>" \
  --output-dir "<local>_DO_NOT_COMMIT" \
  --symbol XAUUSD --timeframe M15 \
  --json
```

### Comando manual por bundle (E5.19)

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-readiness-report -- \
  --bundle "<RunDir>" \
  --markdown-output "<local>/setup_readiness_report.md" \
  --json-output "<local>/setup_readiness_report.json" \
  --html-output "<local>/setup_readiness_report.html" \
  --max-examples 10 \
  --language es
```

### Reglas de artefactos

- **No** commitear rutas `*_DO_NOT_COMMIT` ni CSV/JSON/HTML de runs reales salvo evidencia docs explícita del PM.
- El informe regenerado debe preservar `minimum_display_unit_enforced: true`.
- Si `ok=false` en generación, no publicar en dashboard sin `--strict` override documentado.

---

## 7. Contrato de consumo del dashboard

El dashboard (cuando se implemente) **debe** cumplir [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md) sin excepción.

### Unidad mínima de display (resumen)

En la misma vista visible, **siempre**:

- `setup_readiness_decision` (badge primario)
- `setup_readiness_score`
- `setup_readiness_grade`
- `setup_readiness_primary_blocker` (+ contadores blocker/warning)
- `setup_readiness_reasons` (lista)

**Prohibido:** score aislado, “Approved”, “Perfect trade”, color verde solo por score ≥ 70.

### Wording obligatorio

- **Candidate:** “Candidate — review warnings” / sub-badge *Candidate with warnings* cuando `warning_count > 0`.
- **High-score reject:** badge Reject + etiqueta High score + blocker humanizado + tooltip de gobernanza.
- **Outcome:** solo en modo `backtest_research`; **nunca** en vista live.

### Objetos de consumo (desde `setup_readiness_report.json`)

Alinear con `SetupReadinessTradeView` y `SetupReadinessCampaignSummary` definidos en E5.18.5 §9. El adaptador de datos (`E5.20.3`) mapea JSON del informe → vistas UI sin recalcular decisión/score.

---

## 8. Multi-símbolo / perfil

Cada perfil se evalúa **de forma independiente** bajo gobernanza; no optimizar ni rankear símbolos en un único panel sin contexto explícito.

| Profile ID | Símbolo / TF | Contexto planificado |
|------------|--------------|----------------------|
| `XAUUSD_M15_Profile_V1` | XAUUSD M15 | Laboratorio principal; referencia SET001 |
| `EURUSD_M15_Profile_V1` | EURUSD M15 | Perfil FX mayor |
| `BTCUSD_M15_Profile_V1` | BTCUSD M15 | Perfil cripto — spread/volatilidad |
| `NAS100_M15_Profile_V1` | NAS100 M15 | Perfil índice |

### Por perfil, el índice/dashboard debe poder mostrar

| Dimensión | Contenido |
|-----------|-----------|
| Bundle root | Ruta configurada |
| Latest valid run | `run_id`, build, fecha |
| Readiness distribution | candidate / wait / reject, avg score |
| Blocker distribution | leaderboard `primary_blocker` |
| Environment | grades / weak share (E5.16) |
| Target quality | grades, warnings `target_before_liquidity` |
| Discipline | overtrading warnings, discipline grade |

**Prohibido:** tabla única “mejor símbolo por profit” como criterio de promoción.

---

## 9. Almacenamiento / persistencia (futuro)

### Fase 1 — Sin base de datos (recomendado inicial)

- Índice **JSON o YAML local** (`bundles.index.json`) bajo raíz configurada.
- Entradas: metadata only — **no** duplicar CSV masivos en el índice.

### Fase 2 — SQLite (alineado V2-18)

Campos mínimos por run:

| Campo | Uso |
|-------|-----|
| `run_id` | Clave |
| `symbol`, `timeframe` | Perfil |
| `ea_build`, `campaign_id`, `parameter_set_id` | Trazabilidad |
| `created_at` | Ordenación |
| `valid_status` | valid / invalid / stale |
| `report_json_path` | Puntero al informe |
| `validation_json_path` | Opcional: snapshot último validate |

**Regla:** persistir **metadatos y rutas**, no reemplazar el bundle fuente en MT5/disco operador.

---

## 10. Guardarraíles de seguridad

El consumo BridgeEA / Dashboard permanece:

| Guardarraíl | Estado |
|-------------|--------|
| Read-only | Obligatorio |
| Sin `OrderSend` / `CTrade` / `PositionOpen` | Obligatorio |
| Sin `WebRequest` | Obligatorio salvo gobernanza explícita futura |
| Sin ejecución automatizada | Obligatorio |
| Sin aprobación funding / live mode | Obligatorio |
| Sin gates derivados del score | Obligatorio hasta checkpoint evidence-based separado |
| Sin promoción edge/entry/TP desde UI | Obligatorio |

Cualquier desviación requiere checkpoint de gobernanza y actualización de North Star / Parameter Governance.

---

## 11. Workflow operador V1 (manual)

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Strategy Tester — Mapazapp_TestEA exporta bundle         │
│    (operador humano; fuera del repo CI)                     │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. mapazapp:testea-export-validate --bundle <RunDir>        │
│    Verificar ok, readOnly, sin órdenes reales               │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. mapazapp:testea-setup-readiness-report                   │
│    Salida local *_DO_NOT_COMMIT (no commit)                │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Abrir HTML/MD para revisión; futuro: dashboard read-only │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Decisión de trading MANUAL fuera del sistema             │
│    (checklist = apoyo, no permiso)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Tracks de implementación futuros

| ID | Track | Entregable | Depende de |
|----|-------|------------|------------|
| **E5.20.1** | Local bundle index CLI | **Done** — [`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md) | E5.20 aprobado |
| **E5.20.1.1** | Index read-only derivation fix + evidencia | **PASS** — [`LOCAL_BUNDLE_INDEX_CLI_EVIDENCE_E5_20_1_1.md`](./LOCAL_BUNDLE_INDEX_CLI_EVIDENCE_E5_20_1_1.md) | E5.20.1 |
| **E5.20.2** | Latest valid report generator CLI | validate + report — **done**; evidencia **PASS** E5.20.2.1 | E5.20.1 |
| **E5.20.5** | Humanized setup acceptance policy V1 | **Done — docs** — [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md); governance only | E5.20.2 |
| **E5.20.6** | Humanized acceptance casebook V1 | **Done — docs** — [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md); HA-001 … HA-010 | E5.20.5 |
| **E5.20.3** | Dashboard read-only data adapter | TS: JSON informe → `dashboard_readonly_view_v1` — **done** | E5.18.5, E5.20.2, **E5.20.5**, **E5.20.6** |
| **E5.20.3.1** | Adapter operator evidence | **PASS** — [`DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md`](./DASHBOARD_READONLY_ADAPTER_EVIDENCE_E5_20_3_1.md) | E5.20.3.0.2 |
| **E5.20.4** | Dashboard mock / prototype | UI read-only sin POST — **pendiente** | E5.20.3.1, aprobación PM |
| **E5.21** | Alert-only review notifications | Avisos explicativos, sin ejecución | V2-20, E5.20.4 |
| **E5.22** | Risk / prop firm mapping | Account guard enriquecido | V2-21 |
| *(diferido)* | Evidence-based gate / score decision | Compuertas solo con evidencia multi-bundle | Post E5.20.4 + calibraciones |

**Orden recomendado:** E5.20.1 → E5.20.2 → E5.20.5 → **E5.20.6** → E5.20.3 → E5.20.4 → E5.21.

---

## 13. Relación con el roadmap original

| Roadmap | Relación con E5.20 |
|---------|-------------------|
| **V2-16** Dashboard/API cleanup | Mock GET y tarjetas evidencia ya existen; E5.20 define cómo **añadir** readiness real sin romper read-only |
| **V2-17** Local import UI/CLI | E5.20.1/E5.20.2 son el camino CLI hacia import controlado de carpetas bundle |
| **V2-18** Persistence / SQLite | §9 de este plan alinea campos de índice con diseño SQLite futuro |
| **V2-19** Forward demo read-only | Consumo de archivos BridgeEA importados; mismos guardarraíles §10 |
| **V2-20** Alert-only review notifications | E5.21 — alertas explicativas, no triggers de ejecución |

**North Star / Governance:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

---

## Decisión de gobernanza (E5.20)

| Regla | Estado |
|-------|--------|
| Alcance | **Docs-only plan** |
| Implementación dashboard / CLI índice | **No** en E5.20 |
| Cambios MQL5 / scoring / decisión / entry / TP | **No** |
| Gates / live / edge approval | **No** |
| Artefactos `*_DO_NOT_COMMIT` en Git | **No** |

---

## Referencias

- Contrato UI: [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md)
- Informe CLI: [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md)
- Evidencia E5.19.3: [`SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md`](./SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md)
- Validación bundle: [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md)
- Roadmap V2: [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- Guía ejecución: [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- Handoff: [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- Humanized acceptance: [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- Casebook: [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
