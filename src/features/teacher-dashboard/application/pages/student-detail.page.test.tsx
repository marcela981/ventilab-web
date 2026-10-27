/*
* Funcionalidad: Student detail page tests
* Descripción: /teacher/students/[userId] with msw: header from `GET /api/users/students/{id}`, progress tree from `GET /api/progress/users/{userId}/summary` in curriculum order with the curriculum titles, published grades from `GET /api/evaluation-grading/students/{userId}/grades` linked to their attempt, the student's pending attempts from the queue filtered by `studentId` and paged with the API pagination, simulation sessions from `GET /api/simulation/sessions/history?userId` with the case title and replay links, the truncated flag and "Cargar anteriores" requesting the previous timeline window; the grades do not depend on ?groupId; a 403 of the student shows the no-access state; neither notes nor AI conversations are requested (unhandled requests fail). v1.1 (O3 review): the possibly-incomplete note of the pending attempts. v1.2 (closure B2): grades, pending attempts and sessions come from the staff endpoints (no group dashboard row, no 50-row group queue scan and its warning, no sessions from the timeline). Depends on vitest, msw, Testing Library and the teacher dashboard test helpers. v1.3 (S8): fixtures carry the regenerated block 1 contract fields (session patient null).
* Versión: 1.3
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
import type { SimulationSessionDTO, StudentGradeDTO } from "../../api/dtos/teacher-dashboard.dto";
import { STUDENT_ACTIVITY_COPY } from "../components/student-activity";
import { STUDENT_GRADES_COPY } from "../components/student-grades";
import {
  apiUrl,
  envelope,
  errorResponse,
  queueItemDto,
  renderTeacherDashboard,
  studentDto,
  summaryDto,
  timelineEntryDto,
  treeDto,
} from "./teacher-dashboard-test-helpers";
import { STUDENT_DETAIL_COPY, StudentDetailPage } from "./student-detail.page";

const router = vi.hoisted(() => ({
  pathname: "/teacher/students/[userId]",
  asPath: "/teacher/students/u1",
  isReady: true,
  query: {} as Record<string, string>,
  replace: () => Promise.resolve(true),
  push: () => Promise.resolve(true),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let timelineQueries: Array<{ from: string, to: string }>;
let queueQueries: URLSearchParams[];
let sessionQueries: URLSearchParams[];
let studentStatus: number;

function gradeDto(attemptId: string, title: string, overrides: Partial<StudentGradeDTO> = {}): StudentGradeDTO {
  return {
    attemptId,
    attemptNumber: 1,
    evaluationId: "ev-1",
    evaluationTitle: title,
    evaluationType: "EXAM",
    grade: 4.1,
    legacy: false,
    maxScore: 10,
    moduleId: "m1",
    moduleTitle: "Fisiología",
    passed: true,
    publishedAt: "2026-10-10T15:00:00.000Z",
    score: 8.2,
    ...overrides,
  };
}

function sessionDto(id: string, caseTitle: string | null, overrides: Partial<SimulationSessionDTO> = {}): SimulationSessionDTO {
  return {
    attemptId: null,
    caseId: `case-${id}`,
    caseTitle,
    endedAt: "2026-10-14T15:30:00.000Z",
    engineVersion: "1",
    id,
    lastEventAt: "2026-10-14T15:30:00.000Z",
    lastSimTimeMs: 0,
    mode: "FREE",
    patient: null,
    questionId: null,
    score: 88,
    startedAt: "2026-10-14T15:00:00.000Z",
    status: "ENDED",
    timeMultiplier: 1,
    userId: "u1",
    ...overrides,
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  timelineQueries = [];
  queueQueries = [];
  sessionQueries = [];
  studentStatus = 200;
  router.query = { userId: "u1", groupId: "g1" };
  server.use(
    http.get(apiUrl("/api/users/students/:id"), ({ params }) => (studentStatus === 200
      ? HttpResponse.json(envelope(studentDto(String(params.id), "Ana Gómez")))
      : errorResponse("forbidden", studentStatus))),
    http.get(apiUrl("/api/progress/users/:userId/summary"), () => HttpResponse.json(envelope(summaryDto()))),
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/evaluation-grading/students/:userId/grades"), () => HttpResponse.json(envelope([
      gradeDto("at-9", "Parcial de PEEP"),
      gradeDto("at-8", "Quiz de volúmenes", { passed: false, grade: 2.4, moduleTitle: null }),
    ]))),
    http.get(apiUrl("/api/evaluation-grading/queue"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      const page = Number(params.get("page") ?? "1");

      queueQueries.push(params);

      return HttpResponse.json(envelope(
        [queueItemDto(page === 1 ? "at-1" : "at-11", "u1", page === 1 ? "Taller de curvas" : "Taller de presiones")],
        { total: 12, pages: 2, page, limit: 10 },
      ));
    }),
    http.get(apiUrl("/api/simulation/sessions/history"), ({ request }) => {
      const params = new URL(request.url).searchParams;

      sessionQueries.push(params);

      return HttpResponse.json(envelope([sessionDto("ss-1", "SDRA moderado"), sessionDto("ss-2", null, { score: null, mode: "EXAM" })], { total: 2, pages: 1, page: 1, limit: 10 }));
    }),
    http.get(apiUrl("/api/analytics/students/:userId/timeline"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      const from = params.get("from") ?? "";
      const to = params.get("to") ?? "";
      const first = timelineQueries.length === 0;

      timelineQueries.push({ from, to });

      return HttpResponse.json(envelope({
        userId: "u1",
        from,
        to,
        truncated: first,
        entries: first ? [
          timelineEntryDto("EVALUATION_SUBMITTED", "ev-1", { title: "Parcial de PEEP", status: "GRADED", value: 4.1 }),
          timelineEntryDto("LESSON_COMPLETED", "l-1", { title: "Compliance" }),
        ] : [],
      }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

describe("StudentDetailPage", () => {
  it("shows the header, the progress tree in curriculum order and the student's published grades", async() => {
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    expect(await screen.findByRole("heading", { name: "Ana Gómez" })).toBeInTheDocument();
    expect(screen.getByText("u1@ventylab.demo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: STUDENT_DETAIL_COPY.back })).toHaveAttribute("href", "/teacher?groupId=g1");

    const progress = section(STUDENT_DETAIL_COPY.progressTitle);

    await within(progress).findByText("Fisiología");
    const titles = within(progress).getAllByText(/Fundamentos|Nivel básico|Fisiología|Modos ventilatorios/).map((node) => node.textContent);

    expect(titles).toEqual(["Fundamentos", "Nivel básico", "Fisiología", "Modos ventilatorios"]);

    const grades = section(STUDENT_DETAIL_COPY.gradesTitle);

    expect(await within(grades).findByRole("link", { name: "Parcial de PEEP" })).toHaveAttribute("href", "/grading/attempts/at-9");
    expect(within(grades).getByText(STUDENT_GRADES_COPY.module("Fisiología"))).toBeInTheDocument();
    expect(within(grades).getByRole("link", { name: "Quiz de volúmenes" })).toHaveAttribute("href", "/grading/attempts/at-8");
    expect(within(grades).getByText(STUDENT_GRADES_COPY.failed)).toBeInTheDocument();
  });

  it("lists the pending attempts of the student from the filtered queue and pages them", async() => {
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    const grades = await screen.findByRole("region", { name: STUDENT_DETAIL_COPY.gradesTitle });

    expect(await within(grades).findByText("Taller de curvas")).toBeInTheDocument();
    expect(within(grades).getByRole("link", { name: STUDENT_GRADES_COPY.grade })).toHaveAttribute("href", "/grading/attempts/at-1");
    expect(within(grades).getByText(STUDENT_GRADES_COPY.pendingTotal(12))).toBeInTheDocument();
    expect(Object.fromEntries(queueQueries[0] ?? [])).toEqual({ studentId: "u1", page: "1", limit: "10" });

    const pager = within(grades).getByRole("navigation", { name: STUDENT_GRADES_COPY.pagination });

    fireEvent.click(within(pager).getByRole("button", { name: /page 2/i }));

    expect(await within(grades).findByText("Taller de presiones")).toBeInTheDocument();
    expect(queueQueries.at(-1)?.get("page")).toBe("2");
  });

  it("lists the simulation sessions with their case and replay links, and pages the timeline backwards", async() => {
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    const sessions = await screen.findByRole("region", { name: STUDENT_ACTIVITY_COPY.sessionsTitle });

    expect(await within(sessions).findByText("SDRA moderado")).toBeInTheDocument();
    expect(within(sessions).getByText(STUDENT_ACTIVITY_COPY.unknownCase)).toBeInTheDocument();
    expect(within(sessions).getByText("Puntaje 88")).toBeInTheDocument();
    expect(within(sessions).getAllByRole("link", { name: STUDENT_ACTIVITY_COPY.replay }).map((link) => link.getAttribute("href")))
      .toEqual(["/simulator/sessions/ss-1/replay", "/simulator/sessions/ss-2/replay"]);
    expect(sessionQueries[0]?.get("userId")).toBe("u1");

    const timeline = section(STUDENT_ACTIVITY_COPY.timelineTitle);

    expect(await within(timeline).findByText(STUDENT_ACTIVITY_COPY.truncated)).toBeInTheDocument();
    expect(within(timeline).getByText("Nota 4,1")).toBeInTheDocument();
    expect(within(timeline).getByRole("link", { name: STUDENT_ACTIVITY_COPY.results })).toHaveAttribute("href", "/grading/evaluations/ev-1");

    fireEvent.click(within(timeline).getByRole("button", { name: STUDENT_ACTIVITY_COPY.loadOlder }));

    await waitFor(() => expect(timelineQueries).toHaveLength(2));
    const [current, older] = timelineQueries;

    expect(older?.to).toBe(current?.from);
    expect(await within(timeline).findByText(STUDENT_ACTIVITY_COPY.noEntries)).toBeInTheDocument();
  });

  it("validates the date range before requesting it", async() => {
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);
    await screen.findByRole("region", { name: STUDENT_ACTIVITY_COPY.timelineTitle });

    fireEvent.change(screen.getByLabelText(STUDENT_ACTIVITY_COPY.from), { target: { value: "2026-10-10" } });
    fireEvent.change(screen.getByLabelText(STUDENT_ACTIVITY_COPY.to), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: STUDENT_ACTIVITY_COPY.apply }));

    expect(await screen.findByText(STUDENT_ACTIVITY_COPY.rangeErrors.order)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(STUDENT_ACTIVITY_COPY.to), { target: { value: "2026-10-12" } });
    fireEvent.click(screen.getByRole("button", { name: STUDENT_ACTIVITY_COPY.apply }));

    await waitFor(() => expect(timelineQueries.at(-1)).toEqual({ from: "2026-10-10T05:00:00.000Z", to: "2026-10-13T05:00:00.000Z" }));
  });

  it("shows the grades without a group in the URL", async() => {
    router.query = { userId: "u1" };
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    const grades = await screen.findByRole("region", { name: STUDENT_DETAIL_COPY.gradesTitle });

    expect(await within(grades).findByRole("link", { name: "Parcial de PEEP" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: STUDENT_DETAIL_COPY.back })).toHaveAttribute("href", "/teacher");
  });

  it("shows the no-access state when the student is outside the caller's groups", async() => {
    studentStatus = 403;
    renderTeacherDashboard(<StudentDetailPage userId="u9" />);

    expect(await screen.findByText(STUDENT_DETAIL_COPY.forbiddenTitle)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: STUDENT_DETAIL_COPY.gradesTitle })).not.toBeInTheDocument();
  });
});
