# Mapazapp — Runtime and Launcher Strategy

Declaración de **estrategia de ejecución** y **launcher**. No implementa código ni procesos; define el marco para trabajo futuro aprobado.

---

## 1. Purpose

Hoy Mapazapp se levanta con **comandos `pnpm`** en terminales separadas. Eso es aceptable para desarrollo, pero **no** es un modelo seguro ni simple para usuario final: errores de puerto, rutas y orden de arranque son frágiles. Este documento fija el objetivo de un **runtime gobernado** y un **launcher** progresivo.

---

## 2. Current runtime state

| Elemento | Estado |
|----------|--------|
| API | Comando `pnpm --filter @workspace/api-server dev` (desde `APP/`) |
| Dashboard | Comando `pnpm --filter @workspace/mapazapp dev` |
| MT5 | Apertura y export **manuales** por el usuario |
| Launcher único | **No existe** |
| Supervisor de procesos | **No** unificado |
| Config única | **No** formalizada para usuario |
| Runtime status real integrado | **No** (solo mocks / piezas dispersas) |

---

## 3. Development mode

Comandos actuales (referencia cruzada con manual MT5 y estrategia de testing):

- `pnpm run typecheck`
- Paquetes `mapazapp-core`, `api-server`, `mapazapp`: `test`, `typecheck`, `build` según necesidad
- **C3.1 / C3.2 (solo desarrollo):** validador local read-only de CSV MT5/manual: `pnpm --filter @workspace/scripts mapazapp:import-validate -- --file <ruta> --symbol <sym> --timeframe <tf>` — **no** guarda datos, **no** ejecuta trades y **no** reemplaza el launcher futuro; argumentos y mensajes endurecidos (p. ej. `--format` solo `auto|mt5|bridge|ohlc`; códigos de salida 0/1/2). Solo comprueba forma de archivo con el importador del core.
- **D3.1 (solo desarrollo):** preflight dev **sin procesos hijos**: `pnpm --filter @workspace/scripts mapazapp:dev-preflight` (desde `APP/`). Comprueba puertos locales esperados y scripts `package.json`; imprime comandos seguros para PowerShell y Bash. **No** es `MapazappLauncher.exe`, **no** levanta API/dashboard/MT5, **no** abre navegador, **no** escribe logs de launcher, **no** simula estado runtime/bridge.
- **D3.2 (solo desarrollo):** arranque coordinado MVP: `pnpm --filter @workspace/scripts mapazapp:dev-start` (desde `APP/`). Ejecuta el mismo preflight que D3.1, opcionalmente `pnpm --filter @workspace/api-server build`, luego `pnpm --filter @workspace/api-server start` con `PORT` y `NODE_ENV=development`, y el dashboard con `pnpm --filter @workspace/mapazapp dev -- --port …`. Prefijos `[api]` / `[dashboard]` en salida; Ctrl+C / SIGTERM intenta terminar **solo** los hijos creados por el script. **No** es launcher final, **no** abre MT5, **no** detecta bridge real, **no** habilita ejecución, **no** escribe archivos de log.
- **D4.1 (solo documentación):** `APP/artifacts/mapazapp/docs/DASHBOARD_RUNTIME_ACTIONS_DESIGN.md` — diseño de **acciones futuras** del dashboard (Validar entorno, Iniciar Mapazapp, Validar CSV, Estado del sistema, MT5, logs, parada) y cómo deben enlazarse con launcher/API segura; **sin** implementación de botones ni endpoints.
- **D5.1b (`@workspace/api-server`):** `GET /api/mapazapp/runtime/status` — snapshot read-only desde `@workspace/mapazapp-core` (`runtime-status.ts`); **`mockOnly` / `reviewOnly`**, ejecución deshabilitada; MT5/bridge **`not_configured`**; **sin** watcher, **sin** DB, **sin** WebSocket; **no** `POST`.
- **D7.1 (solo documentación):** `APP/artifacts/mapazapp/docs/ACTION_BRIDGE_DESIGN.md` — diseño formal del **puente de acciones** dashboard ↔ API local / launcher (límites del browser, contrato conceptual `ActionResult`, gates de seguridad, notas de amenaza localhost, secuencia D7.2–D10.0); **sin** implementación de código, **sin** `POST`, **sin** launcher ejecutable.
- **D7.2 (modelo TS puro):** `@workspace/mapazapp-core` `action-result.ts` — tipos `MapazappActionResult`, factories seguros, `assertActionResultSafety`, `serializeActionResult`; tests vitest; **sin** endpoints, **sin** botones dashboard, **sin** ejecutar acciones reales.
- **D9.1 (solo documentación):** `APP/artifacts/mapazapp/docs/LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md` — threat model formal del futuro **local action bridge** (localhost, CSRF, replay, CORS, tokens, allowlist, procesos, logs, privacidad de rutas, `ActionResult`); **sin** código, **sin** `POST`, **sin** launcher real; debe cerrarse **antes** de cualquier endpoint de acciones o transporte privilegiado.
- **D9.2 (modelo TS puro en core):** `APP/lib/mapazapp-core/src/action-gates.ts` — definiciones + política + `evaluateActionGate` + aserciones de seguridad; tests vitest; **sin** endpoints HTTP, **sin** UI, **sin** ejecución real.
- **D9.3 (dispatcher interno scripts):** `APP/scripts/src/mapazapp-launcher-action-dispatcher.ts` — `dispatchLauncherAction` integra gates + única ejecución interna **`validate_environment`** vía puente D8.3; tests node:test; **sin** transporte HTTP/IPC, **sin** entrada CLI nueva, **sin** spawn.
- **D9.4.1:** mismo dispatcher — errores de preflight y cargas **`ActionResult`** inseguras se convierten en respuestas **`ActionResult`** seguras (sin exponer trazas ni rutas); **sin** transporte HTTP/IPC ni cambios en API/dashboard.
- **D9.6 (solo documentación):** `APP/artifacts/mapazapp/docs/LOCAL_ACTION_TRANSPORT_CONTRACT_D9.md` — contrato formal de transporte futuro (HTTP loopback, IPC launcher-side, remapeo de caller, envelopes, política por clase de acción, tests obligatorios); **sin** `POST`, **sin** IPC real, **sin** código.
- **D9.7 (solo documentación):** `APP/artifacts/mapazapp/docs/LOCAL_ACTION_TRANSPORT_TEST_PLAN_D9.md` — plan de tests de seguridad obligatorio antes de implementar transporte (HTTP, IPC, allowlist, replay/límites, esquema, `ActionResult`, privacidad, ownership, cliente dashboard); **sin** tests TS, **sin** endpoint, **sin** `POST`.
- **D9.9 (solo documentación):** `APP/artifacts/mapazapp/docs/API_HARDENING_PLAN_D9.md` — plan formal de endurecimiento del `api-server` (brechas, variables de entorno propuestas, secuencia documentada **D9.10–D9.19** hacia transporte de acciones, riesgos, tests conceptuales); el checkpoint **D9.9** **no** modifica `app.ts`, CORS, bind, token ni **`POST`** (solo texto del plan).
- **D9.10 (`@workspace/api-server`, modelo TS puro):** `APP/artifacts/api-server/src/config/apiHardeningConfig.ts` — defaults seguros, parsing de env vía objeto, validación (`validateApiHardeningConfig`); tests `apiHardeningConfig.d9.test.ts`; **sin** wiring a `app.ts`/`index.ts`, **sin** cambiar comportamiento del servidor en ejecución.
- **D9.11 (`@workspace/api-server`, solo tests):** `apiHardeningReadiness.d9.test.ts` — auditoría estática del baseline actual (sin wiring de bind/CORS) y placeholders **`skip`** para endurecimiento futuro; **sin** endpoints, **sin** cambios en `app.ts`/`index.ts`.
- **D9.12 (`@workspace/api-server`, bootstrap):** `index.ts` usa modelo **D9.10** para host/puerto explícitos (loopback por defecto); **sin** cambiar CORS ni rutas Mapazapp ni **`POST`** de acciones.
- **D9.12.1 (`@workspace/api-server`, adapter):** `GET /api/mapazapp/runtime/status` reporta **`api.url`** / **`api.port`** con la misma resolución de env que el bootstrap; **sin** cambiar rutas ni CORS.
- **D9.13 (`@workspace/api-server`, CORS):** **`app.ts`** aplica allowlist de **`Origin`** vía **`apiCorsConfig`** (defaults Vite dev); **sin** token, **sin** **`POST`** de acciones.
- **D9.14.1 (`@workspace/api-server`, body + errores):** **`app.ts`** limita tamaño de body (**`maxBodyBytes`**) y añade **`safeErrorHandler`** (JSON seguro sin stack); **sin** **`POST`** de acciones Mapazapp, **sin** token/rate/CSRF.
- **D9.14.2 (`@workspace/api-server`, logs):** **`logRedaction.ts`** + lista **`redact`** centralizada en **`pino`** y sanitización de **`req.url`** en logs; **sin** body crudo en serializers por defecto; **sin** **`POST`** de acciones.
- **D9.15 (solo documentación):** [`API_TOKEN_CSRF_DESIGN_D9.md`](./API_TOKEN_CSRF_DESIGN_D9.md) — contrato conceptual de token **`X-Mapazapp-Action-Token`**, CSRF, integración con launcher y gates antes de cualquier **`POST`** de acciones; **sin** implementación, **sin** token real.
- **D9.16–D9.18 (`@workspace/api-server`):** modelo **`apiActionTokenConfig`**, middleware **`createActionTokenMiddleware`** (solo tests / apps temporales; **no** cableado en **`app.ts`**), tests de token + redacción — base para transporte futuro; **sin** **`POST`** de acciones Mapazapp, **sin** emisión real de token.
- **D9.19 (`@workspace/api-server`, solo tests):** **`actionTransportReadiness.d9.test.ts`** — esqueletos de readiness para transporte futuro (sin endpoint, sin **`POST`** real); gates/token/dispatcher referenciados de forma estática o vía **`@workspace/mapazapp-core`**.
- **D10.0 (solo documentación):** [`MT5_DETECTION_GATE_AUDIT_D10.md`](./MT5_DETECTION_GATE_AUDIT_D10.md) — auditoría de gates de detección MT5 antes de launch/watcher; rutas sensibles y non-goals.
- **D10.1 (`@workspace/scripts`, modelo TS puro):** **`mapazapp-mt5-config-model.ts`** + tests — validación declarativa de config MT5 futura (**sin** lanzar MT5, **sin** `spawn`); flags **`allowLaunch`** / **`allowCommandFiles`** → **`unsafe`**.
- **D10.2 (solo documentación):** [`MT5_OPEN_ACTION_DESIGN_D10.md`](./MT5_OPEN_ACTION_DESIGN_D10.md) — diseño de acción futura **`open_mt5`** (launcher, gates, token, consentimiento); **sin** código.
- **D10.3 (`@workspace/scripts`):** **`mapazapp-mt5-runtime-status.ts`** + tests — integración conservadora validación → **`Mt5RuntimeSlice`** + **`deriveOverallRuntimeStatus`**; **sin** watcher, **sin** “connected”.
- **D10.4 (`@workspace/mapazapp`):** **`Mt5ConfigStatusPanel`** + **`mt5ConfigStatusPresenter`** — borrador UI **read-only** (mock); **sin** fetch nuevo, **sin** botones operativos.
- **D10.5 (solo documentación):** [`MT5_CONFIG_STORAGE_DECISION_D10.md`](./MT5_CONFIG_STORAGE_DECISION_D10.md) — política de almacenamiento/config MT5 futura; **sin** persistencia real, **sin** `localStorage`.
- **D10.6 (`@workspace/scripts`):** **`mapazapp-mt5-bridge-readiness.ts`** + tests — readiness conceptual de carpeta bridge (**sin** watcher, **sin** escritura; deps opcionales); wording **ready for read-only validation**, no “connected”.
- **D10.7 (solo documentación):** [`MT5_BRIDGE_FILE_DISCOVERY_AUDIT_D10.md`](./MT5_BRIDGE_FILE_DISCOVERY_AUDIT_D10.md) — límites del discovery read-only BridgeEA/TestEA; **sin** filesystem real obligatorio en el núcleo reusable.
- **D10.8 (`@workspace/scripts`):** **`mapazapp-bridge-sample-metadata.ts`** + tests — metadata read-only de muestras BridgeEA/TestEA (**sin** `fs`, **sin** watcher); rechaza tokens de API de trading y riesgos de command files en snippets **opcionales**.
- **D10.9 (`@workspace/mapazapp`):** copy/presentación **`Mt5ConfigStatusPanel`** — fortalece disclaimers obligatorios; **sin** acciones nuevas.
- **D10.10 (solo documentación):** [`END_TO_END_READINESS_AUDIT_D10.md`](./END_TO_END_READINESS_AUDIT_D10.md) — readiness consolidado antes de runtime live; propone **D11.0–D11.3**.
- **D11.0 (solo documentación):** [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md) — brechas packaging / supervisor / logs / MT5 / Windows; **sin** `.exe`, **sin** implementación runtime.
- **D11.1 (`@workspace/scripts`, modelo TS puro):** **`mapazapp-launcher-config-model.ts`** + tests — config local futura (`schemaVersion`, host/puertos, flags `unsafe`, anidado **`Mt5Config`** + **`Mt5BridgeReadinessConfig`**); **sin** lectura/escritura de archivo real, **sin** `spawn`.
- **D11.2 (`@workspace/scripts`):** **`mapazapp-e2e-dry-run.ts`** + tests + script **`mapazapp:e2e-dry-run`**; plan declarativo + validación de defaults + presencia de scripts en `package.json` (solo lectura); [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md) — **sin** `dev-start`, **sin** abrir servicios.
- **D11.3 (solo documentación):** [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md) — secuencia del primer run local controlado (**plan**; comandos **no ejecutar** en D11.3); **sin** MT5, **sin** `POST` de acciones.
- **D11.4 (`@workspace/scripts`, modelo TS puro):** **`mapazapp-launcher-process-lifecycle.ts`** + tests — ciclo de vida hijo declarativo (`commandLabel` seguro); **sin** `spawn` / `child_process` / `taskkill`.
- **D11.5 (`@workspace/scripts`, modelo TS puro):** **`mapazapp-launcher-ownership-model.ts`** + tests — instancia y ownership de puertos vía deps; **sin** lockfile real, **sin** bind de red.
- **D11.6 (solo documentación):** [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md) — política de arranque/parada seguros del launcher futuro; **sin** `spawn` / `child_process` / `taskkill`.
- **D11.7 (solo documentación):** [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md) — opciones de prototipo supervisado (API-only preferido para el primer run); **sin** implementación.
- **D11.8 (solo documentación):** [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) — checklist/compuerta humana antes del primer run real; **sin** ejecutar servicios dentro del doc.
- **D11.9 (solo documentación):** [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md) — plan del primer prototipo **API-only** supervisado (comandos candidatos, evidencia, teardown); **sin** ejecutar el run en ese checkpoint.
- **D12.0 (ejecución aprobada, fuera de este doc):** primer run local **API-only** en loopback **3001** según plan D11.9 — **sin** dashboard/MT5 en alcance.
- **D12.1 (solo documentación):** [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md) — evidencia formal del run D12.0.
- **D12.2 (solo documentación):** [`API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md`](./API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md) — plan del run supervisado **API + dashboard** (puertos 3001/5173, pre-run, evidencia, cleanup); **sin** ejecutar procesos en el cierre de D12.2.
- **D12.3–D12.4:** primer run real **API + dashboard** supervisado **OK** sobre commit **`63f39eb`**; evidencia [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md) (**D12.4**).
- **D12.5 (solo documentación):** [`DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md) — plan de verificación **visual/humana** post-D12.3 (**sin** ejecutar API/dashboard en D12.5); ejecución acotada ⇒ **D12.6** aprobada.
- **D12.6–D12.7:** run de verificación dashboard **limitado por entorno** sobre **`955f41a`** (HTTP/logs/CORS **OK**; sin DOM/consola humana); evidencia [`DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md) (**D12.7**).
- **D12.8–D12.9:** segundo run con el mismo patrón sobre **`0f1362a`**; evidencia parcial del agente [`DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md) (**D12.9**).
- **D12.10–D12.11:** verificación visual **humana OK** (operador) + archivo de evidencia [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md) (**D12.11**); siguiente compuerta documental sugerida **D13.0** (expansión runtime sin asumir MT5/trading).

Modo desarrollo permanece válido para contribuidores; el launcher futuro **no** lo reemplaza, lo complementa.

---

## 4. Future user mode

Objetivo: **`Mapazapp.exe`** o **`MapazappLauncher.exe`** (nombre final por definir) que encapsule:

- validaciones previas;
- arranque de servicios necesarios;
- apertura del dashboard en navegador o visor embebido según decisión de producto.

---

## 5. Launcher responsibilities

El launcher, cuando se implemente bajo especificación aprobada, debería:

- validar configuración mínima;
- validar carpetas requeridas (datos, logs, bridge según diseño);
- validar **puertos** libres o configurados;
- levantar **API**;
- levantar **dashboard** o abrir navegador en URL conocida;
- **detectar MT5** (ruta del terminal) cuando corresponda;
- opcionalmente **abrir MT5** si hay ruta configurada y política aprobada;
- validar **carpeta bridge** / export según contrato;
- inicializar o validar **logs**;
- evitar **instancias duplicadas** conflictivas;
- permitir **cierre ordenado**;
- mostrar **errores claros** (sin fallar en silencio).

---

## 6. Configuration model

Campos **futuros** orientativos:

- `mt5TerminalPath`
- `mt5DataFolder`
- `mt5BridgeFolder`
- `defaultSymbol`
- `defaultTimeframe`
- `symbolMapping`
- `historyFolder`
- `logsFolder`
- `runtimeMode`
- `executionEnabled`

**Regla:** `executionEnabled` debe ser **`false` por defecto** y cualquier otro valor requiere gobernanza explícita fuera de este documento.

---

## 7. Runtime modes

| Modo | Descripción breve |
|------|-------------------|
| **mock** | Datos y respuestas simuladas; evidencia etiquetada |
| **historical** | Datos históricos importados o reproducibles |
| **manual-import** | Operador importa archivos bajo control explícito |
| **live-read-only** | Futuro: solo lectura desde fuentes acordadas; **sin ejecución** |
| Por defecto | **Execution disabled** en todos los modos hasta diseño contrario aprobado |

---

## 8. Health / status model

Modelo **conceptual** de estado (no impone implementación):

- `api`
- `dashboard`
- `runtimeMode`
- `mt5`
- `bridge`
- `symbol`
- `timeframe`
- `lastCandleTime`
- `marketStatus`
- `executionEnabled`
- `lastError`

Los valores concretos y el transporte (HTTP, archivo local, etc.) se definen en fases posteriores.

---

## 9. Logs

Logs mínimos deseables en runtime maduro:

- startup / shutdown
- servicios y dependencias
- puertos en uso o conflictos
- detección MT5
- bridge / lectura de export
- importación de datos
- eventos de **safety**
- errores con contexto legible

Ubicación y formato: por definir en implementación aprobada.

---

## 10. MVP phases

| Fase | Objetivo |
|------|----------|
| D1 | Auditoría de runtime actual y brechas |
| D2 | Diseño de archivo/config y variables |
| D3 | Script launcher **desarrollo** (no producto final) |
| D4 | Prototipo launcher usuario |
| D5 | Detección MT5 y validación de rutas |
| D6 | Página o panel de **status** unificado |

**Nota de alineación:** esa tabla es **orientativa histórica**. En el repo, **D3.x** cubre scripts dev, **D4/D5.1a** el modelo runtime TS, **D5.1b** el GET de estado, **D6.x** el panel dashboard. La secuencia **D7+** (puente de acciones y launcher) está unificada en [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md) §11 y en [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md) §16.

- **D8.1 (solo documentación):** [`LAUNCHER_PROTOTYPE_DESIGN_D8.md`](./LAUNCHER_PROTOTYPE_DESIGN_D8.md) — diseño del futuro launcher y del puente **launcher-side** (propiedad de PIDs, Windows, puertos, logs, seguridad localhost); **no** implementa launcher, supervisor, `spawn`, ni endpoints `POST`.

### D2 completado (solo diseño)

- Documento: **`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`** — esquema conceptual de configuración del launcher futuro, modelo de **runtime status** (`unknown`, `not_configured`, `not_checked`, `ok`, `error`, etc.), puertos, logs, modos runtime, reglas para **no simular** MT5/bridge real, y defaults de seguridad (`executionEnabled` false, etc.).
- **No** hay implementación de launcher, scripts, API nueva ni código en D2; sirve de base antes de D3 (script dev) y D4+ (launcher usuario).

### D3.1 implementado (preflight dev)

- Script: `pnpm --filter @workspace/scripts mapazapp:dev-preflight` — validación read-only de puertos/scripts e instrucciones de arranque manual; **sin** `child_process`, **sin** MT5, **sin** launcher productivo.

### D3.2 implementado (dev start MVP)

- Script: `pnpm --filter @workspace/scripts mapazapp:dev-start` — preflight + build/start API + Vite dashboard como procesos hijos con shutdown coordinado; **sin** `.exe` productivo, **sin** MT5 runtime, **sin** bridge real, **sin** ejecución.

### D4 implementado (runtime status model TS puro)

- Módulo: `APP/lib/mapazapp-core/src/runtime-status.ts` (`@workspace/mapazapp-core`) — tipos y helpers **sin** I/O; **D5.1a** lo movió desde `@workspace/scripts` para uso compartido; alineado al diseño D2; **sin** endpoint API de runtime status, **sin** UI, **sin** watcher/DB/WebSocket; los scripts D3.x **aún no** lo importan.

---

## 11. Non-goals

- Ejecución real de trades desde Mapazapp launcher **sin** fase y controles aparte.
- Automatización del broker o APIs propietarias no acordadas.
- **Watcher live** continuo hasta aprobación explícita de diseño de riesgo.
- **Base de datos** persistente hasta decisión de persistencia (ver roadmap V2).
- Backend cloud como requisito del MVP descrito aquí.
