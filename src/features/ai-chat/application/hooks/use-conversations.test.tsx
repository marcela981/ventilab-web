/*
* Funcionalidad: AI chat conversation hooks tests
* Descripción: Behaviour of the conversation listing, detail and actions against msw: server pagination and scope query params, the client-side title filter over the loaded page only (case and accent insensitive), rename (PATCH, title trimmed and collapsed, over-long titles rejected without a request) and delete (DELETE) revalidating the listing, and a 404 detail (`ai-tutor.conversation_not_found`) reported as not found. Depends on Testing Library, msw and the AI chat test helpers.
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
import { apiUrl, conversationDto, envelope, errorResponse, messageDto, SwrWrapper } from "./ai-chat-test-helpers";
import { useConversation } from "./use-conversation";
import { useConversationActions } from "./use-conversation-actions";
import { useConversationList } from "./use-conversation-list";

const LIST_URL = apiUrl("/api/tutor/conversations");
const DETAIL_URL = apiUrl("/api/tutor/conversations/:conversationId");
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

describe("useConversationList", () => {
  it("requests the page, limit and scope and exposes the server pagination", async() => {
    const queries: string[] = [];

    server.use(http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).search);

      return HttpResponse.json(envelope(
        [conversationDto("c1", { scope: "LESSON", refId: "l1" })],
        { page: 2, pages: 3, limit: 5, total: 11 },
      ));
    }));

    const { result } = renderHook(() => useConversationList({ scope: "LESSON", page: 2, limit: 5 }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(queries).toEqual(["?scope=LESSON&page=2&limit=5"]);
    expect(result.current.pagination).toEqual({ page: 2, pages: 3, limit: 5, total: 11 });
    expect(result.current.conversations[0]).toEqual({
      id: "c1",
      title: "Conversación c1",
      scope: "LESSON",
      refId: "l1",
      createdAt: "2026-10-15T10:00:00.000Z",
      updatedAt: "2026-10-15T10:05:00.000Z",
    });
  });

  it("omits the scope to list every scope and uses the default page size", async() => {
    const queries: string[] = [];

    server.use(http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).search);

      return HttpResponse.json(envelope([], { page: 1, pages: 0, limit: 20, total: 0 }));
    }));

    const { result } = renderHook(() => useConversationList({}), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(queries).toEqual(["?page=1&limit=20"]);
    expect(result.current.conversations).toEqual([]);
  });

  it("filters the loaded page by title on the client, ignoring case and accents", async() => {
    let requests = 0;

    server.use(http.get(LIST_URL, () => {
      requests += 1;

      return HttpResponse.json(envelope([
        conversationDto("c1", { title: "Ventilación protectora" }),
        conversationDto("c2", { title: "PEEP en SDRA" }),
        conversationDto("c3", { title: "Destete de la VENTILACION" }),
      ], { page: 1, pages: 1, limit: 20, total: 3 }));
    }));

    const { result, rerender } = renderHook(
      ({ titleFilter }: { titleFilter: string }) => useConversationList({ titleFilter }),
      { wrapper: SwrWrapper, initialProps: { titleFilter: "" } },
    );

    await waitFor(() => expect(result.current.conversations).toHaveLength(3));
    expect(result.current.isFiltered).toBe(false);

    rerender({ titleFilter: "  ventilacion " });

    expect(result.current.conversations.map((conversation) => conversation.id)).toEqual(["c1", "c3"]);
    expect(result.current.isFiltered).toBe(true);
    expect(result.current.loadedCount).toBe(3);
    // The filter never queries the backend.
    expect(requests).toBe(1);
  });
});

describe("useConversationActions", () => {
  it("renames with a normalized title and revalidates the listing", async() => {
    let listCalls = 0;
    const patches: unknown[] = [];

    server.use(
      http.get(LIST_URL, () => {
        listCalls += 1;

        return HttpResponse.json(envelope([conversationDto("c1")], { page: 1, pages: 1, limit: 20, total: 1 }));
      }),
      http.patch(DETAIL_URL, async({ params, request }) => {
        patches.push([params.conversationId, await request.json()]);

        return HttpResponse.json(envelope(null));
      }),
    );

    const { result } = renderHook(() => ({ list: useConversationList({}), actions: useConversationActions() }), { wrapper: SwrWrapper });

    await waitFor(() => expect(listCalls).toBe(1));

    let outcome: unknown;

    await act(async() => {
      outcome = await result.current.actions.rename("c1", "  Ventilación   protectora ");
    });

    expect(outcome).toEqual({ status: "success" });
    expect(patches).toEqual([["c1", { title: "Ventilación protectora" }]]);
    await waitFor(() => expect(listCalls).toBe(2));
  });

  it("rejects an empty or over-long title without a request", async() => {
    const { result } = renderHook(() => useConversationActions(), { wrapper: SwrWrapper });
    let empty: unknown;
    let long: unknown;

    await act(async() => {
      empty = await result.current.rename("c1", "   ");
      long = await result.current.rename("c1", "x".repeat(121));
    });

    expect(empty).toMatchObject({ status: "invalid" });
    expect(long).toMatchObject({ status: "invalid" });
  });

  it("deletes and revalidates the listing", async() => {
    let listCalls = 0;
    const deleted: string[] = [];

    server.use(
      http.get(LIST_URL, () => {
        listCalls += 1;

        return HttpResponse.json(envelope(listCalls === 1 ? [conversationDto("c1")] : [], { page: 1, pages: 1, limit: 20, total: 1 }));
      }),
      http.delete(DETAIL_URL, ({ params }) => {
        deleted.push(String(params.conversationId));

        return HttpResponse.json(envelope(null));
      }),
    );

    const { result } = renderHook(() => ({ list: useConversationList({}), actions: useConversationActions() }), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.list.conversations).toHaveLength(1));

    await act(async() => {
      await result.current.actions.remove("c1");
    });

    expect(deleted).toEqual(["c1"]);
    await waitFor(() => expect(result.current.list.conversations).toHaveLength(0));
  });

  it("returns an error message when the backend rejects the action", async() => {
    server.use(http.delete(DETAIL_URL, () => errorResponse("ai-tutor.conversation_not_found", 404)));

    const { result } = renderHook(() => useConversationActions(), { wrapper: SwrWrapper });
    let outcome: unknown;

    await act(async() => {
      outcome = await result.current.remove("ghost");
    });

    expect(outcome).toEqual({ status: "error", message: "La conversación no existe o ya no está disponible." });
  });
});

describe("useConversation", () => {
  it("maps the detail with its messages", async() => {
    server.use(http.get(DETAIL_URL, ({ params }) => HttpResponse.json(envelope({
      ...conversationDto(String(params.conversationId), { scope: "MODULE", refId: "m1" }),
      messages: [messageDto("u1", "USER", "Hola"), messageDto("a1", "ASSISTANT", "Hola", { isIncomplete: true })],
    }))));

    const { result } = renderHook(() => useConversation("c1"), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.conversation).not.toBeNull());
    expect(result.current.notFound).toBe(false);
    expect(result.current.conversation).toMatchObject({ id: "c1", scope: "MODULE", refId: "m1" });
    expect(result.current.conversation?.messages[1]).toMatchObject({ role: "assistant", status: "interrupted", messageId: "a1" });
  });

  it("reports a 404 as not found", async() => {
    server.use(http.get(DETAIL_URL, () => errorResponse("ai-tutor.conversation_not_found", 404)));

    const { result } = renderHook(() => useConversation("ghost"), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.conversation).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("does not fetch without an id", () => {
    const { result } = renderHook(() => useConversation(null), { wrapper: SwrWrapper });

    expect(result.current).toMatchObject({ conversation: null, isLoading: false, notFound: false });
  });
});
