# Mapazapp — HTF Structure V1 export en TestEA (**E5.11**)

**Tipo:** implementación de **observación / diagnóstico** en `Mapazapp_TestEA` (sin compuerta de trading).  
**Build TestEA:** `MZP_TestEA_E5_11` (`#define TESTEA_BUILD`).  
**Roadmap conceptual:** [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md).  
**Smoke operador esperado:** **E5.11.1** (recompilar en MetaEditor, correr Strategy Tester, validar bundle con `mapazapp:testea-export-validate`).

---

## 1. Motivación

Un trader discrecional no entra solo porque exista un FVG o un IFVG: primero sitúa el precio en **estructura de marco superior** (tendencia vs rango), alinea o no con el sesgo, identifica **niveles protegidos** y **liquidez externa** como *contexto*, no como órdenes.

**El sesgo D1 solo** (cuerpo vs apertura) no sustituye esa lectura: hace falta un **snapshot explícito H4/H1** para analizar correlación posterior con winrate, expectancy, `ambiguous_rate` y frecuencia — todo en post-proceso, sin gate duro.

---

## 2. Alcance técnico (cerrado en E5.11)

- **Solo velas cerradas** para swings y clasificación (no repaint en la vela actual del TF HTF).
- **TF:** H4 y H1.
- **Swings:** máximo local / mínimo local con `InpHtfStructureSwingLookbackBars` velas a cada lado (por defecto **2**).
- **Estados por TF:** `bullish_structure`, `bearish_structure`, `range_structure`, `transition_structure`; valores exportados como texto estable en CSV/summary (implementación conservadora).
- **Niveles protegidos:** último swing confirmado relevante según estado (bull → protege lows; bear → protege highs); en rango/transición se exportan niveles “significativos” cuando existen, con menor confianza implícita en los reason codes.
- **Liquidez externa:** swings/rango por encima/por debajo del precio actual como **targets/contexto**, no órdenes.
- **No** `OrderSend`, **no** `CTrade`, **no** veto de setups; **no** cambio de outcome virtual ni de generación de trades.

---

## 3. Inputs

| Input | Default | Rol |
|-------|---------|-----|
| `InpEnableHtfStructureV1` | `true` | Maestro observación HTF |
| `InpHtfStructureSwingLookbackBars` | `2` | Confirmación swing N velas cada lado |
| `InpHtfStructureMaxBars` | `300` | Límite historial HTF |
| `InpHtfStructureScoreEnabled` | `true` | Cuando EQ está habilitado, usa score HTF V1 (0–20) como `htf_narrative_score` en lugar del marcador superficial |

---

## 4. Export `backtest_trades.csv`

Columnas insertadas **antes** de `session_bucket` (cabecera alineada al EA):

`htf_structure_enabled`, `h4_structure_state`, `h1_structure_state`, `h4_structure_direction`, `h1_structure_direction`, `htf_structure_aligned`, `htf_structure_conflict`, `htf_structure_score`, `h4_protected_high`, `h4_protected_low`, `h1_protected_high`, `h1_protected_low`, `h4_external_liquidity_high`, `h4_external_liquidity_low`, `h1_external_liquidity_high`, `h1_external_liquidity_low`, `htf_structure_reasons`

Bundles sin estas columnas siguen siendo válidos para el importador TypeScript (campos opcionales en `BacktestTrade`).

---

## 5. Export `backtest_summary.json`

- `has_htf_structure_v1_logic`: `true` en builds que incluyen esta lógica.
- `htf_structure_enabled`: eco del input maestro.
- Contadores agregados por estado H4/H1 y por filas alineadas/en conflicto.
- `average_htf_structure_score`: media sobre filas CSV (convención TestEA; filas con export HTF off contribuyen score 0 en CSV si aplica).
- `optimization_parameters`: `htf_structure_v1_enabled`, `htf_structure_swing_lookback_bars`, `htf_structure_max_bars`, `htf_structure_score_enabled`.

---

## 6. Eventos (`backtest_events.csv`)

En **`setup_allowed`** (cuando hay preview EQ + geometría) y **`virtual_trade_candidate_created`**, el sufijo compacto incluye tokens:

`htf_en=`, `h4=`, `h1=`, `htf_ali=`, `htf_cnf=`, `htf_scr=`  
(junto al bloque existente `eq_*` y liquidez).

---

## 7. Entry Quality Score (observación)

- **`htf_structure_score`**: 0–20, solo etiqueta / export.
- Con `InpEntryQualityScoreEnabled` + `InpHtfStructureScoreEnabled` + HTF activo, el componente **`htf_narrative_score`** refleja **HTF Structure V1** y **no** se marca `missing_h4_h1_structure` por ausencia del marcador legacy cuando el snap HTF está activo.

---

## 8. Core / analizadores TypeScript

- `BacktestTrade` incluye campos opcionales `htf_structure_*` / protegidos / liquidez externa.
- `importBacktestTradesFromCsv` los parsea cuando la columna existe.
- `analyzeTestEaScoreCalibrationFromTexts` expone **`htf_structure_component_stats`** si existe columna `htf_structure_score`.
- Validador de muestras: si `has_htf_structure_v1_logic === true`, se exigen las columnas HTF en cabecera de trades y las claves resumen documentadas.

---

## 9. Próximo paso

**E5.11.1:** operador recompila `Mapazapp_TestEA`, ejecuta un run corto en Strategy Tester y valida el bundle real con:

`pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "<ruta_bundle>" --json`
