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
- Ejemplo vigente en el repo: **`MZP_TestEA_E5_4_1`**.

`ea_build` debe cambiar cuando el comportamiento exportado o la semántica de trades/eventos cambie de forma material (no por retoques cosméticos de comentarios).

### 3. Run identity

- **`InpRunId`** debe ser **único por corrida** del Strategy Tester (o por lote de evidencia que se quiera distinguir).
- Ejemplo: **`TEST_E5_4_2_A`**.

Evita colisiones de carpetas bajo `MQL5\Files\<ExportRoot>\<RunId>`.

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

Cada informe o paquete de evidencia de campaña debe poder enlazar o listar como mínimo:

| Campo | Ejemplo / notas |
|--------|------------------|
| Commit Git | SHA del repo usado para compilar |
| `ea_build` | p. ej. `MZP_TestEA_E5_4_1` |
| `run_id` | p. ej. `TEST_E5_4_2_A` |
| `parameter_set_id` | p. ej. `MZP_IFVG_XAUUSD_V1_SET_003` |
| Símbolo | p. ej. XAUUSD |
| Timeframe de ejecución | p. ej. M15 |
| Carpeta de export / bundle validado | ruta o carpeta zip bajo `Mapazapp\TestEA\<RunId>` |
| Resultado validación CLI | p. ej. `mapazapp:testea-export-validate` (`ok`, `status`, lista de warnings) |

---

## Rationale

- **Nombre estable del EA** simplifica flujos humanos en MT5 (Expert list, rutas, documentación).
- **`ea_build` + `run_id`** dan trazabilidad fina: qué código y qué corrida produjeron un CSV.
- **`InpParameterSetId`** separa “configuración de estrategia” de “instancia de ejecución”.
- **Copia local opcional de `.ex5`** ayuda a auditorías manuales sin contaminar el historial Git con binarios.

---

## Document history

| Versión | Nota |
|---------|------|
| E5.4.3 v1 | Política publicada junto a evidencia E5.4.2; docs-only. |
