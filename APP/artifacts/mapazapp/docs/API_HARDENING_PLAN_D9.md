# Mapazapp — API Hardening Plan D9

**Checkpoint D9.9 — documentation only.** No changes to `app.ts`, `index.ts`, routes, CORS, bind/listen, token/auth, CSRF, rate limits, body parsers, new endpoints, **`POST`** action routes, dashboard UI, launcher, **`spawn`**, **`child_process`**, MT5 runtime, watcher, DB, WebSocket live, polling, **`localStorage`**, or real execution. No new dependencies.

**Related:** [`LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md`](./LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md) (**D9.6** — HTTP minimums before action transport), [`LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md`](./LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md) (**D9.7** — safety tests before transport), [`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`](./LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md) (**D9.1** — threats + mitigations). **D9.8** (audit) informed this plan but left **no** repo edits.

---

## 1. Purpose

- **D9.8** reviewed the current **`@workspace/api-server`** stack (Express, `cors()`, `listen(port)` without host, no auth/token, no CSRF, no rate limit, Mapazapp **`GET`** only, etc.) — **audit only**.
- **D9.9** records the **formal API hardening plan** that must be **executed in approved future checkpoints** before any **local action transport** or **`POST`** action endpoint ships.
- **This checkpoint does not implement hardening** — no API code, no config wiring, no behavior change.
- **No** CORS, bind, or token changes are made **in D9.9**.
- There is **still no** governed HTTP transport for **`dispatchLauncherAction`** / action IDs.
- Across all phases described in current governance docs, **`executionEnabled` remains `false`** until an explicit, separate product gate says otherwise.

---

## 2. Current API baseline

Observed from **`APP/artifacts/api-server`** (see **D9.8**):

| Topic | State |
|-------|--------|
| Framework | **Express** (`express()`), router mounted at **`/api`** (`app.ts` → `routes/index.ts`). |
| Logging | **`pino-http`** enabled with trimmed serializers (method, URL path, status). |
| CORS | **`app.use(cors())`** — **no** origin allowlist or credentials policy in code. |
| Body parsers | **`express.json()`** and **`express.urlencoded({ extended: true })`** applied **globally**; **no** explicit `limit` in application code. |
| Listen | **`D9.12`:** **`app.listen(port, host, …)`** in **`index.ts`** via **`createApiHardeningConfigFromEnv` / `validateApiHardeningConfig`** — default host **`127.0.0.1`**, default port **`3001`** if **`MAPAZAPP_API_PORT`** and **`PORT`** are unset. (**`0.0.0.0`** still discouraged; optional warning when used.) |
| Auth / token | **None** for Mapazapp routes. |
| CSRF | **None**. |
| Rate limit / cooldown | **None** at server layer. |
| Global error handler | **No** explicit Express `(err, req, res, next)` middleware documented in `app.ts`. |
| Security headers | **No** dedicated middleware (e.g. Helmet) in `app.ts`. |
| Mapazapp routes | **`router.get(...)` only** in `mapazapp/routes.ts`; **`POST`** to Mapazapp paths returns **404/405** (covered by tests). |
| `cookie-parser` | Listed in **`package.json`**; **not** wired in `app.ts` at baseline. |

**Read-only GET** mock semantics (envelope flags, no operational **`POST`**) remain the **current contract** for existing routes.

---

## 3. Gap table

| # | Area | Current state | Required before local action transport | Gap | Risk | Suggested checkpoint |
|---|------|---------------|----------------------------------------|-----|------|----------------------|
| 1 | Host / bind | **`D9.12` done:** explicit **`listen(port, host)`**; default **`127.0.0.1`** | Same loopback policy must hold when action transport ships — **D9.6** §4.1 / **D9.1** §6.1 | Optional **`0.0.0.0`** still broadens LAN exposure if set | LAN exposure if misconfigured | **D9.12** closed; revisit with transport (**D9.16**+) |
| 2 | CORS | Permissive `cors()` | Strict allowlist for **action** routes; **no** `*` — **D9.6** §4.2 | Open CORS defaults | CSRF-style abuse combined with future **`POST`** | **D9.13** |
| 3 | Auth / local token | None | Unguessable transport secret / capability — **D9.6** §4.3 | No token model | Drive-by requests to localhost | **D9.15** design; implement with transport |
| 4 | CSRF | None | CSRF token or equivalent for browser-reachable actions — **D9.1** §6.3 | No mitigation | Cross-site triggering | **D9.15** + transport PR |
| 5 | Body schema validation | N/A (no action body yet) | Per-**`actionId`** JSON schema at HTTP boundary — **D9.6** §4.5 | Not wired | Injection / arbitrary paths / commands | Action transport PR |
| 6 | Body size limit | Express defaults only | Explicit **max** for action routes — **D9.6** §4.8 | Implicit limits only | DoS via large bodies | **D9.14** baseline |
| 7 | Rate limit / cooldown | None | Per-class / per-identity limits — **D9.6** §4.6 | Absent | Flood / retry storms | Transport + **D9.14**/policy |
| 8 | Idempotency / nonce | None | Nonces for sensitive transitions — **D9.6** §4.7 | Absent | Duplicate side-effects | Transport PR |
| 9 | Error handling | No global handler | Map errors to **safe** JSON; **no** stack traces to clients — **D9.1** §5.8 | Uncaught errors → default Express behavior | Stack / detail leakage | **D9.14** |
| 10 | Safe response envelope | Mock `okResponse` / `errResponse` for **`GET`** | Same discipline for action **`POST`**; flags stay conservative | New routes must not regress envelope | Unsafe flags / misleading **`ok`** | Transport PR + tests |
| 11 | ActionResult safety validation | Not on HTTP layer | **`assertActionResultSafety`** on every outward **`MapazappActionResult`** — **D9.6** §4.10 | Core helpers exist; HTTP not integrated | Unsafe payloads | Transport PR |
| 12 | Private path redaction | Partial test coverage on select **`GET`** | Extend to new routes + logs — **D9.7** §3.6 | Policy not centralized | PII / path exfiltration | **D9.14** + transport tests |
| 13 | POST route policy | No **`router.post`** in Mapazapp router | Explicit policy: **no** action **`POST`** until gates + hardening; allowlist only | Today “safe by absence”; future PRs need gate | “Escape hatch” endpoints | Doc + review checklist (**this doc**, **D9.6**) |
| 14 | Tests | **`GET`** envelope + **no operational POST** + **D9.12** listen config tests | CORS, token, body limit, error handler tests — **D9.7** §8 | Strict CORS / transport tests still pending | Regressions undetected | **D9.11**–**D9.12** baseline → strengthen as code lands |
| 15 | Dev/prod separation | Weak explicit split | Documented env profiles; mock dev vs hardened transport mode | Ad-hoc **`NODE_ENV`** usage | Misconfigured prod-like exposure | **D9.10** model + README |
| 16 | Logging | `pino-http` basics | Redaction policy for secrets/paths — **D9.6** §4.9 | No redactor config | Secrets in logs | **D9.14** |
| 17 | Security headers | None specific | Baseline headers (CSP/HSTS etc.) **where appropriate** for local mock — **justify** per surface | No Helmet-style baseline | Clickjacking / MIME sniffing (lower on localhost, still worth design) | **D9.14** (optional subset) |

---

## 4. Proposed hardening principles

1. **No action `POST`** until this plan’s **implementation checkpoints** are approved and **`evaluateActionGate`** + transport contract (**D9.6** §6) are satisfied.
2. **Read-only `GET`** paths may remain **conceptually separate** from **action transport** (different middleware stack or stricter layering for mutating routes).
3. **Local action endpoints** MUST bind to **`127.0.0.1`** or a **documented loopback-only** policy — not **`0.0.0.0`** by default (**D9.6**, **D9.1**).
4. **No wildcard CORS** for **action** routes; explicit **allowlist**; justify **credentials** if ever used.
5. **Token / CSRF-class mitigation** MUST exist before browser-reachable **action** **`POST`** (**D9.1** §6.3).
6. **`evaluateActionGate`** MUST run at the transport boundary before dispatch (**D9.6** §4.11).
7. **`dispatchLauncherAction`** ONLY behind a **trusted bridge** (launcher / scripted agent) — **no** silent **`callerSource: "launcher"`** from raw browser requests (**D9.6** §6).
8. **`assertActionResultSafety`** on **every** serialized **`MapazappActionResult`** exposed outward (**D9.6** §4.10).
9. **No private paths** in responses or **`logsPreview`**; align with **`assertActionResultSafety`** rules (**D7.2**).
10. **No raw CSV** or account/broker rows in API responses/logs unless an explicit later design approves it.
11. **No trading / execution** endpoints; **no** `OrderSend` / **`CTrade`** / command-file pathways (**D9.6** §4.12–13).
12. **No MT5 actions** before **D10** gates (**D9.6**, **D9.7**).

---

## 5. Proposed environment / config contract

**Conceptual only — not implemented in D9.9.** Final names may change. **Never** commit real secrets.

| Variable (proposed) | Role |
|---------------------|------|
| `MAPAZAPP_API_HOST` | e.g. **`127.0.0.1`** — bind address for the API process. |
| `MAPAZAPP_API_PORT` or `PORT` | Listen port (**`MAPAZAPP_API_PORT`** wins; default **3001** if both unset — **D9.12**). |
| `MAPAZAPP_API_ALLOWED_ORIGINS` | Comma-separated allowlist, e.g. `http://127.0.0.1:5173,http://localhost:5173` for Vite dev. |
| `MAPAZAPP_ACTION_TRANSPORT_ENABLED` | Feature flag — **`false`** until transport approved. |
| `MAPAZAPP_ACTION_TOKEN_REQUIRED` | **`true`** when action routes exist — requests without valid token rejected. |
| `MAPAZAPP_ACTION_MAX_BODY_BYTES` | e.g. **`16384`** — small default for action JSON. |
| `MAPAZAPP_ACTION_RATE_LIMIT_WINDOW_MS` | e.g. **`60000`**. |
| `MAPAZAPP_ACTION_RATE_LIMIT_MAX` | e.g. **`30`** requests per window per key. |
| `MAPAZAPP_ACTION_IDEMPOTENCY_REQUIRED` | **`true`** for mutating / sensitive actions. |
| `MAPAZAPP_LOG_REDACTION_ENABLED` | **`true`** when redactor wired. |

**Token sources:** generated locally per machine/session, injected via launcher or secure env — **not** hardcoded in repo. Rotation/revocation policy TBD with launcher design.

---

## 6. Implementation sequence proposal

**Single recommended ordering** (planning IDs — require explicit approval before coding):

| Step | Checkpoint | Intent |
|------|------------|--------|
| **D9.9** | **API hardening plan** (this doc) — **docs only** | Baseline gaps, env contract, risks, test expectations |
| **D9.10** | **API hardening config model** — **`APP/artifacts/api-server/src/config/apiHardeningConfig.ts`** + **`apiHardeningConfig.d9.test.ts`** — **pure TS**, **no `app.ts` / `index.ts` wiring** | **Implemented:** defaults, env parsing (`createApiHardeningConfigFromEnv`), `validateApiHardeningConfig`, normalize/parse helpers — runtime unchanged |
| **D9.11** | **`apiHardeningReadiness.d9.test.ts`** — readiness/audit tests — **no runtime change at merge** | Snapshot at **D9.11**: documented unwired bootstrap; superseded for **`index.ts`** by **D9.12** (see readiness test updates). |
| **D9.12** | **Loopback bind implementation** — **`index.ts`** only — **no** action **`POST`** | **`createApiHardeningConfigFromEnv` + `validateApiHardeningConfig`**; **`app.listen(port, host, …)`**; default host **`127.0.0.1`**, port **`3001`**; **`apiListenConfig.d9.test.ts`** + readiness updates; README. **CORS / token / rate / body / global error handler unchanged.** |
| **D9.12.1** | **Runtime status URL/port alignment** — **`mapazapp/adapters/runtimeStatus.ts`** only | **`buildRuntimeStatusPayload`** uses the same env bag resolution as bootstrap for **`api.url`** / **`api.port`**; **`mapazapp.runtime-status.d9.test.ts`**. **No** route/`app.ts`/`index.ts` changes. **CORS / token / rate / body / error handler still pending.** |
| **D9.13** | **CORS allowlist implementation** — **no** action **`POST`** | Per-environment origins; keep mock **`GET`** working |
| **D9.14** | **Error handler + body limit + log redaction baseline** (+ optional minimal security headers) | Safe JSON errors; explicit JSON/urlencoded limits |
| **D9.15** | **Token / CSRF design + model** (optional pure types) | Doc + types; implementation ships with transport |
| **D9.16** | **Action transport test skeletons** | Align filenames with **D9.7** §7 — **no** live endpoint until approved |
| **D10.0** | **MT5 detection gate audit** | As in roadmap — **no** MT5 transport before this |

**Rationale:** separate **docs** (**D9.9**) → **types** (**D9.10**) → **tests documenting intent** (**D9.11**) before changing runtime behavior (**D9.12**–**D9.14**). **CORS** follows **bind** so origins are decided against a fixed listen address story. **Token/CSRF** (**D9.15**) stays adjacent to future transport (**D9.16**) to avoid partial auth surfaces.

---

## 7. Breakage risks

- **`127.0.0.1` bind:** machines or scripts that relied on **LAN** access to the API will **fail** until they use loopback or SSH tunnel.
- **Strict CORS:** Vite/dashboard on an origin **not** in the allowlist will **break** until env lists match actual dev URLs (including port).
- **Token / CSRF:** overly strict or rotating tokens without dev ergonomics can **block** local iteration; design dev vs prod profiles (**D9.10**).
- **Aggressive rate limits:** can **flake** integration tests or rapid reload during development.
- **Body limits:** legitimate (future) uploads could hit **`413`** if limits are too low — tune per route class.
- **Global error handler:** may change **status codes** or response shapes — snapshot tests may need updates.
- **Security headers:** CSP (if added) could block **inline** dev tooling or embedded previews if mis-specified.
- **Config drift:** README, `mapazapp:dev-start`, and operator docs **must** stay aligned with **`PORT`/`HOST`/origins** to avoid “works on my machine” failures.

---

## 8. Required tests before code hardening

**Conceptual checklist — not implemented in D9.9.**

- Bind listens on **loopback** when policy requires it; **disallow** **`0.0.0.0`** for **action** transport default.
- **CORS:** allowed **`Origin`** succeeds for permitted dev origins; **rejected** origin fails for action routes.
- **`OPTIONS`** preflight behaves per policy.
- **Missing** action token → rejected.
- **Invalid** action token → rejected.
- **Max body** exceeded → safe failure (**no** stack).
- **Invalid JSON** → safe failure.
- **Error handler** path → **no** stack trace strings in JSON body.
- **No private path** substrings in representative responses/logs (extend **D9.7** §3.6 lists).
- **`POST`** action routes remain **unavailable** until **`MAPAZAPP_ACTION_TRANSPORT_ENABLED`** (or successor flag) is explicitly on in tests that mean to test transport.
- **`GET /api/mapazapp/runtime/status`** remains **200**, conservative payload, safe envelope (**regression** guard).

---

## 9. Decision log

| Decision | Rationale |
|----------|-----------|
| **D9.9** does **not** modify `app.ts` | Plan-first; avoid accidental prod/dev breakage. |
| **D9.9** does **not** change CORS | Allowlist must follow agreed origins + bind story. |
| **D9.9** does **not** add token/auth | Design lands in **D9.15** + transport PRs. |
| **D9.9** does **not** add **`POST`** | **D9.6** prerequisites not met in code. |
| **Future hardening** precedes any **action endpoint** | Threat model + contract + this sequence. |
| **`GET` runtime status** stays **read-only** mock/conservative | No change to D5.1b honesty posture in this checkpoint. |

---

## 10. Explicit non-goals (D9.9)

D9.9 **does not** implement or authorize implementation of:

- **Application code** changes (`app.ts`, `index.ts`, routes, middleware)  
- **CORS** or **bind** behavior changes  
- **Token**, **auth**, **CSRF**, or **rate limit** middleware  
- **Body parser** limit configuration in code  
- New **endpoints** or **`POST`** action routes  
- **Dashboard** UI, **buttons**, **TSX**  
- **Launcher** binary, **IPC**, **`spawn`**, **`child_process`**  
- **MT5** runtime, **watcher**, **DB**, **WebSocket live**, **polling**, **`localStorage`**  
- **Real execution** or trading  
- **New dependencies** or **`git push`**

---

## Document history

- **D9.9** — API hardening plan (**documentation only**): gap table, env contract proposal, implementation sequence **D9.10**–**D9.16**, risks, conceptual tests, decision log.
- **D9.10** — Pure **`api-server`** config module (**no wiring**): types + safe defaults + validation + env bag parsing; **`ApiErrorExposurePolicy`** uses **`raw_stack_default_dev`** (avoids embedding framework product names in static governance scans).
