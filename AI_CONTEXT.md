# VentyLab — Contexto para IA

## Descripción del proyecto
Sistema Ciberfísico Educativo para enseñanza de ventilación mecánica.
Tesis de Marcela Mazo Castro — Universidad del Valle.

Este documento refleja el árbol **post-limpieza** (rama `cleanup-pre-entrega`, julio 2026).
Repo hermano: `../ventylab-server` (backend Express + TS, tiene su propio AI_CONTEXT.md).

**Stack:**
- Next.js 16 (Pages Router, `next dev/build --webpack`), React 19, TypeScript 5 (codebase mixto JS/TS)
- UI: Material UI v7 + Emotion; Chart.js 4 (react-chartjs-2); @mui/x-date-pickers
- Datos: SWR 2 (claves en `src/lib/swrKeys.ts`) + axios (cliente propio); react-hook-form + zod
- Auth: NextAuth v4 + @next-auth/prisma-adapter; JWT puente hacia el backend Express
- DB (solo rutas API de Next): PostgreSQL + Prisma 6 (`prisma/schema.prisma`, seed `prisma/seed.ts`)
- Realtime: socket.io-client 4
- IA: @google/generative-ai (Gemini)
- Contenido: react-markdown + remark-gfm/remark-math + KaTeX; TipTap 3 (editor rico); dompurify
- i18n: i18next / react-i18next (es/en)

---

## Arquitectura: Modular Fractal

```
src/
  features/       — un dominio por carpeta (ver mapa abajo)
  shared/         — componentes, contexts, hooks, servicios transversales
  lib/            — helpers (apiAuth, auth-config, curriculumResolver, prisma, roles, swrKeys)
  contracts/      — tipos compartidos con el backend (admin, patient, simulator)
  config/env.ts   — resolución de URL del backend
  theme/ styles/ i18n/ types/ telemetry/
pages/            — rutas Next.js (Pages Router) + pages/api/
lib/ (raíz)       — server-only: auth.ts, prisma.ts, db-logger.ts
prisma/           — schema PostgreSQL + seed
```

### Reglas de arquitectura (OBLIGATORIAS)
1. Estilos: SOLO en archivos `.css` externos dentro de subcarpeta `ui/` de cada módulo. PROHIBIDO `sx={{}}`, `style={{}}`, styled-components.
2. Cada archivo inicia con header de comentario indicando funcionalidad, versión, autor.
3. Principios: SOLID, KISS, YAGNI.

---

## Mapa de features vivas (`src/features/`)

| Feature | Propósito | Subcarpetas clave |
|---|---|---|
| `admin/` | Panel teacher/admin: estudiantes, estadísticas | components/ (panel/pages), hooks/, services/, useStudents.ts |
| `ai-feedback/` | Capa cliente de IA (Gemini) | hooks/, services/ (prompts/system.ts), ai.api.ts, ai.types.ts |
| `auth/` | Login/registro/sesión + guards | components/, auth.api.ts, auth.types.ts |
| `dashboard/` | Widgets del dashboard estudiante (KPIs, tareas, recomendaciones) | components/ (~12 tiles), hooks/, DashboardTab.tsx |
| `ensenanza/` | **Feature principal**: curriculum, lecciones, editor, generación IA | config/, curriculum/ (ensenanzaRespiratoria, ensenanzaVentylab, preRequisitos), shared/ (components, contexts, dashboard, data, hooks, progreso, services, utils) |
| `evaluation/` | Actividades, quizzes, entregas, calificación | api/, components/ (builder, dashboard, grading, student), context/ (EvaluationContext), data/clinicalCases, hooks/, services/, shared/, UI/ |
| `profile/` | Perfil de usuario | components/, profile.api.ts, useProfile.ts |
| `progress/` | Progreso gamificado: XP, rachas, logros. **Zona intocable** (LearningProgressContext, curriculumData, JSON de lecciones) | components/, hooks/, services/, utils/, AchievementContext.jsx, LearningProgressContext.jsx |
| `simulador/` | Simulador ventilador/paciente con conectividad a dispositivo | compartido/, conexion/ (mqtt, serial, websocket, contexto), simuladorPaciente/, simuladorVentilador/ (dashboard, graficasMonitor, IAMonitor, panelControl) |
| `teaching/` | Residual: solo data/ (lessons.manifest.json regenerado por prestart) | data/ |

---

## Rutas (pages/)

Públicas/estudiante: `/`, `/dashboard`, `/achievements`, `/flashcards`, `/profile`, `/search`, `/simulador`, `/teaching`, `/teaching/[moduleId]/[lessonId]`
Auth: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/error`, `/auth/access-denied`
Panel (teacher/admin): `/panel`, `/panel/admin`, `/panel/settings`, `/panel/students`, `/panel/students/[id]`, `/admin/search-analytics`
Evaluación: `/evaluation`, `/evaluation/[activityId]`, `/evaluation/grade`, `/evaluation/grade/[activityId]`, `/evaluation/manage`, `/evaluation/manage/new`, `/evaluation/manage/[activityId]/edit`

### APIs Next.js (pages/api/)
- `/api/auth/[...nextauth]` — handler NextAuth
- `/api/auth/backend-token` — emite JWT para el backend (devuelve `{ token }` **sin** envelope; excepción a la convención)
- `/api/curriculum/lessons/[lessonId]` (+ `/sections`, `/sections/[sectionIndex]`, `/sections/reorder`)
- `/api/curriculum/levels/[levelId]`, `/api/curriculum/modules/[moduleId]`

---

## Acoplamiento con el backend

- Cliente HTTP: `src/shared/services/api/http.ts` — exporta `http` (axios, timeout 8s) y `httpSlow` (60s, para health/login/warmup). Ambos `withCredentials`, interceptores de token, refresh en 401 (vía `/api/auth/backend-token`) y logout en 403.
- Base URL: `BACKEND_API_URL` desde `src/config/env.ts` = `${BACKEND_URL}/api` (env `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL`, fallback `http://localhost:4000`). **`httpSlow`/`http` ya incluyen `/api`** — no duplicar el prefijo en las llamadas.
- Envelope de respuesta del backend: `{ success, data }` (+ `message` en errores).

---

## Contextos globales (`pages/_app.js`, de afuera hacia adentro)

1. `ErrorBoundary` — shared/components
2. `Providers` — src/providers/Providers.jsx (pass-through + fetch utils)
3. `WarmupProvider` — shared/contexts/WarmupContext.tsx (detección de cold-start del backend + overlay)
4. `SessionProvider` (next-auth) — refetch 5 min
5. `AuthProvider` — shared/contexts/AuthContext.jsx
6. `SocketProvider` — shared/contexts/SocketContext.tsx
7. `ThemeProvider` (MUI) — src/theme
8. `NotificationProvider` — shared/contexts/NotificationContext.jsx
9. `PatientDataProvider` — features/simulador/simuladorPaciente/contexto
10. Layout condicional: páginas auth/panel sin sidebar; resto con `SidebarContext.Provider` + `Sidebar`

`LearningProgressContext`, `AchievementContext` y `EvaluationContext` NO son globales: envuelven sus páginas de feature localmente.

---

## Problemas conocidos

- **tsc no es baseline verde**: ~280 errores de tipo preexistentes (`npx tsc --noEmit`). Para verificar una feature, filtrar la salida por ruta. La limpieza pre-entrega no agregó errores (291 → 280).
- **NextAuth 404 en dev**: `/api/auth/*` devolviendo 404 = compilación obsoleta de `[...nextauth]`, no incompatibilidad. No correr `next build` con el dev server activo.
- **Colisiones de barrels** (index.js vs index.ts en el mismo dir, exportan sets distintos; uno shadowea al otro): `features/dashboard/components/` y `features/ensenanza/shared/components/modulos/`.
- **Pares .js/.ts vivos en paralelo** (no consolidar sin revisar): `progress/services/progressService.js` y `.ts` (ambos importados con extensión explícita); `evaluation/services/evaluationService.js` (runtime) vs `evaluation/shared/services/evaluationService.ts` (solo tipos); `ensenanza/shared/hooks/useModuleProgress.js` y `.ts` (imports sin extensión).
- **Resolución webpack archivo-antes-que-carpeta**: `import './X'` toma `X.jsx` por sobre `X/index.ts`.
- `lessons.manifest.json` duplicado: `features/teaching/data/` (regenerado por el script de prestart) vs `features/ensenanza/shared/data/` (stale, sin imports).
- `src/features/teaching/` es residual; la feature viva es `ensenanza/`.
- `src/hooks/` quedó vacío tras la limpieza.
- Este repo **no tiene tests** (los únicos tests del proyecto están en el server, diferidos en `__deferred_tests__/`).

## Nota de limpieza (julio 2026)
Rama `cleanup-pre-entrega`: checkpoint `55b9a8a` (estado previo) → `ce570d7` (limpieza, 96 archivos, −32.625 líneas). Se eliminaron huérfanos confirmados, scaffolding (docs/backups, docs/analysis, docs/examples, dev-notes, guías), duplicados shadowed y el `contracts/` raíz roto. Ítems dudosos (barrels en colisión, pares .js/.ts, manifest stale) se dejaron intactos a propósito.
