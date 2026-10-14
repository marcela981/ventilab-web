/*
* Funcionalidad: GroupsPage tests
* Descripción: Renders the staff group list against a mocked backend (`GET /api/groups`, msw): client-side pagination (10 per page), the text, type and status filters (which return to the first page), the no-match and no-groups empty states and the 403 error. Depends on vitest, Testing Library, msw, SWR and the groups feature.
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
import { GroupsPage } from "./groups.page";

const GROUPS_URL = `${BACKEND_ORIGIN}/api/groups`;

const envelope = (data: unknown) => ({ success: true, message: null, data, code: null, timestamp: "", traceId: "t", pagination: null });

function groupDto(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `g${index}`,
    name: `Grupo ${String(index).padStart(2, "0")}`,
    description: null,
    type: "STUDENT",
    parentGroupId: null,
    depth: 0,
    simulatorLeaderId: null,
    isActive: true,
    maxStudents: null,
    enrollmentCode: null,
    semester: null,
    academicYear: null,
    createdBy: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    leader: null,
    creator: null,
    parentGroup: null,
    subGroups: [],
    membersCount: index,
    subGroupsCount: 0,
    ...overrides,
  };
}

const twelveGroups = [
  ...Array.from({ length: 10 }, (_, index) => groupDto(index + 1)),
  groupDto(11, { name: "Docentes UCI", type: "TEACHER" }),
  groupDto(12, { name: "Neumología", isActive: false, leader: { id: "s1", name: "Luis Gómez", email: "luis@ventylab.demo" } }),
];

const server = setupServer();

function respondWith(groups: unknown[]) {
  server.use(http.get(GROUPS_URL, () => HttpResponse.json(envelope(groups))));
}

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <GroupsPage />
    </SWRConfig>,
  );
}

async function groupNames(): Promise<string[]> {
  const table = await screen.findByRole("table", { name: "Grupos" });
  const rows = within(table).getAllByRole("row").slice(1);

  // The row header holds the name first and, for a subgroup, its parent below.
  return rows.map((row) => within(row).getByRole("rowheader").firstElementChild?.textContent ?? "");
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

describe("GroupsPage", () => {
  it("paginates the groups on the client, 10 per page", async() => {
    respondWith(twelveGroups);
    renderPage();

    expect(await groupNames()).toHaveLength(10);
    expect(screen.getByText("1–10 de 12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await groupNames()).toEqual(["Docentes UCI", "Neumología"]);
  });

  it("filters by text, type and status and returns to the first page", async() => {
    respondWith(twelveGroups);
    renderPage();
    await groupNames();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "gomez" } });
    expect(await groupNames()).toEqual(["Neumología"]);
    expect(screen.getByText("1–1 de 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "TEACHER" } });
    expect(await groupNames()).toEqual(["Docentes UCI"]);

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "inactive" } });
    expect(await groupNames()).toEqual(["Neumología"]);
  });

  it("shows the row data of a group", async() => {
    respondWith([groupDto(1, {
      name: "UCI Mañana",
      parentGroup: { id: "g0", name: "Medicina 2026", depth: 0 },
      semester: "2026-2",
      leader: { id: "s1", name: "Luis Gómez", email: "luis@ventylab.demo" },
      membersCount: 5,
    })]);
    renderPage();

    const row = within(await screen.findByRole("table", { name: "Grupos" })).getAllByRole("row")[1];

    expect(row).toBeDefined();
    expect(row).toHaveTextContent("UCI Mañana");
    expect(row).toHaveTextContent("Subgrupo de Medicina 2026");
    expect(row).toHaveTextContent("Estudiantes");
    expect(row).toHaveTextContent("Activo");
    expect(row).toHaveTextContent("Luis Gómez");
    expect(row).toHaveTextContent("2026-2");
  });

  it("tells when no group matches the filters and when there are no groups", async() => {
    respondWith(twelveGroups);
    const { unmount } = renderPage();

    await groupNames();
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "no existe" } });
    expect(screen.getByText("Ningún grupo coincide con los filtros")).toBeInTheDocument();
    unmount();

    respondWith([]);
    renderPage();
    expect(await screen.findByText("Aún no hay grupos")).toBeInTheDocument();
  });

  it("shows a permission error from the backend", async() => {
    server.use(http.get(GROUPS_URL, () => HttpResponse.json(
      { success: false, message: "Forbidden", data: null, code: "groups.management_forbidden", timestamp: "", traceId: "t", pagination: null },
      { status: 403 },
    )));
    renderPage();

    expect(await screen.findByText("No tienes permiso para gestionar este grupo.")).toBeInTheDocument();
  });
});
