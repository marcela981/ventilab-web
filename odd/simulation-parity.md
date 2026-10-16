# Simulation parity checklist (legacy `/simulador` → `/simulator` + `/simulator/cases`)

Date: 2026-10-16. Source of the legacy inventory: `odd/simulation-audit.md` (section a: views; section g: the 26 user-visible capabilities). Decisions: `odd/tasks/simulation.md` (numbers below refer to its "Decisions" list).

Status legend: **ported** (available in the new feature), **dropped** (intentionally not carried over, with the decision), **kept legacy** (still served by the legacy route on purpose), **pending** (not done yet).

## Legacy routes

| Legacy route | Status | New equivalent |
|---|---|---|
| `/simulador` (`pages/simulador/index.js`) | **kept legacy** (decision 11) | Not redirected: it is the only UI of the physical ventilator (reservation, connection, MQTT/Socket.io live data). Nav entry relabelled "Ventilador real" (students). The engine simulator is "Simulador" → `/simulator` (every role); "Casos clínicos" → `/simulator/cases` (teachers and admins). |
| Other legacy simulator or clinical-case pages | none exist | The audit and a search of `pages/` find no other legacy simulator or case route (`pages/dashboard/index.js` is a dashboard redirect to `/simulador`, outside this feature). No redirect page was needed. |

Legacy links that still point at `/simulador` and are outside this feature's edit surface: `src/shared/components/Sidebar.jsx:49` and `src/features/admin/components/panel/PanelSidebar.jsx:268` (legacy sidebars, label "Simulador"), `src/shared/utils/redirectByRole.js:25-33` (legacy landing route) and `pages/dashboard/index.js`. They stay valid because `/simulador` is kept; relabel or repoint them during P2.

## Capabilities (audit section g)

| # | Legacy capability | Status | Where / why |
|---|---|---|---|
| 1 | Bottom tabs (Simular Paciente / Monitoreo / Conexión) | ported | Replaced by routes: catalog `/simulator` → console `/simulator/sessions/[id]` → result and replay. Conexión stays legacy (row 21). |
| 2 | Two-step patient form | ported (partly dropped) | Case editor "Paciente" (sex, age, height, weight, live PBW by the engine Devine formula) and "Datos generales" (title, diagnosis, difficulty, pathology, comorbidities, clinical history, present illness, relevant history). HR, temperature, systolic/diastolic BP and Glasgow have no engine counterpart: **dropped** (decision 6). Allergies and breathing pattern have no contract field: write them in the history. Name is not a case field (cases are not real patients). |
| 3 | "Paciente activo · IBW · VT recomendado" banner | ported | Session case panel (patient, PBW) and the live objectives; the Vt/kg PBW metric. |
| 4 | VCV/PCV toggle | ported (superset) | Mode selector VCV, PCV, PSV, CPAP, SIMV with pending → confirm (T4). |
| 5 | FiO2, VT, Qmax, PIP, PEEP inputs | ported | Console parameter controls with the vendored engine limits and pending → CONFIRMAR/CANCELAR. Qmax has no engine setting (flow pattern + Ti instead). |
| 6 | I:E slider, I:E boxes, Ti/Te readout | ported | Ti control; I:E shown as a metric (Ti/Te). |
| 7 | Inspiratory pause | ported | `inspiratoryPauseS` control (0–2 s). |
| 8 | Expiratory pause | dropped | No engine support; no hold buttons (decision 5). |
| 9 | Frequency input + slider (slider bug 0–24) | ported | RR control 5–40 from the engine limits; the slider bug is gone. |
| 10 | "Enviar" (validate, send, record, TXT download) and "Detener" | ported / dropped | CONFIRMAR sends a PARAM_CHANGE (batched, idempotent, acknowledged by the worker); "Finalizar sesión" ends the session. TXT export **dropped** (decision 12): result + replay replace it. |
| 11 | Real/simulated source switch, "Simular Gráficas" | kept legacy | Physical-ventilator data stays on `/simulador` (decision 11). |
| 12 | Three live curves | ported | Canvas sweep/scroll renderer (T2) in the shared console (T3). |
| 13 | Zoom in/out/reset (2–60 s) | ported | Window selector 5/10/20/30 s, freeze and measurement cursor, P-V/F-V loops. |
| 14 | Connection status chip | ported | Session status (running, paused, ending), engine version banner, pending-events indicator, divergence dialog. |
| 15 | 12 metric cards with colours and trends | ported | Numeric monitor (12 engine metrics) with out-of-range highlighting and text (not colour only). |
| 16 | Card drag-reorder, hide/show, reset layout | dropped | YAGNI (decision 12). |
| 17 | Integrated-volume reset | dropped | Not needed: the engine outputs volume. |
| 18 | Compliance status panel | ported (derived) | Driving pressure, Pplat and mechanical power metrics; compliance is a case input (case editor mechanics). |
| 19 | Validation alerts, client error detection, PCV auto-adjust | ported / dropped | Engine alarms + alarms bar (priority, 2-min silence, sound, history, limits; T4). PCV auto-adjust **dropped** (decision 12: it hides learning). |
| 20 | AI analysis drawer (browser-side keys) | ported | "Asesoría IA" panel: `POST /simulation/sessions/{id}/assist` (SSE), rating `SIM_ASSIST`, EXAM policy (T7). No API keys in the browser. |
| 21 | Ventilator reservation, connect/disconnect, "Sin señal" | kept legacy | Physical ventilator (decision 11); needs its own migration (ventilator-lab). |
| 22 | Session saved on unmount | ported | Events persisted continuously (queue + outbox + keepalive), `POST /end`, resume from `/replay` + `/state`. |
| 23 | Recording indicator and toasts | ported | "N eventos pendientes de envío" indicator and toasts. |
| 24 | Web Serial connection (not mounted) | dropped | Unreachable in the legacy page already. |
| 25 | Patient monitor values | ported | SpO2, PaO2, PaCO2, pH, MAP with trends (decision 6: only what the engine outputs). |
| 26 | Dark-themed screen | ported | `--vl-console-*` tokens on the console surface (T1). |

## New capabilities (no legacy counterpart)

| Capability | Task |
|---|---|
| Engine in a Web Worker with deterministic seed, fixed step and catch-up | T1, T6 |
| Case catalog with server filters and "Mis sesiones" history | T5 |
| Result page (server score, objectives, breakdown, local evolution charts) and replay with seek and marks | T8 |
| Exam practical question (EXAM session, deadline, return to the attempt) | T9 |
| Shared rubric editors (parameter rubric promoted, outcome rubric for the case default rubric) | T10 |
| Staff case list and sectioned case editor (ranges, configure console, events, targets, rubric, 422 mapping, unsaved guard) | T11 |
| Server test run, local draft preview, expert validation, delete → archive | T12 |

## Pending

| Item | Status |
|---|---|
| P2: remove the legacy simulator code once ventilator-lab is migrated | pending — needs the author's approval |
| Backend gaps (see the tracker "Backend gaps to report"), top one: the `Date` header is not exposed by CORS | pending — backend |
| `next build` + bundle measurement of the new routes (worker chunk, `/_app` delta of the exam slot registration) | pending — run by the parent / the author |

## Manual checks pending for the author

No browser, servers or Playwright were available; every item below is covered only by unit tests so far.

1. `/simulator`: catalog filters, start a FREE practice at ×1/×2/×4, the "Mis sesiones" table, continue an ACTIVE session.
2. Session console: worker boots (`next build` smoke of `new Worker(new URL(...))`), sweep curves at 50 Hz on the dark surface, HiDPI, freeze and cursor readout, the three breakpoints (≥1280, 1024–1279, <1024), alarm beep after enabling sound, silence countdown.
3. Pending → CONFIRMAR/CANCELAR of a change, reload mid-session (resume), a second tab ("Esta sesión ya está abierta en otra pestaña"), back/forward cache.
4. "Asesoría IA": a real SSE answer, "Detener", the rating, the lazy chunk.
5. Result and replay: line charts, scrubbing feel, marks, the version banner.
6. Exam: the practical part inside the attempt player, start → console → deadline expiry → return to the attempt with the question restored; a cross-origin `Date` header.
7. Case editor: sticky index, the configure console inside the light page, "Guardar" disabled until a change, the "Aplica o descarta los cambios del ventilador" note, a real 422 from the backend, the unsaved-changes prompt (in dev the Next.js overlay shows the aborted route change as an unhandled rejection: expected).
8. Case tools: server test run charts, local preview console, "Marcar como validado", delete of a case in use → "Archivar".
9. Nav: students see "Simulador" (`/simulator`) and "Ventilador real" (`/simulador`); teachers and admins see "Simulador" and "Casos clínicos".
10. `/simulador` still works for the physical ventilator (reservation, connection, live data).
