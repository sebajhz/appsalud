# Mapazapp — Decisión de almacenamiento / settings MT5 (D10.5)

**Checkpoint D10.5 — solo documentación.** Define **dónde y cómo** vivirá la configuración MT5/bridge **futura** sin implementar persistencia real en esta fase.

**Relacionado:** [`MT5_DETECTION_GATE_AUDIT_D10.md`](./MT5_DETECTION_GATE_AUDIT_D10.md), [`MT5_DATA_INTEGRATION.md`](./MT5_DATA_INTEGRATION.md), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md) (D2), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`MT5_OPEN_ACTION_DESIGN_D10.md`](./MT5_OPEN_ACTION_DESIGN_D10.md) (D10.2), código **`mapazapp-mt5-config-model.ts`** (D10.1), **`mapazapp-mt5-runtime-status.ts`** (D10.3), **`mapazapp-mt5-bridge-readiness.ts`** (D10.6).

---

## 1. Objetivo

- Fijar una política clara de **origen de verdad** para rutas y flags MT5 **antes** de launcher productivo, DB o UI de edición.
- Mantener el repo y el dashboard **libres de secretos y rutas personales** persistentes.

---

## 2. Qué configuración MT5 se necesita (conceptual)

Alineado a `Mt5Config` (D10.1) y al esquema `mt5` / `bridge` de D2:

| Área | Campos conceptuales | Uso |
|------|---------------------|-----|
| Postura | `enabled`, `allowedReadOnly` / política read-only bridge | Declarar intención sin ejecutar |
| Rutas | `terminalPath`, `dataFolder`, `mql5FilesFolder`, `bridgeFolder` | Solo con consentimiento explícito del operador en futuro launcher |
| Seguridad | `allowLaunch`, `allowCommandFiles` | Deben permanecer **false** en producto hasta gates explícitos |
| Bridge | carpeta de export, lista opcional de archivos esperados | Validación read-only futura; sin watcher en D10.x |

---

## 3. Qué NO debe guardarse todavía

- Valores reales de rutas del usuario obtenidos por **detección automática** del SO (registro, escaneo de disco).
- Credenciales, logins, tokens de cuenta/broker.
- Snapshots de export CSV/JSON **operativos** o grandes históricos.
- Estado **live** de mercado, frescura de archivos con polling, ni PID de procesos MT5.
- Cualquier flag que habilite **lanzamiento** de terminal o **archivos de comando** hacia MT5.

---

## 4. Dónde NO guardarla

| Ubicación | Motivo |
|-----------|--------|
| **Repositorio Git** | Riesgo de commitear rutas personales y datos; viola gobernanza C1/C2 |
| **Documentación (`docs/`)** | Solo ejemplos sanitizados; nunca config activa |
| **Hardcode en código fuente** | Imposible multi-usuario; filtra convenciones de instalación |
| **`localStorage` / navegador** | Superficie amplia, CSRF/sync; rutas no deben vivir en el dashboard como persistencia |
| **Código fuente del dashboard** | La UI es cliente; no es depositario de paths locales del operador |

---

## 5. Opciones de almacenamiento (futuro)

| ID | Opción | Rol |
|----|--------|-----|
| **A** | **Variables de entorno** | Overrides puntuales en dev/CI (`PORT`, host API, etc.); pueden complementar pero **no** sustituyen lista compleja de rutas MT5 |
| **B** | **Archivo de config del launcher (futuro)** | Origen de verdad **local** cargado solo por proceso launcher; formato JSON/YAML/TOML por definir **fuera** de este checkpoint |
| **C** | **Config de usuario local fuera del repo** | Directorio tipo app-data del usuario (ej. `%AppData%` en Windows bajo nombre de producto) — **consentimiento explícito**, backups y migraciones futuras |
| **D** | **DB futura** | Opcional para equipos multi-operador o sync cloud; **no** requisito del MVP descrito en gobernanza actual |
| **E** | **Settings del dashboard (futuro)** | Solo **views** o preferencias UI no sensibles; rutas MT5 **no** como persistencia primaria |

---

## 6. Recomendación para la fase actual

1. **Modelo TS puro** (`Mt5Config`, validador D10.1, readiness bridge D10.6) + **defaults seguros** en memoria.
2. **Tests** con **deps inyectadas** (`pathExists`, `listFiles`, etc.) — sin filesystem real obligatorio en producción.
3. **Sin persistencia real** hasta existir launcher + threat model + formato de archivo aprobado (D9.x / D8.x).
4. Documentar en manual de usuario las rutas como **entrada del operador** (copiar/pegar o picker futuro launcher-side), no como algo que Mapazapp “adivina” silenciosamente.

---

## 7. Recomendación para futuro launcher

- **Archivo de configuración local fuera del repo** (opciones **B** + **C**): una sola fuente de verdad legible por el launcher, **no** versionada, con plantilla documentada.
- Variables de entorno solo como **override** explícito para devops o CI.

---

## 8. Datos sensibles

- Rutas absolutas bajo perfiles de usuario (`[users]/[profile]`, datos de terminal, `MQL5/Files`).
- Nombres de servidor/cuenta y cualquier metadato broker en exports.
- Contenido de CSV/JSON de bridge que incorpore estado de cuenta.

**Regla:** JSON/logs/`safeSummary` sin fragmentos literales prohibidos (ver D10.0); usar redacción tipo `sanitizeMt5PathForDisplay` / `sanitizeBridgePathForDisplay`.

---

## 9. Saneamiento de paths

- Normalizar separadores solo para **presentación interna**, nunca eco crudo al cliente sin redactar.
- Rechazar en política productiva merges de config que traigan subcadenas operativas falsas (“connected”, “ready to trade”).
- Los validadores **no** afirman conectividad; solo forma, flags y (si hay deps) existencia read-only.

---

## 10. Relación con launcher futuro

- El launcher **carga** la config local (opción B/C), valida con D10.1 + D10.6, y opcionalmente expone un snapshot **sanitizado** al dashboard/API.
- El navegador **no** persiste rutas MT5 como fuente de verdad.

---

## 11. Relación con runtime status (D10.3)

- `createMt5RuntimeStatusFromConfig` consume solo el modelo declarativo; cualquier enriquecimiento con lectura de disco será **launcher-side** y opcional.
- Estados como `detected` siguen significando **forma/existencia**, no mercado live.

---

## 12. Relación con panel MT5 config read-only (D10.4)

- El panel muestra **mock / copy** estático; cuando en el futuro muestre datos reales, deben provenir de API/launcher con paths **ya redactados** y mismos disclaimers (`declarative_config_only`, etc.).
- **No** edición persistida en dashboard en esta gobernanza.

---

## 13. Non-goals (D10.5)

- Implementar escritura de archivo de config, migraciones, ni encryptación.
- Implementar DB, WebSocket, polling o watcher.
- Implementar `POST`, IPC de acciones o `mapazapp:dev-start` como persistencia.
- Lanzar MT5 o leer carpetas reales por defecto desde tests productivos sin deps.

---

## 14. Conclusión

**No hay bloqueo para D10.6:** la decisión es explícitamente **modelo en memoria + mocks/deps en tests** ahora; **persistencia local fuera del repo** en launcher futuro. Esta decisión **no** exige I/O real en el checkpoint D10.6.
