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
- [ ] T2 Tokens/theme (D): `cssVariables` MUI theme, `tokens.css`, `next/font` Roboto, legacy theme re-export, global CSS reconciliation
- [ ] T3 api-client (D): generated schema, fast/slow wrapper, single-flight refresh, error normalization, SWR config; legacy `http.ts` adapter; tests
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

## Next step
T1 done (pending parent commit). Next: T2 Tokens/theme.
