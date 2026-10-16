# Feature: ventilator-lab (real ventilator: reservations, live console, control, commands, recordings)

## Objective
Migrate the real-ventilator UI onto the template base as `src/features/ventilator-lab`:
`/lab` (summary), `/lab/reservations` (calendar + mine), `/lab/live` (live console with the physical device),
`/lab/recordings` and `/lab/recordings/[recordingId]` (playback). The live console reuses
`src/shared/ventilator-console` through a real-data adapter. Audit: `odd/ventilator-lab-audit.md`.

## Why
The legacy `/simulador` ("Ventilador real") is the only UI for the physical ventilator; it predates the
template, the generated api-client, the shared console and the backend reservations/control/commands contract.

## Decisions (orchestrator, 2026-10-16; the author asked to run every phase without stopping or asking)
1. **Structure**: `src/features/ventilator-lab/{api,application,UI,index.ts}` (the ESLint boundaries only accept
   these layers; same decision as simulator/ai-chat). Thin pages in `pages/lab/**`.
2. **Lab settings** (slot minutes, max duration, booking window, upcoming limits): read from
   `/api/platform-settings` when the caller may read it (admin); otherwise the backend defaults are VENDORED from the
   backend source by a sync script (same model as `scripts/sync-sim-engine.mjs`, with `--check`), never typed by hand
   in the UI, and the backend stays the authority (its 4xx are shown). Gap reported.
3. **Safety ranges**: no read endpoint. The command limits are the vendored backend safety defaults (validator /
   `commands.safety.*` defaults) intersected with the vendored engine limits; the backend 422 `details.violations`
   is always shown. Gap reported.
4. **Displayed settings**: ONLY the latest frame `settings` reported by the device (no latest-settings endpoint).
   Without reported settings the console shows "—" and the controls start from nothing reported (no optimistic value).
5. **Derived metrics**: pure, tested breath-cycle detection on the curves (Ppico, PEEP, Vte, FR, I:E, VE),
   labelled "derivada"; Pplat/ΔP only with a detected plateau, otherwise "—". Never estimated.
6. **Shared console change (generic, additive, optional)**: hide the patient monitor, read-only reason,
   per-parameter in-flight command state, frame-source status overlay (no data → grey frozen curves),
   derived-metric marker. Simulator and case-editor tests must stay green. No real-device logic in the shared module.
7. **Fake device for automated tests**: the backend fake (`ventylab-server/scripts/simulate-ventilator.ts`) does not
   echo settings, so commands time out. An equivalent fake lives in front test scripts
   (`ventilab-web/scripts/e2e/`), resolving `mqtt` from the backend `node_modules` (no new dependency), publishing
   telemetry and reflecting received settings. Tests NEVER target the physical device.
8. **Legacy**: `/simulador` and any legacy reservation route redirect to `/lab` (T12); legacy components are deleted
   only in P2 with the author's approval.
9. **Hardware protocol doc**: the backend repo is not modified; the front steps go to
   `ventilab-web/docs/hardware-test-protocol.md`, linking the backend protocol.
10. **Git**: Conventional Commits on `master`, no AI attribution, no branches; each task reviewed (consent granted by
    the standing instruction; independent reviewer when native review is unavailable); push once at the end.
11. **Protected-zone exception (tooling only)**: path additions in `package.json` (lint script),
    `tsconfig.strict.json`, `eslint.config.mjs`, `vitest.config.ts`, as in previous migrations.
12. **E2E / perf / visual**: Playwright is not installed and there are no servers in this session; E2E, latency
    (60 msg/s × 5 min), fps and screenshots are documented as manual and pending, unit tests cover the logic.

## Backend gaps to report
(see audit section c "MISSING"; tasks append here)
- (T0) Lab settings have no non-admin read (`GET /api/platform-settings` needs `settings:manage`). Front: defaults
  vendored by `scripts/sync-lab-settings.mjs` from the `EnvironmentVariables` class defaults of `env.validation.ts`.
- (T1) `CurrentReservationDTO.reservation` is documented as `ReservationDetailDTO | null`, but the role mapper
  (`toCurrentDTO` → `toDTO`) returns the limited `ReservationSummaryDTO` to a student who does not hold it. Front maps
  both by `visibility`.
- (T1) No device online-state read for students: `ventilator:connected` / `ventilator:disconnected` are broadcast only on
  transitions, so a page opened while the device is online shows "sin datos" until the next transition or telemetry
  batch. Staff seed it from `GET /api/system/status` (`system:status`).
- (T1) The limited projection carries the group name only inside the translated `label` (no `groupName`/args), so the
  group occupancy text follows the request language (`Accept-Language`/`x-lang`); the front shows that label verbatim.

## Checklist (D = delegated writer, I = inline)
- [x] T0+T1 (D) Registrations, realtime ventilator event types, lab-settings vendoring, `/lab` summary.
- [ ] T2 (D) Calendar (week/day, America/Bogota) + create reservation with role-based holder.
- [ ] T3 (D) Preemption (409 alert, confirmPreempt, teacher vs teacher, `reservation:preempted` toast, realtime invalidation).
- [ ] T4 (D) My reservations (upcoming/past, cancel with confirmation).
- [ ] T5 (D) Real adapter (ring buffer by reference, reported settings, derived metrics) + generic shared console change.
- [ ] T6 (D) `/lab/live` access screens, room join, device/socket states, latency indicator.
- [ ] T7 (D) Operator control (banner, take/takeover/release, heartbeat, release on leave).
- [ ] T8 (D) Commands (pending→confirm→status, error copy, recent commands, safety limits) + fake device script.
- [ ] T9 (D) Control revoked modal.
- [ ] T10 (D) Recording toggle + REC indicator.
- [ ] T11 (D) Recordings list + playback (+ CSV only if the API offers it).
- [ ] T12 (D) Redirects, nav "Laboratorio" with device status, parity doc, hardware protocol doc, final verification.
- [ ] P2 Legacy removal: ONLY with the author's approval.

## Progress / evidence
- Phase 1 audit: `odd/ventilator-lab-audit.md` (2026-10-16).
- T0+T1 (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - Registrations: `ventilator-lab` in eslint (NEW_FEATURES, LEGACY_FREE_FEATURES, the `feature` pattern, NEW_PAGE_FILES
    for the five `/lab` pages with `[[]recordingId[]]`), the `lint` script, `tsconfig.strict.json`, `vitest.config.ts`;
    `routes.config` v1.10: the five `/lab` routes for every authenticated role (backend grants `reservations:read/create`
    and `ventilator:control` to STUDENT; TEACHER/ADMIN inherit them). Only `pages/lab/index.tsx` exists; the other four
    pages are registered but not created (lint/tsconfig/eslint accept missing paths), they come with T2/T6/T11.
  - `src/shared/realtime` v1.2: typed server events `ventilator:telemetry|alarm|availability|join-rejected|connected|
    disconnected|control-changed|command-status`, `reservation:preempted`; client `ventilator:join`, `ventilator:heartbeat`
    (both exist in the gateway flow: `VENTILATOR_JOIN_MESSAGE`, `VENTILATOR_HEARTBEAT_MESSAGE`; payload ignored). The
    provider had no emit API, so a generic tested `useEmitOnAuthenticated(event, {enabled, trigger, args})` re-sends a
    client message on every authenticated connection and when `trigger` changes (for T6; not used by `/lab`).
  - Lab settings: `scripts/sync-lab-settings.mjs` (`--check`, generated header) extracts the numeric class defaults of
    13 keys (reservations.*, telemetry.staleAfterMs, commands.ratePerSecond/ackTimeoutMs, commands.safety.*) from the
    backend `env.validation.ts` (not copied: it depends on class-validator) into
    `src/features/ventilator-lab/application/config/vendored/lab-settings.defaults.ts` (feature-local: only the lab
    uses them). The engine parameter ranges for T8 are already vendored in `src/shared/sim-engine/engine/common/`.
    `useLabSettings`: `/api/platform-settings` when the session has `settings:manage`, per-key fallback to the defaults,
    `source: 'server' | 'defaults'`.
  - api: DTO aliases (`lab.dto.ts`), `reservations.service` (current, mine, calendar), mapper by `visibility` (full:
    holder name / identifier and group name as returned; limited: `labelKey` student/teacher → Spanish text of the
    backend es i18n, group and unknown keys → backend `label`), `lab-status.service` (platform settings, system status).
  - `/lab` (thin route, student layout): device status card (`useDeviceStatus`: broadcast connected/disconnected +
    telemetry batches, staff seed from `/api/system/status`, "Sin conexión en tiempo real" when the socket is not
    authenticated; it does NOT emit `ventilator:join`, since these events are broadcast), active reservation card
    (`canControl` → "Entrar a la consola" `/lab/live`; otherwise the backend occupancy label + "Ventilador en uso"),
    "Mis próximas reservas" (from `mine`, without the active one, status chip, link `/lab/reservations`);
    skeleton/error-with-retry/empty states; `useReservationsRealtime` revalidates current/mine/calendar on
    `ventilator:availability` and `reservation:preempted`.
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab
    src/shared/realtime src/shared/session` → 12 files, 110 tests passed; `node scripts/sync-lab-settings.mjs --check`
    → up to date (13 keys); greps over `src/features/ventilator-lab pages/lab`: sx/style/styled 0, hex/rgb in CSS 0,
    files without the author header 0.
  - Test-first: RED observed for `useEmitOnAuthenticated` and the reservations mapper (module missing); the routes test,
    services, settings entity, hooks and page tests were written together with the code and passed on first run.
  - Deviations: holder = backend `canControl` (holder, holder group member, teacher, admin), not a client id check; the
    "countdown with clock offset" of the audit plan is left to T6 (T1 shows the window only).
  - Pending manual: `/lab` in the browser with the backend and the device (online / sin datos transitions).
  - Commit: see `git log -1 -- odd/tasks/ventilator-lab.md`.

## Next step
T2.
