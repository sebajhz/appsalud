# Mapazapp — Nota de navegación para Cursor

> Nombre del producto: **Mapazapp**. Nombre histórico de trabajo: **QuerlyTrader Guard**.

Este archivo es el punto de entrada rápido para sesiones futuras en Cursor. **No sustituye** los documentos de handoff; solo indica dónde mirar primero.

**Before implementing strategy, MT5 bridge, scanner, backtesting or risk calculations, read the Symbol Precision / Tick / Pip Normalization addendum:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`.

**Before implementing the strategy engine, TestEA, scanner or risk-aware trade-ready logic, read Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md:** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1.md`.

**Before starting a new implementation checkpoint, read** `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`.

---

## Qué es fuente de verdad hoy

| Ámbito | Ubicación |
|--------|-----------|
| Código del dashboard mock (Replit) | `APP/artifacts/mapazapp/` |
| Planificación y contratos de producto | `00_START_HERE/` y `Mapazapp_Replit_Handoff_V1/` |
| Documentación del mock generada para Cursor | `APP/artifacts/mapazapp/docs/` (`CURSOR_HANDOFF.md`, `MOCK_DATA_CONTRACT.md`, `DECISIONS.md`) |

- **`old/`** y **ZIP anidados** dentro del workspace: copias de respaldo o histórico. **No** usar como fuente de verdad salvo comparación explícita que pida el usuario.
- **`APP/`** es la **raíz del workspace pnpm** (instalar y ejecutar scripts desde ahí).

---

## Carpetas importantes

- `00_START_HERE/` — README de handoff, arquitectura/alcance Replit, requisitos de documentación, manifiestos.
- `Mapazapp_Replit_Handoff_V1/` — paquete numerado de especificaciones (mock, bridge, estrategia/research de referencia).
- `APP/artifacts/mapazapp/` — aplicación Vite + React del mock Mapazapp.

---

## Ignorar por ahora (no borrar)

- `APP/artifacts/api-server/` — Express del workspace; **checkpoint 11** añade API HTTP **mock read-only** en `/api/mapazapp/*` (sin MT5/DB/WebSocket). El dashboard sigue usando mocks in-process salvo integración explícita futura.
- `APP/artifacts/mockup-sandbox/` — artefacto sandbox / UI genérica; **no** es el producto Mapazapp.
- `APP/lib/`, `APP/scripts/`, `APP/attached_assets/` — estructura del workspace Replit; el mock del dashboard **no** depende de ello para ejecutarse.
- `old/` — backup; no alinear ni implementar desde ahí por defecto.

---

## Orden de lectura recomendado (rápido)

1. `00_START_HERE/README_MAPAZAPP_REPLIT_HANDOFF_V1.md`
2. `00_START_HERE/Mapazapp_System_Architecture_And_Replit_Scope_V1.md`
3. `Mapazapp_Replit_Handoff_V1/00_START_HERE/README_REPLIT_HANDOFF_V1.md`
4. `Mapazapp_Replit_Handoff_V1/02_REPLIT_MOCK_SCOPE/Mapazapp_Replit_Dashboard_Mock_Spec_V1.md`
5. `APP/artifacts/mapazapp/README.md` y `APP/artifacts/mapazapp/docs/CURSOR_HANDOFF.md`

Las rutas bajo `Mapazapp_Replit_Handoff_V1/...` son relativas a la carpeta **`Mapazapp_Replit_Handoff_V1`** en la raíz del repo.

---

## Reglas para implementación en Cursor

- La estrategia, arquitectura y restricciones están en los **Markdown** aprobados; Cursor implementa solo lo **explícitamente** pedido y alineado con esos docs.
- **No** modificar código fuente (`APP/artifacts/mapazapp/src/`, etc.) salvo que el usuario lo solicite de forma explícita tras aprobar alcance.
- Fase actual del mock Replit: **solo datos mock** en `src/mock/`; sin MT5 real, sin backend conectado, sin WebSockets, sin ejecución de órdenes, sin motor de backtest real.

---

## Validación local del dashboard

Desde la raíz del workspace pnpm:

```bash
cd APP
pnpm install
pnpm --filter @workspace/mapazapp dev
```

El proyecto exige **pnpm** (el `preinstall` de la raíz `APP` rechaza npm/yarn).
