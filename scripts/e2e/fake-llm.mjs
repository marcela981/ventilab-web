#!/usr/bin/env node
/*
* Funcionalidad: Fake LLM server (automated tests)
* Descripción: Local OpenAI-compatible stand-in (POST /v1/chat/completions, full or streamed) for the Block 2 E2E specs, so TutorAI (deepen, questions, notes analysis) runs through the real backend without provider keys: start it, then start the backend with OPENAI_BASE_URL=http://127.0.0.1:<port>/v1 and OPENAI_API_KEY=local. It listens on 127.0.0.1 only, streams a fixed Spanish answer in small deltas (--chunk-delay ms apart) and answers JSON requests with `onTopic` and a notes analysis. Never point a shared or production backend at it. Usage: scripts/e2e/README.md. Depends on node:http and the fake LLM core.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createServer } from "node:http";
import { completionPayload, parseArgs, streamFrames, USAGE } from "./fake-llm-core.mjs";

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

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

const server = createServer((request, response) => {
  if (request.method !== "POST" || !request.url?.endsWith("/chat/completions")) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { message: "not found" } }));
    return;
  }

  let raw = "";

  request.on("data", (chunk) => {
    raw += chunk;
  });
  request.on("end", async () => {
    let body;

    try {
      body = JSON.parse(raw);
    } catch {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "invalid json" } }));
      return;
    }

    if (body.stream !== true) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(completionPayload(body)));
      console.log("completion");
      return;
    }

    let closed = false;

    response.on("close", () => {
      closed = true;
    });
    response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });

    for (const frame of streamFrames(body)) {
      if (closed) {
        console.log("stream aborted by the client");
        return;
      }

      response.write(frame);
      await wait(options.chunkDelayMs);
    }

    response.end();
    console.log("stream");
  });
});

server.listen(options.port, "127.0.0.1", () => {
  console.log(`fake LLM on http://127.0.0.1:${options.port}/v1 (OpenAI chat completions). TEST ONLY.`);
});
