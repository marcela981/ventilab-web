# Feature: operation (notifications, student-space, teacher-dashboard, admin) and migration close-out

## Objective
Migrate the four operation features onto the template base (`src/features/<name>/{api,application,UI,index.ts}`), wire navigation and role homes, add the redirects from the legacy panel, and prepare the closure inventory. The closure itself (deleting legacy code) runs only after the author's explicit approval.

## Why
These are the last business screens still on the legacy panel. The backend already exposes every endpoint they need (`odd/operation-audit.md` b).

## Decisions (orchestrator, 2026-10-16; the author asked to run every phase without stopping)
1. **Phase 1 confirmation.** The author's instruction "no te detengas hasta finalizar todo, no me preguntes" is taken as the confirmation of the phase 1 plan. It is NOT taken as approval of the closure, which the request marks as a separate explicit approval and which deletes code.
2. **Feature folder names.** `notifications`, `student-space`, `teacher-dashboard`, `admin-console`. The legacy `src/features/admin` folder name is taken.
3. **Risk highlighting** uses only API data: a student is highlighted when any published evaluation has `passed === false` or the `averageGrade` is below the `passingGrade` returned by the API for that data. No progress threshold exists, so none is invented.
4. **Superadmin.** No DTO exposes it. Actions stay enabled and a 403 from the backend is shown as "this account is protected (superadmin)". Badge up front is a backend gap.
5. **Audit detail** uses the loaded row (`before`/`after` inline); the diff only compares keys for display.
6. **Settings forms** are generated from the metadata (`typeof defaultValue`, `limits`), recursively for object values; `ai.useCase.*` gets the provider-chain editor (dnd, only providers with `configured: true` from `/api/system/status`); unmappable shapes fall back to a validated JSON field.
7. **Notes reuse** needs exports added to `src/features/learning/index.ts` (the request requires reuse through that index).
8. **Registration files** (`eslint.config.mjs`, `package.json` `lint` script, `tsconfig.strict.json`, `vitest.config.ts`) are edited the same way every previous feature did.
9. **Build, E2E, axe and screenshots** cannot run here: ≈0.9 GB free RAM, no Playwright/axe in the repo, no backend running. Each block runs `typecheck`, `lint` and `vitest`; the rest is listed as pending for the author.
10. **Commits** per block on `master`, Conventional Commits, no AI attribution; one push at the end.

## Backend gaps to report
- (O3) No risk thresholds or at-risk flag in analytics.
- (O4) No superadmin flag in `UserDTO`/`AuthUserDTO`.
- (O4) No audit entry detail endpoint.
- (O3) No managed vs supervised flag on groups.
- (O1) No pending-grading count endpoint (queue `limit=1` workaround already used).
- (O1) Notification `data` typed as plain `object`.
- (O4) Settings metadata without `type`, labels, units or per-field schema; configured providers only in system status.
- (O4) Telemetry metrics require ADMIN, so the teacher status page has none.

## Checklist (D = delegated writer, I = inline)
- [x] Phase 1 audit (I + 3 explorers) → `odd/operation-audit.md`
- [x] O0+O1 (D) registration + notifications (bell, page, deep links, toasts, focus mode) — commit 6ff6875
- [ ] CLOSURE: ONLY with the author's explicit approval.

## Progress / evidence
- Native review of the inherited range `c7c7b45..279e04d` (ventilator-lab + phase 1 docs, 181 files, 25,406 lines): consent granted per the author's standing rule; START refused with `lens_context_budget_exceeded` (no authority created). Recorded as unavailable. Operation blocks are reviewed per commit (`--base-ref <previous commit> --committed-only`).

- O0+O1 (delegated: 2+ non-trivial files) — 49 files, +2521/−118. Checks: `npm run typecheck` 0 errors (parent re-run after the last edit); lint 0 errors on every touched folder; vitest notifications + design-system + session 56/56, ventilator-lab 491/491. Full `npm test` not completed (killed for low memory; earlier load timeouts in session-console, page-editor, ai-chat-drawer pass in isolation). Native review: medium, `slice_budget_reached`, consent granted, START refused `lens_context_budget_exceeded` → independent reviewer.
  - Gaps: the backend also notifies the staff member who preempts a reservation, so that actor now sees the toast (except on /lab/live); `expectOwnPreemption` is a no-op kept for its callers (cleanup at closure); lab page headers still mention the old toast.
- O1 independent review (general reviewer, read-only, commit 6ff6875): no severe defects; 4 low fixes (realtime refresh also on the page, purge queued notice toasts when focus activates, lab-live focus only with the live console, "mark all read" enabled when the page shows unread items) → follow-up fix commit. Nav badge item comes in O5.
- [x] O2 (D) student-space — commit 0695e6f, 41 files, +3572/−4. Checks: typecheck exit 0 (parent re-run), lint exit 0, vitest student-space + learning 214/214. Native review: medium, consent granted, lens `review-reliability` → **approved**, acknowledged (lineage review-78c50557395adaea, authority burned). Advisory (non-blocking): out-of-range page fallback flashes the empty state (my-notes.page.tsx:94-99), module analysis error paths untested, delete reports an error when only the cache refresh fails (my-notes.page.tsx:134-139) → follow-up fix.
  - Backend gaps: summary grades without attemptId (link to /evaluations/{id}); summary notes without moduleId/lesson title (link to /me/notes); summary sections without title; simulation sessions without case title; notes list without text search or section filter; NoteDTO without module/lesson title (one lesson read per distinct lesson); my grades without module (no module column/filter).
- O1 review fixes — commit 169bd08 (7 files, +93/−18). typecheck/lint exit 0; vitest notifications 43/43, design-system 40/40, lab pages 62/62. Assess: medium, `under_budget` (111 lines) → stays in the slice with the next commit.
- O2 advisory fixes — commit 580d297 (skeleton while an emptied page reloads, delete success once the server confirms, error-path tests). vitest student-space 41/41.
- [x] O3 (D) teacher-dashboard — commit fda5105, 43 files, +4420/−2. Checks: typecheck exit 0 (parent re-run), lint 0, vitest teacher-dashboard 32/32, shared api-client 38/38. New shared helper `src/shared/api-client/api-download.ts` (CSV as text, JSON errors as ApiError). Native review: slice `0695e6f..fda5105` (4,744 lines) and `580d297..fda5105` (4,422) both refused `lens_context_budget_exceeded` after consent granted → independent reviewer.
  - Risk: only `passed === false` on a published evaluation (the dashboard row has no `passingGrade`).
  - Backend gaps: no `passingGrade` on dashboard rows; evaluation stats not filterable by group (histogram spans all the teacher's groups, the UI says so); no group-level module progress aggregate (chart per selected student); reservations calendar without `groupId` filter (rows selected over 30 days); grading queue without student filter (detail scans the first 50 group rows); dashboard grades without `attemptId`; no staff endpoint for a student's grades without a group; no staff endpoint listing a student's simulation sessions (timeline entries used); progress summary without lesson level (titles from `/api/curriculum/tree`). Not verified: whether a teacher may open a student's session replay.
- O3 independent review: HIGH previous group's data shown after switching group (`keepPreviousData`); MEDIUM pending attempts scan capped at 50 rows; LOW-MED CSV without BOM (Excel accents); LOW modules without level dropped from the tree; judgement: risk counted any failed attempt even when a later one passed → fixes + rule refined to the latest published attempt per evaluation.
- [x] O4a (D) admin users + settings — commit 4622078, 40 files, +4580/−2. Checks: typecheck exit 0 (parent re-run), lint 0, vitest admin-console 48/48 (form generation types/limits/origin, provider chain, 409, 422, commands double confirmation, superadmin 403, own account). Native review: 4,582 lines, consent granted, `lens_context_budget_exceeded` → independent reviewer.
  - Backend gaps: no student code in UserDTO (search = name/email/id); superadmin known only from 403 codes `users.superadmin_*_immutable`; settings descriptions in English, no type/labels/units; `UpdatePlatformSettingDTO.value` type excludes string; 422 carries one `reason` string (path parsed client-side); dynamic-key maps (`ai.prices`, `ai.quotas`, `models`) cannot get new keys from the generic form.
- O4a independent review: HIGH users list shows the previous filter/page as current and hides errors (`keepPreviousData`); MED-HIGH optional quota/price entries treated as required (cannot save an override omitting them nor clear them); MED "1,000" silently parsed as 1; LOW-MED out-of-range `?page=` shows a false empty state; LOW role dialog closable while the PATCH runs → fix pass with O5/O6.
- O3 review fixes — commit aa28ae9 (selected group's data only, possibly incomplete pending list notice, modules without level bucket, risk on the latest published attempt, CSV BOM + response headers). vitest teacher-dashboard 37/37, api-client 41/41.
- [x] O4b (D) audit, AI analytics, research, status — commit f4655ba (with aa28ae9: 46 files, +4110/−31). Checks: typecheck exit 0 (parent re-run), lint 0, vitest admin-console 73/73, realtime 20/20. Status tokens `--vl-color-status-{ok,degraded,down,idle}` added to the design system; `system:status-changed` typed in `RealtimeEventMap`. Every O4b query uses `keepPreviousData: false`. Native review: 4,472 lines, granted, `lens_context_budget_exceeded` → independent reviewer.
  - Backend gaps: `system:status-changed` not in asyncapi/openapi (typed from server source); no catalog of audit actions/target types (free-text filters); no provider/model catalog for AI filters; AI telemetry days in UTC only; audit export row limit not exposed; no data dictionary for the research CSV; telemetry metrics ADMIN-only; probe 429 `Retry-After` not verified live.
- O4b independent review: MED status badge/probe text contrast below 4.5:1; LOW-MED risk "latest" ordered by publishedAt before attemptNumber; LOW truncated-export notice persists after filter change; LOW one-sided AI range not validated client-side → final fix pass.
- O4a review fixes — commit 99b7a8c (users list without stale rows, optional quota/price entries, ambiguous separators rejected, out-of-range page clamp, role dialog locked while saving). vitest admin-console 85/85.
- [x] O5+O6 (D) navigation, role homes, redirects — commit d3231c9. Nav per role with an "Administración" section (`section` on NavItem + subheader in the AppShell), notifications item with `notificationsUnread`; `DEFAULT_ROUTE_BY_ROLE` STUDENT /me, TEACHER and ADMIN /teacher; `RoleHomeRedirect` on `/` and `/dashboard`; `redirectByRole.js` and `auth-config.js` aligned; teacher/admin layouts read roles from `/teacher` and `/admin/users`; `/panel*` pages are server redirects (`legacy-redirects.ts`), their legacy components untouched. `login.page.test.tsx` updated inline to the new homes (I). Checks: typecheck exit 0, lint 0, vitest layouts + session 164/164, auth 73/73, admin-console 85/85. Native review of `f4655ba..d3231c9` (1,127 lines, high risk `hot_path`): consent granted → **approved**, acknowledged (lineage review-4b630bd618366b76, burned). Advisory: in-range empty users page sticks on the skeleton; "1.000" dot grouping still read as 1; layout header descriptions stale; `auth-config.js` duplicates the role homes; RoleHomeRedirect untested for role null → final fix pass.
- Final review fixes (D): status text tokens mixed with the text color (≥5:1 on their tints), risk "latest" by attemptNumber first, truncated notice reset on new runs and filter changes, one-sided AI range validated against now, in-range empty users page with pagination, dot and comma thousands grouping rejected, layout header descriptions corrected, `auth-config.js` reads `DEFAULT_ROUTE_BY_ROLE`, RoleHomeRedirect role-null and loading tests. vitest admin-console 93/93, teacher-dashboard 38/38, session 85/85, layouts 81/81, design-system 40/40.
- [x] O7 (D) docs: `odd/operation-parity.md` (7 done, 2 partial, 2 n/a), `odd/operation-closure-inventory.md` (480 legacy code files: 235 reachable, 245 unreachable, 87 without importer; `src/features/admin/**` fully unreachable since the /panel redirects; 5 unguarded legacy pages; unused deps proposed: react-hook-form, @hookform/resolvers, zod, @eslint/eslintrc, @types/bcryptjs; 9-step closure plan), `docs/operation/VERIFICATION.md` (greps: new code 0/0/0; legacy 3,374 style lines, 429 hex/rgb lines, 441 files without header).
  - Finding: `/achievements` probably renders nothing (`@/features/progress/components` resolves to `index.js`, `AchievementsGrid` only in `index.ts`); not checked in a browser.
- Final tree: `npm run typecheck` exit 0, `npm run lint` exit 0 (parent run).

## Pending for the author
- `next build` + First Load JS per route vs baseline (procedure in `docs/operation/VERIFICATION.md`); full `npm test`; E2E and axe (Playwright/axe not installed — needs approval to add); screenshots gallery `docs/screenshots/` (needs a running app).
- CLOSURE: approve the steps of `odd/operation-closure-inventory.md` explicitly.

## Next step
Push; closure only after the author's explicit approval.
