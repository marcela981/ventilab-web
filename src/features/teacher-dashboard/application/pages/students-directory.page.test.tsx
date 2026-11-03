/*
* Funcionalidad: StudentsDirectoryPage tests
* Descripción: Component tests of /teacher/students with MSW: the Directorio tab lists the server page (code, progress, group chips or "Sin grupo") and links to the detail with from=directory only when canView; the search reaches the URL after the debounce; Nombre/Progreso sort with aria-sort; "Mis grupos" sends myGroups=true and shows its empty state; the selection is labelled, clears when the page changes and opens "Conformar Grupo" (July texts) that creates the group, adds the members and shows July's success or the exact partial failure with the 409 reason per student; a 403 shows the directory error; the Estadísticas tab shows the four global cards (ADMIN too). Depends on Testing Library, msw, vitest, the teacher dashboard test helpers and the students directory page, components and entities.
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
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminStudentListItemDTO } from "../../api/dtos/students-directory.dto";
import { DIRECTORY_PANEL_COPY } from "../components/directory/directory-panel";
import { DIRECTORY_TABLE_COPY } from "../components/directory/directory-table";
import { DIRECTORY_TOOLBAR_COPY } from "../components/directory/directory-toolbar";
import { STATISTICS_PANEL_COPY } from "../components/directory/statistics-panel";
import { GROUP_BUILDER_COPY, MEMBER_FAILURE_REASONS } from "../entities/group-builder.entity";
import { DIRECTORY_ERROR_COPY } from "../entities/students-directory.entity";
import { StudentsDirectoryPage } from "./students-directory.page";
import { apiUrl, envelope, errorResponse, renderTeacherDashboard } from "./teacher-dashboard-test-helpers";

const router = vi.hoisted(() => ({
  pathname: "/teacher/students",
  asPath: "/teacher/students",
  isReady: true,
  query: {} as Record<string, string>,
  replace: vi.fn<(url: { query: Record<string, string> }) => Promise<boolean>>(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let studentQueries: URLSearchParams[];
let studentsStatus: number;
let createdBodies: unknown[];
let memberAdds: string[];

function studentDto(id: string, name: string | null, overrides: Partial<AdminStudentListItemDTO> = {}): AdminStudentListItemDTO {
  return {
    canView: true,
    completedModules: 1,
    email: `${id}@ventylab.demo`,
    groupName: null,
    groups: [],
    id,
    lastActivity: null,
    name,
    overallProgress: 40,
    studentCode: null,
    totalModules: 4,
    ...overrides,
  };
}

const STUDENTS = [
  studentDto("u1", "Ana Gómez", { studentCode: "2026-0001", groups: [{ id: "g1", name: "Grupo A" }], overallProgress: 75 }),
  studentDto("u2", "Bruno Díaz", { canView: false }),
  studentDto("u3", null),
];

const stats = {
  activeStudents: 80,
  publishedModules: 12,
  totalLessons: 40,
  completionsToday: 5,
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  studentQueries = [];
  studentsStatus = 200;
  createdBodies = [];
  memberAdds = [];
  router.query = {};
  router.replace.mockClear();
  server.use(
    http.get(apiUrl("/api/admin/students"), ({ request }) => {
      const params = new URL(request.url).searchParams;

      studentQueries.push(params);

      if (studentsStatus !== 200) {
        return errorResponse("auth.forbidden", studentsStatus);
      }

      const rows = params.get("myGroups") === "true" ? [] : STUDENTS;

      return HttpResponse.json(envelope(rows, { total: rows.length === 0 ? 0 : 60, pages: rows.length === 0 ? 0 : 3, page: Number(params.get("page")), limit: 25 }));
    }),
    http.get(apiUrl("/api/admin/statistics"), () => HttpResponse.json(envelope(stats))),
    http.post(apiUrl("/api/groups"), async({ request }) => {
      createdBodies.push(await request.json());

      return HttpResponse.json(envelope({ id: "new-group" }), { status: 201 });
    }),
    http.post(apiUrl("/api/groups/:id/members"), async({ request, params }) => {
      const body = await request.json() as { userId: string };

      memberAdds.push(`${String(params.id)}:${body.userId}`);

      return body.userId === "u2"
        ? errorResponse("groups.student_already_in_group", 409)
        : HttpResponse.json(envelope(null), { status: 201 });
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const lastReplaceQuery = () => router.replace.mock.calls.at(-1)?.[0].query;

async function renderDirectory(role: "TEACHER" | "ADMIN" = "TEACHER") {
  const view = renderTeacherDashboard(<StudentsDirectoryPage />, role);

  await screen.findByTestId("directory-row-u1");

  return view;
}

describe("StudentsDirectoryPage — Directorio", () => {
  it("lists the server page with code, progress and groups, linking only rows in scope", async() => {
    await renderDirectory();

    expect(screen.getByRole("heading", { level: 1, name: "Estudiantes" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Directorio" })).toHaveAttribute("aria-selected", "true");
    expect(studentQueries[0]?.toString()).toBe("page=1&limit=25&sortBy=name&sortOrder=asc");

    const ana = screen.getByTestId("directory-row-u1");

    expect(within(ana).getByText("2026-0001")).toBeInTheDocument();
    expect(within(ana).getByText("75%")).toBeInTheDocument();
    expect(within(ana).getByText("Grupo A")).toBeInTheDocument();
    expect(within(ana).getByRole("link", { name: DIRECTORY_TABLE_COPY.viewAria("Ana Gómez") }))
      .toHaveAttribute("href", "/teacher/students/u1?from=directory");

    const bruno = screen.getByTestId("directory-row-u2");

    expect(within(bruno).queryByRole("link")).not.toBeInTheDocument();
    expect(within(bruno).getByText(DIRECTORY_TABLE_COPY.noAccess)).toBeInTheDocument();
    expect(within(bruno).getByText(DIRECTORY_TABLE_COPY.noGroup)).toBeInTheDocument();
    // A student without a name shows the email.
    expect(within(screen.getByTestId("directory-row-u3")).getByText("u3@ventylab.demo")).toBeInTheDocument();
  });

  it("sends the search to the URL after the debounce, back on page 1", async() => {
    router.query = { page: "2" };
    await renderDirectory();

    fireEvent.change(screen.getByLabelText(DIRECTORY_TOOLBAR_COPY.search), { target: { value: " 2026-0001 " } });
    expect(router.replace).not.toHaveBeenCalled();

    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    expect(lastReplaceQuery()).toEqual({ q: "2026-0001" });
  });

  it("asks for the search, sort and scope of the URL", async() => {
    router.query = { q: "ana", sort: "-progress", page: "2" };
    renderTeacherDashboard(<StudentsDirectoryPage />);
    await screen.findByTestId("directory-row-u1");

    expect(studentQueries[0]?.toString()).toBe("page=2&limit=25&sortBy=progress&sortOrder=desc&search=ana");
    expect(screen.getByRole("columnheader", { name: /Progreso/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Nombre/ })).not.toHaveAttribute("aria-sort");
  });

  it("sorts by column through the URL and announces the sorted column", async() => {
    await renderDirectory();

    expect(screen.getByRole("columnheader", { name: /Nombre/ })).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: /Nombre/ }));
    expect(lastReplaceQuery()).toEqual({ sort: "-name" });

    fireEvent.click(screen.getByRole("button", { name: /Progreso/ }));
    expect(lastReplaceQuery()).toEqual({ sort: "-progress" });
  });

  it("keeps the tab when the filter changes and shows the Mis grupos empty state", async() => {
    router.query = { tab: "directorio" };
    const view = await renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.mine }));
    expect(lastReplaceQuery()).toEqual({ tab: "directorio", scope: "mine" });

    router.query = { tab: "directorio", scope: "mine" };
    view.rerender(<StudentsDirectoryPage />);

    expect(await screen.findByText(DIRECTORY_PANEL_COPY.emptyMineTitle)).toBeInTheDocument();
    expect(studentQueries.at(-1)?.get("myGroups")).toBe("true");
    expect(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.mine })).toHaveAttribute("aria-pressed", "true");
  });

  it("labels the checkboxes and clears the selection when the page changes", async() => {
    const view = await renderDirectory();

    fireEvent.click(screen.getByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectRow("Ana Gómez") }));
    expect(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.buildGroup(1) })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectPage }));
    expect(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.buildGroup(3) })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(lastReplaceQuery()).toEqual({ page: "2" });

    router.query = { page: "2" };
    view.rerender(<StudentsDirectoryPage />);

    await waitFor(() => expect(screen.queryByRole("button", { name: /Conformar Grupo/ })).not.toBeInTheDocument());
    expect(await screen.findByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectRow("Ana Gómez") })).not.toBeChecked();
  });

  it("shows the directory error on a 403", async() => {
    studentsStatus = 403;
    renderTeacherDashboard(<StudentsDirectoryPage />);

    expect(await screen.findByText(DIRECTORY_ERROR_COPY.forbidden)).toBeInTheDocument();
    expect(screen.getByText(DIRECTORY_PANEL_COPY.loadErrorTitle)).toBeInTheDocument();
  });
});

describe("StudentsDirectoryPage — Conformar Grupo", () => {
  it("creates the group, adds every student and closes after July's success", async() => {
    await renderDirectory();

    fireEvent.click(screen.getByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectRow("Ana Gómez") }));
    fireEvent.click(screen.getByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectRow("u3@ventylab.demo") }));
    fireEvent.click(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.buildGroup(2) }));

    const dialog = await screen.findByRole("dialog", { name: new RegExp(GROUP_BUILDER_COPY.title) });
    const create = within(dialog).getByRole("button", { name: GROUP_BUILDER_COPY.create });

    expect(within(dialog).getByLabelText(new RegExp(GROUP_BUILDER_COPY.name))).toHaveAttribute("placeholder", GROUP_BUILDER_COPY.namePlaceholder);
    expect(within(dialog).getByLabelText(GROUP_BUILDER_COPY.semester)).toHaveAttribute("placeholder", GROUP_BUILDER_COPY.semesterPlaceholder);
    expect(within(dialog).getByRole("list", { name: GROUP_BUILDER_COPY.members })).toHaveTextContent("Ana Gómez");
    expect(create).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(new RegExp(GROUP_BUILDER_COPY.name)), { target: { value: " Grupo C " } });
    fireEvent.change(within(dialog).getByLabelText(GROUP_BUILDER_COPY.semester), { target: { value: "2026-1" } });
    fireEvent.click(create);

    expect(await within(dialog).findByText(GROUP_BUILDER_COPY.success)).toBeInTheDocument();
    expect(createdBodies).toEqual([{ name: "Grupo C", semester: "2026-1", type: "STUDENT" }]);
    expect([...memberAdds].sort()).toEqual(["new-group:u1", "new-group:u3"]);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 4000 });
    expect(screen.queryByRole("button", { name: /Conformar Grupo/ })).not.toBeInTheDocument();
  });

  it("shows July's partial failure with the reason of each student and stays open", async() => {
    await renderDirectory();

    fireEvent.click(screen.getByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectRow("Ana Gómez") }));
    fireEvent.click(screen.getByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectRow("Bruno Díaz") }));
    fireEvent.click(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.buildGroup(2) }));

    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText(new RegExp(GROUP_BUILDER_COPY.name)), { target: { value: "Grupo C" } });
    fireEvent.click(within(dialog).getByRole("button", { name: GROUP_BUILDER_COPY.create }));

    expect(await within(dialog).findByText("Grupo creado, pero 1 estudiante(s) no pudieron agregarse.")).toBeInTheDocument();
    expect(within(dialog).getByRole("list", { name: GROUP_BUILDER_COPY.failureList }))
      .toHaveTextContent(`Bruno Díaz: ${MEMBER_FAILURE_REASONS["groups.student_already_in_group"]}`);
    expect(createdBodies).toEqual([{ name: "Grupo C", type: "STUDENT" }]);

    fireEvent.click(within(dialog).getByRole("button", { name: GROUP_BUILDER_COPY.close }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Conformar Grupo/ })).not.toBeInTheDocument();
  });

  it("keeps the selection when the dialog is cancelled", async() => {
    await renderDirectory();

    fireEvent.click(screen.getByRole("checkbox", { name: DIRECTORY_TABLE_COPY.selectRow("Ana Gómez") }));
    fireEvent.click(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.buildGroup(1) }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: GROUP_BUILDER_COPY.cancel }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(createdBodies).toEqual([]);
    expect(screen.getByRole("button", { name: DIRECTORY_TOOLBAR_COPY.buildGroup(1) })).toBeInTheDocument();
  });
});

describe("StudentsDirectoryPage — Estadísticas", () => {
  it.each(["TEACHER", "ADMIN"] as const)("shows the four global cards (%s)", async(role) => {
    router.query = { tab: "estadisticas" };
    renderTeacherDashboard(<StudentsDirectoryPage />, role);

    expect(await screen.findByTestId("directory-stat-activeStudents")).toHaveTextContent(`${STATISTICS_PANEL_COPY.cards.activeStudents.title}80`);
    expect(screen.getByTestId("directory-stat-publishedModules")).toHaveTextContent("12");
    expect(screen.getByTestId("directory-stat-totalLessons")).toHaveTextContent("40");
    expect(screen.getByTestId("directory-stat-completionsToday")).toHaveTextContent("5");
    expect(screen.getByRole("tab", { name: "Estadísticas" })).toHaveAttribute("aria-selected", "true");
  });

  it("selects the tab through the URL", async() => {
    await renderDirectory();

    fireEvent.click(screen.getByRole("tab", { name: "Estadísticas" }));
    expect(lastReplaceQuery()).toEqual({ tab: "estadisticas" });
  });
});
