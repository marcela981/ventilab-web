Medianas de 5 corridas, CPU ×4, chromium 156.0.8078.4, commit 4b0496a.

| Pantalla | Visita | Tiempo al contenido (ms) | API hasta el contenido (profundidad) | Chunks JS red / caché | Profundidad con chunks | Long tasks hasta el contenido (n / ms) | Long tasks hasta +settle (n / ms / máx) | API después del contenido |
|---|---|---|---|---|---|---|---|---|
| learn-home | fría | 2391 | 3 (2) | 27 / 0 | 9 | 7 / 1648 | 10 / 1867 / 346 | 1 |
| learn-home | caliente | 1090 | 3 (2) | 0 / 27 | 3 | 4 / 442 | 5 / 547 / 182 | 1 |
| learn-section | fría | 3052 | 4 (2) | 37 / 0 | 13 | 10 / 1935 | 13 / 2049 / 340 | 0 |
| learn-section | caliente | 1192 | 3 (2) | 0 / 27 | 3 | 5 / 530 | 6 / 633 / 179 | 1 |
| lesson-viewer | fría | 3353 | 6 (3) | 45 / 3 | 20 | 14 / 2176 | 15 / 2373 / 327 | 1 |
| lesson-viewer | caliente | 2224 | 6 (4) | 0 / 48 | 5 | 8 / 979 | 8 / 979 / 316 | 1 |
| lesson-viewer | Siguiente 1 | 446 | 3 (3) | 0 / 0 | 3 | 1 / 93 | 1 / 93 / 93 | 0 |

Peticiones de la primera corrida:

- learn-home, fría: hasta el contenido GET /api/auth/me, GET /api/curriculum/tree, GET /api/progress/summary; después GET /api/notifications/unread-count
- learn-home, caliente: hasta el contenido GET /api/auth/me, GET /api/curriculum/tree, GET /api/progress/summary; después GET /api/notifications/unread-count
- learn-section, fría: hasta el contenido GET /api/auth/me, GET /api/notifications/unread-count, GET /api/curriculum/tree, GET /api/progress/sections/section-mecanica; después ninguna
- learn-section, caliente: hasta el contenido GET /api/auth/me, GET /api/curriculum/tree, GET /api/progress/sections/section-mecanica; después GET /api/notifications/unread-count
- lesson-viewer, fría: hasta el contenido GET /api/auth/me, GET /api/notifications/unread-count, GET /api/curriculum/tree, GET /api/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons, GET /api/pages?lessonId=ebdf6985-39a6-59c7-b94d-f5127dcb53a4, GET /api/pages/12155882-9e3d-54bb-b66f-bd81b750067c, GET /api/notes/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4?limit=100; después ninguna
- lesson-viewer, caliente: hasta el contenido GET /api/auth/me, GET /api/curriculum/tree, GET /api/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons, GET /api/pages?lessonId=ebdf6985-39a6-59c7-b94d-f5127dcb53a4, GET /api/pages/12155882-9e3d-54bb-b66f-bd81b750067c, GET /api/notes/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4?limit=100; después GET /api/notifications/unread-count
- lesson-viewer, Siguiente 1 (/learn/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4/1 → /learn/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4/2): hasta el contenido POST /api/progress/pages/12155882-9e3d-54bb-b66f-bd81b750067c/view, GET /api/curriculum/tree, GET /api/pages/2b230909-57f3-5f75-b0f7-499df20e396d; después ninguna
