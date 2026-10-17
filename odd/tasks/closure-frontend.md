# Closure — frontend (B1–B6)

Locator: `odd/tasks/closure-frontend.md` · Engram mirror: `odd/closure-frontend/tasks` (pending: ambiguous engram project)

## Objective
Finish the template migration of ventilab-web: consume the new backend contract, remove every legacy file/workaround, fix the pending bugs and leave the app deploy-ready.

## Constraints
- No `sx`, inline `style`, `styled()`; CSS Modules under `UI/` with theme tokens only; new code in TypeScript.
- Header block on every new/modified file.
- No Playwright/axe/E2E. Keep typecheck, lint, build and existing vitest tests green.
- B3: one commit per step. Conventional Commits, no AI attribution, no push (a push to master may trigger a Vercel deploy), no new branches.

## Decisions applied (from the closure prompt + Phase-1 audit)
- D1: delete /flashcards, /achievements, /search, /teaching hub, /admin/search-analytics (+ nav links). Lesson deep-link redirects under /teaching/[moduleId]/[lessonId] stay (D5).
- D2: /scores page does not exist; delete the dead scoresService.
- D3: no new feature imports features/progress → delete it with its legacy consumers.
- D4: backend has POST /api/auth/register → migrate register into features/auth and remove NextAuth (SessionProvider, [...nextauth], backend-token bridge, curriculum API routes if unused).
- D5: all legacy redirects centralised in next.config `redirects()` as 307 (permanent: false), comment: switch to 308 after the defense.
- D6: SocketProvider, PatientDataProvider, PatientDataContext have no reachable consumer → delete; clinicalCases becomes unreachable after D1 → delete.
- D7: one shared numeric parser in shared/lib (',' and '.' decimal, no thousands separators) used by every numeric field, with helper text.

## Tasks
- [ ] B1 — Regenerate API client; contract-check script that fails on uncommitted diff.
- [ ] B2 — Consume new fields; remove workarounds (deep links, notes search/filters, grades module, teacher panel, admin, preemption self-filter).
- [ ] B3.1 — Delete dead files (withAuth, ProtectedRoute, auth.api.ts, auth.types.ts, dead dashboard, src/contracts).
- [ ] B3.2 — Delete features/simulador, features/evaluation, dead ai-feedback, unreachable ensenanza.
- [ ] B3.3 — Remove legacy references (Sidebar /simulador,/panel; PROTECTED_ROUTES; expectOwnPreemption).
- [ ] B3.4 — Apply D1, D2, D4.
- [ ] B3.5 — _app: apply D6.
- [ ] B3.6 — Apply D3.
- [ ] B3.7 — Session-closed notice in new shell; remove legacy shell (Sidebar, Navbar, AuthContext, useAuth, http.ts, httpClient.ts, legacy NotificationProvider).
- [ ] B3.8 — Centralise redirects (D5).
- [ ] B3.9 — Remove unused dependencies (verified one by one).
- [ ] B3.10 — knip (via npx) sweep of unused exports/files/deps.
- [ ] B4 — Bugs: lab page headers, csv-export reset race, real range limit in message, renderPagination param name, D7 numeric util, badge screen-reader text.
- [ ] B5 — 404/500, favicon/metadata, Spanish UI, security headers + CSP (Report-Only via env), optional Sentry by DSN, .env.example, README, CI workflow.
- [ ] B6 — Headers and style rules across all src/ and pages/.

## Route per task
Delegated direct: every block spans 2+ non-trivial files.

## Checks
`npm run typecheck` · `npm run lint` · `npm run build` · `npx vitest run` (by folders if memory runs out) · contract check.

## Progress / evidence
(updated per task with commit hashes)

- B1 (delegated writer, partial): `npm run generate:api` copied the backend contract and regenerated `schema.d.ts`; typecheck went from 0 to 33 errors, all fixture/consumer mismatches with the new required fields. Fixed inside the writer surface (20): Note entity + learning and student-space note mappers carry `moduleId`/`lessonTitle`/`pageTitle` (fixes `use-lesson-notes` upsert typing), fixtures of evaluations, learning, simulator, student-space and ventilator-lab tests carry the new fields, FEEDBACK_READY test notifications use the typed data (no cast). New `scripts/check-api-contract.mjs` + `npm run check:api` (regenerates, exit 1 when `git status --porcelain -- openapi/openapi.json src/shared/api-client/generated` is not empty). Pending outside the surface (13 errors): `admin-console/api/mappers/platform-settings.mapper.ts` (new `analytics` category), `admin-console/application/pages/admin-console-test-helpers.tsx`, `grading/application/pages/evaluation-results.page.test.tsx`, `groups/api/mappers/groups.mapper.test.ts`, `profile/api/mappers/profile.mapper.test.ts`, `teacher-dashboard/api/mappers/teacher-dashboard.mapper.test.ts`, `teacher-dashboard/application/pages/teacher-dashboard-test-helpers.tsx`. Commit: see `git log --grep "build(api)"`.
