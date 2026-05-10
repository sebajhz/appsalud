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
