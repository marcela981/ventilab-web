<!--
Funcionalidad: Rendimiento de la evaluación del estudiante antes y después del Bloque 3
Descripción: Medición "antes" (master f34ec14 / main 4fcc310) y "después" (feat/bloque3-evaluacion) de las cuatro pantallas de evaluación del estudiante con el mismo protocolo (estudiante, CPU ×4, mediana de 5 rondas tras una de calentamiento, build de producción, localhost): tiempo al contenido en frío y en caliente, peticiones y profundidad hasta el contenido, long tasks, intro → reproductor, retroalimentación IA visible, autoguardado y tamaños de bundle por ruta. Los números salen de los JSON de docs/bloque3/perf/ (baseline-evaluations.json, after-evaluations.json, after-autosave-exam-evaluations.json y after-bundle.json).
Versión: 0.1
Autor: Marcela Mazo Castro
Proyecto: VentyLab
Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
Institución: Universidad del Valle
Contacto: marcela.mazo@correounivalle.edu.co
-->

# Rendimiento de la evaluación del estudiante: antes y después del Bloque 3

- **Antes:** medido el 2026-10-31 sobre `ventilab-web` `master` `f34ec14` y `ventylab-server` `main` `4fcc310`
  (worktrees temporales). JSON: `perf/baseline-evaluations.json`.
- **Después:** medido el 2026-10-31 sobre `ventilab-web` `feat/bloque3-evaluacion` (código de la app de `3bd9af1`) y
  `ventylab-server` `feat/bloque3-evaluacion` (código de `ac18f1d`). JSON: `perf/after-evaluations.json`,
  `perf/after-autosave-exam-evaluations.json` y `perf/after-bundle.json`.

## Protocolo (igual en las dos mediciones)

- Windows 11, la misma máquina, Node 24.19, Chromium 156.0.8078.4 (Playwright, canal `chromium`), 1920×1080, DPR 1.
- Web: `NEXT_PUBLIC_BACKEND_URL=http://localhost:4100 npm run build` + `npx next start -p 3100`. Backend:
  `npm run build` + `node dist/main` (`NODE_ENV=development`, puerto 4100) contra una base propia en un contenedor
  aparte (Postgres 17 en el puerto 55433), migrada y sembrada según `LOCAL_STACK.md` §3.3.
- Estudiante `estudiante01@ventylab.demo` con la sesión recién guardada (`E2E_AUTH_MAX_AGE_H=0`). Una primera corrida
  del "después" con la sesión vencida añadía `POST /api/auth/refresh` y dos `auth/me` en frío (5 llamadas,
  profundidad 4) y se descartó, igual que en el Bloque 2.
- **CPU ×4** (CDP), red de localhost sin limitar, 1 ronda de calentamiento descartada y **5 rondas**, mediana. Frío =
  contexto nuevo (caché HTTP vacía); caliente = segunda visita completa en el mismo contexto.
- Mismos selectores de "contenido útil" (la lista también acepta la lista agrupada tipo → ruta → nivel) y los mismos
  ids: quiz `45ebe14d-…` para la intro y el reproductor, intento publicado `3c56d675-…` para el resultado.
- **Cambio en el autoguardado:** en un QUIZ, la opción única ahora se **comprueba** al elegirla (`POST …/check`) y queda
  bloqueada; ya no hay `PUT`. Por eso las muestras de autoguardado del "después" se tomaron en un intento IN_PROGRESS
  de un **EXAM** de dos preguntas de opción única asignado al Grupo A (allí la opción única sigue autoguardándose con
  `PUT`), en una corrida aparte del reproductor (`PERF_SCREENS=attempt-player`). La primera corrida se hizo con
  `PERF_AUTOSAVE_SAMPLES=0`.

```bash
E2E_AUTH_MAX_AGE_H=0 E2E_BASE_URL=http://localhost:3100 PERF_BACKEND_URL=http://localhost:4100 PERF_LABEL=after \
  PERF_AUTOSAVE_SAMPLES=0 npx playwright test --project=perf e2e/perf/evaluations-perf.spec.ts
E2E_BASE_URL=http://localhost:3100 PERF_BACKEND_URL=http://localhost:4100 PERF_LABEL=after-autosave-exam \
  PERF_SCREENS=attempt-player PERF_PLAYER_EVALUATION_ID=<examen> PERF_PLAYER_ATTEMPT_ID=<intento IN_PROGRESS> \
  npx playwright test --project=perf e2e/perf/evaluations-perf.spec.ts
MSYS_NO_PATHCONV=1 node scripts/perf/bundle-sizes.mjs --json docs/bloque3/perf/after-bundle.json /evaluations \
  "/evaluations/[evaluationId]" "/evaluations/[evaluationId]/attempts/[attemptId]" "/evaluations/[evaluationId]/attempts/[attemptId]/result"
```

## Antes y después (medianas)

| Pantalla (contenido útil) | Métrica | Antes | Después |
|---|---|---|---|
| `/evaluations` (primera tarjeta) | Tiempo al contenido frío / caliente | 2234 / 897 ms | 2189 / 932 ms |
| | API hasta el contenido (oleadas), frío | 2 (2) | 2 (2) |
| | Chunks JS en frío · profundidad con chunks | 28 · 9 | **24 · 8** |
| | Long tasks hasta el contenido, frío | 8 / 1670 ms | 7 / 1680 ms |
| Intro (`Instrucciones`) | Tiempo al contenido frío / caliente | 2503 / 957 ms | 2472 / 922 ms |
| | API hasta el contenido (oleadas), frío | 3 (2) | 3 (2) |
| | Chunks JS en frío · profundidad con chunks | 38 · 14 | **33 · 14** |
| Intro → reproductor (clic) | Tiempo desde el clic | 593 ms | **506 ms** |
| | API (oleadas) | 3 (3) | 3 (3) |
| Reproductor (`Pregunta 1`) | Tiempo al contenido frío / caliente | 2662 / 975 ms | 2492 / 973 ms |
| | API hasta el contenido (oleadas), frío | 3 (2) | 3 (2) |
| | Long tasks hasta el contenido, frío | 9 / 1686 ms | 10 / 1600 ms |
| Resultado publicado (`Resultado`) | Tiempo al contenido frío / caliente | 2676 / 1061 ms | 2647 / 1133 ms |
| Resultado, feedback IA visible | Tiempo frío / caliente | 2816 / 1419 ms | **2647 / 1133 ms** |
| | API (oleadas) frío, y después del contenido | 4 (3) + `ai-ratings/mine` en la oleada 4 | **4 (3), sin `ai-ratings/mine`** |
| Autoguardado (opción única, 15 muestras) | Clic → inicio del `PUT` | 163.9 ms (QUIZ) | 170.0 ms (EXAM) |
| | Duración del `PUT` | 36.5 ms | 31.2 ms |
| | Fin del `PUT` → "Respuesta guardada" | 31.9 ms | 42.0 ms |
| | **Clic → "Respuesta guardada"** | **238.4 ms** | **245.4 ms** |

Tiempos al contenido por ronda del "después" (frío / caliente, ms): lista 2477, 2093, 2178, 2189, 2314 / 921, 989,
885, 1003, 932; intro 2502, 2545, 2472, 2317, 2281 / 884, 922, 876, 1083, 995; reproductor 2289, 2293, 2591, 2525,
2492 / 969, 973, 1058, 973, 970; resultado 2660, 2536, 2902, 2647, 2602 / 990, 1277, 996, 1133, 1170. Sin errores
HTTP en ninguna ronda.

### Tamaños de bundle (gzip, `bundle-sizes.mjs`)

| Ruta | Propio antes | Propio después | First load antes | First load después |
|---|---|---|---|---|
| `/evaluations` | 104 KB | **69.2 KB** | 308.2 KB | **273.5 KB** |
| `/evaluations/[evaluationId]` | 104 KB | **65.2 KB** | 308.3 KB | **269.5 KB** |
| `.../attempts/[attemptId]` | 104.1 KB | **95.9 KB** | 308.3 KB | **300.2 KB** |
| `.../attempts/[attemptId]/result` | 104.1 KB | **89.4 KB** | 308.3 KB | **293.7 KB** |

## Lectura

- **Bundle:** sin el barrel, cada ruta carga solo lo suyo: −35 KB gz en la lista y −39 KB en la intro; el reproductor
  y el resultado bajan menos porque traen los reproductores por tipo y el feedback.
- **Resultado:** la retroalimentación IA ya aparece **con** el resumen (2647 ms en frío, antes 2816 ms; 1133 ms en
  caliente, antes 1419 ms), porque el intento y el feedback se piden en paralelo y la valoración propia viene
  embebida: desaparece la petición `ai-ratings/mine` (antes en la oleada 4).
- **Tiempos al contenido en frío y en caliente:** dentro del ruido de la máquina (±100-150 ms entre rondas) en la
  lista, la intro y el resultado; el reproductor baja unos 170 ms en frío. El trabajo de CPU hasta el contenido (long
  tasks) no cambia de forma apreciable: lo domina el bundle compartido (`_app` + main, 204 KB gz), que el Bloque 3 no
  toca.
- **Intro → reproductor:** baja de 593 a 506 ms desde el clic, pero la sonda sigue contando 3 oleadas
  (`POST start` → `GET my-evaluations` → `GET attempt`). La invalidación ya no se espera; en localhost el
  `GET my-evaluations` termina antes de que el reproductor pida el intento, y la sonda (que cuenta como oleada siguiente
  cualquier petición que empieza después de que otra terminó) lo registra igual en serie. El objetivo "profundidad ≤ 2"
  del diseño (§2.11) se cumple en el resultado (feedback en la misma oleada que el intento, sin la oleada de la
  valoración) pero **no se puede afirmar** para intro → reproductor con esta sonda.
- **Autoguardado:** igual que antes (245 frente a 238 ms, con debounce de 150 ms), medido ahora en un EXAM. En QUIZ y
  TALLER la opción única ya no se autoguarda: se comprueba en el servidor y muestra la corrección.
