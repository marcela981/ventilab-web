#!/usr/bin/env node
/*
* Funcionalidad: Fake LLM server (automated tests)
* Descripción: Local OpenAI-compatible stand-in (POST /v1/chat/completions, full or streamed) for the Block 2 E2E specs, so TutorAI (deepen, questions, notes analysis) runs through the real backend without provider keys: start it, then start the backend with OPENAI_BASE_URL=http://127.0.0.1:<port>/v1 and OPENAI_API_KEY=local. It listens on 127.0.0.1 only, streams a fixed Spanish answer in small deltas (--chunk-delay ms apart) and answers JSON requests with `onTopic` and a notes analysis. Never point a shared or production backend at it. Usage: scripts/e2e/README.md. Depends on node:http and the fake LLM core. v0.2 (cierre IA): fault injection (ok, 429 with Retry-After, 500, timeout, drop-mid-stream, malformed-json) chosen per request by a `[[fake-llm:<mode>]]` prompt directive, at runtime with GET/PUT /__fake-llm/mode or at start with --mode / FAKE_LLM_MODE; the response plan comes from the core (planResponse) and every request logs its mode.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createServer } from "node:http";
import { ADMIN_MODE_PATH, parseArgs, parseMode, planResponse, requestMode, USAGE } from "./fake-llm-core.mjs";

let options;

try {
  options = parseArgs(process.argv.slice(2), process.env);
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}

if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

// Current mode: the start mode until a PUT on the admin route changes it.
let currentMode = options.mode;

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolveBody) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => resolveBody(raw));
  });
}

async function handleAdmin(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, { mode: currentMode });
    return;
  }

  if (request.method !== "PUT" && request.method !== "POST") {
    sendJson(response, 405, { error: { message: "use GET or PUT" } });
    return;
  }

  try {
    currentMode = parseMode(JSON.parse(await readBody(request))?.mode);
  } catch (error) {
    sendJson(response, 400, { error: { message: error instanceof Error ? error.message : "invalid body" } });
    return;
  }

  console.log(`mode set to ${currentMode}`);
  sendJson(response, 200, { mode: currentMode });
}

async function execute(plan, response) {
  if (plan.end === "hang") {
    // Never answers: the caller's timeout (or its abort) ends the request.
    return;
  }

  let closed = false;

  response.on("close", () => {
    closed = true;
  });
  response.writeHead(plan.status, plan.headers);

  for (const chunk of plan.chunks) {
    if (closed) {
      console.log("stream aborted by the client");
      return;
    }

    response.write(chunk);

    if (plan.streamed) {
      await wait(options.chunkDelayMs);
    }
  }

  if (plan.end === "destroy") {
    // Cuts the connection without ending the response (no [DONE], no closing chunk).
    response.socket?.destroy();
    return;
  }

  response.end();
}

const server = createServer(async (request, response) => {
  const path = (request.url ?? "").split("?")[0];

  if (path === ADMIN_MODE_PATH) {
    await handleAdmin(request, response);
    return;
  }

  if (request.method !== "POST" || !path.endsWith("/chat/completions")) {
    sendJson(response, 404, { error: { message: "not found" } });
    return;
  }

  let body;

  try {
    body = JSON.parse(await readBody(request));
  } catch {
    sendJson(response, 400, { error: { message: "invalid json" } });
    return;
  }

  const mode = requestMode(body, currentMode);

  console.log(`${body.stream === true ? "stream" : "completion"} (mode ${mode})`);
  await execute(planResponse(mode, body, { retryAfterSeconds: options.retryAfterSeconds }), response);
});

server.listen(options.port, "127.0.0.1", () => {
  console.log(`fake LLM on http://127.0.0.1:${options.port}/v1 (OpenAI chat completions, mode ${currentMode}). TEST ONLY.`);
});
