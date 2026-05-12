# Mapazapp — Packaging Dry-run Manifest D14

## 1. Purpose

- **D14.1** ([`LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md`](./LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md)) definió el **layout local** conceptual bajo **`Mapazapp/`** (carpetas, políticas, validación futura, relación con manifiesto).
- **D14.2** (**este documento**) define el **contrato de un manifest dry-run declarativo** para el **futuro** empaquetado del launcher local: qué entra, qué queda fuera, qué es obligatorio u opcional, políticas y comprobaciones que un **validador futuro** podría ejecutar **sin copiar** archivos.
- **D14.2 no copia archivos** ni materializa un paquete en disco.
- **D14.2 no crea carpetas** de runtime ni de staging de producto.
- **D14.2 no genera `.exe`**, **no** instalador y **no** empaquetado real (zip/tarball firmado).
- **D14.2 no ejecuta procesos** (sin API, dashboard, supervisor, MT5, watcher).

**Aclaración:** **D14.2 no produce** un archivo **`manifest.json`** (ni otro JSON) **consumible en runtime** fuera de este árbol de documentación. **Sí documenta** el contrato que una herramienta **`dry-run`** posterior podría implementar (p. ej. **D14.2.2** opcional).

**Relacionado:** [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) (**D14.0**), [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md) (**D13.9**), [`PACKAGING_RUNTIME_DECISION_GATE_D13.md`](./PACKAGING_RUNTIME_DECISION_GATE_D13.md) (**D13.7**), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current baseline

| Aspecto | Estado |
|--------|--------|
| Supervisor **API + dashboard** | **OK** — evidencia **D13.6**; scripts `mapazapp:api-dashboard-supervisor` / `mapazapp:api-only-supervisor` en `@workspace/scripts` (**solo referencia**). |
| **Layout D14.1** | **Definido** — mapeo `Mapazapp/` + políticas. |
| **Packaging design D13.9** | **Cerrado** — modelos A–E, layout **§7**, assets **§8**. |
| **Launcher `.exe`** | **No**. |
| **Installer** | **No**. |
| **Raíz de runtime real** producto | **No** — manifiesto solo declarativo en docs. |
| **`dist/` en repo** | **Opcional** — `APP/artifacts/api-server/dist/` y `APP/artifacts/mapazapp/dist/` pueden **no existir** hasta un `build` local; el manifiesto futuro debe validar presencia **en el momento del dry-run**, no asumir en **D14.2**. |
| **MT5** / **`POST`** / action endpoints / **trading** | **No** en el alcance del paquete feliz. |

---

## 3. Manifest concept

El **manifest dry-run** (contrato documental) es:

| Dimensión | Qué define |
|-----------|------------|
| **Lista declarativa de artefactos esperados** | Rutas lógicas y globs conceptuales que **deberían** existir en un staging de release (p. ej. `api-server/dist/**`). |
| **Lista de exclusiones** | Patrones que **nunca** deben aparecer en el paquete (`.git`, logs reales, secretos). |
| **Mapeo source → target conceptual** | De árbol de **build** / monorepo a carpetas del layout **D14.1** (`launcher/`, `api-server/`, …). |
| **Validaciones futuras** | Comprobaciones **read-only** antes de copiar algo (en una fase posterior aprobada). |
| **Riesgos** | Tamaño, drift de nombres de `dist`, estrategia dashboard, SmartScreen futuro. |
| **Decisiones abiertas** | Ver **§18**; algunas **bloquean** un **`.exe` real** o packaging de usuario final, **no** este doc declarativo. |

---

## 4. Proposed manifest sections

Diseño de **secciones** que un JSON/YAML futuro podría reflejar (solo especificación aquí):

| Sección | Rol |
|---------|-----|
| **`metadata`** | Identidad del manifiesto, versión, modo, plataforma, notas (**§5**). |
| **`packageProfile`** | Perfil de empaquetado (p. ej. `local-launcher-dry-run`, `no-executable`). |
| **`sourceArtifacts`** | Orígenes en monorepo o CI (**§6**). |
| **`targetLayout`** | Mapeo al árbol **D14.1** (**§7**). |
| **`requiredFiles`** | Entradas obligatorias para considerar el paquete **coherente** (**§8**). |
| **`optionalFiles`** | Mejoras de UX/docs sin fallar el dry-run (**§9**). |
| **`excludedFiles`** | Patrones prohibidos en el paquete (**§10**). |
| **`generatedAtRuntime`** | Qué **no** se preempaqueta (**§11**). |
| **`configPolicy`** | Plantilla vs config real (**§12**). |
| **`logsPolicy`** / **`evidencePolicy`** / **`supportBundlePolicy`** | Alineado a **D14.1** §8–§12. |
| **`validationChecks`** | Lista de checks futuros (**§14**). |
| **`openDecisions`** | Puntero a **§18**. |
| **`safetyFlags`** | Invariantes que el manifiesto debe poder afirmar (**§15**). |

---

## 5. Metadata

Campos **conceptuales** (ningún archivo generado en **D14.2**):

| Campo | Descripción |
|-------|-------------|
| `manifestVersion` | Versión del **esquema** del manifiesto (p. ej. `"0.1"`). |
| `packageName` | Nombre lógico del paquete (p. ej. `mapazapp-local-launcher`). |
| `packageMode` | Valor fijo conceptual: **`dry-run`** — no implica I/O de empaquetado. |
| `generatedBy` | Actor futuro (`ci`, `developer-tool`, `manual`). |
| `sourceGitHead` | SHA opcional del commit fuente (sin escribir en disco en **D14.2**). |
| `buildVersion` | Semver o etiqueta de release candidata. |
| `createdAt` | ISO-8601 cuando se **materialice** el manifiesto en el futuro. |
| `platform` | p. ej. `win32-x64`. |
| `notes` | Texto libre (limitaciones, ticket, link a doc canónica). |

---

## 6. Source artifacts

Orígenes **conceptuales** respecto al workspace `APP/` (rutas ilustrativas; el validador futuro resolverá raíz):

| Artefacto | Source path conceptual | Required | Target folder (D14.1) | Validación futura | Riesgo |
|-----------|-------------------------|----------|------------------------|-------------------|--------|
| **Supervisor + scripts package** | `APP/scripts/` (runtime: entrypoints compilados o bundle TBD; hoy TS vía `tsx` en dev) | **Sí** (semántica de orquestación) | `launcher/` o subcarpeta `launcher/scripts/` (decisión de layout fina) | Scripts declarados existen en `package.json`; en producto: sin fuentes TS si se opta por bundle | **Alto** si se empaquetan fuentes + `node_modules` completos sin análisis |
| **api-server `dist`** | `APP/artifacts/api-server/dist/` | **Sí** para paquete “API-only” o “API+dashboard” | `Mapazapp/api-server/` | Presencia de entrypoint (`index.mjs` o el que defina el build) | `dist` ausente si no hubo build |
| **Dashboard artefacto** | `APP/artifacts/mapazapp/dist/` **o** subconjunto Vite/preview según **D13.9.1** | **Condicional** — ver **§13** | `Mapazapp/dashboard/` | Existencia de `index.html` o convención acordada según modo A–D | Estrategia abierta → manifest puede marcar `dashboardArtifact: pending` |
| **package.json mínimos** | Derivados de `APP/artifacts/api-server/package.json`, `APP/artifacts/mapazapp/package.json` | **Sí** (metadatos + scripts `start` reducidos) | Junto a cada artefacto bajo `api-server/`, `dashboard/` | JSON válido; sin `devDependencies` innecesarias en runtime | Drift entre workspace y paquete |
| **Launcher scripts futuros** | Aún no canónicos — placeholders documentados | **No** hoy | `Mapazapp/launcher/` | N/A hasta **D14.3** | Scope creep si se mezcla con `.exe` |
| **Docs sanitizados opcionales** | `APP/artifacts/mapazapp/docs/` (subconjunto) | **No** | `launcher/docs/` o `share/docs/` (nombre TBD) | Solo archivos allowlist | Tamaño y contenido sensible |

---

## 7. Target layout mapping

Layout **D14.1** — qué va en **packaging** vs **runtime**:

| Carpeta | Incluir en paquete (conceptual) | Generado en runtime local | Vacío al instalar | Excluido de Git (install) | Validar en dry-run futuro |
|---------|--------------------------------|---------------------------|-------------------|---------------------------|---------------------------|
| **`launcher/`** | Entrypoint futuro, README, `VERSION`, manifiesto de release | — | Posible hasta primer upgrade | **Sí** (artefacto) | Rutas relativas; sin secretos |
| **`api-server/`** | `dist/` + `package.json` mínimo + deps runtime | — | **No** si hay `dist` | **Sí** | Entrypoint existe |
| **`dashboard/`** | Artefacto UI según **§13** | — | Puede estar vacío si modo “solo API” (no objetivo actual) | **Sí** | Coherencia con CORS/API si aplica |
| **`config/`** | **Solo** plantilla default (`*.template.json`) | `mapazapp.local.json` real | Plantilla **sí**; real **no** en paquete | Real: **Sí** ignorar en Git | JSON schema + flags **§12** |
| **`logs/`** | **No** | Sí | **Sí** (creación diferida) | **Sí** | No listar archivos reales en manifest de release |
| **`evidence/`** | **No** (salvo sample sanitizado opcional **§9**) | Sí | **Sí** | **Sí** | Igual que logs |
| **`runtime/`** | **No** | Sí | **Sí** | **Sí** | Locks no preempaquetados |
| **`backups/`** | **No** | Sí | **Sí** | **Sí** | Nunca incluir backups reales |
| **`support/`** | **No** (solo política) | Sí (exports) | **Sí** | **Sí** | Bundle solo bajo herramienta explícita |

---

## 8. Required files

Lista **conceptual** — el dry-run futuro **falla** si falta lo marcado **required** para el perfil elegido:

| Entrada | Estado hoy | Notas |
|---------|------------|--------|
| **Launcher entrypoint futuro** | **Falta** en producto — placeholder en manifiesto | Node CLI o script acotado post **D14.3** |
| **Supervisor runtime o bundle futuro** | **Parcial** — existe lógica en `mapazapp-api-dashboard-supervisor.ts` (TS); no hay bundle release | El manifest debe distinguir **“dev path”** vs **“release bundle”** |
| **api-server dist entrypoint** | **Requiere build** — `dist/` puede no estar en clone limpio | Check: ejecutar build en CI antes de dry-run material |
| **Dashboard assets** | **Estrategia pendiente** (**§13**) | Puede ser `dist/` estático, preview, o embebido en API |
| **package metadata** | **Existe** en `package.json` de artifacts | Debe reducirse a runtime mínimo |
| **Default config template** | **Diseño** — alinear a **D11.1** / **D14.1** §7 | Archivo plantilla sin secretos |
| **README local** | **Recomendado** | Uso, puertos loopback, non-goals |
| **Safety notice** | **Recomendado** | `executionEnabled: false`, no trading, no MT5 |

---

## 9. Optional files

| Entrada | Propósito |
|---------|-----------|
| **Docs sanitizados** | Ayuda in-band reducida |
| **Support template** | Estructura vacía o README en `support/` |
| **Sample config sanitizado** | Ejemplo con valores redactados |
| **Evidence schema sample** | Contrato JSON documental (**D13.8**) |
| **Changelog** | Trazabilidad de release |
| **Troubleshooting guide** | Reducir soporte informal |

---

## 10. Excluded files

**Nunca** deben coincidir con el conjunto “incluido” del paquete release (el validador futuro debe **fallar** si aparecen):

- **`node_modules/` completo** del monorepo salvo subconjunto explícitamente listado como runtime.
- **Source TS completo** del repo si el perfil es “runtime mínimo”.
- **`logs/` reales**, **`evidence/` real**, **`backups/` reales**.
- **`config/*local*.json`** real del usuario.
- **Datos MT5 reales**, **command files**, **watcher state**.
- **Secretos**, **`.env` real** con claves, tokens de broker.
- **Raw CSV** de mercado o exportaciones sensibles.
- **Rutas de usuario** como literales en artefactos de paquete.
- **Test large datasets**, fixtures pesados no allowlist.
- **`.git/`**, **`.cursor/`**, historiales de IDE.

---

## 11. Generated at runtime

Contenido **no preempaquetado**; se crea **solo** en máquina del usuario bajo políticas **D14.1**:

| Tipo | Ejemplos |
|------|----------|
| **Logs** | `logs/*` por run/componente |
| **Evidence JSON** | `evidence/<runId>.json` |
| **Runtime locks / PID snapshots** | `runtime/*` |
| **Backups de config** | `backups/*` |
| **Support bundles** | `support/*.zip` (staging) |

**Política:** sanitización y export parcial según **D14.1** §8–§12; nunca reexportar el monorepo completo.

---

## 12. Config policy

- **Plantilla de config por defecto** — **sí** en paquete (`config/*.template.json` o equivalente).
- **Config local real** — **no** en el paquete; creada por usuario o primer run documentado.
- **Sin secretos** en plantilla.
- **`allowTrading`: `false`**, **`mt5.enabled`: `false`**, **`actionTransport.enabled`: `false`** en defaults.
- **Loopback only** para hosts por defecto (`127.0.0.1`).
- **Validación antes de start** — `validateLauncherConfig` / aserciones de seguridad (**D11.1**), **fail-closed**.

---

## 13. Dashboard packaging strategy

| Opción | Descripción breve |
|--------|-------------------|
| **A** | Vite **dev** server en paquete (como supervisores **D13.5**/**D13.6**). |
| **B** | **`vite preview`** sobre `dist/`. |
| **C** | **`dashboard/dist`** estático servido por **API**. |
| **D** | **`dashboard/dist`** estático servido por **launcher** (servidor mínimo). |
| **E** | **Decisión pendiente** (**D13.9.1**). |

### ¿Bloquea **D13.9.1** a **D14.2**?

- **No** para este **manifest declarativo en documentación**: el contrato puede listar **`dashboard/`** como destino y marcar el artefacto como **`required: conditional`** o **`artifactStatus: pending`** hasta existir `dist/` o hasta elegir C/D.
- **Sí** bloquea **D14.2** **solo si** al implementar un validador o un staging real no se puede **enumerar** qué archivos contarían como “dashboard” (ej. fusión C sin carpeta `dashboard/` separada) — entonces hay que cerrar **D13.9.1** primero.

### ¿Bloquea **D14.3** o **D14.2**?

- **Packaging real** o **wrapper** que asuma dashboard estático **sí** exigen **D13.9.1** cerrada **antes** de código que fije modo producto.
- **Recomendación:** **D14.2** (este doc) **cierra** el contrato declarativo; **D13.9.1** debe cerrarse **antes** de empaquetado real o **`.exe`**, alineado a **D14.0 §5**.

---

## 14. Validation checks for future dry-run

Checks **read-only** propuestos (implementación opcional **D14.2.2**):

1. **`api-server` `dist` existe** y contiene entrypoint declarado.
2. **Artefacto dashboard existe** **o** el manifiesto declara explícitamente **`pending`** con perfil que no lo exige.
3. **Launcher entrypoint existe** **o** placeholder aceptado solo en perfil `dry-run-docs`.
4. **Plantilla de config válida** (parse JSON + reglas **§12**).
5. **Ningún archivo prohibido** coincide con globs de **§10**.
6. **No se incluyen** `logs/`, `evidence/`, `backups/` reales en el set “in”.
7. **No secretos** — heurística de tokens / `.env` / claves privadas.
8. **Longitud de rutas** razonable (Windows MAX_PATH / long paths habilitados).
9. **Rutas Windows seguras** — sin caracteres ilegales; prefijo conocido.
10. **Estimación de tamaño** del paquete (umbral configurable).
11. **Safety flags** coherentes con **§15**.
12. **MT5** y **actionTransport** deshabilitados en config plantilla y flags de manifiesto.

---

## 15. Safety flags

El manifiesto (o metadata asociada) debe poder **afirmar** explícitamente, para builds Mapazapp mock/review:

| Flag | Valor esperado en dry-run “safe” |
|------|----------------------------------|
| `executionEnabled` | **`false`** |
| `sendToMt5Enabled` | **`false`** |
| `autoApprovalEnabled` | **`false`** |
| `registryMutationAllowed` | **`false`** |
| `allowTrading` | **`false`** |
| `mt5.enabled` | **`false`** |
| `actionTransport.enabled` | **`false`** |

(Alineado a envelopes **D5.1b** / documentación **D13.9** / **D14.1** §7.)

---

## 16. Failure handling

Un **dry-run** futuro debe **fallar de forma explícita** (código de error / informe) ante:

| Condición | Comportamiento |
|-----------|----------------|
| **Artefacto requerido ausente** | Error `MISSING_REQUIRED_ARTIFACT` + ruta lógica |
| **Coincidencia con archivo prohibido** | Error `FORBIDDEN_FILE_MATCHED` + patrón |
| **Token o path con apariencia de secreto** | Error `SECRET_LIKE_VALUE` |
| **Estrategia dashboard no resuelta** cuando el perfil exige artefacto | Error `DASHBOARD_STRATEGY_UNRESOLVED` |
| **Config inválida** | Error `INVALID_CONFIG_TEMPLATE` |
| **Target path inseguro** (p. ej. salida fuera de staging) | Error `UNSAFE_TARGET_PATH` |
| **Source fuera de raíces permitidas** | Error `SOURCE_OUTSIDE_ALLOWED_ROOTS` |
| **Paquete demasiado grande** | Error `PACKAGE_SIZE_EXCEEDED` (warning vs error por política) |

---

## 17. Relationship with D14.3

- **D14.2 no autoriza** un **wrapper** real ni **`spawn`**.
- **D14.3** — *Local launcher wrapper prototype decision* — decidirá si se permite **código** de envoltorio y run bajo **D14.0 §6**.
- **D14.3 debe consumir** este manifiesto como **lista de verdad** para qué empaquetar y qué validar antes de arrancar.
- **D14.3 no debe saltar** a **`.exe` firmado`**, **installer**, ni **auto-update** — esos quedan en gates posteriores explícitos.

---

## 18. Open decisions

- **Estrategia dashboard estática** (**D13.9.1**) — A/B/C/D.
- **Modo de paquete** — portable vs instalable (perfiles de manifiesto distintos).
- **Inclusión de Node runtime** — embebido vs requerir Node en sistema.
- **Estrategia `node_modules`** — plano mínimo vs bundle único.
- **Ubicación de config** — solo bajo `Mapazapp/config/` vs ruta de usuario.
- **Retención** `logs/` / `evidence/`.
- **Formato** del bundle de soporte.
- **¿Modelo TS puro del manifiesto?** — **D14.2.1** opcional.
- **¿Validador dry-run read-only?** — **D14.2.2** opcional (solo lectura, sin copiar).

---

## 19. Recommended next checkpoints

| ID | Contenido |
|----|-----------|
| **D14.2** | **Packaging dry-run manifest** (este doc) — **sin ejecutable**, **sin** I/O. |
| **D13.9.1** | Decisión de servido estático del dashboard — **si** bloquea enumeración concreta de artefactos o implementación. |
| **D14.2.1** | Modelo TS puro del manifiesto — **sin** escrituras a filesystem (opcional). |
| **D14.2.2** | Validador dry-run — **solo lectura**, sin copiar (opcional). |
| **D14.3** | Decisión / prototipo **wrapper** launcher local — tras **D14.2** y precondiciones **D14.0 §6**. |

---

## 20. Non-goals

**D14.2 no implementa** ni autoriza:

- Código TypeScript/JavaScript nuevo, scripts de build nuevos, ni dependencias nuevas.
- **Escrituras** a filesystem (`mkdir`, `writeFile`), **copia** de archivos, creación de **`dist/`**.
- **Executable**, **installer**, empaquetado real, firma de código.
- **`spawn`**, **`child_process`**, **`taskkill`**, **`process.kill`**.
- **API start**, **dashboard start**, **supervisor run**, **`mapazapp:dev-start`**.
- **MT5**, **watcher**, **command files**.
- **`POST`**, **action endpoints**, **trading**.
- **DB**, **WebSocket live**, **IPC real**.
- **`git push`** o publicación de artefactos.
