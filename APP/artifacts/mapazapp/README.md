# Mapazapp — Trading Guard Dashboard

**Workspace context:** this folder is `APP/artifacts/mapazapp` inside the Mapazapp repo. The **pnpm workspace root** is `APP/`. Product planning lives in the repo’s `00_START_HERE/` and `Mapazapp_Replit_Handoff_V1/`; quick navigation for Cursor: `00_START_HERE/CURSOR_NAVIGATION_NOTE.md`. `APP/artifacts/mockup-sandbox` is not this product; `APP/artifacts/api-server` is Replit scaffold only (ignore for mock work).

**Shared core:** `@workspace/mapazapp-core` under `APP/lib/mapazapp-core/` — checkpoints 1–8 (normalization, IFVG detection skeleton, **`evaluateTradeReviewPlan`**, account guard, **strategy / parameter-set registry**, **backtest run/trade types + CSV import skeleton + advisory `evaluateBacktestApproval`**), plus **checkpoint 10** (**BridgeEA JSON/CSV contract parsers** — in-memory text only, no MT5). Dashboard checkpoint 9 adds **read-only registry inspector** pages. From `APP/`: `pnpm --filter @workspace/mapazapp-core test` and `pnpm --filter @workspace/mapazapp test`. Assumptions: `docs/IMPLEMENTATION_ASSUMPTIONS.md`.

**Dashboard services (checkpoint 4):** `src/services/mockTradeReviewDataSource.ts` exposes **`createMockDashboardDataSource()`** — account snapshot, zones, alerts, and **core-generated `TradeReviewPlan`** rows per `accountId` (mock-only, no network). Home, Market/Zones, and Zone Detail consume it; see `docs/CURSOR_HANDOFF.md`.

**Checkpoint 5 — explanation layer:** `src/services/tradeReviewExplanation.ts` turns each evaluation into **`TradeReviewExplanation`** (plain-language “what / why / what’s missing”, mapped reason codes with severity/category, **`manualReviewOnly: true`**). Vitest: `src/services/tradeReviewExplanation.test.ts`. UI: `TradeReviewExplanationCard`, `ReasonCodeList`, updates on Home / Zones / Zone Detail only.

**Checkpoint 6 — account guard core:** `@workspace/mapazapp-core` adds **`evaluateAccountGuard`** + types/reasons/settings; mock **`mapMockRiskToTradePlanGuard`** feeds **`evaluateTradeReviewPlan`**. Dashboard **`getAccountGuardEvaluation`**. Core tests: `lib/mapazapp-core/tests/account-guard.test.ts`. Minimal UI: Home (guard hint), Risk Guard technical block, Zone Detail technical snippet.

**Checkpoint 7 — parameter-set registry:** core **`evaluateParameterSetCompatibility`**, **`createCheckpoint7MockParameterSetRegistry`**, dashboard **`MOCK_CHECKPOINT7_STRATEGY_REGISTRY`** + per-zone **`registryCompatibility`** on trade review rows. **`TRADE_READY`** requires **`approved_for_trade_review`** for that symbol/account — alerts-only / draft / validated sets do not. Core tests: `lib/mapazapp-core/tests/checkpoint7-strategy-registry.test.ts`. UI: Home (registry block banner), Zones (registry hint), Zone Detail (registry panel), Backtests (“Registry status” column).

**Checkpoint 8 — backtest model & importer skeleton:** core **`importBacktestTradesFromCsv`**, **`evaluateBacktestApproval`**, metrics + fictional **`backtest-fixtures`** (not MT5). Registry is **not** auto-updated from imports. UI: Backtests table “CP8 import eval” column; backtest detail shows advisory block when a fixture id matches. Core tests: `lib/mapazapp-core/tests/checkpoint8-backtest.test.ts`; display smoke: `src/services/backtestCheckpoint8Display.test.ts`.

**Checkpoint 9 — strategy / parameter set read-only UI:** **`strategyRegistryDataSource.ts`** + **`mockStrategyRegistryDataSource.ts`** + **`strategyRegistryUi.ts`**; routes **`/parameter-sets`** and **`/parameter-sets/:id`** (sidebar **Strategy & sets**). Inspector shows registry compatibility, TRADE_READY gate copy, CP8 advisory, and IFVG settings summaries — **read-only** (no editing, no backend). Tests: **`src/services/mockStrategyRegistryDataSource.test.ts`**.

**Checkpoint 10 — Bridge file contract reader skeleton:** `@workspace/mapazapp-core` exposes **`parseBridgeStatusJson`**, CSV parsers for market/account/candles/positions/orders/deals/errors, **`deriveSymbolMarketSpecFromBridgeMarketSnapshot`**, **`makeBridgeAccountKey`**, **`bridge-fixtures.ts`** (fictional exports), and Vitest **`lib/mapazapp-core/tests/checkpoint10-bridge-contract.test.ts`**. Dashboard: **`bridgeMockExportDataSource.ts`** + **`bridgeImportUi.ts`**; **MT5 Bridge** page shows **mock parsed** contract summary (no disk, no EA). **No** WebSocket, backend, or live bridge.

**Checkpoint 11 — local backend foundation:** `@workspace/api-server` serves read-only **`GET /api/mapazapp/*`** mock endpoints (accounts, trade reviews, registry, backtest advisory, bridge parser summary) using **`@workspace/mapazapp-core`** + duplicated in-server mock data (`APP/artifacts/api-server/src/mapazapp/`). The **dashboard still uses in-process** `createMockDashboardDataSource()` — no runtime dependency on the HTTP API in this checkpoint. See **`../api-server/README.md`** and `docs/CURSOR_HANDOFF.md`.

**Checkpoint 12 — scanner simulation (offline only):** core **`runScannerSimulation`**, **`runScannerSimulationFromBridgeCandlesCsv`**, **`bridgeCandleRowToCandle`**, **`scanner-fixtures`**, **`runCheckpoint12ScannerFixture`**; Vitest **`lib/mapazapp-core/tests/checkpoint12-scanner-simulation.test.ts`**. Dashboard: **`/scanner`** (`ScannerSimulationPage`), **`scannerSimulationDataSource.ts`** + **`mockScannerSimulationDataSource.ts`** + **`scannerSimulationUi.ts`** — in-process replay of fictional candles / optional Bridge CSV text path. **Not** live MT5, **not** execution, **not** profitability. API adds read-only scanner snapshot routes (see api-server README).

**Checkpoint 13 — MT5 BridgeEA export-only:** MQL5 source **`APP/artifacts/mt5/experts/Mapazapp_BridgeEA/Mapazapp_BridgeEA.mq5`** (plus `README.md`, `EXPORT_CONTRACT.md`, **`samples/`**). Operators compile in **MetaEditor** and attach to a chart; the EA writes **`MZP_BRIDGE_V1`** CSV/JSON aligned with **checkpoint 10** core parsers. **Export-only** (no command ingest, no `WebRequest`, no DLLs, no `CTrade`). The **dashboard remains mock/in-process** until a future checkpoint wires file or API ingest.

**Checkpoint 14 — MT5 TestEA / Strategy Tester export:** separate MQL5 artifact **`APP/artifacts/mt5/experts/Mapazapp_TestEA/`** (`MZP_TESTEA_V1`). Runs **only** in **Strategy Tester** (`MQL_TESTER` guard); writes **virtual** **`backtest_trades.csv`** + **`backtest_summary.json`** under **`MQL5/Files/Mapazapp/testea/<run_id>/`** for **`importBacktestTradesFromCsv`** (checkpoint 8). **Not** live trading, **not** IFVG production logic, **not** registry auto-approval. See artifact **`README.md`** / **`MANUAL_TEST_CHECKLIST.md`**.

**Checkpoint 15 — backtest evidence loop (advisory):** core **`evaluateBacktestEvidence`**, **`createBacktestEvidenceBundleFromCsvTexts`** (in-memory CSV strings only), fictional **`backtest-evidence-fixtures`** aligned to selected registry ids; **`BacktestsPage`** adds a **CP15 evidence** column; **`ParameterSetDetailPage`** adds a **CP15** panel. Mock API: **`GET /api/mapazapp/backtest-evidence`** and per-parameter-set evidence / approval-proposal routes (**`advisoryOnly`**, **`canAutoApply: false`**). **No** Strategy Tester folder watcher, **no** registry mutation, **no** optimization automation. Core tests: **`lib/mapazapp-core/tests/checkpoint15-backtest-evidence.test.ts`**.

**Checkpoint 16 — forward / demo monitor (observational):** core **`evaluateForwardMonitorSnapshot`** + **`forward-monitor-fixtures`**; dashboard **`/forward-monitor`** + **`forwardMonitorDataSource.ts`** / **`mockForwardMonitorDataSource.ts`** / **`forwardMonitorUi.ts`**. Mock API: **`GET /api/mapazapp/forward-monitor/latest`**, **`GET /api/mapazapp/forward-monitor/sessions`**, **`GET /api/mapazapp/accounts/:accountId/forward-monitor/latest`**. **No** live file watcher, **no** WebSocket, **no** DB persistence, **no** order execution. Core tests: **`lib/mapazapp-core/tests/checkpoint16-forward-monitor.test.ts`**.

**Checkpoint 17 — assisted execution contract (validation only):** core **`validateAssistedExecutionIntent`** + **`assisted-execution-fixtures`**; dashboard **`/assisted-execution`** + **`assistedExecutionDataSource.ts`** / **`mockAssistedExecutionDataSource.ts`** / **`assistedExecutionUi.ts`**. Mock API: **`GET /api/mapazapp/assisted-execution/contract`**, **`GET /api/mapazapp/assisted-execution/mock-validation`**, **`GET /api/mapazapp/accounts/:accountId/assisted-execution/mock-validation`**. **Contract only** — **`executionEnabled`** / **`sendToMt5Enabled`** / **`canAutoExecute`** always false; **no** `POST`, **no** MT5 commands, **no** registry mutation. Core tests: **`lib/mapazapp-core/tests/checkpoint17-assisted-execution.test.ts`**.

**Checkpoint 18 — assisted execution safety hardening (still no execution):** core **`assisted-execution-invariants`** (`assertAssistedExecutionDisabled`, safety snapshot, CP18 policy reason codes) + **`registryMutationAllowed: false`** / **`manualReviewRequired: true`** on validation/audit DTOs; mock API adds **`GET /api/mapazapp/assisted-execution/safety`** and **`GET /api/mapazapp/assisted-execution/invariants`**; dashboard strengthens disabled-state UX (banner, checklist, future-phase copy). **No** `POST`, **no** command channel. Core tests: **`lib/mapazapp-core/tests/checkpoint18-assisted-execution-invariants.test.ts`**. **CP19+** and explicit approval required before any real execution phase.

**Roadmap V2-16 — dashboard/API evidence cleanup (no engine change):** mock API adds read-only **`GET /api/mapazapp/backtest-campaigns/mock-latest`**, **`parameter-grid/mock-latest`**, **`walk-forward/mock-latest`**, **`manual-campaign/mock-latest`** (see **`../api-server/README.md`**). Dashboard: **`src/services/engineEvidenceCoreSnapshots.ts`**, **`backtestCampaignDataSource.ts`**, **`mockBacktestCampaignDataSource.ts`**, **`parameterGridDataSource.ts`**, **`mockParameterGridDataSource.ts`**, **`walkForwardDataSource.ts`**, **`mockWalkForwardDataSource.ts`**, **`manualCampaignDataSource.ts`**, **`mockManualCampaignDataSource.ts`**, **`engineEvidenceUi.ts`**; **`BacktestsPage`** summary cards + disclaimers; tests **`src/services/engineEvidenceUi.test.ts`**, **`src/services/mockEngineEvidenceDataSources.test.ts`**. **No** upload UI, **no** execution, **no** DB — evidence-only copy.

**Mapazapp** is a trading intelligence and risk management dashboard for disciplined prop firm traders. This repository contains the **visual dashboard mock** — a pure frontend build for validating the UI and product experience before connecting real trading infrastructure.

Mapazapp is **multi-account and multi-broker by design**. Every entity in the system — risk state, prop firm guard, journal, alerts, bridge terminals, and backtests — is scoped to an `accountId`.

---

## ⚠️ THIS IS A MOCK — No Real Trading Logic

This Replit phase is a visual mock **only**. There is:

- **No real MT5 terminal connection**
- **No BridgeEA connected to this mock app** — checkpoint 10 **parses fictional in-memory** export text; checkpoint 13 adds a **real MQL5 export-only EA** artifact for operators to run in MT5 separately (still **no** ingest into this dashboard build)
- **No real tick data or price feeds**
- **No real IFVG zone detection algorithm**
- **No real zone score calculation**
- **No real Risk Guard rule evaluation**
- **No real Prop Firm Guard enforcement**
- **No real multi-account switching backend**
- **No real multi-terminal MT5 bridge**
- **No in-app Strategy Tester integration or file ingest** — checkpoint 14 TestEA produces **optional** CSV on disk for manual import into core; dashboard backtests remain mock
- **No real journal import from MT5 history**
- **No real alert engine**
- **No order execution or trade automation of any kind**
- **No backend server (Python, Node, or otherwise)**
- **No database**
- **No authentication**
- **No WebSockets or live data**

All numbers, states, zone scores, drawdown percentages, risk values, and account balances are **hardcoded mock data** in `src/mock/`.

---

## Stack

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Framework   | React 18 + TypeScript               |
| Build       | Vite                                |
| Styling     | Tailwind CSS v4                     |
| Routing     | Wouter                              |
| Components  | Shadcn/ui + Lucide React icons      |
| Core lib    | `@workspace/mapazapp-core` (pure TS, workspace) |
| Data        | Hardcoded mock files in `src/mock/` + in-process `src/services/` (checkpoints 1 + 4) |

---

## Multi-Account Architecture

Mapazapp is designed from day one for multiple accounts and multiple brokers simultaneously. Real use cases include:

- One The5ers account + one PropXP account active at the same time
- Two accounts at the same firm in different phases
- One demo account and one funded account
- Multiple MT5 terminals, each connected to a different account

### Key concepts

| Concept | Description |
|---------|-------------|
| `accountId` | Primary key across the system. Every trade, risk state, alert, journal entry, and bridge terminal references an `accountId`. |
| `activeAccountId` | The currently selected account. Set in `mockConfig` and managed via React `AccountContext`. |
| `riskProfileId` | References which risk profile (daily DD %, max DD %, risk per trade %) applies to an account. |
| `rulesProfileId` | References which prop firm rules apply (profit target, drawdown limits, consistency, news blackout). |
| Account selector | A dropdown in the topbar lets users switch accounts. The sidebar shows the active account context. |

### Account selector (mock)

The account selector in the top bar is a React `useState` — switching accounts changes which mock data is displayed. There is no backend persistence. Cursor must implement a real account registry and account-aware API endpoints.

---

## Pages

| Page             | Path              | Description |
|-----------------|-------------------|-------------|
| Home / Daily State | `/`            | Status summary, account snapshot, trade-ready zones, recent alerts, drawdown meters |
| Market / Zones    | `/zones`         | All zones with state/score filters |
| Zone Detail       | `/zones/:id`     | Full zone detail: IFVG type, entry/SL/TP, score, notes |
| Risk Guard        | `/risk`          | Account-scoped risk: daily DD, max DD, trades, violations, operational status |
| Prop Firm Guard   | `/propfirm`      | Account-scoped prop firm: profit target, drawdown rules, consistency, news trading |
| Backtests         | `/backtests`     | Parameter set list with allowed-account compatibility indicator |
| Backtest Detail   | `/backtests/:id` | Stats, equity curve mock, sample trades |
| Journal           | `/journal`       | Multi-account trade log with account filter, resultR, compliance |
| Psychology        | `/psychology`    | Mood tracking, pre-flight checklist, impulse trade count |
| Alerts            | `/alerts`        | Account-tagged and global alerts with filter and acknowledge |
| Configuration     | `/config`        | Accounts, risk profiles, rules profiles, symbol mapping, notifications, zone scoring |
| MT5 Bridge        | `/bridge`        | Multi-terminal view: state, last update, symbol ticks, connection logs per terminal |

---

## Optional env — API base for runtime status (D6.1)

- **`VITE_MAPAZAPP_API_BASE_URL`** — optional origin for the Mapazapp API (e.g. `http://127.0.0.1:3001`). When unset, the dashboard **runtime status data source** reports **`unavailable`** / unknown conservative posture and does not call the network. Not required for current in-process mocks.

---

## Mock Data Structure

All mock data is in `src/mock/`. The single source of truth is `config.ts`.

```
src/mock/
├── config.ts          ← master config: accounts[], activeAccountId, riskProfiles, rulesProfiles, symbolMappings
├── types.ts           ← all TypeScript interfaces
├── account.ts         ← AccountSnapshot per accountId (Record<string, AccountSnapshot>)
├── risk.ts            ← AccountRiskGuardState per accountId (Record<string, AccountRiskGuardState>)
├── propfirm.ts        ← AccountPropFirmState per accountId (Record<string, AccountPropFirmState>)
├── journal.ts         ← JournalTrade[] — each entry has accountId + accountDisplayName
├── alerts.ts          ← Alert[] — each has accountId (null for global) + accountDisplayName
├── backtests.ts       ← BacktestParameterSet[] — each has allowedAccountIds[]
├── bridgeStatus.ts    ← BridgeTerminal[] — one terminal per account (multi-terminal)
├── zones.ts           ← Zone[] — zones are symbol-scoped, not account-scoped in mock
├── psychology.ts      ← PsychologyEntry[]
└── zones.ts           ← Zone[]
```

---

## Configuration as Single Source of Truth

`mockConfig.accounts[]` is the authoritative list of accounts. Every page that needs account-specific data uses `useActiveAccount()` from `Layout.tsx` to get the `activeAccountId`, then looks up the appropriate record:

```typescript
const { activeAccountId } = useActiveAccount();
const risk = mockRiskByAccount[activeAccountId];
const snapshot = mockAccountSnapshots[activeAccountId];
const propfirm = mockPropFirmByAccount[activeAccountId];
```

---

## Future Architecture (for Cursor to implement)

The real system will be built in three layers:

1. **Python backend** — account registry, zone scanner, risk engine, prop firm rule evaluator, journal persistence, alert engine
2. **MT5 BridgeEA** — MQL5 Expert Advisor streaming tick data and account state per terminal
3. **React frontend** — replaces mock imports with API calls using account-aware endpoints

### Future API shape (account-aware)

```
GET  /api/accounts
GET  /api/accounts/:accountId/summary
GET  /api/accounts/:accountId/risk
GET  /api/accounts/:accountId/prop-firm
GET  /api/accounts/:accountId/journal
GET  /api/accounts/:accountId/alerts
GET  /api/accounts/:accountId/bridge
GET  /api/accounts/:accountId/positions
GET  /api/backtests
GET  /api/backtests/:parameterSetId/account-compatibility
```

---

## How to Export / Download

**Option 1 — Replit UI:** Click the three-dot menu `⋯` in the file panel → "Download as zip"

**Option 2 — Shell (no node_modules):**
```bash
zip -r mapazapp-export.zip artifacts/mapazapp/ --exclude "*/node_modules/*"
```

---

## Documentation

| File | Contents |
|------|----------|
| `docs/CURSOR_HANDOFF.md` | Full file map, NOT-implemented list, continuation plan |
| `docs/IMPLEMENTATION_ASSUMPTIONS.md` | Test fixtures & implementation assumptions (not broker truth) |
| `docs/MOCK_DATA_CONTRACT.md` | Every mock field documented with future API source |
| `docs/DECISIONS.md` | 13 architecture decisions |
