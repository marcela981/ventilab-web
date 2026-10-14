/*
* Funcionalidad: useAiStream tests
* Descripción: Tests of the AI answer stream hook against msw serving real text/event-stream bodies: deltas accumulate progressively and `done` resolves with its payload, stop() aborts (no further text, status aborted), an `event: error` frame and a 429 before the stream become ApiError state, a new start() aborts the running stream (its outcome is aborted and its later frames are ignored) and unmounting aborts it. Depends on vitest, Testing Library, msw and the SSE test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiUrl } from "../pages/learning-test-helpers";
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse } from "./sse-test-helpers";
import { useAiStream } from "./use-ai-stream";

const PATH = "/api/tutor/pages/p1/deepen";
const REQUEST = { path: PATH, body: { question: "¿PEEP?" } };
const DONE = { aiCallId: "call-1", messageId: "msg-1", conversationId: "conv-1" };
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("useAiStream", () => {
  it("accumulates deltas progressively and resolves with the done payload", async() => {
    const stream = controlledStream();
    let body: unknown = null;

    server.use(http.post(apiUrl(PATH), async({ request }) => {
      body = await request.json();

      return stream.response();
    }));
    const { result } = renderHook(() => useAiStream());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    expect(result.current.status).toBe("streaming");

    stream.push(deltaFrame("La PEEP "));
    await waitFor(() => expect(result.current.text).toBe("La PEEP "));
    stream.push(deltaFrame("mantiene los alvéolos abiertos."));
    await waitFor(() => expect(result.current.text).toBe("La PEEP mantiene los alvéolos abiertos."));
    expect(result.current.status).toBe("streaming");

    stream.push(doneFrame(DONE));
    await act(async() => {
      await expect(outcome).resolves.toEqual({ status: "done", done: DONE });
    });
    expect(result.current.status).toBe("done");
    expect(result.current.done).toEqual(DONE);
    expect(body).toEqual({ question: "¿PEEP?" });
  });

  it("stops the stream on demand without accepting more text", async() => {
    const stream = controlledStream();

    server.use(http.post(apiUrl(PATH), () => stream.response()));
    const { result } = renderHook(() => useAiStream());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start(REQUEST);
    });
    stream.push(deltaFrame("Parte uno"));
    await waitFor(() => expect(result.current.text).toBe("Parte uno"));

    act(() => result.current.stop());
    expect(result.current.status).toBe("aborted");
    stream.push(deltaFrame(" y parte dos"));
    stream.push(doneFrame(DONE));

    await act(async() => {
      await expect(outcome).resolves.toEqual({ status: "aborted" });
    });
    expect(result.current.text).toBe("Parte uno");
    expect(result.current.status).toBe("aborted");
    expect(result.current.done).toBeNull();
  });

  it("turns an error frame into an ApiError with the backend code", async() => {
    server.use(http.post(apiUrl(PATH), () => sseResponse([deltaFrame("Hola"), errorFrame("ai.stream_interrupted", "Interrumpida")])));
    const { result } = renderHook(() => useAiStream());

    await act(async() => {
      await result.current.start(REQUEST);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.text).toBe("Hola");
    expect(result.current.error?.code).toBe("ai.stream_interrupted");
  });

  it("reports a 429 before the stream with its retry time", async() => {
    server.use(http.post(apiUrl(PATH), () => HttpResponse.json(
      { success: false, message: "quota", data: null, code: "ai.quota_exceeded", timestamp: "", traceId: "t", pagination: null },
      { status: 429, headers: { "Retry-After": "600" } },
    )));
    const { result } = renderHook(() => useAiStream());

    await act(async() => {
      await expect(result.current.start(REQUEST)).resolves.toMatchObject({ status: "error" });
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatchObject({ status: 429, code: "ai.quota_exceeded", retryAfter: 600 });
  });

  it("aborts the running stream when a new one starts and on unmount", async() => {
    const first = controlledStream();
    const second = controlledStream();
    const streams = [first, second];

    server.use(http.post(apiUrl(PATH), () => (streams.shift() ?? first).response()));
    const { result, unmount } = renderHook(() => useAiStream());
    let firstOutcome: Promise<unknown> = Promise.resolve();
    let secondOutcome: Promise<unknown> = Promise.resolve();

    act(() => {
      firstOutcome = result.current.start(REQUEST);
    });
    first.push(deltaFrame("vieja"));
    await waitFor(() => expect(result.current.text).toBe("vieja"));

    act(() => {
      secondOutcome = result.current.start(REQUEST);
    });
    expect(result.current.text).toBe("");
    first.push(deltaFrame(" ignorada"));
    await act(async() => {
      await expect(firstOutcome).resolves.toEqual({ status: "aborted" });
    });
    second.push(deltaFrame("nueva"));
    await waitFor(() => expect(result.current.text).toBe("nueva"));

    unmount();
    second.push(deltaFrame(" tras desmontar"));
    second.push(doneFrame(DONE));
    await expect(secondOutcome).resolves.toEqual({ status: "aborted" });
  });
});
