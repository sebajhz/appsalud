# ROADMAP V2 — Master Execution Plan

## V2-16 checkpoint context

- Checkpoint: `V2-16 — Dashboard/API Connection Cleanup`.
- Purpose: alinear contratos GET mock para la pila de evidencia V2 (campaña, grid, walk-forward, pipeline manual), servicios de dashboard y copy conservador; sin cambiar lógica de motor, sin persistencia, sin POST, sin import UI.
- Rutas API: `GET /api/mapazapp/backtest-campaigns/mock-latest`, `GET /api/mapazapp/parameter-grid/mock-latest`, `GET /api/mapazapp/walk-forward/mock-latest`, `GET /api/mapazapp/manual-campaign/mock-latest` (sobre fixtures core, flags `reviewOnly`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`).

## V2-15 checkpoint context

- Checkpoint: `V2-15 — Walk-forward / Train-Validation-Forward Evaluator`.
- Purpose: gobernar evidencia por splits (train / validation / forward), señalar riesgo de sobreajuste e inestabilidad, y emitir recomendaciones conservadoras sin auto-aprobación.
- Reference: `APP/artifacts/mapazapp/docs/V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`.
- Consumo V2-16: la salida puede exponerse vía `GET .../walk-forward/mock-latest` (mock) además del core.

## V2-14 checkpoint context

- Checkpoint: `V2-14 — Parameter Set Grid Runner v1`.
- Purpose: comparar parameter sets sobre los mismos datasets mediante campañas aisladas (`runParameterGrid` → `runBacktestCampaign`), ranking conservador y recomendaciones sin auto-aprobación.
- Reference: `APP/artifacts/mapazapp/docs/V2_14_PARAMETER_SET_GRID_RUNNER_V1.md`.

## V2-13 checkpoint context

- Checkpoint: `V2-13 — Campaign Runner over Manual Datasets`.
- Purpose: orquestar `runBacktestCampaign` sobre datasets procedentes de CSV manual y/o bundles BridgeEA/TestEA validados en memoria, con diagnósticos y flags de seguridad explícitos.
- Reference: `APP/artifacts/mapazapp/docs/V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`.

## V2-12 checkpoint context

- Checkpoint: `V2-12 — Real Export Sample Validation from BridgeEA/TestEA`.
- Purpose: validar bundles de texto saneados (BridgeEA + TestEA) contra parsers/importers del core, privacidad heurística, sin `fs`, sin exportes crudos en repo.
- Reference: `APP/artifacts/mapazapp/docs/V2_12_REAL_EXPORT_SAMPLE_VALIDATION.md`.

## V2-11 checkpoint context

- Checkpoint: `V2-11 — Manual Candle Dataset Import / Replay Campaign Input`.
- Purpose: parse CSV de velas suministrado como texto en memoria hacia `Candle[]` y `BacktestCampaignDataset` (adaptador), sin watcher, sin DB, sin ejecución, sin ingest automático MT5.
- Reference: `APP/artifacts/mapazapp/docs/V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`.

## V2-10.5 checkpoint context

- Checkpoint: `V2-10.5 — Roadmap V2 Master Execution Plan Refresh`.
- Purpose: keep a single authoritative execution sequence for Roadmap V2, avoid scope drift, and preserve safety boundaries.

---

## 1) Current status

### Completed foundations

- CP0 through CP18.5 completed (system foundation, review-only posture, safety invariants, architecture separation).
- V2-01 through V2-16 completed (engine-first sequence; V2-16 = capa dashboard/API read-only para evidencia V2 sin motor nuevo).

### Current repo reference

- Ultimo commit de capa evidencia dashboard/API (V2-16): **`0082e26`** — `feat(dashboard+api): V2-16 mock engine evidence GET routes and UI summaries`.
- **Fase A1 (documentacion):** estrategia de testing/validacion, manual MT5, runtime/launcher, integracion MT5 y auditoria `AUDIT_TESTING_MT5_LAUNCHER_A1.md`. La implementacion de launcher, ingesta MT5 runtime, watcher, DB, WebSocket live y ejecucion real **no** forma parte de A1 y requiere aprobacion aparte.

### Engine Setup Proof Phase E

- **Prioridad actual (pausa expansión runtime):** demostrar **validez del setup** con **backtest principal en MT5 Strategy Tester** usando el **EA oficial de tester `Mapazapp_TestEA`** (el rol documental *BacktestEA* — contrato E3.2 — se implementa **en** ese EA; ver [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)), **export de evidencia** y análisis en Mapazapp **antes** de retomar expansión de launcher/packaging/MT5 live.
- **Plan maestro:** [`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md) (**E1**); **corrección de motor de backtest:** [`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md) (**E3.1**).
- **E3.2 — Contrato BacktestEA Setup V1 (documentación):** [`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](./BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md) — identidad EA (evolución TestEA), seguridad tester-only, modos virtual vs tester_orders, Setup V1 + Daily Bias V1, esquema de export, inputs; **sin** código MQL5 nuevo en el alcance E3.2.
- **E3.3 — Esqueleto `Mapazapp_BacktestEA` (MQL5 + docs + tests estáticos):** carpeta `APP/artifacts/mt5/experts/Mapazapp_BacktestEA/` — guard `MQL_TESTER`, export mínimo (`backtest_trades.csv` cabecera, `backtest_events.csv`, `backtest_summary.json`), sin filas de trade ficticias; `Mapazapp_TestEA` permanece como referencia CP14.
- **E3.4 — Daily Bias V1 en BacktestEA:** vela cerrada previa en TF de bias, eventos `daily_bias_evaluated`, contadores en summary, `has_real_daily_bias_logic: true`; spec [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](./BACKTESTEA_DAILY_BIAS_V1_E3_4.md); sin IFVG ni órdenes.
- **E3.4.1 — Reconciliación de roles EA (solo docs):** [`MT5_EA_ROLES_RECONCILIATION_E3_4_1.md`](./MT5_EA_ROLES_RECONCILIATION_E3_4_1.md) + guía viva [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md) — dos EAs oficiales (Bridge + Test); `Mapazapp_BacktestEA` como artefacto temporal a fusionar; **sin** código MQL5 nuevo en E3.4.1.
- **E3.4.2 — Merge completado:** lógica E3.3–E3.4 integrada en **`Mapazapp_TestEA.mq5`**; carpeta `Mapazapp_BacktestEA/` **eliminada** del árbol; tests estáticos y validación de bundles actualizados (`backtest_ea_v1` + legacy `MZP_TESTEA_V1`).
- **E3.5 — Setup V1 FVG candidato:** candidatos long/short en velas cerradas, gate Daily Bias, eventos `setup_*`, summary con `has_real_ifvg_logic: true` (detección presente; **no** pipeline IFVG completo); spec [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](./BACKTESTEA_IFVG_SETUP_V1_E3_5.md); sin órdenes ni filas trade CSV.
- **E3.6 — Esquema export evidencia (congelado):** `has_full_ifvg_pipeline: false`, `backtest_events.csv` validado en core, samples y `EXPORT_CONTRACT.md`; doc [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md); sin ejecutar Strategy Tester.
- **E4 — Primer smoke Strategy Tester (manual) — cerrado con evidencia:** plan [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md); evidencia real **OK with observations** [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md).
- **E4.1 — Validación bundle TestEA (CLI + core) — cerrado:** [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md) (`mapazapp:testea-export-validate`, `validateTestEaExportBundleTexts`); sin MT5.
- **E5 — Diseño campaña XAUUSD Strategy Tester (docs-only) — cerrado:** [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md) — Phase A (candidato/compuerta) vs Phase B (outcome); sin medir rentabilidad hasta motor acordado.
- **E5.1 — Decisión modo outcome TestEA (docs-only) — cerrado:** [`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md) — **Opción C:** simulación **virtual** en **TestEA** bajo **Strategy Tester** primero; **tester_orders** queda como track **opcional separado** (no confundir con **E5.6** = ambiguous — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md); ver [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) §15).
- **E5.2 — Contrato simulación virtual (docs-only) — cerrado:** [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md) — lifecycle, entry/SL/TP, fill, expiries, ambigüedad `ambiguous`, una operación activa, impacto exports.
- **E5.3 — Implementación simulación virtual (TestEA) — cerrado en repo:** [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md) — MQL5 + validadores TS + muestras; sin órdenes reales.
- **E5.4 — Primer smoke outcome virtual (operador) — OK with warnings:** evidencia acotada; CLI sin errores; warnings de geometría CSV — ver [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md).
- **E5.4.1 — Fix geometría / deinit / validadores (repo) — cerrado:** mismo doc — `MZP_TestEA_E5_4_1`, sin MT5 en CI.
- **E5.4.2 — Re-smoke outcome virtual (operador) — OK:** solo `BUNDLE_EVENTS_LARGE`; sin geometría CSV — [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md).
- **E5.4.3 — Evidencia + política build/versioning TestEA (docs-only):** [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md).
- **E5.5 — Runbook campaña outcome XAUUSD (docs-only):** [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md) + plantilla [`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md). **E5.5.0 (repo):** exports seguros bajo optimización — [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md). **E5.5.0.2 (repo):** corrección de escritura real de CSV/JSON en carpeta segura + diagnósticos (mismo doc). **E5.5.0.3 (repo):** `FileOpen` compatible MQL5 en `.tmp` (sin `FILE_REWRITE`) + fallback escritura directa si falla el commit atómico (mismo doc). **E5.5.0.4 (repo):** defaults de inputs alineados a campaña E5.5 + presets MT5 en `Mapazapp_TestEA/presets/` (README TestEA). **E5.5.0.5 (repo):** rutas físicas cortas bajo `InpOptimizationSafeExports` (`InpExportCampaignFolder` / `InpExportParameterFolder`); `campaign_id` y `parameter_set_id` completos permanecen en `backtest_summary.json` — mismo doc + README TestEA. **E5.5.1 (operador):** Optimization / runs con agentes locales (matriz FVG); bundles validados (`BUNDLE_EVENTS_LARGE` como warning). **E5.5.2 (docs-only):** auditoría profesional post-campaña — [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) (setup **no aprobado**; BridgeEA/live E2E **no probado**). **E5.6 (docs-only) — cerrado:** plan sensibilidad/diagnóstico `ambiguous` — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md). **E5.6.1 (repo) — cerrado:** analizador + CLI post-proceso (opción **A** del plan E5.6) — [`AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md`](./AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md). **E5.6.2 (docs-only) — cerrado:** evidencia operador (7 bundles E55) — [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md). **E5.7 (docs-only) — cerrado:** contrato Entry Quality Score V1 — [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md) (§8 métricas; §9 CSV; `ambiguous_risk_*`; multi-símbolo §11). **E5.8 (repo) — cerrado:** export score en TestEA **`MZP_TestEA_E5_8_0`** (solo observación; sin compuerta) — [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md). **E5.8.1 (docs-only) — cerrado:** evidencia smoke operador + caveat calibración (A/B=0) — [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md). **E5.9 (repo) — cerrado:** analizador calibración/distribución + CLI `mapazapp:testea-score-calibration` — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). **Opcional paralelo:** forward split / compuerta humana clásica (**E5.5.3** / **E5.5.4** en notación histórica) cuando el PM lo reactive. **E5.9.1 (docs-only) — cerrado:** evidencia calibración smoke — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md). **E5.10 (repo) — cerrado:** Liquidity Sweep V1 (observación/export; `MZP_TestEA_E5_10_0`) — [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md). **E5.10.1 (docs-only) — cerrado:** smoke operador + validación bundle + rerun calibración; caveat V1 permisiva — [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md). **Siguiente:** **E5.10.2** — Liquidity Sweep **Quality Refinement** (`MZP_TestEA_E5_10_2`). **E5.10.2.1–E5.10.3 (repo/smoke) — cerrados** en la práctica (`MZP_TestEA_E5_10_2_1`, evidencias en docs de liquidez/calibración). **E5.10.4 (repo) — cerrado:** cadena causal observación — [`LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md`](./LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md). **E5.10.5 — evidencia operador:** smoke **`MZP_TestEA_E5_10_4`** (`liquidity_chain_*`). **E5.10.6 (repo) — cerrado:** auditoría/heurística de reacción en cadena — [`LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md`](./LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md) (`MZP_TestEA_E5_10_6`). **E5.10.7 (docs-only) — cerrado:** evidencia smoke post–**E5.10.6** — [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md) (PASS técnico; cadena/reacción solo diagnóstico; sin compuerta dura). **E5.11 (repo) — cerrado:** HTF Structure V1 export — [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md) (`MZP_TestEA_E5_11`). **E5.11.1 (docs-only) — cerrado:** evidencia smoke HTF — [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md) (PASS técnico; observación-only; sin compuerta). **E5.12 (repo) — cerrado:** MSS / CHoCH V1 export — [`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md) (`MZP_TestEA_E5_12_2`; timeframe ejecución; incluye columnas temporales **E5.12.2**). **E5.12.1 (docs-only) — cerrado:** evidencia smoke MSS/CHoCH — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md) (PASS técnico; `BUNDLE_EVENTS_LARGE`; observación-only). **E5.12.2 (repo) — cerrado:** relevancia temporal MSS/CHoCH — [`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md). **E5.12.3 (docs-only) — cerrado:** evidencia smoke temporal — [`MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md). **E5.13 (repo) — cerrado:** Premium/Discount V1 export — [`PREMIUM_DISCOUNT_EXPORT_E5_13.md`](./PREMIUM_DISCOUNT_EXPORT_E5_13.md) (`MZP_TestEA_E5_13`; columnas `premium_discount_*` / `pd_*`). **E5.13.1 (docs-only) — cerrado:** smoke Premium/Discount — [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md) (bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; `BUNDLE_EVENTS_LARGE`). **E5.13.2 (repo) — cerrado:** Entry Fill Feasibility V1 — [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md). **E5.13.3 (docs) — cerrado:** smoke — [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md). **E5.13.2.1 (repo) — cerrado:** reason dedup (`MZP_TestEA_E5_13_2_1`). **E5.13.4 (repo) — cerrado:** Entry Variant Feasibility — [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md) (`MZP_TestEA_E5_13_4`). **E5.13.5 (docs) — cerrado:** smoke variantes — [`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md). **E5.13.6 (repo) — cerrado:** outcome/risk simulation hipotética — [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md) (`MZP_TestEA_E5_13_6`). **E5.13.7 (docs) — cerrado:** smoke — [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md); PASS técnico; 50 % sim ≠ oficial. **E5.13.6.1 (repo) — cerrado:** reconcile — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md). **E5.13.6.2 (docs) — cerrado:** smoke reconcile — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md). **E5.13.6.3 (repo) — cerrado:** paridad EVOS 50 %/CE — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md) (`MZP_TestEA_E5_13_6_3`). **Siguiente:** **E5.13.6.4** smoke reconcile post-fix; **no** E5.14 hasta entonces. Capacidades de score históricas: [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md) §12; reconciliar naming con [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) §15. **`tester_orders`** (E5.1): track **separado**.
- **Auditoría E2:** [`ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md`](./ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md) — inventario TypeScript como **referencia/auxiliar**; prueba canónica del setup → **MQL5 EA + Strategy Tester**.
- **E3 — Export / data health XAUUSD (documentación):** [`XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md`](./XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md) — contratos y salud de **CSV/JSON de evidencia** hacia Mapazapp; **no** sustituye al Strategy Tester.
- **Secuencia E (actualizada):** **E3.1** alineación tester → **E3.2** contrato Setup V1 EA → **E3.3** esqueleto EA + guard tester-only → **E3.4** Daily Bias en artefacto `Mapazapp_BacktestEA` → **E3.4.1** reconciliación roles / guía viva → **E3.4.2** merge en **`Mapazapp_TestEA`** → **E3.5** detección FVG / Setup V1 candidato en **`Mapazapp_TestEA`** → **E3.6** esquema export evidencia (CSV/JSON/validadores) → **E4** primer smoke tester (plan + evidencia: [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md), [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md)) → **E4.1** validación bundle ([`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md)) → **E5** diseño campaña XAUUSD ([`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md)) → **E5.1** decisión outcome ([`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md): virtual primero) → **E5.2** contrato simulación virtual → **E5.3** implementación TestEA → **E5.4** smoke outcome → **E5.4.1** hardening geometría/deinit/TS → **E5.4.2** re-smoke outcome (OK; evidencia [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md)) → **E5.4.3** política build/versioning ([`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md)) → **E5.5** runbook outcome ([`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md)) → **E5.5.0**–**E5.5.0.5** exports optimization-safe → **E5.5.1** campaña operador → **E5.5.2** auditoría profesional ([`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md)) → **E5.6** sensibilidad `ambiguous` ([`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md)) → **E5.6.1** analizador post-proceso ([`AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md`](./AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md)) → **E5.6.2** evidencia operador — [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md) → **E5.7** contrato score V1 — [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md) → **E5.8** export score TestEA (observación) — [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md) → **E5.8.1** evidencia smoke + calibración — [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md) → **E5.9** analizador calibración — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md) → **E5.9.1** evidencia — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md) → **E5.10** Liquidity Sweep V1 — [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md) → **E5.10.1** smoke + calibración — [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md) → **E5.10.2** Liquidity Sweep Quality V1 — [`LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md`](./LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md) → **E5.10.2.1** (mismo doc) → **E5.10.3** smoke evidencia (`MZP_TestEA_E5_10_2_1`) → **E5.10.4** cadena causal `liquidity_chain_*` (`MZP_TestEA_E5_10_4`) — [`LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md`](./LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md) → **E5.10.5** smoke post–E5.10.4 → **E5.10.6** reaction audit (`MZP_TestEA_E5_10_6`) — [`LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md`](./LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md) → **E5.10.7** smoke post–E5.10.6 — evidencia [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md) → **E5.11** HTF Structure V1 export ([`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md); build `MZP_TestEA_E5_11`) → **E5.11.1** smoke evidencia [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md) → **E5.12** MSS / CHoCH V1 export ([`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md); build `MZP_TestEA_E5_12_2` incl. **E5.12.2** temporal) → **E5.12.1** smoke MSS/CHoCH — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md) → **E5.12.2** temporal relevance ([`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md)) → **E5.12.3** smoke temporal ([`MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md)) → **E5.13** Premium/Discount V1 export ([`PREMIUM_DISCOUNT_EXPORT_E5_13.md`](./PREMIUM_DISCOUNT_EXPORT_E5_13.md); `MZP_TestEA_E5_13`) → **E5.13.1** smoke evidencia ([`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md)) → **E5.13.2** Entry Fill Feasibility Audit ([`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md); `MZP_TestEA_E5_13_2`) → **E5.13.3** smoke ([`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md)) → **E5.13.2.1** reason dedup → **E5.13.4** entry variants ([`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md); `MZP_TestEA_E5_13_4`) → **E5.13.5** smoke variantes ([`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md)) → **E5.13.6** Entry Variant Outcome / Risk Simulation ([`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md); `MZP_TestEA_E5_13_6`) → **E5.13.7** smoke ([`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md)) → **E5.13.6.1** reconciliación ([`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md)) → **E5.13.6.2** smoke ([`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md)) → **E5.13.6.3** paridad EVOS 50 %/CE (`MZP_TestEA_E5_13_6_3`) → **E5.13.6.4** smoke reconcile post-parity → **E5.14** IFVG / BISI / SIBI / Inversion FVG → **E5.15** Liquidity Target Quality V1 → **E5.16** Session / News / Spread / Volatility Context V1 → **E5.17** Frequency / Risk / Overtrading Discipline V1 → **E5.18** BridgeEA / Dashboard Setup State Contract → **E5.19** Forward demo read-only readiness → **E5.20** Evidence-based gate / score decision checkpoint (cadena explícita en [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)) → **E6** import evidencia MT5 en Mapazapp → **E7** diseño dashboard resultados → **E8** compuerta decisión setup. **Paralelo opcional:** modo **`tester_orders`** (mención E5.1) como track separado cuando se documente de nuevo.
- **Regla de foco:** la siguiente prueba decisiva es de **estrategia en MT5 tester**, no de **runtime** — coherente con la frase en **E1 §2**.

---

## 2) Product objective

Mapazapp is a **trading decision assistant**, not just a bot.

The engine must behave like a structured human analyst:

- zones, not exact points;
- dynamic tolerances, not fixed pips;
- variants, not rigid A+B+C only;
- context, timing, confidence, risk, and target quality;
- replay and backtest proof before trust;
- trader guidance, not blind execution.

---

## 3) Estimated progress (honest)

These percentages are directional and conservative:

- **System / plumbing:** ~78%
- **Engine technical maturity:** ~66%
- **Engine proof / profitability evidence:** ~28%
- **Demo-readiness (read-only, controlled):** ~42%
- **Execution-readiness:** ~8%

Interpretation:

- plumbing and contracts are advanced, but evidence quality is still developing;
- engine logic is materially stronger than early checkpoints, but not yet trust-complete;
- profitability remains unproven and must not be inferred.

---

## 4) Next execution plan (authoritative order)

1. V2-11 — Manual Candle Dataset Import / Replay Campaign Input (done)
2. V2-12 — Real Export Sample Validation from BridgeEA/TestEA (done)
3. V2-13 — Campaign Runner over Manual Datasets (done)
4. V2-14 — Parameter Set Grid Runner v1 (done)
5. V2-15 — Walk-forward / Train-Validation-Forward Evaluator (done)
6. V2-16 — Dashboard/API Connection Cleanup (done)
7. V2-17 — Local Import UI or CLI
8. V2-18 — Persistence Decision / Local SQLite Design
9. V2-19 — Forward Demo Read-only from Imported BridgeEA Files
10. V2-20 — Alert-only Review Notifications
11. V2-21 — Risk / Prop Firm Real Mapping
12. V2-22 — Psychology / Manual Lock Integration
13. V2-23 — Startup Scripts / Developer Launchers
14. V2-24 — Stabilization / Packaging Plan
15. V2-25 — Assisted Execution Re-evaluation Gate

**Nota D2 (previo a scripts/launcher en código):** diseño formal de config y runtime status en `APP/artifacts/mapazapp/docs/LAUNCHER_CONFIG_AND_STATUS_DESIGN.md` (documentación únicamente); alinear implementación futura de V2-23 / launcher con ese diseño antes de exponer estados que parezcan conectividad real.

**Nota D7.1 (puente de acciones, solo docs):** `APP/artifacts/mapazapp/docs/ACTION_BRIDGE_DESIGN.md` define cómo el dashboard podría disparar operaciones futuras vía API local / launcher sin ejecutar comandos desde el browser; no añade endpoints `POST`, botones ni launcher ejecutable.

**Nota D8.1 (launcher prototype, solo docs):** `APP/artifacts/mapazapp/docs/LAUNCHER_PROTOTYPE_DESIGN_D8.md` define el diseño del futuro launcher y del puente **launcher-side** (procesos/PIDs, Windows, puertos, logs, seguridad localhost, pruebas futuras); no implementa código, supervisor, `spawn`, MT5 runtime, watcher, DB ni WebSocket live.

**Nota D9.1 (threat model action bridge, solo docs):** `APP/artifacts/mapazapp/docs/LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md` formaliza amenazas y mitigaciones obligatorias (localhost/CSRF/replay/CORS/tokens/allowlist/procesos/logs/privacidad/`ActionResult`) **antes** de cualquier endpoint `POST` de acciones, IPC real o launcher ejecutable; sin código ni dependencias nuevas.

**Nota D9.6 (contrato de transporte, solo docs):** `APP/artifacts/mapazapp/docs/LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md` define requisitos mínimos para transporte HTTP loopback e IPC launcher-side, reglas de remapeo de caller (`validate_environment` solo en contexto launcher/script autorizado), envelopes conceptuales y política por clase de acción; **sin** implementación de `POST`, IPC, botones ni launcher.

**Nota D9.7 (plan de tests de transporte, solo docs):** `APP/artifacts/mapazapp/docs/LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md` documenta categorías de pruebas obligatorias y criterios de aceptación antes del primer `POST` de acciones o IPC real; **sin** tests TypeScript, **sin** endpoint ni cambios de API en este checkpoint.

**Nota D9.9 (plan de endurecimiento API, solo docs):** `APP/artifacts/mapazapp/docs/API_HARDENING_PLAN_D9.md` ordena brechas del `api-server`, variables/config propuestas, secuencia **D9.10–D9.16** y riesgos antes de cualquier transporte/`POST` de acciones; **sin** modificar código, CORS, bind ni token en este checkpoint.

---

## 5) Checkpoint definitions (V2-11 through V2-25)

### V2-11 — Manual Candle Dataset Import / Replay Campaign Input

- **Goal:** parse manually supplied CSV candle datasets into campaign-ready datasets.
- **Adds:** deterministic parser + mapper from manual CSV to core campaign input types.
- **Must not add:** watchers, DB, live folder scan, execution, command channels.
- **Validation required:** core tests for parsing, schema checks, deterministic dataset outputs.
- **Definition of done:** manual CSV can be transformed into valid `BacktestCampaignDataset[]` with documented diagnostics.

### V2-12 — Real Export Sample Validation from BridgeEA/TestEA

- **Goal:** validate sanitized local exports can be parsed and transformed into core datasets.
- **Adds:** validation harness for sanitized sample exports and contract consistency checks.
- **Must not add:** raw real exports in repo, execution, watchers, automation daemons.
- **Validation required:** parser and mapping tests over sanitized sample set.
- **Definition of done:** reproducible pass/fail validation report for sanitized exports.

### V2-13 — Campaign Runner over Manual Datasets

- **Goal:** run V2-10 campaign runner over imported/manual datasets and produce symbol/parameter evidence.
- **Adds:** orchestration wrapper for imported datasets + evidence summary artifacts.
- **Must not add:** auto-approval, registry writes, profitability claims.
- **Validation required:** deterministic campaign runs and evidence output tests.
- **Definition of done:** campaign results generated from manual datasets with conservative recommendations only.

### V2-14 — Parameter Set Grid Runner v1

- **Goal:** compare parameter sets over the same datasets.
- **Adds:** controlled grid execution over parameter sets and comparative metrics.
- **Must not add:** optimization daemon, live automation, unattended tuning loops.
- **Validation required:** repeatability tests and aggregation correctness across parameter sets.
- **Definition of done:** stable comparative report per parameter set with conservative ranking.

### V2-15 — Walk-forward / Train-Validation-Forward Evaluator

- **Goal:** split evidence correctly and avoid overfitting.
- **Adds:** explicit split governance and walk-forward evidence evaluator.
- **Must not add:** hidden split leakage, auto-promotion logic.
- **Validation required:** split-integrity tests, leakage prevention tests, consistency tests.
- **Definition of done:** walk-forward protocol enforced and reported per run.

### V2-16 — Dashboard/API Connection Cleanup

- **Goal:** presentar la pila de evidencia V2 (campaña, grid, walk-forward, manual) de forma coherente entre API mock GET y dashboard in-process.
- **Adds:** rutas `GET .../mock-latest`, adaptadores `api-server`, interfaces `*DataSource` + mocks en dashboard, helpers de copy conservador (`engineEvidenceUi`), tarjetas resumen en Backtests.
- **Must not add:** motor nuevo, persistencia DB, POST, import/upload UI, ejecución, aprobación automática.
- **Validation required:** tests API (200, flags, sin POST), tests frontend (helpers + mocks).
- **Definition of done:** contratos read-only alineados; copy “evidence only / no approval / no execution”; sin `approved: true` en payloads mock de esta capa.

### V2-17 — Local Import UI or CLI

- **Goal:** user can manually import CSV/export files for analysis.
- **Adds:** operator-facing manual import flow (UI or CLI) for controlled ingestion.
- **Must not add:** watcher daemon, auto-import, hidden background scans.
- **Validation required:** import UX/CLI flow tests + parser integration tests.
- **Definition of done:** operator can manually import data and launch analysis reproducibly.

### V2-18 — Persistence Decision / Local SQLite Design

- **Goal:** decide if/where to persist datasets, runs, evidence and audit.
- **Adds:** architecture decision record and local SQLite design proposal.
- **Must not add:** premature DB implementation before design approval.
- **Validation required:** design review with migration and rollback strategy.
- **Definition of done:** approved persistence design scope, constraints, and phased rollout plan.

### V2-19 — Forward Demo Read-only from Imported BridgeEA Files

- **Goal:** read exported files manually/imported and show forward monitor.
- **Adds:** read-only forward monitor path from imported artifacts.
- **Must not add:** live watcher unless separately approved, execution, command reader.
- **Validation required:** forward monitor consistency tests vs imported snapshots.
- **Definition of done:** stable read-only forward demo view from imported files.

### V2-20 — Alert-only Review Notifications

- **Goal:** notify review candidates only.
- **Adds:** review-only alert generation and notification discipline.
- **Must not add:** execution triggers, auto-routing to broker.
- **Validation required:** alert precision/recall review on controlled datasets.
- **Definition of done:** alert-only output with documented suppression and quality rules.

### V2-21 — Risk / Prop Firm Real Mapping

- **Goal:** map real prop firm rules into account guard.
- **Adds:** richer account guard mapping model from concrete prop constraints.
- **Must not add:** execution, auto-trade unlock path.
- **Validation required:** rule-mapping tests for drawdown/limits/violations per account mode.
- **Definition of done:** account guard reflects mapped prop rules deterministically.

### V2-22 — Psychology / Manual Lock Integration

- **Goal:** trader discipline guard.
- **Adds:** psychology/manual lock signals integrated into review gating.
- **Must not add:** automation bypass, hidden override paths.
- **Validation required:** lock/unlock and gating behavior tests.
- **Definition of done:** manual lock is enforced and auditable in review flows.

### V2-23 — Startup Scripts / Developer Launchers

- **Goal:** one-command dev startup for API/dashboard.
- **Adds:** standardized scripts for local developer startup.
- **Must not add:** packaging/distribution claims beyond dev convenience.
- **Validation required:** scripts smoke-tested on local dev environment.
- **Definition of done:** reproducible one-command startup documented.

### V2-24 — Stabilization / Packaging Plan

- **Goal:** prepare the system to be used repeatedly.
- **Adds:** stabilization checklist, release-quality criteria, packaging strategy plan.
- **Must not add:** implied production approval or execution rollout.
- **Validation required:** stability matrix and regression suite pass thresholds.
- **Definition of done:** documented stabilization gate and packaging readiness plan.

### V2-25 — Assisted Execution Re-evaluation Gate

- **Goal:** only re-evaluate execution if evidence, risk, audit, demo and user approval exist.
- **Adds:** governance gate for explicit go/no-go decision.
- **Must not add:** execution implementation unless explicitly approved after gate.
- **Validation required:** evidence dossier review (engine, risk, audit, demo, user authorization).
- **Definition of done:** signed go/no-go decision document; default remains no execution.

---

## 6) Immediate next checkpoint recommendation

**Recommendation:** `V2-15 — Walk-forward / Train-Validation-Forward Evaluator`

**Reason:** con V2-14 el core puede comparar parameter sets de forma controlada; el siguiente paso es gobernanza explícita de splits y walk-forward para reducir sobreajuste y documentar evidencia temporal.

---

## 7) Safety invariants (non-negotiable)

- no execution;
- no MT5 command reader;
- no auto-approval;
- no registry mutation;
- no watcher until explicitly approved;
- no DB until explicitly designed;
- no profitability claims.

---

## 8) Reference alignment

This master plan is the authoritative roadmap execution reference for V2 and must be kept aligned from:

- `APP/artifacts/mapazapp/docs/CURSOR_HANDOFF.md`
- `APP/artifacts/mapazapp/docs/IMPLEMENTATION_ASSUMPTIONS.md`
- `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`

