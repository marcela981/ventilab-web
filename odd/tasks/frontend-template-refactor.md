# Feature: frontend-template-refactor

## Objective
Refactor the ventilab-web frontend to the template structure (shared base, layouts, conventions, tooling) WITHOUT migrating business features, then implement the 3 identity features: auth, profile, groups.

## Why
The backend (ventylab-server, NestJS, branch main) exposes its contract in `ventylab-server/openapi/openapi.json`. The frontend logs in through NextAuth+Prisma, bypasses that contract, and mints a JWT the backend rejects on permission-guarded routes (no `sub`, no `permissions`). It also has 3419 `sx=`, duplicated HTTP wrappers, and no tests.

## Decisions (confirmed by the author on 2026-10-13)
1. **Auth**: new code authenticates against the backend: `POST /api/auth/login`, `POST /api/auth/google` (Google Identity Services ID token), `POST /api/auth/refresh` (refreshToken in the body), `POST /api/auth/logout`, `GET /api/auth/me`. NextAuth stays ONLY for the legacy `pages/api/curriculum/*` routes and whatever legacy code still depends on it. The bridge is not removed if anything legacy needs it.
2. **`npm run build` is authorized** for the baseline and at the end of each block (the workspace CLAUDE.md rule is lifted for this feature). Never run it while a dev server is running.
3. **Verification scope = NEW code only.** `typecheck` uses `tsconfig.strict.json`, `lint` targets the new folders, and the sx/hex/header greps run over the new folders. Legacy is listed in the allowlist below.
4. **Git**: commits and push ARE allowed, one commit (or more) per block, Conventional Commits. NEVER add `Co-Authored-By`, "Generated with Claude", or any AI attribution. Author = repo git config. Commit and push on the current branch (`master`); do not create branches. Only the parent orchestrator commits; writers do not.
5. **Protected-zone exception**: `tsconfig.json`, `package.json`, and `eslint.config.mjs` may be edited for the tooling block.
6. **Visual identity**: the LIGHT MUI palette of `src/theme/theme.js` is the official identity. Roboto is loaded for real via `next/font`. The dark `src/styles/theme.css` `:root` palette and the `App.css:15` `!important` dark body background are reconciled so pages look like the light theme the MUI components already use. This is an intentional correction; report it.
7. **Groups**: `GET /api/groups` has no pagination or text search. Paginate and filter client-side, and report the backend gap.

## Hard constraints
- Do not touch: `src/features/progress/**` (incl. `LearningProgressContext.jsx`), `src/features/ensenanza/shared/data/curriculumData.js`, `src/features/ensenanza/shared/components/pages/LessonViewerRouteAdapter.jsx`, `.env*`, `prisma/**`, `next.config.*`.
- Do not modify the backend. Use only endpoints present in openapi.json; report gaps.
- Do not migrate non-identity features. Do not break legacy pages. New code never imports legacy code. Legacy may import new shared code through adapters (1:1 only; otherwise report as pending).
- No new runtime libraries when an existing one fits (SWR stays the server-state library; TanStack Query from the template is NOT adopted). New dev tools must be justified.
- Styles: NO `style={}`, NO `sx`, NO `styled()`, NO styled-components in new code. CSS Modules (`*.module.css`) inside a `UI/` subfolder of each feature or shared piece. Global CSS only in `pages/_app.js`. `.module.css` files use tokens only (`var(--mui-...)` or `var(--vl-...)`), never hex/rgb literals.
- MUI theme with `cssVariables: true`, so CSS Modules can use `var(--mui-palette-primary-main)` and friends.
- Preserve: the C0 HTTP logic (centralized 401 interceptor + transparent refresh, single in-flight refresh, no loops), fast vs slow timeouts (anything touching the DB / Supabase cold start uses slow), the C1 `ChunkErrorBoundary` + `retryImport`, interaction-based code splitting of Tiptap/KaTeX/Chart.js (initial bundle must not grow), and the C4 cache-first/SWR pattern.
- Do not run `npm run dev`. No `next build` while dev is running. node/npx only via PowerShell (not on Git Bash PATH).
- Technical artifacts (code, comments, identifiers) are in English. UI copy follows the existing app (Spanish, i18next available).

## Mandatory header (every new or modified file, including .module.css)
```
/*
* Funcionalidad: [Name]
* Descripción: [What it does and dependencies]
* Versión: [X.X]
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
```
Use the CSS comment form for .css and the same block comment for TS/JS. For JSON, which cannot hold comments, there is no header; report it. Generated files (OpenAPI schema) get the header prepended by the generator script.

## Target structure (template has priority, prompt rules win on conflicts)
```
pages/                         thin routes: layout + feature page component + role guard (default export only here)
src/shared/
  api-client/                  generated schema.d.ts + typed wrapper (http fast/slow), errors, refresh
  realtime/                    Socket.io provider, useSocketEvent, SSE helper
  session/                     AuthProvider, useSession, RequireAuth/RequireRole, routes.config.ts
  design-system/               theme, tokens.css, base components, UI/
  layouts/                     AppShell, Public/Student/Teacher/Admin layouts, nav.config.ts
  rich-content/                Tiptap/KaTeX/media renderers (re-export/move, no behavior change)
  waveforms/                   single chart component for simulator + real ventilator
  ai-rating/                   "was this useful?" widget
  lib/                         pure utilities
src/features/<name>/           template layout:
  api/{dtos,mappers,services}/
  application/{entities,hooks,components,pages}/
  UI/*.module.css
  index.ts                     public API (other features import only this)
```
- Legacy `src/shared/{components,contexts,hooks,services,types,utils,dev}` stays as legacy. New modules live in the NEW folders above.
- File naming: kebab-case with role suffixes, as in the template (`*.service.ts`, `*.dto.ts`, `use-*.ts`, `*.page.tsx`). Named exports, except where Next requires a default export (`pages/`).
- Path aliases: `@shared/*` -> `src/shared/*`, `@features/*` -> `src/features/*`. Existing `@/...` aliases are kept for legacy.

## New-code folders (verification scope)
`src/shared/{api-client,realtime,session,design-system,layouts,rich-content,waveforms,ai-rating,lib}`, `src/features/{auth,profile,groups}`, and the new/modified thin route files under `pages/`.

## Legacy allowlist (outside verification scope; reported, not fixed)
Everything else under `src/` and the legacy `pages/` keeps its pre-existing tsc errors (~280), `sx`, inline styles, hex colors and missing headers.

## Backend facts (from openapi.json)
- The `/api` prefix is inside the OpenAPI paths. The current `http` base URL already ends in `/api`; the new wrapper must not double it.
- Envelope: `{success, message, data, code, timestamp, traceId, pagination}`. Errors use the same shape with `success:false`, `code` (e.g. `auth.user_inactive`), and `data` as details.
- Auth error codes: `auth.invalid_credentials` 401, `auth.user_inactive` 403, `auth.password_login_not_available` 400 (Google-only account), `auth.email_domain_not_allowed` 403, `auth.google_email_not_verified` 401, `auth.invalid_google_token` 401, `auth.google_sign_in_not_configured` 503, `common.too_many_requests` 429 (`Retry-After` header), `auth.refresh_token_expired|invalid|revoked` 401, `auth.token_expired` 401, `auth.forbidden` 403.
- Groups error codes: `groups.student_already_in_group` 409, `groups.member_role_not_allowed` 422, `groups.leader_not_allowed` 422, `groups.group_full` 409, `groups.management_forbidden` 403, `groups.type_creation_forbidden` 403.
- Socket: the server emits `user:role-changed` `{userId, previousRole, newRole}` to room `user:{userId}` (see `ventylab-server/openapi/asyncapi.yaml`). The current client authenticates by emitting `authenticate` after connect.
- Client generator in the backend: `openapi-typescript openapi/openapi.json -o packages/api-client/src/schema.d.ts`.
- Demo seed (backend): `npm run demo:seed`, password `VentyLab-Demo-2026`. Teachers `ana.torres@ventylab.demo` and `luis.herrera@ventylab.demo`; students `estudiante01..10@ventylab.demo`; admin = `SUPERADMIN_EMAIL`.

## Checklist
Route legend: D = delegated writer.

- [ ] T0 Baseline: real `npm run build` + First Load JS per route (build-manifest + gzip) -> `odd/baseline-bundle.md`
- [x] T1 Tooling (D): tsconfig paths + `tsconfig.strict.json`, ESLint boundaries + style ban, Vitest, scripts `lint`/`typecheck`/`test`/`generate:api`
- [x] T2 Tokens/theme (D): `cssVariables` MUI theme, `tokens.css`, `next/font` Roboto, legacy theme re-export, global CSS reconciliation
- [x] T3 api-client (D): generated schema, fast/slow wrapper, single-flight refresh, error normalization, SWR config; legacy `http.ts` adapter; tests
- [ ] T4 session (D): AuthProvider/useSession, RequireAuth/RequireRole, routes.config, role-changed handling; tests
- [ ] T5 realtime (D): authenticated socket provider + re-auth after refresh/reconnect, useSocketEvent, SSE helper
- [ ] T6 layouts + design-system (D): AppShell, 4 layouts, nav config, base components, error boundaries, getLayout in `_app`
- [ ] T7 rich-content/waveforms/ai-rating (D)
- [ ] T8 legacy coexistence (D): adapters, pending report
- [ ] T9 auth feature (D): /login, Google GIS, error messages, logout, return-to
- [ ] T10 profile feature (D)
- [ ] T11 groups feature (D)
- [ ] T12 Final verification: 12 checks, E2E (Playwright) if the backend can run, visual review

## Progress / evidence
(updated per task with the commit hash and the observed check output)

### T1 Tooling — route D (delegated writer), done 2026-10-13 (commit: pending, parent commits)
- Files: `tsconfig.json` (+`@shared/*`, `@features/*`), `tsconfig.strict.json` (new), `eslint.config.mjs` (v3.0: boundaries + style ban), `package.json`/`package-lock.json`, `vitest.config.ts`, `vitest.setup.ts`, `scripts/generate-api.mjs`, `openapi/openapi.json` (copied), `src/shared/api-client/generated/schema.d.ts` (generated, ~1.6 MB), `src/shared/lib/class-names.ts` (+ test), `src/shared/lib/test-environment.test.tsx`.
- devDependencies: vitest 3.2.7, @testing-library/react 16.3.3, @testing-library/dom 10.4.2, @testing-library/jest-dom 6.9.1, jsdom 26.1.0, msw 2.15.0, openapi-typescript 7.13.0, eslint-plugin-boundaries 5.4.0. eslint-import-resolver-typescript 3.10.1 already present via eslint-config-next.
- Checks: `npm run generate:api` OK; `npm run typecheck` exit 0 (0 errors); `npm run lint` exit 0; violation sample (sx, style, styled(), styled.x, @emotion/styled, MUI styled, `@/` legacy import, cross-feature internal, shared->feature, shared->legacy) = 11 errors as expected, then deleted; allowed sample (`@features/<x>` index, same-feature, `@shared/*`) = 0 errors; `npm run test` 2 files / 4 tests passed; `npm run build` exit 0; legacy `tsc -p tsconfig.json` = 279 `error TS` (baseline ~280, none in new files); `eslint .` (lint:legacy) 234 errors / 566 warnings pre-existing, 0 from boundaries.
- Scope note: `src/features/auth` and `src/features/profile` already contain LEGACY files (root `*.api.ts`, `components/`, `profile/ui/profile.module.css`). New-code scope for them is only `api/`, `application/`, `UI/`, `index.ts`; `groups/` is new code as a whole. Widen when T9/T10 remove the legacy files. Windows is case-insensitive: `profile/ui` (legacy) and `profile/UI` (template) are the SAME folder — resolve in T10.
- `pages/_app.js` is linted but is not yet under the new-code boundaries/style rules (it uses `sx` and legacy providers); add rewritten thin routes to `NEW_PAGE_FILES` in `eslint.config.mjs` (T6+).
- No `src/types/css-modules.d.ts`: `next-env.d.ts` -> `next/types/global.d.ts` already declares `*.module.css`; a duplicate would conflict. `next-env.d.ts` needs `.next/types/routes.d.ts` (exists after build/dev).
- JSON files (`package.json`, `tsconfig*.json`, `openapi/openapi.json`) carry no header (JSON has no comments).

### T2 Tokens/theme — route D (delegated writer), done 2026-10-13 (commit: pending, parent commits)
- Files: new `src/shared/design-system/theme/{palette.ts,roboto.ts,theme.ts,mui-augmentation.d.ts,index.ts,theme.test.ts}`, new `src/shared/design-system/UI/tokens.css`; modified `src/theme/theme.js` (v4.0, 1:1 adapter), `pages/_app.js` (v2.1: new theme + tokens.css import), `src/App.css` (v1.1: removed `!important` dark body bg), `src/index.css` (v1.1: html/body bg/color -> `--mui-palette-*`), `src/features/simulador/ui/SimuladorPage.module.css` (v1.1: dark bg scoped to the page root with the legacy `--color-bg-primary` token).
- Theme: `createTheme({ cssVariables: true, colorSchemes: { light: { palette } } })`, same values as the old theme.js. Roboto via `next/font/google` (400/500/600/700, swap) wired into `typography.fontFamily`, so it lands in `--mui-font-*` on `:root` and in CssBaseline (body, portals). Next 16 registers the family as `Roboto` + `Roboto Fallback`, so legacy CSS that names 'Roboto' now gets the real font too.
- SSR: no `@mui/material-nextjs`/AppCacheProvider/_document; Emotion's default SSR inlines the styles, and the prerendered `.next/server/pages/profile.html` contains `--mui-palette-primary-main:#10aede` and `--mui-font-body1:400 1rem/1.5 'Roboto','Roboto Fallback',...`. No new dependency added.
- Checks: `npm run typecheck` exit 0; `npm run lint` exit 0 (+ `eslint src/theme/theme.js` exit 0); `npm run test` 3 files / 11 tests passed; `npm run build` exit 0 (no `next dev` running); legacy `tsc -p tsconfig.json` = 279 `error TS` (none in touched files); sx/style/styled grep over the new shared folders = 0; hex/rgb grep over new `*.module.css` = 0 (the literal `rg ... src/shared` also matches LEGACY `src/shared/components|hooks|utils`, out of scope).
- First Load JS gzip (baseline -> T2): `/_app` 273 -> 273.9; `/profile` 329 -> 329.3; `/auth/login` 317 -> 317.7; `/simulador` 464 -> 464.1; `/teaching/[moduleId]/[lessonId]` 467 -> 470.1. The lesson-route-only chunks contain no theme/design-system code (no `10aede`/`mui-palette`), so its +3 kB comes from outside T2 (T1 or chunking); to confirm.
- WCAG: failures reported (white on primary/secondary/error/success/warning, primary as link text); existing colors unchanged; added the NEW `--vl-color-link` (6.3:1).
- Correction round (coordinator, "do not break legacy pages"):
  - `/teaching` (whole page, not only the Dashboard tab: `DashboardHeader` also uses white/#e8f4fd text, and the progress/curriculum components live inside it) gets a root wrapper in `pages/teaching/index.js` (v1.1) with new `src/features/ensenanza/shared/dashboard/ui/TeachingPage.module.css` (dark `--color-bg-primary`, min-height 100vh) + the global `vl-legacy-dark` class. Every `src/features/dashboard/components/*` consumer is rendered only through `DashboardTab` inside `TeachingModule`, i.e. inside that root.
  - `src/index.css` v1.2: the light-text element rules (`h1-h6`, `p`, `input/textarea/select` color/bg/border, placeholders, `.form-label`, `.form-input`) moved under `:where(.vl-legacy-dark)`, which keeps the original specificity (MUI classes still win as before); unscoped elements inherit the MUI text color. Placeholders unscoped use `--mui-palette-text-secondary`. App.css `input{border:none;background:transparent}` still overrides as before.
  - Dark scopes: `/simulador` root (`pages/simulador/index.js` v2.1), `/teaching` root, `/panel/*` main area (`PanelLayout.jsx` v1.1, `className="vl-legacy-dark"`).
  - Raw usages: `<h1-6>` only in LessonViewer HTML strings (light lesson page), UnsavedChangesAlert (module class), print/export HTML in `useDataRecording`/`useAchievements` (separate documents); raw `<p>` only in edit modals/WarmupOverlay (module classes); `.form-label/.form-input/.error-page/.nav-item/.btn-*/.ventilab-card/.dashboard-container` have no usages.
  - Re-run: typecheck exit 0; lint exit 0 (+ touched legacy files exit 0); test 11/11; build exit 0 (no dev); legacy tsc 279; gzip `/teaching` 528 -> 528.4, `/_app` 273 -> 273.9.
  - Still at risk (outside allowed surfaces, not edited): `/evaluation/*` is dark-designed (`#e8f4fd` text, translucent cards in `src/features/evaluation/UI/evaluation.module.css`) with a single root `.page` in `pages/evaluation/UI/evaluation.module.css` that has no background: one-line fix (`background: var(--color-bg-primary)` + `vl-legacy-dark`) needs authorization for `pages/evaluation/**`. Portaled dialogs/menus of dark pages render outside the scope (raw h/p there would now inherit dark text). `/achievements` light text on white is pre-existing (Layout already paints `background.default`). `InteractiveQuiz`/`PersonalNotes` are dark-styled but not rendered by any page.
  - Nested legacy themes `teachingModuleTheme.js`, `ventilatorTheme.js`, `styles/mui-overrides.js` unchanged.

### T3 api-client — route D (delegated writer), done 2026-10-13 (commit: pending, parent commits)
- New files: `src/shared/lib/env.ts` (+test; backend ORIGIN, legacy precedence; server also falls back to NEXT_PUBLIC_BACKEND_URL), `src/shared/api-client/{token-storage,auth-events,api-error,timeouts,token-refresh,http-client,api-types,api-request,use-api-query,index}.ts`, `swr-config.tsx`, tests `http-client.test.ts`, `api-request.test.ts`.
- Modified: `src/shared/services/api/http.ts` (v3.1 legacy adapter), `pages/_app.js` (v2.2: `ApiSWRProvider` mounted; warm-up now `GET /health` via the typed client, the old call hit `/api/api/health`; note `/health` has no `/api` in the spec).
- Design: one axios instance, baseURL = origin (spec paths include `/api`); timeout per request = explicit category or `SLOW_ROUTES` (`/api/auth/{login,google,refresh,me}`, `/health`, `/health/ready`, `/api/users/me`) else fast. 401: `_retry` once; if the token already changed (concurrent refresh) retry without refreshing; else shared single-flight `refreshAccessToken()` on an un-intercepted instance; `/api/auth/{login,google,refresh,logout}` exempt. Session expiry (clear tokens + one `session-expired` event) only on missing refresh token or a 4xx refresh failure other than 408/429; network/timeout/5xx refresh failures reject without logout (refinement over C0, which logged out on any failure). Raw (non-envelope) bodies such as `/health` come back as `data`. Client codes: `network.unavailable`, `network.timeout`, `auth.session_expired`, `common.unknown`.
- Legacy adapter behavior changes: (a) 401 refresh delegates to the shared single-flight when `ventilab_refresh_token` exists, else the NextAuth `backend-token` bridge (own single-flight); every retried request is marked `_retry`; `auth:token-refreshed` emitted once per refresh; waiters that fail each call the idempotent `handleSessionExpired`. (b) 403 no longer logs out: it falls into the normalized-message rejection (`message` from the backend or `Error del servidor (403)`).
- SWR: default cache (legacy global `mutate` keeps working); `revalidateOnFocus:false`, `dedupingInterval:5000`, `keepPreviousData:true`, no retry on 4xx ApiError. Legacy useSWR callers (`useModuleProgress`, `progreso/useProgress`) pass fetcher + focus/dedupe/keepPrevious themselves; their errors are not ApiError, so retry is unchanged; `useFetch` has no callers.
- Bundle: `_app` imports `@shared/api-client/swr-config` directly (index would pull axios), `api-request` is lazy in the fetcher and the warm-up; `api-error` has no axios import.
- Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx eslint src/shared/services/api/http.ts pages/_app.js` exit 0; `npm run test` 6 files / 34 tests passed (api-client: 12 http-client + 7 api-request; lib/env 4); `npm run build` exit 0 (no `next dev` running); legacy `tsc -p tsconfig.json` = 279; sx/style/styled grep over api-client + lib = 0.
- First Load JS gzip KiB (T2 -> T3): `/_app` 273.9 -> 278.8 (+4.9: SWR core + swr-config + ApiError now in the app shell because the provider is mounted there; no axios/refresh code in `_app`); `/profile` 329.3 -> 335.0; `/auth/login` 317.7 -> 323.5; `/simulador` 464.1 -> 469.8; `/teaching` 528.4 -> 529.5 (already shipped SWR); lesson 470.1 -> 473.0.
- Pending: when the shared refresh fails terminally, both the new `session-expired` event and legacy `handleSessionExpired` fire for legacy requests; T4 must make the session subscriber idempotent with the legacy logout. Legacy `handleSessionExpired` removes only `ventilab_auth_token` (not `ventilab_refresh_token`) and bypasses token-storage subscribers; T4/T8.

## Next step
T3 done (pending parent commit). Next: T4 session.

### Commits / native review log
- T0 `c26eed2` docs: baseline + plan. Review: passive (docs only), no review.
- T1 `8717f6d` tooling. Assessed medium (slice_budget_reached); consent granted; START refused `lens_context_budget_exceeded` (the generated openapi.json + schema.d.ts are ~3.8 MB). Outcome: unavailable. Reviewed boundary advances to `8717f6d`.
- Pending author action: `git rm` of the 14 unreferenced files (CRA/Next boilerplate in public/, jsconfig.json, ARQUITECTURA.md, old docs/). Blocked by the auto-mode classifier; the command was given to the author.
- T2 `23e037b` tokens/theme (+ legacy dark-page scoping for /teaching, /simulador, /panel, /evaluation). Assessed medium; review granted (pre-authorized); reliability lens APPROVED and acknowledged. Boundary advances to `23e037b`.
- Contrast AA failures reported (white on primary 2.58, on success 2.78, on warning 2.16, on secondary 3.20, on error 3.68; primary as link 2.58; text.secondary on paper 4.49). Existing colors kept; new `--vl-color-link` added. Author decision pending.
- T3 api-client. /_app gzip 273.9 -> 278.8 kB (+4.9): justified (SWR core + ApiSWRProvider mounted in _app; axios/refresh kept out of _app). .gitignore now versions tests under src/shared, src/features, e2e.
