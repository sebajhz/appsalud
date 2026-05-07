# V2-08 — Entry Variant Model

## Por qué existe

El pipeline IFVG y el modelo de decisión necesitaban una capa explícita que describa **cómo** el precio interactúa con la zona y el tiempo, sin reducir el problema a “tocó el nivel exacto = válido”. V2-08 introduce **`evaluateEntryVariant`**: lógica **determinista** en `@workspace/mapazapp-core` que clasifica estilos de entrada (retest ideal, parcial, profundo, punto medio, confirmación, tarde, perdido, inválido), **sin ejecución** y **sin afirmar rentabilidad**.

## Alejamiento del pensamiento rígido por nivel

- Las bandas de “cerca del borde / del punto medio / penetración profunda” usan **`max(ATR·k, spread·k, tick·n)`** con un **tope adicional** (`classificationBandMaxAtrMultiple`) para que un spread extremo no colapse toda geometría en un solo bucket.
- El resultado incluye **`qualityScore` 0–100**, componentes ponderados y **códigos de razón** auditables.

## Clasificaciones (`EntryVariantClassification`)

| Valor | Significado breve |
|--------|-------------------|
| `ideal_entry` | Retest coherente + confirmación clara + geometría y timing favorables. |
| `accepted_entry` | Imperfecciones dentro de tolerancia (p. ej. retest profundo con confirmación marginal, parcial con matriz V2-06). |
| `weak_observe_entry` | Falta retest, confirmación débil, o espera temprana. |
| `late_entry` | Precio actual sugiere **chase** más allá de la entrada planificada (en unidades R). |
| `missed_entry` | Movimiento hacia el TP antes de entrada viable, o expiración tratada como perdido. |
| `invalid_entry` | Lado incorrecto de la zona, invalidación estructural, o timing invalidado. |

## Estados de timing (`EntryVariantTimingStatus`)

`early_wait` · `valid_now` · `late_chase` · `already_missed` · `expired` · `invalidated` · `unknown`

Requieren `entrySlTpPlan` + `currentPrice` para reglas de chase / missed; sin ellos el timing puede quedar `unknown` o heurístico.

## Estilos preferidos (`EntryVariantEntryStyle`)

Incluye: `zone_edge_touch`, `zone_midpoint_touch`, `deep_zone_retest`, `partial_zone_retest`, `confirmation_close`, `manual_reference`, `no_entry`.

## Replay hint (`replayEntryModel`)

Alineado con `ReplayTradeInput.entryModel`: `zone_touch`, `midpoint_touch`, `confirmation_close`, `manual_reference_price`.

Opcional (`treatClearConfirmationAsConfirmationCloseStyle`): si es `true` y la confirmación es `CLEAR`, el estilo preferido pasa a `confirmation_close`. Por defecto en tests es `false` para priorizar geometría de zona.

## Integración Entry/SL/TP (V2-03)

- `EntrySlTpModelInput.entryVariantResult` opcional.
- `buildEntrySlTpPlan` puede añadir **warnings** (`ENTRY_VARIANT_REPLAY_MODEL_MISMATCH`, `ENTRY_VARIANT_LATE_TIMING_NOTE`) si el hint de replay o el timing del variant discrepan del `entryMode` — **no** altera precios del plan.

## Integración modelo de decisión (V2-05)

- `DecisionModelInput.entryVariantResult` opcional.
- Ajusta puntuaciones suaves de **retest**, **confirmación**, **timing** y **Entry/SL/TP** con códigos `ENTRY_VARIANT_*`.
- `applyEntryVariantVariantOverride` puede forzar `invalid_variant`, `weak_observe_variant` o degradar `primary_setup` → `accepted_variant` ante `late_entry`.

## Limitaciones (honestas)

- Una sola referencia de toque (`retest.touchPrice` o `currentPrice`); sin reconstrucción multi-toque.
- Chase / missed dependen de un plan Entry/SL/TP y un único `currentPrice` (misma filosofía que V2-03).
- **Sin prueba de rentabilidad:** fixtures sintéticos y coherencia técnica únicamente.

## Sin ejecución

Sin órdenes, sin MT5, sin BridgeEA/TestEA, sin DB, watcher, WebSocket, scanner en vivo ni mutación de registry.
