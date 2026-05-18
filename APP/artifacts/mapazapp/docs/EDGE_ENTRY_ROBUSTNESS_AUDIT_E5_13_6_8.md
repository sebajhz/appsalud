# Edge Entry Robustness Audit — E5.13.6.8

## Por qué existe E5.13.6.8

**E5.13.6.7** demostró que la variante **edge** domina el bundle benchmark en R total frente al outcome oficial (CE/50 %), pero **no** fue aprobada porque esa dominancia va acoplada a:

- distancia de riesgo ~2× vs CE/50 %;
- muchos rescates fill-model-sensitive (`expired_unfilled` → `win`);
- conversiones `ambiguous` → `win`;
- fills/cierres muy rápidos en ejemplos;
- casos edge `unresolved`;
- evidencia de **un solo bundle**.

**E5.13.6.8** añade un auditor **read-only** que estresa proxies de robustez operativa (buffer/spread, distancias pequeñas, velocidad, ratio de riesgo, transiciones) **sin** cambiar Mapazapp_TestEA.mq5, generación oficial, simulación EVOS ni entry oficial.

---

## Qué mide (proxies, no P/L exacto)

| Área | Métricas |
|------|----------|
| **Buffer / cost stress** | `effective_risk_points = risk + buffer`; `effective_reward = max(tp_dist - buffer, 0)`; `effective_rr`; pass/fail vs `--min-effective-rr` |
| **Small-distance fragility** | conteos por umbrales de `risk_points` y `tp_distance_points` |
| **Speed / same-bar realism** | wins con `bars_to_fill` / `bars_to_close` ≤ 1; rescates rápidos por bucket oficial |
| **Risk-ratio stress** | avg/median/p90 vs 50 %; buckets >1.25 … >3.0; wins por bucket de ratio |
| **Transition robustness** | buckets oficial→edge con avg effective RR, fail por buffer, y `fast_fill_close_count` (trades del bucket con `bars_to_fill ≤ 1` y `bars_to_close ≤ 1`; **≤ bucket count**) |
| **Unresolved edge** | distribución outcome oficial, risk, bars_to_fill |
| **25 / adaptive lens** | effective RR bajo buffers, fail counts, ambigüedad y delta R vs 50 % |

---

## Limitación buffer / spread / slippage

El export CSV incluye geometría edge (`entry`, `sl`, `tp`, `risk_points`) pero **no** path OHLC bar-a-bar suficiente para re-simular fills con spread/slippage exactos.

El auditor calcula un **proxy conservador**:

- BUY: slippage adverso empeora entry al alza y reduce reward (modelado vía buffer en risk/reward).
- SELL: análogo al bajo.

**No** es P/L exacto. **No** es gate de decisión. Si el proxy es inconcluso, el siguiente paso puede ser variantes EVOS buffered en MQL5 o evidencia operador adicional.

---

## CLI (read-only, sin MT5)

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-edge-robustness-audit -- \
  --bundle "<RunDir>" \
  --json
```

Opciones:

| Flag | Default | Descripción |
|------|---------|-------------|
| `--buffer-points` | `5,10,20,30,50` | Buffers en points (misma unidad que `risk_points`) |
| `--min-effective-rr` | `1.5` | Umbral pass para effective RR |
| `--max-examples` | `10` | Ejemplos por categoría |
| `--csv-output <path>` | — | CSV resumen (buffer, transiciones, risk buckets) |
| `--strict` | — | exit 1 si bundle falla |

Módulo core: `APP/lib/mapazapp-core/src/testea-entry-edge-robustness-audit.ts`  
CLI: `APP/scripts/src/mapazapp-testea-entry-edge-robustness-audit.ts`  
Script: `mapazapp:testea-entry-edge-robustness-audit`

---

## Próximo paso operador

Ejecutar el CLI sobre el bundle **E5_13_6_3**:

- Build: `MZP_TestEA_E5_13_6_3`
- Bundle: `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`

```bash
pnpm --filter @workspace/scripts mapazapp:testea-entry-edge-robustness-audit -- \
  --bundle "$RunDir" \
  --json \
  --max-examples 10
```

CSV local (no versionar): `*_DO_NOT_COMMIT.csv` si se usa `--csv-output`.

---

## Después de la evidencia

1. Documento de evidencia operador (estilo E5.13.6.7) con flags e interpretación.
2. O, si el proxy no basta: variantes EVOS buffered exactas en MQL5 (fuera de alcance de este checkpoint).

---

## Referencias

- Transition audit: [`ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md)
- Evidencia E5.13.6.7: [`ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md)
- Summary EVOS: [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md)

**No** aprueba edge, 25 %, adaptive ni live trading.

---

## E5.13.6.8.1 — fix `fast_fill_close_count`

**Bug corregido:** `transition_robustness.fast_fill_close_count` se incrementaba una vez por cada `--buffer-points`, inflando el conteo (~5× con buffers por defecto). Ahora se cuenta **una vez por trade del bucket**; invariante `fast_fill_close_count ≤ count`.
