/*
* Funcionalidad: useChatSession tests
* Descripción: Behaviour of the AI chat state machine against msw with real SSE bodies: the FREE conversation is created lazily by the first send (POST /api/tutor/conversations, never on mount), the answer streams and `done` adopts conversationId, aiCallId, messageId and sources and revalidates the listing; later sends go to /{id}/messages; stop keeps the partial text as interrupted; retry resends the last user message; the fixed off-topic reply is flagged; a 429 quota error shows the local reset time and cannot be retried; a mid-stream error can be retried; a first FREE turn stopped before `done` re-reads the newest FREE conversation to adopt it; an existing conversation seeds the thread from its detail; moving the page to the adopted id keeps the thread and opening another conversation resets it. Depends on Testing Library, msw, the shared SSE test helpers and the AI chat test helpers.
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
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse } from "@shared/ai-conversation/application/sse-test-helpers";
import { OFF_TOPIC_REPLY } from "../config/ai-chat.config";
import { apiUrl, conversationDto, envelope, errorResponse, messageDto, SwrWrapper } from "./ai-chat-test-helpers";
import { useChatSession } from "./use-chat-session";
import { useConversationList } from "./use-conversation-list";

const LIST_URL = apiUrl("/api/tutor/conversations");
const DETAIL_URL = apiUrl("/api/tutor/conversations/:conversationId");
const MESSAGES_URL = apiUrl("/api/tutor/conversations/:conversationId/messages");
const PAGINATION = { page: 1, pages: 1, limit: 20, total: 1 };
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

function detailHandler(messages = [messageDto("u1", "USER", "Hola"), messageDto("a1", "ASSISTANT", "Hola, ¿en qué te ayudo?")]) {
  return http.get(DETAIL_URL, ({ params }) => HttpResponse.json(envelope({ ...conversationDto(String(params.conversationId)), messages })));
}

// Session plus a mounted listing, to observe the listing revalidation after `done`.
function useSessionWithList(conversationId?: string) {
  return { session: useChatSession({ conversationId }), list: useConversationList({ scope: "FREE" }) };
}

describe("useChatSession", () => {
  it("creates the FREE conversation lazily on the first send, streams it and adopts the done metadata", async() => {
    const bodies: unknown[] = [];
    let listCalls = 0;

    server.use(
      http.get(LIST_URL, () => {
        listCalls += 1;

        return HttpResponse.json(envelope([], PAGINATION));
      }),
      http.post(LIST_URL, async({ request }) => {
        bodies.push(await request.json());

        return sseResponse([
          deltaFrame("La PEEP "),
          deltaFrame("es la presión positiva al final de la espiración."),
          doneFrame({ aiCallId: "call-1", messageId: "m-1", conversationId: "c-new", sources: [{ title: "Guía", url: "https://example.org" }] }),
        ]);
      }),
      detailHandler([]),
    );

    const { result } = renderHook(() => useSessionWithList(), { wrapper: SwrWrapper });

    await waitFor(() => expect(listCalls).toBe(1));
    // Nothing is created on mount.
    expect(bodies).toHaveLength(0);
    expect(result.current.session.conversationId).toBeNull();
    expect(result.current.session.messages).toEqual([]);

    await act(async() => {
      await result.current.session.send("  ¿Qué es la PEEP?  ");
    });

    expect(bodies).toEqual([{ scope: "FREE", message: "¿Qué es la PEEP?" }]);
    expect(result.current.session.conversationId).toBe("c-new");
    await waitFor(() => expect(listCalls).toBe(2));

    const [user, assistant] = result.current.session.messages;

    expect(user).toMatchObject({ role: "user", content: "¿Qué es la PEEP?", status: "complete" });
    expect(assistant).toMatchObject({
      role: "assistant",
      content: "La PEEP es la presión positiva al final de la espiración.",
      status: "complete",
      kind: "answer",
      aiCallId: "call-1",
      messageId: "m-1",
      sources: [{ title: "Guía", url: "https://example.org" }],
    });
    expect(result.current.session.isStreaming).toBe(false);
    expect(result.current.session.error).toBeNull();
  });

  it("sends the next messages to the adopted conversation", async() => {
    const paths: string[] = [];

    server.use(
      http.post(LIST_URL, () => sseResponse([deltaFrame("Uno"), doneFrame({ aiCallId: "call-1", messageId: "m-1", conversationId: "c-new" })])),
      http.post(MESSAGES_URL, async({ params, request }) => {
        paths.push(String(params.conversationId));
        expect(await request.json()).toEqual({ message: "Segunda" });

        return sseResponse([deltaFrame("Dos"), doneFrame({ aiCallId: "call-2", messageId: "m-2", conversationId: "c-new" })]);
      }),
      detailHandler([]),
    );

    const { result } = renderHook(() => useChatSession({}), { wrapper: SwrWrapper });

    await act(async() => {
      await result.current.send("Primera");
    });
    await act(async() => {
      await result.current.send("Segunda");
    });

    expect(paths).toEqual(["c-new"]);
    expect(result.current.messages.map((message) => message.content)).toEqual(["Primera", "Uno", "Segunda", "Dos"]);
    expect(result.current.messages[3]).toMatchObject({ messageId: "m-2", aiCallId: "call-2" });
  });

  it("seeds the thread of an existing conversation and flags a stored off-topic reply", async() => {
    server.use(detailHandler([
      messageDto("u1", "USER", "¿Quién ganó el partido?"),
      messageDto("a1", "ASSISTANT", OFF_TOPIC_REPLY),
      messageDto("u2", "USER", "¿Qué es la PEEP?"),
      messageDto("a2", "ASSISTANT", "Parcial", { isIncomplete: true }),
    ]));

    const { result } = renderHook(() => useChatSession({ conversationId: "c1" }), { wrapper: SwrWrapper });

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(result.current.status).toBe("ready");
    expect(result.current.conversation).toMatchObject({ id: "c1", scope: "FREE" });
    expect(result.current.messages[1]).toMatchObject({ kind: "off-topic", messageId: "a1", aiCallId: "call-a1" });
    expect(result.current.messages[3]).toMatchObject({ status: "interrupted", content: "Parcial" });
  });

  it("reports a missing conversation as not-found", async() => {
    server.use(http.get(DETAIL_URL, () => errorResponse("ai-tutor.conversation_not_found", 404)));

    const { result } = renderHook(() => useChatSession({ conversationId: "ghost" }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.status).toBe("not-found"));
  });

  it("stop keeps the partial answer and marks it interrupted", async() => {
    const stream = controlledStream();

    server.use(detailHandler([]), http.post(MESSAGES_URL, () => stream.response()));

    const { result } = renderHook(() => useChatSession({ conversationId: "c1" }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));

    let sending: Promise<void> = Promise.resolve();

    act(() => {
      sending = result.current.send("¿Qué es el volumen tidal?");
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(true));
    stream.push(deltaFrame("El volumen tidal es"));
    await waitFor(() => expect(result.current.messages[1]?.content).toBe("El volumen tidal es"));
    expect(result.current.messages[1]?.status).toBe("streaming");

    await act(async() => {
      result.current.stop();
      // msw does not cancel the body read on abort: closing it lets the aborted read loop end.
      stream.close();
      await sending;
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages[1]).toMatchObject({ content: "El volumen tidal es", status: "interrupted" });
    expect(result.current.canRetry).toBe(true);
    expect(result.current.conversationId).toBe("c1");
  });

  it("flags the fixed off-topic reply of a completed answer", async() => {
    server.use(
      detailHandler([]),
      http.post(MESSAGES_URL, () => sseResponse([deltaFrame(OFF_TOPIC_REPLY), doneFrame({ aiCallId: "call-x", messageId: "m-x", conversationId: "c1" })])),
    );

    const { result } = renderHook(() => useChatSession({ conversationId: "c1" }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async() => {
      await result.current.send("¿Quién ganó el partido?");
    });

    expect(result.current.messages[1]).toMatchObject({ kind: "off-topic", status: "complete", messageId: "m-x" });
  });

  it("reports the daily quota with the local reset time and does not offer a retry", async() => {
    server.use(
      detailHandler([]),
      http.post(MESSAGES_URL, () => errorResponse("ai.quota_exceeded", 429, { "Retry-After": "3600" })),
    );

    const { result } = renderHook(() => useChatSession({ conversationId: "c1" }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async() => {
      await result.current.send("¿Qué es la PEEP?");
    });

    expect(result.current.error).toMatchObject({ kind: "quota", retryable: false, retryAfterSeconds: 3600 });
    expect(result.current.error?.message).toMatch(/Podrás usarlo de nuevo a las \d{2}:\d{2}/);
    expect(result.current.canRetry).toBe(false);
  });

  it("retries the last user message after the provider was unavailable, without duplicating it", async() => {
    let calls = 0;

    server.use(
      detailHandler([]),
      http.post(MESSAGES_URL, async({ request }) => {
        calls += 1;
        expect(await request.json()).toEqual({ message: "¿Qué es la PEEP?" });

        return calls === 1
          ? errorResponse("ai.providers_unavailable", 503)
          : sseResponse([deltaFrame("Respuesta"), doneFrame({ aiCallId: "call-2", messageId: "m-2", conversationId: "c1" })]);
      }),
    );

    const { result } = renderHook(() => useChatSession({ conversationId: "c1" }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async() => {
      await result.current.send("¿Qué es la PEEP?");
    });

    expect(result.current.error).toMatchObject({ kind: "unavailable", retryable: true });
    expect(result.current.canRetry).toBe(true);

    await act(async() => {
      await result.current.retry();
    });

    expect(calls).toBe(2);
    expect(result.current.error).toBeNull();
    expect(result.current.messages.map((message) => [message.role, message.content])).toEqual([
      ["user", "¿Qué es la PEEP?"],
      ["assistant", "Respuesta"],
    ]);
  });

  it("keeps a mid-stream failure as an interrupted answer and retries the same message", async() => {
    let calls = 0;

    server.use(
      detailHandler([]),
      http.post(MESSAGES_URL, () => {
        calls += 1;

        return calls === 1
          ? sseResponse([deltaFrame("Parcial"), errorFrame("ai.stream_interrupted", "lost")])
          : sseResponse([deltaFrame("Completa"), doneFrame({ aiCallId: "call-2", messageId: "m-2", conversationId: "c1" })]);
      }),
    );

    const { result } = renderHook(() => useChatSession({ conversationId: "c1" }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async() => {
      await result.current.send("Pregunta");
    });

    expect(result.current.error).toMatchObject({ kind: "interrupted", retryable: true });
    expect(result.current.messages[1]).toMatchObject({ content: "Parcial", status: "error" });

    await act(async() => {
      await result.current.retry();
    });

    expect(result.current.messages.map((message) => [message.role, message.content, message.status])).toEqual([
      ["user", "Pregunta", "complete"],
      ["assistant", "Parcial", "interrupted"],
      ["user", "Pregunta", "complete"],
      ["assistant", "Completa", "complete"],
    ]);
  });

  it("re-reads the newest FREE conversation when the first turn is stopped before done", async() => {
    const stream = controlledStream();
    const listQueries: string[] = [];

    server.use(
      http.post(LIST_URL, () => stream.response()),
      http.get(LIST_URL, ({ request }) => {
        listQueries.push(new URL(request.url).search);

        return HttpResponse.json(envelope([conversationDto("c-created")], PAGINATION));
      }),
      detailHandler([]),
    );

    const { result } = renderHook(() => useChatSession({}), { wrapper: SwrWrapper });
    let sending: Promise<void> = Promise.resolve();

    act(() => {
      sending = result.current.send("Primera pregunta");
    });
    stream.push(deltaFrame("Empieza"));
    await waitFor(() => expect(result.current.messages[1]?.content).toBe("Empieza"));

    await act(async() => {
      result.current.stop();
      // msw does not cancel the body read on abort: closing it lets the aborted read loop end.
      stream.close();
      await sending;
    });

    await waitFor(() => expect(result.current.conversationId).toBe("c-created"));
    expect(listQueries).toEqual(["?scope=FREE&page=1&limit=1"]);
    expect(result.current.messages[1]).toMatchObject({ content: "Empieza", status: "interrupted" });
  });

  it("does not adopt any conversation when the first turn is stopped before any frame", async() => {
    const stream = controlledStream();

    server.use(http.post(LIST_URL, () => stream.response()));

    const { result } = renderHook(() => useChatSession({}), { wrapper: SwrWrapper });
    let sending: Promise<void> = Promise.resolve();

    act(() => {
      sending = result.current.send("Primera pregunta");
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(true));

    await act(async() => {
      result.current.stop();
      // msw does not cancel the body read on abort: closing it lets the aborted read loop end.
      stream.close();
      await sending;
    });

    // No GET handler: a re-read would fail the test (onUnhandledRequest: "error").
    expect(result.current.conversationId).toBeNull();
    expect(result.current.messages[1]).toMatchObject({ status: "interrupted", content: "" });
  });

  it("keeps the thread when the page moves to the adopted id and resets on another conversation", async() => {
    server.use(
      http.post(LIST_URL, () => sseResponse([deltaFrame("Uno"), doneFrame({ aiCallId: "call-1", messageId: "m-1", conversationId: "c-new" })])),
      http.get(DETAIL_URL, ({ params }) => HttpResponse.json(envelope({
        ...conversationDto(String(params.conversationId)),
        messages: params.conversationId === "c2" ? [messageDto("u9", "USER", "Otra conversación")] : [],
      }))),
    );

    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useChatSession({ conversationId: id }),
      { wrapper: SwrWrapper, initialProps: { id: undefined as string | undefined } },
    );

    await act(async() => {
      await result.current.send("Primera");
    });

    // The page replaces the URL with the adopted conversation: nothing is reloaded or lost.
    rerender({ id: "c-new" });
    expect(result.current.messages.map((message) => message.content)).toEqual(["Primera", "Uno"]);

    rerender({ id: "c2" });
    await waitFor(() => expect(result.current.messages.map((message) => message.content)).toEqual(["Otra conversación"]));
    expect(result.current.conversationId).toBe("c2");
  });

  it("ignores empty messages and messages over the limit", async() => {
    const { result } = renderHook(() => useChatSession({}), { wrapper: SwrWrapper });

    await act(async() => {
      await result.current.send("   ");
      await result.current.send("x".repeat(4001));
    });

    expect(result.current.messages).toEqual([]);
  });
});
