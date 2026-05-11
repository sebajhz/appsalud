# Mapazapp — Auditoría de readiness end-to-end antes de runtime live (D10.10)

**Checkpoint D10.10 — solo documentación.** Consolida el estado **D9.1–D10.9** y fija qué falta **antes** de MT5 live, launcher productivo, watchers, transporte de acciones o cualquier superficie que pueda confundirse con ejecución real.

**Relacionado:** [`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`](./LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md), [`API_TOKEN_CSRF_DESIGN_D9.md`](./API_TOKEN_CSRF_DESIGN_D9.md), [`MT5_DETECTION_GATE_AUDIT_D10.md`](./MT5_DETECTION_GATE_AUDIT_D10.md), [`MT5_CONFIG_STORAGE_DECISION_D10.md`](./MT5_CONFIG_STORAGE_DECISION_D10.md), [`MT5_BRIDGE_FILE_DISCOVERY_AUDIT_D10.md`](./MT5_BRIDGE_FILE_DISCOVERY_AUDIT_D10.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`LAUNCHER_PROTOTYPE_DESIGN_D8.md`](./LAUNCHER_PROTOTYPE_DESIGN_D8.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md), [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md), [`NEXT_RUNTIME_EXPANSION_GATE_D13.md`](./NEXT_RUNTIME_EXPANSION_GATE_D13.md).

**Post-D12 / D13.0:** la serie **D12** quedó **cerrada** con runs supervisados y evidencia visual humana; la compuerta **D13.0** documenta el **siguiente salto de runtime** posible **sin** implementarlo en ese checkpoint.

---

## 1. Verdad explícita (post-D10.10)

| Afirmación | Estado |
|------------|--------|
| Ejecución real de órdenes / broker | **No existe** en el alcance gobernado |
| Lanzamiento de MT5 desde Mapazapp | **No existe** |
| Watcher / polling live sobre carpetas bridge | **No aprobado / no implementado como producto** |
| Trading automatizado | **No** |
| Archivos de comando hacia MT5 | **No** |
| Endpoints **`POST`** de acciones Mapazapp operativos | **No** |
| Transporte HTTP/IPC **real** para acciones dashboard ↔ launcher | **No cableado** en app productiva |

---

## 2. Qué ya existe (D9.1–D10.9, alto nivel)

| Bloque | Entrega |
|--------|---------|
| **D9.1** | Threat model localhost / CSRF / replay / rutas — obligatorio antes de `POST`/IPC |
| **D9.2** | `action-gates.ts` — modelo puro de gates |
| **D9.3–D9.4.1** | `dispatchLauncherAction` — solo **`validate_environment`** vía preflight; sin HTTP/IPC |
| **D9.6–D9.7** | Contrato + plan de tests de transporte — docs |
| **D9.9–D9.14.2** | Endurecimiento API (bind loopback, CORS, body limits, errores seguros, redacción logs) |
| **D9.15–D9.18** | Diseño + modelo token acción — middleware **no** montado en `app.ts` para acciones |
| **D9.19** | Tests readiness transporte sin endpoint real |
| **D10.0–D10.1** | Auditoría MT5 + validador config TS puro |
| **D10.2** | Diseño `open_mt5` — sin código |
| **D10.3** | Mapeo runtime conservador MT5 — sin “connected” |
| **D10.4** | Panel dashboard MT5 read-only mock |
| **D10.5** | Decisión storage/settings MT5 sin persistencia real |
| **D10.6** | Readiness carpeta bridge — modelo TS, deps opcionales |
| **D10.7** | Auditoría discovery BridgeEA/TestEA |
| **D10.8** | Metadata read-only de muestras BridgeEA/TestEA (`mapazapp-bridge-sample-metadata`) |
| **D10.9** | Copy/presentación panel MT5 — sin acciones |
| **D10.10** | Este documento |

---

## 3. Qué sigue siendo mock / read-only

- **`GET /api/mapazapp/runtime/status`** — envelope honesto; MT5/bridge **no** son probes live salvo diseño futuro explícito.
- **Dashboard** — mayormente mocks in-process; panel MT5 es **draft** con disclaimers obligatorios.
- **BridgeEA/TestEA en repo** — fuentes + fixtures; **no** sustituyen exports reales del terminal.
- **Modelos TS** (`Mt5Config`, bridge readiness, sample metadata) — **declarativos**; I/O solo vía deps inyectadas en tests.

---

## 4. Qué falta antes de “live runtime” honesto

1. **Launcher productivo** con ownership de procesos, logs sanitizados y config local fuera del repo (**D10.5**).
2. **Transporte de acciones** alineado **D9.6** + token **D9.15** + tests **D9.7** antes de cualquier `POST`.
3. **Política explícita** para lectura recurrente de carpetas (watcher / polling) — threat model actualizado.
4. **Semántica de estado** que distinga `detected` / `available` de “cuenta conectada” o “listo para operar”.
5. **Consentimiento UX** para rutas sensibles y apertura de MT5 (**D10.2**).
6. **Sin DB/WebSocket** hasta decisión de producto separada.

---

## 5. Checklist — antes de launcher real

- [ ] Ejecutable/supervisor con PID registry y shutdown ordenado (**D8.1**).
- [ ] Config archivo usuario fuera del repo + plantilla documentada (**D10.5**).
- [ ] Validación `Mt5Config` + políticas `unsafe` imposibles en build productivo.
- [ ] Logs sin rutas crudas ni tokens (**D9.14.2**).
- [ ] Threat model **D9.1** revisado para la superficie concreta del launcher.
- [ ] Pruebas de instancia única y puertos (**D2** intent).

---

## 6. Checklist — antes de watcher

- [ ] Aprobación formal de riesgo (I/O continuo, CPU, privacidad).
- [ ] Rate limits / backoff / tamaño máximo de lectura.
- [ ] Sin confundir frescura de archivos con señales de trading.
- [ ] Sin command files ni escritura hacia MT5.

---

## 7. Checklist — antes de `open_mt5`

- [ ] Criterios mínimos en [`MT5_OPEN_ACTION_DESIGN_D10.md`](./MT5_OPEN_ACTION_DESIGN_D10.md) §14.
- [ ] Transporte + token + gates implementados y probados.
- [ ] Solo **launcher-side** ejecuta spawn MT5; dashboard remapeado.

---

## 8. Checklist — antes de dashboard actions (botones/HTTP)

- [ ] `DashboardActionClient` deja de ser stub conservador según diseño **D7.1**.
- [ ] Allowlist de acciones + `ActionResult` seguro en todos los errores.
- [ ] Sin **POST** amplio sin CSRF/token (**D9.15**).

---

## 9. Checklist — antes de API/IPC transport real

- [ ] Middleware token montado solo cuando política lo apruebe.
- [ ] CORS/bind/host acordes con localhost governance.
- [ ] Tests de replay, límites de body, ausencia de fugas en logs.

---

## 10. Riesgos restantes

| Riesgo | Notas |
|--------|-------|
| **Falsa sensación de “todo OK”** | Paneles mock deben mantener copy **read-only** y **manual review** |
| **Fuga de rutas** | Sanitización obligatoria en modelos y logs |
| **Scope creep hacia ejecución** | `executionEnabled` y flags asistidos permanecen **false** en gobernanza actual |
| **Confundir fixtures con mercado real** | Metadata D10.8 marca `sanitized_sample` sin probar runtime |

---

## 11. Recomendación — próximos checkpoints

| ID | Tema |
|----|------|
| **D11.0** | **Hecho (docs):** [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md) — auditoría empaquetado / brechas; **sin** `.exe`, **sin** procesos. |
| **D11.1** | **Hecho (TS puro):** `mapazapp-launcher-config-model.ts` — modelo archivo config local; **sin** I/O real, **sin** `spawn`. |
| **D11.2** | **Hecho:** `mapazapp-e2e-dry-run.ts` + [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md) — dry-run declarativo; **sin** MT5, **sin** levantar API/dashboard desde el helper. |
| **D11.3** | **Hecho (docs):** [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md) — primer run local controlado (**plan**; comandos candidatos **no ejecutar** en D11.3). |
| **D11.4** | **Hecho (TS puro):** `mapazapp-launcher-process-lifecycle.ts` — ciclo de vida hijo declarativo; **sin** `spawn` / `child_process`. |
| **D11.5** | **Hecho (TS puro):** `mapazapp-launcher-ownership-model.ts` — instancia / ownership de puertos con deps; **sin** lockfile ni bind real. |
| **D11.6** | **Hecho (docs):** [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md) — start/stop seguro futuro; **sin** implementación. |
| **D11.7** | **Hecho (docs):** [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md) — opciones de prototipo supervisado; **sin** código. |
| **D11.8** | **Hecho (docs):** [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) — compuerta/checklist antes del primer run real; **sin** ejecución. |

**Justificación:** mantiene el orden **modelo/config → dry-run → plan de corrida**, antes de watcher o `open_mt5`. Si producto prioriza transporte **`POST`** antes que launcher, insertar un **D10.11** explícito “transport skeleton wired behind flag” **solo** tras re-aprobación de **D9.7** — no sustituye **D11.1**.

---

## 12. Conclusión

El repo disponibiliza **gobernanza, modelos puros y UI draft** hasta **D10.9**, más metadata de muestras **D10.8**. **No** hay runtime MT5/live ni acciones operativas. Cualquier paso siguiente debe pasar por los checklists anteriores y por actualización explícita del threat model.
