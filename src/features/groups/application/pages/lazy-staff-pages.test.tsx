/*
* Funcionalidad: Lazy staff groups pages tests
* Descripción: Verifies that the public GroupsPage and GroupDetailPage of the groups barrel load their page chunk on demand (a loading state first, then the real page) so the student-only /my-group route does not ship the staff code. Depends on vitest, Testing Library, msw, the groups test helpers and the lazy staff pages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiUrl, envelope, groupDto, renderWithSession } from "./groups-test-helpers";
import { GroupDetailPage, GroupsPage } from "./lazy-staff-pages";

// The lazy chunk is transformed on first use; under load that can take longer than the default 1 s.
const LAZY_WAIT = { timeout: 10000 };

const server = setupServer(
  http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([groupDto(1)]))),
  http.get(apiUrl("/api/groups/g1"), () => HttpResponse.json(envelope({ ...groupDto(1), members: [] }))),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("lazy staff groups pages", () => {
  it("loads the group list page on demand", async() => {
    renderWithSession(<GroupsPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Grupos" }, LAZY_WAIT)).toBeInTheDocument();
  });

  it("loads the group detail page on demand", async() => {
    renderWithSession(<GroupDetailPage groupId="g1" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Grupo 01" }, LAZY_WAIT)).toBeInTheDocument();
  });
});
