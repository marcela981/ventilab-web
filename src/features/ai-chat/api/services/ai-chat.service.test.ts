/*
* Funcionalidad: AI chat service tests
* Descripción: The stream requests of the AI chat ({path, body} for the shared SSE helper: FREE conversation start with the first message, follow-up message of a conversation) and the reads/writes against msw: the listing query (page, limit, optional scope), the newest FREE conversation lookup, rename and delete. Depends on vitest, msw and the AI chat test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiUrl, conversationDto, envelope } from "../../application/hooks/ai-chat-test-helpers";
import {
  conversationListQuery,
  deleteConversation,
  fetchLatestFreeConversation,
  renameConversation,
  sendConversationMessageRequest,
  startFreeConversationRequest,
} from "./ai-chat.service";

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

describe("ai-chat service", () => {
  it("builds the FREE start and the follow-up stream requests", () => {
    expect(startFreeConversationRequest("Hola")).toEqual({ path: "/api/tutor/conversations", body: { scope: "FREE", message: "Hola" } });
    expect(sendConversationMessageRequest("c/1", "Otra")).toEqual({ path: "/api/tutor/conversations/c%2F1/messages", body: { message: "Otra" } });
  });

  it("builds the listing query with an optional scope", () => {
    expect(conversationListQuery({ page: 2, limit: 5 })).toEqual({ page: 2, limit: 5 });
    expect(conversationListQuery({ scope: "PAGE", page: 1, limit: 20 })).toEqual({ scope: "PAGE", page: 1, limit: 20 });
  });

  it("reads the newest FREE conversation", async() => {
    const queries: string[] = [];

    server.use(http.get(apiUrl("/api/tutor/conversations"), ({ request }) => {
      queries.push(new URL(request.url).search);

      return HttpResponse.json(envelope([conversationDto("c9")], { page: 1, pages: 1, limit: 1, total: 1 }));
    }));

    await expect(fetchLatestFreeConversation()).resolves.toMatchObject({ id: "c9", scope: "FREE" });
    expect(queries).toEqual(["?scope=FREE&page=1&limit=1"]);
  });

  it("returns null when there is no FREE conversation", async() => {
    server.use(http.get(apiUrl("/api/tutor/conversations"), () => HttpResponse.json(envelope([], { page: 1, pages: 0, limit: 1, total: 0 }))));

    await expect(fetchLatestFreeConversation()).resolves.toBeNull();
  });

  it("renames and deletes a conversation", async() => {
    const calls: unknown[] = [];

    server.use(
      http.patch(apiUrl("/api/tutor/conversations/:id"), async({ params, request }) => {
        calls.push(["PATCH", params.id, await request.json()]);

        return HttpResponse.json(envelope(null));
      }),
      http.delete(apiUrl("/api/tutor/conversations/:id"), ({ params }) => {
        calls.push(["DELETE", params.id]);

        return HttpResponse.json(envelope(null));
      }),
    );

    await renameConversation("c1", "Nuevo");
    await deleteConversation("c1");

    expect(calls).toEqual([["PATCH", "c1", { title: "Nuevo" }], ["DELETE", "c1"]]);
  });
});
