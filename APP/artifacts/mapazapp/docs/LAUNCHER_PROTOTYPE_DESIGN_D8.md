# Mapazapp — Launcher Prototype Design D8

**Checkpoint D8.1 — documentation only.** This document defines how the future Mapazapp **launcher** and **launcher-side action bridge** should be designed **before** any launcher code, process supervisor, HTTP `POST` action routes, dashboard operational buttons, MT5 runtime, folder watchers, databases, WebSocket live feeds, or real execution are implemented.

**Related:** [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md) (D7.1 — dashboard ↔ governed local bridge), [`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`](./LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md) (**D9.1** — mandatory threat model and mitigations **before** any action `POST`, IPC, or launcher-side HTTP transport), [`LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md`](./LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md) (**D9.6** — minimum HTTP + IPC transport requirements, caller remapping — **docs only**), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md) (D2 — config schema and runtime semantics), [`DASHBOARD_RUNTIME_ACTIONS_DESIGN.md`](./DASHBOARD_RUNTIME_ACTIONS_DESIGN.md) (D4.1 — action IDs and wiring targets), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Purpose

- Mapazapp **already has** development scripts (`mapazapp:dev-preflight`, `mapazapp:dev-start`), a shared **`MapazappRuntimeStatus`** model, a read-only **`GET /api/mapazapp/runtime/status`** snapshot, a shared **`MapazappActionResult`** model (**D7.2**), and a dashboard **`DashboardActionClient`** stub (**D7.3**) that returns safe **`not_available`** / **`blocked`** results only.
- There is **still no** product launcher executable, unified supervisor, launcher-side bridge implementation, or centralized launcher log policy in code.
- **D8.1** records **how** the launcher and launcher-side bridge **should** be shaped **before** implementation: responsibilities, limits, process ownership, ports/logs, single-instance, Windows lifecycle, integration with **`ActionResult`** / runtime status, security posture, and a testing strategy for future code. **D9.1** (`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`) formalizes localhost / CSRF / replay / path-privacy / process-ownership threats and **mandatory mitigations** — any future launcher-side or API transport for actions must align with it **before** endpoints ship. **D9.3** adds an internal scripts **`dispatchLauncherAction`** (gates + **`validate_environment`** only) as a non-transport building block toward the future launcher executable — **no** HTTP/IPC, **no** product supervisor yet.
- The **launcher** (future) will be the **controlled owner** of local child processes and **governed** local actions that the browser must not perform directly.
- The **dashboard must never** spawn OS processes, run arbitrary shells, open MetaTrader, kill unrelated PIDs, or read privileged local paths without a governed consent path (see **D7.1**).
- Across all phases described in current governance docs, **`executionEnabled` remains `false`** until an explicit, separate product gate says otherwise.

---

## 2. Current baseline

### Already exists

| Building block | Role |
|----------------|------|
| `pnpm … mapazapp:dev-preflight` | Read-only dev checks (ports on `127.0.0.1`, expected workspace scripts); **no** child processes |
| `pnpm … mapazapp:dev-start` | Dev orchestration only: preflight + optional API build + spawns API + dashboard (**not** `MapazappLauncher.exe`) |
| `pnpm … mapazapp:import-validate` | Read-only CSV structural validation via `@workspace/mapazapp-core` importer |
| `@workspace/mapazapp-core` `runtime-status.ts` | Shared pure runtime status model + `deriveOverallRuntimeStatus` / safety helpers |
| `GET /api/mapazapp/runtime/status` | Read-only API snapshot (honest defaults; no live MT5/bridge probes) |
| `runtimeStatusDataSource.ts` + `RuntimeStatusPanel` + `RuntimeStatusPanelContainer` on `ConfigPage` | One-shot read-only dashboard snapshot when API base URL is configured at build time |
| `@workspace/mapazapp-core` `action-result.ts` | Shared `MapazappActionResult` contract + safety scanning helpers |
| `APP/artifacts/mapazapp/src/services/actionClient.ts` | Dashboard action client stub; **no** `fetch`, **no** `POST`, **no** UI buttons |

### Does not exist yet

- **`MapazappLauncher.exe`** / unified desktop launcher product  
- Launcher **process supervisor** product (distinct from `mapazapp:dev-start`)  
- **Launcher-side action bridge** implementation (IPC or governed HTTP surface owned by the launcher)  
- **Launcher logs folder** policy implemented and wired  
- **Single-instance** lock / mutex / handoff file for a product launcher  
- **PID registry** owned by a product launcher  
- **MT5 detection** implementation (policy-only audit starts at **D10.0**)  
- **MT5 runtime** integration from Node/TS  
- **Bridge folder watcher** or live ingest daemons  
- **Operational database** for Mapazapp in this scope  
- **WebSocket** live streams  
- **`POST`** action endpoints on `@workspace/api-server` for launcher actions  
- Dashboard **operational buttons** for host control actions  

---

## 3. Launcher responsibilities

The future launcher **should**:

1. Load and validate **configuration** against safe defaults (**D2** schema intent).  
2. Validate **listen ports** before starting children (probe / bind policy).  
3. Validate **allowed local folders** only (logs, imports, approved staging) — never arbitrary filesystem reads from untrusted UI input.  
4. Start the **API** child using a fixed, audited command shape (no shell injection).  
5. Start the **dashboard** dev server **or** serve a built static preview — product decision.  
6. Optionally **open a browser** to the dashboard URL when policy allows.  
7. **Supervise** only child processes it created.  
8. Shut down **only its own** children in an orderly way.  
9. Prevent **conflicting duplicate instances** (mutex / lockfile policy).  
10. Write **local, sanitized logs** to a user-data folder (outside the Git repo).  
11. Publish an **honest runtime status** view (no fake connectivity).  
12. Expose a **controlled launcher-side action bridge** surface aligned with **D7.1** action IDs.  
13. Return structured **`MapazappActionResult`** payloads for governed actions.  
14. Keep **`executionEnabled: false`** and related unsafe automation flags **false** for all governed phases described today.  
15. Surface **clear, actionable errors** (ports, paths, missing toolchain).  
16. **Prepare** future **MT5** / **bridge** validation hooks without claiming live market connectivity.

---

## 4. Launcher non-goals

The launcher **must not**:

- Execute trades or send orders.  
- Use **`OrderSend`**, **`CTrade`**, or similar execution pathways from Mapazapp services.  
- Write **command files** or any signal→order channel toward MT5.  
- Auto-approve strategies or mutate registry from launcher workflows (unless a separate, explicit gate exists — **out of scope** here).  
- Claim **“ready to trade”**, **live trading readiness**, or profitability.  
- Pretend **“MT5 connected”** or **“bridge connected”** without governed evidence semantics (**detected** ≠ account connected; **available** ≠ approval).  
- Kill **external** processes or terminate by **global process name** alone.  
- Read personal paths (**`AppData`**, **`MetaQuotes`**, etc.) **without explicit operator consent** / launcher-mediated picker policy.  
- Log private paths, secrets, broker credentials, full CSV payloads, or raw account balances.  
- Expose broad **`POST`** surfaces without gates (**allowlist**, **threat model**, **localhost protections**).  
- Launch MT5 **without explicit configuration and policy** (**future**, gated).  

---

## 5. Proposed launcher process model

**Target orchestration (future):**

```
Launcher root process
  → API child process
  → Dashboard child process OR static file server for UI assets
  → Optional browser open (OS integration)
  → Optional future MT5 process ONLY when explicitly configured + approved + gated
  → Runtime status aggregation service (honest probes + core derivation)
  → Launcher-side action bridge service (allowlisted actions only)
```

**Ownership rules:**

- The launcher is the **sole owner** of PIDs for processes **it created**.  
- It maintains a **PID registry** for supervised children only.  
- It **never** terminates processes it did not create under explicit supervision.  
- If API or dashboard children fail, overall runtime reporting must **degrade** (`error` / `degraded` / `unknown`) — never silently upgrade to “OK trading”.  
- **Restart loops** must be bounded by explicit policy (backoff, max attempts, operator acknowledgement) — **no infinite restart storms** by default.  
- **Shutdown** should be **ordered** (stop accepting new actions → signal children → wait → finalize logs → release locks).

---

## 6. Windows lifecycle concerns

- **`pnpm.cmd`** frequently introduces a **process tree** (pnpm → node → grandchildren). A launcher must treat **tree ownership** as part of its supervision model in implementation phases.  
- **`SIGINT` / `SIGTERM`** behavior for Windows subprocess trees can be **incomplete** vs POSIX expectations; implementations must validate teardown with **real manual checklists** on Windows.  
- Risk of **orphaned child processes** if the launcher crashes without cleanup handlers. Future implementations should combine graceful signals, timeouts, and **tree-scoped** termination **only for owned subtrees** (never global name-based kill).  
- **Single-instance**: prefer **named mutex** and/or **lockfile** with stale detection and operator-visible messaging.  
- **Ports occupied**: failure must be **explicit**; do **not** assume the occupier is Mapazapp (could be another app).  
- **Paths with spaces**: require robust quoting rules in any future wrapper; document **one** supported invocation pattern where possible.  
- **`AppData` / `MetaQuotes`**: sensitive; only accessed under **explicit** MT5/bridge policy (**D10+**).  
- **Antivirus / code signing**: future `.exe` packaging may require signing expectations; **out of scope** for D8.1 implementation.  
- **Do not** use aggressive **`taskkill`** patterns or kill-by-name for unrelated processes.  
- Termination targets must be **owned child PIDs** (or explicit subtree policy tied to those PIDs).

---

## 7. PID ownership and shutdown policy

**Registry (conceptual fields per supervised child):**

- **`name`**: stable logical role (`api`, `dashboard`, …).  
- **`pid`**: OS process id for the **tracked root child** (may represent a supervised subtree policy).  
- **`startedAt`**: ISO timestamp.  
- **`commandLogical`**: audited logical descriptor (**not** a raw shell string containing secrets).  
- **`status`**: `starting | running | stopping | exited | error`.  
- **`logFile`**: path under the launcher logs folder (sanitized naming).

**Shutdown:**

1. **Graceful signal** to each owned child (`SIGTERM` equivalent policy on Node launcher).  
2. **Timeout** window per child with structured logging.  
3. **Force** termination **only** for **owned children** and **only** if an explicit policy permits escalation (implementation-phase detail).  
4. **Never** kill by **global process name** alone.  
5. Action ID **`stop_mapazapp`** maps **only** to **launcher-owned** supervised processes (**D7.1** alignment).

---

## 8. Port policy

- **Defaults:** API **`3001`**, dashboard **`5173`** (consistent with current dev conventions and **D2** examples).  
- The launcher validates ports **before** spawning children.  
- If a required port is **occupied**:  
  - Do **not** kill the occupying process.  
  - Return a **clear error** and guidance to change configuration.  
  - Reflect **`degraded` / `blocked` / `error`** semantics in runtime reporting as appropriate.  
- **Do not infer** “Mapazapp already running” purely from port occupancy.

---

## 9. Logs policy

**Recommended root (configurable):**

- `%LOCALAPPDATA%\Mapazapp\logs` on Windows, or an equivalent OS-appropriate user-data path **outside the Git repository**.

**Suggested files:**

| File | Purpose |
|------|---------|
| `launcher.log` | Orchestration decisions, startup/shutdown sequence |
| `api.log` | Captured API child stdout/stderr (policy-bound) |
| `dashboard.log` | Captured dashboard/static server logs |
| `actions.log` | Allowlisted action executions + outcomes (no secrets) |
| `import.log` | Import validation summaries (no raw CSV) |
| `safety.log` | Policy blocks and safety gate denials |
| `mt5.log` | Future path/detection diagnostics only |
| `bridge.log` | Future folder contract diagnostics only |

**Rules:**

- Never log **full CSV** contents, **secrets**, **broker credentials**, or **complete private paths**.  
- Avoid logging **real account identifiers**, balances, equity, investor passwords, or server names in launcher/action logs.  
- Keep **`logsPreview`** in **`MapazappActionResult`** short and **pre-sanitized** (see **`assertActionResultSafety`** in **`action-result.ts`**).  
- Apply **retention** consistent with **`logs.keepDays`** intent from **D2**.  
- Logs directories must be **gitignored** — **never commit** operator logs.

---

## 10. Configuration policy

Baseline concepts come from **D2** (`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`). A future launcher config **should** include:

- **`runtimeMode`** (conservative defaults; no surprise `live-read-only`).  
- **`api.host` / `api.port`** (bind policy should default to **`127.0.0.1`** for local trust boundaries).  
- **`dashboard.host` / `dashboard.port`** (+ optional `openBrowser`).  
- **`logsFolder`** (user-data path).  
- **Data/import folders** as explicitly scoped fields (no implicit cwd-relative surprises for production-like flows).  
- **`mt5.enabled`**: **false** until explicit operator configuration.  
- **`bridge.enabled`**: **false** until explicit operator configuration.  
- **Safety flags**: **`executionEnabled`** and related automation flags **false**; **`manualReviewRequired` true**.

**Operational discipline:**

- Do **not** commit local configs containing **personal paths** or secrets.  
- Prefer **per-user** config stored **outside** the repo.  
- Do **not assume** MT5 is installed.

---

## 11. Launcher-side action bridge

**Allowed conceptual flow (future implementation):**

```
Dashboard action client (TS)
  → governed local transport (HTTP on loopback and/or launcher IPC)
  → Launcher action service (allowlisted `actionId` only)
  → controlled helper invocation (existing CLI logic or successors)
  → MapazappActionResult (structured + safety scanned)
  → optional runtime snapshot refresh (honest semantics)
```

**Action mapping (IDs align with `MAPAZAPP_ACTION_IDS` / **D7.1**):**

| Action ID | Launcher-side intent |
|-----------|----------------------|
| `validate_environment` | Run **preflight-equivalent** checks (ports/scripts/policy); **read-only** helpers |
| `start_mapazapp_dev` | **Only** the launcher supervises API/dashboard starts (never browser-direct) |
| `stop_mapazapp` | Stop **owned children only** |
| `validate_csv` | Invoke importer validation on **user-consented** file selection / staged bytes — **no** arbitrary web-provided paths |
| `open_logs` | Open the configured **`logsFolder`** or a governed viewer — **no** raw path echo to the browser |
| `validate_mt5_config` | **Future** (**D10+**): policy-bound existence checks — **no execution** |
| `open_mt5` | **Future**: explicit gated launch — optional and policy-bound |
| `show_runtime_status` | Already supported as **read-only** **`GET`** today; launcher may later mirror/augment with richer probes |

**Hard rule:** the dashboard remains a **client**; it does not become a process supervisor.

---

## 12. ActionResult integration

- Every governed launcher-mediated action returns a **`MapazappActionResult`** (see **`action-result.ts`**).  
- **`safety`** must always reflect the conservative posture (**`executionEnabled: false`**, etc.) for phases covered by current governance.  
- Unsafe flags or forbidden substrings in messages/logs must **fail closed** via **`assertActionResultSafety`** policies at integration boundaries.  
- **`runtimeStatus`** attachment is **optional** and must remain **honest** (`unknown` / `not_configured` are valid).  
- **`logsPreview`** must be sanitized and minimal.  
- **`errors`** should be stable and operator-safe (prefer structured codes in implementation phases).  
- **`not_available`** and **`blocked`** remain valid outcomes while bridges are absent or policy denies an action.  
- Do **not** use **`ActionResult`** language to **promise** trade execution or connectivity that did not occur.

---

## 13. RuntimeStatus integration

A future launcher should compose **`MapazappRuntimeStatus`** inputs consistent with **`runtime-status.ts`**:

- Combine **API child** reachability/probes with existing **`GET`** semantics where applicable.  
- Combine **dashboard child** reachability/probes (today’s API snapshot alone cannot prove dashboard OK — launcher probes would be required for honesty).  
- Represent future **MT5** slices using **`not_configured` / `not_checked` / `detected` / `not_found`** — **`detected` is not “market connected.”**  
- Represent future **bridge** slices using **`not_configured` / `missing` / `stale` / `available`** — **`available` is not signal approval.**  
- Keep **`safety`** consistent with enforced launcher policy.  
- Use **`deriveOverallRuntimeStatus`** from core to avoid one-off “overall OK” drift.

**Semantic guardrails:**

- **API `ok`** ≠ Mapazapp product-ready for trading (still evidence-only governance).  
- **MT5 `detected`** ≠ bridge healthy.  
- **Bridge `available`** ≠ strategy approval.  
- **`executionEnabled`** remains **false** for governed phases described today.

---

## 14. Localhost / IPC security

**Option A — HTTP on `127.0.0.1`**

- **Pros:** easiest integration with the existing dashboard fetch patterns for **read-only GET**.  
- **Cons:** CSRF / malicious-site **`localhost`** invocation risk if **`POST`** surfaces are naive.  
- **Requires:** strict CORS, short-lived **local action tokens**, **allowlisted actions**, rate limits, and a documented threat model before **`POST`**.

**Option B — Launcher-specific IPC** (named pipes, localhost-only sockets with mutual auth, Electron/Tauri IPC, etc.)

- **Pros:** smaller browser-exposed attack surface for privileged operations.  
- **Cons:** higher engineering complexity; packaging coupling.

**Option C — File-based control**

- **Not recommended** for actions (too close to **command-file** hazards and confused-deputy problems).

**Preliminary recommendation:**

- **Read-only status**: loopback HTTP may remain acceptable **if bound to `127.0.0.1`** and scoped (**D5.1b** pattern).  
- **Privileged actions** (`start`/`stop`/`open_mt5`/path operations): prefer **launcher IPC** **or** heavily gated HTTP **`POST`** with tokens + allowlists + explicit confirmations.  
- Any **`POST`** introduction lands in **D9.x** with an explicit minimal threat model (**D7.1**).

---

## 15. Testing strategy for a future launcher

**Before any real `spawn` ships:**

- Config validation unit tests (schema + unsafe combinations).  
- Port policy tests (occupied vs free; never kills external occupiers).  
- **`MapazappActionResult`** safety tests at integration boundaries (`assertActionResultSafety`).  
- Path/log sanitization tests (redaction rules).  
- Single-instance lock behavior tests (including stale-lock recovery expectations).  
- “No arbitrary command” tests — only fixed helper shapes.

**After supervised process code exists:**

- Lifecycle tests using **dummy child commands** / stubs (CI-friendly).  
- Shutdown ordering tests with timeouts (ensure no external PID targeting).  
- Crash injection tests for child exits (launcher must degrade status safely).  
- Windows manual checklist: Ctrl+C, closing console window, sleep/resume, AV interference notes.

---

## 16. Packaging options

| Option | Notes |
|--------|-------|
| **A. Node script launcher** | Same ecosystem as today; still requires Node runtime on machine unless packaged |
| **B. Packaged Node executable (future)** | Possible later; signing/AV/false positives are risks (**no dependency additions in D8.1**) |
| **C. PowerShell/BAT wrapper** | Fast bootstrap for Windows; keep thin — logic belongs in tested launcher core |
| **D. Electron/Tauri shell** | Heavy; justified only if product wants embedded dashboard + rich IPC |
| **E. Keep `mapazapp:dev-start` for dev** | Remains valid contributor workflow; **not** a substitute for a governed user launcher |

**D8.1** stays **documentation-only** (sections above through §16). **No packaged `.exe`** until packaging threat model + teardown validation exist.

**D8.2 (implemented — skeleton only):** `APP/scripts/src/mapazapp-launcher-model.ts` (+ `mapazapp-launcher-model.test.ts`) provides pure TypeScript **`LauncherConfig`** / **`LauncherProcessModel`** types, safe defaults, conservative **`deriveLauncherRuntimeStatus`** (via `@workspace/mapazapp-core`), **`assertLauncherModelSafety`**, and **`serializeLauncherModel`**. **No** OS process spawning APIs, **no** launcher executable, **no** active action bridge (`actionBridgeEnabled` must remain **false** under D8.2 safety rules).

**D8.3 (implemented — preflight-only bridge):** `APP/scripts/src/mapazapp-launcher-preflight-bridge.ts` exposes **`runLauncherValidateEnvironmentPreflight`**, which delegates to **`performDevPreflight`** (read-only), updates **`LauncherProcessModel.ports`** + **`preflight`** snapshot, derives **`MapazappRuntimeStatus`** conservatively (services stay **`not_started`** when checks pass), and returns a gated **`MapazappActionResult`** for **`validate_environment`** (`assertActionResultSafety`). **Does not** start API/dashboard/browser/MT5, **does not** add CLI/`POST`/dashboard controls.

---

## 17. Proposed D8 / D9 / D10 sequence

**Recommended single sequence** (reconciles **`ACTION_BRIDGE_DESIGN.md`** with launcher work — prefer this table when docs disagree):

| ID | Topic |
|----|-------|
| **D8.0** | Launcher prototype **audit / proposal** — documentation-only review (**completed as an audit milestone**) |
| **D8.1** | **Launcher prototype + launcher-side bridge design** — this document; **no code** |
| **D8.2** | Launcher **config + process model skeleton** — `mapazapp-launcher-model.ts` (**implemented**); **no spawn**, **no executable**, **no live bridge** |
| **D8.3** | Launcher **preflight-only bridge** — `mapazapp-launcher-preflight-bridge.ts` (**implemented**); **`validate_environment`** via `performDevPreflight`; **no** API/dashboard/browser/MT5 start |
| **D9.0** | **Guarded local action bridge prototype** — minimal surface + explicit threat model |
| **D9.1** | First controlled **`validate_environment`** endpoint **or** launcher IPC equivalent (**narrow scope**) |
| **D9.2** | Controlled **`start_mapazapp_dev` / supervision** — **only if** PID ownership + shutdown tests exist |
| **D10.0** | **MT5 detection gate** — audit / policy design; paths only; **no execution** |
| **D10.1** | **MT5 config validator** — presence/policy checks; **no terminal launch requirement** |
| **D10.2** | Optional **`open_mt5`** action — **explicitly gated** |

If implementation discoveries require inserting a checkpoint, update **this doc** and **`ACTION_BRIDGE_DESIGN.md`** §11 together to preserve a **single** authoritative ordering.

---

## 18. Explicit non-goals (D8.1)

**D8.1 does not implement or authorize:**

- Any launcher executable or supervisor code  
- Any `child_process` usage / `spawn` / process killing logic  
- Any new **`POST`** endpoints on `@workspace/api-server`  
- Dashboard operational **buttons** or new privileged TSX controls  
- MT5 runtime connectivity, bridge watchers, databases, WebSocket live feeds  
- Polling loops or **`localStorage`** action orchestration  
- Real execution, auto-approval, registry mutation, or MT5 command files  

---

## 19. References

- [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md)  
- [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md)  
- [`DASHBOARD_RUNTIME_ACTIONS_DESIGN.md`](./DASHBOARD_RUNTIME_ACTIONS_DESIGN.md)  
- [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md)  
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)  
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)  
