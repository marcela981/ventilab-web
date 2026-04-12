# VentyLab — Contexto para IA

## Descripción del proyecto
Sistema Ciberfísico Educativo para enseñanza de ventilación mecánica.
Tesis de Marcela Mazo Castro — Universidad del Valle.

**Stack:**
- Frontend: Next.js 15 (Pages Router), React 19, Material UI v7, Chart.js, Socket.io-client
- Base de datos: PostgreSQL + Prisma ORM
- Auth: NextAuth v4
- IA: @google/generative-ai (Gemini), Anthropic/OpenAI via proxy

## Arquitectura: Modular Fractal
```
src/
  features/
    admin/        (25 archivos) — Panel admin/teacher, gestión de grupos
    ai-feedback/  (15 archivos) — Retroalimentación con LLM
    auth/         (4 archivos)  — Guards de autenticación
    dashboard/    (20 archivos) — Dashboard estudiante
    ensenanza/    (201 archivos)— Módulo principal: curriculum, lecciones, editor
    evaluation/   (24 archivos) — Talleres, quizzes, exámenes
    profile/      (8 archivos)  — Perfil de usuario
    progress/     (52 archivos) — Seguimiento de progreso y logros
    settings/     (5 archivos)  — Configuración de usuario
    simulador/    (72 archivos) — Simulador de ventilador (digital + MQTT)
  shared/         — Componentes, contexts, hooks, servicios globales
  styles/         — Variables CSS globales (theme.css, animations.js)
  theme/          — Tema MUI
  i18n/           — Internacionalización (es/en)

pages/            — Rutas Next.js (Pages Router)
contracts/        — Interfaces TypeScript por dominio
lib/              — Prisma client, auth helpers
prisma/           — Schema PostgreSQL
```

## Reglas de arquitectura (OBLIGATORIAS)
1. Estilos: SOLO en archivos .css externos dentro de subcarpeta `ui/` de cada módulo. PROHIBIDO sx={{}}, style={{}}, styled-components.
2. Cada archivo inicia con header de comentario indicando funcionalidad, versión, autor.
3. Principios: SOLID, KISS, YAGNI.

## Rutas principales (pages/)
| Ruta | Descripción |
|------|-------------|
| `/` | Redirect a /dashboard → /simulador |
| `/auth/login` | Login (NextAuth) |
| `/auth/register` | Registro |
| `/simulador` | Simulador ventilador |
| `/teaching` | Lista módulos de enseñanza |
| `/teaching/[moduleId]/[lessonId]` | Lección individual |
| `/evaluation` | Lista evaluaciones estudiante |
| `/evaluation/[activityId]` | Evaluación activa |
| `/evaluation/manage` | Gestión evaluaciones (teacher/admin) |
| `/panel` | Panel teacher/admin |
| `/panel/admin` | Panel admin |
| `/panel/students` | Gestión estudiantes |
| `/profile` | Perfil usuario |
| `/achievements` | Logros |
| `/flashcards` | Tarjetas de estudio |
| `/search` | Búsqueda global |
| `/settings` | Configuración |

## APIs Next.js (pages/api/)
- `/api/auth/[...nextauth]` — NextAuth
- `/api/auth/backend-token` — Token para backend externo
- `/api/curriculum/lessons/[lessonId]` — CRUD lecciones
- `/api/curriculum/lessons/[lessonId]/sections` — CRUD secciones
- `/api/curriculum/levels/[levelId]` — Niveles
- `/api/curriculum/modules/[moduleId]` — Módulos

## Backend externo (Express, puerto 4000)
- Se accede desde el frontend vía proxy en `/backend/*` → `http://localhost:4000/api/*`
- Maneja: simulación MQTT, Socket.io, lógica de ventilador

## Modelos de base de datos (Prisma)
Entidades principales:
- `User` (roles: STUDENT, TEACHER, ADMIN)
- `TeacherStudent` — relación teacher↔student
- `EvaluationAttempt`, `QuizAttempt` — intentos de evaluación
- `Achievement` — logros
- `UserProgress`, `LessonCompletion` — progreso en curriculum
- `Page`, `ContentOverride` — contenido editable del curriculum

## Problemas conocidos
- 272 archivos usan sx={{}} (violación de estilo) — pendiente de migrar
- Prisma generate falla con EPERM en Windows si hay proceso node bloqueando el .dll
- Build debe ejecutarse desde PowerShell (no Git Bash) en Windows

## Dependencias clave
```json
{
  "next": "^16.1.1",
  "react": "^19.0.0",
  "@mui/material": "^7.1.1",
  "next-auth": "^4.24.13",
  "@prisma/client": "^6.19.2",
  "socket.io-client": "^4.8.3",
  "chart.js": "^4.4.9",
  "@tiptap/react": "^3.22.2",
  "@google/generative-ai": "^0.24.1",
  "zustand": "^5.0.5",
  "swr": "^2.3.8",
  "zod": "^3.25.76"
}
```
