/*
* Funcionalidad: Admin users page tests
* Descripción: /admin/users with msw: the rows of `GET /api/users` with the URL filters sent as the query and a filter change written back to the URL; the own account keeps its actions disabled with the reason; the role dialog shows the warning of its effects and sends `PATCH /api/users/{id}/role`; a superadmin 403 shows "Esta cuenta está protegida (superadministrador) y no se puede modificar." inside the dialog; deactivating asks for confirmation before `PATCH /api/users/{id}/status` and a superadmin 403 there becomes an error toast. Depends on vitest, msw, Testing Library and the admin console test helpers. v1.1 (O4a review): with the app keepPreviousData default a role filter change shows the loading state instead of the previous rows and a 500 shows the error; a page beyond the last one moves to the last page; Escape does not close the role dialog while its PATCH is pending.
* Versión: 1.1
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
import { USERS_TABLE_COPY } from "../components/users-table";
import { SUPERADMIN_PROTECTED_MESSAGE } from "../entities/admin-console-error-messages";
import { ROLE_CHANGE_EFFECTS } from "../entities/admin-users.entity";
import { ADMIN_USERS_COPY, AdminUsersPage } from "./admin-users.page";
import { apiUrl, envelope, errorResponse, groupDto, renderAdminConsole, SESSION_USER_ID, userDto } from "./admin-console-test-helpers";

const router = vi.hoisted(() => ({
  pathname: "/admin/users",
  asPath: "/admin/users",
  isReady: true,
  query: {} as Record<string, string>,
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let listQueries: string[];
let mutations: { path: string, body: unknown }[];
let mutationStatus: number;
let listStatus: number;
let listTotal: number;
let releaseList: (() => void) | null;
let holdList: boolean;
let releaseMutation: (() => void) | null;
let holdMutation: boolean;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listQueries = [];
  mutations = [];
  mutationStatus = 200;
  listStatus = 200;
  listTotal = 3;
  releaseList = null;
  holdList = false;
  releaseMutation = null;
  holdMutation = false;
  router.query = {};
  router.replace.mockClear();
  server.use(
    http.get(apiUrl("/api/users"), async({ request }) => {
      const params = new URL(request.url).searchParams;

      listQueries.push(params.toString());

      if (holdList) {
        await new Promise<void>((resolve) => {
          releaseList = resolve;
        });
      }

      if (listStatus !== 200) {
        return errorResponse("internal_error", listStatus);
      }

      if (Number(params.get("page")) > 1) {
        return HttpResponse.json(envelope([], { total: listTotal, pages: 1, page: Number(params.get("page")), limit: 20 }));
      }

      return HttpResponse.json(envelope([
        userDto("u1", "Ana Gómez"),
        userDto(SESSION_USER_ID, "Administradora", { role: "ADMIN" }),
        userDto("root", "Raíz", { role: "ADMIN" }),
      ], { total: listTotal, pages: 1, page: 1, limit: 20 }));
    }),
    http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([groupDto("g1", "Grupo A")]))),
    http.patch(apiUrl("/api/users/:id/:field"), async({ params, request }) => {
      mutations.push({ path: `${String(params.id)}/${String(params.field)}`, body: await request.json() });

      if (holdMutation) {
        await new Promise<void>((resolve) => {
          releaseMutation = resolve;
        });
      }

      if (mutationStatus === 403) {
        return errorResponse(params.field === "role" ? "users.superadmin_role_immutable" : "users.superadmin_status_immutable", 403);
      }

      return HttpResponse.json(envelope(null));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function rowActions(name: string) {
  return screen.getByRole("group", { name: USERS_TABLE_COPY.actionsFor(name) });
}

describe("AdminUsersPage", () => {
  it("lists the users of the API with the URL filters and writes a filter change to the URL", async() => {
    router.query = { search: "ana", role: "STUDENT", isActive: "true" };
    renderAdminConsole(<AdminUsersPage />);

    expect(await screen.findByText("Ana Gómez")).toBeInTheDocument();
    expect(screen.getByText("u1@ventylab.demo")).toBeInTheDocument();
    expect(listQueries[0]).toBe("page=1&limit=20&sortBy=name&sortOrder=asc&search=ana&role=STUDENT&isActive=true");
    expect(await screen.findByRole("option", { name: "Grupo A (estudiantes)" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Grupo"), { target: { value: "g1" } });

    expect(router.replace).toHaveBeenCalledWith(
      { pathname: "/admin/users", query: { search: "ana", role: "STUDENT", groupId: "g1", isActive: "true" } },
      undefined,
      { shallow: true },
    );
  });

  it("keeps the actions of the own account disabled with the reason", async() => {
    renderAdminConsole(<AdminUsersPage />);

    const own = within(await screen.findByRole("group", { name: USERS_TABLE_COPY.actionsFor("Administradora") }));

    expect(own.getByRole("button", { name: USERS_TABLE_COPY.changeRole })).toBeDisabled();
    expect(own.getByRole("button", { name: USERS_TABLE_COPY.deactivate })).toBeDisabled();
    expect(screen.getByText("No puedes cambiar tu propia cuenta.")).toBeInTheDocument();
    expect(within(rowActions("Ana Gómez")).getByRole("button", { name: USERS_TABLE_COPY.changeRole })).toBeEnabled();
  });

  it("warns about the effects of a role change and sends it", async() => {
    renderAdminConsole(<AdminUsersPage />);
    await screen.findByText("Ana Gómez");

    fireEvent.click(within(rowActions("Ana Gómez")).getByRole("button", { name: USERS_TABLE_COPY.changeRole }));

    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Cambiar rol" });

    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Nuevo rol"), { target: { value: "TEACHER" } });

    expect(within(dialog).getByText(ROLE_CHANGE_EFFECTS.leavesStudentGroups)).toBeInTheDocument();
    expect(within(dialog).getByText(ROLE_CHANGE_EFFECTS.sessionRefreshed)).toBeInTheDocument();
    expect(within(dialog).getByText(ROLE_CHANGE_EFFECTS.notified)).toBeInTheDocument();

    fireEvent.click(confirm);

    expect(await screen.findByText("Ana Gómez ahora tiene el rol Docente.")).toBeInTheDocument();
    expect(mutations).toEqual([{ path: "u1/role", body: { role: "TEACHER" } }]);
    await waitFor(() => expect(listQueries).toHaveLength(2));
  });

  it("shows the superadmin protection message inside the role dialog on a 403", async() => {
    mutationStatus = 403;
    renderAdminConsole(<AdminUsersPage />);
    await screen.findByText("Raíz");

    fireEvent.click(within(rowActions("Raíz")).getByRole("button", { name: USERS_TABLE_COPY.changeRole }));

    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Nuevo rol"), { target: { value: "TEACHER" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cambiar rol" }));

    expect(await within(dialog).findByText(SUPERADMIN_PROTECTED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("asks for confirmation before deactivating an account", async() => {
    renderAdminConsole(<AdminUsersPage />);
    await screen.findByText("Ana Gómez");

    fireEvent.click(within(rowActions("Ana Gómez")).getByRole("button", { name: USERS_TABLE_COPY.deactivate }));

    const dialog = await screen.findByRole("dialog", { name: ADMIN_USERS_COPY.deactivateTitle("Ana Gómez") });

    expect(within(dialog).getByText(ADMIN_USERS_COPY.deactivateDescription)).toBeInTheDocument();
    expect(mutations).toEqual([]);

    fireEvent.click(within(dialog).getByRole("button", { name: ADMIN_USERS_COPY.deactivate }));

    expect(await screen.findByText(ADMIN_USERS_COPY.deactivated("Ana Gómez"))).toBeInTheDocument();
    expect(mutations).toEqual([{ path: "u1/status", body: { isActive: false } }]);
  });

  it("shows the loading state, not the previous rows, when the role filter changes", async() => {
    const { rerender } = renderAdminConsole(<AdminUsersPage />, { keepPreviousData: true });

    expect(await screen.findByText("Ana Gómez")).toBeInTheDocument();

    holdList = true;
    router.query = { role: "TEACHER" };
    rerender(<AdminUsersPage />);

    expect(await screen.findByRole("status", { name: ADMIN_USERS_COPY.loading })).toBeInTheDocument();
    expect(screen.queryByText("Ana Gómez")).not.toBeInTheDocument();

    releaseList?.();

    expect(await screen.findByText("Ana Gómez")).toBeInTheDocument();
    expect(listQueries.at(-1)).toContain("role=TEACHER");
  });

  it("shows the error of a failing request even after rows were shown", async() => {
    const { rerender } = renderAdminConsole(<AdminUsersPage />, { keepPreviousData: true });

    expect(await screen.findByText("Ana Gómez")).toBeInTheDocument();

    listStatus = 500;
    router.query = { role: "TEACHER" };
    rerender(<AdminUsersPage />);

    expect(await screen.findByText(ADMIN_USERS_COPY.loadErrorTitle)).toBeInTheDocument();
    expect(screen.queryByText("Ana Gómez")).not.toBeInTheDocument();
  });

  it("moves a page beyond the last one to the last page", async() => {
    router.query = { page: "5" };
    renderAdminConsole(<AdminUsersPage />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: "/admin/users", query: {} }, undefined, { shallow: true }));
    expect(screen.queryByText(ADMIN_USERS_COPY.emptyTitle)).not.toBeInTheDocument();
  });

  it("keeps the role dialog open on Escape while the change is pending", async() => {
    holdMutation = true;
    renderAdminConsole(<AdminUsersPage />);
    await screen.findByText("Ana Gómez");

    fireEvent.click(within(rowActions("Ana Gómez")).getByRole("button", { name: USERS_TABLE_COPY.changeRole }));

    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Nuevo rol"), { target: { value: "TEACHER" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cambiar rol" }));
    await waitFor(() => expect(mutations).toHaveLength(1));

    fireEvent.keyDown(dialog, { key: "Escape" });

    // Closing would unmount the form (no user): the role field must still be there.
    expect(within(screen.getByRole("dialog")).getByLabelText("Nuevo rol")).toBeInTheDocument();

    releaseMutation?.();

    expect(await screen.findByText("Ana Gómez ahora tiene el rol Docente.")).toBeInTheDocument();
  });

  it("shows the superadmin protection message as a toast when the status change is refused", async() => {
    mutationStatus = 403;
    renderAdminConsole(<AdminUsersPage />);
    await screen.findByText("Raíz");

    fireEvent.click(within(rowActions("Raíz")).getByRole("button", { name: USERS_TABLE_COPY.deactivate }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: ADMIN_USERS_COPY.deactivate }));

    expect(await screen.findByText(SUPERADMIN_PROTECTED_MESSAGE)).toBeInTheDocument();
  });
});
