# Mapazapp — Replit Handoff V1

> Previous working name: QuerlyTrader Guard. Current project/product name: **Mapazapp**.

## Estructura del workspace (ZIP / repo local)

- **Raíz del repositorio:** carpeta `MAPAZAPP/` (o el nombre de la carpeta donde descomprimiste el ZIP).
- **Workspace pnpm (Node):** `APP/` — ahí están `package.json`, `pnpm-workspace.yaml` y `pnpm-lock.yaml`.
- **Dashboard mock Mapazapp (app real actual):** `APP/artifacts/mapazapp/` — código Vite + React; datos solo en `src/mock/`.
- **Planificación y handoff:** `00_START_HERE/` (entrada y manifiestos) y `Mapazapp_Replit_Handoff_V1/` (especificaciones por carpetas `01_` … `05_`).
- **Documentación del mock para Cursor:** `APP/artifacts/mapazapp/docs/`.
- **`APP/artifacts/mockup-sandbox/`:** artefacto sandbox / no es el producto Mapazapp.
- **`APP/artifacts/api-server/`:** andamiaje Replit (plantilla API); ignorar para el flujo del mock hasta nueva orden.
- **`old/`:** respaldo histórico; **no** usar como fuente de verdad.

Para orientación rápida en sesiones Cursor: **`00_START_HERE/CURSOR_NAVIGATION_NOTE.md`**.

## Objetivo del paquete

Este ZIP es para entregarle a Replit el contexto del proyecto y pedirle un primer mock visual del dashboard.

Replit debe construir solo una base visual/prototipo con datos simulados. No debe implementar lógica real de trading, no debe conectarse a MT5, no debe ejecutar operaciones y no debe inventar estrategia.

## Qué debe respetar Replit

1. El proyecto se llama **Mapazapp**.
2. El nombre anterior QuerlyTrader Guard solo queda como referencia histórica.
3. El mock debe usar datos simulados basados en los contratos definidos.
4. No se deben inventar campos nuevos.
5. No se deben inventar cálculos de trading.
6. No se deben inventar entradas ni señales.
7. El dashboard debe ser entendible para una persona no técnica, con detalle técnico opcional.

## Orden recomendado de lectura

Las rutas que empiezan por `Mapazapp_Replit_Handoff_V1/` son relativas a la **raíz del repo** (junto a `00_START_HERE` y `APP`).

0.1 `00_START_HERE/Mapazapp_Replit_Documentation_Requirements_V1.md` — Replit must document everything so Cursor can continue later.

0. `00_START_HERE/Mapazapp_System_Architecture_And_Replit_Scope_V1.md` — define que Replit solo hará el dashboard mock y que Mapazapp tiene MT5 EAs + backend local + dashboard.

1. `00_START_HERE/README_MAPAZAPP_REPLIT_HANDOFF_V1.md` (este archivo)
2. `Mapazapp_Replit_Handoff_V1/02_REPLIT_MOCK_SCOPE/Mapazapp_Replit_Dashboard_Mock_Spec_V1.md`
3. `Mapazapp_Replit_Handoff_V1/02_REPLIT_MOCK_SCOPE/Mapazapp_Replit_Starter_Spec_V1.md`
4. `Mapazapp_Replit_Handoff_V1/03_MT5_BRIDGE_AND_DATA_CONTRACT/Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md`
5. `Mapazapp_Replit_Handoff_V1/01_PRODUCT_CONTEXT/Mapazapp_V1.md` — visión y alcance V1 del producto (en manifiestos antiguos aparecía como nombre provisional `Mapazapp_Guard_V1.md`, archivo que **no** existe en el paquete)

## Qué debe entregar Replit

- React + TypeScript + Tailwind dashboard mock.
- Mock data en archivos separados.
- Pantallas principales: inicio, mercado/zonas, riesgo, fondeo, backtests, journal, alertas, configuración y MT5 Bridge Health.
- README explicando cómo correr el prototipo.
- Sin lógica real de trading.
- Sin integración real con MT5.
- Sin ejecución de órdenes.

## Regla final

Si un dato no está en los documentos del paquete, Replit no debe inventarlo. Debe dejarlo como pendiente o mock explícito.
