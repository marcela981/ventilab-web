#!/usr/bin/env node
/*
* Funcionalidad: Fake ventilator (automated tests)
* Descripción: MQTT stand-in for the physical ventilator, for automated / E2E tests of the lab only (decision 7 of
*   odd/tasks/ventilator-lab.md): publishes JSON telemetry frames on the backend telemetry topic at a configurable rate
*   (default 60 frames/s) with realistic breaths (single-compartment lung) and a `settings` object, subscribes to the
*   command topic and REFLECTS the received settings in the next frames (so the backend resolves APPLIED by matching
*   them), optionally publishes ACKs on the backend ACK topic, can reject commands that change a given parameter
*   (--reject), stop after a time (--stop-after) or pause publishing (--pause) to trigger "Equipo sin datos". It refuses
*   to start unless the broker is given explicitly (--broker or FAKE_VENTILATOR_BROKER_URL) and always warns that it
*   must be a TEST broker: on the lab broker it would talk to the backend in place of (or next to) the physical device.
*   The `mqtt` package is resolved from ../ventylab-server/node_modules with createRequire (no new dependency of the
*   front). Usage: scripts/e2e/README.md. Depends on node:module, node:path, node:url, mqtt (backend checkout) and the
*   fake ventilator core. v1.1 (T8 review fix W4): refuses a broker outside this machine unless
*   --allow-remote-test-broker and always the broker of the backend .env (read from --server-dir, never printed);
*   default topics carry the `test/ventylab/` prefix and an override without it prints a warning. v1.2 (T8 review fix
*   2, S6): the broker is compared with every backend env file that exists (.env, .env.local, .env.development).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyCommand,
  BACKEND_ENV_FILES,
  brokerRefusal,
  buildFrame,
  createDeviceState,
  isPublishing,
  parseArgs,
  TEST_TOPIC_PREFIX,
  USAGE,
} from "./fake-ventilator-core.mjs";

const TICK_MS = 5;

function fail(message) {
  console.error(`[fake-ventilator] ${message}`);
  process.exit(1);
}

let options;

try {
  options = parseArgs(process.argv.slice(2), process.env);
} catch (error) {
  console.error(USAGE);
  fail(error instanceof Error ? error.message : String(error));
}

if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

console.warn("[fake-ventilator] WARNING: this is a FAKE device for automated tests. The broker MUST be a TEST broker,");
console.warn("[fake-ventilator] never the lab broker of the physical ventilator: its frames and ACKs would reach the backend as the real device's.");

if (!options.broker) {
  fail("no broker given: pass --broker <url> or set FAKE_VENTILATOR_BROKER_URL (a TEST broker). Nothing was started.");
}

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const serverDir = options.serverDir ? resolve(options.serverDir) : resolve(scriptDir, "../../../ventylab-server");
// Every backend env file that exists is compared (values never printed).
const backendEnvFiles = [];

for (const file of BACKEND_ENV_FILES) {
  try {
    backendEnvFiles.push({ file, text: readFileSync(resolve(serverDir, file), "utf8") });
  } catch {
    // Missing file: nothing to compare.
  }
}

if (backendEnvFiles.length === 0) {
  console.warn("[fake-ventilator] no backend env file is readable: the lab broker cannot be compared (localhost rule still applies).");
}

const refusal = brokerRefusal(options, backendEnvFiles);

if (refusal !== null) {
  fail(`${refusal} Nothing was started.`);
}

[options.telemetryTopic, options.commandTopic, options.ackTopic].forEach((topic) => {
  if (topic && !topic.startsWith(`${TEST_TOPIC_PREFIX}/`)) {
    console.warn(`[fake-ventilator] WARNING: topic "${topic}" has no "${TEST_TOPIC_PREFIX}/" prefix: make sure it is not a production topic.`);
  }
});

let mqtt;

try {
  mqtt = createRequire(resolve(serverDir, "package.json"))("mqtt");
} catch {
  fail(`mqtt not found in ${serverDir}/node_modules: install the backend dependencies or pass --server-dir.`);
}

const state = { device: createDeviceState(), seq: 0 };
const client = mqtt.connect(options.broker, {
  clientId: `ventilab-fake-e2e-${process.pid}`,
  clean: true,
  connectTimeout: 10_000,
  reconnectPeriod: 3_000,
});

console.log(`[fake-ventilator] broker ${new URL(options.broker).host}; telemetry → ${options.telemetryTopic} at ${options.rateHz} Hz; commands ← ${options.commandTopic}${options.ackTopic ? `; ACKs → ${options.ackTopic}` : "; no ACK topic"}`);

client.on("message", (topic, payload) => {
  if (topic !== options.commandTopic) {
    return;
  }

  const result = applyCommand(state.device, payload, options.reject);

  state.device = result.state;
  console.log(`[fake-ventilator] command ${result.ack?.commandId ?? "(no correlationId)"}: ${result.ack?.status ?? result.error}${result.ack?.reason ? ` (${result.ack.reason})` : ""}`);

  if (options.ackTopic && result.ack) {
    client.publish(options.ackTopic, JSON.stringify(result.ack), { qos: 1 });
  }
});

client.on("error", (error) => console.error(`[fake-ventilator] MQTT error: ${error.message}`));

let timer = null;

client.on("connect", () => {
  client.subscribe(options.commandTopic, { qos: 1 });

  if (timer !== null) {
    return;
  }

  const startedAt = Date.now();
  const frameMs = 1000 / options.rateHz;
  let published = 0;
  let paused = false;

  // Publishes every frame due by now (setInterval alone drifts below ~16 ms).
  timer = setInterval(() => {
    const elapsedMs = Date.now() - startedAt;
    const elapsedS = elapsedMs / 1000;

    if (options.stopAfterS !== null && elapsedS >= options.stopAfterS) {
      stop("stop-after reached");

      return;
    }

    const publishing = isPublishing(options.pause, elapsedS);

    if (publishing !== !paused) {
      paused = !publishing;
      console.log(`[fake-ventilator] ${paused ? "paused (no frames)" : "publishing again"}`);
    }

    const due = Math.floor(elapsedMs / frameMs);

    while (published < due) {
      published += 1;

      if (!paused) {
        const frame = buildFrame(state.device, state.seq, (published * frameMs) / 1000, Date.now(), options.deviceId);

        state.seq += 1;
        client.publish(options.telemetryTopic, JSON.stringify(frame), { qos: 0 });
      }
    }
  }, TICK_MS);
});

function stop(reason) {
  console.log(`[fake-ventilator] stopping: ${reason}`);

  if (timer !== null) {
    clearInterval(timer);
  }

  client.end(true, {}, () => process.exit(0));
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
