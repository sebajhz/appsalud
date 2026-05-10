# Mapazapp — Dashboard / Launcher Action Bridge Design

**Checkpoint D7.1 — documentation only.** No dashboard buttons, no new HTTP routes, no `POST` action endpoints, no launcher executable, no MT5 runtime integration, no watcher, no database, no WebSocket live streams, no polling, no `localStorage` action state, and no real execution. This document defines how future dashboard actions should connect to a **governed** local API and/or desktop launcher.

**Related:** [`DASHBOARD_RUNTIME_ACTIONS_DESIGN.md`](./DASHBOARD_RUNTIME_ACTIONS_DESIGN.md) (D4.1 — action IDs and safety rules), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md) (D2 — config and runtime semantics), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Purpose

- The dashboard **already** can show a **read-only** runtime status snapshot (`GET /api/mapazapp/runtime/status` via `runtimeStatusDataSource`, presented on Configuration — D6.x).
- The **next** step for product UX will be **actions** (validate environment, start dev stack, validate CSV, open logs, etc.).
- **Before** adding buttons or `POST` endpoints, the repo needs a **single written bridge contract**: who may spawn processes, how the browser participates, and how results return safely.
- The **browser must not** execute OS commands, spawn `pnpm`, open MT5, or read arbitrary local paths by itself.
- A **local API** and/or **launcher** will act as the **trusted bridge** that runs controlled helpers and returns structured results.
- Across all phases described in current governance docs, **`executionEnabled` remains `false`** until an explicit, separate product gate says otherwise.

---

## 2. Current baseline

### Already exists

| Building block | Role |
|----------------|------|
| `pnpm … mapazapp:dev-preflight` | Read-only dev checks (ports, expected scripts); no child processes |
| `pnpm … mapazapp:dev-start` | Dev orchestration: preflight + optional API build + spawns API + dashboard (**not** product launcher) |
| `pnpm … mapazapp:import-validate` | Read-only CSV shape validation via `@workspace/mapazapp-core` importer |
| `@workspace/mapazapp-core` `runtime-status.ts` | Shared pure TS runtime status model + safety derivation helpers |
| `GET /api/mapazapp/runtime/status` | Read-only API snapshot (honest defaults; no live MT5/bridge probes) |
| `runtimeStatusDataSource.ts` | Dashboard service: fetches runtime GET; conservative `unavailable` / `blocked` behavior |
| `RuntimeStatusPanel.tsx` | Presentational read-only panel |
| `RuntimeStatusPanelContainer.tsx` on `ConfigPage` | One-shot load on mount; no polling |

### Does not exist yet

- Dashboard **buttons** for operational actions  
- **`POST`** action endpoints (preflight, validate CSV, start/stop, etc.)  
- **`MapazappLauncher.exe`** / unified desktop launcher  
- **MT5 runtime** integration from Node/TS  
- **Folder watcher** or live file ingest daemons  
- **Operational database** for Mapazapp in this scope  
- **WebSocket** live streams  
- **Centralized launcher log folder** policy implemented  
- **Permissions / capability model** for actions (beyond narrative docs)  
- **`ActionResult`** type **implemented** in TypeScript (this doc proposes a **conceptual** JSON shape only)

---

## 3. Browser / dashboard limits

### The dashboard web app must **not**

- Run **`pnpm`** or arbitrary shell commands  
- Create **child processes** on the operator machine  
- Launch **MetaTrader** (`terminal64.exe` or equivalent)  
- **Kill** OS processes (especially processes it did not create under explicit supervision)  
- Read **personal local paths** (`AppData`, `MetaQuotes`, etc.) **directly** from JS  
- Write **command files** or **signal-to-order** channels toward MT5  
- Send **orders**, execute **trades**, or enable **`executionEnabled`**  
- Infer **“connected”** / **“live trading ready”** without a governed check reflected honestly in payload semantics  

### The dashboard **may**

- Render **read-only** status (existing runtime panel pattern)  
- Call a **local HTTP API** that is explicitly scoped, bound, and documented  
- Send **controlled** requests to a launcher/API **surface that is designed for that purpose** (future)  
- Render **structured action results**, warnings, and errors  
- Keep **execution disabled** in all user-visible safety summaries aligned with repo posture  

---

## 4. Proposed action bridge architecture

**Allowed flow:**

```
Dashboard UI
  → Dashboard action client (future)
  → Local API / Launcher bridge (trusted)
  → Action service (future)
  → Controlled scripts / helpers (existing CLIs or successors)
  → Runtime status update (snapshot refresh; honest semantics)
  → Dashboard panel / messaging
```

**Hard rule — never:**

```
Dashboard button → MT5 command / trade / order directly
```

---

## 5. Conceptual components

### 5.1 Dashboard action client

- Future TypeScript module in the dashboard workspace.  
- **Only** permitted transports: HTTP to local API and/or documented IPC/WebSocket **if** introduced later under a threat model (not in D7.1).  
- **No** `child_process`, **no** direct file system to privileged paths, **no** direct MT5 automation.  

### 5.2 Local API action endpoints (future — **not implemented**)

Illustrative paths only; **none exist** in the repo at D7.1:

| Example (future) | Purpose |
|------------------|---------|
| `POST /api/mapazapp/actions/preflight` | Run dev preflight-equivalent behind gate |
| `POST /api/mapazapp/actions/validate-csv` | Validate CSV with sandboxed input policy |
| `POST /api/mapazapp/actions/start-dev` | Start supervised dev processes |
| `POST /api/mapazapp/actions/stop-dev` | Stop supervised children only |
| `POST /api/mapazapp/actions/open-logs` | Open/redact logs per policy |
| `POST /api/mapazapp/actions/validate-mt5-config` | Path/presence checks without execution |

Rules:

- **Do not** add any `POST` without a **minimal threat model** (localhost abuse, CSRF, replay, path injection).  
- **Do not** add `POST` routes that **execute trades** or write MT5 command files.  
- Every `POST` must be **gated**, **allowlisted**, **auditable**, and **documented**.  

### 5.3 Launcher action bridge (future)

- **Only** the launcher (or equivalent trusted agent) should **`spawn`** processes and **open MT5** when policy allows.  
- Owns **supervised child PIDs**; must **not** kill unrelated processes.  
- Should emit **sanitized logs** and enforce **permissions**.  

### 5.4 Action service (future)

- Orchestrates a requested action ID → invokes the correct helper (`preflight`, `import-validate`, etc.).  
- Applies **safety gates** (§7).  
- Returns an **ActionResult**-shaped payload (§6).  

### 5.5 Runtime status update (future)

- After an action, optionally attach an updated **`runtimeStatus`** snapshot (same honesty rules as D4/D5: `unknown` / `not_configured` are valid).  
- **Forbidden:** upgrading overall posture to “OK” without checks; **forbidden:** implying connectivity that was not verified.  

---

## 6. ActionResult contract proposal (conceptual — not TypeScript)

This is a **documentation contract** only. Field names may become a TS interface in a later checkpoint (e.g. D7.2).

```json
{
  "ok": false,
  "actionId": "validate_environment",
  "status": "blocked",
  "message": "Action bridge is not implemented yet.",
  "runtimeStatus": null,
  "safety": {
    "executionEnabled": false,
    "sendToMt5Enabled": false,
    "canAutoExecute": false,
    "autoApprovalEnabled": false,
    "registryMutationAllowed": false,
    "manualReviewRequired": true
  },
  "logsPreview": [],
  "warnings": [],
  "errors": []
}
```

Suggested **`status`** vocabulary (conceptual): `blocked` | `not_available` | `running` | `ok` | `error` (extend only with doc update).

**Rules:**

- An action result **must never** flip execution flags to an unsafe posture; **`executionEnabled`** stays **`false`** for all governed phases described today.  
- **`logsPreview`** must exclude personal paths, secrets, and raw private CSV payloads.  
- **`errors`** must be **controlled** (stable codes + safe messages).  
- **`runtimeStatus`** is optional; omit or null when not applicable.  
- **`not_available`** / **`blocked`** are valid outcomes while the bridge is absent or policy denies the action.  

**D7.2 (implemented — pure TS only):** the JSON shape above is realized in `@workspace/mapazapp-core` as **`action-result.ts`** (`MapazappActionId`, `MapazappActionResult`, `createDefaultActionSafety`, `createActionNotAvailableResult`, `createBlockedActionResult`, `createSuccessfulReadOnlyActionResult`, `assertActionResultSafety`, `serializeActionResult`). Tests: **`APP/lib/mapazapp-core/tests/d7-action-result-model.d7.test.ts`**. This adds **no** HTTP endpoints, **no** dashboard buttons, and **no** executed actions — only a shared contract and validation helpers.

---

## 7. Safety gates

Any future action bridge **must** enforce (and reject violations of):

| Gate | Requirement |
|------|-------------|
| Execution | `executionEnabled` **false** |
| MT5 send | `sendToMt5Enabled` **false** |
| Auto execution | `canAutoExecute` **false** |
| Auto approval | `autoApprovalEnabled` **false** |
| Registry | `registryMutationAllowed` **false** |
| Review | `manualReviewRequired` **true** |
| MQL / EA contract | No **`OrderSend`**, no **`CTrade`**, no **command files** toward MT5 |
| Trading | No **signal-to-order** path; no **trade execution** |
| Commands | No **arbitrary command execution**; no **wildcard** shells from API input |
| Paths | No **path traversal**; no **unconsented** arbitrary filesystem reads |
| Processes | No **killing external processes**; shutdown only for **owned children** |
| Privacy | No **private path leakage** in JSON or logs |
| Claims | No **profitability** or “live trading ready” claims without explicit approved checks |

---

## 8. Localhost / security threat notes

### Risks

- Other websites coaxing the browser into calling **`127.0.0.1`** APIs  
- **CSRF** / cross-origin invocation against a naive local server  
- **Dangerous local `POST`** surfaces (spawn shell, open files, kill PID)  
- **Replay** of action requests  
- **Path injection** via query/body parameters  
- **CSV upload** exposing private account/trade data  
- **Logs** leaking secrets or full filesystem paths  
- **Zombie child processes** if supervisión is wrong  
- **Wrong PID kill** if supervision boundaries are unclear  

### Mitigations (future — document only here)

- Bind to **`127.0.0.1`** (not `0.0.0.0`) unless explicitly justified  
- **Strict CORS** and/or non-browser IPC for privileged operations  
- Short-lived **local action tokens** / capability tickets  
- **Allowlisted** `actionId` values only  
- **No** arbitrary shell strings; fixed helper invocations only  
- **No** arbitrary paths without explicit operator consent / picker  
- **Rate limits** and **idempotency** keys where appropriate  
- **Explicit confirmation** UX for sensitive actions  
- **Audit logs** with **redaction**  
- Hard-block **`executionEnabled`** and related unsafe flags in responses  

**D7.1 does not implement** any of the mitigations above.

---

## 9. Future action matrix

| Action ID | Label (ES) | User goal | Current building block | Requires API? | Requires launcher? | Allowed before launcher? | Risk | Proposed phase | Safety rule |
|-----------|------------|-----------|------------------------|---------------|--------------------|---------------------------|------|----------------|-------------|
| `validate_environment` | Validar entorno | Ports/scripts OK + safe start hints | `mapazapp:dev-preflight` | Likely | Ideal | **Only** via trusted local agent — **not** browser-direct | Low–medium | **D9.0+** (first guarded endpoint) | Read-only checks; no SPA spawn |
| `start_mapazapp_dev` | Iniciar Mapazapp (dev) | Run API + dashboard dev | `mapazapp:dev-start` | Likely | **Yes** | **No** dashboard trigger without bridge | High (processes) | **D9.0+** / launcher | Supervised children only; execution off |
| `validate_csv` | Validar CSV | CSV shape validation | `mapazapp:import-validate` + core importer | Likely | Optional | **No** arbitrary path from browser | Privacy / file size | **D9.0+** | Sandboxed input; no raw secrets in logs |
| `show_runtime_status` | Ver estado del sistema | Honest snapshot | D5.1b + D6.x | **Yes** (GET) | No | **Yes** (already partial) | Low | **Done** (read path) | Block unsafe copy/flags (existing client guards) |
| `validate_mt5_config` | Validar MT5 | Policy path/presence | Future validator | Likely | **Yes** | **No** | Medium | **D10.0+** | No fake “market connected” |
| `open_mt5` | Abrir MT5 | Launch terminal | None | Maybe signal | **Yes** | **No** | Medium–high | **Launcher / post-D9** | Explicit gated consent |
| `stop_mapazapp` | Detener Mapazapp | Orderly shutdown | Supervisor pattern (dev-start children today) | Likely | **Yes** | **No** | High if mis-scoped | **D9.0+** | Never kill unrelated PIDs |
| `open_logs` | Ver logs | Open viewer/folder | `logsFolder` (D2 schema) | Maybe | Likely | **Maybe** via agent only | Medium | **Launcher / D9+** | Redact paths/secrets |

---

## 10. What can happen before launcher

### Allowed before a desktop launcher exists

- **`show_runtime_status`** read-only (current GET + panel pattern).  
- **Documentation / specs** (including this file).  
- **D7.2** shared **`ActionResult`** TypeScript model in `@workspace/mapazapp-core` — still **no** dashboard buttons and **no** `POST` action routes.  

### Not allowed before a launcher / trusted bridge (from the dashboard)

- **`start_mapazapp_dev`** from the SPA  
- **`open_mt5`**  
- **Stopping processes** except via UX that maps to **owned** supervised children (still requires bridge design first)  
- **`validate_mt5_config`** reading real folders **from the browser**  
- **`validate_csv`** against **arbitrary local paths** supplied only from untrusted web input  

---

## 11. Proposed checkpoint sequence (recommended — single source of truth)

Use this table to reconcile older docs that used “D7 = launcher prototype”. **Launcher prototype work follows action-bridge documentation.**

| ID | Topic |
|----|-------|
| **D7.1** | **Action bridge design docs** (this document) — **no code** |
| **D7.2** | **`ActionResult` model** in `@workspace/mapazapp-core` (`action-result.ts`) — **implemented**; **no HTTP endpoints**; **no real actions** |
| **D7.3** | **Dashboard action client interface** (types + fetch wrappers) — **no buttons** |
| **D8.0** | **Launcher prototype** — audit / proposal only |
| **D8.1** | **Launcher action bridge** — detailed launcher IPC/API design |
| **D9.0** | **First guarded local action endpoint** or launcher-mediated equivalent — minimal scope |
| **D10.0** | **MT5 detection gate** — audit / policy design; paths only; **no execution** |

**Later (separate approval):** dashboard action **buttons** UX spec, MT5 path probes, supervised process manager, upload policies for CSV.

---

## 12. Explicit non-goals (D7.1)

This checkpoint **does not** implement or authorize:

- Dashboard action **buttons** or new TSX controls  
- New **`POST`** routes on `@workspace/api-server`  
- Launcher **executable** or installer  
- **MT5 runtime** connectivity from Mapazapp services  
- **Watchers**, **database** persistence, **WebSocket** live feeds  
- **Polling** loops or **`localStorage`** for action orchestration  
- **Real execution**, **auto-approval**, **registry mutation**  
- **MT5 command files**, **trade/order** actions  

---

## 13. References

- [`DASHBOARD_RUNTIME_ACTIONS_DESIGN.md`](./DASHBOARD_RUNTIME_ACTIONS_DESIGN.md)  
- [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md)  
- [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md)  
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)  
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)  
