# V2-14 — Parameter Set Grid Runner v1

## Por qué existe

Tras V2-10 (campaign runner) y V2-13 (datasets manuales), hace falta una capa explícita para **comparar varios parameter sets sobre los mismos datasets** sin convertir el producto en un optimizador automático. `runParameterGrid` ejecuta, por cada candidato, un `runBacktestCampaign` **aislado** con los mismos `BacktestCampaignDataset[]` (filtrados por compatibilidad de símbolo si aplica), reutiliza la lógica de replay/ranking del campaign y produce un **ranking conservador por parameter set** con recomendaciones y flags de seguridad.

## Qué compara

- Entrada: `datasets` + `candidates` (cada uno envuelve un `BacktestCampaignParameterSetInput` y metadatos opcionales).
- Cada candidato compatible genera una campaña con **un solo** parameter set y los datasets visibles para ese candidato (`compatibleCanonicalSymbols` opcional).
- Salida: `ParameterGridCandidateResult[]`, `ranking` ordenado por `gridRankScore` (derivado del `rankScore` agregado del campaign más penalizaciones por tasas medias de ambiguous/missed/expired y un multiplicador conservador).

## Ranking y recomendaciones

- El **score base** viene de `BacktestCampaignParameterSetResult.rankScore` (misma filosofía conservadora que V2-10).
- **Penalización de comportamiento:** combina medias de `ambiguousRate`, `missedRate`, `expiredRate` de los runs del candidato (`gridSettings.behaviorRatePenaltyWeight`).
- **Multiplicador:** `conservativeScoreMultiplier` reduce el score final de forma uniforme (producto opta por subestimar).
- **Recomendación y calidad** se alinean con el campaign (`candidate_for_more_testing`, `needs_more_data`, `rejected`, `unstable`, `promising_but_unproven`, `not_rankable`).

No es optimización bayesiana ni búsqueda en grid desatendida: es un **informe comparativo** sobre un conjunto finito de configuraciones elegidas por el operador.

## Seguridad

- `reviewOnly: true`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`.
- **No** existe campo `approved` ni promoción de registry; un candidato puede llevar `registryCompatibility` precalculado y, si `compatible === false` con bloqueos, **no** se ejecuta campaña para ese candidato.
- Sin I/O de archivos, sin MT5, sin WebSocket, sin watcher, sin DB.

## Overrides en candidatos

- `decisionModelSettingsOverride`: mezcla superficial sobre `parameterSet.decisionModelSettings`.
- `campaignSettingsOverrides`: mezcla superficial sobre los `campaignSettings` compartidos **solo** en la campaña de ese candidato.
- `toleranceCalibrationSettings`, `contextBiasSettings`, `targetObjectiveSettings`: presentes en el tipo para evolución; con `documentOnlyEngineSettings: true` (por defecto en tests) **no** se cablean al replay en v1 — integrar en evaluadores/replay en un checkpoint posterior si hace falta.

## Limitaciones (v1)

- Una campaña por candidato: coste ~O(candidatos × coste campaign); aceptable para grids pequeños controlados.
- Stubs de test: `testOnlyReplayStubByParameterSetId` aplica el mismo stub a todos los datasets de ese candidato (herramienta de test; en producción omitir o usar overrides por dataset en los propios `BacktestCampaignDataset`).

## Relación con V2-15

V2-15 añade `evaluateWalkForward` para gobernanza **train / validation / forward** y señales de sobreajuste/inestabilidad sobre las filas `runResults` del campaign (incluidas salidas de `runParameterGrid`). El grid runner v1 sigue asumiendo `datasetSplit` coherente en datasets; el evaluador interpreta esa evidencia de forma conservadora (ver `APP/artifacts/mapazapp/docs/V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`).

## API (core)

- `runParameterGrid(input: ParameterGridInput): ParameterGridResult`
- Tipos: `parameter-grid-types.ts`; razones: `parameter-grid-reasons.ts`; settings: `parameter-grid-settings.ts`; fixtures: `parameter-grid-fixtures.ts`.
- Tests: `APP/lib/mapazapp-core/tests/v2-14-parameter-grid-runner.test.ts`.
