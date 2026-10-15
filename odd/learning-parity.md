# Learning parity checklist (P1)

This checklist covers every behavior of the legacy learning modules and says where the new features cover it. The author approves legacy removal (P2) against it.

Legacy modules: `src/features/progress/LearningProgressContext.jsx` (LPC), `src/features/ensenanza/shared/components/pages/LessonViewerRouteAdapter.jsx` (RA), `src/features/ensenanza/shared/components/leccion/LessonViewer.jsx` + `useLessonViewerState.js` (LV) and `LessonPageRenderer.jsx` (PR). `curriculumData.js` is listed separately.

Status values:
- **Covered**: an equivalent exists, and a test or the code is the evidence.
- **By design**: the behavior is replaced by a backend rule or by the URL.
- **Loss**: not covered. The author decides about it.
- **Pending**: a task in progress will cover it.

Paths without a prefix are relative to `src/features/learning/application/`.

## LearningProgressContext

| # | Legacy behavior | New location | Status | Evidence |
|---|---|---|---|---|
| 1 | Loads the progress snapshot, with in-flight dedupe (LPC:252, :332) | SWR `useApiQuery` with dedupe, cache-first, 60 s TTL (`entities/learning-query-config.ts`, `hooks/use-progress.ts`) | Covered | `pages/module.page.test.tsx` "requests lessons and progress in parallel with the tree" |
| 2 | Checks that a lesson belongs to its module (LPC:342) | Lesson viewer check | Covered | `pages/lesson-viewer.page.test.tsx` "says when the lesson does not belong to the module" |
| 3 | Unified lesson-progress upsert with an offline outbox and reconcile (LPC:365, :1480, :1448) | `POST /api/progress/pages/{id}/view` (idempotent) via `hooks/use-page-view-tracker.ts`; optimistic update and invalidation | By design: there is no offline outbox. A failed view is retried on the next visit. | `hooks/use-page-view-tracker.test.tsx` (7 cases), `hooks/use-page-view-invalidation.test.tsx` |
| 4 | Refreshes on `progress:updated` window events, debounced 2 s (LPC:675-700) | SWR invalidation of the affected keys after each registration | By design | `use-page-view-invalidation.test.tsx` |
| 5 | `getLessonProgress` / `getModuleProgressData` (LPC:835, :858) | `useModuleProgress`, `useLevelProgress`, `useSectionProgress`, `useProgressSummary` (`hooks/use-progress.ts`) | Covered | `api/mappers/progress.mapper.test.ts` |
| 6 | `setCurrentLesson` / `setCurrentModule` (LPC:869, :881) | The URL is the only navigation state (`entities/learning-urls.ts`) | By design (fixes the C2 step pointer) | `entities/learning-urls.test.ts` |
| 7 | Progress summary (LPC:896) | `useProgressSummary`, bars on `/learn` | Covered | `pages/learn-home.page.test.tsx` "lists the sections in order with the backend progress" |
| 8 | `markLessonComplete` (LPC:915) | The backend derives completion from page views (lesson-weighted); the frontend does not recalculate | By design | `use-page-view-tracker.test.tsx` "updates the cached module progress…" |
| 9 | `progressMap`, module and level aggregates (LPC:958, :983, :1194, :1397) | Backend values on the section, level and module bars (`components/progress-bar.tsx`, `components/level-card.tsx`) | Covered | `pages/section.page.test.tsx`, `pages/module.page.test.tsx` |
| 10 | `completedLessons` set (LPC:1425) | Lesson list with per-lesson state (`components/module-lessons.tsx`) | Covered | `hooks/use-module-lessons.test.tsx` |
| 11 | Sync status, last error, rate-limit flag, `dismissError` (LPC:636, :1443) | ErrorState with retry; specific 429 messages in the AI panels (`entities/ai-error-messages.ts`) | Covered | `pages/learn-home.page.test.tsx` "shows the error with a retry…", `entities/ai-error-messages.test.ts` |
| 12 | Quiz scores (LPC:661-671) | Evaluations are migrated later (decision 2) | Loss (out of scope) | — |
| 13 | Time spent, flashcards with spaced review (LPC:1498-1508) | Not in the learning scope; it belongs to "espacio del estudiante" | Loss (out of scope) | — |

## LessonViewerRouteAdapter

| # | Legacy behavior | New location | Status | Evidence |
|---|---|---|---|---|
| 14 | Swaps the `onNavigate` argument order (RA:34-40) | URL builders with named parameters | By design | `entities/learning-urls.test.ts` |
| 15 | Completing a lesson stays on the completion page (RA:42-48) | Siguiente moves across lessons; after the last page it goes to the module completion screen | Covered | `lesson-viewer.page.test.tsx` "finishes the module after its last page", `module.page.test.tsx` "shows the completion screen with the next unlocked module" |
| 16 | Close falls back to `/teaching` (RA:50-56) | Breadcrumb Sección > Nivel > Módulo > Lección > Página (`components/learning-breadcrumb.tsx`) | Covered | `lesson-viewer.page.test.tsx` "renders the blocks of page N… with the breadcrumb" |

## LessonViewer and useLessonViewerState

| # | Legacy behavior | New location | Status | Evidence |
|---|---|---|---|---|
| 17 | Teacher edit mode, DB step overrides, section reorder/delete, BlockInjector, LessonEditBanner (LV:105-267, :476, :536) | content-editor: tree (C1–C3), page editor (C4), media (C5) and the student preview (C6, rendered with the viewer's own `LessonPageArticle`) at `/content/pages/[pageId]` | Covered | `src/features/content-editor/application/pages/page-editor.page.test.tsx`, `content-tree.page.test.tsx` |
| 18 | Unsaved-changes dialog and `beforeunload` (LV:278-350, :380) | `use-unsaved-changes-guard.ts` in the page editor | Covered | `page-editor.page.test.tsx` (guard assertions) |
| 19 | Loading skeleton and error with retry (LV:360, :368) | Skeletons from the design system, ErrorState with retry | Covered | `learn-home.page.test.tsx` "shows the error with a retry…" |
| 20 | Resume alert, resume position from localStorage merged with the backend (LV:387-403; state:135-185) | "Continuar donde quedé" on `/learn` and on each module, computed from the backend (`entities/continue-target.ts`); a reload keeps the page because it is in the URL | Covered | `entities/continue-target.test.ts`, `learn-home.page.test.tsx` "continues at the first unlocked module…", `module.page.test.tsx` "shows … where to continue" |
| 21 | Completion confetti (LV:406) | Module completion screen (`components/module-completion.tsx`) without confetti | Loss (cosmetic) | — |
| 22 | "Review mode" chip on a completed module (LV:432-443) | The module shows 100 % progress; no chip | Loss (cosmetic) | — |
| 23 | Paginated stepper through PR (LV:544) | One URL per backend Page; Anterior/Siguiente (`components/lesson-page-nav.tsx`, `entities/lesson-navigation.ts`) | Covered (decision 1: page = backend Page) | `entities/lesson-navigation.test.ts`, `lesson-viewer.page.test.tsx` |
| 24 | SaveProgressButton on assessment and case pages (LV:680) | View registration after 5 s or on Siguiente | By design | `use-page-view-tracker.test.tsx` |
| 25 | Media blocks (LV:581) | `@shared/rich-content` ContentBlocks (image, video URL or upload, file, KaTeX, Tiptap) | Covered | `src/shared/rich-content/blocks/content-blocks.test.tsx` |
| 26 | LessonIndexNavigator, a table of contents (LV:588) | The module page lists the lessons with progress and links to each one | Covered (moved to the module page) | `module.page.test.tsx` |
| 27 | Prev/next LessonNavigation (LV:601) | Anterior/Siguiente across lessons | Covered | `lesson-viewer.page.test.tsx` "registers the view once on Siguiente and navigates to the next lesson", "has no previous link on the first page" |
| 28 | Success and rate-limit snackbars (LV:~725, ~737) | Global toast from the design system; 429 messages with the reset time | Covered | `tutor/deepen-panel.test.tsx`, `entities/ai-error-messages.test.ts` |
| 29 | "¡Lección Completada!" dialog with the next action (LV:~763) | Module completion screen with the next unlocked module | Covered (per module, not per lesson) | `module.page.test.tsx` |
| 30 | TutorAI popup through a Portal (LV:~788-801) | Side panel with Notas, Profundizar and Preguntas; a bottom sheet on mobile (`components/lesson-side-panel.tsx`) | Covered | `lesson-viewer.page.test.tsx` "offers the Notas, Profundizar and Preguntas tabs…", `tutor/deepen-panel.test.tsx`, `tutor/questions-panel.test.tsx` |
| 31 | Completion by scroll and reading time (`useScrollCompletion`, state:95) | 5 s rule or Siguiente | By design | `use-page-view-tracker.test.tsx` |
| 32 | Clamps the page pointer past the page count (state:260) | Redirects an invalid or out-of-range pageNumber | Covered | `lesson-viewer.page.test.tsx` "redirects an invalid pageNumber…", "…out-of-range pageNumber to the last page" |
| 33 | Failed-save notice (state:276) | The tracker never rejects; progress errors are not shown to the student | By design | `use-page-view-tracker.test.tsx` "never rejects when the registration fails" |
| 34 | Self-graded case answers and assessment submit (state:226-250) | Evaluations are migrated later (decision 2) | Loss (out of scope) | — |
| 35 | Auto-complete and the `tutor:finalSuggestions` event on completion (state:321-341) | Backend progress plus the Profundizar and Preguntas panels | Loss (the end-of-lesson automatic suggestions) | — |

## LessonPageRenderer

| # | Legacy page type | New location | Status | Evidence |
|---|---|---|---|---|
| 36 | header-intro, theory, analogies, visual-elements, parameter-tables, key-points, references (PR:53-126) | DB blocks rendered by ContentBlocks (TEXT-like Tiptap or Markdown, IMAGE, EQUATION, CODE, DIVIDER) | Covered (the content comes from the DB) | `content-blocks.test.tsx`, `rich-content.test.tsx` |
| 37 | waveforms (PR:93) | `@shared/waveforms` exists, but the lesson block types have no waveform block | Loss (unless the content stores it as an image or video) | — |
| 38 | practical-case (PR:97) | Rich text | Loss of the interaction | — |
| 39 | assessment (PR:110) | `QUIZ` blocks render as rich text only (decision 2) | Loss (out of scope) | — |
| 40 | completion (PR:130) | Module completion screen | Covered | `module.page.test.tsx` |
| 41 | clinical-case (PR:139, lazy `ClinicalCaseViewer`) | Removed: learning has no clinical-case references. This fixes C4.5. | By design | `rg -niE "clinicalcase\|ClinicalCaseViewer\|clinicalCasesService" src/features/learning src/features/content-editor` returns 0 |

## Locks and routes

| # | Behavior | New location | Status | Evidence |
|---|---|---|---|---|
| 42 | Locked content (legacy `PrerequisiteTooltip`) | Lock screen with links to the prerequisites, and the content is never requested | Covered | `components/locked-content-screen.test.tsx`, `lesson-viewer.page.test.tsx` "shows the lock screen to a student on a locked module and never requests the content" |
| 43 | Legacy URLs `/teaching/[moduleId]/[lessonId]` and `/teaching?moduleId=&lessonId=` | Server-side redirect to `/learn/modules/M/lessons/L/1` (R1, 029a3fb) | Covered | `entities/learning-urls.test.ts` "resolveLegacyLessonUrl (R1)" |
| 44 | The `/teaching` hub with its dashboard, curriculum and progress tabs | Still served by the legacy code; it is not a lesson viewer route | Pending: author decision (it belongs to "espacio del estudiante") | — |

## curriculumData.js

Not deleted. `ventylab-server/prisma/seed-content.ts` still reads it by relative path (decision 5), and the DB comparison still needs an authorized read-only check (backend gaps).

## Open items before P2

- Rows 12, 13, 21, 22, 34, 35, 37, 38 and 39 are losses. The author accepts or rejects each one.
- E2E scenarios and the visual review have not been run (decision 6).
