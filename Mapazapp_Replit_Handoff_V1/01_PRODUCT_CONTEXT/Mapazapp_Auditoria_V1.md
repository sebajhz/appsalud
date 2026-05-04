# Mapazapp — Auditoría V1

## Objetivo de esta auditoría

Revisar el proyecto como si fuera un producto real de trading asistido, visto desde cuatro roles:

1. Programador.
2. Tester.
3. Trader profesional.
4. Dueño/CEO de una empresa que quiere entregar este software a traders.

La conclusión principal es que Mapazapp no debe ser un “bot de señales”. Debe ser un sistema de decisión asistida que combine motor de mercado, backtesting, control psicológico, reglas de fondeo, journal y ejecución controlada.

---

## 1. Conclusión ejecutiva

El proyecto está bien orientado, pero el foco debe quedar extremadamente claro:

- 80% del valor está en el motor: estrategia, zonas, scoring, backtesting y validación por símbolo.
- 10% está en cómo el usuario interpreta el mercado: dashboard, lenguaje simple, visualización de zonas y explicación.
- 10% está en herramientas secundarias: Telegram, colores, detalles visuales, automatizaciones extras.

Si el motor no funciona, todo lo demás no importa.

El sistema debe ayudar al trader a responder:

- ¿Hoy conviene mirar compras, ventas o no hacer nada?
- ¿Dónde están las zonas importantes?
- ¿Qué tiene que pasar para validar una entrada?
- ¿Qué invalida la idea?
- ¿Cuánto puedo perder si entro?
- ¿El beneficio potencial justifica el riesgo?
- ¿Estoy habilitado por las reglas de fondeo?
- ¿Hay noticia cerca?
- ¿Ya operé demasiado hoy?
- ¿Estoy operando por plan o por emoción?
- ¿Esta idea funcionó históricamente en este símbolo?
- ¿Estoy usando settings aprobados para este activo?

---

## 2. Auditoría desde el lado de programador

### Lo correcto

La arquitectura híbrida es la mejor dirección:

```text
MT5
 ├── QuerlyBridgeEA
 │    ├── Exporta datos
 │    ├── Lee cuenta
 │    ├── Lee posiciones
 │    ├── Lee historial
 │    └── Ejecuta solo si está autorizado
 │
 ├── StrategyTestEA
 │    └── Versión testeable de la estrategia para MT5 Strategy Tester
 │
App externa
 ├── Configuración
 ├── Dashboard
 ├── Journal
 ├── Backtest reports
 ├── Prop Firm Guard
 ├── Risk Guard
 ├── News Guard
 ├── Psicología
 └── Alertas
```

### Por qué

MT5 debe encargarse de lo que hace bien:

- Datos del broker.
- Estado de cuenta.
- Historial.
- Strategy Tester.
- Ejecución futura.

La app externa debe encargarse de lo que MT5 no hace cómodo:

- Dashboard claro.
- Configuración amigable.
- Journal.
- Métricas.
- Psicología.
- Reportes.
- Alertas.
- Administración de perfiles.

### Riesgo detectado

No se debe pedirle a Cursor o Replit que “diseñe la estrategia”. Eso sería un error.

Cursor debe recibir instrucciones como:

- Leer estos datos.
- Calcular esta zona.
- Usar esta fórmula.
- Aplicar esta regla.
- Validar esta condición.
- Exportar este resultado.
- Bloquear en este caso.
- Mostrar este mensaje.

Cursor implementa. Nosotros definimos la lógica de trading.

---

## 3. Auditoría desde el lado de tester

El tester no debe validar si el bot “parece inteligente”.

Debe validar si el bot hace exactamente lo que fue definido.

### Pruebas mínimas

- Cálculo de zonas.
- Cálculo de score.
- Cálculo de riesgo.
- Conversión de pips/puntos por símbolo.
- Validación de spread.
- Validación de noticia.
- Validación de reglas de fondeo.
- Importación de datos MT5.
- Importación de historial MT5.
- No duplicar operaciones.
- No duplicar velas.
- Corte de conexión.
- Símbolos con distinta cantidad de decimales.
- Timeframes múltiples.
- Bloqueo por pérdida diaria.
- Bloqueo por racha perdedora.
- Kill switch.

### Criterio

Una prueba pasa si el resultado es reproducible.

Ejemplo:

Dado:
- XAUUSD.
- Zona calculada entre 2320 y 2325.
- Spread dentro de rango.
- Sin noticia.
- Riesgo disponible.
- Score 78.

El sistema debe decir:
- “Zona válida, revisar confirmación.”
- No debe ejecutar automático.
- Debe registrar el evento.
- Debe enviar alerta si el umbral lo permite.

---

## 4. Auditoría desde trader profesional

Un trader profesional no necesita que el bot le diga “comprá ya” todo el tiempo.

Necesita que le diga:

- Dónde está el precio.
- Qué lado tiene más sentido.
- Dónde no conviene operar.
- Dónde puede aparecer oportunidad.
- Qué tiene que pasar para validar.
- Qué invalida.
- Cuánto riesgo tiene.
- Si la operación vale la pena.
- Si debe quedarse quieto.

### Regla clave

El bot debe decir “no operar” muchas más veces que “operar”.

Una buena herramienta de trading evita operaciones malas, no solo busca entradas.

### Lo que debe evitar

- Operar en el medio del precio.
- Operar por aburrimiento.
- Operar por revancha.
- Operar noticia si la regla lo prohíbe.
- Aumentar lotaje tras perder.
- Promediar pérdidas.
- Mover stop para aumentar pérdida.
- Entrar sin stop lógico.
- Entrar sin recorrido suficiente.

---

## 5. Auditoría desde CEO/producto

Si este software fuera para otras personas, el producto tendría que cumplir dos mundos:

### Para trader nuevo

Debe mostrar:

- Lenguaje simple.
- Qué está pasando.
- Qué esperar.
- Qué evitar.
- Riesgo claro.
- Botón de ayuda.
- Checklist.
- Explicación corta.

Ejemplo:

> “Oro está cerca de una zona donde podría aparecer compra. Todavía no hay entrada clara. Esperar confirmación.”

### Para trader avanzado

Debe permitir ver:

- Timeframe origen.
- Score.
- Parámetros.
- Zonas.
- Invalidez.
- R:R.
- Métricas históricas.
- Backtest.
- Drawdown.
- Resultados por símbolo.
- Configuración avanzada.

### Producto ideal

La herramienta debe tener dos capas:

1. Vista simple.
2. Vista técnica avanzada.

---

## 6. Estrategia: lo que debe salir del MD, no de Cursor

Antes de programar el motor, se necesita un documento separado:

# Strategy Blueprint V1

Ese documento debe definir la estrategia con precisión.

Debe incluir:

- Nombre de estrategia.
- Mercados admitidos.
- Timeframes.
- Modelo de mercado.
- Condición válida.
- Condición inválida.
- Cómo se define dirección del día.
- Cómo se define zona de compra.
- Cómo se define zona de venta.
- Cómo se mide fuerza de zona.
- Cómo se confirma entrada.
- Cómo se invalida entrada.
- Cómo se calcula SL.
- Cómo se calcula TP.
- Cómo se calcula R:R.
- Cuándo no operar.
- Parámetros configurables.
- Parámetros por símbolo.
- Métricas mínimas para aceptar.

### Regla

No pedir:

> “Cursor, creame una estrategia rentable.”

Pedir:

> “Cursor, implementá esta estrategia exacta con estas reglas, estos cálculos, estos inputs, estos outputs y estos tests.”

---

## 7. Pips fijos vs fórmula por símbolo

No se deben usar pips fijos universales.

Incorrecto:

> “Si sube 5 pips, hacer X.”

Porque 5 pips en XAUUSD no significa lo mismo que en EURUSD o GBPUSD.

Correcto:

Definir fórmulas por símbolo.

Ejemplo conceptual:

```text
zone_width = max(
    spread_promedio * multiplicador_spread,
    ATR(timeframe) * multiplicador_atr,
    tamaño_mínimo_configurado_del_símbolo
)
```

Eso no significa que la fórmula final sea exactamente esa, pero el concepto es correcto:

- Oro tiene un perfil.
- EURUSD tiene otro.
- GBPUSD tiene otro.
- NAS100 tiene otro.
- Crypto tiene otro.

Cursor debe implementar la fórmula que nosotros definamos.

---

## 8. Backtesting

La decisión correcta es usar MT5 Strategy Tester como base principal del backtesting.

No repetir el error anterior de crear un backtester propio lento que consume semanas o meses.

### Lo que debe existir

- StrategyTestEA en MQL5.
- Parámetros por símbolo.
- Optimización en MT5.
- Exportación de resultados.
- Validación fuera de muestra.
- Revisión de métricas por período.

### Métricas mínimas

- Net profit.
- Profit factor.
- Winrate.
- Expectancy.
- Max drawdown.
- Drawdown relativo.
- Trades totales.
- Trades por mes.
- Racha máxima perdedora.
- Meses positivos.
- Meses negativos.
- Resultado por sesión.
- Resultado bajo reglas de fondeo.
- Sensibilidad a spread.
- Sensibilidad a slippage.

### Criterio de aceptación

Una estrategia no queda aprobada por ganar mucho en un backtest.

Queda aprobada si:

- Tiene muestra suficiente.
- No depende de un solo mes bueno.
- No está sobreoptimizada.
- Soporta meses malos.
- Respeta reglas de fondeo.
- Tiene drawdown tolerable.
- Tiene frecuencia razonable.
- Funciona en validación, no solo en entrenamiento.

---

## 9. Psicología integrada

El bot debe funcionar como freno psicológico.

Controles necesarios:

- Límite de trades diarios.
- Bloqueo tras pérdidas consecutivas.
- Bloqueo tras alcanzar pérdida diaria.
- Pausa obligatoria después de pérdida.
- Pausa después de ganancia grande.
- Registro emocional.
- Checklist antes de operar.
- Alerta de revancha.
- Alerta de sobreoperativa.
- Modo “solo observación”.

Ejemplo de mensaje:

> “No conviene seguir operando hoy. Ya tuviste dos pérdidas y estás cerca del límite diario interno. El sistema queda en modo observación.”

---

## 10. Dashboard necesario

El dashboard no debe ser decorativo.

Debe responder rápido:

### Pantalla principal

- Estado del mercado.
- Compras / ventas / no operar.
- Zonas activas.
- Riesgo disponible.
- Estado de reglas de fondeo.
- Noticias cercanas.
- Alertas recientes.
- Estado emocional/operativo.

### Zona activa

Debe mostrar:

- Símbolo.
- Dirección probable.
- Rango de zona.
- Motivo simple.
- Estado.
- Qué esperar.
- Qué invalida.
- Riesgo estimado.
- Score.
- Métrica histórica de esa configuración.

### Journal

Debe mostrar:

- Trades tomados.
- Trades sugeridos.
- Trades ignorados.
- Resultado.
- Si cumplió plan.
- Score original.
- Contexto.
- Motivo de entrada.
- Motivo de salida.
- Emoción registrada.

---

## 11. Riesgos principales del proyecto

1. Meter demasiadas estrategias al principio.
2. Delegar lógica de trading a Cursor/Replit.
3. Volver a crear backtester propio lento.
4. Optimizar demasiado y crear overfitting.
5. Usar pips fijos sin adaptar por símbolo.
6. Hacer UI linda antes de motor real.
7. Hacer alertas ambiguas.
8. Permitir ejecución sin límites.
9. No separar StrategyTestEA de BridgeEA.
10. No registrar por qué una señal fue emitida.
11. No bloquear por psicología.
12. No validar reglas de fondeo por firma.
13. Confiar en un solo período histórico.
14. No considerar spread/slippage.
15. Comprar prueba real sin evidencia suficiente.

---

## 12. Lo que necesita el trader para quedar satisfecho

El trader necesita sentir que el sistema:

- Está mirando el mercado por él.
- No le mete presión.
- No inventa señales.
- Explica claro.
- Tiene evidencia.
- Lo protege de sí mismo.
- Lo ayuda a operar menos y mejor.
- Registra todo.
- Aprende desde métricas, no desde emociones.
- Puede configurarse sin tocar código.
- No promete fantasías.
- Tiene límites duros.

---

## 13. Próximo documento recomendado

El próximo documento debe ser:

# Strategy Blueprint V1

No debe ser todavía un prompt para Cursor.

Primero hay que definir:

- Cómo entendemos el mercado.
- Cómo marcamos zonas.
- Cómo validamos dirección.
- Cómo confirmamos.
- Cómo invalidamos.
- Cómo calculamos riesgo.
- Cómo adaptamos por símbolo.
- Qué parámetros se backtestean.
- Qué parámetros quedan fijos.
- Qué métricas aceptan o rechazan la estrategia.

Después de eso sí se crea:

# Cursor Implementation Spec V1

---

## 14. Orden correcto de avance

1. Strategy Blueprint V1.
2. Parámetros por símbolo.
3. EA testeable en MT5.
4. Backtest por símbolo.
5. Validación de resultados.
6. BridgeEA para datos.
7. Scanner en vivo.
8. Dashboard simple.
9. Journal automático.
10. Psicología y Prop Firm Guard.
11. Ejecución asistida.
12. Ejecución automática limitada solo si hay evidencia.

---

## 15. Conclusión

Mapazapp debe ser un sistema de trading asistido, no un bot mágico.

La estrategia, las zonas, el scoring y las reglas deben salir de documentos propios definidos por nosotros.

Cursor y Replit deben recibir instrucciones cerradas y verificables.

La frase guía del proyecto debe ser:

> El sistema no adivina el mercado. Lee contexto, marca zonas, valida condiciones, mide riesgo, respeta reglas y evita que el trader opere cuando no debe.
