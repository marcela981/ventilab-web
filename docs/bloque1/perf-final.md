<!--
* Funcionalidad: Rendimiento final del simulador (Bloque 1)
* Descripción: Medición final del simulador unificado (/simulador) y de las rutas independientes que se conservan (/simulator/sessions/[id] y su repetición) frente al baseline previo al Bloque 1: fps de repintado de las curvas, fps de requestAnimationFrame, commits de React por segundo, long tasks, tiempo de hilo principal, tamaño de los bundles por ruta y una corrida de 60 s cambiando de pestaña. Todos los números salen de los JSON de docs/bloque1/perf/ (baseline-*, after-w4-*, final-*); lo que no se pudo medir se indica. v0.2 (W7-fix): columna de bundles después de sacar el controlador de la conexión del chunk inicial de /simulador (w7fix-bundle.json) y nota de la corrección.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Rendimiento final del simulador (Bloque 1)

Medido el 2026-10-27 sobre `fd46ac5` (= `07ca866`, último commit de producto del bloque, más los specs E2E de W12),
con `next build --webpack` + `next start` y el backend con el código nuevo (`ventylab-server` `4b45459`).
El "antes" es el baseline de `perf-baseline.md` (commit `4e759fe`, sin cambios del bloque).

## Entorno y protocolo

Es el mismo del baseline: Chromium 156.0.8078.4 (Playwright 1.64.1, headless nuevo), ventana 1920×1080, DPR 1, Windows 11.
Se usa el estudiante `estudiante01` y el caso "Pulmón normal: postoperatorio inmediato". Cada escenario tiene 5 s de
calentamiento y 60 s de medición. CPU ×4 se aplica por CDP.

Hay dos flujos (`e2e/perf/sim-flows.ts`):

- **`simulador`** (el nuevo): Simular Paciente → "Cargar caso" → "Enviar al Monitoreo" en `/simulador`. La repetición se
  abre dentro de Mis sesiones (`/simulador?tab=sesiones&replay=<id>`). Archivos `final-*.json`.
- **`legacy`**: la sesión se inicia igual y luego se abre la página independiente `/simulator/sessions/[id]`, que es la
  anfitriona del EXAM y de los enlaces directos. La repetición se abre en `/simulator/sessions/[id]/replay`. Es la misma
  ruta que se midió en el baseline. Archivos `final-legacy-*.json`.

Diferencias con el baseline que conviene tener presentes:

- **En vivo ×4 ya no se puede medir.** El formulario de Simular Paciente inicia la sesión FREE a ×1 y la velocidad
  máxima de una sesión se fija al iniciarla. El catálogo con "Velocidad del tiempo simulado" desapareció en W8.
  El escenario se omite: no se estimó.
- **La repetición ×8 usa la sesión de `live-x1-cpu4`** (unos 65 s simulados), no la de `live-x4` (unos 260 s). Por eso
  se reinicia 7 veces en la ventana, frente a 1 en el baseline. La medición intermedia `after-w4` tuvo esta misma condición.

## Antes frente a después

"Antes" = `baseline-*.json`. "Después" = `final-*.json` (flujo `simulador`). Entre paréntesis va el flujo `legacy`
(`final-legacy-*.json`), cuando aporta.

| Escenario | Curvas fps (antes → después) | rAF fps | Frames > 50 ms (máx ms) | Commits React/s (máx en 1 s) | Long tasks (n / máx ms) | Hilo principal ms/s (script) |
|---|---|---|---|---|---|---|
| En vivo ×1 | 29,74 → **59,07** (legacy 59,08) | 59,99 → 59,98 | 0 (17,1) → 0 (17,3) | 3,80 (4) → **1,00 (1)** (legacy 1,02) | 0 → 0 | 56,6 (23,4) → 70,7 (19,3) |
| En vivo ×1, CPU ×4 | 29,46 → **59,67** (legacy 59,49) | 59,84 → 59,92 | 1 (150,1) → 0 (49,9) | 3,80 (4) → **1,00 (1)** | 0 → 0 | 286,5 (124,8) → 310,1 (99,9) |
| En vivo ×4 | 29,06 → no medible | 59,45 → — | 2 (316,7) → — | 3,95 (4) → — | 0 → — | 59,4 (22,8) → — |
| Repetición ×8 | 29,56 → **52,22** (legacy 52,36) | 59,64 → 59,98 | 1 (333,5) → 0 (17,2) | 8,03 (10) → **3,78 (5)** | 0 → 0 | 84,1 (27,3) → 77,7 (22,6) |
| Repetición ×8, CPU ×4 | 28,33 → **57,82** (legacy 56,96) | 59,86 → 59,86 | 2 (50,1) → 0 (33,4) | 7,99 (9) → **4,00 (6)** (legacy 3,97) | 0 → 0 | 391,9 (144,4) → 379,8 (125,3) |

Heap JS al final de la ventana: 14,1–15,9 MB antes y 11,5–13,1 MB después (flujo `simulador`).

### Cambio de pestaña durante 60 s (`final-tab-switch.json`)

Se inicia la sesión en `/simulador` y se alterna Conexión ↔ Monitoreo cada 10 s, 6 cambios en 60 s.

| Métrica | Valor |
|---|---|
| Long tasks > 50 ms | **0** (observador `longtask` activo) |
| Frames > 50 ms (máx) | 0 (17,1 ms) |
| rAF fps | 59,98 |
| Commits React/s (máx en 1 s) | 1,25 (5): los picos coinciden con los cambios de pestaña |
| Hilo principal ms/s (script) | 55,7 (15,7) |
| Curvas fps (promedio de la ventana) | 29,67: el canvas no pinta mientras Monitoreo está oculto, que es la mitad del tiempo |
| Sesión | El mismo `?session` en los 6 cambios; el reloj simulado pasó de 0:05 a 1:05 en 60,1 s; al volver dice "Simulando" |

## Bundles (first load, gzip)

Se midieron con `node scripts/perf/bundle-sizes.mjs --json docs/bloque1/perf/final-bundle.json` sobre el mismo build.
La columna "Tras W7-fix" sale de `docs/bloque1/perf/w7fix-bundle.json`, medida con el build de la corrección (ver la
lectura).

| Ruta | Antes (baseline) | Intermedio (after-w4) | Después (final) | Tras W7-fix | Propio gz tras W7-fix |
|---|---|---|---|---|---|
| compartido (_app + main) | 203,8 | 203,9 | 204,0 | 204,0 | — |
| `/simulador` | no existía | 238,1 | 317,5 | **241,7** | 37,6 (antes 113,4) |
| `/simulator` (catálogo) | 346,3 | eliminada | eliminada (redirige a `/simulador?tab=simular`) | eliminada | — |
| `/simulator/sessions/[sessionId]` | 346,4 | 308,8 | 310,2 | **310,2** | 106,1 |
| `/simulator/sessions/[sessionId]/replay` | 346,4 | 297,8 | 299,3 | **299,2** | 95,1 |
| `/simulator/sessions/[sessionId]/result` | 346,4 | 299,6 | 301,3 | **301,3** | 97,3 |
| `/lab/live` | 326,8 | eliminada | eliminada (redirige a `/simulador?tab=monitoreo`) | eliminada | — |
| `/lab/recordings/[recordingId]` | 326,9 | 317,1 | 319,9 | 320,5 | 116,4 |

El worker de simulación (`ventylab-sim.*.js`) no cambió: pesa 27,6 KB sin comprimir y 8,9 KB gz, el mismo archivo en
ambas mediciones.

## Lectura

- **Curvas ≥ 50 fps** en todos los escenarios medibles, frente a ~29 antes. El tope de 30 fps desapareció con W3. Los
  números del flujo `simulador` y del `legacy` son prácticamente iguales: el workspace no le agrega costo de pintado a la
  consola.
- **Commits de React:** 1/s en vivo, frente a 3,8 antes. En la repetición ×8 son ~3,8–4,0/s, frente a ~8. Se cumple el
  objetivo de ≤ 4 commits/s con un caso límite: 4,00 en la repetición con CPU ×4, donde los 7 reinicios fuerzan
  publicaciones de estado. No hay commits por frame.
- **Long tasks:** 0 en todos los escenarios y en la corrida de cambio de pestaña. Ningún frame superó 50 ms en el flujo
  `simulador`. El `legacy` tuvo uno de 66,7 ms con CPU ×4.
- **Hilo principal:** en vivo sube un poco (56,6 → 70,7 ms/s; con CPU ×4, 286,5 → 310,1). El tiempo de script baja
  (23,4 → 19,3), pero el painter dibuja el doble de frames (60 en lugar de 30), lo que suma tiempo de raster y
  composición. En la repetición baja (84,1 → 77,7 y 391,9 → 379,8).
- **Bundle de `/simulador`: regresión frente a la medición intermedia (238,1 → 317,5 KB gz).** La carga inicial ahora
  incluye código que antes se cargaba en lazy. Una inspección rápida de los chunks propios de la ruta encontró:
  - axios (~20 KB gz);
  - los diálogos y popper de MUI (~9 KB gz);
  - el chunk con los textos de "Reservar ahora" (~10 KB gz).

  Todo apunta a los proveedores de W7/W10 que viven por encima de las pestañas (`LabConnectionProvider` y las entradas de
  `ventilator-lab`). Aun así, la ruta queda por debajo de los 346,4 KB que cargaba cualquier pantalla del simulador
  antes del bloque. No se corrigió en W12, porque tocaría código de producto; queda como pendiente.

  **Corregido en W7-fix: 317,5 → 241,7 KB gz** (por debajo de los 250 KB del objetivo y apenas 3,6 KB sobre after-w4).
  La causa era `LabConnectionProvider`: importaba de forma estática el controlador de la conexión, y con él la entrada
  `ventilator-lab/connection.entry` (diálogos de "Reservar ahora" y de desplazamiento con sus campos de MUI, el popper,
  los textos de reserva) y los servicios que usan la capa de peticiones con axios. Ahora el proveedor monta los
  tabs con un valor provisional (sin reserva, acciones deshabilitadas) y carga en lazy `LiveLabConnectionSource`, que
  ejecuta el controlador, publica su valor antes del pintado y muestra el modal de reserva revocada. El cliente HTTP
  compartido no cambió: axios se sigue usando, pero llega en un chunk aparte cuando el controlador hace su primera
  petición. `lab-live.lazy-boundary.test.ts` (v1.5) impide que el controlador, la entrada de conexión, `api-request` o
  axios vuelvan a entrar en el grafo estático de `/simulador`.
- **Rutas independientes:** `/simulator/sessions/[id]`, la repetición y el resultado quedan entre 299 y 310 KB gz,
  frente a 346,4 antes. Respecto de after-w4 subieron 1,4–1,7 KB.

## Qué no se midió

- En vivo ×4: no se puede alcanzar desde la UI actual (ver arriba).
- Componentes renderizados por commit y GPU real: siguen las mismas limitaciones que en `perf-baseline.md`.

## Cómo repetir

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000 npm run build && npm run start   # backend en :4000
node scripts/perf/bundle-sizes.mjs --json docs/bloque1/perf/final-bundle.json
PERF_FLOW=simulador PERF_LABEL=final npx playwright test --project=perf          # 4 escenarios + tab-switch
PERF_FLOW=legacy PERF_LABEL=final-legacy npx playwright test --project=perf e2e/perf/simulator-perf.spec.ts
```
