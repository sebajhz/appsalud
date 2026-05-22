# Robustness Re-cut Date Split Decision — E5.24.1.2

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.24.1.2 — decisión PM: re-corte de splits IS/OOS/WF |
| **Tipo** | PM governance decision — **sin ejecución** |
| **Baseline Git** | `2d6351b` o posterior — `docs(mapazapp): E5.24.1.1 document SET001 observed trade range` |
| **Decisión previa** | [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md) — Opción A vs B |
| **Decisión PM** | **Opción B — Re-cut robustness campaign** |
| **Siguiente** | E5.24.1.3 — tabla propuesta de splits de fechas (candidatos `proposed`) |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Baseline Git

| Campo | Valor |
|-------|-------|
| **Checkpoint previo** | `2d6351b` — `docs(mapazapp): E5.24.1.1 document SET001 observed trade range` |
| **Cadena** | E5.24 → E5.24.1 → E5.24.1.1 → **E5.24.1.2** |

---

## 2. Decisión PM

| Campo | Valor |
|-------|-------|
| **Opción elegida** | **B — Re-cut robustness campaign** |
| **Opción descartada** | A — OOS estricto post-SET001 (después de 2026-05-08) |
| **Autoridad** | PM |
| **Registrado por** | Checkpoint docs E5.24.1.2 (sin ejecución ST) |

---

## 3. Motivo de la decisión

| Factor | Detalle |
|--------|---------|
| Rango observado SET001 | Trades CSV (`entry_time` UTC): **2025-01-02T03:00:00Z** → **2026-05-08T23:30:00Z** ([`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md)) |
| From/To MT5 ST | Siguen **`needs_operator_confirmation`** — summary sin `tester_from`/`tester_to` claros |
| OOS estricto post-SET001 | Tramo posterior a 2026-05-08 puede ser **demasiado corto** salvo historia MT5 extendida |
| Robustez útil | OOS/WF necesitan segmentos con **suficientes trades** para lectura estadística |
| Rol de SET001 | Permanece **benchmark/referencia global** (+315R, 1697 trades) — **no** como único ancla IS para OOS |

---

## 4. Cambio de interpretación de campaña

### Antes (plan E5.24 original + E5.24.1)

| Elemento | Interpretación |
|----------|----------------|
| SET001 | Ancla `IS_BASELINE` para toda la campaña |
| SET002 | `OOS_VALIDATION` estrictamente **después** del tramo cubierto por SET001 |
| WF01–03 | Forward cronológico tras ancla SET001 / post-OOS |

### Después (E5.24.1.2 — Opción B)

| Elemento | Interpretación |
|----------|----------------|
| SET001 | **Benchmark/referencia global** — corrida completa documentada; conjunto A matriz |
| SET002 | **Re-corte** — validación OOS (u OOS segment) **dentro** del histórico disponible; fechas exactas **pendientes** |
| SET003_WF01 – SET005_WF03 | **Re-corte** — ventanas WF IS/forward **dentro** del mismo universo temporal; fechas **pendientes** |
| Ancla IS única | **Ya no** — SET001 no es el único IS anchor para definir OOS/WF |

Actualizar gobernanza en [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md) y [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md) al proponer fechas (E5.24.1.3).

---

## 5. Nueva estructura planificada

| Campo | Valor |
|-------|-------|
| **`campaign_id`** | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` *(sin cambio)* |
| **`profile_id`** | `XAUUSD_M15_Profile_V1` *(sin cambio)* |
| **`ea_build` objetivo** | `MZP_TestEA_E5_18` |
| **Parámetros** | Oficiales SET001 (50 % / CE, RR2) — **sin optimizar** en OOS/forward |

### Bundles

| ID | Rol planificado | Estado fechas |
|----|-----------------|---------------|
| **SET001** | Benchmark/referencia global — ya documentado E5.22 / E5.24.1.1 | Observado trades UTC; ST From/To pendiente |
| **SET002** | Re-corte `OOS_VALIDATION` (u segmento OOS dentro del histórico) | **Pendiente** — E5.24.1.3 propone candidatos |
| **SET003_WF01** | Re-corte `WALK_FORWARD_WINDOW` WF01 | **Pendiente** |
| **SET004_WF02** | Re-corte `WALK_FORWARD_WINDOW` WF02 | **Pendiente** |
| **SET005_WF03** | Re-corte `WALK_FORWARD_WINDOW` WF03 | **Pendiente** |

**Universo temporal de referencia (observado):** aprox. **2025-01-02** → **2026-05-08** (trades SET001). Los splits finales deben caber en el histórico MT5 disponible — **no inventar** fechas finales en E5.24.1.2.

---

## 6. Política de splits de fechas (re-corte)

| # | Restricción |
|---|-------------|
| 1 | Usar el **rango histórico observado** de SET001 como referencia del universo disponible |
| 2 | Tramos **IS y OOS no se solapan** dentro del diseño re-cortado |
| 3 | **OOS no se optimiza** — mismos parámetros oficiales que SET001 |
| 4 | Ventanas **WF cronológicas** (WF01 → WF02 → WF03) |
| 5 | Cada ventana **forward reportada por separado** ([`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)) |
| 6 | Ventanas **fail/invalid visibles** — sin cherry-pick |
| 7 | **From/To MT5 exactos** confirmados por PM/operador antes de E5.24.2+ |
| 8 | **No inventar fechas finales** en este checkpoint — solo política y decisión PM |

**Estado global campaña:** `governance_status`: `recut_split_pending_proposed_dates` (hasta E5.24.1.3 + confirmación operador).

---

## 7. Siguiente checkpoint recomendado

### E5.24.1.3 — Proposed Date Split Table

Debe entregar tabla con rangos **candidatos** (`proposed`) para:

| Bundle / ventana | Contenido propuesto |
|------------------|---------------------|
| SET002 re-corte OOS | `forward_or_oos_start` / `forward_or_oos_end` (y IS de referencia si aplica al diseño) |
| WF01 | `is_start`–`is_end` + forward |
| WF02 | IS + forward |
| WF03 | IS + forward |

Cada fila: `status` = `proposed` hasta confirmación PM/operador en `99_notes/DATE_RANGES_CONFIRMED.md`.

**Después de confirmación:** E5.24.2 — ejecución SET002 OOS en Strategy Tester.

---

## 8. Gobernanza

| Acción | Estado en E5.24.1.2 |
|--------|----------------------|
| MQL5 / TypeScript | **No** |
| MT5 / ST / optimizador | **No** |
| Live / gates | **No** |
| Cambio entry / TP | **No** |
| Edge / 25 / adaptive approval | **No** |
| Telegram / dashboard / email / push | **No** |
| Commitear `_local_*` | **No** |
| Ejecutar campaña | **No** |

---

## Referencias

- [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md)
- [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md)
- [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md)
- [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md)
- [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
