# V2-04 — IFVG Strategy Replay Backtest

## Alcance y seguridad

- Primer pipeline **puro TypeScript** en `@workspace/mapazapp-core` que encadena: **velas → detección IFVG → `evaluateTradeReviewPlan` → `buildEntrySlTpPlan` → `simulateReplayTrade` → agregación en R**.
- **Sin** I/O de archivos, **sin** MT5 en tiempo real, **sin** ejecución, **sin** cambios BridgeEA/TestEA, **sin** DB, watcher, WebSocket, scanner en vivo o mutación de registry.
- **Sin** prueba de rentabilidad: métricas son sintéticas y dependen de fixtures y supuestos del detector v1.

## API

- `runIfvgReplayBacktest(input: IfvgReplayBacktestInput): IfvgReplayBacktestResult`
- Ajustes por defecto: `createDefaultIfvgReplayBacktestSettings()`
- Inferencia de barra FVG (mejor esfuerzo): `inferFvgCenterBarIndexFromSourceIfvgId(sourceIfvgId)`
- Fixtures: `createIfvgReplayBacktestFixtures()` en `ifvg-replay-backtest-fixtures.ts`

## Flujo del pipeline

1. Validar velas, perfil y `strategySettings`.
2. `detectIfvgZoneCandidates` sobre la serie completa (misma limitación v1 que el detector: una serie para todo).
3. Por cada candidato (y opcional `testOnlyAppendZones` **solo tests**):
   - Inferir índice de barra central del FVG desde `sourceIfvgId` (`ifvg_fvg_{i}_…`).
   - Buscar hacia adelante el primer par **retest + confirmación** desde `centerIndex + 1`.
   - Construir `TradePlanInput` en la vela de confirmación y llamar `evaluateTradeReviewPlan`.
   - Filtrar según `IfvgReplayBacktestSettings` (`replayOnlyTradeReady`, `includeObserveCandidates`, `minScore`, etc.).
   - `buildEntrySlTpPlan` con el `TradeReviewPlan` resultante.
   - Si `canReplay`, `simulateReplayTrade` con **velas desde el índice de confirmación** (incluye esa barra).
4. Agregar `BacktestTrade` sintéticos y `IfvgReplayBacktestSummary` (conteos por estado, totalR, winRate, profit factor, max drawdown R, MAE/MFE medios, mejor/peor R).

## Anti lookahead (v1 / primera pasada)

- **Detección** sigue viendo la serie completa; eso es una limitación conocida del motor v1 (documentada también en detección).
- **Replay** se recorta a `candles.slice(planReadyBarIndex)` donde `planReadyBarIndex` es la vela donde la confirmación cerró válida, para no simular salidas antes de que el plan exista en este modelo.
- Si `sourceIfvgId` **no** sigue el patrón esperado, no hay índice fiable: se emite diagnóstico `CANDIDATE_INDEX_UNAVAILABLE` y la búsqueda retest/confirmación arranca en `0` (mayor riesgo de lookahead respecto al momento “real” del candidato).
- Siguiente endurecimiento recomendado: **V2-04.1** (índice explícito en `ZoneCandidate` o resultado de detección) o integración estricta con barras de formación IFVG.

## Métricas

- En **R** (multiples de riesgo), no dinero.
- Reutiliza `calculateBacktestSummary`, `calculateTotalR`, `calculateWinRate`, `calculateProfitFactor`, `calculateMaxDrawdownR` de `backtest-metrics.ts` donde aplica.
- Resumen extendido: conteos por estado de replay (`expired`, `missed`, `ambiguous`, etc.) y MAE/MFE medios desde `ReplayTradeResult`.

## Por qué esto no prueba rentabilidad

- Datos sintéticos, detector y planificación en versión esqueleto, tolerancias no calibradas en producción, y anti-lookahead solo parcial en detección.
- Cualquier “ranking” de símbolos o parámetros exige campañas fuera de muestra y gobernanza (p. ej. roadmap V2-08) **después** de calibración y replay más estrictos.

## Antes de ranking real de símbolos

- V2-05 — calibración de tolerancias “human-like”.
- V2-04.1 — indexación explícita de candidatos / ventanas de evaluación sin mirar futuro en detección, o walk-forward explícito.
- Evidencia multi-símbolo con protocolo documentado (no reutilizar parámetros sin validación cruzada).

## Siguiente paso sugerido

- **V2-05** — Human-like tolerance calibration, o
- **V2-04.1** — candidate bar metadata + anti-lookahead en detección antes de confiar en métricas agregadas.
