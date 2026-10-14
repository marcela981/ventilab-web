/*
* Funcionalidad: useAiStream
* Descripción: State of one streamed AI tutor answer over the shared SSE helper (postEventStream). `start({path, body})` opens the stream (aborting any running one), accumulates every `delta` text progressively and resolves with the outcome: done (payload {aiCallId, messageId, conversationId}), error (ApiError: errors before the stream such as 404/429/503, or an `event: error` frame with its backend code and status 0) or aborted. `stop()` aborts the request (the backend cancels the AI call and keeps the received part as incomplete), keeps the partial text and sets status aborted; later frames are ignored. Unmounting aborts the running stream, so closing the panel, switching tab or changing page never leaves an answer running. Status: idle | streaming | done | error | aborted. Depends on react and @shared/api-client.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, toApiError } from "@shared/api-client/api-error";
import { postEventStream } from "@shared/api-client/sse-stream";
import type { TutorStreamDone } from "@shared/api-client/sse-stream";
import type { TutorStreamRequest } from "../entities/tutor.entity";

export type AiStreamStatus = "idle" | "streaming" | "done" | "error" | "aborted";

export type AiStreamOutcome =
  | { status: "done", done: TutorStreamDone }
  | { status: "error", error: ApiError }
  | { status: "aborted" };

type AiStreamState = {
  status: AiStreamStatus
  text: string
  done: TutorStreamDone | null
  error: ApiError | null
};

export type AiStream = AiStreamState & {
  start: (request: TutorStreamRequest) => Promise<AiStreamOutcome>
  stop: () => void
  reset: () => void
};

const IDLE: AiStreamState = { status: "idle", text: "", done: null, error: null };

export function useAiStream(): AiStream {
  const [state, setState] = useState<AiStreamState>(IDLE);
  // The controller of the running stream; null once it finished, was stopped or was replaced.
  const controllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    const controller = controllerRef.current;

    if (!controller) {
      return;
    }

    controllerRef.current = null;
    controller.abort();
    setState((current) => (current.status === "streaming" ? { ...current, status: "aborted" } : current));
  }, []);

  const start = useCallback(async({ path, body }: TutorStreamRequest): Promise<AiStreamOutcome> => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    const isCurrent = () => controllerRef.current === controller;

    controllerRef.current = controller;
    setState({ status: "streaming", text: "", done: null, error: null });

    let outcome: AiStreamOutcome = { status: "aborted" };

    try {
      for await (const event of postEventStream(path, body, { signal: controller.signal })) {
        if (!isCurrent()) {
          break;
        }

        if (event.type === "delta") {
          setState((current) => ({ ...current, text: current.text + event.text }));
        } else if (event.type === "done") {
          outcome = { status: "done", done: event.data };
          setState((current) => ({ ...current, status: "done", done: event.data }));
        } else {
          const error = new ApiError({ code: event.code, message: event.message, status: 0 });

          outcome = { status: "error", error };
          setState((current) => ({ ...current, status: "error", error }));
        }
      }
    } catch (caught) {
      if (isCurrent()) {
        const error = toApiError(caught);

        outcome = { status: "error", error };
        setState((current) => ({ ...current, status: "error", error }));
      }
    } finally {
      if (isCurrent()) {
        controllerRef.current = null;
      }
    }

    return outcome;
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(IDLE);
  }, []);

  useEffect(() => () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return { ...state, start, stop, reset };
}
