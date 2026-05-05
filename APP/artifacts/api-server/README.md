# `@workspace/api-server`

Express server for the Replit workspace. **Checkpoints 11–12** add read-only **Mapazapp mock API** routes under `/api/mapazapp/*` (checkpoint **12**: scanner simulation snapshots).

## Mapazapp API (mock / in-memory)

- **Source:** `src/mapazapp/` — routes, response envelope, duplicated dashboard mock fixtures (see `mockData.ts`), and adapters that call `@workspace/mapazapp-core` (`evaluateTradeReviewPlan`, registry, CP8 advisory, bridge parsers).
- **No** MT5, database persistence, WebSockets, order execution, file watchers, or live scanner.
- **All** Mapazapp routes are `GET` only. Responses use `{ ok, data, warnings, errors, source: "mock", mockOnly: true }`.
- **Trade review** payloads include envelope flags `reviewOnly: true`, `executionEnabled: false`.
- **Scanner simulation (checkpoint 12):** `GET /api/mapazapp/scanner/simulations`, `GET /api/mapazapp/scanner/simulations/latest`, `GET /api/mapazapp/accounts/:accountId/scanner/simulations/latest` — in-memory **`runCheckpoint12ScannerFixture`** output; same flags as trade review (`reviewOnly`, `executionEnabled: false`). **Not** a live scanner, **not** POST/run, **not** WebSocket.

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
