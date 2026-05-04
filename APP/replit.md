# Mapazapp — Trading Guard Dashboard

## Workspace (ZIP / Cursor local)

- **pnpm workspace root:** `APP/` (run installs and scripts from `APP`).
- **This dashboard artifact:** `artifacts/mapazapp` (path from repo: `APP/artifacts/mapazapp`).
- **Planning docs (source of truth):** repo `00_START_HERE/` and `Mapazapp_Replit_Handoff_V1/`; mock handoff: `artifacts/mapazapp/docs/`.
- **`artifacts/mockup-sandbox`:** not the Mapazapp product. **`artifacts/api-server`:** Replit scaffold only; ignore for mock work.
- **Quick navigation:** `00_START_HERE/CURSOR_NAVIGATION_NOTE.md` (repo root, outside `APP`).

## Project Overview

A visual dashboard mock for **Mapazapp**, a trading intelligence and risk management system for prop firm traders. Built as a pure frontend mock — no real MT5, no backend, no live data.

## Architecture

- **Type:** React + TypeScript + Tailwind CSS v4 (Vite) — visual mock only
- **Routing:** Wouter (client-side, 12 routes)
- **UI Library:** Shadcn/ui + Lucide React icons
- **Data:** All static mock data in `src/mock/` — no API calls

## Artifact

- **ID:** `artifacts/mapazapp`
- **Preview path:** `/`
- **Workflow:** `artifacts/mapazapp: web`

## Pages (12 total)

| Route | Page |
|-------|------|
| `/` | Home / Daily State |
| `/zones` | Market / Zones (filterable) |
| `/zones/:id` | Zone Detail |
| `/risk` | Risk Guard |
| `/propfirm` | Prop Firm Guard |
| `/backtests` | Backtests table |
| `/backtests/:id` | Backtest Detail |
| `/journal` | Trade Journal |
| `/psychology` | Psychology / Control |
| `/alerts` | Alerts (with acknowledge interaction) |
| `/config` | Configuration (read-only) |
| `/bridge` | MT5 Bridge Health |

## Key Patterns

- **Simple/Technical toggle:** `ViewContext` in `Layout.tsx` — use `useViewMode()` hook in any page
- **All mock data:** `src/mock/types.ts` (interfaces) + one file per entity
- **Badge components:** `src/components/StatusBadge.tsx` — all state/severity badges in one place
- **Every page wraps with `<Layout title="..." supportsViewToggle>`**

## Mock Data Files

```
src/mock/
  types.ts          — All TypeScript interfaces
  bridgeStatus.ts   — BridgeStatus
  account.ts        — AccountSnapshot
  zones.ts          — Zone[] (8 zones)
  backtests.ts      — BacktestParameterSet[] (5 sets)
  journal.ts        — JournalTrade[] (10 trades)
  alerts.ts         — Alert[] (6 alerts)
  risk.ts           — RiskGuardState
  propfirm.ts       — PropFirmGuardState
  psychology.ts     — PsychologyEntry[] (5 sessions)
  config.ts         — AppConfig
```

## Documentation

- `README.md` — Project overview
- `docs/CURSOR_HANDOFF.md` — Full guide for continuing in Cursor (API endpoints, what to replace, architecture)
- `docs/MOCK_DATA_CONTRACT.md` — Every mock type with field documentation and future API endpoint
- `docs/DECISIONS.md` — Implementation decisions and rationale

## Design System

- **Background:** `hsl(224, 71%, 4%)` — deep navy
- **Status colors:** emerald (OK), amber (WARNING), red (CRITICAL/BLOCKED), blue (primary/info)
- **Fonts:** Inter (UI), JetBrains Mono (technical data)
- **Dark theme only** — no light mode

## What Is NOT Implemented

- Real MT5 Expert Advisor connection (BridgeEA)
- Real IFVG zone detection algorithm
- Real Risk Guard / Prop Firm Guard rule evaluation
- Real backend / API (Python or otherwise)
- Real database
- WebSocket live updates
- Authentication
