/*
* Funcionalidad: useScopeConversation tests
* Descripción: Tests of the scope conversation lookup against msw: the conversation found in the listing stays selected (id and messages) while the listing revalidates, and a definitive new listing result replaces it. Depends on vitest, Testing Library, msw and the learning test helpers. v1.1 (L7 follow-up): discriminating case: the revalidated listing page 1 no longer contains the conversation and announces a second page (a non-definitive result); while page 2 is pending the conversation must stay selected (an implementation that derives the id from the latest listing data, stale or fresh, drops it to null here). v1.2 (C3 follow-up): the final wait is discriminating: a passive observer of the page-2 listing key (no fetch of its own) rendered in the same hook reports when the page-2 result has been applied, and only then the kept conversation is asserted.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { CONVERSATION_LOOKUP_LIMIT, CONVERSATIONS_PATH } from "../../api/services/tutor.service";
import { apiUrl, envelope, SessionWrapper } from "../pages/learning-test-helpers";
import { useScopeConversation } from "./use-scope-conversation";

const conversationDto = (id: string, refId: string) => ({
  id,
  scope: "LESSON",
  refId,
  title: `Conversación ${id}`,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
});

const pagination = { page: 1, pages: 1, limit: 100, total: 1, next: null, previous: null };
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

// Same SWR key as the lookup of listing page 2; it never fetches by itself, it only mirrors that cache entry
// in the same render as useScopeConversation, so `page2Applied` and the conversation come from one snapshot.
const PASSIVE_OBSERVER = {
  revalidateOnMount: false,
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

function useLessonLookupWithPage2Observer() {
  const conversation = useScopeConversation("LESSON", "l1");
  const page2 = useApiQuery(CONVERSATIONS_PATH, { query: { scope: "LESSON", page: 2, limit: CONVERSATION_LOOKUP_LIMIT } }, PASSIVE_OBSERVER);

  return { ...conversation, page2Applied: page2.data !== undefined && !page2.isValidating };
}

function Wrapper({ children }: { children: ReactNode }) {
  return <SessionWrapper role="STUDENT">{children}</SessionWrapper>;
}

describe("useScopeConversation", () => {
  it("keeps the found conversation while the listing revalidates", async() => {
    const gate: { release: (() => void) | null } = { release: null };
    let listCalls = 0;
    let listedIds = ["c-l1"];

    server.use(
      http.get(apiUrl("/api/tutor/conversations"), async() => {
        listCalls += 1;

        if (listCalls > 1) {
          await new Promise<void>((resolve) => {
            gate.release = resolve;
          });
        }

        return HttpResponse.json({ ...envelope(listedIds.map((id) => conversationDto(id, "l1"))), pagination });
      }),
      http.get(apiUrl("/api/tutor/conversations/:conversationId"), ({ params }) => HttpResponse.json(envelope({
        ...conversationDto(String(params.conversationId), "l1"),
        messages: [{ id: "u1", role: "USER", content: "Hola", isIncomplete: false, aiCallId: null, createdAt: "2026-10-14T00:00:00.000Z" }],
      }))),
    );

    const { result } = renderHook(() => useScopeConversation("LESSON", "l1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.conversationId).toBe("c-l1");

    let reload: Promise<void> = Promise.resolve();

    listedIds = ["c-l1b"];
    act(() => {
      reload = result.current.reload();
    });
    await waitFor(() => expect(gate.release).not.toBeNull());

    // Revalidating: the last resolved conversation stays selected.
    expect(result.current.conversationId).toBe("c-l1");
    expect(result.current.messages).toHaveLength(1);

    await act(async() => {
      gate.release?.();
      await reload;
    });

    await waitFor(() => expect(result.current.conversationId).toBe("c-l1b"));
  });

  it("keeps the conversation through a non-definitive revalidation until the definitive result", async() => {
    const gate: { release: (() => void) | null } = { release: null };
    let revalidating = false;
    const listRequests: string[] = [];

    server.use(
      http.get(apiUrl("/api/tutor/conversations"), async({ request }) => {
        const page = new URL(request.url).searchParams.get("page") ?? "1";

        listRequests.push(page);

        if (!revalidating) {
          return HttpResponse.json({ ...envelope([conversationDto("c-l1", "l1")]), pagination });
        }

        if (page === "1") {
          // Another conversation became more recent: page 1 no longer lists c-l1 and a page 2 exists.
          return HttpResponse.json({ ...envelope([conversationDto("c-other", "l2")]), pagination: { ...pagination, pages: 2, total: 2 } });
        }

        await new Promise<void>((resolve) => {
          gate.release = resolve;
        });

        return HttpResponse.json({ ...envelope([conversationDto("c-l1", "l1")]), pagination: { ...pagination, page: 2, pages: 2, total: 2 } });
      }),
      http.get(apiUrl("/api/tutor/conversations/:conversationId"), ({ params }) => HttpResponse.json(envelope({
        ...conversationDto(String(params.conversationId), "l1"),
        messages: [{ id: "u1", role: "USER", content: "Hola", isIncomplete: false, aiCallId: null, createdAt: "2026-10-14T00:00:00.000Z" }],
      }))),
    );

    const { result } = renderHook(useLessonLookupWithPage2Observer, { wrapper: Wrapper });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.conversationId).toBe("c-l1");
    expect(result.current.page2Applied).toBe(false);

    revalidating = true;
    act(() => {
      void result.current.reload();
    });

    // Page 1 answered without c-l1 and the lookup moved on to page 2, which is still pending.
    await waitFor(() => expect(gate.release).not.toBeNull());
    expect(listRequests).toEqual(["1", "1", "2"]);
    expect(result.current.conversationId).toBe("c-l1");
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.page2Applied).toBe(false);

    await act(async() => {
      gate.release?.();
    });

    // Discriminating wait: the page-2 result is in the cache and rendered before the assertions below.
    await waitFor(() => expect(result.current.page2Applied).toBe(true));
    expect(listRequests).toEqual(["1", "1", "2"]);
    expect(result.current.conversationId).toBe("c-l1");
    expect(result.current.messages).toHaveLength(1);
  });
});
