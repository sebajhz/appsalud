# Mapazapp — Strategy Blueprint Skeleton V1
Fecha: 2026-05-02

## Estado

Este archivo todavía NO define la estrategia final.

Es el esqueleto obligatorio que debemos completar antes de pedirle a Replit/Cursor que desarrollen el motor.

## Regla

Ninguna parte de la estrategia debe quedar a criterio de Replit/Cursor.

---

# 1. Nombre de estrategia

Pendiente.

Opciones de trabajo:
- Daily Zone Reaction V1.
- Liquidity Zone Reaction V1.
- Querly Market Zones V1.

---

# 2. Mercado inicial

Primero:
- XAUUSD.

Después:
- EURUSD.
- GBPUSD.

No se mezclan settings entre símbolos.

---

# 3. Timeframes

Propuesta inicial:

- D1: dirección general.
- H4: contexto operativo.
- H1: zonas y estructura.
- M15: confirmación.
- M5: opcional, no en primera versión si complica demasiado.

---

# 4. Dirección del día

Debe responder en lenguaje simple:

- Hoy se buscan compras.
- Hoy se buscan ventas.
- Hoy no hay dirección clara.

Pendiente definir fórmula.

Opciones a evaluar:
- Estructura de máximos/mínimos D1/H4.
- Cierre respecto a rango anterior.
- EMA como filtro secundario, no señal principal.
- Precio sobre/bajo apertura diaria.
- ATR para medir si el precio está extendido.

---

# 5. Zonas

El bot no opera por punto exacto.

Opera por zonas:

- Zona de posible compra.
- Zona de posible venta.
- Zona de reacción.
- Zona de peligro.
- Zona sin operación.

Cada zona debe tener:
- Symbol.
- Timeframe origen.
- Precio desde.
- Precio hasta.
- Tipo.
- Motivo.
- Score.
- Estado.
- Invalidez.
- Expiración.

---

# 6. Cómo se calcula una zona

Pendiente definir.

No usar pips fijos universales.

Opciones:
- Basado en ATR del timeframe.
- Basado en spread promedio.
- Basado en tamaño de vela.
- Basado en swing high/low reciente.
- Basado en sesión.
- Basado en perfil por símbolo.

Ejemplo conceptual:
- ZoneWidth = max(ATR_H1 * factor, spread_avg * factor_minimo)
- No es final. Debe backtestearse.

---

# 7. Confirmación

Pendiente definir.

Una confirmación puede ser:
- Rechazo dentro de zona.
- Cierre fuera/dentro de rango.
- Cambio de estructura menor.
- Recuperación de nivel.
- Volumen/tick volume superior al promedio.
- Vela de desplazamiento.

Debe ser medible.

---

# 8. Invalidez

Cada idea debe tener invalidez clara.

Ejemplos:
- Cierre H1 por debajo de zona de compra.
- Precio rompe la zona con rango excesivo.
- Spread anormal.
- Noticia cercana.
- R:R insuficiente.
- Ya se alcanzó límite diario.
- Mercado en rango sucio.

Pendiente definir por símbolo.

---

# 9. Stop loss

No debe ser arbitrario.

Opciones:
- Detrás de zona.
- Detrás del swing.
- ATR buffer.
- Spread buffer.
- Máximo riesgo permitido.

Debe calcularse por símbolo.

---

# 10. Take profit

Opciones:
- Zona opuesta.
- Liquidez previa.
- R múltiplo fijo mínimo.
- Parcial + runner.
- TP dinámico por estructura.

Pendiente definir.

---

# 11. R:R mínimo

Propuesta inicial:
- Mínimo 1.5R.
- Ideal 2R.
- Ajustable por símbolo.
- No aceptar operaciones con recorrido insuficiente.

---

# 12. Score

El score evalúa zona + contexto, no entrada exacta.

Factores posibles:
- Dirección general clara.
- Zona relevante.
- Barrida de liquidez.
- Reacción.
- Confirmación.
- R:R.
- Spread.
- Noticias.
- Riesgo disponible.
- Calidad histórica del set.

Pendiente definir pesos.

---

# 13. Casos donde NO se opera

No operar si:
- No hay dirección clara.
- Precio está en el medio.
- Spread alto.
- Noticia cerca.
- Riesgo diario comprometido.
- R:R bajo.
- Zona vieja o inválida.
- Setup con score bajo.
- Ya hubo demasiadas operaciones.
- Trader en bloqueo psicológico.

---

# 14. Parámetros por símbolo

Ejemplo de campos:

- atr_period.
- zone_atr_factor.
- confirmation_tf.
- max_spread.
- min_rr.
- min_score_alert.
- min_score_trade.
- sl_buffer_atr.
- max_trades_day.
- allowed_sessions.
- news_blackout_minutes.

Los valores no se inventan en código.
Se definen y se validan con MT5 Strategy Tester.

---

# 15. Métricas mínimas para aprobar

Pendiente definir valores exactos.

Mínimos sugeridos:
- Cantidad suficiente de trades.
- Profit factor aceptable.
- Drawdown tolerable.
- Racha perdedora tolerable.
- Cumple reglas de fondeo simuladas.
- No depende de un solo mes.
- Resultados similares en validación.
- No sobreoptimizado.

---

# 16. Próxima tarea

Completar este Strategy Blueprint con la primera estrategia candidata para XAUUSD.

No programar motor hasta completar este archivo.
