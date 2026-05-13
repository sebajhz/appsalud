# Mapazapp — TestEA build and versioning policy (E5.4.3)

## Purpose

Definir cómo **identificar de forma estable** el EA de Strategy Tester, cada **compilación lógica** y cada **corrida** del tester, para que la evidencia de campaña (E5.5+) sea **reproducible y auditable** sin multiplicar fuentes `.mq5` en el árbol activo.

Relacionado: evidencia smoke **E5.4.2** — [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md).

---

## Policy

### 1. Stable official EA names

- **Fuente:** `Mapazapp_TestEA.mq5`
- **Binario oficial en MT5:** `Mapazapp_TestEA.ex5`

El operador y la documentación siempre referencian **el mismo nombre** en Experts; evita confusión en el Strategy Tester y en rutas de exportación.

### 2. Build identity inside code and exports

- Tras cambios **significativos** de lógica del EA (MQL5), actualizar el identificador de build exportado en summary (campo típico **`ea_build`**).
- Ejemplo vigente en el repo: **`MZP_TestEA_E5_5_0`** (E5.5.0 — exports seguros para optimización + metadatos de campaña en summary).

`ea_build` debe cambiar cuando el comportamiento exportado o la semántica de trades/eventos cambie de forma material (no por retoques cosméticos de comentarios).

### 3. Run identity

- **`InpRunId`** debe ser **único por corrida** del Strategy Tester (o por lote de evidencia que se quiera distinguir).
- Ejemplo: **`TEST_E5_4_2_A`**.
- En **optimización masiva**, preferir **`InpOptimizationSafeExports=true`** (E5.5.0) para que la carpeta de export sea **única por combinación de parámetros** bajo `InpCampaignId` — ver [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md).

Evita colisiones de carpetas bajo `MQL5\Files\<ExportRoot>\<RunId>` **o** bajo `MQL5\Files\<ExportRoot>\<campaign_id>\<folder_leaf>` cuando el modo seguro está activo.

### 4. Parameter identity

- **`InpParameterSetId`** describe el conjunto de parámetros probado (no el run en sí).
- Ejemplo: **`MZP_IFVG_XAUUSD_V1_SET_003`**.

Permite comparar runs distintos con el mismo set o distintos sets en el mismo rango.

### 5. Optional local archived EX5

Tras compilar, el operador **puede** copiar el binario oficial a un nombre archivado **solo en su máquina**, por ejemplo:

- De: `Experts\Mapazapp\Mapazapp_TestEA.ex5`
- A: `Experts\Mapazapp\Mapazapp_TestEA_E5_4_1.ex5`

Ese `.ex5` archivado es **artefacto local**; **no** se versiona en Git por defecto salvo decisión explícita de producto.

### 6. Do not duplicate source files per test

- **Evitar** proliferar `Mapazapp_TestEA_v1.mq5`, `Mapazapp_TestEA_v2.mq5`, etc., en el árbol activo.
- **Una** fuente activa reduce **drift** entre “el EA que creías probar” y el que está en el repo.

La variante de “versión” vive en **`ea_build`**, Git, y copias locales de `.ex5`, no en copias paralelas de `.mq5`.

### 7. Campaign evidence bundle (minimum fields)

Para campañas con **varios runs** (**E5.5+**), cada informe agregado debe incluir también **`campaign_id`** además de `run_id` y `parameter_set_id`, de modo que las filas se agrupen sin ambigüedad. Runbook: [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md).

Cada informe o paquete de evidencia de campaña debe poder enlazar o listar como mínimo:

| Campo | Ejemplo / notas |
|--------|------------------|
| `campaign_id` | p. ej. `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1` (misma campaña, muchos `run_id`) |
| Commit Git | SHA del repo usado para compilar |
| `ea_build` | p. ej. `MZP_TestEA_E5_5_0` |
| `run_id` | p. ej. `TEST_E5_4_2_A` o `MZP_E5_5_XAUUSD_M15_D1_OUTCOME_SET001_FULL_A` |
| `parameter_set_id` | p. ej. `MZP_IFVG_XAUUSD_V1_SET_003` o `MZP_IFVG_XAUUSD_V1_OUTCOME_SET_001` |
| Símbolo | p. ej. XAUUSD |
| Timeframe de ejecución | p. ej. M15 |
| Carpeta de export / bundle validado | ruta hoja bajo `Mapazapp\TestEA\<RunId>` **o** `Mapazapp\TestEA\<campaign_id>\<folder_leaf>` (E5.5.0) |
| Resultado validación CLI | p. ej. `mapazapp:testea-export-validate` (`ok`, `status`, lista de warnings) |

---

## Rationale

- **Nombre estable del EA** simplifica flujos humanos en MT5 (Expert list, rutas, documentación).
- **`ea_build` + `run_id`** dan trazabilidad fina: qué código y qué corrida produjeron un CSV.
- **`InpParameterSetId`** separa la configuración del **parameter set** de la **instancia de ejecución**; en campañas multi-run, **`campaign_id`** (convención en runbook E5.5) agrupa filas de informe.
- **Copia local opcional de `.ex5`** ayuda a auditorías manuales sin contaminar el historial Git con binarios.

---

## Document history

| Versión | Nota |
|---------|------|
| E5.4.3 v1 | Política publicada junto a evidencia E5.4.2; docs-only. |
| E5.4.3 v2 | `campaign_id` + runbook E5.5 en trazabilidad de campaña. |
