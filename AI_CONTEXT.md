<!--
* Funcionalidad: Contexto del repositorio para asistentes de IA
* Descripción: Estado real de ventilab-web: stack, backend NestJS y cliente OpenAPI generado, features, rutas, providers, estilos, pruebas y despliegue. v1.0 (A9): reescrito desde el código; reemplaza la versión de julio de 2026 (NextAuth, pages/api, backend Express, Prisma), que ya no aplica. v1.1 (W1 Bloque 1): navegación del simulador unificado (/simulador como inicio de todos los roles, menú lateral corto, menú de usuario por rol, redirecciones de /simulator y /lab*) y la feature simulator-workspace. v1.2 (W13 Bloque 1): panel /simulador completo (pestañas montadas, sesión y conexión por encima), store externo de la consola, curvas por tiempo, entradas *.entry.ts por área y Playwright (e2e y rendimiento). v1.3 (W12 Bloque 2): /learn con pestañas Inicio, Currículo y Mi Progreso, resolvedor de módulo, visor de julio sin cascada, cola offline del progreso, TutorAI, gamificación, dueños del estado, E2E del Bloque 2 con el LLM falso y limitaciones conocidas. v1.4 (Bloque 3): evaluación por tipo (lista agrupada, reproductores de quiz, taller y examen, resultado con banda y feedback IA), hub de staff en /evaluations, constructor con asignación embebida, calificación unificada con reinicio de intento, "Quiz del módulo", entradas *.entry.ts sin barrel, E2E y mediciones del Bloque 3. v1.5 (Bloque 4): panel docente como espacio propio (PanelShell), dashboard con pestañas General y Por grupo, directorio con «Conformar Grupo», detalle de estudiante con 5 pestañas, laboratorio de staff, administración (Profesores, analítica de IA por superficie y alcance), perfil con pestañas, cambio de contraseña con revocación y foto de perfil, E2E y mediciones del Bloque 4.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# VentyLab — Contexto para IA

## Descripción del proyecto
Sistema Ciberfísico Educativo para la enseñanza de la ventilación mecánica.
Tesis de Marcela Mazo Castro — Universidad del Valle.

Este repositorio es **solo la interfaz web**. Toda la lógica de negocio y los datos viven en el repo hermano `../ventylab-server` (backend **NestJS 11**, con su propio `AI_CONTEXT.md`).

**Stack:**
- Next.js 16 (Pages Router, `next dev/build --webpack`), React 19, TypeScript 5 (`allowJs`; quedan 4 archivos JS: `pages/_app.js`, `pages/index.js`, `pages/dashboard/index.js`, `src/shared/components/UI/WarmupOverlay.jsx`)
- UI: Material UI 7 + Emotion, con CSS Modules; Chart.js 4
- Datos: axios + SWR 2 sobre el cliente OpenAPI generado (`openapi-typescript`)
- Realtime: socket.io-client 4
- Contenido: react-markdown + remark-gfm/remark-math + KaTeX; TipTap 3; dompurify
- Observabilidad: `@sentry/browser` (opcional, carga diferida)
- Pruebas: vitest + Testing Library + msw (jsdom)
- Sin i18n: textos en español escritos a mano (mapas `*-error-messages.ts` por feature)
- **Sin base de datos ni Prisma**: no hay `prisma/`, `lib/` ni `pages/api/`. La base de datos pertenece al backend.

---

## Integración con el backend (contrato OpenAPI)

- **Contrato:** `openapi/openapi.json` es una copia del `openapi/openapi.json` de `ventylab-server`. De él se genera `src/shared/api-client/generated/schema.d.ts` (`npm run generate:api`, `scripts/generate-api.mjs`; acepta `BACKEND_SPEC_PATH`).
- **Sincronía:** `npm run check:api` (`scripts/check-api-contract.mjs`) vuelve a generar la copia y los tipos y falla (exit 1) si `git status` muestra cambios en `openapi/openapi.json` o en `src/shared/api-client/generated`: detecta un contrato del backend sin consumir o un cliente editado a mano. La CI lo ejecuta contra un clon del backend.
- **Cliente** (`src/shared/api-client/`):
  - `http-client.ts`: axios con `baseURL` = **origen** del backend (`BACKEND_ORIGIN` de `src/shared/lib/env.ts`, sin `/api`: las rutas del contrato ya lo llevan), `Bearer` desde `token-storage.ts`, `Accept-Language: es`, timeouts por ruta (`timeouts.ts`) y un reintento tras 401.
  - `token-refresh.ts`: `POST /api/auth/refresh` de vuelo único compartido (axios, SSE y socket). Si la sesión no se puede recuperar, borra los tokens y emite `session-expired`. Un 403 nunca cierra la sesión.
  - `keepalive-auth.ts`: mantiene fresco el token de las peticiones `fetch` con `keepalive` al salir de la página (liberación del control del ventilador, vaciado de eventos del simulador).
  - `api-request.ts`: `apiGet/apiPost/apiPut/apiPatch/apiDelete` tipados por ruta y método del esquema; `unwrapResponse` convierte el envelope `{ success, data, pagination, message, traceId }` en `ApiResult`.
  - `api-error.ts` (`ApiError` con `code`, `message`, `status`, `details`, `traceId`, `retryAfter`), `use-api-query.ts` + `swr-config.tsx` (SWR con clave `[path, { params, query }]`), `sse-stream.ts` (streaming de IA por `fetch`) y `api-download.ts` (CSV).
- **Socket.io:** `src/shared/realtime/realtime-provider.tsx`.

---

## Arquitectura: Modular Fractal

```
src/
  features/<feature>/   — api/{dtos,mappers,services} + application/{components,entities,hooks,pages[,config]} + UI/*.module.css + index.ts
  shared/               — api-client, session, realtime, design-system, layouts, lib, rich-content, charts, waveforms,
                          sim-engine, ventilator-console, ai-conversation, ai-rating, media-upload, rubric-editor
                          (+ restos legados: contexts/WarmupContext.tsx, components/UI/WarmupOverlay.jsx)
pages/                  — rutas finas de Next que importan la feature por su barrel o por una entrada pública por área (`*.entry.ts`, p. ej. `@features/simulator/session.entry`) y declaran getLayout
config/                 — csp.mjs (cabeceras y CSP) y legacy-redirects.mjs
openapi/                — copia del contrato del backend
scripts/                — generate-api, check-api-contract, sync-sim-engine, sync-lab-settings, e2e/, utilidades de lecciones
```

`eslint-plugin-boundaries` define las fronteras: una feature solo importa `shared` y el `index.ts` o los `*.entry.ts` de otras features. Las entradas por área (simulator: `session`, `replay`, `result`, `history`, `patient`; ventilator-lab: `live`, `connection`, `recordings`) existen para que cada ruta cargue solo lo que usa.

### Reglas de arquitectura (OBLIGATORIAS)
1. Estilos: SOLO en archivos `.css` / `.module.css` dentro de la subcarpeta `UI/` de cada módulo. PROHIBIDO `sx={{}}`, `style={{}}` y CSS-in-JS; ESLint lo bloquea (`STYLE_BAN_SYNTAX` / `STYLE_BAN_IMPORTS`). Los tokens viven en `src/shared/design-system/UI/tokens.css` y `global.css`.
2. Cada archivo inicia con el header de comentario (funcionalidad, descripción, versión, autor…); al modificarlo se sube la versión.
3. Principios: SOLID, KISS, YAGNI (`ARQUITECTURA.md`).

---

## Mapa de features (`src/features/`, 18)

| Feature | Propósito | Rutas |
|---|---|---|
| `admin-console` | Consola de administración: usuarios (pestañas Gestión de roles y Profesores), ajustes de plataforma, auditoría, analítica de IA (filtros y agrupación por superficie y alcance), exportación para investigación, estado del sistema | `/admin/*` |
| `ai-chat` | Asistente IA conversacional con streaming (SSE); lanzador y panel montados en `_app.js` | `/assistant`, `/assistant/[conversationId]` |
| `auth` | Login (correo y Google Identity Services), registro, recuperación de contraseña, acceso denegado. La sesión vive en `@shared/session` | `/auth/*` |
| `case-editor` | Autoría de casos clínicos del simulador (con vista previa local del motor) | `/simulator/cases/**` |
| `content-editor` | Edición del contenido de aprendizaje (páginas, editor TipTap, medios) | `/content/**` |
| `evaluation-authoring` | Hub de staff de `/evaluations` (Gestionar, Calificar, Resultados) y constructor con asignación a grupos embebida y pista por pregunta | `/evaluations` (staff), `/evaluations/manage/new`, `/evaluations/manage/[id]/edit` |
| `evaluations` | Estudiante: lista agrupada tipo → ruta → nivel, intro, reproductores por tipo (quiz y taller con retroalimentación inmediata, examen paginado con reloj) y resultado con banda y feedback IA (incluye preguntas de simulación) | `/evaluations/**` |
| `grading` | Calificación unificada por evaluación (Revisar con lista de intentos y reinicio, Estadísticas, Publicación) con rúbricas y retroalimentación por IA; badge de pendientes en `_app.js` | `/grading/evaluations/[id]` (`/grading` y `/grading/attempts/[id]` redirigen) |
| `groups` | Grupos: gestión docente y "mi grupo" del estudiante | `/groups/**`, `/my-group` |
| `learning` | Aprendizaje (Bloque 2): `/learn` con pestañas Inicio, Currículo y Mi Progreso, resolvedor de módulo, visor de lecciones de julio con índice, cierre y TutorAI, notas, cola offline del progreso, gamificación (XP, nivel, racha, calendario, logros con toast) | `/learn/**` |
| `notifications` | Notificaciones en tiempo real: campana, toasts y página | `/notifications` |
| `profile` | Perfil con pestañas Información personal (nombre y foto) y Cambiar contraseña (aviso en cuentas de Google) | `/profile?tab=info|password` |
| `simulator` | Simulación de ventilador y paciente con el motor en un Web Worker, sesiones, repetición, resultados y asistente IA | `/simulator/sessions/**` (catálogo dentro de `/simulador?tab=simular`) |
| `simulator-workspace` | Panel unificado del simulador: pestañas fijas Simular Paciente (formulario de julio en 2 pasos, paciente propio), Monitoreo (Digital/Real, consola compartida), Conexión (FSM derivada de reserva y control, reservar ahora, control automático) y Mis sesiones (lista única y repetición en el panel) | `/simulador` |
| `student-space` | Espacio del estudiante: inicio, notas y calificaciones | `/me`, `/me/notes`, `/me/grades` |
| `teacher-dashboard` | Panel docente: dashboard (General y Por grupo), directorio de estudiantes con «Conformar Grupo» y estadísticas, detalle del estudiante con 5 pestañas | `/teacher`, `/teacher/students`, `/teacher/students/[userId]` |
| `teaching` | Residual: solo `data/lessons.manifest.json` (lo regeneran `postinstall`/`prestart`; sin consumidores) | — |
| `ventilator-lab` | Laboratorio con el ventilador físico: reservas, consola en vivo con telemetría y comandos, control exclusivo de operador, grabaciones; laboratorio de staff con «Próximas reservas» | `/teacher/lab`, `/lab/reservations`, `/lab/recordings/**` (resumen y consola en `/simulador?tab=conexion` y `?tab=monitoreo`) |

---

## Rutas y acceso

- `pages/` no tiene `pages/api/` ni usa `getServerSideProps`/`getStaticProps`/`getInitialProps`: la app es 100 % cliente.
- Cada página declara su layout (`getLayout`, `src/shared/layouts/get-layout.ts`). Los guards de rol viven en los layouts: `withPublicLayout`, `withStudentLayout` (`RequireAuth`), `withStudentOnlyLayout`, `withTeacherLayout`, `withAdminLayout` y `withPrintLayout` (`RequireRole`). Roles: `STUDENT`, `TEACHER`, `ADMIN`.
- Tabla de acceso por ruta: `src/shared/session/routes.config.ts`. `/` y `/dashboard` redirigen al inicio del rol (`RoleHomeRedirect`), que es `/simulador` para los tres roles (`DEFAULT_ROUTE_BY_ROLE`).
- Navegación (`src/shared/layouts/nav.config.ts`): menú lateral corto — Simulador (`/simulador`, con el indicador del ventilador y activo también en `/simulator/sessions/**` y `/lab/**` vía `activePrefixes`), Enseñanza (`/learn`) y Evaluación (`/evaluations`); «Evaluación» lleva para el staff el badge de pendientes de calificar y queda activa también en `/grading/**`; el staff suma un único ítem «Panel docente» (`/teacher`), que abre el panel (ver «Panel docente, administración y perfil»). El menú de usuario (`user-menu.config.ts`) lleva Mi resumen, Mis notas, Mis calificaciones, Mi grupo y Perfil (estudiante) o Perfil (staff), y Cerrar sesión; el asistente IA y las notificaciones viven en la barra superior.
- `/simulador?tab=simular|monitoreo|conexion|sesiones` (por defecto `monitoreo`) es el panel unificado (`src/features/simulator-workspace`). `/simulator/sessions/[id]` se conserva (EXAM y enlaces directos); `/simulator/cases/**`, `/lab/reservations` y `/lab/recordings/**` conservan sus páginas.
- Redirecciones legadas (307) en `config/legacy-redirects.mjs` (incluye `/simulator` → `/simulador?tab=simular`, `/lab` → `?tab=conexion`, `/lab/live` → `?tab=monitoreo`; solo rutas exactas; en la navegación de cliente no aplican, por eso las constantes internas apuntan a `/simulador?tab=…`) y cabeceras de seguridad + CSP (Report-Only salvo `CSP_REPORT_ONLY=false`) en `config/csp.mjs`, servidas por `next.config.mjs`.

---

## Aprendizaje (Bloque 2)

Diseño completo y desvíos: `../DISENO_BLOQUE2.md` (§2, §3, §7b y §9).

- **Rutas.** `/learn?tab=inicio|curriculo|progreso` (por defecto `curriculo`; un valor inválido da `curriculo`) con `useUrlTab` y `KeptMountedTabPanels` de `src/shared/lib` (lazy + `retryImport`, montadas una vez, `hidden`), los mismos que usa `/simulador`. El staff solo ve Currículo (sin lista de pestañas; `?tab=` se ignora) con el aviso "Vista previa". `/learn/[sectionId]` reemplaza la URL por `/learn?tab=curriculo&section=<id>` (y regla en `legacy-redirects.mjs`). `/learn/modules/[id]` es el **resolvedor**: calcula el punto de retome con `findContinueTarget` y reemplaza la URL por la lección y la página (bloqueado: `LockedContentScreen`). `/learn/modules/[id]/print` se conserva.
- **Currículo.** Dos peticiones en paralelo (`GET /api/curriculum/tree` + `GET /api/progress/summary`). Los tres acordeones de julio se arman en el cliente (VentyLab; Prerequisitos "Opcional", por el id `level-prerequisitos`; Mecánica respiratoria, abierta por defecto; `?section=` abre otro). Tarjetas con 5 estados (completed, in-progress, available, locked, coming_soon); solo el botón navega. Staff: "Modo edición" (localStorage `learning.editMode.v1`) con enlaces "Editar en el CMS" a `/content?node=level:<id>|module:<id>`.
- **Visor.** Sin cascada: listado de páginas, lecciones del módulo, acceso (`GET /api/lessons/{id}/access`) y progreso del módulo en paralelo, luego `GET /api/pages/{id}` (un 403 `progress.lesson_locked` también muestra el bloqueo). Precarga de la página siguiente (SWR `preload` + `router.prefetch`). Índice de lecciones del módulo (columna derecha; Drawer por debajo de md), "Página x de N" con barra, diálogo "¡Lección Completada!" con confeti lazy (no con `prefers-reduced-motion`) y "Continuar a la Siguiente Lección", tarjeta `ModuleCompletion` dentro del visor. Staff: sin bloqueos, sin registro de vista y "Editar esta página" hacia `/content/pages/[id]`.
- **Progreso y cola offline.** La vista (`POST /api/progress/pages/{id}/view`) se envía a los 5 s o al pulsar Siguiente. Si falla por red, 408, 429 o 5xx queda en `progressOutbox` (localStorage `progress.outbox.v1:<userId>`, conjunto de `pageId`; el servidor es idempotente), que se vacía al montar, con `online` y con `visibilitychange`, con backoff (2 s a 60 s) y `navigator.locks` (o `BroadcastChannel`) entre pestañas. 403 y 404 se descartan con `console.warn`. `PAGE_VIEW_INVALIDATES` refresca progreso y gamificación; el árbol, solo cuando la lección se completó.
- **TutorAI.** FAB "Abrir TutorAI" en el visor y popup lazy (Sugerencias; Preguntas con alcance lección o módulo; Notas con análisis por IA) y acordeón "¿Te gustaría expandir más este tema?" al final de cada página. Popup y acordeón usan `useTutorTurn` (`src/shared/ai-conversation`: iniciar, detener, reintentar, ids desde el evento SSE `start`); el asistente sigue en `useStreamingResponse`. Toda respuesta de IA se valora con `AiRatingWidget` (`surface` POPUP, ACCORDION, ASSISTANT o NOTES_ANALYSIS, y `scope`). Las sugerencias prellenan el campo, no envían.
- **Inicio y Mi Progreso.** Inicio reutiliza los bloques de `/me` (`student-space`): "Continuar donde quedaste" (`continueLearning` de `/api/me/summary`), "XP Hoy", actividad reciente y evaluaciones pendientes. Mi Progreso: nivel y XP, racha, "Calendario de actividad" (12 semanas), logros, hitos y árbol de habilidades derivados del currículo. `AchievementToasts` escucha `achievement:unlocked` (solo estudiantes).

**Dueños del estado**

| Estado | Dueño | Mecanismo |
|---|---|---|
| Pestaña, sección abierta, lección y página | URL | `router.query` |
| Árbol, resumen, gamificación, actividad, logros | servidor | SWR (`LEARNING_QUERY_CONFIG`) |
| Acceso a la lección | servidor | `GET /api/lessons/{id}/access` + 403 |
| Vistas pendientes sin red | `progressOutbox` | localStorage por usuario + `navigator.locks` |
| Prompt prellenado de Sugerencias | store del visor | `useSyncExternalStore` |
| Texto en streaming | `useTutorTurn` / `useStreamingResponse` | commit por frame |
| Modo edición | store pequeño | `useSyncExternalStore` + localStorage |
| Popup abierto y su pestaña | `TutorPopup` | estado local |

**Limitaciones conocidas**

- `GET /api/pages/{id}` sin token no aplica el orden (el web siempre envía el token).
- Dos primeras vistas simultáneas de las dos últimas páginas de una lección (por ejemplo, dos pestañas) pueden no completar la lección hasta la siguiente vista (nunca hay duplicados).
- La racha histórica queda subestimada: el backfill del servidor solo conoce primeras y últimas marcas.
- Una respuesta abortada antes del primer token no se puede valorar; las que fallan a mitad del streaming no se pueden valorar en Profundizar ni en Preguntas (en el asistente sí).
- La tarjeta del currículo pasa a "Continuar" solo con una lección completada (el resumen cuenta lecciones, no páginas); con páginas vistas dice "Comenzar", aunque el resolvedor retoma en la página correcta. "Continuar donde quedaste" de Inicio sí refleja la página.
- Mediciones: `docs/bloque2/perf-baseline.md` y `docs/bloque2/perf-after.md`; capturas en `docs/bloque2/capturas/`.

---

## Evaluación (Bloque 3)

Diseño, decisiones por defecto y desvíos: `../DISENO_BLOQUE3.md` (§2, §3, §7b y §9). La política por tipo la decide el servidor: QUIZ y WORKSHOP con retroalimentación inmediata y publicación automática; EXAM sin retroalimentación y publicado por el docente.

- **Rutas.** `/evaluations` decide por rol: estudiante → `EvaluationsListPage`; staff → `StaffEvaluationsHub` (lazy, `?tab=gestionar|calificar|resultados`, el chunk nunca se descarga para estudiantes). `/evaluations/manage` → `?tab=gestionar`, `/grading` → `?tab=calificar`, `/evaluations/manage/[id]/assignments` → `/evaluations/manage/[id]/edit?section=asignacion`, `/grading/attempts/[id]` resuelve a `/grading/evaluations/<evalId>?attempt=<id>` (páginas finas con `router.replace` + reglas en `legacy-redirects.mjs`). Las páginas importan entradas `*.entry.ts` (`list`, `intro`, `player`, `result`, `review`, `module-evaluations`), no el barrel.
- **Lista del estudiante.** Pestañas Activas/Próximas/Cerradas y, dentro, las tres secciones de julio (📝 Quizzes, 📋 Talleres, 🎓 Exámenes Finales; siempre visibles) agrupadas por ruta (Mecánica, VentyLab, otras, "Otras") y nivel (`groupEvaluations`, puro). `?moduleId=` filtra por módulo ("Ver todas"). En el currículo de `/learn`, "Quiz del módulo" solo aparece en tarjetas de módulos con evaluaciones del estudiante, derivado de una sola lectura de `my-evaluations` (`useEvaluatedModuleIds`, misma clave SWR que la lista).
- **Reproductor.** `layoutFor(type)`: QUIZ (todas las preguntas, opción única y V/F se comprueban al elegir con `POST .../check`; opción múltiple con "Comprobar respuesta"), WORKSHOP ("Paso n de N", "Pista 💡" que nunca usa la explicación) y EXAM (paginado, navegador, marcar para revisión, sin retroalimentación). Una respuesta revelada queda bloqueada (409 `answer_locked` es estado final de la cola de autoguardado). Reloj con avisos `aria-live` (EXAM 10 y 5 min; quiz y taller 5 y 1) y envío automático al vencer, con reintentos. Foco en el `h2` de la pregunta y Alt+←/→.
- **Resultado.** Banda de julio (veredicto, "{c} de {t} correctas" o "Respuestas enviadas — pendiente de revisión por el docente" con la nota parcial de las cerradas). Intento y feedback se piden en paralelo; cada bloque de feedback trae su `myRating` (sin `ai-ratings/mine`) y valora con `surface=EVALUATION_FEEDBACK`.
- **Staff.** Constructor (`/evaluations/manage/[id]/edit`) con la sección "Asignación a grupos" (tabla y formulario "Nueva asignación", solo en READY; `?section=asignacion` hace scroll y foco). Calificación unificada `/grading/evaluations/[id]?tab=revisar|estadisticas|publicacion&attempt=&group=&status=`: lista "Total · Entregadas · Calificadas", panel de revisión, guard de cambios sin guardar también al cambiar `?attempt`, y "Reiniciar intento" (motivo obligatorio; concede un intento más sin borrar nada; notificación `ATTEMPT_RESET`).
- **Mediciones y capturas:** `docs/bloque3/perf-baseline.md` (antes y después) y `docs/bloque3/capturas/`.

**Limitaciones conocidas**

- Con `maxAttempts > 1` en QUIZ o TALLER, la corrección revelada de lo respondido sirve en el intento siguiente (riesgo aceptado, como en julio).
- La subida de imágenes del constructor necesita Supabase Storage: en local sin `SUPABASE_*` el backend responde 503 y el E2E (5) omite ese paso con una anotación.
- Calificar sigue siendo una cola por intento (julio listaba por actividad; ver backlog del diseño).

---

## Panel docente, administración y perfil (Bloque 4)

Diseño, decisiones por defecto y desvíos: `../DISENO_BLOQUE4.md` (§2, §3, §7b y §9).

- **Panel como espacio propio.** `withTeacherLayout` y `withAdminLayout` (y la rama de staff de `/evaluations`) renderizan `PanelShell` (`src/shared/layouts/panel-shell.tsx`) en lugar del shell principal: menú lateral colapsable (estado en `localStorage` con try/catch), cabecera con nombre, correo y chip de rol, y pie «Volver a la plataforma» → `/simulador`. Ítems en `panel-nav.config.ts`: Dashboard, Estudiantes, Grupos, Contenido, Casos clínicos, Evaluaciones (badge de pendientes, activo en `/grading/**`) y Laboratorio (indicador del ventilador) para el staff; sección «Administración» con Estado del sistema (staff) y Usuarios, Configuración, Auditoría, Analítica de IA e Investigación (ADMIN). Se conservan las rutas actuales; `/panel/students` → `/teacher/students` (307).
- **Rutas.** `/teacher?tab=general|grupo` (por defecto General; con `?groupId` sin `tab`, Por grupo), `/teacher/students?tab&page&q&sort&scope`, `/teacher/students/[userId]?tab=modulos|evaluaciones|simulador|actividad|gamificacion`, `/teacher/lab`, `/admin/users?tab=usuarios|profesores`, `/admin/ai?surface&scope`, `/profile?tab=info|password`. Pestañas con `useUrlTab` + `KeptMountedTabPanels`; constructores de URL en `teacher-dashboard.routes.ts`.
- **Dashboard.** General: saludo por hora de Bogotá, 4 tarjetas de `GET /api/admin/statistics` (se oculta la que no tiene dato), «Estudiantes recientes» (`admin/students?limit=5&sortBy=lastActivity`, `myGroups=true` para docentes) y accesos rápidos. Por grupo: el dashboard del grupo de siempre; su tabla renderiza una página de 25 filas (paginación en el cliente, Ola 4) para que un grupo de 500 no bloquee el hilo.
- **Directorio.** `GET /api/admin/students` paginado en el servidor (25 por página), búsqueda con debounce por nombre, correo o código, orden por columna, filtro «Todos»/«Mis grupos»; la selección se limpia al cambiar de página o filtro; las filas sin `canView` muestran «Sin acceso». «Conformar Grupo» crea el grupo y agrega los miembros con `Promise.allSettled` (concurrencia 4) y muestra el motivo por estudiante si alguno falla.
- **Detalle.** Cabecera (código y grupos vienen en `StudentDTO`) y pestañas Módulos, Evaluaciones (enlace a la calificación del Bloque 3), Simulador (sesiones y grabaciones del equipo real si existen), Actividad y Gamificación; peticiones en paralelo. **Privacidad:** nunca pide notas personales ni chats de IA. Un docente fuera de alcance ve «No tienes acceso a este estudiante» (403 del servidor).
- **Laboratorio de staff.** `/teacher/lab` monta la página de reservas dentro del panel y suma «Próximas reservas» (7 días, solo lectura); el docente reserva para los grupos que creó o supervisa y «para otro usuario» es solo ADMIN.
- **Administración.** Usuarios: «Editar código» también deshabilitado en la fila del superadmin; pestaña Profesores sobre `GET /api/admin/teachers`. Analítica de IA: filtros `surface` y `scope` en la URL, tabla agrupada por superficie y alcance, CSV del servidor con esas columnas. `assist-panel` y `module-notes-analysis` envían su superficie (`SIMULATOR_ASSIST`, `NOTES_ANALYSIS` con `scope=MODULE`).
- **Perfil.** Cambiar contraseña usa `POST /api/auth/change-password` y guarda el par reemitido con `saveTokens` (las otras pestañas se enteran por el evento `storage`); los refresh tokens anteriores quedan revocados. Con `hasPassword=false` se muestra «Tu cuenta usa Google; la contraseña se gestiona en Google.». La foto se recorta al centro y se reduce a 512 px con canvas y se sube al elegirla (`PUT/DELETE /api/users/me/avatar`); `image` es una URL firmada que no se guarda.
- **Mediciones y capturas:** `docs/bloque4/perf/` (sonda `e2e/perf/teacher-perf.spec.ts`, antes y después) y `docs/bloque4/capturas/`.

**Limitaciones conocidas**

- La foto se sube sin un paso de recorte interactivo; jpeg y webp se recodifican como jpeg.
- Tras cambiar la contraseña, el access token de otros dispositivos sigue vivo hasta que vence (15 min).
- La tabla Por grupo pagina en el cliente: el servidor sigue enviando el grupo completo en una sola respuesta.

---

## Providers globales (`pages/_app.js`, de afuera hacia adentro)

1. `ThemeProvider` (MUI, `@shared/design-system/theme`) + `CssBaseline`
2. `RouteErrorBoundary`
3. `ApiSWRProvider` (`@shared/api-client/swr-config`)
4. `AuthProvider` (`@shared/session/auth-provider`)
5. `RealtimeProvider` (Socket.io)
6. `NavBadgeProvider` (+ `GradingPendingBadgeSync`, `NotificationsBadgeSync`)
7. `NavIndicatorProvider` (+ `DeviceStatusNavIndicatorSync`)
8. `WarmupProvider` (arranque en frío del backend, `GET /health` + `WarmupOverlay`)
9. `ToastProvider` (+ `NotificationToasts`)
10. `AiChatProvider` → `TopBarActionsProvider` (lanzador de IA y campana) → layout de la página

Sentry se inicia de forma diferida (`startErrorReporting`) y `@features/simulator/composition/register-exam-practical-slot` se importa como efecto lateral.

---

## Rendimiento del simulador (Bloque 1)

- Los datos de alta frecuencia nunca pasan por React: el worker (lotes a 30 Hz) o el socket alimentan un `WaveformRingBuffer` que los painters de `shared/waveforms` dibujan por tiempo en cada rAF (`playback-clock.ts`, retardo de 50 ms).
- La consola lee estado de baja frecuencia (≤ 4 Hz) desde un store externo (`shared/ventilator-console/application/console-store.ts`) con `useSyncExternalStore` y selectores por zona; el adaptador es estable entre ticks.
- En `/simulador` las pestañas se cargan en lazy en la primera visita y quedan montadas (`hidden`); la sesión digital (`WorkspaceSessionProvider`, que carga el runner en lazy) y la conexión al equipo (`LabConnectionProvider`) viven por encima de las pestañas. `lab-live.lazy-boundary.test.ts` impide que la consola entre en el chunk inicial.
- Mediciones y protocolo: `docs/bloque1/perf-baseline.md` y `docs/bloque1/perf-final.md` (`npm run perf:sim`, `npm run perf:bundle`).

## Pruebas y calidad

- vitest coubicado (`*.test.ts(x)` junto al código), entorno jsdom, msw para HTTP. Carpetas incluidas en `vitest.config.ts`.
- Scripts: `npm run typecheck` (`tsconfig.strict.json`), `npm run lint` (lista explícita de carpetas), `npm test`, `npm run build`, `npm run check:api`; knip con `npx --yes knip@5`.
- CI (`.github/workflows/ci.yml`, Node 22): typecheck, lint, pruebas en 6 lotes, build, knip y `check:api` contra el backend.
- E2E con Playwright (`playwright.config.ts`, carpeta `e2e/`, `npm run e2e`): flujo del estudiante en `/simulador`, reservar ahora y modo Real (titular, líder y miembro observador), pregunta SIMULATION de examen y redirecciones. Bloque 2 (`e2e/bloque2/`): retome y cierre de lección, bloqueos (UI y 403), TutorAI, Mi Progreso, vista previa del staff, progreso sin red y layout del visor; cada escenario registra un estudiante nuevo y TutorAI corre contra el backend real con `OPENAI_BASE_URL` apuntando a `scripts/e2e/fake-llm.mjs` (ver `scripts/e2e/README.md`). Bloque 3 (`e2e/bloque3/`): quiz con retroalimentación inmediata, nota publicada y feedback IA valorado; taller con pista, pregunta abierta, nota parcial y revisión docente; examen con pregunta SIMULATION y envío automático al vencer el tiempo; reinicio de intento; constructor con asignación embebida; lista agrupada (cada escenario crea su grupo y estudiantes por la API). Bloque 4 (`e2e/bloque4/`, ayudas en `e2e/support/panel.ts`): Panel → General → estudiante reciente → detalle sin notas ni chats; directorio → «Conformar Grupo» → líder; reserva de grupo desde `/teacher/lab` y control del líder en `/simulador`; cambio de rol, superadmin inmutable y Profesores; cambio de contraseña con revocación del refresh anterior; foto de perfil; 403 del docente sin supervisión; filtros y CSV de `/admin/ai` con valoraciones de los Bloques 2 y 3; «Volver a la plataforma». `E2E_CAPTURES=1` regenera las capturas. Requiere el stack local (backend en :4000 y web en :3000; `E2E_BASE_URL`).
- `next.config.mjs` usa `typescript.ignoreBuildErrors: true`: la garantía de tipos es el `typecheck` de la CI.

---

## Despliegue

- **Web:** Vercel (`vercel.json`: `npm install --include=dev`, `npm run build`). Variables en `.env.example`; `NEXT_PUBLIC_BACKEND_URL` es obligatoria en producción. Node 22 (`.nvmrc`, `.node-version`).
- **Backend:** `ventylab-server` corre como **contenedor persistente de una sola réplica** (Socket.io, MQTT, SSE y tareas programadas en memoria: no es apto para serverless), desplegado en Dokploy.
- **Base de datos:** PostgreSQL en Dokploy, propiedad exclusiva del backend (Prisma y migraciones viven en `ventylab-server`). La web nunca se conecta a ella.
