/*
* Funcionalidad: LearnHomePage tests
* Descripción: Renders /learn against a mocked backend (msw): sections in curriculum order with the backend progress, the "Continuar donde quedé" link to the first unlocked, unfinished module, the preview notice for teachers and the error state with retry. Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { LearnHomePage } from "./learn-home.page";
import { apiUrl, envelope, errorResponse, progressItem, renderWithSession, treeDto } from "./learning-test-helpers";

const server = setupServer();

const summary = {
  ...progressItem(25, 1, 4),
  sections: [
    { sectionId: "s1", completedLevels: 0, totalLevels: 2, ...progressItem(40, 1, 3) },
    { sectionId: "s2", completedLevels: 0, totalLevels: 0, ...progressItem(0, 0, 0) },
  ],
  levels: [],
  modules: [],
};

function respond() {
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/progress/summary"), () => HttpResponse.json(envelope(summary))),
  );
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("LearnHomePage", () => {
  it("lists the sections in order with the backend progress", async() => {
    respond();
    renderWithSession(<LearnHomePage />);

    const sections = await screen.findByRole("list", { name: "Secciones" });
    const links = within(sections).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["Fundamentos", "Avanzado"]);
    expect(links[0]).toHaveAttribute("href", "/learn/s1");
    expect(await screen.findByRole("progressbar", { name: "Progreso de Fundamentos" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("40 % · 1 de 3 lecciones")).toBeInTheDocument();
  });

  it("continues at the first unlocked module that is not completed", async() => {
    respond();
    renderWithSession(<LearnHomePage />);

    expect(await screen.findByRole("link", { name: /Continuar donde quedé/ })).toHaveAttribute("href", "/learn/modules/m2");
    expect(screen.queryByText("Vista previa")).not.toBeInTheDocument();
  });

  it("shows the preview notice to teachers", async() => {
    respond();
    renderWithSession(<LearnHomePage />, "TEACHER");

    expect(await screen.findByText("Vista previa")).toBeInTheDocument();
  });

  it("shows the error with a retry that reloads the curriculum", async() => {
    respond();
    server.use(http.get(apiUrl("/api/curriculum/tree"), () => errorResponse("common.internal", 500), { once: true }));
    renderWithSession(<LearnHomePage />);

    expect(await screen.findByText("Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("list", { name: "Secciones" })).toBeInTheDocument();
  });
});
