# Phase 1 audit: ventilator-lab (reservations + real ventilator console + recordings)

Date: 2026-10-16. Frontend: `ventilab-web`, branch `master`, HEAD `c7c7b45` (clean working tree). Backend: `ventylab-server`, branch `main`, HEAD `52cfa85`. Read-only audit: no source file was modified, nothing was built, git was used only for reads. The only measurement is a gzip read of the existing `.next/` build (section g).

Paths are relative to `ventilab-web/` unless they start with `ventylab-server/`.

## 0. Premises that do NOT hold (verified)

1. **No derived metrics exist on the backend.** The telemetry frame carries only raw `pressure/flow/volume` samples plus optional device-reported `mode`, `settings`, `alarms`, `spo2`, `pco2`. There is no PIP, PEEP, Vt, RR, VE, compliance or plateau anywhere (`ventylab-server/src/features/ventilator-telemetry/domain/value-objects/telemetry-frame.ts:11-24`). Every console metric must be derived on the client and labelled as derived.
2. **No PaCO2 / EtCO2.** There is one generic optional `pco2` (mmHg, `docs/ventilator/telemetry.md:20`); it is not split into arterial vs end-tidal. No heart rate in the real frame (it appears only in the stale JSON schema, see b).
3. **Students cannot read lab settings.** `GET /api/platform-settings` requires `settings:manage` (admin only, `platform-settings.controller.ts:39-41`). Slot granularity, max duration, booking window and max future reservations are therefore not readable by the users who book.
4. **No recordings list, no recording CSV.** Playback is only `GET /api/ventilator/telemetry/recordings/{reservationId}`. The only CSV is the admin latency export `metrics.csv`.
5. **No heartbeat interval contract.** The heartbeat endpoint exists, but presence is released on socket disconnect + `VENTILATOR_OPERATOR_GRACE_SECONDS`=15 (`operator-control.service.ts:150-168`, `env.validation.ts:197`). The client interval must be chosen in front (any value < 15 s).
6. **The fake device does not reflect commands.** `ventylab-server/scripts/simulate-ventilator.ts` never subscribes to the command topic and sends no `settings`, so command acknowledgement (inferred by matching frame `settings`, `domain/services/applied-settings-match.ts`) times out against it.
7. **The shared realtime client has no room API.** `src/shared/realtime/realtime.entity.ts:53-55` declares only the `authenticate` client event; joining the ventilator room needs a new `ventilator:join` client event type.
8. **`createReservation` returns `data: null`** (201) — the created reservation id is not returned; the UI must refetch `mine`/calendar.

## a) Legacy implementation (reservations + real connection)

Legacy feature: `src/features/simulador/` (80 files, ~14.2k LOC). Route `pages/simulador/index.js`: `LearningProgressProvider > ConexionVentiladorProvider > SimuladorContent > <VentilatorDashboardWrapper isRealVentilator={tieneReserva}/>` (:33-38).

Entry points into `/simulador`:
- `src/shared/layouts/nav.config.ts:55` "Ventilador real" (STUDENT only); `src/shared/components/Sidebar.jsx:49`; `src/features/admin/components/panel/PanelSidebar.jsx:268`.
- `pages/dashboard/index.js:8` permanently redirects `/dashboard` → `/simulador`; `src/shared/utils/redirectByRole.js:25-26` lands STUDENT/TEACHER there; `src/shared/session/routes.config.ts:44`; `src/lib/auth-config.js:65`.

Key files:
| File | Role |
|---|---|
| `simuladorVentilador/dashboard/componentes/VentilatorDashboardWrapper.tsx` | picks data source (websocket vs serial), `NoSignalGate` when real (:19,68,108) |
| `.../dashboard/componentes/VentilatorDashboard.jsx` (513 LOC) | main screen: serial hooks, compliance, recording, QR bridge, AI, tabs (:36-55, :447-497) |
| `.../dashboard/hooks/useDashboardState.ts` (527 LOC) | central state; serial start/stop/config frames (:352-398) |
| `conexion/websocket/hooks/useConexionVentilador.ts` | FSM `SIN_RESERVA→RESERVANDO→RESERVADO→CONECTANDO→CONECTADO→ERROR/DESCONECTADO` (:4-5, 27-34) |
| `conexion/websocket/hooks/useRemoteVentilator.ts` (436 LOC) | reserve/release via REST, telemetry via socket, commands via REST, `occupiedBy` |
| `conexion/websocket/stream/ventilatorStreamStore.ts` | singleton ring buffer + rAF flush, `bindSocket()` (:241) |
| `conexion/componentes/{ConexionVentiladorTab,PanelReserva,PanelConexion,IndicadorEstadoConexion}` + `compartido/componentes/ReservationDialog.tsx` | reservation / connection UI |
| `conexion/serial/hooks/useSerialConnection.js` | Web Serial (`navigator.serial.requestPort` :52, 9600 baud :76) |
| `compartido/api/simulator.api.ts` | `fetch(${BACKEND_API_URL}${endpoint})` (:33) |

Socket events (legacy `@/shared/hooks/useSocket` → `src/shared/contexts/SocketContext.tsx`, which reuses the `RealtimeProvider` socket when a backend session exists, else its own `io()` at :94-102):
- listened: `ventilator:data`, `ventilator:alarm`, `ventilator:status`, `connect_error` (`ventilatorStreamStore.ts:248-251`); `ventilator:reserved`, `ventilator:released` (`useRemoteVentilator.ts:179-182`).
- emitted: `alarm:acknowledge {alarmId}` (`ventilatorStreamStore.ts:87`). It never emits `ventilator:join`, so with the current backend a non-privileged student receives only what its user/role rooms get.

HTTP consumed (`simulator.api.ts`): `GET /simulation/status?deviceId=` (:65), `POST|DELETE /simulation/reserve` `{durationMinutes, purpose?}` (:76, :87), `POST /simulation/session/save` (:98), `GET /simulation/sessions` (:116), `POST /simulation/session` (:134), `POST /simulation/patient/{configure,start,stop}`, `GET /simulation/patient`, `GET /simulation/health` (:148-193), `POST /simulation/command {command}` (`useVentilatorControls.ts:75`, `useRemoteVentilator.ts:392`).

Legacy reservations are single-resource "reserve now for N minutes" on `/simulation/reserve`; no calendar, no preemption, no groups. `PanelStudents.jsx:276-287` has a "Reservar Ventilador" button with no handler. **No frontend consumer of `/api/reservations*` or `/api/ventilator/*` exists** (only `schema.d.ts:4844-4938`).

## b) Real telemetry frame content

`TelemetryFrame` (`ventilator-telemetry/domain/value-objects/telemetry-frame.ts:11-24`; `openapi/asyncapi.yaml:640-671` matches):

| Field | Type | Required | Notes |
|---|---|---|---|
| `serverTs` | number (epoch ms) | yes | stamped by the backend pipeline on receipt |
| `deviceTs` | number | no | device clock; legacy `timestamp` accepted only if > 1e12 (`json-telemetry.decoder.ts`) |
| `seq` | int ≥ 0 | no | gap/reorder/duplicate tracking (`sequence-gap-tracker.ts`, window 16) |
| `pressure` | number cmH2O | yes | |
| `flow` | number L/min | yes | |
| `volume` | number mL | yes | |
| `mode` | string | no | device-reported |
| `settings` | `Record<string, number>` | no | free-form, device-reported; used to infer command ack |
| `alarms` | `string[]` | no | |
| `spo2` | number | no | **present (optional)** |
| `pco2` | number mmHg | no | generic; **no PaCO2/EtCO2 distinction** |
| `deviceId` | string | yes | |

Not present: any derived metric, FiO2 measured, HR, BP, EtCO2, breath phase, alarm priority inside the frame.

Batch to clients (`application/realtime/ventilator-telemetry-events.ts:171-174`): `ventilator:telemetry { frames: TelemetryFrame[], serverTs: number }`, volatile, flushed every `VENTILATOR_FLUSH_INTERVAL_MS`=33 ms (`env.validation.ts:253`, live-tunable via `telemetry.flushIntervalMs`), buffer cap 256 frames (oldest dropped, counted in `bufferDrops`). The same flush also emits legacy `ventilator:data` (last frame as `VentilatorReading {pressure,flow,volume,pco2?,spo2?,timestamp,deviceId}`, `telemetry-frame.ts:28`). Audience: room `ventilator` + `role:TEACHER` + `role:ADMIN` (`telemetry-pipeline.service.ts:48`, :160-190).

Sample rate: whatever the device publishes (schema says 30–60 Hz; fake device ~30 Hz). No `sampleRateHz` in the live batch — the client must estimate it (or assume 30) to size the console ring (`ConsoleFrameSource.sampleRateHz`).

Alarms: separate `ventilator:alarm` event, `VentilatorAlarm` (`domain/value-objects/ventilator-alarm.ts:125`), types HIGH_PRESSURE, LOW_PRESSURE, HIGH_VOLUME, LOW_VOLUME, APNEA, DISCONNECTION, POWER_FAILURE, TECHNICAL_FAULT; severity LOW/MEDIUM/HIGH/CRITICAL (console has high/medium/low → map CRITICAL+HIGH→high).

Recorded frame (`RecordedTelemetryFrameDTO`, openapi): `{serverTs, deviceTs|null, seq|null, pressure, flow, volume, spo2|null, pco2|null}` — **no mode, settings or alarms in recordings**; `TelemetryRecordingDTO {reservationId, sampleRateHz|null, chunkCount, frames[]}`. Recording rate setting `telemetry.recordingHz` (default 20, platform-settings registry).

Stale doc: `ventylab-server/docs/json-specs/ventilator-telemetry.schema.json` describes a nested shape (`waveforms.*.value`, `vitals.heartRate`, `breathPhase`, `deviceStatus`) that does not match the decoder. Do not generate types from it.

## c) Contract: endpoints and socket events

The frontend generates from `openapi/openapi.json` (copied from `ventylab-server/openapi/openapi.json` by `scripts/generate-api.mjs:21-23`, output `src/shared/api-client/generated/schema.d.ts`). Both copies are identical (279 paths, same mtime 2026-10-13); no regeneration needed. Backend regenerates with `npm run openapi:generate` (`scripts/openapi/generate.mjs:17`).

### Reservations (`ventylab-server/src/features/reservations/presentation/controllers/reservations.controller.ts`)
| Method | Path | operationId | Body / query | Response data |
|---|---|---|---|---|
| GET | `/api/reservations` | `getReservationsCalendar` | `from`, `to` | `(ReservationDetailDTO \| ReservationSummaryDTO)[]` (:56) |
| POST | `/api/reservations` | `createReservation` | `CreateReservationDTO {holderType: USER\|GROUP, userId?, groupId?, startsAt, endsAt, purpose?, confirmPreempt?}` | `null` (201); 409 overlap — for staff the error data lists conflicts and whether `confirmPreempt` would preempt (:121-127) |
| GET | `/api/reservations/mine` | `getMyReservations` | — | `ReservationDetailDTO[]` (:89) |
| GET | `/api/reservations/current` | `getCurrentReservation` | — | `CurrentReservationDTO {reservation\|null, canControl}` (:105) — the "active reservation" |
| POST | `/api/reservations/{id}/cancel` | `cancelReservation` | — | `null` (:157) |
| POST | `/api/reservations/{id}/preempt` | `preemptReservation` | `PreemptReservationDTO {reason, holderType, userId?, groupId?, startsAt?, endsAt?, purpose?}` | `null` (201), needs `reservations:manage` (:172) |
| POST/DELETE | `/api/simulation/reserve` | `reserve` / `release` | legacy | legacy only |

Occupancy labels by role (`presentation/mappers/reservations.mapper.ts:24-30`): a student viewing another's slot receives `ReservationSummaryDTO {visibility:"limited", id, startsAt, endsAt, status, label, labelKey}` with `labelKey` ∈ `reservations.labels.student | .group_student | .teacher`; staff and the owner get `ReservationDetailDTO {visibility:"full", holder, holderRole, group, createdBy, purpose, preemptedReason, status}`. The UI should switch on `visibility`.

### Control and heartbeat (`ventilator-commands/presentation/controllers/ventilator-commands.controller.ts`, base `api/ventilator`, permission `ventilator:control`)
| Method | Path | operationId | Notes |
|---|---|---|---|
| GET | `/api/ventilator/control` | `getVentilatorControl` | `VentilatorControlStateDTO {reservationId?, operatorUserId?, since?, lastSeenAt?, presenceExpiresAt?, isOperator, canTake, canTakeover, occupied}` |
| POST | `/api/ventilator/control` | `takeVentilatorControl` | 423 if locked (`ventilator-control.usecases.ts:141,159,194`) |
| POST | `/api/ventilator/control/takeover` | `takeOverVentilatorControl` | "force" |
| DELETE | `/api/ventilator/control` | `releaseVentilatorControl` | |
| POST | `/api/ventilator/control/heartbeat` | `sendVentilatorControlHeartbeat` | also socket `ventilator:heartbeat`; no required interval (grace 15 s after last socket closes) |

### Commands
| Method | Path | operationId | Notes |
|---|---|---|---|
| POST | `/api/ventilator/commands` | `sendVentilatorCommand` | 202 `SentVentilatorCommandDTO {commandId, reservationId, sentAt?, status}`; body `SendVentilatorCommandRequestDTO {mode: VCV\|PCV\|SIMV\|PSV, tidalVolume?, respiratoryRate?, peep?, fio2?, pressureLimit?, inspiratoryTime?, ieRatio?, flowRate?, sensitivity?}` (required fields per mode: `REQUIRED_PARAMETERS_BY_MODE` in `ventilator-command-params.ts`) |
| GET | `/api/ventilator/commands` | `getVentilatorCommands` | paginated; `reservationId`, `createdAtFrom/To`, `ids`, `sortOrder` → `VentilatorCommandDTO {status: PENDING\|SENT\|ACKED\|APPLIED\|REJECTED\|TIMEOUT, latencyMs, rejectReason, params, ...}` |

Error codes (`ventylab-server/src/common/presentation/errors-map.ts:539-547`; throws in `send-ventilator-command.usecase.ts`): 403 `NoActiveVentilatorReservationError` (:72), 403 `NotReservationHolderError` (:76), 423 `NotVentilatorOperatorError` (:80), 429 `VentilatorCommandRateLimitedError` + `Retry-After` (:86), 422 `InvalidVentilatorCommandError` with `details.violations` (:92), 503 `VentilatorDeviceOfflineError` (:98, :121). Rate `commands.ratePerSecond`=5, ack timeout `commands.ackTimeoutMs`=3000.

### Telemetry / recordings (`ventilator-telemetry/presentation/controllers/ventilator-telemetry.controller.ts`)
| Method | Path | operationId |
|---|---|---|
| POST | `/api/ventilator/telemetry/recordings/start` | `startTelemetryRecording` (:103), 409 on conflict |
| POST | `/api/ventilator/telemetry/recordings/stop` | `stopTelemetryRecording` (:122) |
| GET | `/api/ventilator/telemetry/recordings/{reservationId}` | `getTelemetryRecording` (:138) |
| GET | `/api/ventilator/telemetry/metrics`, `metrics.csv`; POST `metrics/reset` | admin pipeline latency only |

### Lab settings (platform-settings, admin only)
`GET /api/platform-settings` (`getPlatformSettings`, `category` query), `PATCH /{key}` (`updatePlatformSetting`, optimistic `version`), `POST /{key}/reset`. Keys (`domain/registry/platform-settings.registry.ts:284-339`; defaults `env.validation.ts`): `reservations.slotMinutes`=15 (:447), `reservations.maxDurationMinutes`=120 (:441), `reservations.maxAdvanceDays`=14 (:452), `reservations.maxUpcomingPerStudent`=3 (:457), `reservations.maxUpcomingPerGroup`=5 (:462); `telemetry.flushIntervalMs`, `telemetry.staleAfterMs`, `telemetry.recordingHz`, `telemetry.recordingFlushSeconds`, `commands.ratePerSecond`, `commands.ackTimeoutMs`, `commands.safety.{maxPeep 15, maxPressureLimit 40, maxTidalVolume 700, maxRespiratoryRate 35, maxIeRatio 1}` (env :213-234).

### Notifications
`GET /api/notifications` (`listNotifications`), `GET /unread-count` (`countUnread`), `PATCH /{id}/read` (`markRead`), `PATCH /read-all` (`markAllRead`), `DELETE /{id}` (`deleteNotification`). Type `RESERVATION_PREEMPTED` (`notifications/domain/services/notification-templates.ts:44`); socket `notification:new` is already in the front event map (`realtime.entity.ts:39`).

### Socket events (`ventylab-server/src/common/infrastructure/realtime/realtime.gateway.ts`)
Auth: handshake `auth.token` or Bearer header (:229), or `authenticate {token}` (:95) → `authenticated {userId}` / `auth_error`; rooms `user:{id}`, `role:{role}`. Client events prefixed `ventilator:` are forwarded internally (:181).

Client → server: `ventilator:join` (payload ignored; `ventilator-room-access.service.ts:150-177`: holder joins room `ventilator`; TEACHER/ADMIN already receive via role room; others get `ventilator:join-rejected {reason: no_active_reservation | not_reservation_holder}`; all get `ventilator:availability`). Room access is refreshed every `VENTILATOR_ROOM_REFRESH_MS`=1000 and on reservation events — the client must re-emit `ventilator:join` on every (re)connect and when its reservation starts. `ventilator:heartbeat` (payload ignored, `ventilator-commands-events.ts:17`).

Server → client:
| Event | Payload |
|---|---|
| `ventilator:telemetry` | `{frames[], serverTs}` |
| `ventilator:data` | legacy reading |
| `ventilator:alarm` | `VentilatorAlarm` |
| `ventilator:availability` | `{occupied, startsAt?, endsAt?}` |
| `ventilator:join-rejected` | `{reason}` |
| `ventilator:connected` | `{at}` |
| `ventilator:disconnected` | `{at, reason: device_stale \| broker_disconnected}` |
| `ventilator:control-changed` | `{reservationId, operatorUserId, reason: taken\|takeover\|released\|presence_timeout\|reservation_ended\|reservation_preempted}` (`ventilator-commands-events.ts:30-36`) |
| `ventilator:command-status` | `{commandId, reservationId, userId, status, sentAt?, resolvedAt?, latencyMs?, reason?}` (:38-47) |
| `reservation:preempted` | `{reservationId, holderType, groupId, startsAt, endsAt, reason, wasActive}` to user/group room (`reservations/infrastructure/events/reservations-events.handlers.ts:18`; asyncapi :372) |
| `ventilator:reserved` / `ventilator:released` | legacy |

### Front realtime module (`src/shared/realtime`)
Exports (`index.ts:12-26`): `RealtimeProvider`, `useSocket()` → `{socket, status}`, `useSocketEvent(event, handler)` (handler in ref, rebinds on socket change), types `RealtimeEventMap`, `RealtimeServerEvents`, `RealtimeClientEvents`, `RealtimeSocket`, `RealtimeStatus` (`idle|connecting|authenticated|disconnected|unauthorized`). Provider: `io(BACKEND_ORIGIN, {autoConnect:false, transports:["websocket","polling"], auth: cb => cb({token})})`, re-auth on token rotation, single-flight refresh on `auth_error`, mounted in `pages/_app.js`. **No room API**: rooms are server-assigned on authenticate. Needed generic change: add the `ventilator:*` server events and `ventilator:join` / `ventilator:heartbeat` client events to `realtime.entity.ts` (typed map only), then the feature emits `socket.emit("ventilator:join")` when `status === "authenticated"`.

### MISSING (backend gaps; front must work around or report)
1. Non-admin read of lab settings (slot, max duration, booking window, max upcoming). Workaround: hardcode defaults 15/120/14/3/5 in feature config marked as backend-gap, and rely on 400/409 from `createReservation` as the authority.
2. Safety ranges endpoint (only admin settings + `ventilator-command-validator.ts:169-243`). Workaround: reuse vendored `src/shared/sim-engine` ventilator limits intersected with the default `commands.safety.*`; treat 422 `violations` as authority.
3. Latest applied settings endpoint (`VentilatorTelemetryFacade.getLatestSettings()` exists at `ventilator-telemetry.facade.ts:62`, unused). Workaround: last frame `settings`/`mode`; before the first frame show "—".
4. Recordings list endpoint. Workaround: list from `GET /api/reservations/mine` (past, own) and try `getTelemetryRecording` per reservation (404 = none).
5. Recording CSV export. Workaround: client-side CSV from `TelemetryRecordingDTO.frames`.
6. Derived metrics (all). Workaround: client-side breath segmentation.
7. Recording status (is a recording active?) — only start/stop with 409; no GET.
8. Heartbeat interval contract; live `sampleRateHz` in the batch; created reservation id in `createReservation` response.
9. Mode/settings/alarms in recorded frames (playback cannot show settings or alarms history except via `getVentilatorCommands` for the reservation).

## d) Fake device

`ventylab-server/scripts/simulate-ventilator.ts` (105 lines). No npm script; run `npx tsx scripts/simulate-ventilator.ts` (backend `AI_CONTEXT.md:114`). Requires `MQTT_BROKER_URL` (exits 1 otherwise; refuses public brokers, :24), loads `.env.development`. Publishes every 33 ms (~30 Hz, `setInterval` :56, `publish` :82, qos 0) to `MQTT_TELEMETRY_TOPIC` (default `/ventynet/data`) a 4 s sine breath: `{pressure 5–25, flow ±60, volume 0–500, timestamp: Date.now(), deviceId}`. It sends **no** `seq`, `mode`, `settings`, `alarms`, `spo2`, `pco2` and **does not subscribe** to `MQTT_COMMAND_TOPIC` (`ventilab/device/001/command`), so it does not reflect settings; with `MQTT_COMMAND_ACK_TOPIC=""` acks are inferred from frame `settings` → commands end in `TIMEOUT`. Other tooling: `npm run test:load:telemetry` (`scripts/load`), `test/e2e/resilience/mqtt-broker-outage.e2e-spec.ts`. For front tests the plan uses an in-process fake frame source (vitest + msw), not MQTT.

Legacy front also has `src/features/simulador/conexion/websocket/dev/syntheticVentilatorEmitter.ts` (dev-only synthetic, no socket).

## e) `src/shared/ventilator-console` contract vs real data

Contract: `VentilatorConsoleAdapter` (`application/ventilator-console.entity.ts:268-292`): `frames {subscribe, sourceId?, sampleRateHz?}`, `settings {current, applied}`, `mode {current, options}`, `metrics` (12 ids, `config/console.config.ts:28-41`), `patient {values, trends?}`, `alarms`, `permissions {canControl}`, `limits`, `onConfirm`, optional `onProposeChange/onCancel/onPendingChange/alarmLimits/alarmHistory/capabilities/ranges`. Component props (`ventilator-console.tsx:44-73`): `header`, `alarmsSlot`, `modeSlot`, `controlsSlot`, `maneuversSlot`, `variant`, `applicability`, `clock`, `beeperFactory`.

Simulator usage: `use-sim-session.ts:706-715` builds the adapter with `frames: hub.source` (stable hub from `@shared/sim-engine/console-binding/frame-binding.ts:61-67`, `sourceId` + `sampleRateHz`) and `canControl` from session status; replay `use-replay-session.ts:90-96, 370-377` uses a new `sourceId` per seek and `canControl:false`. `sim-console-adapter.ts` (234 lines) re-exports the engine mapping from `console-binding` plus validation/objectives. The real adapter will mirror this: a frame hub fed by `ventilator:telemetry`, `sourceId = reservationId` (+ `:playback:<gen>` in playback).

| Requirement | Supported today? | Evidence | Needed |
|---|---|---|---|
| Hide patient monitor | **No** — always rendered; with no vitals it shows the "empty" text | `ventilator-console.tsx:149`, `patient-monitor.tsx:57-64` | Generic: `patient` optional or `showPatientMonitor?: boolean` prop (hide zone when false). Real data may show SpO2 only when present — current filtering by `values[id] !== undefined` already allows that. |
| Read-only reason | Partial — badge "Solo lectura" only | `ventilator-console.tsx:142` | Generic: `permissions.readOnlyReason?: string` rendered in the badge/title. Or feature `header` slot (no shared change). |
| Pending command per parameter (sent, awaiting ACK) | **No** — after CONFIRMAR the reducer `reset`s; "Pendiente" means *unconfirmed edit* only | `console-controls.reducer.ts:3,121`, `console-controls.tsx:174-175, 256` | Generic: `settings.inFlight?: Readonly<Record<string, "sending"\|"rejected">>` (+ optional `mode` in flight) rendered as a tag next to the parameter; disable re-edit while sending. Without it, the feature can only show a global status in the header. |
| "Derived" label on metrics | **No** — `ValueTile` shows label/value/range only | `value-tile.tsx:33`, `numeric-monitor.tsx` | Generic: `metricsMeta?: Partial<Record<ConsoleMetricId, {derived?: boolean}>>` or a console-wide `metricsCaption` prop ("calculado en el navegador"). Cheapest: a caption via `header`. |
| Overlay for no data / frozen grey curves | **No** — curves freeze only by user toggle; no stale state | `curves-zone.tsx:110-130`; no stale/gap handling in `shared/waveforms` | Generic: `frames.status?: "live"\|"stale"\|"no-data"` (or `curvesOverlay?: ReactNode`) → CurvesZone renders an overlay and greys lanes via a CSS data-attribute. |
| REC indicator | No built-in; `header` slot covers it | `ventilator-console.tsx:139` | Feature-only (header). |
| Playback | Yes — replay pattern proven (`canControl:false`, new `sourceId` per seek) | `use-replay-session.ts` | None. |
| Units | Matches: pressure cmH2O, flow L/min, volume mL | `ventilator-console.entity.ts:138-146` | None. Map `serverTs` → `tMs` (monotonic). |
| Alarm priority | 3 levels vs backend 4 | — | Feature mapping. |
| Controls params/modes | Console ids are the engine's; backend command params are `tidalVolume, respiratoryRate, peep, fio2, pressureLimit, inspiratoryTime, ieRatio, flowRate, sensitivity`, modes VCV/PCV/SIMV/PSV | `console-controls.config.ts`, `ventilator-command-params.ts` | Feature adapter maps ids and passes `applicability` + `limits`; verify every backend param has a console parameter definition (else extend `CONSOLE_PARAMETERS` — generic). |

Summary: the contract is enough for curves, metrics, alarms, read-only and playback. Four generic, backward-compatible additions are recommended in one shared task (T5): optional patient-monitor hiding, `readOnlyReason`, per-parameter in-flight state, frame-source status overlay, plus an optional derived marker. All optional fields → simulator and case-editor unaffected.

## f) Parity checklist (legacy capability → new location)

| Legacy capability (file) | Decision | New location / reason |
|---|---|---|
| Reserve now for N min (`PanelReserva`, `ReservationDialog`, `/simulation/reserve`) | Replaced | `/lab/reservations` calendar + create on `/api/reservations` (T2) |
| "Reservado por X", remaining minutes (`useRemoteVentilator`) | Replaced | occupancy labels by `visibility`/`labelKey` (T2), active reservation countdown in `/lab` + `/lab/live` (T1, T6) |
| Release reservation (`DELETE /simulation/reserve`) | Replaced | cancel in "Mis reservas" (T4) |
| Connection FSM + indicator (`useConexionVentilador`, `IndicadorEstadoConexion`, `PanelConexion`) | Replaced | connection states (socket, join, device connected/stale) + latency (T6) |
| No-signal banner (`NoSignalBanner`, `NoSignalGate`) | Replaced | curves overlay "sin datos" / grey frozen (T5, T6) |
| Web Serial direct connection (`conexion/serial/*`) | **Dropped** | the backend MQTT gateway is the only supported path; browser serial bypasses reservations, control and audit |
| Mode toggle volume/pressure (`ModeToggle`) | Replaced | console mode selector, VCV/PCV/SIMV/PSV (T8) |
| Parameter inputs + validation (`ParameterControls`, `useParameterValidation`, `ventilator-limits.ts`) | Replaced | console pending→confirm with limits + 422 violations (T8) |
| Send config / stop (`ControlPanel`, `useVentilatorControls`, `/simulation/command`) | Replaced | `sendVentilatorCommand` + `command-status` (T8). "Stop" has no command in the new contract → reported |
| Real-time waveforms (`ChartsColumn`, `RealTimeCharts`, `useSignalProcessing`) | Replaced | console curves via ring buffer (T5) |
| Metric cards drag/reorder/show-hide (`MetricColumn`, `useCardConfig`) | **Dropped** (YAGNI, same as simulator decision 12) | fixed console numeric monitor |
| Compliance calc + auto-adjust (`useComplianceCalculation`, `ComplianceStatus`) | Partial | compliance not in console metric ids; derived ΔP/Pplat only if a pause is detectable; auto-adjust dropped (as in simulator) |
| Error detection / validation alerts (`useErrorDetection`, `ValidationAlerts`) | Replaced | 422 violations + client limits in controls (T8) |
| Alarms receive / acknowledge (`ventilatorStreamStore` `alarm:acknowledge`) | Replaced | console AlarmsBar from `ventilator:alarm`; acknowledge = console silence; backend has no ack handler for `alarm:acknowledge` in the new gateway → not migrated (verify) |
| Recording + export TXT/PDF (`useDataRecording`, `useDataExport`) | Replaced | backend recording start/stop (T10), `/lab/recordings` + client CSV (T11). TXT/PDF dropped |
| QR / WhatsApp share (`useQRBridge`, `WhatsAppTransfer`) | **Dropped** | unrelated to lab operation; privacy |
| AI configuration analysis (`AIAnalysisPanel`, `useAIAnalysis`) | Deferred | AI assist is a simulator feature with backend endpoints; no real-ventilator AI endpoint → reported, not migrated |
| Patient simulator form (`simuladorPaciente/*`, `/simulation/patient/*`) | **Dropped** here | superseded by `/simulator` (engine in worker) |
| Change history / diff (`ChangeHistoryPanel`, `DiffViewer`) | Replaced | command history from `getVentilatorCommands` in `/lab/live` side panel (T8) |
| Mock data (`useMockData`, `simulatedRealTimeData`) | **Dropped** | tests use a fake frame source |
| Sessions save/list (`/simulation/session*`) | Dropped | simulator sessions belong to `/simulator` |
| `/dashboard` → `/simulador` redirect, `redirectByRole` | Changed | redirect `/simulador` → `/lab` (T12); landing routes updated |

## g) Bundle baseline

Method identical to `odd/baseline-bundle.md`: `.next/build-manifest.json` → `polyfillFiles` + `pages['/_app']` + `pages[route]`, unique `*.js`, gzip .NET `GZipStream` Optimal, KiB.

- Baseline (2026-10-13, `62c9d68`, `odd/baseline-bundle.md:33`): `/_app` 273, `/simulador` 464 gzip kB.
- After template refactor (`odd/final-verification.md:45,74`): `/_app` 282.6, `/simulador` 473.9.
- **Measured now** from the existing `.next/` (BUILD_ID `V7-tAGXqkZj5tJtEko1xZ`, built 2026-10-16 06:19, after HEAD `c7c7b45` 04:12; build not run by this audit):

| Route | raw KiB | gzip KiB |
|---|---|---|
| `/_app` | 884.6 | 286.3 |
| `/` | 885.0 | 286.6 |
| `/simulador` | 1498.4 | **478.0** |
| `/simulator` | 1234.1 | 403.3 |
| `/simulator/sessions/[sessionId]` | 1234.3 | 403.4 |
| `/simulator/sessions/[sessionId]/replay` | 1234.3 | 403.4 |
| `/simulator/cases` | 1214.4 | 396.3 |
| `/evaluations/[evaluationId]/attempts/[attemptId]` | 1129.2 | 368.0 |

Target for `/lab/live`: ≈ `/simulator/sessions/[sessionId]` (403 KiB) plus the derived-metrics module; it must stay well below legacy `/simulador` 478 KiB. `/lab`, `/lab/reservations`: no console import (lazy only on `/lab/live` and playback).

## h) Plan: `src/features/ventilator-lab`

Layers as simulator: `api/{dtos,mappers,services}`, `application/{config,entities,hooks,components,pages}`, `UI/*.module.css`, `index.ts`. Thin pages under `pages/lab/`. Tests: vitest + msw (`msw ^2.15.0`, `vitest ^3.2.7` in `package.json:101,105`; msw already used e.g. `src/features/simulator/api/services/simulator.service.test.ts`). **Playwright is not installed** (no `@playwright/*` in `package.json` or `node_modules`) → E2E stays manual.

Latency / clock offset: reuse the evaluations/simulator method — `computeClockOffset(serverNow, clientNowAtResponse)` (`src/features/evaluations/application/entities/attempt-timer.ts:16-29`) or the midpoint variant `measureServerOffsetMs(serverNowIso, sentAtMs, receivedAtMs) = serverNow - (sent+received)/2` (`src/features/simulator/application/entities/sim-exam.entity.ts:75-79`). For telemetry: `latencyMs = (clientNow + offset) - batch.serverTs` (display-path latency); offset measured from an API response `serverNow`/`Date` header — verify which envelope field carries server time before T6 (if none, use the HTTP `Date` header midpoint). Promote the midpoint helper to `src/shared/lib` only if a third consumer needs it (YAGNI; otherwise local copy).

### Tooling registrations (as simulator)
- `eslint.config.mjs:87` `NEW_FEATURES` and `:92` `LEGACY_FREE_FEATURES`: add `ventilator-lab`; `:229` boundary glob list `src/features/{...,simulator,case-editor}`: add it; `NEW_PAGE_FILES` (:135-141 pattern): add `pages/lab/index.tsx`, `pages/lab/reservations/index.tsx`, `pages/lab/live/index.tsx`, `pages/lab/recordings/index.tsx`, `pages/lab/recordings/[[]recordingId[]].tsx`; header changelog entry.
- `package.json:10` `lint` script: add `src/features/ventilator-lab` and the five pages (package.json is a protected file → the author must approve this edit, as in previous migrations).
- `tsconfig.strict.json:48,83-89`: add `src/features/ventilator-lab/**/*` and the pages (protected file → same approval).
- `vitest.config.ts:16` `NEW_FEATURES`: add `ventilator-lab`; header version bump.
- `src/shared/session/routes.config.ts:44-51`: `/lab`, `/lab/reservations`, `/lab/live`, `/lab/recordings`, `/lab/recordings/[recordingId]` (authenticated; roles per backend `ventilator:control` / reservations permissions).
- `src/shared/layouts/nav.config.ts:55`: replace "Ventilador real" `/simulador` by "Laboratorio" `/lab` (roles: every role that may book; staff included).
- `src/shared/realtime/realtime.entity.ts:35-55`: ventilator server/client event types (shared, T1).

### Tasks (ordered; each < ~1500 authored lines incl. tests)

| # | Task | Files (new unless noted) | Risk |
|---|---|---|---|
| T0 | Registration + realtime types + feature skeleton | `eslint.config.mjs`, `vitest.config.ts`, `package.json` (lint), `tsconfig.strict.json`, `routes.config.ts`, `shared/realtime/realtime.entity.ts` (+ `ventilator:*` events, `ventilator:join`, `ventilator:heartbeat`, `reservation:preempted`), `src/features/ventilator-lab/index.ts`, `application/config/lab.config.ts` (routes, lab defaults 15/120/14/3/5 marked backend-gap) | Low; protected files need author OK |
| T1 | Summary `/lab` | `api/dtos/lab.dto.ts` (aliases of generated schema), `api/services/reservations.service.ts` (`current`, `mine`, calendar), `api/mappers/reservations.mapper.ts` (Detail vs Summary by `visibility`, labelKey → Spanish), `application/hooks/use-current-reservation.ts`, `application/pages/lab-home.page.tsx` (active/next reservation, countdown with clock offset, CTA to live), `UI/lab-home.module.css`, `pages/lab/index.tsx` | Low |
| T2 | Calendar + create `/lab/reservations` | `application/entities/slot-grid.ts` (pure: slots by `slotMinutes`, max duration, booking window, upcoming limit), `application/components/reservation-calendar.tsx` (week view, occupancy by role), `create-reservation-dialog.tsx` (USER/GROUP for staff, purpose), `hooks/use-reservations-calendar.ts`, `use-create-reservation.ts` (refetch after `data:null`), pages + CSS | Medium (time zones, slot math) |
| T3 | Preemption (staff) | 409 conflict parsing in mapper, `preempt-confirm-dialog.tsx` (conflicts list, reason, `confirmPreempt` retry), `preemptReservation` service; student side: `use-preemption-notice.ts` on `reservation:preempted` + `notification:new` toast | Medium (409 payload shape — verify `errors-map` details) |
| T4 | My reservations | `application/components/my-reservations-list.tsx` (upcoming/past/preempted with `preemptedReason`, cancel with confirm), `use-cancel-reservation.ts`; section in `/lab/reservations` | Low |
| T5 | Real adapter core | `application/entities/telemetry-frame.mapper.ts` (frame→`ConsoleSample`, `serverTs`→monotonic `tMs`, reset on backwards time), `frame-hub.ts` (stable source, `sourceId=reservationId`, estimated `sampleRateHz`), `derived-metrics.ts` (pure breath segmentation by flow sign: Ppeak, PEEP, Vte, RR, VE, I:E; ΔP/Pplat only with a plateau), `settings-from-frame.ts` (mode/settings → console ids), `real-console-adapter.ts`; **shared console change** (optional `showPatientMonitor`, `readOnlyReason`, `settings.inFlight`, `frames.status` overlay, derived marker) with tests in `src/shared/ventilator-console` | **High** (derived metric correctness; shared contract change touching simulator/case-editor — must be additive) |
| T6 | Connection states + latency `/lab/live` | `hooks/use-ventilator-room.ts` (emit `ventilator:join` on authenticated/reconnect/reservation start; `join-rejected`, `availability`), `use-device-status.ts` (`connected`/`disconnected`, stale timer from `telemetry.staleAfterMs` default), `use-telemetry-latency.ts` (clock offset), `connection-status-bar.tsx`, `application/pages/lab-live.page.tsx` (lazy console), `pages/lab/live/index.tsx` | Medium |
| T7 | Operator control | `api/services/control.service.ts` (get/take/takeover/release/heartbeat), `hooks/use-operator-control.ts` (state machine, heartbeat every 5 s HTTP or socket while operator, release on unmount/pagehide keepalive), `control-panel.tsx` (take, force with confirm for staff, release) | Medium (presence edge cases) |
| T8 | Commands | `api/services/commands.service.ts`, `entities/command-mapper.ts` (console confirmation → `SendVentilatorCommandRequestDTO`, required params per mode), `hooks/use-ventilator-commands.ts` (in-flight per parameter, `command-status` events, 403/423/503/422/429 copy, Retry-After), `command-history-panel.tsx` (`getVentilatorCommands`), limits from vendored engine limits ∩ `commands.safety.*` defaults | **High** (safety: never send unconfirmed values; double-send; mapping errors) |
| T9 | Control revoked | handling `control-changed` reasons (takeover, presence_timeout, reservation_ended, reservation_preempted) → read-only with reason, drop pending edits, banner; reservation end countdown warnings | Medium |
| T10 | Recording | `api/services/recordings.service.ts` (start/stop, 409), `hooks/use-recording.ts` (local REC state since no GET), REC indicator in console header | Low–Medium (no status endpoint: state lost on reload → documented) |
| T11 | Recordings list + playback | `/lab/recordings` (list derived from past `mine` + probe `getTelemetryRecording`), `/lab/recordings/[recordingId]` (`recordingId = reservationId`; playback hub with play/pause/seek/speed reusing the replay pattern, `canControl:false`, client CSV export), pages + CSS | Medium (large payloads: frames array in one response; chunked rendering) |
| T12 | Redirects, nav, parity, docs | `pages/simulador/index.js` → redirect `/lab` (only with author approval; P2), `pages/dashboard/index.js` + `redirectByRole.js` targets, `nav.config.ts:55`, legacy sidebars, `odd/ventilator-lab-parity.md`, final verification (typecheck, lint, test, greps; build + bundle by the author) | Medium (removing the only working physical-ventilator UI — keep legacy until T6–T8 are verified on hardware) |

Hardware verification (`ventylab-server/docs/hardware-test-protocol.md`) and the fake device cannot validate command ACK (section d): T8/T9 manual checks need the real ESP or an extended fake device (backend change, out of scope).

Backend follow-ups to report (not front tasks): non-admin lab-settings read, safety-ranges read, latest-settings endpoint, recordings list + CSV, recording status, created reservation id in response, `sampleRateHz` in live batch, settings/alarms in recordings, fake device command echo, stale `ventilator-telemetry.schema.json`.
