# CP18 Scope Freeze — Assisted Execution Gated Future Phase

**Checkpoint name:** CP18 Scope Freeze — Assisted Execution Gated Future Phase  
**Baseline commit (docs):** `fa60858` — `docs(cp17.5): readiness audit before cp18 and minor roadmap/api-readme alignment`  
**Document type:** scope freeze — **no implementation authority** beyond what is listed under *Allowed scope*. Anything else requires a new explicit approval and checkpoint narrative.

---

## 1. Executive summary

**CP18 is not real execution.** There is no broker submission, no MT5 order path, and no automation that places or modifies trades.

**CP18 is a gated future-phase readiness layer** that **keeps execution disabled** while improving safety gates, audit preview, read-only mock scenarios, tests, UX clarity, and documentation. The product remains in **contract-only / mock-only** mode for assisted execution.

If work drifts toward live execution, transport of commands to EAs, or any forbidden capability listed below, **stop implementation** and obtain **human approval** before proceeding (see §6).

---

## 2. CP18 allowed scope

| Area | Allowed |
|------|---------|
| **Safety gates** | Strengthen assisted-execution safety gates (pure validation, additional blocking reasons, stricter cross-checks) without enabling execution. |
| **Audit preview** | Improve how audit / checklist payloads are presented (read-only DTO shaping, copy, structure) — still mock/contract only. |
| **Mock validation** | Add **read-only** mock validation scenarios (fixtures, additional `GET` mock responses) — no side effects. |
| **Invariant tests** | Add or tighten tests that assert execution stays off, confirmations are required, and existing CP6/CP7/CP15/CP16 gates still block when appropriate. |
| **UX** | Clearer **“execution disabled”** state, **“future phase only”** messaging, no action that implies an order was sent. |
| **Future envelope (spec)** | Define a **disabled / specification-only** “future command envelope” in types or docs if needed — **not** wired to MT5, BridgeEA, or HTTP commands. |
| **Human confirmations** | Document required human confirmations and what “passing validation” means vs. “allowed to execute” (still not executable in CP18). |
| **Approval steps** | Document future approval steps and governance — **documentation only** unless explicitly approved as UI copy with no execution hooks. |
| **Pre–real-execution checklist** | Document what would be required **before** any **separate** real execution phase (see §7) — not implement those systems in CP18. |

---

## 3. CP18 forbidden scope

The following are **out of scope** for CP18. **Do not** add or change code paths that introduce them.

| Category | Forbidden |
|----------|-----------|
| **MQL5 / MT5 trading** | `OrderSend`; `CTrade`; `trade.Buy` / `trade.Sell`; `PositionModify`; any live order or position API usage from Mapazapp toward a terminal. |
| **Command ingress** | MT5 command reader; BridgeEA **inbound** commands; any loop that consumes “execute this” messages from EAs or sockets. |
| **Restricted MQL5 features** | `WebRequest`; `DLL` calls for execution or command transport. |
| **HTTP** | `POST` (or any method) that **executes** trades or **simulates execution as if real** (e.g. fake tickets presented as production truth). **CP18 keeps GET-only** for assisted-execution contract surfaces unless an explicit future doc approves otherwise — this freeze assumes **no new POST**. |
| **Realtime** | WebSocket (or similar) for **live execution** or live command streaming. |
| **Infrastructure** | File watchers; DB persistence for execution intent, orders, or registry state mutations from the app. |
| **Registry** | Registry **mutation** from Mapazapp (API/UI/job) — approvals remain human-out-of-band unless a **future** checkpoint explicitly allows it. |
| **EA logic** | Changes to **BridgeEA** or **TestEA** logic (this repo’s MQL5 artifacts or their behavioral contract). |
| **Automation / trust** | Auto-approval of parameter sets or assisted actions; **real** order ticket generation; UI buttons labeled or behaving as **“Execute”**, **“Send Order”**, **“Place Trade”**, or equivalent. |

---

## 4. Required invariants

Every CP18 deliverable that touches assisted execution **must** preserve these flags/semantics on relevant results and mock API envelopes (names may map to existing DTO fields; the **meaning** must hold):

| Invariant | Required value |
|-----------|----------------|
| `executionEnabled` | `false` |
| `sendToMt5Enabled` | `false` |
| `canAutoExecute` | `false` |
| `registryMutationAllowed` | `false` |
| `manualReviewRequired` | `true` |

**Interpretation:** validation may conclude “allowed for manual checklist / audit preview” only; it **must not** imply permission to send orders. If a future field name differs (e.g. `requiresHumanConfirmation`), tests and docs must still enforce the same product rule.

---

## 5. Proposed CP18 deliverables (controlled implementation plan)

### A. Core safety invariants test suite

- Assert **no** assisted-execution result can set `executionEnabled` / `sendToMt5Enabled` / `canAutoExecute` to an enabling state for real execution.
- Assert any **future** “send to MT5” action remains **blocked** (e.g. permanent gate or equivalent).
- Assert **missing** human confirmations / phrase / flags **block** “allowed for checklist” where the contract requires them.
- Assert **account guard**, **registry**, **backtest evidence**, and **forward monitor** gates still block when inputs are incomplete or disallowed.

### B. API read-only safety contract

- **GET only** for assisted-execution surfaces aligned with this freeze; **no** `POST`, **no** command endpoint.
- Responses remain **`contractOnly` / `mockOnly`** with **`executionEnabled: false`** (and aligned invariants §4).

### C. Dashboard safety UX polish

- Clearer disabled / future-phase messaging.
- **No** execution, send, or place-trade controls.

### D. Documentation

- State that **CP18 keeps execution disabled**.
- State that **real execution** would require a **new explicit CP19+** (or later) approval and scope document — **not** implied by CP18.

---

## 6. CP18 no-go decision

If implementation **attempts to add real execution**, or any item listed in **§3 Forbidden scope**, **CP18 must stop**. Roll back or shelve the change, and require **explicit human approval** and a **new checkpoint / scope document** before resuming. This freeze document is the default authority until superseded in writing.

---

## 7. Readiness requirements before any future real execution phase

The following are **not** CP18 deliverables; they are **preconditions** to consider **only** when the organization opens a **separate**, explicitly approved execution phase:

1. **Real persisted audit log** (tamper-evident, operator-attributable) for any action that could lead to orders.
2. **Explicit user confirmation flow** (multi-step, not bypassable by mock flags alone).
3. **Prop firm risk policy** finalized and encoded in review/approval rules.
4. **Account mapping** finalized (broker, login, symbol, and guardrails).
5. **Command transport** design **reviewed** (security, replay, authz) — still not implemented in CP18.
6. **Manual kill switch** and operational runbook.
7. **Rollback plan** (disable execution path without redeploying EAs if possible).
8. **Demo-only test phase** before any funded or production routing.
9. **Legal / risk acceptance** recorded.
10. **Separate checkpoint approval** (e.g. CP19+) with its own scope freeze or spec.

---

## 8. References

- Readiness audit: `APP/artifacts/mapazapp/docs/CP17_5_READINESS_AUDIT.md`
- Cursor handoff: `APP/artifacts/mapazapp/docs/CURSOR_HANDOFF.md`
- Implementation assumptions: `APP/artifacts/mapazapp/docs/IMPLEMENTATION_ASSUMPTIONS.md`
- Roadmap: `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| V1 | 2026-05-06 | Initial CP18 scope freeze; baseline `fa60858`. |
