<!--
* Funcionalidad: Hardware test protocol (front)
* Descripción: Front-end steps of the manual session with the physical ventilator (ventilator-lab, /lab): reserve, take the control, send changes, check that the console shows the values the device reports, device disconnection (overlay), preemption during use (modal), latency with the indicator (p95 < 100 ms), recording and playback; the fake-device procedure on a TEST broker; the performance protocol (60 msg/s × 5 min latency, fps and memory). Every run is PENDING: no result is recorded here until the author runs it with the device custodian. v1.1 (T12 review fix W1): the nav indicator shows nothing while the device state is unknown.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Hardware test protocol — front end (`/lab`)

Status: **pending manual runs** (no session has been run yet; nothing below is a result).

This document covers what the operator does and checks **in the browser**. The backend side of the same session
(preconditions, safety rules, server configuration, MQTT topics, metrics endpoints, teardown) is the backend protocol:
[`ventylab-server/docs/hardware-test-protocol.md`](../../ventylab-server/docs/hardware-test-protocol.md). Run both
together: the backend sections 1 (preconditions) and 2 (safety rules) apply before any step here.

## Safety (read first)

- The ventilator is connected to a **test lung / lung simulator, never to a person or animal**.
- The **device custodian (hardware owner) is present for the whole session** and has the final word: every value is
  agreed with them before "CONFIRMAR", one parameter at a time, inside the safety caps.
- The software has **no emergency stop**: stopping ventilation is done at the device.
- Automated tests never send commands to the physical device. The fake device (section B) refuses the lab broker.
- Abort (stop at the device, "Liberar control", note the reason) on any unexpected behaviour, an unexpected alarm, or a
  console value that does not match what the device shows.

## Accounts and browsers

| Who | Browser | Used in |
| --- | --- | --- |
| STUDENT (holder) | Browser A (Chrome, DevTools open) | A1–A8 |
| TEACHER | Browser B (another profile or a private window) | A6, A8 |
| ADMIN | Browser B or C | optional (settings, preemption of a teacher) |

Record per step: date/time, account, result (OK / not OK), the value seen in the console and on the device, notes.

## A. Session with the physical ventilator (custodian present)

### A1. Reserve

1. Browser A (STUDENT): open **Laboratorio** in the side navigation (`/lab`). The item shows "Equipo en línea" /
   "Equipo sin datos" only when the backend reported it; while the state is unknown it shows no indicator (the backend
   only broadcasts transitions and students have no state read, so right after loading a student may see none until
   the next event or the first telemetry; a teacher/admin is seeded from the system status). Note what it shows.
2. "Reservas" (`/lab/reservations`): pick a free slot that covers now, "Reservar", confirm.
3. Expected: success message; the slot shows the reservation; `/lab` shows it as active with "Entrar a la consola".

### A2. Take the control

1. "Entrar a la consola" (`/lab/live`): header with the window, countdown (server clock), device state and latency.
2. "Tomar control". Expected: banner "Controlas el equipo"; the console controls become editable.
3. Browser B (TEACHER) on `/lab/live`: sees "Opera: …" and a read-only console with the reason.

### A3. Send changes (one per row, values agreed with the custodian)

For each change: edit one parameter, "CONFIRMAR", and follow the tag on the parameter.

| Step | Change (example, agree the real value) | Expected in the console |
| --- | --- | --- |
| A3.1 | PEEP +1 cmH2O | "Enviando" → "Esperando confirmación del equipo" → the displayed value changes only when the device REPORTS it; "Comandos recientes" shows the final status. |
| A3.2 | FiO2 +5 % | as A3.1 |
| A3.3 | FR +1 | as A3.1 |
| A3.4 | An out-of-range value (above the backend safety cap, agreed as "will be refused") | Refused before sending (limit) or 422 with the violation in Spanish; nothing changes on the device. |

Note: while the device reports `flowRate`, a Vt or Ti change is refused by design (the backend encoder does not carry
the flow); a change into PCV/PSV is refused (no documented pressure semantics). Record it if it happens.

### A4. The console shows the values REPORTED by the device

1. Compare every setting in the console with the device screen: they must be equal (the console shows only what the
   telemetry `settings` report, never the value just typed).
2. If the device does not report a parameter, the console must show "—" ("Sin valor informado").
3. Derived metrics (Ppico, PEEP, Vte, FR, I:E, VE; Pplat/ΔP only with a plateau) carry the label "derivada": compare
   with the device readings and note the differences (they are computed in the browser from the curves).

### A5. Disconnect the device (overlay)

1. The custodian stops the device publishing (network cable or bridge pause).
2. Expected after about 2 s (`telemetry.staleAfterMs`): grey frozen curves under "Equipo sin datos", the controls
   read-only with the reason, the latency "—", the nav indicator "Equipo sin datos".
3. Restore: the curves resume by themselves, the controls come back for the operator, the indicator "Equipo en línea".

### A6. Preemption during use (modal)

1. Browser A (STUDENT) is operating.
2. Browser B (TEACHER): `/lab/reservations`, select the occupied slot ("Reservar … sobre la reserva de …"),
   "Desplazar y reservar".
3. Expected in Browser A: blocking modal explaining that the reservation was displaced (with the reason when the
   backend sends one); the console stays visible read-only; "Entendido" goes to `/lab`. No command can be sent.
4. Browser B: "Entrar a la consola", "Tomar control", one agreed change (A3.1).

### A7. Latency with the indicator (p95 < 100 ms)

1. With the device streaming and the console open (Browser A, nothing else heavy running), wait at least 5 minutes.
2. Read the header latency: "N ms · p95 M ms" (display path: from the server flush of each telemetry batch to the
   browser, using the server clock offset; colour green < 70 ms, yellow 70–99 ms, red ≥ 100 ms by the session p95).
3. Target: **session p95 < 100 ms**. Record the current value and the p95 at 1, 3 and 5 minutes; if it shows
   "— (reloj sin sincronizar)" record that and reload once.
4. In parallel, the backend metrics of its section 6 (`metrics.csv`) give the server-side part.

### A8. Recording and playback

1. Browser A (holder) or Browser B (teacher), during an active reservation: "Grabar sesión"; REC appears in the
   console header (only in that tab). Let it record at least 2 minutes, with one agreed change and one short device
   disconnection (A5) in the middle.
2. "Detener grabación" → confirm.
3. `/lab/recordings`: the reservation is listed; open it.
4. Expected: header with the date and "Duración: … (incluye N intervalos sin datos, … en total)" when the recording
   has gaps; "Datos submuestreados por el servidor a N Hz."; play / pause, ×0.5–×4, seek; the gaps marked on the time
   bar and listed; inside a gap the console shows "Sin datos grabados en este intervalo"; read-only.
5. Repeat the playback as the other accounts (student holder, teacher, admin) and note who can open it.

### A9. Teardown

"Liberar control"; return the device to the agreed settings (at the device if needed); cancel or let the reservation
end; then the backend teardown (its section 9).

## B. Fake device on a TEST broker (no hardware)

Use it to rehearse A2–A8 without the device. Full instructions: [`scripts/e2e/README.md`](../scripts/e2e/README.md).

1. A broker you control (e.g. local Mosquitto `mqtt://localhost:1883`), never the lab broker.
2. A TEST backend with `NODE_ENV=test`, its own env file pointing `MQTT_BROKER_URL` to that broker and
   `MQTT_TELEMETRY_TOPIC=test/ventylab/ventynet/data`.
3. `node scripts/e2e/fake-ventilator.mjs --broker mqtt://localhost:1883` (refuses a remote broker unless
   `--allow-remote-test-broker`, and always refuses the broker of the backend env files).
4. Run A2–A8 against it: `--reject peep --ack-topic …` for a rejection, `--pause 30:10` for the disconnection
   overlay, `--rate 60` (default) for the performance runs of section C.

## C. Performance protocol (pending manual runs)

Results go to [`docs/perf/`](perf/README.md) with the date, the commit, the browser, the machine and the source
(fake device or real device). **No result has been recorded yet.**

| Run | Setup | Measure | Target |
| --- | --- | --- | --- |
| C1 Latency | 60 msg/s for 5 min (fake device `--rate 60`, or the real device), `/lab/live` open as operator | Header latency: current and session p95 at 1, 3 and 5 min (+ backend `metrics.csv` of the same window) | p95 < 100 ms |
| C2 Frame rate | Same stream, 5 min | Chrome DevTools → Rendering → "Frame rendering stats" (or a Performance recording); median fps over the 5 min | median ≥ 30 fps |
| C3 Memory | Same stream, 5 min | DevTools → Performance monitor "JS heap size" at 0, 1, 3, 5 min (or two heap snapshots, 1 and 5 min) | stable: no steady growth after the first minute |
| C4 Playback | A recording of ≥ 30 min at 20 Hz (36k frames) | download time, "Preparando la grabación… %" without freezing the page, playback at ×4 | page stays responsive |

## Results template

Copy to `docs/perf/<date>-<run>.md`:

```
Date / time:
Commit:
Browser + version, OS, machine:
Source: fake device (rate) | real device (custodian: …)
Run: C1 | C2 | C3 | C4 | A-step
Values (with the time they were read):
Target met: yes / no
Notes / anomalies:
```
