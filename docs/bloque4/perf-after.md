# Bloque 4 (Panel docente, administración y perfil): rendimiento DESPUÉS

Medido el 2026-11-03 sobre `ventilab-web` `master` **`cf2292a`** (merge del PR #24) y `ventylab-server` `main` **`f8464b0`**
(merge del PR #8). Windows 11, Node 24.19, Chromium 156.0.8078.4 (Playwright, headless nuevo). Sonda v0.2
(`ventilab-web/e2e/perf/teacher-perf.spec.ts`).

## Método

El mismo del baseline (`docs/bloque4/perf-baseline.md`): `next build` + `next start` (puerto 3000), backend `npm run build` +
`node dist/main.js` (puerto 4000, `NODE_ENV=development`), CPU ×4, 1920×1080, 1 ronda de calentamiento + 5 rondas, mediana.

Datos: base aislada `ventylab_b4` en `ventylab-server-postgres` (55432) con LOCAL_STACK §3.3 completo y
`LOAD_STUDENT_COUNT=500 npx tsx scripts/load/seed-load-data.ts` (500 estudiantes). Datos completos: `docs/bloque4/perf/after-teacher.json`.

Cambios de la sonda v0.2 respecto del baseline: el dashboard por grupo ahora es `/teacher?tab=grupo`; el contenido del detalle es
la sección "Progreso por nivel y módulo" (pestaña Módulos); se agregan `/teacher` General, `/teacher/students`, `/teacher/lab` y
`/admin/users?tab=profesores`; "long tasks después de los datos" cuenta solo las que empiezan después de la respuesta de la lista.

## Antes vs. después (medianas, frío / caliente)

| Rol | Pantalla | First load JS gz antes → después | Filas antes → después | Tiempo al contenido antes | Tiempo al contenido después | Long tasks hasta +3 s frío, máx antes → después |
|---|---|---|---|---|---|---|
| Docente | Grupo de 500 (`/teacher?groupId=…`) | 237,7 → 266,2 KB | 500 → 25 | 7314 / 6193 ms | **3551 / 2248 ms** | **4151 → 534 ms** |
| Admin | Grupo de 500 | 237,7 → 266,2 KB | 500 → 25 | 8205 / 6833 ms | **3694 / 2290 ms** | **5006 → 567 ms** |
| Docente | Dashboard por grupo (Grupo A) | 237,7 → 266,2 KB | 5 | 3043 / 1754 ms | 3101 / 1784 ms | 420 → 394 ms |
| Admin | Dashboard por grupo (Grupo A) | 237,7 → 266,2 KB | 5 | 3551 / 2029 ms | 3121 / 1882 ms | 525 → 383 ms |
| Docente | Detalle de estudiante | 237,7 → 266,3 KB | — | 2752 / 1676 ms (403) | 2779 / 1654 ms | 383 → 391 ms |
| Admin | Detalle de estudiante | 237,7 → 266,3 KB | — | 2762 / 1732 ms | 2775 / 1767 ms | 384 → 407 ms |
| Admin | `/admin/users` | 237,9 → 266,1 KB | 20 | 3150 / 1655 ms | 2931 / 1509 ms | 356 → 395 ms |
| Docente | `/groups` | 262,8 → 298,5 KB | 4 | 3191 / 1838 ms | 2651 / 1517 ms | 464 → 366 ms |
| Admin | `/groups` | 262,8 → 298,5 KB | 4 | 2874 / 1608 ms | 2677 / 1494 ms | 358 → 375 ms |
| Docente | `/profile` | 276,4 → 326,4 KB | — | 2154 / 944 ms | 1997 / 988 ms | 422 → 459 ms |
| Admin | `/profile` | 276,4 → 326,4 KB | — | 1887 / 989 ms | 1999 / 959 ms | 337 → 436 ms |

Notas: en el baseline el docente no tenía acceso al detalle del estudiante de carga (403); ahora sí (es de su grupo). Los
tiempos de la tabla de 500 en "después" cuentan la primera página de 25 filas.

## Pantallas nuevas del Bloque 4 (solo después)

| Rol | Pantalla | First load JS gz | Filas | Tiempo al contenido frío / caliente | API (oleadas) frío | Long tasks hasta +3 s frío, máx |
|---|---|---|---|---|---|---|
| Docente | `/teacher` General | 266,2 KB | — | 2890 / 1491 ms | 6 (3) | 12 / 1542 ms, máx 355 |
| Admin | `/teacher` General | 266,2 KB | — | 2835 / 1573 ms | 6 (3) | 13 / 1599 ms, máx 350 |
| Docente | `/teacher/students` | 266,2 KB | 25 | 2880 / 1602 ms | 5 (3) | 13 / 1869 ms, máx 381 |
| Admin | `/teacher/students` | 266,2 KB | 25 | 2957 / 1608 ms | 5 (3) | 14 / 1921 ms, máx 361 |
| Docente | `/teacher/lab` | 355,6 KB | — | 2664 / 1293 ms | 6 (3) | 14 / 2483 ms, máx 412 |
| Admin | `/teacher/lab` | 355,6 KB | — | 2580 / 1338 ms | 6 (2) | 15 / 2522 ms, máx 449 |
| Admin | `/admin/users?tab=profesores` | 266,1 KB | 3 | 2772 / 1451 ms | 5 (3) | 12 / 1611 ms, máx 360 |

## Lectura

- **Objetivo cumplido en la tabla de 500:** el congelamiento de 4–5 s desaparece (máx 534–567 ms) y el contenido llega en
  menos de la mitad del tiempo (frío −51 %/−55 %, caliente −64 %/−66 %). Quedan long tasks > 50 ms, como en todas las
  pantallas: son del arranque de la página (hidratación con CPU ×4), no del render de los datos.
- **El resto de las pantallas queda igual o mejor** en tiempo al contenido (±0,2 s).
- **Regresión de JS:** el compartido baja (204,3 → 170,3 KB gz), pero el first load sube en todas las rutas: +28,5 KB en el
  panel y `/admin/users`, +35,7 KB en `/groups`, +50 KB en `/profile`. `/teacher/lab` es la ruta más pesada (355,6 KB). No se
  nota en los tiempos medidos, pero es candidato al backlog (división de código del shell del panel y del perfil).
