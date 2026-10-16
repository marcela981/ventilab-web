/*
* Funcionalidad: useChatSession
* Descripción: State machine of one AI assistant conversation, shared by the /assistant page and the global drawer. With a conversationId it seeds the thread from the stored detail once (404 → status not-found); without one it starts empty and creates the FREE conversation lazily on the first send, never before, through the streamed `POST /api/tutor/conversations` {scope: "FREE", message}; later sends stream from `/{id}/messages`. One turn at a time: the answer streams through the shared useStreamingResponse; on `done` the turn adopts conversationId, aiCallId, messageId and sources (when present) and the listing and detail reads are revalidated (the title is only known server-side). `stop()` aborts and keeps the partial answer as interrupted. A failure is classified (quota with the local reset time and no retry, provider unavailable, interrupted mid-stream, not found, failed); `retry()` resends the last user message (a turn rejected before its stream started is dropped, since the backend did not store it; a started one stays as interrupted). BACKEND GAP: the id of a new FREE conversation arrives only in `done`, so a first turn stopped after some text or failed mid-stream re-reads the newest FREE conversation (`?scope=FREE&limit=1`) to adopt it; a turn stopped before any frame adopts nothing. A completed answer equal to the fixed off-topic reply gets kind off-topic. Session expiry is left to the api-client. Depends on React, SWR, @shared/api-client, @shared/ai-conversation and the AI chat service, entity, config and useConversation. v1.1 (A2 review fixes): the recovery adopts the newest FREE conversation only when it was created at or after the turn start minus RECOVERY_CLOCK_SKEW_MS and is not a conversation this session already knew; "received" for a stopped turn is read after the aborted phase is rendered (the abort flushes the text buffered for the next animation frame), with a bounded wait; a non-404 detail failure sets status load-error (send stays blocked) and reload() re-reads the detail. v1.2 (A3): a stopped turn reads whether any frame arrived from the shared stream outcome (`streamStarted` of the aborted outcome) instead of waiting for the aborted render, so the bounded wait is gone.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import type { ApiError } from "@shared/api-client/api-error";
import { useStreamingResponse } from "@shared/ai-conversation";
import type { StreamDoneMetadata } from "@shared/ai-conversation";
import {
  CONVERSATION_PATH,
  CONVERSATIONS_PATH,
  fetchLatestFreeConversation,
  sendConversationMessageRequest,
  startFreeConversationRequest,
} from "../../api/services/ai-chat.service";
import { AI_CHAT_MESSAGE_MAX_LENGTH } from "../config/ai-chat.config";
import { classifyChatError, messageKind } from "../entities/ai-chat.entity";
import type { ChatError, ChatMessage, ChatMessageStatus, ConversationSummary } from "../entities/ai-chat.entity";
import { useConversation } from "./use-conversation";

export type ChatDone = StreamDoneMetadata & { conversationId?: string | undefined };

export type ChatSessionStatus = "loading" | "load-error" | "not-found" | "ready" | "streaming";

// Clock-skew tolerance between the browser and the backend when a stopped first FREE turn adopts the
// newest FREE conversation: one created earlier than the turn minus this margin belongs to something else.
export const RECOVERY_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type ChatSessionOptions = {
  // Conversation to open; null/undefined starts a new FREE chat on the first send.
  conversationId?: string | null | undefined
};

export type ChatSession = {
  // Open conversation: the given one, or the FREE one created by the first send (adopted from `done`).
  conversationId: string | null
  // Summary of the open conversation once its detail is loaded (title, scope, refId).
  conversation: ConversationSummary | null
  // Stored messages followed by the turns of this session, including the streaming answer.
  messages: readonly ChatMessage[]
  status: ChatSessionStatus
  isStreaming: boolean
  // Failure of the last turn; null after a success or a stop.
  error: ChatError | null
  // Failure loading the conversation detail (other than 404); status is then load-error and send is blocked.
  loadError: ApiError | null
  // Re-reads the conversation detail after a load error.
  reload: () => Promise<void>
  canRetry: boolean
  send: (text: string) => Promise<void>
  stop: () => void
  retry: () => Promise<void>
  // Leaves the conversation and starts an empty FREE chat (e.g. "Nueva conversación" in the drawer).
  reset: () => void
};

type TurnPhase = "streaming" | "done" | "aborted" | "error";

type Turn = {
  key: number
  userText: string
  // Conversation the turn was sent to; null for the first FREE turn (creates it).
  conversationId: string | null
  phase: TurnPhase
  streamStarted: boolean
  done: ChatDone | null
  error: ChatError | null
};

const PHASE_STATUS: Record<TurnPhase, ChatMessageStatus> = {
  streaming: "streaming",
  done: "complete",
  aborted: "interrupted",
  error: "error",
};

function turnMessages(turn: Turn, text: string, frozen: boolean): ChatMessage[] {
  const { done } = turn;
  const status = frozen && turn.phase === "error" ? "interrupted" : PHASE_STATUS[turn.phase];

  return [
    {
      id: `local-user-${turn.key}`,
      role: "user",
      content: turn.userText,
      status: "complete",
      kind: "answer",
      aiCallId: null,
      messageId: null,
      sources: [],
      createdAt: null,
    },
    {
      id: `local-assistant-${turn.key}`,
      role: "assistant",
      content: text,
      status,
      kind: turn.phase === "done" ? messageKind("assistant", text) : "answer",
      aiCallId: done?.aiCallId ?? null,
      messageId: done?.messageId ?? null,
      sources: done?.sources ?? [],
      createdAt: null,
    },
  ];
}

export function useChatSession({ conversationId: requestedId }: ChatSessionOptions = {}): ChatSession {
  const propId = requestedId ?? null;
  const { mutate } = useSWRConfig();
  const stream = useStreamingResponse<ChatDone>();
  const { start: startStream, abort: abortStream, reset: resetStream } = stream;
  const [activeId, setActiveId] = useState<string | null>(propId);
  // Conversation whose stored messages are already in `history` (seeded once, or created here).
  const [seededId, setSeededId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [turn, setTurn] = useState<Turn | null>(null);
  const detail = useConversation(activeId);
  const activeIdRef = useRef(activeId);
  const turnRef = useRef(turn);
  // Latest rendered answer text; read when a finished turn is moved into the history.
  const textRef = useRef(stream.text);
  const streamingRef = useRef(false);
  const stoppedRef = useRef(false);
  const keyRef = useRef(0);
  const recoveryRef = useRef<Promise<void> | null>(null);
  // Conversations this session opened or adopted; a recovery never adopts one of them.
  const knownIdsRef = useRef<Set<string>>(new Set(propId === null ? [] : [propId]));

  useLayoutEffect(() => {
    textRef.current = stream.text;
    turnRef.current = turn;
  }, [stream.text, turn]);

  // Seed the thread from the stored detail once per opened conversation (state update during render).
  if (activeId !== null && seededId !== activeId && detail.conversation?.id === activeId) {
    setSeededId(activeId);
    setHistory(detail.conversation.messages);
  }

  const clear = useCallback((nextId: string | null) => {
    resetStream();
    streamingRef.current = false;
    recoveryRef.current = null;
    activeIdRef.current = nextId;
    turnRef.current = null;
    setActiveId(nextId);
    setSeededId(null);
    setHistory([]);
    setTurn(null);
  }, [resetStream]);

  // Another conversation was requested (navigation); an id this session adopted is not a change.
  // Local state switches during render; the running stream is aborted by the effect below.
  const [requestedPropId, setRequestedPropId] = useState(propId);
  const [switchCount, setSwitchCount] = useState(0);

  if (propId !== requestedPropId) {
    setRequestedPropId(propId);

    if (propId !== activeId) {
      setActiveId(propId);
      setSeededId(null);
      setHistory([]);
      setTurn(null);
      setSwitchCount(switchCount + 1);
    }
  }

  useEffect(() => {
    if (switchCount > 0) {
      resetStream();
      streamingRef.current = false;
      recoveryRef.current = null;
    }
  }, [switchCount, resetStream]);

  useEffect(() => {
    activeIdRef.current = activeId;

    if (activeId !== null) {
      knownIdsRef.current.add(activeId);
    }
  }, [activeId]);

  const adopt = useCallback((id: string) => {
    if (activeIdRef.current === id) {
      return;
    }

    activeIdRef.current = id;
    knownIdsRef.current.add(id);
    setSeededId(id);
    setActiveId(id);
  }, []);

  const revalidate = useCallback(() => invalidateApiQueries(mutate, [CONVERSATIONS_PATH, CONVERSATION_PATH]).catch(() => undefined), [mutate]);

  // BACKEND GAP: the first FREE turn ended before `done`; the backend stored it, adopt the newest FREE one
  // only when it plausibly is that turn's conversation (created after the turn started, not one already known).
  const recoverCreated = useCallback((startedAt: number) => {
    const recovery = fetchLatestFreeConversation()
      .then((latest) => {
        const plausible = latest !== null
          && !knownIdsRef.current.has(latest.id)
          && Date.parse(latest.createdAt) >= startedAt - RECOVERY_CLOCK_SKEW_MS;

        if (latest && plausible && activeIdRef.current === null) {
          adopt(latest.id);
        }

        void revalidate();
      })
      .catch(() => undefined);

    recoveryRef.current = recovery;

    return recovery;
  }, [adopt, revalidate]);

  // Moves the finished turn into the history; a turn rejected before its stream started is dropped.
  const freezeTurn = useCallback(() => {
    const current = turnRef.current;

    if (!current || (current.phase === "error" && !current.streamStarted)) {
      return;
    }

    const frozen = turnMessages(current, textRef.current, true);

    setHistory((messages) => [...messages, ...frozen]);
  }, []);

  const runTurn = useCallback(async(userText: string) => {
    if (recoveryRef.current) {
      await recoveryRef.current;
    }

    keyRef.current += 1;

    const key = keyRef.current;
    const conversationId = activeIdRef.current;
    const startedAt = Date.now();
    const next: Turn = { key, userText, conversationId, phase: "streaming", streamStarted: false, done: null, error: null };
    const update = (patch: Partial<Turn>) => {
      setTurn((current) => (current?.key === key ? { ...current, ...patch } : current));
    };

    turnRef.current = next;
    streamingRef.current = true;
    stoppedRef.current = false;
    setTurn(next);

    const outcome = await startStream(conversationId
      ? sendConversationMessageRequest(conversationId, userText)
      : startFreeConversationRequest(userText));

    if (turnRef.current?.key !== key) {
      // The session was reset or moved to another conversation meanwhile.
      return;
    }

    streamingRef.current = false;

    if (outcome.status === "done") {
      update({ phase: "done", streamStarted: true, done: outcome.done });

      const createdId = outcome.done.conversationId ?? conversationId;

      if (createdId) {
        adopt(createdId);
      }

      await revalidate();

      return;
    }

    if (outcome.status === "error") {
      update({ phase: "error", streamStarted: outcome.streamStarted, error: classifyChatError(outcome.error) });

      if (conversationId === null && outcome.streamStarted) {
        await recoverCreated(startedAt);
      }

      return;
    }

    // Aborted by stop(): the backend stored the conversation once a frame was received (the shared hook
    // reports it, even for a delta still buffered for the next animation frame).
    update({ phase: "aborted", streamStarted: outcome.streamStarted });

    if (conversationId === null && stoppedRef.current && outcome.streamStarted) {
      await recoverCreated(startedAt);
    }
  }, [adopt, recoverCreated, revalidate, startStream]);

  const isLoading = activeId !== null && seededId !== activeId && !detail.notFound;

  const send = useCallback(async(text: string) => {
    const message = text.trim();

    if (message === "" || message.length > AI_CHAT_MESSAGE_MAX_LENGTH || streamingRef.current || isLoading) {
      return;
    }

    freezeTurn();
    await runTurn(message);
  }, [freezeTurn, isLoading, runTurn]);

  const stop = useCallback(() => {
    if (!streamingRef.current) {
      return;
    }

    stoppedRef.current = true;
    abortStream();
  }, [abortStream]);

  const canRetry = turn !== null && (turn.phase === "aborted" || (turn.phase === "error" && turn.error?.retryable === true));

  const retry = useCallback(async() => {
    const current = turnRef.current;

    if (!canRetry || !current || streamingRef.current) {
      return;
    }

    freezeTurn();
    await runTurn(current.userText);
  }, [canRetry, freezeTurn, runTurn]);

  const reset = useCallback(() => {
    clear(null);
  }, [clear]);

  const messages = useMemo(
    () => (turn ? [...history, ...turnMessages(turn, stream.text, false)] : history),
    [history, turn, stream.text],
  );
  const isStreaming = turn?.phase === "streaming";
  let status: ChatSessionStatus = "ready";

  if (activeId !== null && detail.notFound) {
    status = "not-found";
  } else if (isLoading && detail.error) {
    status = "load-error";
  } else if (isStreaming) {
    status = "streaming";
  } else if (isLoading) {
    status = "loading";
  }

  const summary = detail.conversation;
  const conversation = useMemo<ConversationSummary | null>(
    () => (summary
      ? { id: summary.id, title: summary.title, scope: summary.scope, refId: summary.refId, createdAt: summary.createdAt, updatedAt: summary.updatedAt }
      : null),
    [summary],
  );

  return {
    conversationId: activeId,
    conversation,
    messages,
    status,
    isStreaming,
    error: turn?.phase === "error" ? turn.error : null,
    loadError: detail.error,
    reload: detail.reload,
    canRetry,
    send,
    stop,
    retry,
    reset,
  };
}
