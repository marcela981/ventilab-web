/*
* Funcionalidad: useAiStream
* Descripción: State of one streamed AI tutor answer. Thin learning wrapper over the shared useStreamingResponse (@shared/ai-conversation) typed with the tutor `done` payload {aiCallId, messageId, conversationId}: `start({path, body})` opens the stream (aborting any running one), accumulates the `delta` texts (committed once per animation frame) and resolves with the outcome: done, error (ApiError with `streamStarted`, so callers tell a rejection before the stream from an interrupted answer; an iterator that ends without `done`/`error` becomes `network.stream_interrupted`) or aborted. `stop()` aborts the request (the backend cancels the AI call and keeps the received part as incomplete), keeps the partial text and sets status aborted; later frames are ignored. Unmounting aborts the running stream, so closing the panel, switching tab or changing page never leaves an answer running. Status: idle | streaming | done | error | aborted. Depends on @shared/ai-conversation. v1.2 (S2 ai-chat): the stream logic moved to the shared hook; same public API (stop = shared abort). v1.3 (A3 ai-chat): the shared aborted outcome now carries `streamStarted`; this wrapper keeps its previous public outcome (`{status: "aborted"}`) so the learning panels and tests do not change.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback } from "react";
import { useStreamingResponse } from "@shared/ai-conversation/application/use-streaming-response";
import type { StreamingOutcome, StreamingResponseState, StreamingStatus } from "@shared/ai-conversation/application/use-streaming-response";
import type { TutorStreamDone } from "@shared/api-client/sse-stream";
import type { TutorStreamRequest } from "../entities/tutor.entity";

export type AiStreamStatus = StreamingStatus;

export type AiStreamOutcome = Exclude<StreamingOutcome<TutorStreamDone>, { status: "aborted" }> | { status: "aborted" };

export type AiStream = StreamingResponseState<TutorStreamDone> & {
  start: (request: TutorStreamRequest) => Promise<AiStreamOutcome>
  stop: () => void
  reset: () => void
};

export function useAiStream(): AiStream {
  const { abort, start: startShared, ...stream } = useStreamingResponse<TutorStreamDone>();
  const start = useCallback(async(request: TutorStreamRequest): Promise<AiStreamOutcome> => {
    const outcome = await startShared(request);

    return outcome.status === "aborted" ? { status: "aborted" } : outcome;
  }, [startShared]);

  return { ...stream, start, stop: abort };
}
