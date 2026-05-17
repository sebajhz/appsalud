# Premium / Discount — Evidencia smoke E5.13.1 (operador)

## Alcance

- **Checkpoint:** E5.13.1 — humo técnico post–**E5.13** (export Premium/Discount V1).
- **Contrato export:** [`PREMIUM_DISCOUNT_EXPORT_E5_13.md`](./PREMIUM_DISCOUNT_EXPORT_E5_13.md).
- **Implementación repo (referencia):** commit `c44b9dd` o posterior — `feat(mapazapp): E5.13 export premium discount context`.

Este documento registra **solo** validación de export / CLI y lectura de agregados del `backtest_summary.json`; **no** sustituye análisis multi-bundle ni decisiones de producto.

---

## Validación CLI (operador)

| Campo | Valor |
|-------|--------|
| `ea_build` | `MZP_TestEA_E5_13` |
| `ok` | `true` |
| `status` | `warning` |
| `errors` | `[]` |
| Warnings | únicamente `BUNDLE_EVENTS_LARGE` |
| `testEaStatus` | `valid` |
| `executionEnabled` | `false` |
| `readOnly` | `true` |
| `trade_count` | 1697 |
| Bundle (carpeta) | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |

**Veredicto técnico:** **PASS** (export coherente; warning esperado por tamaño de eventos).

---

## Summary — flags Premium/Discount

| Campo | Valor |
|-------|--------|
| `has_premium_discount_v1_logic` | `true` |
| `premium_discount_enabled` | `true` |
| `pd_valid_range_count` | 1697 |
| `pd_missing_range_count` | 0 |
| `pd_entry_premium_count` | 548 |
| `pd_entry_discount_count` | 406 |
| `pd_entry_equilibrium_count` | 399 |
| `pd_entry_outside_range_count` | 344 |
| `pd_entry_zone_valid_for_direction_count` | 358 |
| `pd_entry_zone_conflict_count` | 596 |
| `pd_entry_too_deep_count` | 153 |
| `pd_entry_too_shallow_count` | 0 |
| `average_premium_discount_score` | 6.368886 |
| `average_pd_position_pct` | 54.353425 |
| `average_pd_range_size_points` | 2045.327048 |
| `average_entry_quality_score` | 52.812021 |
| `score_a_count` | 0 |
| `score_b_count` | 1 |
| `score_c_count` | 1053 |
| `score_rejected_count` | 643 |

### Distribución de grado Premium/Discount (conteo por trade)

| Grado | Count |
|-------|-------|
| Weak | 820 |
| C | 399 |
| A | 325 |
| None | 120 |
| B | 33 |

### Zonas de entrada (`pd_entry_zone` agregadas en contadores summary)

- **premium:** 548  
- **discount:** 406  
- **equilibrium:** 399  
- **unknown:** 344 (incluye casos fuera de rango / rango inválido según definición V1 en el doc de exporte)

---

## Por outcome (promedios agregados operador)

> Nota: métricas de cohorte por outcome; **no** implican edge ni tuning automático.

| Outcome | Count | Avg entry quality | Avg PD score | Avg `pd_position_pct` | ValidZone | ConflictZone | Premium | Discount | Equilibrium | OutsideRange | TooDeep | TooShallow |
|---------|------:|------------------:|-------------:|----------------------:|----------:|-------------:|--------:|---------:|------------:|-------------:|--------:|-------------:|
| ambiguous | 436 | 51.9335 | 6.7339 | 52.3554 | 103 | 140 | 131 | 112 | 116 | 77 | 41 | 0 |
| expired_open | 1 | 53 | 3 | −76.61 | 0 | 0 | — | — | — | — | 0 | 0 |
| expired_unfilled | 342 | 49.0409 | 5.9181 | 52.3528 | 61 | 135 | 113 | 83 | 69 | 77 | 32 | 0 |
| loss | 507 | 54.5227 | 6.3333 | 55.6295 | 105 | 181 | 161 | 125 | 117 | 104 | 39 | 0 |
| win | 411 | 54.7713 | 6.4088 | 56.8825 | 89 | 140 | 143 | 86 | 97 | 85 | 41 | 0 |

---

## Frecuencia de tokens en `premium_discount_reasons` (operador)

Orden aproximado por frecuencia (subset reportado):

- `pd_valid_range` — 1697  
- `pd_entry_premium` — 548  
- `pd_entry_discount` — 406  
- `pd_entry_equilibrium` — 399  
- `pd_zone_conflict_long_in_premium` — 384  
- `pd_entry_outside_range` — 344  
- `pd_zone_conflict_short_in_discount` — 212  
- `pd_zone_valid_for_long` — 194  
- `pd_zone_valid_for_short` — 164  
- `pd_entry_too_deep` — 153  

---

## Interpretación (solo lectura de datos)

1. **Export estable:** en este bundle, **siempre** hay rango PD válido (`pd_missing_range_count = 0`); el pipeline E5.13 escribe y agrega correctamente a escala de campaña.
2. **Separación wins vs losses por PD score es débil en V1:** medias de `premium_discount_score` muy cercanas entre win (6.41), loss (6.33) y ambiguous (6.73); `expired_unfilled` muestra la **media más baja** (5.92), alineado con la hipótesis de que parte del problema de no-fill puede relacionarse con **zona / profundidad** de entrada, no solo con MSS/CHoCH temporal.
3. **Muchos conflictos y fuera de rango:** `pd_entry_zone_conflict_count` (596) y `pd_entry_outside_range_count` (344) son altos; `pd_entry_too_deep_count` (153) aporta diagnóstico adicional sin actuar como compuerta.

---

## Decisión de ingeniería (E5.13.1)

- **PASS** técnico del smoke.
- Mantener Premium/Discount **solo observación**; **sin** compuerta dura, **sin** aprobación live, **sin** cambiar umbrales de Entry Quality, **sin** fabricar A/B, **sin** calibrar solo desde este bundle.
- **Siguiente checkpoint:** **E5.13.3** — smoke Entry Fill Feasibility post–implementación **E5.13.2** — [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md).

---

## Referencias cruzadas

- Roadmap humanización (cadena E5.13.2–E5.20): [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md)  
- Plan maestro V2: [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)  
- Handoff: [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
