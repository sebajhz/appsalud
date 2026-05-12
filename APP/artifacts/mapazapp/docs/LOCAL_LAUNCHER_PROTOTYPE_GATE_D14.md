# Mapazapp — Local Launcher Prototype Gate D14

## 1. Purpose

- **D13.9** ([`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md)) **cerró** el **diseño de packaging local** del launcher (layout, assets, config, logs, supervisión empaquetada, Windows, gates) **sin** generar **`.exe`** y **sin** código.
- **D14.0** (**este documento**) **abre la compuerta formal** para decidir si se autoriza un **prototipo de launcher local** futuro y, en ese caso, **bajo qué condiciones**, **en qué orden** y **con qué prohibiciones**.
- **D14.0 no implementa nada**: **no** crea launcher, **no** genera **`.exe`**, **no** empaqueta, **no** ejecuta procesos, **no** levanta API, dashboard, supervisor, MT5 ni watcher.
- **D14.0 no asume MT5**, **no** asume **`POST`**, **no** asume **action endpoints**, **no** asume **trading**.
- **D14.0** es **solo documentación / análisis**.

**Relacionado:** [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md) (**D13.9**), [`LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md`](./LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md) (**D14.1**), [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) (**D14.2**), [`LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md`](./LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md) (**D14.3**), [`PACKAGING_RUNTIME_DECISION_GATE_D13.md`](./PACKAGING_RUNTIME_DECISION_GATE_D13.md) (**D13.7**), [`SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md`](./SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md) (**D13.8**), [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.6**), [`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.3**), [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) (**D13.4**/**D13.5**), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md) (**D11.0**), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md) (**D2**), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md) (**D11.6**), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md) (**D11.7**), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) (**D11.8**), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current baseline

| Aspecto | Estado |
|--------|--------|
| Supervisor **API-only** | **OK** — `mapazapp:api-only-supervisor`; evidencia **D13.3**. |
| Supervisor **API + dashboard** | **OK** — `mapazapp:api-dashboard-supervisor`; evidencia **D13.6**. |
| API | **`127.0.0.1:3001`** (loopback por defecto, **D9.12**); health + runtime **GET** verificados; CORS allowlist Vite dev (**D9.13**); body limits + safe error handler (**D9.14.1**); log redaction (**D9.14.2**). |
| Dashboard | **`127.0.0.1:5173`** (Vite dev en supervisión actual); HTTP **`/`** y **`/config`** **OK**; **CORS** con `Origin: http://127.0.0.1:5173` **OK**. |
| Cleanup | **Dashboard → API**; `waitUntilListenGone`; puertos liberados; **sin** `taskkill` amplio. |
| Vite ownership | **Resuelto** — `node` directo al CLI vía `vite/package.json` → `bin/vite.js` (**D13.5**/**D13.6**); **no** wrapper `pnpm` como dueño del **LISTEN**. |
| Diseño **packaging** local | **D13.9 cerrado** ([`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md)) — dirección recomendada: **launcher Node-based** evolucionando desde supervisor API + dashboard. |
| `executionEnabled` | **`false`** en envelope verificado (**D5.1b**, supervisores **D13**). |
| MT5 / bridge | **`not_configured`**; **sin** launch, watcher ni command files en alcance D13/D14.0. |
| Acciones | **No** **`POST`**, **no** action endpoints operativos; **no** botones operativos del dashboard; transporte **D9.6**/**D9.7** sigue como diseño. |
| Launcher producto | **No** hay **`.exe`** todavía; `mapazapp:dev-start` sigue siendo **helper de desarrollo**. |
| Persistencia / canales | **No** DB operativa Mapazapp; **no** WebSocket live; **no** `localStorage` nuevo obligatorio en este alcance. |

---

## 3. What a launcher prototype means

A los efectos de **D14.0**, un **launcher prototype** local sería:

- Un **wrapper local** que **reutiliza** la lógica del **supervisor** **D13.5** (preflight, ownership, checks, cleanup, evidencia JSON segura).
- **Control** unificado de **API** + **dashboard** (start, stop, estado).
- **Start/stop controlado** — orden API → dashboard al subir; dashboard → API al bajar.
- **Logs / evidencia** sanitizados por run (alineado a **D9.14.2**, plan **D13.8** y **§10** de **D13.9**).
- **Config local** **futura** (modelo **D11.1**); en el prototipo puede seguir siendo **derivada** del supervisor **sin** archivo en disco hasta que **D14.1** apruebe layout.
- **Proceso local**, **loopback only** (**`127.0.0.1`**); **no** abrir WAN.
- **No trading**, **no** MT5 launch, **no** **action transport** operativo en el primer prototipo.

### Diferencias clave (no confundir niveles)

| Capa | Qué es | Qué **no** es |
|------|---------|----------------|
| **Supervisor script actual** (**D13.5**) | Script TS bajo `@workspace/scripts` — `spawn` confinado; orquesta API + dashboard en supervisión local. | **No** producto; **no** instalable por usuario final. |
| **Launcher prototype** (objeto de **D14.x**) | Envoltorio Node sobre la semántica del supervisor — entrypoint único, evidencia, config local en evolución. | **No** **`.exe`**; **no** instalador; **no** auto-update; **no** trading. |
| **Launcher executable** (eventual **D14.3+** bajo nuevo gate) | Binario empaquetado (modelo **B** de **D13.9 §5**) — Node embebido o resuelto, single entry point. | **No** action transport por sí mismo; **no** MT5; sigue **loopback** y **mockOnly/reviewOnly**. |
| **Installer** (más allá de **D14.x**) | Paquete distribuible firmado con flujo de instalación/actualización documentado. | **No** auto-update silencioso; **no** elevación de privilegios obligatoria. |

---

## 4. Gate decision options

Cada opción se evalúa contra los **non-goals** del alcance **D13/D14.0** (sin **`.exe`**, sin MT5, sin **`POST`**, sin trading) y contra el baseline **D13.6**/**D13.9**.

### A. Avanzar a D14.1 layout model sin escrituras reales

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Modelo conceptual / TS de **layout en disco** (carpetas `launcher/`, `api-server/`, `dashboard/`, `config/`, `logs/`, `evidence/`, `runtime/`, `backups/` — **D13.9 §7**) **sin** crear archivos reales. |
| **Riesgos** | Bajo: solo doc/TS sin I/O; riesgo de **drift** si después packaging real elige otro layout. |
| **Archivos probables** | Doc nuevo `LOCAL_LAUNCHER_LAYOUT_MODEL_D14.md` y/o módulo TS puro tipo `mapazapp-launcher-layout-model.ts` con tests; **sin** `fs.writeFile`. |
| **¿Requiere código?** | Opcional (si modelo TS); puede empezar **solo** doc. |
| **¿Requiere run real?** | **No**. |
| **¿Requiere dependencias?** | **No**. |
| **Validaciones** | Tests de modelo (rutas válidas, defaults seguros, `schemaVersion` coherente con **D11.1**), revisión cruzada con **D13.9 §7–§9**. |
| **Rollback** | Borrar/deprecar doc + módulo si se cambia diseño; no hay artefactos productivos. |
| **Recomendación** | **Recomendada** como **siguiente paso natural** tras **D13.9** y **D14.0**. |

### B. Insertar D13.9.1 static dashboard serving strategy decision antes de D14.1

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Cierra una **decisión abierta** clave de **D13.9 §6**/§15: **Vite dev** vs **`vite preview`** vs **estático servido por API o launcher** — antes de modelar layout/manifest. |
| **Riesgos** | Retrasa **D14.1** por una decisión que puede dejarse abierta para **layout** y cerrarse antes de **packaging dry-run** (**D14.2**) o del **wrapper** (**D14.3**). |
| **Archivos probables** | `STATIC_DASHBOARD_SERVING_STRATEGY_DECISION_D13.md` (o nombre equivalente). |
| **¿Requiere código?** | **No**. |
| **¿Requiere run real?** | **No** obligatorio; puede analizarse build estático sin ejecutar. |
| **¿Requiere dependencias?** | **No** en el doc; futuras opciones podrían requerir paquete extra (ej. `serve-static`) — **fuera** de **D13.9.1**. |
| **Validaciones** | Revisión cruzada con **D13.9 §5 D**, **§8**, **§14 #6**; tabla de pros/contras Vite dev vs `vite preview` vs estático embebido en API vs servidor estático mínimo. |
| **Rollback** | Marcar decisión como **abierta** y diferir a **D14.2**. |
| **Recomendación** | **Opcional**: ver **§5**. **No bloqueante** para **D14.1** estricto, **sí** recomendable **antes** de **D14.2** (manifest) o de cualquier **`.exe`**. |

### C. Avanzar directo a packaging dry-run manifest

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Lista **declarativa** de archivos que entrarían en un paquete (versiones, hashes opcionales) **sin** generar nada. |
| **Riesgos** | Salto sobre **layout** (§B) deja al manifest **sin** modelo de carpeta autoritativo; alto riesgo de retrabajo. |
| **Archivos probables** | Doc `PACKAGING_DRY_RUN_MANIFEST_D14.md` y eventualmente módulo TS puro de manifest model. |
| **¿Requiere código?** | Opcional. |
| **¿Requiere run real?** | **No**. |
| **¿Requiere dependencias?** | **No**. |
| **Validaciones** | Solo si layout (D14.1) ya está cerrado o congelado; verificar coherencia con builds existentes (`api-server` `dist`, `mapazapp` `dist`). |
| **Rollback** | Borrar doc/módulo. |
| **Recomendación** | **No** como salto inmediato — debe ir **después** de **D14.1**. |

### D. Avanzar a prototype wrapper no firmado

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Un **wrapper Node real** (no `.exe`), entrypoint que invoca al supervisor con UX un poco más cuidada. |
| **Riesgos** | **Alto sin §A/§B previos**: ownership, layout, logs, evidencia y estática del dashboard no consolidados; superficie de error grande; tentación de meter MT5/action endpoints. |
| **Archivos probables** | Nuevo módulo en `@workspace/scripts` o paquete adicional; tests; CLI. |
| **¿Requiere código?** | **Sí**. |
| **¿Requiere run real?** | **Sí** para validar; añade superficie de procesos. |
| **¿Requiere dependencias?** | Posible (CLI parsing, logging — preferir **stdlib**). |
| **Validaciones** | Reusar tests **D13.5** + nuevos casos del wrapper; sin nuevas superficies (**no** `POST`, **no** MT5). |
| **Rollback** | Eliminar wrapper; supervisores **D13** quedan intactos como fallback. |
| **Recomendación** | **No ahora**; queda para **D14.3** **solo** si **D14.1** y **D14.2** están cerrados y la estrategia de dashboard estático está decidida. |

### E. Frenar y hacer hardening D13.8.1

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Implementación acotada de mejoras del plan **D13.8** (§4–§7): `evidenceSchemaVersion`, `runId`, redacción adicional, mensajes CLI fail-closed, taxonomía de errores documentada como contrato. |
| **Riesgos** | Atrasa la cadena **D14.x** sin brecha **demostrada**; el plan **D13.8** ya recomienda **Opción 1** (docs-only → **D13.9**) salvo brecha crítica. |
| **Archivos probables** | TS en `@workspace/scripts` (supervisores) + tests; sin nuevos endpoints. |
| **¿Requiere código?** | **Sí**. |
| **¿Requiere run real?** | Opcional (run de evidencia post-polish). |
| **¿Requiere dependencias?** | Preferible **no**. |
| **Validaciones** | Tests existentes en verde + snapshots schema; redacción de paths privados. |
| **Rollback** | Revertir commits; supervisores **D13.5** quedan operativos. |
| **Recomendación** | **Mantener opcional** — abrir solo si en revisión de **D14.1** o de seguridad aparece **brecha concreta** (ej. riesgo de path leak, necesidad de `runId` antes de congelar contrato). **D13.8 no bloqueó D14.0**. |

---

## 5. Static dashboard strategy decision

¿Hace falta **D13.9.1** **antes** de **D14.1**?

### Contexto

- **Hoy** los supervisores **D13.5**/**D13.6** levantan el dashboard con **Vite dev** en **5173**. Es **funcional** para desarrollo y para evidencia, pero **no** ideal para un launcher empaquetado:
  - Vite dev mantiene watchers, HMR y deps de desarrollo cargadas.
  - El launcher empaquetado debería minimizar superficie y deps en runtime.
  - Cambios futuros del dashboard (rutas SPA, base path, assets) son sensibles al modo de servido.

### Opciones

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **V1. Vite dev** (estado actual) | Dashboard servido por `vite` dev en **5173**. | Cero cambios; ya validado **D13.5**/**D13.6**. | No apto para packaging final; deps grandes; HMR innecesario; no “producto”. |
| **V2. `vite preview`** | Build estático servido por `vite preview`. | Más cerca de producto; mismo toolchain. | Aún depende de `vite` en runtime; el `preview` no es un servidor de producción endurecido. |
| **V3. Dashboard estático embebido en API** | `dist/` servido por `api-server` (mismo proceso). | Menos procesos, menos puertos, menos ownership; CORS desaparece para mismo origen. | Acopla API y UI; debe revisarse base path, rutas SPA con fallback **`index.html`**, cache, headers. |
| **V4. Servidor estático mínimo dedicado** | Pequeño server estático (Node `http` o paquete mínimo) bajo control del launcher. | Separación clara API/UI; controlable por launcher. | Otra pieza a empaquetar y mantener; otro puerto y proceso. |

### Riesgos transversales

- **Tamaño** del bundle dashboard (`dist/`) y `node_modules` necesarios.
- **Rutas SPA** y fallback **`index.html`** (deep links, recarga).
- **CORS**: V3 lo elimina; V1/V2/V4 lo mantienen como hoy (allowlist **D9.13**).
- **Assets**: paths absolutos vs `base` configurable.
- **Cache**: cache-control de assets vs `index.html` y rebuild.
- **Errores 404**: SPA fallback bien definido en cualquier opción ≠ V1.
- **Ownership** del proceso dashboard: V3 lo absorbe en API; V4 sigue siendo otro proceso a supervisar; V1/V2 mantienen el patrón actual.
- **Log redaction**: validar que el server estático elegido no introduzca logging crudo de paths.
- **Packaging**: V3/V4 necesitan que el build dashboard se incluya en el manifest de **D14.2**.

### Recomendación

- **Para D14.1 (layout model, sin escrituras reales)**: la decisión **puede quedar abierta**. El layout **D13.9 §7** ya contempla `dashboard/` como `dist` o paquete mínimo; el modelo de layout debe **soportar** V1–V4 sin commitearse a uno.
- **Antes de cualquier `.exe` real (D14.2/D14.3 con código o D14.x con binario)**: la **estrategia estática debe estar cerrada**.
- **Si Cursor en revisión cree que la elección bloquea D14.1** (ej. el modelo de layout no puede expresar V3 sin definir el merge API+UI), entonces **abrir D13.9.1** primero.
- **Recomendación de este documento**: **D14.1 puede avanzar sin D13.9.1**, dejando V1–V4 como opciones del layout; **D13.9.1** debe abrirse **antes** de **D14.2** (manifest) o tan pronto como una decisión arquitectónica concreta (ej. mover dashboard al mismo proceso que API) lo exija.

---

## 6. Preconditions before any launcher prototype

Checklist **mínimo** antes de **autorizar** la primera línea de código del launcher prototype (más allá de modelos puros):

| # | Precondición |
|---|--------------|
| 1 | **Working tree limpio** en el momento de la aprobación. |
| 2 | **Evidencia supervisor D13.6** (API + dashboard) intacta y referenciable. |
| 3 | **Diseño packaging D13.9** revisado y vigente. |
| 4 | **D14.0** (este doc) **revisado** y aprobado. |
| 5 | **Puertos** **3001** y **5173** **libres** y **no** ocupados por terceros. |
| 6 | **Modelo de config local** (**D11.1**) revisado y disponible como single source of truth para validación. |
| 7 | **Modelo de logs / evidencia** definido (**D13.9 §10**, plan **D13.8 §5**); decisión sobre **`runId`** y **`evidenceSchemaVersion`** documentada (puede vivir en **D13.8.1** opcional). |
| 8 | **Ownership / cleanup** revisados — invariantes **D11.6** y patrón **D13.5** sin regresión. |
| 9 | **Estrategia de dashboard estático** — al menos **registrada** (este doc §5) y, si **D14.2** o **`.exe`** se acerca, **decidida** (opcional **D13.9.1**). |
| 10 | **Sin MT5**: launcher prototype **no** abre, lanza ni asume MT5. |
| 11 | **Sin POST / action endpoints**: solo **GET** existentes (health, runtime, dashboard `/`, `/config`). |
| 12 | **Sin trading**: **`executionEnabled: false`** auditado en envelope antes y después del run. |
| 13 | **Aprobación explícita** estilo **D11.8** del operador / responsable. |

Si **cualquiera** falla → **no** procede el prototipo; volver a la fase abierta correspondiente.

---

## 7. Allowed scope for first launcher prototype

**Permitido** (en futuro, **no** en **D14.0**) cuando se autorice un primer prototipo:

- Reutilizar el **supervisor API + dashboard** (**D13.5**) como **núcleo de orquestación**.
- **Loopback** **`127.0.0.1`** únicamente.
- Puertos **3001** (API) y **5173** (dashboard) o los puertos validados por config (**D11.1**), **fail-closed** ante mismatch.
- **Start API** primero, luego **dashboard** (orden **D13.5**).
- **Stop dashboard → API** (orden **D13.6**).
- **Evidence JSON** por run, alineado con plan **D13.8 §5** y **D13.9 §10**.
- **Logs sanitizados** (alineados a **D9.14.2** API y `sanitizeLauncherConfigForDisplay` **D11.1**).
- **Dry-run de layout** — solo modelos / validaciones, **sin** crear archivos en disco salvo en gates posteriores aprobados.
- **`executionEnabled: false`** auditado en runtime.

**No permitido** en el primer prototipo:

- **MT5** (launch, watcher, command files, **`OrderSend`**, **`CTrade`**).
- **Watcher** de bridge.
- **Command files** hacia MT5.
- **POST** / **action endpoints** operativos.
- **Trading** real.
- **Auto-update** silencioso o canal de descarga de binarios.
- **Installer** o instalación elevada.
- **Elevated / admin** requirements.
- **Cloud** o telemetría obligatoria.
- **WebSocket live** o polling nuevo no diseñado.
- **`localStorage`** nuevo obligatorio del flujo.
- **DB** operativa.
- **IPC real** entre procesos más allá de `stdout`/`stderr` y señales documentadas.
- **`taskkill`** amplio o `process.kill` sobre PIDs no propios.

---

## 8. Local folder/layout gate

Antes de **escribir archivos reales** del launcher en disco debe existir:

### D14.1 — Local runtime folder layout model, no filesystem writes

**Documento canónico:** [`LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md`](./LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md).

Debe cubrir, alineado con **D13.9 §7**:

- **`launcher/`** — entrypoint conceptual + versión + checksum opcional.
- **`api-server/`** — `dist` consumible por `node`.
- **`dashboard/`** — `dist` estático o paquete mínimo según decisión §5.
- **`config/`** — `LauncherConfig` validado (**D11.1**); fuera del repo en instalaciones reales.
- **`logs/`** — política de redacción + rotación.
- **`evidence/`** — JSON por `runId`.
- **`runtime/`** — efímero (pid file propio, lock instancia futura).
- **`backups/`** — copias `config/` antes de migración `schemaVersion`.
- **Qué se ignora en Git** — patrones tipo `Mapazapp/logs/**`, `Mapazapp/evidence/**`, `Mapazapp/config/local*.json`.
- **Qué se exporta para soporte** — solo `evidence/` redactado + últimas N líneas de `logs/` con sanitización; nunca repo completo.
- **Qué es sensible** — paths de usuario, contenido MT5, cualquier token (no debe existir por defecto).

**D14.1 no escribe nada** en disco; solo **modela**.

---

## 9. Packaging dry-run gate

Antes de **empaquetar** o aproximarse a un binario debe existir:

### D14.2 — Packaging dry-run manifest, no executable

**Documento canónico:** [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md).

Debe cubrir, alineado con **D13.9 §7–§8**:

- **Lista de archivos** que entrarían (api-server `dist`, dashboard `dist`, scripts launcher, `config/` plantilla, `launcher/manifest.json` conceptual).
- **Lista de archivos excluidos** (fuentes TS no necesarias en runtime, fixtures de test, `node_modules` de dev, archivos sensibles, evidencias antiguas, `.git`).
- **Validación de `dist`** — coherencia de builds `api-server` y `mapazapp`.
- **Validación de config** — `schemaVersion`, defaults seguros, ausencia de tokens.
- **Logs / evidence roots** — referencias a layout **D14.1**.
- **No escritura fuera de sandbox** — el dry-run **no** copia archivos reales; **no** crea zip/tarball; **no** firma nada.
- **No `.exe`** — sigue prohibido; manifest es texto declarativo.

---

## 10. Prototype wrapper gate

Antes de un **wrapper real**:

### D14.3 — Local launcher wrapper prototype decision

**Documento canónico:** [`LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md`](./LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md) — opciones de alcance (**A–F**), secuencia recomendada **D14.4–D14.6**, dependencia **D13.9.1**, responsabilidades y checklist **§10** del doc canónico. **D14.3** en sí es **docs-only**; no añade código.

Resumen alineado a **D14.0** (detalle en el doc canónico):

- **¿Se permite código?** — **Sí** solo tras cumplir precondiciones y gates (**D14.4+**), no en **D14.3**.
- **¿Se permite `spawn`?** — **Sí**, **confinado** a un único módulo, herencia **D13.5** — solo en fases posteriores aprobadas (**D14.6**), no en **D14.3**/**D14.4**/**D14.5**.
- **¿Se permite run real?** — **Sí**, bajo aprobación **D11.8**-style y **§10** del doc **D14.3** — típicamente desde **D14.6**, no desde este checkpoint.
- **¿Se permite binario no firmado?** — **No** en **D14.3–D14.5**; **`.exe`** y binarios quedan fuera hasta gates explícitos posteriores a **D14.6** (ver doc canónico **§5**/**§13**).
- **Qué evidencia se exige** — JSON por run con `runId`, `evidenceSchemaVersion`, PIDs, ports, health/runtime summary, cleanup status; alineado con plan **D13.8** y **D13.9 §10**.
- **Cómo se limpia** — orden dashboard → API; **sin** `taskkill`; verificar puertos liberados.
- **Cómo se revierte** — borrar wrapper; supervisores **D13.5** quedan intactos como fallback.

---

## 11. Risks

Riesgos abiertos y a vigilar a lo largo de **D14.x**:

- **Ownership incorrecto** de procesos hijos (heredado: lección Vite **D13.6**); regresión posible si se cambia el modo de servido del dashboard.
- **Puertos ocupados** por terceros; nunca matar ocupante ajeno (**D11.6**).
- **Rutas Windows con espacios** (perfiles de usuario, `Program Files`); citar siempre.
- **Vite dev vs static assets** — decisión §5 abierta; impacta deps, tamaño, CORS.
- **Antivirus / SmartScreen** — falsos positivos en cualquier futuro binario no firmado.
- **Permisos** — escritura en `%LOCALAPPDATA%\Mapazapp` vs portable; evitar requerir admin.
- **Logs con rutas privadas** — riesgo permanente; reutilizar política **D9.14.2** + redacción supervisor (**D13.8 §D**).
- **Procesos huérfanos** — un wrapper mal diseñado puede dejar API o dashboard vivos al fallar.
- **Config corrupta** — JSON manual editable; validar `schemaVersion` y fail-closed.
- **Packaging incompleto** — manifest sin layout o layout sin manifest; mitigado por orden **D14.1 → D14.2**.
- **Drift entre docs y scripts** — comentarios de supervisores que no reflejan resolución Vite real (**D13.8 §N**); el launcher debe enlazar a doc canónica, no duplicar lógica en comentarios.
- **Tentación de scope creep** — meter MT5, **`POST`** o trading “de paso” en un prototipo; **prohibido** por §7 y §14.

---

## 12. Recommended sequence

Secuencia **propuesta** y **gobernada**:

| ID | Contenido | Estado tras D14.0 |
|----|-----------|-------------------|
| **D13.9** | Diseño packaging local (layout, assets, config, logs, gates) **sin** ejecutable. | **Cerrado**. |
| **D14.0** | **Local launcher prototype gate** (este doc). | **Cerrado** con la apertura de este documento. |
| **D14.1** | **Local runtime folder layout model** ([`LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md`](./LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md)), **sin filesystem writes**. | **Cerrado (docs-only)**. |
| **D14.2** | **Packaging dry-run manifest** ([`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md)), **sin executable**. | **Cerrado (docs-only)**. |
| **D14.3** | **Local launcher wrapper prototype decision** ([`LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md`](./LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md)). | **Cerrado (docs-only)**. |
| **D14.4** | **TS pure local launcher wrapper model**, **no process start** (ver **D14.3** §13). | **Siguiente recomendado**. |

**Opcional, paralelo o intercalado:**

| ID | Contenido | Cuándo abrir |
|----|-----------|--------------|
| **D13.9.1** | Static dashboard serving strategy decision. | **Antes de D14.1** si se considera **bloqueante** del modelo de layout; si no, **antes de packaging real**, **D14.6** (run real “producto”) o **`.exe`** (o si el manifest implementado no puede enumerar artefactos dashboard — ver [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) §13). |
| **D13.8.1** | Implementación acotada de hardening / evidence polish. | Solo si una **brecha concreta** lo justifica (no abierto por defecto). |

**No pasar todavía** (sin nuevos gates explícitos):

- **MT5** (launch, watcher, command files).
- **`POST`** / action endpoints.
- **Trading**.
- **Installer real**.
- **Cloud / WAN bind**.

---

## 13. Definition of done for D14.0

- [x] Documento **D14.0** creado en `APP/artifacts/mapazapp/docs/LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`.
- [x] **Opciones** de avance evaluadas (§4 A–E).
- [x] **Decisión** sobre **D13.9.1** documentada (§5): **opcional**, no bloqueante para **D14.1**, recomendable antes de **D14.2** o `.exe`.
- [x] **Secuencia recomendada** (§12) escrita.
- [x] **Riesgos** listados (§11).
- [x] **Gating antes de cualquier `.exe`** explícito (§6, §8, §9, §10).
- [x] **Sin código** nuevo en este checkpoint.
- [x] **Sin ejecución** de API/dashboard/supervisor/MT5.
- [x] **Sin empaquetado real** ni `.exe`.

---

## 14. Non-goals

**D14.0 no implementa** y **no autoriza** en este checkpoint:

- **Código** nuevo (TS, JS, MQL5, scripts).
- **Executable** / **`.exe`** / binario empaquetado.
- **Installer** o paquete distribuible.
- **`spawn`** / **`child_process`** / **`exec`** / **`execFile`** nuevos.
- **API start** / **dashboard start** / **supervisor run**.
- **`mapazapp:dev-start`** / **`mapazapp:api-only-supervisor`** / **`mapazapp:api-dashboard-supervisor`** ejecuciones.
- **MT5 launch** / apertura del terminal.
- **Watcher** de bridge / filesystem.
- **Command files** hacia MT5.
- **`OrderSend`** / **`CTrade`** / cualquier orden.
- **`POST`** / **action endpoints** / botones operativos del dashboard.
- **Action transport** real (HTTP/IPC).
- **DB** operativa.
- **WebSocket** live.
- **Polling** nuevo obligatorio del flujo.
- **`localStorage`** nuevo obligatorio del flujo.
- **Trading** real.
- **`taskkill`** / **`process.kill`** sobre PIDs no propios.
- **Dependencias nuevas** en `package.json` de cualquier paquete del workspace.
- **`git push`**.
