/*
* Funcionalidad: useStreamingResponse tests
* Descripción: Tests of the generic AI answer stream hook against msw serving real text/event-stream bodies: deltas accumulate and `done` resolves with its metadata (extra fields and sources included), an `event: error` frame and a 429 before the stream become ApiError state, abort keeps the partial text (also the text still buffered for the next frame) and ignores later frames, a new start after a lost connection resets the state, a start while another stream runs aborts it without leaking its buffered or late text, reset returns to idle, deltas are committed once per animation frame, unmounting aborts, and the aborted outcome reports whether any frame arrived (streamStarted, true even for a delta still buffered for the next frame). v1.3 (W7, Bloque 2): the aborted outcome carries `announced` (null without a start frame); the early `start` frame is exposed as announced in the state and in the aborted outcome. Depends on vitest, Testing Library, msw and the shared SSE test helpers.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse, startFrame } from "./sse-test-helpers";
import { useStreamingResponse } from "./use-streaming-response";

const PATH = "/api/tutor/conversations/c1/messages";
const URL = `${BACKEND_ORIGIN}${PATH}`;
const REQUEST = { path: PATH, body: { message: "¿Qué es la PEEP?" } };
const DONE = { aiCallId: "call-1", messageId: "msg-1", conversationId: "conv-1" };
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

// Captures animation frame callbacks so the test decides when a frame runs.
function mockAnimationFrames() {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  const request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextId;

    nextId += 1;
    callbacks.set(id, callback);

    return id;
  });

  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    callbacks.delete(id);
  });

  return {
    request,
    pending: () => callbacks.size,
    runFrame: () => {
      const queued = [...callbacks.values()];

      callbacks.clear();
      queued.forEach((callback) => callback(performance.now()));
    },
  };
}

describe("useStreamingResponse", () => {
  it("accumulates deltas and resolves with the done metadata", async() => {
    const stream = controlledStream();
    let body: unknown = null;
    const done = { ...DONE, sources: [{ title: "Guía de PEEP", url: "https://example.org/peep" }] };

    server.use(http.post(URL, async({ request }) => {
      body = await request.json();

      return stream.response();
    }));
    const { result } = renderHook(() => useStreamingResponse());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    expect(result.current.status).toBe("streaming");

    stream.push(deltaFrame("La PEEP "));
    await waitFor(() => expect(result.current.text).toBe("La PEEP "));
    stream.push(deltaFrame("mantiene los alvéolos abiertos."));
    await waitFor(() => expect(result.current.text).toBe("La PEEP mantiene los alvéolos abiertos."));

    stream.push(doneFrame(done));
    await act(async() => {
      await expect(outcome).resolves.toEqual({ status: "done", done });
    });
    expect(result.current.status).toBe("done");
    expect(result.current.done).toEqual(done);
    expect(result.current.done?.sources).toHaveLength(1);
    expect(body).toEqual({ message: "¿Qué es la PEEP?" });
  });

  it("turns an error frame into an ApiError and keeps the received text", async() => {
    server.use(http.post(URL, () => sseResponse([deltaFrame("Hola"), errorFrame("ai.stream_interrupted", "Interrumpida")])));
    const { result } = renderHook(() => useStreamingResponse());

    await act(async() => {
      await expect(result.current.start(REQUEST)).resolves.toMatchObject({ status: "error", streamStarted: true });
    });
    expect(result.current.status).toBe("error");
    expect(result.current.text).toBe("Hola");
    expect(result.current.error?.code).toBe("ai.stream_interrupted");
  });

  it("reports an HTTP error before the stream with its retry time", async() => {
    server.use(http.post(URL, () => HttpResponse.json(
      { success: false, message: "quota", data: null, code: "ai.quota_exceeded", timestamp: "", traceId: "t", pagination: null },
      { status: 429, headers: { "Retry-After": "600" } },
    )));
    const { result } = renderHook(() => useStreamingResponse());

    await act(async() => {
      await expect(result.current.start(REQUEST)).resolves.toMatchObject({ status: "error", streamStarted: false });
    });
    expect(result.current.status).toBe("error");
    expect(result.current.text).toBe("");
    expect(result.current.error).toMatchObject({ status: 429, code: "ai.quota_exceeded", retryAfter: 600 });
  });

  it("keeps the partial text (including the text waiting for the next frame) when aborted", async() => {
    const frames = mockAnimationFrames();
    const stream = controlledStream();

    server.use(http.post(URL, () => stream.response()));
    const { result } = renderHook(() => useStreamingResponse());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    stream.push(deltaFrame("Parte uno"));
    await waitFor(() => expect(frames.pending()).toBe(1));
    expect(result.current.text).toBe("");

    act(() => result.current.abort());
    expect(result.current.status).toBe("aborted");
    expect(result.current.text).toBe("Parte uno");
    expect(frames.pending()).toBe(0);

    stream.push(deltaFrame(" y parte dos"));
    stream.push(doneFrame(DONE));
    await act(async() => {
      await expect(outcome).resolves.toEqual({ status: "aborted", streamStarted: true, announced: null });
    });
    expect(result.current.text).toBe("Parte uno");
    expect(result.current.done).toBeNull();
  });

  it("starts again after a lost connection and resets the previous state", async() => {
    const handlers = [
      () => sseResponse([deltaFrame("Respuesta cortada")]),
      () => sseResponse([deltaFrame("Respuesta completa"), doneFrame(DONE)]),
    ];

    server.use(http.post(URL, () => (handlers.shift() ?? handlers[0])?.()));
    const { result } = renderHook(() => useStreamingResponse());

    await act(async() => {
      await expect(result.current.start(REQUEST)).resolves.toMatchObject({ status: "error", streamStarted: true });
    });
    expect(result.current.error?.code).toBe("network.stream_interrupted");
    expect(result.current.text).toBe("Respuesta cortada");

    let retry: Promise<unknown> = Promise.resolve();

    act(() => {
      retry = result.current.start(REQUEST);
    });
    expect(result.current.status).toBe("streaming");
    expect(result.current.text).toBe("");
    expect(result.current.error).toBeNull();

    await act(async() => {
      await expect(retry).resolves.toEqual({ status: "done", done: DONE });
    });
    expect(result.current.text).toBe("Respuesta completa");
    expect(result.current.status).toBe("done");
  });

  it("commits the deltas received within one animation frame in a single render", async() => {
    const frames = mockAnimationFrames();
    const stream = controlledStream();
    let renders = 0;

    server.use(http.post(URL, () => stream.response()));
    const { result } = renderHook(() => {
      renders += 1;

      return useStreamingResponse();
    });

    act(() => {
      void result.current.start(REQUEST);
    });
    stream.push(deltaFrame("Uno, ") + deltaFrame("dos, ") + deltaFrame("tres."));
    await waitFor(() => expect(frames.pending()).toBe(1));
    // Give the iterator time to consume every frame of the chunk.
    await act(async() => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(result.current.text).toBe("");

    const before = renders;

    act(() => frames.runFrame());
    expect(result.current.text).toBe("Uno, dos, tres.");
    expect(renders - before).toBe(1);
    act(() => result.current.abort());
  });

  it("aborts the running stream when start is called again and never leaks its text into the new one", async() => {
    const frames = mockAnimationFrames();
    const first = controlledStream();
    const second = controlledStream();
    const streams = [first, second];
    server.use(http.post(URL, () => (streams.shift() ?? first).response()));
    const { result } = renderHook(() => useStreamingResponse());
    let firstOutcome: Promise<unknown> = Promise.resolve();
    let secondOutcome: Promise<unknown> = Promise.resolve();

    act(() => {
      firstOutcome = result.current.start(REQUEST);
    });
    first.push(deltaFrame("vieja"));
    // "vieja" is buffered for the next frame, not committed yet.
    await waitFor(() => expect(frames.pending()).toBe(1));

    act(() => {
      secondOutcome = result.current.start(REQUEST);
    });
    expect(result.current.status).toBe("streaming");
    expect(result.current.text).toBe("");
    expect(frames.pending()).toBe(0);

    first.push(deltaFrame(" tardía"));
    first.push(doneFrame(DONE));
    await act(async() => {
      await expect(firstOutcome).resolves.toEqual({ status: "aborted", streamStarted: true, announced: null });
    });
    act(() => frames.runFrame());
    expect(result.current.text).toBe("");
    expect(result.current.done).toBeNull();

    second.push(deltaFrame("nueva"));
    await waitFor(() => expect(frames.pending()).toBe(1));
    act(() => frames.runFrame());
    expect(result.current.text).toBe("nueva");

    second.push(doneFrame({ ...DONE, messageId: "msg-2" }));
    await act(async() => {
      await expect(secondOutcome).resolves.toEqual({ status: "done", done: { ...DONE, messageId: "msg-2" } });
    });
    expect(result.current.text).toBe("nueva");
    expect(result.current.done?.messageId).toBe("msg-2");
  });

  it("reset aborts the running stream, drops the buffered text and returns to idle", async() => {
    const frames = mockAnimationFrames();
    const stream = controlledStream();

    server.use(http.post(URL, () => stream.response()));
    const { result } = renderHook(() => useStreamingResponse());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    stream.push(deltaFrame("Parte uno"));
    await waitFor(() => expect(frames.pending()).toBe(1));

    act(() => result.current.reset());
    expect(result.current).toMatchObject({ status: "idle", text: "", done: null, error: null });
    expect(frames.pending()).toBe(0);

    stream.push(deltaFrame(" y parte dos"));
    stream.push(doneFrame(DONE));
    await act(async() => {
      await expect(outcome).resolves.toEqual({ status: "aborted", streamStarted: true, announced: null });
    });
    act(() => frames.runFrame());
    expect(result.current).toMatchObject({ status: "idle", text: "", done: null, error: null });
  });

  it("reset after a finished answer clears it", async() => {
    server.use(http.post(URL, () => sseResponse([deltaFrame("Respuesta"), doneFrame(DONE)])));
    const { result } = renderHook(() => useStreamingResponse());

    await act(async() => {
      await result.current.start(REQUEST);
    });
    expect(result.current.status).toBe("done");

    act(() => result.current.reset());
    expect(result.current).toMatchObject({ status: "idle", text: "", done: null, error: null });
  });

  it("exposes the start frame as announced and keeps it in the aborted outcome", async() => {
    const stream = controlledStream();

    server.use(http.post(URL, () => stream.response()));
    const { result } = renderHook(() => useStreamingResponse());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    stream.push(startFrame({ conversationId: "conv-1", messageId: "msg-1" }));
    await waitFor(() => expect(result.current.announced).toEqual({ conversationId: "conv-1", messageId: "msg-1" }));
    expect(result.current.status).toBe("streaming");

    act(() => result.current.abort());
    stream.close();
    await act(async() => {
      await expect(outcome).resolves.toEqual({
        status: "aborted",
        streamStarted: true,
        announced: { conversationId: "conv-1", messageId: "msg-1" },
      });
    });
    expect(result.current.announced).toEqual({ conversationId: "conv-1", messageId: "msg-1" });
  });

  it("reports streamStarted false when aborted before any frame arrived", async() => {
    const stream = controlledStream();
    let requested = false;

    server.use(http.post(URL, () => {
      requested = true;

      return stream.response();
    }));
    const { result } = renderHook(() => useStreamingResponse());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    await waitFor(() => expect(requested).toBe(true));

    act(() => result.current.abort());
    stream.push(deltaFrame("tarde"));
    await act(async() => {
      await expect(outcome).resolves.toEqual({ status: "aborted", streamStarted: false, announced: null });
    });
    expect(result.current.text).toBe("");
  });

  it("aborts the running stream on unmount", async() => {
    const stream = controlledStream();

    server.use(http.post(URL, () => stream.response()));
    const { result, unmount } = renderHook(() => useStreamingResponse());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    stream.push(deltaFrame("algo"));
    await waitFor(() => expect(result.current.text).toBe("algo"));

    unmount();
    stream.push(doneFrame(DONE));
    await expect(outcome).resolves.toEqual({ status: "aborted", streamStarted: true, announced: null });
  });
});
