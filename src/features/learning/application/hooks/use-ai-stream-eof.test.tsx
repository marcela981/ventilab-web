/*
* Funcionalidad: useAiStream end-of-stream tests
* Descripción: Tests of the AI answer stream hook with the shared SSE helper replaced by scripted async generators: an iterator that ends without `done` or `error` leaves the hook in a terminal error state (`network.stream_interrupted`) instead of "streaming", and the error outcome tells whether any frame was received before the failure (streamStarted), which the panels use to tell a rejection before the stream from an interrupted answer. Depends on vitest and Testing Library.
* Versión: 1.0 (L6 fix)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import type { EventStreamEvent } from "@shared/api-client/sse-stream";
import type { AiStreamOutcome } from "./use-ai-stream";
import { useAiStream } from "./use-ai-stream";

const script = vi.hoisted(() => ({ run: null as null | (() => AsyncGenerator<EventStreamEvent>) }));

vi.mock("@shared/api-client/sse-stream", () => ({
  postEventStream: () => {
    if (!script.run) {
      throw new Error("No scripted stream");
    }

    return script.run();
  },
}));

const REQUEST = { path: "/api/tutor/pages/p1/deepen", body: {} };

async function startWith(run: () => AsyncGenerator<EventStreamEvent>) {
  script.run = run;

  const { result } = renderHook(() => useAiStream());
  let outcome: AiStreamOutcome | null = null;

  await act(async() => {
    outcome = await result.current.start(REQUEST);
  });

  return { result, outcome: outcome as AiStreamOutcome | null };
}

describe("useAiStream end of stream", () => {
  it("leaves the streaming state when the iterator ends without done or error", async() => {
    const { result, outcome } = await startWith(async function* () {
      yield { type: "delta", text: "Parte" };
    });

    expect(result.current.status).toBe("error");
    expect(result.current.text).toBe("Parte");
    expect(result.current.error?.code).toBe(CLIENT_ERROR_CODES.streamInterrupted);
    expect(outcome).toMatchObject({ status: "error", streamStarted: true });
  });

  it("reports a failure before any frame as not started", async() => {
    const { outcome } = await startWith(async function* () {
      yield* [];
      throw new ApiError({ code: CLIENT_ERROR_CODES.networkUnavailable, message: "offline", status: 0 });
    });

    expect(outcome).toMatchObject({ status: "error", streamStarted: false });
  });

  it("reports an error frame as started", async() => {
    const { outcome } = await startWith(async function* () {
      yield { type: "error", code: "ai.stream_interrupted", message: "cortado" };
    });

    expect(outcome).toMatchObject({ status: "error", streamStarted: true });
  });
});
