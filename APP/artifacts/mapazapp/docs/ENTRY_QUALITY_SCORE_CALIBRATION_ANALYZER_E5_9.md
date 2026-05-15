# Mapazapp — Entry Quality Score calibration analyzer (**E5.9**)

**Tipo:** implementación **TypeScript** (core + CLI) — post-proceso de bundles TestEA ya exportados.  
**Sin:** MT5, Strategy Tester, cambios en `Mapazapp_TestEA.mq5`, aprobación de umbrales, compuertas de score, trading, `OrderSend`, `CTrade`, API/dashboard/supervisor/launcher.  
**Contexto:** post–**E5.8.1** ([`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md)); contrato [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md); export [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md).

---

## 1. Propósito

Ofrecer un analizador **determinista y solo lectura** que, a partir de `backtest_summary.json` + `backtest_trades.csv`, calcule:

- Distribución del `entry_quality_score` (min, max, media, mediana, percentiles P10–P90).
- Métricas de `ambiguous_risk_score` agregadas (media, P75, P90).
- Conteos de grado (desde summary y distribución desde CSV).
- Métricas por **outcome** (`all`, `wins`, `losses`, `ambiguous`, expirados, `unresolved`, etc.).
- **Bandas relativas** (top 10%, top 25%, “middle 50%”, bottom 25%, bottom 10%) por **percentiles del score en la cohorte**, no por umbrales A/B aprobados.
- Frecuencia de tokens en `missing_quality_components`.
- Estadísticas por **componente** de score (min/max/media y media por outcome).
- **E5.10.2:** si el CSV incluye columnas numéricas `liquidity_sweep_quality_score` / subscores, el analizador añade **`liquidity_quality_component_stats`** (misma forma que los componentes principales); los bundles sin esas columnas **no** fallan.
- **E5.10.4:** si el CSV incluye columnas numéricas `liquidity_chain_score` / barras / distancia a FVG, el analizador añade **`liquidity_chain_component_stats`**; sin esas columnas el análisis principal **no** cambia.
- **E5.12:** si el CSV incluye columna numérica `mss_choch_score`, el analizador añade **`mss_choch_component_stats`** (forma paralela a otros componentes opcionales); bundles sin esa columna **no** fallan — [`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md).

La salida sirve para decidir si el score **separa** resultados y si las bandas altas **reducen** `ambiguous_rate` o mejoran expectancy **antes** de fijar políticas de producto.

---

## 2. Por qué A/B = 0 exige calibración

Como documenta **E5.8.1**, `score_a_count = 0` y `score_b_count = 0` **no** prueban por sí solos que el setup sea inválido: pueden reflejar componentes incompletos, umbrales provisionales demasiado estrictos para un score parcial, o calidad mecánica baja. **E5.9** cuantifica la distribución y la separación por outcome y bandas relativas para **informar** la siguiente decisión (mejorar score vs ajustar umbrales vs ambos), **sin** aprobar compuertas.

---

## 3. Código y CLI

| Pieza | Ruta |
|-------|------|
| Core | `APP/lib/mapazapp-core/src/testea-score-calibration.ts` |
| CLI | `APP/scripts/src/mapazapp-testea-score-calibration.ts` |
| Script pnpm | `pnpm --filter @workspace/scripts mapazapp:testea-score-calibration` |

### 3.1 Uso típico

Un bundle local (carpeta que contiene `backtest_summary.json` y `backtest_trades.csv`):

```bash
pnpm --filter @workspace/scripts mapazapp:testea-score-calibration -- --bundle "C:\ruta\al\bundle" --json
```

Búsqueda recursiva bajo una raíz (p. ej. carpeta del Strategy Tester), filtrando por segmento de campaña `E55`:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-score-calibration -- --search-root "C:\Users\...\Tester\..." --campaign-folder E55 --json
```

Opciones adicionales:

- `--sort-by fvg|score|expectancy|ambiguous_rate` — orden de la tabla resumen (modo humano / JSON `summaryRows`).
- `--max-results <n>` — limitar filas resumen.
- `--csv-output <path>` — escribe un CSV resumen en ruta local (no escribe en el repo por defecto).
- `--strict` — falla (código 1) si un bundle no se puede analizar o carece de campos de score (por defecto se **omite** con aviso en stderr).

### 3.2 Salida JSON (resumen)

Incluye `bundlesAnalyzed`, `skipped`, `summaryRows` y `bundles` con el análisis completo por bundle (stats, bandas, outcomes, frecuencias, `diagnostic_flags`).

**E5.9.0.1 — `ambiguous_rate` en resumen:** En `summaryRows` y en el CSV de `--csv-output`, el campo **`ambiguous_rate`** es la misma métrica que **`outcome_by_score.all.ambiguous_rate`**: proporción de trades con outcome `ambiguous` sobre el **total** de trades del bundle. **No** debe confundirse con el `ambiguous_rate` del slice `outcome_by_score.ambiguous` (dentro de ese subconjunto suele ser **1.0** y no sirve como indicador de cohorte).

---

## 4. Interpretación (solo diagnóstico)

Los flags `diagnostic_flags` son **heurísticos** (p. ej. `SCORE_NO_A_B_GRADES`, `SCORE_RANGE_TOO_NARROW`, `SCORE_MISSING_COMPONENTS_HIGH`, `TOP_QUARTILE_OUTPERFORMS`, `TOP_QUARTILE_REDUCES_AMBIGUITY`, y sus contrarios). **No** sustituyen revisión humana ni aprueban umbrales.

---

## 5. Bandas relativas

Las bandas **top_10_percent**, **top_25_percent**, **middle_50_percent**, **bottom_25_percent**, **bottom_10_percent** se definen por **umbrales de valor de score** derivados de los percentiles de la cohorte (P90, P75, P25–P75, P25, P10), no por las letras A/B del contrato. Permiten comparar expectancy, `ambiguous_rate`, `total_r` y drawdown en R entre colas **sin** asumir que los grades A/B ya están calibrados.

---

## 6. Frecuencia de `missing_quality_components`

Cada token listado en el CSV (separadores `,`, `;`, `|`) se cuenta. Aparece la clave `(none)` cuando el campo está vacío en una fila. Sirve para ver si el score está “lleno” de marcadores `*_not_implemented` y priorizar trabajo en **E5.10+** (liquidity sweep, sesión/noticias, etc.).

---

## 7. Reglas de decisión (gobierno de producto)

1. **No** aprobar umbrales de producto solo con una corrida **E5.9** local: el analizador es evidencia técnica de separación y distribución, no una compuerta aprobada.  
2. Usar **E5.9** para decidir si el score tiene **poder de separación** útil: si la cola superior (p. ej. top 25%) **no** mejora expectancy frente a la inferior, el modelo de score o los componentes faltantes deben revisarse **antes** de endurecer filtros.  
3. Si la cola superior **reduce** `ambiguous_rate` de forma coherente y estable en varias cohortes, hay **señal** para seguir calibrando (aún sin gate).  
4. Si la señal es débil o inestable, el siguiente trabajo es **enriquecer componentes** y repetir calibración, no subir umbrales A/B.

---

## 8. Evidencia operador (**E5.9.1**)

**Cerrado (docs):** evidencia del CLI sobre el bundle smoke **E5.8.1** (`SET001_FVG2_…`), métricas agregadas, bandas relativas, decisión de gobierno y roadmap de componentes — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md). Artefactos JSON/CSV locales del operador siguen siendo **opcionales** y **no** deben versionarse si llevan sufijo `*_DO_NOT_COMMIT.csv`.

**Opcional:** repetir el CLI sobre **varios** bundles E55 cuando exista matriz de campaña, para comprobar estabilidad de señal entre cohortes (mismo analizador; sin MT5 desde repo).

---

## 9. No objetivos (E5.9)

- No aprobación de umbrales ni hard gate por score.  
- No modificación de `Mapazapp_TestEA`.  
- No MT5 / Strategy Tester desde el repo.  
- No `POST`, endpoints de acciones, expansión de dashboard ni launcher.

---

## Historial

| Versión | Nota |
|---------|------|
| E5.9 v1 | Analizador core + CLI + tests + documentación; bandas relativas y flags diagnósticos. |
| E5.9.1 | Evidencia operador smoke + decisión componentes — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md). |
