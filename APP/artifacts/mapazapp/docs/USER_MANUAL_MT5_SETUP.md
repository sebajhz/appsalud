# Mapazapp — User Manual: MT5 Setup

Manual orientado a **usuario humano**. Describe requisitos y flujo conceptual con MetaTrader 5 y Mapazapp en modo actual (**desarrollo por comandos**). No sustituye decisiones de implementación futuras (launcher, ingesta automática).

---

## 1. Qué es Mapazapp

Mapazapp es un **asistente** para análisis, backtesting, revisión de evidencia y disciplina operativa. Está pensado para ayudarte a entender posibles setups y riesgos con transparencia — **no** sustituye tu criterio ni ejecuta tu estrategia en cuenta real de forma automática en esta versión documentada.

---

## 2. Regla importante

> **Mapazapp no ejecuta operaciones reales automáticamente en esta versión.**

Cualquier señal o evidencia en pantalla es material de **revisión**, no una orden enviada al mercado por el sistema.

---

## 3. Requisitos

- **Windows** (entorno típico para MT5 y Mapazapp en este roadmap).
- **MetaTrader 5** instalado.
- **Cuenta demo** recomendada para pruebas (evitá usar cuenta real para experimentación inicial).
- **Símbolo** disponible en Market Watch del broker.
- Acceso a **históricos** descargables o exportables según tu flujo.
- Conocer la **carpeta de datos** de MT5 (útil para expertos y archivos en `MQL5/Files`).
- Repositorio Mapazapp clonado y **APP/** capaz de ejecutar `pnpm` (modo desarrollo).

---

## 4. Selección del símbolo

El foco inicial del proyecto suele centrarse en **XAUUSD** (oro), pero tu broker puede mostrar el mismo instrumento con **sufijos** distintos, por ejemplo:

- `XAUUSD`
- `XAUUSD.m`
- `XAUUSD.raw`
- `GOLD`
- otros definidos por el broker

Antes de comparar datos con Mapazapp, **confirmá el nombre exacto** en Market Watch y registrá esa convención cuando documentes históricos.

---

## 5. Timeframes iniciales

Timeframes razonables para empezar a alinear análisis y exportaciones:

- **M15**, **H1**, **H4**, **D1**

Podés ajustar según estrategia y disponibilidad de datos; lo importante es **no mezclar timeframes sin etiquetarlos** en archivos y notas de origen.

---

## 6. Históricos

La exportación exacta depende de tu terminal, broker y herramientas (MT5 nativo, scripts, BridgeEA/TestEA del proyecto, etc.). Principios que debés respetar:

- Exportar o guardar datos en **CSV** (u otro formato acordado cuando exista validador).
- Incluir columnas **OHLC** coherentes y **timestamp** confiable.
- **No editar** manualmente filas “a mano” sin dejar constancia; los datos dejan de ser reproducibles.
- **Documentar origen**: broker, símbolo tal como lo muestra MT5, timeframe, rango de fechas y zona horaria referida.

Los pasos de clic exactos en MT5 pueden variar; este manual **no** inventa un asistente gráfico que aún no esté implementado en Mapazapp.

---

## 7. Carpetas propuestas (propuesta, no implementación final)

Convención **orientativa** hasta fijar estructura en código:

- `data/mt5-history/` — históricos grandes, típicamente **gitignored**
- `fixtures/mt5/` o equivalente bajo tests — fixtures **pequeños** commiteables
- `docs/data-samples/` — muestras documentadas y anonimizadas si aplica

**C2:** En el repo hay muestras **sintéticas** de export BridgeEA/TestEA solo para tests (`APP/lib/mapazapp-core/tests/fixtures/mt5-export-samples/`). No incluyas ahí exports **reales** de tu cuenta ni históricos grandes; conservalos fuera de Git.

Ajustar rutas al layout real del repo antes de automatizar cualquier ingesta.

### Development-only local import validator (C3.1)

Para **desarrollo**, existe un validador local **solo lectura** que revisa un CSV por ruta de archivo y delega el parseo al importador del core (`importManualCandleDataset`). **No** guarda datos, **no** ejecuta trades, **no** es runtime MT5, **no** sustituye un launcher futuro y **no** reemplaza ingesta por API o dashboard.

Comando (pnpm ejecuta el script con cwd en **`APP/scripts`**; la ruta `--file` es relativa a ese directorio salvo que uses una ruta absoluta):

```bash
cd APP
pnpm --filter @workspace/scripts mapazapp:import-validate -- \
  --file ../lib/mapazapp-core/tests/fixtures/mt5/XAUUSD_M15_SYNTHETIC_VALID.csv \
  --symbol XAUUSD --timeframe M15
```

Opcional: `--json` para resumen estructurado en stdout. Los exports **reales** de MT5 e históricos grandes deben permanecer **fuera del repo** y no deben commitearse.

---

## 8. Cómo iniciar Mapazapp hoy (modo desarrollo)

Desde **`APP/`**:

**API (bash / macOS / Linux):**

```bash
cd APP
PORT=3001 pnpm --filter @workspace/api-server dev
```

**API (PowerShell en Windows):**

```powershell
cd APP
$env:PORT = "3001"
pnpm --filter @workspace/api-server dev
```

**Dashboard:**

```bash
cd APP
pnpm --filter @workspace/mapazapp dev
```

Esto es **modo desarrollo**. Requiere Node/pnpm y terminales separadas (o pestañas). **No** es todavía el launcher único para usuario final.

---

## 9. Cómo debería iniciar Mapazapp en modo usuario (futuro)

Objetivo de producto: un **`Mapazapp.exe`** o **`MapazappLauncher.exe`** que:

- valide configuración mínima y rutas;
- levante o compruebe API y dashboard;
- opcionalmente detecte MT5 y carpeta de bridge según política aprobada;
- abra el navegador en el dashboard;
- muestre errores claros si algo falta.

Ese launcher **no está implementado** en el alcance de este manual.

---

## 10. Validaciones que el usuario debería poder ver (futuro)

Cuando exista capa de runtime unificada, el usuario debería poder verificar:

- API activa / caída
- Dashboard activo
- MT5 detectado / no detectado (según diseño)
- Bridge / carpeta de export disponible
- Último candle o último dato importado
- Símbolo y timeframe activos
- Modo de runtime (mock, histórico, live-read-only, etc.)
- **Execution disabled** explícito
- Último error legible

Hoy parte de esto existe solo como **mocks** o no está cableado a un único visor.

---

## 11. Errores comunes

- MT5 no instalado o ruta del terminal incorrecta.
- Símbolo no encontrado (nombre o sufijo distinto al esperado).
- CSV con columnas o separadores incorrectos.
- Timeframe del archivo no coincide con el usado en el análisis.
- Mercado cerrado o datos stale mal interpretados.
- Carpeta **`MQL5/Files`** equivocada al buscar exportaciones de EA.
- Permisos de lectura/escritura en carpetas de datos.

---

## 12. Qué NO debe hacer el usuario

- **No** usar cuenta real para pruebas improvisadas.
- **No** asumir rentabilidad a partir de mocks o backtests sintéticos.
- **No** tratar señales como órdenes automáticas.
- **No** editar históricos sin trazabilidad.
- **No** intentar habilitar ejecución real fuera de una fase documentada y aprobada explícitamente.
