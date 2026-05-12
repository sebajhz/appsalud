# Mapazapp — Local Runtime Folder Layout Model D14

## 1. Purpose

- **D13.9** ([`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md)) diseñó el **packaging local** del futuro launcher: layout conceptual, assets, config, logs, supervisión empaquetada y compuertas, **sin** ejecutable.
- **D14.0** ([`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md)) abrió la **compuerta formal** del prototipo launcher local y fijó la secuencia **D14.1 → D14.2 → D14.3**.
- **D14.1** (**este documento**) **modela** el **layout de carpetas de runtime local** que el launcher usaría en el futuro: qué existe conceptualmente, qué va en cada sitio, qué se excluye, sensibilidad, política Git, exportación a soporte, rutas configurables, defaults seguros, validaciones futuras y vínculo con el **manifest dry-run** de **D14.2**.
- **D14.1 no crea carpetas reales** en disco.
- **D14.1 no escribe archivos** (ni `fs.mkdir`, ni `fs.writeFile` para materializar el layout).
- **D14.1 no empaqueta** (sin zip, sin copia de artefactos, sin firma).
- **D14.1 no ejecuta procesos** (sin API, dashboard, supervisor, MT5, watcher ni launcher).

**Relacionado:** [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md), [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) (**D14.2**), [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md) (**D2**), [`mapazapp-launcher-config-model.ts`](../../../scripts/src/mapazapp-launcher-config-model.ts) (**D11.1**, solo referencia; **no** se modifica en **D14.1**).

---

## 2. Current baseline

| Aspecto | Estado |
|--------|--------|
| Supervisor **API + dashboard** | **OK** — evidencia **D13.6**; semántica reutilizable por un launcher futuro. |
| Diseño **packaging** **D13.9** | **OK** — layout base **§7**; **D14.1** lo extiende con **`support/`**, políticas explícitas y validación conceptual. |
| Gate **D14.0** | **OK** — prototipo launcher autorizado como dirección; **D13.9.1** no es prerequisito estricto de **D14.1**. |
| Launcher **`.exe`** | **No** existe. |
| **Installer** / empaquetado real | **No** en alcance. |
| **Carpetas de runtime reales** producto | **No** — solo modelo documental. |
| **Config local persistida** producto | **No** — el modelo **`LauncherConfig`** (**D11.1**) es canónico sin I/O en ese módulo. |
| **MT5** / **`POST`** / action endpoints / **trading** | **No** en el layout feliz; flags explícitos **off** en el esquema conceptual de **§7**. |

---

## 3. Proposed top-level layout

Raíz conceptual: carpeta de instalación portable **`Mapazapp/`** o raíz bajo perfil (p. ej. `%LOCALAPPDATA%\Mapazapp\` — ver **§14**). Nombres finales por producto.

```
Mapazapp/
  launcher/
  api-server/
  dashboard/
  config/
  logs/
  evidence/
  runtime/
  backups/
  support/
```

### 3.1 Resumen por carpeta

| Carpeta | Purpose | Contents (ejemplos) | Sensitive | Git tracked | User editable | Exportable soporte | Cleanup policy |
|---------|---------|---------------------|-----------|-------------|-----------------|----------------------|------------------|
| **`launcher/`** | Entrypoint y metadatos del envoltorio futuro. | Scripts/README conceptual, `VERSION` o manifiesto de versión, checksum opcional. | **No** (sin secretos). | **No** en installs reales; en repo solo si hay fixtures documentados. | **Sí** limitado (no binarios no confiables). | **Parcial** (versión, build id). | Sustitución en upgrade manual; no acumular versiones viejas sin política. |
| **`api-server/`** | Runtime del API construido. | `dist/` consumible por `node` (`index.mjs` o equivalente), `package.json` mínimo, subconjunto de `node_modules` o bundle. | **No** por defecto; cuidado si se vuelca config por error. | **No** (artefacto de release). | **No** salvo hotfix acotado bajo soporte. | **Parcial** (lista de versión, no `node_modules` completo). | Reemplazo atómico en upgrade; logs **no** aquí. |
| **`dashboard/`** | UI servible en runtime empaquetado. | `dist/` estático y/o paquete mínimo de preview (**D13.9.1** pendiente). | **No**. | **No**. | **No** en modo producto. | **Parcial** (solo metadatos / hash). | Reemplazo con build alineado a API/CORS. |
| **`config/`** | Configuración local validada. | `mapazapp.local.json` futuro (nombre acordado), plantillas. | **Medio** — rutas pueden revelar usuario; **no** tokens/credenciales. | **No** en máquina real. | **Sí** con validación **fail-closed**. | **Sí** **redactada** (sin rutas completas privadas). | Backup antes de migración → **`backups/`**. |
| **`logs/`** | Registro por componente/run. | Subcarpetas `launcher/`, `api/`, `dashboard/`, `supervisor/` (texto UTF-8). | **Medio** — riesgo de paths; obligatoria **redacción**. | **No**. | **No** recomendado (append only vía proceso). | **Parcial** (últimas **N** líneas sanitizadas). | Rotación por días/tamaño (**§8**, **§17**). |
| **`evidence/`** | Evidencia JSON estructurada por run. | `runId.json` con resúmenes de salud, puertos, cleanup (**§9**). | **Medio** — sanitizar siempre. | **No**. | **No** (solo lectura humana). | **Sí** (JSON sanitizado). | Retención por días; purga de runs antiguos. |
| **`runtime/`** | Estado **efímero** del launcher/procesos. | PIDs propios, locks futuros, snapshot de estado actual. | **Bajo** — puede contener puertos/PIDs. | **No**. | **No**. | **Parcial** (solo si redactado). | **Limpieza al cerrar**; detección de **stale** al arrancar. |
| **`backups/`** | Copias de seguridad antes de cambios. | Copias timestamped de **`config/`**. | **Medio** (misma clase que config). | **No**. | **Sí** manual (restaurar archivo). | **Parcial** (solo si redactado). | Rotación por tamaño/antigüedad. |
| **`support/`** | **Staging** de bundle de soporte **futuro**. | ZIP/texto generado bajo política: logs+evidence+config redactados+versión. | **Controlado** — solo export **sanitizado**. | **No**. | **No** (generado por herramienta). | **Sí** (es el destino del export). | Borrar tras envío o TTL corto. |

---

## 4. launcher/

- **Futuro launcher wrapper** (Node o eventual stub **`.exe`** — **fuera** de **D14.1**): un solo punto de entrada documentado.
- **Scripts de start/stop** conceptuales (no confundir con comandos `pnpm` del monorepo actual).
- **Metadata de versión** (`VERSION`, semver, opcional `buildId` / `gitHead` en evidencia, no en secretos).
- **No secrets** — ningún token ni credencial broker.
- **No MT5** — no binarios ni scripts de terminal de trading.
- **No trading** — no órdenes ni puentes de ejecución.
- **Queda fuera por ahora:** **`.exe` real**, **installer**, **auto-updater**, IPC avanzado, nuevos `spawn` fuera del gate **D14.3**.

---

## 5. api-server/

- **`dist/` del API** — salida de build desde `APP/artifacts/api-server` (p. ej. `dist/index.mjs`); alineado con empaquetado **D13.9 §8**.
- **Metadatos mínimos de paquete** — `package.json` reducido, `type: module` si aplica, scripts `start` mínimos.
- **Dependencias de runtime** — subconjunto necesario para `node` (no el monorepo completo ni devDeps de workspace).
- **Los logs no van aquí** — van a **`logs/api/`** (o equivalente bajo **`logsRoot`**).
- **La config no va aquí** — vive en **`config/`**; variables de entorno puntuales pueden complementar, sin duplicar secretos.
- **No incluir el source TS completo** si el packaging final optimiza tamaño — solo lo necesario para ejecutar.
- **Relación con el repo:** en desarrollo, el build actual vive bajo `APP/artifacts/api-server/dist`; en el layout producto, **`Mapazapp/api-server/`** es la **proyección** de ese artefacto más metadatos de runtime.

---

## 6. dashboard/

**Opciones** (heredadas de **D14.0 §5** / **D13.9**):

| Opción | Descripción breve |
|--------|-------------------|
| **V1** | Vite dev (estado supervisores **D13.5**/**D13.6**). |
| **V2** | `vite preview` sobre `dist/`. |
| **V3** | Estático servido por el mismo proceso que API. |
| **V4** | Servidor estático mínimo dedicado. |

**Para D14.1:**

- Se **modela** **`dashboard/`** como contenedor de **`dist/`** estático **o** paquete mínimo equivalente.
- **No se decide** aún entre V1–V4 si la decisión **no bloquea** el layout: cualquiera ocupa una carpeta **`dashboard/`** con artefactos servibles.
- **D13.9.1** puede cerrarse **antes de D14.2** si el manifest necesita detallar entradas distintas (p. ej. fusión V3 sin carpeta `dashboard/` separada).

---

## 7. config/

- **Archivo local futuro (nombre conceptual):** `config/mapazapp.local.json` (o `launcher-config.json` alineado a **D13.9 §9** — unificar nombre en **D14.2** si hace falta).
- **Schema conceptual** (campos orientativos; validación futura contra **`LauncherConfig`** **D11.1**):

| Campo | Rol | Default seguro sugerido |
|-------|-----|-------------------------|
| `schemaVersion` | Migraciones documentadas. | `"1"` |
| `apiHost` | Bind API. | `"127.0.0.1"` |
| `apiPort` | Puerto API. | `3001` |
| `dashboardHost` | Bind dashboard / static server. | `"127.0.0.1"` |
| `dashboardPort` | Puerto dashboard. | `5173` (o el que fije modo estático) |
| `logsRoot` | Raíz de logs (puede apuntar a `Mapazapp/logs` o subárbol). | Bajo raíz layout o subcarpeta portable |
| `evidenceRoot` | Raíz de evidencias JSON. | `Mapazapp/evidence` |
| `runtimeRoot` | Raíz efímera. | `Mapazapp/runtime` |
| `mt5.enabled` | Gate MT5. | **`false`** |
| `actionTransport.enabled` | Gate transporte de acciones. | **`false`** |
| `allowTrading` | Coherente con política comercial de no ejecución. | **`false`** |

- **No secrets** — sin tokens, API keys ni credenciales broker.
- **No tokens** de acción hasta gates **D9.x** completos y transporte aprobado.
- **Usuario editable** con **validación estricta** (`validateLauncherConfig` / `assertLauncherConfigSafety` **D11.1**).
- **Backup strategy** — antes de cambiar `schemaVersion` o flags críticos, copia timestamped a **`backups/`**; restauración manual documentada.

---

## 8. logs/

- **Logs por run** — prefijo o subcarpeta por fecha/`runId` (ej. `logs/launcher/2026-05-11/runId.log` — convención a fijar en **D14.2**/producto).
- **Logs por componente** — separación para auditoría y soporte focalizado.
- **Redacción obligatoria** — política **D9.14.2** (API) + plan **D13.8** (supervisor); rutas de usuario truncadas o segmentadas.
- **Rotación simple** — por antigüedad o tamaño total máximo (**decisión abierta §17**).
- **No raw CSV** de trading ni volcados de market data.
- **No secrets** en texto claro.
- **No stack traces completos** por defecto en producto — solo modo debug explícito **off** por defecto.
- **Export parcial** — últimas **N** líneas por archivo, con misma pipeline de sanitización → **`support/`**.

**Ejemplo conceptual:**

```
logs/
  launcher/
  api/
  dashboard/
  supervisor/
```

---

## 9. evidence/

- **Evidencia JSON por run** — un archivo (o convención documentada) por **`runId`**.
- **Schema futuro** (campos orientativos):

| Campo | Descripción |
|-------|-------------|
| `runId` | Identificador único del run. |
| `checkpoint` | Etiqueta de fase (p. ej. `D13.6-style`, `launcher-prototype`). |
| `gitHead` / `buildVersion` | Trazabilidad sin secretos. |
| `startedAt` / `stoppedAt` | ISO-8601. |
| `health summary` | Resultados agregados de checks HTTP/health. |
| `runtime summary` | Snapshot envelope-safe (`executionEnabled`, MT5 `not_configured`, etc.). |
| `dashboard summary` | HTTP `/`, `/config` OK/fallo sin bodies completos. |
| `cleanup summary` | Orden dashboard→API; puertos liberados. |
| `safety flags` | Coherencia con gates y `schemaVersion`. |

- **Sanitización** — sin payloads HTTP completos; sin paths absolutos largos sin redacción.
- **Exportable** — **sí** para soporte, como parte del bundle bajo **`support/`**.
- **No payloads sensibles completos** — nunca adjuntar archivos de usuario sin consentimiento y redacción.

---

## 10. runtime/

- **Archivos temporales** — locks, flags de “en ejecución”, PID **solo hijos propios** del launcher.
- **PID files** — opcional; si se usan, solo PIDs bajo ownership verificado (**D11.6** / **D13.5**).
- **Lock files futuros** — una instancia por máquina/usuario según decisión de producto.
- **Current status snapshot** — estado efímero legible por el launcher (no fuente de verdad duradera).
- **No datos sensibles permanentes** — nada que deba conservarse tras shutdown limpio.
- **Cleanup al cerrar** — eliminar o invalidar locks/PIDs al terminar el run.
- **Stale detection** — si al arrancar quedan locks de proceso inexistente, política **fail-closed** o recuperación documentada **sin** matar procesos ajenos.

---

## 11. backups/

- **Backups manuales futuros** — usuario o launcher copian `config/` antes de upgrades.
- **Config backups** — principal contenido; nombre con timestamp.
- **No DB** todavía — sin dumps de base de datos Mapazapp.
- **No trading data sensible** — sin historiales de órdenes ni CSV de broker.
- **Rotación y tamaño** — límites para no llenar disco (**§17**).
- **Fuera de Git** — nunca commitear backups reales.

---

## 12. support/

- **Bundle de soporte futuro** — artefacto único (p. ej. `.zip` o carpeta timestamped) generado bajo reglas estrictas.
- **Contenido típico** — subset de **`logs/`** + **`evidence/`** sanitizados + **versión** + **config redactada**.
- **No secretos** — misma regla que **§7**.
- **No rutas privadas completas** — usar redacción de segmentos de usuario y homogeneizar raíces a placeholders (`%LOCALAPPDATA%`, `<LAYOUT_ROOT>`).

---

## 13. `.gitignore` / repo policy

Si el desarrollador monta un layout **`Mapazapp/`** dentro o junto al clone, **debe ignorarse** en Git (salvo fixtures explícitos):

| Patrón / clase | Motivo |
|----------------|--------|
| Raíz de **runtime local** del producto | No contaminar el repo con estado de máquina. |
| **`logs/**`** | Contenido efímero y posiblemente sensible. |
| **`evidence/**`** | JSON de runs reales. |
| **`backups/**`** | Copias de config con rutas. |
| **`config/*local*.json`** / config real | Editable por usuario; riesgo de leak. |
| **`support/**` exports reales** | Bundles para terceros. |
| **Datos MT5 reales** | Fuera de alcance y altamente sensibles. |
| **Command files** hacia MT5 | Prohibidos en gates actuales. |
| **Secrets** | Cualquier token o clave. |

**Aclaraciones:**

- **Fixtures sintéticos** — **sí** pueden vivir en repo bajo rutas de test acotadas.
- **Evidencia documental sanitizada** (markdown de archivo en `docs/`) — **sí** en repo.
- **Runtime real** (`logs/`, `evidence/`, `runtime/` productivos) — **no** en repo.

---

## 14. Path policy

| Tema | Política |
|------|----------|
| **Portable vs `%LOCALAPPDATA%`** | Default seguro: preferir **subcarpeta bajo perfil** para escrituras si no hay garantía de permisos en portable; portable viable en USB con riesgo de latencia/antivirus (**decisión abierta §17**). |
| **Rutas con espacios** | Siempre citar/escapar en scripts Windows; tests futuros deben incluir casos con espacios. |
| **Long paths** | Preferir layouts no absurdamente anidados; documentar límite práctico Windows. |
| **Drive externo** | Permitido; atención a permisos y expulsión a mitad de escritura. |
| **Permisos** | No exigir admin elevado para el camino feliz. |
| **Path redaction** | En logs, evidencia y exports: truncar nombres de usuario y homogeneizar prefijos. |
| **No hardcode** de home de usuario en código fuente — resolver en runtime o config. |
| **Evidencia pública** | No almacenar rutas privadas completas en artefactos que puedan compartirse sin revisión. |

---

## 15. Validation model

**D14.1 solo modela** estas validaciones; **no** las ejecuta:

1. **Raíz de layout** existe y es directorio.
2. **Carpetas esperadas** existen (o se crean en un gate posterior **explícito** — no en **D14.1**).
3. **Config** parseable JSON y pasa validador **`LauncherConfig`** + seguridad.
4. **Permisos** lectura en binarios; escritura en `logs/`, `evidence/`, `runtime/`, `support/` según rol.
5. **Puertos** numéricos válidos y en rango; hosts loopback-only por defecto.
6. **No secrets** en config (heurística + lista de claves prohibidas en validación futura).
7. **`mt5.enabled`**, **`actionTransport.enabled`**, **`allowTrading`** en estado **disabled** para el camino feliz actual.

---

## 16. Relationship with D14.2

**D14.2 — Packaging dry-run manifest** quedó especificado en **[`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md)** (contrato declarativo **docs-only**): secciones del manifiesto, artefactos fuente, mapeo a este layout **§3**, archivos requeridos/opcionales/excluidos, políticas, validaciones futuras, flags de seguridad y manejo de fallos — **sin** copiar archivos, **sin** JSON ejecutable fuera de docs, **sin** `.exe`.

**Siguiente recomendado en la cadena D14.x:** **D14.3** — decisión / prototipo de **wrapper** launcher local ([`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) §10).

---

## 17. Open decisions

- **Estrategia dashboard estático** (**D13.9.1**) — V1 vs V2 vs V3 vs V4.
- **AppData vs portable** como default de escritura para logs/evidence.
- **Días de retención** de `evidence/`.
- **Tamaño máximo** de rotación de `logs/`.
- **Comportamiento exacto** de backup de config (automático vs solo manual).
- **Formato** del bundle **`support/`** (zip vs directorio).
- **¿Introducir módulo TS puro** de layout (`mapazapp-launcher-layout-model.ts`) en **D14.1.1** — solo si el manifiesto o tests lo exigen; **D14.1** quedó **docs-only** por decisión de checkpoint.
- **¿Modelo TS del manifiesto (**D14.2.1**) o validador read-only (**D14.2.2**)?** — opcionales; ver [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) §18–§19.

---

## 18. Recommended next checkpoints

| ID | Contenido | Estado |
|----|-----------|--------|
| **D14.1** | **Layout model** (este doc) — **sin escrituras** a filesystem. | **Cerrado (docs-only)**. |
| **D14.2** | **Packaging dry-run manifest** — [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md); sin ejecutable; lista incluidos/excluidos. | **Cerrado (docs-only)**. |
| **D14.3** | **Decisión / prototipo wrapper** launcher local — solo tras gates y aprobación explícita. | **Siguiente recomendado**. |

**Opcional:**

- **D13.9.1** — Decisión de servido estático del dashboard si bloquea enumeración concreta de artefactos o implementación (**D14.2** §13).
- **D14.1.1** — Modelo TS puro de layout (sin writes) si la documentación sola genera **drift**.
- **D14.2.1** / **D14.2.2** — Modelo TS del manifiesto o validador dry-run read-only ([`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) §19).

---

## 19. Non-goals

**D14.1 no implementa** ni autoriza:

- Código nuevo (salvo decisión explícita fuera de este checkpoint).
- **Escrituras** a filesystem (`mkdir`, `writeFile`, copia de artefactos).
- **Executable**, **installer**, empaquetado real.
- **`spawn`**, **`child_process`**, **`taskkill`**, **`process.kill`** sobre terceros.
- **API start**, **dashboard start**, **supervisor run**, **`mapazapp:dev-start`**.
- **MT5**, **watcher**, **command files**.
- **`POST`**, **action endpoints**, **trading**.
- **DB**, **WebSocket live**, **IPC real** más allá de lo ya documentado para fases futuras.
- **Push** Git o publicación de binarios.
