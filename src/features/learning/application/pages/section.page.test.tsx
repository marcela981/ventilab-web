/*
* Funcionalidad: SectionPage tests
* Descripción: Renders /learn/[sectionId] against a mocked backend (msw): levels with the backend progress, a locked level with its lock and the links to the missing prerequisites (its modules are not links for students), the preview hint for teachers (locked content still navigable) and the not-found state. Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiUrl, envelope, progressItem, renderWithSession, treeDto } from "./learning-test-helpers";
import { SectionPage } from "./section.page";

const server = setupServer();

const sectionProgress = {
  sectionId: "s1",
  completedLevels: 0,
  totalLevels: 2,
  ...progressItem(40, 1, 3),
  levels: [
    { levelId: "lv1", sectionId: "s1", completedModules: 1, totalModules: 2, ...progressItem(50, 1, 2) },
    { levelId: "lv2", sectionId: "s1", completedModules: 0, totalModules: 1, ...progressItem(0, 0, 1) },
  ],
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/progress/sections/:sectionId"), () => HttpResponse.json(envelope(sectionProgress))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("SectionPage", () => {
  it("lists the levels with their backend progress and module links", async() => {
    renderWithSession(<SectionPage sectionId="s1" />);

    const level = await screen.findByRole("region", { name: "Nivel básico" });

    expect(within(level).getByRole("progressbar", { name: "Progreso de Nivel básico" })).toHaveAttribute("aria-valuenow", "50");
    expect(within(level).getByRole("link", { name: /Módulo m1/ })).toHaveAttribute("href", "/learn/modules/m1");
    expect(screen.getByRole("navigation", { name: "Ruta de aprendizaje" })).toHaveTextContent("AprenderFundamentos");
  });

  it("shows a locked level with links to its missing prerequisites and no module links for students", async() => {
    renderWithSession(<SectionPage sectionId="s1" />);

    const level = await screen.findByRole("region", { name: "Nivel lv2" });

    expect(within(level).getByText("Bloqueado")).toBeInTheDocument();
    expect(within(level).getByRole("link", { name: "Nivel básico" })).toHaveAttribute("href", "/learn/s1#level-lv1");
    expect(within(level).getByText("Módulo m3").closest("a")).toBeNull();
  });

  it("lets teachers navigate locked levels with a hint", async() => {
    renderWithSession(<SectionPage sectionId="s1" />, "TEACHER");

    const level = await screen.findByRole("region", { name: "Nivel lv2" });

    expect(within(level).getByText("Los estudiantes verían este contenido bloqueado.")).toBeInTheDocument();
    expect(within(level).getByRole("link", { name: /Módulo m3/ })).toHaveAttribute("href", "/learn/modules/m3");
    expect(screen.getByText("Vista previa")).toBeInTheDocument();
  });

  it("says when the section does not exist", async() => {
    renderWithSession(<SectionPage sectionId="ghost" />);

    expect(await screen.findByText("Sección no disponible")).toBeInTheDocument();
  });
});
