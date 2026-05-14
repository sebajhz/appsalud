# Mapazapp — Evidencia de sensibilidad a ambigüedad (E5.6.2)

**Tipo:** checkpoint de evidencia (solo documentación).  
**Prerrequisitos:** analizador [`AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md`](./AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md) (**E5.6.1**); plan [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md) (**E5.6**); campaña **E5.5.1** y auditoría [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) (**E5.5.2**).

---

## 1. Propósito

Archivar de forma **reproducible en el repo** el resultado del análisis de sensibilidad a `ambiguous` ejecutado por el **operador** sobre los **7 bundles** reales de la campaña **E5.5.1** (carpeta física **E55**), usando el CLI **E5.6.1**. Objetivo: cerrar el hueco entre “números baseline optimistas” y “decisión bajo supuestos conservadores”, sin volver a lanzar MT5 en este checkpoint.

**No** se versiona el CSV de salida del operador (nombre reservado: `_local_E5_6_1_ambiguity_sensitivity_DO_NOT_COMMIT.csv`); las cifras consolidadas abajo provienen del briefing operador archivado aquí.

---

## 2. Comando usado por el operador

```bash
pnpm --filter @workspace/scripts mapazapp:testea-ambiguity-sensitivity -- ^
  --search-root "<carpeta local del terminal MetaQuotes Tester>" ^
  --campaign-folder E55 ^
  --mode all ^
  --sort-by fvg ^
  --csv-output "_local_E5_6_1_ambiguity_sensitivity_DO_NOT_COMMIT.csv"
```

---

## 3. Detalles de la campaña de entrada

| Campo | Valor |
|--------|--------|
| Campaña | **E5.5.1** — barrido FVG (tamaño mínimo virtual) XAUUSD **M15 / D1** |
| EA / build | `Mapazapp_TestEA` en contexto **E5.5.0.5** (`MZP_TestEA_E5_5_0_5`), exports optimization-safe |
| Filtro de rutas CLI | `--campaign-folder E55` (segmento `Mapazapp\TestEA\E55\`) |
| Bundles analizados | **7** |
| Omitidos (`Skipped`) | **0** |
| Artefactos leídos | `backtest_summary.json` + `backtest_trades.csv` por bundle (post-proceso; sin re-ejecución tester) |

---

## 4. Tablas resumen — FVG mín. × modo

### 4.1 `totalR`

| FVG mín. | `neutral_zero` | `conservative_loss` | `skip_ambiguous` |
|---------:|---------------:|----------------------:|-----------------:|
| 2 | 315 | −121 | 315 |
| 10 | 293 | −125 | — |
| 18 | 297 | −102 | 297 |
| 26 | 287 | −93 | — |
| 34 | 276 | −67 | — |
| 42 | 262 | −54 | — |
| 50 | 242 | −56 | — |

*(Celdas `—` en `skip_ambiguous`: no incluidas en el briefing consolidado hacia este doc; la matriz completa está en el CSV local del operador.)*

### 4.2 `expectancyR`

| FVG mín. | `neutral_zero` | `conservative_loss` | `skip_ambiguous` |
|---------:|-----------------:|--------------------:|-----------------:|
| 2 | 0.1856 | −0.0713 | 0.2498 |
| 10 | — | — | 0.2342 |
| 18 | 0.1822 | −0.0626 | 0.2413 |
| 26 | — | — | 0.2360 |
| 34 | — | — | 0.2298 |
| 42 | — | — | 0.2205 |
| 50 | — | — | 0.2070 |

### 4.3 Métricas adicionales (donde se reportaron en el briefing)

**FVG 2**

| Modo | `ambiguous` | `ambiguous_rate` | `max_drawdown_r` | Notas |
|------|-------------:|-----------------:|-----------------:|--------|
| `neutral_zero` | 436 | 0.257 | 13 | — |
| `conservative_loss` | 436 | — | 144 | `expectancyR` −0.0713 |
| `skip_ambiguous` | 436 | 0.257 | 13 | `counted_trades` **1261** |

**FVG 18**

| Modo | `ambiguous` | `ambiguous_rate` | `max_drawdown_r` | Notas |
|------|-------------:|-----------------:|-----------------:|--------|
| `neutral_zero` | 399 | 0.245 | 12 | — |
| `conservative_loss` | 399 | — | 128 | `expectancyR` −0.0626 |
| `skip_ambiguous` | 399 | 0.245 | 12 | `counted_trades` **1231** |

---

## 5. Hallazgo principal

- Bajo **`neutral_zero`** (convención actual del CSV: `ambiguous` → 0R), el **totalR es positivo** en todos los valores de FVG mín. reportados (2 … 50).
- Bajo **`skip_ambiguous`**, la **expectancyR permanece positiva** en todos los FVG donde se midió; sube respecto a `neutral_zero` cuando aplica, porque los ambiguos **quedan fuera** del cómputo de expectativa sobre trades contados.
- Bajo **`conservative_loss`** (−1R por `ambiguous`), el **totalR es negativo** en **todos** los FVG mín. reportados; la expectativa es **negativa** donde se citó (FVG 2 y 18) y el drawdown en R **empeora fuerte** frente al baseline en esos puntos (p. ej. FVG 2: DD 13 → 144).

**Interpretación:** existe señal de **edge en outcomes no ambiguos**, pero el resultado **no es robusto** si cada `ambiguous` se trata como pérdida plena de 1R. El volumen y la tasa de ambiguos siguen siendo el **cuello de botella decisorio**.

---

## 6. Decisión

El setup permanece **prometedor pero no aprobado**: no se eleva a “aprobado para producto / escala multi-símbolo” mientras la lectura conservadora (`conservative_loss`) sea sistemáticamente negativa sin mitigación estructural de la ambigüedad.

---

## 7. Implicaciones

- Los trades **`ambiguous`** son el **bloqueador principal** entre narrativa positiva (baseline 0R) y riesgo operativo / prop-firm style.
- Mejorar solo métricas de **denominador** (`skip_ambiguous`) **no** sustituye a un plan que **reduzca o resuelva** ambiguos en la simulación o en la práctica.
- El trabajo de estrategia siguiente debe **priorizar calidad de entrada** y **menos outcomes intradía irresolutos** (SL/TP/resolución temporal), no solo optimizar otro hiperparámetro de FVG.

---

## 8. Investigación requerida (siguiente oleada)

1. **Ambiguous por tamaño de FVG** — segmentar tasas y R ajustado por bucket de `virtual_min_trade_fvg_points` / geometría.
2. **Ambiguous por sesión / hora** — distribución UTC vs sesiones líquidas vs chop.
3. **Ambiguous por rango de vela / volatilidad** — proxy de ruido M15 o ATR relativo en ventana de resolución.
4. **Ambiguous por distancia de riesgo** — SL/TP en puntos / RR vs frecuencia de empate SL-TP intrabar.
5. **Ambiguous por modo de entrada** — si en el futuro existen variantes documentadas (timing, retest, etc.).
6. **Resolución tick / sub-M15 en MQL5** — solo si hay evidencia de viabilidad y contrato de simulación acordado (no es parche cosmético).

---

## 9. Checkpoints recomendados (orden)

| ID | Contenido |
|----|-----------|
| **E5.7** | Contrato **Entry Quality Score V1** (observación; sin compuerta dura). |
| **E5.8** | Export de score / componentes en TestEA (observación). |
| **E5.9** | Campaña de **distribución** de score y análisis off-line. |
| **E5.10** | Detección y export de **liquidity sweep** (sin bloqueo inicial). |

*(Cadena E5.11–E5.13 sigue en [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) §15.)*

---

## 10. No objetivos (este checkpoint)

- **No** aprobación de trading en vivo ni lectura de “listo para operar”.
- **No** expansión de dashboard ni nuevas rutas POST / acciones.
- **No** `OrderSend` / `CTrade` ni cambios de ejecución en MQL5 en este doc.

---

## Historial

| Versión | Nota |
|---------|------|
| E5.6.2 v1 | Evidencia operador: 7 bundles E55; tablas y decisión archivadas. |
