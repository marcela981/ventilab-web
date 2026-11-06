<!--
* Funcionalidad: Resultados medidos del frontend para el Capítulo 4
* Descripción: Resultados de los instrumentos existentes de ventilab-web (vitest, Playwright E2E, sonda de rendimiento del simulador y tamaños del bundle), ejecutados el 2026-11-05/06 contra el stack local, sin cambiar el código, con la comparación frente a las mediciones del 2026-11-04 (docs/bloque5/perf.md). Todos los números salen de los archivos crudos de esta carpeta.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Resultados medidos del frontend (Capítulo 4)

Los valores se copian tal como los escriben los instrumentos. No se redondean. Solo se cambia el punto decimal por coma.

## Entorno

| Elemento | Valor |
|---|---|
| Commit medido (`ventilab-web`) | `2fbf6743ad0aae7913477abc04434bf7f3f263c8` (`feat/cierre-ia`, 2026-11-04 14:48 −05:00, "test(e2e): cover the deterministic fallback of Profundizar") |
| Fechas | vitest y build: 2026-11-05 23:55 → 2026-11-06 00:06 (−05:00); E2E: 2026-11-06 08:05:52 → 08:19:55; rendimiento: 08:20:33 → 08:29:52; bundle: a continuación |
| SO | Microsoft Windows 11 Home Single Language 10.0.26200 (x64) |
| CPU | Intel Core i5-8300H @ 2,30 GHz, 8 hilos lógicos |
| RAM | 11,8 GB en total; 0,8 GB libres al empezar (2026-11-05 23:5x) |
| Node / npm | v24.19.0 / 12.0.2 |
| Playwright / Chromium | @playwright/test 1.64.1 / Chromium 156.0.8078.4 (`channel: "chromium"`, headless nuevo), DPR 1 |
| Resoluciones | 1920×1080 y 1280×720 (`PERF_VIEWPORT`); E2E con `Desktop Chrome` de Playwright |
| Web | `npm run build` (`next build --webpack`) + `npx next start -p 3000` |
| Backend | local: contenedor Docker `ventylab-local-backend-1` (imagen `ventylab-server:local`, creada el 2026-11-06 11:39 UTC), en `127.0.0.1:4000`, con postgres local `ventylab-local-postgres-1` en 55432. No es producción |
| Base | base local `ventylab`: **50** usuarios `load-student-*` (no 500) y 12 usuarios `@ventylab.demo` |
| LLM | `scripts/e2e/fake-llm.mjs` en 127.0.0.1:4910 (no se verificó que el backend en Docker lo alcance) |

## Paso 1. Pruebas automatizadas

### 1.1 `npm test` (vitest)

| Métrica | Valor |
|---|---|
| Archivos de prueba | 351: 350 aprobados, 1 fallido |
| Casos | 3382: 3381 aprobados, **1 fallido**, 0 omitidos, 0 pendientes |
| Tiempo | 471,35 s (vitest); 7 min 55,7 s de pared (`time`) |
| Caso fallido | `src/features/teacher-dashboard/application/pages/teacher-dashboard.page.test.tsx` › "TeacherDashboardPage shows the first group with its cards and students from the API": `Unable to find role="link" and name "Ana Gómez"` |
| Repetición de ese archivo solo | 13/13 aprobados, 12,82 s (`vitest-rerun-teacher-dashboard.log`) |
| 3 repeticiones más de ese archivo solo (2026-11-06 17:32–17:33) | 13/13, 13/13 y 13/13 aprobados; 15,83 s, 11,11 s y 9,04 s (`vitest-r2-teacher-dashboard-<1..3>.{log,json}`) |

**Intermitente.** Falló 1 vez, en la corrida completa (351 archivos, con la máquina cargada), y pasó las 4 veces que se ejecutó solo. Mecanismo probable, no comprobado: la aserción usa `findByRole` (`teacher-dashboard.page.test.tsx:186`) con el tiempo de espera por defecto de Testing Library (1000 ms; no hay `asyncUtilTimeout` configurado), y desde `9fdcbbb` la página pinta las filas en un pase diferido (`useDeferredValue`, `teacher-dashboard.page.tsx:67`), que con la CPU ocupada puede tardar más de 1 s.

Crudos: `vitest.json`, `vitest.log`, `vitest-rerun-teacher-dashboard.log`, `vitest-r2-teacher-dashboard-*.{log,json}`.

### 1.2 `npm run e2e` (Playwright), repetida en el entorno de `LOCAL_STACK.md`

Corrida del 2026-11-06 17:21:03 → 17:31:28 (−05:00). La corrida anterior, del mismo día en otro entorno, queda en el anexo A.

Entorno de esta corrida:

- Se detuvo el stack Docker `ventylab-local` (sin borrar volúmenes) y se arrancó `ventylab-server-postgres` en 55432 (`LOCAL_STACK.md` §3.1).
- Base: `prisma migrate deploy` (aplicó las migraciones pendientes), luego la secuencia de reinicio de §6: `demo:reset`, `prisma:seed`, el `UPDATE` de niveles, `demo:seed`, `seed-clinical-cases.ts` y `seed-evaluation.ts`. Todos terminaron con exit 0 (`entorno-siembra.log`).
- Backend en el host: `npm run build` y `OPENAI_BASE_URL=http://127.0.0.1:4910/v1 OPENAI_API_KEY=local node dist/main`, en :4000 (`ventylab-server` `results/cap4` `77881f8`, igual a `origin/main` más un commit de documentación).
- LLM falso: `scripts/e2e/fake-llm.mjs` en 127.0.0.1:4910.
- Web: el mismo build de la sección 1 (`2fbf674`), con `next start -p 3000`. El `buildId` servido coincide con `.next/BUILD_ID` y los 18 chunks de `/auth/login` responden 200.
- `E2E_AUTH_MAX_AGE_H=0`: las sesiones se inician de nuevo.

Comprobaciones previas (`e2e-r2-precheck.json`, 2026-11-06T22:19:46Z):

| Comprobación | Resultado |
|---|---|
| `GET /health/ready` | 200, `{"status":"ready"}` |
| Inicio de sesión `superadmin@ventylab.demo` | 200, rol `ADMIN` |
| Currículo sembrado (sección `mecanica`) | Prerequisitos (2 módulos), Nivel Principiante (6), Nivel Intermedio (6), Nivel Avanzado (8) y Demo · Fundamentos (2); sección `ventylab`: 3 niveles de 2 módulos |
| El backend alcanza al LLM falso | `POST /api/tutor/pages/12155882-…/deepen` como `estudiante01`: 200 `text/event-stream` con "**Respuesta de prueba (proveedor falso de E2E).**"; el log del LLM falso registra `stream (mode ok)` |

Resultados (`e2e-r2.json`, `e2e-r2.log`):

| Métrica | Valor |
|---|---|
| Especificaciones | 36 archivos `*.spec.ts` del proyecto `e2e`, más `support/auth.setup.ts` del proyecto `setup` |
| Casos | 54 (3 de `setup` + 51 de `e2e`) |
| Aprobados | 39 (3 de `setup` + 36 de `e2e`) |
| Fallidos | **5** |
| Omitidos | 10 (las capturas: requieren `E2E_CAPTURES=1`) |
| Tiempo | 10,4 min (622,81 s) |

Clasificación de los fallos. Las pruebas, la base y el código se revisaron solo para leer, y la evidencia está en `e2e-r2-fallos/` (contexto de la página y captura de cada fallo).

**Causa común: los dos repositorios no son de la misma época.** El servidor (`77881f8` = `origin/main`) incluye `eefab67` "feat(evaluation): hold every result until the teacher releases it" y el motor 2.0.0 (`ENGINE_VERSION = "2.0.0"`, `src/features/simulation/domain/engine/engine-version.ts:11`). La web medida (`2fbf674`) va 63 commits por detrás de `origin/master` y no tiene sus contrapartes: `b7e0799` (retención de resultados), `96ef1a8` (tipos del contrato), `c781bd0` (specs del Bloque 3 alineadas), `a2df5a1` (motor 2.0.0) y `b039cf0`. Su motor es 1.0.0 (`src/shared/sim-engine/engine/engine-version.ts:12`). Cada repositorio funciona como fue diseñado; lo que falla es la combinación.

| Especificación (aserción) | Qué muestra | Causa | Clasificación |
|---|---|---|---|
| `bloque3/quiz-feedback.spec.ts:44` (`firstCheck.ok()` = `true`) | alerta "No se encontró la evaluación o ya no tienes acceso a ella." al comprobar "Volumen corriente" | la web llama `POST /api/my-evaluations/attempts/{id}/answers/{qid}/check` (`evaluations.service.ts:24`); esa ruta no existe en el servidor (`eefab67` la eliminó) | **Entorno** (versiones desalineadas) |
| `bloque3/workshop-review.spec.ts:52` (`¡Muy bien! 🌟` visible) | la misma alerta al comprobar "Presión inspiratoria"; el intento queda `PENDING_REVIEW` sin fechas de publicación | la misma ruta `/check` eliminada | **Entorno** (versiones desalineadas) |
| `bloque4/admin-ai-ratings.spec.ts:111` (`GET …/feedback`) | 404 `evaluation.grade_feedback_not_available`; en la base, el intento está `GRADED`, con `grade_published_at` y `answers_released_at` nulos | el servidor retiene todo resultado hasta que el docente lo libera (`eefab67`); la spec de esta web no libera (la de `c781bd0` llama `releaseAttemptResults`) | **Entorno** (versiones desalineadas) |
| `bloque5/monitoreo-julio.spec.ts:110` (caja de la consola, `y` 44 → −77 a 1280×720) | aviso "Esta sesión se creó con el motor 2.0.0 y este navegador ejecuta el motor 1.0.0…" sobre la consola (~120 px); a 1920×1080 pasa | con el aviso, la consola (44 + 684,5 px) excede los 720 px; el clic en "Ver alertas detalladas" desplaza ~121 px. Que el aviso cause el desborde se deduce de la geometría de la caja y de la captura | **Entorno** (versiones del motor desalineadas) |
| `simulator-exam.spec.ts:66` ("Control del tiempo" con "Velocidad fija ×1 (examen, sin pausa)") | alerta "Examen bloqueado: … la sesión usa el motor 2.0.0 y este navegador ejecuta el motor 1.0.0" | `checkEngineVersion` bloquea un EXAMEN ante cualquier diferencia de versión (`sim-session.entity.ts:139-140`), como está diseñado | **Entorno** (versiones del motor desalineadas) |

Ninguno de los 5 se clasifica como **defecto del producto**. Tampoco son defectos de la prueba: cada spec está de acuerdo con su propio build de la web, y las versiones alineadas existen en `origin/master`.

Sobre los otros 10 fallos de la corrida anterior (anexo A):
- 4 eran el 401 del superadmin y 1 la falta del currículo; con la base sembrada según `LOCAL_STACK.md`, pasan.
- `learning-locks`, `tutor-ai`, `monitoreo-ia`, `monitoreo-orden` y `simulator-connection` también pasan en esta corrida.

### Anexo A. Corrida anterior de `npm run e2e` (2026-11-06 08:05:52 → 08:19:55, stack Docker `ventylab-local`)

Backend en Docker (`ventylab-local-backend-1`), base con 50 estudiantes de carga, sin `prisma:seed` completo, y no se verificó que el backend alcanzara al LLM falso. Crudos: `e2e.json`, `e2e.log`, `e2e-inicio.txt`.

| Métrica | Valor |
|---|---|
| Especificaciones | 36 archivos `*.spec.ts` del proyecto `e2e`, más `support/auth.setup.ts` del proyecto `setup` |
| Casos | 54 (3 de `setup` + 51 de `e2e`) |
| Aprobados | 28 (3 de `setup` + 25 de `e2e`) |
| Fallidos | **15** |
| Omitidos | 10 (las capturas: requieren `E2E_CAPTURES=1`) + 1 que no corrió (`simulator-connection` › "group leader takes control…", en serie con uno fallido) |
| Tiempo | 14,0 min (839,98 s) |

Casos fallidos (primera línea del error, de `e2e.json`):

| Especificación | Error |
|---|---|
| `bloque2/learning-locks.spec.ts` (2) | `toHaveAttribute` "locked" sobre el nivel "Nivel Intermedio" |
| `bloque2/tutor-ai.spec.ts` (3) | `Sign-in of superadmin@ventylab.demo failed (401)` |
| `bloque3/quiz-feedback.spec.ts` (1) | `expect(received).toBe(true)`: recibió `false` |
| `bloque3/student-list.spec.ts` (6) | "two Mecánica levels with modules in the seeded curriculum": se esperaba ≥ 2 |
| `bloque3/workshop-review.spec.ts` (2) | no aparece `¡Muy bien! 🌟` |
| `bloque4/admin-ai-ratings.spec.ts` (8) | `GET /api/evaluation-attempts/…/feedback → 404 evaluation.grade_feedback_not_available` |
| `bloque4/admin-users.spec.ts` (4) | `Sign-in of superadmin@ventylab.demo failed (401)` |
| `bloque4/lab-group-reservation.spec.ts` (3) | `Sign-in of superadmin@ventylab.demo failed (401)` |
| `bloque4/profile-avatar.spec.ts` (6) | `expect(received).toBe(true)`: recibió `false` |
| `bloque4/student-detail-scope.spec.ts` (7) | `Sign-in of superadmin@ventylab.demo failed (401)` |
| `bloque5/monitoreo-ia.spec.ts` | el panel "Asesoría IA" no muestra la respuesta del LLM falso (60 s) |
| `bloque5/monitoreo-julio.spec.ts` | orden de los controles a 1280×720 distinto del esperado (`toEqual`) |
| `bloque5/monitoreo-orden.spec.ts` | `Test timeout of 180000ms exceeded` |
| `simulator-connection.spec.ts` | la reserva no muestra `Reserva: Activa · N min restantes` |
| `simulator-exam.spec.ts` | falta `Velocidad fija ×1 (examen, sin pausa)` en "Control del tiempo" |

Crudos: `e2e.json`, `e2e.log`, `e2e-inicio.txt` (inicio y fin).

## Paso 2. Rendimiento de la interfaz (RNF-02 y RNF-08)

### 2.1 `npm run perf:sim` (simulador, `/simulador`)

Comando, una vez por resolución:
`PERF_FLOW=simulador PERF_VIEWPORT=<W>x<H> PERF_LABEL=cap4-<W>x<H> PERF_OUT_DIR=docs/resultados-cap4/perf PERF_SCENARIOS=live-x1,live-x1-cpu4,live-x4,replay-x8,replay-x8-cpu4 npm run perf:sim -- e2e/perf/simulator-perf.spec.ts --workers=1`.
Caso "Pulmón normal: postoperatorio inmediato", 5 s de calentamiento y 60 s de medición por escenario. La repetición ×8 se reinició 7 veces en cada corrida.

"Curvas" = el canvas "Curvas de presión, flujo y volumen", el único conectado al DOM en estos escenarios. Las tres curvas se pintan en ese mismo canvas, así que la sonda da un solo fps de pintado para las tres. "Hilo principal" = `TaskDuration` de CDP en ms por segundo (entre paréntesis, `ScriptDuration`). "Heap" = `usedJSHeapSize` al cerrar la ventana.

| Escenario | Resolución | rAF fps | Curvas fps (canvas) | Commits/s (máx en 1 s) | Tareas largas (máx ms) | Frames > 50 ms (máx ms) | Heap final MB | Hilo principal ms/s (script) |
|---|---|---|---|---|---|---|---|---|
| En vivo ×1 | 1920×1080 | 59,97 | 59,32 (1040×602) | 1 (1) | 0 (0) | 0 (17,3) | 12,9 | 66,25 (17,6) |
| En vivo ×1, CPU ×4 | 1920×1080 | 59,95 | 59,68 (1040×602) | 1 (1) | 0 (0) | 0 (33,4) | 12,9 | 332,69 (111,13) |
| En vivo ×4 | 1920×1080 | omitido: "the simulador flow starts live sessions at ×1 at most" | — | — | — | — | — | — |
| Repetición ×8 | 1920×1080 | 59,98 | 52,51 (836×448) | 3,78 (5) | 0 (0) | 0 (17,1) | 11,2 | 80,69 (23,41) |
| Repetición ×8, CPU ×4 | 1920×1080 | 59,89 | 55,18 (836×448) | 3,83 (6) | 0 (0) | 0 (33,4) | 11,5 | 382,71 (127,39) |
| En vivo ×1 | 1280×720 | 59,99 | 59,42 (448×360) | 1 (1) | 0 (0) | 0 (17) | 12,9 | 69,14 (18,49) |
| En vivo ×1, CPU ×4 | 1280×720 | 59,94 | 59,75 (448×360) | 1 (1) | 0 (0) | 0 (50) | 13,3 | 324,62 (103,26) |
| En vivo ×4 | 1280×720 | omitido (mismo motivo) | — | — | — | — | — | — |
| Repetición ×8 | 1280×720 | 58,99 | 52,78 (868×448) | 3,82 (7) | **2 (154)** | **8 (333,3)** | 11,6 | 109,68 (34,31) |
| Repetición ×8, CPU ×4 | 1280×720 | 57,81 | 52,32 (868×448) | 3,8 (5) | **4 (138)** | **9 (600,1)** | 12 | 341,09 (102,79) |

Crudos: `perf/cap4-<W>x<H>-<W>x<H>-<escenario>.json` (la sonda agrega la resolución al label, por eso aparece dos veces en el nombre) y `perf-sim.log`.

### 2.2 Comparación con el 2026-11-04 (`docs/bloque5/perf.md`)

Referencias: "después" de W5-3 (`after-*`, commit `5131946`) para los 8 escenarios, y "corregido" (`fixed-*`, commit `9fdcbbb`), que solo existe para en vivo ×1 y en vivo ×1 con CPU ×4 a 1920×1080. Se señala toda diferencia mayor al 10 % en cualquier métrica de la tabla. Cuando la referencia vale 0, se marca "base 0". Detalle completo en `perf-comparacion.json`.

| Escenario | Resolución | Métrica | 2026-11-04 | Ahora | Diferencia |
|---|---|---|---|---|---|
| En vivo ×1, CPU ×4 | 1920×1080 | hilo principal ms/s | 213,91 (after) / 225,93 (fixed) | 332,69 | +55,5 % / +47,3 % |
| En vivo ×1, CPU ×4 | 1920×1080 | script ms/s | 61,37 / 63,23 | 111,13 | +81,1 % / +75,8 % |
| En vivo ×1, CPU ×4 | 1920×1080 | frame máx ms | 50 (fixed) | 33,4 | −33,2 % |
| Repetición ×8 | 1920×1080 | frame máx ms | 33,2 | 17,1 | −48,5 % |
| Repetición ×8, CPU ×4 | 1920×1080 | heap final MB | 13,6 | 11,5 | −15,4 % |
| Repetición ×8, CPU ×4 | 1920×1080 | hilo principal ms/s | 295,65 | 382,71 | +29,4 % |
| Repetición ×8, CPU ×4 | 1920×1080 | script ms/s | 84,42 | 127,39 | +50,9 % |
| En vivo ×1, CPU ×4 | 1280×720 | frame máx ms | 33,3 | 50 | +50,2 % |
| En vivo ×1, CPU ×4 | 1280×720 | hilo principal ms/s | 195,35 | 324,62 | +66,2 % |
| En vivo ×1, CPU ×4 | 1280×720 | script ms/s | 55,87 | 103,26 | +84,8 % |
| Repetición ×8 | 1280×720 | commits máx en 1 s | 5 | 7 | +40 % |
| Repetición ×8 | 1280×720 | tareas largas | 0 | 2 (máx 154 ms) | base 0 |
| Repetición ×8 | 1280×720 | frames > 50 ms | 0 | 8 | base 0 |
| Repetición ×8 | 1280×720 | frame máx ms | 17,1 | 333,3 | +1849,1 % |
| Repetición ×8 | 1280×720 | hilo principal ms/s | 82,74 | 109,68 | +32,6 % |
| Repetición ×8 | 1280×720 | script ms/s | 24,33 | 34,31 | +41 % |
| Repetición ×8, CPU ×4 | 1280×720 | commits máx en 1 s | 6 | 5 | −16,7 % |
| Repetición ×8, CPU ×4 | 1280×720 | tareas largas | 0 | 4 (máx 138 ms) | base 0 |
| Repetición ×8, CPU ×4 | 1280×720 | frames > 50 ms | 0 | 9 | base 0 |
| Repetición ×8, CPU ×4 | 1280×720 | frame máx ms | 50 | 600,1 | +1100,2 % |
| Repetición ×8, CPU ×4 | 1280×720 | hilo principal ms/s | 280,85 | 341,09 | +21,4 % |
| Repetición ×8, CPU ×4 | 1280×720 | script ms/s | 79,43 | 102,79 | +29,4 % |

Ningún fps de rAF ni de curvas cambia más del 10 %. El que más cambia es el de la repetición ×8 con CPU ×4 a 1280×720: de 57,31 a 52,32 (−8,7 %). Los commits/s promedio tampoco cambian más del 10 %. En vivo ×1 sin estrangulamiento no tiene diferencias mayores al 10 % en ninguna resolución.

### 2.3 `npm run perf:bundle`

First load = archivos compartidos (`_app` + main + polyfills) más el JS propio de la ruta, en gzip (zlib, nivel por defecto) y sin comprimir.

Rutas por defecto del script (`bundle.json`):

| Ruta | Propio gz (KB) | First load gz (KB) | First load sin comprimir (KB) |
|---|---|---|---|
| compartido (_app + main) | — | 205 | 624,6 |
| `/simulador` | 52,6 | 257,6 | 780,7 |
| `/simulator/sessions/[sessionId]` | 138,1 | 343,1 | 1024,2 |
| `/simulator/sessions/[sessionId]/replay` | 128,8 | 333,8 | 996,1 |
| `/simulator/sessions/[sessionId]/result` | 93,9 | 298,9 | 894,6 |
| `/lab/recordings/[recordingId]` | 123 | 328 | 980,9 |
| `/simulator`, `/lab/live` | no existen en el build | — | — |

Rutas de `docs/bloque5/perf.md` (`bundle-rutas-bloque5.json`), con el valor del 2026-11-04 ("después") como referencia:

| Ruta | Propio gz (KB) | First load gz (KB) | First load sin comprimir (KB) | 2026-11-04 first load gz |
|---|---|---|---|---|
| compartido (_app + main) | — | 205 | 624,6 | 205,0 |
| `/learn` | 77,1 | 282,1 | 847,1 | 280,9 |
| lector de lección | 88,7 | 293,7 | 883,1 | 292,7 |
| `/me` | 48,6 | 253,6 | 770,1 | 252,6 |
| `/simulador` | 52,6 | 257,6 | 780,7 | 256,7 |
| `/teacher` | 48,8 | 253,8 | 770,5 | 252,8 |
| `/evaluations` | 86,2 | 291,2 | 873,3 | 290,2 |
| `/profile` | 95,5 | 300,5 | 907,8 | 299,5 |
| `/auth/login` | 64,6 | 269,6 | 810 | 269,6 |

Ninguna ruta cambia más del 10 %: la mayor diferencia es +1,2 KB.

Fragmentos más grandes de `.next/static/chunks` (262 archivos JS). Este listado no sale de `perf:bundle`, que no lista fragmentos: se calculó con un script de lectura de archivos (gzip con zlib, nivel por defecto) y está en `chunks-mayores.json`.

| Fragmento | gz (KB) | Sin comprimir (KB) |
|---|---|---|
| `2bd9703c.c3c20035af93d0ec.js` | 74,4 | 258,3 |
| `pages/_app-ac64d0664b7b7215.js` | 65,8 | 193,2 |
| `4897.213f5d356dd8d591.js` | 61,5 | 191,4 |
| `framework-d7945a8ad0653f37.js` | 58,5 | 185,3 |
| `6d2b60a9.f306c01359f84162.js` | 52,9 | 161,8 |
| `4620.98c58a9c2bf8e732.js` | 42,6 | 143,3 |
| `polyfills-42372ed130431b0a.js` | 38,7 | 110 |
| `main-64dc06e9bcad1437.js` | 36,6 | 125,5 |
| `60db774e.e99aee58e08f0db1.js` | 29,7 | 93,9 |
| `7564-59ead4d03137ccb1.js` | 27,6 | 84,1 |

Crudos: `bundle.json`, `bundle.log`, `bundle-rutas-bloque5.json`, `bundle-rutas-bloque5.log`, `chunks-mayores.json` (los 15 mayores) y `build.log`.

## Observaciones

**Fallos**

- vitest: 1 fallo de 3382 (`teacher-dashboard.page.test.tsx`), intermitente: pasa las 4 veces que se ejecuta solo (sección 1.1).
- E2E en el entorno de `LOCAL_STACK.md`: 5 fallos de 51, los 5 clasificados como entorno por versiones desalineadas entre la web y el servidor (sección 1.2). La corrida anterior (anexo A) tuvo 15.
- **Versiones desalineadas.** La web medida (`2fbf674`, motor 1.0.0) está 63 commits por detrás de `origin/master`; el servidor (`origin/main`, motor 2.0.0) incluye la retención de resultados de `eefab67`. Esto afecta a toda la sección 1 y también puede afectar a las mediciones del simulador de la sección 2: en el modo libre, la web muestra un aviso de versión del motor sobre la consola. Que ese aviso explique el alto del canvas de curvas (1040×602 ahora, 1040×650 el 2026-11-04) es una hipótesis que no se comprobó. Para resultados representativos del sistema actual, conviene repetir las mediciones con la web en `origin/master` (o en una rama que tenga `b7e0799`…`c781bd0` y `a2df5a1`/`b039cf0`) contra el servidor `main`.

**Diferencias con el montaje del 2026-11-04**

- Durante la sesión, el stack local cambió: el contenedor `ventylab-server-postgres` dejó de existir, y otra sesión levantó el stack Docker `ventylab-local`. El backend del 4 de noviembre corría en el host (`dist/main`); el de ahora corre en Docker. Un intento de arrancar `dist/main` en el host falló con `PrismaClientInitializationError: Authentication failed against database server` (P1000), así que todas las mediciones son contra el backend en Docker. La base no se modificó ni se volvió a sembrar.
- La base tiene 50 estudiantes de carga, no 500. El simulador no los usa.
- El E2E corrió antes del rendimiento, contra la misma base.
- La máquina tenía 0,8 GB de RAM libres al empezar y tenía en marcha el stack Docker completo (backend, postgres, mosquitto, node-red). El 4 de noviembre, `perf.md` registra 0,7–2 GB libres.
- Cada escenario se midió una sola vez. No hay repeticiones para separar varianza de regresión.

**No medido**

- En vivo ×4: el flujo `simulador` arranca las sesiones libres a ×1 como máximo. La sonda lo omite y no lo estima.
- Heap inicial: la sonda solo registra `usedJSHeapSize` al final de la ventana.
- fps de pintado por curva: presión, flujo y volumen se pintan en un único canvas, y la sonda da un solo valor para las tres.
- `npm run perf:sim` sin argumentos ejecuta todo el proyecto `perf` (/learn, /teacher, evaluaciones, cambio de pestaña y simulador con el flujo `legacy`). Se limitó a `simulator-perf.spec.ts` con el flujo `simulador`, que son los escenarios pedidos y el método de `perf.md`. /learn, /teacher y los escenarios con interacción no se midieron.

**Lo que no cumple la meta de ~60 fps sin tareas largas**

- Curvas en la repetición ×8: 52,51 y 55,18 fps a 1920×1080, y 52,78 y 52,32 a 1280×720. El 2026-11-04 estaban en 51,55–58,11.
- Repetición ×8 a 1280×720: 2 tareas largas (máx 154 ms) y 8 frames > 50 ms (máx 333,3 ms); rAF 58,99.
- Repetición ×8 con CPU ×4 a 1280×720: 4 tareas largas (máx 138 ms) y 9 frames > 50 ms (máx 600,1 ms); rAF 57,81.
- En vivo ×1, con y sin CPU ×4, en las dos resoluciones: rAF 59,94–59,99, curvas 59,32–59,75 y 0 tareas largas.
- Con CPU ×4, el hilo principal ocupa entre 324,62 y 382,71 ms/s, un 21–66 % más que el 2026-11-04. Con el entorno cambiado (ver arriba), estas mediciones no bastan para atribuir la diferencia al código.
