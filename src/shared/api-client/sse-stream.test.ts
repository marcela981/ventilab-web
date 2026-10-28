/*
* Funcionalidad: SSE stream helper tests
* Descripción: Tests of the text/event-stream parser (frames split mid-line and mid-frame, CRLF, comments, multi-line data) and of postEventStream/runEventStream against msw: delta/done/error events, bearer token, single refresh + retry on 401, abort, truncated streams and the mapping of 429 (Retry-After header or body), 503 and 404 to ApiError. Depends on vitest, msw and the api-client modules. v1.1 (B5): the stream request sends Accept-Language: es. v1.2 (W7, Bloque 2): the early `start` frame is yielded as a non-terminal event and dispatched to onStart; a malformed start frame is ignored.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { ApiError, CLIENT_ERROR_CODES } from "./api-error";
import { createSseParser, postEventStream, runEventStream } from "./sse-stream";
import type { EventStreamEvent } from "./sse-stream";
import { getAccessToken, saveTokens } from "./token-storage";

const STREAM_PATH = "/api/tutor/pages/page-1/deepen";
const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;
const encoder = new TextEncoder();

const errorEnvelope = (code: string, message: string, data: unknown = null) => ({
  success: false,
  message,
  data,
  code,
  timestamp: "2026-10-14T00:00:00.000Z",
  traceId: "trace-error",
  pagination: null,
});

function streamOf(chunks: readonly string[], keepOpen = false): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      if (!keepOpen) {
        controller.close();
      }
    },
  });
}

function sseResponse(chunks: readonly string[], keepOpen = false): HttpResponse<ReadableStream<Uint8Array>> {
  return new HttpResponse(streamOf(chunks, keepOpen), { headers: { "Content-Type": "text/event-stream" } });
}

async function collect(iterable: AsyncIterable<EventStreamEvent>): Promise<EventStreamEvent[]> {
  const events: EventStreamEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

const DONE = { aiCallId: "call-1", messageId: "msg-1", conversationId: "conv-1" };

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  saveTokens("access-1", "refresh-1");
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

describe("createSseParser", () => {
  it("parses frames split in the middle of a line and of a frame", () => {
    const parser = createSseParser();

    expect(parser.feed("event: del")).toEqual([]);
    expect(parser.feed("ta\ndata: {\"text\":\"Ho")).toEqual([]);
    expect(parser.feed("la\"}\n")).toEqual([]);
    expect(parser.feed("\nevent: delta\ndata: {\"text\":\" mundo\"}\n\n")).toEqual([
      { event: "delta", data: "{\"text\":\"Hola\"}" },
      { event: "delta", data: "{\"text\":\" mundo\"}" },
    ]);
  });

  it("handles CRLF split across chunks, comments, multi-line data and the default event name", () => {
    const parser = createSseParser();

    expect(parser.feed(": keep-alive\r")).toEqual([]);
    expect(parser.feed("\ndata: a\r\ndata:b\r\n\r\n")).toEqual([{ event: "message", data: "a\nb" }]);
  });

  it("drops a frame without data and an incomplete frame at the end", () => {
    const parser = createSseParser();

    expect(parser.feed("event: ping\n\nevent: delta\ndata: {}")).toEqual([]);
    expect(parser.flush()).toEqual([]);
  });
});

describe("postEventStream", () => {
  it("yields delta and done events sent with the bearer token and the JSON body", async() => {
    let received: { authorization: string | null, accept: string | null, language: string | null, body: unknown } | null = null;

    server.use(
      http.post(url(STREAM_PATH), async({ request }) => {
        received = {
          authorization: request.headers.get("authorization"),
          accept: request.headers.get("accept"),
          language: request.headers.get("accept-language"),
          body: await request.json(),
        };

        return sseResponse([
          "event: delta\ndata: {\"text\":\"La PEEP\"}\n\nevent: del",
          "ta\ndata: {\"text\":\" mantiene\"}\n\n",
          `event: done\ndata: ${JSON.stringify(DONE)}\n\n`,
        ]);
      }),
    );

    const events = await collect(postEventStream(STREAM_PATH, { question: "¿PEEP?" }));

    expect(received).toEqual({ authorization: "Bearer access-1", accept: "text/event-stream", language: "es", body: { question: "¿PEEP?" } });
    expect(events).toEqual([
      { type: "delta", text: "La PEEP" },
      { type: "delta", text: " mantiene" },
      { type: "done", data: DONE },
    ]);
  });

  it("yields an error event sent after the stream started", async() => {
    server.use(
      http.post(url(STREAM_PATH), () => sseResponse([
        "event: delta\ndata: {\"text\":\"Hola\"}\n\n",
        "event: error\ndata: {\"code\":\"ai.provider_failed\",\"message\":\"Falló\"}\n\n",
      ])),
    );

    const events = await collect(postEventStream(STREAM_PATH, {}));

    expect(events).toEqual([
      { type: "delta", text: "Hola" },
      { type: "error", code: "ai.provider_failed", message: "Falló" },
    ]);
  });

  it("yields the start event before the deltas without ending the stream and ignores a malformed one", async() => {
    server.use(
      http.post(url(STREAM_PATH), () => sseResponse([
        "event: start\ndata: {\"conversationId\":\"conv-1\"}\n\n",
        "event: start\ndata: {\"conversationId\":\"conv-1\",\"messageId\":\"msg-1\"}\n\n",
        "event: delta\ndata: {\"text\":\"Hola\"}\n\n",
        `event: done\ndata: ${JSON.stringify(DONE)}\n\n`,
      ])),
    );

    const events = await collect(postEventStream(STREAM_PATH, {}));

    expect(events).toEqual([
      { type: "start", data: { conversationId: "conv-1", messageId: "msg-1" } },
      { type: "delta", text: "Hola" },
      { type: "done", data: DONE },
    ]);
  });

  it("reports a stream that closes before done or error as interrupted", async() => {
    server.use(http.post(url(STREAM_PATH), () => sseResponse(["event: delta\ndata: {\"text\":\"Hola\"}\n\n"])));

    const events = await collect(postEventStream(STREAM_PATH, {}));

    expect(events.at(-1)).toMatchObject({ type: "error", code: CLIENT_ERROR_CODES.streamInterrupted });
  });

  it("refreshes the access token once on 401 and retries the stream", async() => {
    let refreshCalls = 0;

    server.use(
      http.post(url("/api/auth/refresh"), () => {
        refreshCalls += 1;

        return HttpResponse.json({ success: true, data: { accessToken: "access-2" } });
      }),
      http.post(url(STREAM_PATH), ({ request }) => {
        if (request.headers.get("authorization") !== "Bearer access-2") {
          return HttpResponse.json(errorEnvelope("auth.token_expired", "Token expired"), { status: 401 });
        }

        return sseResponse([`event: done\ndata: ${JSON.stringify(DONE)}\n\n`]);
      }),
    );

    const events = await collect(postEventStream(STREAM_PATH, {}));

    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe("access-2");
    expect(events).toEqual([{ type: "done", data: DONE }]);
  });

  it("does not retry more than once when the retried request is still 401", async() => {
    let streamCalls = 0;

    server.use(
      http.post(url("/api/auth/refresh"), () => HttpResponse.json({ success: true, data: { accessToken: "access-2" } })),
      http.post(url(STREAM_PATH), () => {
        streamCalls += 1;

        return HttpResponse.json(errorEnvelope("auth.token_expired", "Token expired"), { status: 401 });
      }),
    );

    await expect(collect(postEventStream(STREAM_PATH, {}))).rejects.toMatchObject({ status: 401, code: "auth.token_expired" });
    expect(streamCalls).toBe(2);
  });

  it("maps 429 with the Retry-After header to an ApiError", async() => {
    server.use(
      http.post(url(STREAM_PATH), () => HttpResponse.json(errorEnvelope("ai.quota_exceeded", "Cuota agotada"), {
        status: 429,
        headers: { "Retry-After": "60" },
      })),
    );

    const error = await collect(postEventStream(STREAM_PATH, {})).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: "ai.quota_exceeded", retryAfter: 60 });
  });

  it("takes the retry time from the body when the header is missing", async() => {
    server.use(
      http.post(url(STREAM_PATH), () => HttpResponse.json(
        errorEnvelope("common.too_many_requests", "Demasiadas solicitudes", { retryAfter: 30 }),
        { status: 429 },
      )),
    );

    await expect(collect(postEventStream(STREAM_PATH, {}))).rejects.toMatchObject({ status: 429, retryAfter: 30 });
  });

  it.each([
    [503, "ai.providers_unavailable"],
    [404, "pages.page_not_found"],
  ])("maps %i to an ApiError with the backend code", async(status, code) => {
    server.use(http.post(url(STREAM_PATH), () => HttpResponse.json(errorEnvelope(code, "No disponible"), { status })));

    await expect(collect(postEventStream(STREAM_PATH, {}))).rejects.toMatchObject({ status, code });
  });

  it("ends silently when the caller aborts in the middle of the stream", async() => {
    server.use(http.post(url(STREAM_PATH), () => sseResponse(["event: delta\ndata: {\"text\":\"Hola\"}\n\n"], true)));

    const controller = new AbortController();
    const events: EventStreamEvent[] = [];

    for await (const event of postEventStream(STREAM_PATH, {}, { signal: controller.signal })) {
      events.push(event);
      controller.abort();
    }

    expect(events).toEqual([{ type: "delta", text: "Hola" }]);
  });

  it("does not send the request when the signal is already aborted", async() => {
    let streamCalls = 0;

    server.use(http.post(url(STREAM_PATH), () => {
      streamCalls += 1;

      return sseResponse([]);
    }));

    const controller = new AbortController();

    controller.abort();

    expect(await collect(postEventStream(STREAM_PATH, {}, { signal: controller.signal }))).toEqual([]);
    expect(streamCalls).toBe(0);
  });
});

describe("runEventStream", () => {
  it("dispatches each event to its callback", async() => {
    server.use(
      http.post(url(STREAM_PATH), () => sseResponse([
        "event: start\ndata: {\"conversationId\":\"conv-1\",\"messageId\":\"msg-1\"}\n\n",
        "event: delta\ndata: {\"text\":\"A\"}\n\nevent: delta\ndata: {\"text\":\"B\"}\n\n",
        `event: done\ndata: ${JSON.stringify(DONE)}\n\n`,
      ])),
    );

    const deltas: string[] = [];
    let done: unknown = null;

    let started: unknown = null;

    await runEventStream(STREAM_PATH, {}, {
      onStart: (data) => {
        started = data;
      },
      onDelta: (text) => deltas.push(text),
      onDone: (data) => {
        done = data;
      },
      onError: () => {
        throw new Error("unexpected error event");
      },
    });

    expect(started).toEqual({ conversationId: "conv-1", messageId: "msg-1" });
    expect(deltas).toEqual(["A", "B"]);
    expect(done).toEqual(DONE);
  });
});
