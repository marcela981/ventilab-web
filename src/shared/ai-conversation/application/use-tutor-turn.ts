/*
* Funcionalidad: useTutorTurn
* Descripción: Single streaming engine of the AI tutor turns (deepen accordion, TutorAI popup questions), built on the shared useStreamingResponse and the SSE helper. `start(request)` streams one answer; the request is either a fixed {path, body} or a builder that receives the conversation id known so far, so a retry or a follow-up after a first turn that already created its conversation (announced by the early `start` frame) continues that conversation instead of opening a new one. `stop()` aborts the answer (the backend keeps the received part as an incomplete message), `retry()` re-sends the last request. It exposes status, text, error, the conversation id (adopted from the `start` frame, falling back to `done`; it survives later turns until reset) and the assistant message id of the current turn (same sources), which stays known after a stop. `ratableMessageId` is that id once the answer can be rated: done, or stopped after at least one fragment (stopping before the first fragment leaves nothing to rate). Depends on react, useStreamingResponse and the SSE types.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import type { TutorStreamDone } from "@shared/api-client/sse-stream";
import { useStreamingResponse } from "./use-streaming-response";
import type { StreamingOutcome, StreamingStatus, StreamRequest } from "./use-streaming-response";

// Builds the request with the conversation id known so far (null before the first turn created one).
export type TutorTurnRequestBuilder = (conversationId: string | null) => StreamRequest;

export type TutorTurnRequest = StreamRequest | TutorTurnRequestBuilder;

export type TutorTurnOutcome = StreamingOutcome<TutorStreamDone> & {
  conversationId: string | null
  messageId: string | null
};

export type TutorTurn = {
  status: StreamingStatus
  text: string
  error: ApiError | null
  // Conversation of the turns so far (start frame first, then done); null until one is known.
  conversationId: string | null
  // Assistant message of the current turn (start frame first, then done); kept after a stop.
  messageId: string | null
  // Message id to rate: done, or stopped after some text; null otherwise.
  ratableMessageId: string | null
  // A request was sent and nothing is streaming, so retry() can re-send it.
  canRetry: boolean
  start: (request: TutorTurnRequest) => Promise<TutorTurnOutcome>
  stop: () => void
  retry: () => Promise<TutorTurnOutcome | null>
  reset: () => void
};

function outcomeIds(outcome: StreamingOutcome<TutorStreamDone>): { conversationId: string | null, messageId: string | null } {
  if (outcome.status === "done") {
    return { conversationId: outcome.done.conversationId, messageId: outcome.done.messageId };
  }

  return { conversationId: outcome.announced?.conversationId ?? null, messageId: outcome.announced?.messageId ?? null };
}

export function useTutorTurn(): TutorTurn {
  const stream = useStreamingResponse<TutorStreamDone>();
  const { start: startStream, abort, reset: resetStream } = stream;
  // Conversation adopted by an earlier turn of this engine.
  const [adoptedId, setAdoptedId] = useState<string | null>(null);
  const adoptedRef = useRef<string | null>(null);
  const lastRequestRef = useRef<TutorTurnRequest | null>(null);
  const [hasRequest, setHasRequest] = useState(false);

  const start = useCallback(async(request: TutorTurnRequest): Promise<TutorTurnOutcome> => {
    lastRequestRef.current = request;
    setHasRequest(true);

    const resolved = typeof request === "function" ? request(adoptedRef.current) : request;
    const outcome = await startStream(resolved);
    const ids = outcomeIds(outcome);
    const conversationId = ids.conversationId ?? adoptedRef.current;

    if (conversationId !== adoptedRef.current) {
      adoptedRef.current = conversationId;
      setAdoptedId(conversationId);
    }

    return { ...outcome, conversationId, messageId: ids.messageId };
  }, [startStream]);

  const retry = useCallback(async(): Promise<TutorTurnOutcome | null> => {
    const last = lastRequestRef.current;

    return last ? start(last) : null;
  }, [start]);

  const reset = useCallback(() => {
    resetStream();
    adoptedRef.current = null;
    lastRequestRef.current = null;
    setAdoptedId(null);
    setHasRequest(false);
  }, [resetStream]);

  const messageId = stream.done?.messageId ?? stream.announced?.messageId ?? null;
  const conversationId = stream.done?.conversationId ?? stream.announced?.conversationId ?? adoptedId;
  const isRatable = stream.status === "done" || (stream.status === "aborted" && stream.text !== "");

  return {
    status: stream.status,
    text: stream.text,
    error: stream.error,
    conversationId,
    messageId,
    ratableMessageId: isRatable ? messageId : null,
    canRetry: hasRequest && stream.status !== "streaming",
    start,
    stop: abort,
    retry,
    reset,
  };
}
