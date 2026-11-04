# Bloque 4 (Panel docente, administración y perfil): baseline de rendimiento ANTES

Medido el 2026-11-03 sobre `ventilab-web` `origin/master` **`5ed38bc`** (+ la sonda, commit **`bb4523b`** en `b4/ola0`) y
`ventylab-server` `origin/main` **`f3b733b`** (+ el seed de carga parametrizado, commit **`fc3882e`** en `b4/ola0`), ambos con
el Bloque 3 ya mergeado. Worktrees `_b4-base-web` y `_b4-base-server`. Windows 11, Node 24.19, npm 12.0, Chromium 156.0.8078.4
(Playwright, headless nuevo).

## Método

El del Bloque 2 (igual que el baseline del Bloque 3):

- web `next build` + `next start` (puerto 3100); backend `npm run build` + `npm run start:prod` (puerto 4100, `NODE_ENV=development`);
- CPU ×4 (CDP `Emulation.setCPUThrottlingRate`), red localhost sin throttling, 1920×1080;
- 1 ronda de calentamiento descartada + **5 rondas, mediana**. Frío = contexto nuevo (caché HTTP vacía, sesión guardada);
  caliente = segunda visita completa (`page.goto`) en el mismo contexto;
- peticiones con CDP Network: API y chunks JS hasta el contenido útil; profundidad = oleadas secuenciales
  (oleada = 1 + la mayor oleada de las peticiones que ya habían terminado cuando empezó);
- tiempo al contenido = `performance.now()` en la primera aparición visible del selector de contenido (MutationObserver);
- long tasks > 50 ms (`PerformanceObserver`) hasta el contenido y hasta 3 s después;
- first load JS leído del build (`scripts/perf/bundle-sizes.mjs` sobre `.next/build-manifest.json`, gzip).

Datos: base aislada `ventylab_b4base` en el contenedor `ventylab-server-postgres` (55432), con LOCAL_STACK §3.3 completo
(`prisma:seed`, `UPDATE` de secciones, `demo:seed`, casos clínicos, evaluaciones) y después
`LOAD_STUDENT_COUNT=500 npx tsx scripts/load/seed-load-data.ts`: **500 estudiantes** `load-student-001..500@ventylab.load` en un
grupo creado por `ana.torres` y supervisado por el grupo docente demo (`baf96a72-0c7f-563a-a88c-d27edc4995b7`), con progreso
clonado (4150 filas). Roles: docente `ana.torres@ventylab.demo` y administrador `superadmin@ventylab.demo`.

Datos JSON completos (todas las rondas): `docs/bloque4/perf/baseline-teacher.json`. Sonda: `ventilab-web/e2e/perf/teacher-perf.spec.ts`.

## Tabla resumen (medianas)

Contenido útil: dashboard = `section[aria-label="Estudiantes"]`; detalle = `section[aria-label="Progreso"]` o la alerta
"No tienes acceso…"; `/admin/users` = primera fila de la tabla; `/groups` = primera fila de `table[aria-label="Grupos"]`;
`/profile` = primer `input` del formulario.

| Rol | Pantalla | First load JS gz | Filas | Tiempo al contenido frío / caliente | API hasta contenido (oleadas) frío | Chunks red frío | Profundidad con chunks frío / caliente | Long tasks hasta contenido frío (n / ms) | Long tasks hasta +3 s frío (n / ms, máx) | Long tasks hasta contenido caliente (n / ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| Docente | `/teacher` (grupo por defecto, Grupo A) | 237,7 KB | 5 | **3043 / 1754 ms** | 10 (5) | 56 | 30 / 5 | 15 / 2065 | 21 / 2861, máx 420 | 6 / 753 |
| Docente | `/teacher?groupId=<grupo de 500>` (equivalente actual del directorio) | 237,7 KB | 500 | **7314 / 6193 ms** | 10 (3) | 56 | 27 / 4 | 18 / 6251 | 23 / 7361, máx **4151** | 8 / 5040 |
| Docente | `/teacher/students/[userId]` | 237,7 KB | — | **2752 / 1676 ms** (403) | 7 (3) | 55 | 27 / 5 | 11 / 1644 | 12 / 1774, máx 383 | 4 / 442 |
| Docente | `/groups` | 262,8 KB | 4 | **3191 / 1838 ms** | 5 (2) | 52 | 21 / 3 | 13 / 2124 | 14 / 2213, máx 464 | 6 / 854 |
| Docente | `/profile` | 276,4 KB | — | **2154 / 944 ms** | 2 (2) | 23 | 10 / 3 | 7 / 1585 | 11 / 1955, máx 422 | 3 / 430 |
| Admin | `/teacher` (grupo por defecto, Grupo A) | 237,7 KB | 5 | **3551 / 2029 ms** | 10 (5) | 61 | 30 / 6 | 17 / 2515 | 24 / 3598, máx 525 | 8 / 1021 |
| Admin | `/teacher?groupId=<grupo de 500>` | 237,7 KB | 500 | **8205 / 6833 ms** | 10 (3) | 67 | 27 / 5 | 17 / 7083 | 23 / 8062, máx **5006** | 9 / 5572 |
| Admin | `/teacher/students/[userId]` | 237,7 KB | — | **2762 / 1732 ms** | 7 (3) | 60 | 29 / 5 | 12 / 1810 | 14 / 2101, máx 384 | 6 / 607 |
| Admin | `/admin/users` | 237,9 KB | 20 | **3150 / 1655 ms** | 6 (3) | 59 | 29 / 4 | 16 / 2158 | 18 / 2357, máx 356 | 8 / 830 |
| Admin | `/groups` | 262,8 KB | 4 | **2874 / 1608 ms** | 5 (3) | 57 | 27 / 4 | 13 / 1944 | 14 / 2013, máx 358 | 6 / 720 |
| Admin | `/profile` | 276,4 KB | — | **1887 / 989 ms** | 2 (2) | 23 | 10 / 3 | 7 / 1381 | 11 / 1766, máx 337 | 3 / 450 |

Compartido (`_app` + main + polyfills): 204,3 KB gz (622,5 KB sin comprimir). JS propio gz: `/teacher` 33,4,
detalle 33,5, `/admin/users` 33,6, `/groups` 58,5, `/profile` 72,1 KB. Coincide con DISENO_BLOQUE4 §6 (±0,2 KB).

Tiempos al contenido por ronda (frío / caliente, ms):

- docente dashboard 3198, 3209, 3043, 2905, 2964 / 1754, 1748, 1703, 1832, 1879;
- docente grupo de 500: 8711, 7314, 7265, 7074, 8222 / 6895, 5613, 5721, 6193, 6942;
- admin grupo de 500: 8124, 8205, 7270, 8228, 8313 / 7868, 6790, 6833, 5789, 7279.

## Rutas del Bloque 4 que todavía no existen

`/teacher/students` (directorio), `/teacher/lab`, las pestañas `/teacher?tab=general|grupo`,
`/teacher/students/[userId]?tab=…`, `/admin/users?tab=profesores` y `/profile?tab=info|password`. `bundle-sizes.mjs` reporta
`/teacher/students` y `/teacher/lab` como "no existe en el build". Como equivalente actual del directorio se mide la tabla de
estudiantes del dashboard con el grupo de 500 (`/teacher?groupId=…`): es la única lista de estudiantes por grupo que hay hoy.

## Peticiones observadas (ronda 1, frío)

- Shell de staff (todas las pantallas del panel): `auth/me`, `evaluation-grading/queue/count`, `notifications/unread-count`,
  `system/status`.
- `/teacher`: + `groups?type=STUDENT` → `analytics/groups/{id}/dashboard`, `evaluation-grading/queue/count?groupId`,
  `evaluation-assignments?groupId&state=ACTIVE&limit=5`, `reservations?from&to&groupId`, `curriculum/tree`. Después del
  contenido: `analytics/evaluations/{id}/stats` (grupo A). Profundidad API 5 con el grupo por defecto, 3 con `?groupId`
  (no espera a `groups` para elegir el grupo).
- Detalle: `users/students/{id}`, `progress/users/{id}/summary`, `curriculum/tree`; para el admin, después del contenido:
  `evaluation-grading/students/{id}/grades`, `evaluation-grading/queue?studentId`, `simulation/sessions/history?userId`,
  `analytics/students/{id}/timeline`.
- `/admin/users`: `users?page=1&limit=20&sortBy=name&sortOrder=asc`, `groups`.
- `/groups`: `groups`.
- `/profile` (layout de estudiante): `auth/me` → `users/me`; los conteos del shell llegan después del contenido.

## Hallazgos

1. **Grupo de 500 en el dashboard:** 7,3 s (docente) y 8,2 s (admin) en frío, 6,2 / 6,8 s en caliente, con una long task
   de **4,2-5,0 s**: la tabla renderiza las 500 filas de una vez (sin paginar ni virtualizar). Es el caso que la Ola 4 pide
   resolver ("sin long tasks > 50 ms; si aparecen, paginar `get-group-dashboard` en el servidor o virtualizar").
2. **El docente no puede abrir el detalle de un estudiante de su grupo:** `GET /api/users/students/{id}` responde 403
   (`users.student_access_denied`) porque hoy solo vale `TeacherStudent` y la base no tiene vínculos. Las 5 rondas del docente
   miden la alerta "No tienes acceso a este estudiante" (`blockedRuns: 5`); el admin sí ve el detalle. Es lo que corrige S1.
3. Todas las pantallas del panel tienen long tasks > 50 ms antes del contenido incluso con pocos datos (7-17 en frío, máx.
   340-525 ms), sobre todo por el arranque del JS (55-67 chunks en frío).

## Comandos exactos

Rutas relativas a `ventylab/`. Variables del backend: las de `.env.example` exportadas en el shell, más `PORT=4100`,
`DATABASE_URL`/`DIRECT_URL=postgresql://postgres:postgres@localhost:55432/ventylab_b4base`, `JWT_SECRET`/`JWT_REFRESH_SECRET`
locales de LOCAL_STACK §3.2, `SUPERADMIN_EMAIL=superadmin@ventylab.demo`, `CORS_ORIGIN`/`FRONTEND_URL=http://localhost:3100`.

```bash
git -C ventylab-server worktree add ../_b4-base-server -b b4/ola0 origin/main     # f3b733b
git -C ventilab-web worktree add ../_b4-base-web -b b4/ola0 origin/master         # 5ed38bc
docker start ventylab-server-postgres
docker exec ventylab-server-postgres psql -U postgres -c 'CREATE DATABASE ventylab_b4base'

cd _b4-base-server && npm ci
npx prisma migrate deploy && npm run prisma:seed
docker exec ventylab-server-postgres psql -U postgres -d ventylab_b4base -c 'UPDATE levels lv SET "sectionId" = s.id FROM sections s WHERE lv."sectionId" IS NULL AND s.slug = lv.track'
npm run demo:seed && npx tsx prisma/seed-clinical-cases.ts && npx tsx prisma/seed-evaluation.ts
LOAD_STUDENT_COUNT=500 LOAD_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/ventylab_b4base npx tsx scripts/load/seed-load-data.ts
npm run build && npm run start:prod

cd ../_b4-base-web && npm ci
NEXT_PUBLIC_BACKEND_URL=http://localhost:4100 npm run build && npx next start -p 3100
E2E_BASE_URL=http://localhost:3100 PERF_LABEL=baseline PERF_OUT_DIR=../_b4-perf-out \
  npx playwright test --project=perf e2e/perf/teacher-perf.spec.ts
# → <PERF_OUT_DIR>/baseline-teacher.json (por defecto docs/bloque4/perf; PERF_RUNS=5, PERF_CPU_RATE=4, PERF_SETTLE_MS=3000,
#   PERF_STUDENT_COUNT=500; PERF_ROLES, PERF_SCREENS, PERF_GROUP_ID, PERF_STUDENT_ID para acotar o fijar)
```

Para el DESPUÉS: mismo comando con `PERF_LABEL=after` sobre la rama del Bloque 4. Las pantallas nuevas (directorio
`/teacher/students`, pestañas) necesitarán sus entradas en `SCREENS`; mantener las definiciones actuales de contenido útil
para comparar las que ya existen.

## Advertencias

- `apiDepth` cuenta `GET /api/auth/me` como oleada 1.
- La "profundidad con chunks" es una cota superior (cualquier chunk que empieza tarde suma oleada), igual que en los Bloques 2 y 3.
- Cada ronda guarda de vuelta la sesión del contexto (tokens renovados), así el frío empieza con un access token vigente;
  la ronda de calentamiento absorbe la primera renovación. Sin esto, el primer intento mostró `401 auth/me` + `POST auth/refresh`
  en cada frío.
- La sesión de admin se inicia una vez por el formulario y se guarda en `e2e/.auth/admin.json`.
- La primera corrida de humo se colgó: el contexto de inicio de sesión del admin heredaba la sesión del estudiante del
  proyecto `perf` y `/auth/login` redirigía. Se corrigió en la sonda antes de la corrida medida (contexto con estado vacío).
- `/teacher` por defecto abre el primer grupo de la lista (Grupo A, 5 estudiantes) para ambos roles.
- Sin errores HTTP salvo el 403 esperado del detalle para el docente.
