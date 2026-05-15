# Mapazapp — Liquidity Sweep smoke evidence (**E5.10.1**)

**Tipo:** documentación **docs-only** (evidencia operador + interpretación + decisión de gobierno).  
**Sin:** ejecución MT5 ni Strategy Tester desde este repo; cambios de código; `OrderSend`; `CTrade`; trading en vivo; API; dashboard; supervisor; launcher; wrapper.  
**Contexto:** implementación **E5.10** — [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md); calibración score **E5.9** — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md); evidencia calibración previa **E5.9.1** — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md).

---

## 1. Purpose

Registrar la **primera evidencia operador** tras **Liquidity Sweep V1** en **Mapazapp_TestEA**: validación del bundle de export seguro, lectura de **flags y contadores de liquidez** en `backtest_summary.json`, y **rerun del analizador de calibración** del Entry Quality Score sobre el mismo bundle. El objetivo es confirmar **PASS técnico** de export e integración, documentar el **efecto en la distribución del score**, y fijar un **caveat de calidad**: la V1 actual es **demasiado permisiva** como separador de calidad entre outcomes.

---

## 2. Smoke setup

- **Símbolo / marcos:** XAUUSD, ejecución **M15**, sesgo **D1** (misma familia de campaña que los smokes E55 / SET001).
- **EA:** `Mapazapp_TestEA` recompilado por el operador; **`ea_build` = `MZP_TestEA_E5_10_0`**.
- **Modo de export:** **safe-export** (optimization-safe), carpeta física bajo `Mapazapp\TestEA\E55\…` según preset de campaña.
- **Ruta de bundle (hoja):**  
  `Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`

---

## 3. Bundle validation summary

Validación con la herramienta de bundle del repo (post–export por el operador; sin relanzar MT5 desde aquí):

| Campo | Valor |
|--------|--------|
| `ok` | **true** |
| `testEaStatus` | **valid** |
| `errors` | **[]** |
| `warnings` | Solo **`BUNDLE_EVENTS_LARGE`** |
| `ea_build` | **`MZP_TestEA_E5_10_0`** |
| `trade_count` | **1697** |

---

## 4. Summary liquidity fields

Valores reportados en `backtest_summary.json` del bundle:

| Campo | Valor |
|--------|--------|
| `has_liquidity_sweep_v1_logic` | **true** |
| `liquidity_sweep_detection_enabled` | **true** |
| `liquidity_sweep_detected_count` | **1697** |
| `liquidity_sweep_relevant_count` | **1598** |
| `liquidity_sweep_opposite_count` | **99** |
| `liquidity_sweep_missing_count` | **0** |
| `liquidity_sweep_pdh_count` | **185** |
| `liquidity_sweep_pdl_count` | **207** |
| `liquidity_sweep_local_high_count` | **519** |
| `liquidity_sweep_local_low_count` | **786** |
| `average_liquidity_event_score` | **14.718326** |
| `average_entry_quality_score` | **66.147319** |
| `score_a_count` | **0** |
| `score_b_count` | **1296** |
| `score_c_count` | **379** |
| `score_rejected_count` | **22** |

**Nota:** `liquidity_sweep_detected_count` = `trade_count` implica que **cada trade** recibió al menos un evento de liquidez clasificado como detectado en el resumen del EA; `liquidity_sweep_missing_count` = **0** confirma que no hubo filas “sin sweep” en ese corte.

---

## 5. Score calibration rerun summary

Rerun del analizador de calibración (**E5.9**) sobre el mismo bundle, **después** de **E5.10**:

| Campo | Valor |
|--------|--------|
| `ok` | **true** |
| `bundlesAnalyzed` | **1** |
| `diagnostic_flags` | `SCORE_MISSING_COMPONENTS_HIGH`, `TOP_QUARTILE_OUTPERFORMS`, `TOP_QUARTILE_REDUCES_AMBIGUITY` |

**Estadísticas de `entry_quality_score`:**

| Métrica | Valor |
|---------|--------|
| `score_min` | 49 |
| `score_max` | 73 |
| `score_average` | 66.14731879787861 |
| `score_median` | 68 |
| `score_p10` | 63 |
| `score_p25` | 65 |
| `score_p50` | 68 |
| `score_p75` | 68 |
| `score_p90` | 71 |

---

## 6. Relative bands after liquidity

### Top 10 %

| Métrica | Valor |
|---------|--------|
| `counted_trades` | 172 |
| `total_r` | 53 |
| `expectancy_r` | 0.3081395348837209 |
| `winrate` | 0.47244094488188976 |
| `ambiguous_count` | 45 |
| `ambiguous_rate` | 0.2616279069767442 |
| `average_score` | 72.34883720930233 |

### Top 25 %

| Métrica | Valor |
|---------|--------|
| `counted_trades` | 872 |
| `total_r` | 245 |
| `expectancy_r` | 0.2809633027522936 |
| `winrate` | 0.43870967741935485 |
| `ambiguous_count` | 54 |
| `ambiguous_rate` | 0.06192660550458716 |
| `average_score` | 68.8979357798165 |

### Bottom 25 %

| Métrica | Valor |
|---------|--------|
| `counted_trades` | 438 |
| `total_r` | 23 |
| `expectancy_r` | 0.05251141552511415 |
| `winrate` | 0.46551724137931033 |
| `ambiguous_count` | 83 |
| `ambiguous_rate` | 0.18949771689497716 |
| `average_score` | 60.67579908675799 |

La **cola superior** sigue mostrando **mejor expectancy en R** y **menor `ambiguous_rate`** que el cuartil inferior en esta muestra (coherente con los flags `TOP_QUARTILE_*`).

---

## 7. Liquidity score by outcome

Promedios aproximados de **`liquidity_event_score`** por outcome (según informe del operador):

| Outcome | Promedio `liquidity_event_score` (aprox.) |
|---------|-------------------------------------------|
| `win` | **14.7129** |
| `loss` | **14.8659** |
| `ambiguous` | **14.6720** |
| `expired_unfilled` | **14.5643** |

Los cuatro valores están **muy próximos** entre sí: el componente de liquidez **añade puntos** de forma homogénea entre outcomes y **no discrimina** aún entre buenos, malos o ambiguos en este bundle.

---

## 8. Interpretation

1. **PASS técnico de humo:** el bundle valida **sin errores**; solo el aviso esperado por tamaño de eventos; el build es **E5.10**; los campos de liquidez están **presentes y coherentes** con `has_liquidity_sweep_v1_logic`.
2. **PASS de integración de export:** desaparece el marcador legacy `liquidity_event_not_implemented`; el score total **se expande** de forma natural (p. ej. rango 49–73 y aparición natural de **grado B** en contadores), **sin bajar umbrales** artificiales para fabricar A/B.
3. **El score global sigue mostrando señal útil** en bandas relativas (`TOP_QUARTILE_OUTPERFORMS`, `TOP_QUARTILE_REDUCES_AMBIGUITY`), alineado con la narrativa de **E5.9.1**.
4. **La liquidez V1, tal cual, no aporta aún separación por outcome:** con **100 %** de trades con sweep detectado y medias de `liquidity_event_score` casi idénticas entre `win`, `loss`, `ambiguous` y `expired_unfilled`, el subscore actúa más como **“bonus casi universal”** que como **filtro de calidad profesional**.

---

## 9. Quality caveat: V1 is too permissive

- **Cobertura total:** `liquidity_sweep_detected_count` = `trade_count` y `liquidity_sweep_missing_count` = **0** indican que la lógica V1 **siempre** encuentra un evento relevante en este entorno; eso **no** es equivalente a “siempre hay una ventaja real de liquidez”.
- **Separación nula por outcome:** las medias de `liquidity_event_score` por outcome son **casi iguales**; el componente **no** califica aún “mejor vs peor” liquidez en el sentido operativo.
- **Conclusión:** **Liquidity Sweep V1** es un **buen primer paso técnico** (export + integración), pero **no** debe interpretarse como filtro de calidad listo para producto ni como base de compuerta.

---

## 10. Decision

| Decisión | Estado |
|----------|--------|
| Humo técnico post–E5.10 | **PASS** |
| Integración export / summary / CSV | **PASS** |
| Aprobar liquidez como **compuerta dura** | **No** |
| Aprobar liquidez V1 como **filtro de calidad profesional** | **No** (aún) |
| Bajar umbrales de score solo para fabricar A/B | **No** |
| Aprobar trading en vivo desde esta evidencia | **No** |

---

## 11. Next checkpoint: E5.10.2 — Liquidity Sweep Quality Refinement

El siguiente entregable lógico es **E5.10.2**: refinar la **calidad** del sweep (p. ej. relevancia temporal, distancia, calidad del pool, exclusión de ruido, reglas más estrictas para “favorable” vs “ruido”) hasta que `liquidity_event_score` y/o metadatos asociados **separen outcomes** de forma defendible **antes** de plantear compuerta o pesos finales de producto.

**Referencias:** [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md), [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md), [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md).
