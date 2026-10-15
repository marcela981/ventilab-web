/*
* Funcionalidad: usePageEditor tests
* Descripción: Tests of the page editor hook against msw when the refresh after a save fails (GET /api/pages/{id} answers 500 after the first load, so the server blocks stay stale): a retry after a partial failure re-sends only what is still pending (no second POST of a created block, no second DELETE of a deleted one), and a successful save keeps the saved blocks with their new ids and nothing pending. Depends on vitest, Testing Library, msw, the content editor test helpers and usePageEditor.
* Versión: 1.0 (C4)
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
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiUrl, envelope, errorResponse, TestProviders } from "../pages/content-editor-test-helpers";
import type { PageSaveOutcome } from "./use-page-editor";
import { usePageEditor } from "./use-page-editor";

const DATE = "2026-10-01T00:00:00.000Z";
const server = setupServer();
let writes: string[] = [];
let failReorder = true;
let gets = 0;

function blockDto(id: string, order: number) {
  return {
    id,
    pageId: "p1",
    sectionId: null,
    type: "EQUATION",
    title: null,
    order,
    content: { latex: `x_${id}`, display: true },
    mediaId: null,
    mediaUrl: null,
    estimatedTime: null,
    isActive: true,
    createdAt: DATE,
    createdBy: null,
    updatedAt: DATE,
    updatedBy: null,
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  writes = [];
  failReorder = true;
  gets = 0;
  let nextId = 10;

  server.use(
    // Only the first load succeeds: every refresh fails, so the server blocks stay stale.
    http.get(apiUrl("/api/pages/p1"), () => {
      gets += 1;

      return gets === 1
        ? HttpResponse.json(envelope({ id: "p1", title: "Página", status: "DRAFT", sections: [blockDto("b1", 1), blockDto("b2", 2)] }))
        : errorResponse("internal_error", 500);
    }),
    http.get(apiUrl("/api/modules/:id/full"), () => errorResponse("internal_error", 500)),
    http.delete(apiUrl("/api/pages/p1/blocks/:blockId"), ({ params }) => {
      writes.push(`DELETE ${String(params.blockId)}`);

      return HttpResponse.json(envelope(null));
    }),
    http.put(apiUrl("/api/pages/p1/blocks/reorder"), async({ request }) => {
      const { ids } = await request.json() as { ids: string[] };

      writes.push(`REORDER ${ids.join(",")}`);

      return failReorder ? errorResponse("internal_error", 500) : HttpResponse.json(envelope(null));
    }),
    http.post(apiUrl("/api/pages/p1/blocks"), () => {
      const id = `b${nextId++}`;

      writes.push(`POST ${id}`);

      return HttpResponse.json(envelope({ id }), { status: 201 });
    }),
  );
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

async function renderEditor() {
  const rendered = renderHook(() => usePageEditor("p1"), { wrapper: Wrapper });

  await waitFor(() => expect(rendered.result.current.blocks).toHaveLength(2));

  return rendered;
}

async function save(result: { current: ReturnType<typeof usePageEditor> }): Promise<PageSaveOutcome> {
  let outcome: PageSaveOutcome = { status: "busy" };

  await act(async() => {
    outcome = await result.current.save();
  });

  return outcome;
}

// Draft: divider (new), b2 — b1 deleted. Plan: DELETE b1, POST divider, REORDER.
function editDraft(result: { current: ReturnType<typeof usePageEditor> }) {
  act(() => {
    result.current.remove("b1");
  });
  act(() => {
    result.current.add("DIVIDER");
  });
  act(() => {
    result.current.move(1, 0);
  });
}

describe("usePageEditor", () => {
  it("retries only the pending operations after a partial failure with a failing refresh", async() => {
    const { result } = await renderEditor();

    editDraft(result);

    expect((await save(result)).status).toBe("error");
    expect(writes).toEqual(["DELETE b1", "POST b10", "REORDER b10,b2"]);
    expect(result.current.dirty).toBe(true);

    failReorder = false;
    writes = [];

    expect((await save(result)).status).toBe("success");
    expect(writes).toEqual(["REORDER b10,b2"]);
    expect(result.current.dirty).toBe(false);
  });

  it("keeps the saved blocks with their ids when the refresh after a successful save fails", async() => {
    failReorder = false;
    const { result } = await renderEditor();

    editDraft(result);

    expect((await save(result)).status).toBe("success");
    expect(writes).toEqual(["DELETE b1", "POST b10", "REORDER b10,b2"]);
    expect(result.current.dirty).toBe(false);
    expect(result.current.blocks?.map((block) => block.id)).toEqual(["b10", "b2"]);

    writes = [];

    expect((await save(result)).status).toBe("success");
    expect(writes).toEqual([]);
  });
});
