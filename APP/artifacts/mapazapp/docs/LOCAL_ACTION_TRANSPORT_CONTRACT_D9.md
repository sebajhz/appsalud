# Mapazapp — Local Action Transport Contract D9

**Checkpoint D9.6 — documentation only.** No `POST` action endpoints, no HTTP action transport implementation, no IPC implementation, no dashboard operational buttons, no product launcher executable, no MT5 runtime automation, no folder watchers, no operational database, no WebSocket live feeds, no polling loop for actions, no `localStorage` action state, no `spawn`, no `child_process`, no real execution or trading.

**Related:** [`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`](./LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md) (**D9.1** — threats + mandatory mitigations), [`LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md`](./LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md) (**D9.7** — safety test plan before transport — **docs only**), [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) (**D9.9** — API hardening **plan** before changing server code — **docs only**), [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md) (D7.1 — bridge roles), [`LAUNCHER_PROTOTYPE_DESIGN_D8.md`](./LAUNCHER_PROTOTYPE_DESIGN_D8.md) (D8.1 — launcher-side bridge intent), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Purpose

- Mapazapp **already has** shared **`evaluateActionGate`** / **`MapazappActionGatePolicy`** (**D9.2**), **`MapazappActionResult`** + **`assertActionResultSafety`** (**D7.2**), the internal **`dispatchLauncherAction`** (**D9.3**, hardened **D9.4.1**), and the read-only **`runLauncherValidateEnvironmentPreflight`** bridge (**D8.3**) — all **without** any governed network transport for actions.
- There is **still no** implementation of a **local action transport** (HTTP `POST`, launcher IPC channel, or equivalent) that exposes those capabilities to the browser or to untrusted callers.
- **D9.6** defines the **formal contract** that **any future transport** (HTTP on loopback, launcher IPC, or hybrid) **must satisfy before implementation is approved**, aligning with **D9.1** mitigations and **D9.5** audit conclusions.
- **No `POST`** is implemented in **D9.6**. **No IPC** is implemented in **D9.6**. **No dashboard buttons** are implemented in **D9.6**.
- Across all phases described in current governance docs, **`executionEnabled` remains `false`** until an explicit, separate product gate says otherwise.

---

## 2. Current baseline

### Already exists

| Building block | Role |
|----------------|------|
| `GET /api/mapazapp/runtime/status` | Read-only API snapshot; conservative semantics; no live MT5/bridge probes (**D5.1b**) |
| `RuntimeStatusPanel` / container on `ConfigPage` | Presentational read-only panel; one-shot load (**D6.x**) |
| `DashboardActionClient` stub (`actionClient.ts`) | **`not_available`** / **`blocked`** only; **no** `fetch`, **no** `POST` (**D7.3**) |
| `MapazappActionResult` + `assertActionResultSafety` | Structured action results + safety scanning (**D7.2**) |
| `evaluateActionGate` + gate definitions + policy | Caller allowlists, action classes, transport/consent flags (**D9.2**) |
| `dispatchLauncherAction` | Internal async dispatcher: gates + **only** **`validate_environment`** → D8.3 preflight; hardened error paths (**D9.3** / **D9.4.1**) |
| `runLauncherValidateEnvironmentPreflight` | Read-only dev preflight wrapped as launcher-side **`ActionResult`** (**D8.3**) |

### Does not exist yet

| Gap | Notes |
|-----|--------|
| **`POST`** action endpoints | Explicitly out of scope until transport satisfies this contract + **D9.1** |
| HTTP transport **for actions** | Read-only `GET` exists; **no** mutating action route |
| IPC **launcher-side** channel | Design-only until launcher product exists |
| Product **launcher** executable | Dev scripts (`mapazapp:dev-start`) ≠ governed bridge |
| Dashboard **operational buttons** for actions | Stub client only |
| **Auth / local token** policy for actions | Must be specified before transport code |
| **Rate limit / cooldown** for actions | Required before transport (**D9.1** §6) |
| **Idempotency / nonce** scheme | Required for sensitive transitions before transport |
| **Transport logging / redaction** policy implemented | Required before transport |
| **CORS** restricted specifically for action routes | Current API uses permissive defaults — **not** sufficient alone for actions (**D9.5**) |
| **Bind-to-loopback** enforcement for action listeners | Must be explicit before action transport (**D9.1** §6.1) |
| MT5 runtime automation | **D10+** gates |

---

## 3. Transport options

### 3.1 HTTP local `127.0.0.1`

**Pros:**

- Natural fit for a dashboard that already consumes **`GET`** via `runtimeStatusDataSource`.
- Straightforward to exercise in automated tests (**supertest** / HTTP client) once implemented.

**Cons:**

- **Localhost abuse** and **CSRF-style drive-by** requests if **CORS**, **Origin**, and **token** policies are weak (**D9.1** §5.1).
- Any browser-tab context that can reach the listener may attempt **replay / flooding** (**D9.1** §5.2).
- Must **not** bind action listeners to **`0.0.0.0`** without a separate approved threat model (**D9.1** §6.1).

### 3.2 IPC launcher-side

**Pros:**

- Reduces direct **browser → privileged primitive** exposure; desktop **launcher** becomes the trust anchor.
- Aligns with **process ownership** (start/stop **only** launcher children) (**D9.1** §5.5).

**Cons:**

- Depends on launcher technology stack and lifecycle (single instance, updates, permissions).
- Contract + tests are **harder** until IPC boundaries are fixed — still required before shipping.

### 3.3 Internal dispatcher only

**Pros:**

- **Highest safety today** — **no** new network surface; **`dispatchLauncherAction`** already integrates **D9.2** + **D8.3** (**D9.3** / **D9.4.1**).

**Cons:**

- Does **not** integrate browser UX; remains a **building block** until a transport exists.

### 3.4 File-based control

**Not recommended** for action triggering.

**Risks:** command-file races, accidental writes toward MT5 or shell consumption, path leakage, ambiguous ownership (**D9.1** §5.3 / §5.8).

### 3.5 WebSocket local

**Not recommended** as the **first** transport.

**Risks:** larger **persistent** attack surface, **session/auth** complexity, unnecessary for **`validate_environment`**-class read-only preflight (**D9.5**).

---

## 4. Minimum HTTP action transport requirements

Before **any** future **`POST`** (or mutating HTTP method) for **Mapazapp actions**, **all** of the following must be **designed, approved, and implemented** (this list extends **D9.1** §6 for HTTP-specific concerns):

| # | Requirement |
|---|-------------|
| 1 | **Bind** action listener explicitly to **`127.0.0.1`** (or stricter loopback policy) — **not** `0.0.0.0` by default. |
| 2 | **CORS** strict: **no** wildcard origins for action routes; explicit **allowlist**; justify credentials if ever used. |
| 3 | **Local secret / CSRF token** (or equivalent) — unguessable; patterns that block **cross-site drive-by** (**D9.1** §6.3). |
| 4 | **`MapazappActionId` allowlist** at the HTTP boundary — reject unknown IDs. |
| 5 | **JSON schema validation** for body — types, bounds; **no** arbitrary paths without consent/staging policy. |
| 6 | **Rate limits / cooldowns** per action class and per client identity where identifiable (**D9.1** §6.9). |
| 7 | **Idempotency key / nonce** for sensitive transitions (start/stop-class) (**D9.1** §6.10). |
| 8 | **Max payload size** and **per-action timeout**. |
| 9 | **Sanitized logs** — no stack traces, private paths, raw CSV, broker/account tokens in responses or logs (**D9.1** §6.11 / §5.8). |
| 10 | **`assertActionResultSafety`** on **every** outward **`MapazappActionResult`** (**D9.1** §6.12). |
| 11 | **`evaluateActionGate`** **before** dispatch; **`dispatchLauncherAction`** only in **authorized** caller/policy context (**§6** below). |
| 12 | **No trading / execution** endpoints; **no** `OrderSend` / `CTrade` / command-file pathways (**D9.1** §6.15–16). |
| 13 | **No MT5 action execution** before **D10** gates documented and approved. |

**Why `POST` is not implemented in D9.6:** these prerequisites are **not yet implemented** as a governed bundle; shipping **`POST`** prematurely would violate **D9.1** and the **D9.5** audit posture.

---

## 5. Minimum IPC launcher-side requirements

Before **any** real IPC **for actions**:

| # | Requirement |
|---|-------------|
| 1 | **Launcher identity** — channel authenticated between trusted peers (OS user/session policy TBD per launcher design). |
| 2 | **Caller authorization** — IPC client cannot impersonate arbitrary roles without verification. |
| 3 | **Action allowlist** — same conceptual boundary as HTTP: known **`MapazappActionId`** only. |
| 4 | **Schema validation** — fixed message shapes; **no** arbitrary shell argv or path strings from UI. |
| 5 | **No arbitrary commands** — fixed audited helper shapes only (**D9.1** §6.6–7). |
| 6 | **Process ownership** — **stop** only **launcher-owned** children (**D9.1** §6.14). |
| 7 | **Sanitized logs** + bounded diagnostics. |
| 8 | **`MapazappActionResult`** safe by construction — **`assertActionResultSafety`** before exposing outward. |
| 9 | **Honest runtime status** — no fake “connected / ready to trade” semantics (**D9.1** §5.6). |
| 10 | **No MT5 automation** before **D10** approvals. |

---

## 6. Caller remapping rules

### 6.1 Problem

**D9.2** defines **`validate_environment`** as **`read_only_preflight`** with **`allowedCallerSources`: `launcher` and `script` only** — **not** **`dashboard`** or **`api`**. A naïve HTTP handler that sets `callerSource: "api"` or `"dashboard"` **cannot** legitimately obtain **`allowed: true`** for **`validate_environment`** without either:

- **violating** the gate contract, or  
- **re-mapping** the trust boundary incorrectly.

### 6.2 Rules

1. **Browser / dashboard never becomes `launcher` implicitly** — assigning **`callerSource: "launcher"`** based solely on a browser request is **forbidden** unless an **explicit, audited trust mechanism** proves the request originated from the **launcher-owned bridge** (not generic browser JS).
2. **Authorized patterns** for future UX include (non-exhaustive):  
   - **Launcher HTTP / IPC** that evaluates gates with **`callerSource: "launcher"`** after local auth.  
   - **Desktop helper** invokes **`dispatchLauncherAction`** in-process (**caller `launcher` / `script`**).  
   - **Read-only status** continues via **`GET`** + existing panel — **not** an action `POST`.
3. **`evaluateActionGate`** remains the **first** gate stage at any transport boundary; **`dispatchLauncherAction`** is the **internal** orchestration entry that already composes gates + **`validate_environment`** execution (**D9.3**).
4. A future **API transport** may act as **read-only status provider**, **token-gated relay**, or **launcher proxy** — each variant must be **named**, **threat-modeled**, and **tested**; **no silent caller spoofing**.

---

## 7. Transport request contract proposal

**Conceptual JSON only — not implemented.**

```json
{
  "actionId": "validate_environment",
  "requestId": "uuid-or-nonce",
  "clientTime": "2026-05-10T12:00:00.000Z",
  "params": {},
  "confirmation": false
}
```

| Rule | Detail |
|------|--------|
| **`actionId`** | Must be on **`MAPAZAPP_ACTION_IDS`** allowlist (**D7.2** / **D9.2**). |
| **`params`** | **Per-action schema**; **no** arbitrary filesystem paths; file actions require **consent / picker / staging** policy. |
| **`requestId`** | Supports **idempotency / replay detection** for mutating or expensive actions. |
| **`confirmation`** | **`true`** when **`evaluateActionGate`** requires **`hasUserConfirmation`** (e.g. process lifecycle, logs, MT5-class). |
| **`validate_environment`** | No file consent; still requires **correct caller context** per **§6** — **not** raw browser default. |
| **`validate_csv`** | Requires **file consent** + transport gate + policy (**D9.2**). |
| **`start_mapazapp_dev` / `stop_mapazapp`** | Launcher-class; **confirmation** + launcher availability + policy — **not** browser-direct. |
| **MT5-class actions** | **Blocked** until **D10** checkpoints documented and approved. |

---

## 8. Transport response contract proposal

Responses must carry a safe **`MapazappActionResult`** (embedded or as the sole payload). Existing **`GET`** envelopes use **`mockOnly`**, **`reviewOnly`**, **`executionEnabled`** flags — future action responses must remain **consistent** with conservative semantics (**no** `executionEnabled: true` from this bridge).

**Conceptual JSON only — not implemented.**

```json
{
  "ok": false,
  "source": "local_action_transport",
  "mockOnly": false,
  "readOnly": true,
  "executionEnabled": false,
  "actionResult": {
    "ok": false,
    "actionId": "validate_environment",
    "status": "not_available",
    "message": "Controlled summary text only.",
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
    "errors": [],
    "generatedAt": "2026-05-10T12:00:00.000Z"
  }
}
```

| Rule | Detail |
|------|--------|
| **No stack traces** | Never return raw exception strings / stacks to clients. |
| **No private paths** | Align with **`assertActionResultSafety`** substring governance (**D7.2**). |
| **No unsafe flags** | **`assertActionResultSafety`** mandatory before send. |
| **Stable error codes** | Transport may map gate/`ActionResult` statuses to stable **`errors[].code`** (design-time choice). |

---

## 9. Action class transport policy

| Action class (`MapazappActionGateDefinition`) | Current transport posture | Future HTTP allowed? | Future IPC allowed? | Required gates / notes |
|-----------------------------------------------|-------------------------|--------------------|---------------------|-------------------------|
| **`read_only_status`** | **`GET /runtime/status`** + panel | **Yes** — already **GET**-only; **no** `POST` required | **Yes** — snapshot relay | Default read-only policy (**D9.2**) |
| **`read_only_preflight`** (`validate_environment`) | **Internal** `dispatchLauncherAction` + **D8.3** only | **Only** with **§4** + **§6** satisfied; **not** browser-direct caller spoofing | **Preferred** path via launcher | **`evaluateActionGate`** + **`dispatchLauncherAction`** |
| **`file_validation`** | CLI / future staged bridge | **Only** with transport gate + **file consent** + path policy | **Yes** under same policy | **D9.2** file consent flags |
| **`process_lifecycle`** | **Blocked** from browser stub | **No** direct browser `POST`; launcher-owned only | **Launcher-only** | User confirmation + launcher availability (**D9.2**) |
| **`logs`** | Not implemented | **No** raw path exposure to browser | **Launcher-mediated** | Confirmation + transport policy (**D9.2**) |
| **`mt5_config`** | **D10+** | **No** before **D10.0** audit | **No** before **D10.0** | MT5 policy gates (**D9.1** §7) |
| **`mt5_launch`** | **D10+** | **No** before **D10.2** design approval | **Launcher-only** future | Explicit consent (**D9.1** §7) |
| **`trading_execution`** | **Forbidden** in gate model | **Never** | **Never** | Out of product scope for this bridge |

**Hard rule:** **`trading_execution`: never** via this local bridge.

---

## 10. Error handling policy

| Policy | Detail |
|--------|--------|
| **Controlled errors** | Map failures to **`MapazappActionResult`** **`blocked` / `error` / `not_available`** with safe messages. |
| **No raw exceptions** | Align with **D9.4.1** dispatcher hardening — transport must not leak stacks (**D9.1** §5.8). |
| **No param echo** | Request **`params`** must not be reflected verbatim into messages/logs if they can contain paths or secrets. |
| **Stable codes** | Prefer **`errors[]`** with stable **`code`** + short **`message`** for UI/logging. |
| **Unsafe downstream payload** | Replace with **safe** `ActionResult` — never forward **`assertActionResultSafety`** failures raw to clients. |
| **Process isolation** | A single bad action must **not** tear down unrelated API routes unless explicitly specified (future design). |

---

## 11. Testing requirements before transport code

### 11.1 If HTTP action transport is implemented later

- **Reject** unknown **`actionId`**.  
- **Reject** requests **without valid token / CSRF mitigations** (per chosen design).  
- **CORS** rejects unapproved **Origin** for action routes.  
- **Schema** rejects unknown **`params`** keys / oversized payloads.  
- **Rate limit / cooldown** tests (unit + integration).  
- **Idempotency / replay** tests for sensitive IDs.  
- **`assertActionResultSafety`** on **every** serialized action response.  
- **Static / snapshot tests** — **no** banned privacy substrings, **no** `executionEnabled: true`, **no** trading language (**D7.2** / **D9.2** patterns).  
- **No `POST`** for **`trading_execution`**.  
- **Tests do not require** dashboard buttons — service-layer tests suffice initially.

### 11.2 If IPC is implemented later

- **Caller identity / auth** negative tests.  
- **Allowlist** enforcement tests.  
- **No arbitrary argv / shell** tests.  
- **Process ownership** tests for stop/lifecycle classes.  
- **Safe `ActionResult`** round-trip tests.

---

## 12. Recommended next sequence

| Step | Checkpoint | Intent |
|------|------------|--------|
| **D9.6** | **Transport contract (this doc)** — **docs only** | Formal requirements before any transport code |
| **D9.7** | Transport **safety test plan** — [`LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md`](./LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md) — **docs only**; **no** TS tests here | Acceptance criteria + mandatory test categories before transport PRs |
| **D9.8** | Optional **API hardening audit** (bind / CORS / headers) — **still no action `POST`** | Baseline server posture reviewed (**audit can be docs-only / no repo edits**) |
| **D9.9** | API **hardening plan** — [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) — **docs only**; **no** `app.ts` / CORS / bind changes here | Sequences **D9.10+** (config model → tests → bind → CORS → errors → token design → transport test skeletons) before action **`POST`** |
| **D10.0** | MT5 **detection** gate audit — **docs + policy** | Before MT5 probes |
| **D10.1** | MT5 **config validator** model — **no launch** | Path/presence policy only |
| **D10.2** | Optional **`open_mt5`** design — **launcher-only**, explicit consent | No implementation until approved |

**Rationale:** **D9.7** ([`LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md`](./LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md)) separates **test obligations** from **D9.6** contract prose so implementers can open a PR with a checklist. **D9.8** addresses **baseline HTTP posture** (audit). **D9.9** ([`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md)) turns audit conclusions into an **ordered implementation plan** without changing code in D9.9. Sequence remains **guidance** — explicit approval required before coding each step.

---

## 13. Explicit non-goals (D9.6)

D9.6 **does not** implement or authorize implementation of:

- **`POST`** action routes or generic “run command” APIs  
- **IPC** transport code  
- Product **launcher** binary  
- Dashboard **buttons** / **TSX** wiring for operational actions  
- **`spawn`** / **`child_process`** in new bridge code  
- **MT5** runtime, detection automation, or launch  
- **Watcher**, operational **DB**, **WebSocket live**, **polling**, **`localStorage`** action state  
- **Execution**, **trading**, **OrderSend**, **CTrade**, **command files**  
- Treating **`pnpm mapazapp:dev-start`** as the governed product bridge  

---

## Document history

- **D9.6** — Transport contract (**documentation only**): HTTP loopback + IPC minimums, caller remapping, conceptual envelopes, action-class policy, testing obligations, recommended **D9.7** ([`LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md`](./LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md)) / **D9.8** / **D9.9** ([`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md)) / **D10.x** sequence.
