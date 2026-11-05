/*
* Funcionalidad: Fake LLM core (automated tests)
* Descripción: Pure helpers of the fake OpenAI-compatible chat completions server used by the Block 2 E2E specs (TutorAI deepen, questions, notes analysis): option parsing, the deterministic reply for a request (JSON with `onTopic` and a notes analysis when the caller asks for JSON or a full completion, a Spanish markdown answer when it streams), the split of that answer into delta chunks and the OpenAI SSE frames (deltas, usage, [DONE]). Without real provider keys the backend has no fake provider; pointing OPENAI_BASE_URL at this server exercises the real server path (conversation, messages, AI call telemetry and ratings). Depends on nothing. v0.2 (Bloque 3, Ola 4): a grade feedback prompt (it asks for the `{"overall": …, "perQuestion": …}` JSON) gets a parseable grade feedback with a fixed overall text, so the evaluation result shows LLM feedback instead of the deterministic fallback. v0.3 (cierre IA): fault injection. Modes `ok` (default, the answers above), `429` (rate limit with Retry-After), `500`, `timeout` (never answers), `drop-mid-stream` (part of the answer, then the connection is destroyed) and `malformed-json` (an unparseable completion body or SSE chunk). The mode of a request is, in order: a `[[fake-llm:<mode>]]` directive anywhere in its prompt (per request, e.g. typed in a TutorAI question), the mode set at runtime through the admin route (PUT /__fake-llm/mode) and the start mode (--mode or FAKE_LLM_MODE). planResponse turns a mode and a request into a response plan (status, headers, chunks and how it ends) that the server executes. v0.4 (Bloque A): the simulator case interpretation prompt (its `<parametros_curados>` block, SIM_CASE_INTERPRETATION) gets a valid strict JSON that echoes the curated value of every parameter, a STABLE trajectory and a short rationale, so the session starts with the interpretation accepted (source LLM) and the curated physiology unchanged.
* Versión: 0.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const DEFAULT_PORT = 4910;
export const DEFAULT_CHUNK_DELAY_MS = 120;
export const FAKE_MODEL = "fake-llm-e2e";

export const DEFAULT_RETRY_AFTER_S = 30;

// Fault injection modes; `ok` is the normal behaviour.
export const MODES = Object.freeze(["ok", "429", "500", "timeout", "drop-mid-stream", "malformed-json"]);
export const DEFAULT_MODE = "ok";
// Admin route (127.0.0.1 only): GET returns {mode}, PUT {"mode": "<mode>"} changes it until the next PUT or a restart.
export const ADMIN_MODE_PATH = "/__fake-llm/mode";
// Per-request directive: a prompt that contains [[fake-llm:<mode>]] gets that mode, whatever the current one is.
const DIRECTIVE = /\[\[fake-llm:([a-z0-9-]+)\]\]/i;

export const USAGE = `Usage: node scripts/e2e/fake-llm.mjs [--port <n>] [--chunk-delay <ms>] [--mode <mode>] [--retry-after <s>]
  --port <n>          Port on 127.0.0.1 (default ${DEFAULT_PORT}); also FAKE_LLM_PORT.
  --chunk-delay <ms>  Pause between streamed deltas (default ${DEFAULT_CHUNK_DELAY_MS}).
  --mode <mode>       Start mode (default ${DEFAULT_MODE}); also FAKE_LLM_MODE. One of: ${MODES.join(", ")}.
  --retry-after <s>   Retry-After seconds of the 429 mode (default ${DEFAULT_RETRY_AFTER_S}); also FAKE_LLM_RETRY_AFTER.
Per request: put [[fake-llm:<mode>]] in the prompt. At runtime: PUT ${ADMIN_MODE_PATH} {"mode": "<mode>"}.
Point the backend at it with OPENAI_BASE_URL=http://127.0.0.1:<port>/v1 and OPENAI_API_KEY=local.`;

/** Validates a fault injection mode; throws on an unknown one. */
export function parseMode(value) {
  const mode = String(value ?? "").trim().toLowerCase();

  if (!MODES.includes(mode)) {
    throw new Error(`Unknown mode "${value}"; expected one of ${MODES.join(", ")}`);
  }

  return mode;
}

/** Parses the command line; throws on an unknown option or an invalid number. */
export function parseArgs(argv, env = {}) {
  const options = {
    port: Number(env.FAKE_LLM_PORT ?? DEFAULT_PORT),
    chunkDelayMs: DEFAULT_CHUNK_DELAY_MS,
    mode: parseMode(env.FAKE_LLM_MODE ?? DEFAULT_MODE),
    retryAfterSeconds: Number(env.FAKE_LLM_RETRY_AFTER ?? DEFAULT_RETRY_AFTER_S),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--port") {
      options.port = Number(argv[++index]);
    } else if (arg === "--chunk-delay") {
      options.chunkDelayMs = Number(argv[++index]);
    } else if (arg === "--mode") {
      options.mode = parseMode(argv[++index]);
    } else if (arg === "--retry-after") {
      options.retryAfterSeconds = Number(argv[++index]);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }

  if (!Number.isInteger(options.port) || options.port <= 0 || options.port > 65_535) {
    throw new Error("--port must be an integer between 1 and 65535");
  }

  if (!Number.isFinite(options.chunkDelayMs) || options.chunkDelayMs < 0) {
    throw new Error("--chunk-delay must be a non-negative number");
  }

  if (!Number.isInteger(options.retryAfterSeconds) || options.retryAfterSeconds < 0) {
    throw new Error("--retry-after must be a non-negative integer");
  }

  return options;
}

export const STREAM_ANSWER = [
  "**Respuesta de prueba (proveedor falso de E2E).**",
  "",
  "La ecuación del movimiento relaciona la presión en la vía aérea con el flujo, el volumen y las propiedades del sistema respiratorio:",
  "",
  "- La presión resistiva depende del flujo y de la resistencia.",
  "- La presión elástica depende del volumen y de la distensibilidad.",
  "- La PEEP se suma como presión de base.",
  "",
  "Este texto lo genera un servidor local para las pruebas automáticas; no es contenido clínico.",
].join("\n");

export const JSON_ANSWER = {
  onTopic: true,
  summary: "Resumen de prueba de las notas (proveedor falso de E2E).",
  keyConcepts: ["Ecuación del movimiento", "Resistencia", "Distensibilidad"],
  gaps: ["Relación entre PEEP y presión meseta"],
  suggestions: ["Repasar la diferencia entre presión pico y presión meseta"],
};

export const GRADE_FEEDBACK_ANSWER = {
  overall: "Retroalimentación de prueba (proveedor falso de E2E): repasa las preguntas que fallaste y vuelve a intentarlo.",
  perQuestion: [],
};

export const INTERPRETATION_RATIONALE = "Interpretación de prueba (proveedor falso de E2E): se conservan los valores curados del caso.";

const CURATED_BLOCK = /<parametros_curados>\s*([\s\S]*?)\s*<\/parametros_curados>/;

/**
 * The simulator case interpretation answer: every curated parameter ({name: {curated, min, max}}) echoed with its
 * curated value, so the server accepts it unchanged. Null when the prompt has no readable curated block.
 */
export function interpretationAnswer(body) {
  const match = CURATED_BLOCK.exec(promptText(body));

  if (!match) {
    return null;
  }

  let curated;

  try {
    curated = JSON.parse(match[1]);
  } catch {
    return null;
  }

  if (curated === null || typeof curated !== "object" || Array.isArray(curated)) {
    return null;
  }

  const values = {};

  for (const [name, band] of Object.entries(curated)) {
    if (band !== null && typeof band === "object" && typeof band.curated === "number" && Number.isFinite(band.curated)) {
      values[name] = band.curated;
    }
  }

  return { ...values, trajectory: "STABLE", rationale: INTERPRETATION_RATIONALE };
}

// The grade feedback prompt of the backend ends with its JSON format: {"overall": "...", "perQuestion": [...]}.
const isGradeFeedbackRequest = (body) => /"overall"/.test(promptText(body)) && /"perQuestion"/.test(promptText(body));

/** Text the fake answers for one chat completions request body. */
export function replyFor(body) {
  const interpretation = interpretationAnswer(body);

  if (interpretation !== null) {
    return JSON.stringify(interpretation);
  }

  if (isGradeFeedbackRequest(body)) {
    return JSON.stringify(GRADE_FEEDBACK_ANSWER);
  }

  return body?.stream === true && body?.response_format?.type !== "json_object" ? STREAM_ANSWER : JSON.stringify(JSON_ANSWER);
}

/** Splits a text into deltas of about `size` characters (whole text when shorter). */
export function chunkText(text, size = 24) {
  const chunks = [];

  for (let start = 0; start < text.length; start += size) {
    chunks.push(text.slice(start, start + size));
  }

  return chunks;
}

/** Rough token count used in the usage block (4 characters per token). */
export function roughTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** Prompt size of a request (system and messages). */
export function promptText(body) {
  return (body?.messages ?? []).map((message) => (typeof message?.content === "string" ? message.content : "")).join("\n");
}

/** OpenAI `chat.completion` payload of a non-streamed request. */
export function completionPayload(body) {
  const text = replyFor(body);

  return {
    id: "chatcmpl-fake",
    object: "chat.completion",
    model: FAKE_MODEL,
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: roughTokens(promptText(body)), completion_tokens: roughTokens(text) },
  };
}

/** SSE frames (`data: ...\n\n`) of a streamed request, in order: deltas, the usage chunk and [DONE]. */
export function streamFrames(body) {
  const text = replyFor(body);
  const frames = chunkText(text).map((delta) => ({
    id: "chatcmpl-fake",
    object: "chat.completion.chunk",
    model: FAKE_MODEL,
    choices: [{ index: 0, delta: { content: delta }, finish_reason: null }],
  }));

  frames.push({
    id: "chatcmpl-fake",
    object: "chat.completion.chunk",
    model: FAKE_MODEL,
    choices: [],
    usage: { prompt_tokens: roughTokens(promptText(body)), completion_tokens: roughTokens(text) },
  });

  return [...frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`), "data: [DONE]\n\n"];
}

/** Mode of one request: the prompt directive wins over the current (runtime or start) mode. */
export function requestMode(body, currentMode = DEFAULT_MODE) {
  const match = DIRECTIVE.exec(promptText(body));

  if (!match) {
    return currentMode;
  }

  try {
    return parseMode(match[1]);
  } catch {
    // An unknown directive is ignored, so a typo never hides the normal answer behind an error.
    return currentMode;
  }
}

const JSON_HEADERS = Object.freeze({ "content-type": "application/json" });
const SSE_HEADERS = Object.freeze({ "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });

const errorBody = (message, type, code) => JSON.stringify({ error: { message, type, code } });

/**
 * Response plan of one chat completions request in a mode:
 * - status/headers: what to write first (null status: write nothing);
 * - chunks: body pieces, written `chunkDelayMs` apart when `streamed`;
 * - end: "end" closes normally, "destroy" cuts the connection without ending the response, "hang" keeps it open.
 */
export function planResponse(mode, body, { retryAfterSeconds = DEFAULT_RETRY_AFTER_S } = {}) {
  const streamed = body?.stream === true;

  switch (mode) {
    case "429":
      return {
        status: 429,
        headers: { ...JSON_HEADERS, "retry-after": String(retryAfterSeconds) },
        chunks: [errorBody("Rate limit reached (fake LLM fault injection).", "rate_limit_exceeded", "rate_limit_exceeded")],
        streamed: false,
        end: "end",
      };
    case "500":
      return {
        status: 500,
        headers: JSON_HEADERS,
        chunks: [errorBody("Internal server error (fake LLM fault injection).", "server_error", null)],
        streamed: false,
        end: "end",
      };
    case "timeout":
      return { status: null, headers: {}, chunks: [], streamed: false, end: "hang" };
    case "drop-mid-stream": {
      if (streamed) {
        const deltas = streamFrames(body).slice(0, -2);

        return { status: 200, headers: SSE_HEADERS, chunks: deltas.slice(0, Math.max(1, Math.floor(deltas.length / 2))), streamed: true, end: "destroy" };
      }

      const payload = JSON.stringify(completionPayload(body));

      return { status: 200, headers: JSON_HEADERS, chunks: [payload.slice(0, Math.floor(payload.length / 2))], streamed: false, end: "destroy" };
    }
    case "malformed-json":
      return streamed
        ? {
          status: 200,
          headers: SSE_HEADERS,
          chunks: [streamFrames(body)[0], "data: {\"id\": \"chatcmpl-fake\", \"choices\": [{\"delta\": \n\n", "data: [DONE]\n\n"],
          streamed: true,
          end: "end",
        }
        : { status: 200, headers: JSON_HEADERS, chunks: ["{\"id\": \"chatcmpl-fake\", \"object\": \"chat.completion\", \"choices\": [{\"message\": "], streamed: false, end: "end" };
    default:
      return streamed
        ? { status: 200, headers: SSE_HEADERS, chunks: streamFrames(body), streamed: true, end: "end" }
        : { status: 200, headers: JSON_HEADERS, chunks: [JSON.stringify(completionPayload(body))], streamed: false, end: "end" };
  }
}
