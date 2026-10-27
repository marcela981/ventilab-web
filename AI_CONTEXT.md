<!--
* Funcionalidad: Contexto del repositorio para asistentes de IA
* Descripción: Estado real de ventilab-web: stack, backend NestJS y cliente OpenAPI generado, features, rutas, providers, estilos, pruebas y despliegue. v1.0 (A9): reescrito desde el código; reemplaza la versión de julio de 2026 (NextAuth, pages/api, backend Express, Prisma), que ya no aplica. v1.1 (W1 Bloque 1): navegación del simulador unificado (/simulador como inicio de todos los roles, menú lateral corto, menú de usuario por rol, redirecciones de /simulator y /lab*) y la feature simulator-workspace. v1.2 (W13 Bloque 1): panel /simulador completo (pestañas montadas, sesión y conexión por encima), store externo de la consola, curvas por tiempo, entradas *.entry.ts por área y Playwright (e2e y rendimiento).
* Versión: 1.2
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
| `admin-console` | Consola de administración: usuarios, ajustes de plataforma, auditoría, analítica de IA, exportación para investigación, estado del sistema | `/admin/*` |
| `ai-chat` | Asistente IA conversacional con streaming (SSE); lanzador y panel montados en `_app.js` | `/assistant`, `/assistant/[conversationId]` |
| `auth` | Login (correo y Google Identity Services), registro, recuperación de contraseña, acceso denegado. La sesión vive en `@shared/session` | `/auth/*` |
| `case-editor` | Autoría de casos clínicos del simulador (con vista previa local del motor) | `/simulator/cases/**` |
| `content-editor` | Edición del contenido de aprendizaje (páginas, editor TipTap, medios) | `/content/**` |
| `evaluation-authoring` | Creación, edición y asignación de evaluaciones | `/evaluations/manage/**` |
| `evaluations` | Presentación de evaluaciones por el estudiante, intentos y resultados (incluye preguntas de simulación) | `/evaluations/**` |
| `grading` | Calificación docente con rúbricas y retroalimentación por IA; badge de pendientes en `_app.js` | `/grading/**` |
| `groups` | Grupos: gestión docente y "mi grupo" del estudiante | `/groups/**`, `/my-group` |
| `learning` | Feature principal de aprendizaje: secciones, módulos, lecciones, notas, progreso y tutor IA | `/learn/**` |
| `notifications` | Notificaciones en tiempo real: campana, toasts y página | `/notifications` |
| `profile` | Perfil del usuario | `/profile` |
| `simulator` | Simulación de ventilador y paciente con el motor en un Web Worker, sesiones, repetición, resultados y asistente IA | `/simulator/sessions/**` (catálogo dentro de `/simulador?tab=simular`) |
| `simulator-workspace` | Panel unificado del simulador: pestañas fijas Simular Paciente (formulario de julio en 2 pasos, paciente propio), Monitoreo (Digital/Real, consola compartida), Conexión (FSM derivada de reserva y control, reservar ahora, control automático) y Mis sesiones (lista única y repetición en el panel) | `/simulador` |
| `student-space` | Espacio del estudiante: inicio, notas y calificaciones | `/me`, `/me/notes`, `/me/grades` |
| `teacher-dashboard` | Panel docente y seguimiento de estudiantes | `/teacher`, `/teacher/students/[userId]` |
| `teaching` | Residual: solo `data/lessons.manifest.json` (lo regeneran `postinstall`/`prestart`; sin consumidores) | — |
| `ventilator-lab` | Laboratorio con el ventilador físico: reservas, consola en vivo con telemetría y comandos, control exclusivo de operador, grabaciones | `/lab/reservations`, `/lab/recordings/**` (resumen y consola en `/simulador?tab=conexion` y `?tab=monitoreo`) |

---

## Rutas y acceso

- `pages/` no tiene `pages/api/` ni usa `getServerSideProps`/`getStaticProps`/`getInitialProps`: la app es 100 % cliente.
- Cada página declara su layout (`getLayout`, `src/shared/layouts/get-layout.ts`). Los guards de rol viven en los layouts: `withPublicLayout`, `withStudentLayout` (`RequireAuth`), `withStudentOnlyLayout`, `withTeacherLayout`, `withAdminLayout` y `withPrintLayout` (`RequireRole`). Roles: `STUDENT`, `TEACHER`, `ADMIN`.
- Tabla de acceso por ruta: `src/shared/session/routes.config.ts`. `/` y `/dashboard` redirigen al inicio del rol (`RoleHomeRedirect`), que es `/simulador` para los tres roles (`DEFAULT_ROUTE_BY_ROLE`).
- Navegación (`src/shared/layouts/nav.config.ts`): menú lateral corto — Simulador (`/simulador`, con el indicador del ventilador y activo también en `/simulator/sessions/**` y `/lab/**` vía `activePrefixes`), Enseñanza (`/learn`) y Evaluación (`/evaluations`); el staff suma la sección «Panel docente» (Resumen `/teacher`, Grupos, Contenido, Gestionar evaluaciones, Casos clínicos, Calificar, Estado del sistema) y ADMIN la sección «Administración». El menú de usuario (`user-menu.config.ts`) lleva Mi resumen, Mis notas, Mis calificaciones, Mi grupo y Perfil (estudiante) o Perfil (staff), y Cerrar sesión; el asistente IA y las notificaciones viven en la barra superior.
- `/simulador?tab=simular|monitoreo|conexion|sesiones` (por defecto `monitoreo`) es el panel unificado (`src/features/simulator-workspace`). `/simulator/sessions/[id]` se conserva (EXAM y enlaces directos); `/simulator/cases/**`, `/lab/reservations` y `/lab/recordings/**` conservan sus páginas.
- Redirecciones legadas (307) en `config/legacy-redirects.mjs` (incluye `/simulator` → `/simulador?tab=simular`, `/lab` → `?tab=conexion`, `/lab/live` → `?tab=monitoreo`; solo rutas exactas; en la navegación de cliente no aplican, por eso las constantes internas apuntan a `/simulador?tab=…`) y cabeceras de seguridad + CSP (Report-Only salvo `CSP_REPORT_ONLY=false`) en `config/csp.mjs`, servidas por `next.config.mjs`.

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
- E2E con Playwright (`playwright.config.ts`, carpeta `e2e/`, `npm run e2e`): flujo del estudiante en `/simulador`, reservar ahora y modo Real (titular, líder y miembro observador), pregunta SIMULATION de examen y redirecciones. Requiere el stack local (backend en :4000 y web en :3000; `E2E_BASE_URL`).
- `next.config.mjs` usa `typescript.ignoreBuildErrors: true`: la garantía de tipos es el `typecheck` de la CI.

---

## Despliegue

- **Web:** Vercel (`vercel.json`: `npm install --include=dev`, `npm run build`). Variables en `.env.example`; `NEXT_PUBLIC_BACKEND_URL` es obligatoria en producción. Node 22 (`.nvmrc`, `.node-version`).
- **Backend:** `ventylab-server` corre como **contenedor persistente de una sola réplica** (Socket.io, MQTT, SSE y tareas programadas en memoria: no es apto para serverless), desplegado en Dokploy.
- **Base de datos:** PostgreSQL en Dokploy, propiedad exclusiva del backend (Prisma y migraciones viven en `ventylab-server`). La web nunca se conecta a ella.
