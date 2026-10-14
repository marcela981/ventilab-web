/*
* Funcionalidad: GroupsPage tests
* Descripción: Renders the staff group list against a mocked backend (`GET /api/groups`, msw): client-side pagination (10 per page), the text, type and status filters (which return to the first page), the no-match and no-groups empty states and the 403 error. v1.1 (T11b): the filter-reset test now proves the return to page 1 with a result that still spans several pages; group names link to the detail; "Crear grupo" creates a student group (validation, POST body, refreshed list, 403 message). v1.2 (T11c): rendered with a session role; the type selector only for admins and an admin creating a teacher group. Depends on vitest, Testing Library, msw, the groups test helpers and the groups feature.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { GroupsPage } from "./groups.page";
import { renderWithSession } from "./groups-test-helpers";

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

function renderPage(role: "TEACHER" | "ADMIN" = "TEACHER") {
  return renderWithSession(<GroupsPage />, role);
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

  it("filters by text, type and status", async() => {
    respondWith(twelveGroups);
    renderPage();
    await groupNames();

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

  it("returns to the first page when a filter changes", async() => {
    respondWith(twelveGroups);
    renderPage();
    await groupNames();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await groupNames()).toEqual(["Docentes UCI", "Neumología"]);

    // 11 student groups still span two pages: without the reset, page 2 ("11–11 de 11") would stay.
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "STUDENT" } });

    expect(screen.getByText("1–10 de 11")).toBeInTheDocument();
    expect(await groupNames()).toHaveLength(10);
    expect((await groupNames())[0]).toBe("Grupo 01");
  });

  it("links every group name to its detail page", async() => {
    respondWith(twelveGroups);
    renderPage();
    await groupNames();

    expect(screen.getByRole("link", { name: "Grupo 01" })).toHaveAttribute("href", "/groups/g1");
  });

  it("creates a student group from the dialog and refreshes the list", async() => {
    const bodies: unknown[] = [];
    let listed = twelveGroups;

    server.use(
      http.get(GROUPS_URL, () => HttpResponse.json(envelope(listed))),
      http.post(GROUPS_URL, async({ request }) => {
        bodies.push(await request.json());
        listed = [...twelveGroups, groupDto(13, { name: "Aaa nuevo" })];

        return HttpResponse.json(envelope({ id: "g13" }));
      }),
    );
    renderPage();
    await groupNames();
    fireEvent.click(screen.getByRole("button", { name: "Crear grupo" }));

    const dialog = await screen.findByRole("dialog", { name: "Crear grupo de estudiantes" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Crear grupo" }));
    expect(await within(dialog).findByText("Escribe el nombre del grupo.")).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Nombre del grupo/), { target: { value: " Aaa nuevo " } });
    fireEvent.change(within(dialog).getByLabelText("Límite de estudiantes"), { target: { value: "12.5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear grupo" }));
    expect(await within(dialog).findByText("El límite de estudiantes debe ser un número entero entre 1 y 2147483647.")).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText("Límite de estudiantes"), { target: { value: "20" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear grupo" }));

    expect(await screen.findByText("Grupo «Aaa nuevo» creado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ name: "Aaa nuevo", maxStudents: 20, type: "STUDENT" }]);
    await waitFor(() => expect(screen.getByText("1–10 de 13")).toBeInTheDocument());
  });

  it("shows the permission message when the creation is forbidden", async() => {
    respondWith(twelveGroups);
    server.use(http.post(GROUPS_URL, () => HttpResponse.json(
      { success: false, message: "Forbidden", data: null, code: "groups.type_creation_forbidden", timestamp: "", traceId: "t", pagination: null },
      { status: 403 },
    )));
    renderPage();
    await groupNames();
    fireEvent.click(screen.getByRole("button", { name: "Crear grupo" }));

    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText(/Nombre del grupo/), { target: { value: "UCI" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear grupo" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("No tienes permiso para crear este tipo de grupo.");
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

  it("offers the group type only to admins", async() => {
    respondWith(twelveGroups);
    const { unmount } = renderPage("TEACHER");

    await groupNames();
    fireEvent.click(screen.getByRole("button", { name: "Crear grupo" }));
    expect(within(await screen.findByRole("dialog")).queryByLabelText("Tipo de grupo")).not.toBeInTheDocument();
    unmount();

    renderPage("ADMIN");
    await groupNames();
    fireEvent.click(screen.getByRole("button", { name: "Crear grupo" }));

    const select = within(await screen.findByRole("dialog", { name: "Crear grupo" })).getByLabelText("Tipo de grupo");

    expect(select).toHaveValue("STUDENT");
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["Estudiantes", "Docentes"]);
  });

  it("lets an admin create a teacher group", async() => {
    const bodies: unknown[] = [];

    respondWith(twelveGroups);
    server.use(http.post(GROUPS_URL, async({ request }) => {
      bodies.push(await request.json());

      return HttpResponse.json(envelope({ id: "g13" }));
    }));
    renderPage("ADMIN");
    await groupNames();
    fireEvent.click(screen.getByRole("button", { name: "Crear grupo" }));

    const dialog = await screen.findByRole("dialog", { name: "Crear grupo" });

    fireEvent.change(within(dialog).getByLabelText("Tipo de grupo"), { target: { value: "TEACHER" } });
    fireEvent.change(within(dialog).getByLabelText(/Nombre del grupo/), { target: { value: "Docentes UCI 2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear grupo" }));

    expect(await screen.findByText("Grupo «Docentes UCI 2» creado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ name: "Docentes UCI 2", type: "TEACHER" }]);
  });
});
