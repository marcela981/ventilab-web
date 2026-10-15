/*
* Funcionalidad: ModulePrintPage tests
* Descripción: Integration tests of the module print view against msw: exactly one backend request (GET /api/modules/{id}/full, counted over every request), the cover with title, description and lesson count, lessons in `order` each starting a printed page (break class), their Pages and blocks in order with ContentBlocks in print mode (a video becomes a visible link with its URL), unassigned Pages at the end, "Descargar PDF" calling window.print, the 404 not-found state and the error state with retry. Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.0 (L7)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { apiUrl, envelope, errorResponse, renderWithSession } from "./learning-test-helpers";
import { ModulePrintPage } from "./module-print.page";

const tiptap = (text: string) => ({ doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] } });

const blockDto = (id: string, order: number, type: string, content: unknown) => ({
  id,
  order,
  type,
  title: null,
  content,
  estimatedTime: null,
  mediaId: null,
  mediaUrl: null,
});

const pageDto = (id: string, order: number, lessonId: string | null, blocks: ReturnType<typeof blockDto>[]) => ({
  id,
  lessonId,
  title: `Página ${id}`,
  slug: id,
  order,
  type: "THEORY",
  status: "PUBLISHED",
  estimatedMinutes: null,
  blocks,
});

const lessonDto = (id: string, order: number, pages: ReturnType<typeof pageDto>[]) => ({
  id,
  title: `Lección ${id}`,
  slug: null,
  order,
  status: "PUBLISHED",
  estimatedTime: null,
  pages,
});

// Arrays deliberately out of order.
const moduleFullDto = () => ({
  id: "m1",
  levelId: "lv1",
  title: "Mecánica ventilatoria",
  description: "Presiones, volúmenes y flujos.",
  difficulty: "BEGINNER",
  estimatedTime: 45,
  thumbnail: null,
  order: 1,
  status: "PUBLISHED",
  lessons: [
    lessonDto("l2", 2, [pageDto("p2", 1, "l2", [blockDto("b3", 1, "VIDEO", { url: "https://vimeo.com/76979871" })])]),
    lessonDto("l1", 1, [pageDto("p1", 1, "l1", [
      blockDto("b2", 2, "TEXT", tiptap("Segundo bloque")),
      blockDto("b1", 1, "TEXT", tiptap("Primer bloque")),
    ])]),
  ],
  unassignedPages: [pageDto("p9", 1, null, [blockDto("b9", 1, "TEXT", tiptap("Página suelta"))])],
});

const server = setupServer();
let requests: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  server.events.on("request:start", ({ request }) => {
    requests.push(`${request.method} ${new URL(request.url).pathname}`);
  });
});

beforeEach(() => {
  requests = [];
  server.use(http.get(apiUrl("/api/modules/:id/full"), () => HttpResponse.json(envelope(moduleFullDto()))));
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("ModulePrintPage", () => {
  it("loads the whole module with a single request", async() => {
    renderWithSession(<ModulePrintPage moduleId="m1" />, "TEACHER");

    expect(await screen.findByRole("heading", { level: 1, name: "Mecánica ventilatoria" })).toBeInTheDocument();
    expect(await screen.findByText("Primer bloque", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(requests).toEqual(["GET /api/modules/m1/full"]);
  });

  it("renders the cover and the lessons in order, each on a new printed page", async() => {
    renderWithSession(<ModulePrintPage moduleId="m1" />, "TEACHER");

    expect(await screen.findByText("Presiones, volúmenes y flujos.")).toBeInTheDocument();
    expect(screen.getByText("2 lecciones")).toBeInTheDocument();

    const lessons = screen.getAllByRole("heading", { level: 2 });

    expect(lessons.map((heading) => heading.textContent)).toEqual(["Lección l1", "Lección l2", "Páginas sin lección"]);
    for (const heading of lessons.slice(0, 2)) {
      expect(heading.closest("section")).toHaveClass("lesson");
    }

    const first = await screen.findByText("Primer bloque", {}, { timeout: 5000 });
    const second = screen.getByText("Segundo bloque");

    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Página suelta")).toBeInTheDocument();
  });

  it("prints videos as a visible link with their URL", async() => {
    renderWithSession(<ModulePrintPage moduleId="m1" />, "TEACHER");

    const link = await screen.findByRole("link", { name: "https://vimeo.com/76979871" }, { timeout: 5000 });

    expect(link).toHaveAttribute("href", "https://vimeo.com/76979871");
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("opens the print dialog with Descargar PDF", async() => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);

    renderWithSession(<ModulePrintPage moduleId="m1" />, "TEACHER");
    const button = await screen.findByRole("button", { name: "Descargar PDF" });

    expect(button.closest(".noPrint")).not.toBeNull();
    fireEvent.click(button);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("shows the not-found state when the module does not exist", async() => {
    server.use(http.get(apiUrl("/api/modules/:id/full"), () => errorResponse("modules.module_not_found", 404)));
    renderWithSession(<ModulePrintPage moduleId="missing" />, "TEACHER");

    expect(await screen.findByText("Módulo no disponible")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Descargar PDF" })).not.toBeInTheDocument();
  });

  it("retries after a load error", async() => {
    let calls = 0;

    server.use(http.get(apiUrl("/api/modules/:id/full"), () => {
      calls += 1;

      return calls === 1 ? errorResponse("common.internal_error", 500) : HttpResponse.json(envelope(moduleFullDto()));
    }));
    renderWithSession(<ModulePrintPage moduleId="m1" />, "TEACHER");

    expect(await screen.findByText("No se pudo cargar el módulo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "Mecánica ventilatoria" })).toBeInTheDocument());
  });
});
