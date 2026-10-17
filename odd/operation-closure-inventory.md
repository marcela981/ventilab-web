<!--
* Funcionalidad: Operation closure inventory
* Descripción: O7 input for the CLOSURE of the frontend migration, which the author must approve explicitly (nothing is deleted by this document): final inventory of every remaining legacy area (pages, feature folders, contexts, services/hooks, HTTP instances, shared legacy UI) with its parity state and the importers that keep it alive, the new-code imports of legacy paths, every file under pages/ with its guard and navigation entry, unused dependencies and legacy files without importers (knip-equivalent, proposals only), and the proposed ordered closure steps with risk, check and the approvals they need.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Closure inventory (input for the author's approval)

Date: 2026-10-17. Snapshot: `master` at `d3231c9` (O5+O6 committed) plus the uncommitted working tree of the concurrent
O4b/O5 fix writer (admin-console, teacher-dashboard, layouts, `src/lib/auth-config.js`). **Nothing has been deleted.**
Every deletion below is a proposal that needs the author's explicit approval (section e).

## Method

Read-only static import graph (Node script outside the repo, no installs; knip is not installed and was not added):

- Files scanned: `src/`, `pages/`, `lib/`, `scripts/`, `prisma/` and the root config files (1,674 code files).
- Specifiers parsed: `import … from`, side-effect `import '…'`, `import('…')`, `require('…')`, `vi.mock('…')`.
  Aliases resolved as in `tsconfig.json` (`@/*`, `@/lib/*` → `lib/` then `src/lib/`, `@shared/*`, `@features/*`) with
  the webpack extension order (`.js .mjs .tsx .ts .jsx .json`, then `index.*`).
- **New code** = the paths of the `package.json` `lint` script (+ `src/features/auth/UI`). **Legacy** = every other
  file under `src/`.
- **Reachable** = reachable from a non-test file under `pages/` through non-test files (what the build can ship).
  **No importer** = no non-test file imports it.
- Limits: template-literal dynamic imports (lesson JSON loaded by path), ambient `.d.ts` files (loaded by `tsconfig`
  `include`, not by imports), CSS and JSON assets are not followed. Verify each file again just before deleting it.

Totals: 480 legacy code files outside tests (593 files with CSS/JSON) in `src/`; **235 reachable** from pages,
**245 unreachable**, **87 with no importer at all**.

## a) Final inventory of the remaining legacy code

States: **replaced** (migrated counterpart exists, legacy unreachable or only redirecting), **redirect-only**, **no
counterpart (keep)**, **must stay** (NextAuth / Prisma API routes), **dead** (no importer or unreachable from pages).

### Pages

| Page | State | Counterpart / note |
| --- | --- | --- |
| `pages/index.js`, `pages/dashboard/index.js` | redirect-only (O5/O6, client `RoleHomeRedirect`) | `/me`, `/teacher` |
| `pages/panel/index.jsx`, `panel/students/index.jsx`, `panel/students/[id].jsx`, `panel/admin/index.jsx`, `panel/settings/index.jsx` | redirect-only (O6, server 307) | `/teacher`, `/teacher/students/[id]`, `/admin/users`, `/admin/settings` |
| `pages/simulador/index.js` | redirect-only (ventilator-lab T12) | `/lab` |
| `pages/teaching/[moduleId]/[lessonId].tsx` | redirect-only (learning R1) | `/learn/modules/…/1` |
| `pages/evaluation/**` (7 files) | redirect-only (evaluations R1) | `/evaluations`, `/evaluations/manage`, `/grading` |
| `pages/teaching/index.js` | no counterpart (keep) | Legacy learning hub (`TeachingModule`); its lesson links redirect server-side. Still in the student nav. |
| `pages/achievements/index.jsx`, `pages/flashcards/index.js`, `pages/search/index.jsx` | no counterpart (keep) | Author decision (parity doc). |
| `pages/admin/search-analytics/index.jsx` | no counterpart (keep) | No API in the spec. |
| `pages/auth/register/index.jsx`, `auth/forgot-password/index.jsx`, `auth/error/index.jsx`, `auth/access-denied/index.jsx` | no counterpart (keep) | Register still signs in with NextAuth (`odd/legacy-coexistence.md`). |
| `pages/api/auth/[...nextauth].js`, `pages/api/auth/backend-token.js`, `pages/api/curriculum/**` (6 files) | must stay | NextAuth + Prisma API routes (`lib/auth.ts`, `lib/prisma.ts`, `src/lib/{apiAuth,curriculumResolver,roles}.js`). |

### Feature folders (legacy)

| Folder | Code files (reachable / unreachable) | State | What keeps it alive (reachable importers outside the folder) |
| --- | --- | --- | --- |
| `src/features/admin` | 24 (0 / 24) | **dead** — replaced by `teacher-dashboard`, `admin-console`, `groups` | Nothing since O6: `/panel/*` only redirect. Only importer is the dead `dashboard/components/AdminDashboard.jsx`. Includes `services/groupsService.js` and `components/panel/ui/GroupBuilderModal.jsx`. |
| `src/features/dashboard` | 20 (9 / 11) | replaced by `student-space` (`/me`); 9 files alive | `TeachingModule.jsx:49` imports `DashboardTab.tsx` (+ its 8 components). Dead: `components/{Admin,Student,Teacher}Dashboard.jsx` (they import files that do not exist: `../hoc/withAuth`, `../admin/*`, `../common/LevelBadge`, `../gamification/*`), `CohortPulse`, `FocusTimer`, `KPIsStrip`, `RecommendationsCarousel`, `UpcomingSchedule`, `components/index.{js,ts}`, `hooks/useDashboardData.js`. |
| `src/features/ensenanza` | 188 (142 / 46) | partly replaced by `learning`/`content-editor`; hub kept | `pages/teaching/index.js` → `TeachingModule.jsx`; `pages/flashcards/index.js` → `FlashcardDashboardPage.jsx`; `ai-feedback`/`progress` read `shared/data/curriculumData.js`. 46 unreachable (list in d). |
| `src/features/progress` | 52 (37 / 15) | no counterpart (keep) — **protected zone** | `pages/{achievements,flashcards,teaching}`, `ensenanza` (LearningProgressContext ×16), `Layout.jsx` → `AchievementContext.jsx`. |
| `src/features/simulador` | 75 (1 / 74) | replaced by `simulator` + `ventilator-lab` | Only `pages/_app.js:55` → `simuladorPaciente/contexto/PatientDataContext.js` (`PatientDataProvider`); no reachable consumer of that context. |
| `src/features/evaluation` | 35 (1 / 34) | replaced by `evaluations`/`evaluation-authoring`/`grading` | Only `ensenanza/.../clinical/ClinicalCaseViewer.jsx` → `data/clinicalCases/index.js`. |
| `src/features/ai-feedback` | 13 (4 / 9) | partly replaced by `ai-chat` | `ensenanza/.../ai/{AITopicExpander,TutorAIPopup}.jsx` → `services/{contextBuilder,sharedAI,suggestions}.ts`. |
| `src/features/auth/components/{withAuth,ProtectedRoute}.jsx` | 2 (0 / 2) | **dead** (no importer since the panel redirects) | — |
| `src/features/auth/{auth.api.ts,auth.types.ts}` | 2 (0 / 2) | **dead** | — |
| `src/features/teaching/data/lessons.manifest.json` | JSON | written by `scripts/build-lessons-manifest.mjs` (`prestart`, `postinstall`) | No code reads it (grep `lessons.manifest`: only the script). |

### Contexts

| Context | State | Reachable importers |
| --- | --- | --- |
| `src/shared/contexts/AuthContext.jsx` | keep while legacy pages exist | `_app.js`, `pages/admin/search-analytics`, `pages/auth/access-denied`, `Navbar.jsx`, `Sidebar.jsx`, `EditModeToggle.jsx`, `progress/hooks/useAchievements.js` |
| `src/shared/contexts/NotificationContext.jsx` | replaced by the design-system toast; keep while `Sidebar.jsx` exists | `_app.js`, `Sidebar.jsx` |
| `src/shared/contexts/SocketContext.tsx` | bridged to `RealtimeProvider`; **no reachable consumer** (its consumers `useSocket.ts`, `useVentilatorData.ts`, `useRemoteVentilator.ts` are unreachable) | `_app.js` only |
| `src/shared/contexts/SidebarContext.js`, `WarmupContext.tsx` | legacy shell | `_app.js`, `WarmupOverlay.jsx` |
| `src/features/progress/LearningProgressContext.jsx`, `AchievementContext.jsx` | protected zone (keep) | see `progress` |
| `src/features/simulador/.../PatientDataContext.js` | dead in practice (mounted, never consumed) | `_app.js` |

### Services, hooks and HTTP instances

| File | State | Reachable importers |
| --- | --- | --- |
| `src/shared/services/api/http.ts` (`http`, `httpSlow`) | keep while `ensenanza`/`progress` live | `ensenanza/.../lessonLoader.js`, `useLevelsCurriculum.js`, `progress/services/{http.ts,progressService.js}` |
| `src/shared/services/httpClient.ts` | keep (one consumer) | `progress/hooks/useAchievements.js` |
| `src/features/progress/services/http.ts` | protected zone | `progress` |
| raw `fetch` in `src/shared/hooks/useSearch.js` and `pages/admin/search-analytics/index.jsx` | goes with `/search` and search analytics | — |
| `src/shared/services/authService.js`, `sessionExpired.ts`, `authEvents.ts` | keep (adapters to the new session, `odd/legacy-coexistence.md`) | `useAuth.js`, `SocketContext.tsx`, `ensenanza` ×6, `progress` ×7, `ai-feedback/chatService.js` |
| `src/shared/hooks/useAuth.js` | keep (NextAuth-based legacy guard) | `AuthContext.jsx`, `ensenanza` ×9 |
| `src/shared/hooks/useSearch.js`, `useScrollCompletion.js` | keep with `/search`, lessons | `pages/search`, `SearchBar.jsx`; `LessonViewer.jsx` |
| `src/shared/hooks/{useFetch.ts,useRole.ts,useAnimations.js}` | **dead** (no importer) | — |
| `src/shared/hooks/useSocket.ts` | dead (only unreachable `simulador` imports it) | — |
| `src/config/env.ts`, `src/telemetry/aiTopicExpander.ts`, `src/i18n/i18n.ts`, `src/providers/Providers.jsx` | keep (legacy-alive) | `http.ts`/`authService.js`/`ensenanza`; `AITopicExpander.jsx`; `_app.js` ×2 |

### Shared legacy UI and libs

| Area | State |
| --- | --- |
| `src/shared/components` (15 code files) | 11 reachable (`_app.js` → `Sidebar`, `ErrorBoundary`, `UI/WarmupOverlay`; `pages/achievements` → `Layout` → `Navbar`, `ProfileDropdown`, `SidebarUserCard`; `pages/search` → `SearchFilters`; `SearchBar`, `SearchHistory`; `ensenanza` ×7 → `ChunkErrorBoundary`). **Dead**: `ClientOnly.jsx`, `LevelBadge.jsx`, `RoleGuard.jsx`, `index.js`. |
| `src/shared/utils` (12) | 7 reachable (`passwordValidator` ← register, `highlightText` ← search, `redirectByRole` ← `lib/auth.ts`, `debug`, `debounce`, `progressOutbox`, `suggestions.es`). **Dead**: `formatters.ts`, `requestId.ts`, `serverAuth.js`, `timeFormat.ts`, `validators.ts`. |
| `src/lib` (6) | must stay: `apiAuth.js`, `curriculumResolver.js`, `roles.js`, `auth-config.js`, `swrKeys.ts`. **Dead**: `src/lib/prisma.js` (the API routes use `lib/prisma.ts`). |
| `src/theme` (3), `src/styles` (3 code + 2 CSS), `src/types` (4), `src/contracts` (3), `src/shared/dev` (1), `src/shared/types` (1) | `theme/teachingModuleTheme.js` reachable (lessons). Unreachable: `theme/{theme,ventilatorTheme}.js`, `styles/{animations,chart-theme,mui-overrides}.js`, `types/api.ts`, `contracts/*` and `shared/dev/perfInstrumentation.ts` (only dead `simulador`/`admin`/`evaluation` import them), `shared/types/common.types.ts`. `types/global.d.ts`, `next-auth.d.ts`, `progress.d.ts` are ambient: **keep** unless `tsc` proves otherwise. |
| `lib/` (root) | must stay: `auth.ts` (NextAuth options), `prisma.ts`, `db-logger.ts`. |

## b) Imports from legacy paths in `src/` and `pages/`

New code (every path of the `lint` script): **0 files import a legacy path**, except the composition root
`pages/_app.js` (in the lint scope by design; ESLint allows it):

| `pages/_app.js` imports | Why it is still needed |
| --- | --- |
| `src/shared/contexts/{AuthContext,NotificationContext,WarmupContext,SocketContext,SidebarContext}` | Legacy providers for the legacy pages without `getLayout` |
| `src/shared/components/{Sidebar,ErrorBoundary,UI/WarmupOverlay}.jsx` | Legacy shell |
| `src/providers/Providers.jsx`, `src/App.css`, `src/i18n/i18n.ts` | Legacy providers, global CSS, i18n |
| `src/features/simulador/simuladorPaciente/contexto/PatientDataContext.js` | `PatientDataProvider` (no reachable consumer; removable) |

Checked patterns (specifiers, all lint-scoped files): `@/` outside the new shared folders, `src/shared/services`,
`src/shared/contexts`, `features/(admin|dashboard|ensenanza|evaluation|progress|simulador|ai-feedback)` → only the six
`_app.js` hits above. Resolved-edge check (new file → legacy file): only the 12 `_app.js` edges above.

Legacy importers that keep a legacy module alive: see the "What keeps it alive" columns of section a. The three load
bearing chains are `pages/teaching/index.js` → `TeachingModule.jsx` (most of `ensenanza`, `progress`, `dashboard/DashboardTab`,
`ai-feedback` services, `evaluation/data/clinicalCases`), `pages/_app.js` → legacy shell/providers, and
`pages/{achievements,flashcards,search,admin/search-analytics,auth/*}`.

## c) Routes and guards

Guards: **RequireRole / RequireAuth** through the page `getLayout` (`withStudentLayout` = RequireAuth;
`withStudentOnlyLayout` = RequireRole STUDENT; `withTeacherLayout` = RequireRole TEACHER/ADMIN; `withAdminLayout` =
RequireRole ADMIN; `withPrintLayout` = RequireRole of the route; `withPublicLayout` = public). `routes.config.ts` is a
declarative table only: it does **not** guard pages without a layout. The legacy shell (`Sidebar.jsx`) has no redirect
guard. Nav = `src/shared/layouts/nav.config.ts`.

| Page(s) | Guard | In nav / justification |
| --- | --- | --- |
| `me/index.tsx`, `me/notes.tsx`, `me/grades.tsx`, `my-group/index.tsx` | withStudentOnlyLayout | nav (`/me`, `/me/notes`, `/me/grades`, `/my-group`) |
| `notifications/index.tsx`, `profile/index.tsx`, `assistant/index.tsx`, `learn/index.tsx`, `lab/index.tsx`, `simulator/index.tsx`, `evaluations/index.tsx` | withStudentLayout | nav |
| `assistant/[conversationId].tsx`, `learn/[sectionId].tsx`, `learn/modules/[moduleId]/index.tsx`, `learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber].tsx`, `lab/reservations/index.tsx`, `lab/live/index.tsx`, `lab/recordings/index.tsx`, `lab/recordings/[recordingId].tsx`, `simulator/sessions/[sessionId]/{index,result,replay}.tsx`, `evaluations/[evaluationId]/index.tsx`, `evaluations/[evaluationId]/attempts/[attemptId]/{index,result}.tsx` | withStudentLayout | detail / sub-page of a nav entry |
| `learn/modules/[moduleId]/print.tsx` | withPrintLayout (RequireRole TEACHER/ADMIN) | print view of a module |
| `teacher/index.tsx`, `groups/index.tsx`, `content/index.tsx`, `evaluations/manage/index.tsx`, `simulator/cases/index.tsx`, `grading/index.tsx`, `admin/status.tsx` | withTeacherLayout | nav |
| `teacher/students/[userId].tsx`, `groups/[groupId].tsx`, `content/pages/[pageId].tsx`, `evaluations/manage/new.tsx`, `evaluations/manage/[evaluationId]/{edit,assignments}.tsx`, `simulator/cases/new.tsx`, `simulator/cases/[id]/edit.tsx`, `grading/attempts/[attemptId].tsx`, `grading/evaluations/[evaluationId].tsx` | withTeacherLayout | detail / sub-page |
| `admin/users.tsx`, `admin/settings.tsx`, `admin/audit.tsx`, `admin/ai.tsx`, `admin/research.tsx` | withAdminLayout | nav (admin section) |
| `auth/login/index.tsx` | withPublicLayout | public |
| `index.js`, `dashboard/index.js` | client `RoleHomeRedirect` (anonymous → login), bare layout | redirect |
| `panel/index.jsx`, `panel/students/index.jsx`, `panel/students/[id].jsx`, `panel/admin/index.jsx`, `panel/settings/index.jsx`, `simulador/index.js`, `teaching/[moduleId]/[lessonId].tsx` | server redirect (destination guarded) | redirect |
| `evaluation/index.tsx`, `evaluation/[activityId].tsx`, `evaluation/manage/index.tsx`, `evaluation/manage/new.tsx`, `evaluation/manage/[activityId]/edit.tsx`, `evaluation/grade/index.tsx`, `evaluation/grade/[activityId].tsx` | client redirect, bare layout (destination guarded) | redirect |
| `auth/register/index.jsx`, `auth/forgot-password/index.jsx`, `auth/error/index.jsx`, `auth/access-denied/index.jsx` | NONE (public by design) | auth flow |
| `api/auth/[...nextauth].js`, `api/auth/backend-token.js` (`getServerSession`), `api/curriculum/levels/[levelId].js` (`getServerSession`), `api/curriculum/modules/[moduleId].js`, `api/curriculum/lessons/[lessonId]/index.js`, `…/sections/index.js`, `…/sections/reorder.js`, `…/sections/[sectionIndex].js` (`requireTeacher`) | server-side session checks | API routes |
| `_app.js` | — | composition root |
| **`teaching/index.js`** | **NONE** (SSR only redirects lesson queries) | nav `/teaching` (STUDENT) |
| **`achievements/index.jsx`** | **NONE** (legacy `Layout`) | nav `/achievements` (STUDENT) |
| **`flashcards/index.js`** | **NONE** | not in nav (orphan) |
| **`search/index.jsx`** | **NONE** | not in nav (orphan; legacy `SearchBar` only) |
| **`admin/search-analytics/index.jsx`** | **weak**: in-page `useEffect` on the legacy `AuthContext` user, redirects to `/login` (route does not exist) and does not stop rendering | nav admin section |

**Flagged: 5 unguarded or weakly guarded pages** (bold rows). The backend still enforces its own authorization on
every data call; the gap is the client screen being reachable anonymously.

## d) Unused code and dependencies (knip-equivalent, proposals only)

### d1) `package.json` dependencies with zero imports in `src/`, `pages/`, `scripts/`, `lib/`, `prisma/`

| Package | Config / tool use | Proposed action |
| --- | --- | --- |
| `react-hook-form`, `@hookform/resolvers`, `zod` | none (0 textual references in code or config) | **delete** |
| `@eslint/eslintrc` (dev) | `eslint.config.mjs:4` says FlatCompat is no longer used | **delete** |
| `@types/bcryptjs` (dev) | `bcryptjs` 3 ships its own `types` | **delete** (low risk; run `npm run typecheck`) |
| `@emotion/react`, `@emotion/styled` | peer dependencies of `@mui/material` v7 (styled engine); `@emotion/styled` banned in new code by ESLint | keep |
| `react-dom`, `typescript`, `prisma` (CLI, `schema.prisma`, `prisma:*` scripts), `jsdom` (vitest env), `@testing-library/dom` (peer of `@testing-library/react`), `@types/{node,react,react-dom,jsonwebtoken}` | runtime / tooling | keep |

Dependencies whose every importer is unreachable (dead with the legacy code, delete together with it):
`@google/generative-ai` (only `ai-feedback/services/providers/GeminiProvider.js`), `@mui/x-date-pickers`
(`dashboard/components/UpcomingSchedule.tsx`, `progress/components/StudyCalendar.tsx`). Legacy-only but alive
(delete only when `ensenanza`/`progress` go): `@tiptap/extension-{color,highlight,link,task-item,task-list,text-style,underline}`,
`date-fns`, `react-chartjs-2`, `react-confetti`, `react-i18next`, `i18next`, `react-medium-image-zoom`, `react-player`,
`react-svg-pan-zoom`, `react-syntax-highlighter` (+ `@types/react-syntax-highlighter`). `fast-glob` is used only by
`scripts/` (`postinstall`, `prestart`): keep, optionally move to `devDependencies`.

### d2) Legacy files with no importer (87) or unreachable from pages (245)

Proposed **delete** (dead, no runtime path; re-verify with grep just before deleting):

- `src/features/admin/**` (24 code files + CSS) — unreachable since O6.
- `src/features/auth/components/{withAuth,ProtectedRoute}.jsx`, `src/features/auth/{auth.api.ts,auth.types.ts}`.
- `src/features/dashboard/components/{AdminDashboard,StudentDashboard,TeacherDashboard}.jsx`, `{CohortPulse,FocusTimer,KPIsStrip,RecommendationsCarousel,UpcomingSchedule}.tsx`, `components/index.{js,ts}`, `hooks/useDashboardData.js`.
- `src/features/simulador/**` except `simuladorPaciente/contexto/PatientDataContext.js` (74), then that file together with its `_app.js` provider (step 4).
- `src/features/evaluation/**` except `data/clinicalCases/index.js` (34) + `src/types/api.ts` (only `evaluation/api/*` import it).
- `src/features/ai-feedback/{ai.api.ts,ai.types.ts,hooks/useAIFeedback.js,services/AIServiceManager.js,services/aiExpandService.js,services/prompts/system.ts,services/providers/GeminiProvider.js,services/tutorService.js,services/types.ts}`.
- `src/features/ensenanza` (46 unreachable): `index.ts`; `shared/components/ai/{AIExpanderChatMessage,AIExpanderResults,AIExpanderSuggestions,AITutorChat,ChatMessage,ContentGeneratorPanel,SuggestedQuestions}.jsx`, `ai/index.js`; `clinical/DecisionPoint.jsx`; `edit/{BlockPill,NotionCurriculumEditor}.jsx`; `leccion/{LessonContentRenderers.jsx,LessonProgressBar.tsx,ModuleCompletionCelebration.jsx,index.js}`; `leccion/content/{ClinicalCase,ModalityComparisonTable,PersonalNotes,SectionNavigation}.jsx`, `content/index.js`; `media/index.js`; `modulos/{Module03CurriculumView/Module03CurriculumView.jsx,ModuleCardOverlay.jsx,ModuleLessonNavigator.jsx,ModuleLessonsList/LessonItem.jsx,index.ts}`; `navigation/index.js`; `pages/LessonViewerRouteAdapter.jsx`; `shared/data/clinicalCases/index.js`; `shared/data/curriculum/modules.generated.js` (check the `generate:modules` script first); `shared/hooks/{index.js,useAITutor.js,useLessonContent.js,useLessonNavigation.js,useLevelContent.js,useModuleLessonsCount.js,useModuleProgress.ts,useProgressTree.js}` (`useModuleProgress` is one of the live `.js`/`.ts` pairs: delete only the unreachable `.ts`); `shared/progreso/{ProgressTracker.jsx,components/ModuleLessonProgressBar.tsx,components/ModuleProgressCard.jsx,components/ProgressDashboard.jsx,components/ProgressTree.jsx}`; `shared/services/{contentGenerator,teachingContentService}.js`.
- `src/shared/components/{ClientOnly,LevelBadge,RoleGuard}.jsx`, `index.js`; `src/shared/hooks/{useFetch.ts,useRole.ts,useAnimations.js,useSocket.ts}`; `src/shared/utils/{formatters.ts,requestId.ts,serverAuth.js,timeFormat.ts,validators.ts}`; `src/shared/types/common.types.ts`; `src/shared/dev/perfInstrumentation.ts`; `src/contracts/*` (3); `src/lib/prisma.js`; `src/theme/{theme,ventilatorTheme}.js`; `src/styles/{animations,chart-theme,mui-overrides}.js`.

Proposed **keep** (needs a separate decision): `src/features/progress/**` unreachable files (15: `components/{AchievementsGrid,BossFightCard,Challenges,ComprehensionPanel,FeedbackStrip,LeaderboardCompact,ModuleMilestones,NarrativeProgress,ProgressDebugPanel,ProgressOverviewCard,StreakWidget,StudyCalendar}.tsx`, `components/index.ts`, `services/selectors.ts`, `types.ts`) — protected zone. Finding: `pages/achievements/index.jsx` loads `dynamic(() => import('@/features/progress/components').then(m => m.AchievementsGrid))`; webpack resolves that folder to `components/index.js` (`.js` before `.ts`), which does not export `AchievementsGrid` (only `components/index.ts:7` does), so `/achievements` most likely renders nothing or fails at runtime (the known barrel collision of CLAUDE.md). Not verified in a browser; part of the step 5 decision. Ambient `src/types/{global,next-auth,progress}.d.ts`. `src/features/teaching/data/lessons.manifest.json` (output of a `package.json` script).

## e) Proposed closure steps (in order)

Run each step on a clean tree; after each, `npm run typecheck`, `npm run lint`, `npx vitest run <touched folders>` and
`git grep -n "<deleted path>"` must be empty. `npm run build` once at the end (step 9).

| # | Step | Risk | Check after |
| --- | --- | --- | --- |
| 1 | Delete the pure dead files of d2 that nothing imports (no `_app.js`, no `package.json` change): `features/admin/**`, `features/auth/components/*`, `auth.api.ts`, `auth.types.ts`, dead `dashboard` files, dead `shared/{components,hooks,utils,types,dev}` files, `src/lib/prisma.js`, `src/contracts`, dead `theme`/`styles` files | Low | typecheck; `tsc -p tsconfig.json` count ≤ baseline; grep of each path |
| 2 | Delete `features/simulador/**` (except PatientDataContext), `features/evaluation/**` (except `data/clinicalCases`), `src/types/api.ts`, dead `ai-feedback` files, the 46 unreachable `ensenanza` files | Low–medium (large) | as 1 + `npm run lint:legacy` count ≤ 234 |
| 3 | Remove the stale legacy references: `PanelSidebar` is gone with step 1; `src/shared/components/Sidebar.jsx` links to `/simulador`, `/panel`; `src/lib/auth-config.js` `PROTECTED_ROUTES`; `src/shared/utils/redirectByRole.js` (now only used by `lib/auth.ts`); `expectOwnPreemption` no-op in ventilator-lab | Low | vitest ventilator-lab + session |
| 4 | `pages/_app.js`: drop `PatientDataProvider` (+ its file); then decide whether the legacy `SocketProvider` stays (no reachable consumer) | Medium (composition root) | typecheck, lint, vitest `src/shared`, manual smoke of a legacy page |
| 5 | Author decisions on the no-counterpart pages: `/admin/search-analytics`, `/search`, `/flashcards`, `/achievements`, `/teaching` hub; for each kept page add a guard (`getLayout` with RequireAuth/RequireRole) or delete it with its nav entry and its now-dead dependencies | Medium | nav.config tests, build |
| 6 | Redirect pages (`/`, `/dashboard`, `/panel/**`, `/simulador`, `/evaluation/**`, `/teaching/[moduleId]/[lessonId]`): keep as temporary redirects for bookmarks, or switch to permanent / delete after an agreed date | Low | redirect tests |
| 7 | When `/teaching` and lessons leave: remove the legacy shell (`Sidebar`, `Navbar`, `Layout`, `NotificationProvider`, `AuthContext`, `useAuth`, `http.ts`, `httpClient.ts`) — blocked today by `ensenanza`/`progress` (protected zone) and `/auth/register` (NextAuth) | High | full vitest, build, E2E |
| 8 | `package.json`: remove `react-hook-form`, `@hookform/resolvers`, `zod`, `@eslint/eslintrc`, `@types/bcryptjs`; after step 2 also `@google/generative-ai`, `@mui/x-date-pickers`; `npm install` to refresh the lock file | Medium (protected file, lock file) | `npm ci`, typecheck, lint, vitest, build |
| 9 | Final: `npm run build`, bundle re-measure (`docs/operation/VERIFICATION.md` item 3), `git rm` list from `odd/legacy-coexistence.md` | — | VERIFICATION item 11 |

Needs the author's explicit approval:

- [ ] Starting the closure at all (decision 1 of `odd/tasks/operation.md`).
- [ ] Each deletion batch (steps 1, 2, 4, 7), because it deletes code.
- [ ] Any `pages/_app.js` change (step 4) and the legacy shell removal (step 7).
- [ ] `package.json` / `package-lock.json` edits (step 8; protected file).
- [ ] The no-counterpart pages (step 5): keep + guard, or delete.
- [ ] Manual legacy scores (`/scores`): drop or request a backend endpoint.
- [ ] Anything inside `src/features/progress/` (protected zone).
- [ ] Turning temporary redirects into permanent ones or deleting them (step 6).
- [ ] Commits of the closure (the author commits).
