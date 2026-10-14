/*
* Funcionalidad: LessonViewerPage tests
* Descripción: Renders /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber] against a mocked backend (msw) with a mocked next/router: blocks of Page N with the breadcrumb and Previous link; lock screen for a student on a locked module (the Page content is never requested) and the content in preview for a teacher; "Siguiente" registers the view once and navigates to the next lesson; "Finalizar módulo" goes to the completion screen; an invalid or out-of-range pageNumber redirects; a lesson outside the module is not found; the side panel tabs and its persisted collapsed state. v1.1 (L4): the Notas tab shows the caller's notes of the lesson with the anchor page link. Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.1
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
import {
  apiUrl,
  envelope,
  lessonDto,
  pageDetailDto,
  pageSectionDto,
  pageSummaryDto,
  renderWithSession,
  treeDto,
} from "./learning-test-helpers";
import { LessonViewerPage } from "./lesson-viewer.page";

const router = vi.hoisted(() => ({
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

// The blocks renderer is a lazy chunk: allow for the dynamic import under a loaded test run.
const LAZY_WAIT = { timeout: 10_000 };
const server = setupServer();
const PAGES: Record<string, string[]> = { l1: ["p1a", "p1b"], l2: ["p2a"] };
let pageRequests: string[] = [];
let viewRequests: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  pageRequests = [];
  viewRequests = [];
  router.push.mockClear();
  router.replace.mockClear();
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/modules/:id/lessons"), () => HttpResponse.json(envelope([lessonDto("l2", 2, 1), lessonDto("l1", 1, 2)]))),
    http.get(apiUrl("/api/pages"), ({ request }) => {
      const lessonId = new URL(request.url).searchParams.get("lessonId") ?? "";
      const ids = PAGES[lessonId] ?? [];

      return HttpResponse.json(envelope(ids.map((id, index) => pageSummaryDto(id, index + 1, lessonId))));
    }),
    http.get(apiUrl("/api/pages/:id"), ({ params }) => {
      const id = String(params.id);

      pageRequests.push(id);

      return HttpResponse.json(envelope(pageDetailDto(id, id.startsWith("p1") ? "l1" : "l2", "m2", [
        pageSectionDto(`${id}-b2`, 2, `Segundo bloque ${id}`),
        pageSectionDto(`${id}-b1`, 1, `Contenido ${id}`),
      ])));
    }),
    http.post(apiUrl("/api/progress/pages/:pageId/view"), ({ params }) => {
      viewRequests.push(String(params.pageId));

      return HttpResponse.json(envelope({
        pageId: String(params.pageId),
        lessonId: "l1",
        viewedPages: 2,
        totalPages: 2,
        lessonCompleted: true,
        lessonJustCompleted: true,
        firstViewedAt: "2026-10-14T00:00:00.000Z",
        lastVisitedAt: "2026-10-14T00:00:00.000Z",
      }));
    }),
    http.get(apiUrl("/api/progress/*"), () => HttpResponse.json(envelope(null), { status: 404 })),
    http.get(apiUrl("/api/notes/lessons/:lessonId"), ({ params }) => HttpResponse.json(envelope(params.lessonId === "l1"
      ? [{ id: "n1", lessonId: "l1", pageId: "p1b", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Mi nota" }] }] }, createdAt: "2026-10-14T00:00:00.000Z", updatedAt: "2026-10-14T00:00:00.000Z" }]
      : []))),
  );
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

describe("LessonViewerPage", { timeout: 20_000 }, () => {
  it("renders the blocks of page N in order with the breadcrumb and the previous link", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="2" />);

    const first = await screen.findByText("Contenido p1b", {}, LAZY_WAIT);
    const second = screen.getByText("Segundo bloque p1b");

    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Ruta de aprendizaje" }))
      .toHaveTextContent("AprenderFundamentosNivel básicoMódulo m2Lección l1Página 2");
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });

  it("has no previous link on the first page of the module", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);

    expect(await screen.findByText("Contenido p1a", {}, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument();
  });

  it("shows the lock screen to a student on a locked module and never requests the content", async() => {
    renderWithSession(<LessonViewerPage moduleId="m3" lessonId="l1" pageParam="1" />);

    expect(await screen.findByRole("heading", { name: "Contenido bloqueado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Módulo m2" })).toHaveAttribute("href", "/learn/modules/m2");
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(pageRequests).toEqual([]);
    expect(screen.queryByText("Contenido p1a")).not.toBeInTheDocument();
  });

  it("shows the content of a locked module to a teacher in preview", async() => {
    renderWithSession(<LessonViewerPage moduleId="m3" lessonId="l1" pageParam="1" />, "TEACHER");

    expect(await screen.findByText("Contenido p1a", {}, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByText("Vista previa")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contenido bloqueado" })).not.toBeInTheDocument();
  });

  it("registers the view once on Siguiente and navigates to the next lesson", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="2" />);

    const next = await screen.findByRole("button", { name: "Siguiente" });

    await screen.findByText("Contenido p1b", {}, LAZY_WAIT);
    fireEvent.click(next);
    fireEvent.click(next);

    await waitFor(() => {
      expect(viewRequests).toEqual(["p1b"]);
    });
    expect(router.push).toHaveBeenCalledWith("/learn/modules/m2/lessons/l2/1");
  });

  it("finishes the module after its last page", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l2" pageParam="1" />);

    await screen.findByText("Contenido p2a", {}, LAZY_WAIT);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar módulo" }));

    expect(router.push).toHaveBeenCalledWith("/learn/modules/m2?completed=1");
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/2");
  });

  it("redirects an invalid pageNumber to the first page", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="abc" />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/learn/modules/m2/lessons/l1/1");
    });
  });

  it("redirects an out-of-range pageNumber to the last page", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="9" />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/learn/modules/m2/lessons/l1/2");
    });
  });

  it("says when the lesson does not belong to the module", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="ghost" pageParam="1" />);

    expect(await screen.findByText("Lección no disponible")).toBeInTheDocument();
    expect(pageRequests).toEqual([]);
  });

  it("offers the Notas, Profundizar and Preguntas tabs in the side panel", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);

    expect(await screen.findByRole("tab", { name: "Notas" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Preguntas" }));
    expect(screen.getByRole("tab", { name: "Preguntas" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar panel" }));
    expect(screen.queryByRole("tab", { name: "Notas" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("vl-learning-side-panel-collapsed")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar panel" }));
    expect(screen.getByRole("tab", { name: "Notas" })).toBeInTheDocument();
  });

  it("shows the caller's notes of the lesson in the Notas tab with the anchor page link", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);

    expect(await screen.findByText("Mi nota", {}, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la página 2" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/2");
  });
});
