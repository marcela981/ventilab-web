<!--
* Funcionalidad: Baseline de rendimiento del simulador (Bloque 1)
* Descripción: Medición del simulador actual (/simulator/sessions/[id] y su repetición) antes de cualquier cambio del Bloque 1: fps de repintado de las curvas, fps de requestAnimationFrame, commits de React por segundo, long tasks, tiempo de hilo principal y tamaño de los bundles por ruta. Todos los números salen de los JSON de docs/bloque1/perf/ (Playwright + build de producción); los que no se pudieron medir se indican. v0.2: medición intermedia después de W2–W4 (store externo, curvas por tiempo, barrel dividido).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Baseline de rendimiento del simulador (antes del Bloque 1)

Medido el 2026-10-26 sobre el commit `4e759fe` (rama `feat/bloque1-simulador-unificado`, sin cambios del bloque),
con `next build --webpack` + `next start` (React en modo producción: `bundleType = 0`) contra el backend local.

## Entorno

- Chromium 156.0.8078.4 (Playwright 1.64.1, canal `chromium`, headless nuevo), ventana 1920×1080, DPR 1. Windows 11.
- Estudiante `estudiante01` de la semilla demo; caso **"Pulmón normal: postoperatorio inmediato"** (`engine-normal-lung`), sesión FREE.
- Por escenario: 5 s de calentamiento y **60 s de medición**. CPU ×4 con `Emulation.setCPUThrottlingRate` (CDP).
- El modo en vivo solo ofrece ×1, ×2 y ×4 (no hay ×8); el ×8 se mide en la **repetición** (velocidades locales ×1–×8).
  La repetición usa la sesión de `live-x4` ya finalizada y vuelve a empezar al llegar al final (1 reinicio por corrida).

## Resultados

| Escenario | Curvas: fps de repintado | rAF fps | Frames > 50 ms (máx ms) | Commits React/s (máx en 1 s) | Long tasks (n / máx ms) | Hilo principal ms/s (script) |
|---|---|---|---|---|---|---|
| En vivo ×1 | 29,74 | 59,99 | 0 (17,1) | 3,80 (4) | 0 / — | 56,6 (23,4) |
| En vivo ×1, CPU ×4 | 29,46 | 59,84 | 1 (150,1) | 3,80 (4) | 0 / — | 286,5 (124,8) |
| En vivo ×4 | 29,06 | 59,45 | 2 (316,7) | 3,95 (4) | 0 / — | 59,4 (22,8) |
| Repetición ×8 | 29,56 | 59,64 | 1 (333,5) | 8,03 (10) | 0 / — | 84,1 (27,3) |
| Repetición ×8, CPU ×4 | 28,33 | 59,86 | 2 (50,1) | 7,99 (9) | 0 / — | 391,9 (144,4) |

Lectura:

- **Curvas:** un solo canvas ("Curvas de presión, flujo y volumen") repinta a ~29–30 fps en todos los escenarios: es el
  tope fijo `DEFAULT_WAVEFORM_FPS = 30` del renderer, no una saturación. Con CPU ×4 apenas baja (28,3).
- **rAF:** el navegador mantiene ~60 fps; los pocos frames > 50 ms son aislados (máx. 333 ms en una corrida).
- **React:** ~4 commits/s en vivo (el `setRuntime` a 4 Hz) y ~8 commits/s en la repetición ×8, con picos de 10 en un segundo.
  El contador cuenta commits, no componentes renderizados por commit.
- **Long tasks:** ninguna tarea > 50 ms en la ventana medida, ni siquiera con CPU ×4 (el observador `longtask` estaba activo).
  Con CPU ×4 el hilo principal está ocupado ~29 % (en vivo) y ~39 % (repetición) del tiempo.
- **Heap JS** al final de la ventana: 14,1–15,9 MB.
- **Diseño:** a 1440×900 la columna de curvas queda con ancho ~0 y el canvas no se ve; a 1920×1080 mide 478 px de ancho
  en vivo (844 px en la repetición). Por eso la medición usa 1920×1080.

## Bundles (first load, gzip)

`node scripts/perf/bundle-sizes.mjs` sobre el mismo build (`baseline-bundle.json`).

| Ruta | Propio gz (KB) | First load gz (KB) | First load sin comprimir (KB) |
|---|---|---|---|
| compartido (_app + main) | — | 203,8 | 620,9 |
| `/simulator` | 142,5 | 346,3 | 1044,7 |
| `/simulator/sessions/[sessionId]` | 142,6 | 346,4 | 1044,8 |
| `/simulator/sessions/[sessionId]/replay` | 142,6 | 346,4 | 1044,8 |
| `/simulator/sessions/[sessionId]/result` | 142,6 | 346,4 | 1044,8 |
| `/lab/live` | 123,0 | 326,8 | 986,6 |
| `/lab/recordings/[recordingId]` | 123,1 | 326,9 | 986,8 |
| `/simulador` | no existe todavía | — | — |

Worker de simulación (`ventylab-sim.*.js`, capturado en ejecución): 27,6 KB sin comprimir, **8,9 KB gz**.

## Qué no se midió

- Componentes renderizados por commit (solo se cuentan commits). Para eso haría falta un `<Profiler>` o recorrer el árbol de fibras, que distorsionaría la medición.
- GPU real: Chromium headless pinta el canvas por software; los fps de rAF/curvas pueden diferir de un navegador con GPU.

## Cómo repetir (y medir el "después")

```bash
npm run build && npm run start          # backend en :4000, ver docs del stack local
npm run perf:sim                         # escribe docs/bloque1/perf/baseline-*.json
node scripts/perf/perf-table.mjs baseline
node scripts/perf/bundle-sizes.mjs --json docs/bloque1/perf/baseline-bundle.json
```

Variables: `PERF_LABEL` (prefijo de los archivos), `PERF_FLOW` (flujo registrado en `e2e/perf/sim-flows.ts`; hoy `legacy`),
`PERF_SCENARIOS`, `PERF_DURATION_S`, `PERF_WARMUP_S`, `PERF_CASE_TITLE`, `PERF_REPLAY_SESSION_ID`, `PERF_OUT_DIR`, `E2E_BASE_URL`.
Para `/simulador` se registra un flujo nuevo con el mismo contrato y se corre `PERF_FLOW=<flujo> PERF_LABEL=after npm run perf:sim`;
la instrumentación (`e2e/perf/perf-probe.ts`) es la misma.

## Medición intermedia después de W2–W4

Medido el 2026-10-27 con el mismo entorno y protocolo (Chromium 156, 1920×1080, 5 s de calentamiento + 60 s, mismo caso,
flujo `legacy` sobre `/simulator/sessions/[id]`), sobre un build de producción del árbol de trabajo de W4 (los JSON
registran `webCommit: 9bc3f08`, que es W3: el build incluía los cambios de W4 todavía sin commitear). Archivos:
`docs/bloque1/perf/after-w4-*.json`. El flujo `legacy` abre ahora el catálogo en `/simulador?tab=simular` (W1 movió el catálogo).

| Escenario | Curvas: fps de repintado | rAF fps | Frames > 50 ms (máx ms) | Commits React/s (máx en 1 s) | Long tasks | Hilo principal ms/s (script) |
|---|---|---|---|---|---|---|
| En vivo ×1 | **59,23** (antes 29,74) | 59,99 | 0 (17,1) | **1,00 (1)** (antes 3,80) | 0 | 67,3 (19,1) |
| En vivo ×1, CPU ×4 | **59,71** (antes 29,46) | 59,98 | 0 (17,0) | **1,00 (2)** (antes 3,80) | 0 | 295,0 (103,1) |
| Repetición ×8 | **52,19** (antes 29,56) | 59,97 | 0 (17,1) | **3,75 (5)** (antes 8,03) | 0 | 79,3 (23,5) |
| Repetición ×8, CPU ×4 | **57,98** (antes 28,33) | 59,83 | 1 (83,2) | **4,03 (6)** (antes 7,99) | 0 | 373,2 (130,9) |

Bundles (`after-w4-bundle.json`, gzip):

| Ruta | Propio gz (KB) | First load gz (KB) | Antes (first load gz) |
|---|---|---|---|
| compartido (_app + main) | — | 203,9 | 203,8 |
| `/simulador` | 34,3 | **238,1** | no existía |
| `/simulator/sessions/[sessionId]` | 104,9 | **308,8** | 346,4 |
| `/simulator/sessions/[sessionId]/replay` | 93,9 | **297,8** | 346,4 |
| `/simulator/sessions/[sessionId]/result` | 95,7 | **299,6** | 346,4 |
| `/lab/recordings/[recordingId]` | 113,2 | 317,1 | 326,9 |

Lectura:

- **Curvas ≥ 50 fps** en los cuatro escenarios: el painter dibuja por tiempo a la frecuencia del monitor (sin el tope de
  30 fps) con un retardo de reproducción de 50 ms. La repetición ×8 sin limitar CPU queda en 52 fps: a ×8 cada frame
  dibuja 8 veces más muestras y, probablemente, algunos frames no avanzan mientras el reloj vuelve a aprender la
  velocidad tras cada reinicio de la repetición (no se midió por separado).
- **Commits de React:** en vivo baja de 3,8 a 1 por segundo (solo el reloj, que se muestra en segundos enteros; las
  métricas y alarmas re-renderizan solo su zona dentro del mismo commit). En la repetición ×8 baja de ~8 a ~4: el
  throttle de 250 ms ya se aplica a `batch.metrics`. El 4,03 con CPU ×4 supera por poco el objetivo (≤ 4) por las
  publicaciones forzadas de cambio de estado en cada reinicio de la repetición (7 reinicios en la ventana).
- **0 commits por frame** y **0 long tasks > 50 ms** en todos los escenarios.
- **Bundle:** las rutas de sesión, repetición y resultado ya no comparten el mismo conjunto de chunks (puntos de entrada
  por área en lugar del barrel); `/simulador` carga el catálogo y las páginas del laboratorio en lazy desde sus entradas.
- No se midió `live-x4` en esta pasada intermedia.

