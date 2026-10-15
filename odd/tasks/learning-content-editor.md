# Feature: learning-content-editor

## Objective
Migrate the two learning features to the template structure on top of the shared base and the identity features (auth, profile, groups):
- `learning` (student; teacher/admin in preview mode): `/learn`, `/learn/[sectionId]`, `/learn/modules/[moduleId]`, `/learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber]`, `/learn/modules/[moduleId]/print`.
- `content-editor` (teacher/admin): `/content`, `/content/pages/[pageId]`.
Then redirect the legacy viewer routes, verify parity, and remove legacy modules ONLY with the author's approval.

## Why
The legacy viewer (`LessonViewer.jsx`, `LessonPageRenderer.jsx`, `LessonViewerRouteAdapter.jsx`, `LearningProgressContext.jsx`, `curriculumData.js`) keeps navigation state in memory/localStorage (cluster C2 corrupt step pointer), pulls clinical-case chunks (bug C4.5), calls Gemini from the browser, and edits content through Next API routes + NextAuth instead of the backend contract.

## Decisions (author, 2026-10-14)
1. **Page granularity = backend `Page` entity.** `[pageNumber]` is the 1-based order of the Page inside its lesson (`GET /api/pages?lessonId=`). Today the DB holds ONE Page per lesson with N blocks (`page_sections`), so a lesson renders as a single long page and Previous/Next jumps lesson to lesson. Paginating by block was rejected because `POST /api/progress/pages/{pageId}/view` registers progress per `pageId`. **If the backend later splits lessons into several Pages, the viewer works unchanged** (it already iterates Pages); only the content needs re-seeding. Revisit point: this decision.
2. **In-page quizzes are out of scope** (evaluations are migrated later). `QUIZ` blocks render as rich text only. Reported as a parity loss.
3. **Git**: same as the identity refactor: Conventional Commits on `master`, one or more per block, NO AI attribution / `Co-Authored-By`, no branches; only the parent orchestrator commits. Push once at the end.
4. **Protected-zone exception (tooling only)**: `package.json` (`lint` script path list), `tsconfig.strict.json` (include), `eslint.config.mjs` (feature/page registration), `vitest.config.ts` (include) may receive path additions to register the new features. Nothing else in those files.
5. **Legacy replacement**: `LearningProgressContext`, `curriculumData.js`, `LessonViewerRouteAdapter`, `LessonViewer.jsx`, `LessonPageRenderer.jsx` (the prompt's "PageRenderer.jsx") are replaced but NOT deleted until the parity checklist is complete and the author approves. `curriculumData.js` and the lesson JSON files must not be deleted while `ventylab-server/prisma/seed-content.ts` still reads them by relative path.
6. **E2E**: Playwright is not installed and the backend has no runtime fake AI provider. E2E scenarios are documented as pending/manual unless the author authorizes a new dev tool; unit tests (vitest + msw) cover the logic.
7. **Upload limits** are not exposed by the API: mirror constants in the frontend (image 10 MB, file 20 MB, video 100 MB; MIME png/jpeg/webp/gif, mp4/webm, pdf) and still map 413/415.

## Backend gaps to report (do not modify the backend)
- 🔴 Prerequisite locks are NOT enforced on content reads: `GET /api/pages/{id}`, `GET /api/modules/{id}/full`, `POST /api/progress/pages/{id}/view`, deepen and conversations return 200 for locked modules (`LearningProgressFacade.isUnlocked` has no consumers). DRAFT/ARCHIVED are hidden correctly (`isContentVisible`).
- `locked`/`missingPrerequisites` exist only for levels and modules in `GET /api/curriculum/tree`; no lesson/page lock.
- `GET /api/tutor/conversations` filters only by `scope`, not `refId` (client-side filtering to reopen a lesson conversation).
- No move between parents; reorder is transactional per parent (`PUT /*/reorder`).
- Status change has a PATCH only for sections; others use PUT with `status`.
- Upload limits not exposed; no full section→page editor tree (composed from `/sections` + `/teaching/tree` + `/modules/{id}/full`).
- Prerequisite lesson IDs differ (`rp-*` in DB vs `module-0X-*` in curriculumData); 5 prerequisite lessons have no Page; beginner Pages may have `lessonId` NULL (legacyLessonId mismatch). Needs an authorized read-only DB check.

## Hard constraints
Same as `odd/tasks/frontend-template-refactor.md` (structure, CSS Modules in `UI/` with tokens only, no `sx`/`style`/`styled`, header on every new/modified file, new code never imports legacy, only openapi.json endpoints, SWR via `useApiQuery`/`useApiMutation`, preserve C1 code splitting and C4 cache pattern, no `npm run dev`, node/npx via PowerShell). Do not modify the backend or delete DB content.

## Delivery strategy
Forecast > 400 authored lines (several thousand). Strategy: `exception-ok` on `master` (author's repo policy, no branches); keep each commit under ~1500 authored lines (native review lens budget).

## Checklist
Route per task: D = delegated writer, I = inline.

### Shared base
- [x] T0 (D) Register features (eslint, lint script, tsconfig.strict, vitest, routes.config, nav.config "Aprender"/"Contenido"); SSE stream helper in `shared/api-client`; `shared/rich-content` block renderer for DB block types (TEXT-like/Tiptap doc, IMAGE, VIDEO url|media, FILE, EQUATION, CODE, DIVIDER) with lazy Tiptap/KaTeX; baseline build.

### learning
- [x] L1 (D) Routes + navigation: URL builders, curriculum tree, sections/levels/modules pages, breadcrumb, lock screen with prerequisites links.
- [x] L2 (D) Progress: bars from backend, page-view rule (>=5 s or Next, once per visit), optimistic update + invalidation, "Continue where I left off".
- [x] L3 (D) Viewer: page render, Previous/Next across lessons, module completion screen, side panel (Notes | Deepen | Questions), mobile bottom sheet.
- [x] L4 (D) Notes panel: lesson notes, anchor to page, lazy Tiptap editor, debounced autosave + status, edit/delete with confirmation, AI analysis + ai-rating.
- [x] L5 (D) Deepen panel: SSE streaming, stop/abort, abort on close, ai-rating, 429/provider/unpublished errors.
- [x] L6 (D) Questions panel: LESSON/MODULE scope, reopen existing, history, streaming, abort, ai-rating per answer.
- [x] L7 (D) Print view `/learn/modules/[moduleId]/print` (single request, @media print).

### content-editor
- [x] C1 (D) Tree: composed hierarchy, create/edit, filters (status, text), status badges.
- [x] C2 (D) Reorder (dnd, per-parent batch, revert on failure), status change + parent-draft warning, delete with 409 → archive dialog.
- [x] C3 (D) Prerequisites editor (levels, modules) with 409 cycle message.
- [x] C4 (D) Page editor: block list (add, reorder, duplicate, delete), Tiptap text, KaTeX live preview, video URL preview, explicit save, unsaved-changes guard.
- [x] C5 (D) Media: upload with progress, client validation, video upload, 409 on referenced delete.
- [x] C6 (D) Student preview with the learning viewer components.

### Migration
- [x] R1 (I) Legacy viewer routes redirect to the new routes.
- [x] P1 (I) Parity checklist with evidence (`odd/learning-parity.md`).
- [ ] P2 Legacy removal — ONLY after author approval.

## Progress log
- 2026-10-14: Phase 1 audit delivered; author approved Phase 2 with decision 1.
- 2026-10-14/15: T0 (281236b, d3cef6f, 8c2a373), L1 (c481dce), L2 (71f59b6, 5b3fc03), L3 (3d55808), L4 (8918f44, 773d393, dda7a9f), L5 (3e4627f), L6 (b39e1af, bb4e2b9), L7 (90cf886, 4359832, d8b2f20), C1 (9b5c42f), C2 (39cc6f2, e0a3206), C3 (f6ea3bb) committed on master (reconciled from git log on 2026-10-15; earlier progress log entries were not written back).
- 2026-10-15: C4 page editor (D, writer trigger: 2+ non-trivial files) d83b162 + 51006aa, native review approved x2 (reliability lens, advisory warnings fixed in af3b934, approved). R1 (I, 2 thin route files + pure resolver) 029a3fb: /teaching/[moduleId]/[lessonId] and /teaching?moduleId=&lessonId= redirect server-side (307) to /learn/modules/M/lessons/L/1 (seeded ids are equal in curriculumData and the DB; legacy had no page in the URL); the /teaching hub still renders (dashboard/progress tabs belong to a later category), so the legacy nav entry "Aprendizaje" stays. C5 media (D) 375eea0, review approved (advisory: 409 stuck detach, orphan on block delete -> fixed in C6 follow-up). Checks per block: typecheck 0, lint 0, vitest content-editor 91/91, build exit 0; First Load JS gzip: /learn* 293-298 kB (legacy /teaching/[m]/[l] baseline 467 kB), /content/pages/[pageId] 253 kB, Tiptap absent from every /learn initial chunk. Parity draft: odd/learning-parity.md.
- 2026-10-15: C6 (D) c2c28b9: student preview renders the current draft with learning's exported LessonPageArticle (lazy, DRY); C5 review follow-ups (409 detach, orphan release on block delete) included; review approved (suggestion: LaTeX escape in test, fixed). P1 (I) odd/learning-parity.md: 44 rows, losses 12, 13, 21, 22, 34, 35, 37, 38, 39 for the author to accept. Final checks: typecheck 0, lint exit 0, vitest 89 files / 751 tests passed, build exit 0, greps 4-7 = 0, First Load JS /learn* 293.8-298.7 kB (legacy viewer baseline 467 kB), /content/pages/[pageId] 253.3 kB, Tiptap absent from /learn initial chunks and lazy in /content/pages/[pageId]. NOT run: E2E (decision 6), visual review, curriculumData vs DB comparison (needs authorized read-only DB access).

## Next step
Author: review odd/learning-parity.md losses, approve or reject P2 (legacy removal), authorize the read-only DB comparison of curriculumData, run E2E and the visual review.
