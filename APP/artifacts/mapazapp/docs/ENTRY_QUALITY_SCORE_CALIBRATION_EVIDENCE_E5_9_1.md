# Mapazapp — Entry Quality Score calibration evidence (**E5.9.1**)

**Tipo:** documentación **docs-only** (evidencia operador + decisión de gobierno).  
**Sin:** MT5, Strategy Tester, cambios en `Mapazapp_TestEA.mq5`, aprobación de umbrales A/B/C, compuerta de score, trading en vivo, `OrderSend`, `CTrade`, API, dashboard, supervisor, launcher, wrapper.  
**Contexto:** analizador **E5.9** — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md); corrección resumen **`ambiguous_rate`** — **E5.9.0.1** (`summaryRows` / CSV = `outcome_by_score.all.ambiguous_rate`); smoke **E5.8.1** — [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md).  
**Post–E5.10.2:** refinamiento **Liquidity Sweep Quality V1** (discriminación de calidad; sin gate) — [`LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md`](./LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md).

---

## 1. Propósito

Registrar la **evidencia** del analizador de calibración ejecutado por el operador sobre el **mismo bundle** del smoke Entry Quality Score (**E5.8.1**), con salida JSON corregida post–**E5.9.0.1**, y fijar la **interpretación** y la **decisión de producto**: el score muestra señal útil en bandas relativas pese a **A/B = 0**; la respuesta correcta es **completar componentes reales**, no relajar umbrales ni aprobar compuerta.

---

## 2. Comandos usados

Post-proceso **solo lectura** (sin relanzar MT5 desde este repo):

```bash
pnpm --filter @workspace/scripts mapazapp:testea-score-calibration -- --bundle "<carpeta-del-run>" --json
```

Opcional (artefacto local; **no** versionar `*_DO_NOT_COMMIT.csv`):

```bash
pnpm --filter @workspace/scripts mapazapp:testea-score-calibration -- --bundle "<carpeta-del-run>" --csv-output "_local_E5_9_score_calibration_DO_NOT_COMMIT.csv"
```

`<carpeta-del-run>` = directorio del bundle que contiene `backtest_summary.json` y `backtest_trades.csv` (mismo árbol que el smoke **E5.8.1**).

---

## 3. Bundle analizado

- **Carpeta / etiqueta de parámetro:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` (bundle smoke E5.8.1 alineado a campaña E55 / SET001).
- **Build TestEA (contexto E5.8):** `MZP_TestEA_E5_8_0` (según cadena E5.8 / E5.8.1).

---

## 4. Confirmación de `ambiguous_rate` corregido

Tras **E5.9.0.1**, el resumen (`summaryRows` y CSV de `--csv-output`) usa la tasa de cohorte:

| Campo | Valor |
|-------|--------|
| `ok` | `true` |
| `bundlesAnalyzed` | `1` |
| `ambiguous_rate` (resumen / `outcome_by_score.all.ambiguous_rate`) | **0.25692398350029466** |

**No** debe usarse el `ambiguous_rate` del slice solo-`ambiguous` (típicamente 1.0 dentro de ese subconjunto).

---

## 5. Estadísticas de score (bundle)

| Campo | Valor |
|-------|--------|
| `score_enabled` (`has_entry_quality_score_logic`) | `true` |
| `score_observation_only` | `true` |
| `score_gate_enabled` | `false` |
| `trade_count` | **1697** |
| `score_average` | **51.42899233942251** |
| `expectancy_r` (`outcome_by_score.all`) | **0.18562168532704773** |

---

## 6. Resumen por outcome (evidencia clave)

| Outcome / grupo | Evidencia operador (extraída del análisis) |
|-----------------|--------------------------------------------|
| **all** | `ambiguous_rate` = **0.25692398350029466**; `expectancy_r` = **0.18562168532704773** |
| **ambiguous** | `average_ambiguous_risk_score` ≈ **70.11** |
| **wins** | `average_ambiguous_risk_score` ≈ **37.01** |
| **losses** | `average_ambiguous_risk_score` ≈ **36.69** |

El riesgo ambiguo agregado **separa** outcomes ambiguos de wins/losses en esta cohorte (diagnóstico; no es aprobación de umbral).

---

## 7. Resumen de bandas relativas (score en cohorte)

| Banda | `counted_trades` | `expectancy_r` | `ambiguous_rate` |
|-------|------------------|----------------|--------------------|
| **Top score band** (cola superior; p. ej. top 25 % según definición del analizador) | **910** | **0.34505494505494505** | **0** |
| **Bottom 25 %** | **787** | **0.0012706480304955528** | **0.554002541296061** |

Interpretación: la cola superior de score **supera** en expectancy a la cola inferior y **reduce** fuertemente la tasa de outcomes `ambiguous` en esta muestra.

---

## 8. Frecuencia de `missing_quality_components` (tokens dominantes)

En **E5.8**, varios componentes del contrato aún **no están implementados** en el EA; el CSV etiqueta trades con los mismos marcadores. Frecuencias típicas del orden de **1697** (una vez por trade) para tokens como:

- `missing_h4_h1_structure`
- `liquidity_event_not_implemented` *(bundles **anteriores** a E5.10; builds E5.10+ con detección activa ya no emiten este token — ver [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md))*
- `confirmation_not_implemented`
- `target_liquidity_not_implemented`
- `session_news_spread_not_implemented`
- `risk_daily_limits_not_implemented`

---

## 9. Por qué “1697” en faltantes no es “el mercado siempre igual”

Un conteo **1697** en un token de `missing_quality_components` significa: **1697 trades** en el bundle y **cada fila** lleva el mismo marcador porque la **capacidad** de ese componente **no existe aún** en el build E5.8 (placeholder / `*_not_implemented`), no que el mercado haya sido idéntico en todos los casos. Es una **brecha de implementación**, no una conclusión final sobre el mercado.

---

## 10. Interpretación

- **`SCORE_NO_A_B_GRADES`:** coherente con score **parcial** y umbrales A/B del contrato **no calibrados** para la mezcla actual de señales; **no** implica por sí solo “estrategia inválida” (véase **E5.8.1**).
- **`SCORE_MISSING_COMPONENTS_HIGH`:** coherente con **E5.8**: muchos pesos dependen de componentes aún no implementados → score **comprimido / incompleto**.
- **`TOP_QUARTILE_OUTPERFORMS`** y **`TOP_QUARTILE_REDUCES_AMBIGUITY`:** el score **actual** (con huecos) ya muestra **separación útil** en bandas relativas: señal estadística para seguir invirtiendo en **componentes**, no en “inflar” letras A/B.

---

## 11. Decisión (gobierno)

| Decisión | Estado |
|----------|--------|
| Evidencia del analizador (E5.9 + rerun post–E5.9.0.1) | **PASS** como evidencia técnica de calibración |
| Modo score | **Solo observación**; sin compuerta |
| Umbrales A/B/C como política de producto | **No aprobados** |
| Redefinir 50/53 como A/B o bajar umbrales solo para fabricar A/B | **No** (artificial; enmascara brecha de componentes) |
| Aprobar score como **gate** | **No** |
| Dirección de trabajo | **Mejorar componentes reales** del score (roadmap §12) |

---

## 12. Roadmap de mejora de componentes (score-capability)

Orden de intención para **decompress** el score y sustentar futura calibración de grades (sin comprometer fechas ni alcance MQL5 aquí):

| ID | Contenido |
|----|-----------|
| **E5.10** | **Liquidity Sweep V1** — detección y export (flags/tipos) alineados al contrato de score. |
| **E5.11** | **HTF structure / premium–discount** — contexto estructural H4/H1 (sustituye placeholder `missing_h4_h1_structure` cuando exista lógica real). |
| **E5.12** | **Confirmación de entrada / retest** y refinamiento de **ambiguous_risk** (sustituye `confirmation_not_implemented` y enriquece señal de riesgo). |
| **E5.13** | **Sesión / noticias / spread** — contexto operativo (sustituye `session_news_spread_not_implemented`). |
| **E5.14** | **Riesgo / overtrading / límites diarios** — controles agregados (sustituye `risk_daily_limits_not_implemented` y afines). |

Los IDs **E5.10–E5.14** aquí describen la **cadena de capacidades de score** priorizada por esta evidencia. Otros usos históricos de “E5.10” en docs más antiguos (p. ej. BridgeEA / forward-readiness en §15 del audit) deben **reconciliarse** al formalizar cada entrega para evitar colisión de numeración.

---

## 13. No objetivos (E5.9.1)

- **No** aprobación de trading en vivo.  
- **No** compuerta de score ni hard gate en TestEA.  
- **No** `OrderSend` ni **`CTrade`**.  
- **No** expansión de dashboard / launcher / API / supervisor / wrapper.  
- **No** commit de CSV locales `*_DO_NOT_COMMIT.csv` en el repositorio.

---

## 14. Flags diagnósticos registrados (analizador)

- `SCORE_NO_A_B_GRADES`
- `SCORE_MISSING_COMPONENTS_HIGH`
- `TOP_QUARTILE_OUTPERFORMS`
- `TOP_QUARTILE_REDUCES_AMBIGUITY`

---

## Historial

| Versión | Nota |
|---------|------|
| E5.9.1 v1 | Evidencia operador smoke E5.8.1 + `ambiguous_rate` cohorte + decisión componentes; docs-only. |
