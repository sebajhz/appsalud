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

**E5.5.0.2:** en una prueba manual de export seguro (un solo pase del Strategy Tester), la carpeta efectiva bajo `MQL5\Files\…\<campaign>\<folder_leaf>\` existía pero **no aparecían** `backtest_summary.json`, `backtest_events.csv` ni `backtest_trades.csv`. Esta revisión endurece la **creación recursiva de carpetas** (`EnsureRelativeFolderExists`), el **commit atómico** (`FileMove` con `FILE_REWRITE`), la **re-creación del directorio padre** antes de cada `FileOpen`, y añade **diagnósticos** (`GetLastError`, rutas en `OnInit`, mensajes si falla la escritura final).

**E5.5.0.3:** los diagnósticos de E5.5.0.2 aislaron el fallo: **`FileOpen` sobre `*.tmp` con error 5003** — en MQL5, **`FILE_REWRITE` no es válido en `FileOpen`** (solo tiene sentido en `FileMove`/`FileCopy` donde el runtime lo acepta). E5.5.0.3 usa **flags `FileOpen` conservadores** (`FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_SHARE_READ`) para el temporal y el destino en modo **respaldo directo**, mantiene el flujo **tmp + `FileMove(..., FILE_REWRITE)`** cuando funciona, y si el camino atómico falla intenta **escritura directa** al fichero final con logs explícitos (sin éxito silencioso si ambos caminos fallan).

**E5.5.0.4:** los valores por defecto del EA y los **ficheros `.set`** bajo `Mapazapp_TestEA/presets/` alinean el flujo **E5.5 / E5.5.1** (campaña XAUUSD, exports optimization-safe, ids de estrategia y parameter set) para **reducir errores de configuración** del operador; ver README del EA.

**E5.5.0.5:** en pruebas manuales con **nombres largos** de campaña y parameter set como **segmentos de ruta física**, los **agentes del Strategy Tester** a veces creaban la carpeta pero **no escribían** los tres ficheros de export (fallo atribuible a **longitud de ruta** en el entorno del tester). A partir de **E5.5.0.5**, con `InpOptimizationSafeExports=true`, el EA usa **`InpExportCampaignFolder`** y **`InpExportParameterFolder`** solo para la **jerarquía de carpetas bajo `MQL5\Files\`**; en `backtest_summary.json` se mantienen los metadatos completos `campaign_id` (= `InpCampaignId`), `parameter_set_id`, `strategy_id`, y se añaden `export_campaign_folder`, `export_parameter_folder`, `effective_export_folder_label`, `effective_run_id` (campaña corta + `__` + hoja corta).

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
| `InpCampaignId` | `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1` | Metadato `campaign_id` en JSON (sanitizado); **no** define el segmento de carpeta física cuando `InpOptimizationSafeExports=true` (E5.5.0.5). |
| `InpExportCampaignFolder` | `E55` | **Solo** segmento de carpeta física bajo `InpExportRoot` cuando `InpOptimizationSafeExports=true` (E5.5.0.5). |
| `InpExportParameterFolder` | `SET001` | Prefijo corto de la **hoja** de carpeta (`<folder>_FVG…`) cuando `InpAutoBuildRunIdFromParams=true` y exports seguros (E5.5.0.5). |
| `InpAutoBuildRunIdFromParams` | `true` | Si `InpOptimizationSafeExports`: hoja de carpeta + `effective_run_id` derivados de `InpExportParameterFolder` + parámetros clave (FVG mínimo, RR, bias body, gate bias). |
| `InpOptimizationSafeExports` | `false` (compatibilidad en doc genérica; default EA E5.5 = `true`) | `true`: estructura `…\<export_campaign_folder>\<folder_leaf>\`; `false`: comportamiento histórico `…\<run_id>\`. |

**Nota:** con `InpOptimizationSafeExports = false`, el EA sigue usando solo `InpRunId` / auto-run como en builds anteriores.

---

## 4. Estructura de carpetas (cuando `InpOptimizationSafeExports = true`, E5.5.0.5)

```text
MQL5\Files\<InpExportRoot>\<InpExportCampaignFolder>\<folder_leaf>\
  backtest_summary.json
  backtest_events.csv
  backtest_trades.csv
```

Ejemplo canónico (defaults E5.5 workflow):

```text
MQL5\Files\Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1\
```

- **Determinista:** mismos inputs MT5 → misma carpeta (apta para repetición y multi-agente con parámetros distintos).
- **Sin timestamp** en la hoja por defecto (no depende del reloj para el nombre).
- **Caracteres inválidos** eliminados vía sanitización (misma familia que el resto del EA).
- **Trazabilidad:** `backtest_summary.json` conserva `campaign_id`, `parameter_set_id` y `strategy_id` con los valores completos de los inputs; además `export_campaign_folder`, `export_parameter_folder`, `effective_export_folder_label` y `effective_run_id` reflejan las etiquetas cortas usadas en disco.

`backtest_summary.json` incluye (entre otros): `campaign_id`, `optimization_safe_exports`, `effective_run_id`, `effective_export_folder_label`, `export_campaign_folder`, `export_parameter_folder`, `optimization_parameters` (eco de los cuatro parámetros de optimización citados en el runbook).

---

## 5. Cómo correr optimización completa con agentes locales

1. Compilar `Mapazapp_TestEA` en MetaEditor (fuera de alcance de este repo en CI).
2. En Strategy Tester, activar **Optimization** y configurar la matriz de parámetros deseada.
3. Poner **`InpOptimizationSafeExports = true`** y **`InpAutoBuildRunIdFromParams = true`** para sweeps estándar.
4. Ajustar **`InpCampaignId`** al id de campaña (p. ej. E5.5) — queda en JSON como **`campaign_id`**.
5. Con exports seguros (E5.5.0.5), ajustar **`InpExportCampaignFolder`** / **`InpExportParameterFolder`** a etiquetas **cortas** para la ruta física (p. ej. `E55`, `SET001`); no sustituyen los ids largos en el resumen JSON.
6. Usar **agentes locales** (aprovechar los cores de la máquina). Revisar en la documentación del terminal el límite de agentes y la RAM por agente.
7. **MQL5 Cloud** queda **fuera de alcance** en esta fase (no documentado como soporte oficial Mapazapp aquí).

**No** ejecutar este documento desde el repo: no hay automatización MT5 en E5.5.0.

---

## 6. Validación de cada bundle

Por cada carpeta hoja con los tres archivos:

```bash
pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- \
  --bundle "<ruta-a-la-carpeta-hoja>" --json
```

La CLI acepta rutas anidadas (`…\TestEA\<export_campaign_folder>\<folder_leaf>`). El importador usa `effective_run_id` si existe, de modo que el **nombre de la carpeta** no tiene que coincidir con el campo legacy `run_id` del JSON.

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
- [ ] `InpCampaignId` coherente con el runbook / informe de campaña (metadato JSON).
- [ ] Con exports seguros, `InpExportCampaignFolder` / `InpExportParameterFolder` **cortos** (evitar rutas largas en agentes del tester).
- [ ] Validar **cada** carpeta hoja con `mapazapp:testea-export-validate`.
- [ ] No usar `Mapazapp_TestEA` fuera de `MQL_TESTER`.

---

## 10. Siguiente paso canónico

**E5.5.1** — recompilar **`MZP_TestEA_E5_5_0_5`**, ejecutar MT5 Strategy Tester (single safe-export de verificación, luego **Optimization** con agentes locales sobre una **matriz pequeña** de parámetros), recoger bundles bajo rutas cortas (`…\TestEA\E55\…`) y adjuntar hashes / métricas agregadas en el informe de campaña (sin subir CSV masivos a Git). Los ids largos de campaña y parameter set siguen en `backtest_summary.json`.
