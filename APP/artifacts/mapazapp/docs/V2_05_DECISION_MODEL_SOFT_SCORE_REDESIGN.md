# V2-05 — Decision Model / Soft-Score Redesign

## Por qué existe

Tras V2-04.2 quedó claro que el motor necesitaba **separar** lo que es **bloqueo binario** (no negociable) de lo que es **calidad ponderada** (ranking, observación, variantes). El replay IFVG seguía usando un `defaultScore` fijo para `evaluateTradeReviewPlan`, lo que impedía que la “confianza” reflejara retest, confirmación, sweep, desplazamiento o geometría Entry/SL/TP reales.

Este checkpoint introduce un **modelo de decisión explícito** en `@workspace/mapazapp-core`, sin ejecución y sin prueba de rentabilidad.

## Hard gates vs soft score

- **Hard gates (`collectHardGates` vía `DecisionHardGateResult`):** fallan → `hardGatePassed: false`, banda `no_trade`, variante `invalid_variant` (salvo políticas explícitas de break-risk). Cubren entre otros: perfil de símbolo ausente, zona ausente, plan Entry/SL/TP ausente o inválido, R:R por debajo del mínimo, timing estricto sin `candidateTiming` válido, guardas de cuenta, registry que no permite trade review, bloqueos de timing “tarde” en política bloqueada.
- **Soft score (`DecisionSoftScoreResult`):** diez componentes 0–100 con pesos normalizados a suma 1; `totalScore` redondeado 0–100. Los hard gates **no sustituyen** la lectura del soft score en trazas: cuando hay fallo duro, el total soft puede seguir calculándose para auditoría, pero la banda de confianza operativa es `no_trade`.

## Componentes de score (v1)

| Componente | Entradas principales |
|------------|----------------------|
| `sweepQuality` | `CONFIRMED_SWEEP` / `NEAR_SWEEP` / `POSSIBLE_BREAK_RISK` / `NO_SWEEP` |
| `displacementQuality` | `DisplacementResult` (o penalización si no hay) |
| `ifvgQuality` | `fvgSizeAtr` opcional o ancho de zona / ATR |
| `zoneQuality` | Ancho de zona vs ATR |
| `retestQuality` | `RetestResult.retested` |
| `confirmationQuality` | `ConfirmationResult` (CLEAR / MARGINAL / NONE) |
| `entrySlTpQuality` | R:R, `targetQuality`, estado del plan de precios |
| `timingQuality` | `CandidateTimingMetadata` + avisos/bloqueos de timing en Entry/SL/TP |
| `contextQuality` | **Esqueleto explícito:** placeholder neutral (`contextPlaceholderScore`) o `contextQualityScore` externo |
| `spreadVolatilityQuality` | `spreadPrice` / ATR |

Cada componente expone `reasonCodes` y `explanationSimple`. `explainability[]` duplica la vista para UI/auditoría.

## Variantes (v1)

- `primary_setup` — sweep confirmado, desplazamiento fuerte/moderado, confirmación clara, score total ≥ umbral v1.
- `accepted_variant` — near-sweep o confirmación marginal con compensación (desplazamiento fuerte o score alto).
- `weak_observe_variant` — sin retest, break-risk no invalidante, o conjunto parcial coherente con gates OK.
- `invalid_variant` — fallo de hard gate o política `breakRiskInvalidatesVariant` con `POSSIBLE_BREAK_RISK`.

## Bandas de confianza (numéricas)

| Total soft (0–100) | Banda |
|--------------------|--------|
| 0–44 | `no_trade` |
| 45–59 | `observe` |
| 60–74 | `wait` |
| 75–84 | `review_candidate` |
| 85–100 | `high_confidence_review_candidate` |

## Qué está implementado

- Módulos: `decision-model-types.ts`, `decision-model-reasons.ts`, `decision-model-settings.ts`, `decision-model.ts`, `decision-model-fixtures.ts`.
- API pública: `evaluateDecisionModel(input)`.
- Resultado siempre con `reviewOnly: true`, `canAutoExecute: false`, `registryMutationAllowed: false`.
- **Integración IFVG replay:** `IfvgReplayBacktestSettings.useDecisionModelScore` (por defecto `true` en `createDefaultIfvgReplayBacktestSettings`), `decisionModelSettings` opcional, trazas con `decisionModelResult`, `effectiveScoreForReplay`, `legacyDefaultScore`.
- **Flujo:** evaluación de plan con `defaultScore` → `buildEntrySlTpPlan` → primera pasada del modelo de decisión → `effectiveScoreForReplay` → re-evaluación del plan → `buildEntrySlTpPlan` final → segunda pasada del modelo para la traza.

## Qué sigue en esqueleto / parcial

- **Contexto HTF:** V2-07 añade `evaluateContextBias` + `DecisionModelInput.contextBiasResult` (y replay opcional). Sigue sin sesiones / calendario real multi-broker.
- **Anti-lookahead en detección:** sin cambios; el gate estricto de timing es opt-in vía `strictCandidateTiming`.
- **Desplazamiento en replay:** el backtest usa `buildDisplacementAtBar` en la vela de confirmación; no sustituye un desplazamiento “por candidato” en `strategy-detection.ts` (pendiente de otro checkpoint).
- **Sin prueba de rentabilidad:** métricas y scores son **evidencia técnica**, no edge económico.

## De A+B+C a A+A2+B+B2 (intención)

- **A / A2:** calidad IFVG/zona y variante (primaria vs aceptada) codificadas en componentes y clasificación.
- **B / B2:** sweep confirmado vs near vs break-risk explícitos en score y variantes.
- **Contexto + tolerancia + confianza:** contexto HTF medible v1 (`evaluateContextBias`); tolerancias en detectores + V2-06; confianza **derivada** en replay cuando `useDecisionModelScore` está activo y se suministran factores.

## Siguiente paso recomendado

**V2-08 — Parameter / entry variant matrix** (u hoja de ruta equivalente en `CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md`). **V2-07 (contexto)** está en `APP/artifacts/mapazapp/docs/V2_07_HTF_BIAS_CONTEXT_ENGINE_V1.md`.
