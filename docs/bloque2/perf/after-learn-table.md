Medianas de 5 corridas, CPU ×4, chromium 156.0.8078.4, commit 63175f6.

| Pantalla | Visita | Tiempo al contenido (ms) | API hasta el contenido (profundidad) | Chunks JS red / caché | Profundidad con chunks | Long tasks hasta el contenido (n / ms) | Long tasks hasta +settle (n / ms / máx) | API después del contenido |
|---|---|---|---|---|---|---|---|---|
| learn-home | fría | 2620 | 3 (2) | 38 / 0 | 16 | 10 / 1708 | 12 / 1767 / 339 | 1 |
| learn-home | caliente | 999 | 3 (2) | 0 / 28 | 3 | 3 / 422 | 4 / 459 / 177 | 1 |
| learn-section | fría | 2627 | 4 (3) | 38 / 0 | 17 | 11 / 1704 | 12 / 1759 / 288 | 0 |
| learn-section | caliente | 1103 | 3 (2) | 0 / 28 | 3 | 4 / 477 | 4 / 477 / 187 | 1 |
| lesson-viewer | fría | 3103 | 8 (5) | 42 / 0 | 21 | 17 / 1939 | 17 / 1939 / 290 | 0 |
| lesson-viewer | caliente | 1510 | 7 (4) | 0 / 42 | 5 | 6 / 500 | 6 / 500 / 154 | 1 |
| lesson-viewer | Siguiente 1 | 220 | 1 (1) | 0 / 0 | 1 | 1 / 54 | 1 / 54 / 54 | 1 |

Peticiones de la primera corrida:

- learn-home, fría: hasta el contenido GET /api/auth/me, GET /api/curriculum/tree, GET /api/progress/summary; después GET /api/notifications/unread-count
- learn-home, caliente: hasta el contenido GET /api/auth/me, GET /api/curriculum/tree, GET /api/progress/summary; después GET /api/notifications/unread-count
- learn-section, fría: hasta el contenido GET /api/auth/me, GET /api/notifications/unread-count, GET /api/curriculum/tree, GET /api/progress/summary; después ninguna
- learn-section, caliente: hasta el contenido GET /api/auth/me, GET /api/curriculum/tree, GET /api/progress/summary; después GET /api/notifications/unread-count
- lesson-viewer, fría: hasta el contenido GET /api/auth/me, GET /api/notifications/unread-count, GET /api/pages?lessonId=ebdf6985-39a6-59c7-b94d-f5127dcb53a4, GET /api/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons, GET /api/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4/access, GET /api/progress/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323, GET /api/pages/12155882-9e3d-54bb-b66f-bd81b750067c, GET /api/pages/2b230909-57f3-5f75-b0f7-499df20e396d; después ninguna
- lesson-viewer, caliente: hasta el contenido GET /api/auth/me, GET /api/pages?lessonId=ebdf6985-39a6-59c7-b94d-f5127dcb53a4, GET /api/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons, GET /api/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4/access, GET /api/progress/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323, GET /api/pages/12155882-9e3d-54bb-b66f-bd81b750067c, GET /api/pages/2b230909-57f3-5f75-b0f7-499df20e396d; después GET /api/notifications/unread-count
- lesson-viewer, Siguiente 1 (/learn/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4/1 → /learn/modules/5e81b2d5-4fb2-52e7-ad9f-44a281266323/lessons/ebdf6985-39a6-59c7-b94d-f5127dcb53a4/2): hasta el contenido POST /api/progress/pages/12155882-9e3d-54bb-b66f-bd81b750067c/view; después GET /api/pages?lessonId=b0ffaa43-4416-536a-916c-d43924725236
