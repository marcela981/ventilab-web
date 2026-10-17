/*
* Funcionalidad: Fake ventilator core
* Descripción: Pure parts of the fake ventilator used by automated tests (scripts/e2e/fake-ventilator.mjs): the
*   command line options (no broker by default: the caller must name a TEST broker), a single-compartment lung model
*   (resistance 10 cmH2O/(L/s), compliance 50 mL/cmH2O) that turns the current settings into realistic breaths
*   (volume control with a square inspiratory flow, pressure control towards `pressureLimit`, passive exponential
*   expiration), the telemetry frame the backend JSON decoder accepts (`pressure`, `flow`, `volume`, `seq`, `deviceTs`,
*   `mode`, `settings`, `deviceId`; see ventylab-server json-telemetry.decoder.ts) and the reaction to a command of the
*   backend JSON encoder (flat `mode`, numeric fields, `ieRatio` as "1:2", `correlationId`; see json-command.encoder.ts):
*   the received numeric fields BECOME the reported settings (so the backend can resolve APPLIED by matching frame
*   settings), or the command is rejected when it changes a parameter listed with --reject, with an ACK payload
*   `{ commandId, status, reason? }` for the optional ACK topic. v1.1 (T8 review fix W4): the default topics are TEST
*   topics (`test/ventylab/...`, the backend NODE_ENV=test command prefix; telemetry is not prefixed by the backend, so
*   the TEST backend sets MQTT_TELEMETRY_TOPIC to the fake's), and `brokerRefusal` refuses a broker outside this
*   machine unless --allow-remote-test-broker, and always the broker of the backend .env (MQTT_BROKER_URL / MQTT_URL,
*   same host and port; the message never prints the url). v1.2 (T8 review fix 2, S6): localhost / 127.0.0.1 / ::1
*   compare as one host, and the broker of every backend env file that exists (BACKEND_ENV_FILES: .env, .env.local,
*   .env.development) is compared (the message names the file and the variable, never the value). No dependencies.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/**
 * TEST topics by default, never the production ones. The backend with NODE_ENV=test prefixes the command and ACK topics
 * with MQTT_TEST_TOPIC_PREFIX (default "test/ventylab", ventilator-commands-config.ts `applyTestTopicPrefix`) but NOT
 * the telemetry topic: the TEST backend must set MQTT_TELEMETRY_TOPIC=test/ventylab/ventynet/data (README).
 */
export const TEST_TOPIC_PREFIX = "test/ventylab";
export const DEFAULT_TELEMETRY_TOPIC = `${TEST_TOPIC_PREFIX}/ventynet/data`;
export const DEFAULT_COMMAND_TOPIC = `${TEST_TOPIC_PREFIX}/ventilab/device/001/command`;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const BROKER_ENV_NAMES = ["MQTT_BROKER_URL", "MQTT_URL"];
const DEFAULT_PORTS = { "mqtt:": "1883", "tcp:": "1883", "mqtts:": "8883", "ssl:": "8883", "tls:": "8883", "ws:": "80", "wss:": "443" };

/** Backend env files whose broker is compared (dotenv loads .env; the others are checked too when present). */
export const BACKEND_ENV_FILES = [".env", ".env.local", ".env.development"];
/** One key for every name of this machine, so localhost / 127.0.0.1 / ::1 compare as the same host (S6). */
const LOCAL_HOST_KEY = "local-machine";

function brokerAddress(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    return { host: LOCAL_HOSTS.has(host) ? LOCAL_HOST_KEY : host, port: url.port || DEFAULT_PORTS[url.protocol] || "" };
  } catch {
    return null;
  }
}

/** MQTT broker urls of a .env text (MQTT_BROKER_URL / MQTT_URL), comments ignored, quotes stripped. */
export function envBrokerUrls(envText) {
  const found = [];

  for (const line of envText.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);

    if (match && BROKER_ENV_NAMES.includes(match[1]) && match[2].length > 0) {
      found.push({ name: match[1], url: match[2].replace(/^(['"])(.*)\1$/, "$2") });
    }
  }

  return found;
}

/**
 * Why the broker must not be used, or null. A broker outside this machine needs --allow-remote-test-broker; a broker
 * with the host and port of the backend .env MQTT_BROKER_URL / MQTT_URL (the lab broker) is always refused. The message
 * names the file and the variable, never its value (it may carry credentials). `backendEnv` is the text of the backend
 * .env, or a list of `{ file, text }` (BACKEND_ENV_FILES that exist), or null.
 */
export function brokerRefusal({ broker, allowRemoteTestBroker }, backendEnv) {
  const address = brokerAddress(broker);

  if (address === null) {
    return "the broker is not a valid URL (e.g. mqtt://localhost:1883).";
  }

  if (address.host !== LOCAL_HOST_KEY && !allowRemoteTestBroker) {
    return "the broker is not on this machine: a remote broker could be the lab broker. Use a local TEST broker or pass --allow-remote-test-broker if it is a TEST broker.";
  }

  const envFiles = typeof backendEnv === "string" ? [{ file: ".env", text: backendEnv }] : (backendEnv ?? []);

  for (const { file, text } of envFiles) {
    for (const { name, url } of envBrokerUrls(text ?? "")) {
      const backend = brokerAddress(url);

      if (backend !== null && backend.host === address.host && backend.port === address.port) {
        return `the broker is the one of the backend ${file} (${name}): that is the lab broker of the physical ventilator. Start the TEST backend with another env file and a TEST broker.`;
      }
    }
  }

  return null;
}
export const DEFAULT_RATE_HZ = 60;
export const DEFAULT_DEVICE_ID = "ventilab-fake-e2e";

export const COMMAND_MODES = ["VCV", "PCV", "SIMV", "PSV"];
export const COMMAND_FIELDS = [
  "tidalVolume",
  "respiratoryRate",
  "peep",
  "fio2",
  "pressureLimit",
  "inspiratoryTime",
  "ieRatio",
  "flowRate",
  "sensitivity",
];

export const DEFAULT_MODE = "VCV";
export const DEFAULT_SETTINGS = Object.freeze({
  tidalVolume: 450,
  respiratoryRate: 14,
  peep: 5,
  fio2: 0.4,
  inspiratoryTime: 1,
  sensitivity: 2,
});

const RESISTANCE_CMH2O_PER_LPS = 10;
const COMPLIANCE_ML_PER_CMH2O = 50;
const TAU_S = (RESISTANCE_CMH2O_PER_LPS * COMPLIANCE_ML_PER_CMH2O) / 1000;

export const USAGE = `Fake ventilator for automated tests (never the physical device).

  node scripts/e2e/fake-ventilator.mjs --broker <url> [options]

  --broker <url>          MQTT broker of a TEST environment (or FAKE_VENTILATOR_BROKER_URL). Required. Only
                          localhost unless --allow-remote-test-broker; never the broker of the backend .env.
  --allow-remote-test-broker  Accept a broker outside this machine (it must be a TEST broker).
  --telemetry-topic <t>   Telemetry topic (default ${DEFAULT_TELEMETRY_TOPIC}; set the TEST backend
                          MQTT_TELEMETRY_TOPIC to it, the backend does not prefix telemetry).
  --command-topic <t>     Command topic (default ${DEFAULT_COMMAND_TOPIC}: backend MQTT_COMMAND_TOPIC
                          prefixed by MQTT_TEST_TOPIC_PREFIX when the backend runs with NODE_ENV=test).
  --ack-topic <t>         Publish ACKs here (backend MQTT_COMMAND_ACK_TOPIC). Without it the backend infers
                          APPLIED from the reported settings and a rejection ends in TIMEOUT.
  --rate <hz>             Frames per second (default ${DEFAULT_RATE_HZ}).
  --stop-after <s>        Exit after s seconds.
  --pause <after>[:<for>] Stop publishing after <after> s (for <for> s, or until exit) to trigger "no data".
  --reject <param>        Reject commands that change <param> (repeatable, e.g. --reject peep).
  --device-id <id>        deviceId of the frames (default ${DEFAULT_DEVICE_ID}).
  --server-dir <path>     ventylab-server checkout whose node_modules provides mqtt (default ../ventylab-server).
  --help                  Show this help.`;

function positiveNumber(name, raw) {
  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number (got "${raw}")`);
  }

  return value;
}

/** Parses the command line; throws on invalid input. `broker` stays null unless given explicitly. */
export function parseArgs(argv, env = {}) {
  const options = {
    broker: env.FAKE_VENTILATOR_BROKER_URL?.trim() || null,
    allowRemoteTestBroker: false,
    telemetryTopic: DEFAULT_TELEMETRY_TOPIC,
    commandTopic: DEFAULT_COMMAND_TOPIC,
    ackTopic: null,
    rateHz: DEFAULT_RATE_HZ,
    stopAfterS: null,
    pause: null,
    reject: new Set(),
    deviceId: DEFAULT_DEVICE_ID,
    serverDir: null,
    help: false,
  };
  const args = [...argv];

  while (args.length > 0) {
    const flag = args.shift();
    const next = () => {
      const value = args.shift();

      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${flag} needs a value`);
      }

      return value;
    };

    switch (flag) {
      case "--broker":
        options.broker = next().trim();
        break;
      case "--allow-remote-test-broker":
        options.allowRemoteTestBroker = true;
        break;
      case "--telemetry-topic":
        options.telemetryTopic = next();
        break;
      case "--command-topic":
        options.commandTopic = next();
        break;
      case "--ack-topic":
        options.ackTopic = next();
        break;
      case "--rate":
        options.rateHz = positiveNumber("--rate", next());
        break;
      case "--stop-after":
        options.stopAfterS = positiveNumber("--stop-after", next());
        break;
      case "--pause": {
        const [after, duration] = next().split(":");

        options.pause = {
          afterS: positiveNumber("--pause", after),
          forS: duration === undefined ? null : positiveNumber("--pause", duration),
        };
        break;
      }
      case "--reject": {
        const field = next();

        if (!COMMAND_FIELDS.includes(field) && field !== "mode") {
          throw new Error(`--reject expects mode or one of ${COMMAND_FIELDS.join(", ")} (got "${field}")`);
        }

        options.reject.add(field);
        break;
      }
      case "--device-id":
        options.deviceId = next();
        break;
      case "--server-dir":
        options.serverDir = next();
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`unknown option ${flag}`);
    }
  }

  return options;
}

/** Whether frames are published at `elapsedS` (false while a --pause window is open). */
export function isPublishing(pause, elapsedS) {
  if (!pause || elapsedS < pause.afterS) {
    return true;
  }

  return pause.forS !== null && elapsedS >= pause.afterS + pause.forS;
}

/** "1:2" → 0.5, "2:1" → 2, a number as is; NaN otherwise. */
export function parseIeRatio(value) {
  if (typeof value === "number") {
    return value;
  }

  const match = typeof value === "string" ? /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(value) : null;

  return match && Number(match[2]) > 0 ? Number(match[1]) / Number(match[2]) : Number.NaN;
}

function round(value, decimals) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/** Pressure (cmH2O), flow (L/min) and volume (mL) at `tS` seconds for the mode and settings. */
export function lungSample(mode, settings, tS) {
  const rate = settings.respiratoryRate ?? (mode === "PSV" ? 12 : DEFAULT_SETTINGS.respiratoryRate);
  const period = 60 / Math.max(1, rate);
  const peep = settings.peep ?? 0;
  const ti = Math.min(settings.inspiratoryTime ?? (settings.ieRatio ? (period * settings.ieRatio) / (1 + settings.ieRatio) : period / 3), period * 0.8);
  const phase = ((tS % period) + period) % period;
  const pressureMode = mode === "PCV" || mode === "PSV";
  const drive = pressureMode ? Math.max(0, (settings.pressureLimit ?? peep + 15) - peep) : 0;
  const tidalVolume = pressureMode
    ? COMPLIANCE_ML_PER_CMH2O * drive * (1 - Math.exp(-ti / TAU_S))
    : settings.tidalVolume ?? DEFAULT_SETTINGS.tidalVolume;
  let volume;
  let flowLps;

  if (phase < ti) {
    if (pressureMode) {
      volume = COMPLIANCE_ML_PER_CMH2O * drive * (1 - Math.exp(-phase / TAU_S));
      flowLps = ((COMPLIANCE_ML_PER_CMH2O * drive) / 1000 / TAU_S) * Math.exp(-phase / TAU_S);
    } else {
      flowLps = tidalVolume / 1000 / ti;
      volume = tidalVolume * (phase / ti);
    }
  } else {
    const t = phase - ti;

    volume = tidalVolume * Math.exp(-t / TAU_S);
    flowLps = -(volume / 1000) / TAU_S;
  }

  const pressure = pressureMode && phase < ti
    ? peep + drive
    : peep + volume / COMPLIANCE_ML_PER_CMH2O + RESISTANCE_CMH2O_PER_LPS * flowLps;

  return { pressure: round(pressure, 2), flow: round(flowLps * 60, 2), volume: round(volume, 1) };
}

export function createDeviceState() {
  return { mode: DEFAULT_MODE, settings: { ...DEFAULT_SETTINGS } };
}

/** The telemetry frame of sample `seq` at `tS` seconds since start, stamped with the wall clock `nowMs`. */
export function buildFrame(state, seq, tS, nowMs, deviceId) {
  return {
    seq,
    deviceTs: nowMs,
    ...lungSample(state.mode, state.settings, tS),
    mode: state.mode,
    settings: { ...state.settings },
    deviceId,
  };
}

/**
 * Applies a command payload. Returns the next state (unchanged when rejected or invalid) and the ACK to publish
 * (null when the payload has no correlation id).
 */
export function applyCommand(state, payload, reject = new Set()) {
  let body;

  try {
    body = JSON.parse(typeof payload === "string" ? payload : payload.toString("utf8"));
  } catch {
    return { state, ack: null, error: "invalid_json" };
  }

  const commandId = typeof body?.correlationId === "string" ? body.correlationId : null;
  const ack = (status, reason) => (commandId ? { commandId, status, ...(reason ? { reason } : {}) } : null);

  if (!body || typeof body !== "object" || !COMMAND_MODES.includes(body.mode)) {
    return { state, ack: ack("rejected", "fake_invalid_mode"), error: "invalid_mode" };
  }

  const settings = {};

  for (const field of COMMAND_FIELDS) {
    if (body[field] === undefined) {
      continue;
    }

    const value = field === "ieRatio" ? parseIeRatio(body[field]) : body[field];

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { state, ack: ack("rejected", `fake_invalid_${field}`), error: `invalid_${field}` };
    }

    settings[field] = value;
  }

  const changed = [...reject].find((field) => (field === "mode" ? body.mode !== state.mode : settings[field] !== undefined && settings[field] !== state.settings[field]));

  if (changed !== undefined) {
    return { state, ack: ack("rejected", `fake_reject_${changed}`), error: null };
  }

  return { state: { mode: body.mode, settings }, ack: ack("applied"), error: null };
}
