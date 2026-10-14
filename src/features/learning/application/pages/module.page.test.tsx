/*
* Funcionalidad: ModulePage tests
* Descripción: Renders /learn/modules/[moduleId] against a mocked backend (msw): breadcrumb, backend module progress, lessons with per-lesson page progress and the "Continuar donde quedé" link; the lock screen with prerequisite links for students on a locked module; the preview mode for teachers (no lock screen); and the parallel loading (lessons and progress are requested while the tree is still pending: no request cascade). Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, waitFor, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  apiUrl,
  envelope,
  lessonDto,
  lessonProgressDto,
  moduleProgressDto,
  renderWithSession,
  treeDto,
} from "./learning-test-helpers";
import { ModulePage } from "./module.page";

const server = setupServer();

const lessons = [lessonDto("l2", 2, 1), lessonDto("l1", 1, 2)];
const progress = moduleProgressDto("m2", 50, [lessonProgressDto("l1", 2, 2), lessonProgressDto("l2", 0, 1)]);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/modules/:id/lessons"), () => HttpResponse.json(envelope(lessons))),
    http.get(apiUrl("/api/progress/modules/:moduleId"), () => HttpResponse.json(envelope(progress))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("ModulePage", () => {
  it("shows the module, its progress, the lessons and where to continue", async() => {
    renderWithSession(<ModulePage moduleId="m2" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Módulo m2" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Ruta de aprendizaje" })).toHaveTextContent("AprenderFundamentosNivel básicoMódulo m2");
    expect(await screen.findByRole("progressbar", { name: "Progreso de Módulo m2" })).toHaveAttribute("aria-valuenow", "50");

    const list = await screen.findByRole("list", { name: "Lecciones" });
    const items = within(list).getAllByRole("listitem");

    expect(within(items[0] as HTMLElement).getByRole("link", { name: "Lección l1" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(items[0]).toHaveTextContent("2 de 2 páginas");
    expect(items[1]).toHaveTextContent("0 de 1 páginas");
    expect(screen.getByRole("link", { name: /Continuar donde quedé/ })).toHaveAttribute("href", "/learn/modules/m2/lessons/l2/1");
  });

  it("shows the lock screen with prerequisite links to students on a locked module", async() => {
    renderWithSession(<ModulePage moduleId="m3" />);

    expect(await screen.findByRole("heading", { name: "Contenido bloqueado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Módulo m2" })).toHaveAttribute("href", "/learn/modules/m2");
    expect(screen.queryByRole("list", { name: "Lecciones" })).not.toBeInTheDocument();
  });

  it("lets teachers preview a locked module", async() => {
    renderWithSession(<ModulePage moduleId="m3" />, "TEACHER");

    expect(await screen.findByRole("list", { name: "Lecciones" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contenido bloqueado" })).not.toBeInTheDocument();
    expect(screen.getByText("Los estudiantes verían este contenido bloqueado.")).toBeInTheDocument();
    expect(screen.getByText("Vista previa")).toBeInTheDocument();
  });

  it("requests lessons and progress in parallel with the tree", async() => {
    const requested: string[] = [];

    server.use(
      http.get(apiUrl("/api/curriculum/tree"), async() => {
        requested.push("tree");
        await delay("infinite");

        return HttpResponse.json(envelope(treeDto()));
      }),
      http.get(apiUrl("/api/modules/:id/lessons"), () => {
        requested.push("lessons");

        return HttpResponse.json(envelope(lessons));
      }),
      http.get(apiUrl("/api/progress/modules/:moduleId"), () => {
        requested.push("progress");

        return HttpResponse.json(envelope(progress));
      }),
    );
    renderWithSession(<ModulePage moduleId="m2" />);

    await waitFor(() => {
      expect([...requested].sort()).toEqual(["lessons", "progress", "tree"]);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("says when the module is not available", async() => {
    renderWithSession(<ModulePage moduleId="ghost" />);

    expect(await screen.findByText("Módulo no disponible")).toBeInTheDocument();
  });
});
