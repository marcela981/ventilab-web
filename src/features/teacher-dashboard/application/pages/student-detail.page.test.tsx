/*
* Funcionalidad: Student detail page tests
* Descripción: /teacher/students/[userId] with msw: header from `GET /api/users/students/{id}`, progress tree from `GET /api/progress/users/{userId}/summary` in curriculum order with the curriculum titles, grades of the group of ?groupId (published grades linked to the evaluation results, only this student's pending attempts linked to /grading/attempts/[attemptId]), simulation sessions from the timeline linked to the replay, the truncated flag and "Cargar anteriores" requesting the previous window; without ?groupId the grades explain the gap; a 403 of the student shows the no-access state; neither notes nor AI conversations are requested (unhandled requests fail). v1.1 (O3 review): the possibly-incomplete note of the pending attempts when the queue total exceeds the scanned rows. Depends on vitest, msw, Testing Library and the teacher dashboard test helpers.
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
import { STUDENT_ACTIVITY_COPY } from "../components/student-activity";
import { STUDENT_GRADES_COPY } from "../components/student-grades";
import {
  apiUrl,
  envelope,
  errorResponse,
  queueItemDto,
  renderTeacherDashboard,
  rowDto,
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
let studentStatus: number;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  timelineQueries = [];
  studentStatus = 200;
  router.query = { userId: "u1", groupId: "g1" };
  server.use(
    http.get(apiUrl("/api/users/students/:id"), ({ params }) => (studentStatus === 200
      ? HttpResponse.json(envelope(studentDto(String(params.id), "Ana Gómez")))
      : errorResponse("forbidden", studentStatus))),
    http.get(apiUrl("/api/progress/users/:userId/summary"), () => HttpResponse.json(envelope(summaryDto()))),
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/analytics/groups/:groupId/dashboard"), ({ params }) => HttpResponse.json(envelope({
      generatedAt: "2026-10-16T12:00:00.000Z",
      groupId: String(params.groupId),
      groupName: "Grupo A",
      students: [rowDto("u1", "Ana Gómez"), rowDto("u2", "Bruno Díaz")],
    }))),
    http.get(apiUrl("/api/evaluation-grading/queue"), () => HttpResponse.json(envelope(
      [queueItemDto("at-1", "u1", "Taller de curvas"), queueItemDto("at-2", "u2", "Taller de otro")],
      { total: 2, pages: 1, page: 1, limit: 50 },
    ))),
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
          timelineEntryDto("SIMULATION_SESSION", "ss-1", { status: "ENDED", value: 88 }),
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
  it("shows the header, the progress tree in curriculum order and the group grades", async() => {
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    expect(await screen.findByRole("heading", { name: "Ana Gómez" })).toBeInTheDocument();
    expect(screen.getByText("u1@ventylab.demo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: STUDENT_DETAIL_COPY.back })).toHaveAttribute("href", "/teacher?groupId=g1");

    const progress = section(STUDENT_DETAIL_COPY.progressTitle);

    await within(progress).findByText("Fisiología");
    const titles = within(progress).getAllByText(/Fundamentos|Nivel básico|Fisiología|Modos ventilatorios/).map((node) => node.textContent);

    expect(titles).toEqual(["Fundamentos", "Nivel básico", "Fisiología", "Modos ventilatorios"]);

    const grades = section(STUDENT_DETAIL_COPY.gradesTitle);

    expect(await within(grades).findByRole("link", { name: "Parcial de PEEP" })).toHaveAttribute("href", "/grading/evaluations/ev-1");
    expect(await within(grades).findByText("Taller de curvas")).toBeInTheDocument();
    expect(within(grades).getByRole("link", { name: STUDENT_GRADES_COPY.grade })).toHaveAttribute("href", "/grading/attempts/at-1");
    expect(within(grades).queryByText("Taller de otro")).not.toBeInTheDocument();
    expect(within(grades).queryByText(STUDENT_GRADES_COPY.possiblyIncomplete)).not.toBeInTheDocument();
  });

  it("warns that the pending list may be incomplete when the queue holds more attempts than scanned", async() => {
    server.use(http.get(apiUrl("/api/evaluation-grading/queue"), () => HttpResponse.json(envelope(
      [queueItemDto("at-1", "u1", "Taller de curvas")],
      { total: 120, pages: 3, page: 1, limit: 50 },
    ))));
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    const grades = await screen.findByRole("region", { name: STUDENT_DETAIL_COPY.gradesTitle });

    expect(await within(grades).findByText(STUDENT_GRADES_COPY.possiblyIncomplete)).toBeInTheDocument();
    expect(within(grades).getByText("Taller de curvas")).toBeInTheDocument();
  });

  it("lists the simulation sessions with replay links and pages the timeline backwards", async() => {
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    const sessions = await screen.findByRole("region", { name: STUDENT_ACTIVITY_COPY.sessionsTitle });
    const replay = await within(sessions).findByRole("link", { name: STUDENT_ACTIVITY_COPY.replay });

    expect(replay).toHaveAttribute("href", "/simulator/sessions/ss-1/replay");
    expect(within(sessions).getByText("Puntaje 88")).toBeInTheDocument();

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

  it("explains how to see the grades when no group is given", async() => {
    router.query = { userId: "u1" };
    renderTeacherDashboard(<StudentDetailPage userId="u1" />);

    expect(await screen.findByText(STUDENT_GRADES_COPY.noGroup)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: STUDENT_DETAIL_COPY.back })).toHaveAttribute("href", "/teacher");
  });

  it("shows the no-access state when the student is outside the caller's groups", async() => {
    studentStatus = 403;
    renderTeacherDashboard(<StudentDetailPage userId="u9" />);

    expect(await screen.findByText(STUDENT_DETAIL_COPY.forbiddenTitle)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: STUDENT_DETAIL_COPY.gradesTitle })).not.toBeInTheDocument();
  });
});
