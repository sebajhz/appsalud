# Mapazapp — Local Launcher Wrapper Prototype Decision D14

## 1. Purpose

- **D14.0** ([`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md)) abrió la **compuerta formal** del prototipo launcher local (precondiciones, alcance permitido, secuencia **D14.1–D14.3**).
- **D14.1** ([`LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md`](./LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md)) definió el **layout local** conceptual bajo **`Mapazapp/`**.
- **D14.2** ([`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md)) definió el **contrato declarativo** del manifest dry-run (artefactos, exclusiones, validaciones futuras).
- **D14.3** (**este documento**) **decide y documenta** si y cómo se autorizaría un **futuro prototipo de wrapper local** del launcher, **sin implementar código** en este checkpoint.
- **D14.3 no implementa** TypeScript nuevo, scripts nuevos ni cambios en supervisores.
- **D14.3 no genera `.exe`**, **no** instalador y **no** empaquetado real.
- **D14.3 no ejecuta procesos** (sin API, dashboard, supervisor, MT5, watcher, `mapazapp:dev-start`).

**Relacionado:** [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md), [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md) (**D13.9**), [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) (**D14.2**), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current baseline

| Aspecto | Estado |
|--------|--------|
| Supervisor **API-only** | **OK** — evidencia **D13.3**; `mapazapp:api-only-supervisor`. |
| Supervisor **API + dashboard** | **OK** — evidencia **D13.6**; `mapazapp:api-dashboard-supervisor`. |
| **Layout D14.1** | **Definido**. |
| **Manifest dry-run D14.2** | **Definido** (contrato docs-only). |
| **Packaging D13.9** | **Cerrado**. |
| **Launcher `.exe`** | **No**. |
| **Installer** | **No**. |
| **Carpetas de runtime reales** producto | **No**. |
| **Config local persistida** producto | **No** (modelo **D11.1** sin I/O en el módulo actual). |
| **MT5** / **`POST`** / action endpoints / **trading** | **No** en el camino feliz del wrapper descrito aquí. |

---

## 3. What “wrapper prototype” means

- **Wrapper local** orientado a **Node** (o script **controlado**) que **reutiliza la semántica** ya probada en **`mapazapp-api-dashboard-supervisor`** / **`mapazapp-api-only-supervisor`**: preflight, orden de arranque/parada, ownership de listeners, evidencia JSON segura.
- **Orquesta API + dashboard** (o solo API si el perfil lo define) en **loopback** (`127.0.0.1` por defecto).
- **Expone** conceptualmente **start** / **stop** / **status** como interfaz única frente a múltiples comandos `pnpm`.
- **Produce** rutas y políticas para **evidencia** y **logs** alineadas a **D14.1**, **D13.8**, **D9.14.2**.
- **Respeta** el **layout conceptual** **D14.1** y el **manifiesto** **D14.2** como guía de qué empaquetar más adelante.
- **No es `.exe`** todavía; **no** es instalador; **no** es producto final ni auto-update.

### Diferenciar niveles

| Nivel | Qué es | Qué **no** es |
|------|--------|----------------|
| **Supervisor actual** (**D13.2**/**D13.5**) | Scripts TS bajo `@workspace/scripts` con `spawn` **acotado** a un archivo; evidencia de runs reales. | Producto instalable; launcher único para usuario final. |
| **Wrapper prototype** (objeto de **D14.4+**) | Envoltorio que **delega** en la misma lógica de orquestación, con UX/CLI/layout más “launcher”. | **No** binario firmado; **no** mezclar MT5/`POST`/trading. |
| **Launcher executable** | `.exe` o stub empaquetado (**D13.9** modelo **B**). | **No** en **D14.3** ni en **D14.4**/**D14.5**. |
| **Installer** | Flujo de instalación/actualización en sistema. | Fuera de alcance de esta decisión. |

---

## 4. Candidate wrapper scopes

| Opción | Qué aporta | Riesgos | Archivos probables | ¿Código? | ¿Run real? | ¿`spawn` / `child_process`? | ¿Deps nuevas? | Validaciones | Rollback | Recomendación |
|--------|------------|---------|-------------------|----------|------------|-------------------------------|----------------|--------------|----------|----------------|
| **A. Docs-only decision** (este **D14.3**) | Alineación del equipo, secuencia explícita antes de tocar TS. | Bajo. | Este `.md` + enlaces en gates. | **No** | **No** | **No** | **No** | Revisión cruzada con **D14.0** §6. | N/A. | **Hacer ahora** — **D14.3** es esta opción. |
| **B. TS pure wrapper model**, sin start | Tipos/rutas/estados del wrapper sin I/O ni procesos. | Drift si no se enlaza a **D14.1**/**D14.2**. | `mapazapp-local-launcher-wrapper-model.ts` + tests (**§11**). | **Sí** | **No** | **No** | **No** (preferido) | Tests unitarios; coherencia con `LauncherConfig` **D11.1**. | Borrar módulo. | **Recomendado siguiente** — **D14.4**. |
| **C. CLI wrapper** reutilizando supervisor existente, **sin `.exe`** | UX unificada para dev/power-user. | Alto si se salta modelos **B**/**D**; riesgo de duplicar `spawn`. | `mapazapp-local-launcher-wrapper.ts` + script `pnpm` (**§11**). | **Sí** | **Sí** (si ejecuta supervisor) | **Sí** (vía supervisor; no duplicar superficie) | Evitar nuevas | Tests + run evidenciado bajo **D11.8**-style. | Quitar script; supervisores **D13** intactos. | **Solo** tras **D14.4**/**D14.5** y gate **D14.6**. |
| **D. Wrapper dry-run CLI**, sin start | Validación de rutas/config/layout sin procesos. | Complejidad media sin valor si **B** no existe. | `mapazapp-local-launcher-wrapper-dry-run.ts` (**§11**). | **Sí** | **No** | **No** | **No** | Salida estable; sin tocar red. | Borrar módulo/CLI. | **D14.5** tras **D14.4**. |
| **E. Real wrapper** start/stop prototype | Demostración end-to-end cercana a producto. | **Muy alto** si se mezcla con packaging, dashboard sin decidir, o ausencia de modelos. | Varios TS + tests + posible doc de evidencia. | **Sí** | **Sí** | **Sí** | Disciplina **no** nuevas deps | Precondiciones **§10** + aprobación explícita. | Revertir commits; fallback supervisores. | **No** como salto desde **D14.3**; solo tras **D14.6**. |
| **F. Diferir wrapper** hasta **D13.9.1** | Congela decisión de dashboard antes de código wrapper “producto”. | Retrasa **D14.4**/**D14.5** innecesariamente si solo son modelos TS. | Doc **D13.9.1** (futuro). | **No** | **No** | **No** | **No** | N/A. | Reanudar cuando cierre **D13.9.1**. | **Opcional** para **C**/**E** “producto”; **no** bloqueante para **B**/**D** — ver **§6**. |

---

## 5. Recommended decision

**No** avanzar directo a un **wrapper real** con **start/stop** (**opción E**) desde el cierre de **D14.3**.

**Secuencia recomendada:**

| ID | Contenido |
|----|-----------|
| **D14.3** | **Decisión** (este doc) — **sin implementación**. |
| **D14.4** | **Modelo TS puro** de wrapper local — **sin** arranque de procesos, **sin** `spawn`. |
| **D14.5** | **CLI dry-run** del wrapper — validaciones read-only / impresión de plan — **sin** start. |
| **D14.6** | **Gate** explícito para **prototipo real** start/stop (precondiciones **§10**, aprobación **D11.8**-style, evidencia). |

**Justificación:**

- Ya existe un **supervisor real** probado (**D13.5**); un wrapper no debe reintroducir `spawn` en múltiples sitios ni mezclar packaging + procesos en un solo salto.
- **Layout** (**D14.1**), **manifiesto** (**D14.2**) y **modelos** (**D11.1**, ciclo de vida **D11.4**, ownership **D11.5**) deben **preceder** o **acompañar** el código ejecutable.
- Mantiene **postura de seguridad** antes de cualquier **`.exe`** o instalador.

**Nota Cursor:** Ir **directo a D14.4** (modelo TS puro) **sin** hacer **D14.3** ya no aplica — **D14.3** cierra la decisión. Si se propusiera **omitir D14.5** (dry-run CLI), habría que **justificar** brecha de validación operativa antes de **D14.6**; por defecto se mantiene **D14.5**.

---

## 6. Static dashboard strategy dependency (**D13.9.1**)

- **D13.9.1** sigue **abierta** a nivel de decisión de producto (Vite dev vs preview vs estático en API vs servidor mínimo — **D14.0** §5 / **D14.2** §13).
- **Hoy** los supervisores usan **Vite dev** en **5173** — válido para desarrollo y evidencia, **no** ideal como único modo de un launcher empaquetado.

| Alcance | ¿**D13.9.1** bloquea? |
|---------|------------------------|
| **D14.4** — modelo TS puro, sin procesos | **No**. |
| **D14.5** — dry-run CLI, sin start | **No**; el CLI puede marcar `dashboardStrategy: pending` con **warning** documentado. |
| **D14.6** — prototipo **real** start/stop | **Depende**: si el prototipo debe reflejar **modo producto** (estático/preview), **sí** conviene **D13.9.1** cerrada; si el prototipo se limita explícitamente al **mismo** modo Vite dev que **D13.5**, se puede acotar — aún así, riesgo de expectativas equivocadas. |
| **`.exe` / packaging real** | **Sí** — **D13.9.1** debe estar **cerrada**. |

---

## 7. Wrapper responsibilities (futuro, si se implementa)

- Leer y validar **config** (`LauncherConfig` / **D11.1**).
- **Resolver** rutas del **layout** **D14.1** (sin hardcode de home en fuente).
- **Preflight** de puertos y dependencias declarativas.
- **Start/stop** delegando en el **mismo** patrón de supervisor (orden API → dashboard al subir; dashboard → API al bajar).
- Exponer **status** agregado (salud, puertos, flags de seguridad).
- Gestionar rutas de **evidencia** y **logs** con **redacción**.
- **Cleanup** solo sobre hijos registrados; **no** matar procesos ajenos (**D11.6**).
- **No** escribir secretos; **no** MT5; **no** `POST`; **no** trading.

---

## 8. Wrapper non-responsibilities

- **No** lanzar ni administrar **MT5**; **no** **command files**; **no** **watcher** de bridge como producto.
- **No** enviar órdenes ni **action transport** operativo.
- **No** **DB** operativa Mapazapp; **no** **WebSocket live** obligatorio; **no** **cloud** forzado.
- **No** **installer**, **no** **auto-update** silencioso, **no** servicio Windows en esta fase.
- **No** gestionar cuentas/brokers reales ni credenciales.

---

## 9. Required model before implementation (código con procesos)

Antes de cualquier **start/stop** real en código nuevo, deben existir (como docs o TS puro ya aprobados):

| Modelo / artefacto | Referencia |
|--------------------|------------|
| **Layout** | **D14.1** |
| **Config** | **D11.1** + plantillas **D14.2** §12 |
| **Manifest / empaquetado** | **D14.2** (y opcionalmente **D14.2.1**/**D14.2.2**) |
| **Evidence schema** | **D13.8** / **D13.9** §10 (evolución documentada) |
| **Taxonomía de errores** | **D13.8** + fallos **D14.2** §16 |
| **Status model** | Runtime envelope **D5.1b** + adapters |
| **Cleanup policy** | **D11.6**, **D13.5**/**D13.6** |
| **Estrategia dashboard** | **D13.9.1** si el alcance del wrapper es “producto” o empaquetado real — ver **§6** |

---

## 10. Safety gates before any real wrapper run

Checklist **mínimo** (ampliación de **D14.0** §6):

| # | Precondición |
|---|--------------|
| 1 | **Working tree limpio** en el momento de la aprobación. |
| 2 | **Tests** del workspace relevantes en verde (scripts + core + api-server según alcance del cambio). |
| 3 | **Evidencia** de supervisores **D13.3**/**D13.6** intacta y referenciable. |
| 4 | **Puertos** esperados libres o política **fail-closed** documentada. |
| 5 | **Config safe** — defaults loopback, flags MT5/action/trading **off**. |
| 6 | **Layout** resuelto acorde a **D14.1**. |
| 7 | **Sin MT5**, **sin** **`POST`**, **sin** trading en el alcance del run. |
| 8 | **Cleanup** definido (orden dashboard → API; sin `taskkill` amplio). |
| 9 | **Evidencia** del run definida (schema, redacción). |
| 10 | **Aprobación explícita** operador/responsable (**D11.8**-style). |

---

## 11. Proposed future files if implemented later

**No se crean en D14.3.** Lista de nombres candidatos bajo `APP/scripts/src/`:

- `mapazapp-local-launcher-wrapper-model.ts`
- `mapazapp-local-launcher-wrapper-dry-run.ts`
- `mapazapp-local-launcher-wrapper.ts`
- `mapazapp-local-launcher-wrapper.test.ts`

**Scripts `package.json` candidatos** (futuros):

- `mapazapp:launcher-wrapper-dry-run`
- `mapazapp:launcher-wrapper`

**D14.3 no añade** estos archivos ni entradas en `package.json`.

---

## 12. Risks

- **Mezclar** wrapper con **packaging real** o con generación de **`.exe`** sin gate.
- **Rutas** mal resueltas (espacios, perfiles, long paths).
- **Ownership** incorrecto de procesos hijos (regresión respecto a lección Vite **D13.6**).
- **Logs** con rutas privadas sin redacción.
- **Config corrupta** editable a mano.
- **Puertos ocupados** — tentación de matar procesos ajenos.
- **Vite dev vs estático** — expectativas de usuario final demasiado pronto.
- **Antivirus / SmartScreen** si se anticipa mentalmente el **`.exe`**.
- **Drift** entre este doc, **D14.2** y los supervisores **D13**.

---

## 13. Recommended next checkpoints

| ID | Contenido |
|----|-----------|
| **D14.3** | **Local launcher wrapper prototype decision** (este doc) — **sin implementación**. |
| **D14.4** | **TS pure local launcher wrapper model**, **no process start**. |
| **D14.5** | **Launcher wrapper dry-run CLI**, **no process start**. |
| **D14.6** | **Real wrapper prototype gate** (start/stop bajo precondiciones **§10**). |

**Opcional:**

- **D13.9.1** — decisión de servido estático del dashboard **antes** de **D14.6** “modo producto”, **packaging real** o **`.exe`**.
- **D14.2.1** / **D14.2.2** — modelo TS del manifiesto o validador dry-run read-only si reduce riesgo antes de **D14.5**/**D14.6**.

---

## 14. Definition of done

- [x] Documento **D14.3** creado en `APP/artifacts/mapazapp/docs/LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md`.
- [x] **Opciones** **A–F** evaluadas (**§4**).
- [x] **Decisión recomendada** y secuencia **D14.4–D14.6** (**§5**).
- [x] Dependencia **D13.9.1** definida (**§6**).
- [x] **Próximos checkpoints** propuestos (**§13**).
- [x] **Sin código**, **sin procesos**, **sin `.exe`**, **sin empaquetado**.

---

## 15. Non-goals

**D14.3 no implementa** ni autoriza en este checkpoint:

- Código nuevo, **filesystem writes**, **copia** de archivos, **`mkdir`**, **`writeFile`**.
- **Executable**, **installer**, empaquetado real.
- **`spawn`**, **`child_process`**, **`taskkill`**, **`process.kill`** nuevos.
- **API start**, **dashboard start**, **supervisor run**, **`mapazapp:dev-start`**.
- **MT5**, **watcher**, **command files**.
- **`POST`**, **action endpoints**, **trading**.
- **DB**, **WebSocket live**, **IPC real** nuevo.
- **`git push`**.
