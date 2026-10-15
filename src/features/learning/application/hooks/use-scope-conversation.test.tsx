/*
* Funcionalidad: useScopeConversation tests
* Descripción: Tests of the scope conversation lookup against msw: the conversation found in the listing stays selected (id and messages) while the listing revalidates, and a definitive new listing result replaces it. Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.0 (L6 fix)
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
});
