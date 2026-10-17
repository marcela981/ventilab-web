<!--
* Funcionalidad: Fake ventilator usage
* Descripción: How to run the fake ventilator (scripts/e2e/fake-ventilator.mjs) for automated tests of /lab/live against a TEST backend and a TEST broker.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Fake ventilator (automated tests)

`fake-ventilator.mjs` stands in for the physical ventilator over MQTT so `/lab/live` can be tested end to end
(curves, derived metrics, latency, commands, "Equipo sin datos") **without the device**. The backend fake
(`ventylab-server/scripts/simulate-ventilator.ts`) does not reflect settings, so its commands always end in `TIMEOUT`;
this one does.

> **Only against a TEST broker and a TEST backend.** On the lab broker its frames and ACKs would reach the backend as
> if they came from the physical ventilator, mixed with (or instead of) the real ones. The script refuses to start
> without an explicit broker and prints this warning every time. It also refuses a broker outside this machine
> (unless `--allow-remote-test-broker`) and, always, the broker of every backend env file that exists (`.env`,
> `.env.local`, `.env.development`: `MQTT_BROKER_URL` / `MQTT_URL`, same host and port, with `localhost`, `127.0.0.1`
> and `::1` treated as the same host; the url is never printed). Its default topics carry the `test/ventylab/` prefix. Automated tests
> never target the physical device.

## Requirements

- The backend checkout next to this repo (`../ventylab-server`) with its dependencies installed: `mqtt` is loaded from
  `../ventylab-server/node_modules` (no dependency is added to the front). Another checkout: `--server-dir <path>`.
- A broker you control (for example a local Mosquitto at `mqtt://localhost:1883`) and a TEST backend started with
  `NODE_ENV=test` (command/ACK topics prefixed with `MQTT_TEST_TOPIC_PREFIX`, default `test/ventylab`), its own env
  file with `MQTT_BROKER_URL` pointing to that broker (not the lab `.env`) and
  `MQTT_TELEMETRY_TOPIC=test/ventylab/ventynet/data` (the backend does not prefix the telemetry topic).

## Run

```bash
node scripts/e2e/fake-ventilator.mjs --broker mqtt://localhost:1883
# or
FAKE_VENTILATOR_BROKER_URL=mqtt://localhost:1883 node scripts/e2e/fake-ventilator.mjs
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--broker <url>` | none (required) | TEST broker; also `FAKE_VENTILATOR_BROKER_URL`. Only localhost unless `--allow-remote-test-broker`; never the backend `.env` broker. |
| `--allow-remote-test-broker` | off | Accept a TEST broker outside this machine. |
| `--telemetry-topic <t>` | `test/ventylab/ventynet/data` | Must equal the TEST backend `MQTT_TELEMETRY_TOPIC`. |
| `--command-topic <t>` | `test/ventylab/ventilab/device/001/command` | The backend `MQTT_COMMAND_TOPIC` (`ventilab/device/001/command`) with the `NODE_ENV=test` prefix. A topic without the `test/ventylab/` prefix prints a warning. |
| `--ack-topic <t>` | none | Backend `MQTT_COMMAND_ACK_TOPIC` (same prefix rule). Without it the backend infers `APPLIED` from the reported settings, and a rejection ends in `TIMEOUT`. |
| `--rate <hz>` | 60 | Frames per second (one JSON frame per message, QoS 0). |
| `--stop-after <s>` | none | Exit after `s` seconds. |
| `--pause <after>[:<for>]` | none | Stop publishing after `after` s (for `for` s, or until exit): the backend marks the device stale and the console shows "Equipo sin datos". |
| `--reject <param>` | none | Reject commands that change `param` (`mode` or a command field such as `peep`; repeatable). With an ACK topic it ACKs `rejected` with reason `fake_reject_<param>`; without one the command times out. |
| `--device-id <id>` | `ventilab-fake-e2e` | `deviceId` of the frames. |

## What it does

- **Telemetry**: `{ seq, deviceTs, pressure, flow, volume, mode, settings, deviceId }` (the backend JSON decoder
  fields), from a single-compartment lung (R 10 cmH2O/(L/s), C 50 mL/cmH2O): square-flow volume breaths in VCV/SIMV,
  pressure held at `pressureLimit` in PCV/PSV, passive expiration to PEEP. Default settings: VCV, Vt 450 mL, FR 14,
  PEEP 5, FiO2 0.4, Ti 1 s, sensitivity 2 L/min.
- **Commands**: the flat JSON of the backend encoder (`mode`, numeric fields, `ieRatio` as `"1:2"`, `correlationId`).
  The received fields become the reported `settings` of the next frames (fields absent from the command are dropped,
  as the command is a full setting set), so the backend resolves the command `APPLIED` by matching them.
- **Logs**: one line per command (`applied` / `rejected` and the reason) and per pause change.

## Typical checks (manual or scripted)

1. Start the TEST backend, the fake and the front; open `/lab/live` during a reservation, take the control.
2. Change PEEP and confirm: the tag goes "Enviando" → "Esperando confirmación del equipo", then the value changes when
   the fake reports it and "Comandos recientes" shows "Aplicado por el equipo".
3. `--reject peep` (with `--ack-topic`): the change shows "Rechazado: motivo informado: «fake_reject_peep»" and the
   control stays at the reported value.
4. `--pause 30:10`: after 30 s the curves grey out under "Equipo sin datos" and recover 10 s later.
5. 60 frames/s for 5 minutes: latency indicator and fps (pending manual measurement, decision 12).
