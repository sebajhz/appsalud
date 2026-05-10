# V2-15 — Walk-forward / Train-Validation-Forward Evaluator

## Por qué existe

Las campañas de backtest y los grids de parameter sets producen **métricas y rankings** que son fáciles de sobreinterpretar si todo el historial se trata como una sola muestra. El evaluador walk-forward separa la evidencia por **train**, **validation** y **forward** (más `full` / `unknown` con reglas explícitas) para:

- detectar señales de **sobreajuste** (buen train, mal validation o degradación hacia forward);
- exigir **splits faltantes** cuando el operador marca requisitos (`requireTrain`, `requireValidation`, `requireForward`);
- resumir **estabilidad** rudimentaria (varianza de scores, caídas de `averageR`, drawdown, spread de win rate cuando hay datos);
- emitir **recomendaciones conservadoras** sin auto-aprobación ni promoción de registry.

No sustituye un protocolo estadístico completo de walk-forward industrial; es una **capa determinista v1** en `@workspace/mapazapp-core` sobre filas `BacktestCampaignRunResult` ya producidas (p. ej. salida de `runBacktestCampaign` o `runParameterGrid`).

## Cómo reduce sobreinterpretación y fuga temporal

- Los agregados por split **no inventan** velas ni re-particionan series: solo **leen** `datasetSplit` en cada run.
- Un único run `full` puede alimentar simultáneamente buckets train/validation/forward en la agregación (comportamiento documentado con código de razón `WF_FULL_SPLIT_SUBSTITUTE_NOTE`): es una convención de conveniencia para tests o exports agregados, **no** una prueba walk-forward limpia por sí sola.
- Filas solo `unknown` no justifican recomendaciones fuertes salvo modo exploración (`allowUnknownSplitForExplorationOnly`).

## Train vs validation vs forward

| Split (lógica del evaluador) | Fuentes de filas |
|-----------------------------|------------------|
| Train | `datasetSplit === "train"` o `"full"` |
| Validation | `datasetSplit === "validation"` o `"full"` |
| Forward | `datasetSplit === "forward"` o `"full"` |

La fila `full` actúa como sustituto en todos los buckets presentes: úsese solo cuando el llamador entiende el riesgo de **duplicar** la misma evidencia en varios buckets.

## Riesgo de sobreajuste (`overfitRisk`)

Modelo explícito v1:

- **Nivel:** `low` | `medium` | `high` | `unknown`.
- **Señales:** ratio train/validation de `rankScore`; caída de `averageR` train→validation; caída validation→forward; muestras muy pequeñas (vía razones de trades); varianza alta de rank entre splits (también alimenta `unstable`).
- **Salida:** `reasonCodes` + `explanation` legible.

La **recomendación** puede ser `overfit_risk` incluso cuando el nivel es `medium`, según orden de reglas en `evaluateWalkForward`.

## Estabilidad (`WalkForwardStabilitySummary`)

Resumen determinista v1:

- varianza de `rankScore` entre splits presentes;
- `averageR` drop train→validation y validation→forward;
- `maxDrawdownR` máximo entre splits;
- spread de `winRate` si hay valores;
- `sampleSizeAdequate` vs `minTotalTrades`.

No sustituye tests estadísticos formales ni block bootstrap.

## Recomendaciones conservadoras

Implementadas en `walk-forward-evaluator.ts` (orden de precedencia relevante):

- **Nunca** hay estado “aprobado” ni campo `approved: true`.
- `candidate_for_more_testing` es el techo positivo cuando train+validation+forward (o train+validation si forward no es requisito) pasan umbrales y muestra mínima.
- `promising_but_unproven` cubre train+validation razonables pero forward obligatorio ausente, u otras lagunas controladas por settings.
- `rejected` ante fallos duros de métricas en validation.
- `needs_more_data` ante splits requeridos ausentes o trades insuficientes.
- `unstable` ante varianza alta de rank entre splits.
- `not_rankable` ante solo-unknown con exploración desactivada.

## No auto-aprobación, no prueba de rentabilidad

- Todos los resultados incluyen: `reviewOnly: true`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`.
- El evaluador **no** ejecuta órdenes, **no** lee MT5, **no** persiste en DB, **no** muta registry.
- Los fixtures bajo `walk-forward-fixtures.ts` son **sintéticos**; no afirman edge en mercado real.

## Entrada preferida

- **`parameterGridResult`:** recorre `candidates[].campaignResult.runResults`.
- **`campaignResult`:** usa `runResults` directamente.
- **Opcional:** `datasets` + `parameterSets` + `campaignSettings` para disparar un `runParameterGrid` interno (mismo contrato que V2-14; coste multi-campaña).

## Relación con V2-16 (dashboard / API)

V2-16 alinea mock GET `GET /api/mapazapp/walk-forward/mock-latest` y vistas (p. ej. `BacktestsPage`) con `WalkForwardResult` — solo lectura, sin `POST` ni ejecución; copy conservador vía `engineEvidenceUi` en el dashboard.

## API (core)

- `evaluateWalkForward(input: WalkForwardInput): WalkForwardResult`
- Tipos: `walk-forward-types.ts`; razones: `walk-forward-reasons.ts`; settings: `walk-forward-settings.ts`; fixtures: `walk-forward-fixtures.ts`.
- Tests: `APP/lib/mapazapp-core/tests/v2-15-walk-forward-evaluator.test.ts`.
