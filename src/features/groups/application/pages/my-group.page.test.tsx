/*
* Funcionalidad: MyGroupPage tests
* Descripción: Renders the student group page against a mocked backend (`GET /api/groups/mine`, msw): group name, leader, member names, supervising teacher groups, the empty state when the student has no group and the error state with retry. Depends on vitest, Testing Library, msw, SWR and the groups feature.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { MyGroupPage } from "./my-group.page";

const MINE_URL = `${BACKEND_ORIGIN}/api/groups/mine`;

const envelope = (data: unknown) => ({ success: true, message: null, data, code: null, timestamp: "", traceId: "t", pagination: null });

const studentGroup = {
  id: "g1",
  name: "UCI Mañana",
  leader: { id: "s1", name: "Luis Gómez" },
  members: [
    { userId: "s1", name: "Luis Gómez", memberRole: "LEADER" },
    { userId: "s2", name: "Marta Ruiz", memberRole: "MEMBER" },
    { userId: "s3", name: null, memberRole: "MEMBER" },
  ],
  supervisingGroups: [{ id: "tg1", name: "Docentes UCI" }],
};

const server = setupServer();

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <MyGroupPage />
    </SWRConfig>,
  );
}

function respondWith(data: unknown) {
  server.use(http.get(MINE_URL, () => HttpResponse.json(envelope(data))));
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

describe("MyGroupPage", () => {
  it("shows the group, its leader, the member names and the supervising teacher groups", async() => {
    respondWith({ studentGroup, memberships: [] });
    renderPage();

    expect(await screen.findByRole("heading", { name: "UCI Mañana" })).toBeInTheDocument();
    expect(screen.getByText("Luis Gómez", { selector: "dd" })).toBeInTheDocument();

    const members = within(screen.getByRole("list", { name: /integrantes/i })).getAllByRole("listitem");

    expect(members.map((item) => item.textContent)).toEqual(["Luis GómezLíder", "Marta Ruiz", "Sin nombre"]);

    const supervisors = screen.getByRole("list", { name: /grupos docentes/i });

    expect(within(supervisors).getByText("Docentes UCI")).toBeInTheDocument();
  });

  it("says when the group has no leader and no supervising groups", async() => {
    respondWith({ studentGroup: { ...studentGroup, leader: null, supervisingGroups: [] }, memberships: [] });
    renderPage();

    expect(await screen.findByText("Sin líder asignado")).toBeInTheDocument();
    expect(screen.getByText(/ningún grupo docente supervisa/i)).toBeInTheDocument();
  });

  it("shows the empty state when the student has no group", async() => {
    respondWith({ studentGroup: null, memberships: [] });
    renderPage();

    expect(await screen.findByText("Aún no perteneces a un grupo")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the error with a retry that reloads the group", async() => {
    respondWith({ studentGroup, memberships: [] });
    // Handlers added later take precedence: the first request fails once, the retry succeeds.
    server.use(http.get(MINE_URL, () => HttpResponse.json(
      { success: false, message: "Forbidden", data: null, code: "auth.forbidden", timestamp: "", traceId: "t", pagination: null },
      { status: 403 },
    ), { once: true }));
    renderPage();

    expect(await screen.findByText("No tienes permiso para realizar esta acción.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "UCI Mañana" })).toBeInTheDocument();
  });
});
