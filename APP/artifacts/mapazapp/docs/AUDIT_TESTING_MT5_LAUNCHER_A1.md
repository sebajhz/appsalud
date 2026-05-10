# Mapazapp — Auditoría inicial A1: Testing, MT5, Runtime y Launcher

Documento de **auditoría inicial A1**. Contenido conceptual reubicado desde la raíz del repo (`MAPAZAPP_AUDITORIA_TESTING_MT5_LAUNCHER.md`). Las secciones numeradas siguientes conservan el alcance detallado original.

---

## Auditoría A1 — Resumen obligatorio

### Contexto del proyecto

Mapazapp es un asistente de trading pensado para trabajar principalmente con MT5; el foco actual está en motor, evidencia, backtesting y revisión — no en ejecutar órdenes reales de forma automática.

### Objetivo de esta fase

Establecer **declaración y gobierno** sobre testing, validación, MT5, runtime, launcher y seguridad antes de nuevas implementaciones.

### Regla de seguridad

**No ejecución real automática** en el alcance descrito aquí. La ejecución automática no está habilitada ni debe inferirse desde este documento.

### Estado auditado

- **V2-15** permanece como línea base de motor inmediatamente anterior a la capa dashboard/API de evidencia.
- **V2-16 cerrado** en commit **`0082e26`** (`feat(dashboard+api): V2-16 mock engine evidence GET routes and UI summaries`).
- **API** mock existente, **solo lectura** en las rutas de evidencia acordadas; sin `POST` operativo en esos paths.
- **Dashboard** mock/evidencia existente (incl. resúmenes conservadores).
- **Core** TypeScript avanzado con suite de tests sustancial.
- **No** hay launcher único para usuario final.
- **No** hay MT5 runtime integrado (ingesta automática / live-read-only no aprobados aquí).
- **No** hay visor de conectividad real unificado para operación usuario-final.
- **No** hay aún una estrategia formal de testing global cerrada fuera de los documentos A1 que la complementan.

Este documento **no** afirma rentabilidad, **no** afirma operación real lista, **no** presenta ejecución automática como capacidad activa.

### Riesgos detectados (síntesis)

- Arranque por comandos manuales múltiples → fricción y errores humanos.
- Posible divergencia entre contratos API mock y mocks in-process del dashboard.
- OpenAPI / cliente generado pueden quedar desactualizados respecto al API mock real.
- Cobertura insuficiente aún sobre datos MT5 reales, gaps, timezone y sufijos de broker.
- Riesgo de sobreinterpretar métricas o mocks como prueba de ganancia.

### Documentos derivados (fase A1)

- `TESTING_AND_VALIDATION_STRATEGY.md`
- `USER_MANUAL_MT5_SETUP.md`
- `RUNTIME_AND_LAUNCHER_STRATEGY.md`
- `MT5_DATA_INTEGRATION.md`

### Regla principal

**Primero** testing, validación, MT5, runtime y documentación acordada; **después** implementación, solo con aprobación explícita.

---

## 1. Contexto general del proyecto

Mapazapp es un asistente/bot de trading pensado para trabajar principalmente con MT5.

El objetivo principal **no es ejecutar operaciones reales automÃ¡ticamente**, sino asistir al trader con:

- lectura de datos de mercado;
- anÃ¡lisis de contexto;
- detecciÃ³n de posibles setups;
- validaciones de riesgo;
- evidencia de cada seÃ±al;
- backtesting;
- campaÃ±as de pruebas;
- dashboard/visor;
- alertas;
- disciplina operativa;
- control de reglas de fondeo;
- registro y revisiÃ³n de resultados.

El proyecto hoy estÃ¡ mÃ¡s enfocado en el motor: estrategia, setup, validaciones, backtest, replay, evidencia y lÃ³gica para encontrar posibles entradas en el mercado.

La percepciÃ³n actual del avance es:

- aproximadamente **80% del esfuerzo actual estÃ¡ en el motor**;
- falta ordenar mejor el **testing**;
- falta fortalecer el **10% de ejecuciÃ³n/launcher/front operativo** necesario para probar y usar el sistema de forma simple;
- todavÃ­a no estÃ¡ completamente definido cÃ³mo se levanta todo el sistema desde el punto de vista del usuario final.

Esta fase no busca cambiar el foco principal del proyecto. El foco sigue siendo el motor de trading asistido, pero necesitamos una capa mÃ­nima y seria de ejecuciÃ³n, validaciÃ³n y visibilidad para poder probar el sistema correctamente.

---

## 2. Problema actual

Hoy el proyecto creciÃ³ bastante, pero todavÃ­a no tenemos una estrategia formal de pruebas.

En apps Android solemos probar mucho de forma manual y visual. En Mapazapp eso no alcanza, porque gran parte del riesgo estÃ¡ en la lÃ³gica interna:

- datos histÃ³ricos;
- lectura de MT5;
- replay;
- estrategia;
- backtesting;
- seÃ±ales;
- riesgo;
- evidencia;
- mocks;
- API;
- dashboard;
- conectividad;
- estados de mercado abierto/cerrado;
- ejecuciÃ³n del sistema.

Si una pantalla se ve bien, eso no significa que la lÃ³gica sea correcta.

AdemÃ¡s, no queremos que el usuario final tenga que ejecutar varios comandos manuales para levantar el sistema. La idea futura es que el usuario pueda abrir un Ãºnico ejecutable o launcher y que Mapazapp levante todo lo necesario.

---

## 3. Objetivo de esta fase

Crear una base formal de:

1. auditorÃ­a del estado actual del proyecto;
2. estrategia de testing;
3. pruebas humanas/manuales;
4. pruebas automÃ¡ticas;
5. integraciÃ³n con MT5;
6. histÃ³ricos y fixtures;
7. manual de usuario para MT5;
8. launcher o ejecutable Ãºnico;
9. visor de conectividad y estado del sistema;
10. reglas de seguridad para no ejecutar trades reales sin autorizaciÃ³n explÃ­cita.

Primero se debe auditar. No se debe empezar tocando cÃ³digo sin revisar el proyecto completo.

---

## 4. Primera tarea solicitada

Auditar el proyecto completo.

Leer:

- MD existentes;
- estructura de carpetas;
- mÃ³dulos actuales;
- documentaciÃ³n de arquitectura;
- backtesting;
- campaÃ±as;
- replay;
- estrategia;
- setup engine;
- validaciones;
- riesgo;
- API;
- dashboard;
- mocks;
- MT5;
- bridge;
- cualquier documentaciÃ³n o cÃ³digo relacionado con ejecuciÃ³n.

DespuÃ©s de la auditorÃ­a, crear o proponer el documento:

```txt
docs/TESTING_AND_VALIDATION_STRATEGY.md
```

TambiÃ©n proponer, si corresponde:

```txt
docs/USER_MANUAL_MT5_SETUP.md
docs/RUNTIME_AND_LAUNCHER_STRATEGY.md
docs/MT5_DATA_INTEGRATION.md
```

No implementar todavÃ­a sin aprobaciÃ³n. Primero entregar diagnÃ³stico y propuesta.

---

## 5. Estado actual de pruebas que debe relevarse

El documento debe declarar quÃ© pruebas se hacen hoy y quÃ© falta.

Relevar:

- si existen tests automÃ¡ticos;
- quÃ© comandos de test existen;
- quÃ© comandos de typecheck/build existen;
- quÃ© pruebas son manuales;
- quÃ© partes estÃ¡n sin cobertura;
- quÃ© partes crÃ­ticas no estÃ¡n protegidas;
- quÃ© riesgos existen por seguir agregando funciones sin tests;
- quÃ© mocks existen;
- quÃ© validaciones ya existen;
- quÃ© pruebas se pueden ejecutar sin MT5;
- quÃ© pruebas requieren histÃ³ricos;
- quÃ© pruebas requieren conexiÃ³n real o bridge con MT5.

---

## 6. Pruebas humanas/manuales

Definir una checklist clara de pruebas manuales.

Debe incluir, como mÃ­nimo:

- arranque del sistema;
- arranque del dashboard;
- lectura de datos disponibles;
- visualizaciÃ³n de campaÃ±as/backtests;
- validaciÃ³n de mocks;
- validaciÃ³n de estados vacÃ­os;
- validaciÃ³n de errores visibles;
- validaciÃ³n de que no exista ejecuciÃ³n real automÃ¡tica;
- revisiÃ³n manual de seÃ±ales generadas contra grÃ¡ficos de MT5;
- comparaciÃ³n de resultados contra escenarios conocidos;
- validaciÃ³n de conectividad;
- validaciÃ³n de estado de mercado abierto/cerrado;
- validaciÃ³n de Ãºltimo dato recibido;
- validaciÃ³n de sÃ­mbolo/timeframe activo;
- validaciÃ³n de modo actual del sistema: mock, histÃ³rico, live-read-only, etc.;
- validaciÃ³n de logs;
- validaciÃ³n de que el usuario pueda entender quÃ© estÃ¡ pasando sin abrir consola.

---

## 7. Pruebas automÃ¡ticas necesarias

Mientras mÃ¡s pruebas automÃ¡ticas podamos tener, mejor.

La prioridad no es probar absolutamente todo desde el primer dÃ­a, sino proteger las partes crÃ­ticas.

### 7.1 Safety / seguridad

Implementar o declarar tests para validar que:

- el sistema no ejecuta trades reales por defecto;
- cualquier adapter de ejecuciÃ³n estÃ¡ bloqueado o mockeado salvo configuraciÃ³n explÃ­cita;
- una seÃ±al asistida no puede convertirse en orden real sin autorizaciÃ³n explÃ­cita;
- si falta configuraciÃ³n de riesgo, el sistema bloquea;
- si faltan datos, no genera seÃ±al vÃ¡lida;
- si los datos son invÃ¡lidos, falla de forma segura;
- si MT5 no estÃ¡ disponible, el sistema no inventa datos;
- si el mercado estÃ¡ cerrado, el sistema lo informa correctamente;
- el modo live-read-only no ejecuta operaciones;
- cualquier futura ejecuciÃ³n real debe requerir controles adicionales, confirmaciÃ³n explÃ­cita y documentaciÃ³n separada.

### 7.2 Datos histÃ³ricos / MT5

Implementar o declarar tests para validar:

- formato de histÃ³ricos exportados desde MT5;
- columnas requeridas;
- timestamps vÃ¡lidos;
- fechas ordenadas;
- timestamps duplicados;
- gaps o faltantes;
- timezone o normalizaciÃ³n horaria;
- sÃ­mbolo correcto;
- timeframe correcto;
- ausencia de datos futuros usados por error;
- manejo de broker suffixes como XAUUSD.m, XAUUSD.raw, GOLD, etc.;
- lectura de vela cerrada vs vela actual en formaciÃ³n.

### 7.3 Replay / backtesting

Implementar o declarar tests para validar:

- misma entrada produce mismo resultado;
- el resultado no depende de la hora actual salvo que el tiempo estÃ© inyectado o mockeado;
- las mÃ©tricas no devuelven NaN;
- los resultados son consistentes;
- el backtest incluye evidencia/snapshot estable;
- no hay lookahead bias;
- se pueden probar escenarios simples conocidos;
- cada campaÃ±a puede reproducirse con los mismos parÃ¡metros.

### 7.4 Estrategia / seÃ±ales

Implementar o declarar tests para:

- caso positivo: escenario donde debe detectar setup;
- caso negativo: escenario donde no debe detectar nada;
- caso de datos insuficientes;
- caso de datos corruptos o incompletos;
- caso de seÃ±al repetida o anti-spam;
- validaciÃ³n de reasons/evidence;
- validaciÃ³n de setup score, si existe;
- validaciÃ³n de invalidez por riesgo;
- validaciÃ³n de invalidez por contexto de mercado.

### 7.5 Riesgo

Implementar o declarar tests para:

- cÃ¡lculo de riesgo;
- bloqueo por configuraciÃ³n ausente;
- lÃ­mites diarios/semanales, si existen;
- modo fondeo, si existe;
- mÃ¡ximo drawdown permitido;
- tamaÃ±o de posiciÃ³n, si aplica;
- reglas de no operar;
- bloqueo de seÃ±al accionable si viola reglas de riesgo.

### 7.6 API / dashboard

Implementar o declarar tests para:

- endpoints principales;
- mocks;
- estados vacÃ­os;
- errores controlados;
- health checks;
- modo histÃ³rico;
- modo mock;
- estado de MT5/bridge;
- Ãºltimo dato leÃ­do;
- sÃ­mbolo activo;
- timeframe activo;
- mercado abierto/cerrado;
- estado de seguridad: execution disabled.

---

## 8. HistÃ³ricos MT5

Necesitamos dejar declarado cÃ³mo se van a descargar/exportar histÃ³ricos desde MT5 y cÃ³mo se van a guardar dentro del proyecto.

El documento debe definir:

- sÃ­mbolos iniciales;
- timeframes iniciales;
- rango de fechas recomendado;
- formato esperado;
- nombre de archivos;
- carpeta destino;
- quÃ© archivos se pueden commitear;
- quÃ© archivos grandes deben quedar fuera del repo;
- cÃ³mo documentar el origen de cada histÃ³rico;
- cÃ³mo diferenciar fixtures pequeÃ±os de histÃ³ricos grandes.

Propuesta inicial de carpetas, ajustable segÃºn la estructura real:

```txt
data/mt5-history/
fixtures/mt5/
docs/data-samples/
```

Ejemplo de convenciÃ³n de nombres:

```txt
XAUUSD_M15_2024-01-01_2024-12-31.csv
XAUUSD_H1_2024-01-01_2024-12-31.csv
XAUUSD_D1_2024-01-01_2024-12-31.csv
```

La convenciÃ³n final debe ajustarse a lo que ya tenga el proyecto.

---

## 9. IntegraciÃ³n MT5: grÃ¡fico asociado y datos leÃ­dos

TambiÃ©n necesitamos dejar declarado cÃ³mo Mapazapp se conecta o se asocia con MT5.

El documento debe responder claramente:

### 9.1 AsociaciÃ³n con grÃ¡fico MT5

- Â¿Mapazapp se asocia a un grÃ¡fico especÃ­fico de MT5?
- Â¿El bridge/EA/script se coloca sobre un grÃ¡fico?
- Â¿A quÃ© sÃ­mbolo debe estar asociado inicialmente?
- Â¿A quÃ© timeframe debe estar asociado?
- Si el usuario cambia de grÃ¡fico, sÃ­mbolo o timeframe, Â¿afecta al sistema?
- Â¿El sistema lee solo el grÃ¡fico donde estÃ¡ cargado o puede leer varios sÃ­mbolos/timeframes?
- Â¿Necesita que el sÃ­mbolo estÃ© visible en Market Watch?
- Â¿QuÃ© pasa si el broker usa sufijos en sÃ­mbolos, por ejemplo XAUUSD.m, XAUUSD.raw, GOLD, etc.?
- Â¿QuÃ© zona horaria usa MT5 y cÃ³mo se normaliza internamente?
- Â¿Se leerÃ¡n velas cerradas solamente o tambiÃ©n la vela actual en formaciÃ³n?

### 9.2 Datos que va a leer desde MT5

Dejar declarado quÃ© datos lee Mapazapp:

- OHLC candles: open, high, low, close;
- volumen o tick volume;
- spread, si aplica;
- bid/ask, si aplica;
- sÃ­mbolo;
- timeframe;
- timestamp;
- estado de conexiÃ³n;
- cuenta demo/live, si corresponde;
- balance/equity/margin solo si se decide usarlo para control de riesgo;
- posiciones abiertas solo si se decide usarlo para control o auditorÃ­a;
- histÃ³ricos exportados desde MT5 para backtesting;
- datos live o semi-live para monitoreo/asistencia.

Mapazapp debe quedar declarado como asistente de anÃ¡lisis y control. No debe ejecutar operaciones reales automÃ¡ticamente salvo que en una fase futura se autorice explÃ­citamente y quede documentado con controles de seguridad.

---

## 10. Manual de usuario MT5

Crear o proponer un documento de usuario:

```txt
docs/USER_MANUAL_MT5_SETUP.md
```

Ese manual debe explicar:

1. quÃ© debe tener instalado el usuario;
2. cÃ³mo abrir MT5;
3. cÃ³mo seleccionar el sÃ­mbolo correcto;
4. cÃ³mo verificar el nombre real del sÃ­mbolo del broker;
5. cÃ³mo descargar/exportar histÃ³ricos;
6. quÃ© timeframes iniciales se recomiendan;
7. dÃ³nde guardar los CSV/histÃ³ricos;
8. cÃ³mo iniciar Mapazapp;
9. cÃ³mo verificar que Mapazapp estÃ¡ leyendo datos;
10. cÃ³mo verificar el estado del mercado;
11. cÃ³mo verificar el Ãºltimo dato leÃ­do;
12. cÃ³mo confirmar que el sistema estÃ¡ en modo seguro/no ejecuciÃ³n;
13. quÃ© errores comunes pueden aparecer;
14. quÃ© no debe hacer el usuario.

Debe incluir una secciÃ³n clara:

```txt
Mapazapp no ejecuta operaciones reales automÃ¡ticamente en esta versiÃ³n.
```

---

## 11. EjecuciÃ³n del sistema / launcher Ãºnico

No queremos que el usuario tenga que levantar el sistema con varios comandos manuales.

El objetivo es declarar e implementar progresivamente una forma centralizada de ejecuciÃ³n.

La idea esperada para usuario final es un Ãºnico ejecutable o launcher, por ejemplo:

```txt
Mapazapp.exe
```

o:

```txt
MapazappLauncher.exe
```

Ese launcher deberÃ­a encargarse de:

- levantar Mapazapp;
- levantar API server;
- levantar dashboard o abrirlo en el navegador;
- verificar configuraciÃ³n;
- verificar carpetas necesarias;
- verificar puertos;
- verificar logs;
- verificar disponibilidad de MT5;
- levantar MT5 si estÃ¡ configurada la ruta del ejecutable;
- asociar o validar la carpeta de integraciÃ³n con MT5;
- validar que el bridge/EA/script de extracciÃ³n de datos estÃ© disponible;
- inicializar servicios necesarios;
- mostrar errores claros;
- evitar mÃºltiples instancias duplicadas;
- permitir cierre ordenado del sistema.

---

## 12. MT5 debe levantarse desde el sistema

Debe quedar declarado que, en la versiÃ³n orientada a usuario, Mapazapp no deberÃ­a depender de que el usuario ejecute todo manualmente.

Objetivo futuro:

- el usuario ejecuta un solo launcher;
- el launcher detecta o abre MT5;
- el launcher usa la ruta configurada de MT5 terminal;
- el launcher valida la carpeta asociada a MT5;
- el sistema valida que el mecanismo de extracciÃ³n de datos estÃ© disponible;
- el bot empieza a leer datos automÃ¡ticamente segÃºn configuraciÃ³n;
- el usuario no tiene que ejecutar comandos separados;
- el usuario no tiene que abrir consola para saber si estÃ¡ funcionando.

Debe quedar definido quÃ© informaciÃ³n de configuraciÃ³n se necesita, por ejemplo:

```txt
MT5 terminal path
MT5 data folder
MT5 bridge folder
symbol mapping
default symbol
default timeframe
history folder
logs folder
runtime mode
```

Ejemplo conceptual:

```txt
mt5TerminalPath=C:\Program Files\MetaTrader 5\terminal64.exe
mt5DataFolder=C:\Users\<user>\AppData\Roaming\MetaQuotes\Terminal\<terminal-id>\MQL5\Files
mapazappBridgeFolder=<project-or-user-data-folder>\mt5-bridge
defaultSymbol=XAUUSD
defaultTimeframe=M15
runtimeMode=live-read-only
executionEnabled=false
```

La ubicaciÃ³n real debe definirse luego de auditar el proyecto.

---

## 13. Modo desarrollo vs modo usuario

Separar claramente:

### 13.1 Modo desarrollo

Puede usar comandos como:

```txt
pnpm dev
pnpm test
pnpm typecheck
```

o los comandos reales que ya tenga el proyecto.

Este modo es para desarrollo, debugging y Cursor.

### 13.2 Modo usuario

Debe usar un Ãºnico launcher o ejecutable.

El usuario no deberÃ­a necesitar conocer comandos internos.

El launcher debe ser responsable de levantar o validar todo lo necesario.

---

## 14. Visor mÃ­nimo de conectividad / runtime status

Como todavÃ­a el front operativo no estÃ¡ tan desarrollado, necesitamos definir un visor mÃ­nimo para poder probar el sistema.

Este visor no tiene que ser perfecto ni final, pero sÃ­ debe permitir saber si el sistema estÃ¡ funcionando.

Debe mostrar, como mÃ­nimo:

- API activa o caÃ­da;
- dashboard activo;
- modo actual: mock, histÃ³rico, live-read-only, etc.;
- MT5 detectado o no detectado;
- MT5 abierto o cerrado;
- bridge disponible o no disponible;
- carpeta MT5 configurada;
- Ãºltimo archivo/dato leÃ­do;
- timestamp del Ãºltimo candle;
- sÃ­mbolo activo;
- timeframe activo;
- mercado abierto/cerrado/desconocido;
- cantidad de candles disponibles;
- Ãºltimo error;
- estado de seguridad: execution disabled;
- logs recientes;
- botÃ³n o acciÃ³n para refrescar estado, si aplica.

Este visor es importante para poder probar el motor a medida que se hacen cambios.

---

## 15. Health checks necesarios

El sistema deberÃ­a exponer o calcular health checks como:

- API health;
- dashboard health;
- data source health;
- MT5 terminal health;
- bridge health;
- history data health;
- strategy engine health;
- risk engine health;
- execution safety health.

Ejemplo conceptual de estado:

```json
{
  "api": "ok",
  "dashboard": "ok",
  "runtimeMode": "live-read-only",
  "mt5": "detected",
  "bridge": "connected",
  "symbol": "XAUUSD",
  "timeframe": "M15",
  "lastCandleTime": "2026-05-09T10:45:00Z",
  "marketStatus": "open",
  "executionEnabled": false,
  "lastError": null
}
```

Esto es solo un ejemplo. La implementaciÃ³n real debe ajustarse al proyecto.

---

## 16. ConfiguraciÃ³n

Definir dÃ³nde vive la configuraciÃ³n:

- archivo `.env`;
- archivo `config.json`;
- carpeta local de usuario;
- base de datos local;
- configuraciÃ³n desde dashboard en una fase futura.

El launcher debe validar que la configuraciÃ³n mÃ­nima exista antes de iniciar.

Debe definirse quÃ© pasa si falta configuraciÃ³n:

- no debe fallar silenciosamente;
- debe mostrar error claro;
- debe explicar quÃ© falta;
- debe mantener execution disabled;
- debe permitir seguir en modo mock/histÃ³rico si corresponde.

---

## 17. Logs

Definir carpeta de logs, por ejemplo:

```txt
logs/
data/logs/
.mapazapp/logs/
```

La ubicaciÃ³n final debe ajustarse al proyecto.

Logs mÃ­nimos:

- inicio del sistema;
- servicios levantados;
- puerto usado;
- errores de API;
- errores de dashboard;
- errores de lectura MT5;
- errores de datos histÃ³ricos;
- estado de bridge;
- estado de mercado;
- estado de seguridad/no ejecuciÃ³n;
- cierre del sistema.

---

## 18. Reglas de seguridad para cambios

Antes de tocar cÃ³digo:

- revisar `git status`;
- no modificar archivos si hay cambios sin guardar sin avisar;
- no hacer refactors grandes;
- no reescribir archivos completos salvo necesidad justificada;
- no cambiar arquitectura sin autorizaciÃ³n;
- no agregar dependencias nuevas salvo necesidad real;
- primero informar archivos que se planea tocar;
- despuÃ©s de cualquier cambio, informar archivos modificados, comandos corridos, resultados y riesgos.

Si se detecta que un archivo fue vaciado, eliminado o reescrito de forma inesperada, se debe frenar inmediatamente y avisar.

---

## 19. Plan de implementaciÃ³n propuesto

DespuÃ©s de la auditorÃ­a, proponer una implementaciÃ³n por fases.

### Fase A â€” AuditorÃ­a y documentaciÃ³n

- Leer MD actuales.
- Mapear estructura real.
- Identificar mÃ³dulos crÃ­ticos.
- Identificar comandos existentes.
- Identificar pruebas actuales.
- Crear/proponer MDs de testing, MT5, launcher y manual.

### Fase B â€” Fixtures mÃ­nimos

- Definir carpeta oficial.
- Agregar muestras pequeÃ±as de histÃ³ricos.
- Documentar origen.
- Validar formato.

### Fase C â€” Tests de seguridad

- Execution disabled por defecto.
- No live trading automÃ¡tico.
- Bloqueo por riesgo/configuraciÃ³n faltante.
- Datos invÃ¡lidos no generan seÃ±al accionable.

### Fase D â€” Tests de datos MT5

- Columnas.
- Orden temporal.
- Duplicados.
- Gaps.
- Timeframe.
- SÃ­mbolo.

### Fase E â€” Tests de replay/backtest

- Determinismo.
- Sin dependencia de hora actual.
- MÃ©tricas consistentes.
- Evidencia estable.

### Fase F â€” Tests de estrategia/seÃ±ales

- Caso positivo.
- Caso negativo.
- Datos insuficientes.
- SeÃ±al repetida.
- Evidence/reasons.

### Fase G â€” Launcher MVP

- Auditar cÃ³mo se levanta hoy.
- Definir launcher mÃ­nimo.
- Validar configuraciÃ³n.
- Levantar API/dashboard.
- Abrir dashboard.
- Preparar integraciÃ³n con MT5.
- Mostrar errores claros.

### Fase H â€” Visor de conectividad

- API status.
- MT5 status.
- Bridge status.
- Ãšltimo dato leÃ­do.
- Mercado abierto/cerrado.
- Modo actual.
- Execution disabled.

---

## 20. Entregable esperado de esta primera etapa

Primero entregar una respuesta de auditorÃ­a con:

- quÃ© MD existen y quÃ© dicen sobre testing/riesgo/backtesting;
- quÃ© estructura actual tiene el proyecto;
- quÃ© mÃ³dulos parecen crÃ­ticos;
- quÃ© pruebas existen hoy;
- quÃ© pruebas faltan;
- quÃ© archivos se deberÃ­an crear o modificar;
- quÃ© comando de validaciÃ³n existe hoy;
- cÃ³mo se levanta actualmente el sistema;
- quÃ© falta para tener un launcher Ãºnico;
- quÃ© falta para integrar correctamente MT5;
- quÃ© falta para tener visor de conectividad;
- quÃ© riesgos hay antes de seguir creciendo el bot.

No implementar todavÃ­a hasta que se apruebe el plan.

---

## 21. Regla principal de esta fase

Primero auditorÃ­a y declaraciÃ³n.

DespuÃ©s implementaciÃ³n.

No avanzar con mÃ¡s lÃ³gica sensible de trading sin dejar definida una estrategia mÃ­nima de pruebas, datos, MT5, launcher y validaciÃ³n.

---

## 22. Frase guÃ­a del proyecto en esta etapa

Mapazapp debe poder analizar, probar y mostrar evidencia de posibles entradas de mercado de forma segura, reproducible y entendible para el usuario, sin ejecutar operaciones reales automÃ¡ticamente y sin depender de comandos manuales frÃ¡giles para levantar el sistema.
