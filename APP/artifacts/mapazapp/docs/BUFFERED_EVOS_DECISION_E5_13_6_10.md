# Buffered EVOS Decision + Manual-Control Guardrail — E5.13.6.10

## Alcance

- **Checkpoint:** E5.13.6.10 — decisión de ingeniería (docs-only).
- **Entrada:** [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md).
- **Gobernanza:** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

Este documento **cierra** la pregunta «¿basta el proxy TypeScript de robustez?» y fija el **guardrail de control manual** del producto. **No** implementa MQL5 ni TypeScript en este checkpoint.

---

## Contexto de evidencia (E5.13.6.9)

| Hallazgo | Valor / lectura |
|----------|-----------------|
| Bundle | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`, build `MZP_TestEA_E5_13_6_3` |
| Edge domina headline R (E5.13.6.7) | `total_delta_r_vs_official` = 2418 — **un solo bundle** |
| Buffer 30 pts | 822 edge wins fallan effective RR proxy |
| Buffer 50 pts | 1068 edge wins frágiles |
| Risk ratio vs 50 % | ~2× |
| Velocidad | 1217/1453 edge wins fill+close ≤ 1 barra |
| Entry oficial | **50 % / CE** (paridad EVOS fijada E5.13.6.3) |
| XAUUSD | Laboratorio primario, **no** jaula del sistema |

**Conclusión de E5.13.6.9:** el proxy TS es **útil para dirección** pero **insuficiente** para aprobar edge o cambiar entry oficial.

---

## Decisión: Buffered EVOS exacto en MQL5 (requerido)

### Qué se decide

| Pregunta | Decisión |
|----------|----------|
| ¿El proxy TS de robustez basta para aprobar edge? | **NO** |
| ¿Hace falta EVOS buffered exacto en MQL5 antes de cualquier decisión de entry model? | **SÍ** |
| ¿Se cambia entry oficial ahora? | **NO** — permanece **50 % / CE** |
| ¿Se aprueba edge / 25 % / adaptive? | **NO** |
| ¿Es implementación live / gates / trading? | **NO** |

### Por qué MQL5 buffered es necesario

1. El proxy TS usa **geometría exportada** (risk + TP escalado por SL), no path OHLC bar-a-bar con spread/slippage en fill/close.
2. E5.13.6.9 muestra **fragilidad masiva** bajo buffers moderados (30–50 pts) en el cohorte edge win.
3. La gobernanza exige **evidencia ejecutable**, no solo headline R de un bundle XAUUSD.
4. Sin simulación buffered en el mismo motor EVOS que genera variantes, no se puede cerrar el ciclo «¿edge sobrevive ejecución conservadora?».

### Alcance requerido de Buffered EVOS (E5.13.6.11 — implementación futura)

**Solo diagnóstico.** Sin cambiar generación oficial de trades, outcome oficial, entry oficial ni lógica de aprobación.

Variantes bajo buffer adversario configurable:

- **edge**, **25 %**, **adaptive** — candidatos diagnósticos
- **50 % / CE** — **control estricto** (paridad con semántica oficial ya fijada)

Buffers adversarios (mínimo): `5, 10, 20, 30, 50` points (o lista configurable).

Inputs previstos (E5.13.6.11):

| Input | Propósito |
|-------|-----------|
| `InpEnableBufferedEvosV1` | Activar rollups buffered en export |
| `InpBufferedEvosPointsList` o buffers fijos | Lista de puntos de buffer |
| `InpBufferedEvosMinEffectiveRr` | Umbral pass effective RR |
| `InpBufferedEvosScoreEnabled` | Rollups/score opcional en summary |

Export summary (rollups por variante × buffer):

- `filled`, `win`, `loss`, `ambiguous`, `unresolved`, `not_filled`
- `total_r`, `expectancy_r`
- `effective_rr` (agregados)
- `fragile_count` (bajo `min_effective_rr`)

**Prohibido en E5.13.6.11** (salvo gobernanza futura explícita):

- `OrderSend` / `CTrade` / `PositionOpen` / `WebRequest`
- Gates duros desde buffered EVOS
- Cambio de entry oficial
- Live trading / funding

### Qué sigue siendo válido del proxy TS

- CLI `mapazapp:testea-entry-edge-robustness-audit` permanece como **triaje rápido** post-export.
- No se depreca; se **subordina** a evidencia MQL5 buffered para decisiones de entry model.

---

## Guardrail: control manual (producto)

Mapazapp es un sistema de **soporte a decisión manual y read-only** hasta aprobación explícita en contrario.

### Qué Mapazapp puede hacer

- Detectar y clasificar contexto de setup
- Exportar evidencia (CSV/JSON) desde TestEA
- Puntuar, alertar y **explicar** estados (observación / diagnóstico)
- Mostrar en dashboard/BridgeEA (futuro): estado del setup, familia de entry candidata, notas de riesgo, confianza, razones

### Qué Mapazapp no debe hacer (fase actual)

- **Ejecutar trades automáticamente**
- Decidir por el trader sin transparencia
- Enviar órdenes live (`OrderSend`, `CTrade`, `PositionOpen`, `WebRequest`)
- Aprobar entry model desde un solo backtest o proxy

### Decisión final

> **La decisión operativa final permanece manual.**  
> El sistema ayuda a decidir; **no** ejecuta.

Cualquier automatización futura (semi-auto, auto-entry, routing a broker) requiere:

- gobernanza separada
- evidencia multi-bundle / multi-símbolo
- aprobación explícita del dueño de producto
- **no** se infiere desde checkpoints E5.13.6.x actuales

---

## Tabla de decisiones (E5.13.6.10)

| Decisión | Estado |
|----------|--------|
| Proxy TS útil para dirección | **SÍ** |
| Proxy TS suficiente para aprobar edge | **NO** |
| Buffered EVOS MQL5 requerido antes de decisión entry | **SÍ** |
| Implementar E5.13.6.11 (MQL5 diagnostics) | **SIGUIENTE** |
| Aprobar edge / 25 % / adaptive | **NO** |
| Cambiar entry oficial 50 % / CE | **NO** |
| Gates / live / trading | **NO** |
| Control manual del trader | **VIGENTE** |

---

## Siguiente recomendado

**E5.13.6.11 — Add MQL5 Buffered EVOS Diagnostics**

Implementar en `Mapazapp_TestEA.mq5` (o módulo EVOS acoplado) los inputs y rollups de summary descritos arriba; mantener 50 %/CE como control; edge/25/adaptive solo diagnóstico; **sin** cambiar outcome/entry oficial.

Tras E5.13.6.11 + evidencia operador: reevaluar edge bajo North Star; luego **E5.14+** (IFVG / calidad de setup) si entry model sigue sin aprobación.

---

## Referencias

- Robustness evidence: [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md)
- Robustness CLI: [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md)
- North Star §14: [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md)
- Optimization governance §15: [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
