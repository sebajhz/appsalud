# `@workspace/api-server`

Express server for the Replit workspace. **Checkpoints 11–18** add read-only **Mapazapp mock API** routes under `/api/mapazapp/*` (scanner simulation, forward-monitor, and assisted-execution contract + CP18 safety snapshots). **Checkpoint 13** adds the **MT5 BridgeEA MQL5 artifact** under `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` (compile in MetaTrader). **Checkpoint 14** adds **`Mapazapp_TestEA`** under `APP/artifacts/mt5/experts/Mapazapp_TestEA/` (Strategy Tester **virtual** CSV export for **`importBacktestTradesFromCsv`**). **Checkpoint 15** adds **GET** mock evidence routes (**`/backtest-evidence`**, **`/parameter-sets/:id/backtest-evidence`**, **`/parameter-sets/:id/approval-proposal`**) returning fictional multi-run bundles — **`advisoryOnly: true`**, **`registryMutationAllowed: false`**, **`canAutoApply: false`**. **Checkpoint 16** adds **GET** **`/forward-monitor/latest`**, **`/forward-monitor/sessions`**, **`/accounts/:accountId/forward-monitor/latest`** — snapshot-only mock monitor payloads (**`reviewOnly`**, **`executionEnabled: false`**, **`mockOnly: true`**). **Checkpoint 17** adds **GET** **`/assisted-execution/contract`**, **`/assisted-execution/mock-validation`**, **`/accounts/:accountId/assisted-execution/mock-validation`** — assisted execution **contract mock** only (**`contractOnly: true`**, **`executionEnabled: false`**, **`sendToMt5Enabled: false`**, **`canAutoExecute: false`**); **no** `POST` execution or MT5 command routes. This server still has **no** live bridge ingest, **no** TestEA folder watcher, **no** `POST` ingest, and **no** file persistence.

## Mapazapp API (mock / in-memory)

- **Source:** `src/mapazapp/` — routes, response envelope, duplicated dashboard mock fixtures (see `mockData.ts`), and adapters that call `@workspace/mapazapp-core` (`evaluateTradeReviewPlan`, registry, CP8 advisory, bridge parsers).
- **No** MT5, database persistence, WebSockets, order execution, file watchers, or live scanner.
- **All** Mapazapp routes are `GET` only. Responses use `{ ok, data, warnings, errors, source: "mock", mockOnly: true }`.
- **Checkpoint 15 evidence:** `GET /api/mapazapp/backtest-evidence`, `GET /api/mapazapp/parameter-sets/:parameterSetId/backtest-evidence`, `GET /api/mapazapp/parameter-sets/:parameterSetId/approval-proposal` — core-backed **mock fixtures only**; unknown parameter set id → **404** `PARAMETER_SET_NOT_FOUND`.
- **Trade review** payloads include envelope flags `reviewOnly: true`, `executionEnabled: false`.
- **Scanner simulation (checkpoint 12):** `GET /api/mapazapp/scanner/simulations`, `GET /api/mapazapp/scanner/simulations/latest`, `GET /api/mapazapp/accounts/:accountId/scanner/simulations/latest` — in-memory **`runCheckpoint12ScannerFixture`** output; same flags as trade review (`reviewOnly`, `executionEnabled: false`). **Not** a live scanner, **not** POST/run, **not** WebSocket.
- **Forward monitor (checkpoint 16):** `GET /api/mapazapp/forward-monitor/latest`, `GET /api/mapazapp/forward-monitor/sessions`, `GET /api/mapazapp/accounts/:accountId/forward-monitor/latest` — in-memory **`evaluateForwardMonitorSnapshot`**; envelope **`reviewOnly: true`**, **`executionEnabled: false`**, **`mockOnly: true`**. **Not** a daemon, **not** WebSocket, **not** DB.
- **Assisted execution contract (checkpoints 17–18):** `GET /api/mapazapp/assisted-execution/contract`, **`GET /api/mapazapp/assisted-execution/safety`** (CP18 snapshot), **`GET /api/mapazapp/assisted-execution/invariants`** (normalized flags + policy codes), `GET /api/mapazapp/assisted-execution/mock-validation`, `GET /api/mapazapp/accounts/:accountId/assisted-execution/mock-validation` — in-memory **`validateAssistedExecutionIntent`** / **`createAssistedExecutionSafetySnapshot`** on fictional fixtures; envelope **`contractOnly: true`**, **`mockOnly: true`**, **`executionEnabled: false`**, **`sendToMt5Enabled: false`**, **`canAutoExecute: false`**, **`registryMutationAllowed: false`**, **`manualReviewRequired: true`**, **`requiresHumanConfirmation: true`**. **Not** order execution, **not** BridgeEA command ingest, **not** registry mutation, **not** `POST` assisted-execution routes.

### Run locally

From `APP/`:

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server test
```

Start (requires `PORT`):

```bash
set PORT=3001
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

### Duplication note

`mockData.ts` and `lib/mapMockZoneToCore.ts` / `lib/mapMockRiskToTradePlanGuard.ts` / `lib/mockSymbolProfiles.ts` mirror `APP/artifacts/mapazapp/src/mock/*` and `src/services/*` so the server does **not** depend on Vite path aliases or React. When dashboard mocks change, update the server copies or extract a future shared `mapazapp-mock` package.

### TypeScript

`tsconfig.json` no longer uses `references` to `api-zod` / `db` to avoid `TS6305` when composite `.d.ts` outputs are not pre-built; workspace resolution still applies to dependencies.
