# Mapazapp — TestEA optimization-safe exports (E5.5.0)

**Relacionado:** runbook campaña [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md); validación bundle [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md); política build [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md); EA [`../../mt5/experts/Mapazapp_TestEA/README.md`](../../mt5/experts/Mapazapp_TestEA/README.md).

---

## 1. Por qué era necesario

En **MT5 Strategy Tester → Optimization**, el terminal puede lanzar **varios agentes locales** y muchos **pases** en paralelo. Si todos los pases comparten el mismo `InpRunId` (o el mismo nombre de carpeta bajo `MQL5\Files\`), el EA sobrescribe los mismos archivos:

- `backtest_summary.json`
- `backtest_events.csv`
- `backtest_trades.csv`

Eso **contamina o destruye evidencia**: el último pase en escribir gana, y los bundles dejan de ser atribuibles a un conjunto de parámetros concreto.

**E5.5.0** introduce identidad de export **determinista y por campaña**, sin cambiar la lógica de trades virtuales ni añadir órdenes MT5.

**E5.5.0.1:** se corrigió un fallo de compilación en MetaEditor: la huella de parámetros para carpetas seguras en optimización dejó de usar `StringHash` (no disponible de forma fiable en este contexto MQL5) y pasó a un **hash estable local** (`MapazappStableStringHash`, estilo FNV-1a), conservando el comportamiento determinista de E5.5.0.

---

## 2. Riesgo de pisado (sin E5.5.0)

| Situación | Riesgo |
|-----------|--------|
| Optimización con `InpRunId` fijo | Colisiones de ruta → CSV/JSON mezclados o truncados |
| Múltiples agentes con misma carpeta | Condiciones de carrera de escritura al final del pase |
| Evidencia para campaña E5.5.x | Imposible mapear métricas a `parameter_set_id` + inputs reales |

---

## 3. Inputs nuevos (`Mapazapp_TestEA.mq5`)

| Input | Default recomendado en docs | Rol |
|-------|-----------------------------|-----|
| `InpCampaignId` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1` | Segmento de carpeta bajo `InpExportRoot` (sanitizado). |
| `InpAutoBuildRunIdFromParams` | `true` | Si `InpOptimizationSafeExports`: hoja de carpeta + `run_id` efectivo derivados de `parameter_set_id` + parámetros clave (FVG mínimo, RR, bias body, gate bias). |
| `InpOptimizationSafeExports` | `false` (compatibilidad) | `true`: estructura `…\<campaign_id>\<folder_leaf>\`; `false`: comportamiento histórico `…\<run_id>\`. |

**Nota:** con `InpOptimizationSafeExports = false`, el EA sigue usando solo `InpRunId` / auto-run como en builds anteriores.

---

## 4. Estructura de carpetas (cuando `InpOptimizationSafeExports = true`)

```text
MQL5\Files\<InpExportRoot>\<campaign_id>\<folder_leaf>\
  backtest_summary.json
  backtest_events.csv
  backtest_trades.csv
```

Ejemplo (ilustrativo):

```text
MQL5\Files\Mapazapp\TestEA\MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1\
```

- **Determinista:** mismos inputs MT5 → misma carpeta (apta para repetición y multi-agente con parámetros distintos).
- **Sin timestamp** en la hoja por defecto (no depende del reloj para el nombre).
- **Caracteres inválidos** eliminados vía sanitización (misma familia que el resto del EA).

`backtest_summary.json` incluye (entre otros): `campaign_id`, `optimization_safe_exports`, `effective_run_id`, `effective_export_folder_label`, `optimization_parameters` (eco de los cuatro parámetros de optimización citados en el runbook).

---

## 5. Cómo correr optimización completa con agentes locales

1. Compilar `Mapazapp_TestEA` en MetaEditor (fuera de alcance de este repo en CI).
2. En Strategy Tester, activar **Optimization** y configurar la matriz de parámetros deseada.
3. Poner **`InpOptimizationSafeExports = true`** y **`InpAutoBuildRunIdFromParams = true`** para sweeps estándar.
4. Ajustar **`InpCampaignId`** al id de campaña (p. ej. E5.5).
5. Usar **agentes locales** (aprovechar los cores de la máquina). Revisar en la documentación del terminal el límite de agentes y la RAM por agente.
6. **MQL5 Cloud** queda **fuera de alcance** en esta fase (no documentado como soporte oficial Mapazapp aquí).

**No** ejecutar este documento desde el repo: no hay automatización MT5 en E5.5.0.

---

## 6. Validación de cada bundle

Por cada carpeta hoja con los tres archivos:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<ruta-a-la-carpeta-hoja>" --json
```

La CLI acepta rutas anidadas (`…\TestEA\<campaign_id>\<folder_leaf>`). El importador usa `effective_run_id` si existe, de modo que el **nombre de la carpeta** no tiene que coincidir con el campo legacy `run_id` del JSON.

**Avisos útiles (core):**

- `parameter_set_id` con forma “outcome” y `campaign_id` vacío → se recomienda rellenar campaña.
- `optimization_safe_exports: false` con `parameter_set_id` estilo outcome → riesgo en optimización masiva.

---

## 7. Gobierno de Git / CSV grandes

- **No commitear** CSV enormes de optimización ni bundles completos de campaña en el árbol principal.
- Mantener en repo solo **muestras pequeñas** (como `samples/`) y evidencia **resumida** en markdown cuando aplique.

---

## 8. OnTester / métrica de ranking (aplazado)

Un `OnTester()` que devuelva p. ej. `expectancy_r` ajustada por penalizaciones (ambigüedad, drawdown) es **candidato E5.5.0b**: puede interactuar con el flujo del optimizador y merece diseño aparte **sin** tocar la simulación virtual. E5.5.0 **no** implementa `OnTester`.

---

## 9. Checklist rápido operador

- [ ] `InpOptimizationSafeExports` acorde al modo (single run vs optimización).
- [ ] `InpCampaignId` coherente con el runbook / informe de campaña.
- [ ] Validar **cada** carpeta hoja con `mapazapp:testea-export-validate`.
- [ ] No usar `Mapazapp_TestEA` fuera de `MQL_TESTER`.

---

## 10. Siguiente paso canónico

**E5.5.1** — ejecutar MT5 Optimization con agentes locales sobre una **matriz pequeña** de parámetros, recoger bundles bajo `campaign_id` distintos y adjuntar hashes / métricas agregadas en el informe de campaña (sin subir CSV masivos a Git).
