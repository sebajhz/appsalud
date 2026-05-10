# Mapazapp — Local Action Transport Safety Test Plan D9

**Checkpoint D9.7 — documentation only.** No TypeScript test files, no `POST` action endpoints, no HTTP action transport implementation, no IPC implementation, no dashboard operational buttons, no product launcher executable, no MT5 runtime automation, no folder watchers, no operational database, no WebSocket live feeds, no polling loop for actions, no `localStorage` action state, no `spawn`, no `child_process`, no real execution or trading.

**Related:** [`LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md`](./LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md) (**D9.6** — formal transport contract before implementation), [`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`](./LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md) (**D9.1** — threats + mandatory mitigations), [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) (**D9.9** — API hardening plan & sequence **D9.10+** — **docs only**), [`API_TOKEN_CSRF_DESIGN_D9.md`](./API_TOKEN_CSRF_DESIGN_D9.md) (**D9.15** — token / CSRF obligations §11 — **docs only**), [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md) (D7.1), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Purpose

- **D9.6** defines the **formal contract** any future **local action transport** (HTTP loopback, launcher IPC, or hybrid) must satisfy.
- **D9.7** defines the **safety test obligations** that must be **planned, owned, and satisfied in automated tests** before any such transport is implemented — this document is the **authoritative test plan**, not implementation.
- **No** endpoint, **`POST`**, IPC channel, launcher binary, dashboard buttons, or runtime automation is created by **D9.7**.
- The goal is to **prevent shipping an insecure localhost-privileged surface** when transport code eventually lands; reviewers should reject PRs that add transport without evidence against this plan.
- Across all phases described in current governance docs, **`executionEnabled` remains `false`** until an explicit, separate product gate says otherwise.

---

## 2. Current baseline

### Already exists

| Building block | Role |
|----------------|------|
| **`MapazappActionResult`** model + **`assertActionResultSafety`** | Structured action results + safety scanning (**D7.2**) |
| **`evaluateActionGate`** + gate definitions + **`MapazappActionGatePolicy`** | Caller allowlists, action classes, transport/consent flags (**D9.2**) |
| **`dispatchLauncherAction`** | Internal async dispatcher: gates + **only** **`validate_environment`** → D8.3 preflight; hardened error paths (**D9.3** / **D9.4.1**) |
| **`runLauncherValidateEnvironmentPreflight`** | Read-only dev preflight → safe **`MapazappActionResult`** (**D8.3**) |
| **`GET /api/mapazapp/runtime/status`** | Read-only API snapshot; conservative semantics (**D5.1b**) |
| **`RuntimeStatusPanel`** on **`ConfigPage`** | Presentational read-only panel; one-shot load (**D6.x**) |
| **`DashboardActionClient`** stub (`actionClient.ts`) | **`not_available`** / **`blocked`** only; **no** `fetch`, **no** `POST` (**D7.3**) |
| **Transport contract D9.6** | Minimum HTTP + IPC requirements, caller remapping, conceptual envelopes (**documentation**) |
| **D9.11 readiness tests (`api-server`)** | **`apiHardeningReadiness.d9.test.ts`** — baseline/readiness audit vs **D9.10** model + skipped future expectations; **no** HTTP endpoint, **no** **`POST`**, **no** runtime wiring |
| **D9.12 listen bootstrap (`api-server`)** | **`index.ts`** explicit **`listen(port, host)`** + **`apiListenConfig.d9.test.ts`** — loopback default; **not** action transport, **not** strict CORS |
| **D9.13 CORS allowlist (`api-server`)** | **`apiCorsConfig.ts`** + integration tests — global allowlist; **not** action **`POST`**, **not** token |
| **D9.14.1 body limits + safe errors (`api-server`)** | **`apiBodyAndErrorHandling.d9.test.ts`** — oversized JSON **`413`**, invalid JSON **`400`**, safe **`500`** via **test-only** Express stack; **not** transport token, **not** action **`POST`** |
| **D9.14.2 log redaction baseline (`api-server`)** | **`logRedaction.d9.test.ts`** + **`logRedaction.ts`** — string/value sanitizers, **`pino`** redact paths, **no** **`req.body`** logging in default serializers; **not** transport token, **not** action **`POST`** |
| **D9.16–D9.18 action-token foundation (`api-server`)** | **`apiActionTokenConfig.ts`**, **`actionTokenMiddleware.ts`** (unwired from **`app.ts`**), **`actionTokenMiddleware.d9.test.ts`**, extended **`logRedaction`** tests — missing/invalid/query token JSON contracts; **no** Mapazapp action **`POST`**, **no** real token issuance |

### Does not exist yet

| Gap | Notes |
|-----|--------|
| **`POST`** (or mutating) action endpoints | Out of scope until this plan’s acceptance criteria are met in code + review |
| **IPC** (real channel) | Design-time only |
| **Product launcher** executable | Dev scripts ≠ governed bridge |
| **HTTP action bridge** | Read-only **`GET`** exists; **no** mutating action route |
| **Transport token** | Policy + tests required before use |
| **CSRF protection** (transport-specific) | Required per **D9.1** / **D9.6** |
| **Rate limiting / cooldown** (enforced at transport) | **D9.2** does not enforce runtime cooldown — transport must |
| **Idempotency / nonce** scheme | Required for sensitive transitions |
| **Dashboard buttons** for operational actions | Stub client only |
| **MT5 runtime** integration from Node/TS | **D10+** gates |

---

## 3. Test categories

The following categories are **mandatory** for future transport work. Wording here describes **what tests must prove**, not how to implement them.

### 3.1 HTTP loopback transport tests

**D9.12 (bootstrap only, no action transport):** the **`api-server`** entrypoint binds an explicit host (default **`127.0.0.1`**) and resolves port per **`MAPAZAPP_API_PORT`** / **`PORT`** / default **3001** — see **`apiListenConfig.d9.test.ts`** and **`apiHardeningReadiness.d9.test.ts`**. This satisfies only the **process listen** slice below; strict CORS, tokens, and **`POST`** action routes remain future work.

**D9.13 (CORS baseline, still no action transport):** **`app.ts`** uses **`createCorsOptions(apiHardeningConfig)`** from **`apiCorsConfig`** — allowlisted **`Origin`** only (default **`http://127.0.0.1:5173`**, **`http://localhost:5173`**); no **`Origin`** still OK for curl/supertest; see **`apiCorsConfig.d9.test.ts`** and **`apiCorsIntegration.d9.test.ts`**. Per-route stacks + transport token verification tests (**D9.18**+ / **D9.19** per [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) §6) remain pending — see **`API_TOKEN_CSRF_DESIGN_D9.md`** §11 for token/CSRF-specific cases.

Before any **`POST`** (or mutating HTTP method) for Mapazapp actions, tests must cover:

- Action listener **binds only to `127.0.0.1`** (or stricter loopback policy per approved design).
- **Rejects** binding **`0.0.0.0`** for action endpoints by default (or proves explicit alternate bind is impossible without failing closed).
- **CORS** **rejects** unapproved **Origin** values for action routes.
- **No wildcard CORS** (`*`) for action routes unless threat-model approved (default: forbidden).
- **Missing** transport token / CSRF-equivalent **rejected**.
- **Invalid** token **rejected**.
- **Valid** token **accepted only** for **allowlisted** actions and caller contexts.
- **CSRF-style** drive-by request **without** required secret/token **rejected**.
- **Max body size** enforced; oversized payloads fail closed.
- **Invalid JSON** rejected **safely** (no crash, no stack leakage).
- **No stack traces** in HTTP responses.

### 3.2 Action allowlist / gate tests

Tests must cover integration between the transport boundary and **`evaluateActionGate`** (and policy):

- **Unknown `actionId`** **rejected** at the boundary.
- **`validate_environment`** **requires** correct **caller / transport context** — **not** implicit promotion from **`dashboard`** / raw **`api`** (**D9.6** §6).
- **Dashboard / browser caller** **cannot** become **`launcher`** automatically (no silent caller spoofing).
- **`start_mapazapp_dev`** **blocked** until **process supervisor** policy + ownership tests exist (**D9.2** posture today).
- **`stop_mapazapp`** **blocked** until **PID ownership** policy + tests exist.
- **`validate_csv`** **requires** **file consent** + schema validation + transport gate per **D9.2**.
- **`validate_mt5_config`** **blocked** until **D10** gates documented and approved.
- **`open_mt5`** **blocked** until **D10** gates documented and approved.
- **`trading_execution`** (if ever referenced) **always forbidden** — no successful dispatch path.

### 3.3 Replay / rate limit / idempotency tests

- **Repeated identical** requests are **controlled** (rate limit and/or cooldown semantics).
- **Cooldown** enforced for **sensitive** action classes (start/stop-class, expensive preflight).
- **Idempotency key / nonce** **required** where the contract demands it (per **D9.6** / **D9.1**).
- **Replayed nonce** (duplicate idempotency key) **rejected** or returns stable safe result without double side-effects.
- **Action flooding** does **not** produce **unbounded logs** or unbounded response bodies.
- **Concurrent** requests do **not** **corrupt** shared runtime/supervisor status (ordering / locking semantics TBD in implementation, tests must lock behavior).

### 3.4 Request schema tests

- **Unknown `params` keys** **rejected** or **ignored safely** per explicit policy (no silent passthrough to filesystem/shell).
- **No arbitrary filesystem paths** from unconsented input.
- **No shell command fields**; **no** command string composition from request body.
- **No raw CSV body** unless a **later** explicit design approves it (default: forbidden at transport).
- **Action-specific** JSON schema validation (types, bounds, enums).
- **Path traversal** patterns **rejected**.
- **Extremely long strings** **rejected** or **truncated** per bounds (no DoS via huge fields).

### 3.5 ActionResult safety tests

Every outward **`MapazappActionResult`** (and transport envelope embedding it) must be covered so that:

- **Every** serialized action response passes **`assertActionResultSafety`**.
- **Execution flags** are **always `false`**: `executionEnabled`, `sendToMt5Enabled`, `canAutoExecute`, `autoApprovalEnabled`, `registryMutationAllowed`.
- **`manualReviewRequired`** is **`true`** for governed phases described today.
- **No** payload implies **`approved: true`**, **ready to trade**, **live trading**, **execute order**, or equivalent unsafe copy in structured fields controlled by the bridge.
- **No** `OrderSend` / **`CTrade`** / command-file semantics in messages, logs, or errors.
- **No** false **MT5 connected** / **bridge connected** claims from this transport layer.
- **Unsafe dispatcher result** (fails **`assertActionResultSafety`**) is **converted** to **`blocked`** / **`error`** with safe conservative **`safety`** (**D9.4.1** pattern).
- **Dispatcher exceptions** are **converted** to **safe** **`MapazappActionResult`** (no raw stack strings).

### 3.6 Privacy / log sanitization tests

Tests must assert absence (in responses **and** bounded log previews) of sensitive substrings and content classes, including:

- `C:\Users` (and common Windows profile leakage patterns).
- `/Users/` (Unix-style home leakage).
- `AppData`, `MetaQuotes`, `terminal64.exe`.
- Broker/account tokens: **`login`**, **`account`**, **`balance`**, **`equity`**, **`server`**, **`investor`** (as unauthorized leakage — not as approved stub tokens).
- **Full CSV rows** or raw private datasets.
- **Broker/account display names** when they imply real operator data.
- **Secrets/tokens** in **`logsPreview`** or user-visible **`message`** fields.

### 3.7 Process ownership tests

**Before** real **start/stop** automation ships, tests must cover (future supervisor — **not implemented in D9.7**):

- **Stop only own children** — never foreign PIDs.
- **PID registry** required for supervised children.
- **PID reuse** handled safely on Windows.
- **No kill by process name** as default; **no aggressive `taskkill`** by name.
- **Orphan** handling after supervisor crash.
- **Shutdown timeout** behavior (clean vs forced policy).
- **Crash handling** of children without corrupting global API health.

### 3.8 IPC-specific tests

If **IPC** is chosen as the transport:

- **Caller identity** verified; **unauthorized** callers **rejected**.
- **Action allowlist** enforced at IPC boundary (same conceptual rules as HTTP).
- **Schema validation** on IPC messages (**no** arbitrary argv / shell).
- **No arbitrary command** execution from IPC payload.
- **Safe `MapazappActionResult`** on every response path (**`assertActionResultSafety`**).
- **No private path leakage** in IPC logs or error surfaces exposed to less-trusted peers.
- **No process control** without **launcher ownership** semantics (**D9.1** §5.5).

### 3.9 Dashboard / client tests

**Before** operational **buttons**:

- **No** button **enabled** for **blocked** / **not_available** actions (when wiring exists).
- **Dashboard** **cannot** invoke transport **without** configured, governed bridge (stub **`not_available`** / **`blocked`** remains safe default).
- **`actionClient`** surfaces **`not_available`** / **`blocked`** **without** throwing or leaking secrets.
- **No** UI copy claims **ready**, **connected**, or **trading** from this bridge layer without verified semantics.
- **No accidental `POST`** from **`RuntimeStatusPanel`** / status-only surfaces (**GET-only** pattern preserved).

---

## 4. Test fixture policy

- **Synthetic fixtures only** — no real operator machines, no real broker accounts.
- **No real filesystem paths** in committed fixtures; use **fake** sanitized paths.
- **No real CSV files** with private content; use minimal synthetic CSV **text** in memory where needed.
- **Tokens fake** — rotateable test doubles, never production secrets.
- **Paths fake** — neutral placeholders (e.g. `X:\sanitized\fake\path`) unless a negative test **intentionally** supplies banned patterns to assert rejection/redaction.
- **Windows path examples** — allowed **only** inside **negative** tests that assert **blocking** or **redaction**, not as “happy path” real data.
- **No secrets** in repo; no pasted tokens from local dev machines.

---

## 5. Minimum acceptance criteria before first POST

Checklist (must be **true in code + tests** before the first action **`POST`**):

- [ ] **HTTP bind policy** defined, implemented, and tested (**loopback-only** for actions).
- [ ] **CORS policy** implemented and tested for action routes (**no** wildcard by default).
- [ ] **Token / CSRF-style mechanism** implemented and tested (obligations: **`API_TOKEN_CSRF_DESIGN_D9.md`** §11 + §3.1 below).
- [ ] **Action allowlist** integrated with **`evaluateActionGate`** at the HTTP boundary.
- [ ] **`dispatchLauncherAction`** invoked **only** through a **safe wrapper** that enforces gates + **`assertActionResultSafety`** on every exit path.
- [ ] **Request schema validation** per **`actionId`**.
- [ ] **Rate limit / cooldown** enforced for transport calls.
- [ ] **Idempotency / nonce** where required by contract.
- [ ] **`assertActionResultSafety`** on **every** outward action response.
- [ ] **Privacy / token substring tests** on serialized JSON (extend **D7.2** / **D9.2** patterns).
- [ ] **No dashboard buttons required** for first merge — service-layer tests suffice initially (**D9.6** §11.1).
- [ ] **No MT5 actions** and **no trading/execution** paths.

---

## 6. Minimum acceptance criteria before IPC

Checklist (must be **true in code + tests** before real IPC for actions):

- [ ] **Launcher identity model** documented and tested.
- [ ] **Caller authorization** at IPC boundary.
- [ ] **Action allowlist** + **`evaluateActionGate`** integration.
- [ ] **Schema validation** (fixed message shapes).
- [ ] **`assertActionResultSafety`** on every outward result.
- [ ] **No arbitrary command** or shell composition from IPC payloads.
- [ ] **No arbitrary path** reads without consent/staging policy.
- [ ] **Process ownership model** for lifecycle actions (**§3.7** alignment).
- [ ] **Logs sanitized** (IPC + launcher file logs policy).
- [ ] **No MT5 automation** before **D10** approvals.

---

## 7. Suggested future test files

**Conceptual filenames only — no implementation in D9.7.**

**HTTP (future):**

- `mapazapp.actions.transport.http.test.ts`
- `mapazapp.actions.transport.security.test.ts`
- `mapazapp.actions.transport.cors.test.ts`

**Core / launcher integration:**

- `d9-action-transport-gates.integration.test.ts`
- `mapazapp-launcher-action-transport.test.ts`

**Dashboard (future, when wired):**

- `actionClient.transport.test.ts`
- `dashboardActionButtons.safety.test.ts` *(future only — buttons not required for first transport PRs)*

---

## 8. Recommended next sequence

| Step | Checkpoint | Intent |
|------|------------|--------|
| **D9.7** | **Transport safety test plan** (this doc) — **docs only** | Acceptance criteria + test categories before transport code |
| **D9.8** | **API hardening audit** for bind / CORS / headers — **still no action `POST`** | Baseline **`api-server`** posture reviewed (**may leave no repo edits**) |
| **D9.9** | **API hardening plan** — [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) — **docs only** | Gap table, env contract proposal, ordered **D9.10–D9.19** before action transport |
| **D9.10**–**D9.19** | Per [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) §6 | Config TS → readiness tests → loopback bind → CORS → errors/body/logs → **D9.15** token/CSRF **design** → **D9.16**–**D9.18** token model/middleware/tests → **D9.19** transport test skeletons |
| **D10.0** | **MT5 detection gate audit** | Policy before probes |
| **D10.1** | **MT5 config validator model** — **no launch** | Path/presence policy only |
| **D10.2** | Optional **`open_mt5` design** — **no implementation** | Launcher-only future |

---

## 9. Explicit non-goals (D9.7)

D9.7 **does not** implement or authorize implementation of:

- **TypeScript tests** (files remain future work; **D9.18** / **D9.19** per [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) §6 may add token integration / transport test skeletons only when approved)
- **`POST`** action routes or generic “run command” APIs
- **New endpoint** or API surface changes
- **CORS** behavior changes (documented expectations only)
- **Transport token** issuance or storage
- **IPC** transport code
- **Product launcher** binary or supervisor
- **Dashboard buttons** / **TSX** wiring
- **`spawn`** / **`child_process`** in new bridge code
- **MT5** runtime, detection automation, or terminal launch
- **Watcher**, operational **DB**, **WebSocket live**, **polling**, **`localStorage`** action state
- **Real execution**, **trading**, **OrderSend**, **CTrade**, **command files**

---

## Document history

- **D9.7** — Transport safety test plan (**documentation only**): mandatory test categories, fixture policy, acceptance checklists before HTTP **`POST`** and before IPC, suggested future test filenames, sequence **D9.8+**; align post-D9.9 steps with [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md).
- **D9.15 cross-link** — Token/CSRF-specific test list: [`API_TOKEN_CSRF_DESIGN_D9.md`](./API_TOKEN_CSRF_DESIGN_D9.md) §11 (supplements §3.1 here).
