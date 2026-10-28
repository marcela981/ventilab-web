/*
* Funcionalidad: useTutorTurn tests
* Descripción: Tests of the AI tutor turn engine against msw serving real text/event-stream bodies: the early `start` frame gives the conversation and message ids before any text, `done` confirms them, a stop keeps the announced message id (ratable only when some text arrived; a stop before the first fragment leaves nothing to rate), a stream without `start` falls back to `done`, retry() re-sends the last request, and a builder request receives the conversation adopted by the previous turn (retry after a failure that already created the conversation continues it). Depends on vitest, Testing Library, msw and the shared SSE test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse, startFrame } from "./sse-test-helpers";
import { useTutorTurn } from "./use-tutor-turn";

const PATH = "/api/tutor/pages/p1/deepen";
const URL = `${BACKEND_ORIGIN}${PATH}`;
const START = { conversationId: "conv-1", messageId: "msg-1" };
const DONE = { aiCallId: "call-1", ...START };
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

describe("useTutorTurn", () => {
  it("adopts the conversation and message ids from the start frame before any text", async() => {
    const stream = controlledStream();

    server.use(http.post(URL, () => stream.response()));
    const { result } = renderHook(() => useTutorTurn());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start({ path: PATH, body: {} });
    });
    stream.push(startFrame(START));
    await waitFor(() => expect(result.current.messageId).toBe("msg-1"));
    expect(result.current.conversationId).toBe("conv-1");
    expect(result.current.text).toBe("");
    expect(result.current.ratableMessageId).toBeNull();

    stream.push(deltaFrame("La PEEP"));
    stream.push(doneFrame(DONE));
    await act(async() => {
      await expect(outcome).resolves.toMatchObject({ status: "done", conversationId: "conv-1", messageId: "msg-1" });
    });
    expect(result.current.ratableMessageId).toBe("msg-1");
    expect(result.current.canRetry).toBe(true);
  });

  it("keeps the announced message id after a stop and rates it once some text arrived", async() => {
    const stream = controlledStream();

    server.use(http.post(URL, () => stream.response()));
    const { result } = renderHook(() => useTutorTurn());
    let outcome: Promise<unknown> = Promise.resolve();

    act(() => {
      outcome = result.current.start({ path: PATH, body: {} });
    });
    stream.push(startFrame(START));
    stream.push(deltaFrame("Parte"));
    await waitFor(() => expect(result.current.text).toBe("Parte"));

    act(() => result.current.stop());
    stream.close();
    await act(async() => {
      await expect(outcome).resolves.toMatchObject({ status: "aborted", streamStarted: true, conversationId: "conv-1", messageId: "msg-1" });
    });
    expect(result.current.status).toBe("aborted");
    expect(result.current.messageId).toBe("msg-1");
    expect(result.current.ratableMessageId).toBe("msg-1");
  });

  it("has nothing to rate when stopped before the first fragment", async() => {
    const stream = controlledStream();

    server.use(http.post(URL, () => stream.response()));
    const { result } = renderHook(() => useTutorTurn());

    act(() => {
      void result.current.start({ path: PATH, body: {} });
    });
    stream.push(startFrame(START));
    await waitFor(() => expect(result.current.messageId).toBe("msg-1"));

    act(() => result.current.stop());
    stream.close();
    expect(result.current.status).toBe("aborted");
    expect(result.current.ratableMessageId).toBeNull();
  });

  it("falls back to the done ids when the route sends no start frame", async() => {
    server.use(http.post(URL, () => sseResponse([deltaFrame("Hola"), doneFrame(DONE)])));
    const { result } = renderHook(() => useTutorTurn());

    await act(async() => {
      await result.current.start({ path: PATH, body: {} });
    });
    expect(result.current.conversationId).toBe("conv-1");
    expect(result.current.messageId).toBe("msg-1");
  });

  it("retries the last request and passes the adopted conversation to a request builder", async() => {
    const bodies: unknown[] = [];
    const responses = [
      () => sseResponse([startFrame(START), deltaFrame("Hola"), errorFrame("ai.stream_interrupted", "Interrumpida")]),
      () => sseResponse([startFrame({ ...START, messageId: "msg-2" }), deltaFrame("Completa"), doneFrame({ ...DONE, messageId: "msg-2" })]),
    ];

    server.use(http.post(URL, async({ request }) => {
      bodies.push(await request.json());

      return (responses.shift() ?? responses[0])!();
    }));
    const { result } = renderHook(() => useTutorTurn());

    await act(async() => {
      await expect(result.current.start((conversationId) => ({ path: PATH, body: conversationId ? { conversationId } : {} })))
        .resolves.toMatchObject({ status: "error", conversationId: "conv-1" });
    });
    expect(result.current.canRetry).toBe(true);

    await act(async() => {
      await expect(result.current.retry()).resolves.toMatchObject({ status: "done", messageId: "msg-2" });
    });
    expect(bodies).toEqual([{}, { conversationId: "conv-1" }]);
    expect(result.current.text).toBe("Completa");
    expect(result.current.ratableMessageId).toBe("msg-2");
  });

  it("returns null on retry before any request and forgets everything on reset", async() => {
    server.use(http.post(URL, () => sseResponse([startFrame(START), doneFrame(DONE)])));
    const { result } = renderHook(() => useTutorTurn());

    await act(async() => {
      await expect(result.current.retry()).resolves.toBeNull();
    });
    await act(async() => {
      await result.current.start({ path: PATH, body: {} });
    });
    expect(result.current.conversationId).toBe("conv-1");

    act(() => result.current.reset());
    expect(result.current.conversationId).toBeNull();
    expect(result.current.status).toBe("idle");
    expect(result.current.canRetry).toBe(false);
  });
});
