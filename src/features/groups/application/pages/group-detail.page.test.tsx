/*
* Funcionalidad: GroupDetailPage tests
* Descripción: Renders the group detail page against a mocked backend (msw): group facts and members, the read-only view of a teacher group for a teacher, edit with only the changed fields and the student limit validation, the member search (STUDENT role, current members excluded), add member (success and the 409/422 messages), remove member and assign leader behind a confirmation (with the previous leader text), deactivate (PATCH isActive=false), the 403 message and a missing group. Depends on vitest, Testing Library, msw and the groups feature.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GroupDetailPage } from "./group-detail.page";
import { apiUrl, envelope, errorResponse, groupDto, memberDto, renderWithSession, userDto } from "./groups-test-helpers";

const GROUP_URL = apiUrl("/api/groups/g1");

type Detail = ReturnType<typeof groupDto> & { members: Array<ReturnType<typeof memberDto>> };

let detail: Detail;
let detailReads = 0;
let requests: Array<{ method: string, path: string, body: unknown, search?: string }> = [];

const server = setupServer();

function studentGroup(overrides: Record<string, unknown> = {}): Detail {
  return {
    ...groupDto(1, {
      name: "UCI Mañana",
      maxStudents: 30,
      membersCount: 2,
      leader: { id: "s1", name: "Luis Gómez", email: "s1@ventylab.demo" },
      creator: { id: "t1", name: "Ana Torres", email: "ana@ventylab.demo" },
      ...overrides,
    }),
    members: [memberDto("s1", "Luis Gómez", "LEADER"), memberDto("s2", "Eva Ruiz")],
  };
}

async function record(request: Request) {
  const url = new URL(request.url);
  const text = await request.text();

  requests.push({ method: request.method, path: url.pathname, body: text ? JSON.parse(text) : null, search: url.search });
}

function useDefaultHandlers() {
  server.use(
    http.get(GROUP_URL, () => {
      detailReads += 1;

      return HttpResponse.json(envelope(detail));
    }),
    http.get(apiUrl("/api/users"), async({ request }) => {
      await record(request);

      return HttpResponse.json(envelope([userDto("s2", "Eva Ruiz"), userDto("s3", "Esteban Paz")]));
    }),
    http.patch(GROUP_URL, async({ request }) => {
      await record(request);

      return HttpResponse.json(envelope(null));
    }),
    http.post(apiUrl("/api/groups/g1/members"), async({ request }) => {
      await record(request);

      return HttpResponse.json(envelope(null));
    }),
    http.delete(apiUrl("/api/groups/g1/members/:userId"), async({ request }) => {
      await record(request);

      return HttpResponse.json(envelope(null));
    }),
    http.patch(apiUrl("/api/groups/g1/lead"), async({ request }) => {
      await record(request);

      return HttpResponse.json(envelope(null));
    }),
  );
}

async function renderDetail(role: "TEACHER" | "ADMIN" = "TEACHER") {
  renderWithSession(<GroupDetailPage groupId="g1" />, role);

  return screen.findByRole("heading", { level: 1, name: detail.name });
}

function members() {
  return screen.getByRole("list", { name: "Integrantes del grupo" });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  detail = studentGroup();
  detailReads = 0;
  requests = [];
  useDefaultHandlers();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("GroupDetailPage", () => {
  it("shows the group facts and its members", async() => {
    await renderDetail();

    expect(screen.getByText("2 / 30")).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(within(members()).getByText("Eva Ruiz")).toBeInTheDocument();
    expect(within(members()).getByText("Líder")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a grupos" })).toHaveAttribute("href", "/groups");
  });

  it("shows a teacher group read-only to a teacher", async() => {
    detail = { ...studentGroup({ type: "TEACHER", name: "Docentes UCI", leader: null }), members: [] };
    await renderDetail("TEACHER");

    expect(screen.getByText(/Solo lectura/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desactivar grupo" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar estudiante")).not.toBeInTheDocument();
  });

  it("edits the group sending only the changed fields and validates the student limit", async() => {
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const dialog = await screen.findByRole("dialog", { name: "Editar grupo" });

    fireEvent.change(within(dialog).getByLabelText("Límite de estudiantes"), { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    expect(await within(dialog).findByText("El límite de estudiantes debe ser un número entero mayor que 0.")).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText("Límite de estudiantes"), { target: { value: "25" } });
    fireEvent.change(within(dialog).getByLabelText(/Nombre del grupo/), { target: { value: "UCI Tarde" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(requests).toEqual([{ method: "PATCH", path: "/api/groups/g1", body: { name: "UCI Tarde", maxStudents: 25 }, search: "" }]);
  });

  it("searches students by role and leaves the current members out", async() => {
    await renderDetail();
    fireEvent.change(screen.getByLabelText("Buscar estudiante"), { target: { value: "es" } });

    const results = await screen.findByRole("list", { name: "Resultados de la búsqueda" });
    const query = new URLSearchParams(requests[0]?.search ?? "");

    expect(query.get("search")).toBe("es");
    expect(query.get("role")).toBe("STUDENT");
    expect(within(results).getByText("Esteban Paz")).toBeInTheDocument();
    expect(within(results).queryByText("Eva Ruiz")).not.toBeInTheDocument();
  });

  it("adds a member and refreshes the group", async() => {
    await renderDetail();
    fireEvent.change(screen.getByLabelText("Buscar estudiante"), { target: { value: "esteban" } });
    fireEvent.click(await screen.findByRole("button", { name: "Agregar a Esteban Paz" }));

    expect(await screen.findByText("Esteban Paz se agregó al grupo.")).toBeInTheDocument();
    expect(requests.find((request) => request.method === "POST")).toMatchObject({ path: "/api/groups/g1/members", body: { userId: "s3" } });
    await waitFor(() => expect(detailReads).toBeGreaterThan(1));
  });

  it.each([
    ["groups.student_already_in_group", 409, "Este estudiante ya pertenece a otro grupo activo de estudiantes."],
    ["groups.member_role_not_allowed", 422, "Ese usuario no puede integrar este grupo"],
  ])("shows the specific message of %s", async(code, status, message) => {
    server.use(http.post(apiUrl("/api/groups/g1/members"), () => errorResponse(code, status)));
    await renderDetail();
    fireEvent.change(screen.getByLabelText("Buscar estudiante"), { target: { value: "esteban" } });
    fireEvent.click(await screen.findByRole("button", { name: "Agregar a Esteban Paz" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("removes a member only after the confirmation", async() => {
    await renderDetail();
    fireEvent.click(within(members()).getByRole("button", { name: "Quitar a Eva Ruiz" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Quitar a Eva Ruiz del grupo?" });

    expect(requests).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Quitar" }));

    expect(await screen.findByText("Eva Ruiz ya no pertenece al grupo.")).toBeInTheDocument();
    expect(requests).toMatchObject([{ method: "DELETE", path: "/api/groups/g1/members/s2" }]);
  });

  it("assigns the leader after a confirmation that names the previous leader", async() => {
    await renderDetail();
    fireEvent.click(within(members()).getByRole("button", { name: "Hacer líder: Eva Ruiz" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Hacer líder a Eva Ruiz?" });

    expect(dialog).toHaveTextContent("Luis Gómez dejará de ser líder y seguirá como integrante.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hacer líder" }));

    expect(await screen.findByText("Eva Ruiz es ahora el líder del grupo.")).toBeInTheDocument();
    expect(requests).toMatchObject([{ method: "PATCH", path: "/api/groups/g1/lead", body: { userId: "s2" } }]);
  });

  it("deactivates the group after the confirmation", async() => {
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Desactivar grupo" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByText("El grupo quedó inactivo.")).toBeInTheDocument();
    expect(requests).toMatchObject([{ method: "PATCH", path: "/api/groups/g1", body: { isActive: false } }]);
  });

  it("shows the management permission message on a 403", async() => {
    server.use(http.delete(apiUrl("/api/groups/g1/members/:userId"), () => errorResponse("groups.management_forbidden", 403)));
    await renderDetail();
    fireEvent.click(within(members()).getByRole("button", { name: "Quitar a Eva Ruiz" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Quitar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes permiso para gestionar este grupo.");
  });

  it("tells when the group does not exist", async() => {
    server.use(http.get(GROUP_URL, () => errorResponse("groups.not_found", 404)));
    renderWithSession(<GroupDetailPage groupId="g1" />);

    expect(await screen.findByText("No se encontró el grupo o ya no tienes acceso a él.")).toBeInTheDocument();
  });
});
