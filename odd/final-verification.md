<!--
* Funcionalidad: Final verification report
* Descripción: T12 of the frontend-template-refactor feature: observed results of the 12 final checks of the original requirement (typecheck, lint, build + First Load JS vs the baseline, style/hex/header greps over the new-code folders and the full trees, protected files, api-client and guard tests, planned E2E scenarios, legacy routes, visual review), plus the consolidated list of items pending for the author. Source data: odd/tasks/frontend-template-refactor.md, odd/legacy-coexistence.md, odd/baseline-bundle.md.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Final verification (T12, 2026-10-14)

Run on `master` after `823506b` plus the T12 working-tree changes (Part 0 review fixes, see the feature doc). PowerShell, repo root, sequential, no `next dev` running (process list checked before the build).

| # | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | PASS — exit 0, 0 errors (`tsc -p tsconfig.strict.json --noEmit`) |
| 2 | `npm run lint` | PASS — exit 0, 0 problems (new-code folders + the 5 thin routes + `_app.js`, boundaries and style-ban rules active) |
| 3 | `npm run build` + First Load JS | PASS — exit 0, 32 pages generated; bundle table below |
| 4 | `sx=` / `style={` / `styled(` | PASS — 0 in new code; 3369 lines (223 files) in the full trees = legacy allowlist |
| 5 | hex/rgb in `*.module.css` | PASS — 0 in new code; 401 lines (19 files) in the full trees = legacy allowlist |
| 6 | Files without `Autor: Marcela Mazo Castro` | PASS — 0 of 196 new-code files; 420 of 672 in the full trees = legacy allowlist |
| 7 | Protected files unchanged | PASS — empty diff vs `8e8054f~10` (= baseline `62c9d68`) and vs T0 `c26eed2`, nothing staged/untracked |
| 8 | api-client tests | PASS — all three required behaviors tested and green |
| 9 | Guard tests | PASS — both required behaviors tested and green |
| 10 | E2E smoke (Playwright) | NOT EXECUTED — Playwright not installed; no servers in this environment |
| 11 | Legacy routes | Build part PASS (all compile and prerender); runtime console check NOT EXECUTED |
| 12 | Visual review | NOT EXECUTED — needs a browser and the running app |

`npm run test`: run 1 — 42 files, 421/422 (timeout at the 5 s default in `groups.page.test.tsx` "creates a student group from the dialog and refreshes the list"; 1.4 s isolated, 11/11 in that file); run 2 — same single timeout (5.16 s), so it was a consistent load timeout, not a one-off flake; that test got a 15 s budget (same precedent as the T6b lazy tests); run 3 — 42 files / 422 passed; final run after the new guard tests — 42 files / 424 passed.

## 1–2. Typecheck and lint

- `npm run typecheck` -> `tsc -p tsconfig.strict.json --noEmit`, exit 0, no output.
- `npm run lint` -> `eslint --no-error-on-unmatched-pattern src/shared/{api-client,realtime,session,design-system,layouts,rich-content,waveforms,ai-rating,lib} src/features/auth/{api,application,index.ts} src/features/profile src/features/groups pages/_app.js pages/auth/login/index.tsx pages/profile/index.tsx pages/my-group/index.tsx pages/groups/index.tsx pages/groups/[groupId].tsx`, exit 0, no problems reported.
- Scope (decision 3): legacy keeps its baselines (`tsc -p tsconfig.json` 277 `error TS` at T10, `npm run lint:legacy` 234 errors pre-existing); not re-run here.

## 3. Build and First Load JS

`npm run build` (Next 16.1.1, webpack): `✓ Compiled successfully in 28.7s`, `✓ Generating static pages using 7 workers (32/32)`, exit 0. Method identical to `odd/baseline-bundle.md`: `.next/build-manifest.json` -> pages[route] + pages['/_app'] + polyfillFiles, `*.js` only, gzip via .NET GZipStream (Optimal), KiB. Baseline values are rounded integers (±0.5).

| Route | Baseline gzip | Final gzip | Delta | Justification |
|---|---|---|---|---|
| /_app | 273 | 282.6 | +9.6 | Shell growth accepted per task: SWR core + `ApiSWRProvider` (T3 +4.9), backend `AuthProvider` (T4 +1.5), `RealtimeProvider` (T5 +1.0), theme/tokens + Roboto (T2 +0.9), session snapshot / sign-out / NextAuth bridge (T9 +0.9), global `ToastProvider` (T6b +0.5, T12 +0.1), layout resolver (T6 +0.1); T10 -0.4. Axios, the refresh module, layouts and feature code stay out of `_app`. |
| / | 274 | 282.9 | +8.9 | `_app` delta only |
| /_error | 275 | 284.6 | +9.6 | `_app` delta only |
| /achievements | 325 | 333.8 | +8.8 | `_app` delta only |
| /admin/search-analytics | 352 | 361.4 | +9.4 | `_app` delta only |
| /auth/access-denied | 277 | 285.9 | +8.9 | `_app` delta only |
| /auth/error | 279 | 288.5 | +9.5 | `_app` delta only |
| /auth/forgot-password | 276 | 284.9 | +8.9 | `_app` delta only |
| /auth/login | 317 | 327.2 | +10.2 | New login page (T9): GIS loader, error mapping, NextAuth reconciliation, loop guard; ≈ `_app` delta (legacy NextAuth page removed, -1.8 at T9) |
| /auth/register | 300 | 307.7 | +7.7 | `_app` delta only (below it: chunk regrouping) |
| /dashboard | 274 | 282.9 | +8.9 | `_app` delta only |
| /evaluation | 306 | 315.7 | +9.7 | `_app` delta only |
| /evaluation/[activityId] | 313 | 331.7 | +18.7 | `_app` +9.6, plus +9.1 from shared chunks (see note) |
| /evaluation/grade | 297 | 306.8 | +9.8 | `_app` delta only |
| /evaluation/grade/[activityId] | 307 | 321.0 | +14.0 | `_app` +9.6, plus +4.4 from shared chunks (see note) |
| /evaluation/manage | 299 | 308.4 | +9.4 | `_app` delta only |
| /evaluation/manage/[activityId]/edit | 314 | 324.2 | +10.2 | `_app` delta (+0.6 within rounding/regrouping) |
| /evaluation/manage/new | 314 | 324.0 | +10.0 | `_app` delta (+0.4 within rounding) |
| /flashcards | 351 | 362.0 | +11.0 | `_app` +9.6, plus +1.4 from shared chunks (see note) |
| /groups | — | 317.3 | new | Staff page code lazy (T11c): async chunks after hydration, not First Load |
| /groups/[groupId] | — | 317.3 | new | Same as /groups |
| /my-group | — | 317.3 | new | Student page; staff code deferred (T11c) |
| /panel | 305 | 314.7 | +9.7 | `_app` delta only |
| /panel/admin | 327 | 336.8 | +9.8 | `_app` delta only |
| /panel/settings | 281 | 289.7 | +8.7 | `_app` delta only |
| /panel/students | 337 | 346.4 | +9.4 | `_app` delta only |
| /panel/students/[id] | 329 | 345.1 | +16.1 | `_app` +9.6, plus +6.5 from shared chunks (see note) |
| /profile | 329 | 330.4 | +1.4 | New profile page replaced the legacy tabbed page (T10 -9.5) |
| /search | 315 | 324.8 | +9.8 | `_app` delta only |
| /simulador | 464 | 473.9 | +9.9 | `_app` delta only |
| /teaching | 528 | 532.9 | +4.9 | Below the `_app` delta (it already shipped SWR, now in the shell) |
| /teaching/[moduleId]/[lessonId] | 467 | 476.3 | +9.3 | `_app` delta only; Tiptap/KaTeX/Chart.js still split by interaction (T2 noted +3 from outside the theme, absorbed into chunk regrouping since) |

Note on the four routes that grew more than the `_app` delta (`/evaluation/[activityId]`, `/panel/students/[id]`, `/evaluation/grade/[activityId]`, `/flashcards`): their page sources are unchanged by this feature (the only legacy edits under `pages/evaluation` and `src/features/admin` are the T2 dark-scope CSS/`PanelLayout` lines). Their non-`_app` chunks now include shared chunk `9856` (39.3 KiB raw: MUI Select/InputBase/OutlinedInput/NativeSelect/FormLabel, the TextField family also used by the identity routes) and `1040` (56.2 KiB raw, contains axios; legacy `http.ts` imports the T3 shared refresh modules since T3). This is consistent with webpack splitChunks regrouping after new routes joined the graph, but the baseline chunk graph was not preserved, so the exact attribution is NOT confirmed. To confirm: build `62c9d68` and diff the two manifests for those routes. None of them is an initial-load route for the identity features.

## 4–6. Greps: new-code scope vs full trees

Decision 3 of the feature doc: verification scope = new code only; everything else under `src/` is the legacy allowlist (reported, not fixed). The requirement's literal command greps all of `src/shared` and `src/features`, which mixes both, so both counts are reported.

New-code set (196 code files): `src/shared/{api-client,realtime,session,design-system,layouts,rich-content,waveforms,ai-rating,lib}`, `src/features/auth/{api,application,UI,index.ts}`, `src/features/profile`, `src/features/groups`, `pages/auth/login/index.tsx`, `pages/profile/index.tsx`, `pages/my-group/index.tsx`, `pages/groups/index.tsx`, `pages/groups/[groupId].tsx`.

| Check | Command | New code | Full `src/shared` + `src/features` |
|---|---|---|---|
| 4 | `rg -n "sx=\|style=\{\|styled\("` | 0 | 3369 lines in 223 files (`sx=` 3207, `style={` 73, `styled(` 89) |
| 5 | `rg -n --glob "*.module.css" "#[0-9a-fA-F]{3,8}\b\|rgba?\("` | 0 | 401 lines in 19 files |
| 6 | `rg --files-without-match "Autor: Marcela Mazo Castro"` over `*.{ts,tsx,js,jsx,css}` | 0 of 196 | 420 of 672 files |

The full-tree hits are all in legacy folders (`src/shared/{components,contexts,hooks,services,types,utils,dev}`, `src/features/{ensenanza,simulador,evaluation,admin,dashboard,progress,...}`, legacy `src/features/auth/{components,auth.api.ts,auth.types.ts}`). Inventory by area: `odd/legacy-coexistence.md`. JSON files (`package.json`, `tsconfig*.json`, `openapi/openapi.json`) cannot hold a header; the generated `schema.d.ts` gets it from the generator script.

## 7. Protected files

`src/features/progress/LearningProgressContext.jsx`, `src/features/ensenanza/shared/data/curriculumData.js`, `src/features/ensenanza/shared/components/pages/LessonViewerRouteAdapter.jsx`:

- `git diff --stat 8e8054f~10 -- <3 files>` -> empty (`8e8054f~10` = `62c9d68`, the baseline commit).
- `git diff --stat c26eed2 -- <3 files>` -> empty.
- `git status --short -- <3 files> src/features/progress` -> empty.
- Also empty: `git diff --stat c26eed2 -- src/features/progress .env* prisma next.config.*`.

## 8. api-client tests (`src/shared/api-client/http-client.test.ts`, verbose run, all ✓)

- "5 concurrent 401 -> exactly ONE refresh": `401 handling > runs exactly one refresh for 5 concurrent 401s and retries every request` ✓ (asserts `refreshCalls === 1`, all 5 retried, one `token-refreshed` event).
- "refresh fails -> logout + redirect": `401 handling > clears tokens, emits session-expired once and rejects all pending requests when refresh fails` ✓ (api-client half: both tokens cleared, one `session-expired`); end to end with the session and the guard, new in T12: `src/shared/session/guards.test.tsx > RequireAuth > logs out and redirects to the login page with returnTo when the token refresh fails` ✓ (real api-client: 401 then refresh 401 -> one refresh, tokens null, content hidden, one `router.replace("/auth/login?returnTo=...")`).
- "slow timeout applied to marked routes": `timeouts > uses the slow timeout for registered cold-start routes` ✓ (+ `uses the fast timeout for other routes` ✓, `lets a per-call category override the registry` ✓).

## 9. Guard tests (`src/shared/session/guards.test.tsx`, verbose run, all ✓)

- "student on a teacher route -> redirect": `RequireRole > redirects a student on a teacher route to the student home` ✓ (new in T12: `RequireRole roles={ROUTES["/groups"].roles}` with a STUDENT -> content hidden, one `router.replace("/dashboard")`); also the generic `RequireRole > redirects a wrong role to its landing route without showing the content` ✓.
- "no session -> /login with returnTo": `RequireAuth > redirects an unauthenticated visitor to the login page with returnTo` ✓ (`/auth/login?returnTo=%2Fteaching%2Fm1%2Fl2%3Ftab%3Dquiz`; the app's login route is `/auth/login`) and `RequireRole > sends an unauthenticated visitor to the login page` ✓.

## 10. E2E smoke — NOT EXECUTED

Reason: Playwright is not a dependency (`package.json` has no `playwright`/`@playwright/test`; `node_modules/@playwright` does not exist), installing packages and starting the frontend/backend servers is not allowed in this environment. Planned scenarios for the author (backend `ventylab-server` main with `npm run demo:seed`, password `VentyLab-Demo-2026`; frontend with `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set for scenario 2):

- [ ] 1. Login per role: `estudiante01@ventylab.demo` -> `/dashboard`; `ana.torres@ventylab.demo` -> `/panel`; admin (`SUPERADMIN_EMAIL`, default `superadmin@ventylab.demo`) -> `/panel`. Also a protected URL while signed out -> `/auth/login?returnTo=...` -> back to it after login.
- [ ] 2. Google sign-in with the GIS popup mocked (stub `window.google.accounts.id` and route `POST /api/auth/google` to a fixture), plus the unconfigured state (disabled button + notice).
- [ ] 3. Inactive user: admin deactivates `estudiante10@ventylab.demo` (`PATCH /api/users/{id}/status`), then that login shows the `auth.user_inactive` message.
- [ ] 4. Teacher `ana.torres@ventylab.demo` creates a student group on `/groups`, opens it, adds `estudiante05@ventylab.demo` and `estudiante06@ventylab.demo` through the member search, assigns one as leader (confirmation dialog), sees the success toasts.
- [ ] 5. 409: add a student who already belongs to one of the two seeded student groups to the new group -> "student already in group" message, no member added.
- [ ] 6. Student `estudiante05@ventylab.demo` opens `/my-group` and sees the group, the leader chip and the members.
- [ ] 7. Role change: admin calls `PATCH /api/users/{id}/role` on a signed-in student (second browser context) -> `user:role-changed` on the socket -> token refresh + `/me` reload -> navigation/AppShell show the new role without a re-login.

## 11. Legacy routes

Build output (all `○` static, compiled and prerendered without errors): `/teaching`, `/teaching/[moduleId]/[lessonId]` (lessons), `/simulador`, `/evaluation`, `/evaluation/[activityId]`, `/evaluation/grade`, `/evaluation/grade/[activityId]`, `/evaluation/manage`, `/evaluation/manage/new`, `/evaluation/manage/[activityId]/edit`, `/panel/*`.

Layout: only the 5 new thin routes export `getLayout` (`/auth/login` PublicLayout, `/profile` StudentLayout, `/my-group` StudentOnlyLayout, `/groups` and `/groups/[groupId]` TeacherLayout). None of the lesson, simulator or evaluation pages does, so `pages/_app.js` v2.6 keeps their exact previous wrapper: legacy `Sidebar` shell + per-page legacy `ErrorBoundary` (`/panel/*` and `/auth/*` keep their own `PanelLayout` / bare rendering). Reservations: there is NO reservations page in this frontend (`pages/` has no `reservations` route; the feature exists only in the backend `main`), so there is nothing to check.

Runtime console check: NOT EXECUTED (no server). Pending for the author: open each legacy route above signed in with the new login (local and, once configured, Google) and with a NextAuth-only session, and confirm no console errors, no redirect loop, dark scopes intact (`/teaching`, `/simulador`, `/panel`).

## 12. Visual review — NOT EXECUTED

Needs a browser and the running app. Screens to compare against the light MUI identity (`src/theme/theme.js` palette, Roboto):

- `/auth/login` (form, field errors, server error alert, expired-session notice, Google button enabled/disabled, blocked-redirect view).
- AppShell: desktop permanent drawer and mobile temporary drawer, user menu, avatar image and initials fallback, "Sin conexión en tiempo real" chip, skip link focus.
- `/profile` (view, edit, avatar preview, saving spinner, success/error).
- `/my-group` (group, empty state).
- `/groups` (list, filters, pagination, create dialog for teacher and admin), `/groups/[groupId]` (read-only teacher group, member search, confirm dialogs, supervisions panel, toasts).
- Global toasts (success, error replacing behavior) and loading/empty/error states.
- Legacy pages after the T2 global CSS reconciliation: `/teaching`, a lesson, `/simulador`, `/evaluation/*` (dark-designed, see pending), `/panel/*`, `/achievements`.

## Pending for the author

Consolidated from `odd/tasks/frontend-template-refactor.md` and `odd/legacy-coexistence.md`.

Configuration and decisions:
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (the web client ID the backend verifies) in `.env` and the deployment env, plus the app origins in the OAuth client's "Authorized JavaScript origins"; rebuild (T9 a).
- [ ] Google-only teachers have no NextAuth session, so `pages/api/curriculum/*` (`requireTeacher`, `getServerSession`) rejects them (lesson editing); the bridge for local logins also depends on the frontend Prisma DB accepting the same password. Decide: accept the backend bearer token in those routes (T9 c1/c2).
- [ ] Contrast AA failures of the existing palette (white on primary 2.58, success 2.78, warning 2.16, secondary 3.20, error 3.68; primary as link 2.58; text.secondary on paper 4.49) — keep or adjust (T2).
- [ ] `/evaluation/*` is dark-designed without a dark root after the T2 reconciliation: one-line fix in `pages/evaluation/UI/evaluation.module.css` needs authorization (T2 correction round).
- [ ] Bundle: confirm the four routes that grew beyond the `_app` delta (section 3).

Missing functionality and backend gaps:
- [ ] Password change (`/api/users/me/change-password` exists) and avatar file upload (base64) were not carried over to the new profile (T10 a).
- [ ] No `isSuperadmin` in UserDTO/AuthUserDTO/MeResponseDTO, so no superadmin badge (T10 b); no separate Google avatar field (T10 c).
- [ ] Groups: `GET /api/groups` has no pagination or text search (client-side, decision 7); `GET /api/groups/mine` has no member emails/images or supervising teacher names; `GET /api/users` caps `limit` at 100, has no "not in group" filter and filters by ONE role (no ADMIN members for teacher groups); no "can manage" flag in the group DTOs; no staff read of the teacher groups supervising a student group (T11a–c).
- [ ] `ApiError` joins validation messages into one string; per-field mapping is keyword-based (T10 e).

Legacy coexistence:
- [ ] Legacy group management in `/panel/students` (`groupsService.js`, `GroupBuilderModal.jsx`) does not invalidate the new SWR keys.
- [ ] Legacy `AuthContext.RequireAuth` and `Sidebar.jsx` keep the redirect race bounded only by the loop guard; legacy `useAuth`, `AuthContext`, `/auth/register` (NextAuth) stay until their pages migrate.
- [ ] `RichContent`, `WaveformChart`, `AiRatingWidget` have no legacy consumer (swaps are not 1:1); `ventilator:*` socket events are not typed yet.
- [ ] Legacy `NotificationProvider` and the new toast coexist; `ConfirmDialog` still has its own pending button; skeleton presets have no consumer (T6b).
- [ ] With a backend session whose `/me` fails (5xx/network), the legacy socket context stays idle until the session recovers (accepted, T8).

Repository hygiene:
- [ ] `git rm` of the unreferenced files: `jsconfig.json`, `ARQUITECTURA.md`, `public/{file,globe,next,vercel,window}.svg`, `public/index.html`, `public/test-db-fetch.html`, `docs/README.md`, `docs/architecture/ADR-001-frontend-structure.md`, `docs/setup/INSTRUCCIONES_ACTUALIZAR_ENV.md`, `docs/setup/README_ENV.md` (+ the 14th in the command already given), legacy `src/features/auth/auth.api.ts` and `auth.types.ts` (no importers); check `src/lib/auth-config.js` `getAuthErrorMessage` before removing; stale `profile.api.ts` comment in `src/shared/services/authService.js`.
- [ ] i18n: every new UI string is plain Spanish with `TODO(i18n)`; add an i18next namespace in `src/i18n`.
- [ ] Engram mirror `odd/frontend-template-refactor/tasks` resynchronized with the final feature doc.

Runtime checks not executed here:
- [ ] E2E scenarios 1–7 (section 10), legacy routes runtime console check (section 11), visual review (section 12), GIS popup flow with a real client ID (T9 g).
