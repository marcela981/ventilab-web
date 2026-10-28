/*
* Funcionalidad: LessonViewerPage tests
* Descripción: Integration tests (msw) of the lesson viewer: blocks of page N in order, breadcrumb, previous link, view registration on Siguiente, module completion in place, pageNumber redirects and a lesson outside the module. v1.1 (L4): notes in the side panel. v1.2 (L5/L6): Profundizar and Preguntas tabs. v1.3 (W5, Bloque 2): July layout (title, "Página x de N" with bar and percentage, lesson index, no side panel), the requests of a page load (two waves, never the curriculum tree; section and level from a cached tree), the index locks, the lock screen from the access endpoint and from a 403 progress.lesson_locked, the lesson completion dialog (focus, Esc, Continuar, lazy confetti), the module card driven by moduleCompleted, the next-page prefetch, the tree invalidation only on completion and the staff preview with "Editar esta página". Depends on vitest, Testing Library, msw and the learning test helpers. v1.4 (W7, Bloque 2): the deepen accordion follows the page content and the TutorAI button is offered, neither on the lock screen.
* Versión: 1.4
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
import { useCurriculumTree } from "../hooks/use-curriculum-tree";
import {
  apiUrl,
  envelope,
  lessonDto,
  lessonProgressDto,
  moduleProgressDto,
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
  prefetch: vi.fn(() => Promise.resolve()),
}));
const confetti = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("canvas-confetti", () => ({ default: confetti }));

// The blocks renderer and the dialog are lazy chunks: allow for the dynamic import under a loaded test run.
const LAZY_WAIT = { timeout: 10_000 };
const server = setupServer();
// m2: l1 (2 pages), lEmpty (no pages), l2 (1 page), l3 (1 page, last of the module).
const PAGES: Record<string, string[]> = { l1: ["p1a", "p1b"], l2: ["p2a"], l3: ["p3a"] };
const lessonOf = (pageId: string): string => (pageId.startsWith("p1") ? "l1" : pageId.startsWith("p2") ? "l2" : "l3");

type ViewFlags = { lessonCompleted: boolean, lessonJustCompleted: boolean, moduleCompleted: boolean };

let requests: string[] = [];
let viewRequests: string[] = [];
let completedLessons: string[] = [];
let viewFlags: ViewFlags;

const count = (prefix: string): number => requests.filter((request) => request.startsWith(prefix)).length;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  requests = [];
  viewRequests = [];
  completedLessons = [];
  viewFlags = { lessonCompleted: false, lessonJustCompleted: false, moduleCompleted: false };
  router.push.mockClear();
  router.replace.mockClear();
  router.prefetch.mockClear();
  confetti.mockClear();
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => {
      requests.push("tree");

      return HttpResponse.json(envelope(treeDto()));
    }),
    http.get(apiUrl("/api/modules/:id/lessons"), () => {
      requests.push("lessons");

      return HttpResponse.json(envelope([lessonDto("l3", 4, 1), lessonDto("l2", 3, 1), lessonDto("lEmpty", 2, 0), lessonDto("l1", 1, 2)]));
    }),
    http.get(apiUrl("/api/pages"), ({ request }) => {
      const lessonId = new URL(request.url).searchParams.get("lessonId") ?? "";
      const ids = PAGES[lessonId] ?? [];

      requests.push(`pages?${lessonId}`);

      return HttpResponse.json(envelope(ids.map((id, index) => pageSummaryDto(id, index + 1, lessonId))));
    }),
    http.get(apiUrl("/api/pages/:id"), ({ params }) => {
      const id = String(params.id);

      requests.push(`page:${id}`);

      return HttpResponse.json(envelope(pageDetailDto(id, lessonOf(id), "m2", [
        pageSectionDto(`${id}-b2`, 2, `Segundo bloque ${id}`),
        pageSectionDto(`${id}-b1`, 1, `Contenido ${id}`),
      ])));
    }),
    http.get(apiUrl("/api/lessons/:id/access"), ({ params }) => {
      requests.push(`access:${String(params.id)}`);

      return HttpResponse.json(envelope({ allowed: true, reason: null, missing: [] }));
    }),
    http.get(apiUrl("/api/progress/modules/:moduleId"), () => {
      requests.push("module-progress");

      return HttpResponse.json(envelope(moduleProgressDto("m2", 0, ["l1", "l2", "l3"].map((id) => lessonProgressDto(id, completedLessons.includes(id) ? 1 : 0, 1)))));
    }),
    http.post(apiUrl("/api/progress/pages/:pageId/view"), ({ params }) => {
      const pageId = String(params.pageId);

      viewRequests.push(pageId);

      return HttpResponse.json(envelope({
        pageId,
        lessonId: lessonOf(pageId),
        viewedPages: 1,
        totalPages: 1,
        ...viewFlags,
        firstViewedAt: "2026-10-14T00:00:00.000Z",
        lastVisitedAt: "2026-10-14T00:00:00.000Z",
      }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

function TreeWarmer() {
  useCurriculumTree();

  return null;
}

const lessonsIndex = () => screen.getByRole("complementary", { name: "Índice de lecciones" });

describe("LessonViewerPage", { timeout: 20_000 }, () => {
  it("renders the July layout: breadcrumb, title, page progress, blocks in order, lesson index and navigation", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="2" />);

    const first = await screen.findByText("Contenido p1b", {}, LAZY_WAIT);
    const second = screen.getByText("Segundo bloque p1b");

    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Ruta de aprendizaje" })).toHaveTextContent("AprenderMódulo m2Lección l1Página 2");
    expect(screen.getByRole("heading", { level: 1, name: "Lección l1" })).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progreso de la lección" })).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(within(lessonsIndex()).getByRole("link", { name: "Lección l1" })).toHaveAttribute("aria-current", "page");
    expect(within(lessonsIndex()).queryByText("Lección lEmpty")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Notas" })).not.toBeInTheDocument();
  });

  it("closes each page with the deepen accordion and offers the TutorAI button", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="2" />);

    const content = await screen.findByText("Segundo bloque p1b", {}, LAZY_WAIT);
    const accordion = screen.getByRole("button", { name: "¿Te gustaría expandir más este tema?" });

    expect(content.compareDocumentPosition(accordion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(accordion).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Abrir TutorAI" })).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("loads the page in two request waves and never requests the curriculum tree", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);

    await screen.findByText("Contenido p1a", {}, LAZY_WAIT);

    const pageIndex = requests.indexOf("page:p1a");

    // Wave 1 (together on mount): Pages of the lesson, module lessons, access, module progress. Wave 2: the Page.
    expect(requests.slice(0, pageIndex).sort()).toEqual(["access:l1", "lessons", "module-progress", "pages?l1"]);
    expect(pageIndex).toBe(4);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(count("tree")).toBe(0);
  });

  it("takes the section and the level of the breadcrumb from a tree already cached", async() => {
    renderWithSession(<><TreeWarmer /><LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" /></>);

    await screen.findByText("Contenido p1a", {}, LAZY_WAIT);
    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: "Ruta de aprendizaje" })).toHaveTextContent("AprenderFundamentosNivel básicoMódulo m2Lección l1Página 1");
    });
    expect(count("tree")).toBe(1);
  });

  it("locks the later incomplete lessons in the index and opens the next one once the lesson is completed", async() => {
    const { unmount } = renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);

    await screen.findByText("Contenido p1a", {}, LAZY_WAIT);
    await waitFor(() => {
      expect(count("module-progress")).toBe(1);
    });
    expect(within(lessonsIndex()).queryByRole("link", { name: /Lección l2/ })).not.toBeInTheDocument();
    expect(within(lessonsIndex()).getByText("Lección l2").closest("[aria-disabled='true']")).toHaveTextContent("(bloqueada)");
    unmount();

    completedLessons = ["l1"];
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);
    await screen.findByRole("complementary", { name: "Índice de lecciones" });

    expect(await within(lessonsIndex()).findByRole("link", { name: "Lección l2" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l2/1");
    expect(within(lessonsIndex()).getByRole("link", { name: /Lección l1/ })).toHaveTextContent("(completada)");
    expect(within(lessonsIndex()).getByText("Lección l3").closest("[aria-disabled='true']")).not.toBeNull();
  });

  it("shows the lock screen with the missing lessons when the access endpoint closes the lesson", async() => {
    server.use(http.get(apiUrl("/api/lessons/:id/access"), () => HttpResponse.json(envelope({
      allowed: false,
      reason: "previous_lesson_incomplete",
      missing: [{ lessonId: "l1", title: "Lección l1" }],
    }))));
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l2" pageParam="1" />);

    expect(await screen.findByRole("heading", { name: "Contenido bloqueado" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Prerrequisitos pendientes" })).getByRole("link", { name: "Lección l1" }))
      .toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(screen.queryByText("Contenido p2a")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Siguiente|Finalizar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir TutorAI" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "¿Te gustaría expandir más este tema?" })).not.toBeInTheDocument();
  });

  it("shows the lock screen when the server answers the page with 403 progress.lesson_locked", async() => {
    server.use(http.get(apiUrl("/api/pages/:id"), () => HttpResponse.json({
      success: false,
      message: "locked",
      code: "progress.lesson_locked",
      data: { reason: "previous_lesson_incomplete", missing: [{ lessonId: "l1", title: "Lección l1" }] },
      timestamp: "",
      traceId: "t",
      pagination: null,
    }, { status: 403 })));
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l2" pageParam="1" />);

    expect(await screen.findByRole("heading", { name: "Contenido bloqueado" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Prerrequisitos pendientes" })).getByRole("link", { name: "Lección l1" }))
      .toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(viewRequests).toEqual([]);
  });

  it("opens the lesson completed dialog on the last page, with focus management and no automatic navigation", async() => {
    viewFlags = { lessonCompleted: true, lessonJustCompleted: true, moduleCompleted: false };
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="2" />);

    await screen.findByText("Contenido p1b", {}, LAZY_WAIT);
    const next = screen.getByRole("button", { name: "Siguiente" });

    next.focus();
    fireEvent.click(next);

    const dialog = await screen.findByRole("dialog", { name: "¡Lección Completada!" }, LAZY_WAIT);

    expect(dialog).toHaveTextContent("Has completado exitosamente esta lección. ¡Felicidades!");
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "Continuar a la Siguiente Lección" })).toHaveFocus();
    });
    expect(viewRequests).toEqual(["p1b"]);
    expect(router.push).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(confetti).toHaveBeenCalledTimes(1);
    });

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(next).toHaveFocus();
    });
    expect(router.push).not.toHaveBeenCalled();

    // Siguiente on the already completed lesson offers the dialog again; Continuar goes to the next lesson with Pages.
    fireEvent.click(next);
    fireEvent.click(await screen.findByRole("button", { name: "Continuar a la Siguiente Lección" }));
    expect(router.push).toHaveBeenCalledWith("/learn/modules/m2/lessons/l2/1");
    expect(viewRequests).toEqual(["p1b"]);
  });

  it("navigates on Siguiente when the last page view leaves the lesson incomplete", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="2" />);

    await screen.findByText("Contenido p1b", {}, LAZY_WAIT);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/learn/modules/m2/lessons/l2/1");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("registers the view once on Siguiente, navigates and refetches neither the tree nor the module progress", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);

    const next = await screen.findByRole("button", { name: "Siguiente" });

    await screen.findByText("Contenido p1a", {}, LAZY_WAIT);
    fireEvent.click(next);
    fireEvent.click(next);

    await waitFor(() => {
      expect(viewRequests).toEqual(["p1a"]);
    });
    expect(router.push).toHaveBeenCalledWith("/learn/modules/m2/lessons/l1/2");
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    expect(count("tree")).toBe(0);
    expect(count("module-progress")).toBe(1);
  });

  it("prefetches the next page once the current one is on screen", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l1" pageParam="1" />);

    await screen.findByText("Contenido p1a", {}, LAZY_WAIT);

    await waitFor(() => {
      expect(requests).toContain("page:p1b");
    });
    expect(requests.indexOf("page:p1b")).toBeGreaterThan(requests.indexOf("page:p1a"));
    expect(router.prefetch).toHaveBeenCalledWith("/learn/modules/m2/lessons/l1/2");
  });

  it("shows the module completion card in place when the view answers moduleCompleted", async() => {
    viewFlags = { lessonCompleted: true, lessonJustCompleted: true, moduleCompleted: true };
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l3" pageParam="1" />);

    await screen.findByText("Contenido p3a", {}, LAZY_WAIT);
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l2/1");
    expect(count("tree")).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar módulo" }));

    expect(await screen.findByRole("heading", { name: "¡Completaste el módulo!" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar módulo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    // The tree (next module) and the module progress are read again only now.
    await waitFor(() => {
      expect(count("tree")).toBe(1);
    });
    expect(count("module-progress")).toBe(2);
  });

  it("keeps the navigation and explains it when the module is not completed yet", async() => {
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l3" pageParam="1" />);

    await screen.findByText("Contenido p3a", {}, LAZY_WAIT);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar módulo" }));

    expect(await screen.findByText("Aún te faltan páginas o lecciones por completar en este módulo.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¡Completaste el módulo!" })).not.toBeInTheDocument();
  });

  it("previews without locks nor view registration for staff, with the Editar esta página link", async() => {
    server.use(http.get(apiUrl("/api/lessons/:id/access"), () => HttpResponse.json(envelope({ allowed: false, reason: "module_locked", missing: [] }))));
    renderWithSession(<LessonViewerPage moduleId="m2" lessonId="l3" pageParam="1" />, "TEACHER");

    expect(await screen.findByText("Contenido p3a", {}, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByText("Vista previa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar esta página" })).toHaveAttribute("href", "/content/pages/p3a");
    expect(within(lessonsIndex()).getAllByRole("link")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar módulo" }));
    expect(await screen.findByRole("heading", { name: "¡Completaste el módulo!" })).toBeInTheDocument();
    expect(count("access")).toBe(0);
    expect(count("module-progress")).toBe(0);
    expect(viewRequests).toEqual([]);
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
    expect(count("page:")).toBe(0);
  });
});
