# `@workspace/api-server`

Express server for the Replit workspace. **Checkpoints 11–18** add read-only **Mapazapp mock API** routes under `/api/mapazapp/*` (scanner simulation, forward-monitor, and assisted-execution contract + CP18 safety snapshots). **Checkpoint 13** adds the **MT5 BridgeEA MQL5 artifact** under `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` (compile in MetaTrader). **Checkpoint 14** adds **`Mapazapp_TestEA`** under `APP/artifacts/mt5/experts/Mapazapp_TestEA/` (Strategy Tester **virtual** CSV export for **`importBacktestTradesFromCsv`**). **Checkpoint 15** adds **GET** mock evidence routes (**`/backtest-evidence`**, **`/parameter-sets/:id/backtest-evidence`**, **`/parameter-sets/:id/approval-proposal`**) returning fictional multi-run bundles — **`advisoryOnly: true`**, **`registryMutationAllowed: false`**, **`canAutoApply: false`**. **Checkpoint 16** adds **GET** **`/forward-monitor/latest`**, **`/forward-monitor/sessions`**, **`/accounts/:accountId/forward-monitor/latest`** — snapshot-only mock monitor payloads (**`reviewOnly`**, **`executionEnabled: false`**, **`mockOnly: true`**). **Checkpoint 17** adds **GET** **`/assisted-execution/contract`**, **`/assisted-execution/mock-validation`**, **`/accounts/:accountId/assisted-execution/mock-validation`** — assisted execution **contract mock** only (**`contractOnly: true`**, **`executionEnabled: false`**, **`sendToMt5Enabled: false`**, **`canAutoExecute: false`**); **no** `POST` execution or MT5 command routes. This server still has **no** live bridge ingest, **no** TestEA folder watcher, **no** `POST` ingest, and **no** file persistence.

## Mapazapp API (mock / in-memory)

- **Source:** `src/mapazapp/` — routes, response envelope, duplicated dashboard mock fixtures (see `mockData.ts`), and adapters that call `@workspace/mapazapp-core` (`evaluateTradeReviewPlan`, registry, CP8 advisory, bridge parsers).
- **No** MT5, database persistence, WebSockets, order execution, file watchers, or live scanner.
- **All** Mapazapp routes are `GET` only. Responses use `{ ok, data, warnings, errors, source: "mock", mockOnly: true }`.
- **D5.1b runtime snapshot:** `GET /api/mapazapp/runtime/status` — read-only payload from `@workspace/mapazapp-core` runtime status model; **`reviewOnly`**, **`executionEnabled: false`**; MT5 and bridge remain **`not_configured`** (not live connectivity). **`D9.12.1`:** `api.url` / **`api.port`** use the same **`createApiHardeningConfigFromEnv`** resolution as the **`index.ts`** bootstrap (**`MAPAZAPP_API_HOST`**, **`MAPAZAPP_API_PORT`** / **`PORT`**, defaults **127.0.0.1** / **3001**) — **no** user folder paths, **no** `POST`.
- **Checkpoint 15 evidence:** `GET /api/mapazapp/backtest-evidence`, `GET /api/mapazapp/parameter-sets/:parameterSetId/backtest-evidence`, `GET /api/mapazapp/parameter-sets/:parameterSetId/approval-proposal` — core-backed **mock fixtures only**; unknown parameter set id → **404** `PARAMETER_SET_NOT_FOUND`.
- **Trade review** payloads include envelope flags `reviewOnly: true`, `executionEnabled: false`.
- **Scanner simulation (checkpoint 12):** `GET /api/mapazapp/scanner/simulations`, `GET /api/mapazapp/scanner/simulations/latest`, `GET /api/mapazapp/accounts/:accountId/scanner/simulations/latest` — in-memory **`runCheckpoint12ScannerFixture`** output; same flags as trade review (`reviewOnly`, `executionEnabled: false`). **Not** a live scanner, **not** POST/run, **not** WebSocket.
- **Forward monitor (checkpoint 16):** `GET /api/mapazapp/forward-monitor/latest`, `GET /api/mapazapp/forward-monitor/sessions`, `GET /api/mapazapp/accounts/:accountId/forward-monitor/latest` — in-memory **`evaluateForwardMonitorSnapshot`**; envelope **`reviewOnly: true`**, **`executionEnabled: false`**, **`mockOnly: true`**. **Not** a daemon, **not** WebSocket, **not** DB.
- **Assisted execution contract (checkpoints 17–18):** `GET /api/mapazapp/assisted-execution/contract`, **`GET /api/mapazapp/assisted-execution/safety`** (CP18 snapshot), **`GET /api/mapazapp/assisted-execution/invariants`** (normalized flags + policy codes), `GET /api/mapazapp/assisted-execution/mock-validation`, `GET /api/mapazapp/accounts/:accountId/assisted-execution/mock-validation` — in-memory **`validateAssistedExecutionIntent`** / **`createAssistedExecutionSafetySnapshot`** on fictional fixtures; envelope **`contractOnly: true`**, **`mockOnly: true`**, **`executionEnabled: false`**, **`sendToMt5Enabled: false`**, **`canAutoExecute: false`**, **`registryMutationAllowed: false`**, **`manualReviewRequired: true`**, **`requiresHumanConfirmation: true`**. **Not** order execution, **not** BridgeEA command ingest, **not** registry mutation, **not** `POST` assisted-execution routes.
- **V2-16 engine evidence (mock snapshots):** `GET /api/mapazapp/backtest-campaigns/mock-latest`, `GET /api/mapazapp/parameter-grid/mock-latest`, `GET /api/mapazapp/walk-forward/mock-latest`, `GET /api/mapazapp/manual-campaign/mock-latest` — core-backed fixtures via `src/mapazapp/adapters/`; top-level envelope **`reviewOnly: true`**, **`executionEnabled: false`**, **`registryMutationAllowed: false`**, **`autoApprovalEnabled: false`**, **`mockOnly: true`**. **No** `POST` on these paths, **no** persistence, **not** profitability proof.

### Run locally

From `APP/`:

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server test
```

### Listen address (D9.12)

- **`MAPAZAPP_API_HOST`:** bind address; default **`127.0.0.1`**. `localhost` is normalized to **`127.0.0.1`**. Using **`0.0.0.0`** is allowed only when action transport remains disabled; it is **not** recommended (wider interface exposure).
- **Port:** **`MAPAZAPP_API_PORT`** if set, else **`PORT`**, else default **`3001`**. (Before D9.12, `PORT` was required; the default **3001** is the dev-hardening default when neither variable is set.)

The process listens with an explicit host: **`app.listen(port, host, …)`** — loopback by default. **No** Mapazapp action **`POST`** routes; all mock Mapazapp routes remain **`GET`** only.

Start (from `APP/`):

```bash
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

Optional: `set PORT=3001` or `set MAPAZAPP_API_PORT=3001` to override the default port; override host with `set MAPAZAPP_API_HOST=127.0.0.1`.

### Duplication note

`mockData.ts` and `lib/mapMockZoneToCore.ts` / `lib/mapMockRiskToTradePlanGuard.ts` / `lib/mockSymbolProfiles.ts` mirror `APP/artifacts/mapazapp/src/mock/*` and `src/services/*` so the server does **not** depend on Vite path aliases or React. When dashboard mocks change, update the server copies or extract a future shared `mapazapp-mock` package.

### TypeScript

`tsconfig.json` no longer uses `references` to `api-zod` / `db` to avoid `TS6305` when composite `.d.ts` outputs are not pre-built; workspace resolution still applies to dependencies.
