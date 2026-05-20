## V2-10.5 master roadmap pointer

- Plan maestro autoritativo V2: `APP/artifacts/mapazapp/docs/ROADMAP_V2_MASTER_EXECUTION_PLAN.md`.
- Este documento define secuencia de ejecucion V2-11..V2-25, invariantes de seguridad y criterio de avance sin drift.

## Strategic governance (canonical)

- **Trade Detection North Star:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md) — Mapazapp como **framework de descubrimiento de setup parametrizado**, no bot XAUUSD de entry fija; XAUUSD = laboratorio primario, no jaula; descubrir el setup y luego medir qué símbolos lo expresan mejor; perfiles futuros (`XAUUSD_Profile_V1`, `BTCUSD_Profile_V1`, etc.); **Cursor no infiere decisiones de trading**.
- **Parameter & Optimization Governance:** [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md) — gobernanza de parámetros, campañas, anti-overfit, perfiles multi-símbolo, reglas de evidencia; configurabilidad solo con evidencia; **un solo bundle no aprueba entry**; edge / 25 % / adaptive **no aprobados**; entry oficial **50 % / CE**; sin live / funding / gates / ejecución real aprobados.

## Project execution guide (authoritative — E3.4.1+)

- **Living project guide:** [`APP/artifacts/mapazapp/docs/MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md) — referencia principal para Cursor y chats futuros: arquitectura aprobada, tres sistemas internos, **dos EAs oficiales MT5** (`Mapazapp_BridgeEA`, `Mapazapp_TestEA`), prioridades 80/10/10, tabla de siguientes pasos, implementation ledger y reglas de trabajo; alineado con North Star y governance anteriores.
- **Reconciliación de roles EA (E3.4.1):** [`APP/artifacts/mapazapp/docs/MT5_EA_ROLES_RECONCILIATION_E3_4_1.md`](./MT5_EA_ROLES_RECONCILIATION_E3_4_1.md).
- **E3.5 cerrado:** detección **FVG candidata** + gate Daily Bias en **`Mapazapp_TestEA`** — ver [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](./BACKTESTEA_IFVG_SETUP_V1_E3_5.md).
- **E3.6 cerrado:** esquema de export / evidencia congelado (`has_full_ifvg_pipeline`, eventos CSV, validadores) — ver [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md).
- **E4 cerrado (smoke real MT5):** plan [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md); evidencia **OK with observations** [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md).
- **E4.1 cerrado:** CLI `mapazapp:testea-export-validate` + `validateTestEaExportBundleTexts` — [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md).
- **E5 cerrado (diseño docs-only):** campaña XAUUSD tester — [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md); separa Phase A (sin rentabilidad) de Phase B (outcome); **no** ejecuta MT5 en E5.
- **E5.1 cerrado (decisión docs-only):** modo outcome — [`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md): **virtual dentro de `Mapazapp_TestEA` + Strategy Tester primero**; **`tester_orders`** como track **opcional separado** (no confundir con **E5.6** = ambiguous/sensibilidad — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md); numeración vs `tester_orders` en [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) §15).
- **E5.2 cerrado (contrato docs-only):** simulación virtual V1 — [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md): fill OHLC, SL/TP/RR, `ambiguous`, una operación activa, schema export documentado.
- **E5.3 cerrado (implementación en repo):** simulación virtual en **`Mapazapp_TestEA.mq5`** — [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md); validadores TS + `EXPORT_CONTRACT.md` + muestras; **sin** `OrderSend`/`CTrade`.
- **E5.4 (operador) — primer smoke outcome virtual — OK with warnings:** bundle validado sin errores; warnings de geometría (FVG 1pt) — ver [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md).
- **E5.4.1 — Fix repo (geometría virtual, deinit, TS):** [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md) + `Mapazapp_TestEA.mq5` **MZP_TestEA_E5_4_1**; sin `OrderSend`/`CTrade`.
- **E5.4.2 (operador) — re-smoke outcome virtual — OK:** solo warning `BUNDLE_EVENTS_LARGE`; sin `CSV_GEOMETRY_*` — evidencia [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md).
- **E5.4.3 cerrado (docs-only):** política build/versioning TestEA — [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md).
- **E5.5 cerrado (docs-only):** runbook + plantilla informe campaña outcome XAUUSD — [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md), [`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md).
- **E5.5.0 cerrado (repo):** identidad de export **segura para optimización** (`InpOptimizationSafeExports`, carpetas por campaña, `effective_run_id`, validadores) — [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md).
- **E5.5.0.2 fix (repo):** escritura CSV/JSON en modo export seguro (carpetas + `FileMove`/`FileOpen` robustos y logs); build **`MZP_TestEA_E5_5_0_2`** — nota en el mismo doc **E5.5.0**.
- **E5.5.0.3 fix (repo):** `FileOpen` sobre `.tmp` sin `FILE_REWRITE` (err 5003 en tester) + **fallback escritura directa** al JSON/CSV final; build **`MZP_TestEA_E5_5_0_3`** — ver [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md).
- **E5.5.0.4 (repo):** defaults de inputs TestEA para campaña E5.5 + **presets `.set`** (`presets/`) para carga en Strategy Tester; build **`MZP_TestEA_E5_5_0_4`** — README del EA + mismo doc E5.5.0.
- **E5.5.0.5 (repo):** carpetas físicas de export **cortas** en modo optimization-safe (`InpExportCampaignFolder`, `InpExportParameterFolder`) para evitar fallos de ruta larga en agentes del Strategy Tester; **`campaign_id`**, **`parameter_set_id`** y **`strategy_id`** completos se conservan en JSON; build **`MZP_TestEA_E5_5_0_5`** — [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md), README TestEA.
- **E5.5.1 (operador) —** campaña XAUUSD M15/D1 barrido FVG con **`MZP_TestEA_E5_5_0_5`**: siete bundles validados (`ok=true`, `errors=0`; warning `BUNDLE_EVENTS_LARGE`); métricas e interpretación en [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md).
- **E5.5.2 cerrado (docs-only):** auditoría profesional de setup/entrada, decisiones de operador, dudas, roadmap E5.6–E5.13, caveat BridgeEA/live — [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md).
- **E5.6 cerrado (docs-only):** sensibilidad y diagnósticos `ambiguous` (modos contables, stress −1R, métricas, opciones implementación A/B/C, BridgeEA) — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md).
- **E5.6.1 cerrado (repo):** analizador post-proceso bundles TestEA (modos `neutral_zero` / `conservative_loss` / `skip_ambiguous`) + CLI `pnpm --filter @workspace/scripts mapazapp:testea-ambiguity-sensitivity` — [`AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md`](./AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md); **sin** cambio MQL5 ni re-ejecución MT5.
- **E5.6.2 cerrado (docs):** evidencia operador — 7 bundles E55; `neutral_zero` / `skip_ambiguous` positivos; `conservative_loss` negativo en todos los FVG — [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md).
- **E5.7 cerrado (docs-only):** contrato **Entry Quality Score V1** — [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md).
- **E5.8 cerrado (repo):** export **Entry Quality Score V1** en `Mapazapp_TestEA` — build **`MZP_TestEA_E5_8_0`**; columnas CSV + flags summary (`has_entry_quality_score_logic`, `score_observation_only`, `score_gate_enabled: false`); eventos `eq_*` en `details`; validador TS; doc [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md).
- **E5.8.1 cerrado (docs):** evidencia smoke operador (bundle E55 SET001; `ok=true`; solo `BUNDLE_EVENTS_LARGE`); PASS técnico; A/B=0 = hallazgo de calibración; gate y umbrales **no** aprobados — [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md).
- **E5.9 cerrado (repo):** analizador **calibración/distribución** del score (`testea-score-calibration.ts`, CLI `mapazapp:testea-score-calibration`, tests) — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). **E5.9.0.1:** corrección de `summaryRows` / CSV resumen — `ambiguous_rate` alineado a `outcome_by_score.all.ambiguous_rate` (no al slice `ambiguous`).
- **E5.9.1 cerrado (docs):** evidencia operador smoke + decisión componentes — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md).
- **E5.10 cerrado (repo):** **Liquidity Sweep V1** (PDH/PDL + swings M15) en `Mapazapp_TestEA` — build **`MZP_TestEA_E5_10_0`** histórico; columnas `liquidity_event_*`, `liquidity_event_score` integrado; `has_liquidity_sweep_v1_logic`; validador TS cuando el flag es true — [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md).
- **E5.10.1 cerrado (docs):** smoke safe-export operador + validación bundle + rerun calibración; **PASS** técnico/export; caveat **V1 demasiado permisiva** como separador por outcome — [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md).
- **E5.10.2 cerrado (repo):** **Liquidity Sweep Quality V1** — builds **`MZP_TestEA_E5_10_2`** / **`MZP_TestEA_E5_10_2_1`**; columnas `liquidity_sweep_quality_*`; `has_liquidity_sweep_quality_v1_logic`; `liquidity_event_score` alineado al total de calidad (0–20) cuando el score de liquidez está habilitado en builds **pre–E5.10.4**; **E5.10.2.1** corrige semántica de razones (`quality_weak` solo en grado Weak; `quality_ok` en A/B y C≥12) y topes de contexto para bandas altas — analizador E5.9 extendido si el CSV trae columnas — [`LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md`](./LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md).
- **E5.10.4 (repo):** **Causal Liquidity Chain V1** — `MZP_TestEA_E5_10_4` histórico; columnas `liquidity_chain_*`, `has_liquidity_chain_v1_logic`; observación-only — [`LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md`](./LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md).
- **E5.10.6 (repo):** **Liquidity Chain Reaction Audit** — build **`MZP_TestEA_E5_10_6`**; `has_liquidity_chain_reaction_audit_v1_logic`; columnas `liquidity_chain_reaction_*`; contadores agregados de fallos de reacción; heurística ventana cerrada — [`LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md`](./LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md).
- **E5.10.7 cerrado (docs):** smoke post–**E5.10.6** — [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md); PASS técnico; cadena/reacción **solo diagnóstico** (sin compuerta dura ni live).
- **E5.11 cerrado (repo):** **HTF Structure V1** observación/export (`MZP_TestEA_E5_11`) — [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md); columnas `htf_structure_*`, summary `has_htf_structure_v1_logic`, sufijo eventos `htf_*`; validadores TS + calibración opcional por columna `htf_structure_score`; **sin** gate ni órdenes.
- **E5.11.1 cerrado (docs):** smoke HTF post–**E5.11** — [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md); PASS técnico (`BUNDLE_EVENTS_LARGE` warning); observación-only; sin compuerta/live/EQ threshold.
- **E5.12 cerrado (repo):** **MSS / CHoCH V1** observación/export en timeframe de ejecución (`MZP_TestEA_E5_12_2`) — [`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md); columnas `mss_*` / `choch_*` / `mss_choch_*` + **E5.12.2** relevancia temporal (`mss_temporal_*`, `choch_temporal_*`, `has_mss_choch_temporal_relevance_v1_logic`); summary `has_mss_choch_v1_logic`; sufijo compacto `msc_en` en eventos; analizador E5.9 opcional por columnas `mss_choch_score`, `mss_temporal_relevance_score`, `choch_temporal_relevance_score`; **sin** gate ni órdenes.
- **E5.12.1 cerrado (docs):** smoke MSS/CHoCH post–**E5.12** — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md); PASS técnico (`BUNDLE_EVENTS_LARGE` warning); observación-only; score V1 **no** separa wins/losses; sin compuerta/live/EQ threshold.
- **E5.12.2 cerrado (repo):** diagnóstico relevancia temporal MSS/CHoCH — [`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md); export/validador/core alineados; **sin** MT5 en esta tarea de verificación CI.
- **E5.12.3 cerrado (docs):** smoke temporal post–**E5.12.2** — [`MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md); build `MZP_TestEA_E5_12_2`; **PASS técnico** (`BUNDLE_EVENTS_LARGE`); observación-only; sin compuerta/live/EQ threshold.
- **E5.13 cerrado (repo):** **Premium/Discount V1** observación/export (`MZP_TestEA_E5_13`) — [`PREMIUM_DISCOUNT_EXPORT_E5_13.md`](./PREMIUM_DISCOUNT_EXPORT_E5_13.md); columnas `premium_discount_*` / `pd_*`; summary `has_premium_discount_v1_logic`; sufijo compacto `pd_*` en eventos; analizador E5.9 opcional `premium_discount_component_stats`; **sin** gate ni órdenes.
- **E5.13.1 cerrado (docs):** smoke Premium/Discount — [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md); bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; **PASS** técnico (`BUNDLE_EVENTS_LARGE`); PD observación-only; sin compuerta / sin tune solo por bundle.
- **E5.13.2 cerrado (repo):** **Entry Fill Feasibility V1** post-candidato (`MZP_TestEA_E5_13_2`) — [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md); columnas `entry_fill_*` / retrace / geometría FVG; summary `has_entry_fill_feasibility_v1_logic`; analizador E5.9 opcional `entry_fill_feasibility_component_stats`; **no** gate; **no** mezclar con `entry_quality_score`.
- **E5.13.3 cerrado (docs):** smoke Entry Fill Feasibility — [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md); bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; **PASS** técnico; 1697/1697 FVG touch, 1355/1697 CE+entry.
- **E5.13.2.1 cerrado (repo):** dedup `entry_fill_feasibility_reasons` por trade (`MapzEffAppendReasonOnce`); build `MZP_TestEA_E5_13_2_1`; sin cambio de fill/outcome logic.
- **E5.13.4 cerrado (repo):** Entry Variant Feasibility — [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md); build `MZP_TestEA_E5_13_4`; columnas `entry_variant_*` hipotéticas; sin gate.
- **E5.13.5 cerrado (docs):** smoke — [`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md); PASS; confirma hipótesis E5.13.3.
- **E5.13.5 cerrado (docs):** smoke Entry Variant — [`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md); `MZP_TestEA_E5_13_4`; PASS; edge 1697, CE 1355, 342 shallow_would_fill; **no** cambiar entry oficial.
- **E5.13.6 cerrado (repo):** Entry Variant Outcome / Risk Simulation — [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md); build `MZP_TestEA_E5_13_6`.
- **E5.13.7 cerrado (docs):** smoke outcome sim — [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md); PASS técnico; **no** aprobar edge/25 %; 50 % sim no reconcilia con oficial (ambiguous 880 vs 436).
- **E5.13.6.1 cerrado (repo):** reconcile CLI — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md); `mapazapp:testea-entry-variant-sim-reconcile`.
- **E5.13.6.2 cerrado (docs):** reconcile smoke — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md); mismatch_rate ≈ 41 %; entry/SL OK; TP/bars/ambiguous no.
- **E5.13.6.3 cerrado (repo):** paridad control 50 %/CE — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md); build `MZP_TestEA_E5_13_6_3`.
- **E5.13.6.4 cerrado (docs):** smoke reconcile post-fix — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md); `mismatch_rate = 0`; control 50 %/CE validado.
- **E5.13.6.5 cerrado (docs):** summary EVOS post-paridad — [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md); edge domina rollups; **no** aprobar variantes.
- **E5.13.6.6 cerrado (repo):** transition audit — [`ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md); CLI `mapazapp:testea-entry-variant-transition-audit`.
- **E5.13.6.7 cerrado (docs):** transition audit evidence — [`ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md); PASS; edge fuerte + riesgo ~2×; **no** aprobar variantes.
- **E5.13.6.8 cerrado (repo):** edge robustness audit — [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md); CLI `mapazapp:testea-entry-edge-robustness-audit`.
- **E5.13.6.8.1 (repo):** fix `transition_robustness.fast_fill_close_count` (per-bucket, no multiplicar por buffers).
- **E5.13.6.9 cerrado (docs):** edge robustness evidence — [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md); PASS post-8.1; edge frágil (buffer/velocidad/riesgo ~2×); **no** aprobar edge; oficial **50 % / CE**.
- **E5.13.6.10 cerrado (docs):** Buffered EVOS decision + manual-control guardrail — [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md); proxy TS no basta; **MQL5 Buffered EVOS requerido**; Mapazapp manual/read-only.
- **E5.15.1 cerrado (smoke operador):** [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md), build **`MZP_TestEA_E5_15`**, bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` — PASS; TP oficial sin cambio; entry 50 %/CE sin cambio.
- **E5.15.2 cerrado (repo):** target realism audit — [`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md); CLI `mapazapp:testea-liquidity-target-realism-audit`.
- **E5.15.3 cerrado (evidencia operador):** [`LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_EVIDENCE_E5_15_3.md) — PASS SET001; TP RR2 a menudo conservador vs nearest; **no** cambiar TP/entry.
- **E5.15.4 cerrado (policy research):** [`TARGET_POLICY_RESEARCH_E5_15_4.md`](./TARGET_POLICY_RESEARCH_E5_15_4.md) — bloque E5.15 cerrado a nivel política.
- **E5.16 cerrado (repo export):** [`SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md`](./SESSION_SPREAD_VOLATILITY_EXPORT_E5_16.md), build **`MZP_TestEA_E5_16`**.
- **E5.16.1 cerrado (smoke operador):** [`SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md`](./SESSION_SPREAD_VOLATILITY_SMOKE_EVIDENCE_E5_16_1.md) — PASS.
- **E5.16.2 cerrado (audit repo):** [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_E5_16_2.md); CLI `mapazapp:testea-execution-environment-calibration-audit`.
- **E5.16.3 cerrado (evidencia operador):** [`EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md`](./EXECUTION_ENVIRONMENT_CALIBRATION_AUDIT_EVIDENCE_E5_16_3.md) — PASS.
- **E5.17.1 cerrado (smoke):** [`FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md`](./FREQUENCY_RISK_DISCIPLINE_SMOKE_EVIDENCE_E5_17_1.md) — `MZP_TestEA_E5_17_0_1`, bundle SET001, PASS; avg score 10.53; max 15.
- **E5.17.1.1 cerrado (repo + operador):** [`CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md`](./CSV_HEADER_CLEANUP_VERIFICATION_E5_17_1_1.md) — `MZP_TestEA_E5_17_1_1`, SET001, `Import-Csv` OK, sin headers duplicados.
- **E5.18 cerrado (repo export):** [`SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md`](./SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md), build **`MZP_TestEA_E5_18`**.
- **E5.18.1 cerrado (smoke operador):** [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md) — SET001, PASS; caveat grade A + reject (`pd_conflict`).
- **E5.18.2 cerrado (repo):** [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md) — CLI `mapazapp:testea-setup-readiness-decision-calibration-audit`. **Siguiente:** E5.18.3 evidencia operador sobre bundle SET001.
- **E5.13.6.13 cerrado (policy research):** [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md). Edge candidato serio; **no** aprobado. **Nota:** track **`tester_orders`** (E5.1) aparte.

## Phase A0 / A1 — governance (testing / MT5 / runtime docs)

- **A0 cerrado:** V2-16 confirmado en Git como **`0082e26`** — `feat(dashboard+api): V2-16 mock engine evidence GET routes and UI summaries`.
- **A1 abierto (solo documentacion, sin codigo nuevo):** `APP/artifacts/mapazapp/docs/AUDIT_TESTING_MT5_LAUNCHER_A1.md`, `TESTING_AND_VALIDATION_STRATEGY.md`, `USER_MANUAL_MT5_SETUP.md`, `RUNTIME_AND_LAUNCHER_STRATEGY.md`, `MT5_DATA_INTEGRATION.md`.
- **Queda pendiente de aprobacion explicita:** launcher unico, MT5 runtime automatico, watcher live, DB operativa Mapazapp, WebSocket live, ejecucion real.

## Phase D — launcher preparation (documentation)

- **D2 cerrado (solo docs):** `APP/artifacts/mapazapp/docs/LAUNCHER_CONFIG_AND_STATUS_DESIGN.md` define configuración futura, modelo de estado runtime y reglas anti-simulación MT5/bridge; **no** implementa launcher ni código.
- **D3.1 cerrado (solo scripts package):** `pnpm --filter @workspace/scripts mapazapp:dev-preflight` — preflight dev (puertos/scripts + instrucciones PowerShell/Bash); **no** launcher, **no** procesos hijos, **no** MT5.
- **D3.2 cerrado (solo scripts package):** `pnpm --filter @workspace/scripts mapazapp:dev-start` — preflight + build/start API + Vite dashboard (hijos); **no** launcher `.exe`, **no** MT5/bridge real, **no** ejecución.
- **D4 modelo runtime:** TypeScript puro en **`APP/lib/mapazapp-core/src/runtime-status.ts`** (`@workspace/mapazapp-core`); tests en core (**vitest**); **sin** probes MT5/bridge reales; D3.x aún no lo consume.
- **D5.1a moves runtime status model to shared core module (`runtime-status.ts`).**
- **D5.1b adds read-only `GET /api/mapazapp/runtime/status` (mock envelope; MT5/bridge not_configured); no dashboard UI; no POST.**
- **D6.1 adds dashboard `runtimeStatusDataSource` (read-only HTTP integration + safe unavailable/blocked states); no TSX panel yet (D6.2).**
- **D6.2.1 adds presentational `RuntimeStatusPanel` (props-only, no fetch/buttons/routes); page wiring deferred to D6.3.**
- **D6.3.1 mounts `RuntimeStatusPanelContainer` on `ConfigPage` — one-shot read-only runtime snapshot (D6.1 data source); no buttons, no polling, no new routes.**
- **D4.1 documents future dashboard action wiring; no dashboard buttons implemented yet.** Ver `APP/artifacts/mapazapp/docs/DASHBOARD_RUNTIME_ACTIONS_DESIGN.md`.
- **D7.1 documents the dashboard / launcher action bridge (docs only).** Ver `APP/artifacts/mapazapp/docs/ACTION_BRIDGE_DESIGN.md` — no `POST` actions, no launcher code.
- **D7.2 adds `@workspace/mapazapp-core` `action-result.ts`** — pure `MapazappActionResult` model + safety helpers + vitest; no endpoints, no dashboard buttons, no executed actions.
- **D7.3 adds `src/services/actionClient.ts`** — `DashboardActionClient` service stub (`createUnavailableDashboardActionClient`); safe `not_available`/`blocked` results only; no `fetch`/POST/UI wiring.
- **D8.1 documents launcher prototype + launcher-side bridge (docs only).** Ver `APP/artifacts/mapazapp/docs/LAUNCHER_PROTOTYPE_DESIGN_D8.md` — no launcher executable, no process supervisor, no `spawn`, no API `POST` actions, no dashboard buttons.
- **D8.2 adds `APP/scripts/src/mapazapp-launcher-model.ts`** — pure launcher config/process skeleton + tests; maps conservatively to `MapazappRuntimeStatus`; **no** `child_process`, **no** live action bridge.
- **D8.3 adds `APP/scripts/src/mapazapp-launcher-preflight-bridge.ts`** — `runLauncherValidateEnvironmentPreflight` wraps read-only `performDevPreflight`, updates launcher model + derived runtime snapshot, returns safe `MapazappActionResult`; **no** spawn, **no** new CLI entry, **no** API/dashboard start.
- **D9.1 documents `APP/artifacts/mapazapp/docs/LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`** — formal local action bridge threat model + mandatory mitigations **before** any `POST`/action endpoint; **docs only**, no TS gates/API/buttons/launcher.
- **D9.2 adds `@workspace/mapazapp-core` `action-gates.ts`** — pure gate model (`evaluateActionGate`, definitions, policy, `assertActionGateDecisionSafety`, optional `MapazappActionResult` bridge); vitest `d9-action-gates-model.d9.test.ts`; **no** API routes, **no** dashboard UI, **no** launcher/spawn.
- **D9.3 adds `APP/scripts/src/mapazapp-launcher-action-dispatcher.ts`** — `dispatchLauncherAction` (default caller **launcher**): D9.2 gates + **only** **`validate_environment`** → D8.3 preflight; node:test `mapazapp-launcher-action-dispatcher.test.ts`; **no** HTTP/IPC/CLI entry, **no** spawn.
- **D9.4.1 hardens `dispatchLauncherAction`** — preflight throws and unsafe preflight **`ActionResult`** payloads become safe **`MapazappActionResult`** (conservative **`safety`**, no stack leakage); **still no** HTTP/IPC, **no** API/dashboard changes.
- **D9.6 adds `APP/artifacts/mapazapp/docs/LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md`** — formal **transport contract** (HTTP/IPC minimums, **`evaluateActionGate`** + **`dispatchLauncherAction`** integration rules, caller remapping, test obligations); **documentation only** — **no** `POST`, **no** IPC, **no** launcher/buttons/TSX.
- **D9.7 adds `APP/artifacts/mapazapp/docs/LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md`** — transport **safety test plan** (categories, fixture policy, acceptance before first `POST` / IPC); **documentation only** — **no** TS tests, **no** endpoint.
- **D9.9 adds `APP/artifacts/mapazapp/docs/API_HARDENING_PLAN_D9.md`** — API **hardening plan** (gap table, env contract proposal, sequence **D9.10+** before `app.ts`/action `POST`); **documentation only** — **no** API code, **no** CORS/bind/token.
- **D9.10 adds `APP/artifacts/api-server/src/config/apiHardeningConfig.ts`** — pure **API hardening config** model (defaults, env parsing, validation); vitest `apiHardeningConfig.d9.test.ts`; **no** `app.ts`/`index.ts` wiring, **no** runtime CORS/bind/token.
- **D9.11 adds `APP/artifacts/api-server/src/config/apiHardeningReadiness.d9.test.ts`** — audit/readiness vitest (static baseline for listen/CORS/routes + **D9.10** validation + **`it.skip`** for future bind/CORS/token/action gates); **no** `app.ts`/`index.ts` changes, **no** endpoint/**`POST`**.
- **D9.12 wires `APP/artifacts/api-server/src/index.ts`** — **`createApiHardeningConfigFromEnv`**, **`validateApiHardeningConfig`**, **`app.listen(port, host, …)`**; default host **`127.0.0.1`**, port **`3001`**; vitest **`apiListenConfig.d9.test.ts`** + readiness updates; **no** `app.ts` CORS changes, **no** token/**`POST`**, **no** Mapazapp route edits.
- **D9.12.1 aligns `runtimeStatus` adapter** — **`buildRuntimeStatusPayload`** resolves **`api.url`** / **`api.port`** via **`createApiHardeningConfigFromEnv`** (same as **`index.ts`**); vitest **`mapazapp.runtime-status.d9.test.ts`**; **no** new routes, **no** `index.ts`/`app.ts` edits.
- **D9.13 adds `apiCorsConfig.ts`** — CORS allowlist desde **`ApiHardeningConfig`** (no credentials, **`GET`/`HEAD`/`OPTIONS`**); vitest **`apiCorsConfig.d9.test.ts`**, **`apiCorsIntegration.d9.test.ts`**; **no** token/**`POST`**, **no** route edits (**`app.ts`** wiring detail actualizado en **D9.14.1**).
- **D9.14.1 hardens `app.ts`** — single **`createApiHardeningConfigFromEnv`** snapshot for **`createCorsOptions(apiHardeningConfig)`** + **`express.json`/`urlencoded`** **`limit: maxBodyBytes`** + **`safeErrorHandler`** (safe JSON **`413`/`400`/`500`**, no stack); vitest **`apiBodyAndErrorHandling.d9.test.ts`** + readiness updates; **no** action **`POST`**, **no** token/rate/CSRF.
- **D9.14.2 adds `logRedaction.ts`** — **`sanitizeLogString`**, **`sanitizeLogValue`**, **`getApiLoggerRedactPaths`** for **`pino`** + **`sanitizeLogString`** on logged URL paths in **`pino-http`**; vitest **`logRedaction.d9.test.ts`** + readiness; **no** action **`POST`**, **no** transport token wiring.
- **D9.15 adds `APP/artifacts/mapazapp/docs/API_TOKEN_CSRF_DESIGN_D9.md`** — diseño formal de token local **`X-Mapazapp-Action-Token`**, postura CSRF, launcher, gates y tests futuros (**D9.16**–**D9.18**); **solo documentación** — **sin** código, **sin** middleware, **sin** **`POST`**, **sin** token real.
- **D9.16–D9.18 (`@workspace/api-server`):** **`apiActionTokenConfig.ts`** + tests (modelo/env/validación); **`actionTokenMiddleware.ts`** + **`actionTokenMiddleware.d9.test.ts`** (middleware **no** montado en **`app.ts`**); **`logRedaction`** ampliado para fragmentos del header; readiness §J — **sin** endpoints de acciones, **sin** **`POST`** Mapazapp, **sin** token real ni launcher wiring.
- **D9.19–D10.10:** **`actionTransportReadiness.d9.test.ts`** — readiness transporte sin endpoint; **`MT5_DETECTION_GATE_AUDIT_D10.md`** — D10.0; **`mapazapp-mt5-config-model.ts`** — D10.1; **`MT5_OPEN_ACTION_DESIGN_D10.md`** — D10.2 (`open_mt5` diseño-only); **`mapazapp-mt5-runtime-status.ts`** — D10.3 (mapeo runtime conservador); **`Mt5ConfigStatusPanel`** — D10.4 UI draft read-only mock en Config; **`MT5_CONFIG_STORAGE_DECISION_D10.md`** — D10.5 (storage/settings sin persistencia real); **`mapazapp-mt5-bridge-readiness.ts`** — D10.6 (readiness carpeta bridge, deps opcionales); **`MT5_BRIDGE_FILE_DISCOVERY_AUDIT_D10.md`** — D10.7 (audit discovery read-only); **`mapazapp-bridge-sample-metadata.ts`** — D10.8 (metadata muestras); **D10.9** — copy panel MT5 sin acciones; **`END_TO_END_READINESS_AUDIT_D10.md`** — D10.10 (readiness E2E antes de live). **Sin** lanzar MT5, **sin** watcher, **sin** POST de acciones.
- **D11.0–D11.2:** **`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`** — D11.0 (auditoría packaging/runtime, **sin** `.exe`); **`mapazapp-launcher-config-model.ts`** + tests — D11.1 modelo config local futura (**sin** I/O archivo real, **sin** `spawn`); **`mapazapp-e2e-dry-run.ts`** + **`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`** + script **`mapazapp:e2e-dry-run`** — D11.2 dry-run declarativo (**sin** levantar API/dashboard/MT5 desde el helper). Todo **no operacional**.
- **D11.3–D11.5:** **`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`** — D11.3 plan primer run local (**sin** ejecución en ese checkpoint); **`mapazapp-launcher-process-lifecycle.ts`** — D11.4 ciclo de vida hijo declarativo (**sin** APIs de proceso); **`mapazapp-launcher-ownership-model.ts`** — D11.5 instancia/puertos declarativo (**sin** lockfile/bind real). Sigue **no operacional**.
- **D11.6–D11.8 (solo documentación):** **`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`** — política start/stop seguro futuro; **`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`** — decisión de prototipo supervisado (API-only preferido); **`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`** — compuerta/checklist antes del primer run real. **Sin** launcher `.exe`, **sin** `spawn` nuevo, **sin** ejecutar el primer run dentro de estos checkpoints.
- **D11.9 (solo documentación):** **`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`** — plan operativo del primer run **API-only** (sin dashboard); **sin** ejecutar procesos en ese checkpoint; ejecución material → **D12.0** (o equivalente) tras aprobación explícita.
- **D12.0–D12.1:** primer run **API-only** supervisado ejecutado **OK** sobre commit **`b267b70`**; evidencia **`API_ONLY_RUN_EVIDENCE_D12.md`**. **D12.2:** plan **`API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md`**. **D12.3–D12.4:** primer run **API + dashboard** supervisado **OK** sobre **`63f39eb`**; evidencia **`API_DASHBOARD_RUN_EVIDENCE_D12.md`**. **D12.5:** plan **`DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md`**. **D12.6–D12.7:** run visual **limitado por entorno** sobre **`955f41a`** — **`DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`**. **D12.8–D12.9:** evidencia parcial agente sobre **`0f1362a`** — **`DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md`**. **D12.10–D12.11:** verificación visual **humana OK** (operador) + evidencia **`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`**. **D12 cerrada** (incl. evidencia humana D12.11). **D13.0:** [`NEXT_RUNTIME_EXPANSION_GATE_D13.md`](./NEXT_RUNTIME_EXPANSION_GATE_D13.md). **D13.1:** [`LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) — diseño supervisor API-only. **D13.2:** prototipo **`mapazapp:api-only-supervisor`** en `@workspace/scripts` (`mapazapp-api-only-supervisor.ts`) — **solo** API, `spawn` confinado a ese archivo, **run real OK** (`b4189a6`). **D13.3:** [`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md) — evidencia formal del run (docs-only). **D13.4:** [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) — diseño supervisor **API + dashboard**. **D13.5:** prototipo **`mapazapp:api-dashboard-supervisor`** (`mapazapp-api-dashboard-supervisor.ts`) — API + Vite dev en loopback, health/runtime + HTTP + CORS, cleanup ordenado; `spawn` solo en ese archivo; **run real OK** (`64f06f9`). **D13.6:** [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md) — evidencia formal del run (docs-only). **D13.7:** [`PACKAGING_RUNTIME_DECISION_GATE_D13.md`](./PACKAGING_RUNTIME_DECISION_GATE_D13.md) — compuerta packaging/runtime (docs-only). **D13.8:** [`SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md`](./SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md) — plan hardening/evidence polish supervisores (docs-only). **D13.9:** [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md) — diseño packaging launcher local **sin** ejecutable (docs-only). **D14.0:** [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) — compuerta del **prototipo launcher local** (opciones A–E, preconditions, allowed scope, layout/manifest/wrapper gates **D14.1–D14.3**, riesgos); decisión sobre **D13.9.1**: **opcional** (no bloqueante para **D14.1**/**D14.2** declarativo, recomendable antes de packaging real o **`.exe`**); **D13.8.1** opcional; **sin** `.exe` ni código. **D14.1:** [`LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md`](./LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md) — modelo de layout de runtime local (**docs-only**; **sin** escrituras a disco). **D14.2:** [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) — contrato de manifest dry-run (**docs-only**; **sin** copiar archivos, **sin** JSON ejecutable fuera de docs, **sin** `.exe`). **D14.3:** [`LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md`](./LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md) — decisión de wrapper local y secuencia **D14.4–D14.7** (**D14.3**/**D14.6** docs-only; **D14.7** código). **D14.4:** **`mapazapp-local-launcher-wrapper-model.ts`** + **`mapazapp-local-launcher-wrapper-model.test.ts`** — modelo TS puro del wrapper (**sin** proceso, **sin** I/O). **D14.5:** **`mapazapp-local-launcher-wrapper-dry-run.ts`** + tests + script **`mapazapp:launcher-wrapper-dry-run`** — CLI dry-run read-only sobre el modelo **D14.4** (**sin** start real). **D14.6:** [`REAL_WRAPPER_PROTOTYPE_GATE_D14.md`](./REAL_WRAPPER_PROTOTYPE_GATE_D14.md) — compuerta del wrapper real (documentación). **D14.7:** **`mapazapp-local-launcher-wrapper.ts`**, tests, script **`mapazapp:launcher-wrapper`** — dry-run por defecto; **`--confirm-start`** para run-once vía supervisor **D13.5**; **sin** `.exe`/installer/packaging. **Strategic pause (post–D14.7):** After the D14.7 wrapper prototype, the project is paused from runtime expansion and refocused on **Engine Setup Proof E1** ([`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md)). **E2** audit: [`ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md`](./ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md). **E3:** [`XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md`](./XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md) — data health de **exportes/evidencia** (CSV/JSON), no motor principal del backtest. **E3.1 (corrección de rumbo):** [`MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`](./MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md) — **backtest principal del setup = MT5 Strategy Tester + `Mapazapp_BacktestEA`**; TypeScript/core como auxiliar. **E3.2 (contrato BacktestEA):** [`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](./BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md) — contrato formal Setup V1 / bias / export antes de MQL5. **E3.3 (esqueleto BacktestEA):** artefacto `APP/artifacts/mt5/experts/Mapazapp_BacktestEA/` — guard tester-only, exports base, README. **E3.4 (Daily Bias V1):** [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](./BACKTESTEA_DAILY_BIAS_V1_E3_4.md) — vela cerrada previa en `InpDailyBiasTimeframe`, eventos `daily_bias_evaluated`, summary con `has_real_daily_bias_logic: true`. **Siguiente recomendado:** **E3.5 — Setup V1 IFVG detection en Mapazapp_TestEA** (único EA oficial de tester; ver [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)). **D14.8+** quedan en cola hasta avanzar fase E (tester + evidencia) salvo hotfixes de seguridad.

## V2-16 handoff update

- Checkpoint: `V2-16 — Dashboard/API Connection Cleanup`.
- API (`@workspace/api-server`): GET mock-only `backtest-campaigns/mock-latest`, `parameter-grid/mock-latest`, `walk-forward/mock-latest`, `manual-campaign/mock-latest` — adaptadores bajo `src/mapazapp/adapters/` (fixtures core); envelope con `mockOnly`, `reviewOnly`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`; sin POST en estas rutas.
- Dashboard: `engineEvidenceCoreSnapshots.ts`, `*DataSource.ts` + `mock*DataSource.ts`, `engineEvidenceUi.ts` (copy conservador); `BacktestsPage` tarjetas resumen; `ParameterSetsPage` enlace a evidencia; sin upload, sin ejecutar, sin aprobar.
- No cambia motor core, no persistencia, no WebSocket, no ejecución.
- Siguiente planificado: V2-17 (import UI o CLI).

## V2-15 handoff update

- Checkpoint: `V2-15 — Walk-forward / Train-Validation-Forward Evaluator`.
- Core: `evaluateWalkForward`, `walk-forward-*.ts` — agrupa runs por parameter set × símbolo × split; riesgo de sobreajuste, estabilidad v1, recomendaciones conservadoras; puede consumir `ParameterGridResult`, `BacktestCampaignResult` o ejecutar `runParameterGrid` internamente si se proveen `datasets` + `parameterSets` + `campaignSettings`.
- No optimizador, no auto-aprobación, no mutación de registry; flags `reviewOnly`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`.
- Referencia: `APP/artifacts/mapazapp/docs/V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`.
- Consumo V2-16: `GET /api/mapazapp/walk-forward/mock-latest` (mock) y mocks in-process en dashboard.

## V2-14 handoff update

- Checkpoint: `V2-14 — Parameter Set Grid Runner v1`.
- Core: `runParameterGrid`, `parameter-grid-*.ts` — una campaña `runBacktestCampaign` aislada por candidato sobre los mismos datasets (filtro opcional `compatibleCanonicalSymbols`), ranking `gridRankScore` conservador.
- No optimizador desatendido, no auto-aprobacion, no mutacion de registry; flags `reviewOnly`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`.
- Referencia: `APP/artifacts/mapazapp/docs/V2_14_PARAMETER_SET_GRID_RUNNER_V1.md`.
- Consumo típico: evidencia puede alimentar V2-15 (`evaluateWalkForward`).

## V2-13 handoff update

- Checkpoint: `V2-13 — Campaign Runner over Manual Datasets`.
- Core: `runManualDatasetCampaign`, `manual-campaign-*.ts` (tipos, razones, runner, fixtures); solo texto en memoria, sin `fs`, sin watcher, sin DB.
- Conecta import manual V2-11 + validación de export V2-12 + `runBacktestCampaign` (V2-10). Bundles solo TestEA: validación/evidencia, no dataset de velas salvo mezcla con velas en el mismo input.
- Resultado: `reviewOnly: true`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`; sin texto CSV crudo en salidas.
- Referencia: `APP/artifacts/mapazapp/docs/V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`.
- Siguiente planificado: V2-14 (parameter set grid runner v1).

## V2-12 handoff update

- Checkpoint: `V2-12 — Real Export Sample Validation from BridgeEA/TestEA`.
- Core: `validateBridgeEaExportSample`, `validateTestEaExportSample`, `validateExportSampleBundle`, `scanExportSamplePrivacy`, `export-sample-validation-*.ts` (solo texto en memoria).
- No lee archivos reales del disco; no watcher; no DB; no ejecucion; no mutacion de registry; resultados con `executionEnabled: false`, `registryMutationAllowed: false`, `reviewOnly: true`.
- Referencia: `APP/artifacts/mapazapp/docs/V2_12_REAL_EXPORT_SAMPLE_VALIDATION.md`.
- Consumo en pipeline: V2-13 (`runManualDatasetCampaign`).

## V2-11 handoff update

- Core: `importManualCandleDataset`, `createBacktestCampaignDatasetFromManualImport`, tipos/razones/fixtures sinteticos bajo `manual-candle-dataset-*.ts`.
- Solo texto CSV en memoria: sin file watcher, sin DB, sin escaneo MT5, sin ejecucion, sin mutacion de registry.
- Referencia: `APP/artifacts/mapazapp/docs/V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`.

## V2-10 handoff update

- Modulo en core: `runBacktestCampaign(input)` con ranking conservador multi-simbolo y agregacion por parameter set.
- Seguridad intacta: `executionEnabled: false`, `registryMutationAllowed: false`, `reviewOnly: true`.
- No hay auto-aprobacion ni claims de rentabilidad.
- Referencia tecnica: `APP/artifacts/mapazapp/docs/V2_10_SYMBOL_RANKING_BACKTEST_CAMPAIGN_RUNNER.md`.
# Cursor Handoff — Mapazapp Trading Guard Dashboard

**Repo layout:** planning specs = `00_START_HERE/` and `Mapazapp_Replit_Handoff_V1/` at repo root; this mock = `APP/artifacts/mapazapp/`. See `00_START_HERE/CURSOR_NAVIGATION_NOTE.md` for what to ignore (`mockup-sandbox`, `api-server`, `old/`, nested ZIPs).

**Before implementing strategy, MT5 bridge, scanner, backtesting or risk calculations, read the Symbol Precision / Tick / Pip Normalization addendum:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`.

**Before implementing the strategy engine, TestEA, scanner or risk-aware trade-ready logic, read Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md`.

**Before starting a new implementation checkpoint, read** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`.

**Before implementing CP18, read** `APP/artifacts/mapazapp/docs/CP18_SCOPE_FREEZE.md` — CP18 is a **gated future-phase readiness layer**; it **does not** enable real execution, `POST` command routes, MT5 command reading, or BridgeEA/TestEA logic changes.

**Before planning CP19+ or any execution/infrastructure expansion, read** `APP/artifacts/mapazapp/docs/CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md` — engine/heart proof is prioritized over execution plumbing, and profitability remains unproven at CP18.5.

**Roadmap V2 progress pointer:** `APP/artifacts/mapazapp/docs/V2_01_ENGINE_REALITY_AUDIT.md` — V2-01 expands deterministic engine fixtures/tests and documents current strengths/gaps before replay-phase work.
**Roadmap V2 replay pointer:** `APP/artifacts/mapazapp/docs/V2_02_CANDLE_REPLAY_TRADE_SIMULATOR.md` — V2-02 introduces deterministic candle replay outcomes (trigger/missed/expired/SL/TP/ambiguity + MAE/MFE), still review-only.
**Roadmap V2 entry/SL/TP pointer:** `APP/artifacts/mapazapp/docs/V2_03_ENTRY_SL_TP_MODEL_V1.md` — V2-03 adds `buildEntrySlTpPlan` (modes, dynamic buffer, R:R, timing v1) and `replayInputPreview` for `simulateReplayTrade`, still review-only.
**Roadmap V2 IFVG replay backtest pointer:** `APP/artifacts/mapazapp/docs/V2_04_IFVG_STRATEGY_REPLAY_BACKTEST.md` — V2-04 adds `runIfvgReplayBacktest` (detection → trade plan → Entry/SL/TP → replay → metrics in R), still review-only and non-profitability-proof.
**Roadmap V2-04.1:** `ZoneCandidate.candidateTiming` (`CandidateTimingMetadata` in `candidate-timing.ts`) propagates FVG/IFVG bar indices from detectors; replay prefers this over parsing `sourceIfvgId`. Full-series detection remains a v1 limitation.
**Roadmap V2-05 — Decision model / soft-score:** `evaluateDecisionModel` + replay trace fields (`decisionModelResult`, `effectiveScoreForReplay`, `legacyDefaultScore`); see `APP/artifacts/mapazapp/docs/V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md`.
**Roadmap V2-06 — Human-like tolerance calibration:** `evaluateToleranceCalibration` + optional `DecisionModelInput.toleranceCalibrationResult` / `toleranceIntegration`; see `APP/artifacts/mapazapp/docs/V2_06_HUMAN_LIKE_TOLERANCE_CALIBRATION.md`.
**Roadmap V2-07 — HTF bias / context:** `evaluateContextBias` + optional `DecisionModelInput.contextBiasResult` / `contextBiasIntegration`; optional `IfvgReplayBacktestInput.htfCandlesByTimeframe`; see `APP/artifacts/mapazapp/docs/V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md`.
**Roadmap V2-08 — Entry variant model:** `evaluateEntryVariant` + optional `DecisionModelInput.entryVariantResult` + optional `EntrySlTpModelInput.entryVariantResult` (warnings); see `APP/artifacts/mapazapp/docs/V2_08_ENTRY_VARIANT_MODEL.md`.
**Roadmap V2-09 — Target / liquidity objective:** `evaluateTargetObjective` + optional `DecisionModelInput.targetObjectiveResult` + optional `EntrySlTpModelInput.targetObjectiveResult`; see `APP/artifacts/mapazapp/docs/V2_09_TARGET_LIQUIDITY_OBJECTIVE_MODEL.md`.
**Roadmap V2-11 — Manual candle dataset import:** `importManualCandleDataset` + `createBacktestCampaignDatasetFromManualImport`; see `APP/artifacts/mapazapp/docs/V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`.
**Roadmap V2-12 — Export sample validation:** `validateExportSampleBundle` + privacidad heurística; see `APP/artifacts/mapazapp/docs/V2_12_REAL_EXPORT_SAMPLE_VALIDATION.md`.
**Roadmap V2-13 — Manual dataset campaign pipeline:** `runManualDatasetCampaign`; see `APP/artifacts/mapazapp/docs/V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`.
**Roadmap V2-14 — Parameter set grid runner:** `runParameterGrid`; see `APP/artifacts/mapazapp/docs/V2_14_PARAMETER_SET_GRID_RUNNER_V1.md`.
**Roadmap V2-15 — Walk-forward evaluator:** `evaluateWalkForward`; see `APP/artifacts/mapazapp/docs/V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`.
**Roadmap V2-16 — Dashboard/API evidence cleanup:** mock GET `.../mock-latest` routes + dashboard `*DataSource` / `engineEvidenceUi`; see `ROADMAP_V2_MASTER_EXECUTION_PLAN.md` § V2-16. Further items (e.g. V2-17).

This document gives Cursor (or any future developer) everything needed to continue building Mapazapp from where the Replit mock phase left off.

---

## Shared core package (`@workspace/mapazapp-core`)

- **Location:** `APP/lib/mapazapp-core/`
- **Purpose:** Pure TypeScript — symbol normalization, zone/risk primitives, IFVG **lifecycle** skeleton, **checkpoint 2** strategy detection, **checkpoint 3** **trade review plan** evaluation (`evaluateTradeReviewPlan`), **checkpoint 6** account guard, **checkpoint 7** strategy/parameter-set registry (`evaluateParameterSetCompatibility`), **checkpoint 8** backtest run/trade model, CSV import skeleton, and advisory **`evaluateBacktestApproval`**, plus **checkpoint 10** BridgeEA **file contract parsers** (JSON + CSV on in-memory strings only — **no** disk path, **no** MT5 socket), plus **V2-11** **manual candle dataset import** (`importManualCandleDataset`, `createBacktestCampaignDatasetFromManualImport` — CSV text only, **no** watcher / DB / live folder scan), plus **V2-12** **export sample validation** (`validateExportSampleBundle`, `validateBridgeEaExportSample`, `validateTestEaExportSample` — in-memory text only, **no** real-path ingest), plus **V2-13** **manual dataset campaign pipeline** (`runManualDatasetCampaign` — orchestrates V2-11 + V2-12 + `runBacktestCampaign`, **no** auto-approval), plus **V2-14** **parameter set grid runner** (`runParameterGrid` — compares parameter sets on shared datasets via isolated campaigns, **no** auto-approval), plus **V2-15** **walk-forward / train-validation-forward evaluator** (`evaluateWalkForward` — split governance and overfit/stability heuristics on campaign/grid outputs, **no** auto-approval), plus **checkpoint 12** **offline scanner simulation** (`runScannerSimulation`, `runScannerSimulationFromBridgeCandlesCsv`, `bridgeCandleRowToCandle`, `scanner-fixtures`, `runCheckpoint12ScannerFixture` — **not** a live scanner daemon, **not** execution). **Checkpoint 13** adds a separate **MQL5 export-only EA** under `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` (not compiled by this repo); core parsers remain the validation target for wire format. **Checkpoint 14** adds **`Mapazapp_TestEA`** under `APP/artifacts/mt5/experts/Mapazapp_TestEA/` — **Strategy Tester only**, **virtual** CSV/JSON export (`MZP_TESTEA_V1`) aligned with **`importBacktestTradesFromCsv`**; **not** BridgeEA, **not** live orders. **Checkpoint 15** adds **`evaluateBacktestEvidence`** + **`createBacktestEvidenceBundleFromCsvTexts`** + advisory **`BacktestEvidenceApprovalProposal`** (multi-run splits; **no** registry mutation, **no** MT5 folder ingest). **Checkpoint 16** adds **`evaluateForwardMonitorSnapshot`** + **`forward-monitor-fixtures`** — observational forward/demo **monitor** over merged scanner snapshots (**no** file watcher, **no** DB, **no** WebSocket, **no** execution). **Checkpoint 17** adds **`validateAssistedExecutionIntent`** + **`assisted-execution-fixtures`** — **assisted execution contract** (gates, human confirmations, audit DTO) — **no** broker submission, **no** MT5 command channel, **no** automation (`executionEnabled` / `sendToMt5Enabled` / `canAutoExecute` always false on results). **Checkpoint 18** adds **`assisted-execution-invariants`** — assert / normalize / safety snapshot helpers and **`registryMutationAllowed: false`** / **`manualReviewRequired: true`** on results — still **no** execution. **No** React, HTTP, live MT5 from TypeScript, DB, WebSocket, or order execution in core.
- **Tests:** from `APP/` run `pnpm --filter @workspace/mapazapp-core test` and `pnpm --filter @workspace/mapazapp-core typecheck`. Strategy coverage in `tests/checkpoint2-strategy.test.ts`; trade plan coverage in `tests/checkpoint3-trade-plan.test.ts` (synthetic inputs only); backtest model / CSV / approval / TestEA-shaped CSV sample in `tests/checkpoint8-backtest.test.ts`; bridge contract parsers in **`tests/checkpoint10-bridge-contract.test.ts`**; scanner simulation in **`tests/checkpoint12-scanner-simulation.test.ts`**; multi-run evidence loop in **`tests/checkpoint15-backtest-evidence.test.ts`**; forward monitor in **`tests/checkpoint16-forward-monitor.test.ts`**; assisted execution contract in **`tests/checkpoint17-assisted-execution.test.ts`**; CP18 safety invariants in **`tests/checkpoint18-assisted-execution-invariants.test.ts`**; V2 replay in **`tests/v2-02-replay-trade-simulator.test.ts`**; V2 entry/SL/TP in **`tests/v2-03-entry-sl-tp-model.test.ts`**; V2 IFVG replay backtest in **`tests/v2-04-ifvg-replay-backtest.test.ts`**; V2 decision model in **`tests/v2-05-decision-model.test.ts`**; V2 tolerance calibration in **`tests/v2-06-tolerance-calibration.test.ts`**; V2 HTF context in **`tests/v2-07-context-bias-engine.test.ts`**; V2 entry variants in **`tests/v2-08-entry-variant-model.test.ts`**; V2 target / liquidity objectives in **`tests/v2-09-target-objective-model.test.ts`**; V2-10 campaign runner in **`tests/v2-10-backtest-campaign-runner.test.ts`**; V2-11 manual candle CSV import in **`tests/v2-11-manual-candle-dataset-importer.test.ts`**; V2-12 export sample validation in **`tests/v2-12-export-sample-validation.test.ts`**; V2-13 manual campaign pipeline in **`tests/v2-13-manual-campaign-runner.test.ts`**; V2-14 parameter grid in **`tests/v2-14-parameter-grid-runner.test.ts`**; V2-15 walk-forward evaluator in **`tests/v2-15-walk-forward-evaluator.test.ts`**.
- **Test fixtures:** documented in `docs/IMPLEMENTATION_ASSUMPTIONS.md` (not broker truth).

### Strategy detection modules (checkpoint 2)

| Module | Role |
|--------|------|
| `src/candle.ts` | Normalized `Candle` (OHLC + optional volume/spread/isClosed). |
| `src/atr.ts` | True range + Wilder ATR series / last ATR. |
| `src/swing-detector.ts` | Swing high/low with configurable left/right bars + confirmation index. |
| `src/liquidity-sweep.ts` | Lower-pool / upper-pool sweep with dynamic tolerances (`normalize` helpers). |
| `src/displacement.ts` | Bullish/bearish displacement vs ATR + close position. |
| `src/fvg-detector.ts` | 3-candle FVG + ATR size filter. |
| `src/ifvg-converter.ts` | FVG → IFVG with dynamic break buffer + close/wick mode. |
| `src/zone-candidate.ts` | Padded zone from IFVG + tick rounding; initial state `WAIT_RETEST` / `OBSERVE` only; optional `candidateTiming` (V2-04.1). |
| `src/candidate-timing.ts` | `CandidateTimingMetadata` + `buildCandidateTimingMetadataFromIfvg` for replay anti-lookahead. |
| `src/retest-detector.ts` | `full_zone` / `midpoint` / `edge` retest. |
| `src/confirmation-detector.ts` | Post-retest confirmation + optional wick rule. |
| `src/strategy-settings.ts` | Grouped `IfvgStrategySettings` + `createDefaultIfvgStrategySettingsForTests()`. |
| `src/strategy-score.ts` | Blueprint §17 weighted score + hard-gate cap. |
| `src/decision-model.ts` | V2-05 `evaluateDecisionModel` — hard gates + weighted soft score + variant + confidence band (review-only). |
| `src/decision-model-fixtures.ts` | Synthetic `DecisionModelInput` bundles for tests. |
| `src/tolerance-calibration.ts` | V2-06 `evaluateToleranceCalibration` — dynamic ATR/spread/tick tolerance matrix + optional decision-model blend hooks. |
| `src/tolerance-calibration-fixtures.ts` | Synthetic multi-symbol tolerance scenarios for tests. |
| `src/context-bias-engine.ts` | V2-07 `evaluateContextBias` — HTF swing/slope bias, range position, MTF conflict, chop proxy. |
| `src/context-bias-fixtures.ts` | Synthetic HTF candle bundles for context tests. |
| `src/entry-variant-model.ts` | V2-08 `evaluateEntryVariant` — entry style / timing / quality (review-only). |
| `src/entry-variant-fixtures.ts` | Synthetic entry-variant scenarios for tests. |
| `src/target-objective-model.ts` | V2-09 `evaluateTargetObjective` — TP / liquidity candidates, R:R and timing classification (review-only). |
| `src/target-objective-fixtures.ts` | Synthetic target-objective scenarios for tests. |
| `src/strategy-detection.ts` | `detectIfvgZoneCandidates` pipeline (single-series assumption; see assumptions doc). |
| `src/no-trade-reason.ts` | Pipeline warning string union (complements hard-gate codes in `risk-primitives`). |

### Trade review plan (checkpoint 3)

| Module | Role |
|--------|------|
| `src/trade-plan-types.ts` | `TradeReviewPlan`, `TradePlanInput`, `TradePlanStatus` / `TradePlanAction`, guard + evaluation result types. |
| `src/trade-plan-settings.ts` | `TradePlanEvaluationSettings` + **`createDefaultTradePlanEvaluationSettingsForTests()`** (non-optimized defaults). |
| `src/trade-plan-reasons.ts` | Stable **`TradePlanReasonCode`** values + `tradePlanReason()` helper text. |
| `src/trade-plan-targets.ts` | SL buffer (`slBufferPrice`), **`fixed_R`** TP, entry band, **`computeTradePlanRiskMetrics`** (risk/reward/R:R, distances in price / point / ticks). |
| `src/trade-plan-gates.ts` | `collectTradePlanHardGateFailures` + `scoreBlocksTradeReady` — account/spread/parameter-set/R:R/SL-width gates (subset of blueprint H1–H8 style). |
| `src/trade-plan-evaluator.ts` | **`evaluateTradeReviewPlan`** — lifecycle precedence (USED / EXPIRED / INVALIDATED → retest → confirmation → gates → score → near-sweep rule → `TRADE_READY`). |

**Consumption:** future UI or backend calls **`evaluateTradeReviewPlan`** with a **`ZoneCandidate`** from `detectIfvgZoneCandidates` (or persisted mirror), merges **account/risk snapshot** into `accountGuard`, passes **score** from `computeStrategyScore`, and surfaces **`plan.simpleSummary`**, **`plan.status`**, and **`plan.reasons`** / **`plan.noTradeReasons`** — still **no order placement**, no BridgeEA, no WebSocket.

## In-process service layer (`src/services/`)

- **Checkpoint 1:** `AccountDataSource` + `createMockAccountDataSource()` — reads existing `src/mock/` data, requires `accountId`, **no** `fetch`, no Express.
- **Checkpoint 4 / 7:** `DashboardMockDataSource` (`tradeReviewDataSource.ts` + `mockTradeReviewDataSource.ts`) — **`createMockDashboardDataSource()`** exposes **`getZonesForAccount`**, **`getTradeReviewPlansForAccount`** (includes **`registryCompatibility`** per row), **`getTradeReviewPlanByZoneId`**, **`getAlertsForAccount`**, and **`getAccountSnapshot`** (delegates to checkpoint 1). Mock zones are mapped through **`mapMockZoneToCore.ts`**, risk through **`mapMockRiskToTradePlanGuard.ts`** with registry-derived **`approvedParameterSetForAccount`**, symbols through **`mockSymbolProfiles.ts`**, then **`evaluateTradeReviewPlan`** from `@workspace/mapazapp-core`. **No** backend, MT5, execution, WebSocket, or DB.
- **Checkpoint 9:** **`StrategyRegistryReadModelDataSource`** (`strategyRegistryDataSource.ts` + **`mockStrategyRegistryDataSource.ts`**) — read-only registry + compatibility + CP8 advisory + **CP15** **`getParameterSetBacktestEvidenceBundle`** for inspector pages; **`strategyRegistryUi.ts`** for badges and summaries; **`backtestEvidenceUi.ts`** for CP15 plain-language lines. **No** `fetch`, **no** editing.
- **Checkpoint 10:** **`loadMockBridgeExportBundle()`** in **`bridgeMockExportDataSource.ts`** — parses **`bridge-fixtures.ts`** from core (fictional **`MZP_BRIDGE_V1`** / legacy **`QTG_BRIDGE_V1`** alias) via **`parseBridgeStatusJson`** + CSV parsers; **`bridgeImportUi.ts`** formats diagnostics. **`BridgePage.tsx`** surfaces schema, terminal, login, symbols, market row tick times, and aggregate import warnings/errors — **mock inspection only** (no file picker, no watcher, no backend).
- **UI wiring:** `HomePage` (review-ready strip + banner counts), `ZonesPage` (core status badge + reason line), and `ZoneDetailPage` (core review block + technical fields + link to **`/parameter-sets/:id`**) consume the dashboard data source. **`ParameterSetsPage`** / **`ParameterSetDetailPage`** use the checkpoint 9 read-only registry source. Other pages still use mock imports directly where unchanged.
- **Copy / UX:** “Review-ready”, “manual review only”, and **`TradeReviewStatusBadge`** reinforce that **`TRADE_READY`** is **not** an order signal.

### Trade review explanation layer (checkpoint 5)

| Module / component | Role |
|--------------------|------|
| `src/services/tradeReviewExplanation.ts` | Pure **`buildTradeReviewExplanation(evaluation)`** — maps `TradePlanEvaluationResult` → **`TradeReviewExplanation`** (titles, “what it means”, missing items, blocking/positive reasons, **`technicalReasons`** for audit, **`manualReviewOnly: true`**). **`mapReasonCode`** maps stable **`TradePlanReasonCode`** / hard-gate strings → user + technical copy, severity, category; unknown codes → simple “Review required.”, technical = raw code. |
| `src/services/tradeReviewUi.ts` | Thin helpers: **`primaryReviewMessage`** / **`simpleLanguageForReviewStatus`** delegate to the explanation layer where useful. |
| `src/components/TradeReviewExplanationCard.tsx` | Simple-mode decision panel (no reason-code table — that stays in Technical). |
| `src/components/ReasonCodeList.tsx` | Technical list: code, category, technical line. |
| **Pages** | **`HomePage`**: review-ready strip uses explanation summary + “Manual review only” + up to two reason lines. **`ZonesPage`**: short review line + missing/blocked hints. **`ZoneDetailPage`**: full explanation card (Simple) + **`ReasonCodeList`** + enriched **`core_trade_review`** rows (plan `strategyId` / `parameterSetId` / `canonicalSymbol` / `accountId`, SL/TP/R:R, hard gates). |

**Contract:** a future backend may return **`TradeReviewPlan`** / evaluation DTOs unchanged; the frontend (or another client) can still run **`buildTradeReviewExplanation`** for consistent copy. **No** execution, MT5, WebSocket, or DB.

### Account / risk guard core (checkpoint 6)

| Module | Role |
|--------|------|
| `account-guard-types.ts` | **`AccountGuardInput`**, **`AccountGuardResult`**, **`AccountGuardStatus`**, **`AccountGuardReasonCode`**, **`AccountRiskSnapshot`**, **`PropFirmRuleSnapshot`**, **`AccountGuardSettings`**, **`AccountTradePermission`**, metrics. |
| `account-guard-settings.ts` | **`createDefaultAccountGuardSettingsForTests()`** — dev defaults only. |
| `account-guard-reasons.ts` | Stable **`AccountGuardReason`** text factory. |
| `account-guard-evaluator.ts` | **`evaluateAccountGuard`**, **`accountGuardResultToTradePlanAccountGuardInput`**. |
| `trade-plan-gates.ts` | Conditional operational hard gate: watch-only / news / bridge respect **`TradePlanEvaluationSettings`** alignment flags. |
| Mock | **`mapMockRiskToTradePlanGuard`** → core guard → **`TradePlanAccountGuardInput`**; **`getAccountGuardEvaluation`** on dashboard data source. |

**Separation:** account guard answers **whether the account may participate in trade review**; trade plan evaluator answers **whether a zone candidate passes lifecycle + score + R:R + spread gates** for **`TRADE_READY`**. Both must pass for **`TRADE_READY`** (account guard still flows through **`TradePlanAccountGuardInput`**).

### Strategy / parameter-set registry (checkpoint 7)

| Module | Role |
|--------|------|
| `strategy-registry-types.ts` | **`StrategyDefinition`**, **`ParameterSetDefinition`**, **`ParameterSetRegistry`**, compatibility result types, **`ParameterSetRequestedUsage`**. |
| `strategy-registry-settings.ts` | **`StrategyRegistryEvaluationSettings`** (broker mismatch vs warn-on-missing). |
| `strategy-registry-reasons.ts` | Human-readable labels for block/warning codes. |
| `strategy-registry-evaluator.ts` | **`evaluateParameterSetCompatibility`**, **`accountHasApprovedTradeReviewParameterSet`**. |
| `strategy-registry-fixtures.ts` | **`createCheckpoint7MockParameterSetRegistry()`** — mock/test doubles only. |
| `trade-plan-types.ts` | Optional **`TradePlanInput.registryCompatibility`**. |
| `trade-plan-reasons.ts` | Registry block → **`TradePlanReason`** mapping for **`APPROVED_PARAMETER_SET_REQUIRED`**. |
| Mock / dashboard | **`MOCK_CHECKPOINT7_STRATEGY_REGISTRY`** in **`mockTradeReviewDataSource.ts`**; per-row **`registryCompatibility`** on **`TradeReviewPlanRow`**; mock **`zones.ts`** / **`backtests.ts`** ids aligned with registry; Home / Zones / Zone Detail / Backtests minimal UI. |

**Rule:** **`TRADE_READY`** in core requires **`parameterSetStatus === approved_for_trade_review`** for that symbol and account (plus existing gates). **`approved_for_alerts`** and draft/validated rows must **not** produce trade-ready review — they surface as **`PARAMETER_SET_ALERTS_ONLY`** / **`PARAMETER_SET_DRAFT`** / **`PARAMETER_SET_NOT_VALIDATED`** in reasons when the parameter-set gate blocks.

### Backtest result model (checkpoint 8)

| Module / export | Role |
|-----------------|------|
| `backtest-types.ts` | `BacktestRun`, `BacktestTrade`, `BacktestSummary`, import/approval DTOs, `BacktestDatasetSplit`, `BacktestSourceType`. |
| `backtest-metrics.ts` | Pure **`calculateBacktestSummary`** (+ granular metric helpers) from trade arrays — empty-safe. |
| `backtest-importer.ts` | **`importBacktestTradesFromCsv`**, **`assembleBacktestRunFromImportedTrades`** — string CSV only; validates required columns. |
| `backtest-approval.ts` | **`evaluateBacktestApproval`** (advisory statuses; does **not** mutate registry), **`deriveRecommendedParameterSetStatusFromBacktest`**. |
| `backtest-fixtures.ts` | Fictional runs + **`getCheckpoint8MockApprovalForParameterSet`** for dashboard/tests. |

**Not implemented:** backend/dashboard **file ingest** of TestEA CSV from disk, persistence, registry auto-update from imports, or optimization loops. **Checkpoint 14** adds the **Mapazapp_TestEA** MQL5 exporter + fictional **`samples/`**; operators still copy CSV text manually into tooling using **`importBacktestTradesFromCsv`** until a watcher ships.

### Multi-run backtest evidence (checkpoint 15)

| Module | Role |
|--------|------|
| `backtest-evidence-types.ts` | `BacktestEvidenceBundle`, thresholds, split/run results, **`BacktestEvidenceApprovalProposal`**. |
| `backtest-evidence-evaluator.ts` | **`evaluateBacktestEvidence`**, **`createBacktestEvidenceBundleFromCsvTexts`**, grouping + **`candidate_*`** statuses only. |
| `backtest-evidence-fixtures.ts` | Fictional bundles for selected **`parameterSetId`** values (`getCheckpoint15MockEvidenceBundleByParameterSetId`). |

**Rule:** evidence may **recommend** registry statuses; **only** explicit human-controlled registry updates may **approve** a parameter set — **`registryMutationAllowed`** is always **`false`** on evaluation outputs; **`canAutoApply`** is **`false`** on proposals.

### Strategy / parameter set read-only UI (checkpoint 9 — dashboard)

| File | Role |
|------|------|
| `strategyRegistryDataSource.ts` | **`StrategyRegistryReadModelDataSource`** interface (read-only registry API). |
| `mockStrategyRegistryDataSource.ts` | **`createMockStrategyRegistryDataSource()`** — strategies + parameter sets from **`MOCK_CHECKPOINT7_STRATEGY_REGISTRY`**, **`evaluateParameterSetCompatibility`**, checkpoint-8 advisory lookup. |
| `strategyRegistryUi.ts` | Badge classification + Simple/Technical copy + IFVG **`settings` summary** helpers. |
| **`ParameterSetsPage.tsx`** | **`/parameter-sets`** — account-scoped table, **`supportsViewToggle`**. |
| **`ParameterSetDetailPage.tsx`** | **`/parameter-sets/:parameterSetId`** — TRADE_READY gate explanation, compatibility codes, CP8 advisory, **CP15 evidence** panel (mock bundle — **no** approve/upload), read-only settings. |

**Not implemented:** settings editing, optimization UI, registry persistence, server-backed registry, auto-approval from evidence.

### BridgeEA export contract parsers (checkpoint 10 — `@workspace/mapazapp-core` + minimal UI)

| Module / export | Role |
|-----------------|------|
| `bridge-types.ts` | Wire-aligned row/snapshot types (`BridgeStatusSnapshot`, `BridgeMarketSnapshotRow`, …). |
| `bridge-import-result.ts` | **`BridgeImportResult`**, stable **`BridgeDiagnosticCode`** list. |
| `bridge-parse-json.ts` | **`parseBridgeStatusJson`** — required fields per **`Mapazapp_MT5_Bridge_Connectivity_Contract_V1`** §9.1. |
| `bridge-parse-csv.ts` | **`parseBridgeMarketSnapshotCsv`**, account/candles/positions/orders/deals/errors — headers **exact** snake_case from contract + Build Spec. |
| `bridge-symbol-profile.ts` | **`deriveSymbolMarketSpecFromBridgeMarketSnapshot`** — builds **`SymbolMarketSpec`**; caller supplies **`canonicalSymbol`** + **`accountId`** (broker symbol ≠ canonical in production). |
| `bridge-account-key.ts` | **`makeBridgeAccountKey`** — composite string `terminal_id` + `account_login` + `account_server`; **no** persistence, **no** inferred app `accountId`. |
| `bridge-fixtures.ts` | Fictional export strings for tests + dashboard bundle. |

**Not implemented:** TypeScript **folder reads** / file watchers / backend ingest of live files, WebSocket tick stream, DB dedupe, inbound **command JSON**, live health polling from disk.

**Checkpoint 13 — MT5 BridgeEA (export-only MQL5):** source **`APP/artifacts/mt5/experts/Mapazapp_BridgeEA/Mapazapp_BridgeEA.mq5`** writes `bridge_status.json`, `latest_market_snapshot.csv` (includes **`last`** + **`session_status`** per CP10 parsers), `account_snapshot.csv`, `candles.csv`, `positions_open.csv`, `orders_pending.csv`, `deals_history.csv`, `bridge_errors.csv` under **`MQL5/Files/<InpExportRoot>/<InpTerminalId>/`** (default `Mapazapp\bridge\TERMINAL_A\`). **No** `OrderSend` / position close / `CTrade` / `WebRequest` / DLLs / inbound command files.

**Checkpoint 14 — MT5 TestEA (Strategy Tester export only):** source **`APP/artifacts/mt5/experts/Mapazapp_TestEA/Mapazapp_TestEA.mq5`** (`MZP_TESTEA_V1`) writes **`backtest_trades.csv`** + **`backtest_summary.json`** under **`MQL5/Files/<InpExportRoot>/<run_id>/`** (default `Mapazapp\testea\<run_id>\`). **`OnInit` fails on live charts** (`MQL_TESTER` guard). **Virtual export only** — **no** `OrderSend` / `CTrade`; placeholder trade row is **not** the IFVG engine and implies **no** profitability or registry promotion.

**CP14 real tester smoke note:** a manual Strategy Tester run **succeeded** (compile **0/0**); files were observed under the **local tester agent** sandbox (`MetaQuotes\Tester\…\Agent-…\MQL5\Files\…`), not necessarily under the interactive terminal data folder. **Do not** commit raw tester CSV/JSON; **`samples/`** stay fictional. Large placeholder **`result_r`** values are **not** performance evidence.

**Future flow:** BridgeEA writes exports → backend (or desktop agent) reads file **text** → core parsers validate → normalized models feed account/symbol/candle stores and UI. TestEA CSV → **`importBacktestTradesFromCsv`** → advisory **`evaluateBacktestApproval`** (still **no** registry mutation).

### Local mock HTTP API (checkpoint 11 — `@workspace/api-server`)

| Area | Role |
|------|------|
| `src/mapazapp/routes.ts` | Read-only **`GET /api/mapazapp/*`** — health, accounts, summaries, account guard, trade reviews, strategies, parameter sets, compatibility, backtests list + CP8 advisory, bridge mock import summary, **checkpoint 12** scanner simulation list/latest + per-account latest, **checkpoint 16** forward-monitor, **checkpoints 17–18** assisted-execution contract + **CP18** `/assisted-execution/safety` and `/assisted-execution/invariants`, **V2-16** `backtest-campaigns/mock-latest`, `parameter-grid/mock-latest`, `walk-forward/mock-latest`, `manual-campaign/mock-latest` (still **no** `POST` on those). |
| `src/mapazapp/response.ts` | Stable JSON envelope (`ok`, `data`, `warnings`, `errors`, `source: "mock"`, `mockOnly: true`). |
| `src/mapazapp/mockData.ts` | In-memory duplicates of dashboard mock fixtures (no React / Vite `@/` imports). |
| `src/mapazapp/lib/tradeReviewLogic.ts` | Same core evaluation path as `createMockDashboardDataSource` (registry + trade plan). |

**Product rule:** responses are **review-only**; **`executionEnabled`** is always **false** in trade-review envelopes. **No** MT5, DB, WebSocket, execution routes, or file watchers.

### Scanner simulation (checkpoint 12 — core + dashboard + API)

| Area | Role |
|------|------|
| `scanner-simulation.ts` | **`runScannerSimulation`** — validates input, runs **`detectIfvgZoneCandidates`**, registry + account guard, per-candidate **`evaluateTradeReviewPlan`**; flags **`reviewOnly`**, **`executionEnabled: false`**, **`simulatedScanner: true`**. |
| `scanner-bridge-candles.ts` | **`bridgeCandleRowToCandle`**, **`runScannerSimulationFromBridgeCandlesCsv`** — Bridge CSV text → candles → simulation; attaches parser diagnostics. |
| `scanner-fixtures.ts` | Fictional candle paths + **`runCheckpoint12ScannerFixture`** shared by **api-server** adapter and **dashboard** mock data source. |
| **API** | `GET /api/mapazapp/scanner/simulations`, `/scanner/simulations/latest`, `/accounts/:accountId/scanner/simulations/latest` — same envelope + review flags. |
| **Dashboard** | Route **`/scanner`** — `ScannerSimulationPage` + **`createMockScannerSimulationDataSource()`** (in-process; no `fetch` required). Sidebar **Scanner (sim)**. |

**Not implemented:** POST scan/run, job queue, live candle feed, real BridgeEA folder watcher, or treating simulation as live trading advice.

### Forward / demo monitor (checkpoint 16 — core + dashboard + API)

| Area | Role |
|------|------|
| `forward-monitor-evaluator.ts` | **`evaluateForwardMonitorSnapshot`** — session validation → account guard → registry gate → optional merged **`ScannerSimulationResult[]`** → candidate summaries + events + status; flags **`reviewOnly`**, **`executionEnabled: false`**, **`mockOnly`**, **`simulated`**. |
| `forward-monitor-fixtures.ts` | Fictional **`ForwardMonitorInput`** builders (The5ers XAU, PropXP EUR, guard-block, registry-block, empty scanner) — **not** user MT5 exports. |
| **API** | `GET /api/mapazapp/forward-monitor/latest`, `/forward-monitor/sessions`, `/accounts/:accountId/forward-monitor/latest` — envelope **`reviewOnly`**, **`executionEnabled: false`**, **`mockOnly: true`**. |
| **Dashboard** | Route **`/forward-monitor`** — `ForwardMonitorPage` + **`createMockForwardMonitorDataSource()`** + **`forwardMonitorUi.ts`**. Sidebar **Forward Monitor**. |

**Not implemented:** live monitor daemon, BridgeEA automatic ingest, WebSocket push, DB persistence of sessions, execute / “start bot” controls.

### Assisted execution contract (checkpoint 17 — core + dashboard + API)

| Area | Role |
|------|------|
| `assisted-execution-contract.ts` | **`validateAssistedExecutionIntent`** — pure gates on **`TradeReviewPlan`**, account guard, registry, symbol profile, SL/TP/R:R, optional evidence + forward-monitor cross-check, dedupe, confirmations + phrase; **`FUTURE_SEND_TO_MT5_DISABLED`** always blocks. |
| `assisted-execution-invariants.ts` | **CP18** — **`assertAssistedExecutionDisabled`**, **`normalizeAssistedExecutionSafetyFlags`**, **`createAssistedExecutionSafetySnapshot`**; static **`ASSISTED_EXECUTION_CP18_POLICY_REASON_CODES`** — never enables execution. |
| `assisted-execution-fixtures.ts` | Fictional **`AssistedExecutionValidationInput`** rows — **not** real accounts. |
| **API** | `GET /api/mapazapp/assisted-execution/contract`, `/assisted-execution/safety`, `/assisted-execution/invariants`, `/assisted-execution/mock-validation`, `/accounts/:accountId/assisted-execution/mock-validation` — envelope **`contractOnly: true`**, **`mockOnly: true`**, **`executionEnabled: false`**, **`sendToMt5Enabled: false`**, **`canAutoExecute: false`**, **`registryMutationAllowed: false`**, **`manualReviewRequired: true`**. **No** `POST`. |
| **Dashboard** | Route **`/assisted-execution`** — `AssistedExecutionPage` + **`createMockAssistedExecutionDataSource()`** + **`assistedExecutionUi.ts`** (CP18 banner + safety checklist + future-phase copy). Sidebar **Assisted Execution**. |

**Not implemented:** any live execution path, BridgeEA command reader, registry mutation from assisted flows. **CP18** hardens read-only safety only; **CP19+** would still require explicit product approval before any gated execution.

**Dashboard:** unchanged default for zones — still **`createMockDashboardDataSource()`** in-process. Scanner page uses **`createMockScannerSimulationDataSource()`** in-process; forward monitor uses **`createMockForwardMonitorDataSource()`** in-process; assisted execution uses **`createMockAssistedExecutionDataSource()`** in-process. Future: optional `fetch` to `/api/mapazapp/...` behind a feature flag or env.

## What remains mock-only (dashboard + integration)

- **Live** IFVG scanner, MT5 bridge ingest, WebSocket, DB, order execution — unchanged. Core contains **offline** detection math; the UI still uses `src/mock/` zones. **Checkpoint 14** ships an MQL5 **TestEA** artifact for Strategy Tester **file** export only — **no** dashboard/API file watcher yet. See **What Is NOT Implemented** below.

---

## What This Is

Mapazapp is a **trading intelligence and risk management dashboard** for disciplined prop firm traders. It is built as a visual mock: multiple dashboard routes (including read-only **Strategy & sets** inspection), realistic UI, complete data model — but **zero real logic**.

**Multi-account and multi-broker by design.** Every record in the system is scoped to an `accountId`. This was established from day one so the real backend can be account-aware from the start.

---

## What Is NOT Implemented

| Item | Status | Notes |
|------|--------|-------|
| MT5 terminal connection | NOT IMPLEMENTED | Dashboard / API have **no** socket to MT5 |
| BridgeEA (Expert Advisor) | **PARTIAL (CP13)** | **MQL5 artifact** in `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` — **export-only** EA for operators to compile in MetaEditor; **no** dashboard ingest, **no** command channel, **no** execution from Mapazapp |
| TestEA (Strategy Tester export) | **PARTIAL (CP14)** | **MQL5 artifact** in `APP/artifacts/mt5/experts/Mapazapp_TestEA/` — **virtual** `backtest_trades.csv` / summary JSON for **`importBacktestTradesFromCsv`**; **no** live-chart use, **no** orders, **no** automatic registry approval |
| Real tick data | NOT IMPLEMENTED | All timestamps are `Date.now()` offsets |
| IFVG zone detection in **UI / API** | PARTIAL (CP12) | Dashboard **`/scanner`** + API scanner routes run **offline simulation** on fictional/fixture candles only — **not** live scanner; static **Market/Zones** mock list unchanged |
| Forward / demo monitor | **PARTIAL (CP16)** | Dashboard **`/forward-monitor`** + API **`GET …/forward-monitor/*`** show **snapshot-only** mock observability over scanner outputs — **not** a live watcher, **not** execution |
| Zone score in **UI** | NOT IMPLEMENTED | Page scores remain mock integers; core has `computeStrategyScore` for future integration |
| Risk Guard rule evaluation | NOT IMPLEMENTED | Risk states are static mock objects |
| Prop Firm Guard enforcement | NOT IMPLEMENTED | Prop firm state is static mock |
| Multi-account backend | NOT IMPLEMENTED | Account switching is React useState only |
| Multi-terminal MT5 bridge | NOT IMPLEMENTED | Bridge terminals are mock arrays |
| Backtest / Strategy Tester UI wiring | **PARTIAL (CP8 / CP14 / CP15 / V2-16)** | Backtests UI mixes mock rows with **CP8** advisory column + **CP15** mock multi-run **evidence** (parameter-set detail panel) + **V2-16** in-process **engine evidence** summary cards (campaign / grid / walk-forward / manual pipeline mocks); **CP14 TestEA** CSV is for **manual** paste / tooling — **no** dashboard file picker, **no** upload route, **no** persistence of imports |
| Journal import from MT5 | NOT IMPLEMENTED | Journal entries are hardcoded |
| Real alert engine | NOT IMPLEMENTED | Alerts are hardcoded arrays |
| Alert persistence | NOT IMPLEMENTED | Acknowledge state is React useState only |
| Order execution | NOT IMPLEMENTED | No execution of any kind |
| Assisted execution (live) | NOT IMPLEMENTED | Checkpoint **17** defines **contract + validation** only (`validateAssistedExecutionIntent`); **no** MT5 send, **no** command channel, **no** `POST` execution routes |
| HTTP API (`@workspace/api-server`) | **PARTIAL (CP11+)** | Read-only **`GET /api/mapazapp/*`** mock envelope (`mockOnly: true`); serves registry, trade-review snapshots, bridge parser demo, scanner simulation, **CP15 evidence**, **CP16 forward-monitor**, **CP17–CP18 assisted-execution** contract + safety snapshot routes, **V2-16** **`…/mock-latest`** engine-evidence snapshots — **no** DB, **no** live MT5 socket, **no** folder watcher ingest, **no** `POST` on V2-16 evidence paths |
| Python backend (Replit handoff stack) | NOT IMPLEMENTED | No Python services in this repo; Node mock API is **not** a production backend |
| Database | NOT IMPLEMENTED | No domain persistence; mock API is in-memory only |
| Authentication | NOT IMPLEMENTED | No auth |
| WebSockets | NOT IMPLEMENTED | No live data |

---

## Multi-Account Architecture

### Core principle
Every entity in the system has an `accountId`. Risk state, prop firm guard, journal entries, alerts, bridge terminals, and backtest compatibility are all account-scoped.

### Account selector
- The topbar has a `<select>` dropdown populated from `mockConfig.accounts[]`
- Selecting an account calls `setActiveAccountId()` from `AccountContext` in `Layout.tsx`
- All pages use `useActiveAccount()` to get `activeAccountId` and look up account-specific mock data

### Account-scoped mock data pattern
```typescript
// config.ts — source of truth
accounts: [
  { accountId: 'ACC_THE5ERS_100K_PHASE1_A', ... },
  { accountId: 'ACC_PROPXP_50K_PHASE1', ... },
]
activeAccountId: 'ACC_THE5ERS_100K_PHASE1_A'

// risk.ts — account-keyed record
export const mockRiskByAccount: Record<string, AccountRiskGuardState> = {
  ACC_THE5ERS_100K_PHASE1_A: { ... },
  ACC_PROPXP_50K_PHASE1: { ... },
}

// Usage in any page
const { activeAccountId } = useActiveAccount();
const risk = mockRiskByAccount[activeAccountId];
```

---

## File Map

### Mock data (`src/mock/`)

| File | Contents |
|------|----------|
| `config.ts` | `mockConfig`: `accounts[]`, `activeAccountId`, `riskProfiles[]`, `rulesProfiles[]`, `symbolMappings[]`, `notifications`, `zoneScoring` |
| `types.ts` | All TypeScript interfaces: `AccountConfig`, `RiskProfile`, `RulesProfile`, `SymbolMapping`, `BridgeTerminal`, `AccountRiskGuardState`, `AccountPropFirmState`, `AccountSnapshot`, `Zone`, `BacktestParameterSet`, `JournalTrade`, `Alert`, `PsychologyEntry`, `OperationalStatus`, etc. |
| `account.ts` | `mockAccountSnapshots: Record<string, AccountSnapshot>` — balance, equity, daily P&L, drawdown per account. Legacy `mockAccount` re-exported. |
| `risk.ts` | `mockRiskByAccount: Record<string, AccountRiskGuardState>` — full account-scoped risk state with daily/max DD amounts and percentages. Legacy `mockRiskState` re-exported. |
| `propfirm.ts` | `mockPropFirmByAccount: Record<string, AccountPropFirmState>` — profit targets, drawdown rules, consistency, trading days per account. Legacy `mockPropFirmState` re-exported. |
| `journal.ts` | `mockJournalTrades: JournalTrade[]` — each entry has `accountId`, `accountDisplayName`, `resultR`, `ruleCompliance` |
| `alerts.ts` | `mockAlerts: Alert[]` — each alert has `accountId` (null for global) and `accountDisplayName` |
| `backtests.ts` | `mockBacktests: BacktestParameterSet[]` — each has `allowedAccountIds[]` |
| `bridgeStatus.ts` | `mockBridgeTerminals: BridgeTerminal[]` — one terminal per account. Legacy `mockBridgeStatus` re-exported. |
| `zones.ts` | `mockZones: Zone[]` — symbol-scoped (not account-scoped in mock) |
| `psychology.ts` | `mockPsychologyEntries: PsychologyEntry[]` |

### Components (`src/components/`)

| File | Key exports |
|------|-------------|
| `Layout.tsx` | `Layout`, `useViewMode()`, `useActiveAccount()`, `AccountContext`, `ViewContext` |
| `Sidebar.tsx` | `Sidebar` — shows active account context below logo (name, firm, mode, MT5 login) |
| `StatusBadge.tsx` | `ZoneStateBadge`, `BridgeStateBadge`, `RiskStateBadge`, `OperationalStatusBadge`, `BacktestStatusBadge`, `AlertSeverityBadge`, `DirectionBadge` |

### Pages (`src/pages/`)

| File | Route | Key features |
|------|-------|--------------|
| `HomePage.tsx` | `/` | Account-aware snapshot, risk status, bridge state, trade-ready zones, recent alerts |
| `ZonesPage.tsx` | `/zones` | Zone list with state/score filter |
| `ZoneDetailPage.tsx` | `/zones/:id` | Full zone detail |
| `RiskPage.tsx` | `/risk` | Account-scoped: daily/max DD in $ and %, trades, violations, `operationalStatus` |
| `PropFirmPage.tsx` | `/propfirm` | Account-scoped: profit target, drawdown rules, consistency, news trading |
| `BacktestsPage.tsx` | `/backtests` | Parameter set list with active-account compatibility column; link to Strategy & sets inspector |
| `ParameterSetsPage.tsx` | `/parameter-sets` | Read-only strategy + parameter set list (account-scoped compatibility, CP8 advisory hints) |
| `ParameterSetDetailPage.tsx` | `/parameter-sets/:parameterSetId` | Read-only detail: TRADE_READY registry gate, compatibility codes, CP8 advisory, IFVG settings summary |
| `BacktestDetailPage.tsx` | `/backtests/:id` | Stats, equity curve mock, sample trades |
| `JournalPage.tsx` | `/journal` | Account filter, account column, resultR, ruleCompliance |
| `PsychologyPage.tsx` | `/psychology` | Mood tracker, checklist, impulse trades |
| `AlertsPage.tsx` | `/alerts` | Account-tagged + global alerts, filter, acknowledge |
| `ConfigPage.tsx` | `/config` | Accounts, risk profiles, rules profiles, symbol mapping, notifications, zone scoring |
| `BridgePage.tsx` | `/bridge` | Multi-terminal grid + detail per terminal (ticks, log) |
| `ScannerSimulationPage.tsx` | `/scanner` | Mock scanner simulation summary (fixture replay; review-only flags) |
| `ForwardMonitorPage.tsx` | `/forward-monitor` | Mock forward/demo monitor snapshot (observational; manual-review copy; no execution controls) |
| `AssistedExecutionPage.tsx` | `/assisted-execution` | Assisted execution **contract** preview (CP18 “execution disabled” banner, safety checklist, validation + audit DTO; **no** execute / send / place-trade controls) |

---

## OperationalStatus Values

`AccountRiskGuardState.operationalStatus` is the primary gate for all trading decisions:

| Value | Meaning |
|-------|---------|
| `TRADING_ALLOWED` | All rules pass — trading is permitted |
| `WATCH_ONLY` | Account is in monitoring mode — no trading |
| `BLOCKED_DAILY_DRAWDOWN` | Daily drawdown limit reached |
| `BLOCKED_MAX_DRAWDOWN` | Max drawdown limit reached |
| `BLOCKED_NEWS` | High-impact news event blackout active |
| `BLOCKED_MAX_TRADES` | Max trades per day reached |
| `BLOCKED_CONSISTENCY` | Consistency rule violation detected |
| `BLOCKED_PSYCHOLOGY` | Pre-flight checklist not completed |
| `BRIDGE_DISCONNECTED` | MT5 terminal is offline |
| `NO_APPROVED_PARAMETER_SET` | No approved backtest for this symbol |

---

## Symbol Mapping

Different brokers name the same instrument differently:

| Canonical | The5ers MT5 | PropXP MT5 |
|-----------|-------------|------------|
| XAUUSD | XAUUSD | XAUUSDm |
| EURUSD | EURUSD | EURUSDm |
| GBPUSD | GBPUSD | GBPUSDm |

`mockConfig.symbolMappings[]` maps `canonicalSymbol → brokerSymbol` per `accountId`. Cursor must implement broker symbol resolution when sending orders or subscribing to tick data.

---

## How to Continue — Step-by-Step Plan

### Step 1: Python backend foundation
- Implement `GET /api/accounts` returning the account registry
- Implement `GET /api/accounts/:accountId/summary` returning balance/equity/dailyPnL
- Implement `GET /api/accounts/:accountId/risk` returning `AccountRiskGuardState`
- Implement `GET /api/accounts/:accountId/prop-firm` returning `AccountPropFirmState`

### Step 2: Replace mock imports with API calls
- Replace `mockRiskByAccount[activeAccountId]` with React Query: `useQuery(['risk', activeAccountId], fetchRisk)`
- Replace `mockAccountSnapshots[activeAccountId]` with account summary API call
- Replace `mockPropFirmByAccount[activeAccountId]` with prop firm API call
- Keep mock files as test fixtures and dev fallbacks

### Step 3: MT5 BridgeEA + WebSocket
- Implement MQL5 BridgeEA that pushes tick data + account state to the Python backend
- Add WebSocket endpoint: `ws://…/api/ws/accounts/:accountId/bridge`
- Update `BridgePage.tsx` to subscribe to live terminal state

### Step 4: Real Zone Scanner (IFVG algorithm)
- Implement IFVG detection in Python using historical and live tick data
- Replace `mockZones` with `GET /api/accounts/:accountId/zones`
- Replace zone scores (currently static integers) with real scoring algorithm output

### Step 5: Real Risk Guard
- Implement rule evaluation engine in Python
- Evaluate `operationalStatus` on every tick using account state + prop firm rules
- Push updates via WebSocket to Risk Guard page

---

## Future API Endpoints (Account-Aware)

```
GET  /api/accounts
POST /api/accounts
GET  /api/accounts/:accountId/summary
GET  /api/accounts/:accountId/risk
GET  /api/accounts/:accountId/prop-firm
GET  /api/accounts/:accountId/journal
POST /api/accounts/:accountId/journal
GET  /api/accounts/:accountId/alerts
POST /api/accounts/:accountId/alerts/:alertId/acknowledge
GET  /api/accounts/:accountId/bridge
GET  /api/accounts/:accountId/positions
GET  /api/accounts/:accountId/zones
GET  /api/backtests
GET  /api/backtests/:parameterSetId
GET  /api/backtests/:parameterSetId/account-compatibility
GET  /api/psychology
POST /api/psychology
```

---

## Critical Rules for Cursor

1. **Never assume a single account.** Every query, mutation, and display must be scoped to an `accountId`.
2. **Do not break the account context pattern.** Pages use `useActiveAccount()` from `Layout.tsx` — preserve this hook.
3. **Keep `OperationalStatus` as the gate.** The Risk Guard's `operationalStatus` is the primary trading permission signal.
4. **Symbol mapping is required.** When sending orders or subscribing to data, resolve `canonicalSymbol → brokerSymbol` for the active account's broker.
5. **Mock files are fixtures, not dead code.** When replacing mock imports with API calls, keep mock files for unit tests and dev fallbacks.
6. **Broker-neutral canonical symbols.** All zone detection, scoring, and journal records use canonical symbols. Only the MT5 interface layer resolves to broker-specific names.
