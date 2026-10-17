# Phase 1 audit: operation features (notifications, student-space, teacher-dashboard, admin)

Date: 2026-10-16. Frontend `ventilab-web`, branch `master`, HEAD `476e113` (clean, 3 commits ahead of origin). Backend `ventylab-server`, branch `main` (clean). Read-only audit: nothing was modified or built. `openapi/openapi.json` in web is byte-identical to the backend spec, and `src/shared/api-client/generated/schema.d.ts` already contains every operation listed below, so no regeneration is needed.

Paths are relative to `ventilab-web/` unless they start with `ventylab-server/`.

## 0. Premises that do NOT hold (verified)

1. **No risk thresholds.** Analytics has no at-risk flag or progress threshold. The only API threshold is the passing grade (`evaluation.passingGrade` setting, admin-only, and `passingGrade` in `GET /api/analytics/evaluations/{id}/stats`) plus `passed` per published grade. Risk highlighting can only use those; no progress threshold is invented.
2. **No superadmin flag in any DTO.** `UserDTO` / `AuthUserDTO` do not expose it (`ventylab-server/src/features/users/domain/services/is-superadmin.ts` is server-only). The UI cannot show a superadmin badge up front; it can only surface the backend 403 the same way.
3. **No audit entry detail endpoint.** `before`/`after` arrive inline in `GET /api/audit` rows; the detail view uses the row already loaded.
4. **No pending-grading count endpoint.** The existing `GradingPendingBadgeSync` reads `GET /api/evaluation-grading/queue?limit=1` → `pagination.total`.
5. **No managed vs supervised flag on groups.** `GET /api/groups` is already scoped by the backend (teacher: created or supervised; admin: all); the selector lists them without that label.
6. **Settings metadata is partial.** `PlatformSettingDTO` = `{key, category, description, value, defaultValue, origin, limits (free-form), version, updatedAt, updatedById}`. No explicit `type`, labels or units. Scalars are generated from `typeof defaultValue` + `limits.{min,max,integer}`; composites are generated from the shape of `defaultValue` with per-field limits when present; `ai.useCase.*` gets the provider-chain editor; configured providers come from `GET /api/system/status` (`components.aiProviders.providers[].configured`).
7. **Telemetry metrics are not in the status response.** They come from `GET /api/ventilator/telemetry/metrics` (admin, `ventilator:metrics`); teachers see status without them.
8. **Notification `data` is typed as `object`.** The per-type ids are documented in `ventylab-server/src/features/notifications/domain/services/notification-templates.ts:43-84` and must be read defensively.
9. **AI ratings stats are TEACHER+ (`ai-ratings:read`), AI telemetry is ADMIN.** `/admin/ai` is admin-only per the request anyway.
10. **There is no legacy dashboard page.** `/` → `/dashboard` → `/lab`; the legacy student home is the Dashboard tab of `/teaching`, built on the client from `LearningProgressContext` (forbidden pattern now: metrics come from `/api/me/summary`).
11. **No Playwright, no axe.** There is no E2E runner or accessibility tool in `package.json`; E2E items of the verification cannot be executed without adding dependencies and running backend + frontend.
12. **Build cannot run on this machine right now** (≈0.9 GB free RAM of 5.9 GB). Bundle numbers below are the recorded baseline.

## a) Legacy screens in this category

| Screen | Files | Endpoints (legacy HTTP) |
|---|---|---|
| `/`, `/dashboard` | `pages/index.js:12`, `pages/dashboard/index.js:20` | redirects only (`/dashboard`, then `/lab`) |
| Student home (Dashboard tab of `/teaching`) | `src/features/ensenanza/shared/components/pages/TeachingModule.jsx:612-812,1021-1105`, `src/features/dashboard/DashboardTab.tsx` + `components/*` | client-built from `LearningProgressContext`, `progressService`, `curriculumData`; notifications hardcoded (:157-175) |
| Dead dashboards | `src/features/dashboard/{Student,Teacher,Admin}Dashboard.jsx`, `hooks/useDashboardData.js` | `/users/{id}/progress`, `/lessons/recommended`, `/users/{id}/stats`, `/teachers/{id}/stats`, `/admin/stats`, `/users` (not in the spec) |
| `/achievements` | `pages/achievements/index.jsx` | `src/features/progress` |
| `/panel` | `pages/panel/index.jsx` → `PanelDashboard.jsx:50-51` | `GET /admin/statistics`, `GET /admin/students` (`httpClient`) |
| `/panel/students` | `PanelStudents.jsx:232-233`, `ui/GroupBuilderModal.jsx:36,51` | `/admin/students`, `/admin/statistics`, `POST /groups`, `POST /groups/{id}/members` |
| `/panel/students/[id]` | `PanelStudentDetail.jsx:139,241-244` | `/scores/students/{id}`, `POST/DELETE /scores`; **bug**: calls missing `adminService.getStudentProgress` |
| `/panel/admin` | `PanelAdmin.jsx:60,110,238,361-366` | `PATCH /admin/users/{id}/role` (deprecated alias), `/admin/students`; **bug**: missing `adminService.getTeachers` |
| `/panel/settings` | `PanelSettings.jsx:69-106` | none (static, disabled switches) |
| `/admin/search-analytics` | `pages/admin/search-analytics/index.jsx:81,169` | raw `fetch` `/admin/search-analytics` (not in the spec) |
| Notifications | `src/shared/contexts/NotificationContext.jsx` (snackbar for logout only, `Sidebar.jsx:66,93-106`) | none; nothing calls `/api/notifications*` |
| Audit, AI analytics, system status, research export | — | no legacy UI exists |

## b) API endpoints (all present in `schema.d.ts`)

Envelope `{success, data, message, code, pagination|null, timestamp, traceId}`.

- **Notifications** (any authenticated): `GET /api/notifications?page&limit&unreadOnly`, `GET /api/notifications/unread-count` → `{count}`, `PATCH /api/notifications/read-all` → `{updated}`, `PATCH /api/notifications/{id}/read`, `DELETE /api/notifications/{id}`. Realtime `notification:new` = `NotificationDTO {id, type, title, body, data, readAt, createdAt}` (already typed in `src/shared/realtime/realtime.entity.ts:115-132`). Types and `data`: RESERVATION_PREEMPTED `{reservationId, replacedByReservationId}`, RESERVATION_CANCELLED `{reservationId}`, EVALUATION_ACTIVATED `{evaluationId, assignmentId}`, GRADE_PUBLISHED `{evaluationId, attemptId}`, FEEDBACK_READY `{evaluationId, attemptId, feedbackId}`, ROLE_CHANGED `{previousRole, newRole}`, VENTILATOR_OFFLINE `{reservationId, reason}`.
- **Student**: `GET /api/me/summary` (`progress`, `grades[]`, `activeEvaluations[]`, `upcomingEvaluations[]`, `latestNotes[]`, `latestConversations[]`, `latestSimulationSessions[]`, `upcomingReservations[]`, `unreadNotifications`); `GET /api/notes` (+ `/lessons/{id}`, `/modules/{id}`, `/{noteId}`, `POST /api/notes/analyze`); `GET /api/my-evaluations/grades`.
- **Analytics** (TEACHER `analytics:read`, scoped to managed groups, 60 s cache): `GET /api/analytics/groups/{groupId}/dashboard`, `GET .../export.csv`, `GET /api/analytics/students/{userId}/timeline?from&to` (≤366 days), `GET /api/analytics/evaluations/{id}/stats` (histogram, `passRate`, `passingGrade`); research `GET /api/analytics/research/export.csv?groupId` (ADMIN `analytics:research-export`, 503 without the anonymization key). Student detail combines dashboard row + timeline + `GET /api/users/students/{id}` + `GET /api/progress/users/{userId}/summary`.
- **Users**: `GET /api/users?page&limit&search&role&groupId&isActive&sortBy&sortOrder`, `PATCH /api/users/{id}/role` `{role}` (removes non-fitting groups, revokes refresh tokens, notifies; superadmin → 403), `PATCH /api/users/{id}/status` `{isActive}` (superadmin → 403).
- **Settings** (ADMIN `settings:manage`): `GET /api/platform-settings?category`, `PATCH /api/platform-settings/{key}` `{value, version}` (409 `platform-settings.version_conflict` with `{key, currentVersion}`; 422 invalid/out of limits/`ai_provider_not_configured`), `POST /api/platform-settings/{key}/reset` `{version}`.
- **Audit** (ADMIN `audit:read`): `GET /api/audit?actorId&action&targetType&targetId&from&to&page&limit&sortOrder`, `GET /api/audit/targets/{type}/{id}`, `GET /api/audit/export` (`X-Export-Truncated`).
- **AI telemetry** (ADMIN): `GET /api/admin/ai-telemetry/stats?from&to&useCase&provider&model` → `{totals, days[]}` with calls, error/fallback rates, tokens, `costUsd`, latency and TTFT p50/p95; `GET .../export.csv`.
- **AI ratings** (TEACHER+): `GET /api/admin/ai-ratings/stats?from&to&targetType&useCase&provider&model&promptVersion` → `groups[] {useCase, provider, model, promptVersion, ratings, helpfulCount, helpfulRate, dimensions{quality, understanding, trust, expression, safety: {mean?, n}}}`; `GET .../export.csv`.
- **System status**: `GET /api/system/status` (TEACHER `system:status`) → `{state OK|DEGRADED|DOWN, checkedAt, components{database, mqttBroker, ventilator, aiProviders, storage, process{appVersion, appCommit, engineVersion, ...}}}`; `POST /api/system/probe/ai/{provider}` (ADMIN, 3/60 s); realtime `system:status-changed`; telemetry metrics `GET /api/ventilator/telemetry/metrics` (ADMIN).
- **Groups / grading**: `GET /api/groups`, `GET /api/evaluation-grading/queue`.

**Missing in the API (reported, not invented):** risk thresholds / at-risk flag; superadmin flag in user DTOs; audit entry detail endpoint; managed vs supervised flag on groups; pending-grading count endpoint; per-type schema of notification `data`; settings `type`/labels/units/per-field schema; configured-provider list inside settings.

## c) Provisional notice toasts to move into notifications

- `src/features/ventilator-lab/application/hooks/use-preemption-notice.ts:42` — `toast.info` on `reservation:preempted` (:51) and on `notification:new` RESERVATION_PREEMPTED (:55-58). The data invalidation stays (`use-reservations-realtime.ts:27-28` and the `invalidateApiQueries` call at :55-58); only the toast is removed. The lab-live "control revoked" modal (`lab-live.page.tsx:345-355`) stays.
- No other migrated feature toasts a server notice: `use-evaluations-realtime.ts:27-28`, `attempt-result.page.tsx:159-160` and the `user:role-changed` handler (`src/shared/session/auth-provider.tsx:231`) only invalidate.

## d) Settings metadata and form generation

Sample: `{"key":"evaluation.passingGrade","category":"evaluation","description":"Minimum grade (0-5 scale) that passes an evaluation","value":3,"defaultValue":3,"origin":"DEFAULT","limits":{"min":0,"max":5,"integer":false},"version":0,"updatedAt":null,"updatedById":null}`.

`limits` by kind: numbers `{min,max,integer}`; booleans `{}`; `simulation.allowedTimeMultipliers` `{allowedValues, required}`; `ai.useCase.*` `{providerChain{minLength,maxLength,requiresCredentials}, timeoutMs{...}, maxOutputTokens{...}, temperature{...}}`; `ai.quotas`, `ai.prices`, `simulation.rubric.defaultThresholds` per-field limits.

Verdict: forms CAN be generated for scalars and for objects whose fields mirror `defaultValue` (field kind from the default value, bounds from the matching `limits` entry, origin badge, reset button). `ai.useCase.*` uses a dedicated chain editor (ordered list, add only configured providers). Any shape the generator cannot map falls back to a validated JSON field; the server 422 field paths are shown on the field.

## e) Parity checklist (legacy → new)

- [ ] Student home KPIs and continue-learning → `/me` progress bars and latest blocks (from `/api/me/summary`; client-computed XP/streak are NOT carried over: forbidden by the "no client metrics" rule).
- [ ] Notifications widget (static) → bell + `/notifications`.
- [ ] Teacher panel stat cards and recent students → `/teacher` cards and table.
- [ ] Students directory with search, sort and "my groups" → `/teacher` table (sortable, filterable) + group selector.
- [ ] Build a group from selected students → already in `/groups` (identity migration).
- [ ] Student detail (modules, evaluations, scores, simulator) → `/teacher/students/[userId]` (progress tree, grades, sessions, timeline). Manual legacy scores (`/scores`) have no new counterpart: reported for the author's decision.
- [ ] Admin teacher list + role change → `/admin/users` (role filter TEACHER).
- [ ] Settings placeholders → `/admin/settings` (real settings).
- [ ] Search analytics (`/admin/search-analytics`) → no API in the spec; stays legacy, listed for the closure.
- [ ] Global search `/search`, `/achievements`, `/flashcards` → no migrated counterpart; outside this category, listed for the closure.
- [ ] Logout snackbar (legacy `NotificationProvider`) → design-system toast; provider removal only at the closure.

## f) Remaining legacy code (preliminary)

Based on `odd/legacy-coexistence.md` and `odd/final-verification.md:146-176`.

- Pages: `pages/index.js`, `pages/dashboard`, `pages/simulador` (redirects); `pages/teaching/index.js`, `pages/flashcards`, `pages/achievements`, `pages/search`, `pages/admin/search-analytics`, `pages/panel/{index,admin,settings,students/index,students/[id]}`, `pages/auth/{register,forgot-password,access-denied,error}`; `pages/api/auth/*`, `pages/api/curriculum/*` (must stay).
- Feature folders: `ensenanza` (284 files, partly replaced), `simulador` (79, replaced; still imported by `_app.js:50` for `PatientDataProvider`), `evaluation` (36, replaced), `progress` (52, no replacement), `dashboard` (20, half dead), `admin` (24, groups replaced; this migration replaces the rest), `ai-feedback` (13, partly replaced), `teaching` (1, no importer), legacy part of `auth` (`withAuth.jsx`, `ProtectedRoute.jsx` used; `auth.api.ts`, `auth.types.ts` dead).
- Contexts: `AuthContext.jsx`, `NotificationContext.jsx`, `SocketContext.tsx` (bridged), `SidebarContext.js`, `WarmupContext.tsx`, `LearningProgressContext.jsx`, `AchievementContext.jsx`, `PatientDataContext`.
- Services/hooks: `authService.js`, `sessionExpired.ts`, `authEvents.ts`, `useAuth.js`, `useSocket.ts`, `useFetch.ts`, `useSearch.js`, `useRole.ts`, admin services ×5, ensenanza services ×2, evaluation/api ×4.
- HTTP instances: `src/shared/services/api/http.ts:53,60` (`http`, `httpSlow`), `src/shared/services/httpClient.ts`, `src/features/progress/services/http.ts`, raw `fetch` in `useSearch.js:115,674` and `pages/admin/search-analytics:169`.
- Shared legacy UI: `src/shared/components` (16: Navbar, Sidebar, Layout, RoleGuard, Search*, ErrorBoundary, WarmupOverlay), `src/shared/utils` (12), `src/lib` (6).

## g) Bundle baseline (First Load JS, gzip, `odd/baseline-bundle.md`, master 62c9d68, 2026-10-13)

`/` 274 kB · `/_app` 273 · `/dashboard` 274 · `/panel` 305 · `/panel/admin` 327 · `/panel/settings` 281 · `/panel/students` 337 · `/panel/students/[id]` 329 · `/profile` 329 · `/admin/search-analytics` 352 · `/simulador` 464 · `/teaching/[moduleId]/[lessonId]` 467. The `.next` build on disk (2026-10-16 06:19) predates `/lab*` and is stale.

New routes are compared against the legacy route they replace: `/me` ↔ `/dashboard` (274), `/teacher` ↔ `/panel/students` (337), `/teacher/students/[userId]` ↔ `/panel/students/[id]` (329), `/admin/users` ↔ `/panel/admin` (327), `/admin/settings` ↔ `/panel/settings` (281), other `/admin/*` ↔ `/admin/search-analytics` (352).

## h) Plan file by file (risk)

| Step | Files | Risk |
|---|---|---|
| O0 registration | `eslint.config.mjs`, `package.json` (`lint` script), `tsconfig.strict.json`, `vitest.config.ts`, `src/shared/session/routes.config.ts` | Low; same registrations every previous feature made |
| O1 notifications | `src/features/notifications/**`, `pages/notifications/index.tsx`, `src/shared/layouts/nav-badges.tsx` (new `notificationsUnread` key), `pages/_app.js` (bell in `TopBarActionsProvider`, toast listener + badge sync) | Medium: `_app.js` composition root |
| O1 toasts | `src/features/ventilator-lab/application/hooks/use-preemption-notice.ts` (remove toast, keep invalidation) | Low |
| O1 focus mode | `src/shared/design-system/components/use-focus-mode.ts` (+ toast provider suppression), one `useFocusMode()` call in the evaluations attempt player page, the simulator console page when mode is EXAM, and `lab-live.page.tsx` | Low |
| O2 student-space | `src/features/student-space/**`, `pages/me/{index,notes,grades}.tsx`, `src/features/learning/index.ts` (export the notes components) | Medium: learning index export only |
| O3 teacher-dashboard | `src/features/teacher-dashboard/**`, `pages/teacher/index.tsx`, `pages/teacher/students/[userId].tsx` | Medium (charts lazy) |
| O4 admin | `src/features/admin-console/**` (the legacy `src/features/admin` folder name is taken), `pages/admin/{users,settings,audit,ai,research,status}.tsx` | High: settings generator and commands confirmation |
| O5 navigation + home | `src/shared/layouts/nav.config.ts`, `routes.config.ts` (`DEFAULT_ROUTE_BY_ROLE`), `pages/index.js` (role-aware) | Medium |
| O6 redirects | `pages/dashboard/index.js` → `/me`, `pages/panel/*` → `/teacher`, `/teacher/students/[id]`, `/admin/users`, `/admin/settings` | Low |
| O7 parity + verification | `odd/operation-parity.md`, `odd/operation-closure-inventory.md` | None |
| CLOSURE | deletion of legacy code | Only after the author's explicit approval |
