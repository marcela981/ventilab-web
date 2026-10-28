<!--
Funcionalidad: Baseline de rendimiento de /learn y del visor de lecciones (Bloque 2)
Descripción: Medición en ejecución, antes de cualquier código del Bloque 2, de /learn, /learn/[sectionId] y el visor de lecciones como estudiante con CPU ×4: peticiones a la API y chunks JS hasta el primer contenido útil y su profundidad, tiempo al contenido con caché fría y caliente, long tasks y peticiones por "Siguiente"; más los tamaños de bundle por ruta. Todos los números salen de los JSON de docs/bloque2/perf/ (Playwright + build de producción).
Versión: 0.1
Autor: Marcela Mazo Castro
Proyecto: VentyLab
Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
Institución: Universidad del Valle
Contacto: marcela.mazo@correounivalle.edu.co
-->

# Baseline de rendimiento de /learn y del visor (antes del Bloque 2)

Medido el 2026-10-28 sobre `ventilab-web` `master` `4b0496a` y `ventylab-server` `main` `8f94e70` (worktrees limpios,
sin código del Bloque 2), con `next build --webpack` + `next start` contra el backend local (`node dist/main`).

## Entorno

- Chromium 156.0.8078.4 (Playwright, canal `chromium`, headless nuevo), ventana 1920×1080, DPR 1, Windows 11.
- Estudiante `estudiante01@ventylab.demo` (semilla demo) con la sesión guardada; base sembrada según `LOCAL_STACK.md`
  (currículo completo de `prisma:seed` + demo) y reiniciada antes de medir.
- **CPU ×4** con `Emulation.setCPUThrottlingRate` (CDP), como en el Bloque 1. Red: localhost sin limitar.
- Una ronda de calentamiento descartada y **5 rondas**; se informa la **mediana**. Cada ronda abre un contexto nuevo.
- Pantallas y contenido útil (primer elemento visible, detectado en la página con `MutationObserver`):
  - `/learn`: tarjetas de sección (`ul[aria-label="Secciones"] > li`).
  - `/learn/section-mecanica`: tarjetas de nivel con sus módulos (`ul[aria-label^="Módulos de"] > li`).
  - Visor `/learn/modules/5e81b2d5-…/lessons/ebdf6985-…/1` (lección demo "La ecuación del movimiento"): artículo de la
    página con su primer bloque (`article[aria-labelledby="lesson-page-title"] section[data-block-type]`).
- **Fría** = contexto nuevo (caché HTTP vacía). **Caliente** = segunda visita completa (`page.goto`) a la misma URL en
  el mismo contexto: chunks desde la caché HTTP, caché de SWR vacía. **Siguiente** = clic en "Siguiente" en la página 1
  (navegación del cliente a la página 2 de la misma lección); el tiempo se mide desde el clic.
- **Profundidad** (oleadas): una petición pertenece a la oleada 1 + la mayor oleada de las peticiones que ya habían
  terminado cuando empezó. "Con chunks" cuenta documento + chunks + API servidos por la red; es una cota superior.
- Long tasks > 50 ms (`PerformanceObserver`), desde el inicio de la navegación (o el clic) hasta el contenido útil y
  hasta 3 s después ("+3 s").

## Resultados

| Métrica | Valor | Fuente |
|---|---|---|
| `/learn`: peticiones API hasta el contenido | **3** (`auth/me`, `curriculum/tree`, `progress/summary`), profundidad **2** | **Medido** |
| `/learn`: chunks JS hasta el contenido (fría) | 27 (todos de red) | Medido |
| `/learn`: tiempo al contenido fría / caliente | **2391 ms** / **1090 ms** | Medido |
| `/learn`: long tasks hasta el contenido, fría (n / total) | 7 / 1648 ms (máx. 346 ms hasta +3 s) | Medido |
| `/learn`: long tasks hasta el contenido, caliente | 4 / 442 ms | Medido |
| `/learn/[sectionId]`: peticiones API hasta el contenido | 4 en fría (incluye `notifications/unread-count`) / 3 en caliente, profundidad **2** | Medido |
| `/learn/[sectionId]`: chunks JS (fría) | 37 | Medido |
| `/learn/[sectionId]`: tiempo al contenido fría / caliente | **3052 ms** / **1192 ms** | Medido |
| `/learn/[sectionId]`: long tasks hasta el contenido fría / caliente | 10 / 1935 ms · 5 / 530 ms | Medido |
| Visor: peticiones API hasta el contenido | **6** (`auth/me`, `curriculum/tree`, `modules/{id}/lessons`, `pages?lessonId`, `pages/{id}`, `notes/lessons/{id}`; en fría a veces también `unread-count`) | Medido |
| Visor: profundidad API fría / caliente | **3** (rango 3-5) / **4** (4 en las 5 rondas) | Medido |
| Visor: chunks JS hasta el contenido (fría) | **45** de red + 3 de caché | Medido |
| Visor: tiempo al contenido fría / caliente | **3353 ms** / **2224 ms** | Medido |
| Visor: long tasks hasta el contenido fría / caliente | 14 / 2176 ms · 8 / 979 ms (máx. 327 ms) | Medido |
| Visor: "Siguiente" (página siguiente de la lección) | **3 peticiones**: `POST progress/pages/{id}/view` + **`GET curriculum/tree` (re-fetch)** + `GET pages/{id}`; 0 chunks; **446 ms** al contenido; 1 long task (93 ms) | Medido |
| First load `/learn` | **288,9 KB gz** (874,3 KB sin comprimir) | Medido (confirma el valor del diseño) |
| First load `/learn/[sectionId]`, módulo, visor | 288,9 / 289,0 / 289,0 KB gz | Medido |
| Propio de cada ruta de `/learn` | 84,9-85,0 KB gz, idéntico en las 4 | Medido |
| Compartido `_app` + main | 204 KB gz (621,5 KB) | Medido |
| Referencia `/me` y `/simulador` | 238,2 y 241,6 KB gz | Medido |

Tabla completa por visita (salida de `learn-perf-table.mjs`):

| Pantalla | Visita | Tiempo al contenido (ms) | API hasta el contenido (profundidad) | Chunks JS red / caché | Profundidad con chunks | Long tasks hasta el contenido (n / ms) | Long tasks hasta +3 s (n / ms / máx) | API después del contenido |
|---|---|---|---|---|---|---|---|---|
| learn-home | fría | 2391 | 3 (2) | 27 / 0 | 9 | 7 / 1648 | 10 / 1867 / 346 | 1 |
| learn-home | caliente | 1090 | 3 (2) | 0 / 27 | 3 | 4 / 442 | 5 / 547 / 182 | 1 |
| learn-section | fría | 3052 | 4 (2) | 37 / 0 | 13 | 10 / 1935 | 13 / 2049 / 340 | 0 |
| learn-section | caliente | 1192 | 3 (2) | 0 / 27 | 3 | 5 / 530 | 6 / 633 / 179 | 1 |
| lesson-viewer | fría | 3353 | 6 (3) | 45 / 3 | 20 | 14 / 2176 | 15 / 2373 / 327 | 1 |
| lesson-viewer | caliente | 2224 | 6 (4) | 0 / 48 | 5 | 8 / 979 | 8 / 979 / 316 | 1 |
| lesson-viewer | Siguiente 1 | 446 | 3 (3) | 0 / 0 | 3 | 1 / 93 | 1 / 93 / 93 | 0 |

Dispersión (5 rondas): `/learn` fría 2143-2519 ms, caliente 918-1225 ms; sección fría 2954-3500 ms; visor fría
3166-3986 ms, caliente 2044-2607 ms; "Siguiente" 309-500 ms. Las peticiones a la API fueron las mismas en todas las rondas
salvo `notifications/unread-count`, que entra antes o después del contenido según la ronda.

## Lectura

- **`/learn`** ya cumple la profundidad 2 (3 peticiones en paralelo tras `auth/me`), pero en frío tarda ~2,4 s con CPU ×4
  y carga 27 chunks; las long tasks suman ~1,6 s antes del contenido (hidratación y evaluación del bundle).
- **Visor:** 6 peticiones con profundidad 3-4 (el diseño estimaba 5-6 y 3-4: confirmado) y **45 chunks** en frío.
  Incluso con caché HTTP caliente tarda ~2,2 s, porque la cascada de la API se repite (SWR vacío) y la profundidad sube a 4.
- **"Siguiente"** dispara el `POST` de vista, **re-pide el árbol del currículo** y pide la página nueva: 3 peticiones en
  cadena (profundidad 3) antes de pintar. Objetivo del Bloque 2: sin re-fetch del árbol y profundidad ≤ 2.
- **Bundles:** confirmado 288,9 KB gz en `/learn`; el propio de las 4 rutas es idéntico (~85 KB, barrel `@features/learning`).

## Hallazgo durante la medición

En el código actual, "Siguiente" en la **última página de una lección** abre la pantalla "¡Completaste el módulo!" en lugar
de la primera página de la lección siguiente: `GET /api/modules/{id}/lessons` devuelve `pageCount: 0` para las lecciones
demo que sí tienen páginas publicadas. Por eso la medición usa un solo clic (página 1 → 2 de la misma lección;
`PERF_NEXT_CLICKS=1`). Al corregirlo, medir también el cruce de lección con `PERF_NEXT_CLICKS=2`.

## Qué no se midió

- Red limitada (todo es localhost): los tiempos reflejan sobre todo CPU y la cascada, no la latencia real.
- Las lecciones del currículo completo no tienen páginas en local; el visor se mide con la lección demo (2 bloques markdown).
- Las rondas registran vistas de página del estudiante; la primera ronda (descartada) absorbe el cambio de estado.

## Cómo repetir (y medir el "después")

Stack según `LOCAL_STACK.md` (backend y base sembrada), y en `ventilab-web/`:

```bash
npm run build && npm start
npx playwright test --project=perf e2e/perf/learn-perf.spec.ts     # escribe docs/bloque2/perf/baseline-learn.json
node scripts/perf/learn-perf-table.mjs baseline docs/bloque2/perf
MSYS_NO_PATHCONV=1 node scripts/perf/bundle-sizes.mjs --preset learn --json docs/bloque2/perf/baseline-bundle.json
```

Variables: `PERF_LABEL` (prefijo, p. ej. `final`), `PERF_OUT_DIR`, `PERF_RUNS` (5), `PERF_CPU_RATE` (4),
`PERF_SETTLE_MS` (3000), `PERF_SCREENS` (`learn-home,learn-section,lesson-viewer`), `PERF_SECTION_ID`, `PERF_MODULE_ID`,
`PERF_LESSON_ID`, `PERF_NEXT_CLICKS` (1), `PERF_DEBUG=1`, `E2E_BASE_URL`. Si las rutas cambian en el Bloque 2 (pestañas
de `/learn`), actualizar `SCREENS` y los selectores en el spec y mantener las mismas definiciones para comparar.
