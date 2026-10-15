# Feature: evaluations-grading

## Objective
Migrate the three evaluation features of ventilab-web onto the template base:
- `evaluations` (student)
- `evaluation-authoring` (teacher and admin)
- `grading` (teacher and admin)

The work also adds two shared modules:
- `shared/charts`
- `shared/media-upload`, promoted from content-editor

## Why
The legacy screens under `pages/evaluation/**` are built on the old Activity/Quiz/Submission model, and they compute grades on the client. The backend already exposes the new evaluation API:
- `/api/evaluations`
- `/api/my-evaluations`
- `/api/evaluation-attempts`
- `/api/evaluation-grading`
- `/api/analytics/evaluations`

## Constraints
- The backend stays untouched. Only endpoints listed in `openapi/openapi.json` are used. Grades and statistics are never computed on the client.
- Styling uses CSS Modules in `UI/`, with tokens only. `sx`, `style` and `styled()` are not allowed. Every file starts with the project header.
- Each feature follows the real feature layout:
  - `api/{dtos,services,mappers}`
  - `application/{entities,hooks,components,pages}`
  - `UI/`
  - `index.ts`
- Removing legacy components (P2) requires the author's explicit approval.
- A parallel session is building learning/content-editor in the main working tree. This work runs in a detached worktree at `ventilab-web-worktrees/evaluations` and will be moved onto master once content-editor is closed.

## Audit
The Phase 1 report is `odd/evaluations-audit.md`. It covers API gaps, the parity checklist and the bundle baseline.

## Delivery
Work-unit commits per task.

## Checklist
- [x] S0 (D) Shared setup:
  - register the three features in eslint, the lint script, tsconfig.strict and vitest;
  - add `/evaluations`, `/evaluations/manage` and `/grading` to routes.config and nav.config;
  - add `shared/lib/format.ts` (es-CO grade formatting, America/Bogota dates).
- [x] E1 (D) evaluations:
  - API layer;
  - list with tabs, type filter and cards, invalidated by socket events;
  - intro page.
- [x] E2 (D) Attempt player:
  - question components, with a read-only mode that is exported;
  - question navigator, scenario panel and PracticalQuestionSlot;
  - autosave with a retry queue;
  - timer corrected for server clock skew, with warnings at 5 and 1 min and auto-submit at zero;
  - submit dialog, resume after reload, and a beforeunload warning.
- [x] E3 (D) Result page:
  - published and unpublished states;
  - per-question score, correct answer and explanation;
  - AI feedback states PENDING, READY and DETERMINISTIC, updated by the FEEDBACK_READY socket event with polling as fallback;
  - ai-rating.
- [x] A1 (D) Authoring list: filters by type, status and text; edit, duplicate and archive actions.
- [x] A2 (D) Builder:
  - metadata;
  - scenarios and questions, ordered with drag and drop and saved with a batch reorder;
  - question editor per type;
  - explicit save and a guard for unsaved changes.
- [x] A3 (D) SIMULATION questions and validation:
  - clinical case selector and rubric editor, using the real backend schema;
  - client-side READY validation;
  - handling of 422 and 409 responses, with the duplicate banner.
- [x] A4 (D) Student preview (evaluations components in read-only mode) and the assignments page: activate dialog, list, close now.
- [x] G1 (D) Grading queue with filters and age; pending-count badge in the nav.
- [x] G2 (D) Grade attempt: manual scores, the comment-required rule when overriding, publish, regenerate AI feedback.
- [x] G3 (D) Evaluation results: stats from the API, lazy-loaded charts, bulk publish with confirmation.
- [ ] S1 (D) Promote the media upload component to `shared/media-upload` and use it in the question editor.
- [x] R1 (D) Legacy `/evaluation/**` routes redirect to the new routes.
- [x] P1 (D) Parity checklist with evidence in `odd/evaluations-parity.md`.
- [ ] P2 Legacy removal, after author approval.

## Progress log
- 2026-10-14: Phase 1 audit done. Worktree created at b39e1af.

- 2026-10-14: S0 committed e51990a, E1 committed e948239 (delegated writer; route: delegated, trigger = 2+ non-trivial files). Checks: typecheck 0, lint 0, vitest 19 files/183 tests green; parent spot check vitest evaluations+lib 10 files/55 tests green.
- Native review lineage review-c0e81dd107ca912e (base b39e1af, S0+E1, risk medium, consent granted per author instruction): 1 lens (reliability) -> correction_required, finding R3-start-attempt-dead-route (intro pushes to the attempt route that only E2 adds). Not corrected inside the lineage: the fix is the E2 player page itself (>200-line budget) and abandoning needs maintainer authorization; lineage left open, finding resolved by the E2 commit, which is reviewed separately.

- E2 370fbad (attempt player). Native review lineage review-288db91c20def27d: approved + acknowledged (4 advisory warnings).
- E3 d7965d1 (result + AI feedback). Native review review-466837a7c5cae82c: approved + acknowledged (4 advisories).
- Follow-ups 882998b (E2/E3 advisories) + A1 cef40c4 (manage list). Native review review-e8e6470708d08a7d: approved + acknowledged (5 advisories).
- A2 6a5becd (builder). Native review unavailable: lens_context_budget_exceeded. Independent reviewer: 0 critical, 5 warnings.
- 64048c9 (advisory fixes) + A3 03bc37a (simulation rubric, READY validation, lazy builder, A2 warning fixes). Native review unavailable: lens_context_budget_exceeded. Independent reviewer: 0 critical, 2 warnings.
- b1fd39e (A3 review fixes) + A4 b031519 (student preview, assignments page). Independent review pending.
- All writer checks green per task: typecheck 0, lint 0, vitest (latest 33 files / 224 tests across evaluations, evaluation-authoring, shared/lib).
- API gaps found in implementation:
  - no module/level on student summaries;
  - no module filter or total points on the authoring list;
  - explanation is plain text;
  - no OPEN_TEXT teacher criterion field;
  - type is immutable after create;
  - per-option endpoints cannot switch the single correct answer on READY;
  - 422 not_ready carries no issues;
  - no clinical-case text search;
  - rubric has no weights, thresholds or AI policy.

- A4 review C1 fixed in 4e8d888: staff may activate shared READY evaluations.
- G1 d50595e (queue + badge). Independent review: 0 critical. Fixes in 6cf56b0: badge polls only while AppShell is shown, every 120 s; the ignored sort toggle was removed.
- G2 9b261ce (grade attempt). Independent review: 0 critical. Fixes in 1b28ee2: an override needs a fresh comment; the staff FEEDBACK_READY handler was removed because the backend only notifies the student.
- G3 35007ad (results, shared/charts, bulk publish). Independent review: 0 critical. Fixes in 49953f7: no client-side publish estimate; a note about the 60 s stats cache delay.
- R1 6a6f633 (legacy /evaluation/** pages replaced by client redirects; legacy components kept). P1 240a418: odd/evaluations-parity.md lists 45 covered, 2 partial, 3 API gaps, 1 out of scope.
- Native review review-ecff3a7f1451adca (49953f7..240a418): approved and acknowledged, with 2 suggestions.
- The production build in the worktree (npx next build --webpack) was stopped by the host for low memory. It was not re-run, so the bundle has not been measured.
- More backend gaps:
  - GradingAttemptDTO has no student name.
  - The override rule requires a comment whenever a score exists.
  - PracticalScoreDTO.breakdown is untyped.
  - The simulation scorer expects the clinical-case criterion rubric, but evaluation questions validate the parameter rubric, so scoring may return INVALID_RUBRIC.
  - The grading queue ignores sortOrder.
  - FEEDBACK_READY only reaches the student.
  - Analytics are cached for 60 s with no invalidation on publish.
  - Assignment counts do not separate published from unpublished grades.

## Next step
S1 (waits for the content-editor media upload in C5, from the peer session). After that: cherry-pick onto master once the peer session has closed content-editor, run the build and bundle measurement in the main tree, push. P2 needs author approval.
