# V2-13 — Campaign Runner over Manual Datasets

## Por qué existe

V2-11 permite importar velas desde CSV en memoria hacia `BacktestCampaignDataset`. V2-12 valida bundles de texto saneados (BridgeEA / TestEA) contra los mismos parsers. **V2-13** conecta ambas líneas con **V2-10** (`runBacktestCampaign`): una sola función pura `runManualDatasetCampaign` orquesta fuentes manuales, construye datasets de campaña cuando hay velas válidas y ejecuta la campaña con la misma postura de seguridad que el runner base.

No sustituye un producto de ingest en vivo: el operador sigue aportando texto en memoria (futuro UI/CLI en V2-17).

## Flujo

1. **Fuentes** (`ManualCampaignSource`): cada una tiene `sourceType`, `datasetSplit`, `symbolProfile` y datos (`csvText` y/o `files[]` con `{ fileName, text }`).
2. **`manual_csv_text`**: `importManualCandleDataset` → `createBacktestCampaignDatasetFromManualImport`.
3. **`bridge_export_bundle_text` / `mixed_export_bundle_text`**: `validateExportSampleBundle` → si el bundle es utilizable y hay `campaignDataset` en el resultado Bridge (velas + perfil), se clona con un `datasetId` estable por fuente.
4. **`testea_export_bundle_text`**: se valida el bundle TestEA (trades + `backtest_summary.json`). **No** existe artefacto de velas en el contrato TestEA: el resultado sirve como **evidencia de validación** y diagnósticos; **no** se crea dataset de velas para la campaña salvo que el bundle también incluya velas (p. ej. mezcla explícita no prevista en el contrato puro TestEA).
5. Si hay al menos un `BacktestCampaignDataset` válido → `runBacktestCampaign`.
6. Si no hay datasets de velas → `no_valid_datasets` o `import_failed` según fallos de import/privacidad/bundle.

## Seguridad e invariantes

- Sin `fs`, sin rutas de archivo en la API, sin file watcher, sin DB, sin escaneo MT5, sin ejecución, sin lectura de comandos MT5, sin WebSocket, sin scanner live, sin mutación de registry.
- Todo `ManualCampaignResult` incluye: `reviewOnly: true`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`.
- **No** se incluye texto CSV crudo en los resultados; diagnósticos referencian códigos, fuentes y conteos.
- **No** se commitean exportes reales crudos; los fixtures son sintéticos.
- **No** hay auto-aprobación ni claims de rentabilidad.

## API (core)

- `runManualDatasetCampaign(input: ManualCampaignInput): ManualCampaignResult`
- Tipos: `manual-campaign-types.ts`; diagnósticos: `manual-campaign-reasons.ts`; fixtures: `manual-campaign-fixtures.ts`.
- Tests: `APP/lib/mapazapp-core/tests/v2-13-manual-campaign-runner.test.ts`.

## Limitaciones (v1)

- Heurísticas de privacidad y validación de export siguen siendo conservadoras pero no completas.
- Bundles Bridge inválidos o sin `symbolProfile` no producen dataset de campaña aunque las velas parseen.
- TestEA solo no alimenta replay IFVG (no hay OHLC en ese contrato).

## Siguiente paso

**V2-14 — Parameter Set Grid Runner v1** (cerrado): `runParameterGrid` — ver `V2_14_PARAMETER_SET_GRID_RUNNER_V1.md`. **V2-15** — walk-forward. **V2-16** expone mock GET `GET /api/mapazapp/manual-campaign/mock-latest` (read-only) además del core.
