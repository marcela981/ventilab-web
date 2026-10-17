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
- (T2) No realtime event for other people's future bookings: `ventilator:availability` is broadcast only when the
  ACTIVE reservation changes (`ventilator-room-access.service.ts` refresh) and `reservation:preempted` goes only to the
  preempted holder; `ReservationCreated/Cancelled` events are not forwarded to clients. Front: calendar refresh every
  60 s (`CALENDAR_REFRESH_MS`) + SWR focus revalidation + the existing realtime invalidation.
- (T2) No list of the student groups a teacher may book for: the policy requires supervision through a teacher group
  (`getSupervisedStudentGroupIds`), but `GET /api/groups` returns the student groups the teacher created OR supervises.
  Front lists `GET /api/groups?type=STUDENT&isActive=true`; a created-but-unsupervised group gets the backend 403
  `reservations.reserve_forbidden`, shown in Spanish. (T2 review fix) No teacher-readable supervision data either:
  `GET /api/groups/{id}/supervisions` needs `groups:manage_supervisions` (ADMIN) and `GroupDTO` has no supervision
  flag, so the front now offers a teacher only the listed groups the teacher did NOT create (in scope only through
  supervision); a group the teacher created AND supervises is not offered. Needed: a "groups I may book for" read or a
  `supervisedByMe` flag.
- (T2) `reservations.limit_reached` carries the limit only inside the translated message (no `data`), and does not say
  whether the student or the group limit was hit; the front shows a generic Spanish message without the number.
- (T3) `CreateReservationDTO` has no preemption reason (only `POST /api/reservations/{id}/preempt` takes `reason`), so a
  create-with-confirmPreempt notifies the holder without a reason; the front toast shows the reason only when the
  event carries one.
- (T4) `GET /api/reservations/mine` returns only reservations whose window has not ended (`endsAt > now`, any status),
  so "Mis reservas → Anteriores" can only show cancelled/preempted/completed reservations of windows still open; there is
  no history read for a user's past reservations.
- (T5) The device-reported `settings` are free-form: only the keys with a console parameter of the same meaning are
  shown (tidalVolume, respiratoryRate, peep, fio2 fraction → %, inspiratoryTime, sensitivity → flow trigger).
  `pressureLimit` is an absolute pressure (validated `> peep`) while the console inspiratory pressure is above PEEP, and
  `ieRatio`/`flowRate` have no console parameter: none is shown (decided in T8: no console pressure is offered, see the T8 gaps). No
  documented list of the keys the ESP actually reports; no measured FiO2, so the FiO2 metric shows "—".
- (T5) No breath metrics in the telemetry: Ppico/PEEP/Vte/FR/I:E/VE/Pplat/ΔP are derived in the browser (labelled
  "derivada"); PEEP is end-expiratory pressure without a hold, so the "PEEP total" tile is relabelled "PEEP".
- (T4) The cancel rules are not exposed per reservation (no `canCancel` in `ReservationDetailDTO`): the front mirrors
  `reservation-access-policy.canCancel` (admin, creator, holder user, holder-group leader, supervising teacher; only
  SCHEDULED) to show/hide the button, without the teacher supervision fact (see the T2 gap); the backend 403/404/409
  are shown in Spanish.
- (T3 review) `reservation:preempted` goes to every holder user without excluding the actor
  (`reservations-events.handlers.ts:49-51`): a staff caller holding (or in the group of) a reservation they preempt is
  notified. Front: the preemption dialog marks the listed conflict ids as already announced before the confirm request
  (undone on failure). Needed: actor exclusion on the realtime event. Race left: the backend preempts every overlap at
  confirm time (`create-reservation.usecase.ts:98-110`), which may include reservations created after the 409 list
  (not marked, so the caller could still be told about one of them; the success copy states no count).
- (T4 review S2) Deliberate trade-off: `managedGroupOptions` does not offer a group a teacher created AND supervises
  (false negative; the backend has no "groups I may book for" read, see the T2 gap).
- (T6) No server clock in a header readable cross-origin (`Date` is not in `CORS_EXPOSED_HEADERS`); the live page uses
  the envelope BODY `timestamp` ("Server time of the response") of `GET /api/reservations/current`. Still no live
  `sampleRateHz` and no heartbeat contract (audit c.8).
- (T1) The limited projection carries the group name only inside the translated `label` (no `groupName`/args), so the
  group occupancy text follows the request language (`Accept-Language`/`x-lang`); the front shows that label verbatim.
- (T7) No operator name in the control contract: `VentilatorControlStateDTO` and `ventilator:control-changed` carry only
  `operatorUserId`. The banner shows "Opera: <name>" only when the operator is the reservation holder user (name as the
  backend returned it in the full projection); any other operator (group member, teacher, admin) shows
  "Opera: otra persona". Needed: `operatorName` (per-role projection) in both.
- (T7) The operator presence grace (`VENTILATOR_OPERATOR_GRACE_SECONDS`, default 15 s) and the control refresh are env
  only, neither platform settings nor exposed by the API; the heartbeat interval (grace / 3 = 5 s) is derived from the
  vendored default (`VENDORED_LAB_BACKEND_DEFAULTS` of `scripts/sync-lab-settings.mjs`), so a server with another grace
  is not followed. Presence only expires after the operator's LAST socket closes (`handleDisconnected`); a heartbeat
  (HTTP or socket) only cancels a pending release and nothing restarts it (`touch` clears the grace timer; `lastSeenAt`
  is not used for expiry). (T7 review fix W1) The front therefore beats ONLY over the socket and never over HTTP: an
  HTTP beat while the socket is down would cancel the grace for good (socket drop + HTTP beat + browser crash = control
  held until the reservation ends). Backend follow-up: restart the grace in `touch` while `remainingSockets == 0` (or
  expire on `lastSeenAt`), so an HTTP heartbeat becomes safe.
- (T7) `DELETE /api/ventilator/control` by a teacher/admin releases ANYONE's control (`canReleaseControl`), so the front
  sends the leave-page release only when the caller is the operator.
- (T6 review) No socket ping carrying the server time: the clock offset comes from the envelope `timestamp` of
  `GET /api/reservations/current`, stamped at `build()` after guards and the database read, so the latency reads up to
  about half the server processing time high (fastest of 4 samples, round trip ≤ 1 s, keeps it small). Follow-up:
  `ventilator:telemetry` is also emitted to the `role:TEACHER` / `role:ADMIN` rooms, so staff sockets receive every
  batch on every page, not only on `/lab/live`.
- (T8) `SendVentilatorCommandRequestDTO` has no idempotency key: a client timeout leaves the outcome unknown and the
  front never retries by itself (it shows "el cambio pudo haberse enviado" and re-reads the history).
- (T8) A command is a FULL setting set (required fields per mode) and there is no latest-settings read: the front builds
  it from the device-REPORTED frame `settings` (command field names) plus the confirmed changes; a required field the
  device never reported blocks the command. No documented list of the keys the ESP reports.
- (T8) `pressureLimit` is an absolute pressure whose meaning per mode is not documented, while the console pressures
  are above PEEP: the console offers no pressure, a change INTO PCV/PSV is refused, PEEP is not offered in PCV/PSV (a new
  PEEP under the unchanged absolute limit would silently change the pressure above PEEP), and while the mode is
  unchanged the reported `pressureLimit`/`flowRate`/`ieRatio` are carried unchanged. Needed: a documented pressure
  semantics (or an above-PEEP field) to command PCV/PSV pressure.
- (T8) Safety ranges: no read for non-admins (decision 3); the limits are the vendored `commands.safety.*` defaults (or
  the platform settings for admins) intersected with the vendored engine limits; the I:E maximum and the expiratory
  time rule are pre-checked; the backend 422 `details.violations` is shown (rule-based Spanish, its English `message` is
  never shown). `VENTILATOR_APPLY_TOLERANCE_RATIO` is env only: the front mirrors the 5 % default.
- (T9) The control contract carries no operator name (see T7): the takeover notice says "<name> tomó el control" only
  when the new operator is the reservation holder user of the full projection, otherwise "Otra persona".
- (T9) `reservation:preempted` carries no successor and goes only to the preempted holders; `ventilator:control-changed`
  with `reservation_preempted` / `reservation_ended` is emitted only when someone held the control (`release` returns
  without state). So a session nobody operated (or a staff viewer) learns the end from the re-read that
  `ventilator:availability` triggers (or the countdown); the modal then says "La sesión de esta reserva terminó" (no
  reason is guessed) and the next holder comes only from the re-read projection. Needed: a session-ended event to the
  ventilator room with the reason.
- (T8) `ventilator:command-status` carries no parameters: "Comandos recientes" takes them from the POST body (own
  commands) or `GET /api/ventilator/commands` (limit 10, newest first).
- (T8 review B1) The backend validator does not check the inspiratory flow against Vt/Ti (`flowRate` is only range
  checked) and nothing documents whether the device derives it: while the device reports `flowRate` the front REFUSES a
  Vt or Ti change (resending the stale flow would change the other value unconfirmed). Needed: a documented flow
  semantics (derived or commanded) and a coherence rule.
- (T8 review W1) The backend `applied-settings-match` has the same flaw the front had: a one-step change (Vt 450 → 460,
  FiO2 40 → 41 %) is within the 5 % tolerance of the OLD report, so the backend may resolve APPLIED before the device
  applied it. Front: a report matches only when within tolerance AND strictly closer to the target than to the
  pre-command value. Backend follow-up: same rule (or tolerance ≤ half a step).
- (T8 review W2) No one-command-in-flight check in the backend and no idempotency key: after a lost connection / 5xx /
  client timeout the front keeps the console locked (`uncertain`) until the device reports the values or the ack
  timeout + grace + report wait has passed.
- (T8 review S1) `GET /api/ventilator/commands?ids=` ignores the `ids` filter in the use case: the status watchdog finds
  the command among the 10 newest of the reservation (fine with one command at a time).
- (T10) No recording state: `POST /api/ventilator/telemetry/recordings/start|stop` answer data null (the use case
  returns `TelemetryRecordingStatus` but the controller drops it), there is no status read and no realtime event, and
  the current reservation / telemetry batch carry no recording flag. Both are idempotent (start of the reservation
  already recorded and stop without a recording answer 200), so there is no 409 "already recording" / "not recording"
  (409 = no active reservation, 403 = not a holder, 404 only on the GET). Front: local state per tab, lost on reload;
  the REC mark is shown ONLY in the tab that started the recording (not faked for the others present); a start/stop
  made by someone else (the stop is global: any holder, teacher or admin stops anyone's recording) is not seen.
  Needed: the recording status in the answers + a `ventilator:recording` event to the room (or a flag in
  `CurrentReservationDTO`).
- (T11) No recordings list (re-verified in openapi: only `GET /api/ventilator/telemetry/recordings/{reservationId}`).
  `/lab/recordings` lists the reservations a recording CAN belong to, from the calendar `GET /api/reservations` (at most
  31 days per range, past ranges allowed for every role) in 31-day windows going back: started reservations, every one
  for staff, the full projection only for a student (a student creator who is not a holder still gets the backend 403).
  `mine` is not usable (only `endsAt > now`). Whether a reservation was recorded and the recording length are known only
  when it is opened: the only read returns EVERY frame, so probing rows would download whole recordings; nothing is
  probed (the row shows the reservation window duration). Needed: `GET /api/ventilator/telemetry/recordings` (id,
  window, holder per role, chunkCount, duration).
- (T11) No CSV export of a recording (the only CSV is the admin latency `metrics.csv`): none is offered and no client CSV
  is built.
- (T11) `TelemetryRecordingDTO` gives the recording rate (`sampleRateHz`, backend default `VENTILATOR_RECORDING_HZ` 20)
  but not the source rate, so the subsampling factor cannot be stated (the page says "Datos submuestreados por el
  servidor a N Hz."). Recorded frames carry no settings, mode or alarms (`RecordedTelemetrySample`): the playback shows
  "—" for the settings and mode and no alarms; the derived metrics come from the breath detection on the played frames
  (a recording rate below 5 Hz would exceed the detector's 200 ms gap and show "—").
- (T11 review fix S3) `ReservationDetailDTO` carries no cancel / preemption time (`updatedAt` exists in the domain but is
  not projected): a reservation CANCELLED or PREEMPTED before its start (no recording possible) cannot be told apart
  from one ended during the session, so `/lab/recordings` keeps those rows with the note "Solo tiene grabación si
  terminó durante la sesión…" instead of filtering them. Needed: `cancelledAt` / `preemptedAt` (or the recordings list).
- (T12) The nav device indicator has the same T1 limitation: `ventilator:connected/disconnected` are transitions only and
  students have no state read, so after a page load a student's "Laboratorio" item shows NO indicator (unknown, T12
  review fix W1) until the next transition or telemetry; staff are seeded from `/api/system/status`.

## Checklist (D = delegated writer, I = inline)
- [x] T0+T1 (D) Registrations, realtime ventilator event types, lab-settings vendoring, `/lab` summary.
- [x] T2 (D) Calendar (week/day, America/Bogota) + create reservation with role-based holder.
- [x] T3 (D) Preemption (409 alert, confirmPreempt, teacher vs teacher, `reservation:preempted` toast, realtime invalidation).
- [x] T4 (D) My reservations (upcoming/past, cancel with confirmation) + T2 review fix (W1–W3, S1–S3).
- [x] T5 (D) Real adapter (ring buffer by reference, reported settings, derived metrics) + generic shared console change.
- [x] T6 (D) `/lab/live` access screens, room join, device/socket states, latency indicator + T3 and T4 review fixes.
- [x] T7 (D) Operator control (banner, take/takeover/release, heartbeat, release on leave) + T5 review fix (W1–W5, S1–S6).
- [x] T8 (D) Commands (pending→confirm→status, error copy, recent commands, safety limits) + fake device script + T6 review fix.
- [x] T9 (D) Control revoked modal + T7 review fix (W1, W2, S1–S6).
- [x] T10 (D) Recording toggle + REC indicator + T8 review fix (B1, W1–W4, S1–S5).
- [x] T11 (D) Recordings list + playback (+ CSV only if the API offers it) + T9 review fix (B1, W1–W3, S1–S3).
- [x] T12 (D) Redirects, nav "Laboratorio" with device status, parity doc, hardware protocol doc, final verification + T11 review fix.
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
- T2 (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - Slot grid (`application/entities/slot-grid.ts`, pure): Bogota day / Monday week ranges with the fixed UTC-5 offset
    (`@shared/lib/bogota-time`, independent of the browser TZ), anchor navigation, slots by `slotMinutes` aligned to
    the epoch boundaries the backend checks (`isAlignedToSlot`), occupancy overlay (CANCELLED/PREEMPTED free the slot),
    past = starts before `floorToSlot(now)` (the slot in progress stays bookable, as on the server), outside window =
    starts after `now + maxAdvanceDays`, `availableDurations` (slot multiples up to `maxDurationMinutes`, stopping at
    the next occupying reservation of the loaded range), Bogota day/time/window labels. All values from
    `useLabSettings`.
  - api: `CreateReservationDTO`/groups/users DTO aliases; `createReservation` (POST, data null); `holders.service`
    (paths, permissions, queries); `create-reservation.mapper` (body: caller without userId, trimmed purpose omitted
    when empty, `confirmPreempt` only when set; 409 `data {preemptable, conflicts[]}` parser; holder options).
  - Holders by role (mirrors `reservation-access-policy.canReserveFor`): everyone "Para mí"; STUDENT also the active
    student groups they LEAD (`GET /api/groups/mine` memberships, `memberRole: LEADER` = backend `isGroupLeader`);
    TEACHER the active student groups of `GET /api/groups` (gap above); ADMIN any active group + any user via
    `GET /api/users?search=` (≥ 2 chars, debounced 300 ms).
  - Error copy by backend code (`reservations.errors.ts` i18n keys in the envelope `code`): limit_reached,
    too_far_ahead (days from settings), in_past, conflict / conflict_preemptable (overlap), not_aligned, too_long,
    invalid_window, reserve_forbidden, holder_not_found, invalid_holder; others → generic lab messages.
  - T3 plug-in: `useCreateReservation` resolves `{kind:"failed", error, conflict}` with the parsed 409 details;
    `CreateReservationDialog` has `onConflict(conflict, request) => boolean` (called only for `preemptable`; when it
    returns true no error is shown). T2 passes nothing → overlap message. T3 must also let staff pick durations past
    the next reservation (the page computes `durations`).
  - UI: `/lab/reservations` (thin route, student layout): week (default) / day toggle, previous / Hoy / next, range
    label, rules line, legend, table with sticky headers (free = "Reservar <window>" button, occupied = backend
    holder text on the first slot only, past / outside inert), scroll to the current Bogota hour, success alert,
    skeleton, retryable error, previous range kept while loading. `reservationHolderText` moved to the reservation
    entity and reused by `/lab` (lab-home v1.1).
  - Realtime: verified the gateway emits only `ventilator:availability` and `reservation:preempted` for reservations
    (`reservations-events.handlers.ts`, `ventilator-telemetry-events.handlers.ts`); both already invalidate
    current/mine/calendar via `useReservationsRealtime`; 60 s refresh covers the rest (gap above).
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab` → 11 files,
    75 tests passed; greps over `src/features/ventilator-lab pages/lab`: sx/style/styled 0, hex/rgb in CSS 0, files
    without the author header 0.
  - Test-first: RED observed for the slot grid and the create mapper (modules missing); the error-copy test was written
    before the code but not run RED; hooks, dialog and page tests were written after the code.
  - Size: ~2.6k authored lines incl. ~970 of tests and the file headers; one coherent unit (entity + api + hooks + 2 components + page);
    splitting the dialog from the calendar would leave an unusable page.
  - Deviations: the time column follows the first day (identical for every slot length that divides 300 min); the
    duration cap only sees reservations of the loaded range (the backend 409 covers the rest).
  - Pending manual: `/lab/reservations` in the browser with the backend (student, leader, teacher, admin), scrolling
    and the week layout on mobile.
  - Commit: see `git log -1 -- odd/tasks/ventilator-lab.md`.
- T3 + T0+T1 review fix (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - Preemption (create-with-confirm flow of the spec; `POST /api/reservations/{id}/preempt` not exposed, the UI does
    not need it): staff (TEACHER/ADMIN by session role) can select occupied slots of the bookable range (`GridSlot.bookable`,
    calendar `canSelectOccupied`, aria "Reservar <ventana> sobre la reserva de <titular>") and their durations are not
    capped by the next reservation. A 409 `reservations.conflict_preemptable` goes through T2's `onConflict` to
    `PreemptReservationDialog` (alertdialog "Desplazar reservas"): each conflict as the backend returns it to staff
    (holder name + identifier, or "Grupo <name>", Bogota window), holder choice "Asignarme a mí" / "Asignar a un
    grupo" (T2 `useHolderOptions` groups; preselects the original request's group; an admin's original user is kept as
    a third option), "Desplazar y reservar" resends the same window/purpose with the chosen holder and
    `confirmPreempt: true` (verified in `CreateReservationDTO`: no other preemption field); Cancel sends nothing;
    success closes both dialogs with "Reserva creada. Se desplazó 1 reserva; su titular recibió un aviso.".
  - Teacher vs teacher: the backend answers `reservations.conflict` (preemptable false) with `holderRole` per conflict
    (`canPreempt`: a teacher only preempts STUDENT holders; admin always). `requiresAdminToPreempt` + 
    `getCreateReservationFailureMessage` show "… Solo un administrador puede desplazarla …" in the create and the
    preemption dialogs (students' 409s carry no roles → overlap message).
  - Affected holder: `usePreemptionNotice` (mounted by `/lab` and `/lab/reservations`; T4/T6/T11 pages must call it
    too; `_app` untouched, the global `ToastProvider` is already there) shows a persistent info toast on
    `reservation:preempted` (Bogota window, "en curso" when `wasActive`, reason when present) or, as a fallback, on a
    `notification:new` of type `RESERVATION_PREEMPTED` (backend body); one toast per `reservationId` whatever arrives
    (user room + group room + notification). Calendar/current/mine are invalidated by `useReservationsRealtime` on
    `reservation:preempted` and by the notice hook on a notification-only preemption. The console "control revoked"
    modal stays in T9.
  - T0+T1 review fix: (1) `lab-error-messages.test.ts` covers `getLabErrorMessage` (timeout, network, 429 with/without
    Retry-After singular/plural, 5xx, 400/403/404/409/422, unknown); (2) `useDeviceStatus` no longer trusts the
    pre-disconnect system-status seed after the socket leaves `authenticated`: "Sin datos" (unknown) until the
    revalidation resolves, and a failed revalidation (SWR error) keeps it untrusted; tested disconnected→authenticated
    with a held response; (3) `upcomingReservations` keeps only `SCHEDULED` (backend `ReservationLifecycleStatus`:
    SCHEDULED/CANCELLED/PREEMPTED/COMPLETED); (4) the no-socket `useEmitOnAuthenticated` test now asserts no emit
    without a socket and exactly one emit when the socket appears.
  - Test helpers v1.2: ToastProvider (or a ToastApi spy) in the wrapper and `createRealtimeStatusControl` to change the
    socket status after render. Dialog suites got 20 s describe timeouts (two create-dialog tests hit the 5 s default
    under the 17-file parallel run; green alone).
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab
    src/shared/realtime` → 17 files, 119 tests passed; greps over `src/features/ventilator-lab pages/lab`:
    sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0.
  - Test-first: RED observed for the review fixes (2) and (3) and for the preemption dialog (module missing); (1) and
    (4) are tests of existing behaviour (green at once); the preemption entities and notice hook tests were written
    first but the code was written before running them (no RED observed); page tests written with the code.
  - Size: ~1.3k authored lines incl. ~650 of tests; one coherent unit (preemption needs entity + dialog + calendar +
    page + notice together).
  - Pending manual: teacher preempting a student, teacher vs teacher message, admin over a teacher, the student toast in
    a second browser, with the backend.
  - Commit: pending (author).

- T4 + T2 review fix (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - "Mis reservas" (`application/components/my-reservations.tsx`, on `/lab/reservations` below the calendar; the page
    already calls `usePreemptionNotice`): `GET /api/reservations/mine` split by the pure `my-reservations.entity`
    into Próximas (SCHEDULED and not ended, by start; the one in progress labelled "En curso") and Anteriores
    (CANCELLED / PREEMPTED with "Motivo del desplazamiento: <preemptedReason>" / COMPLETED / ended, most recent first);
    Bogota window, backend holder text, purpose, status chip; skeleton / retryable error / empty state.
  - Cancel: verified in the backend — `POST /api/reservations/{id}/cancel` (openapi `cancelReservation`, 200 data null,
    `reservations:create`), `canCancel` = ADMIN, creator, holder user, leader of the holder group, TEACHER supervising
    it; `Reservation.cancel` only while SCHEDULED (also in progress). `canCancelReservation` mirrors it only to show the
    button (full projection, SCHEDULED, not ended); the reservation entity/mapper (v1.3/v1.1) now keep the holder user,
    holder group and creator ids (never shown). `useCancelActor`: session user/role + LEADER memberships of
    `GET /api/groups/mine` (teacher supervision is not readable: empty, harmless since a teacher's "mine" holds only
    reservations they hold or created). ConfirmDialog ("¿Cancelar la reserva?", window, "termina la sesión" when in
    progress, whole group warning; "Volver" sends nothing) → `useCancelReservation` → revalidates calendar/mine/current
    (also after a failure: 404/409 mean a stale list) → toast "Reserva cancelada." or the Spanish message of
    `reservations.cancel_forbidden` / `not_scheduled` / `reservation_not_found` (else the generic lab messages).
  - T2 review fix: W1 `useReservationsCalendar` without `keepPreviousData` (data always belongs to the requested range;
    skeleton/error of the new range; same-range refresh keeps data). W2 teacher holder options exclude the groups the
    teacher created (`managedGroupOptions(groups, teacherId)`; gap updated). W3 (option chosen: support midnight-crossing
    slots + per-cell time) — each slot belongs to the Bogota day it starts in (`startMs < dayEnd`), so no slot is lost
    for any 1..60 length; `SlotGrid.alignedRows` = slotMinutes divides 1440; when false the time column is empty and each
    cell shows its own start time. Simplest correct option: no special-casing of values, the backend range 1..60 all
    render correctly. S1 the calendar query ends `maxDurationMinutes` after the range (grid unchanged). S2 in the
    bookable range only SCHEDULED reservations occupy (`blocksBooking`); past slots still show completed ones. S3
    `availableDurations` returns [] when a scheduled reservation covers the start, so the dialog shows "No queda tiempo
    libre" and disables Reservar. Follow-up `preemptReason` gap: already recorded in T3.
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab
    src/shared/realtime` → 20 files, 149 tests passed; greps over `src/features/ventilator-lab pages/lab`:
    sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0.
  - Test-first: RED observed for the slot-grid fixes (W3/S2/S3, 5 failing tests), the my-reservations entity (module
    missing) and W1 (re-running the new hook test with `keepPreviousData` restored fails); W2, S1, the calendar labels
    and the component/page tests were written with the code and passed on first run.
  - Size: ~1.1k authored lines incl. ~600 of tests and headers; T4 and the review fixes share the page, entity and
    tests, one coherent unit.
  - Pending manual: cancel as student / group leader / teacher / admin with the backend, the in-progress cancel ending a
    console session (T6/T7), 7-minute slots in the browser.
  - Commit: pending (author).

- T5 (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files; shared contract change, HIGH risk).
  - Shared console (generic, additive, optional; no device knowledge; contract v1.4): (1) `capabilities.patientMonitor:
    false` hides the patient zone (no empty notice) — a source capability rather than a console prop, so the adapter
    alone decides it from the data it has; (2) `permissions.readOnlyReason` next to "Solo lectura" and, in the built-in
    controls, a reason paragraph referenced by `aria-describedby` on every disabled spinbutton, stepper, mode and
    CONFIRMAR/CANCELAR button; (3) `settings.inFlight[param] = {status: sending|awaiting|rejected, message?}` → tag
    "Enviando" / "Esperando confirmación del equipo" / "Rechazado: <msg>" (`data-in-flight`), the control keeps showing the
    applied value and cannot be re-edited while sending/awaiting (rejected can); (4) `frames.status: live|no-data` +
    `frames.statusMessage` → overlay (role status, default `CONSOLE_NO_DATA_MESSAGE`) over the last curves greyed by CSS
    (grayscale + dim, no color literal), console read-only while no-data (slots get `readOnly` + `readOnlyReason`); (5)
    metric values may be `{value, derived?, label?, description?}` → visible "derivada" label with a title, and a label
    override for narrower measurements; plus (6) a parameter the source does not report shows "—" ("Sin valor
    informado") instead of the limit minimum (decision 4: no invented value; the stepper still starts from the minimum
    once the operator edits, as before) and (7) a generic `pco2` vital (PCO2, mmHg, no default range) because the
    telemetry `pco2` is not labelled arterial or end-tidal. Why: decisions 4–6; every field is optional, so the simulator
    and case editor are unchanged (their suites stay green). `CURVES_COPY` is mocked in the live test, so the default
    no-data text lives in `console.config` (`CONSOLE_NO_DATA_MESSAGE`).
  - Real adapter (pure entities + one hook, no page): `telemetry-samples` (deviceTs else serverTs time base, tMs relative
    and monotonic; a frame ≤ 1 s in the past is dropped as late, a larger jump back or a time-base change restarts at 0 =
    ring reset per the console contract; non-finite frames dropped); `sample-rate` (count/span over 2 s, rounded to 10 Hz,
    only grows: a new rate recreates the console ring); `telemetry-frame-hub` (stable `{sourceId, subscribe}`, samples
    handed synchronously to the console listener = ring by reference, no React render per batch); `reported-settings`
    (latest frame per field, whole settings object replaced, mode/SpO2/PCO2/frame alarm codes; key map above, verified in
    `docs/ventilator/commands.md` + the validator ranges); `breath-detection` (flow-sign phases with hysteresis 3/1 L/min
    and 60 ms minimum; Ppeak max P; PEEP mean P of the last 100 ms; Vte = max volume up to the first expiratory sample −
    min volume of the expiration, i.e. the device volume difference (documented choice, mL); RR from the mean period of
    the last 4 breaths; I:E = Ti/Te; VE = Vte × RR; Pplat = mean P of the second half of a ≥ 150 ms |flow| ≤ 2 L/min run
    ending the inspiration, else null, ΔP = Pplat − PEEP; a stream starting with inspiratory flow ignores that first
    breath; gap > 1 s drops the breath in progress; backwards time clears; metrics null when stale > 3 periods);
    `telemetry-alarms` (device severity CRITICAL/HIGH → high, MEDIUM → medium, LOW → low, unknown → medium; Spanish label
    per backend type with value/threshold; frame codes via the console default map; synthetic high "Equipo sin datos"
    generated by the adapter; frame code deduped against the device event); `real-console-adapter` (all derived metrics
    marked, Vt/kg, auto-PEEP, FiO2, power left out; patient monitor only with SpO2/PCO2; `canControl` false by default;
    optional limits, inFlight, onConfirm, readOnlyReason); `useRealConsoleAdapter({sourceId, live, …})` (per-source state
    in closures, React commits throttled to ≥ 250 ms with a trailing commit, `ventilator:alarm` events, `live: false` →
    no-data status, synthetic alarm and detector restart). Exported from the feature index for T6.
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab
    src/shared/ventilator-console src/shared/waveforms src/shared/sim-engine src/shared/realtime` → 41 files, 385 tests
    passed; `npx vitest run src/features/simulator` → 19 files, 197 passed; `npx vitest run src/features/case-editor` → 6
    files, 68 passed (in one combined 7-path run, 3 simulator tests timed out under load — session-console and
    assist-panel — and pass alone and in the simulator-only run); greps over `src/features/ventilator-lab pages/lab
    src/shared/ventilator-console`: sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0.
  - Test-first: RED observed for the shared source-state suite (7 failing, then the relabel test 1 failing), the breath
    detection (module missing) and the real-console entities (module missing); the hook test was written after the hook.
    Breath tests use a single-compartment lung (P = PEEP + V/C + R·F) with known values: VCV with pause (Ppeak 20, Pplat
    15, ΔP 10, PEEP 5, Vte 500, RR 15, I:E 1.3/2.7, VE 7.5), VCV without pause (Pplat/ΔP null), PCV with zero end flow
    (Pplat = 23), and the paused VCV with deterministic noise; all within 2 %.
  - Size: ~2.2k authored lines (≈1.8k feature incl. ~900 of tests and headers, ≈350 shared); one coherent unit (the
    adapter needs the shared fields it fills).
  - Deviations: `capabilities.patientMonitor` instead of a `showPatientMonitor` prop (adapter-driven); the
    unknown-value "—" and the `pco2` vital were not listed but follow decisions 4/5; the detector restart on no-data
    makes the metrics "—" while the overlay is shown.
  - Pending manual: curves/metrics against the real device or the fake device (T8 script), fps with 60 msg/s.
  - Commit: pending (author).

- T6 + T3 review fix + T4 review fix (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - `/lab/live` (thin route `pages/lab/live/index.tsx`, student layout; `LabLivePage` in the feature index): access from
    `GET /api/reservations/current` via the pure `live-session.entity`: active reservation + `canControl` (backend:
    holder user, holder group member, TEACHER, ADMIN) → console session; active reservation without `canControl` →
    "Equipo ocupado" with the backend occupancy label verbatim, no curves, no room join; no active reservation → the
    caller's next SCHEDULED reservation (from `mine`) and "Ir al calendario de reservas". Skeleton / retryable error.
    `useReservationsRealtime` + `usePreemptionNotice` mounted. Console view: full-width dark surface (`--vl-console-*`)
    like the simulator session page, h1 "Consola en vivo", reservation window, countdown, device tag, latency.
  - Room: `useVentilatorRoom` emits `ventilator:join` through the T0 `useEmitOnAuthenticated` (every authenticated
    connection and every reservation id change); `ventilator:join-rejected` → error banner with the Spanish reason
    (`no_active_reservation`, `not_reservation_holder`, generic fallback) and a re-read of the current reservation; the
    rejection is scoped to the reservation and connection. Telemetry and alarms reach the T5 adapter, which subscribes
    to `ventilator:telemetry` / `ventilator:alarm` itself.
  - Device / socket states: `live = socket authenticated && useDeviceStatus online && !stale`; `useTelemetryStale`
    re-arms one timeout per batch with `telemetry.staleAfterMs` (platform setting for admins, vendored 2000 ms
    otherwise), cleared by a batch or `ventilator:connected`. Not live → adapter `frames.status: no-data` (grey frozen
    curves + overlay "Equipo sin datos", read-only reason "Equipo sin datos: los controles se habilitan cuando el equipo
    vuelva a enviar datos."), resuming automatically. Socket not authenticated → banner "Se perdió la conexión en tiempo
    real con el servidor. Reconectando…", overlay "Sin conexión con el servidor", read-only reason.
  - Clock and latency: the midpoint offset helper was promoted to `src/shared/lib/server-clock.ts`
    (`measureServerOffsetMs` → null when unreadable, `serverNowMs`, `remainingUntilMs`; third consumer; the simulator
    and evaluations copies were left untouched, no unrequested refactor). Server time: the envelope body `timestamp` of
    `GET /api/reservations/current` read through `httpClient` (`lab-clock.service`; the generic helpers drop it; the
    `Date` header is not CORS-exposed). `telemetry-latency` (pure): `latency = max(0, clientNow + offset − batch.serverTs)`,
    levels ok < 70 ms (70 % of the 100 ms threshold, a margin to react before the limit), warning 70–99, critical
    ≥ 100; nearest-rank p95 over a 3600-batch ring (~2 min at 30 batches/s). `useTelemetryLatency` commits every 500 ms
    (no render per batch) and measures nothing without an offset ("— (reloj sin sincronizar)"); the colour follows the
    session p95. Header countdown `remainingUntilMs(endsAt, now, offset)` (h:mm:ss / mm:ss).
  - Lazy boundary: `LazyLiveConsole` (React.lazy + retryImport + Suspense LoadingState) → `live-console.tsx`
    (`useRealConsoleAdapter` + `VentilatorConsole variant="live"`). `useRealConsoleAdapter` / `LIVE_UI_THROTTLE_MS` were
    REMOVED from the feature index: the adapter's `telemetry-alarms` value-imports `@shared/ventilator-console`, so every
    `/lab` page importing the index would have pulled the console. `lab-live.lazy-boundary.test.ts` walks the static
    import graph (type imports and dynamic imports excluded) from `pages/lab/{index,reservations/index,live/index}.tsx`,
    the feature index and the page module and asserts no `@shared/ventilator-console|waveforms|charts`, `chart.js`,
    `react-chartjs-2`; control: the lazily imported module does reach the console. RED observed by re-adding the old
    index export (4 failing, `telemetry-alarms.ts → @shared/ventilator-console`).
  - T3 review fix: W1 `usePreemptionNotice` v1.1 returns `expectOwnPreemption(ids) → undo`; `PreemptReservationDialog`
    v1.1 `onPreempting(ids)` is called BEFORE the confirm request (the realtime event can beat the response) and undone
    on failure; the reservations page wires it (backend follow-up in gaps). W2 dialog copy and success message state no
    count ("se desplazarán todas las reservas en conflicto en ese momento…", "Reserva creada. Se desplazaron las reservas
    en conflicto y sus titulares recibieron un aviso."); `onCreated()` without a count; race in gaps. W3 finite
    `PREEMPTION_NOTICE_AUTO_HIDE_MS` = 30 s. S1 `useDeviceStatus` v1.2 `seedTrusted` starts as
    `realtimeStatus === "authenticated"`. S2 the admin-only message also names "un grupo de docentes" (backend
    `holderRole = holderUser.role ?? group.role`, `reservation-views.service.ts:87`). S3 page test: teacher →
    teacher-held slot → 409 `reservations.conflict` `holderRole: TEACHER` → admin-only message, no preemption dialog.
  - T4 review fix: W1 the page offers no duration while `!calendar.data` and the create dialog (v1.2
    `durationsLoading`) shows "Comprobando la disponibilidad…" with Reservar disabled; S1 read-only occupied cells render
    their own time when rows are not aligned (calendar v1.3); S2 recorded in gaps; S3 `useCancelReservation` v1.1
    resolves right after the cancel and revalidates in the background.
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0 (0 problems); `npx vitest run src/features/ventilator-lab
    src/shared/realtime src/shared/lib` → 35 files, 255 tests passed; greps over `src/features/ventilator-lab pages/lab
    src/shared/lib/server-clock*`: sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0. The shared
    console was not modified (simulator/case-editor suites not re-run for this unit).
  - Test-first: RED observed for server-clock, telemetry-latency and live-session (modules missing), for the review
    fixes (11 failing: notice W1/W3, dialog W1/W2, calendar S1, cancel S3 (hang), page T3-W1 and T4-W1, device seed
    S1) and for the lazy boundary (see above); the T3-S3 page test passed at once (existing behaviour); the page and the
    live hooks tests were written after the code and passed on first run.
  - Size: ~1.9k authored lines incl. ~800 of tests and headers; one coherent unit (page + room + states + latency + lazy
    console) plus the small review fixes requested with it.
  - Deviations: access uses the backend `canControl` only (it already covers teacher/admin; the session role is not
    re-checked); staff without an active reservation get the no-reservation screen (no source to show); a join
    rejection re-reads the reservation instead of offering a retry button.
  - Pending manual: `/lab/live` with the backend and the real/fake device (join, no-data overlay after unplugging,
    reconnect, latency values at 60 msg/s, cross-origin envelope timestamp), bundle check that the `/lab` and
    `/lab/reservations` chunks do not contain the console (build by the author).
  - Commit: pending (author).

- T5 review fix (delegated writer, 2026-10-16, with T7). Route: delegated (2+ non-trivial files).
  - W1 (safety, shared console v1.5, generic): a parameter the source does not report has no base, so +/-, the wheel and
    EVERY key (incl. Home/End) are disabled and `adjust` is a no-op until the source reports it; CONFIRMAR can never send
    a value derived from `limit.min`. Test with `canControl: true` (source-state suite v1.1). Simulator/case-editor
    always report every parameter → unchanged.
  - W2 (`breath-detection` v1.1): flow read relative to a BASELINE (bias flow / leak / offset): the mean flow of the last
    200 ms when it differs from the mean of the 200 ms before by ≤ 0.5 L/min (two means, so noise cannot pass a decaying
    expiration as flat), tracked while an inspiration is sought, frozen during a candidate (applied when it is dropped)
    and during breaths; a candidate also needs a peak ≥ 6 L/min above the baseline (`confirmFlowLpm`) and is dropped
    after 300 ms without it (spikes, small shifts); the plateau uses its inspiration baseline. Tests: +3.5 L/min leak,
    −2.5 offset, 2 L/min ±1 noisy baseline with a 3.5 L/min 100 ms spike, patient-triggered effort (start ≤ 120 ms
    before the machine flow), fast (35 rpm, incomplete expiration) and slow (6 rpm) rates, apnea restart, missing peak
    sample. W3: `maxGapMs` 200 ms (4–10 periods at 20–50 Hz); a gap also clears the previous breaths (metrics null until
    a breath without a gap); 240 ms gap and single missing sample tested. S2: PEEP null without end-expiratory samples
    (ΔP null too).
  - W4: already covered by T6's `useTelemetryStale` (page: no batch for `telemetry.staleAfterMs` → `live` false →
    overlay + read-only; page test "greys the curves … on the stale timer"); not duplicated in the adapter, documented
    in the adapter header.
  - W5: `commit` clears the pending throttle timer before nulling it; test: a throttled commit of the previous source
    no longer overwrites the new source (failed before the fix: `{}` instead of `{peep: 8}`).
  - S1: ΔP described "Pplat menos la PEEP medida al final de la espiración (no es la PEEP total)". S3: frame alarm codes
    expire 5 s (`FRAME_ALARMS_TTL_MS`, frame server time) after the last frame carrying `alarms`, and are hidden while not
    live; the no-data / socket-lost read-only reasons now say the settings shown are the last ones the device reported.
    S4: own-key lookups (`hasOwnProperty`) for setting keys, alarm labels and severities. S5: `reduceReportedState`
    header corrected (same object only when no frame carries any field). S6: the no-data alarm is shown only once its
    start time is committed (one tick), never dated 0 (render-time `Date.now` and setState-in-effect are lint errors).
  - Test-first: RED observed for W1 (1 failing), W2/W3/S2 (7 failing) and W5/S3-hidden/S6 (3 failing); S1, S3 expiry and
    S4 tests were written before the code but run after it.
- T7 (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - Backend verified: `GET/POST/DELETE /api/ventilator/control`, `POST …/takeover`, `POST …/heartbeat` (openapi);
    `ventilator:control-changed {reservationId, operatorUserId, reason}` with six reasons; `decideControlRequest`
    (take: holders + staff when free; takeover: leader of the holder group or staff); release by the operator or staff;
    presence ends `VENTILATOR_OPERATOR_GRACE_SECONDS` (15 s) after the operator's last socket closes; heartbeat via HTTP
    or the `ventilator:heartbeat` socket message (both only cancel a pending release). Error codes
    `ventilator-commands.no_active_reservation|not_reservation_holder|control_locked|not_operator`.
  - `scripts/sync-lab-settings.mjs` v1.1 also vendors `VENDORED_LAB_BACKEND_DEFAULTS["control.operatorGraceSeconds"]`
    (`--check` up to date: 13 keys, 1 constant); heartbeat = grace / 3 (min 1 s) = 5 s.
  - `operator-control.entity` (pure): reducer for loaded / changed (every reason) / requested / succeeded / failed;
    events of another reservation and before the first read ignored; flags never widened locally (takeover kept only if
    the backend granted it); success never invents the state. Banner "Controlas el equipo" / "Opera: <name>" /
    "Control libre" / "Comprobando…"; `controlPermissions` (only the operator, and only live + socket); actions (take when
    free and allowed, takeover only with `canTakeover`, release only to the operator); Spanish errors by code.
  - `ventilator-control.service` (+ keepalive DELETE with the Bearer token); `useOperatorControl`: SWR read, event applied
    at once + re-read (also after each request and on socket re-authentication), heartbeat while operator (socket when
    authenticated, HTTP otherwise), stops when control is lost and on unmount; release on `pagehide`/unmount only when
    operator and only once; bfcache restore re-reads.
  - UI: `OperatorControlBar` (banner role status, Tomar / Quitar (ConfirmDialog) / Liberar, error alert) on `/lab/live`;
    `LiveConsole` v1.1 `canControl` → adapter; `onConfirm` still the adapter no-op (T8). Read-only reason precedence:
    socket lost > no data > control ("Opera: …" / "Toma el control para operar").
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab
    src/shared/ventilator-console src/shared/waveforms src/shared/sim-engine src/shared/realtime src/shared/lib` → 55
    files, 504 tests passed; `npx vitest run src/features/case-editor` → 6 files, 68 passed; `npx vitest run
    src/features/simulator` → 17/19 files green, 3 tests timed out under load (assist-panel 1, session-console 2), both
    files green alone (2 files, 46 passed) — same load flake recorded in T5; greps over `src/features/ventilator-lab
    pages/lab src/shared/ventilator-console`: sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0.
  - Test-first: RED observed for the control entity (module missing); the hook and page tests were written after the
    hook/component and passed after test-harness fixes (fake intervals need real-timeout polling).
  - Size: ~1.9k authored lines incl. ~900 of tests and headers (T7 ≈ 1.1k, T5 review fix ≈ 0.8k); one unit as requested.
  - Deviations: operator name only for the holder user (gap); heartbeat interval vendored (gap); the leave-page release
    uses the keepalive fetch also on SPA unmount (one code path).
  - Pending manual: two browsers (holder + leader/teacher) with the backend: take, takeover, release, closing the tab
    (release), socket down with HTTP up (superseded by the T7 review fix: no HTTP heartbeat), revoked operator (T9 modal).
  - Commit: pending (author).

- T8 + T6 review fix (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files; HIGH risk: hardware safety).
  - T6 review fix: W1 `lab-clock.service` v1.1 takes `CLOCK_SAMPLES` = 4 sequential samples and keeps the smallest
    round trip ≤ `CLOCK_MAX_ROUND_TRIP_MS` = 1 s (shared `pickClockSample`, `server-clock` v1.1; a 401-refresh retry is
    dropped by the bound; residual bias documented + gap). W2 `useServerClockOffset` v1.1 retries an unsynced clock
    (1 s doubling to 30 s) and measures again on every new socket authentication, keeping the previous offset meanwhile.
    W3 `useVentilatorRoom` v1.1 attributes a rejection to the reservation of the last join actually SENT (new generic,
    optional `onEmit` of `useEmitOnAuthenticated` v1.1). S1 comment in the preemption dialog (v1.2). S2 the latency shows
    "—" (level unknown) while the socket is down or the device has no data / is stale (page v1.2). S3 the p95 is truly
    session-wide: 1 ms histogram up to 2 000 ms + an overflow bin reported with the largest value seen (constant memory;
    `LATENCY_WINDOW` removed). S4 lazy-boundary test header lists its limits (regex, only `@shared/` `@features/`
    aliases, source graph not chunks). Backend follow-up recorded in gaps.
  - Mapper (`command-mapper.ts`, pure): console confirmation → `SendVentilatorCommandRequestDTO` (verified in openapi +
    backend validator): FiO2 % → fraction, flow trigger → `sensitivity` (backend validates it with the flow-trigger
    range), the rest 1:1; unchanged fields from the device-REPORTED frame settings (same names the backend matches for
    APPLIED); I:E dropped when RR/Ti change; on a mode change only the console fields are carried. Pressure decision: no
    console pressure, change into PCV/PSV refused, PEEP not offered in PCV/PSV (absolute `pressureLimit`, see gaps);
    mode options VCV/SIMV + the current pressure mode. Refusals (never a guess): no changes, unknown/unsupported mode,
    unmappable parameter, out of limits/non-finite, required field never reported, Te < 0.3 s, I:E > safety max,
    pressure limit ≤ PEEP; Spanish copy for each.
  - Limits (`buildCommandLimits`): vendored engine limits (`@shared/sim-engine` `VENTILATOR_LIMITS`, from the backend
    shared limits) ∩ `commands.safety.*` (platform settings for admins, vendored defaults otherwise), stricter wins:
    Vt 200–700 mL, FR 5–35, PEEP 0–15, FiO2 21–100 %, Ti 0.5–3 s, trigger 0.5–10 L/min (steps/units from the console
    binding).
  - State machine (`command-state.ts`, pure): one command at a time (a full setting set built while another is in
    flight would resend its old values), sending → awaiting (PENDING/SENT) → confirmed (ACKED/APPLIED) which ends only
    when the telemetry REPORTS the targets (5 % tolerance) or after `REPORT_WAIT_MS` = 5 s; REJECTED/TIMEOUT/failed/lost →
    per-parameter warning (tag "Rechazado: <motivo>") + notice, console free; statuses before the 202 buffered;
    statuses never go backwards; 429 blocks until Retry-After; the state never carries a display value.
  - Hook `useVentilatorCommands` (synchronous ref guard: a double click sends ONE request; reservation-keyed state;
    report kept outside React, no render per batch; status watchdog: still PENDING/SENT after `commands.ackTimeoutMs` +
    2 s → `GET …/commands?ids=` once, else "estado desconocido"; history `GET /api/ventilator/commands` limit 10 merged
    with live statuses). `command-messages.ts`: 403 (no reservation / not holder), 423, 503, 422 (each violation by rule in
    Spanish), 429 (Retry-After countdown), client timeout ("pudo haberse enviado", no retry: no idempotency key),
    status labels and reasons. `LiveConsole` v1.2: limits, `applicability`, mode options, in-flight, onConfirm;
    read-only with the reason while a command is in flight or a 429 wait runs; `CommandPanel` (notice, hint,
    "Comandos recientes"). Adapter/hook v1.2: optional `modeOptionsFor`. Shared console NOT modified.
  - Fake device (decision 7): `scripts/e2e/fake-ventilator.mjs` + pure `fake-ventilator-core.mjs` (mqtt from
    `../ventylab-server/node_modules` via createRequire; refuses without `--broker`/`FAKE_VENTILATOR_BROKER_URL` and
    always warns it must be a TEST broker; 60 frames/s default, R/C lung, `settings` reflected from the backend JSON
    command, optional ACK topic, `--reject`, `--stop-after`, `--pause after[:for]`), usage in `scripts/e2e/README.md`.
    Not run against any broker (only `--help` and the no-broker refusal were run). `vitest.config.ts` v1.13 includes
    `scripts/e2e/*.test.mjs` (tooling exception, decision 11).
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab
    src/shared/realtime src/shared/lib scripts/e2e` → 43 files, 383 tests passed; greps over
    `src/features/ventilator-lab pages/lab`: sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0 (also
    scripts/e2e, server-clock, use-emit-on-authenticated). The shared console was not modified (simulator/case-editor not
    re-run).
  - Test-first: RED observed for the latency histogram + `pickClockSample` (4 failing), W2/W3 hooks (3 failing), S2 page
    (1 failing), the command mapper (module missing) and the command messages (module missing); the clock service test,
    the command state tests and the hook tests were written before/with the code but not run RED first (the hook's 429
    countdown test then caught a stale-countdown bug, fixed); page T8 test and fake-core tests written with the code.
    Explicit test: APPLIED without a telemetry change leaves the displayed PEEP at 5; the telemetry change shows 6 (page
    test) and the state never carries a display value (state tests).
  - Size: ~3.1k authored lines in new files (≈1.4k tests, ≈0.5k fake device + README) plus ~0.3k of review fixes; one
    coherent unit as requested (mapper, state, hook, panel and console wiring are needed together to send anything).
  - Deviations: the console becomes read-only (with the reason) while ANY command is in flight, stricter than "the same
    params" (a full setting set sent meanwhile would revert the in-flight change); ACKED/APPLIED clear the tag only when
    the device reports the value (max 5 s); `--pause` takes `after[:for]` seconds.
  - Pending manual: commands against the fake device on a TEST broker (applied, `--reject` with/without ACK topic, 429 by
    rapid confirms, 503 with `--pause`), then the hardware protocol with the real ESP; 60 msg/s latency/fps.
  - Commit: pending (author).

- T9 + T7 review fix (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files; HIGH risk: W1 safety).
  - T7 review fix: W1 (safety) `useOperatorControl` v1.1 never sends an HTTP heartbeat: the socket message only while
    authenticated; while the socket is down the backend grace runs; the state is re-read after re-authentication;
    header documents that a beat only cancels a pending release and `lastSeenAt` is not used for expiry (S4); backend
    follow-up in gaps. W2: the leave-page release is sent only when operator AND the socket is authenticated AND the
    state was re-read since the last authentication (auth epochs; a stale "operator" never sends the staff-capable
    DELETE). S1: the state follows the SWR `data` (effect) plus the result of each explicit re-read (an identical answer
    keeps the data reference). S2: `pageshow` persisted dispatches `suspended` (state unknown, not operator) before the
    re-read. S3: `OperatorControlBar` v1.1 closes the takeover confirmation when `actions.takeover` becomes false. S5:
    no HTTP heartbeat is left, so a failed heartbeat cannot happen; every control request already re-reads (finally),
    and `useVentilatorCommands` v1.1 re-reads the control state after a command refused with `not_operator`. S6:
    recorded here — `breath-detection` `maxGapMs` 200 clears the metrics after a lost batch (conservative by design:
    "—" until a breath without a gap, never a metric across a hole).
  - Backend verified (`operator-control.service.ts`, `ventilator-commands-events.ts`, handlers): six reasons; preempted
    → `revokeForReservation(reservation_preempted)`; cancelled/completed or the refresh finding another active
    reservation → `reservation_ended`; takeover REASSIGNS the operator and keeps the reservation (so it is a notice, not
    the modal); presence_timeout and released free the control with the reservation running.
  - `control-revocation.entity` (pure): sources → `{reason, detail}` (control-changed reservation_preempted/ended of the
    session reservation; `reservation:preempted` with the backend reason; countdown ≤ 0 on the server clock; a re-read
    no longer giving the caller the session reservation → `session_changed`), priority merge (preempted > ended > time up
    > changed), modal copy per reason, "Motivo: …", successor ONLY from the re-read projection
    (`reservationHolderText`: name/group for staff, occupancy label for students; "El ventilador quedó sin reserva
    activa."), next action watch only for ANOTHER active reservation with `canControl` (a re-read still returning the
    ended one leaves), loss notice copy. `operator-control.entity` v1.1: `loss` (takeover/taken by someone else,
    presence_timeout, released by someone else, `lost` on a re-read of the same reservation; never the own release or
    the end of the reservation), `dismissLoss`, `suspended`.
  - `/lab/live` v1.3: the session reservation is kept in page state (derived during render from the reads, no effect)
    while its end is explained; `ControlRevokedDialog` (no Escape/backdrop close, single "Entendido"); console stays
    visible read-only (reason "La reserva de esta sesión terminó…"), no room re-join, no release on leaving
    (`releaseOnLeaveEnabled: false`: the backend releases it and a late staff DELETE could hit the next reservation);
    the in-flight command keeps its status (commands hook `canSend` false, state kept). "Entendido" → `read()` (new on
    `useCurrentReservation` v1.1) → watch (LiveSession remounted by key for the new reservation; read-only until the
    control is taken) or `router.push("/lab")`; a failed read shows a Spanish error and the same button retries. The
    preemption toast of the session reservation is suppressed (`expectOwnPreemption`) since the modal is the notice.
    Takeover / presence timeout / release by staff → non-blocking notice in the control bar ("Puedes volver a tomarlo
    con «Tomar control»." only when the backend allows a take).
  - Pending edits dropped: generic, optional shared console change (contract v1.5, controls v1.6, console v1.5):
    `permissions.pendingResetKey`; a change resets the controls reducer without emitting. The live page keys it
    "operator" / "viewer" / "ended", so losing the operator role or the session drops the edits. Adapter v1.3, hook
    v1.3, LiveConsole v1.3 pass it through. Simulator/case-editor never set it (unchanged).
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/features/ventilator-lab
    src/shared/ventilator-console src/shared/realtime src/shared/lib scripts/e2e` → 53 files, 494 tests passed (a first
    run had the first live-page test time out at the 10 s lazy-load wait under load; `LOAD_TIMEOUT` raised to 20 s, the
    re-run is the one quoted); `npx vitest run src/features/case-editor` → 6 files, 68 passed; `npx vitest run
    src/features/simulator` → 17/19 files, 3 tests timed out under load (assist-panel 1, session-console 2), both files
    green alone (2 files, 46 passed) — the same load flake recorded in T5/T7; greps over `src/features/ventilator-lab
    pages/lab src/shared/ventilator-console`: sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0.
  - Test-first: RED observed for the revocation entity (module missing), the control entity loss/suspended tests (7
    failing), the hook W1/W2/S2/T9 tests (4 failing), S5 (1 failing), the bar S3/notice tests (2 failing) and the
    shared `pendingResetKey` test (1 failing); S1's hook test passed before the fix (the authenticated re-read already
    loaded the second consumer: not a RED). Page tests (preemption → modal → leave; staff → watch; countdown → modal →
    leave; takeover → notice; presence timeout → notice + take) were written after the page and passed after one query
    fix (`hidden: true` behind the modal).
  - Size: ~1.5k authored lines incl. ~700 of tests and headers; one unit as requested (the review fix and T9 share the
    control hook, entity and bar).
  - Deviations: a staff/group re-read that ends the session without an event shows the neutral "La sesión de esta
    reserva terminó" (no reason guessed); a loss after a bfcache restore is not reported as a notice (the state was
    marked unknown first); `sendControlHeartbeat` stays in the service unused (no HTTP beat).
  - Pending manual: with the backend, two browsers: preempt a student's running session (modal, successor label, /lab),
    teacher watching through the change of reservation, end by countdown, takeover notice, presence timeout after
    closing the socket for > 15 s (DevTools offline) and "Tomar control" again.
  - Commit: pending (author).

- T8 review fix (delegated writer, 2026-10-16; the review said CHANGES_REQUIRED). Route: delegated (2+ non-trivial
  files; HIGH risk: B1 hardware safety).
  - B1 (blocker): backend checked (`ventilator-command-validator.ts`, `docs/ventilator/commands.md`): `flowRate` is only
    range-checked and nothing says the device derives it, so `command-mapper` v1.1 REFUSES a Vt or Ti change while the
    device reports `flowRate` (refusal `fixed_flow`, Spanish copy naming the flow); RR/PEEP/FiO2/trigger changes still
    carry the reported flow; a mode change carries only console fields (no flow), so it is not refused.
  - W1: every target keeps its pre-command reported value (`base`); `reportMatchesTargets` needs the report within 5 %
    AND strictly closer to the target than to the base (Vt 450 → 460 with 450 or 455 reported is not applied).
  - W2: `command-messages` v1.1 flags `network.unavailable` and 500/502/504 as `mayHaveBeenSent` (own copy); the state
    machine keeps such a command locked in the new `uncertain` phase (tag "pudo haberse enviado; esperando al equipo",
    busy reason) until the device reports the targets or `uncertain-expired` (hook: ackTimeoutMs + 2 s + 5 s). The hook
    watchdog (v1.2) now covers PENDING and SENT commands with an id, looks them up again with backoff 1→8 s while
    non-terminal or failing, and declares them lost only after a 30 s window.
  - W3: after REPORT_WAIT_MS a confirmed change no longer frees sending: `unreported` blocks it (reason "El equipo aceptó
    el último cambio pero aún no informa esos valores…", tag per parameter) until a device report shows the accepted
    values; a new reservation resets it.
  - W4: fake device v1.1: refuses a non-localhost broker unless `--allow-remote-test-broker`, always refuses the
    host:port of the backend `.env` `MQTT_BROKER_URL`/`MQTT_URL` (never printed; the startup line prints only the
    host); default topics `test/ventylab/ventilab/device/001/command` (verified: backend `applyTestTopicPrefix` with
    NODE_ENV=test, default prefix `test/ventylab`) and `test/ventylab/ventynet/data` (the backend does NOT prefix
    telemetry: the TEST backend sets `MQTT_TELEMETRY_TOPIC`); an override without the prefix warns. README updated.
  - S1 gap recorded + hook comment. S2 refusal `reported_mode_unsupported` ("El equipo informa el modo CPAP, que esta
    consola no puede comandar: elige VCV o SIMV…"). S3 refusal `reported_ie_inconsistent` (reported I:E vs reported
    FR/Ti beyond the backend 5 %), with the way out (change FR or Ti, which drops the reported I:E). S4
    `useServerClockOffset` v1.2: a new authentication resets the backoff, retries stop after `CLOCK_MAX_ATTEMPTS` = 6
    failed rounds ("— (reloj sin sincronizar)" until the next authentication). S5 documented (hook header): the
    session p95 deliberately keeps the latency bursts after a reconnection (the backlog is what the operator saw).
  - Test-first: RED observed for the mapper (B1 ×2, S2, S3, W1 ×2: 6 failing) and S4 (2 failing); then the state
    W2/W3 tests (2 failing) and the messages W2 tests (4 failing). The hook W2 tests (SENT keeps locked, lost after the
    window with fake timers, lost connection → uncertain) were written after the hook change (not RED first). Two
    existing tests updated to the new behaviour (I:E 0.5 → 0.3 consistent value; targets now carry `base`).
  - Files: `command-mapper.ts`/`.test.ts`, `command-state.ts`/`.test.ts`, `command-messages.ts`/`.test.ts`,
    `use-ventilator-commands.ts`, `ventilator-commands.test.tsx`, `use-telemetry-latency.ts`, `live-hooks.test.tsx`,
    `scripts/e2e/fake-ventilator.mjs`, `fake-ventilator-core.mjs`/`.test.mjs`, `scripts/e2e/README.md`.
  - Commit: pending (author).

- T10 Recording (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - Contract verified (openapi + backend): `POST /api/ventilator/telemetry/recordings/start|stop`, no body, data null;
    access = `TelemetryRecordingAccessService` (holder user / holder-group member, TEACHER, ADMIN), the same rule as
    `canControl` of the current reservation; 409 `ventilator-telemetry.no_active_reservation`, 403
    `ventilator-telemetry.recording_forbidden`; both idempotent; no status read and no event (gap).
  - `session-recording.entity` (pure): `recordingAllowed` (canControl of the session reservation, still the current
    one, not ended), state machine idle → starting → recording → stopping (failed start → idle, failed stop → stays
    recording: outcome unknown), Spanish errors (409 / 403 / 404 / connection and 5xx: "repetirlo es seguro" because
    both are idempotent / generic lab messages). `telemetry-recording.service`; `useSessionRecording` (ref guard: one
    request per click burst; reads idle while not enabled).
  - UI: `RecordingControl` under the control bar ("Grabar sesión" → "Detener grabación" behind a ConfirmDialog, hint
    that it stops with the reservation and that REC is local to the tab, dismissable error); `RecIndicator` ("REC" with a
    blinking dot, `role=status`, "Grabando la sesión") in the shared console HEADER slot (`header` prop, no shared
    change) via `LiveConsole` v1.4; page v1.4 computes `recordingAllowed` from the latest read. Styles in
    `lab-live.module.css` v1.3 (tokens only).
  - REC for everyone present: NOT possible without a shared signal; shown only to the tab that started it (gap).
  - Checks (whole unit: T8 review fix + T10): `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run
    src/features/ventilator-lab src/shared/ventilator-console src/shared/realtime src/shared/lib scripts/e2e` → 55
    files, 542 tests passed (exit 0); greps over `src/features/ventilator-lab pages/lab` (+ scripts/e2e for the header):
    sx/style/styled 0, hex/rgb in CSS 0, files without the author header 0. Shared console not modified (simulator /
    case-editor not re-run). Fake device: only `--broker mqtt://remote.example.org:1883` and `--broker "not a url"` run
    (both refused, nothing started); never against a broker.
  - Test-first: RED observed for the entity (module missing); the component/hook test (start once on a double click,
    REC, stop only after confirming, cancel keeps recording, 409/403/404/connection copy, failed stop keeps REC,
    nothing sent while disabled) and the page tests (toggle for holder and teacher, none without canControl, none after
    the session ended, REC inside the console header) were written after the code and passed.
  - Pending manual: with the backend, start/stop as student holder, group member and teacher; reload while recording
    (REC lost, recording continues: gap); stop from another tab; recording auto-stop at the end of the reservation, then
    the recording visible in T11.
  - Commit: pending (author).

- T9 review fix (delegated writer, 2026-10-16; the review said CHANGES_REQUIRED). Route: delegated (2+ non-trivial
  files; HIGH risk: B1 ends a session).
  - B1 (blocker): `live-session.entity` v1.1 `sessionRemainingMs(endsAt, now, clock)` returns null unless the server clock
    is `synced`; `/lab/live` v1.5 uses it, so the countdown shows "—" and can never end the session while the clock is
    pending or unsynced (the browser clock never decides). Tests: entity (pending, unsynced, synced) + page (reservation
    already past its end on the browser clock: unsynced → no modal, "—"; pending (clock samples never answer) → same).
  - W1: `useCurrentReservation.read()` v1.2 requests through `readCurrentReservationResult` (reservations service v1.3),
    stores the answer with `mutate(result, {revalidate: false})` and rejects on failure (SWR's bound mutate resolved with
    the stale cache), so `REVOCATION_COPY.readError` is reachable and stale data never decides watch/leave.
  - W2: `useOperatorControl` v1.2 re-reads through `readControlStateResult` (control service v1.1) with a per-hook
    sequence number bumped on each re-read and each `ventilator:control-changed`; only the latest answer is applied
    (and written to the SWR cache) and only it can verify the auth epoch; a failed re-read verifies nothing.
  - W3: `operator-control.entity` v1.2 clears `ownRelease` on a take/takeover request and when a `changed` event makes
    the caller the operator. S1: `suspended` keeps `suspendedOperator`, so the first re-read after a bfcache restore
    reports a loss (the T9 deviation "loss after a bfcache restore is not reported" is now fixed).
  - S2: "Entendido" → `/lab` via `router.push`; resolved false or rejected → `leaving` reset (dialog open again) and
    `window.location.assign("/lab")` (simulator pattern). S3: page test, no DELETE after the session ended (pagehide +
    unmount). W4 ignored as instructed.
  - Test-first: RED observed for B1 (entity 2 failing; page 2 failing against the old line, checked by a temporary
    revert), W1 (read resolved with the cache), W2 failed re-read (release sent), W3 and S1 (entity, 2 failing), S2 (page,
    failing against the old navigation). The overlapping re-read test passed before the fix (SWR's own race guard
    covered that order); S3 is a coverage test of existing behaviour.
- T11 Recordings list + playback (delegated writer, 2026-10-16). Route: delegated (2+ non-trivial files).
  - Contract verified: `GET /api/ventilator/telemetry/recordings/{reservationId}` (`TelemetryRecordingDTO`:
    reservationId, sampleRateHz, chunkCount, frames ordered by server time; the backend use case decodes every chunk;
    403 `ventilator-telemetry.recording_forbidden`, 404 `ventilator-telemetry.reservation_not_found`; a reservation
    without chunks → 200 with no frames). No list, no CSV (gaps above).
  - `/lab/recordings` (thin route; `LabRecordingsPage`): `recordings-list.entity` (31-day windows, started reservations
    starting inside the window, staff all / student full projection, newest first, backend holder text, reservation
    duration, status, `/lab/recordings/{id}`), `useRecordingsList` (calendar, no focus revalidation); "31 días anteriores
    / siguientes", the visible note on what can be listed (+ the student line), skeleton / retryable error / empty.
  - `/lab/recordings/[recordingId]` (thin route keyed by id; `LabRecordingPage`): `useRecording` (one download: no
    focus/reconnect/stale revalidation, no error retry); 403 / 404 cards with the Spanish message and the way back (no
    console loaded), no-frames card, otherwise a dark session header (date of the first frame, length, "Datos
    submuestreados por el servidor a N Hz.") and `LazyRecordingPlayer` (React.lazy + retryImport).
  - Player chunk (`recording-player.tsx`): `useRecordingIndex` indexes the frames in chunks of 5000 with `setTimeout 0`
    between chunks (progress "Preparando la grabación… N %"; pure `recording-index`: times on the server time, console
    samples, SpO2/PCO2 carried forward, invalid / out-of-order frames dropped, binary search); `useRecordingPlayback`
    drives the pure `playback-engine` (anchor position + wall clock × speed ×0.5/×1/×2/×4, seek → new generation, end
    pauses, play from the end restarts): a 50 ms ticker hands the newly reached samples synchronously to the console
    listener (ring by reference, no React render per frame) and to the T5 breath detector; React commits every 250 ms
    and on every action; each generation is a new frame source `reservationId:recording:N` (curves restart, as the
    simulator replay), replaying its last 10 s (preroll) to a late subscriber; adapter = `buildRealConsoleAdapter` with
    `canControl: false`, no-op confirm, read-only reason "Reproducción de una grabación: solo lectura.", no settings /
    mode / alarms, patient monitor only with reported SpO2/PCO2. `PlaybackTransport`: play/pause, speed buttons
    (aria-pressed), range time bar (step = sample period), clock "mm:ss / mm:ss".
  - Lazy boundary test v1.2: the two recordings routes and pages added (no console / waveforms / charts statically),
    plus the control that `recording-player.tsx` reaches the console and is only imported dynamically. RED observed by
    importing the player statically in the playback page (7 failing).
  - Checks (whole unit: T9 review fix + T11): `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run
    src/features/ventilator-lab src/shared/ventilator-console src/shared/realtime src/shared/lib scripts/e2e` → 60 files,
    588 tests passed; greps over `src/features/ventilator-lab pages/lab`: sx/style/styled 0, hex/rgb in CSS 0, files
    without the author header 0. Shared console not modified (simulator / case-editor not re-run). A pre-existing T8 live
    page test logs an msw "unhandled DELETE /api/ventilator/control" on unmount (passes; not from this unit).
  - Test-first: RED observed for the playback engine and the recordings list entity (modules missing) and the lazy
    boundary (see above); the recording index, the playback hooks and the page tests were written after the code and
    passed on first run (the page 403 test needed one query fix: two "Volver" links).
  - Size: ~2.1k authored lines for T11 (about 0.9k of tests, headers included) + ~0.4k for the T9 review fix; one unit
    as requested (list, playback page, player chunk and transport are needed together for a usable page).
  - Deviations: no per-row probing (each probe would download a whole recording); the row duration is the reservation
    window; seeks are not debounced (each one only slices up to 10 s of preroll); the patient monitor appears from the
    first reported SpO2/PCO2 at the playback position.
  - Pending manual: with the backend, a recorded reservation (T10) listed and played as student holder, group member,
    teacher and admin; a long recording (30 min at 20 Hz = 36k frames) to check the download time and that the indexing
    does not freeze the page; bundle check that `/lab/recordings` does not contain the console (build by the author).
  - Commit: pending (author).

- T8 review fix 2 (delegated writer, 2026-10-16; the re-review said CHANGES_REQUIRED). Route: delegated (2+ non-trivial
  files; HIGH risk: B1 hardware safety).
  - B1 (blocker): `command-mapper` v1.2 refuses a Vt or Ti change whenever the device REPORTS a finite `flowRate`,
    whatever the mode (also VCV → SIMV and Ti in PCV): the backend `hex-command.encoder.ts` never encodes `flowRate`, so
    the device keeps its own flow and a mode change (which drops it from the DTO) no longer escapes the refusal. The
    reported `flowRate` is still carried in the DTO while the mode is unchanged (harmless: range-checked by the backend,
    ignored by the encoder; documented in the header). The old test "drops the flow on a mode change … does not refuse"
    was flipped.
  - W6: `command-state` v1.2: `submitted` records `knownIds` (the history ids the hook read + the session ids); while
    uncertain, a REJECTED of a NEW command id (buffered in `early`) ends the wait at once with the reason (also when it
    arrived before the failure). At the end of the wait the hook (v1.3) reads GET /api/ventilator/commands again and
    the reducer looks for a new record with the same parameters plus the new buffered statuses: ACKED/APPLIED →
    `unreported` block; REJECTED/TIMEOUT → freed with the reason; history unreadable or still PENDING/SENT → blocked as
    unknown (`accepted: false`, own busy reason); no trace → freed, tag "no se envió", notice "El servidor no registró
    el último cambio…".
  - W5: explicit way out `use-reported`: «Usar los valores que informa el equipo» in `CommandPanel` v1.1 (with an
    explanation; only for the operator, only with nothing in flight; `LiveConsole` v1.5, hook `canUseReported` /
    `onUseReported`, CSS `.useReported` in `lab-commands.module.css` v1.1). It only re-enables sending: a command is
    always built from the reported values. The automatic lift "report moved away from the base" was deliberately NOT
    added: a report taken mid-change (e.g. a ramp) would let a command rebuilt from it revert the accepted change.
  - S6: fake core v1.2: localhost / 127.0.0.1 / ::1 compare as one host; `BACKEND_ENV_FILES` (.env, .env.local,
    .env.development) are all compared when present (the message names file + variable, never the value);
    `fake-ventilator.mjs` v1.2 reads them, README v1.2. S7: the unreachable `mayHaveBeenSent` branch of a definite
    failure removed.
  - Test-first: RED observed for B1 (2 failing: Vt/Ti on a mode change; the PCV case passed already), S6 (4 failing),
    the state W5/W6 tests (9 failing, incl. the updated expiry expectation) and the hook W6 tests (2 failing; the "no
    trace" hook test passed before the change). The `CommandPanel` test was written with the component (not run RED).
  - Files: `command-mapper.ts`/`.test.ts`, `command-state.ts`/`.test.ts`, `use-ventilator-commands.ts`,
    `ventilator-commands.test.tsx`, `command-panel.tsx`, new `command-panel.test.tsx`, `live-console.tsx`,
    `UI/lab-commands.module.css`, `scripts/e2e/fake-ventilator.mjs`, `fake-ventilator-core.mjs`/`.test.mjs`,
    `scripts/e2e/README.md`.
  - Pending manual: with the fake device on a TEST broker, a send cut by DevTools offline (uncertain → history →
    blocked / freed) and «Usar los valores que informa el equipo» after a clamp (`--reject` does not clamp: manual).
  - Commit: pending (author).

- T10 review fix (delegated writer, 2026-10-16; the review approved with suggestions). Route: delegated (with T8 review
  fix 2).
  - S8: `session-recording.entity` v1.1 `recordingStopEnded` (409 / `no_active_reservation`) → `stop-ended`: idle with
    the note "No hay una reserva activa del ventilador: el servidor ya detuvo la grabación…" (other stop failures still
    keep REC: outcome unknown). `useSessionRecording` v1.1 uses it.
  - S9: when `enabled` turns false while this tab was recording, the hook returns `note` ("Ya no puedes controlar la
    grabación de esta sesión desde esta pestaña. Si la reserva sigue activa, la grabación continúa en el servidor…")
    and `/lab/live` v1.6 shows it under the control bar (REC itself is hidden as before).
  - Test-first: RED observed for S8 (entity + component, 2 failing) and S9 (component, 1 failing). The existing
    "failed stop keeps REC" test now uses a 500 (a 409 means the recording already ended). `RecordingControl` tests
    got a 20 s describe timeout (the first one timed out at 5 s under the full parallel run).
  - Files: `session-recording.entity.ts`/`session-recording.test.ts`, `use-session-recording.ts`,
    `recording-control.test.tsx`, `pages/lab-live.page.tsx`.
  - Checks (whole unit: T8 review fix 2 + T10 review fix): `npm run typecheck` exit 0; `npm run lint` exit 0; `npx
    vitest run src/features/ventilator-lab src/shared/ventilator-console src/shared/realtime src/shared/lib
    scripts/e2e` → 61 files, 606 passed / 5 failed, all 5 timeouts under load (343 s run): re-run alone, the five files
    → 66/67 (recording-control first test timed out at 5 s → describe timeout raised), then components + entities +
    scripts/e2e → 304/305 (reservation-calendar, not touched, timed out) and reservation-calendar alone → 3/3 passed;
    greps over `src/features/ventilator-lab pages/lab`: sx/style/styled 0, hex/rgb in CSS 0, files without the author
    header 0 (+ scripts/e2e). Shared console not modified. The fake device was not run against any broker.
  - Commit: pending (author).

- T11 review fix (delegated writer, 2026-10-16, with T12; the review said APPROVED_WITH_WARNINGS). Route: delegated.
  Command files (`command-mapper`, `command-state`, `use-ventilator-commands`, `command-panel`) NOT touched (another
  review ran on them in parallel).
  - W1+W2: `useRecording` (use-recordings v1.1) no longer uses SWR: an effect with an AbortController (aborted on
    unmount / new id / reload) calls the new `fetchTelemetryRecording(reservationId, signal)` (telemetry-recording
    service v1.2, slow timeout, outside every cache), downloads again on every visit, indexes in chunks (setTimeout 0)
    and keeps ONLY the index (state `loading | indexing(progress) | ready(index) | error`); the raw frames live in the
    effect closure until indexed. `useRecordingIndex` removed from use-recording-playback; the page shows the indexing
    progress; `RecordingPlayer` v1.1 receives the index.
  - S1: `recording-index` v1.1 lists the gaps (kept frames further apart than `gapThresholdMs` = 5 sample periods, min
    1 s) in playback time (`gaps`, `gapsTotalMs`, `gapAt`); nothing is compressed. `useRecordingPlayback` v1.1: inside a
    gap the console frame status is "no-data" with "Sin datos grabados en este intervalo…" (`inGap`). Transport v1.1:
    gaps marked on the time bar (SVG rects positioned by attributes, no inline style) and listed ("Intervalos sin datos:
    mm:ss–mm:ss."). Header (page v1.1): "Duración: 01:05 (incluye 1 intervalo sin datos, 00:55 en total)".
  - S2: default playback clock `performance.now` (monotonic). S4: header length from `index.durationMs` and date from
    `index.startServerTs`.
  - S3 (DEVIATION): a CANCELLED/PREEMPTED-before-start row cannot be detected (no cancel/preemption time in
    `ReservationDetailDTO`; verified in the backend: `getInRange` returns every status, `cancel()` only sets the
    unprojected `updatedAt`); filtering every CANCELLED/PREEMPTED row would hide real recordings of sessions ended
    early, so those rows are kept with the note `endedEarlyNote` (recordings-list entity v1.1, page v1.1); gap recorded.
  - T9 residual: `useOperatorControl` v1.3 — the SWR `data` effect is ignored while a `ventilator:control-changed` event is
    newer than the last applied re-read answer (`lastEventSeqRef` vs `appliedSeqRef`), so a reconnect / focus
    revalidation answering an older state never overrides the event; the event's re-read decides.
  - Test-first: RED observed for the index gaps (3 failing), the recordings-list note (1 failing) and the T9 residual
    (reconnect revalidation brought back "student-2", 1 failing). The useRecording (abort on unmount, refetch on revisit,
    chunked index without raw frames, reload), the playback gap / performance.now tests and the page gap test were
    written before the code but run after it (not RED observed).
  - Files: `api/services/telemetry-recording.service.ts`, `application/entities/recording-index.ts`/`.test.ts`,
    `recordings-list.entity.ts`/`recordings-list.test.ts`, `application/hooks/use-recordings.ts`,
    `use-recording-playback.ts`, `recording-playback.test.tsx`, `use-operator-control.ts`, `operator-control.test.tsx`,
    `application/components/recording-player.tsx`, `playback-transport.tsx`, `application/pages/lab-recording.page.tsx`,
    `lab-recordings.page.tsx`, `lab-recordings.page.test.tsx`, `UI/lab-recordings.module.css`.
  - Commit: pending (author).

- T12 Redirects, nav, parity, docs, final verification (delegated writer, 2026-10-16). Route: delegated.
  - Redirect: `pages/simulador/index.js` v3.0 is now only a server-side temporary redirect to `/lab`
    (`getServerSideProps` → `legacyLabRedirect("/simulador")`, new `application/config/legacy-redirects.ts`, exported by
    the feature index v1.5; same pattern as `pages/teaching/index.js` R1). Not permanent while the legacy code exists.
    The connection console was a tab of that single page (no own URL) → `/lab`; no legacy reservation route existed.
    Legacy components untouched (P2).
  - Landing targets: `pages/dashboard/index.js` v1.1 `/simulador` → `/lab` (pure target change, same final destination).
    NOT changed (listed for P2 in the parity doc): `Sidebar.jsx:49` ("Simulador Virtual": label mismatch, not a pure
    target change), `PanelSidebar.jsx:268` ("back to student view" = student home), `redirectByRole.js` (no importer:
    dead code), `auth-config.js:65` `PROTECTED_ROUTES` and `routes.config.ts:44` `/simulador` (route still exists).
  - Nav: `nav.config.ts` v1.9 "Ventilador real" `/simulador` (students) → "Laboratorio" `/lab` (every role) with
    `indicator: "ventilatorDevice"`; new generic optional `indicator` slot. New `src/shared/layouts/nav-indicators.ts`:
    `useVentilatorDeviceIndicator(enabled)` = two socket listeners (`ventilator:connected/disconnected`) on the
    RealtimeContext only (no HTTP, no console, no feature import; works without a provider), "Equipo en línea" /
    "Equipo sin datos", forgets the last event when the socket stops being authenticated. `AppShell` v1.5 renders the
    indicator (dot + text, `data-indicator-tone`), hook enabled only when the item is in the role's nav; CSS
    `app-shell.module.css` v1.2 (tokens only). Tests: nav.config v1.9, new nav-indicators.test.tsx, layouts.test v1.2.
  - Docs: `odd/ventilator-lab-parity.md` (22 legacy capabilities + routes/links, new capabilities, pending, 8 manual
    checks); `docs/hardware-test-protocol.md` (front steps A1–A9 with the custodian, fake device on a TEST broker,
    performance protocol C1–C4, results template; links the backend protocol); `docs/perf/README.md` (where results go,
    all pending). No result fabricated.
  - Test-first: RED observed for the redirects (2 failing: page files) and the nav (3 + 1 failing); nav-indicators
    tests written before the hook (module missing).
  - Final verification (2026-10-16; another writer was running vitest on the command files in parallel, so the
    machine was loaded):
    - `npm run typecheck` exit 0; `npm run lint` exit 0; `npx eslint pages/simulador/index.js pages/dashboard/index.js`
      exit 0.
    - `npx vitest run src/features/ventilator-lab` → 44 files, 464 passed / 8 failed, all under load (timeouts, plus
      lab-live assertions failing while a 5-s wait expired); re-run alone: lab-live 22/22; lab-recordings + lab-home +
      operator-control-bar + reservation-calendar 18/19 (calendar timeout) → calendar alone 3/3; lab-reservations
      14/15 (week/day navigation 30 s timeout; the same file passed 15/15 earlier in a lab-live + reservations run,
      37/37).
    - `npx vitest run src/shared/ventilator-console src/shared/waveforms src/shared/realtime src/shared/lib
      src/shared/layouts src/shared/session scripts/e2e` → 34 files, 362 passed / 1 failed (nav-badges 5 s timeout);
      nav-badges alone 6/6.
    - `npx vitest run src/features/simulator` → 19 files, 187 passed / 10 failed (load timeouts in assist-panel,
      session-console, session-result, simulator-catalog, register-exam-practical-slot); re-run alone: assist-panel +
      session-console 46/46, session-result + catalog 20/20, register-exam-practical-slot 1/1.
      `npx vitest run src/features/case-editor` → 6 files, 68 passed.
    - Greps: `sx=|style=\{|styled\(` over `src/features/ventilator-lab pages/lab` → 0; hex/rgb in
      `src/features/ventilator-lab` *.module.css → 0 (and `app-shell.module.css` → 0); files missing "Autor: Marcela
      Mazo Castro" in `src/features/ventilator-lab pages/lab src/shared/layouts` (.ts/.tsx/.css) → 0; the new/changed
      pages and docs carry it too.
    - `git diff --stat HEAD -- src/shared/ventilator-console` → 12 files, 323 insertions, 59 deletions, all from earlier
      units (T12 did not touch it), each generic, additive and optional: T5 contract v1.4 (`capabilities.patientMonitor`,
      `permissions.readOnlyReason`, `settings.inFlight`, `frames.status`/`statusMessage` overlay, derived-metric
      marker/label override, "—" for unreported parameters, generic `pco2` vital: entity, console, controls, curves,
      monitor, value tile, config, index, 4 CSS files); T5 review fix W1 controls v1.5 (no adjust without a reported
      base); T9 `permissions.pendingResetKey` (controls v1.6, console v1.5). Simulator / case-editor never set them.
  - Not run (forbidden for the writer): `npm run build` / `next build` and the bundle measurement.
  - Commit: pending (author).

- T8 review fix 3 (delegated writer, 2026-10-16; the re-review said APPROVED_WITH_WARNINGS). Route: delegated (2+ non-trivial files; HIGH risk, hardware safety). It ran in parallel with the T12 writer, restricted to the command files.
  - W1: `command-state` v1.3 keeps accepted values as `abandoned` after «Usar los valores que informa el equipo» (`certain` false for an unknown outcome). They clear when a report shows them, when a later command is ACKED/APPLIED, or on a new reservation. While blocked, `commandNoticeView` (the hook's `notice`) names each one ("Vt: aceptado 600 mL, el equipo informa 500 mL — el próximo comando enviará 500 mL"). `carriedValues` lists the values a command would carry that differ from an abandoned one. The hook (v1.4) does not send it the first time (`carry-warned`, a warning listing them) and sends it only when the identical change is confirmed again (`carryKey` / `carryAcknowledged`). A hard refusal unless the parameter is edited was rejected: the console only emits values that differ from the reported one, so "keep the reported value" could never be confirmed. The shared confirmation dialog is generic. `CommandPanel` v1.2 hint updated.
  - W2: only an early REJECTED/ACKED of a new command whose `userId` (backend `VentilatorCommandStatusPayload.userId`) is the caller (`callerId` from `useSession`) resolves an uncertain send. Teachers and admins receive every status; otherwise the history record (id + params) decides.
  - W3: `command-mapper` v1.3 comment corrected. The default encoder is JSON (`env.validation.ts` `VENTILATOR_COMMAND_ENCODING`), and `json-command.encoder.ts` sends `flowRate`; only hex omits it. VCV↔SIMV carries the reported `flowRate`. Vt/Ti changes stay refused under a reported flow (B1).
  - Pre-existing (safety): an FR/Ti change while the device reports an I:E but not the other timing value is refused (`ie_ratio_without_timing`). The backend never derives Ti from I:E.
  - S2 documented as a known limitation: Ti not editable in PCV while a `flowRate` is reported.
  - S1: fake core test v1.3, the `::1` cases match `/backend \.env/`.
  - Pre-existing: `reset` keeps the unreported block and the abandoned values within the reservation; a command in flight becomes a block. Per-tab limitation documented.
  - Pre-existing: a TIMEOUT history match keeps sending blocked as unknown ("Sin confirmación del equipo (…)", tag "sin confirmación del equipo"; the button is the way out). The live TIMEOUT path is unchanged (follow-up).
  - Test-first: RED observed for the mapper (3), state (9) and hook (2) tests. The S1 and `CommandPanel` tests were not run RED. The first hook test got a 5 s `waitFor` (cold msw under the full run).
  - Files: `command-mapper.ts`/`.test.ts`, `command-state.ts`/`.test.ts`, `use-ventilator-commands.ts`, `ventilator-commands.test.tsx`, `command-panel.tsx`/`.test.tsx`, `scripts/e2e/fake-ventilator-core.test.mjs`.
  - Checks: `npm run typecheck` exit 0; `npm run lint` exit 0. Full vitest run of entities/hooks/components/scripts/e2e 405–406/408 (timeouts under load: reservation-calendar, create-reservation-dialog, first hook test before its wider wait); entities + hooks + command-panel + scripts/e2e 365/365; components alone 44/45 (reservation-calendar timeout, passes alone). Greps: sx/style/styled 0, files without the author header 0.
  - Pending manual: on a TEST broker, Vt change clamped → «Usar los valores que informa el equipo» → FiO2 change: warned once, sent on repeat.
  - Re-review: snapshot `snap-T8d` (result recorded below).
  - Commit: pending (author).
  - Re-review of fix 3 (`snap-T8d`): CHANGES_REQUIRED — B1 abandoned mode change forgotten, B2 one-step abandoned change dropped (no base), W1 I:E refusal bypassed by a mode change, S1/S2 (see fix 4).
- T8 review fix 4 (delegated writer, 2026-10-16; commit pending (author)). Route: delegated (HIGH risk, hardware safety). B1 an accepted mode change abandoned with «Usar los valores que informa el equipo» is kept as `abandonedMode` and named in the notice ("Modo: aceptado SIMV, el equipo informa VCV — el próximo comando enviará VCV"). A command that would carry the reported mode without the operator picking one gets the carry warning / identical-repeat flow (`carriedMode`, mode included in `carryKey`). It is cleared by a report of that mode, a new reservation, or a later accepted command that knowingly carried a mode (`supersedesMode`, decided at submit). B2 `AbandonedTarget.base` is kept, so the closer-than-base guard protects one-step changes (Vt 450→460). W1 `ie_ratio_without_timing` follows the I:E the device reports (a mode change never carries `ieRatio`). S2 a later ACKED/APPLIED clears only abandoned entries whose field its request carried. S1 `reset` documented as reducer-only. Test gap: a report moving between the warning and the repeat warns again. RED observed (10 failing), then GREEN: scoped vitest (entities, hooks, command-panel) 356/356 with 1 unhandled error from `operator-control.test.tsx` (outside this unit), `npm run typecheck` exit 0, eslint exit 0, greps clean. Files: command-mapper(.test) 1.4, command-state(.test) 1.4, use-ventilator-commands 1.5, ventilator-commands.test 1.5.
  - Re-review (`snap-T8e`): APPROVED, scoped vitest 288/288 by the reviewer. Follow-ups (suggestions, not applied): `supersedesMode` recomputed in the reducer may keep `abandonedMode` if a report moves between check and dispatch (conservative: warns again, no revert); hook test could add ACKED for the repeat and assert no further mode warning; an abandoned never-reported optional field stays listed in the notice; Ti-only change with RR + I:E reported and no Ti drops the I:E (pre-existing since v1.3).

- T12 review fix (delegated writer, 2026-10-16; the review of T12 + T11 fix said APPROVED_WITH_WARNINGS). Route: delegated
  (2+ non-trivial files). Command files not touched. S3 (student "Inicio" and `/dashboard` both → `/lab`) is product: not
  changed, already P2 in the parity doc.
  - W1: `src/shared/layouts/nav-indicators.ts` v1.1 is now a generic registry like nav-badges (`NavIndicatorProvider`,
    `useNavIndicators`, `useSetNavIndicator`, `useNavIndicatorHost(keys)`, `useNavIndicatorVisible(key)`; generic tones
    `positive | negative | neutral`, text supplied by the feeder; no socket, no device copy). `AppShell` v1.6 reads the
    registry and declares the indicator keys of the role's navigation as hosted; an unfed key shows nothing. CSS
    `app-shell.module.css` v1.3 (positive → success dot, negative → warning dot, tokens only). The feature feeds it:
    new `application/components/device-status-nav-indicator-loader.tsx` (`deviceNavIndicator(status)`: online → "Equipo
    en línea"; reported `device_stale` / `broker_disconnected` → "Equipo sin datos"; unknown / realtime_offline → no
    indicator) from `useDeviceStatus` (events, telemetry, staff seed from `/api/system/status`), cleared on unmount; new
    `lazy-device-status-nav-indicator-sync.tsx` (React.lazy + retryImport, only for an authenticated session and while
    the AppShell shows the key, local error boundary) mounted in `pages/_app.js` v3.1 inside a new
    `NavIndicatorProvider` (same pattern and direct-path import as GradingPendingBadgeSync). `layouts/index.ts` v1.5
    exports the registry; `nav.config.ts` v1.10 description.
  - W2: `use-operator-control.ts` v1.4: `activeRef` (true in a mount effect, false in its cleanup); a re-read answering
    after unmount is dropped; `mutate(...)` rejection swallowed (`.catch(() => undefined)`).
  - S1 (safe option): the guard against older SWR data stays closed; a failed re-read while a control-changed event is
    unconfirmed is retried ONCE per event after `rereadRetryMs` (default `CONTROL_REREAD_RETRY_MS` = 1000 ms, timer
    cleared on unmount, skipped if a newer re-read started); a second failure sends nothing more (the next event,
    action, re-authentication or bfcache restore re-reads).
  - S2: `pages/simulador/index.js` v3.1 imports `legacyLabRedirect` from
    `@features/ventilator-lab/application/config/legacy-redirects` (a legacy page may import a feature module path under
    the boundaries, as `_app.js` does); `legacy-redirects.test.ts` v1.1 asserts that import. The feature index still
    exports it (unchanged).
  - Test-first: RED observed for W2 (new "writes nothing after unmount" test: 1 rejection collected; the existing suite
    also showed "1 unhandled error") and S1 (2 failing: no retry), then GREEN 17/17 with no unhandled errors. W1: the
    feature test `device-status-nav-indicator.test.tsx` (7 tests) was RED (module missing) before the loader/sync; the
    shared registry tests (`nav-indicators.test.tsx` v1.1, 4 tests) and the two new `layouts.test.tsx` v1.3 cases were
    written together with the registry (not RED observed). S2: the page was changed before its test (not RED observed).
  - Docs: `odd/ventilator-lab-parity.md` v1.1 and `docs/hardware-test-protocol.md` v1.1 (A1: no indicator while
    unknown) updated; backend gap note above updated.
  - Checks: `npx vitest run src/shared/layouts src/features/ventilator-lab/application/hooks/operator-control.test.tsx
    src/features/ventilator-lab/application/config src/features/ventilator-lab/application/components/device-status-nav-indicator.test.tsx
    src/features/ventilator-lab/application/hooks/lab-hooks.test.tsx` → 10 files, 109 passed / 1 failed (nav-badges
    first test 5 s timeout under parallel load), 0 unhandled errors; nav-badges alone 6/6. `npm run typecheck` exit 0.
    `npx eslint src/shared/layouts src/features/ventilator-lab pages/simulador pages/_app.js` exit 0. Greps on the
    touched files: `sx=|style=|styled(` 0 (in `_app.js` only pre-existing legacy `sx`, none added); hex/rgb in
    `app-shell.module.css` 0; author header missing 0.
  - Pending manual: on the real app, a student's "Laboratorio" shows no indicator after load and "Equipo en línea" on
    the first event/telemetry; a teacher sees it at once from the seed.
  - Commit: pending (author).

  - Re-review of the T12 review fix (`snap-T12b`): APPROVED (reviewer vitest 9 files 100/100, no unhandled errors; eslint clean; the lazy nav sync does not pull the console, Chart.js or command modules). Follow-up suggestions (not applied): a failed indicator chunk stays off until reload; the indicator state is lost when leaving to a legacy page without AppShell; one test dispatches inside `waitFor`; the control re-read retry timer does not check `enabled`.

## Next step
Ventilator-lab T0–T12 done (commits pending by the author). Remaining: (1) the author commits the pending units;
(2) `next build` + bundle measurement of `/lab*` by the parent/author (target `/lab/live` ≈ 403 KiB, no console in
`/lab`, `/lab/reservations`, `/lab/recordings`); (3) manual checks of `odd/ventilator-lab-parity.md` and the hardware
session + performance runs of `docs/hardware-test-protocol.md` (results in `docs/perf/`); (4) P2 legacy removal ONLY
with the author's approval.
