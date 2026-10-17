<!--
* Funcionalidad: Operation parity checklist
* Descripción: O7 of the operation migration: every item of the parity checklist of odd/operation-audit.md section e (legacy student home, notifications widget, teacher panel, students directory, group builder, student detail, admin role change, settings, search analytics, global search, achievements, flashcards, logout snackbar) marked done / partial / not applicable with the new route and component as evidence, the legacy routes and their redirects, the legacy capabilities with no counterpart and why, and the new capabilities with no legacy screen.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Operation parity checklist (legacy panel / dashboard → operation features)

Date: 2026-10-17. Base: `master` at `d3231c9` (O5+O6) plus the working tree of the concurrent fix writer. Legacy
inventory: `odd/operation-audit.md` (a: legacy screens, e: checklist). Decisions: `odd/tasks/operation.md`.

Legend: **done** (the new route covers the legacy capability), **partial** (covered with a documented difference),
**not applicable** (no API or outside this category; stays legacy and is listed for the closure). Paths are relative to
`ventilab-web/`; feature paths are under `src/features/<feature>/application/` unless stated. Evidence is the code read
on 2026-10-17 and the Vitest suites named; nothing below was checked in a browser (see `docs/operation/VERIFICATION.md`).

## Legacy routes

| Legacy route | Status | Now (evidence) |
| --- | --- | --- |
| `/` (`pages/index.js`) | **done** (O5) | Client `RoleHomeRedirect` (`src/shared/session/role-home-redirect.tsx`): STUDENT → `/me`, TEACHER/ADMIN → `/teacher`, anonymous → login. Tests: `src/shared/session/role-home-redirect.test.tsx`. |
| `/dashboard` (`pages/dashboard/index.js`) | **done** (O6) | Same `RoleHomeRedirect`, bare layout (no legacy shell). |
| `/panel` | **done** (O6) | Server redirect (307) → `/teacher` (`legacyPanelRedirect`, `src/shared/session/legacy-redirects.ts`). Test: `src/shared/session/legacy-redirects.test.ts`. |
| `/panel/students` | **done** (O6) | → `/teacher`. |
| `/panel/students/[id]` | **done** (O6) | → `/teacher/students/[id]` (`legacyStudentDetailRedirect`; missing id → `/teacher`). |
| `/panel/admin` | **done** (O6) | → `/admin/users`. |
| `/panel/settings` | **done** (O6) | → `/admin/settings`. |
| `/admin/search-analytics` | not applicable | No API in the spec; legacy page kept (see "No counterpart"). |
| `/achievements`, `/flashcards`, `/search` | not applicable | Outside this category; legacy pages kept. |

All redirects are temporary (`permanent: false`) while the legacy code exists.

## Checklist (audit section e)

| # | Legacy capability | Status | New route / component — evidence |
| --- | --- | --- | --- |
| 1 | Student home KPIs and "continue learning" (Dashboard tab of `/teaching`, `src/features/dashboard/DashboardTab.tsx`, client-built from `LearningProgressContext`) | **done** | `/me` → `pages/me/index.tsx` → `student-space/.../pages/student-home.page.tsx` + `components/summary-blocks.tsx`, `summary-card.tsx`; one request `GET /api/me/summary` (`hooks/use-student-summary.ts`). Progress, evaluations, grades, notes, conversations, sessions, reservations, unread counter. Tests: `student-home.page.test.tsx`, `student-space.mapper.test.ts`. Client-computed XP/streak are intentionally **not** carried over (no client metrics rule). The legacy tab still renders inside `/teaching` until the closure. |
| 2 | Notifications widget (static, hardcoded in `TeachingModule.jsx:766`) | **done** | Bell in the AppShell top bar (`notifications/.../components/notification-bell.tsx`, `notification-bell-menu.tsx`, mounted in `pages/_app.js`), `/notifications` (`pages/notifications/index.tsx` → `pages/notifications.page.tsx`), nav badge `notificationsUnread` (`notifications-badge-sync.tsx`), realtime notice toasts (`notification-toasts.tsx`), deep links (`config/notification-links.ts`). Tests: `notification-bell.test.tsx`, `notifications.page.test.tsx`, `notification-links.test.ts`, `notifications.mapper.test.ts`. |
| 3 | Teacher panel stat cards and recent students (`PanelDashboard.jsx`) | **done** | `/teacher` → `pages/teacher/index.tsx` → `teacher-dashboard/.../pages/teacher-dashboard.page.tsx`; cards `components/dashboard-cards.tsx` (attempts to grade, active evaluations, upcoming reservations), table `components/students-table.tsx`. Tests: `teacher-dashboard.page.test.tsx`. |
| 4 | Students directory with search, sort and "my groups" (`PanelStudents.jsx`) | **done** | `/teacher` students table: sortable columns (TableSortLabel), text filter on name/email, API-based risk highlight, expandable progress; `components/group-selector.tsx` (`?groupId=` in the URL). Difference: the table is per group (analytics are group-scoped); a directory of every user is `/admin/users` (ADMIN). |
| 5 | Build a group from selected students (`GroupBuilderModal.jsx`) | **done** (earlier) | `/groups` and `/groups/[groupId]` (`src/features/groups`, identity migration T11). Difference: members are added from the group page search, not by multi-selecting rows of a directory. |
| 6 | Student detail: modules, evaluations, scores, simulator (`PanelStudentDetail.jsx`) | **partial** | `/teacher/students/[userId]` → `pages/teacher/students/[userId].tsx` → `pages/student-detail.page.tsx`: progress tree (`components/student-progress-tree.tsx`), grades + pending attempts (`student-grades.tsx`), sessions and timeline (`student-activity.tsx`). Tests: `student-detail.page.test.tsx`, `teacher-dashboard.entity.test.ts`. Missing: manual legacy scores (`/scores`), see below. |
| 7 | Admin teacher list + role change (`PanelAdmin.jsx`, deprecated `PATCH /admin/users/{id}/role`) | **done** | `/admin/users` → `pages/admin/users.tsx` → `admin-console/.../pages/admin-users.page.tsx`: search, role/group/status filters (`users-filters.tsx`, role filter TEACHER covers the old list), role change with effects warning (`role-change-dialog.tsx`), activation, superadmin 403 message. Tests: `admin-users.page.test.tsx`, `admin-users.entity.test.ts`. |
| 8 | Settings placeholders (`PanelSettings.jsx`, static disabled switches) | **done** | `/admin/settings` → `pages/admin/settings.tsx` → `pages/admin-settings.page.tsx`: real platform settings, forms generated from metadata (`entities/setting-form.entity.ts`, `components/setting-card.tsx`, `setting-field-editor.tsx`), AI provider chain (`provider-chain-editor.tsx`), 409/422 handling, reset, commands double confirmation. Tests: `admin-settings.page.test.tsx`, `setting-form.entity.test.ts`, `setting-field-editor.test.ts`, `provider-chain-editor.test.tsx`, `provider-chain.entity.test.ts`. |
| 9 | Search analytics (`pages/admin/search-analytics/index.jsx`) | **not applicable** | No endpoint in the OpenAPI spec (raw `fetch` to `/admin/search-analytics`). Stays legacy; still in the admin nav section (`src/shared/layouts/nav.config.ts:88`). Closure decision. |
| 10 | Global search `/search`, `/achievements`, `/flashcards` | **not applicable** | No migrated counterpart and outside this category. `/achievements` is still in the student nav (`nav.config.ts:74`). Closure decision. |
| 11 | Logout snackbar (legacy `NotificationProvider`, `Sidebar.jsx:93`) | **partial** | New code toasts through the design-system `ToastProvider` (`src/shared/design-system/components/toast-provider.tsx`). The AppShell sign-out (`src/shared/layouts/app-shell.tsx:179`) navigates without a "session closed" toast; the legacy Sidebar still uses `NotificationProvider` on legacy pages. Provider removal only at the closure. |

## Legacy capabilities with no counterpart

| Capability | Why | Proposed handling |
| --- | --- | --- |
| Manual legacy scores (`/scores/students/{id}`, `POST/DELETE /scores` in `PanelStudentDetail.jsx`) | Not in the backend OpenAPI spec; grades now come only from evaluations (`/api/my-evaluations/grades`, grading queue). The legacy page also called a missing `adminService.getStudentProgress` (audit a). | Author decision: drop (recommended) or ask the backend for an endpoint. |
| Search analytics `/admin/search-analytics` | No API in the spec. | Keep legacy or delete with its nav item (closure inventory). |
| Global search `/search` (`useSearch.js`, `SearchBar.jsx`) | No search endpoint in the spec for the new code; outside the operation category. | Keep legacy (orphan: no new nav entry) or delete. |
| Achievements `/achievements` (`src/features/progress`) | Client-side gamification on the protected `progress` zone; no backend achievements API. | Keep (protected zone) until the author decides. |
| Flashcards `/flashcards` | Legacy `ensenanza` dashboard; no API counterpart. | Keep (orphan: no nav entry) or delete. |
| Client XP / streak / focus timer / leaderboard (`src/features/dashboard`, `src/features/progress/components`) | Client metrics are forbidden in new code; no API. | Dead code at the closure (see inventory). |

## New capabilities (no legacy screen)

`/admin/audit` (search, changed-field diff, target history, CSV), `/admin/ai` (AI telemetry and ratings, lazy charts,
CSV), `/admin/research` (anonymized CSV), `/admin/status` (live status, provider probes; read-only for teachers), shared
focus mode (`src/shared/design-system/components/use-focus-mode.ts`, test `use-focus-mode.test.tsx`), teacher CSV export
and charts (`components/lazy-dashboard-charts.tsx`).

## Pending

- Backend gaps: `odd/tasks/operation.md` "Backend gaps to report" (also in `docs/operation/VERIFICATION.md`).
- Manual checks in a browser and the E2E scenarios: `docs/operation/VERIFICATION.md` items 8–10.
- Closure (delete legacy panel/dashboard code): `odd/operation-closure-inventory.md`, only after explicit approval.
