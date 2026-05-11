# Mapazapp — API-only Run Evidence D12

**Checkpoint D12.1 — solo documentación.** Registro histórico del primer run real controlado **API-only** (**D12.0**). **No** es una orden de re-ejecución: no arrancar API, dashboard ni MT5 desde este archivo.

**Plan de referencia:** [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md) (**D11.9**). **Compuerta:** [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) (**D11.8**). **Plan API+dashboard (D12.2):** [`API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md`](./API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md). **Run API+dashboard ejecutado (D12.3) y evidencia (D12.4):** [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md).

---

## 1. Purpose

Documentar la evidencia del primer run real API-only controlado.

---

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint | **D12.0** |
| Tipo | API-only supervised local run |
| Fecha/hora inicio (local) | `2026-05-10T22:48:32.4851355-03:00` |
| Fecha/hora fin (local) | `2026-05-10T22:52:12.0504518-03:00` |
| Host | `127.0.0.1` |
| Port | `3001` |
| PID identificado | `17332` (dueño del LISTEN en 3001 durante el run) |
| Commit base | `b267b70` (`docs(mapazapp): D11.9 API-only supervised run prototype plan`) |
| Resultado general | **OK** |

---

## 3. Pre-run checks

- **Git:** `git status` limpio antes del run.
- **Puerto 3001:** libre antes del run (sin listener LISTEN previo verificado).
- **Validaciones obligatorias (desde `APP/`):**
  - `pnpm run typecheck` — **OK**
  - `pnpm --filter @workspace/api-server test` — **OK**
  - `pnpm --filter @workspace/api-server build` — **OK**
- **Dry-run:**
  - `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run -- --json` — **OK**
  - Campos relevantes del resumen JSON: `executionEnabled: false`, `startsProcesses: false`, `mt5Runtime: false`, `launcherExecutable: false`

---

## 4. Commands used

> **Nota:** comandos **históricos** del run D12.0; **no** ejecutar en cadena automática ni asumir que el entorno sigue idéntico.

- **Build:** `pnpm --filter @workspace/api-server build` (cwd `APP/`).
- **Variables de entorno (PowerShell):**
  - `MAPAZAPP_API_HOST=127.0.0.1`
  - `MAPAZAPP_API_PORT=3001`
- **Start:** `pnpm --filter @workspace/api-server start` (cwd `APP/`).

**No** se usó `mapazapp:dev-start`.

---

## 5. HTTP checks

**GET** `http://127.0.0.1:3001/api/healthz`

- **Resultado:** `{"status":"ok"}`

**GET** `http://127.0.0.1:3001/api/mapazapp/runtime/status`

- **Resultado resumido:**
  - `api.url`: `http://127.0.0.1:3001`
  - `api.port`: `3001`
  - `executionEnabled`: `false`
  - `sendToMt5Enabled`: `false`
  - `autoApprovalEnabled`: `false`
  - `registryMutationAllowed`: `false`
  - `manualReviewRequired`: `true`
  - `mockOnly`: `true`
  - `reviewOnly`: `true`
  - `mt5.status`: `not_configured`
  - `bridge.status`: `not_configured`
  - Sin frases «ready to trade» ni «live trading» en la respuesta revisada.

---

## 6. Stop / cleanup evidence

- **Método:** `Stop-Process -Id 17332` — PID **único** identificado como dueño del **LISTEN** en puerto **3001** durante la prueba.
- **No** `taskkill` amplio; **no** terminación por nombre global de proceso.
- **Puerto 3001:** liberado tras el stop.
- **Proceso 17332:** ya no existía tras el cleanup.
- **`git status` final:** limpio.

---

## 7. Scope confirmations

- **No** arranque de dashboard.
- **No** lanzamiento MT5.
- **No** watcher.
- **No** command files.
- **No** POST Mapazapp en esta sesión de verificación (solo GET a health y runtime status).
- **No** action endpoints nuevos.
- **No** botones operativos de dashboard.
- **No** launcher `.exe`.
- **No** IPC real.
- **No** DB operativa como parte del run.
- **No** WebSocket live.
- **No** trading.
- **No** push al remoto como parte de D12.0.

---

## 8. Incidents / risks

- **Incidentes bloqueantes:** ninguno.
- **Riesgo residual:** condición de carrera teórica entre “puerto libre” y `listen`; **no** ocurrió en este run.
- **Nota:** el proceso `pnpm`/start pudo reportar código de salida distinto de cero tras `Stop-Process` sobre el hijo Node — **esperado** al detener el servidor.

---

## 9. Recommendation

- **D12.2 — API + dashboard supervised run plan, no execution:** plan documental publicado en [`API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md`](./API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md) — alcance, comandos candidatos, puertos, pre-run, runtime checks, evidencia, cleanup, fallos y compuerta **sin** ejecutar API/dashboard en el cierre de D12.2.
- **D12.3 / D12.4 — API + dashboard run y evidencia:** primer run dual supervisado **OK**; registro en [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md).
- **No** levantar el dashboard de forma ad-hoc sin plan y sin nueva aprobación.
