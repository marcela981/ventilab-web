/*
* Funcionalidad: useSiblingReorder tests
* Descripción: Tests of the optimistic reorder against msw (the drag and drop handler is bypassed by calling reorder directly): the new order shows at once while the request is pending, a success sends the whole sibling list in the per-parent body ({lessonId, ids}) and then drops the override, a failure reverts to the server order and returns the Spanish message, and a drop on the same index sends nothing. Depends on vitest, Testing Library, msw and the content editor test helpers.
* Versión: 1.0 (C2)
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
import type { SiblingGroup } from "../entities/content-node.entity";
import { apiUrl, envelope, errorResponse, TestProviders } from "../pages/content-editor-test-helpers";
import type { ReorderOutcome } from "./use-sibling-reorder";
import { useSiblingReorder } from "./use-sibling-reorder";

const server = setupServer();
const GROUP: SiblingGroup = { kind: "pages", lessonId: "l1" };

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
  return <TestProviders>{children}</TestProviders>;
}

describe("useSiblingReorder", () => {
  it("shows the new order at once and sends the whole sibling list", async() => {
    const gate: { release: (() => void) | null } = { release: null };
    const bodies: unknown[] = [];

    server.use(http.put(apiUrl("/api/pages/reorder"), async({ request }) => {
      bodies.push(await request.json());
      await new Promise<void>((resolve) => {
        gate.release = resolve;
      });

      return HttpResponse.json(envelope(null));
    }));

    const { result } = renderHook(() => useSiblingReorder(), { wrapper: Wrapper });
    let outcome: Promise<ReorderOutcome> = Promise.resolve({ status: "unchanged" });

    act(() => {
      outcome = result.current.reorder(GROUP, ["p1", "p2", "p3"], 0, 2);
    });

    expect(result.current.orderOf(GROUP)).toEqual(["p2", "p3", "p1"]);
    await waitFor(() => expect(gate.release).not.toBeNull());
    expect(bodies).toEqual([{ lessonId: "l1", ids: ["p2", "p3", "p1"] }]);

    await act(async() => {
      gate.release?.();
      expect(await outcome).toEqual({ status: "success" });
    });
    expect(result.current.orderOf(GROUP)).toBeUndefined();
  });

  it("reverts the order and reports the error when the request fails", async() => {
    server.use(http.put(apiUrl("/api/pages/reorder"), () => errorResponse("pages.invalid_page_reorder", 400)));

    const { result } = renderHook(() => useSiblingReorder(), { wrapper: Wrapper });
    let outcome: ReorderOutcome = { status: "unchanged" };

    await act(async() => {
      outcome = await result.current.reorder(GROUP, ["p1", "p2"], 1, 0);
    });

    expect(outcome).toEqual({ status: "error", message: expect.stringMatching(/orden/) as unknown as string });
    expect(result.current.orderOf(GROUP)).toBeUndefined();
  });

  it("sends nothing when the item is dropped on its own place", async() => {
    const { result } = renderHook(() => useSiblingReorder(), { wrapper: Wrapper });

    await act(async() => {
      expect(await result.current.reorder(GROUP, ["p1", "p2"], 1, 1)).toEqual({ status: "unchanged" });
    });
    expect(result.current.orderOf(GROUP)).toBeUndefined();
  });
});
