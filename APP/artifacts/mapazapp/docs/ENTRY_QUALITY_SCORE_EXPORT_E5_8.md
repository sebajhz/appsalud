# Mapazapp — Entry Quality Score V1 export en TestEA (**E5.8**)

**Tipo:** checkpoint de implementación (MQL5 + contrato de export + validadores TS + muestras).  
**Contrato de diseño:** [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md) (**E5.7**).  
**Build TestEA:** `MZP_TestEA_E5_8_0` (`#define TESTEA_BUILD`).

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
| **Liquidity event** | No implementado | Puntuación **0**, `liquidity_event_type=none`, `liquidity_event_not_implemented` en faltantes. |
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

`entry_quality_score`, `entry_quality_grade`, `htf_narrative_score`, `liquidity_event_score`, `displacement_fvg_quality_score`, `entry_confirmation_score`, `target_quality_score`, `session_news_spread_score`, `risk_overtrading_score`, `ambiguous_risk_score`, `quality_reasons`, `missing_quality_components`, `ambiguous_risk_reasons`, `liquidity_event_type`, `session_bucket`, `trade_window_status`, `spread_status`, `news_mode`

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

## 5. E5.9 — siguiente paso

Campaña de **distribución** del score sobre candidatos reales (recompilar TestEA, smoke export seguro, analizar bins A/B/C vs métricas del contrato E5.7 §8). **Ningún umbral de producto** se aprueba hasta contar con evidencia de campaña y revisión humana.

---

## 6. No objetivos (E5.8)

- No MT5 en CI; no Strategy Tester en repo; no live trading; no expansión dashboard/launcher; no `POST` / action endpoints.

---

## Historial

| Versión | Nota |
|---------|------|
| E5.8 v1 | Primera exportación observación-only en `Mapazapp_TestEA.mq5` + docs + muestras + validador. |
