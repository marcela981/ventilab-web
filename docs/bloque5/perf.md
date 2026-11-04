<!--
* Funcionalidad: Rendimiento antes/después del Bloque 5 (identidad de julio)
* Descripción: Medición del Monitoreo de /simulador (disposición clásica frente a la de julio), de /learn y de /teacher con 500 estudiantes, antes (master b248ab4) y después (feat/bloque5-identidad 5131946), seguidas en la misma máquina, con el mismo stack y los mismos datos: fps de repintado por canvas, fps de requestAnimationFrame, commits de React por segundo, long tasks, frames > 50 ms, hilo principal, tiempos al contenido y first load JS. Todos los números salen de los JSON de docs/bloque5/perf/. v0.1 (Bloque 5, W5-3): primera versión.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Bloque 5 (identidad de julio): rendimiento antes y después

Medido el 2026-11-04. **Antes** = `ventilab-web` `master` **`b248ab4`**, en el worktree aparte `_b5-base-web` (desacoplado,
sin commits), con la sonda de la rama copiada sin commitear. **Después** = `feat/bloque5-identidad` **`5131946`**, con la misma
sonda. Las dos corridas se hicieron seguidas (antes 04:48–05:18, después 05:20–07:34), según la fila C0 / W5-3 de las
desviaciones. Windows 11, Node 24.19, Chromium 156.0.8078.4 (Playwright, headless nuevo), DPR 1.

## Método

- web `npm run build` (`next build --webpack`) + `next start -p 3000`, un solo servidor web a la vez; backend `dist/main` en
  :4000 (`NODE_ENV=development`) y LLM falso (`scripts/e2e/fake-llm.mjs`) en :4910, los mismos en las dos corridas;
- la misma base local en las dos corridas: el seed demo y `LOAD_STUDENT_COUNT=500 npx tsx scripts/load/seed-load-data.ts` (500
  estudiantes `load-student-*`, grupo `baf96a72-0c7f-563a-a88c-d27edc4995b7`);
- Playwright `--project=perf --workers=1`;
- **/simulador** (`e2e/perf/simulator-perf.spec.ts`, el método del Bloque 1, flujo `simulador`): estudiante `estudiante01`,
  caso "Pulmón normal: postoperatorio inmediato", 5 s de calentamiento y 60 s de medición por escenario, CPU ×4 por CDP
  donde dice `cpu4`. La repetición ×8 usa la sesión de `live-x1-cpu4` y se reinicia cuando termina. `PERF_VIEWPORT=1920x1080` y
  `1280x720`;
- **/learn** (`e2e/perf/learn-perf.spec.ts` v0.3): estudiante, CPU ×4, 1 ronda de calentamiento + 5 rondas, mediana. Frío =
  contexto nuevo; caliente = segunda visita completa. Después de la visita caliente, clic en las pestañas Inicio → Mi Progreso →
  Currículo. Cada cambio se mide desde el clic hasta el primer hijo visible del panel sin un esqueleto ocupado (`aria-busy`)
  adentro;
- **/teacher** (`e2e/perf/teacher-perf.spec.ts`, el escenario del Bloque 4): docente `ana.torres` y administrador, CPU ×4,
  1920×1080, 1 + 5 rondas, mediana. Pantallas `teacher-general` (General, la de las tarjetas de vidrio) y
  `teacher-dashboard-load-group` (`/teacher?groupId=<grupo de 500>`);
- first load JS: `node scripts/perf/bundle-sizes.mjs --next <build>` sobre cada build (`before-bundle.json`, `after-bundle.json`).
  Next 16 ya no imprime los tamaños en la salida de `next build`.

Datos completos: `docs/bloque5/perf/`. Para el simulador hay un archivo por escenario:
`<before|after>-<W>x<H>-<escenario>.json`. Para /learn: `<before|after>-<W>x<H>-learn.json`. Para /teacher:
`before-teacher.json`, `after-teacher.json` y la repetición `after-r2-teacher.json`. Las comprobaciones puntuales están en
`checks-teacher.json`.

**La máquina tenía poca memoria libre** (0,7–2 GB de 11,8). Claude Code detuvo dos veces los procesos en segundo plano por
falta de memoria. La primera vez se perdió la corrida de "después" a 1920, que se rehízo completa (solo `live-x1` se conserva
de la primera tanda). La segunda vez cayó la repetición de /learn. La repetición de /teacher alcanzó a terminar. Los números
del simulador son estables entre viewports y frente al Bloque 1. Los de las cargas en frío (/learn, /teacher) tienen más
varianza: ver las rondas en los JSON.

## /simulador Monitoreo

"Antes" = disposición clásica; "después" = disposición de julio (tres columnas, tarjetas, curvas a la altura de la columna).
Curvas = canvas "Curvas de presión, flujo y volumen" (fps de repintado). Entre paréntesis va el tamaño del canvas. Los canvas
desconectados del DOM no cuentan.

| Escenario | Viewport | Curvas fps antes → después | rAF fps | Frames > 50 ms (máx ms) | Commits/s (máx en 1 s) | Long tasks | Hilo principal ms/s (script) |
|---|---|---|---|---|---|---|---|
| En vivo ×1 | 1920 | 59,26 (598×448) → **59,41** (1040×650) | 59,99 → 59,99 | 0 (17,3) → 0 (17,2) | 1,00 (1) → **1,00 (1)** | 0 → **0** | 72,6 (19,5) → 70,9 (19,3) |
| En vivo ×1 | 1280 | 59,36 (882×448) → **59,87** (448×360) | 59,98 → 59,97 | 0 (17,3) → 0 (17,6) | 1,00 (1) → **1,00 (1)** | 0 → **0** | 71,0 (19,5) → 71,6 (20,1) |
| En vivo ×1, CPU ×4 | 1920 | 59,65 → **59,69** | 59,89 → 59,95 | 1 (66,7) → **0** (33,4) | 1,00 (1) → **1,00 (1)** | 0 → **0** | 305,9 (99,1) → 213,9 (61,4) |
| En vivo ×1, CPU ×4 | 1280 | 59,70 → **59,70** | 59,91 → 59,97 | 0 (50,0) → **0** (33,3) | 1,00 (1) → **1,00 (1)** | 0 → **0** | 332,2 (104,0) → 195,4 (55,9) |
| Repetición ×8 | 1920 | 52,38 (824×448) → **51,55** (836×448) | 59,98 → 59,96 | 0 (17,3) → 0 (33,2) | 3,75 (5) → **3,77 (5)** | 0 → **0** | 87,9 (24,3) → 76,8 (22,2) |
| Repetición ×8 | 1280 | 52,53 → **51,71** | 59,98 → 59,97 | 0 (17,3) → 0 (17,1) | 3,75 (5) → **3,77 (5)** | 0 → **0** | 96,6 (26,7) → 82,7 (24,3) |
| Repetición ×8, CPU ×4 | 1920 | 58,31 → **58,11** | 59,46 → 59,57 | 1 (50,1) → **0** (33,5) | 4,03 (6) → **4,05 (6)** | 0 → **0** | 396,3 (126,5) → 295,7 (84,4) |
| Repetición ×8, CPU ×4 | 1280 | 58,34 → **57,31** | 59,48 → 59,71 | 2 (50,1) → **0** (50,0) | 4,03 (6) → **3,96 (6)** | 0 → **0** | 374,4 (118,4) → 280,9 (79,4) |

La repetición abre la consola clásica en los dos lados (D28). Su canvas solo cambia de tamaño por la piel nueva.

### Escenarios con interacción

El brief daba por hecho que estos escenarios no existían antes. **No es así para dos de ellos.** La consola clásica ya tenía
"Asesoría IA" (panel lateral) y el bucle P-V, así que `live-x1-ai-drawer` y `live-x1-loop` tienen "antes". Solo
`live-x1-adjust` es nuevo: la consola clásica no tiene "Ajustar" y el escenario se omite con ese motivo.

| Escenario | Viewport | Canvas fps antes → después | Frames > 50 ms | Commits/s (máx en 1 s) | Long tasks | Hilo principal ms/s |
|---|---|---|---|---|---|---|
| Asesoría IA abierta | 1920 | curvas 59,54 → **59,06** | 0 → 0 | 1,02 (1) → **1,02 (1)** | 0 → **0** | 76,9 → 73,6 |
| Asesoría IA abierta | 1280 | curvas 59,28 → **59,10** | 0 → 0 | 1,02 (1) → **1,02 (1)** | 0 → **0** | 76,4 → 68,9 |
| Bucle P-V | 1920 | curvas 59,32 → **58,89**; bucle 49,91 (195×256) → **49,87** (343×650) | 0 → 0 | 1,00 (1) → **1,00 (1)** | 0 → **0** | 95,6 → 76,5 |
| Bucle P-V | 1280 | curvas 59,47 → **59,01**; bucle 49,95 (290×256) → **49,92** (145×360) | 0 → 0 | 1,00 (1) → **1,00 (1)** | 0 → **0** | 87,9 → 78,3 |
| Ajustar + 10 movimientos | 1920 | — → curvas **59,63** | — → 0 (17,3) | — → **1,48 (4)** | — → **0** | — → 91,6 |
| Ajustar + 10 movimientos | 1280 | — → curvas **59,22** | — → 0 (17,1) | — → **1,48 (4)** | — → **0** | — → 91,2 |

**El bucle P-V repinta a 49,9 fps antes y después, y es por diseño.** `LoopPainter.paintLive`
(`src/shared/waveforms/loop-painter.ts`) vuelve sin dibujar si no entró ninguna muestra nueva a la ventana desde el último
cuadro (`end === this.sequence`). Las muestras llegan a 50 Hz (`DEFAULT_SAMPLE_RATE_HZ`), así que el bucle se dibuja una vez
por muestra, ~50 veces por segundo. Si repintara a 60 fps, dibujaría dos veces la misma figura. El rAF sigue a 60 fps. Las
curvas de barrido llegan a 59 porque se dibujan por tiempo, interpolando entre lotes. **No es una regresión.** Para el
criterio "≥ 50 fps por canvas", el bucle está en su techo, que es la frecuencia de datos.

**El arrastre de tarjetas no re-renderiza la consola.** Evidencia de commits: el reposo del Monitoreo hace 1 commit/s (el
snapshot de 1 Hz de la sesión). Con los 10 movimientos de teclado (asa "Mover <tarjeta>": Espacio, Flecha abajo, Espacio)
hay 1,48 commits/s: (1,48 − 1,00) × 60 s ≈ 29 commits extra, unos 3 por movimiento (tomar, mover, soltar de dnd-kit). El
máximo en un segundo es 4 (≤ 4). No hubo long tasks ni frames > 50 ms, y las curvas siguieron a 59,2–59,6 fps. La sonda
cuenta commits de la raíz, no componentes. Lo que dice qué se re-renderiza es el código: `MonitorCardsController` tiene
identidad estable (`useMonitorCardsPref` devuelve el mismo controlador por usuario) y `MonitorCards` se suscribe por su
cuenta, así que un movimiento renderiza solo las tarjetas, no el shell memoizado de `VentilatorConsole`. Si el shell se
re-renderizara, cada movimiento traería también las zonas, y el hilo principal subiría más que los +21 ms/s medidos.

## /learn

Contenido de la carga: la primera tarjeta de módulo del acordeón abierto de Currículo. Tiempos en ms; long tasks hasta
contenido + 3 s (n, máx ms). Mediana de 5 rondas.

| Viewport | Medición | Tiempo antes → después | Long tasks antes → después (n / máx) |
|---|---|---|---|
| 1920 | Carga en frío | 2220 → 2287 | 10 / 288 → 11 / 283 |
| 1920 | Carga en caliente | 802 → 919 | 4 / 140 → 4 / 155 |
| 1920 | Pestaña Inicio | 360 → 412 | **2 / 98 → 3 / 102** |
| 1920 | Pestaña Mi Progreso | 553 → 561 | 0 → 0 |
| 1920 | Volver a Currículo | 137 → 175 | 0 → 0 |
| 1280 | Carga en frío | 2170 → 2237 | 10 / 282 → 10 / 279 |
| 1280 | Carga en caliente | 815 → 924 | 3 / 148 → 3 / 158 |
| 1280 | Pestaña Inicio | 371 → 399 | **1 / 94 → 3 / 104** |
| 1280 | Pestaña Mi Progreso | 571 → 589 | 0 → 0 |
| 1280 | Volver a Currículo | 130 → 160 | 0 → 0 |

Long tasks hasta el contenido: frío 10 → 10 en los dos viewports, caliente 4 → 3 (1920) y 3 → 3 (1280), Inicio 1 → 1.

**Pestaña Inicio: una long task nueva después del contenido, en las 10 rondas de "después".** El máximo no cambia (~100 ms).
Rondas de Inicio (n / máx): antes 1920 `2/86 2/93 2/106 2/98 2/108`, después `3/102 3/99 3/102 3/106 3/104`; antes 1280
`2/163 2/97 1/86 1/88 1/94`, después `3/104 3/106 3/99 3/104 3/103`. Las peticiones son las mismas (2 chunks, ninguna API
después del contenido), y la pestaña casi no cambió en el bloque (5 líneas de `student-space.module.css`). La causa más
probable es global (ver "Causa probable común"). La carga en caliente sube ~110 ms en los dos viewports sin más long tasks.

### First load JS (gzip, KB)

| Ruta | Antes | Después | Diferencia |
|---|---|---|---|
| compartido (`_app` + main) | 204,4 | 205,0 | +0,6 |
| `/learn` | 276,2 | **280,9** | **+4,7** (presupuesto +5) |
| lector de lección | 287,5 | 292,7 | +5,2 |
| `/me` | 247,7 | 252,6 | +4,9 |
| `/simulador` | 251,4 | 256,7 | +5,3 |
| `/teacher` | 251,2 | 252,8 | +1,6 |
| `/evaluations` | 287,7 | 290,2 | +2,5 |
| `/profile` | 294,6 | 299,5 | +4,9 |
| `/auth/login` | 264,1 | 269,6 | +5,5 |

## /teacher con 500 estudiantes (1920×1080)

| Rol | Pantalla | Tiempo al contenido frío / caliente antes | Después | Long tasks hasta +3 s frío, máx antes → después | Rondas (máx, después) |
|---|---|---|---|---|---|
| Docente | Grupo de 500 (`?groupId=`) | 3431 / 1911 ms | 3446 / 2213 ms | **492 → 593 ms** | 593, 597, 600, 493, 522 |
| Docente | Grupo de 500, repetición | — | 3610 / 2175 ms | **→ 608 ms** | 608, 635, 598, 628, 496 |
| Admin | Grupo de 500 | 3532 / 1961 ms | 3588 / 2247 ms | 519 → 506 ms | 521, 498, 506, 566, 475 |
| Admin | Grupo de 500, repetición | — | 3597 / 2279 ms | → 527 ms | 497, 569, 527, 548, 466 |
| Docente | General (tarjetas de vidrio) | 2924 / 1463 ms | 2948 / 1492 ms | 280 → 266 ms | 266, 292, 262, 259, 272 |
| Admin | General | 2959 / 1463 ms | 3264 / 1851 ms | 287 → 296 ms | 296, 266, 426, 310, 266 |

**Criterio R4 (long task máx ≤ 534 ms): falla para el docente.** Da 593 ms, y 608 ms en la repetición; antes eran 492. El
admin queda en el límite (506 y 527). La tabla de 500 sigue paginada (25 filas en los dos lados). La caliente del grupo sube
~300 ms (1911 → 2213 y 2175). El código de la pestaña del grupo no cambió en el bloque: `git diff b248ab4 HEAD` en
`teacher-dashboard` solo toca General y el detalle.

### Costo del `backdrop-filter` (General)

La Ola 4 puso `backdrop-filter: blur()` en 7 contenedores de General (héroe, tarjetas de estadística, cajas). Se comprobó con
CPU ×4: 10 s de rueda sobre el contenido, con el blur tal cual y con `*{backdrop-filter:none!important}` inyectado. Tres
rondas de cada uno (`checks-teacher.json`, `blur`):

| | rAF fps | Frames > 50 ms | Long tasks | Hilo principal ms/s | Tiempo al contenido |
|---|---|---|---|---|---|
| Con blur | 60, 60, 59,9 | 0, 0, 0 (máx 32,9) | 0 | 82,9 / 80,6 / 65,2 | 3024–3373 ms |
| Sin blur | 60, 60, 60 | 0, 0, 0 (máx 17,2) | 0 | 92,2 / 76,8 / 65,0 | 3182–3407 ms |

**Sin costo medible.** Tampoco aparece en la sonda: la long task máxima de General baja o queda igual (280 → 266,
287 → 296). Dos límites de esta comprobación: General apenas desplaza a 1920 (19 px), y el blur se rasteriza en la GPU, que el
hilo principal y las long tasks no ven. El vidrio no es la causa de la regresión del grupo de 500: esa pestaña no tiene blur.

### Causa probable común (sin corregir en esta tarea)

Desglose de CDP en tres cargas en frío del grupo de 500, por lado (`checks-teacher.json`, `groupBreakdown`, ms hasta
contenido + 3 s):

| | Script | Recalc. estilo | Layout | Nodos DOM | Reglas CSS | Declaraciones `--*` |
|---|---|---|---|---|---|---|
| Antes | 2027 / 1709 / 2186 | 188 / 205 / 186 | 429 / 376 / 383 | 906 | 771 | 354 |
| Después | 2184 / 2132 / 2111 | 222 / 234 / 186 | 409 / 412 / 353 | 917 | 804 | **702** |

El DOM casi no cambia y el layout tampoco. Lo que crece es el script, unos +170 ms en promedio, y lo único que se duplica son
las propiedades personalizadas. El tema ahora declara los dos esquemas (`colorSchemes` claro y oscuro con `cssVariables`,
W1-1), y los overrides del tema usan `applyStyles("light")`. Así, cada componente MUI que se monta serializa más estilos con
emotion. Eso pesa justo donde se montan muchos componentes de una vez: la tabla y el gráfico del grupo de 500, y el panel de
Inicio. Es una hipótesis: no se perfiló con el panel Performance.

## Criterios

| Criterio | Resultado |
|---|---|
| ≥ 50 fps por canvas (/simulador) | **Cumple.** Curvas 51,6–59,9 en todos los escenarios y viewports. Bucle P-V 49,9 = techo de la frecuencia de datos (50 Hz), igual que antes |
| ≤ 4 commits/s | **Cumple**, salvo `replay-x8-cpu4` a 1920 con 4,05 (antes 4,03; Bloque 1 final 4,00): en el límite, sin cambio. El máximo en 1 s es 6 en los dos lados |
| 0 long tasks (/simulador) | **Cumple**: 0 en los 14 escenarios de "después" |
| Frames > 50 ms ≤ antes | **Cumple**: 0 en todos; antes 1–2 en los de CPU ×4 |
| El arrastre de tarjetas no re-renderiza la consola | **Cumple**: +3 commits por movimiento, máx 4/s, 0 long tasks; controlador estable |
| /learn sin long tasks nuevas | **No cumple en la pestaña Inicio**: +1 long task (~100 ms) en todas las rondas. Frío, caliente, Mi Progreso y Currículo sin long tasks nuevas |
| /learn first load ≤ antes + 5 KB gz | **Cumple**: +4,7 KB (compartido +0,6) |
| /teacher 500, long task máx ≤ 534 ms | **No cumple para el docente** (593 y 608 ms; antes 492). Admin 506 y 527 |

## Propuestas (no aplicadas)

1. **Perfilar `/teacher?groupId=<500>` y la pestaña Inicio con el panel Performance** (CPU ×4) y comparar contra `b248ab4`
   para confirmar el costo de emotion/MUI con los dos esquemas.
2. Si se confirma, **reducir el tema a un solo esquema emitido**. El claro no tiene selector (D1) y solo lo usan las islas
   `data-surface="auth"`. Se puede declarar el claro únicamente para esa isla o quitar los `applyStyles("light")` de los
   overrides globales. Eso divide por dos las variables y la serialización.
3. Para el grupo de 500, sin tocar el tema: **diferir el gráfico del grupo** (`startTransition` o montarlo tras el primer
   frame de la tabla) para partir la long task en dos.

## Comandos exactos

Rutas relativas a `ventylab/`. Backend y LLM falso como en LOCAL_STACK.

```bash
git -C ventilab-web worktree add ../_b5-base-web b248ab4          # desacoplado, sin commits
cp ventilab-web/e2e/perf/* _b5-base-web/e2e/perf/ && cp ventilab-web/e2e/support/* _b5-base-web/e2e/support/
cd _b5-base-web && npm ci && npm run build && npx next start -p 3000
# en cada lado (cwd = el repo servido), con PERF_LABEL=before|after y PERF_OUT_DIR=<ventilab-web>/docs/bloque5/perf:
PERF_FLOW=simulador PERF_VIEWPORT=1920x1080 \
  PERF_SCENARIOS=live-x1,live-x1-cpu4,replay-x8,replay-x8-cpu4,live-x1-ai-drawer,live-x1-adjust,live-x1-loop \
  npx playwright test --project=perf e2e/perf/simulator-perf.spec.ts --workers=1      # y PERF_VIEWPORT=1280x720
PERF_VIEWPORT=1920x1080 PERF_SCREENS=learn-home \
  npx playwright test --project=perf e2e/perf/learn-perf.spec.ts --workers=1          # y PERF_VIEWPORT=1280x720
PERF_ROLES=teacher,admin PERF_SCREENS=teacher-general,teacher-dashboard-load-group \
  npx playwright test --project=perf e2e/perf/teacher-perf.spec.ts --workers=1
MSYS_NO_PATHCONV=1 node scripts/perf/bundle-sizes.mjs --next <build>/.next --json <out>.json \
  /learn /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber] /me /simulador /teacher /evaluations /profile /auth/login
git -C ventilab-web worktree remove ../_b5-base-web
```

## Cambios de la sonda en este commit

- `learn-perf.spec.ts` v0.3: `PERF_VIEWPORT` (el tamaño entra en el nombre del archivo) y el cambio de pestaña de /learn
  (`PERF_LEARN_TABS`, por defecto `inicio,progreso,curriculo`).
- `perf-scenarios.ts` v0.2: `live-x1-ai-drawer` cierra el panel con Enter sobre "Asesoría IA". En la consola clásica el panel
  abierto tapa el botón e intercepta el clic: la primera corrida de "antes" se colgó ahí 5,6 min sin escribir el JSON.

## Advertencias

- Solo la sección de /learn mide `learn-home`. `learn-section` y el lector usan ids de `prisma:seed` que esta base no tiene:
  solo está "Demo · Fundamentos" (ver la fila W5-2 de las desviaciones).
- El tamaño del canvas cambia entre los dos lados: en julio las curvas toman la altura de la columna (650 px a 1920, mínimo
  360 a 1280). Los fps se comparan igual, porque el criterio es por canvas.
- En /learn, "Volver a Currículo" mide un panel que ya estaba montado: el tiempo es el del clic y la pintura.
