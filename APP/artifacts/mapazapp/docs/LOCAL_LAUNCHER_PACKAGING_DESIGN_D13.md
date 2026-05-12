# Mapazapp — Local Launcher Packaging Design D13

## 1. Purpose

- **D13.5** validó el **supervisor API + dashboard** en un run real controlado.
- **D13.6** archivó la **evidencia** de ese run ([`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md)).
- **D13.7** ([`PACKAGING_RUNTIME_DECISION_GATE_D13.md`](./PACKAGING_RUNTIME_DECISION_GATE_D13.md)) **decidió** no saltar directo a **`.exe`**, **MT5** ni **`POST`**; fijó secuencia hacia diseño de packaging y gate ejecutable.
- **D13.8** ([`SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md`](./SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md)) definió **hardening** y **evidence polish** del supervisor como plan (sin implementación en ese checkpoint).
- **D13.9** (**este documento**) **diseña** el **packaging local** y el **launcher futuro** de Mapazapp: **qué** sería, **qué** incluiría, **cómo** se organizaría en disco y **qué** compuertas faltan antes de **D14.0**.
- **D13.9** **no** implementa código, **no** ejecuta procesos, **no** genera **`.exe`**, **no** crea instalador ni **empaquetado real**.
- **Siguiente gate:** [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) (**D14.0**) — compuerta formal del **prototipo launcher local** (opciones, preconditions, allowed scope, layout/manifest/wrapper gates, riesgos y secuencia **D14.1–D14.3**); sigue **sin** `.exe` ni código.

**Relacionado:** [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) (**D14.0**), [`PACKAGING_RUNTIME_DECISION_GATE_D13.md`](./PACKAGING_RUNTIME_DECISION_GATE_D13.md) (**D13.7**), [`SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md`](./SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md) (**D13.8**), [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md), [`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.3**), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md) (**D11.0**), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current baseline

| Aspecto | Estado |
|--------|--------|
| Supervisor **API-only** | **OK** — evidencia **D13.3**. |
| Supervisor **API + dashboard** | **OK** — evidencia **D13.6**. |
| API | **`127.0.0.1:3001`**; health + runtime **GET**. |
| Dashboard | **`127.0.0.1:5173`** (Vite dev en supervisión actual); HTTP `/`, `/config`; **CORS**. |
| Cleanup | **Dashboard → API**; puertos liberados; sin **`taskkill`** amplio. |
| Vite | **`node`** directo al CLI (resolución **D13.5**/**D13.6**). |
| `executionEnabled` | **`false`** en envelope verificado. |
| MT5 / bridge | **`not_configured`**; sin **`POST`** ni action endpoints. |
| Launcher producto | **No** hay **`.exe`** todavía. |

---

## 3. Packaging goals

Objetivos del **packaging / launcher local** futuro (no compromisos de implementación en **D13.9**):

- Permitir al usuario **levantar Mapazapp en local** con **un solo punto de entrada** (launcher), **sin** tener que recordar **`pnpm --filter …`** ni el orden manual de terminales.
- **Orquestar** API + dashboard de forma **controlada**, reutilizando la **lógica probada** del supervisor **D13.5** (preflight, ownership, checks, cleanup).
- Mantener **loopback** por defecto (**`127.0.0.1`**) y puertos acordados (**3001** / **5173** o los que fije el config versionado), **sin** bind WAN en esta fase.
- Preservar **flags de seguridad** del runtime (`mockOnly` / `reviewOnly`, `executionEnabled: false`, MT5/bridge no operativos salvo gates futuros).
- Mantener **no trading** y **no MT5 launch** por defecto; sin **watcher** ni **command files** en el camino feliz.
- Incluir **logs** y **evidencia** **sanitizadas** por run (alineado a **D13.8** y **D9.14.x** en espíritu).
- **Cleanup** ordenado y **solo** sobre hijos registrados; **no** depender de matar procesos ajenos (**D11.6**).

---

## 4. Packaging non-goals (D13.9 diseño)

Queda **fuera** del alcance del launcher/packaging **descrito aquí** en la fase inicial:

- **No** lanzar **MT5** ni abrir terminales MT5 desde el launcher.
- **No** trading real ni automatización (**OrderSend** / **CTrade**).
- **No** **transporte de acciones** (**`POST`**, IPC de acciones, action endpoints).
- **No** **command files** hacia MT5; **no** **watcher** de bridge como producto.
- **No** **DB** operativa Mapazapp; **no** **cloud** ni telemetría obligatoria.
- **No** **updater automático** en segundo plano; **no** **instalador** en esta etapa de diseño.
- **No** **firma** / certificado de código todavía (SmartScreen queda como riesgo documentado).
- **No** **auto-start** con Windows (login shell / Task Scheduler) en el diseño base — solo si un **gate** futuro lo aprueba explícitamente.

---

## 5. Candidate packaging models

### A. Script-based launcher bundle

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Carpeta portable con **scripts** (`cmd`/`ps1`/`.sh`) + artefactos **pre-build**; el usuario ejecuta un script que delega en **Node** ya instalado. |
| **Complejidad** | Baja–media. |
| **Riesgos** | El usuario debe tener **Node** correcto; rutas y permisos en Windows; scripts mal copiados. |
| **Dependencias** | Node en PATH; opcionalmente sin `pnpm` si todo está en `node_modules` plano o bundle. |
| **Tamaño** | Relativamente pequeño si no se embebe Node. |
| **Windows** | Bueno para iteración; cuidado con **ExecutionPolicy** y rutas con espacios. |
| **Ownership** | Igual que supervisor si el script llama al **mismo** binario `node` sobre entrypoints reales. |
| **Logs / config** | Archivos bajo `logs/` y `config/` del layout (§7). |
| **Rollback** | Borrar carpeta; no hay registro de sistema. |
| **Recomendación** | **Útil** como **D14.2** “dry-run manifest” o paso intermedio **antes** de `.exe`. |

### B. Node-based local launcher executable

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Un **`.exe`** (o stub) que empaqueta o localiza **Node** + entrypoint; un solo doble clic o comando corto. |
| **Complejidad** | Media–alta (toolchain empaquetado, updates, SmartScreen). |
| **Riesgos** | Falsos positivos antivirus; fragmentación de versiones Node; firma. |
| **Dependencias** | Toolchain de empaquetado (fuera de alcance **D13.9**). |
| **Tamaño** | Mayor si Node va embebido. |
| **Windows** | Modelo **principal** a largo plazo para usuario no desarrollador. |
| **Ownership** | Debe replicar **D13.5**: **no** wrapper falso; **spawn** solo en módulo acotado (como hoy en scripts). |
| **Logs / config** | Igual §7–§10. |
| **Rollback** | Desinstalar o borrar directorio de instalación. |
| **Recomendación** | **Dirección preferida** tras gates — ver §6. |

### C. Electron / Tauri-style desktop shell

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Ventana nativa + webview; branding fuerte. |
| **Complejidad** | Alta (runtime extra, seguridad webview, tamaño). |
| **Riesgos** | Superficie de actualización y CVE; confusión con “app de trading”. |
| **Dependencias** | Pesadas. |
| **Tamaño** | Grande. |
| **Windows** | Viable pero **prematuro** para Mapazapp en esta fase. |
| **Ownership** | Doble capa (shell + hijos); más sitios donde fallar ownership. |
| **Logs / config** | Más carpetas del runtime del shell. |
| **Rollback** | Complejo. |
| **Recomendación** | **No** ahora; reconsiderar solo si el producto exige ventana única sin navegador. |

### D. Static dashboard + API server embedded

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Dashboard como **`dist`** estático servido por **API** o por servidor mínimo estático; **sin** Vite dev en producción. |
| **Complejidad** | Media (CORS, `base`, rutas, rebuild al cambiar API). |
| **Riesgos** | Desalinear build dashboard con contrato CORS de la API; tamaño de artefacto. |
| **Dependencias** | Build pipeline claro; posible dependencia extra solo para “static serve”. |
| **Tamaño** | Controlado. |
| **Windows** | Favorable (menos procesos que Vite). |
| **Ownership** | Un listener menos (o mismo proceso que API si se fusiona serve estático). |
| **Logs / config** | Centralizados en API + carpeta evidence. |
| **Rollback** | Volver a modo dev supervisor. |
| **Recomendación** | **Probable** destino de “packaging final”; requiere decisión explícita — ver **§15** opcional **D13.9.1**. |

### E. Keep dev supervisor only for now

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Cero packaging; contribuidores siguen con `pnpm` + supervisores **D13**. |
| **Complejidad** | Nula. |
| **Riesgos** | Usuario final sin camino; no cumple objetivos §3. |
| **Dependencias** | Ninguna nueva. |
| **Recomendación** | **No** como destino final; **sí** como **fallback** si **D14.0** se retrasa. |

---

## 6. Recommended packaging direction

**Preferencia inicial (D13.9):** evolucionar hacia un **launcher local basado en Node** (**modelo B**) como **envoltorio** del comportamiento ya probado en **`mapazapp-api-dashboard-supervisor`**, **sin** meter **Electron/Tauri** (**C**) en la primera ola.

**Secuencia propuesta:**

1. **D13.9** (**este doc**) — diseño de packaging y layout **sin** ejecutable.
2. **D14.0** — **gate** de prototipo launcher local (aprobación + checklist §14).
3. **D14.1** — modelo de layout en disco **sin** escritura real de producto (solo TS/docs/tests de rutas virtuales si aplica).
4. **D14.2** — **manifest** / dry-run de empaquetado (**sin** `.exe`): lista de archivos, versiones, hashes opcionales.
5. **D14.3** — **decisión** o prototipo de **wrapper** launcher **no firmado** **solo** si **D14.0** aprueba explícitamente.

**Justificación:**

- Ya existe **supervisor** con **spawn** acotado, orden start/stop, checks y JSON de evidencia (**D13.5**/**D13.6**).
- Un launcher **Node-first** reutiliza esa semántica y el mismo ecosistema de logging/redacción planeado en **D13.8**.
- **Evita** tamaño y riesgo de **C** demasiado pronto.
- Permite definir **layout**, **config**, **logs** y estrategia **estática vs Vite** (**D**) **antes** de tocar toolchains de **`.exe`**.

**Opcional antes de implementar layout:** **D13.9.1 — Static dashboard serving strategy decision** si el equipo quiere **congelar** la elección **Vite dev vs `vite preview` vs estático servido por API** antes de **D14.1**.

---

## 7. Proposed local folder layout

Estructura **conceptual** bajo un raíz de instalación o carpeta portable **`Mapazapp/`** (nombres finales por producto):

```
Mapazapp/
  launcher/          # binarios o scripts de entrada; README de uso
  api-server/        # artefacto construido: dist/index.mjs + package.json mínimo + node_modules o bundle
  dashboard/         # dist estático O paquete mínimo para preview; NO repo monorepo completo
  config/            # launcher-config.json (fuera del repo en installs reales; ver §9)
  logs/              # logs por run o rotación diaria
  evidence/          # JSON por run (runId), sanitizado
  runtime/           # estado efímero opcional (pid file propio, lock de instancia — diseño futuro)
  backups/           # copias de config antes de migración schemaVersion
```

| Carpeta | Qué va | Qué **no** va |
|---------|---------|----------------|
| **launcher/** | Entrypoint documentado, versión embebida, checksum opcional | Código fuente del monorepo completo |
| **api-server/** | Salida de build **api-server** consumible por `node` | Fuentes TS no necesarias en runtime si se optimiza tamaño |
| **dashboard/** | **`dist`** del front o paquete mínimo para servidor estático | `node_modules` de desarrollo completo salvo decisión contraria |
| **config/** | Solo **`LauncherConfig`** validado (**D11.1**) | Secretos, tokens, CSV, rutas crudas sin redacción en copias de soporte |
| **logs/** | Logs redactados, rotación | Volcados completos de build sin límite |
| **evidence/** | JSON por **`runId`** (§10) | Payloads HTTP completos, stacks largos por defecto |
| **runtime/** | Archivos efímeros del launcher (opcional) | Datos de usuario definitivos sin backup |
| **backups/** | Copias de **`config/`** antes de upgrade | Nada ejecutable |

**Fuera del repo Git:** en instalación real, todo el árbol **`Mapazapp/`** (o `%LOCALAPPDATA%\Mapazapp\`) debe estar **ignorado** por Git del desarrollador salvo fixtures de test explícitos.

**`.gitignore` futuro:** patrones para `Mapazapp/logs/**`, `Mapazapp/evidence/**`, `Mapazapp/config/local*.json` si algún dev monta layout dentro del clone.

**Datos sensibles:** rutas de usuario, tokens (no deben existir en config por defecto), contenido de archivos MT5.

**Export para soporte:** zip de **`evidence/`** + últimas N líneas de **`logs/`** con redacción aplicada — nunca repo completo.

---

## 8. Runtime assets

| Activo | Rol |
|--------|-----|
| **api-server `dist`** | **`index.mjs`** (o equivalente) construido desde `APP/artifacts/api-server`; variables **`MAPAZAPP_API_HOST`** / **`MAPAZAPP_API_PORT`**. |
| **Dashboard** | **Opción dev:** Vite como hoy (**riesgo:** no ideal packaging final). **Opción producto:** **`dist`** estático + servidor estático mínimo o integración bajo API (**D13.9.1**). |
| **Node** | Versión mínima documentada; embebida vs sistema — decisión en **D14.x**. |
| **pnpm / workspace** | **Desarrollo:** monorepo + `pnpm`. **Packaging:** objetivo **reducir** dependencia de `pnpm` en runtime (árbol plano, `npm ci` en staging, o bundle). |
| **`node_modules`** | En producción: **subconjunto** mínimo por paquete o bundle; no copiar workspace dev completo sin análisis. |

**Riesgo explícito:** mantener **Vite dev** como modo único del launcher empaquetado **expone** churn de deps, puerto y seguridad de devtools; el diseño debe migrar a **estático** o **preview endurecido** antes del usuario final.

### 8.1 Update strategy (diseño; sin auto-update)

- Artefacto publicado incluye **`launcher/VERSION`** o **`launcher/manifest.json`** (semver + lista de archivos o hashes opcionales en **D14.2**).
- Flujo **manual** recomendado: **parar** launcher supervisado → copiar **`config/`** a **`backups/`** con timestamp → sustituir **`api-server/`**, **`dashboard/`**, **`launcher/`** por la nueva versión → validar **`schemaVersion`** y flags de seguridad → **arrancar** de nuevo.
- **No** actualizador silencioso en segundo plano ni descarga automática de binarios en el alcance **D13.9** (**§4**).
- **Rollback:** restaurar copia desde **`backups/`** y reinstalar carpeta de binarios de la versión anterior que el usuario conserve.

---

## 9. Config model

**Archivo local futuro (conceptual):** `config/launcher-config.json` (o nombre acordado), **fuera** del repo en instalaciones reales.

**Formato sugerido:** **JSON** con **`schemaVersion`** (coherente con **`LauncherConfig`** en **`mapazapp-launcher-config-model.ts`**).

**Campos mínimos propuestos (diseño):**

| Campo | Ejemplo / notas |
|--------|-----------------|
| `schemaVersion` | `"1"` (incrementar solo con migración documentada). |
| `apiHost` | `"127.0.0.1"` |
| `apiPort` | `3001` |
| `dashboardHost` | `"127.0.0.1"` |
| `dashboardPort` | `5173` (o puerto de static server si cambia el modo). |
| `logsRoot` | Ruta absoluta bajo perfil usuario o subcarpeta portable. |
| `evidenceRoot` | Ruta para JSON por run. |
| `allowMt5Launch` | **`false`** por defecto (o ausente = false). |
| `actionTransportEnabled` | **`false`** por defecto. |
| `allowTrading` / `executionEnabled` | **`false`** explícitos a nivel config launcher (además del envelope API). |

**No guardar:** tokens, API keys, secretos MT5, rutas internas del repo del desarrollador en copias que salgan de la máquina sin redacción.

**Redacción:** cualquier log o evidencia que muestre rutas debe usar política de **truncado** / reemplazo de segmentos de usuario (**D13.8** §D).

**Validación antes de start:** **`validateLauncherConfig`** + **`assertLauncherConfigSafety`** (o equivalente) — **fail closed** si flags **unsafe** sin override explícito y aprobación (**D11.8**-style).

---

## 10. Logs and evidence

| Tema | Diseño |
|------|--------|
| **Logs por run** | Subcarpeta o prefijo `logs/YYYYMMDD/runId.log` (texto UTF-8). |
| **Evidencia JSON** | `evidence/runId.json` — una línea o pretty-print según política; **sin** bodies HTTP completos. |
| **Rotación** | N últimos días o tamaño máximo total configurable en doc de producto. |
| **Sanitización** | Alineado **D9.14.2** (API) y plan **D13.8** (supervisor). |
| **CSV / stacks** | **No** CSV crudo; stacks solo en modo debug explícito **off** por defecto. |
| **`runId`** | UUID v4 o monotonic; en todas las entradas del mismo run. |
| **Timestamps** | `startedAt` / `stoppedAt` ISO-8601. |
| **Cleanup** | Campos `cleanupStatus`, `apiPortFreed`, `dashboardPortFreed` en evidencia. |
| **Git / build** | `gitHead`, versión de paquete launcher, opcional `buildId` — todo **sin** secretos. |

---

## 11. Process supervision in packaged mode

- **Reutilizar** la semántica del supervisor **API + dashboard** (**D13.5**): mismos invariantes de **preflight**, **build opcional**, **health**, **runtime**, **HTTP dashboard**, **CORS**, **cleanup**.
- **Orden de start:** **API primero**, luego **dashboard** (como hoy cuando el diseño lo exige tras health API).
- **Orden de stop:** **Dashboard primero**, luego **API** (evidencia **D13.6**).
- **Ownership:** **`node`** directo a entrypoints reales; **no** **`pnpm.cmd`** como dueño del **LISTEN**; correlación **PID ↔ puerto** verificable.
- **Timeouts:** presupuesto por fase (**D13.8** §E); **fail closed** si no hay listener en el puerto fijo.
- **Puertos:** conflicto → **abort** sin matar ocupante ajeno.
- **Stale process:** si el hijo muere sin liberar puerto, **no** asumir cleanup exitoso; reportar fase y sugerir intervención humana **sin** `taskkill` amplio (**D11.6**).

---

## 12. Windows considerations

- **Rutas con espacios:** siempre citar rutas en scripts; launcher debe usar APIs de proceso que escapen correctamente.
- **PowerShell vs cmd:** documentar **un** camino oficial (p. ej. `MapazappLauncher.cmd` que llama a `node`); evitar duplicar lógica divergente.
- **Antivirus / SmartScreen:** binarios no firmados pueden bloquearse; plan de firma es **post** **D14.0** gate.
- **Permisos:** escritura en `%LOCALAPPDATA%\Mapazapp` vs carpeta portable en `Program Files` (evitar si requiere admin).
- **Puerto ocupado:** mensajes claros; **no** matar proceso desconocido.
- **Firewall:** loopback raramente bloqueado; no abrir reglas públicas sin gate.
- **Logs:** `%LOCALAPPDATA%\Mapazapp\logs` vs portable — decisión de producto en **D14.1**.
- **Node en PATH vs ruta absoluta:** el launcher debe resolver **`node.exe`** de forma determinista si va embebido.
- **Long paths / MAX_PATH:** preferir rutas cortas bajo AppData o habilitar políticas documentadas.
- **Encoding:** logs UTF-8; consola codepage en **cmd** — documentar limitaciones.
- **Evidencia:** nunca rutas completas de perfiles en exports públicos.

---

## 13. Security and safety

- **Solo loopback** por defecto; **no** bind `0.0.0.0` sin gate y hardening dedicado.
- **No trading**; **no** MT5 launch desde launcher en el perfil base.
- **No** **`POST`** de transporte de acciones hasta **D9.x** completos.
- **No secretos** en logs ni evidencia por defecto.
- **No telemetría** / nube obligatoria.
- **No auto-update** silencioso.
- **No** requerir **admin** si el layout vive en espacio de usuario.
- **No** escalada de privilegios: el launcher **no** pide elevación salvo instalador explícito futuro.

---

## 14. Validation gates before executable

Antes de **cualquier** **`.exe`** o instalador (refuerzo de **D13.7** §7):

| # | Gate |
|---|------|
| 1 | **Diseño de packaging** (**D13.9**) revisado y aprobado. |
| 2 | **Layout local** (**§7**) y ubicación de datos aprobados. |
| 3 | **Modelo de config** persistido (**§9**) y política de migración **`schemaVersion`**. |
| 4 | **Logs y evidencia** (**§10**) — rotación, redacción, retención. |
| 5 | **Hardening de supervisor** — plan **D13.8** cumplido o **D13.8.1** cerrado si hubo brecha. |
| 6 | **Estrategia de dashboard** — estático vs dev (**D13.9.1** si aplica) **decidida**. |
| 7 | **Tests** del repo en verde. |
| 8 | **Evidencia de run manual** reciente (supervisor o launcher candidato) **OK**. |
| 9 | **No MT5**, **no POST**, **no trading** en el prototipo. |
| 10 | **Aprobación explícita** (**D11.8**-style). |

---

## 15. Recommended next checkpoints

| Checkpoint | Contenido |
|------------|-----------|
| **D13.9** | **Este documento** — diseño packaging local **sin** ejecutable. |
| **D13.9.1** (opcional) | **Decisión** estrategia de **servido del dashboard** (estático / preview / embebido). **D14.0** ([`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) §5) la deja **abierta** para **D14.1** y **bloqueante** antes de **D14.2**/`.exe`. |
| **D14.0** | **Local launcher prototype gate** — aprobación + checklist §14; documentado en [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md). |
| **D14.1** | **Modelo de layout** en disco **sin** escrituras reales de producto (o solo tests/fixtures). |
| **D14.2** | **Packaging dry-run manifest** — lista de artefactos, versiones, **sin** `.exe`. |
| **D14.3** | **Decisión / prototipo** wrapper launcher **no firmado** **solo** si **D14.0** autoriza. |

---

## 16. Non-goals (D13.9)

**D13.9** **no** incluye:

- Implementación de **código**, **`.exe`**, **instalador**, **`spawn`**, **`child_process`** nuevos.
- **Arranque** de API, dashboard, supervisor, **`mapazapp:dev-start`**, **MT5**, **watcher**, **command files**.
- **`POST`**, **action endpoints**, **DB**, **WebSocket live**, **trading**.
- **`git push`** ni distribución de binarios.
