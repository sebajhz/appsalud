# Mapazapp — XAUUSD Outcome Campaign Runbook E5.5

**Relacionado:** diseño campaña Phase A/B [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md); contrato virtual [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md); implementación [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md); validación bundle [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md); baseline limpio [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md); política build/versioning [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md). **Plantilla de filas de campaña:** [`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md).

---

## 1. Purpose

- **E5.5** prepara la **primera campaña controlada** de XAUUSD con **métricas de outcome virtual** (`backtest_summary.json` + `backtest_trades.csv`), usando **`Mapazapp_TestEA`** **solo** dentro de **MetaTrader 5 Strategy Tester** (motor oficial de backtest del setup).
- **No** es optimización final ni búsqueda masiva de parámetros.
- **No** es trading en vivo ni asistencia de ejecución real.
- **No** usa órdenes MT5: `has_real_trading_orders` debe permanecer **false**; outcomes en filas virtuales y eventos CSV.
- **Cada run** debe validarse con la CLI read-only **`pnpm --filter @workspace/scripts mapazapp:testea-export-validate`** (E4.1 / alineado con evidencia E5.4.x). Con carpetas anidadas por campaña (**E5.5.0**), pasar `--bundle` apuntando a la **carpeta hoja** que contiene los tres archivos — ver [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md).

Este documento es **solo runbook y criterios**; la ejecución material de la campaña queda en **E5.5.1+** (operador, MT5 manual).

---

## 2. Current baseline

Referencia explícita al smoke **E5.4.2** (mismo build y rango “full” documentado allí).

| Campo | Valor baseline (E5.4.2) |
|--------|-------------------------|
| EA | `Mapazapp_TestEA` |
| `ea_build` | `MZP_TestEA_E5_4_1` |
| Evidencia | [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md) |
| Símbolo | XAUUSD |
| Timeframe ejecución | M15 |
| Daily bias | D1 |
| Modo | `virtual` |
| `has_real_virtual_trade_logic` | **true** |
| `has_real_trading_orders` | **false** |
| `trade_count` | 1697 |
| `average_r` | 0.185622 |
| `winrate` | 0.447712 |
| `max_drawdown_r` | 13 |
| Validación CLI | `ok: true`, `errors: []`, `testEaStatus: valid`, warnings **solo** `BUNDLE_EVENTS_LARGE` |

**Aclaración:** este baseline **no** demuestra edge definitivo ni robustez fuera de muestra; es **punto de partida** tras geometría sana (E5.4.1) y bundle válido (E5.4.2). La campaña E5.5.x debe contrastar **varios parameter sets** y **ventanas** antes de conclusiones de producto.

---

## 3. Campaign objective

La campaña debe poder responder (con evidencia y narrativa humana), entre otras:

- ¿El setup mantiene **resultado neto positivo en R** fuera de un **único** run fijo?
- ¿Qué filtros (p. ej. `InpVirtualMinTradeFvgPoints`, `InpDailyBiasMinBodyPoints`) **reducen ruido** sin destruir muestra útil?
- ¿Qué valores de **FVG mínimo** para trades virtuales son razonables en XAUUSD M15?
- ¿Qué impacto tiene **`InpDailyBiasMinBodyPoints`** sobre `allowed_setups` vs `rejected_by_daily_bias` y sobre outcomes?
- ¿Cómo cambia el resultado al variar **`InpVirtualRiskReward`** (1.5 / 2.0 / 2.5) **solo** cuando ya hay candidatos sólidos por FVG?
- ¿Cuántos outcomes **`ambiguous`** aparecen y qué fracción representan frente a wins+losses?
- ¿Qué configuración merece **seguimiento** hacia dashboard / asistente live (sin ejecutarlo en este track)?

---

## 4. Campaign guardrails

### 4.1 Reglas operativas

- **No** optimización masiva ni rejillas de cientos de combinaciones.
- **No** probar ~200 combinaciones en un bloque.
- **No** elegir “el mejor” run por **una** métrica aislada y archivar el resto.
- **Priorizar** coherencia lógica y **robustez** (cambios pequeños observables) frente a picos aislados.
- **Máximo ~2 variables que cambian** entre fases contiguas (el resto fijo al baseline del runbook).
- **Guardar todos los bundles válidos** (o sus métricas + CLI JSON), no solo los que gustan.
- Si la validación CLI devuelve **`ok: false`** o `errors` no vacío → run **FAILED** → **no** entra al informe de campaña.
- **`status: warning`**: solo aceptable en informe si está **listado y justificado** (p. ej. `BUNDLE_EVENTS_LARGE` en rangos largos).
- **`BUNDLE_EVENTS_LARGE`** es **aceptable** cuando el rango es largo y el operador acepta el coste de CSV.
- Cualquier **`CSV_GEOMETRY_*`** o **`CSV_GEOMETRY_RISK_NONPOSITIVE`** → **no aceptable**; investigar EA/inputs y **no** mezclar con métricas de campaña hasta resolverse (volver a baseline E5.4.1+).
- Verificar en summary: **`has_real_trading_orders: false`** en cada run de esta campaña virtual.

### 4.2 Anti-overfitting (robustez)

- **Ventanas:** usar al menos **baseline completo** + **split manual train/forward** (§5) antes de declarar “ estable ”.
- **No ajustar** RR y bias body en la misma tanda que el barrido inicial de FVG mínimo; seguir la secuencia §6.
- **Registrar** `git commit`, `ea_build`, `run_id`, `parameter_set_id` y rango en **cada** fila del informe (plantilla §11).
- **Sospechar** de resultados que solo aparecen en **un** parameter set y **colapsan** en forward o al subir `InpVirtualMinTradeFvgPoints`.
- **Comparar** ratios (`ambiguous_ratio`, `expired_ratio`, trades/mes) además de `average_r` para detectar sobreajuste a conteos bajos o a ambigüedad mal interpretada como “neutra buena”.

---

## 5. Date ranges

| Fase | Rango | Objetivo |
|------|--------|----------|
| **Smoke** | **~1 mes** de datos (calendario a elección del operador; anotar fechas en el informe) | Velocidad, sanity de export, validación E4.1, tamaño CSV |
| **Baseline** | **2025.01.01 00:00** → **2026.05.11 00:00** (igual que E5.4.2) | Comparar métricas contra el baseline documentado |
| **Walk-forward manual simple** | **Train / observación:** 2025.01.01 → 2025.09.30; **Forward:** 2025.10.01 → 2026.05.11 | Lectura conservadora: estabilidad fuera del bloque inicial |
| **Opcional posterior** | Año **2024** completo (si el bróker / historia lo permiten) | Más historia bajo mismos contratos |
| **Opcional posterior** | Hasta **~2 años** continuos | Solo si EA + validador + política de evidencia siguen estables |

---

## 6. Parameter matrix V1

### 6.1 Fijos (no cambiar en E5.5.1 salvo decisión explícita documentada)

| Parámetro | Valor |
|-----------|--------|
| Símbolo | XAUUSD |
| Timeframe ejecución | M15 |
| Timeframe daily bias | D1 |
| `InpBacktestMode` | `virtual` |
| `InpEnableSetupDetection` | `true` |
| `InpRequireDailyBiasAlignment` | `true` |
| `InpEnableVirtualTrades` | `true` |
| `InpVirtualEntryMode` | `fvg_midpoint` |
| `InpVirtualStopMode` | `fvg_boundary_with_buffer` |
| `InpVirtualOneTradeAtATime` | `true` |
| `InpVirtualAmbiguityMode` | `ambiguous` |

*(Resto de inputs virtuales — expiries, buffer SL, `InpWriteVirtualTrades`, etc. — alinear con baseline E5.4.2 salvo que la fase documente un cambio acotado.)*

### 6.2 Variables exploratorias (rejilla conceptual; no ejecutar toda de golpe)

**A. `InpVirtualMinTradeFvgPoints`:** `2`, `10`, `20`, `50`  
**B. `InpVirtualRiskReward`:** `1.5`, `2.0`, `2.5`  
**C. `InpDailyBiasMinBodyPoints`:** `0`, `50`, `100`

### 6.3 Primera campaña controlada (E5.5.1) — solo barrido FVG mínimo

Mantener **`InpVirtualRiskReward = 2.0`** y **`InpDailyBiasMinBodyPoints = 0`**. Variar únicamente **`InpVirtualMinTradeFvgPoints`**:

| Set | `InpVirtualMinTradeFvgPoints` | `InpVirtualRiskReward` | `InpDailyBiasMinBodyPoints` |
|-----|------------------------------|-------------------------|------------------------------|
| **001** | 2 | 2.0 | 0 |
| **002** | 10 | 2.0 | 0 |
| **003** | 20 | 2.0 | 0 |
| **004** | 50 | 2.0 | 0 |

**Después** (fases posteriores, solo sobre candidatos que sigan siendo razonables en baseline + forward):

1. Variar **`InpVirtualRiskReward`** (manteniendo el mejor candidato de FVG según criterios §9).  
2. Luego variar **`InpDailyBiasMinBodyPoints`**.

---

## 7. Parameter set naming

### 7.1 Identificadores

| Tipo | Formato | Ejemplos |
|------|-----------|----------|
| `parameter_set_id` | `MZP_IFVG_XAUUSD_V1_OUTCOME_SET_XXX` (3 dígitos) | `MZP_IFVG_XAUUSD_V1_OUTCOME_SET_001` … `004` |
| `run_id` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_SETnnn_<scope>_<suffix>` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_SET001_FULL_A` |
| `campaign_id` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1` | Constante de la campaña documental V1 |

`scope` sugerido: `FULL`, `SMOKE`, `TRAIN`, `FWD` (según §5). `suffix` (`A`, `B`, …) si se repite el mismo set y rango por recomputación o re-export.

### 7.2 Registro obligatorio por run

Cada fila del informe debe poder enlazar:

- **Git commit** (SHA) del código usado al compilar el `.ex5`
- **`ea_build`**
- **`parameter_set_id`** (= `InpParameterSetId`)
- **`run_id`** (= `InpRunId`)
- **Rango de fechas** del Strategy Tester
- **Carpeta de export** (ruta sanitizada; ver política E5.4.3)
- **Resultado CLI** (`ok`, `status`, `errors`, `warnings`, `testEaStatus`)

---

## 8. Metrics to collect

### 8.1 Por run (desde `backtest_summary.json` + CLI)

**Core trades**

- `trade_count`, `virtual_trade_count` (deben coincidir con lógica virtual activa)
- `filled_trade_count`
- `win_count`, `loss_count`, `ambiguous_count`
- `unfilled_expired_count`, `expired_open_count`
- `invalid_risk_count`, `skipped_trade_active`

**Métricas R**

- `total_r`, `average_r`, `expectancy_r`, `max_drawdown_r`, `winrate`

**Setup / bias**

- `total_bias_evaluated`
- `bullish_bias_count`, `bearish_bias_count` *(si constan en el summary del run)*
- `total_setup_candidates`, `allowed_setups`, `rejected_by_daily_bias`

**Calidad / ratios derivados** *(calcular en hoja o script local; no requiere cambiar código)*

- `ambiguous_ratio` = `ambiguous_count / max(1, win_count + loss_count + ambiguous_count)` *(o denominador acordado en E5.5.2; documentar la fórmula en el informe)*
- `expired_ratio` ≈ `(unfilled_expired_count + expired_open_count) / max(1, trade_count)` *(ajustar definición en informe si se excluyen unfilled del contador de trades exportados)*
- **Trades aproximados por mes** = `trade_count / meses_de_rango`
- **Warnings CLI** (lista textual o JSON)

---

## 9. Acceptance rules

### 9.1 Principio

**No** declarar edge operativo por un solo run ni por un solo parameter set sin contrastar §5 y §6.3.

### 9.2 Candidato **aceptable** (para seguir iterando)

- CLI: `ok: true`, `errors: []`, `status` **ok** o **warning** solo por `BUNDLE_EVENTS_LARGE` (u otros warnings **explícitamente** aceptados y raros).
- **Sin** warnings de geometría (`CSV_GEOMETRY_*`, `CSV_GEOMETRY_RISK_NONPOSITIVE`).
- En rango **baseline** largo: `trade_count` **> 100** (umbral orientativo; si cae por debajo por diseño agresivo de filtros, documentar y **no** comparar directamente contra el mismo criterio de “aceptable” sin ajuste de narrativa).
- `average_r` **> 0** en ese run.
- `max_drawdown_r` **no extremo** frente a `total_r` (criterio cualitativo: si `max_drawdown_r` consume la mayor parte de `total_r` en pocos meses, marcar como débil en notas).
- `ambiguous_ratio` **no dominante** de forma que el winrate sea ilusorio.
- Comportamiento **razonable** al cambiar `InpVirtualMinTradeFvgPoints` (no un único punto mágico sin explicación).

### 9.3 Candidato **débil**

- `average_r` cercano a 0 o inestable entre ventanas cercanas.
- Winrate “bueno” solo si se **reinterpretan** ambiguous como favorables sin fundamento.
- `invalid_risk_count` alto en relación a señales.
- Demasiados trades (ruido) o demasiado pocos tras filtros.
- Solo **un** parameter set “funciona” y el resto colapsa.

### 9.4 **Rechazado** para narrativa de campaña

- Validación CLI fallida o `errors` no vacíos.
- Cualquier warning de geometría en trades exportados.
- `trade_count` demasiado bajo para el rango sin justificación de filtro extremo aceptada por PM.
- `total_r` **negativo** en **baseline** y también en **forward** para el mismo set.
- Resultado que solo funciona en una ventana muy corta y falla en baseline+forward.

---

## 10. Bundle validation workflow

Para **cada** corrida del Strategy Tester:

1. Ejecutar **MT5 Strategy Tester manualmente** (fuera de Cursor; fuera de este repo como automatización).
2. Localizar la carpeta del run bajo `MQL5\Files\<InpExportRoot>\<InpRunId>\` (ruta típica bajo `MetaQuotes\Tester\...`; ver evidencias E4/E5.4.2).
3. Ejecutar en el repo (read-only sobre el bundle):

   `pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "<run-folder>" --json`

4. Guardar **fuera del repo** o en notas internas: JSON de CLI, captura de métricas clave del summary, ruta **sanitizada** (sin pegar CSV enormes en Git).
5. Rellenar una fila en [`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md) (copiar la tabla a un informe operativo E5.5.2).

**No** versionar en Git CSV/JSON completos de campañas largas salvo política explícita de muestras truncadas.

---

## 11. Campaign report template

La tabla maestra vive en archivo separado para reutilizarla sin inflar este runbook:

- **[`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md)**

Incluye columnas: `campaign_id`, `run_id`, `parameter_set_id`, `date_range`, `git_commit`, `ea_build`, `validation_status`, `warnings`, métricas de conteo, R, ratios derivados, `conclusion`, `notes`. **No rellenar** hasta existan runs reales (E5.5.1).

---

## 12. Human interpretation

Cada bloque de resultados en **E5.5.2** debería incluir frases en prosa, por ejemplo:

- “El set **002** redujo ruido respecto a **001** manteniendo **expectancy_r** positiva.”
- “El set **004** filtró en exceso: `trade_count` cayó fuerte y subió la varianza de `average_r`.”
- “**RR 2.5** aumentó `total_r` pero también `ambiguous_count` / expiraciones.”
- “La compuerta de bias rechazó **X %** de `total_setup_candidates`.”
- “El setup sigue **prometedor** pero **aún no robusto** para decisión de producto.”

Evitar lenguaje de certeza absoluta; enlazar siempre a `run_id` y rango.

---

## 13. Campaign execution sequence

| Checkpoint | Contenido |
|------------|-------------|
| **E5.5** | Runbook + plantilla (este documento); **sin** ejecución MT5 en repo |
| **E5.5.1** | Operador: runs manuales **SET 001–004** en rango **baseline** §5 |
| **E5.5.2** | Documentar resultados de campaña (tabla + interpretación §12) |
| **E5.5.3** | Opcional: repetir subset en **walk-forward** §5 |
| **E5.5.4** | **Decision gate** explícito: mantener / afinar / rechazar narrativa de setup para siguiente fase |
| **E5.6** | **Opcional:** gate `tester_orders` **solo** si los resultados virtuales y la gobernanza lo justifican ([`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md)) |

---

## 14. Non-goals (E5.5)

**No** incluye: implementación de código MQL5/TS nueva; lanzar MT5 o Strategy Tester desde Cursor; ejecutar la campaña ahora; dashboard; trading live; `tester_orders`; optimización en nube; base de datos; WebSocket; launcher/runtime expansión.

---

## Document history

| Versión | Nota |
|---------|------|
| E5.5 v1 | Runbook inicial post–E5.4.3; docs-only. |
