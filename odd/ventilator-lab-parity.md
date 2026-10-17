<!--
* Funcionalidad: Ventilator lab parity checklist
* Descripción: T12: every legacy real-ventilator capability of /simulador (audit odd/ventilator-lab-audit.md section f) mapped to ported (where) / dropped (decision) / pending, with the test evidence; the legacy routes and links; the new capabilities; pending items and the manual checks for the author. v1.1 (T12 review fix W1): the nav device indicator is fed by ventilator-lab from useDeviceStatus and shows nothing while the state is unknown.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Ventilator lab parity checklist (legacy `/simulador` → `/lab`)

Date: 2026-10-16. Legacy inventory: `odd/ventilator-lab-audit.md` (section a: legacy implementation; section f: the
capability checklist). Decisions: `odd/tasks/ventilator-lab.md` ("Decisions", numbers below refer to it).

Status legend: **ported** (available in `src/features/ventilator-lab`), **dropped** (intentionally not carried over, with
the decision), **pending** (not done yet / needs the author or the backend). Evidence = Vitest test names (file in
brackets, under `src/features/ventilator-lab/application/` unless stated). No item below was verified in a browser or
against hardware: see "Manual checks".

## Legacy routes and links

| Legacy | Status | Now |
| --- | --- | --- |
| `/simulador` (`pages/simulador/index.js`: reservation + connection tab + live data in one dashboard) | **redirected** (T12) | Server-side temporary redirect to `/lab` (`legacyLabRedirect`, not permanent while the legacy code exists). Its connection console was a tab of the same page (no own URL), so everything goes to the lab summary, which leads to `/lab/live`. Evidence: "sends /simulador to the lab summary with a temporary redirect", "the legacy route only redirects: no legacy dashboard is imported" [config/legacy-redirects.test.ts]. |
| Legacy reservation route | none existed | The old reservations were the `/simulation/reserve` API inside `/simulador` (audit a); nothing else to redirect. |
| `/dashboard` → `/simulador` (`pages/dashboard/index.js`) | **changed** (T12) | Pure target change to `/lab` (same final destination, one redirect less). Evidence: "the legacy /dashboard landing points to the lab directly". |
| Nav "Ventilador real" `/simulador` (students) | **replaced** (T12) | "Laboratorio" `/lab` for every role with the device indicator: "Equipo en línea" when online, "Equipo sin datos" only for a reported disconnect / stale state, no indicator while unknown (T12 review fix W1: fed by ventilator-lab from useDeviceStatus through the generic nav-indicators registry; staff are seeded from /api/system/status, telemetry counts as online). Evidence: "shows Laboratorio (/lab) with the device indicator to every role, active on every lab page", "has a single Simulador item: the legacy /simulador entry is gone" [src/shared/layouts/nav.config.test.ts]; "shows nothing until a feeder sets an indicator…", "reports a key visible only while a host displays it" [src/shared/layouts/nav-indicators.test.tsx]; "shows the Laboratorio item without any indicator nobody fed", "shows the indicator a feeder sets and declares its key visible" [src/shared/layouts/layouts.test.tsx]; "shows no indicator while unknown, then follows the reported events and telemetry", "seeds staff from the system status, without any event", "reads and shows nothing while no host displays the key" [application/components/device-status-nav-indicator.test.tsx]. |
| `src/shared/components/Sidebar.jsx:49` "Simulador Virtual" → `/simulador` | **pending P2** | Not a pure target change (the label names the simulator, not the lab); the link still works through the redirect. Relabel/repoint or delete in P2. |
| `src/features/admin/components/panel/PanelSidebar.jsx:268` "back to student view" → `/simulador` | **pending P2** | Means "student home", not the lab; works through the redirect. Decide the student home in P2. |
| `src/shared/utils/redirectByRole.js:25-33` (`/simulador` for every role) | **pending P2** | No importer left (dead code since the T9 login): `git rm` candidate. |
| `src/lib/auth-config.js:65` `PROTECTED_ROUTES` `/simulador` | **pending P2** | Harmless (the route only redirects); remove with the legacy code. |
| `src/shared/session/routes.config.ts:44` `/simulador` | kept | The redirect route still exists; remove in P2 with the page. |

## Capabilities (audit section f)

| # | Legacy capability (file) | Status | Where / why — evidence |
| --- | --- | --- | --- |
| 1 | Reserve now for N min (`PanelReserva`, `ReservationDialog`, `/simulation/reserve`) | ported (replaced) | `/lab/reservations`: Bogota week/day calendar + create on `/api/reservations` with role-based holder (T2). "books a free slot and revalidates the calendar" [pages/lab-reservations.page.test.tsx]; "books a student without led groups for themselves…", "lets a group leader book for the group", "lets an admin book for another user found by search" [components/create-reservation-dialog.test.tsx]; slot grid suite [entities/slot-grid.test.ts]. |
| 2 | "Reservado por X", remaining minutes (`useRemoteVentilator`) | ported (replaced) | Occupancy labels by projection (never names to students), countdown on the server clock (T1, T6, T9). "maps the student and teacher label keys to Spanish and never reads names from a limited reservation" [api/mappers/reservations.mapper.test.ts]; "opens the console for the holder, joins the room and counts down on the server clock" [pages/lab-live.page.test.tsx]; "counts down on the synchronised server clock" [entities/live-session.test.ts]. |
| 3 | Release reservation (`DELETE /simulation/reserve`) | ported (replaced) | Cancel in "Mis reservas" (T4). "asks for confirmation, posts the cancel once, revalidates and shows a toast", "offers Cancelar only where the backend rules allow it" [components/my-reservations.test.tsx]. |
| 4 | Connection FSM + indicator (`useConexionVentilador`, `IndicadorEstadoConexion`, `PanelConexion`) | ported (replaced) | Socket / room join / device connected-stale states + latency on `/lab/live` (T6); device state on `/lab` and in the nav (T1, T12). "re-joins on reconnect and shows the reconnection banner…", "shows a join rejection with its reason…" [pages/lab-live.page.test.tsx]; "is unknown until an event and follows connected and disconnected" [hooks/lab-hooks.test.tsx]. |
| 5 | No-signal banner (`NoSignalBanner`, `NoSignalGate`) | ported (replaced) | Grey frozen curves + overlay "Equipo sin datos", read-only (T5, T6). "greys the curves on ventilator:disconnected and on the stale timer, and resumes by itself" [pages/lab-live.page.test.tsx]; shared console source-state suite [src/shared/ventilator-console]. |
| 6 | Web Serial direct connection (`conexion/serial/*`) | **dropped** | Audit f: the MQTT gateway is the only supported path; browser serial bypasses reservations, control and audit. |
| 7 | Mode toggle volume/pressure (`ModeToggle`) | ported (partly) | Console mode selector: VCV / SIMV, plus the current pressure mode while the device runs it; a change INTO PCV/PSV is refused (no documented pressure semantics: backend gap T8). "offers VCV and SIMV, and a pressure mode only while the device runs it" [entities/command-mapper.test.ts]. |
| 8 | Parameter inputs + validation (`ParameterControls`, `useParameterValidation`, `ventilator-limits.ts`) | ported (replaced) | Console pending → CONFIRMAR with the vendored engine limits ∩ backend safety caps; 422 violations in Spanish (T8). "takes the stricter of the engine limits and the backend safety maxima, in console units" [entities/command-mapper.test.ts]; "lists every 422 violation in Spanish" [entities/command-messages.test.ts]. |
| 9 | Send config / stop (`ControlPanel`, `useVentilatorControls`, `/simulation/command`) | ported (send) / **dropped** (stop) | `POST /api/ventilator/commands` + `ventilator:command-status`, one command at a time, value shown only when the device reports it (T8). "sends a confirmed change and shows the new value ONLY when the device reports it (T8)" [pages/lab-live.page.test.tsx]; "sends nothing on a second confirmation while one is in flight (double send guard)" [hooks/ventilator-commands.test.tsx]. "Stop": no command in the new contract and no emergency stop in software (stop at the device; backend protocol). |
| 10 | Real-time waveforms (`ChartsColumn`, `RealTimeCharts`, `useSignalProcessing`) | ported (replaced) | Shared console curves fed by reference through the frame hub (T5). "keeps a stable source and pushes each batch to the listeners" [entities/real-console.test.ts]; "delivers every batch to the curves synchronously while throttling the React commits" [hooks/use-real-console-adapter.test.tsx]. |
| 11 | Metric cards drag/reorder/show-hide (`MetricColumn`, `useCardConfig`) | **dropped** | YAGNI (same as simulator decision 12): fixed console numeric monitor. |
| 12 | Compliance calc + auto-adjust (`useComplianceCalculation`, `ComplianceStatus`) | ported (partly) / **dropped** (auto-adjust) | Derived Ppico, PEEP, Vte, FR, I:E, VE; Pplat and ΔP only with a detected plateau, labelled "derivada" (decision 5). "volume control with an inspiratory pause: Ppeak, plateau, PEEP, Vte, RR, I:E, VE and ΔP", "volume control without a pause has no plateau: Pplat and ΔP stay null" [entities/breath-detection.test.ts]; "marks every derived metric and never fills the ones the curves cannot give" [entities/real-console.test.ts]. Auto-adjust dropped (hides learning; never send unconfirmed values). |
| 13 | Error detection / validation alerts (`useErrorDetection`, `ValidationAlerts`) | ported (replaced) | Client limits + mapper refusals in Spanish + backend 422 (T8). "names the missing fields in Spanish", "explains a reported mode the console cannot command" [entities/command-mapper.test.ts]. |
| 14 | Alarms receive / acknowledge (`ventilatorStreamStore` `alarm:acknowledge`) | ported (receive) / **dropped** (ack) | Console alarms bar from `ventilator:alarm` + frame codes + synthetic "Equipo sin datos" (T5); acknowledge = console silence; the backend has no handler for `alarm:acknowledge`. "maps the four device severities to the three console priorities", "adds, updates and clears device alarms by type, keeping the onset time" [entities/real-console.test.ts]. |
| 15 | Recording + export TXT/PDF (`useDataRecording`, `useDataExport`) | ported (recording, playback) / **dropped** (TXT/PDF, CSV) | Backend recording start/stop with REC (T10), `/lab/recordings` + playback (T11, T11 review fix). "starts once (double click) and shows the REC mark, stops only after confirming" [components/recording-control.test.tsx]; "plays a recording in the read-only console…", "states the gaps in the header length and marks them on the time bar" [pages/lab-recordings.page.test.tsx]; "aborts the download on unmount and indexes nothing", "downloads again on every visit…" [hooks/recording-playback.test.tsx]. No CSV: the API offers none (gap T11); TXT/PDF dropped. |
| 16 | QR / WhatsApp share (`useQRBridge`, `WhatsAppTransfer`) | **dropped** | Unrelated to lab operation; privacy (audit f). |
| 17 | AI configuration analysis (`AIAnalysisPanel`, `useAIAnalysis`) | **pending (backend)** | No real-ventilator AI endpoint (audit f: deferred, reported); the AI assist lives in `/simulator`. |
| 18 | Patient simulator form (`simuladorPaciente/*`, `/simulation/patient/*`) | **dropped** here | Superseded by `/simulator` (engine in a worker). |
| 19 | Change history / diff (`ChangeHistoryPanel`, `DiffViewer`) | ported (replaced) | "Comandos recientes" from `GET /api/ventilator/commands` merged with the live statuses (T8). "merges the history read with the live statuses" [hooks/ventilator-commands.test.tsx]; "puts the live commands first and upgrades the history statuses with newer live ones" [entities/command-state.test.ts]. |
| 20 | Mock data (`useMockData`, `simulatedRealTimeData`) | **dropped** | Tests use fake frame sources; the fake device script (`scripts/e2e/`) for manual runs on a TEST broker (decision 7). |
| 21 | Sessions save/list (`/simulation/session*`) | **dropped** | Simulator sessions belong to `/simulator`. |
| 22 | `/dashboard` → `/simulador`, `redirectByRole` | changed / pending P2 | See "Legacy routes and links". |

## New capabilities (no legacy counterpart)

| Capability | Task | Evidence |
| --- | --- | --- |
| Calendar with slot rules from the settings (vendored defaults, admin platform settings), Bogota time | T0–T2 | [entities/slot-grid.test.ts], "uses the platform settings and shows the holder name to staff" [pages/lab-reservations.page.test.tsx] |
| Staff preemption with the 409 flow, teacher vs teacher rule, preempted-holder toast | T3 | "lets a teacher book over a student's reservation through the preemption dialog", "shows the preempted holder one toast and refreshes the calendar" [pages/lab-reservations.page.test.tsx] |
| Group reservations (leader, members), cancel rules mirrored from the backend | T2, T4 | [entities/my-reservations.test.ts], [hooks/reservations-hooks.test.tsx] |
| Operator control: take / takeover / release, socket heartbeat, release on leaving | T7 | [hooks/operator-control.test.tsx], "gives the controls only to the operator and takes them away on a takeover" [pages/lab-live.page.test.tsx] |
| Control revoked modal (preemption, end, countdown on the server clock) and loss notices | T9 | "preemption during use: modal with the reason…", "presence timeout: a notice (no modal)…" [pages/lab-live.page.test.tsx] |
| Display-path latency with the server clock offset, session p95, levels | T6 | "shows the latency of the batches on the server clock with its session p95 and level" [pages/lab-live.page.test.tsx], [entities/telemetry-latency.test.ts] |
| Console limited to device-REPORTED settings ("—" when not reported) and derived metrics | T5, T8 | "keeps the latest frame that carries each field and never fills from the client" [entities/real-console.test.ts] |
| Recording gaps shown, never compressed; playback on a monotonic clock | T11 review fix | "marks the gaps of the recording…" [entities/recording-index.test.ts], "shows 'sin datos' while the position is inside a recording gap (S1)", "runs on performance.now by default…" [hooks/recording-playback.test.tsx] |
| Lazy console: no console / waveforms / charts in `/lab`, `/lab/reservations`, `/lab/recordings` | T6, T11 | [pages/lab-live.lazy-boundary.test.ts] |
| Nav device indicator from the lab device status (events, telemetry, staff seed; nothing when unknown) | T12, T12 review fix | [application/components/device-status-nav-indicator.test.tsx], [src/shared/layouts/nav-indicators.test.tsx] |
| Fake device for TEST brokers (refuses the lab broker) | T8 | [scripts/e2e/fake-ventilator-core.test.mjs] |

## Pending

| Item | Status |
| --- | --- |
| P2: delete the legacy `src/features/simulador` real-ventilator code, `pages/simulador/index.js`, the legacy sidebar links, `redirectByRole.js`, `/simulador` in `auth-config.js` and `routes.config.ts` | pending — **only with the author's approval** |
| `next build` + bundle measurement of `/lab*` (target `/lab/live` ≈ `/simulator/sessions/[sessionId]` 403 KiB, below legacy `/simulador` 478 KiB; no console in `/lab`, `/lab/reservations`, `/lab/recordings`) | pending — the parent / the author |
| Backend gaps (tracker "Backend gaps to report"), new in T11 review fix: no cancel / preemption time in `ReservationDetailDTO`, so a reservation cancelled before its start cannot be filtered out of the recordings list | pending — backend |
| Hardware session and performance runs (`docs/hardware-test-protocol.md`, results in `docs/perf/`) | pending — author with the device custodian |

## Manual checks pending for the author

No browser, servers, device or Playwright were available; every item is covered only by unit tests so far.

1. Nav: every role sees "Laboratorio"; the indicator changes on device connect / disconnect (a student right after a page load sees no indicator until the next event; a teacher/admin sees "Equipo en línea" at once when the device is online); "Ventilador real" is gone.
2. `/simulador` and `/dashboard` land on `/lab` (no flash of the legacy dashboard); an old bookmark works.
3. `/lab/reservations` as student, group leader, teacher and admin; a teacher preempting a student; 7-minute slots.
4. `/lab/live` with the fake device on a TEST broker: take control, PEEP change applied, `--reject`, `--pause` overlay.
5. Hardware session (`docs/hardware-test-protocol.md` section A) with the custodian: reserve, take control, send,
   reported values, disconnect, preemption modal, latency p95 < 100 ms, recording + playback.
6. Performance runs C1–C4 (60 msg/s × 5 min latency, fps ≥ 30 median, stable memory, 30-minute recording playback).
7. Recordings: a recording with a stop/start in the middle shows the gap on the time bar and "Sin datos grabados…".
8. Bundle check (after the author's build): `/lab`, `/lab/reservations`, `/lab/recordings` chunks without the console.
