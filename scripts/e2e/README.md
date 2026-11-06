<!--
* Funcionalidad: Fake ventilator usage
* Descripción: How to run the fake ventilator (scripts/e2e/fake-ventilator.mjs) for automated tests of /lab/live against a TEST backend and a TEST broker. v1.3 (W10, Bloque 2): the fake LLM (scripts/e2e/fake-llm.mjs) for the TutorAI E2E specs. v1.4 (Bloque 3): the fake LLM also answers grade feedback prompts; Block 3 evaluation E2E. v1.5 (cierre IA): fault injection modes of the fake LLM (per request, runtime and start mode) and the deterministic fallback E2E of Profundizar. v1.6 (Bloque A): the fake LLM answers the simulator case interpretation; Bloque A E2E (e2e/bloque-a) with the stack on its own ports, a TEST Mosquitto broker and the fake ventilator for the real mode. v1.7 (fix sim-assist-current-state): answer modes `echo` and `claims-stable` of the fake LLM and the current-state E2E of the AI help.
* Versión: 1.7
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

---

# Fake LLM (TutorAI E2E)

`fake-llm.mjs` is a local **OpenAI-compatible** chat completions server (`POST /v1/chat/completions`, full or
streamed) so the TutorAI specs of `e2e/bloque2/` run through the **real backend** (conversation, messages, AI call
telemetry and ratings) without provider keys. The backend has no fake provider of its own, and without keys its AI
use cases answer 503.

> **Test only.** It listens on `127.0.0.1`. Never point a shared or production backend at it: every AI answer would be
> this fixed text.

```bash
node scripts/e2e/fake-llm.mjs                  # http://127.0.0.1:4910/v1
# backend (its own env, local database):
OPENAI_BASE_URL=http://127.0.0.1:4910/v1 OPENAI_API_KEY=local node dist/main
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--port <n>` | 4910 (`FAKE_LLM_PORT`) | Port on 127.0.0.1. |
| `--chunk-delay <ms>` | 120 | Pause between streamed deltas (keeps "Detener" visible while it streams). |
| `--mode <mode>` | `ok` (`FAKE_LLM_MODE`) | Start fault injection mode (see below). |
| `--retry-after <s>` | 30 (`FAKE_LLM_RETRY_AFTER`) | `Retry-After` seconds sent by the `429` mode. |

What it answers: the simulator case interpretation prompt (its `<parametros_curados>` block, sent when a FREE
session starts) gets a strict JSON that echoes every curated value with `"trajectory": "STABLE"`, so the backend
accepts it (source LLM) and the session runs the curated physiology; a grade feedback prompt (it asks for `{"overall": …, "perQuestion": …}`) gets a parseable grade
feedback whose overall text says "proveedor falso de E2E" (so the evaluation result shows LLM feedback, not the
deterministic fallback); otherwise a streamed request gets a fixed Spanish markdown answer ("Respuesta de prueba (proveedor falso de
E2E)…") in deltas of 24 characters, then a usage chunk and `[DONE]`; a full or JSON-format request gets
`{ onTopic: true, summary, keyConcepts, gaps, suggestions }`, which satisfies the topic check and the notes analysis.
The model reported is `fake-llm-e2e`.

## Fault injection

Each request is answered in one of these modes:

| Mode | What the backend receives |
| --- | --- |
| `ok` | The normal answers above (default). |
| `429` | `429` with `Retry-After: <--retry-after>` and an OpenAI-style `rate_limit_exceeded` JSON error. |
| `500` | `500` with an OpenAI-style `server_error` JSON error. |
| `timeout` | Nothing: the request stays open until the backend times it out or aborts it. |
| `drop-mid-stream` | `200` and part of the answer (about half of the deltas, or half of the JSON body), then the connection is destroyed without `[DONE]`. |
| `malformed-json` | `200` with an unparseable body (full request) or, in a stream, one valid delta, an unparseable `data:` chunk and `[DONE]`. |
| `echo` | A simulator help prompt (its `<estado_actual>`, `<estado_monitor>` or `<estado_simulacion>` block) is answered with the values it received: `ECO DEL ESTADO RECIBIDO: t = … · SpO2 … %` and, on the next line, their JSON. Other prompts answer as in `ok`. |
| `claims-stable` | A simulator help prompt is answered "El paciente está estable. La SpO2 en 89 % …" (also on the regeneration), to exercise the coherence validator. Other prompts answer as in `ok`. |

How the mode of a request is chosen, first match wins:

1. **Per request:** a `[[fake-llm:<mode>]]` directive anywhere in the prompt (system or messages). In the UI, type it in
   the question, e.g. `¿Qué es la PEEP? [[fake-llm:500]]`. Later turns of the same conversation carry it in their
   history, so they fault too. An unknown mode in the directive is ignored.
2. **Runtime:** `PUT /__fake-llm/mode` with `{"mode": "<mode>"}` (also `POST`); `GET /__fake-llm/mode` returns the
   current one. It lasts until the next change or a restart.

   ```bash
   curl -X PUT http://127.0.0.1:4910/__fake-llm/mode -d '{"mode":"429"}'
   curl -X PUT http://127.0.0.1:4910/__fake-llm/mode -d '{"mode":"ok"}'
   ```
3. **Start:** `--mode <mode>` or `FAKE_LLM_MODE` (default `ok`).

Every request logs `stream|completion (mode <mode>)`. What the user sees depends on the backend: its retries, the next
provider, the per-use-case fallback (deterministic answer labelled "Respuesta automática (IA no disponible)" in the
web) or the error (503 with `Retry-After` when every provider is rate limited and the use case has no fallback).

> **Circuit breaker.** Every failed call counts towards the backend breaker of the provider: after
> `AI_BREAKER_FAILURE_THRESHOLD` consecutive failures (default 3) it skips the fake for `AI_BREAKER_OPEN_SECONDS`
> (default 60), so the **following** AI requests also get the fallback. Run fault specs alone or last, or start the
> backend with a high `AI_BREAKER_FAILURE_THRESHOLD` while testing faults.

### Deterministic fallback E2E (Profundizar)

`e2e/bloque2/tutor-fallback.spec.ts` asks Profundizar a question with the `[[fake-llm:500]]` directive, so no
provider answers and the backend sends the deterministic fallback: the page shows "Respuesta automática (IA no
disponible)", the text without the "[Respuesta automática sin IA]" prefix and no "¿Te fue útil?" widget. It needs the
same stack as the Block 2 specs. It is **not in the CI job**: its failures open the provider breaker for the rest of
the run (see above). Run it on its own:

```bash
E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:4000 npx playwright test --project=e2e e2e/bloque2/tutor-fallback.spec.ts
```

Block 2 E2E (stack of `LOCAL_STACK.md`, fake LLM running, backend started with the two variables above):

```bash
E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:4000 npx playwright test --project=e2e e2e/bloque2
E2E_CAPTURES=1 ... e2e/bloque2/capturas.spec.ts   # screenshots to docs/bloque2/capturas/
```

Each scenario registers a brand-new student (`e2e-b2-*@ventylab.test`), so the specs run again without resetting the
database; the TutorAI spec reads `/api/admin/ai-ratings/stats` as `superadmin@ventylab.demo` (`E2E_ADMIN_EMAIL`).

Block 3 E2E (evaluations; same stack, fake LLM running for the AI feedback of the quiz result):

```bash
E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:4000 npx playwright test --project=e2e e2e/bloque3
E2E_CAPTURES=1 ... e2e/bloque3/capturas.spec.ts   # screenshots to docs/bloque3/capturas/
```

Each scenario creates a brand-new STUDENT group of `ana.torres@ventylab.demo` with brand-new students and its own
evaluations through the API (closed and archived at the end), so it runs again without resetting the database. The
exam scenario waits for its one-minute timer in real time. The image step of the builder scenario runs only when
`GET /api/system/status` reports file storage `up` (Supabase configured); otherwise it is skipped with an annotation.

Block A E2E (simulator adjustments, `e2e/bloque-a/`; helpers in `e2e/support/bloque-a.ts`):

| Spec | Covers | CI |
| --- | --- | --- |
| `aplicacion-automatica` | Digital: a PEEP change applies with no confirm button and reaches the stored session events | yes |
| `paciente-fallecido` | `engine-ards-unstable` ("SDRA grave inestable") at ×4 left alone: Inestable → Crítico, the session ends on its own and the debrief shows "Paciente fallecido" and the "Línea de tiempo" (≈ 40 s) | yes |
| `mejoria` | Same case with PEEP 12, FiO2 80 % and Vt 380 mL: the status chip reaches Estable and the SpO2 card rises; the debrief lists the decisions | yes |
| `alarma-ayuda` | "¿Cómo estabilizar? SpO₂ baja": rules with their source, the fake LLM suggestion and its AI_CALL / SIM_ALARM rating | yes |
| `repeticion` | The vendored engine replays the stored events in Node and equals the server `finalMetrics`; the live status chip equals the server outcome; the browser replay shows no mismatch note | yes |
| `asesoria-estado-actual` | Same unstable case at ×4 left alone until "Crítico", paused: with the fake LLM in `echo` mode "Asesoría IA" and "¿Cómo estabilizar?" send the console time and snapshot and the echoed SpO2 and severity match the screen (±2 %), with the header "Analizado en t = mm:ss · gravedad X %"; in `claims-stable` mode the answer is replaced by the deterministic suggestion with "La IA no pudo analizar el estado actual"; from 1440 px the drawer pushes the curves | yes |
| `modo-real-asesoria` | Real mode, fake LLM in `echo` mode: "Asesoría IA" sends the latest telemetry with its time and age and the echoed peak pressure matches the screen | no (needs MQTT) |
| `modo-real` | Real mode with the fake ventilator: three quick PEEP steps go out as one command after the 500 ms debounce ("Enviando" → "Aplicado"), nothing is sent beyond the safe maximum, "Deshacer último cambio" restores the previous PEEP | no (needs MQTT) |

Local run on the Block A ports (database `ventylab_a`, backend :4110, web :3110, fake LLM :4911, TEST broker :1893):

```bash
node scripts/e2e/fake-llm.mjs --port 4911
MSYS_NO_PATHCONV=1 docker run -d --name ventylab-a-mosquitto -p 1893:1883 eclipse-mosquitto:2 mosquitto -c /mosquitto-no-auth.conf
# backend (wt-a-server, after npm run build): the usual variables plus
#   OPENAI_BASE_URL=http://127.0.0.1:4911/v1 OPENAI_API_KEY=local
#   MQTT_BROKER_URL=mqtt://localhost:1893 MQTT_TELEMETRY_TOPIC=test/ventylab/ventynet/data
#   MQTT_COMMAND_TOPIC=test/ventylab/ventilab/device/001/command MQTT_COMMAND_ACK_TOPIC=test/ventylab/ventilab/device/001/ack
node scripts/e2e/fake-ventilator.mjs --broker mqtt://localhost:1893 --server-dir ../wt-a-server --ack-topic test/ventylab/ventilab/device/001/ack --rate 30
NEXT_PUBLIC_BACKEND_URL=http://localhost:4110 npm run build && npx next start -p 3110
E2E_BASE_URL=http://localhost:3110 E2E_API_URL=http://localhost:4110 npx playwright test --project=e2e e2e/bloque-a
```

`modo-real` needs the broker and the fake ventilator; it brings the fake device back to PEEP 5 when an earlier run
left it elsewhere. While the fake ventilator streams, `e2e/bloque5/monitoreo-orden.spec.ts` fails by design (it
expects "Equipo sin datos"): run it with the fake ventilator stopped. Not covered end to end: the "¿Cómo estabilizar?"
help of a real device alarm (the fake ventilator raises no alarm; the panel and the state builder have unit tests).
