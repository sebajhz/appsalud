# Mapazapp — Dashboard Runtime Actions Design

**Checkpoint D4.1 — design only.** No UI buttons, no API routes, no launcher, no new scripts in this document.

---

## 1. Purpose

- The **future** product dashboard should surface **clear, honest actions** (validate environment, start services, validate imports, view system status) that help operators without implying live trading or silent MT5/bridge connectivity.
- Those actions must be **wiring targets**: they should eventually call a **governed runtime layer** (local launcher and/or read-only local API), not run dangerous logic directly inside the browser or ad-hoc `child_process` from the SPA.
- **Today** the repo has **separate building blocks** (CLI scripts + a pure runtime status model). This file records how they should connect to **future** dashboard controls and a **future** unified launcher.
- **This checkpoint does not implement** buttons, routes, or processes.

---

## 2. Current building blocks

### A. Local import validator (`C3.1` / `C3.2`)

| Item | Detail |
|------|--------|
| **Command (from `APP/`)** | `pnpm --filter @workspace/scripts mapazapp:import-validate -- --file <path> --symbol <sym> --timeframe <tf> [--format auto\|mt5\|bridge\|ohlc] [--json]` |
| **Module** | `APP/scripts/src/mapazapp-import-validate.ts` |
| **Behavior** | Read-only CSV validation via `@workspace/mapazapp-core` `importManualCandleDataset`; summary JSON/human with `executionEnabled: false`, `readOnly: true`. |
| **Does not** | Persist data, open MT5, send orders, replace a launcher. |

### B. Dev preflight (`D3.1`)

| Item | Detail |
|------|--------|
| **Command (from `APP/`)** | `pnpm --filter @workspace/scripts mapazapp:dev-preflight [--api-port <n>] [--dashboard-port <n>] [--json] [--help]` |
| **Module** | `APP/scripts/src/mapazapp-dev-preflight.ts` |
| **Helpers (exported)** | e.g. `performDevPreflight`, `parseDevPreflightArgv`, `runMapazappDevPreflightCli`, port probe via `net`, `evaluateExpectedScripts`. |
| **Behavior** | Validates expected ports (default API `3001`, dashboard `5173`) and expected `package.json` scripts; prints safe PowerShell/Bash hints. |
| **Does not** | Spawn processes, open browser, write log files, claim MT5/bridge connected. |

### C. Dev start (`D3.2`)

| Item | Detail |
|------|--------|
| **Command (from `APP/`)** | `pnpm --filter @workspace/scripts mapazapp:dev-start [--api-port <n>] [--dashboard-port <n>] [--skip-build] [--json] [--help]` |
| **Module** | `APP/scripts/src/mapazapp-dev-start.ts` |
| **Behavior** | Runs `performDevPreflight`; optionally `pnpm --filter @workspace/api-server build`; spawns `pnpm --filter @workspace/api-server start` with `PORT` + `NODE_ENV=development`; spawns `pnpm --filter @workspace/mapazapp dev -- --port <n>`; prefixes child logs `[api-build]` / `[api]` / `[dashboard]`; **SIGINT/SIGTERM** tears down **only** spawned children. |
| **Does not** | Start MT5, detect bridge, open browser automatically, act as final `MapazappLauncher.exe`, enable execution, write launcher log files to disk. |

### D. Runtime status model (`D4`)

| Item | Detail |
|------|--------|
| **Module** | `APP/lib/mapazapp-core/src/runtime-status.ts` (`@workspace/mapazapp-core`) |
| **Represents** | `MapazappRuntimeStatus`: `api`, `dashboard`, `mt5`, `bridge`, `data`, `safety`, `overall`, `generatedAt`, plus `runtimeMode`. |
| **Helpers** | e.g. `createDefaultRuntimeStatus`, `createManualImportRuntimeStatus`, `deriveOverallRuntimeStatus`, `assertRuntimeSafety`, `serializeRuntimeStatus`. |
| **Does not** | Probe MT5, read `MQL5/Files`, expose HTTP, run watchers. **D3.x scripts do not import this module yet.** |

### E. Dashboard runtime status data source (`D6.1`)

| Item | Detail |
|------|--------|
| **Module** | `APP/artifacts/mapazapp/src/services/runtimeStatusDataSource.ts` |
| **Behavior** | Read-only client for **`GET /api/mapazapp/runtime/status`** when **`VITE_MAPAZAPP_API_BASE_URL`** (or an injected `apiBaseUrl`) is set; safe **`unavailable`** / **`blocked`** states when misconfigured or unsafe flags/copy appear. |
| **Does not** | Wired dashboard UI (**D6.3**), buttons, polling, WebSocket, MT5/bridge probes, or launcher control. |

### F. Runtime status panel component (`D6.2.1`)

| Item | Detail |
|------|--------|
| **Module** | `APP/artifacts/mapazapp/src/components/RuntimeStatusPanel.tsx` (+ pure `runtimeStatusPanelPresenter.ts`) |
| **Behavior** | Presentational **read-only** panel: accepts **`RuntimeStatusViewModel`** props; fixed conservative copy; **no** fetch, **no** `import.meta.env`, **no** buttons. |
| **Does not** | Page integration (**D6.3**), routes, navigation, or actions. |

### What is missing for dashboard use

- **No** stable HTTP contract for the browser to trigger scripts (dashboard cannot safely spawn `pnpm` itself).
- **No** desktop launcher channel that exposes “run preflight / run import validate / reflect status” with policy and logging.
- **No** TSX wiring: buttons, panels, or server-side bridge are **out of scope** until D5+ and explicit approval.

---

## 3. Future dashboard actions

| Action ID | Button label (ES) | User goal | Backend / launcher dependency | Current status | Allowed now? | Safety notes | Future implementation checkpoint |
|-----------|-------------------|-----------|-------------------------------|----------------|--------------|--------------|----------------------------------|
| `validate_environment` | Validar entorno | Check ports/scripts and print safe start guidance | Dev preflight CLI and/or launcher preflight equivalent | Preflight exists as CLI | **No** (not from dashboard UI) | Read-only; no process spawn from browser | D7 / D8 (action bridge design); launcher |
| `start_mapazapp_dev` | Iniciar Mapazapp | Start API + dashboard for local dev | Dev start CLI and/or future launcher | Dev start exists as CLI | **No** (not from dashboard UI) | Must not imply product launcher; execution stays off | D8 / D9 |
| `validate_csv` | Validar CSV | Validate local candle CSV shape | Import validator CLI + core importer | Validator exists as CLI | **No** (not from dashboard UI) | Read-only; file path policy required | D8 |
| `show_runtime_status` | Ver estado del sistema | Show consolidated honest status | D4 model + **`GET /api/mapazapp/runtime/status`** (D5.1b) or launcher snapshot | API read-only snapshot exists; **D6.1** data source exists; **D6.2.1** presentational panel exists; **not** wired into a page (**D6.3**) | **No** (no in-page integration yet) | Never show MT5/bridge “connected” without real checks | D6.3 wiring |
| `validate_mt5_config` | Validar MT5 | Policy-checked path / presence checks | Future launcher / MT5 gate | Not implemented | **No** | No execution; no fake “market connected” | D10 |
| `open_mt5` | Abrir MT5 | Open terminal if policy allows | Future launcher + explicit config | Not implemented | **No** | Gated; optional; never default unsafe | D9+ |
| `stop_mapazapp` | Detener Mapazapp | Stop supervised children cleanly | Launcher / supervisor for spawned processes | Dev start stops **only** its children via Ctrl+C locally | **No** | Dashboard must not kill arbitrary OS processes | D9 |
| `open_logs` | Ver logs | Open log folder or viewer | Future `logsFolder` + launcher | Not implemented | **No** | Paths must be policy-bound; no secrets | D7 / D9 |

---

## 4. Button safety rules

- No button may **execute trades**, **send orders**, or write **command files** toward MT5.
- No button may display **“MT5 connected”** or **“bridge connected”** unless the governing layer has performed an **approved** check and the payload reflects it honestly (`detected` / file-based evidence ≠ live execution approval).
- Operational buttons must go through a **launcher or local API** with explicit policy, audit-friendly logs, and **`executionEnabled` remaining `false`** in all phases covered by current governance.
- The dashboard must **not** terminate processes it did not create (no killing unrelated user processes).
- The dashboard must **not** read arbitrary personal paths without explicit user consent / launcher-mediated path picks.
- **`executionEnabled`** must remain **`false`** for any shipped posture described in current docs until a separate, explicit product gate says otherwise.

---

## 5. Required architecture before buttons

Before wiring real buttons, **one** governed path should exist:

**A.** Desktop **launcher** exposing a small internal API or IPC for “preflight”, “start dev stack”, “import validate”, “status snapshot”.  

**B.** **Read-only local HTTP API** (e.g. `GET` runtime status, constrained “invoke validator” with sandboxed inputs) — aligns with future **D5**.  

**C.** **Controlled bridge** where the launcher alone runs Node/`pnpm` and the dashboard only displays results.

Clarifications:

- A **browser tab** cannot safely spawn `pnpm` or trust arbitrary subprocess execution; that belongs to a **trusted local agent** (launcher) or **developer-only** workflows outside the SPA.
- Therefore **dashboard buttons** are **UI triggers** that call **launcher/API**, not raw shell.

---

## 6. Proposed future flow

```
Dashboard control → Local launcher / read-only API → Runtime service / policy gate → Existing script or helper → Structured result → Dashboard panel
```

Never:

```
Dashboard control → trade / order / MT5 command channel directly
```

---

## 7. Status mapping (D4 model → UI copy hints)

**`api.status`**

| Value | Suggested UI framing |
|-------|----------------------|
| `ok` | API reachable / reported OK (still not “trading OK”). |
| `unknown`, `not_started`, `not_checked` | Not verified / not started. |
| `error` | API error; show safe message. |

**`dashboard.status`**

| Value | Suggested UI framing |
|-------|----------------------|
| `ok` | Dashboard server OK. |
| `unknown`, `not_started`, … | Not verified. |

**`mt5.status`**

| Value | Suggested UI framing |
|-------|----------------------|
| `not_configured` | MT5 not configured (normal in mock/manual-import). |
| `not_found` | Path/policy check failed. |
| `detected` | Presence/path pin only — **not** “account connected”. |

**`bridge.status`**

| Value | Suggested UI framing |
|-------|----------------------|
| `not_configured` | Bridge not configured. |
| `available` | Files present per policy (not approval of signals). |
| `stale` | Data older than policy. |
| `missing` | Expected artifacts missing. |

**`safety`**

| Condition | Suggested UI framing |
|-----------|----------------------|
| `executionEnabled === false` | Execution disabled (expected). |
| Any unsafe flag `true` | Blocked / policy violation — no operational proceed. |

---

## 8. Implementation checkpoints (proposal)

| ID | Topic |
|----|--------|
| **D5** | API runtime status endpoint **read-only** (honest `unknown` / `not_configured` defaults). |
| **D6** | Dashboard status panel **read-only** (mock vs real copy discipline). |
| **D7** | Launcher **action bridge** design (how SPA triggers validated operations). |
| **D8** | Dashboard **action buttons** design (labels, disable rules, error UX). |
| **D9** | Launcher executable **prototype** (supervised processes only). |
| **D10** | **MT5 detection** gate (paths/policy; no execution). |

*(Numbers align with roadmap intent; reconcile with `LAUNCHER_CONFIG_AND_STATUS_DESIGN.md` table if product reorders phases.)*

---

## 9. Explicit non-goals (D4.1)

This document **does not** implement or authorize:

- Buttons or TSX components  
- HTTP endpoints  
- Launcher executable  
- MT5 runtime integration  
- Folder watchers  
- Database persistence  
- WebSocket live streams  
- Real execution / order placement  

---

## 10. References

- `APP/artifacts/mapazapp/docs/LAUNCHER_CONFIG_AND_STATUS_DESIGN.md` — authoritative status semantics and anti-simulation rules.  
- `APP/artifacts/mapazapp/docs/RUNTIME_AND_LAUNCHER_STRATEGY.md` — launcher strategy and dev tooling context.  
- `APP/scripts/package.json` — canonical `pnpm` script names for validators and dev tools.
