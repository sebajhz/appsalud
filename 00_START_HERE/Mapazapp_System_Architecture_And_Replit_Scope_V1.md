# Mapazapp — System Architecture & Replit Scope V1

## Objetivo

Dejar explícito para Replit qué parte del sistema debe construir ahora y qué partes NO debe construir.

Mapazapp no es una sola app gigante. Es un sistema compuesto por varias piezas.

---

# 1. Arquitectura general

```text
Mapazapp
├── 1) MT5 Expert Advisors
│   ├── Mapazapp_BridgeEA
│   │   └── Exporta datos reales desde MT5
│   └── Mapazapp_IFVG_TestEA
│       └── Sirve para backtesting en MT5 Strategy Tester
│
├── 2) App externa local
│   ├── Python/backend
│   ├── SQLite
│   ├── Importa datos del BridgeEA
│   ├── Importa resultados de backtest
│   ├── Risk Guard
│   ├── Prop Firm Guard
│   ├── Journal
│   └── Scanner live
│
└── 3) Dashboard visual
    ├── React/web UI
    ├── Muestra mercado, zonas, riesgo, backtests, journal y alertas
    └── Primero se mockea en Replit
```

---

## 1.1 Ubicación en el workspace exportado (Cursor / ZIP local)

- **Mock del dashboard:** `APP/artifacts/mapazapp/` (React + Vite; datos en `src/mock/`).
- **Raíz del workspace Node/pnpm:** `APP/` (no la raíz del ZIP completa).
- **Documentación de planificación:** `00_START_HERE/` y `Mapazapp_Replit_Handoff_V1/`.
- **`APP/artifacts/mockup-sandbox/`:** no es el dashboard Mapazapp.
- **`APP/artifacts/api-server/`:** plantilla de API del workspace Replit; fuera de alcance del mock hasta nueva fase.
- **`old/`:** respaldo histórico; no usar como fuente de verdad.

Guía breve para sesiones Cursor: `00_START_HERE/CURSOR_NAVIGATION_NOTE.md`.

---

# 2. Qué debe hacer Replit ahora

Replit debe construir solamente:

```text
Mapazapp Dashboard Mock
```

Es decir:

- Dashboard visual.
- Datos simulados.
- Pantallas principales.
- Componentes reutilizables.
- Estructura preparada para conectar APIs después.
- Vista simple y vista técnica.

---

# 3. Qué NO debe hacer Replit

Replit NO debe:

- Crear el EA de MT5.
- Conectarse a MT5 real.
- Crear lógica real de trading.
- Crear backtesting real.
- Ejecutar operaciones.
- Calcular señales reales.
- Inventar fórmulas.
- Inventar parámetros.
- Inventar campos fuera de los contratos.
- Crear un backend real obligatorio en V1.

---

# 4. Cómo debe preparar el dashboard

Replit debe usar mock data con la misma forma que después vendrá del backend/API.

Ejemplo V1 con mocks:

```text
src/mock/bridgeStatus.ts
src/mock/account.ts
src/mock/zones.ts
src/mock/backtests.ts
src/mock/journal.ts
src/mock/alerts.ts
src/mock/config.ts
```

Después, Cursor reemplazará esos mocks por llamadas reales:

```text
GET /api/bridge/status
GET /api/account
GET /api/zones
GET /api/backtests
GET /api/journal
GET /api/alerts
GET /api/config
```

---

# 5. Orden de desarrollo previsto

```text
Fase 1 — Replit
Dashboard mock visual de Mapazapp.

Fase 2 — Cursor
Convertir mock en app real con estructura frontend/backend.

Fase 3 — MT5 BridgeEA
EA que exporta datos reales desde MT5.

Fase 4 — Python backend
Importa datos del BridgeEA, guarda SQLite y sirve API al dashboard.

Fase 5 — MT5 TestEA
EA para backtesting IFVG en MT5 Strategy Tester.

Fase 6 — Importador de backtests
La app lee resultados y aprueba parameter sets.

Fase 7 — Scanner live
Usa datos reales y parameter sets aprobados.

Fase 8 — Ejecución asistida
Solo después de validar estrategia, riesgo y forward test.
```

---

# 6. Regla para nombres

El proyecto se llama:

```text
Mapazapp
```

Nombre anterior solo como referencia histórica:

```text
QuerlyTrader Guard
```

Replit debe usar **Mapazapp** en UI, README y código.

---

# 7. Regla final para Replit

Replit construye experiencia visual y estructura frontend.

No construye el motor real.

El mock debe ser fácil de reemplazar luego por APIs reales sin tirar el trabajo.
