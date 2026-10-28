/*
* Funcionalidad: ModuleResumeResolver tests
* Descripción: /learn/modules/[moduleId] against a mocked backend (msw) with a mocked next/router (W3, Bloque 2): a student is sent to the first unviewed page of the first unfinished lesson (findContinueTarget) and to page 1 when there is no progress or the progress read fails; tree, lessons and progress are requested in parallel; a locked module shows the lock screen and never redirects; staff go to the first lesson page without reading progress, even on a locked module; a module without lesson pages and an unknown module show their empty states. Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiUrl,
  envelope,
  errorResponse,
  lessonDto,
  lessonProgressDto,
  moduleProgressDto,
  renderWithSession,
  treeDto,
} from "./learning-test-helpers";
import { ModuleResumeResolver } from "./module-resume-resolver.page";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
const requests: string[] = [];

const lessons = [lessonDto("l2", 2, 1), lessonDto("l1", 1, 2), lessonDto("l0", 0, 0)];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.replace.mockClear();
  requests.length = 0;
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => {
      requests.push("tree");

      return HttpResponse.json(envelope(treeDto()));
    }),
    http.get(apiUrl("/api/modules/:id/lessons"), () => {
      requests.push("lessons");

      return HttpResponse.json(envelope(lessons));
    }),
    http.get(apiUrl("/api/progress/modules/:moduleId"), () => {
      requests.push("progress");

      return HttpResponse.json(envelope(moduleProgressDto("m2", 50, [lessonProgressDto("l1", 1, 2), lessonProgressDto("l2", 0, 1)])));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("ModuleResumeResolver", () => {
  it("replaces the URL with the page where the student continues", async() => {
    renderWithSession(<ModuleResumeResolver moduleId="m2" />);

    expect(screen.getByRole("status", { name: "Abriendo el módulo…" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/learn/modules/m2/lessons/l1/2");
    });
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it("requests the tree, the lessons and the progress in parallel", async() => {
    server.use(http.get(apiUrl("/api/curriculum/tree"), async() => {
      requests.push("tree");
      await delay("infinite");

      return HttpResponse.json(envelope(treeDto()));
    }));
    renderWithSession(<ModuleResumeResolver moduleId="m2" />);

    await waitFor(() => {
      expect([...requests].sort()).toEqual(["lessons", "progress", "tree"]);
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("starts at the first lesson page when the progress read fails", async() => {
    server.use(http.get(apiUrl("/api/progress/modules/:moduleId"), () => errorResponse("internal_error", 500)));
    renderWithSession(<ModuleResumeResolver moduleId="m2" />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/learn/modules/m2/lessons/l1/1");
    });
  });

  it("shows the lock screen to a student on a locked module and never redirects", async() => {
    renderWithSession(<ModuleResumeResolver moduleId="m3" />);

    expect(await screen.findByRole("heading", { name: "Contenido bloqueado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Módulo m2" })).toHaveAttribute("href", "/learn/modules/m2");
    expect(screen.getByRole("link", { name: "Volver al currículo" })).toHaveAttribute("href", "/learn?tab=curriculo&section=lv2#level-lv2");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends staff to the first lesson page without reading progress, even when locked", async() => {
    renderWithSession(<ModuleResumeResolver moduleId="m3" />, "TEACHER");

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/learn/modules/m3/lessons/l1/1");
    });
    expect(requests).not.toContain("progress");
  });

  it("says the module has no content yet when no lesson has pages", async() => {
    server.use(http.get(apiUrl("/api/modules/:id/lessons"), () => HttpResponse.json(envelope([lessonDto("l0", 0, 0)]))));
    renderWithSession(<ModuleResumeResolver moduleId="m2" />);

    expect(await screen.findByText("Este módulo todavía no tiene lecciones con contenido.")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("reports an unknown module as not available", async() => {
    renderWithSession(<ModuleResumeResolver moduleId="ghost" />);

    expect(await screen.findByText("Módulo no disponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al currículo" })).toHaveAttribute("href", "/learn?tab=curriculo");
  });

  it("offers a retry when the lessons cannot be read", async() => {
    server.use(http.get(apiUrl("/api/modules/:id/lessons"), () => errorResponse("internal_error", 500)));
    renderWithSession(<ModuleResumeResolver moduleId="m2" />);

    expect(await screen.findByText("No se pudo abrir el módulo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });
});
