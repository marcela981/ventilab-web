/*
* Funcionalidad: Fake LLM core (automated tests)
* Descripción: Pure helpers of the fake OpenAI-compatible chat completions server used by the Block 2 E2E specs (TutorAI deepen, questions, notes analysis): option parsing, the deterministic reply for a request (JSON with `onTopic` and a notes analysis when the caller asks for JSON or a full completion, a Spanish markdown answer when it streams), the split of that answer into delta chunks and the OpenAI SSE frames (deltas, usage, [DONE]). Without real provider keys the backend has no fake provider; pointing OPENAI_BASE_URL at this server exercises the real server path (conversation, messages, AI call telemetry and ratings). Depends on nothing.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const DEFAULT_PORT = 4910;
export const DEFAULT_CHUNK_DELAY_MS = 120;
export const FAKE_MODEL = "fake-llm-e2e";

export const USAGE = `Usage: node scripts/e2e/fake-llm.mjs [--port <n>] [--chunk-delay <ms>]
  --port <n>          Port on 127.0.0.1 (default ${DEFAULT_PORT}); also FAKE_LLM_PORT.
  --chunk-delay <ms>  Pause between streamed deltas (default ${DEFAULT_CHUNK_DELAY_MS}).
Point the backend at it with OPENAI_BASE_URL=http://127.0.0.1:<port>/v1 and OPENAI_API_KEY=local.`;

/** Parses the command line; throws on an unknown option or an invalid number. */
export function parseArgs(argv, env = {}) {
  const options = { port: Number(env.FAKE_LLM_PORT ?? DEFAULT_PORT), chunkDelayMs: DEFAULT_CHUNK_DELAY_MS, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--port") {
      options.port = Number(argv[++index]);
    } else if (arg === "--chunk-delay") {
      options.chunkDelayMs = Number(argv[++index]);
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

/** Text the fake answers for one chat completions request body. */
export function replyFor(body) {
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
