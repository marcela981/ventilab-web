<!--
* Funcionalidad: Operation migration verification report
* Descripción: Verification report of the operation migration (notifications, student-space, teacher-dashboard, admin-console, navigation, role homes and legacy redirects) for the thesis: status, evidence and exact command of the 11 requested checks (typecheck, lint with boundaries, build + First Load JS + lazy charts, style/hex/header greps over src/ split into new and legacy paths, unit tests, E2E scenarios, full E2E suite, axe, post-closure items), the step-by-step procedure for the checks that need the author's machine (build, bundle per route, E2E, axe, screenshots) and the backend gaps to report.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Operation migration — verification report

Date: 2026-10-17. Repository `ventilab-web`, branch `master`, HEAD `d3231c9` (O5+O6) plus the uncommitted fix pass of
the concurrent writer. Feature tracker: `odd/tasks/operation.md`. Parity: `odd/operation-parity.md`. Closure input:
`odd/operation-closure-inventory.md`.

**New code** = the paths of the `package.json` `lint` script (plus `src/features/auth/UI`); **legacy** = every other
file under `src/`. Commands run from the repository root in PowerShell.

## Summary

| # | Check | Status | Evidence / reason |
| --- | --- | --- | --- |
| 1 | Typecheck | done per block; **re-run pending** after O5/O6 and the fix pass | `npm run typecheck` exit 0 after O0+O1, O2, O3, O4a, O4b (parent re-runs, `odd/tasks/operation.md`) |
| 2 | Lint with boundaries | done per block; **re-run pending** | `npm run lint` exit 0 on every touched folder per block |
| 3 | Build + First Load JS ≤ baseline + charts in lazy chunks | **pending for the author** | ≈0.9–1 GB free RAM; `next build` not allowed here |
| 4 | `sx=` / `style={` / `styled(` over `src/` | **done** (measured now) | new 0; legacy 3,374 lines in 224 files |
| 5 | hex / `rgb(a)` in `*.module.css` over `src/` | **done** (measured now) | new 0; legacy 429 lines in 20 files |
| 6 | Files without `Autor: Marcela Mazo Castro` in `src/` | **done** (measured now) | new 0 of 1,160; legacy 441 of 508 |
| 7 | Unit tests | done (recorded runs); full re-run pending | 3 required suites exist (below) |
| 8 | E2E scenarios | **pending for the author** | no Playwright in the repo, no backend running |
| 9 | Full E2E suite | **blocked** (needs approval to add a runner) | no runner installed |
| 10 | Accessibility (axe) | **blocked** (needs approval to add axe) | not installed |
| 11 | Post-closure items | **pending** (closure not approved) | `odd/operation-closure-inventory.md` |

## 1. Typecheck

```powershell
npm run typecheck          # = npx tsc -p tsconfig.strict.json --noEmit (strict project, new code)
```

Recorded: exit 0, 0 errors after every block (O0+O1 `6ff6875`, O2 `0695e6f`, O3 `fda5105`, O4a `4622078`, O4b
`f4655ba`; parent re-run each time). Legacy keeps its own baseline (`npx tsc -p tsconfig.json --noEmit`, ≈278
`error TS`, not a green baseline). Pending: one run on the final tree (after the current fix pass and O5/O6).

## 2. Lint with boundaries

```powershell
npm run lint               # new-code paths only; eslint-plugin-boundaries + style bans (eslint.config.mjs)
npm run lint:legacy        # informative only: legacy baseline ≈234 errors
```

Recorded: exit 0 on every block. The boundaries rules forbid new code importing legacy paths; the static graph of
`odd/operation-closure-inventory.md` b confirms 0 such imports outside the composition root `pages/_app.js`.

## 3. Build, First Load JS and lazy charts — pending for the author

Why not here: ≈0.9–1 GB free RAM of 5.9 GB (a build exhausts it), the project rule forbids `next build` without the
author's request, and the `.next` on disk predates `/lab*` and the operation routes (stale).

Procedure (stop `next dev` first; never build with the dev server running):

1. `npm run build` → must end with exit 0 and list the new routes.
2. Measure First Load JS with the method of `odd/baseline-bundle.md` (`build-manifest.json` → `polyfillFiles` +
   `pages['/_app']` + `pages[route]`, unique `*.js`, gzip with .NET `GZipStream` Optimal, KiB):

```powershell
$m = Get-Content .next/build-manifest.json -Raw | ConvertFrom-Json
function Get-FirstLoad($route) {
  $files = @($m.polyfillFiles) + @($m.pages.'/_app') + @($m.pages.$route) | Where-Object { $_ -like '*.js' } | Select-Object -Unique
  $raw = 0; $gz = 0
  foreach ($f in $files) {
    $bytes = [IO.File]::ReadAllBytes((Join-Path .next $f)); $raw += $bytes.Length
    $ms = New-Object IO.MemoryStream
    $z = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionLevel]::Optimal)
    $z.Write($bytes, 0, $bytes.Length); $z.Close(); $gz += $ms.ToArray().Length
  }
  [pscustomobject]@{ Route = $route; RawKiB = [math]::Round($raw / 1024, 1); GzipKiB = [math]::Round($gz / 1024, 1) }
}
'/_app','/me','/me/notes','/me/grades','/notifications','/teacher','/teacher/students/[userId]',
'/admin/users','/admin/settings','/admin/audit','/admin/ai','/admin/research','/admin/status' |
  ForEach-Object { Get-FirstLoad $_ } | Format-Table
```

3. Charts in lazy chunks: Chart.js must not be in the initial chunks of `/teacher` and `/admin/ai` (charts load through
   `teacher-dashboard/application/components/lazy-dashboard-charts.tsx` and
   `admin-console/application/components/lazy-ai-charts.tsx`, `retryImport(() => import(...))`). Marker: a Chart.js
   error string that survives minification.

```powershell
$marker = 'Canvas is already in use'
foreach ($r in '/teacher', '/teacher/students/[userId]', '/admin/ai') {
  $files = @($m.polyfillFiles) + @($m.pages.'/_app') + @($m.pages.$r) | Where-Object { $_ -like '*.js' } | Select-Object -Unique
  $hits = @($files | Where-Object { Select-String -LiteralPath (Join-Path .next $_) -SimpleMatch $marker -Quiet })
  "$r initial chunks containing Chart.js: $($hits.Count)"   # expected 0
}
Get-ChildItem .next/static/chunks -Recurse -Filter *.js | Select-String -SimpleMatch $marker -List | ForEach-Object { $_.Path }   # the lazy chunk(s)
```

Per-route comparison (baseline: `odd/baseline-bundle.md`, master `62c9d68`; pairs from `odd/operation-audit.md` g).
Pass = measured ≤ legacy baseline, or a growth explained by the `/_app` delta.

| New route | Legacy route replaced | Baseline gzip KiB | Measured gzip KiB | Δ | Pass |
| --- | --- | --- | --- | --- | --- |
| `/_app` | `/_app` | 273 | | | |
| `/me` | `/dashboard` | 274 | | | |
| `/me/notes` | — (reference `/_app`) | 273 | | | |
| `/me/grades` | — (reference `/_app`) | 273 | | | |
| `/notifications` | — (reference `/_app`) | 273 | | | |
| `/teacher` | `/panel/students` | 337 | | | |
| `/teacher/students/[userId]` | `/panel/students/[id]` | 329 | | | |
| `/admin/users` | `/panel/admin` | 327 | | | |
| `/admin/settings` | `/panel/settings` | 281 | | | |
| `/admin/audit` | `/admin/search-analytics` | 352 | | | |
| `/admin/ai` | `/admin/search-analytics` | 352 | | | |
| `/admin/research` | `/admin/search-analytics` | 352 | | | |
| `/admin/status` | `/admin/search-analytics` | 352 | | | |

| Lazy chart check | Initial chunks with Chart.js (expected 0) | Lazy chunk found |
| --- | --- | --- |
| `/teacher` | | |
| `/teacher/students/[userId]` | | |
| `/admin/ai` | | |

## 4–6. Greps over the whole `src/` (measured 2026-10-17)

`rg` is not installed in this PowerShell; the equivalent `Select-String` commands were run (the `rg` form is given
for Git Bash). Split: new paths vs legacy paths (inventory of the legacy paths: `odd/operation-closure-inventory.md` a).

| # | Command | New code | Legacy | Whole `src/` |
| --- | --- | --- | --- | --- |
| 4 | `rg -n "sx=\|style=\{\|styled\(" src -g "*.{js,jsx,ts,tsx}"` | **0** | 3,374 lines / 224 files (`sx=` ≈3,211, `style={` 73, `styled(` 89 lines) | 3,374 / 224 |
| 5 | `rg -n "#[0-9a-fA-F]{3,8}\b\|rgba?\(" src -g "*.module.css"` | **0** | 429 lines / 20 files | 429 / 20 |
| 6 | `rg --files-without-match "Autor: Marcela Mazo Castro" src -g "*.{ts,tsx,js,jsx,css}"` | **0 of 1,160** | 441 of 508 | 441 of 1,668 |

PowerShell equivalents used:

```powershell
Get-ChildItem src -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx | Select-String -Pattern 'sx=|style=\{|styled\(' | Measure-Object
Get-ChildItem src -Recurse -File -Filter *.module.css | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|rgba?\(' | Measure-Object
Get-ChildItem src -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.css | Where-Object { -not (Select-String -LiteralPath $_.FullName -SimpleMatch 'Autor: Marcela Mazo Castro' -Quiet) } | Measure-Object
```

Every non-zero hit is in a legacy path. Item 5 by file: 15 `ensenanza` CSS Modules (edit tools, lessons, teaching page),
`features/evaluation/UI/evaluation.module.css` (106 lines), 2 `simulador` modules, `shared/components/UI/WarmupOverlay.module.css`,
`styles/curriculum.module.css`. (`pages/_app.js`, outside `src/`, still has the legacy shell `sx` for pages without
`getLayout`.)

## 7. Unit tests

```powershell
npx vitest run src/features/notifications src/features/student-space src/features/teacher-dashboard src/features/admin-console src/shared/design-system src/shared/session src/shared/layouts
```

Required suites (paths verified):

| Behaviour | Suite |
| --- | --- |
| Notifications deep-link table (every API type, id encoding, null/unknown data) | `src/features/notifications/application/config/notification-links.test.ts` |
| Focus mode suppression of notice toasts (user-action toasts kept, visible notices closed, release) | `src/shared/design-system/components/use-focus-mode.test.tsx` |
| Settings form generation (number/boolean/string/array/object fields, `ai.useCase` chain, JSON fallback, validation, 422 mapping) | `src/features/admin-console/application/entities/setting-form.entity.test.ts` |

Other operation suites: notifications 4 files, student-space 6, teacher-dashboard 4, admin-console 15, plus
`src/shared/session/{legacy-redirects,role-home-redirect}.test.*` and `src/shared/layouts/nav.config.test.ts`.
Recorded runs: notifications 43/43, student-space 41/41, teacher-dashboard 37/37, admin-console 73/73, design-system
40/40. A full `npm test` was killed once for low memory (`odd/tasks/operation.md`); run it on the author's machine.

## 8. E2E scenarios — pending for the author

No E2E runner in the repo and no backend running here. Manual (or Playwright, once approved) scenarios with backend
(`ventylab-server`) and `npm run dev`, seeded STUDENT, TEACHER and ADMIN accounts:

1. Role homes: log in as each role → STUDENT lands on `/me`, TEACHER and ADMIN on `/teacher`; `/` and `/dashboard` do the same.
2. Legacy redirects: `/panel` and `/panel/students` → `/teacher`; `/panel/students/<id>` → `/teacher/students/<id>`; `/panel/admin` → `/admin/users`; `/panel/settings` → `/admin/settings`.
3. Notifications: trigger a notification (publish a grade) → toast, bell badge +1, `/notifications` lists it; open it → marked read, lands on the deep link; "Marcar todas como leídas"; delete with confirmation.
4. Focus mode: during an exam attempt (or `/lab/live`) a new notification shows no toast; after leaving, the toast appears.
5. Student space: `/me` blocks load from one `GET /api/me/summary`; `/me/notes` filter, edit, delete, module AI analysis; `/me/grades` table.
6. Teacher dashboard: switch group (only the selected group's data), sort and filter the table, risk highlight, charts load lazily, CSV export opens in Excel with accents; student detail tree, grades, timeline paging.
7. Admin users: filter by role TEACHER, change a role (effects warning), deactivate/activate, superadmin 403 message, own account protected.
8. Admin settings: edit a number (limits), a 409 version conflict from two tabs, reset to default, provider chain (only configured providers), ventilator commands double confirmation.
9. Admin audit / AI / research / status: filters in the URL, entry diff, CSV exports, status live update, provider probe (429 handling), teacher sees `/admin/status` read-only and is denied `/admin/users`.
10. Guards: anonymous access to every new route goes to login; a student opening `/teacher` or `/admin/*` is redirected to `/me`.

## 9. Full E2E suite — blocked

Needs the author's approval to add `@playwright/test` (devDependency, `package.json` is protected) and the browsers
download, plus running backend + frontend. Procedure after approval: `npm i -D @playwright/test`, `npx playwright install chromium`,
write the scenarios of item 8 under `e2e/`, run `npx playwright test`.

## 10. Accessibility (axe) — blocked

Needs approval to add `@axe-core/playwright` (with item 9). Procedure: in each scenario page, `new AxeBuilder({ page }).analyze()`
and assert no `serious`/`critical` violations; record the known palette contrast failures (`odd/final-verification.md`,
pending list) separately.

### Screenshots gallery (`docs/screenshots/`) — pending

Needs the running app (backend + `npm run dev`) and a browser. Capture per role, at 1440 px and 390 px: `/me`,
`/me/notes`, `/me/grades`, `/notifications` (+ bell menu), `/teacher`, `/teacher/students/<id>`, `/admin/users`,
`/admin/settings` (AI tab with the chain editor), `/admin/audit` (entry dialog), `/admin/ai`, `/admin/research`,
`/admin/status`. Name `docs/screenshots/<route-slug>-<role>-<width>.png`.

## 11. Post-closure items — pending (closure not approved)

After each approved closure step (`odd/operation-closure-inventory.md` e): `npm run typecheck`, `npm run lint`,
`npx vitest run`, `git grep -n "<deleted path>"` (empty), `npx tsc -p tsconfig.json --noEmit` count ≤ baseline,
`npm run lint:legacy` count ≤ baseline; at the end `npm run build`, the bundle table of item 3 again, the redirect
scenarios (item 8.1–8.2), and items 4–6 again (legacy counts must drop, new code stays 0).

## Report to backend

Collected in `odd/tasks/operation.md`:

- Analytics: no risk thresholds or at-risk flag; no `passingGrade` on dashboard rows; evaluation stats not filterable by group; no group-level module progress aggregate; dashboard grades without `attemptId`; progress summary without lesson level.
- Users: no superadmin flag in `UserDTO`/`AuthUserDTO` (only 403 codes `users.superadmin_*_immutable`); no student code in `UserDTO`.
- Audit: no entry detail endpoint; no catalog of actions/target types; export row limit not exposed.
- Groups: no managed vs supervised flag; reservations calendar without `groupId` filter; grading queue without student filter; no pending-grading count endpoint (`limit=1` workaround).
- Staff reads: no endpoint for a student's grades without a group; no staff endpoint listing a student's simulation sessions; not verified whether a teacher may open a student's session replay.
- Notifications: `data` typed as plain `object` (no per-type schema).
- Student summary: grades without `attemptId`; notes without `moduleId`/lesson title; sections without title; simulation sessions without case title; notes list without text search or section filter; `NoteDTO` without module/lesson title; my grades without module.
- Settings: metadata without `type`, labels, units or per-field schema; descriptions in English; configured providers only in system status; `UpdatePlatformSettingDTO.value` excludes string; 422 carries one `reason` string; dynamic-key maps (`ai.prices`, `ai.quotas`, `models`) cannot get new keys from a generic form.
- AI analytics: no provider/model catalog for filters; telemetry days in UTC only.
- Research: no data dictionary for the CSV.
- System status: `system:status-changed` missing from asyncapi/openapi; telemetry metrics ADMIN-only (teachers see none); probe 429 `Retry-After` not verified live.
- Legacy: manual scores (`/scores`) have no endpoint in the spec (author decision: drop or request).
