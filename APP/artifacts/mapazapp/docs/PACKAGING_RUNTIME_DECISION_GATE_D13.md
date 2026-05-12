# Mapazapp — Packaging / Runtime Decision Gate D13

## 1. Purpose

- **D13.5** validó en la práctica el **supervisor API + dashboard** (dos hijos, loopback **3001** / **5173**, checks y cleanup ordenados).
- **D13.6** archivó la **evidencia formal** de ese run ([`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md)).
- Con **D13.2–D13.3** (API-only) y **D13.5–D13.6** (API + dashboard), la serie **D13** ya demostró **supervisión local controlada** con políticas de **ownership** y **teardown** documentadas.
- **D13.7** (**este documento**) es una **compuerta de decisión**: fija **opciones** para el **próximo salto**, criterios de **empaquetado / runtime** y una **secuencia recomendada** antes de producto.
- **D13.7** **no** implementa código, **no** ejecuta API, dashboard, supervisores, **no** genera `.exe` ni instalador, **no** asume MT5, trading, **`POST`** ni empaquetado real.

**Relacionado:** [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md) (**D13.9** — diseño packaging launcher local **sin** ejecutable), [`SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md`](./SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md) (**D13.8** — plan hardening/evidencia **antes** de packaging), [`NEXT_RUNTIME_EXPANSION_GATE_D13.md`](./NEXT_RUNTIME_EXPANSION_GATE_D13.md) (**D13.0**), [`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.3**), [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.6**), [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) (**D13.4–D13.5**), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md) (**D11.0**), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current baseline

| Aspecto | Estado (post **D13.6**) |
|--------|-------------------------|
| Supervisor **API-only** | Operativo (`mapazapp:api-only-supervisor`); evidencia **D13.3**. |
| Supervisor **API + dashboard** | Operativo (`mapazapp:api-dashboard-supervisor`); evidencia **D13.6**. |
| API | **`127.0.0.1:3001`** en runs supervisados; **`GET`** health + runtime **OK**. |
| Dashboard | **`127.0.0.1:5173`** (Vite dev); **`GET`** `/` y `/config`; **CORS** con `Origin` dev **OK**. |
| Cleanup | Orden **dashboard → API**; puertos liberados; sin **`taskkill`** amplio. |
| Vite / ownership | CLI resuelto con **`node` directo** (vía `vite/package.json` → `bin/vite.js`); evita wrapper **`pnpm`** como dueño del **LISTEN**. |
| `executionEnabled` | **`false`** en envelope gobernado. |
| MT5 / bridge | **`not_configured`**; sin launch, watcher ni command files en alcance D13. |
| Acciones | Sin **`POST`** / action endpoints operativos; sin botones dashboard operativos nuevos en D13. |
| Launcher producto | **No** hay **`.exe`** ni instalador; `mapazapp:dev-start` sigue siendo **helper de desarrollo**. |
| Persistencia / canales | **No** DB operativa Mapazapp; **no** WebSocket live de producto; **no** polling nuevo obligatorio en D13. |

---

## 3. Decision options

Para cada opción: *qué aporta*, *archivos probables*, *riesgos*, *complejidad*, *¿proceso real?*, *¿dependencias nuevas?*, *¿aprobación?*, *validaciones*, *rollback*, *recomendación*.

### A. Packaging design only

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Contrato claro de **qué se empaqueta**, layout en disco, story de **instalación/actualización** y **separación** script dev vs producto — **sin** binario todavía. |
| **Archivos probables** | `APP/artifacts/mapazapp/docs/*` (nuevo doc o ampliación controlada), referencias cruzadas en auditoría **D11.0**; posible README acotado **solo si** un gate futuro lo aprueba. |
| **Riesgos** | Diseño abstracto sin anclaje a evidencia → deriva; mitigación: enlazar explícitamente a supervisores **D13** y checklist **§7**. |
| **Complejidad** | Baja–media (documental). |
| **¿Proceso real?** | **No** en D13.7. |
| **¿Dependencias nuevas?** | **No** en fase diseño-only. |
| **¿Aprobación?** | **Sí** (humana / gate) antes de cualquier build de artefacto instalable. |
| **Validaciones** | Revisión cruzada con **D11.0**, **D11.6**, evidencias **D13.3** / **D13.6**. |
| **Rollback** | Deprecar sección de doc; ningún binario que revertir. |
| **Recomendación** | **Alta** como **D13.9** (después de plan de endurecimiento **D13.8**). |

### B. Local launcher executable prototype design

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Especificación del **primer `.exe`** (o equivalente): entrypoint, firma/empaquetado, IPC mínimo futuro, política de elevación — **diseño**, no código ejecutable en D13.7. |
| **Archivos probables** | Docs bajo `APP/artifacts/mapazapp/docs/`; diagramas de proceso; sin repo `electron`/installer en este gate. |
| **Riesgos** | Anticipar **SmartScreen**, permisos, rutas Windows; riesgo de **sobre-especificar** antes de packaging **D13.9**. |
| **Complejidad** | Media–alta (documental pero densas implicancias). |
| **¿Proceso real?** | **No** en D13.7; **sí** en fase **D14.x** cuando exista gate explícito. |
| **¿Dependencias nuevas?** | Probable en implementación futura (toolchain empaquetado); **no** en D13.7. |
| **¿Aprobación?** | **Sí** (**D11.8**-style + checklist **§7**). |
| **Validaciones** | Coherencia con **D8.1**, **D11.0**, **D11.6**; sin contradicción con supervisores **D13**. |
| **Rollback** | Congelar diseño; no publicar binario. |
| **Recomendación** | **Después** de **D13.8** + **D13.9** → **D14.0** como **gate** de prototipo ejecutable, no como siguiente inmediato. |

### C. Runtime supervisor hardening before packaging

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Plan explícito de **logs**, **timeouts**, **envelopes de error**, **evidencia JSON**, reglas de **retry** y **detección de estado colgado** — sobre los módulos ya existentes (`mapazapp-api-*-supervisor.ts`), **sin** expandir alcance funcional. |
| **Archivos probables** | Plan en docs **D13.8**; luego cambios TS **solo** tras gate de implementación (fuera de D13.7). |
| **Riesgos** | Scope creep hacia MT5 o transporte; mitigación: checklist **§6** y **non-goals §8**. |
| **Complejidad** | Media (plan + implementación futura acotada). |
| **¿Proceso real?** | Solo en **runs de prueba** futuros aprobados; D13.7 **no** ejecuta. |
| **¿Dependencias nuevas?** | Preferible **no**; solo si un ítem del plan lo justifica en ticket aparte. |
| **¿Aprobación?** | **Sí** para el plan; **sí** otra vez por cambio de código. |
| **Validaciones** | Tests existentes en verde + nueva evidencia de run si se toca supervisor. |
| **Rollback** | Revertir commit de hardening; supervisores anteriores documentados en **D13.3** / **D13.6** quedan referencia. |
| **Recomendación** | **Primera prioridad** como **D13.8** (plan **sin** implementación en el propio D13.8 si se define así el ticket). |

### D. API + dashboard supervisor UX/log polish

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Mejor **CLI** (mensajes, `--help`, progreso legible), alineación de **banners** con política de producto, consistencia entre API-only y API+dashboard. |
| **Archivos probables** | `APP/scripts/src/mapazapp-api-*-supervisor.ts`, tests asociados, `APP/scripts/package.json` entradas. |
| **Riesgos** | Cambios cosméticos que ocultan fallos reales; mitigación: no tocar semántica de exit codes sin tests. |
| **Complejidad** | Baja–media. |
| **¿Proceso real?** | **Sí** en validación manual / CI al ejecutar supervisor (fuera del alcance de **solo** D13.7). |
| **¿Dependencias nuevas?** | **No** idealmente. |
| **¿Aprobación?** | Ligera; aun así gate de implementación si no es trivial. |
| **Validaciones** | `pnpm --filter @workspace/scripts test` + run evidenciado si aplica. |
| **Rollback** | Revertir diff de scripts. |
| **Recomendación** | **Útil**; puede **mezclarse** dentro del alcance técnico de **D13.8** o ticket corto posterior, **no** sustituye **D13.9**. |

### E. Local config file real persistence

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | **`LauncherConfig`** (u otro schema) **persistido** en disco para usuario/launcher; base para logs y puertos estables. |
| **Archivos probables** | Extensión futura de `mapazapp-launcher-config-model.ts`, I/O acotado, tests con temporales; ruta documentada. |
| **Riesgos** | Formato inestable, secretos en claro, conflictos multi-instancia; **no** secretos en archivo local sin diseño criptográfico aparte. |
| **Complejidad** | Media–alta. |
| **¿Proceso real?** | Lectura/escritura archivo; **no** MT5. |
| **¿Dependencias nuevas?** | Posible (serialización, validación); evaluar en gate dedicado. |
| **¿Aprobación?** | **Sí** (formato + ubicación + política de migración). |
| **Validaciones** | Tests de I/O aislados, redacción de rutas en logs, matriz de permisos Windows. |
| **Rollback** | Volver a modelo en memoria solo; borrar archivo opcional con guía. |
| **Recomendación** | **Después** de **D13.8–D13.9**: la persistencia debe **seguir** al diseño de packaging y al contrato de **logsRoot** / `dataRoot` (**D11.1** ya modela campos; falta decisión de producto). |

### F. MT5 read-only discovery/config next

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Mejor **detección** o **UX** de configuración MT5 **sin** launch ni órdenes. |
| **Archivos probables** | `mapazapp-mt5-*`, paneles dashboard read-only, docs **D10.x**. |
| **Riesgos** | Confundir **readiness** con **conexión live**; tentación de watcher/command files. |
| **Complejidad** | Media. |
| **¿Proceso real?** | Opcionalmente **solo** lectura filesystem en herramientas aprobadas; **no** MT5 launch en D13. |
| **¿Dependencias nuevas?** | Evaluar caso por caso. |
| **¿Aprobación?** | **Sí** (**D10.0** gates + estilo **D11.8** si toca UX sensible). |
| **Validaciones** | Tests de modelo + ausencia de `OrderSend` / `CTrade` / command files. |
| **Rollback** | Feature flag / revertir módulo. |
| **Recomendación** | **No** como siguiente salto global: **desalineado** con el cierre limpio de supervisión **D13**; retomar **solo** tras packaging/hardening explícitos si el negocio lo prioriza. |

### G. Local action transport next

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | **`POST`** / IPC hacia acciones locales según **D9.x** — habilita botones operativos a futuro. |
| **Archivos probables** | `api-server` middleware, dashboard client, docs transporte ya listados en **D9.6–D9.7**. |
| **Riesgos** | Superficie **CSRF**, replay, token, elevación; alto impacto en threat model. |
| **Complejidad** | Alta. |
| **¿Proceso real?** | **Sí** (HTTP/IPC). |
| **¿Dependencias nuevas?** | Probable. |
| **¿Aprobación?** | **Sí** estricta. |
| **Validaciones** | Plan de tests **D9.7** completo antes de primer `POST` productivo. |
| **Rollback** | Desmontar ruta; mantener `GET` only. |
| **Recomendación** | **No** ahora: **saltar** antes de packaging/hardening aumenta blast radius; encajar **después** de launcher estable o en track paralelo con gate propio. |

### H. Dashboard/settings polish before runtime expansion

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Mejor **UX** de Config/read-only, copy de seguridad, accesibilidad — sin nuevas superficies de red. |
| **Archivos probables** | `@workspace/mapazapp` componentes presentacionales, textos, tests UI ligeros. |
| **Riesgos** | Confundir polish con “listo para trading”; mitigación: copy y flags `mockOnly` / `reviewOnly`. |
| **Complejidad** | Baja–media. |
| **¿Proceso real?** | **No** obligatorio para D13.7. |
| **¿Dependencias nuevas?** | Raro. |
| **¿Aprobación?** | Acotada (UX). |
| **Validaciones** | Storybook/manual según política repo; **no** sustituye supervisión. |
| **Rollback** | Revertir UI. |
| **Recomendación** | **Paralelo opcional**; **no** bloquea **D13.8**/**D13.9** si hay capacidad; **no** sustituye decisión de packaging. |

---

## 4. Recommended path

**Secuencia recomendada** (alineada a riesgo y a la auditoría **D11.0**, ahora **informada** por evidencia real **D13.3** / **D13.6**):

1. **D13.8 — Supervisor hardening / evidence polish plan** — **documentado** en [`SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md`](./SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md) (**sin** implementación en ese checkpoint: taxonomía de errores, schema JSON, redacción, timeouts, CLI, tests futuros, decisión **D13.8.1** opcional).
2. **D13.9 — Packaging design for local launcher** (**sin** ejecutable) — **documentado** en [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md): layout, Node embebido vs runtime del sistema, **dashboard dev vs build estático**, política de logs, actualizaciones, **Windows paths**, supuestos `pnpm`/workspace vs artefacto autocontenido.
3. **D14.0 — Local launcher executable prototype gate**: checklist **§7** + aprobación explícita antes del primer `.exe` o bundle instalable.

**Justificación:**

- Los supervisores **D13.2** y **D13.5** ya **reducen incertidumbre** de ownership y cleanup; el siguiente incremento de valor es **hacer explícitos** los estándares de **observabilidad** y **fallo seguro** (**D13.8**) antes de congelar un **diseño de empaquetado** (**D13.9**).
- Saltar directo a **MT5** (**F**) o **transporte de acciones** (**G**) **aumenta** superficie de seguridad **sin** cerrar story de **instalación/usuario**.
- Generar **`.exe`** sin **D13.9** conlleva retrabajo de rutas, runtime Node y story de update (**D11.0** ya listó brechas).
- La **persistencia real** (**E**) debe **seguir** al contrato de **config/logs** decidido en packaging, no precederlo.

**Nota:** Una variante aceptable es fusionar **D13.8** y **D13.9** en un único documento de “plan maestro” **si** el equipo prefiere menos tickets; el **orden lógico** (hardening plan → packaging design → gate ejecutable) se mantiene.

---

## 5. Packaging considerations

- **Qué significaría empaquetar:** distribuir un **conjunto versionado** (API `dist`, assets dashboard según modo elegido, scripts de arranque o binario) **más** política de **config** y **logs**, de forma que un usuario **no** dependa de clonar el monorepo ni de recordar `pnpm` filters.
- **Script supervisor vs launcher real:** los supervisores **D13** son **prototipos de desarrollo** bajo `@workspace/scripts` con **`spawn`** acotado; un **launcher real** debe asumir **instalación**, **actualización**, **permisos**, **registro de instancia** y posible **IPC** sin confundirse con `mapazapp:dev-start` (**D11.0** §2–§4).
- **Windows path issues:** espacios, `MAX_PATH`, rutas de datos bajo `%LOCALAPPDATA%` vs repo, normalización y **redacción** en logs.
- **Node runtime:** embebido (peso, updates de seguridad) vs Node del sistema (fragmentación de versiones).
- **pnpm / workspace:** hoy el desarrollo asume workspace; el producto puede requerir **árbol plano** de `node_modules` o bundle **sin** `pnpm` en runtime.
- **dist assets:** `artifacts/api-server` salida de build; coherencia de `source maps` y variables `MAPAZAPP_*`.
- **Dashboard:** modo actual en supervisión es **Vite dev** (`5173`); packaging puede pivotar a **preview estático** o **servidor embebido** — decisión explícita en **D13.9** (implica CORS, base URL, tamaño).
- **Logs:** destino, rotación, **PII**/rutas sensibles, alineación a **D9.14.2** redacción API.
- **User config:** formato (JSON/YAML/TOML), ubicación, migración de `schemaVersion` (**D11.1**).
- **Update strategy:** in-place vs canal lateral; verificación de firma/hash si aplica.
- **Cleanup:** mismo espíritu que **D13.5** (hijos propios, orden de parada); launcher debe **no** usar **`taskkill`** amplio (**D11.6**).
- **Antivirus / SmartScreen:** riesgo de falsos positivos en binarios no firmados; documentar en **D13.9** / **D14.0**.
- **Permisos:** bind loopback vs firewall; sin abrir WAN sin gate aparte.
- **Rollback:** desinstalación / borrado de carpeta de app + preservación opcional de config.
- **No secretos:** ningún token de trading o credencial en config de producto por defecto; variables sensibles fuera del repo y del doc.

---

## 6. Runtime hardening considerations

- **Logs sanitizados:** coherencia con API **pino** + supervisores que no impriman rutas completas del usuario sin redacción.
- **Timeouts:** `max-wait-ms` y sub-fases (build, listen, health, HTTP dashboard) con límites **documentados** y fallos **clasificados**.
- **Port ownership:** mantener correlación **PID ↔ puerto** y comprobación post-start (**D13.5** ya lo encarna).
- **Stale processes:** detectar hijo muerto temprano vs puerto ocupado por **tercero** — **abort** sin matar ajenos.
- **Retry policy:** conservadora; **no** reintentos agresivos que enmascaren error de config.
- **Error envelopes:** JSON de salida **estable** y **sin** datos sensibles; códigos de salida **0/1/2** documentados.
- **Safe JSON evidence:** una línea o documento adjunto según política; **git status** opcional ya usado en supervisores.
- **No killing by name / no taskkill amplio:** línea roja heredada de **D11.6** y evidencias **D13.3** / **D13.6**.
- **No MT5 / no POST:** hardening **no** debe introducir estas superficies “de paso”.

---

## 7. Gates before any executable

Antes del **primer** prototipo **`.exe`** o instalador **aprobado**:

| # | Gate |
|---|------|
| 1 | **Diseño de packaging** revisado y aprobado (**D13.9** o equivalente). |
| 2 | **Decisión de config local** (formato, ubicación, `schemaVersion`, **sin** secretos por defecto). |
| 3 | **Destino y política de logs** aprobados (rotación, redacción, permisos). |
| 4 | **Ownership de procesos** y **orden de parada** revisados (**D11.5**, **D11.6**, práctica **D13**). |
| 5 | **Cleanup** y liberación de puertos validados en **evidencia** reciente. |
| 6 | **Tests** del repo en verde en la rama del intento de empaquetado. |
| 7 | **Evidencia de run manual** (supervisor o launcher candidato) **OK** bajo el alcance aprobado del ticket. |
| 8 | **No MT5**, **no POST** de acciones, **no trading** en el prototipo salvo nuevo gate explícito. |
| 9 | **Aprobación explícita** del operador / responsable (estilo **D11.8**). |

---

## 8. Non-goals (D13.7)

**D13.7** y el trabajo bajo este gate **no** incluyen:

- Implementación de **código** de producto o scripts nuevos.
- **Ejecutable**, **instalador**, **`spawn`**, **`child_process`** nuevos fuera de lo ya existente en D13.
- **Arranque** de API, dashboard, supervisor, **`mapazapp:dev-start`**, **MT5**, **watcher**, **command files**.
- **`POST`**, **action endpoints**, **DB**, **WebSocket live**, **polling** nuevo obligatorio, **`localStorage`** nuevo obligatorio del flujo.
- **Trading** u órdenes reales (**OrderSend** / **CTrade**).
- **`git push`** ni publicación de binarios.

---

## 9. Summary

**D13.7** formaliza que el **próximo salto** principal después de la supervisión **D13** debe ser **planificación de endurecimiento** (**D13.8**, [`SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md`](./SUPERVISOR_HARDENING_EVIDENCE_POLISH_PLAN_D13.md)) y **diseño de packaging** (**D13.9**, [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md)), y **solo entonces** la **compuerta** de un **launcher ejecutable** (**D14.0**). **MT5** (**F**) y **transporte de acciones** (**G**) quedan como **candidatos secundarios** que requieren **gates propios** y **no** deben adelantarse sin el diseño de runtime local cerrado.
