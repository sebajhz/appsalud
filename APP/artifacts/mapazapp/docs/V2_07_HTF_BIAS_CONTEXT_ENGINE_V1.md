# V2-07 — HTF Bias / Context Engine v1

## Por qué existe

El motor IFVG operaba con **contexto HTF placeholder** en el modelo de decisión (`contextPlaceholderScore` / `contextQualityScore` manual). V2-07 introduce **`evaluateContextBias`**: una capa **puramente determinista** en `@workspace/mapazapp-core` que resume sesgo de marco alto, posición en rango, régimen simple y acuerdo multi-timeframe, **sin ejecución** y **sin datos en vivo obligatorios**.

## Qué significa “HTF bias” (v1)

- **Dirección preferida:** `buy_only` · `sell_only` · `both_allowed` · `no_trade` · `unclear`, derivada de puntuaciones `buyScore` / `sellScore` / `noTradeScore` y reglas de chop.
- **Estructura (swings):** `detectSwings` sobre cada TF disponible; HH/HL → sesgo alcista estructural, LH/LL → bajista; roturas simples marcan `broken_structure_*`.
- **Respaldo de pendiente:** si los pivotes son ambiguos, se usa la **pendiente neta del cierre** en la serie HTF ancla para fijar `directionalSign` (v1 pragmático, documentado).

## Premium / discount

Sobre una ventana de rango reciente (`rangeLookbackBars`):

- **Discount / extreme_low:** mejor contexto para valorar **compras** (en sentido clásico SMC).
- **Premium / extreme_high:** mejor para **ventas**.
- **Middle:** penalización configurable (`middleRangePenalty`).

## Tendencia / rango / chop

- **Régimen:** `trending_up` · `trending_down` · `ranging` · `choppy` · `expansion` · `contraction` · `unclear` — combinación de estructura, proxy de chop (ratio cuerpo / rango) y comparación ATR reciente vs ventana anterior.
- **Chop:** eleva `noTradeScore` y degrada el `contextScore` cuando `noTradeIfExtremeChop` está activo.

## Alineación multi-timeframe

- Se evalúan snapshots por TF en orden **D1 → H4 → H1 → M15** (los que tengan datos).
- **Ancla:** el primer TF en ese orden con barras suficientes.
- **Conflicto:** si existen **H4 y H1** y sus `directionalSign` son opuestos y no nulos → `HTF_MTF_CONFLICT`, banda de confianza **low**.
- **`requireHtfAlignmentForHighConfidence`:** sin acuerdo H4/H1, la banda alta queda restringida (política v1).

## Cómo alimenta el modelo de decisión

- `DecisionModelInput.contextBiasResult` opcional.
- **Precedencia de `contextQuality`:** `contextBiasResult.contextScore` (con ajustes frente a `zoneCandidate.direction` y `preferredDirection`) **antes** que `contextQualityScore` explícito, y este antes que el placeholder.
- **`DecisionModelSettings.contextBiasIntegration` (opcional):**
  - `contextBiasCanHardBlock` + `minContextBiasScoreForHardGate` → gate duro `CONTEXT_BIAS_HARD_BLOCK` (desactivado por defecto en tests).
  - `contextNoTradeInvalidatesVariant` + `noTradeInvalidateMaxContextScore` → puede forzar `invalid_variant` sin gate duro.

## Replay IFVG (opcional)

- `IfvgReplayBacktestInput.htfCandlesByTimeframe` + `contextBiasSettings` → el runner llama `evaluateContextBias` por candidato (precio de confirmación, dirección de zona).
- `contextBiasResultOverride` → omite el cálculo y fuerza un resultado (tests / harness).
- `IfvgReplayBacktestCandidateTrace.contextBiasResult` → traza opcional.

## Limitaciones (honestas)

- Una sola serie por TF lógico; **no** hay sincronización de calendario ni sesiones.
- Chop y expansión son **proxies** simples, no modelos de microestructura.
- Sesgo HTF **no** sustituye el pipeline IFVG ni prueba edge económico.

## Sin prueba de rentabilidad

Los fixtures son **sintéticos**. Los scores son **evidencia técnica** para revisión y tests, no rentabilidad demostrada.

## Siguiente paso recomendado

**V2-08 — Entry variant model** (variantes primaria / aceptada / observe explícitas en dominio) o profundizar contexto con sesiones según `CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md`.
