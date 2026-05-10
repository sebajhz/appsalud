# Mapazapp — Local Action Bridge Threat Model D9

**Checkpoint D9.1 — documentation only.** No `POST` action endpoints, no dashboard operational buttons, no product launcher executable, no IPC transport, no MT5 runtime automation, no folder watchers, no operational database, no WebSocket live feeds, no polling loop for actions, no `localStorage` action state, no `spawn`, no `child_process`, no real execution or trading.

**Related:** [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md) (D7.1 — bridge contract), [`LAUNCHER_PROTOTYPE_DESIGN_D8.md`](./LAUNCHER_PROTOTYPE_DESIGN_D8.md) (D8.1 — launcher + launcher-side bridge intent), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md) (D2), [`DASHBOARD_RUNTIME_ACTIONS_DESIGN.md`](./DASHBOARD_RUNTIME_ACTIONS_DESIGN.md) (D4.1 — action IDs), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Purpose

- Mapazapp **already has** a read-only runtime snapshot (`GET /api/mapazapp/runtime/status`), a pure **`MapazappActionResult`** model with **`assertActionResultSafety`** (`@workspace/mapazapp-core`), a dashboard **`DashboardActionClient`** stub that returns **`not_available`** / **`blocked`** only, a launcher **process/config skeleton** (D8.2), and a **read-only** launcher-side **`validate_environment`** path implemented as **`runLauncherValidateEnvironmentPreflight`** over **`performDevPreflight`** — **no spawn**, no HTTP server, no MT5 (D8.3).
- There is **still no** governed **local action bridge** exposed to the browser, **no** `POST` routes for actions on `@workspace/api-server`, **no** product launcher, and **no** IPC surface for privileged operations.
- **Before** any local action can be triggered through HTTP, IPC, or UI buttons, this document records **threats** and **mandatory mitigations** so implementation checkpoints (e.g. D9.2+) do not ship an accidental **localhost-driven privileged primitive**.
- The **dashboard (browser)** must **not** execute privileged actions directly; it may only request actions through a **designed, gated** channel once that channel exists and passes governance.
- Across all phases described in current governance docs, **`executionEnabled` remains `false`** until an explicit, separate product gate says otherwise.

---

## 2. Current baseline

### Already exists

| Building block | Role |
|----------------|------|
| `GET /api/mapazapp/runtime/status` | Read-only API snapshot; honest defaults; no live MT5/bridge probes |
| `RuntimeStatusPanel` + container on `ConfigPage` | Presentational read-only panel; one-shot load; no polling for actions |
| `DashboardActionClient` stub (`actionClient.ts`) | Returns **`not_available`** / **`blocked`**; **no** `fetch`, **no** `POST`, **no** UI wiring for operational actions |
| `MapazappActionResult` + `assertActionResultSafety` | Structured action results + safety scanning on messages / logs / serialized JSON |
| `MapazappRuntimeStatus` + `deriveOverallRuntimeStatus` | Conservative runtime semantics; blocks misleading “all OK” where inappropriate |
| Launcher model skeleton (`mapazapp-launcher-model.ts`) | Config/process **model only**; maps conservatively to runtime status |
| Launcher preflight bridge (`mapazapp-launcher-preflight-bridge.ts`) | **`validate_environment`** as **read-only** preflight → model + **`MapazappActionResult`**; **not** wired to dashboard or API |
| Action gate model (`action-gates.ts`, **D9.2**) | Pure **`evaluateActionGate`** + definitions + policy; **no** HTTP, **no** execution; optional **`MapazappActionResult`** conversion |
| Launcher action dispatcher (`mapazapp-launcher-action-dispatcher.ts`, **D9.3** / **D9.4.1**) | Internal async **`dispatchLauncherAction`** — runs **D9.2** gates then routes **only** **`validate_environment`** to **D8.3** preflight; **D9.4.1** hardens error paths so preflight faults and unsafe payloads become **`MapazappActionResult`** responses with conservative **`safety`** (no raw stack traces, no HTTP/IPC); returns optional **`LauncherProcessModel`** / **`MapazappRuntimeStatus`**; **no** HTTP/IPC, **no** CLI |

### Does not exist yet

- **`POST`** (or mutating) **action** endpoints on the local API for Mapazapp actions  
- **Active** local action bridge reachable from the dashboard  
- **`MapazappLauncher.exe`** / unified desktop launcher product  
- **Real IPC** between dashboard and launcher (beyond future design)  
- Dashboard **buttons** that trigger host control or file/process operations  
- **MT5 runtime** integration from Node/TS  
- **Folder watcher** or live file-ingest daemons  
- **Operational database** for Mapazapp in this scope  
- **WebSocket live** action or status streams for this bridge  
- **Auth/token** policy for localhost action calls  
- **CORS policy** specific to action endpoints  
- **Rate limiting** / replay / **cooldown** enforcement for actions (not implemented in D9.2 gate TS)

---

## 3. Assets to protect

- **User processes** — avoid starting/stopping/killing the wrong programs.  
- **Personal filesystem paths** — `C:\Users\…`, profiles, proprietary folders.  
- **Logs and diagnostics** — must not become exfiltration channels.  
- **Real CSV and datasets** — content and paths must not leak through errors or previews.  
- **Broker/account hints** — login, server, balance, equity, investor flags, etc.  
- **`AppData` / `MetaQuotes` / terminal paths** — high sensitivity on Windows.  
- **Runtime / overall status semantics** — prevent false confidence (“green” when not verified).  
- **Local machine integrity** — no drive-by abuse of `127.0.0.1`.  
- **User privacy and trust** — Mapazapp must not imply live trading readiness or execution where none exists.

---

## 4. Trust boundaries

### Browser dashboard (untrusted for privileged ops)

- **Must not** spawn processes, run shells, open MT5, kill PIDs, or read arbitrary paths.  
- **May** render read-only data and, **only through a future gated channel**, request actions that the **trusted** side executes.

### Local API (`@workspace/api-server`)

- **Read-only `GET`** endpoints are **lower risk** than mutating **`POST`** action surfaces.  
- **Trusted only if bound, scoped, and gated** — especially any future action endpoint listening on localhost.

### Launcher (future trusted component)

- **Intended owner** of supervised child processes **it created**.  
- **Only** component that should start/stop product API/dashboard children or open MT5 **under explicit policy**.  
- Must enforce **ownership** and **orderly shutdown** — never global `taskkill` by name as a default.

### Scripts / CLI helpers (`pnpm` scripts, future helpers)

- **Must not** be exposed **directly** to the browser as arbitrary command execution.  
- Any automated invocation must use **fixed, audited** command shapes (no user-controlled shell composition).

### MT5 / filesystem

- **High sensitivity boundary.** Any access requires explicit configuration, consent, and D10+ gates — not implied by preflight or port checks.

---

## 5. Threats

### 5.1 Localhost abuse / CSRF

- **Malicious or compromised websites** triggering requests to `http://127.0.0.1` / `localhost` against a future action listener.  
- **Cross-site `POST`** from an external browser context if cookies, ambient authority, or permissive CORS combine badly.  
- **Overly permissive CORS** (e.g. `*` with credentials, or reflecting arbitrary `Origin`).  
- **Cookies / stored credentials** on the local API origin amplifying impact of forged requests.

### 5.2 Replay / action flooding

- **Repeated** start/stop/preflight calls causing **log floods**, **CPU churn**, or **unstable** child state.  
- **Race conditions** between overlapping actions (two starts, stop during start).  
- **Inconsistent** persisted vs in-memory supervisor state after crashes.

### 5.3 Command injection / arbitrary action

- **`actionId`** outside a strict **allowlist**.  
- **Unvalidated parameters** (paths, ports, flags) enabling unintended behavior.  
- **Shell string composition** from user or dashboard input → command injection.  
- **“Escape hatch”** endpoints that run arbitrary user-supplied commands.

### 5.4 Path privacy / PII leakage

- Full paths exposing **`C:\Users`**, **`AppData`**, **`MetaQuotes`**, **`terminal64.exe`**.  
- **Real CSV** snippets or row previews in errors.  
- **Broker/account** tokens (`login`, `server`, `balance`, `equity`, etc.) in `message`, `warnings`, `errors`, or **`logsPreview`**.  
- Overly verbose **`logsPreview`** defeating redaction.

### 5.5 Process ownership

- **`stop`** terminating **foreign** processes (wrong PID, name-only kill).  
- **PID reuse** on Windows after a short window.  
- **Zombie** or **orphan** children if supervisor crashes.  
- Incorrect **child tree** handling (grandchildren not tracked).

### 5.6 Unsafe status claims

- **`api.status === ok`** or dashboard reachable **≠** “Mapazapp production ready”.  
- **MT5 detected** **≠** bridge connected **≠** account authenticated.  
- **Bridge folder available** **≠** strategy approved or signals safe.  
- **`validate_environment` / preflight OK** **≠** trading enabled — it explicitly **does not start** services.

### 5.7 Execution safety

- Any **`executionEnabled: true`**, **`sendToMt5Enabled: true`**, **`canAutoExecute: true`**, **`autoApprovalEnabled: true`**, **`registryMutationAllowed: true`** in payloads shown to users without an explicit product gate.  
- **Command files**, **OrderSend**, **CTrade**, or similar **execution pathways** from Mapazapp services.  
- **Auto-approval** of strategies or registry mutation from automation.

### 5.8 Log and diagnostic leaks

- Stack traces or system errors embedding **full paths**.  
- Echo of **CLI arguments** containing secrets.  
- **Raw CSV** or **tokens** in API logs (pino / files).  
- **Session or CSRF tokens** logged in cleartext.

---

## 6. Mandatory mitigations before any POST / action endpoint

The following are **hard requirements** before implementing any **browser-reachable** or **ambient-authority** action surface (not an exhaustive product security review, but **repo gates** for this bridge):

1. **Bind to loopback only** for action listeners — e.g. **`127.0.0.1`**, not **`0.0.0.0`**, unless a separate threat model approves broader binding.  
2. **Strict CORS** — no wildcard origins for action routes; explicit allowlist; avoid credentials unless necessary and justified.  
3. **Local secret / CSRF token** — unguessable, rotated or single-use where appropriate; **SameSite** cookies if cookies are used; prefer patterns that **block cross-site** drive-by.  
4. **Explicit allowlist** of **`MapazappActionId`** — reject unknown IDs at the boundary.  
5. **Schema validation** of parameters (types, bounds, allowed path roots if any paths are accepted).  
6. **No arbitrary command execution** — fixed argv shapes; **no** shell `-c` with user input.  
7. **No shell string composition** from untrusted input.  
8. **No arbitrary path reads** without **explicit consent** / picker / staged roots.  
9. **Rate limits / cooldowns** per action class and per client identity (where identifiable).  
10. **Idempotency keys or nonces** for sensitive transitions (start/stop).  
11. **Sanitized action logs** — redact paths, accounts, tokens; bounded size.  
12. **`assertActionResultSafety`** (or equivalent) on every **`MapazappActionResult`** returned outward.  
13. **Runtime status** must remain **honest** — no fake **`ok`** for unverified MT5/bridge/trading.  
14. **`stop`** only for **children owned** by the supervisor — never global kill by default.  
15. **No `POST`** for trading, orders, signals execution, or enabling execution flags.  
16. **No MT5 “actions”** (launch, config probes beyond policy) before **D10** gates and docs.  
17. **Automated tests** for dangerous JSON tokens and **path privacy** substrings in serialized results (extend patterns already in `action-result.ts` tests as implementation evolves).

---

## 7. Action classes and allowed posture

| Class | Examples | Allowed now? | Requires launcher? | Requires POST? | Required gates | Notes |
|-------|----------|--------------|--------------------|----------------|----------------|-------|
| Read-only status | `show_runtime_status` | **Yes** (via existing **`GET`** + panel) | No | **No** | Build-time API base URL; conservative copy | Not an “action endpoint”; read-only HTTP |
| Read-only preflight | `validate_environment` | **Prototype only** (scripts / launcher bridge module) | **Recommended** for product | **Only if** browser-triggered — otherwise internal | **D9.2** `evaluateActionGate` + D9.1 mitigations if HTTP | D8.3 does **not** expose to dashboard; message must say services **not** started |
| File validation | `validate_csv` | **No** (CLI exists; not dashboard bridge) | TBD | Likely yes if remote-triggered | File policy, staging, consent, path sandbox | `mapazapp:import-validate` is dev CLI today |
| Process lifecycle | `start_mapazapp_dev`, `stop_mapazapp` | **No** | **Yes** | TBD | Launcher supervisor, ownership, teardown tests | Browser **blocked** in stub; dev script ≠ product |
| Logs | `open_logs` | **No** | **Yes** | TBD | Log root policy, redaction, no raw path to web | Paths stay off web client |
| MT5 config | `validate_mt5_config` | **No** | **Yes** | TBD | **D10.0+** audits | Policy-only path checks; no execution claims |
| MT5 launch | `open_mt5` | **No** | **Yes** | TBD | **D10.2+**, explicit consent | Never from raw browser |
| Trading / execution | *(none defined as allowed)* | **Never** | N/A | **Never** | Out of scope until separate product gate | No bridge endpoint may enable trades here |

---

## 8. D9.2 gate model (implemented — pure TS, no endpoints)

**Checkpoint D9.2** adds `@workspace/mapazapp-core` **`action-gates.ts`**: definitions (`createActionGateDefinitionList`), default policy (`createDefaultActionGatePolicy`), evaluation (`evaluateActionGate`), decision safety (`assertActionGateDecisionSafety`), optional **`MapazappActionResult`** bridging (`createActionGateActionResult`), and serialization (`serializeActionGateDecision`). Tests: `tests/d9-action-gates-model.d9.test.ts`.

The gate layer validates, among other things:

- **Caller source** — `dashboard` | `api` | `launcher` | `script` | `unknown`  
- **`actionId` allowlist** — matches documented IDs / rejects unknown  
- **Action class** — maps to mitigations (read-only vs process vs file vs MT5)  
- **`requiresLauncher`**, transport gate, **user confirmation**, **file consent** — enforced per definition + policy flags  
- **`allowsProcessStart`**, **`allowsFileRead`**, **`allowsMT5`** — mirrored on definitions (no **`allowsTrading`** on shipped definitions)  
- **Safety flags** — decisions carry safe **`MapazappActionSafety`** defaults; **`assertActionGateDecisionSafety`** scans messages and serialized JSON  
- **Result contract** — **`createActionGateActionResult`** runs **`assertActionResultSafety`** on emitted results  

**There are still no `POST` action endpoints, no dashboard buttons, no launcher runtime, and no IPC** — this module is **non-operational** policy only. **`maxFrequency` / cooldown** remains future work (not in D9.2).

**D9.1** remains the authoritative threat model; **D9.2** implements the static gate matrix described here **without** wiring to HTTP.

---

## 9. Recommended sequence

| Step | Checkpoint | Intent |
|------|------------|--------|
| **D9.1** | Local Action Bridge Threat Model (this doc) | Close threats + mitigations in writing before transport |
| **D9.2** | Local Action Gate model — **TS only**, no endpoints | Allowlist + caller + caps in code |
| **D9.3** | Launcher dispatcher **internal** model — **no HTTP** (**implemented** in `APP/scripts/src/mapazapp-launcher-action-dispatcher.ts`) | Gates + **only** **`validate_environment`** → preflight bridge in-process |
| **D9.4** | Extend dispatcher / ergonomics (e.g. CLI entry) — **still no transport** | Optional; still no browser **`POST`** unless gated separately |
| **D9.5** | API / IPC **transport** audit | Compare HTTPS cookie models vs localhost token vs desktop IPC |
| **D9.6** | First **guarded transport** prototype | Only after gates + tests; still no trading |
| **D10.0** | MT5 detection gate audit | Docs + policy before probes |
| **D10.1** | MT5 config validator — **no launch** | Path/presence policy only |
| **D10.2** | Optional **`open_mt5`** gated prototype | Launcher-only, explicit consent |

Sequence is **planning guidance**; checkpoints require explicit approval before coding.

---

## 10. Non-goals (D9.1)

D9.1 **does not** implement or authorize implementation of:

- **`POST`** action routes or generic “run command” APIs  
- Dashboard **buttons** for host control  
- Product **launcher** binary or supervisor  
- **IPC** transport  
- **MT5** automation, detection code, or launch  
- **Watcher**, **DB**, **WebSocket live** feeds  
- **Polling** loops or **`localStorage`** for action state  
- **`spawn`** / **`child_process`** usage  
- **Execution**, **trading**, **OrderSend**, **CTrade**, **command files**  
- **`pnpm mapazapp:dev-start`** as the product bridge — it remains a **dev helper**, not the governed action surface

---

## Document history

- **D9.1** — Initial formal threat model for the future local action bridge (documentation only).
- **D9.2** — Shared **`action-gates.ts`** gate matrix + tests; still **no** endpoints or operational bridge.
- **D9.3** — Scripts **`mapazapp-launcher-action-dispatcher.ts`** internal **`dispatchLauncherAction`** (gates + **`validate_environment`** only); **no** HTTP/IPC/CLI; tests `mapazapp-launcher-action-dispatcher.test.ts`.
