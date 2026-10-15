# P1: Evaluations parity checklist (legacy → new)

Date: 2026-10-15. Worktree: `ventilab-web-worktrees/evaluations`. Source: `odd/evaluations-audit.md` section c, plus the behaviors listed in the migration prompt.

Status values:
- **covered**: the new code has the behavior and a test proves it.
- **partial**: the behavior exists, but part of it is missing or not tested.
- **gap (API)**: the new API has no equivalent, so it is not built (reported, not invented).
- **out of scope**: kept outside this migration on purpose.

Paths are relative to `src/features/` unless they start with `src/` or `pages/`. Test names are quoted `describe > it` text from the colocated `*.test.ts(x)` files.

## 1. Audit section c (legacy behavior → new)

| # | Legacy behavior | Status | Evidence (new code) | Test |
|---|---|---|---|---|
| 1 | List grouped by type (`ActivityList.jsx:27-42`) | covered | `evaluations/application/pages/evaluations-list.page.tsx:68` (state tabs), `:83` (type filter); `evaluations/application/entities/evaluation.entity.ts:157` `filterEvaluations` | `EvaluationsListPage > filters by type and shows the empty state of the filter`; `filterEvaluations and countByState > filters by state and optional type` |
| 2 | Skeleton, error with "Reintentar", empty (`ActivityList.jsx:118-155`) | covered | `evaluations-list.page.tsx:100` (CardSkeleton), `:102` (ErrorState), `:109` (EmptyState) | `EvaluationsListPage > shows the load error and retries` |
| 3 | "Actualizar" button (`index.js:33-37`) | covered | `evaluations/application/hooks/use-evaluations-realtime.ts:20` (revalidation on `evaluation:activated` / `grade:published`) + ErrorState retry | `EvaluationsListPage > refetches my evaluations and grades on evaluation:activated and grade:published` |
| 4 | Card: type, description, grade when done (`EvaluationCard.jsx:47-102`) | covered | `evaluations/application/components/evaluation-card.tsx` (type chip, window, duration, attempts, `GradeBadge`) | `EvaluationsListPage > shows the active evaluations with counts per tab and the card details` |
| 5 | "Ver resultados" vs "Iniciar" (`EvaluationCard.jsx:108-125`) | covered | `evaluation.entity.ts:227` `resolveIntroAction`; `evaluations/application/pages/evaluation-intro.page.tsx` (Comenzar / Continuar intento / last result) | `resolveIntroAction > *`; `EvaluationIntroPage > continues the attempt in progress`; `> disables the start with the reason and links to the last result when no attempts are left` |
| 6 | Single-attempt lock, 409 (`[activityId].js:205-273`) | covered | `canStart` from the API (`evaluation.entity.ts:59`), `evaluations-error-messages.ts` (`evaluation.max_attempts_reached`) | `resolveIntroAction > is blocked with a reason when the backend does not allow a start`; `getEvaluationErrorMessage > uses the message of a known code` |
| 7 | Retry a submit keeping the payload (`[activityId].js:189-309`) | covered | `evaluations/application/entities/autosave-queue.ts:44` (retry queue) + idempotent submit (`api/services`, `ATTEMPT_SUBMIT_PATH`) | `AutosaveQueue > keeps a failed value queued and retries it with backoff until it is saved`; `AttemptPlayerPage > makes the controls read-only at zero and retries a failed automatic submit with backoff` |
| 8 | Header: type, score, time (`[activityId].js:385-401`) | covered | `evaluation-intro.page.tsx` (details and warnings) | `EvaluationIntroPage > shows the active assignment with its instructions, details and warnings` |
| 9 | Previous/Next and "Paso i de N" (`TallerRenderer.jsx:126-240`) | covered | `evaluations/application/components/attempt/question-navigator.tsx`; `attempt-player.page.tsx` ("Anterior"/"Siguiente", L63-64) | `AttemptPlayerPage > marks a question for review in the navigator`; `> resumes on the stored question after a remount` |
| 10 | Timer mm:ss, colors at ≤10/≤5 min, auto-submit at 0 (`ExamRenderer.jsx:33-99`) | covered | `evaluations/application/entities/attempt-timer.ts:13` (warnings at 5 and 1 min), `:16` (clock skew), `:68` `startAttemptTimer` | `clock skew > *`; `startAttemptTimer > fires the 5 and 1 minute warnings once each`; `> calls onExpire exactly once at zero and stops ticking`; `AttemptPlayerPage > submits automatically once when the timer reaches zero` |
| 11 | "N preguntas sin responder" warning (`ExamRenderer.jsx:190-200`) | covered | `attempt-player.page.tsx:324,403` (submit dialog with the unanswered count) | `AttemptPlayerPage > states the unanswered questions and submits once on a double click` |
| 12 | Immediate feedback in quiz/taller (`QuizRenderer.jsx:144-155`) | partial | Result shown at once when the API publishes it (`showResultsImmediately`, `evaluation-authoring/.../evaluation-metadata-form.tsx`). The correct answer is no longer shown during the attempt (backend security decision). | `metadata defaults > shows results immediately only for quizzes`; `AttemptPlayerPage > renders an unpublished attempt that carries no correctness, explanation or rubric` |
| 13 | Hints in taller (`TallerRenderer.jsx:143-157`) | gap (API) | The new question model has no hint field. | — |
| 14 | Result screen: %, pass/fail, "X de N correctas", pending review (`ResultsScreen.jsx:50-82`) | covered | `evaluations/application/pages/attempt-result.page.tsx:69,132`; `components/result/question-result.tsx` (per-question score, correct answer, explanation) | `AttemptResultPage > shows the published grade, the per-question result and the rubric`; `> shows a pending review attempt as pending grading`; `> colors a passed grade with the passed class` |
| 15 | Free-text draft/submission (`SubmissionForm.jsx`) | covered | `evaluations/application/components/questions/open-text-question.tsx` + autosave | `AttemptPlayerPage > autosaves a choice with a PUT`; `AutosaveQueue > debounces a burst and sends only the last value` |
| 16 | Status badges (`SubmissionStatusBadge.jsx`) | covered | `evaluations/application/components/attempt-badges.tsx`; `entities/evaluation-labels.ts:27` | `EvaluationsListPage > switches tabs and shows a failed published grade in the closed tab` |
| 17 | Management grouped by type, status, submissions; Edit/Grade (`manage/index.js`) | covered | `evaluation-authoring/application/pages/evaluations-manage.page.tsx` (filters, edit, duplicate L120, archive L137) | `EvaluationsManagePage > sends the filters and the debounced search as query params and paginates on the server`; `> duplicates an evaluation and opens the editor of the copy`; `> archives after confirmation` |
| 18 | Builder: title, description, type, score, time, date (`ActivityBuilder.jsx`) | covered | `evaluation-authoring/application/pages/evaluation-builder.page.tsx`, `components/builder/evaluation-metadata-form.tsx`. Score = sum of points; dates live in activations. | `EvaluationBuilderPage — create > validates, applies the type defaults, posts the evaluation and opens its editor`; `validateMetadata > mirrors the backend DTO rules` |
| 19 | Group assignment with "visible desde/fecha límite" (`GroupAssignmentSelector.jsx`) | covered | `evaluation-authoring/application/pages/evaluation-assignments.page.tsx:28,181` (ActivateEvaluationDialog) | `EvaluationAssignmentsPage > activates for the chosen groups with the Bogota window in UTC` |
| 20 | Save draft / Publish (`ActivityBuilder.jsx:52-62`) | covered | Explicit save + READY status (`evaluation-authoring/application/hooks/use-evaluation-builder.ts:67`) | `EvaluationBuilderPage — status > marks a valid evaluation as READY and returns it to DRAFT` |
| 21 | Grading: submissions list, group filter, simple stats (`GradingDashboard.jsx`) | covered | `grading/application/pages/grading-queue.page.tsx` (filters L23); `grading/application/pages/evaluation-results.page.tsx` (stats) | `GradingQueuePage > sends the evaluation and group filters as query params and paginates on the server`; `EvaluationResultsPage — statistics > formats the API statistics in es-CO` |
| 22 | Score + feedback per submission (`SubmissionReviewer.jsx`) | covered | `grading/application/pages/grade-attempt.page.tsx`, `components/attempt/answer-grading-card.tsx` (score + comment per question) | `GradeAttemptPage — grading > sends the override with its comment and the other changed answers, one at a time` |
| 23 | "Reiniciar intento" (`GradingDashboard.jsx:50-55`) | gap (API) | No endpoint resets an attempt in the new API. | — |
| 24 | Manual grades in the student panel (`PanelStudentDetail.jsx`) | out of scope | Uses `/scores` in the teacher panel; not part of this migration. | — |

## 2. Behaviors from the migration prompt

| Behavior | Status | Evidence (new code) | Test |
|---|---|---|---|
| Tabs by state (Activas / Próximas / Cerradas) | covered | `evaluations-list.page.tsx:68` | `EvaluationsListPage > switches tabs and shows a failed published grade in the closed tab` |
| Type filter (client-side; the API has no filters) | covered | `evaluations-list.page.tsx:83`; `evaluation.entity.ts:157` | `EvaluationsListPage > filters by type and shows the empty state of the filter` |
| Timer corrected for server clock skew | covered | `attempt-timer.ts:16-22`; `hooks/use-attempt-timer.ts` | `clock skew > *`; `useAttemptTimer > measures the offset at the arrival of the response, not when a cached attempt renders`; `useAttempt > records the client time of the response that carried serverNow` |
| Autosave queue with retries | covered | `autosave-queue.ts:44`; `hooks/use-attempt-autosave.ts` | `AutosaveQueue > *` (11 tests, for example `never sends two requests for the same question at once`) |
| Submit idempotency (one POST on a double click) | covered | `attempt-player.page.tsx:142-151` (submitting ref) + idempotent backend submit | `AttemptPlayerPage > states the unanswered questions and submits once on a double click`; `> opens the result when the submit finds the attempt closed` |
| Resume after reload | covered | `entities/attempt-session-storage.ts:57-67` | `AttemptPlayerPage > resumes on the stored question after a remount`; `> shows and resends the unsaved answers restored from sessionStorage` |
| beforeunload warning in the attempt player | partial | `attempt-player.page.tsx:179-183` | No player test fires `beforeunload` (the builder guard is tested: `EvaluationBuilderPage — edit > tracks unsaved changes, guards navigation and saves only the changed metadata`). |
| Result states (SUBMITTED / PENDING_REVIEW / published) | covered | `attempt-result.page.tsx:69,132` | `AttemptResultPage > shows a submitted attempt without any graded detail or feedback request`; `> shows a pending review attempt as pending grading`; `> reloads the attempt when its grade is published` |
| AI feedback states (PENDING / READY / FAILED, FEEDBACK_READY + polling) | covered | `attempt-result.page.tsx:147`; `hooks/use-attempt-feedback.ts`; `components/result/feedback-block.tsx` (AiRatingWidget L61) | `AttemptResultPage > replaces the pending feedback skeleton when FEEDBACK_READY arrives for this attempt`; `> shows a discreet message for failed feedback`; `useAttemptFeedback > polls after 10 s and 20 s while pending and stops once nothing is pending` |
| Builder: scenarios, questions, drag-and-drop with batch reorder | covered | `evaluation-authoring/application/components/builder/builder-structure.tsx`; `use-evaluation-builder.ts` | `EvaluationBuilderPage — edit > sends the batch reorder of a drag and restores the order when it fails`; `moveQuestion > *` |
| Unsaved-changes guard | covered | `evaluation-authoring/application/hooks/use-unsaved-changes-guard.ts:129` | `useUnsavedChangesGuard > guards the browser Back button through beforePopState`; `EvaluationBuilderPage — edit > tracks unsaved changes, guards navigation and saves only the changed metadata` |
| SIMULATION question: clinical case + rubric (real backend schema) | covered | `components/builder/clinical-case-selector.tsx:32`, `rubric-editor.tsx:42`; `entities/simulation-rubric.entity.ts` | `EvaluationBuilderPage — simulation > picks a published clinical case and saves the rubric in the structural PATCH`; `validateSimulationRubric > applies the criterion rules in the backend order` |
| Client READY validation | covered | `evaluation-authoring/application/entities/evaluation-readiness.entity.ts:67` | `validateEvaluationReadiness > *`; `EvaluationBuilderPage — status > checks readiness on the client and shows the issues without sending the status` |
| 422 handling (no issues in the body) | covered | `use-evaluation-builder.ts` (re-reads `readinessIssues`) | `EvaluationBuilderPage — status > shows the reloaded readiness issues when the backend refuses READY (422)`; `EvaluationBuilderPage — edit > shows the client READY issues on the question when a save gets a 422 without issues` |
| 409 banner (structure locked) + duplicate | covered | `evaluation-builder.page.tsx:167`; `components/builder/structure-locked-banner.tsx` | `EvaluationBuilderPage — edit > shows the structure-locked banner and opens the duplicate`; `> keeps the texts and drops the structural edits when a save hits submitted attempts (409)` |
| Student preview | covered | `evaluation-builder.page.tsx:42,192`; `components/preview/student-preview-dialog.tsx` | `StudentPreviewDialog > renders the question read-only with its scenario and no correct-answer markers`; `toStudentPreview > never carries correct answers, feedback, explanation, rubric or an answer` |
| Activations (activate, list, close now) | covered | `evaluation-assignments.page.tsx:27-28,82,181` | `EvaluationAssignmentsPage > lists the activations with window, state and attempts`; `> closes an activation now after confirmation`; `> disables Activar with the reason when the evaluation is not READY` |
| Grading queue with filters and age | covered | `grading/application/pages/grading-queue.page.tsx`; `components/grading-queue-table.tsx` | `GradingQueuePage > lists the pending attempts oldest first with their age, score and grading link`; `> offers to clear the filters when they match nothing` |
| Override comment required | covered | `grading/application/entities/grading-attempt.entity.ts:164` `validateDraft`; `grade-attempt.page.tsx:63` (422 code on the field) | `GradeAttemptPage — grading > requires a comment to override an automatic score and sends nothing without it`; `> puts the backend 422 codes on their fields`; `override comment > requires a new, different comment for a score change` |
| Publish one attempt | covered | `grading-attempt.entity.ts:225` `canPublish`; `grade-attempt.page.tsx:287,408` | `GradeAttemptPage — publish > is disabled until the attempt is GRADED`; `> publishes a GRADED attempt after confirmation` |
| Regenerate AI feedback (staff) | covered | `grade-attempt.page.tsx:273-281` | `GradeAttemptPage — AI feedback > regenerates and follows the PENDING feedback to READY by polling` |
| Stats from the API (no client computation) | covered | `grading/application/pages/evaluation-results.page.tsx` (`Kpis`); lazy charts `components/results/lazy-evaluation-results-charts.tsx` | `EvaluationResultsPage — statistics > formats the API statistics in es-CO` (pass rate asserted as the literal "75%"); `> hands the API histogram buckets and question indices to the charts`; `> shows an empty state without attempts` |
| Stats scope (no group filter in the API) | covered | `evaluation-results.page.tsx` `RESULTS_COPY.kpiScope` ("Indicadores de todos los grupos") | `EvaluationResultsPage — statistics > formats the API statistics in es-CO` |
| Bulk publish with confirmation | covered | `evaluation-results.page.tsx` `publish` / `confirmDescription`: the dialog states the scope only (all graded, unpublished grades of the group or of every group); no client-side count; the toast reports the API `publishedCount`; the button is not disabled by computed counts. After a publish an info note says the stats may take up to 1 minute (backend 60 s cache), and the stats are revalidated once after `STATS_REFRESH_DELAY_MS` (65 s), with the timer cleared on unmount. | `EvaluationResultsPage — bulk publish > confirms with the scope only for every group and posts only the evaluation`; `> publishes one group and toasts the API count`; `> keeps the button enabled when every graded attempt is already published`; `> warns about the stats delay and revalidates the stats once after the backend cache window` |
| Per-student results table | gap (API) | No endpoint lists attempts or grades per evaluation. The page explains the gap and, for a chosen group, lists only published grades from the group dashboard. | `EvaluationResultsPage — groups and students > explains the per-student gap and lists the published grades of the chosen group` |
| Pending-count badge in the nav | covered | `grading/application/hooks/use-pending-grading-count.ts` (queue `limit=1` → `pagination.total`); `src/shared/layouts/nav.config.ts:60` (`badgeKey: "gradingPending"`) | `GradingPendingBadgeSync > feeds the badge with the queue total read from a one-row page`; `> refreshes every 120 seconds and hides the badge when the total drops to zero`; `nav-badges > shows the pending count on Calificar with screen-reader text` |
| Legacy route redirects (R1) | covered | `evaluations/application/entities/legacy-redirects.ts`; `evaluations/application/components/legacy-evaluation-redirect.tsx`; `pages/evaluation/**/*.tsx` | `resolveLegacyEvaluationRedirect > maps %s to %s` (7 cases); `> covers the seven legacy routes and never carries a query string`; `LegacyEvaluationRedirect > replaces a legacy grading route with the grading queue once` |

## 3. Other API gaps found during implementation (not parity rows)

- Student summaries carry no module or level.
- The authoring list has no module filter and no total points.
- The explanation is plain text.
- OPEN_TEXT questions have no teacher criterion field.
- The evaluation type cannot change after it is created.
- The per-option endpoints cannot switch the single correct answer on a READY evaluation.
- A 422 `evaluation.not_ready` carries no issues.
- The clinical-case list has no text search.
- The rubric has no weights, thresholds or AI policy.
- The student does not get a teacher comment or a rubric breakdown.
- The stats have no `groupId` filter.

## 4. Summary

| Status | Section 1 | Section 2 | Total |
|---|---|---|---|
| covered | 20 | 25 | 45 |
| partial | 1 | 1 | 2 |
| gap (API) | 2 | 1 | 3 |
| out of scope | 1 | 0 | 1 |

The two partial rows are row 12 (immediate feedback: the correct answer is no longer revealed during the attempt, by backend design) and the attempt player `beforeunload` warning (implemented, not tested).

## 5. P2 candidate removals (listing only; requires the author's approval)

Nothing below is deleted. P2 runs only after the author approves it, and each file must be checked for other importers first (for example `src/features/admin/components/panel/pages/PanelDashboard.jsx` and `src/shared/components/Sidebar.jsx` still link to `/evaluation*`, which now redirects).

Legacy feature `src/features/evaluation/`:
- `components/student/`: `ActivityList.jsx`, `EvaluationCard.jsx`, `QuizRenderer.jsx`, `TallerRenderer.jsx`, `ExamRenderer.jsx`, `ResultsScreen.jsx`, `SubmissionForm.jsx`, `GradeResult.jsx`, `SubmissionStatusBadge.jsx`, `SubmitHandler.jsx`, `QuestionRenderer.jsx`, `ActivityCard.jsx`
- `components/builder/`: `ActivityBuilder.jsx`, `GroupAssignmentSelector.jsx`
- `components/grading/`: `GradingDashboard.jsx`, `SubmissionReviewer.jsx`
- `components/dashboard/TeacherEvaluationDashboard.jsx`
- `context/EvaluationContext.jsx`, `useEvaluations.ts` (stub), `hooks/usePublicActivities.ts`, `hooks/useQuizzes.ts`, `hooks/useMySubmissions.ts`
- `api/quiz.api.ts`, `api/activity.api.ts`, `services/evaluationService.js`, `shared/services/evaluationService.ts`
- `UI/evaluation.module.css`
- Keep `src/features/evaluation/data/clinicalCases`: `src/features/ensenanza/shared/components/clinical/ClinicalCaseViewer.jsx:26` still imports it.

Legacy route entries:
- `pages/evaluation/**` (now thin redirects). They can go once nothing links to `/evaluation*` and the author accepts that old bookmarks will 404.
- The `/evaluation*` entries in `src/shared/session/routes.config.ts` and `src/lib/auth-config.js` (`PROTECTED_ROUTES`), removed together with the redirect pages.

Before any deletion, the `.js`/`.ts` pairs noted in the workspace CLAUDE.md (`evaluationService`, `useModuleProgress`, `progressService`) must be checked, because other legacy features may still import them.
