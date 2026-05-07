# V2-04 — IFVG Strategy Replay Backtest

## Alcance y seguridad

- Primer pipeline **puro TypeScript** en `@workspace/mapazapp-core` que encadena: **velas → detección IFVG → `evaluateTradeReviewPlan` → `buildEntrySlTpPlan` → `simulateReplayTrade` → agregación en R**.
- **Sin** I/O de archivos, **sin** MT5 en tiempo real, **sin** ejecución, **sin** cambios BridgeEA/TestEA, **sin** DB, watcher, WebSocket, scanner en vivo o mutación de registry.
- **Sin** prueba de rentabilidad: métricas son sintéticas y dependen de fixtures y supuestos del detector v1.

## API

- `runIfvgReplayBacktest(input: IfvgReplayBacktestInput): IfvgReplayBacktestResult`
- Ajustes por defecto: `createDefaultIfvgReplayBacktestSettings()`
- **V2-04.1:** `ZoneCandidate.candidateTiming` (`CandidateTimingMetadata`, `buildCandidateTimingMetadataFromIfvg` en `candidate-timing.ts`).
- Fallback (mejor esfuerzo): `inferFvgCenterBarIndexFromSourceIfvgId(sourceIfvgId)` cuando no hay metadatos.
- Fixtures: `createIfvgReplayBacktestFixtures()` en `ifvg-replay-backtest-fixtures.ts`

## Flujo del pipeline

1. Validar velas, perfil y `strategySettings`.
2. `detectIfvgZoneCandidates` sobre la serie completa (misma limitación v1 que el detector: una serie para todo).
3. Por cada candidato (y opcional `testOnlyAppendZones` **solo tests**):
   - Resolver inicio de búsqueda retest/confirmación: `candidateTiming.firstRetestSearchIndex` o `candidateCreatedIndex + 1`; si falta, fallback desde `sourceIfvgId` (diagnóstico `CANDIDATE_INDEX_INFERRED_FROM_ID`) o índice `0` (`CANDIDATE_INDEX_UNAVAILABLE`).
   - Buscar hacia adelante el primer par **retest + confirmación** desde ese índice.
   - Construir `TradePlanInput` en la vela de confirmación y llamar `evaluateTradeReviewPlan`.
   - Filtrar según `IfvgReplayBacktestSettings` (`replayOnlyTradeReady`, `includeObserveCandidates`, `minScore`, etc.).
   - **V2-05:** `evaluateDecisionModel` sobre el plan Entry/SL/TP; `effectiveScoreForReplay` alimenta la segunda pasada de `evaluateTradeReviewPlan` y la elegibilidad por `minScore` cuando `useDecisionModelScore` no es `false` (ver `V2_05_DECISION_MODEL_SOFT_SCORE_REDESIGN.md`).
   - `buildEntrySlTpPlan` con el `TradeReviewPlan` resultante.
   - Si `canReplay`, `simulateReplayTrade` con **velas desde** `max(planReadyBarIndex, firstReplayIndex?)` (incluye esa barra).
4. Agregar `BacktestTrade` sintéticos y `IfvgReplayBacktestSummary` (conteos por estado, totalR, winRate, profit factor, max drawdown R, MAE/MFE medios, mejor/peor R).

## Anti lookahead (v1 / primera pasada)

- **Detección** sigue viendo la serie completa; eso es una limitación conocida del motor v1 (documentada también en detección).
- **V2-04.1 — `candidateTiming` en `ZoneCandidate`:** la tubería de detección adjunta metadatos de índice (`fvgStartIndex` / `fvgMiddleIndex` / `fvgEndIndex`, `ifvgBreakIndex`, `candidateCreatedIndex`, `firstRetestSearchIndex`, etc.; ver `CandidateTimingMetadata` en `candidate-timing.ts`). `runIfvgReplayBacktest` **prioriza** esos campos para el inicio de la búsqueda retest/confirmación (típicamente **después** de la barra de ruptura IFVG), en lugar de inferir solo desde `sourceIfvgId`.
- **Replay** se recorta a `candles.slice(replaySliceStartBar)` con `replaySliceStartBar = max(planReadyBarIndex, firstReplayIndex?)`, donde `planReadyBarIndex` es la vela donde la confirmación cerró válida, para no simular salidas antes de que el plan exista en este modelo.
- **Fallback:** si no hay metadatos de tiempo pero `sourceIfvgId` es parseable (`ifvg_fvg_{i}_…` / `fvg_{i}_…`), se emite `CANDIDATE_INDEX_INFERRED_FROM_ID` (búsqueda aún basada en índice FVG central, menos estricta que la ruta con metadatos).
- Si no hay metadatos **y** el id no es parseable: `CANDIDATE_INDEX_UNAVAILABLE` y la búsqueda arranca en `0` (mayor riesgo de lookahead).
- Limitación que permanece: la **detección** sigue usando la serie completa; V2-04.1 no sustituye un motor walk-forward — solo acota replay y búsqueda post-IFVG con índices explícitos cuando existen.

## Métricas

- En **R** (multiples de riesgo), no dinero.
- Reutiliza `calculateBacktestSummary`, `calculateTotalR`, `calculateWinRate`, `calculateProfitFactor`, `calculateMaxDrawdownR` de `backtest-metrics.ts` donde aplica.
- Resumen extendido: conteos por estado de replay (`expired`, `missed`, `ambiguous`, etc.) y MAE/MFE medios desde `ReplayTradeResult`.

## Por qué esto no prueba rentabilidad

- Datos sintéticos, detector y planificación en versión esqueleto, tolerancias no calibradas en producción, y anti-lookahead solo parcial en detección.
- Cualquier “ranking” de símbolos o parámetros exige campañas fuera de muestra y gobernanza (p. ej. roadmap V2-08) **después** de calibración y replay más estrictos.

## Antes de ranking real de símbolos

- **V2-04.1 (hecho en core):** metadatos `candidateTiming` + replay que los respeta; la detección global de velas sigue siendo limitación v1.
- **V2-05** — calibración de tolerancias “human-like” (siguiente paso lógico tras V2-04.1).
- Walk-forward explícito u offline recompute bar-by-bar en detección (futuro, fuera de V2-04.1).
- Evidencia multi-símbolo con protocolo documentado (no reutilizar parámetros sin validación cruzada).

## Siguiente paso sugerido

- **V2-05** — Human-like tolerance calibration sobre fixtures y protocolos de campaña documentados.
