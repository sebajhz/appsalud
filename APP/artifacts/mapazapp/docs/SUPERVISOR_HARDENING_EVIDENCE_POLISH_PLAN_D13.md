# Mapazapp — Supervisor Hardening / Evidence Polish Plan D13

## 1. Purpose

- **D13.5** validó el **supervisor API + dashboard** en un run real controlado.
- **D13.6** archivó la **evidencia** de ese run ([`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md)).
- **D13.7** ([`PACKAGING_RUNTIME_DECISION_GATE_D13.md`](./PACKAGING_RUNTIME_DECISION_GATE_D13.md)) **decidió** **no** saltar directo a **empaquetado**, **MT5** ni **`POST`**: la secuencia pasa primero por **hardening / evidencia** explícitos.
- **D13.8** (**este documento**) define **qué** endurecer y **cómo** pulir la **evidencia** y la **salida** de los supervisores **antes** del **diseño de packaging** (**D13.9**).
- **D13.8** es **solo** documentación y análisis: **no** implementa código, **no** ejecuta procesos, **no** modifica scripts.

**Update D14.0:** la compuerta **D14.0** ([`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md)) **no quedó bloqueada por D13.8** — la **Opción 1** (docs-only → **D13.9** → **D14.0**) se mantuvo y **D13.8.1** sigue **opcional**: solo se abre si una **brecha concreta** (p. ej. path leak, necesidad de `runId` antes de congelar contrato) lo justifica antes de **D14.1** o de cualquier `.exe`.

**Relacionado:** [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) (**D14.0**), [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md) (**D13.9**), [`PACKAGING_RUNTIME_DECISION_GATE_D13.md`](./PACKAGING_RUNTIME_DECISION_GATE_D13.md) (**D13.7**), [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md), [`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.3**), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current supervisor baseline

| Aspecto | Estado |
|--------|--------|
| Supervisor **API-only** | **OK** — `mapazapp:api-only-supervisor`; evidencia **D13.3**. |
| Supervisor **API + dashboard** | **OK** — `mapazapp:api-dashboard-supervisor`; evidencia **D13.6**. |
| API | **`127.0.0.1:3001`**; health + runtime **GET** verificados. |
| Dashboard | **`127.0.0.1:5173`** (Vite dev); **`GET`** `/` y `/config`; **CORS** con `Origin` dev. |
| Checks | **healthz**, **runtime/status**, HTTP dashboard, **CORS** — coherentes con diseño **D13.4**. |
| Cleanup | **Dashboard → API**; **`waitUntilListenGone`**; puertos liberados. |
| Vite | **CLI** con **`node` directo** (`vite/package.json` → `bin/vite.js`); sin dueño falso **`pnpm`**. |
| `executionEnabled` | **`false`** en envelope verificado. |
| MT5 / bridge | **`not_configured`**; sin **`POST`**, sin action endpoints, sin **`.exe`**. |
| Tests | Casos **A–H** (API-only), **A–M** (API+dashboard) en `@workspace/scripts`. |

---

## 3. Lessons learned

| Lección | Implicación para hardening |
|--------|----------------------------|
| **Wrapper vs listener** | Riesgo **real**; el PID registrado debe ser el del **proceso que hace LISTEN** (o correlación verificable). |
| **API** | **`node`** directo sobre `artifacts/api-server` — patrón **probado**; mantener en cualquier refactor de start. |
| **Vite** | **`createRequire`** + **`vite/package.json`** → **`bin/vite.js`** — Vite 7 **no** exporta `vite/bin/vite.js` directo; documentar y **testear** resolución ante upgrades. |
| **Ownership falso** | **No** aceptar; fail closed si el listener **no** corresponde al hijo esperado. |
| **Puerto alternativo** | **No** aceptar cambio automático de puerto; **abort** + cleanup si el servicio elige otro puerto. |
| **Kill global** | **No** matar por nombre de proceso global; **no** **`taskkill`** amplio (**D11.6**). |
| **Evidencia JSON** | Salida **`--json`** **segura** y **estable** es **clave** para auditoría, CI y transición a **packaging** — debe evolucionar de forma **versionada** y **redactada**. |

---

## 4. Hardening areas

Convención de columnas: **código** = cambios TS en supervisores/helpers; **run real** = ejecución supervisada aprobada para evidencia.

### A. Error taxonomy

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Fases `phase` string y `errors[]` con mensajes mixtos (`api_build_exit_nonzero`, `blocked_*`, etc.); útil para depuración interna. |
| **Brecha** | Taxonomía **no** documentada como contrato estable; consumidores externos no saben mapear `phase` → acción humana. |
| **Riesgo** | Integración packaging/CI frágil; duplicación de strings en clientes. |
| **Propuesta** | Tabla **documentada** `phase` / `errorCode` / severidad / “acción sugerida (humana)”; opcional **`errorCode`** estable en JSON sin romper `errors[]` legacy. |
| **Prioridad** | **Alta** (documentación primero; código opcional). |
| **¿Código?** | Opcional (añadir campo `errorCode` o enum exportado). |
| **¿Run real?** | Opcional para capturar línea JSON de ejemplo por fase de fallo. |
| **Tests** | Tests TS que asertan `phase` en fallos simulados (ya parcialmente cubierto); golden JSON por fase si se versiona schema. |

### B. JSON evidence schema stability

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Objeto resumen rico (`ok`, `phase`, PIDs, flags HTTP/CORS, cleanup, `gitHead`, etc.); **sin** `schemaVersion` explícito ni `runId`. |
| **Brecha** | Cambios futuros pueden **romper** parsers; no hay compromiso de compatibilidad hacia atrás. |
| **Riesgo** | Regresiones silenciosas en CI o herramientas externas. |
| **Propuesta** | **`evidenceSchemaVersion`** (entero o semver doc-only primero); política de **campos opcionales** vs requeridos; deprecación explícita. |
| **Prioridad** | **Alta**. |
| **¿Código?** | Sí para campo nuevo; doc puede preceder implementación. |
| **¿Run real?** | Sí una vez implementado el campo, para archivar muestra. |
| **Tests** | Snapshot JSON mínimo en tests; rechazar campos desconocidos **opcional** (solo si hay consumidor estricto). |

### C. Human-readable output polish

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Banners y líneas de progreso útiles para desarrolladores; modo **`--json`** silencia o compone según implementación actual. |
| **Brecha** | Mensajes de fallo a veces **densos**; poca guía “qué hacer si el puerto está ocupado” sin leer código. |
| **Riesgo** | Operador ejecuta comandos riesgosos (liberar puerto a mano con kill global). |
| **Propuesta** | Plantillas **fail-closed** (“puerto X ocupado: no se mató ningún proceso; verifique…”) alineadas **D11.6**. |
| **Prioridad** | **Media**. |
| **¿Código?** | Sí (strings / flujo stderr). |
| **¿Run real?** | Opcional (capturas para doc). |
| **Tests** | Tests de substring seguros (sin rutas absolutas del dev). |

### D. Log redaction / sanitized evidence

| Campo | Detalle |
|--------|---------|
| **Estado actual** | JSON de evidencia acotado; builds vía `execFileSync` — salida **no** siempre incorporada al JSON de forma redactada. |
| **Brecha** | Riesgo de **rutas de usuario** completas o fragmentos de env en errores de build si se amplía logging. |
| **Riesgo** | Fuga de **PII** / paths en tickets CI o logs compartidos. |
| **Propuesta** | Función única **`sanitizePathForEvidence`** (o reutilizar patrones **D9.14.2** / display sanitizers existentes); **nunca** volcar stdout completo de build en JSON. |
| **Prioridad** | **Alta** antes de exponer supervisores a entornos menos confianza. |
| **¿Código?** | Sí. |
| **¿Run real?** | Opcional. |
| **Tests** | Paths sintéticos `C:\Users\…`, home Unix, verificar redacción en JSON y stderr simulado. |

### E. Timeout policy

| Campo | Detalle |
|--------|---------|
| **Estado actual** | **`--max-wait-ms`** global por fases mayores (default **25000**). |
| **Brecha** | Sub-fases (build vs listen vs HTTP) comparten el mismo techo; poco **observable** cuál sub-fase agotó tiempo. |
| **Riesgo** | Flakes en CI lentos o máquinas rápidas que enmascaran regresión de performance. |
| **Propuesta** | Documentar **presupuestos** por fase; opcional desglose `timeouts: { buildApiMs, … }` solo en doc primero, luego código. |
| **Prioridad** | **Media**. |
| **¿Código?** | Opcional. |
| **¿Run real?** | Opcional (p. ej. `--max-wait-ms` bajo en test de timeout). |
| **Tests** | Ya hay enfoque de timeout en tests; extender por fase si se implementa desglose. |

### F. Port ownership / listener confirmation

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Preflight puerto libre; verificación HTTP/dashboard; ownership dashboard explícito en diseño **D13.4** / implementación **D13.5**. |
| **Brecha** | Documentar **invariantes** ejecutables (qué significa “owner OK”) como contrato de test único entre API-only y API+dashboard. |
| **Riesgo** | Regresión en una variante sin notarlo. |
| **Propuesta** | Sección única “**invariantes de ownership**” compartida en doc + tests espejo. |
| **Prioridad** | **Media**. |
| **¿Código?** | Mínimo (refactor compartido **opcional**). |
| **¿Run real?** | Opcional. |
| **Tests** | Ya cubren fallos de listener; añadir casos límite si aparecen en code review. |

### G. Cleanup robustness

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Orden dashboard → API; señales a hijos propios; espera listener libre. |
| **Brecha** | Escenarios **cleanup parcial** (p. ej. API detenida, dashboard colgado) menos documentados en taxonomía de error. |
| **Riesgo** | Puertos ocupados tras fallo compuesto; operador sin guía. |
| **Propuesta** | Matriz de **estado final** (`cleanupStatus`, `apiPortFreed`, …) para cada clase de fallo; tests de simulación de hijo que no muere a tiempo. |
| **Prioridad** | **Media–alta**. |
| **¿Código?** | Sí para más ramas de test / pequeños ajustes de timeout cleanup. |
| **¿Run real?** | Difícil de automatizar sin riesgo; preferir tests con mocks de proceso. |
| **Tests** | “Child ignores SIGTERM” simulado con deps inyectadas si el diseño lo permite. |

### H. Build strategy and failure reporting

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Build API + build mapazapp antes de start (salvo `--skip-build`); códigos de salida de build capturados en `errors`. |
| **Brecha** | Mensajes de build **no** estandarizados; poca orientación “re-ejecutar build manual con filtro X”. |
| **Riesgo** | Tiempo perdido en CI sin clasificar fallo **build** vs **runtime**. |
| **Propuesta** | `errorCode` dedicados `build_api_failed` / `build_dashboard_failed` en contrato; doc con comandos **`pnpm --filter … build`** exactos. |
| **Prioridad** | **Media**. |
| **¿Código?** | Opcional (solo normalización de strings / códigos). |
| **¿Run real?** | No necesario si tests cubren. |
| **Tests** | Mock `execFileSync` para exit ≠ 0 (si aún no cubierto exhaustivamente). |

### I. Config validation / local config readiness

| Campo | Detalle |
|--------|---------|
| **Estado actual** | `LauncherConfig` + `validateLauncherConfig` / `assertLauncherConfigSafety` en supervisores (**D11.1**). |
| **Brecha** | **No** hay archivo local persistido; flags “unsafe” bien bloqueados pero historia de **evolución** hacia config en disco pendiente de **D13.9**. |
| **Riesgo** | Duplicar validación entre supervisor y futuro launcher. |
| **Propuesta** | En **D13.8** solo **lista de invariantes** que el launcher debe **reutilizar** (single source of truth); en **D13.9** decidir I/O. |
| **Prioridad** | **Baja** en código D13.8; **alta** en texto de handoff a **D13.9**. |
| **¿Código?** | **No** en D13.8. |
| **¿Run real?** | **No**. |
| **Tests** | Mantener cobertura actual de config en supervisores. |

### J. Exit codes

| Campo | Detalle |
|--------|---------|
| **Estado actual** | **0** éxito, **1** fallo operativo, **2** args inválidos (documentado en `--help`). |
| **Brecha** | Un solo código para muchos fallos; CI no distingue “args” vs “puerto ocupado”. |
| **Riesgo** | Bajo hoy; puede crecer con packaging. |
| **Propuesta** | Mantener **0/1/2** estable; enriquecer **solo** JSON por fase — evitar proliferar exit codes sin gate. |
| **Prioridad** | **Baja** salvo nuevo requisito CI. |
| **¿Código?** | Preferible **no** sin gate explícito. |
| **¿Run real?** | **No**. |
| **Tests** | Assert exit code en tests existentes. |

### K. Evidence file export decision

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Una línea **JSON** a stdout con **`--json`**. |
| **Brecha** | **No** hay archivo `evidence-*.json` opcional; no hay **`runId`** persistente. |
| **Riesgo** | Pérdida de evidencia en redirecciones mal hechas; CI sin artefacto adjunto. |
| **Propuesta** | Decidir en **D13.8.1** o **D13.9**: **`--evidence-file <path>`** opt-in con redacción obligatoria; o dejar **solo** stdout y documentar patrón PowerShell/Bash seguro. |
| **Prioridad** | **Media** (decisión más que código inmediato). |
| **¿Código?** | Solo si se aprueba **D13.8.1**. |
| **¿Run real?** | Sí si se implementa flag. |
| **Tests** | Escritura en `os.tmpdir()` con cleanup en test. |

### L. Windows-specific process behavior

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Uso de **`node`**, paths `join`/`resolve`; tests en Node. |
| **Brecha** | Diferencias **SIGTERM** / job objects / consolas ocultas no exploradas para launcher futuro. |
| **Riesgo** | Hijo huérfano en escenarios GUI launcher (**D14.x**). |
| **Propuesta** | Documentar **limitaciones actuales** del prototipo CLI; enlazar a **D11.0** § Windows; nada de **`taskkill`**. |
| **Prioridad** | **Media** para doc; **baja** para código en supervisores actuales. |
| **¿Código?** | Defer a launcher; supervisores solo notas. |
| **¿Run real?** | Opcional manual Windows. |
| **Tests** | Normalización de rutas (ver **D**). |

### M. CI/test coverage

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Cobertura **A–M** / **A–H** fuerte en unit/integration simulada. |
| **Brecha** | Falta **matriz documentada** “fase → test IDs”; JSON schema snapshots opcionales. |
| **Riesgo** | Regresión al tocar orden de fases. |
| **Propuesta** | Tabla en doc o en comentario de test file index; opcional **contract test** JSON mínimo. |
| **Prioridad** | **Media**. |
| **¿Código?** | Opcional (snapshots). |
| **¿Run real?** | **No** obligatorio. |
| **Tests** | Snapshots controlados + revisión humana en PR. |

### N. Documentation drift / handoff consistency

| Campo | Detalle |
|--------|---------|
| **Estado actual** | Varios docs **D13** coherentes; `RUNTIME_AND_LAUNCHER_STRATEGY` y **`CURSOR_HANDOFF`** actualizados por hitos. |
| **Brecha** | Comentarios en código (p. ej. header supervisor) pueden **desalinearse** de resolución Vite real. |
| **Riesgo** | Contribuidor sigue comentario obsoleto. |
| **Propuesta** | Regla: **un** párrafo fuente de verdad en doc de diseño/evidencia; comentarios TS solo puntero “ver doc X §Y”. |
| **Prioridad** | **Baja** pero barata. |
| **¿Código?** | Solo ajuste de comentarios cuando exista **D13.8.1**. |
| **¿Run real?** | **No**. |
| **Tests** | **No** aplica. |

---

## 5. Evidence polish proposal

### 5.1 Campos deseables (futuro contrato)

| Campo | Rol |
|--------|-----|
| `runId` | UUID o monotonic id por ejecución (generado al inicio). |
| `checkpoint` | p. ej. `D13.5` / `D13.8.2-evidence`. |
| `gitHead` | SHA completo (ya presente en forma similar). |
| `gitStatusInitial` / `gitStatusFinal` | Resumen **redactado** o hash de estado; **null** si deshabilitado. |
| `startedAt` / `stoppedAt` | ISO-8601 UTC o local **declarado**. |
| `apiPid` / `dashboardPid` | PIDs hijos registrados (dashboard opcional en API-only). |
| `ports` | `{ api: { host, port }, dashboard?: { host, port } }`. |
| `healthSummary` | `{ ok, statusCode?, latencyMs? }` — sin body crudo. |
| `runtimeSummary` | Subconjunto estable: `runtimeMode`, `executionEnabled`, flags mock/review, MT5/bridge **agregados**. |
| `dashboardSummary` | `{ httpOk, configHttpOk, baseUrlRedacted }`. |
| `corsSummary` | `{ ok, originRedacted }`. |
| `cleanupSummary` | `cleanupStatus`, `apiPortFreed`, `dashboardPortFreed`. |
| `errors` | Lista de códigos/mensajes **sanitizados**. |
| `warnings` | No bloqueantes (p. ej. “git status skipped”). |
| `safetyFlags` | Objeto explícito: `mt5Launched: false`, `postTouched: false`, etc. |
| `scopeConfirmations` | Booleans de alcance (“noTaskkill”, “noAlternatePort”, …). |

### 5.2 Qué **no** guardar en evidencia

- **No** logs crudos grandes de build o de Vite/API.
- **No** rutas privadas del usuario sin **redacción**.
- **No** tokens, cookies, headers sensibles completos.
- **No** CSV ni datos de mercado.
- **No** stack traces completos salvo **modo debug** explícito, **off** por defecto y **no** apto para CI compartido.

---

## 6. CLI / user output polish proposal

- **Salida humana:** párrafos cortos por fase (`preflight` → `build` → `start` → `verify` → `cleanup`); iconografía ASCII **opcional** y consistente.
- **Salida JSON:** una línea final **estable**; stderr para diagnóstico **redactado** si se separa.
- **Exit codes:** mantener **0 / 1 / 2** documentados hasta nuevo gate.
- **`--help`:** ejemplos de comando **copy-paste** seguros (sin rutas absolutas del autor).
- **Fail-closed:** si falla preflight de puerto → mensaje que **prohíbe** kill global; sugerir `netstat`/Resource Monitor como **lectura** solamente.
- **Cleanup tras fallo:** instrucciones “si el supervisor abortó en fase X, los hijos propios deberían haberse detenido; si el puerto sigue ocupado, **no** era hijo de este run”.
- **Privacidad:** no imprimir `USERPROFILE` completo ni home.
- **Lenguaje:** evitar **“ready to trade”**, **“live trading”**, **“ejecutar órdenes”**; usar **mock**, **review**, **execution disabled**.

---

## 7. Test hardening proposal (futuro)

| Propuesta de test | Notas |
|-------------------|--------|
| Schema JSON mínimo | Validar claves requeridas + tipos básicos en objeto serializado. |
| Exit code por fase de fallo | Mantener mapeo documentado `phase` → exit `1`. |
| Redacción de rutas privadas | Fixtures `E:\Users\…`, `/home/…` → forma truncada. |
| Cobertura taxonomía de error | Cada `errorCode` documentado tiene al menos un test simulado. |
| Timeout | Forzar timeout corto y assert `phase` / mensaje. |
| Fallo ownership dashboard | Listener no aparece → fase bloqueada acordada. |
| Fallo cleanup parcial | Simular hijo que retrasa exit. |
| Build failure | Mock exit code ≠ 0 y assert JSON. |
| Sin tokens inseguros | Regex / snapshot sin `Bearer`, `api_key`, etc. |
| Normalización Windows paths | Solo en evidencia serializada. |
| Barrido estático | **No** `OrderSend` / `CTrade` / `taskkill` / `POST` en módulos supervisor (tests de contenido o eslint rule existente si aplica). |

---

## 8. Decision: implement hardening now or defer

| Opción | Descripción | Cuándo elegir |
|--------|-------------|----------------|
| **1 — D13.8 docs-only → D13.9** | Cerrar plan en **este** doc; **siguiente** ticket **D13.9** diseño packaging **sin** ejecutable. | Supervisor y evidencia **D13.3**/**D13.6** ya considerados **suficientes** para **diseñar** packaging; hardening **incremental** se programa por tickets pequeños **tras** diseño. |
| **2 — D13.8.1 implementación polish** | Implementar mejoras de **§4–§7** (JSON schema version, redacción, mensajes, tests) **antes** de **D13.9**. | Si en revisión conjunta aparecen **brechas pequeñas** críticas (p. ej. riesgo de path leak en CI compartido o necesidad de `runId` **antes** de congelar contrato de launcher). |
| **3 — Defer hardening** hasta implementación de packaging | Posponer todo cambio de supervisor hasta empaquetado. | **No recomendado:** acopla packaging a deuda técnica de evidencia; contradice **D13.7** §4. |

**Recomendación de este plan:** adoptar **Opción 1** como **ruta principal**: pasar a **D13.9 — Packaging design for local launcher, no executable** en paralelo documental. Abrir **D13.8.1** (**Opción 2**) solo si el **review** de **D13.9** o de seguridad exige cambios de contrato JSON/redacción **antes** de cualquier código de empaquetado. **No** mezclar hardening masivo con el doc de packaging: **D13.9** define artefactos; **D13.8.1** ejecuta mejoras acotadas con tests.

---

## 9. Recommended next checkpoints

1. **D13.8** (**este documento**) — plan de hardening / polish, **sin** implementación.
2. **D13.9** — **Packaging design for local launcher**, **sin** ejecutable — **documentado** en [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md).
3. **Opcional — D13.8.1** — implementación acotada de evidencia/salida (si brecha justificada).
4. **Opcional — D13.8.2** — run de evidencia **después** de polish (archivo tipo **D13.6**).
5. **D14.0** — **Local launcher prototype gate** — documentado en [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md); abre la secuencia **D14.1 → D14.2 → D14.3** (layout model → packaging dry-run manifest → wrapper prototype decision); **sin** `.exe` en sí mismo. **D13.8 no bloqueó D14.0**; **D13.8.1** queda **opcional**.

---

## 10. Non-goals (D13.8)

**D13.8** **no** incluye:

- Implementación de **código**, **API start**, **dashboard start**, **supervisor run**, **`mapazapp:dev-start`**.
- **MT5**, **watcher**, **command files**, **`POST`**, **action endpoints**, **botones** operativos.
- **Launcher `.exe`**, **instalador**, **IPC** real, **DB**, **WebSocket live**, **trading**.
- **`spawn`**, **`child_process`**, **`taskkill`**, **`process.kill`** nuevos (no hay cambios en repo en este checkpoint).
- **`git push`**.
