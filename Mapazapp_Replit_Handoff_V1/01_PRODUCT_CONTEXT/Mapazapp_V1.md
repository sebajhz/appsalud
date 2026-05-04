# Mapazapp — Documento V1

**Fecha:** 2026-05-02  
**Estado:** Documento de arranque / memoria del proyecto  
**Objetivo:** Dejar por escrito la visión actual para no perder contexto y poder seguir versionando.

---

## 1. Objetivo general

Crear un sistema de asistencia para volver al trading de forma controlada después de pérdidas previas en pruebas de fondeo.

El sistema debe ayudar a:

- Analizar el mercado de forma continua.
- Detectar zonas y oportunidades probables.
- Validar setups con reglas testeadas.
- Controlar riesgo y reglas de fondeo.
- Evitar sobreoperar o entrar por impulso.
- Registrar operaciones automáticamente.
- Avisar oportunidades, riesgos y bloqueos.
- Preparar o ejecutar operaciones en fases futuras, siempre bajo límites estrictos.

La prioridad no es operar mucho. La prioridad es operar con evidencia, control y consistencia.

---

## 2. Principio central

El bot no debe ser un robot ciego que compra o vende por una condición exacta.

Debe funcionar como un **asistente de trading con criterio operativo**, capaz de:

- Leer contexto.
- Entender zonas.
- Clasificar oportunidades.
- Avisar en lenguaje simple.
- Frenar operaciones peligrosas.
- Ayudar al trader a cumplir el plan.

El sistema debe evitar dos extremos:

1. Ser tan simple que avise demasiadas operaciones malas.
2. Ser tan filtrado que nunca encuentre oportunidades.

---

## 3. Contexto del usuario

El usuario vuelve al trading después de haber parado varios meses por un factor psicológico y pérdidas en pruebas de fondeo.

Por eso el proyecto debe proteger contra:

- Revancha.
- Sobreoperativa.
- Aumentar lote después de perder.
- Comprar pruebas sin evidencia.
- Romper reglas de daily drawdown.
- Operar noticias sin control.
- Entrar fuera del plan.
- Confiar en estrategias de marketing sin prueba real.

---

## 4. Producto propuesto

Nombre de trabajo:

**Mapazapp**

Tipo de producto:

**MT5 Trading Assistant + Prop Firm Guard + Setup Scanner + Backtesting Workflow**

No debe sentirse como un panel manual con muchos botones.

Debe sentirse como:

> “El sistema observa el mercado, entiende el contexto, marca zonas posibles, avisa cuando hay oportunidad y me frena cuando no debo operar.”

---

## 5. Arquitectura recomendada

La arquitectura recomendada es híbrida:

```text
MetaTrader 5
 └── QuerlyBridgeEA
      ├── Exporta velas
      ├── Exporta spread
      ├── Exporta cuenta
      ├── Exporta posiciones
      ├── Exporta historial
      ├── Recibe instrucciones futuras
      └── Ejecuta solo si está autorizado

Carpeta compartida / CSV / JSON / SQLite
 └── Intercambio de datos

Mapazapp
 ├── Data Engine
 ├── Strategy / Zone Engine
 ├── Setup Scoring
 ├── MT5 Backtest Results Importer
 ├── Risk Guard
 ├── Prop Firm Guard
 ├── News Guard
 ├── Journal
 ├── Dashboard
 └── Telegram Alerts
```

---

## 6. Decisión técnica: EA puente dentro de MT5

Se propone crear un EA liviano dentro de MT5:

**QuerlyBridgeEA**

Este EA no será el cerebro principal. Será el puente confiable con MT5.

Responsabilidades:

- Leer velas.
- Leer ticks básicos.
- Leer spread.
- Leer símbolo.
- Leer balance/equity/margen.
- Leer posiciones abiertas.
- Leer órdenes pendientes.
- Leer historial de operaciones.
- Exportar snapshots.
- Recibir instrucciones futuras.
- Ejecutar operaciones solo si el sistema externo lo autoriza.

---

## 7. App externa como cerebro

La app externa será **Mapazapp**.

Responsabilidades:

- Guardar histórico.
- Interpretar datos.
- Calcular zonas.
- Calcular score.
- Importar resultados de backtest.
- Controlar riesgo.
- Controlar reglas de fondeo.
- Mostrar dashboard.
- Enviar alertas.
- Llevar journal.
- Permitir configuración sin tocar código.

Motivo:

MT5 es mejor para estar pegado al broker, cuenta, historial y ejecución.  
La app externa es mejor para análisis, configuración, reportes, dashboard, journal y reglas avanzadas.

---

## 8. Comunicación MT5 ↔ app externa

Opciones posibles:

### Opción A — CSV/JSON compartido

Recomendada para primera versión técnica.

Ventajas:

- Simple.
- Fácil de depurar.
- Menos riesgo inicial.
- Permite avanzar rápido.

### Opción B — SQLite compartido

Recomendada para una versión más seria.

Ventajas:

- Ordenada.
- Consultable.
- Ideal para histórico, journal y snapshots.

Cuidados:

- Manejar bloqueos de lectura/escritura.
- No escribir demasiado por tick.
- Preferir cierre de vela o intervalos controlados.

### Opción C — Canal bidireccional avanzado

Puede evaluarse más adelante.

No usar como primera opción.

---

## 9. Funcionamiento continuo

El sistema debe correr de forma automática, sin depender de botones manuales.

Para forex, oro e índices:

- Modo 24/5.
- Pausa de fin de semana.
- Control de horarios del broker/servidor MT5.

Para crypto:

- Modo 24/7.
- Perfil separado.
- Cuidado con spreads, liquidez y volatilidad.

---

## 10. Data Engine

El sistema debe mantener datos actualizados.

Mínimo:

- D1.
- H4.
- H1.
- M15.

M5 puede quedar para confirmación futura.

El Data Engine debe validar:

- Huecos de velas.
- Velas duplicadas.
- Spreads anormales.
- Horario del servidor.
- Cambio de horario.
- Símbolos no disponibles.
- Cortes de conexión.

---

## 11. Estrategia inicial candidata

Nombre tentativo:

**Daily/H4 Direction + Liquidity Zone + Retest**

En lenguaje simple:

> “El sistema detecta hacia dónde está más fuerte el mercado, marca zonas donde podría reaccionar y avisa si aparece una oportunidad razonable.”

La estrategia debe evitar operar por punto exacto.

No queremos:

> “Comprar exactamente en 2321.37.”

Queremos:

> “El oro está llegando a una zona donde podría aparecer compra entre 2320 y 2325. Esperar confirmación.”

---

## 12. Operar por zonas

Cada zona debe tener:

- Símbolo.
- Timeframe origen.
- Tipo de zona.
- Dirección esperada.
- Precio desde.
- Precio hasta.
- Motivo.
- Estado.
- Fuerza.
- Invalidez.
- Acción sugerida.

Ejemplo:

```text
Símbolo: XAUUSD
Zona: 2320.00 – 2325.00
Tipo: posible compra
Motivo: zona importante + reacción previa + recuperación de precio
Estado: esperar confirmación
Invalida si: cierre H1 debajo de 2316.00
Acción: observar, no entrar todavía
```

---

## 13. Scoring por zonas

El score no debe evaluar un pip exacto.  
Debe evaluar la calidad de una zona y su contexto.

Ejemplo de factores:

- Dirección general favorece compra/venta.
- H4 acompaña.
- Precio llegó a zona importante.
- Hubo toma de liquidez.
- Hay reacción inicial.
- Hay recorrido suficiente.
- Stop lógico.
- Riesgo/beneficio aceptable.
- Spread normal.
- No hay noticia cerca.
- El trader está habilitado por reglas de riesgo.

Clasificación:

- 80–100: zona fuerte.
- 60–79: zona válida, revisar.
- 40–59: contexto interesante, esperar.
- 0–39: no operar.

Importante:

> Score alto no significa ejecución automática. Significa oportunidad de mayor calidad.

---

## 14. Lenguaje simple

La herramienta debe poder ser entendida por una persona sin conocimientos avanzados de trading.

Evitar como mensaje principal:

- Bias.
- Liquidity sweep.
- CHoCH.
- BOS.
- FVG.
- Order block.
- Imbalance.

Usar lenguaje simple:

- “Hoy el oro está más comprador que vendedor.”
- “El precio llegó a una zona donde podría rebotar.”
- “Todavía no hay entrada clara.”
- “Mejor esperar confirmación.”
- “No conviene operar ahora: el precio está en el medio.”
- “Hay noticia cerca. Mejor esperar.”
- “La operación tiene poco recorrido para el riesgo que exige.”

Puede existir una vista técnica opcional para revisar detalles avanzados.

---

## 15. Backtesting: decisión clave

No se debe volver a construir un backtester propio pesado para V1.

En el proyecto anterior se perdió mucho tiempo porque el backtest:

- Era muy lento.
- Probaba demasiadas configuraciones.
- Probaba settings de forma individual por año.
- Podía demorar días.
- Terminó consumiendo demasiado esfuerzo sin dar una conclusión práctica.

Decisión actual:

> El backtesting principal debe hacerse en MetaTrader 5 Strategy Tester.

---

## 16. Backtesting por símbolo

El backtesting debe ser por símbolo.

No usar los mismos settings para todos los mercados.

Cada símbolo debe tener:

- Perfil propio.
- Parámetros propios.
- Backtest propio.
- Optimización propia.
- Validación propia.
- Métricas propias.

Ejemplos:

- XAUUSD no debe usar la misma tolerancia que EURUSD.
- GBPUSD puede requerir horarios distintos.
- NAS100 puede tener volatilidad y spreads diferentes.
- Crypto requiere modo y filtros separados.

---

## 17. EA testeable para la estrategia

Además del EA puente, debe existir una versión testeable de la estrategia en MT5.

Puede ser:

- Un EA de estrategia separado.
- Un módulo MQL5 enfocado en backtest.
- Una versión simplificada del motor para Strategy Tester.

Debe permitir probar:

- Zonas.
- Score.
- Stop lógico.
- Take profit.
- Gestión simulada.
- Filtros de horario.
- Filtros de spread.
- Reglas básicas de riesgo.

---

## 18. Flujo correcto de backtest

Para cada símbolo:

1. Definir perfil del símbolo.
2. Definir estrategia candidata.
3. Definir rangos razonables de parámetros.
4. Ejecutar optimización en MT5.
5. Separar mejores configuraciones.
6. Validar en otro período.
7. Revisar drawdown.
8. Revisar compatibilidad con fondeo.
9. Exportar resultados.
10. Registrar configuración aprobada.
11. Usar esa configuración en el scanner en vivo.

---

## 19. Evitar optimización infinita

El objetivo no es encontrar el set perfecto del pasado.

Reglas:

- No probar millones de combinaciones sin criterio.
- No optimizar demasiadas variables a la vez.
- No elegir solo por ganancia neta.
- Priorizar estabilidad.
- Priorizar drawdown bajo.
- Priorizar cantidad suficiente de operaciones.
- Medir meses negativos.
- Separar entrenamiento y validación.
- Evitar sobreoptimización.

---

## 20. Qué debe exportar un backtest aprobado

Cada corrida importante debería registrar:

- Símbolo.
- Timeframe.
- Período probado.
- Set de parámetros.
- Net profit.
- Profit factor.
- Max drawdown.
- Relative drawdown.
- Winrate.
- Promedio R:R.
- Cantidad de trades.
- Racha máxima perdedora.
- Meses positivos/negativos.
- Resultado por mes.
- Resultado por sesión si aplica.
- Compatibilidad con reglas de fondeo.

---

## 21. Uso de hardware

Equipo mencionado:

- Intel i7-12700K.
- GPU RTX 4060.

Criterio:

- La optimización de MT5 debe planificarse principalmente para CPU/agentes.
- No asumir que la GPU acelera automáticamente el Strategy Tester.
- La GPU solo sería relevante si se programa lógica específica compatible, por ejemplo cálculos OpenCL.
- Si hace falta velocidad extra, evaluar agentes remotos o MQL5 Cloud Network.

---

## 22. Risk Guard

El sistema debe controlar:

- Riesgo máximo por trade.
- Riesgo máximo diario.
- Pérdida máxima acumulada.
- Máximo de operaciones por día.
- Bloqueo por racha perdedora.
- Bloqueo por noticia.
- Bloqueo por spread.
- Bloqueo por operar fuera del plan.
- Kill switch manual.

Reglas psicológicas iniciales:

- Si se pierde 1 trade, pausar y revisar.
- Si se pierden 2 trades en el día, bloquear operativa.
- Si se gana fuerte, reducir riesgo o cerrar el día.
- No operar por revancha.
- No mover stop para aumentar pérdida.
- No promediar pérdidas.
- No martingala.

---

## 23. Prop Firm Guard

El sistema debe permitir perfiles por firma.

Ejemplos:

- The5ers.
- PropXP.
- Demo.
- Cuenta personal.

Cada perfil debe incluir:

- Balance inicial.
- Profit target.
- Daily drawdown.
- Max drawdown.
- Regla de consistencia.
- Días mínimos o días rentables.
- Restricciones de noticias.
- Restricciones de fin de semana.
- Restricciones de EAs.
- Restricciones de copy trading.

Las reglas deben ser configurables y no hardcodeadas.

---

## 24. News Guard

El bot debe controlar noticias de alto impacto.

Debe poder bloquear o advertir según:

- Moneda afectada.
- Instrumento afectado.
- Tiempo antes de la noticia.
- Tiempo después de la noticia.
- Si se permite abrir operación.
- Si se permite cerrar/modificar.
- Si se permite mantener operación abierta.

Inicialmente puede cargarse manualmente.  
Luego se puede automatizar con proveedor externo si vale la pena.

---

## 25. Journal automático

El sistema debe leer historial de MT5 para registrar operaciones automáticamente.

Debe importar:

- Operaciones cerradas.
- Entradas.
- Salidas.
- SL/TP.
- Comisión.
- Swap.
- Resultado neto.
- Duración.
- Símbolo.
- Lote.
- Magic number o comentario.

Luego debe enriquecer cada operación con:

- Setup detectado.
- Contexto previo.
- Score.
- Zona.
- Regla cumplida/incumplida.
- Estado emocional si el trader lo registra.

---

## 26. Ejecución futura

Fases:

### Fase A — Solo alerta

El bot detecta y avisa.  
El trader opera manualmente.

### Fase B — Preparar orden

El bot calcula:

- Entrada.
- Stop.
- Take profit.
- Lote.
- Riesgo.
- R:R.

El trader confirma.

### Fase C — Ejecución semiautomática

La app envía la orden al EA.  
El EA ejecuta solo si Risk Guard autoriza.

### Fase D — Ejecución automática limitada

Solo después de backtest y forward test suficientes.

Debe tener:

- Max riesgo por trade.
- Max pérdida diaria.
- Max trades diarios.
- Bloqueo por noticia.
- Bloqueo por spread.
- Bloqueo por racha perdedora.
- Kill switch.
- Prohibido martingala.
- Prohibido promediar pérdidas.

---

## 27. Configuración sin tocar código

Todo debe poder modificarse desde UI o archivo simple.

Configurable:

- Símbolos.
- Timeframes.
- Riesgo por operación.
- Riesgo diario.
- Reglas de fondeo.
- Horarios permitidos.
- Ventanas de noticia.
- Tamaño mínimo de zona.
- Tolerancias por símbolo.
- Score mínimo para alerta.
- Score mínimo para preparar operación.
- Activar/desactivar estrategias.
- Modo alerta/preparación/ejecución.

---

## 28. Adaptabilidad por mercado

El bot debe permitir perfiles por mercado y contexto.

Ejemplos:

- XAUUSD tendencia.
- XAUUSD rango.
- EURUSD Londres.
- GBPUSD Nueva York.
- Crypto 24/7.
- Fondeo conservador.
- Demo agresivo controlado.

La adaptación no debe ser magia ni IA inventando operaciones.  
Debe ser configuración controlada, medible y testeada.

---

## 29. Investigación de estrategias

No se va a copiar una estrategia por marketing.

Candidatas a estudiar:

1. Dirección D1/H4 + zona de liquidez + retest.
2. Break and retest con filtro de tendencia.
3. Opening range de Londres/Nueva York.
4. ATR pullback trend-following.
5. Mean reversion solo en rango confirmado.
6. SMC simplificado con score, no con reglas místicas.

Cada estrategia debe pasar por:

- Explicación simple.
- Conversión a zonas.
- EA testeable.
- Backtest por símbolo.
- Forward test.
- Compatibilidad con fondeo.
- Validación fuera del período optimizado.

---

## 30. Qué NO queremos

- Bot rígido que espera una condición perfecta.
- Bot que opera todo el día.
- Promesas de 90% winrate.
- Martingala.
- Grid agresivo.
- Promediar pérdidas.
- Aumentar lote después de perder.
- Operar noticias como casino.
- Comprar prueba sin evidencia.
- Dashboard lindo con motor débil.
- Backtester propio lento como prioridad inicial.

---

## 31. Distribución de importancia

### 80% — Motor principal

Incluye:

- Setup.
- Lógica de mercado.
- Zonas.
- Scoring.
- Backtesting.
- Optimización.
- Validación por símbolo.
- Robustez para detectar oportunidades reales.

Este es el corazón del proyecto.

### 10% — Interpretación visual

Incluye:

- Dashboard.
- Cómo se muestra el contexto.
- Explicaciones simples.
- Zonas visibles.
- Estado del mercado.
- Qué hacer / qué no hacer.

### 10% — Herramientas secundarias

Incluye:

- Telegram.
- Colores.
- Extras visuales.
- Automatizaciones periféricas.
- Detalles de comodidad.

---

## 32. Fases recomendadas

### Fase 0 — Definición

- Elegir mercado inicial.
- Elegir firma objetivo.
- Definir riesgo interno.
- Definir estrategia candidata 1.
- Definir qué se testea primero.

### Fase 1 — EA Bridge MT5

- Exportar velas.
- Exportar cuenta.
- Exportar posiciones.
- Exportar historial.
- Exportar spread.
- Crear formato estable de datos.

### Fase 2 — EA Strategy Tester

- Convertir estrategia candidata a EA testeable.
- Crear parámetros por símbolo.
- Correr backtest en MT5.
- Exportar resultados.

### Fase 3 — App externa

- Leer datos del EA.
- Guardar histórico.
- Leer resultados de backtest.
- Mostrar estado simple.
- Crear configuración sin tocar código.

### Fase 4 — Scanner en vivo

- Usar configuración aprobada.
- Marcar zonas.
- Calcular score.
- Avisar oportunidades.

### Fase 5 — Risk / Prop / News Guard

- Reglas de riesgo.
- Reglas de fondeo.
- Noticias.
- Bloqueos.

### Fase 6 — Journal automático

- Importar historial real.
- Relacionar trades con zonas y setups.
- Medir cumplimiento.

### Fase 7 — Ejecución asistida

- Preparar órdenes.
- Confirmación manual.
- Ejecución por EA solo si está permitido.

---

## 33. Decisión actual

La dirección actual del proyecto queda así:

- MT5 como base fuerte para backtesting.
- EA puente dentro de MT5.
- EA testeable para estrategia.
- App externa como cerebro/dash/journal/configuración.
- Backtest por símbolo.
- Operativa por zonas, no por pips exactos.
- Score flexible, no señales rígidas.
- Lenguaje simple.
- Configuración sin tocar código.
- Prioridad 80% motor, 10% visualización, 10% extras.

---

## 34. Próximas preguntas a resolver

1. ¿Arrancamos solo con XAUUSD o también incluimos EURUSD/GBPUSD desde el inicio?
2. ¿La primera firma objetivo será The5ers o PropXP?
3. ¿Qué período histórico mínimo vamos a exigir para aprobar una estrategia?
4. ¿Cuántas variables máximas se permitirá optimizar al mismo tiempo?
5. ¿Qué score mínimo genera alerta?
6. ¿Qué score mínimo permite preparar operación?
7. ¿Qué riesgo interno inicial usaremos? 0.25%, 0.5% u otro.
8. ¿Queremos primero EA Bridge o EA Strategy Tester?
9. ¿El primer dashboard será local simple o web más completo?
10. ¿Qué criterio define que una configuración queda aprobada?

---

## 35. Referencias técnicas para validar

- MetaTrader 5 Strategy Tester / Testing:
  https://www.metatrader5.com/en/terminal/help/algotrading/testing

- MetaTrader 5 Strategy Optimization:
  https://www.metatrader5.com/en/terminal/help/algotrading/strategy_optimization

- MetaTrader 5 Remote Agents:
  https://www.metatrader5.com/en/terminal/help/algotrading/metatester

- MQL5 Cloud Network:
  https://www.metatrader5.com/en/terminal/help/mql5cloud/mql5cloud_use

- MQL5 Database / SQLite:
  https://www.mql5.com/en/docs/database

- MQL5 FileOpen / FILE_COMMON:
  https://www.mql5.com/en/docs/files/fileopen
