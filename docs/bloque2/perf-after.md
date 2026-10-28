<!--
Funcionalidad: Rendimiento de /learn y del visor de lecciones después del Bloque 2
Descripción: Medición "después" (W11 del Bloque 2) con el mismo protocolo que docs/bloque2/perf-baseline.md (estudiante, CPU ×4, mediana de 5 rondas tras una de calentamiento, build de producción, localhost) y comparación con el baseline: tiempo al contenido en frío y en caliente, peticiones y profundidad hasta el contenido, long tasks, peticiones por "Siguiente" y tamaños de bundle por ruta. Todos los números salen de los JSON de docs/bloque2/perf/ (after-learn.json, after-bundle.json frente a baseline-learn.json y baseline-bundle.json).
Versión: 0.1
Autor: Marcela Mazo Castro
Proyecto: VentyLab
Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
Institución: Universidad del Valle
Contacto: marcela.mazo@correounivalle.edu.co
-->

# Rendimiento de /learn y del visor: después del Bloque 2

Medido el 2026-10-28 sobre `ventilab-web` `feat/bloque2-ensenanza` (commit del JSON: `63175f6`, mismo código de la app
que el PR) y `ventylab-server` `feat/bloque2-ensenanza` (`2a38dc0`, worktree aparte), con `next build --webpack` +
`next start` contra el backend local (`node dist/main`) y una base propia (`ventylab_b2`) migrada y sembrada según
`LOCAL_STACK.md`. El baseline sigue en `perf-baseline.md` (`master` `4b0496a`, `main` `8f94e70`).

## Protocolo (igual al baseline)

- Chromium 156.0.8078.4 (Playwright, canal `chromium`), 1920×1080, DPR 1, Windows 11, la misma máquina.
- Estudiante `estudiante01@ventylab.demo` con sesión recién guardada (`E2E_AUTH_MAX_AGE_H=0`: una sesión vencida
  añade `POST /api/auth/refresh` y dos `auth/me` en frío, y se descartó la corrida que lo tenía).
- **CPU ×4** (CDP), red de localhost sin limitar, 1 ronda de calentamiento descartada y **5 rondas**, mediana.
- Mismas definiciones de fría, caliente, "Siguiente", profundidad y long tasks.
- **Único cambio de definición:** `/learn` ya no tiene tarjetas de sección (pestaña Currículo con acordeones) y
  `/learn/[sectionId]` redirige a `/learn?tab=curriculo&section=<id>`. En ambas pantallas el contenido útil es ahora
  la primera tarjeta de módulo del acordeón abierto (`PERF_CONTENT=after`). En el baseline, `/learn` medía las tarjetas
  de sección (sin módulos) y la sección medía tarjetas de módulo; por eso `learn-home` mide ahora **más contenido** que
  antes.

```bash
E2E_AUTH_MAX_AGE_H=0 PERF_LABEL=after npx playwright test --project=perf e2e/perf/learn-perf.spec.ts
node scripts/perf/learn-perf-table.mjs after docs/bloque2/perf
MSYS_NO_PATHCONV=1 node scripts/perf/bundle-sizes.mjs --preset learn --json docs/bloque2/perf/after-bundle.json
```

## Antes y después

| Métrica | Antes | Después | Cambio |
|---|---|---|---|
| `/learn`: tiempo al contenido fría / caliente | 2391 / 1090 ms | **2620** / 999 ms | **+10 %** / −8 % |
| `/learn`: API hasta el contenido (profundidad) | 3 (2) | 3 (2) | = |
| `/learn`: chunks JS en fría | 27 | **38** | **+11** |
| `/learn`: long tasks hasta el contenido, fría | 7 / 1648 ms | 10 / 1708 ms | +4 % |
| `/learn/[sectionId]`: tiempo fría / caliente | 3052 / 1192 ms | 2627 / 1103 ms | −14 % / −7 % |
| `/learn/[sectionId]`: API (profundidad), fría | 4 (2) | 4 (3) | +1 de profundidad (`unread-count` entra antes) |
| Visor: tiempo al contenido fría / caliente | 3353 / 2224 ms | **3103 / 1510 ms** | −7 % / **−32 %** |
| Visor: API hasta el contenido (profundidad), fría / caliente | 6 (3) / 6 (4) | 8 (5) / 7 (4) | ver la lectura |
| Visor: chunks JS en fría | 45 + 3 de caché | 42 | −3 |
| Visor: long tasks hasta el contenido fría / caliente | 14 / 2176 ms · 8 / 979 ms | 17 / 1939 ms · 6 / 500 ms | −11 % · **−49 %** |
| Visor: "Siguiente" (página siguiente) | 3 peticiones en cadena (POST vista + **GET árbol** + GET página), profundidad 3, **446 ms** | **1 petición** (POST vista), profundidad 1, **220 ms** | **−51 %**, sin re-fetch del árbol |
| First load `/learn` | 288,9 KB gz | **266,1 KB gz** | −22,8 KB (−8 %) |
| First load `/learn/[sectionId]` / módulo / visor | 288,9 / 289,0 / 289,0 KB gz | 266,2 / 266,2 / 277,8 KB gz | −8 % / −8 % / −4 % |
| Propio de cada ruta de `/learn` | 84,9-85,0 KB gz (idéntico en las 4, barrel) | 61,9 / 62,0 / 62,0 / **73,6** KB gz | −27 % (visor −13 %) |
| Compartido `_app` + main | 204,0 KB gz | 204,2 KB gz | +0,2 KB |
| Referencia `/me` y `/simulador` | 238,2 y 241,6 KB gz | 237,9 y 241,7 KB gz | = |

Tabla completa por visita (`learn-perf-table.mjs after`):

| Pantalla | Visita | Tiempo al contenido (ms) | API hasta el contenido (profundidad) | Chunks JS red / caché | Profundidad con chunks | Long tasks hasta el contenido (n / ms) | Long tasks hasta +3 s (n / ms / máx) | API después del contenido |
|---|---|---|---|---|---|---|---|---|
| learn-home | fría | 2620 | 3 (2) | 38 / 0 | 16 | 10 / 1708 | 12 / 1767 / 339 | 1 |
| learn-home | caliente | 999 | 3 (2) | 0 / 28 | 3 | 3 / 422 | 4 / 459 / 177 | 1 |
| learn-section | fría | 2627 | 4 (3) | 38 / 0 | 17 | 11 / 1704 | 12 / 1759 / 288 | 0 |
| learn-section | caliente | 1103 | 3 (2) | 0 / 28 | 3 | 4 / 477 | 4 / 477 / 187 | 1 |
| lesson-viewer | fría | 3103 | 8 (5) | 42 / 0 | 21 | 17 / 1939 | 17 / 1939 / 290 | 0 |
| lesson-viewer | caliente | 1510 | 7 (4) | 0 / 42 | 5 | 6 / 500 | 6 / 500 / 154 | 1 |
| lesson-viewer | Siguiente 1 | 220 | 1 (1) | 0 / 0 | 1 | 1 / 54 | 1 / 54 / 54 | 1 |

Dispersión (5 rondas): `/learn` fría 2378-2709 ms, caliente 952-1075 ms; sección fría 2474-2850 ms; visor fría
2924-4317 ms (una ronda atípica de 4317 ms; la mediana no la usa), caliente 1374-1714 ms; "Siguiente" 174-245 ms.

## Lectura

- **"Siguiente" cumple el objetivo:** de 3 peticiones en cadena a 1 (solo el `POST` de vista), sin re-fetch del árbol,
  y la mitad del tiempo (446 → 220 ms). La página siguiente ya está en caché (precarga) y, después de pintar, se
  precarga el listado de páginas de la lección siguiente (`GET /api/pages?lessonId=…`, la "API después del contenido").
- **Visor en caliente −32 %** (2224 → 1510 ms) y la mitad de long tasks: el visor ya no espera al árbol del currículo ni
  a las notas (el panel lateral se fue con TutorAI, que es lazy).
- **Profundidad del visor: el número no baja y hay que leerlo con cuidado.** Las peticiones hasta el contenido son
  `auth/me` → (listado de páginas, lecciones del módulo, acceso, progreso del módulo, en paralelo) → `pages/{id}` →
  **`pages/{siguiente}`**. La última es la precarga de la página siguiente: arranca en cuanto llegan los datos de la
  actual, antes de que el `MutationObserver` marque el contenido visible, y la regla de oleadas la cuenta como una más.
  Sin ella la profundidad es 3 contando `auth/me` (antes 4 en caliente; en frío el baseline osciló entre 3 y 5), es
  decir, 2 oleadas propias del visor: **el objetivo "≤ 2 en paralelo hasta el contenido" se cumple en la cadena del
  visor, pero la métrica tal como está definida da 4 en caliente y 5 en fría** (en frío entra además
  `notifications/unread-count`). Hay 1-2 peticiones más que antes (acceso y progreso del módulo, que antes no se
  pedían, y la precarga), todas en paralelo.
- **Regresión honesta en `/learn` en frío: +10 % (2391 → 2620 ms) y 11 chunks más.** La pestaña Currículo es un
  chunk lazy aparte (más los de las pestañas, el FAB de edición y los toasts), y el contenido medido ahora es la
  tarjeta de módulo (antes, la tarjeta de sección, que no necesitaba el resumen por módulo). En caliente mejora (−8 %)
  y la profundidad sigue en 2. `/learn/[sectionId]` mejora −14 % porque ahora es la misma pantalla.
- **Bundle:** sin el barrel `@features/learning`, el propio de las rutas de `/learn` baja de ~85 a 62 KB gz y el visor
  a 73,6 KB gz; el first load de `/learn` baja 22,8 KB gz. KaTeX, TipTap, el confeti y el popup de TutorAI quedan
  fuera de la carga inicial (chunks lazy).

## Qué no se midió

- Red limitada (todo es localhost): los tiempos reflejan sobre todo CPU y la cascada, no la latencia real.
- El cruce de lección (`PERF_NEXT_CLICKS=2`): la última página de la lección ahora abre el diálogo "¡Lección
  Completada!" (no navega), así que el segundo clic no es una navegación comparable.
- El estudiante de la medición ya completó el módulo demo, así que no aparecen el diálogo ni el confeti.
