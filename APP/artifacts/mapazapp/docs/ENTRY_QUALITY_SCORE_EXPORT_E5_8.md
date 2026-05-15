# Mapazapp — Entry Quality Score V1 export en TestEA (**E5.8**)

**Tipo:** checkpoint de implementación (MQL5 + contrato de export + validadores TS + muestras).  
**Contrato de diseño:** [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md) (**E5.7**).  
**Evidencia smoke operador (calibración / A/B=0):** [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md) (**E5.8.1**).  
**Build TestEA:** `MZP_TestEA_E5_10_2_1` (`#define TESTEA_BUILD`) — incluye **Liquidity Sweep V1 + Quality V1** (E5.10.2 + **E5.10.2.1** razones/topes) observación/export; ver [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md) y [`LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md`](./LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md).  
**Post–E5.10.1:** evidencia smoke operador + calibración + caveat (liquidez V1 demasiado permisiva como separador) — [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md).

---

## 1. Alcance y decisiones

- El score es **solo observación**: **no** bloquea creación de trades virtuales, **no** cambia la lógica de outcome (`win` / `loss` / `ambiguous` / etc.), **no** introduce `OrderSend` ni `CTrade`.
- **`score_gate_enabled`** en `backtest_summary.json` permanece **`false`** en esta fase; el input `InpEntryQualityScoreGateEnabled` existe como **eco/reserva** en `optimization_parameters`, pero la compuerta de veto **no** está implementada.
- **`has_entry_quality_score_logic`:** `true` en builds E5.8+ (el EA sabe calcular/exportar el modelo V1). **`entry_quality_score_export_enabled`** refleja `InpEntryQualityScoreEnabled` (si es `false`, los componentes salen en **0** / `off` y se marca `entry_quality_score_export_disabled` en `missing_quality_components`).

---

## 2. Componentes implementados vs ausentes (E5.8)

| Componente | Estado E5.8 | Notas |
|------------|-------------|--------|
| **HTF narrative** | Parcial | Alineación **sesgo D1** vs dirección del setup (+ peso). Si `InpUseH4Context` o `InpUseH1Context` → `missing_h4_h1_structure` (no se simula estructura H4/H1). |
| **Liquidity event** | **E5.10 (V1) + E5.10.2 (Quality)** | PDH/PDL + swings M15; columnas `liquidity_event_*` y `liquidity_sweep_quality_*`; `liquidity_event_score` = total de calidad (0–20) cuando el score de liquidez está habilitado; **sin** gate duro. Detección off → `liquidity_sweep_detection_disabled` en faltantes. |
| **Displacement / FVG quality** | Parcial | Bandas por tamaño de FVG vs `InpVirtualMinTradeFvgPoints` + razón `fvg_size_bucket=…`. |
| **Entry / retest** | Parcial | Midpoint sin confirmación de vela → puntuación parcial + `confirmation_not_implemented`; sin fill → `entry_not_filled`. |
| **Target quality** | Parcial | Geometría y RR coherentes con `InpVirtualRiskReward` → parcial; `target_liquidity_not_implemented`. |
| **Session / news / spread** | No implementado | **0** + `session_news_spread_not_implemented`; buckets `unknown` / `observe_only`. |
| **Risk / overtrading** | Parcial | Bonus por `InpVirtualOneTradeAtATime` + `risk_daily_limits_not_implemented`. |
| **Ambiguous risk** | Heurística | Índice **0–100** separado del score de calidad: FVG pequeño, riesgo en puntos, mismo bar SL+TP, rango de vela de salida, etc. |

---

## 3. Dónde se exporta

### 3.1 `backtest_trades.csv`

Columnas añadidas al **final** de cada fila (cabecera actualizada en el EA):

`entry_quality_score`, …, `ambiguous_risk_reasons`, **`liquidity_event_detected`**, **`liquidity_event_type`**, **`liquidity_event_direction`**, **`liquidity_event_age_bars`**, **`liquidity_event_level`**, **`liquidity_event_sweep_price`**, **`liquidity_event_distance_points`**, **`liquidity_event_reasons`** (E5.10), `session_bucket`, `trade_window_status`, `spread_status`, `news_mode`

Los **bundles antiguos** sin estas columnas siguen siendo válidos para el importador (columnas opcionales).

### 3.2 `backtest_events.csv`

En `setup_allowed` (cuando la geometría virtual se puede preparar) y en todos los eventos `virtual_trade_*` que usan `VirtualBuildDetailsCore`, el campo **`details`** incluye un sufijo estable con tokens `eq_score=`, `eq_grade=`, `eq_htf=`, … (misma semántica que el CSV).

### 3.3 `backtest_summary.json`

Campos nuevos o reforzados:

- `has_entry_quality_score_logic`, `score_observation_only`, `score_gate_enabled`, `entry_quality_score_export_enabled`
- Agregados: `score_a_count`, `score_b_count`, `score_c_count`, `score_rejected_count`, `average_entry_quality_score`, `average_ambiguous_risk_score`, `average_score_win`, `average_score_loss`, `average_score_ambiguous`
- `optimization_parameters`: `entry_quality_score_enabled`, `entry_quality_score_gate_enabled`

---

## 4. Validación TypeScript

En `validateTestEaExportSample`, si `has_entry_quality_score_logic === true` se exige:

- `score_observation_only === true`
- `score_gate_enabled !== true`

Códigos de error: `TESTEA_SUMMARY_SCORE_OBSERVATION_ONLY`, `TESTEA_SUMMARY_SCORE_GATE_ENABLED`.

El importador acepta el alias de cabecera **`entry_quality_score`** → `scoreTotal` en `BacktestTrade` (mismo campo que `score_total`).

---

## 5. E5.9 — calibración y distribución (analizador en repo)

**E5.9** incluye el analizador TypeScript + CLI **solo post-proceso** (sin MT5, sin cambiar TestEA): [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). Comando: `pnpm --filter @workspace/scripts mapazapp:testea-score-calibration`.

Métricas: percentiles, outcome/`ambiguous`, bandas relativas (P10–P90), frecuencia de `missing_quality_components`, flags diagnósticos — **sin** aprobación de umbrales (contrato E5.7 §5 sigue **no aprobado**). Evidencia operador (smoke **E5.8.1**) — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md).

---

## 6. No objetivos (E5.8)

- No MT5 en CI; no Strategy Tester en repo; no live trading; no expansión dashboard/launcher; no `POST` / action endpoints.

---

## Historial

| Versión | Nota |
|---------|------|
| E5.8 v1 | Primera exportación observación-only en `Mapazapp_TestEA.mq5` + docs + muestras + validador. |
| E5.8.1 | Evidencia smoke operador + caveat A/B=0 (calibración); ver [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md). |
| E5.9 | Analizador core + CLI post-proceso bundles — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). |
| E5.9.1 | Evidencia calibración smoke + decisión componentes — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md). |
