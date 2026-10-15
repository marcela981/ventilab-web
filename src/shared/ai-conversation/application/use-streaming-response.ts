/*
* Funcionalidad: useStreamingResponse
* Descripción: Generic state of one streamed AI answer over the shared SSE helper (postEventStream). `start({path, body})` opens the stream (aborting any running one), accumulates the `delta` texts and resolves with the outcome: done (the route's `done` metadata: aiCallId, messageId, optional sources and extra fields such as conversationId), error (ApiError: errors before the stream such as 404/429/503 with `streamStarted` false, an `event: error` frame or a connection lost mid-stream with `streamStarted` true) or aborted. Deltas are buffered and committed once per animation frame, so a fast stream re-renders per frame, not per token; the buffer is flushed on done, error and abort. `abort()` keeps the partial text and sets status aborted; later frames are ignored. A terminal frame (done or error) ends the read loop, so frames after it are ignored. Unmounting aborts the running stream. Status: idle | streaming | done | error | aborted. Calling `start` again (e.g. a retry after an error) resets text, error and done. Depends on react and @shared/api-client.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { postEventStream } from "@shared/api-client/sse-stream";
import type { StreamDoneMetadata } from "./ai-conversation.entity";

// Backend route (without origin) and JSON body of a text/event-stream POST.
export type StreamRequest = {
  path: string
  body?: unknown
};

export type StreamingStatus = "idle" | "streaming" | "done" | "error" | "aborted";

export type DefaultStreamDone = StreamDoneMetadata & { conversationId?: string | undefined };

export type StreamingOutcome<TDone extends StreamDoneMetadata = DefaultStreamDone> =
  | { status: "done", done: TDone }
  // streamStarted: at least one frame (delta, done or error) was received before the failure.
  | { status: "error", error: ApiError, streamStarted: boolean }
  | { status: "aborted" };

export type StreamingResponseState<TDone extends StreamDoneMetadata = DefaultStreamDone> = {
  status: StreamingStatus
  text: string
  done: TDone | null
  error: ApiError | null
};

export type StreamingResponse<TDone extends StreamDoneMetadata = DefaultStreamDone> = StreamingResponseState<TDone> & {
  start: (request: StreamRequest) => Promise<StreamingOutcome<TDone>>
  abort: () => void
  reset: () => void
};

const FRAME_FALLBACK_MS = 16;

// Schedules one commit for the next animation frame (setTimeout where rAF does not exist); returns its canceller.
function scheduleFrame(callback: () => void): () => void {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    const id = window.requestAnimationFrame(() => callback());

    return () => window.cancelAnimationFrame(id);
  }

  const id = setTimeout(callback, FRAME_FALLBACK_MS);

  return () => clearTimeout(id);
}

export function useStreamingResponse<TDone extends StreamDoneMetadata = DefaultStreamDone>(): StreamingResponse<TDone> {
  const [state, setState] = useState<StreamingResponseState<TDone>>({ status: "idle", text: "", done: null, error: null });
  // The controller of the running stream; null once it finished, was aborted or was replaced.
  const controllerRef = useRef<AbortController | null>(null);
  // Delta text received since the last commit, and the canceller of the scheduled commit.
  const pendingRef = useRef("");
  const cancelFrameRef = useRef<(() => void) | null>(null);

  // Cancels the scheduled commit and hands over the buffered text.
  const takePending = useCallback((): string => {
    cancelFrameRef.current?.();
    cancelFrameRef.current = null;

    const pending = pendingRef.current;

    pendingRef.current = "";

    return pending;
  }, []);

  const commitFrame = useCallback(() => {
    cancelFrameRef.current = null;

    const pending = pendingRef.current;

    pendingRef.current = "";

    if (pending !== "") {
      setState((current) => ({ ...current, text: current.text + pending }));
    }
  }, []);

  const abort = useCallback(() => {
    const controller = controllerRef.current;

    if (!controller) {
      return;
    }

    controllerRef.current = null;
    controller.abort();

    const pending = takePending();

    setState((current) => (current.status === "streaming" ? { ...current, text: current.text + pending, status: "aborted" } : current));
  }, [takePending]);

  const start = useCallback(async({ path, body }: StreamRequest): Promise<StreamingOutcome<TDone>> => {
    controllerRef.current?.abort();
    takePending();

    const controller = new AbortController();
    const isCurrent = () => controllerRef.current === controller;

    controllerRef.current = controller;
    setState({ status: "streaming", text: "", done: null, error: null });

    let outcome: StreamingOutcome<TDone> | null = null;
    let streamStarted = false;
    const fail = (error: ApiError) => {
      const pending = takePending();

      outcome = { status: "error", error, streamStarted };
      setState((current) => ({ ...current, text: current.text + pending, status: "error", error }));
    };

    try {
      for await (const event of postEventStream<TDone>(path, body, { signal: controller.signal })) {
        if (!isCurrent()) {
          break;
        }

        streamStarted = true;

        if (event.type === "delta") {
          pendingRef.current += event.text;
          cancelFrameRef.current ??= scheduleFrame(commitFrame);
        } else if (event.type === "done") {
          const pending = takePending();
          const done = event.data;

          outcome = { status: "done", done };
          setState((current) => ({ ...current, text: current.text + pending, status: "done", done }));

          // Terminal frame: nothing after it may change the answer.
          break;
        } else {
          fail(new ApiError({ code: event.code, message: event.message, status: 0 }));

          // Terminal frame: nothing after it may change the answer.
          break;
        }
      }

      // The iterator ended without a terminal frame while this stream is still current (not aborted or replaced).
      if (outcome === null && isCurrent()) {
        fail(new ApiError({
          code: CLIENT_ERROR_CODES.streamInterrupted,
          message: "The connection closed before the answer finished",
          status: 0,
        }));
      }
    } catch (caught) {
      if (isCurrent()) {
        fail(toApiError(caught));
      }
    } finally {
      if (isCurrent()) {
        controllerRef.current = null;
      }
    }

    return outcome ?? { status: "aborted" };
  }, [commitFrame, takePending]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    takePending();
    setState({ status: "idle", text: "", done: null, error: null });
  }, [takePending]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    takePending();
  }, [takePending]);

  return { ...state, start, abort, reset };
}
