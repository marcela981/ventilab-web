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
- [ ] O2 (D) student-space (/me, /me/notes, /me/grades)
- [ ] O3 (D) teacher-dashboard (/teacher, /teacher/students/[userId])
- [ ] O4a (D) admin users + settings
- [ ] O4b (D) admin audit + AI analytics + research + status
- [ ] O5+O6 (D) navigation, role homes, redirects
- [ ] O7 (D) parity checklist + closure inventory + verification report
- [ ] CLOSURE: ONLY with the author's explicit approval.

## Progress / evidence
- Native review of the inherited range `c7c7b45..279e04d` (ventilator-lab + phase 1 docs, 181 files, 25,406 lines): consent granted per the author's standing rule; START refused with `lens_context_budget_exceeded` (no authority created). Recorded as unavailable. Operation blocks are reviewed per commit (`--base-ref <previous commit> --committed-only`).

- O0+O1 (delegated: 2+ non-trivial files) — 49 files, +2521/−118. Checks: `npm run typecheck` 0 errors (parent re-run after the last edit); lint 0 errors on every touched folder; vitest notifications + design-system + session 56/56, ventilator-lab 491/491. Full `npm test` not completed (killed for low memory; earlier load timeouts in session-console, page-editor, ai-chat-drawer pass in isolation). Native review: medium, `slice_budget_reached`, consent granted, START refused `lens_context_budget_exceeded` → independent reviewer.
  - Gaps: the backend also notifies the staff member who preempts a reservation, so that actor now sees the toast (except on /lab/live); `expectOwnPreemption` is a no-op kept for its callers (cleanup at closure); lab page headers still mention the old toast.

## Next step
O2 student-space.
