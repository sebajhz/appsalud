# Mapazapp — API Token / CSRF Design D9

**Checkpoint D9.15 — documentation only.** No application code changes, no real token issuance or verification, no CSRF middleware, no new routes, no **`POST`** action endpoints, no dashboard wiring, no launcher binary, no IPC, no **`spawn`** / **`child_process`**, no rate limiting, no idempotency/nonce implementation, no MT5 runtime, no watcher, DB, WebSocket live, polling, or **`localStorage`** transport state. No new dependencies. No **`git push`**.

**Related:** [`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) (**D9.9** — hardening sequence and gaps), [`LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md`](./LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md) (**D9.6** — minimum transport requirements), [`LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md`](./LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md) (**D9.7** — mandatory tests before transport), [`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`](./LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md) (**D9.1** — threats + mitigations), [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md) (D7.1). **Implemented baselines (no token yet):** loopback bind (**D9.12**), CORS allowlist (**D9.13**), body limits + **`safeErrorHandler`** (**D9.14.1**), log redaction + reserved header path for **`x-mapazapp-action-token`** in **`getApiLoggerRedactPaths()`** (**D9.14.2**).

---

## 1. Purpose

- The **`@workspace/api-server`** already has **loopback bind by default**, a **CORS allowlist**, **explicit body size limits**, a **global safe error handler**, and a **log redaction baseline** aligned with **D9.14.1** / **D9.14.2**.
- There are **still no** governed **`POST`** endpoints for **Mapazapp actions**; Mapazapp routes remain **`GET`**-only for product semantics.
- **Before** any future action **`POST`** transport ships, the project needs a **written contract** for a **local action token** and **CSRF-class posture** so implementers do not invent ad hoc secrets, cookies, or caller spoofing.
- **D9.15** records that design **only** — it does **not** implement verification middleware or issue tokens.
- Across current governance, **`executionEnabled` remains `false`** until an explicit separate product gate says otherwise; a transport token **does not** turn on trading or MT5 actions.

---

## 2. Current baseline

### Already exists

| Item | Notes |
|------|--------|
| API bind **`127.0.0.1`** by default | **D9.12** — reduces LAN exposure; misconfiguration still possible via env. |
| **CORS allowlist** | **D9.13** — no credentials; **`GET`/`HEAD`/`OPTIONS`** only at middleware level; preflight remains strict for browser origins. |
| **Body limits** | **D9.14.1** — **`maxBodyBytes`** on JSON + urlencoded parsers. |
| **Safe global error handler** | **D9.14.1** — **`413` / `400` / `500`** JSON without stack traces or raw **`Error.message`**. |
| **Log redaction baseline** | **D9.14.2** — **`sanitizeLogString`**, **`sanitizeLogValue`**, **`pino`** **`redact`** paths; **no** **`req.body`** in default serializers; **`x-mapazapp-action-token`** reserved for future redaction. |
| **`MapazappActionResult`** + **`assertActionResultSafety`** | **D7.2** — outward payloads must stay safe. |
| **`evaluateActionGate`** + policy | **D9.2** — caller classes, consent, transport flags. |
| **`dispatchLauncherAction`** (internal) | **D9.3** / **D9.4.1** — gates + **`validate_environment`** only; no HTTP entry. |
| **No Mapazapp action **`POST`** routes** | Mock/read-only **`GET`** only for Mapazapp router (**D9.6**, tests). |

### Does not exist yet

| Item | Notes |
|------|--------|
| **Real local action token** | No generation, storage, or verification in production code. |
| **CSRF middleware** | No double-submit cookie, no CSRF cookie pair for actions. |
| **Action **`POST`** endpoints** | Any mutating HTTP surface for **`dispatchLauncherAction`** remains unimplemented. |
| **Dashboard action buttons** | **`DashboardActionClient`** stub — **`not_available`** / **`blocked`** only (**D7.3**). |
| **Product launcher** | Dev scripts ≠ governed bridge (**D9.6**). |
| **IPC channel** for actions | Design-time only. |
| **Rate limit / cooldown** | Server layer absent (**D9.9** gap table). |
| **Idempotency / nonce** | Not implemented at HTTP boundary. |
| **MT5 runtime** automation | **D10+** gates only. |

---

## 3. Threats addressed (when token + posture are implemented)

A **correctly implemented** local action token (header-based, unguessable, launcher-mediated) together with existing **loopback + CORS + gates** is intended to mitigate:

- **Localhost abuse** — arbitrary sites should not trigger privileged actions against **`127.0.0.1`** without a secret the browser page does not possess by default.
- **Browser drive-by **`POST`**** — malicious pages that can reach loopback still lack the **token** if it is only injected into **launcher-controlled** or same-controlled-origin contexts.
- **CSRF-style requests** — cross-origin **`POST`** without token **fails closed** (once middleware exists); **CORS** alone does not prove CSRF safety for same-site or non-browser clients.
- **Accidental dashboard misconfiguration** — UI cannot “turn on” actions without a bridge that supplies the token; stub client stays **`not_available`** / **`blocked`** when no bridge.
- **Replay (basic)** — token verification is **not** full replay protection; pairing with **nonce / idempotency** (**D9.6** §4.7) is required later for sensitive transitions.
- **Unauthorized action from generic browser context** — raw **`callerSource: "launcher"`** must never be inferred from untrusted HTTP alone (**D9.6** §6).

---

## 4. Threats not fully addressed

- A **token does not replace** **CORS allowlist**, **loopback policy**, **`evaluateActionGate`**, **`assertActionResultSafety`**, or **rate limits**.
- A **token does not replace** **idempotency / nonce** for mutating actions — replay remains a risk until those layers exist.
- If a token **leaks** (logs, screenshots, copied env files), **all bets are off** — **D9.14.2** must keep tokens out of logs; operators must not paste secrets into issues or docs.
- A token **does not enable trading** or **execution**; **`executionEnabled`** and MT5 gates remain separate.
- A token **must not** unlock **MT5-class** or **trading_execution** actions before **D10** approvals (**D9.6**, **D9.7**).

---

## 5. Token principles

1. **No hardcoded token** in source, fixtures “happy paths”, or committed **`.env`** samples with real values.
2. **No token committed** to the repo; **no token in documentation** (this file uses placeholders only).
3. **No token in logs** — rely on **`pino`** **`redact`** + serializers that never echo the header value (**D9.14.2**).
4. **No token in URL query string** — reject or ignore query-carried secrets to avoid referrer/leak surfaces.
5. **No token in `localStorage`** — prefer ephemeral injection (e.g. memory / launcher-provided channel) over long-lived browser storage.
6. **Prefer HTTP header** for the secret — keeps semantics explicit and avoids cookie **`SameSite`** ambiguity for the first transport iteration.
7. **Generated locally** by a **future launcher** or **operator-controlled local process**, not by dashboard JS alone.
8. **Rotation / TTL** — design-time recommendation: short-lived or restart-scoped tokens unless a separate revocation story is approved.
9. **Scope** — token proves **intent to use action transport**, not **trading permission**; **`ActionResult`** safety and gates remain mandatory.
10. **`ActionResult` safety** — **`assertActionResultSafety`** on **every** outward action payload (**D9.6** §4.10).

---

## 6. Proposed header contract

**Conceptual header name** (align with redaction paths in **D9.14.2**):

```http
X-Mapazapp-Action-Token: <token>
```

**Rules:**

| Rule | Detail |
|------|--------|
| **Scope** | Required **only** for **future** **`POST`** / mutating **action** endpoints — **not** for current read-only **`GET`** routes unless a later gate explicitly requires it. |
| **Query string** | **Must not** be accepted — reject **`401`** / **`400`** with safe JSON (exact status mapping is implementation detail). |
| **Logging** | Header must **not** appear in log lines or previews; **`getApiLoggerRedactPaths()`** already lists **`req.headers["x-mapazapp-action-token"]`**. |
| **Missing token** | **`401`** with stable error contract (see §10). |
| **Invalid token** | **`403`** (forbidden) vs **`401`** (not authenticated) — **either** is acceptable if documented consistently; default recommendation: **`401`** for “no/malformed”, **`403`** for “present but not authorized”. |
| **Errors** | Use **`safeErrorHandler`** patterns — **no** stack, **no** raw exception message, **no** token echo (**D9.14.1**). |

---

## 7. CSRF posture

- **CORS is necessary but not sufficient** — it controls browser **`Origin`** visibility, not every malicious same-site or non-browser scenario.
- A **custom header** carrying a secret reduces **simple CSRF** (naïve form **`POST`** from another site) because the attacker cannot read the token from another origin under default cross-origin rules **when** the token is not exposed to JS on untrusted pages.
- **No cookie/session-based action transport** in the first iteration — avoids **`SameSite`** complexity and accidental credential **`POST`** widening.
- If **cookies** are introduced later for any reason, a **separate CSRF token** (or strict **`SameSite`** + explicit threat model) becomes **mandatory**.
- **Preflight** (**`OPTIONS`**) must remain **strict** per allowlist — unusual methods or headers on action routes should not bypass CORS policy.
- Requests **without** a valid token **must not** call **`dispatchLauncherAction`** (once HTTP transport exists).

---

## 8. Launcher relationship

- The **future launcher** is the **natural issuer** of the local token (generate on start, pass to trusted consumers).
- The launcher may **inject** the token into a **dashboard instance it launched** (e.g. env + dev server, or documented secure channel) — exact mechanism is **out of scope** for **D9.15**.
- The **dashboard must not invent** the token; without launcher/config bridge, **`actionClient`** continues **`not_available`** / **`blocked`** (**D7.3**).
- A **random external browser** must not learn the token — avoid broad **`Access-Control-Allow-Origin: *`**, avoid token-in-URL, avoid exposing token to third-party scripts on the same page.
- **Token lifecycle** (create, rotate, revoke) is **owned by launcher/runtime policy**, not the mock API repo alone.
- **No launcher / no token** ⇒ **no action transport** — HTTP handlers return **`not_available`** / **`blocked`** equivalents at the envelope layer once implemented.

---

## 9. Gate integration

**Future conceptual pipeline** (HTTP or launcher-proxy):

```
HTTP / IPC request
  → verify token + caller authorization at transport boundary
  → validate JSON schema (action body)
  → evaluateActionGate
  → dispatchLauncherAction (only if gate allows)
  → assertActionResultSafety
  → safe JSON response
```

**Rules:**

- **Valid token does not skip **`evaluateActionGate`** — policy still blocks **`dashboard`**-originated **`validate_environment`** unless remapped per **D9.6** §6.
- **Gates do not replace token** — both must pass where the contract requires both.
- **`callerSource`** is **never** promoted to **`launcher`** automatically from raw browser requests (**D9.6** §6.2).
- **No **`POST`** trading / execution** — **`trading_execution`** remains forbidden in the gate model.

---

## 10. Error contract

**Conceptual JSON** for transport failures at the HTTP boundary (exact envelope may wrap **`MapazappActionResult`** later — **D9.6** §8):

**Missing token:**

```json
{
  "ok": false,
  "error": {
    "code": "ACTION_TOKEN_REQUIRED",
    "message": "Action token is required."
  }
}
```

**Invalid / unauthorized token:**

```json
{
  "ok": false,
  "error": {
    "code": "ACTION_TOKEN_INVALID",
    "message": "Action token is invalid."
  }
}
```

**Requirements:**

- **No** stack traces or **`err.stack`** strings.
- **No** echo of the submitted token or internal secrets.
- **No** private filesystem paths in messages (**D7.2**, **D9.4.1** patterns).

---

## 11. Testing requirements before implementation

Before merging **real** token verification + action **`POST`**, automated tests should prove at minimum:

- **Missing token** ⇒ rejected (**`401`** or agreed contract).
- **Invalid token** ⇒ rejected (**`401`** / **`403`** per §6).
- **Token supplied only in query string** ⇒ rejected (**never** treated as valid).
- **Token header redacted** from structured logs / snapshots (extends **D9.14.2** tests).
- **Action endpoint without token** ⇒ **does not** invoke **`dispatchLauncherAction`**.
- **Valid token + blocked gate** ⇒ **`blocked`** / safe **`ActionResult`** — still **`assertActionResultSafety`**.
- **Valid token + allowed gate** ⇒ dispatcher path only when full transport PR scope allows (still **no** MT5 / trading).
- **No token** substring in HTTP JSON responses or **`logsPreview`** fields.
- **CORS denied origin** ⇒ browser cannot complete preflight; **even with** a leaked token in non-browser clients, **combine** with bind + firewall posture (**defense in depth** — tests focus on API behavior).
- **`GET /api/mapazapp/runtime/status`** remains **read-only** and unchanged by token requirement unless explicitly decided otherwise.

Detailed categories overlap **D9.7** §3.1 — **`API_TOKEN_CSRF_DESIGN_D9`** §11 is the **token/CSRF-specific** supplement.

---

## 12. Recommended sequence

| Step | Checkpoint | Intent |
|------|------------|--------|
| **D9.15** | **Token / CSRF design** (this doc) — **docs only** | Single reference for header, threats, launcher, gates, errors, tests. |
| **D9.16** | **Token / CSRF config model** — pure TS types + env parsing in **`api-server`** — **no middleware**, **no `app.ts`** change | Align with **`ApiHardeningConfig`** / successor fields (**`MAPAZAPP_ACTION_TOKEN_REQUIRED`** etc. — **D9.9** §5). |
| **D9.17** | **Token verification middleware skeleton** — wiring allowed — **still no Mapazapp action **`POST`** route** | Validates header only on opted-in routes (none at first) or a **`HEAD`** health probe if needed for CI. |
| **D9.18** | **Token tests + redaction integration** — **no action **`POST`** | Negative tests for missing/invalid/query token; logger snapshots. |
| **Next** | **Action transport PR** + **D9.7** skeleton filenames | **`POST`** only when **D9.6** / **D9.7** acceptance criteria met. |
| **D10.0** | **MT5 detection gate audit** | As in roadmap — **no** MT5 actions before approvals. |

**Rationale:** **Design docs** (**D9.15**) precede **config types** (**D9.16**) so env names and semantics stay stable; **middleware skeleton** (**D9.17**) without **`POST`** avoids shipping a privileged surface before tests (**D9.18**) exist. This **replaces** the older shorthand “**D9.15 = design + optional types in one step**” from early **D9.9** drafts — types move to **D9.16** explicitly.

[`API_HARDENING_PLAN_D9.md`](./API_HARDENING_PLAN_D9.md) §6 should stay aligned with this table (including renumbering of later transport-skeleton checkpoints if needed).

---

## 14. Implementation baseline (D9.16–D9.18)

**Shipped in repo (still non-operational for actions):**

- **`APP/artifacts/api-server/src/config/apiActionTokenConfig.ts`** (+ **`apiActionTokenConfig.d9.test.ts`**) — policy model, env parsing from a bag (**never** reads a shared secret), **`validateApiActionTokenConfig`**.
- **`APP/artifacts/api-server/src/middleware/actionTokenMiddleware.ts`** (+ **`actionTokenMiddleware.d9.test.ts`**) — **`createActionTokenMiddleware`**; verified only inside **test-only** Express apps — **`app.ts`** does **not** mount this middleware; **no** launcher-side action orchestration, **no** cookie auth.
- **`logRedaction.ts`** — additional scrubbing for **`x-mapazapp-action-token`** header/query-shaped fragments; covered by **`logRedaction.d9.test.ts`**.

**Still pending:** real token issuance/rotation, wiring **`getExpectedToken`** to launcher/runtime, Mapazapp **action** **`POST`** routes, rate limit, idempotency — see **D9.19**+ / transport PRs.

---

## 13. Explicit non-goals (D9.15)

D9.15 **does not** implement or authorize implementation of:

- Real **token** issuance, persistence, or verification  
- **CSRF** middleware or cookie pairs  
- **`app.ts`** / **`index.ts`** edits  
- New **endpoints**, **`POST`** routes, or Mapazapp router changes  
- **Dashboard** UI, **buttons**, **TSX**  
- **Launcher** binary, **IPC**, **`spawn`**, **`child_process`**  
- **Rate limit**, **idempotency**, **nonce**  
- **MT5**, **watcher**, **DB**, **WebSocket live**, **polling**, **`localStorage`** transport  
- **Trading / execution**  
- **New dependencies** or **`git push`**

---

## Document history

- **D9.15** — API token / CSRF design (**documentation only**): purpose, baseline, threats, principles, **`X-Mapazapp-Action-Token`** header contract, CSRF posture, launcher relationship, gate pipeline, error JSON, test obligations, recommended **D9.16**–**D9.18** sequence.
- **D9.16–D9.18** — Config model + unwired middleware skeleton + tests/redaction (**§14**); **no** product action endpoints.
