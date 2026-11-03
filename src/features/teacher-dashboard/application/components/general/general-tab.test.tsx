/*
* Funcionalidad: GeneralTab tests
* Descripción: Component tests (vitest + msw) of the General tab of /teacher: greeting with name and role, statistics and recent students requested in parallel (a teacher adds myGroups=true, an admin does not), cards hidden when their datum is missing, the student link only when canView, the quick actions by role (Gestión de usuarios only for ADMIN) with the pending-grading badge, the empty list, the inline error of a 403 students list and the julio warning when both loads fail. Depends on Testing Library, msw, vitest, @shared/layouts/nav-badges, the teacher dashboard test helpers and the General tab components.
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
import { NavBadgeContext } from "@shared/layouts/nav-badges";
import type { NavBadgeCounts } from "@shared/layouts/nav-badges";
import type { Role } from "@shared/session/session.entity";
import type { AdminStudentListItemDTO } from "../../../api/dtos/teacher-general.dto";
import { apiUrl, envelope, errorResponse, renderTeacherDashboard } from "../../pages/teacher-dashboard-test-helpers";
import { GENERAL_TAB_COPY, GeneralTab } from "./general-tab";
import { QUICK_ACTIONS_COPY } from "./quick-actions";
import { RECENT_STUDENTS_COPY } from "./recent-students";

const server = setupServer();
let requests: string[];
let statisticsStatus: number;
let studentsStatus: number;
let statistics: Record<string, unknown>;
let students: AdminStudentListItemDTO[];

const studentRow = (id: string, name: string, overallProgress: number, canView: boolean): AdminStudentListItemDTO => ({
  canView,
  completedModules: 0,
  email: `${id}@ventylab.demo`,
  groupName: "Grupo A",
  groups: [{ id: "g1", name: "Grupo A" }],
  id,
  lastActivity: "2026-11-02T15:00:00.000Z",
  name,
  overallProgress,
  studentCode: null,
  totalModules: 4,
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  requests = [];
  statisticsStatus = 200;
  studentsStatus = 200;
  statistics = { activeStudents: 80, publishedModules: 12, totalLessons: 60, completionsToday: 3 };
  students = [studentRow("u1", "Ana Gómez", 75, true), studentRow("u2", "Bruno Díaz", 20, false)];
  server.use(
    http.get(apiUrl("/api/admin/statistics"), () => {
      requests.push("statistics");

      return statisticsStatus === 200 ? HttpResponse.json(envelope(statistics)) : errorResponse("internal", statisticsStatus);
    }),
    http.get(apiUrl("/api/admin/students"), ({ request }) => {
      requests.push(`students?${new URL(request.url).searchParams.toString()}`);

      return studentsStatus === 200 ? HttpResponse.json(envelope(students)) : errorResponse("auth.forbidden", studentsStatus);
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderGeneral(role: Role = "TEACHER", counts: NavBadgeCounts = {}) {
  const badges = { counts, setCount: () => undefined, hosts: 1, registerHost: () => () => undefined };

  return renderTeacherDashboard(
    <NavBadgeContext.Provider value={badges}>
      <GeneralTab />
    </NavBadgeContext.Provider>,
    role,
  );
}

describe("GeneralTab", () => {
  it("greets the teacher, shows the four cards and the recent students of their groups", async() => {
    renderGeneral();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/^(Buenos días|Buenas tardes|Buenas noches), Docente$/);
    expect(screen.getByText("Docente", { selector: ".MuiChip-label" })).toBeTruthy();

    const active = await screen.findByTestId("stat-card-activeStudents");

    expect(active.getAttribute("href")).toBe("/teacher/students");
    expect(active.textContent).toBe("Estudiantes activos80");
    expect(screen.getByTestId("stat-card-publishedModules").getAttribute("href")).toBe("/content");
    expect(screen.getByTestId("stat-card-totalLessons").textContent).toContain("60");
    expect(screen.getByTestId("stat-card-completionsToday").textContent).toContain("3");

    const feed = screen.getByRole("region", { name: RECENT_STUDENTS_COPY.title });

    await within(feed).findByText("Ana Gómez");
    expect(within(feed).getByRole("link", { name: "Ana Gómez" }).getAttribute("href")).toBe("/teacher/students/u1");
    // Out of scope: plain text, never a link to the detail.
    expect(within(feed).queryByRole("link", { name: "Bruno Díaz" })).toBeNull();
    expect(within(feed).getByText("Bruno Díaz")).toBeTruthy();
    expect(within(feed).getByRole("progressbar", { name: RECENT_STUDENTS_COPY.progressAria("Ana Gómez") }).getAttribute("aria-valuenow")).toBe("75");
    expect(within(feed).getByText("20 %")).toBeTruthy();
    expect(within(feed).getByRole("link", { name: RECENT_STUDENTS_COPY.viewAll }).getAttribute("href")).toBe("/teacher/students");

    // Both reads start together and the teacher scope is requested from the server.
    expect(requests).toContain("statistics");
    expect(requests).toContain("students?page=1&limit=5&sortBy=lastActivity&sortOrder=desc&myGroups=true");
  });

  it("hides a card whose datum is missing", async() => {
    statistics = { activeStudents: 80, publishedModules: 12, totalLessons: 60 };
    renderGeneral();

    await screen.findByTestId("stat-card-activeStudents");
    expect(screen.queryByTestId("stat-card-completionsToday")).toBeNull();
    expect(screen.getAllByRole("listitem").some((item) => item.textContent?.includes("Completados hoy"))).toBe(false);
  });

  it("lists the teacher quick actions with the pending badge and without user management", async() => {
    renderGeneral("TEACHER", { gradingPending: 4 });

    const actions = screen.getByRole("region", { name: QUICK_ACTIONS_COPY.title });
    const grading = within(actions).getByTestId("quick-action-grading");

    expect(grading.getAttribute("href")).toBe("/evaluations?tab=calificar");
    expect(grading.textContent).toContain("4 pendientes por calificar");
    expect(within(actions).getByTestId("quick-action-students").getAttribute("href")).toBe("/teacher/students");
    expect(within(actions).getByTestId("quick-action-content").getAttribute("href")).toBe("/content");
    expect(within(actions).getByTestId("quick-action-evaluations").getAttribute("href")).toBe("/evaluations");
    expect(within(actions).getByTestId("quick-action-lab").getAttribute("href")).toBe("/teacher/lab");
    expect(within(actions).queryByTestId("quick-action-users")).toBeNull();
    await screen.findByTestId("stat-card-activeStudents");
  });

  it("gives the admin every student and the user management shortcut", async() => {
    renderGeneral("ADMIN");

    expect(screen.getByText("Administrador", { selector: ".MuiChip-label" })).toBeTruthy();
    expect(screen.getByTestId("quick-action-users").getAttribute("href")).toBe("/admin/users");
    expect(screen.getByTestId("quick-action-grading").textContent).not.toMatch(/por calificar/);

    await screen.findByText("Ana Gómez");
    expect(requests).toContain("students?page=1&limit=5&sortBy=lastActivity&sortOrder=desc");
  });

  it("says when there are no recent students", async() => {
    students = [];
    renderGeneral();

    expect(await screen.findByText(RECENT_STUDENTS_COPY.empty)).toBeTruthy();
  });

  it("keeps the cards and shows an inline error when only the students list is forbidden", async() => {
    studentsStatus = 403;
    renderGeneral();

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain(RECENT_STUDENTS_COPY.errorTitle);
    expect(alert.textContent).toContain(RECENT_STUDENTS_COPY.forbidden);
    expect(await screen.findByTestId("stat-card-activeStudents")).toBeTruthy();
    expect(screen.queryByText(GENERAL_TAB_COPY.loadError)).toBeNull();
  });

  it("warns only when both loads fail and retries both", async() => {
    statisticsStatus = 500;
    studentsStatus = 500;
    renderGeneral();

    expect(await screen.findByText(GENERAL_TAB_COPY.loadError)).toBeTruthy();
    expect(screen.queryByTestId("stat-card-activeStudents")).toBeNull();
    expect(screen.getByRole("region", { name: QUICK_ACTIONS_COPY.title })).toBeTruthy();

    statisticsStatus = 200;
    studentsStatus = 200;
    requests = [];
    fireEvent.click(screen.getByRole("button", { name: GENERAL_TAB_COPY.retry }));

    expect(await screen.findByTestId("stat-card-activeStudents")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(GENERAL_TAB_COPY.loadError)).toBeNull());
    expect(requests).toContain("statistics");
    expect(requests.some((request) => request.startsWith("students?"))).toBe(true);
  });
});
