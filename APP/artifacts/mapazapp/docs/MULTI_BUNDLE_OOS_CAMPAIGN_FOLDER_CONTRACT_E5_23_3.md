# Multi-bundle / OOS Campaign Folder Contract — E5.23.3

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.23.3 — contrato carpetas campaña multi-bundle / OOS / walk-forward |
| **Tipo** | Contract / design — **sin implementación** |
| **Baseline Git** | `4f9fd02` o posterior — `docs(mapazapp): E5.23.2 design SET001 optimization comparison matrix` |
| **Perfil lab** | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) |
| **Matriz** | [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) |
| **Gobernanza padre** | [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) |
| **Decisión** | **Docs-only folder contract** — organiza evidencia futura; **no** ejecuta campañas |
| **E5.23.4** | [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md) — **cerrado (docs)** |
| **E5.24** | [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md) — **cerrado (plan docs)** |
| **Siguiente** | E5.24.1 ejecución evidencia |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe E5.23.3

**E5.23.2** definió la [matriz de comparación](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) con filas A–E y columnas obligatorias.

Sin un **contrato de carpetas y evidencia**, la matriz no puede poblarse de forma confiable:

| Riesgo sin contrato | Consecuencia |
|---------------------|--------------|
| IS y OOS en la misma carpeta sin etiqueta | Curve-fitting invisible |
| Sobrescritura de exports ST | Evidencia stale o perdida |
| Reportes mezclados con raw bundles | Contaminación de fuente de verdad |
| Nombres vagos (`run2`, `test_new`) | Matriz referencia carpetas, no `bundle_id` |

**E5.23.3** define cómo organizar exports del Strategy Tester, corridas de optimización, OOS, ventanas walk-forward, informes, audits y artefactos de matriz para `XAUUSD_M15_Profile_V1` y perfiles futuros — **sin mezclar evidencia**.

**No migra** carpetas MT5 existentes en esta tarea; es diseño/contract hasta que una tarea operativa lo apruebe.

---

## 2. Alcance

| Incluido | Excluido |
|----------|----------|
| Layout propuesto, naming, metadata, run roles | Ejecutar MT5 / ST / optimizador |
| Reglas OOS/WF, anti-contaminación | Implementar CLI scaffold/index/validate |
| Relación índice local + matriz E5.23.2 | Cambios MQL5, gates, live, entry/TP |
| Artefactos `_DO_NOT_COMMIT` vs docs repo | Aprobación edge/25/adaptive |

---

## 3. Principios de carpetas de campaña

| # | Principio |
|---|-----------|
| 1 | **Una carpeta de campaña** por `profile_id` + `campaign_id` |
| 2 | **Una carpeta de bundle** por corrida Strategy Tester (export crudo) |
| 3 | **Nunca sobrescribir** evidencia validada — nueva corrida = nueva carpeta |
| 4 | **Nunca mezclar** IS / OOS / WF en la misma carpeta sin `run_role` explícito |
| 5 | Cada bundle conserva **`backtest_summary.json`**, **`backtest_trades.csv`**, **`backtest_events.csv`** intactos |
| 6 | Reportes/audits generados → `_local_*_DO_NOT_COMMIT` **o** docs/evidencia versionados en repo con aprobación PM |
| 7 | Inputs de matriz referencian **`bundle_id`** + metadata — no nombres vagos |
| 8 | `has_real_trading_orders` debe ser **false** en exports TestEA de investigación |

---

## 4. Layout propuesto (raíz de campaña)

Diseño futuro bajo terminal MetaTrader (ejemplo lógico; ruta física puede variar por agente):

```text
Mapazapp/TestEA/
  XAUUSD_M15_Profile_V1/
    campaigns/
      MZP_XAUUSD_M15_E5_23_CAMPAIGN_001/
        00_profile/              # metadata campaña, notas PM, constraints
        01_in_sample/            # bundles IS_BASELINE, IS_OPTIMIZATION_CANDIDATE
        02_out_of_sample/        # bundles OOS_VALIDATION
        03_walk_forward/         # WF01, WF02, … (subcarpetas por ventana)
        04_reports/              # readiness reports (derivados, versionados)
        05_audits/               # baseline audit, casebook, delta (derivados)
        06_matrix/               # optimization_comparison_matrix.* (derivados)
        99_notes/                # operador, hipótesis, decisiones
```

| Segmento | Contenido |
|----------|-----------|
| `00_profile` | `campaign_manifest.json` (futuro), enlaces a [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) |
| `01_in_sample` | Solo datos IS — optimización y baseline IS |
| `02_out_of_sample` | Solo OOS — parámetros fijados desde IS |
| `03_walk_forward` | Ventanas WF etiquetadas |
| `04_reports` | Salidas E5.19 readiness (no sustituyen raw bundle) |
| `05_audits` | E5.22.2.1 performance, E5.22.4 casebook, E5.22.5 delta |
| `06_matrix` | Salida E5.23.2 matrix |
| `99_notes` | Texto libre operador |

**Estado actual:** SET001 puede vivir fuera de este layout (p. ej. `TestEA/E55/SET001_...`) hasta migración aprobada. El contrato define el **objetivo**, no la migración inmediata.

---

## 5. Convención de nombres de bundle

### Patrón

```text
SET###_<feature>_<tp>_<bias>_<filters>_<variant>_<run_role_suffix>
```

| Componente | Ejemplo |
|------------|---------|
| `SET###` | `SET001`, `SET002` → `parameter_set_id` |
| Feature / FVG | `FVG2` |
| TP | `RR2_00` |
| Bias | `BIASBODY0` |
| Filtros | `RALIGN1` |
| Variant (opcional) | `EDGE`, `ENTRY25` — solo research |
| Run role suffix | `_OOS`, `_WF01`, `_IS_OPT` |

### Ejemplos

| `bundle_name` | Rol típico |
|---------------|------------|
| `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` | IS_BASELINE / official A |
| `SET002_FVG2_RR2_00_BIASBODY0_RALIGN1_OOS` | OOS_VALIDATION |
| `SET003_FVG2_RR2_00_BIASBODY0_RALIGN1_WF01` | WALK_FORWARD_WINDOW (forward leg) |
| `SET004_FVG2_RR2_00_BIASBODY0_RALIGN1_ENTRY_EDGE` | ENTRY_VARIANT_RESEARCH |

### Trazabilidad obligatoria

Cada carpeta debe mapear de forma única a:

- `profile_id` (p. ej. `XAUUSD_M15_Profile_V1`)
- `campaign_id` (p. ej. `MZP_XAUUSD_M15_E5_23_CAMPAIGN_001`)
- `parameter_set_id` (`SET001`)
- `ea_build` (`MZP_TestEA_E5_18`)
- `date_range` (start/end en metadata)
- `run_role` (ver §8)

`bundle_id` = nombre de carpeta del export **o** UUID estable en manifest si se renombra display.

---

## 6. Archivos obligatorios por bundle crudo

Todo bundle TestEA **válido** para indexación/matriz debe contener:

| Archivo | Obligatorio | Notas |
|---------|-------------|-------|
| `backtest_summary.json` | **Sí** | Métricas agregadas ST |
| `backtest_trades.csv` | **Sí** | Fuente trades / readiness |
| `backtest_events.csv` | **Sí** | Diagnóstico; puede ser grande |

### Opcionales recomendados (fuera del bundle o en `99_notes/`)

| Artefacto | Uso |
|-----------|-----|
| Referencia compile log | Trazabilidad `ea_build` |
| Referencia EX5 archivado | `Mapazapp_TestEA_MZP_TestEA_E5_xx.ex5` |
| Preset `.set` | Parámetros reproducibles |
| Notas operador | Hipótesis, filtros ST, caveats |

**Prohibido:** sustituir los tres archivos crudos por solo un informe derivado.

---

## 7. Metadata obligatoria por bundle

Archivo recomendado futuro: `bundle_manifest.json` junto al export o en `00_profile/` con puntero.

| Campo | Tipo / ejemplo | Obligatorio |
|-------|----------------|-------------|
| `profile_id` | `XAUUSD_M15_Profile_V1` | Sí |
| `campaign_id` | `MZP_XAUUSD_M15_E5_23_CAMPAIGN_001` | Sí |
| `bundle_id` | estable, único en campaña | Sí |
| `bundle_name` | nombre carpeta | Sí |
| `run_role` | ver §8 | Sí |
| `symbol` | `XAUUSD` | Sí |
| `timeframe` | `M15` | Sí |
| `htf_bias_timeframe` | `D1` | Sí |
| `ea_build` | `MZP_TestEA_E5_18` | Sí |
| `parameter_set_id` | `SET001` | Sí |
| `strategy_id` | p. ej. `MZP_IFVG_XAUUSD_V1` | Sí |
| `entry_model` | `official_50_ce` \| research tag | Sí |
| `tp_model` | `RR2` | Sí |
| `date_range_start` | ISO date | Sí |
| `date_range_end` | ISO date | Sí |
| `sample_segment` | `in_sample` \| `out_of_sample` \| `wf_forward` \| `wf_in_sample` | Sí |
| `walk_forward_window` | `WF01` \| null | Si WF |
| `parent_is_bundle_id` | bundle IS origen (OOS/WF) | Si OOS/WF |
| `created_at_utc` | timestamp | Sí |
| `source_terminal_id` | hash agente MT5 | Recomendado |
| `validation_status` | `valid` \| `valid_warnings` \| `invalid` | Sí |
| `read_only` | `true` | Sí |
| `has_real_trading_orders` | **false** | Sí |
| `comparison_set_hint` | A \| B \| C \| D \| E | Recomendado |

Validación: `mapazapp:testea-export-validate` (existente) permanece gate técnico previo a indexación.

---

## 8. Run roles

| `run_role` | Uso | `comparison_set` típico | Carpeta segmento |
|------------|-----|-------------------------|------------------|
| `IS_BASELINE` | Baseline oficial o referencia IS | A | `01_in_sample` |
| `IS_OPTIMIZATION_CANDIDATE` | Candidato del optimizador en IS | A (candidato) / notas | `01_in_sample` |
| `OOS_VALIDATION` | Validación out-of-sample | E | `02_out_of_sample` |
| `WALK_FORWARD_WINDOW` | Ventana WF (IS + forward por subcarpeta) | E | `03_walk_forward` |
| `FORWARD_DEMO_READONLY` | BridgeEA observación (futuro) | E / nivel 3 | fuera ST o segmento dedicado |
| `ENTRY_VARIANT_RESEARCH` | 25/edge/adaptive sim | D | `01_in_sample` o subcarpeta research |
| `HUMANIZED_DELTA_RESEARCH` | Contrafactual humanizado | C | `05_audits` + ref bundle base |

**Reglas:**

- Un bundle = **un** `run_role` primario.
- Research variants **no** comparten carpeta con official baseline sin subcarpeta explícita.
- `FORWARD_DEMO_READONLY` no sustituye OOS ST.

---

## 9. Contrato OOS

| Regla | Detalle |
|-------|---------|
| Parámetros desde IS | OOS usa set seleccionado en IS — **no** re-optimizar en OOS |
| Mismo `profile_id` | `XAUUSD_M15_Profile_V1` constante |
| Rango fechas documentado | `date_range_*` en metadata; distinto de IS |
| Separación métricas | OOS **no** se fusiona en filas IS de la matriz |
| Filas matriz | `comparison_set` = `robustness_validation_set` (E); `run_role` = `OOS_VALIDATION` |
| Colapso OOS | Si OOS << IS sin explicación → `promotion_level` bloqueado, red flag `OOS_COLLAPSE` |
| Sufijo nombre | `_OOS` o carpeta `02_out_of_sample/` |

Ejemplo diseño: `SET002_..._OOS` en `02_out_of_sample/` con `parent_is_bundle_id` = `SET001_...`.

---

## 10. Contrato walk-forward

| Regla | Detalle |
|-------|---------|
| Etiquetas | `WF01`, `WF02`, … en `bundle_name` o subcarpeta `03_walk_forward/WF01/` |
| Segmentos | Cada ventana: tramo IS + tramo forward **documentados** por separado |
| Reporting | Cada forward = fila matriz E separada — **no** solo promedio oculto |
| Agregado WF | Puede existir resumen en `06_matrix/` — debe listar ventanas fallidas |
| Estabilidad | Consistencia entre ventanas > un pico de R en una ventana |
| Fallo ventana | Ventana con colapso → flag; no promediar hasta ocultar |

Estructura sugerida:

```text
03_walk_forward/
  WF01/
    is/     # bundle IS leg WF01
    forward/  # bundle forward leg WF01
  WF02/
    ...
```

---

## 11. Layout de informes y audits

Artefactos **derivados** — nunca reemplazan el bundle crudo.

| Artefacto | Ubicación recomendada | Commitear repo |
|-----------|----------------------|----------------|
| `setup_readiness_report.json/md/html` | `04_reports/<bundle_id>/` | Solo evidencia docs aprobada |
| `setup_performance_baseline_audit.json/csv` | `05_audits/<bundle_id>/` | `_local_*_DO_NOT_COMMIT` por defecto |
| `humanized_casebook_examples.json/csv` | `05_audits/<bundle_id>/` | `_local_*` |
| `trade_set_delta.json/csv` | `05_audits/<bundle_id>/` | Tras E5.22.5.2+ |
| `optimization_comparison_matrix.json/csv/md` | `06_matrix/<campaign_id>/` | Evidencia docs o `_local_*` |

**Regla:** artefactos grandes → prefijo `_local_<checkpoint>_DO_NOT_COMMIT/` bajo `APP/artifacts/mapazapp/docs/` salvo PM explícito.

---

## 12. Relación con indexación existente

CLI actual: `mapazapp:testea-local-bundle-index` ([`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md)).

| Aspecto | Relación E5.23.3 |
|---------|------------------|
| Descubrimiento | El índice puede seguir escaneando `Mapazapp/TestEA/**` |
| Confiabilidad | Layout de campaña hace `profile_id`, `campaign_id`, `run_role` explícitos → menos ambigüedad |
| `latest_valid_by_key` | Útil operacionalmente — **no** sustituye gobernanza de campaña ni matriz |
| Estados `stale`, `report_missing` | Permanecen válidos; campaña debe re-validar antes de matriz |
| Filtros | `--profile`, `--campaign`, `--parameter-set` alineados con metadata §7 |

El índice **no** promueve niveles research; solo descubre y clasifica bundles.

---

## 13. Relación con matriz E5.23.2

| Flujo | Descripción |
|-------|-------------|
| Entrada | Cada bundle en `01_`/`02_`/`03_` con metadata §7 |
| Salida | Una o más filas en `optimization_comparison_matrix.*` |
| `comparison_set` | A–E según `run_role` + política perfil |
| Conjunto E | Poblado por carpetas `02_out_of_sample/` y `03_walk_forward/` |
| Sin ranking global | Hasta cumplir constraints perfil + anti-curve-fit E5.23.2 §9 |
| Referencia | Matriz usa `bundle_id`, no rutas relativas ambiguas |

Ejemplo: `SET001` en `01_in_sample/` → fila A; `SET002_..._OOS` en `02_out_of_sample/` → fila E; readiness audit sobre SET001 → filas B (derivadas, mismo `bundle_id` base).

---

## 14. Reglas anti-contaminación

| Prohibido | Razón |
|-----------|--------|
| Optimizar en OOS | Data leakage |
| Copiar reports al bundle crudo sin versión | Contamina fuente de verdad |
| Sobrescribir corridas previas | Evidencia stale |
| Renombrar post-validación sin traza | Rompe `bundle_id` en matriz |
| Mezclar símbolos bajo un `profile_id` | Perfil = un símbolo/TF |
| Mezclar filas D/E con A en misma métrica | Conjuntos separados E5.23.2 |
| Tratar `_local_*_DO_NOT_COMMIT` como canónico repo | Gobernanza artefactos |
| Promover desde índice `latest_valid` solo | Falta OOS/WF/multi-bundle |

---

## 15. Ideas CLI futuras (no implementar en E5.23.3)

| Comando propuesto | Rol |
|-------------------|-----|
| `mapazapp:testea-campaign-scaffold` | Crear árbol `00_`…`99_` + `campaign_manifest.json` |
| `mapazapp:testea-campaign-index` | Índice por campaña (extiende bundle index) |
| `mapazapp:testea-campaign-validate` | Validar layout + metadata + bundles crudos |
| `mapazapp:testea-optimization-comparison-matrix` | Poblar `06_matrix/` desde audits (E5.23.2) |

**E5.23.3:** solo documentación de contrato.

---

## 16. Relación con E5.24

**E5.24** [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md) define campaña `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001`. **E5.24.1** (ejecución) debe:

- Usar este contrato al planificar corridas SET002+, OOS y WF
- Registrar evidencia en segmentos `01_`–`06_` sin mezclar roles
- Alimentar filas E de la matriz E5.23.2

**E5.23.3** no ejecuta campañas ni ST — solo define **dónde** y **cómo** debe vivir la evidencia.

**E5.23.4:** [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md) — plantilla markdown por ventana (**cerrado docs**). E5.24 debe usarla al documentar WF.

---

## 17. Gobernanza

| Acción | Estado |
|--------|--------|
| Cambios MQL5 | **No** |
| Cambios TypeScript / scaffold/index/validate | **No** en E5.23.3 |
| MT5 / Strategy Tester / optimizador | **No** |
| Live trading / gates | **No** |
| Cambio entry / TP oficial | **No** |
| Aprobación edge / 25 / adaptive | **No** |
| Telegram / dashboard / email / push | **No** |
| Migrar carpetas MT5 existentes | **No** en esta tarea |
| Commitear `_local_*_DO_NOT_COMMIT` | **No** |

---

## Referencias

- [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md)
- [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md)
- [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md)
- [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
- [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
