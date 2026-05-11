# Mapazapp — Dashboard Visual Verification Plan D12

**Checkpoint D12.5 — solo planificación y documentación.** Este archivo **no** ordena ejecución: **no** arrancar API, **no** arrancar dashboard, **no** ejecutar `mapazapp:dev-start`, **no** MT5, **no** abrir navegador desde automatización.

**Contexto:** el run **D12.3** validó **API + dashboard** principalmente por **HTTP** y **CORS**; la evidencia está en [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md) (**D12.4**). **D12.5** define el alcance de verificación visual/humana. **Cierre humano (commit `0f1362a`):** **D12.10** ejecutado con checklist **OK** reportada por operador; evidencia [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md) (**D12.11**). Ante **cambios sustanciales de UI**, conviene **re-ejecutar** el mismo tipo de revisión humana.

**Estado D12.6:** el run de verificación acotado al plan se **ejecutó** con evidencia **parcial** (HTTP/logs/CORS **OK**; sin navegador interactivo del entorno de ejecución para DOM/consola/screenshot). Evidencia formal: [`DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md) (**D12.7**).

**Estado D12.8:** segundo run autorizado con el mismo límite de entorno para el agente; evidencia **parcial** archivada en [`DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md) (**D12.9**).

**Estado D12.10:** run **human dashboard visual verification** ejecutado; verificación visual **OK** según operador humano; evidencia formal **D12.11** en [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md). Siguiente compuerta documental sugerida para expansión de runtime: **D13.0** (§8).

**Planes relacionados:** [`API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md`](./API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md) (**D12.2**), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) (**D11.8**).

---

## 1. Purpose

- **D12.3** comprobó **API + dashboard** con cargas HTTP, GET a la API y prueba de **CORS** desde origen de desarrollo.
- **D12.4** archivó la **evidencia** de ese run en el repo.
- Para el mock local en **`0f1362a`**, la **verificación visual/humana** en navegador quedó **cerrada** con **D12.10–D12.11** (operador humano + evidencia en repo).
- **D12.5** **planifica** criterios y checks; **no** los ejecuta como parte del cierre del **solo** documento D12.5.

---

## 2. Scope

### Permitido en una **futura** sesión de verificación visual (cuando se apruebe fuera de D12.5)

- **API** en **`127.0.0.1:3001`** (mismo criterio que D12.2/D12.3).
- **Dashboard** dev en **`127.0.0.1:5173`** (o `localhost:5173` si se acuerda y CORS coincide).
- **Abrir el dashboard manualmente** en navegador solo si un responsable **autoriza** esa fase en el checkpoint de ejecución (p. ej. **nuevo** run de verificación humana tras **cambios sustanciales** de UI).
- Revisar **`ConfigPage`** (`/config`), **`RuntimeStatusPanel`** (vía `RuntimeStatusPanelContainer`), **`Mt5ConfigStatusPanel`**.
- **Capturar screenshot** solo si la política de producto/datos lo **autoriza**.
- **Capturar logs sanitizados** (terminal API/Vite + consola del navegador, sin secretos ni rutas privadas).

### Prohibido (incluso en la futura sesión gobernada por este plan, salvo gate explícito distinto)

- Lanzamiento **MT5**.
- **Watcher** o command files.
- **`POST` Mapazapp** o **action endpoints**.
- **Botones operativos** de dashboard añadidos o usados para side-effects.
- **Trading** real o simulado broker.
- **Launcher `.exe`** o IPC real privilegiado.

---

## 3. Preconditions for future visual run

Antes de aprobar un **nuevo** checkpoint de **verificación visual humana completa** (p. ej. tras **cambios sustanciales** de UI o de riesgo de producto):

- [ ] Evidencia **D12.4** leída y entendida.
- [ ] **`git status`** limpio en el commit base acordado.
- [ ] **Tests / build obligatorios OK** (misma barra que D12.3: `typecheck`, tests/build `api-server` y `mapazapp` desde `APP/` según política vigente).
- [ ] **Dry-run** `mapazapp:e2e-dry-run` **OK**.
- [ ] **Puertos 3001 y 5173** libres (o justificados como propios del experimento).
- [ ] **Plan de cleanup** definido (orden de parada, PIDs, sin `taskkill` amplio).
- [ ] **Autorización explícita** para verificación **manual** en navegador (humano en el loop).
- [ ] **No MT5**, **no POST** como parte del guion de prueba.

---

## 4. Visual checks

### 4.1 Dashboard loads

- La app carga en **`http://127.0.0.1:5173`** o **`http://localhost:5173`** (según bind acordado).
- **No** pantalla blanca persistente en la ruta de entrada acordada (p. ej. `/`).
- **No** error crítico visible (banner roto, pantalla de error de Vite/React obvia).
- **Navegación básica** (sidebar o enlaces principales) **responde** sin bloqueos obvios.

### 4.2 ConfigPage (`/config`)

- Ruta **`/config`** accesible y renderiza el layout esperado.
- **No** aparecen **controles operativos peligrosos** fuera del alcance del mock (los toggles de `ConfigPage` son **presentacionales** en el mock actual; el verificador debe confirmar que **no** persisten cambios ni disparan API — copy: *Display-only view* / *Changes are not saved in this mock* en [`ConfigPage.tsx`](../src/pages/ConfigPage.tsx)).
- **No** sugiere **ejecución real** ni “modo live trading” en copy visible.
- **No** muestra **secretos** ni **rutas privadas** completas del operador.
- **No** aparecen frases **«ready to trade»** ni **«live trading»** en copy visible.

### 4.3 RuntimeStatusPanel

- Panel visible como **snapshot de desarrollo** / **read-only** (texto guía en `ConfigPage`: *Development runtime snapshot. This does not start services or enable trading.*).
- **API** coherente con **`http://127.0.0.1:3001`** cuando `VITE_MAPAZAPP_API_BASE_URL` apunta a esa base (mismo criterio que D12.3).
- **`executionEnabled`** mostrado o inferible como **desactivado** / no “habilitado para operar”.
- **`reviewOnly`** / **`manualReviewRequired`** alineados con postura conservadora (visibles o coherentes con el JSON mostrado).
- **MT5 / bridge:** **no** “connected” falso; estados conservadores (`not_configured`, etc.) según payload.
- **No** auto-aprobación ni mutación de registry en UI.
- **No** copy que indique **trading** o **ejecución** habilitada.

### 4.4 MT5 Config Status Panel

Alineado a [`mt5ConfigStatusPresenter.ts`](../src/components/mt5ConfigStatusPresenter.ts) (`MT5_CONFIG_STATUS_REQUIRED_COPY` y título del panel):

- **Título / rol:** visibilidad de postura **read-only** / borrador (p. ej. título del panel *MT5 configuration status (read-only draft)*).
- **Copy obligatorio** (líneas canónicas a buscar en pantalla):
  - `Read-only MT5 configuration status.`
  - `This does not launch MT5 or enable trading.`
  - `No command files are written.`
  - `Manual review required.`
  - `Bridge readiness is informational only.`
- **No** botón de **abrir MT5** ni equivalente operativo.
- **No** file picker ni ingest de disco desde este panel.
- **No** estado **“connected”** falso ni **“ready to trade”** en el panel.

### 4.5 Browser console / terminal logs

- **Consola del navegador:** sin errores **críticos** repetidos (fallos de red a `/api/mapazapp/runtime/status`, excepciones no capturadas).
- **Sin errores CORS** en la consola para el flujo GET de runtime status desde el origen del Vite.
- **Sin stack traces** crudos mostrados al usuario en UI.
- **Sin rutas privadas**, **tokens**, ni **CSV crudo** en mensajes visibles o en logs copiados a la evidencia.

---

## 5. Evidence to capture

En el checkpoint de **ejecución futura** con navegador humano (p. ej. **re-verificación** tras cambio UI), archivar como mínimo:

- **Hash de commit** base.
- **Hora inicio / fin** (local, ISO-8601 recomendado).
- **Comandos ejecutados** (API + dashboard, literales).
- **URL del dashboard** usada.
- **Resumen** de respuesta **health** y **runtime status** (sin payload completo si no hace falta).
- **Screenshot opcional** (si autorizado).
- **Notas visuales** del verificador (qué rutas se visitaron, qué vio).
- **Logs sanitizados** (Vite, API, consola browser).
- **Cleanup** y **`git status`** final.

---

## 6. Stop / cleanup

- Detener **dashboard** y **API** en el orden acordado (mismo estilo que D12.3: PIDs dueños de **5173** y **3001**, **sin** `taskkill` amplio).
- Confirmar **3001** y **5173** liberados.
- **No** matar procesos ajenos.
- Confirmar **sin procesos huérfanos** claramente atribuibles a la prueba.

---

## 7. Failure handling

| Caso | Acción |
|------|--------|
| Dashboard no carga | Abortar verificación visual; capturar terminal Vite + consola; no reintentar en bucle destructivo. |
| `ConfigPage` no accesible | Abortar; capturar rutas y errores de router/red. |
| Error **CORS** | Abortar; documentar `Origin` y allowlist; no relajar CORS “al vuelo”. |
| Runtime status no carga en UI | Abortar; verificar `VITE_MAPAZAPP_API_BASE_URL` y red; capturar red DevTools (sin secretos). |
| Panel MT5 muestra copy **inseguro** o faltan líneas obligatorias | Abortar; tratar como **regresión** de copy/governance. |
| Aparece **botón operativo** inesperado | Abortar; no interactuar; incidente de alcance. |
| Aparece **“connected”** falso o **ready to trade** | Abortar; documentar captura; no continuar a otras rutas. |
| Cleanup falla | Documentar PIDs/puertos; escalar; no ampliar alcance ni matar procesos no identificados. |

En todos los casos: **capturar evidencia**, **frenar**, **no ampliar alcance**, **no tocar MT5**.

---

## 8. Approval gate

**D12.5 no ejecuta** la verificación visual como parte del cierre del plan.

**D12.6** (ejecutado fuera de este archivo, con aprobación explícita de sesión) cubrió **API + dashboard** y checks **HTTP/CORS/logs** sobre commit **`955f41a`**; la evidencia y la tabla de “no verificado visualmente” están en [**D12.7** — `DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md).

**D12.8** repitió el mismo alcance automatizable sobre commit **`0f1362a`**; la evidencia parcial del agente está en [**D12.9** — `DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md).

**D12.10** completó la **verificación visual humana** en navegador sobre **`23596a9`** / línea **`0f1362a`**; la evidencia consolidada (humano + técnico + cleanup) está en [**D12.11** — `HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md).

Para **nuevas** expansiones de runtime o UI sustancialmente distinta, se requiere **nueva** aprobación y, si aplica, **nuevo** ciclo de verificación acorde a riesgo. **Checkpoint sugerido:**

**D13.0 — Next runtime expansion gate, explicit approval required**

---

## 9. Non-goals

D12.5 **no** implementa ni encarga:

- **Código**, **UI nueva**, **botones**, **endpoints**, **`POST`**, **launcher**, **MT5**, **watcher**, **DB**, **WebSocket**, **trading**.
- Automatización de navegador desde CI como sustituto del criterio humano (salvo acuerdo de producto explícito fuera de este doc).
