/*
* Funcionalidad: useStreamingResponse terminal frame tests
* Descripción: Tests that a terminal frame (`error` or `done`) ends the read loop of useStreamingResponse: frames a misbehaving iterator yields after it (delta, done, error) never change the state or the outcome. The SSE helper is replaced by scripted async generators, because the real helper already stops after a terminal frame. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EventStreamEvent } from "@shared/api-client/sse-stream";
import type { DefaultStreamDone, StreamingOutcome } from "./use-streaming-response";
import { useStreamingResponse } from "./use-streaming-response";

const script = vi.hoisted(() => ({ run: null as null | (() => AsyncGenerator<EventStreamEvent<unknown>>) }));

vi.mock("@shared/api-client/sse-stream", () => ({
  postEventStream: () => {
    if (!script.run) {
      throw new Error("No scripted stream");
    }

    return script.run();
  },
}));

const REQUEST = { path: "/api/tutor/conversations/c1/messages", body: {} };
const DONE = { aiCallId: "call-1", messageId: "msg-1", conversationId: "conv-1" };

async function startWith(run: () => AsyncGenerator<EventStreamEvent<unknown>>) {
  script.run = run;

  const { result } = renderHook(() => useStreamingResponse());
  let outcome: StreamingOutcome<DefaultStreamDone> | null = null;

  await act(async() => {
    outcome = await result.current.start(REQUEST);
  });
  // Let any commit scheduled by a late delta run.
  await act(async() => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

  return { result, outcome: outcome as StreamingOutcome<DefaultStreamDone> | null };
}

describe("useStreamingResponse terminal frames", () => {
  it("ignores the frames that follow an error frame", async() => {
    const { result, outcome } = await startWith(async function* () {
      yield { type: "delta", text: "Hola" };
      yield { type: "error", code: "ai.stream_interrupted", message: "Interrumpida" };
      yield { type: "delta", text: " tardío" };
      yield { type: "done", data: DONE };
    });

    expect(outcome).toMatchObject({ status: "error", streamStarted: true });
    expect(result.current.status).toBe("error");
    expect(result.current.text).toBe("Hola");
    expect(result.current.done).toBeNull();
    expect(result.current.error?.code).toBe("ai.stream_interrupted");
  });

  it("ignores the frames that follow a done frame", async() => {
    const { result, outcome } = await startWith(async function* () {
      yield { type: "delta", text: "Completa" };
      yield { type: "done", data: DONE };
      yield { type: "delta", text: " tardío" };
      yield { type: "error", code: "ai.stream_interrupted", message: "Interrumpida" };
    });

    expect(outcome).toEqual({ status: "done", done: DONE });
    expect(result.current.status).toBe("done");
    expect(result.current.text).toBe("Completa");
    expect(result.current.error).toBeNull();
  });
});
