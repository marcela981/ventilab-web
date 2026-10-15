/*
* Funcionalidad: Page editor page tests
* Descripción: Integration tests of PageEditorPage with msw over a mutable in-memory page: loads the blocks in order with the saved status, an equation edit marks "Cambios sin guardar" (beforeunload prevented, router guard registered and cancelling when the user stays) and saves only that block's content, add/duplicate/delete (with confirmation)/move are saved as DELETE, POST and one reorder with every id, the lazy Tiptap editor opens for a new text block, an invalid video URL blocks saving, and a failed save keeps the changes with the mapped error. Depends on vitest, Testing Library, msw, the content editor test helpers and the page editor page.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageBlockDTO } from "../../api/dtos/content-editor.dto";
import { apiUrl, envelope, errorResponse, renderWithSession } from "./content-editor-test-helpers";
import { PageEditorPage } from "./page-editor.page";

type Recorded = { method: string, path: string, body: unknown };
type RouteHandler = (url: string) => void;

const router = vi.hoisted(() => ({
  asPath: "/content/pages/p1",
  handlers: new Map<string, (url: string) => void>(),
  events: {
    on: (event: string, handler: (url: string) => void) => router.handlers.set(event, handler),
    off: (event: string) => router.handlers.delete(event),
    emit: () => undefined,
  },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

// Generous waits: lazy chunks (Tiptap, KaTeX) and a slow machine.
const LOAD = { timeout: 10_000 };
const DATE = "2026-10-01T00:00:00.000Z";
const server = setupServer();
let requests: Recorded[] = [];
let stored: PageBlockDTO[] = [];
let nextId = 10;

function blockDto(id: string, order: number, type: string, content: Record<string, unknown>, title: string | null = null): PageBlockDTO {
  return {
    id,
    pageId: "p1",
    sectionId: null,
    type,
    title,
    order,
    content: content as PageBlockDTO["content"],
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

function pageDto() {
  return {
    id: "p1",
    title: "Presiones en la vía aérea",
    status: "DRAFT",
    // Deliberately out of order: the editor sorts by `order`.
    sections: [...stored].reverse(),
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    const entry: Recorded = { method: request.method, path: url.pathname, body: null };

    requests.push(entry);

    if (request.method !== "GET" && request.method !== "DELETE") {
      void request.clone().json().then((body: unknown) => {
        entry.body = body;
      }, () => undefined);
    }
  });
});

beforeEach(() => {
  requests = [];
  nextId = 10;
  stored = [
    blockDto("b1", 1, "TEXT", { markdown: "La **presión** de la vía aérea." }, "Definición"),
    blockDto("b2", 2, "EQUATION", { latex: "P = F", display: true }),
    blockDto("b3", 3, "VIDEO", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
  ];
  router.handlers.clear();

  server.use(
    http.get(apiUrl("/api/pages/p1"), () => HttpResponse.json(envelope(pageDto()))),
    http.put(apiUrl("/api/pages/p1/blocks/reorder"), async({ request }) => {
      const { ids } = await request.json() as { ids: string[] };

      stored = ids.map((id, index) => ({ ...(stored.find((block) => block.id === id) as PageBlockDTO), order: index + 1 }));

      return HttpResponse.json(envelope(null));
    }),
    http.put(apiUrl("/api/pages/p1/blocks/:blockId"), async({ request, params }) => {
      const body = await request.json() as Partial<PageBlockDTO>;

      stored = stored.map((block) => (block.id === params.blockId ? { ...block, ...body } : block));

      return HttpResponse.json(envelope(null));
    }),
    http.post(apiUrl("/api/pages/p1/blocks"), async({ request }) => {
      const body = await request.json() as { type: string, content: Record<string, unknown>, title?: string };
      const id = `b${nextId++}`;

      stored = [...stored, blockDto(id, stored.length + 1, body.type, body.content, body.title ?? null)];

      return HttpResponse.json(envelope({ id }), { status: 201 });
    }),
    http.delete(apiUrl("/api/pages/p1/blocks/:blockId"), ({ params }) => {
      stored = stored.filter((block) => block.id !== params.blockId);

      return HttpResponse.json(envelope(null));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

const writes = () => requests.filter((request) => request.method !== "GET").map(({ method, path, body }) => ({ method, path, body }));
const saveButton = () => screen.getByRole("button", { name: "Guardar cambios" });

async function renderEditor() {
  renderWithSession(<PageEditorPage pageId="p1" />);
  await screen.findByRole("heading", { name: "Presiones en la vía aérea" }, LOAD);
}

describe("PageEditorPage", { timeout: 30_000 }, () => {
  it("lists the blocks in order with everything saved", async() => {
    await renderEditor();

    const items = screen.getAllByRole("listitem").filter((item) => item.getAttribute("aria-label")?.startsWith("bloque"));

    expect(items.map((item) => item.getAttribute("aria-label"))).toEqual(["bloque 1 (Texto)", "bloque 2 (Ecuación)", "bloque 3 (Video)"]);
    expect(screen.getAllByLabelText("Título del bloque (opcional)")[0]).toHaveValue("Definición");
    expect(screen.getByText("Todos los cambios están guardados")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("marks unsaved changes, guards leaving and saves only the edited block", async() => {
    await renderEditor();

    fireEvent.change(screen.getByLabelText("Ecuación (LaTeX)"), { target: { value: "P = F \\cdot R" } });

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();

    const unload = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    const onRouteChange = router.handlers.get("routeChangeStart") as RouteHandler;

    vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(() => onRouteChange("/content")).toThrow();

    fireEvent.click(saveButton());

    await screen.findByText("Página guardada.", {}, LOAD);
    expect(writes()).toEqual([{ method: "PUT", path: "/api/pages/p1/blocks/b2", body: { content: { latex: "P = F \\cdot R", display: true } } }]);
    await waitFor(() => expect(screen.getByText("Todos los cambios están guardados")).toBeInTheDocument(), LOAD);
    expect(router.handlers.has("routeChangeStart")).toBe(false);
  });

  it("saves added, duplicated, deleted and moved blocks with one reorder", async() => {
    await renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Agregar bloque" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Separador" }));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument(), LOAD);
    fireEvent.click(screen.getByRole("button", { name: "Duplicar bloque 2 (Ecuación)" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar bloque 1 (Texto)" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), LOAD);
    fireEvent.click(screen.getByRole("button", { name: "Bajar bloque 1 (Ecuación)" }));

    // Draft: b2 copy, b2, b3, divider.
    fireEvent.click(saveButton());

    await screen.findByText("Página guardada.", {}, LOAD);
    expect(writes()).toEqual([
      { method: "DELETE", path: "/api/pages/p1/blocks/b1", body: null },
      { method: "POST", path: "/api/pages/p1/blocks", body: { type: "EQUATION", content: { latex: "P = F", display: true } } },
      { method: "POST", path: "/api/pages/p1/blocks", body: { type: "DIVIDER", content: {} } },
      { method: "PUT", path: "/api/pages/p1/blocks/reorder", body: { ids: ["b10", "b2", "b3", "b11"] } },
    ]);
    await waitFor(() => expect(screen.getByText("Todos los cambios están guardados")).toBeInTheDocument(), LOAD);
  });

  it("opens the lazy rich text editor for a new text block", async() => {
    await renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Agregar bloque" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Texto" }));

    const editor = await screen.findByRole("textbox", { name: "Texto del bloque" }, LOAD);

    expect(editor).toHaveAttribute("contenteditable", "true");
    expect(screen.getByRole("toolbar", { name: "Formato: Texto del bloque" })).toBeInTheDocument();
  });

  it("blocks saving while a video link is not YouTube or Vimeo", async() => {
    await renderEditor();

    fireEvent.change(screen.getByLabelText("Enlace de YouTube o Vimeo"), { target: { value: "https://example.com/v.mp4" } });

    expect(screen.getByText("Solo se admiten enlaces de YouTube o Vimeo.")).toBeInTheDocument();
    expect(screen.getByText("Revisa el bloque 3 antes de guardar.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("keeps the changes and shows the mapped error when the save fails", async() => {
    server.use(http.put(apiUrl("/api/pages/p1/blocks/:blockId"), () => errorResponse("pages.invalid_page_block", 400)));
    await renderEditor();

    fireEvent.change(screen.getByLabelText("Ecuación (LaTeX)"), { target: { value: "\\frac{1}{2}" } });
    fireEvent.click(saveButton());

    expect(await screen.findByRole("alert", {}, LOAD)).toHaveTextContent("Uno de los bloques no tiene un contenido válido.");
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    expect(screen.getByLabelText("Ecuación (LaTeX)")).toHaveValue("\\frac{1}{2}");
  });
});
