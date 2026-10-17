/*
* Funcionalidad: Teacher dashboard page tests
* Descripción: /teacher with msw: the first STUDENT group is shown by default (`GET /api/groups?type=STUDENT`), the group of ?groupId wins and choosing another group writes it to the URL; the cards show the envelope totals of the grading queue and the active assignments and only the scheduled reservations of the group; the students table lists the dashboard rows with API values, highlights the student with a failed published evaluation (legend and "En riesgo" label), filters by name or email and sorts by an API column; the charts receive the API histogram of the selected evaluation (charts stubbed); a 403 of the analytics shows "No tienes acceso a este grupo"; "Exportar CSV" requests the export path and hands the file to the browser. v1.1 (O3 review): switching group shows the loading state and not the previous rows; a 500 on the new group shows the error. Depends on vitest, msw, Testing Library and the teacher dashboard test helpers.
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
import type { GradeDistributionChartProps, ModuleProgressChartProps } from "../components/dashboard-charts";
import { DASHBOARD_CARDS_COPY } from "../components/dashboard-cards";
import { STUDENTS_TABLE_COPY } from "../components/students-table";
import {
  apiUrl,
  assignmentDto,
  envelope,
  errorResponse,
  groupDto,
  queueItemDto,
  renderTeacherDashboard,
  reservationDto,
  rowDto,
  statsDto,
  treeDto,
} from "./teacher-dashboard-test-helpers";
import { TEACHER_DASHBOARD_COPY, TeacherDashboardPage } from "./teacher-dashboard.page";

const router = vi.hoisted(() => ({
  pathname: "/teacher",
  asPath: "/teacher",
  isReady: true,
  query: {} as Record<string, string>,
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.mock("../components/lazy-dashboard-charts", () => ({
  GradeDistributionChart: ({ title, passingGrade, histogram }: GradeDistributionChartProps) => (
    <div data-testid="grade-chart">{`${title}|${passingGrade}|${histogram.map((bin) => `${bin.from}-${bin.to}:${bin.count}`).join(",")}`}</div>
  ),
  ModuleProgressChart: ({ studentName, modules }: ModuleProgressChartProps) => (
    <div data-testid="module-chart">{`${studentName}|${modules.map((module) => `${module.title}:${module.percentage}`).join(",")}`}</div>
  ),
}));

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let requests: string[];
let dashboardStatus: number;
let g2Gate: Promise<void> | null;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  requests = [];
  dashboardStatus = 200;
  g2Gate = null;
  router.query = {};
  router.replace.mockClear();
  server.use(
    http.get(apiUrl("/api/groups"), ({ request }) => {
      requests.push(`groups?${new URL(request.url).searchParams.toString()}`);

      return HttpResponse.json(envelope([groupDto("g1", "Grupo A"), groupDto("g2", "Grupo B")]));
    }),
    http.get(apiUrl("/api/analytics/groups/:groupId/dashboard"), async({ params }) => {
      const groupId = String(params.groupId);

      requests.push(`dashboard:${groupId}`);

      if (groupId === "g2" && g2Gate) {
        await g2Gate;
      }

      if (groupId === "g2" && dashboardStatus === 500) {
        return errorResponse("internal", 500);
      }

      if (dashboardStatus !== 200 && dashboardStatus !== 500) {
        return errorResponse("analytics.out_of_scope", dashboardStatus);
      }

      return HttpResponse.json(envelope({
        generatedAt: "2026-10-16T12:00:00.000Z",
        groupId,
        groupName: groupId === "g1" ? "Grupo A" : "Grupo B",
        students: [
          rowDto("u1", "Ana Gómez"),
          rowDto("u2", "Bruno Díaz", {
            grades: {
              averageGrade: 2.4,
              evaluations: [
                { evaluationId: "ev-1", evaluationTitle: "Parcial de PEEP", attemptNumber: 1, grade: 2.4, passed: false, publishedAt: "2026-10-10T15:00:00.000Z" },
              ],
            },
          }),
        ],
      }));
    }),
    http.get(apiUrl("/api/evaluation-grading/queue"), ({ request }) => {
      requests.push(`queue?${new URL(request.url).searchParams.toString()}`);

      return HttpResponse.json(envelope([queueItemDto("at-1", "u1", "Taller")], { total: 7, pages: 7, page: 1, limit: 1 }));
    }),
    http.get(apiUrl("/api/evaluation-assignments"), ({ request }) => {
      requests.push(`assignments?${new URL(request.url).searchParams.toString()}`);

      return HttpResponse.json(envelope([assignmentDto("as-1", "Quiz de volúmenes")], { total: 2, pages: 1, page: 1, limit: 5 }));
    }),
    http.get(apiUrl("/api/reservations"), () => HttpResponse.json(envelope([
      reservationDto("r1", "g1", "Práctica del grupo A"),
      reservationDto("r2", "g2", "Práctica del grupo B"),
      reservationDto("r3", "g1", "Cancelada", "CANCELLED"),
    ]))),
    http.get(apiUrl("/api/analytics/evaluations/:evaluationId/stats"), ({ params }) => {
      requests.push(`stats:${String(params.evaluationId)}`);

      return HttpResponse.json(envelope(statsDto(String(params.evaluationId), { title: "Parcial de PEEP" })));
    }),
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function studentRow(name: string): HTMLElement {
  const row = screen.getByRole("link", { name }).closest("tr");

  if (!row) {
    throw new Error(`No row for ${name}`);
  }

  return row;
}

async function tableReady(): Promise<void> {
  await screen.findByRole("link", { name: "Ana Gómez" });
}

describe("TeacherDashboardPage", () => {
  it("shows the first group with its cards and students from the API", async() => {
    renderTeacherDashboard(<TeacherDashboardPage />);
    await tableReady();

    expect(requests).toContain("groups?type=STUDENT");
    expect(requests).toContain("dashboard:g1");
    expect(requests.some((request) => request.startsWith("queue?") && request.includes("groupId=g1") && request.includes("limit=1"))).toBe(true);
    expect(requests.some((request) => request.startsWith("assignments?") && request.includes("state=ACTIVE") && request.includes("groupId=g1"))).toBe(true);

    const pending = await screen.findByRole("region", { name: DASHBOARD_CARDS_COPY.pendingTitle });

    expect(within(pending).getByText("7")).toBeInTheDocument();
    const active = screen.getByRole("region", { name: DASHBOARD_CARDS_COPY.activeTitle });

    expect(within(active).getByText("2")).toBeInTheDocument();
    expect(within(active).getByRole("link", { name: "Quiz de volúmenes" })).toHaveAttribute("href", "/grading/evaluations/ev-as-1");
    const reservations = await screen.findByRole("region", { name: DASHBOARD_CARDS_COPY.reservationsTitle });

    expect(within(reservations).getByText("Práctica del grupo A")).toBeInTheDocument();
    expect(within(reservations).queryByText("Práctica del grupo B")).not.toBeInTheDocument();
    expect(within(reservations).queryByText("Cancelada")).not.toBeInTheDocument();

    const ana = studentRow("Ana Gómez");

    expect(within(ana).getByRole("link", { name: "Ana Gómez" })).toHaveAttribute("href", "/teacher/students/u1?groupId=g1");
    expect(within(ana).getByText("4,1")).toBeInTheDocument();
    expect(within(ana).getByText("81,5")).toBeInTheDocument();
    expect(within(ana).getByText("42,3 s")).toBeInTheDocument();
    expect(within(ana).getByText("1,5 h")).toBeInTheDocument();
    expect(within(ana).getByText("Chat libre: 7 llamadas · útil 66,7 %")).toBeInTheDocument();
  });

  it("highlights the student with a failed published evaluation and explains it", async() => {
    renderTeacherDashboard(<TeacherDashboardPage />);
    await tableReady();

    expect(screen.getByText(STUDENTS_TABLE_COPY.legend)).toBeInTheDocument();
    expect(studentRow("Bruno Díaz")).toHaveAttribute("data-risk", "true");
    expect(within(studentRow("Bruno Díaz")).getByText(STUDENTS_TABLE_COPY.atRisk)).toBeInTheDocument();
    expect(studentRow("Ana Gómez")).toHaveAttribute("data-risk", "false");
    expect(within(studentRow("Ana Gómez")).queryByText(STUDENTS_TABLE_COPY.atRisk)).not.toBeInTheDocument();
  });

  it("filters by name or email and sorts by an API column", async() => {
    renderTeacherDashboard(<TeacherDashboardPage />);
    await tableReady();

    const names = () => screen.getAllByRole("link").map((link) => link.textContent).filter((text) => text === "Ana Gómez" || text === "Bruno Díaz");

    fireEvent.click(screen.getByRole("button", { name: STUDENTS_TABLE_COPY.columns.averageGrade }));
    expect(names()).toEqual(["Ana Gómez", "Bruno Díaz"]);
    fireEvent.click(screen.getByRole("button", { name: STUDENTS_TABLE_COPY.columns.averageGrade }));
    expect(names()).toEqual(["Bruno Díaz", "Ana Gómez"]);

    fireEvent.change(screen.getByLabelText(STUDENTS_TABLE_COPY.filter), { target: { value: "u2@" } });
    expect(names()).toEqual(["Bruno Díaz"]);
    fireEvent.change(screen.getByLabelText(STUDENTS_TABLE_COPY.filter), { target: { value: "zzz" } });
    expect(screen.getByText(STUDENTS_TABLE_COPY.noMatches)).toBeInTheDocument();
  });

  it("expands a row with its progress labelled by the curriculum titles", async() => {
    renderTeacherDashboard(<TeacherDashboardPage />);
    await tableReady();

    fireEvent.click(screen.getByRole("button", { name: STUDENTS_TABLE_COPY.expand("Ana Gómez") }));

    expect(await screen.findByText("Fisiología")).toBeInTheDocument();
    expect(screen.getByText("Fundamentos")).toBeInTheDocument();
    expect(screen.getByText("Nivel básico")).toBeInTheDocument();
  });

  it("charts the API histogram of the selected evaluation and one student's module progress", async() => {
    renderTeacherDashboard(<TeacherDashboardPage />);
    await tableReady();

    expect(await screen.findByTestId("grade-chart")).toHaveTextContent("Parcial de PEEP|3|2.5-3:1,3-3.5:2,4-4.5:2");
    expect(requests).toContain("stats:ev-1");
    expect(await screen.findByTestId("module-chart")).toHaveTextContent("Ana Gómez|Fisiología:80,Modos ventilatorios:20");
  });

  it("reads the group of the URL and writes the chosen group to it", async() => {
    router.query = { groupId: "g2" };
    renderTeacherDashboard(<TeacherDashboardPage />);
    await tableReady();

    expect(requests).toContain("dashboard:g2");
    expect(requests).not.toContain("dashboard:g1");

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /^Grupo/ }));
    fireEvent.click(screen.getByRole("option", { name: /Grupo A/ }));

    expect(router.replace).toHaveBeenCalledWith({ pathname: "/teacher", query: { groupId: "g1" } }, undefined, { shallow: true });
  });

  it("never shows the previous group's rows while another group loads", async() => {
    let release: () => void = () => undefined;

    g2Gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    router.query = { groupId: "g1" };
    const view = renderTeacherDashboard(<TeacherDashboardPage />);

    await tableReady();
    router.query = { groupId: "g2" };
    view.rerender(<TeacherDashboardPage />);

    expect(await screen.findByRole("status", { name: TEACHER_DASHBOARD_COPY.loadingDashboard })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ana Gómez" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: TEACHER_DASHBOARD_COPY.export })).toBeDisabled();
    release();
    await tableReady();
    expect(requests).toContain("dashboard:g2");
  });

  it("shows the error of the new group instead of the previous group's rows", async() => {
    router.query = { groupId: "g1" };
    const view = renderTeacherDashboard(<TeacherDashboardPage />);

    await tableReady();
    dashboardStatus = 500;
    router.query = { groupId: "g2" };
    view.rerender(<TeacherDashboardPage />);

    expect(await screen.findByText(TEACHER_DASHBOARD_COPY.dashboardErrorTitle)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ana Gómez" })).not.toBeInTheDocument();
  });

  it("shows the no-access state when the analytics answer 403", async() => {
    router.query = { groupId: "other" };
    dashboardStatus = 403;
    renderTeacherDashboard(<TeacherDashboardPage />);

    expect(await screen.findByText(TEACHER_DASHBOARD_COPY.forbiddenTitle)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: TEACHER_DASHBOARD_COPY.export })).toBeDisabled();
  });

  it("exports the group CSV from the export endpoint", async() => {
    const exported: string[] = [];
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    URL.createObjectURL = vi.fn(() => "blob:csv");
    URL.revokeObjectURL = vi.fn();
    server.use(http.get(apiUrl("/api/analytics/groups/:groupId/export.csv"), ({ params }) => {
      exported.push(String(params.groupId));

      return new HttpResponse("userId,email\n", { headers: { "Content-Type": "text/csv" } });
    }));

    try {
      renderTeacherDashboard(<TeacherDashboardPage />);
      await tableReady();

      fireEvent.click(screen.getByRole("button", { name: TEACHER_DASHBOARD_COPY.export }));

      await waitFor(() => expect(exported).toEqual(["g1"]));
      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:csv"));
    } finally {
      click.mockRestore();
      URL.createObjectURL = original.createObjectURL;
      URL.revokeObjectURL = original.revokeObjectURL;
    }
  });
});
