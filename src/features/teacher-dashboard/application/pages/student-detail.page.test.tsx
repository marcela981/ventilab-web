/*
* Funcionalidad: Student detail page tests
* Descripción: /teacher/students/[userId] with msw. Header: name, email, initials avatar, student code and active groups from the profile itself (hidden when absent), overall progress and the cards Módulos completados, Evaluaciones aprobadas x/y (hidden without published grades) and Sesiones de simulador, never "Tiempo de estudio"; the header reads start in parallel (the profile answers only after summary, grades and sessions were requested) and no read waits for the profile: the directory (`GET /api/admin/students`) is never requested. Tabs (?tab=): Módulos (progress tree in curriculum order), Evaluaciones (published grades linked to their attempt, pending attempts paged from the queue filtered by `studentId`), Simulador (sessions with result and replay; "Grabaciones del equipo real" only when the recordings list is non-empty), Actividad (truncated flag, "Cargar anteriores", date range validation), Gamificación (XP, level, streak, achievements); a panel requests its data only on its first visit. Back link: /teacher/students with ?from=directory, otherwise the dashboard. 403 shows the no-access state, 404 the not-found state. Privacy: across every tab, no request for notes or AI conversations is made and none is rendered (unhandled requests fail). v1.1 (O3 review): the possibly-incomplete note of the pending attempts. v1.2 (closure B2): staff endpoints for grades, pending attempts and sessions. v1.3 (S8): regenerated block 1 contract fields. v1.4 (W1 Bloque 4): the back link returns to the Grupo tab. v2.0 (W4 Bloque 4): tabs, header facts and cards, recordings, gamification, directory back link, 404 and privacy. v2.1 (Bloque 4 integration): code and groups from the profile, no directory lookup waterfall. Depends on vitest, msw, Testing Library and the teacher dashboard test helpers.
* Versión: 2.1
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
import type { AchievementsDTO, GamificationStatsDTO, TelemetryRecordingSummaryDTO } from "../../api/dtos/student-detail.dto";
import type { SimulationSessionDTO, StudentGradeDTO } from "../../api/dtos/teacher-dashboard.dto";
import { STUDENT_ACTIVITY_COPY } from "../components/detail/student-activity";
import { STUDENT_PANELS_COPY } from "../components/detail/student-detail-panels";
import { STUDENT_HEADER_COPY } from "../components/detail/student-detail-header";
import { STUDENT_GAMIFICATION_COPY } from "../components/detail/student-gamification";
import { STUDENT_GRADES_COPY } from "../components/detail/student-grades";
import { STUDENT_SESSIONS_COPY } from "../components/detail/student-sessions";
import { TEAM_RECORDINGS_COPY } from "../components/detail/team-recordings";
import { buildStudentDetailUrl, STUDENT_DETAIL_FROM_DIRECTORY } from "../config/teacher-dashboard.routes";
import { STUDENT_DETAIL_TAB_LABELS, STUDENT_DETAIL_TABS } from "../entities/student-detail.entity";
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
  replace: vi.fn(() => Promise.resolve(true)),
  push: () => Promise.resolve(true),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let requestedPaths: string[];
let timelineQueries: Array<{ from: string, to: string }>;
let queueQueries: URLSearchParams[];
let sessionQueries: URLSearchParams[];
let studentStatus: number;
let grades: StudentGradeDTO[];
let recordings: TelemetryRecordingSummaryDTO[];

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

const PROFILE_FACTS = {
  studentCode: "202312345",
  groups: [{ id: "g1", name: "Grupo A" }, { id: "g2", name: "Grupo B" }],
};

const gamificationDto: GamificationStatsDTO = {
  level: 3,
  longestStreak: 9,
  nextLevelXp: 1500,
  streakDays: 4,
  xpIntoLevel: 255,
  xpToday: 55,
  xpTotal: 1255,
};

const achievementsDto: AchievementsDTO = {
  totalUnlocked: 1,
  achievements: [{
    code: "FIRST_LESSON",
    description: "Completó su primera lección",
    icon: "🎓",
    id: "ach-1",
    title: "Primer paso",
    unlockedAt: "2026-10-01T15:00:00.000Z",
    xpReward: 50,
  }],
};

function recordingDto(reservationId: string): TelemetryRecordingSummaryDTO {
  return {
    chunkCount: 12,
    endsAt: "2026-10-30T14:30:00.000Z",
    groupId: "g1",
    holderType: "GROUP",
    reservationId,
    sampleRateHz: 20,
    startsAt: "2026-10-30T14:00:00.000Z",
    status: "COMPLETED",
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  server.events.on("request:start", ({ request }) => {
    requestedPaths.push(new URL(request.url).pathname);
  });
});

beforeEach(() => {
  requestedPaths = [];
  timelineQueries = [];
  queueQueries = [];
  sessionQueries = [];
  studentStatus = 200;
  grades = [
    gradeDto("at-9", "Parcial de PEEP"),
    gradeDto("at-8", "Quiz de volúmenes", { evaluationId: "ev-2", passed: false, grade: 2.4, moduleTitle: null }),
  ];
  recordings = [];
  router.query = { userId: "u1", groupId: "g1" };
  router.replace.mockClear();
  server.use(
    http.get(apiUrl("/api/users/students/:id"), ({ params }) => (studentStatus === 200
      ? HttpResponse.json(envelope(studentDto(String(params.id), "Ana Gómez", PROFILE_FACTS)))
      : errorResponse(studentStatus === 403 ? "groups.student_out_of_scope" : "users.not_found", studentStatus))),
    http.get(apiUrl("/api/progress/users/:userId/summary"), () => HttpResponse.json(envelope(summaryDto()))),
    http.get(apiUrl("/api/progress/users/:userId/gamification"), () => HttpResponse.json(envelope(gamificationDto))),
    http.get(apiUrl("/api/progress/users/:userId/achievements"), () => HttpResponse.json(envelope(achievementsDto))),
    http.get(apiUrl("/api/ventilator/telemetry/recordings"), () => HttpResponse.json(envelope(recordings))),
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/evaluation-grading/students/:userId/grades"), () => HttpResponse.json(envelope(grades))),
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
      sessionQueries.push(new URL(request.url).searchParams);

      return HttpResponse.json(envelope(
        [sessionDto("ss-1", "SDRA moderado"), sessionDto("ss-2", null, { score: null, mode: "EXAM" })],
        { total: 7, pages: 1, page: 1, limit: 10 },
      ));
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

function region(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

function renderDetail(tab?: string, userId = "u1") {
  router.query = tab ? { ...router.query, tab } : router.query;

  return renderTeacherDashboard(<StudentDetailPage userId={userId} />);
}

describe("StudentDetailPage header", () => {
  it("shows the profile, code, groups, overall progress and the summary cards without study time", async() => {
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Ana Gómez" })).toBeInTheDocument();
    expect(screen.getByText("u1@ventylab.demo")).toBeInTheDocument();
    expect(screen.getByText("AG")).toBeInTheDocument();
    expect(await screen.findByText(STUDENT_HEADER_COPY.code("202312345"))).toBeInTheDocument();

    const groups = screen.getByRole("list", { name: STUDENT_HEADER_COPY.groupsLabel });

    expect(within(groups).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Grupo A", "Grupo B"]);
    expect(screen.getByText("40 %")).toBeInTheDocument();

    const cards = screen.getByRole("list", { name: STUDENT_HEADER_COPY.cardsLabel });

    expect(await within(cards).findByText(STUDENT_HEADER_COPY.evaluations)).toBeInTheDocument();
    expect(within(cards).getByText(STUDENT_HEADER_COPY.modules).nextSibling).toHaveTextContent("1/2");
    expect(within(cards).getByText(STUDENT_HEADER_COPY.evaluations).nextSibling).toHaveTextContent("1/2");
    expect(await within(cards).findByText(STUDENT_HEADER_COPY.sessions)).toBeInTheDocument();
    expect(within(cards).getByText(STUDENT_HEADER_COPY.sessions).nextSibling).toHaveTextContent("7");
    expect(screen.queryByText(/Tiempo de estudio/)).not.toBeInTheDocument();
  });

  it("hides the evaluations card when the student has no published grade", async() => {
    grades = [];
    renderDetail();

    const cards = await screen.findByRole("list", { name: STUDENT_HEADER_COPY.cardsLabel });

    expect(await within(cards).findByText(STUDENT_HEADER_COPY.sessions)).toBeInTheDocument();
    await waitFor(() => expect(requestedPaths).toContain("/api/evaluation-grading/students/u1/grades"));
    expect(within(cards).queryByText(STUDENT_HEADER_COPY.evaluations)).not.toBeInTheDocument();
  });

  it("requests the header reads in parallel, before the profile answers, and none waits for it", async() => {
    const parallel = ["/api/progress/users/u1/summary", "/api/evaluation-grading/students/u1/grades", "/api/simulation/sessions/history", "/api/curriculum/tree"];
    let requestedBeforeProfile: string[] = [];

    server.use(http.get(apiUrl("/api/users/students/:id"), async() => {
      await waitFor(() => expect(requestedPaths).toEqual(expect.arrayContaining(parallel)));
      requestedBeforeProfile = [...requestedPaths];

      return HttpResponse.json(envelope(studentDto("u1", "Ana Gómez", PROFILE_FACTS)));
    }));
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Ana Gómez" })).toBeInTheDocument();
    // The code and groups come with the profile: once it answers, the header needs no further read.
    expect(screen.getByText(STUDENT_HEADER_COPY.code("202312345"))).toBeInTheDocument();
    expect(screen.getByRole("list", { name: STUDENT_HEADER_COPY.groupsLabel })).toBeInTheDocument();
    expect(requestedPaths.slice(requestedBeforeProfile.length).filter((path) => !path.startsWith("/api/users/students/"))).toEqual([]);
    expect(requestedPaths).not.toContain("/api/admin/students");
  });

  it("hides the code and the groups when the profile has none", async() => {
    server.use(http.get(apiUrl("/api/users/students/:id"), () => HttpResponse.json(envelope(studentDto("u1", "Ana Gómez")))));
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Ana Gómez" })).toBeInTheDocument();
    expect(screen.queryByText(/Código/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: STUDENT_HEADER_COPY.groupsLabel })).not.toBeInTheDocument();
  });

  it("returns to the group panel, the dashboard or the directory depending on where it was opened", async() => {
    const { unmount } = renderDetail();

    expect(await screen.findByRole("link", { name: STUDENT_DETAIL_COPY.backToGroup })).toHaveAttribute("href", "/teacher?tab=grupo&groupId=g1");
    unmount();

    router.query = { userId: "u1" };
    const second = renderDetail();

    expect(await screen.findByRole("link", { name: STUDENT_DETAIL_COPY.backToDashboard })).toHaveAttribute("href", "/teacher");
    second.unmount();

    // The directory links mark their origin with the shared helper; the detail parses it back.
    expect(buildStudentDetailUrl("u1", null, STUDENT_DETAIL_FROM_DIRECTORY)).toBe("/teacher/students/u1?from=directory");
    router.query = { userId: "u1", from: STUDENT_DETAIL_FROM_DIRECTORY };
    renderDetail();

    expect(await screen.findByRole("link", { name: "Volver a la lista" })).toHaveAttribute("href", "/teacher/students");
  });

  it("shows the no-access state when the student is outside the caller's groups", async() => {
    studentStatus = 403;
    renderDetail(undefined, "u9");

    expect(await screen.findByText(STUDENT_DETAIL_COPY.forbiddenTitle)).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows the not-found state when the student does not exist", async() => {
    studentStatus = 404;
    renderDetail(undefined, "u9");

    expect(await screen.findByText(STUDENT_DETAIL_COPY.notFoundTitle)).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});

describe("StudentDetailPage tabs", () => {
  it("opens Módulos by default with the progress tree and loads no other tab's data", async() => {
    renderDetail();

    const tabs = await screen.findByRole("tablist");

    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(STUDENT_DETAIL_TABS.map((tab) => STUDENT_DETAIL_TAB_LABELS[tab]));
    expect(within(tabs).getByRole("tab", { name: STUDENT_DETAIL_TAB_LABELS.modulos })).toHaveAttribute("aria-selected", "true");

    const progress = await screen.findByRole("region", { name: STUDENT_PANELS_COPY.progressTitle });

    await within(progress).findByText("Fisiología");
    const titles = within(progress).getAllByText(/Fundamentos|Nivel básico|Fisiología|Modos ventilatorios/).map((node) => node.textContent);

    expect(titles).toEqual(["Fundamentos", "Nivel básico", "Fisiología", "Modos ventilatorios"]);
    expect(requestedPaths.filter((path) => /timeline|gamification|achievements|recordings|queue/.test(path))).toEqual([]);

    fireEvent.click(within(tabs).getByRole("tab", { name: STUDENT_DETAIL_TAB_LABELS.gamificacion }));

    expect(router.replace).toHaveBeenCalledWith(
      { pathname: router.pathname, query: expect.objectContaining({ tab: "gamificacion" }) },
      undefined,
      { shallow: true },
    );
  });

  it("Evaluaciones lists the published grades and pages the pending attempts", async() => {
    renderDetail("evaluaciones");

    const grades = await screen.findByRole("region", { name: STUDENT_PANELS_COPY.gradesTitle });

    expect(await within(grades).findByRole("link", { name: "Parcial de PEEP" })).toHaveAttribute("href", "/grading/attempts/at-9");
    expect(within(grades).getByText(STUDENT_GRADES_COPY.module("Fisiología"))).toBeInTheDocument();
    expect(within(grades).getByRole("link", { name: "Quiz de volúmenes" })).toHaveAttribute("href", "/grading/attempts/at-8");
    expect(within(grades).getByText(STUDENT_GRADES_COPY.failed)).toBeInTheDocument();

    expect(await within(grades).findByText("Taller de curvas")).toBeInTheDocument();
    expect(within(grades).getByRole("link", { name: STUDENT_GRADES_COPY.grade })).toHaveAttribute("href", "/grading/attempts/at-1");
    expect(within(grades).getByText(STUDENT_GRADES_COPY.pendingTotal(12))).toBeInTheDocument();
    expect(Object.fromEntries(queueQueries[0] ?? [])).toEqual({ studentId: "u1", page: "1", limit: "10" });

    const pager = within(grades).getByRole("navigation", { name: STUDENT_GRADES_COPY.pagination });

    fireEvent.click(within(pager).getByRole("button", { name: /page 2/i }));

    expect(await within(grades).findByText("Taller de presiones")).toBeInTheDocument();
    expect(queueQueries.at(-1)?.get("page")).toBe("2");
  });

  it("Simulador lists the sessions with result and replay and hides the recordings when there are none", async() => {
    renderDetail("simulador");

    const sessions = await screen.findByRole("region", { name: STUDENT_SESSIONS_COPY.title });

    expect(await within(sessions).findByText("SDRA moderado")).toBeInTheDocument();
    expect(within(sessions).getByText(STUDENT_SESSIONS_COPY.unknownCase)).toBeInTheDocument();
    expect(within(sessions).getByText("Puntaje 88")).toBeInTheDocument();
    expect(within(sessions).getAllByRole("link", { name: STUDENT_SESSIONS_COPY.replay }).map((link) => link.getAttribute("href")))
      .toEqual(["/simulator/sessions/ss-1/replay", "/simulator/sessions/ss-2/replay"]);
    expect(sessionQueries[0]?.get("userId")).toBe("u1");
    // The header card and the tab share the first page request.
    expect(sessionQueries).toHaveLength(1);

    await waitFor(() => expect(requestedPaths).toContain("/api/ventilator/telemetry/recordings"));
    expect(screen.queryByRole("region", { name: TEAM_RECORDINGS_COPY.title })).not.toBeInTheDocument();
  });

  it("Simulador shows the real ventilator recordings when the student has some", async() => {
    recordings = [recordingDto("res-1")];
    renderDetail("simulador");

    const section = await screen.findByRole("region", { name: TEAM_RECORDINGS_COPY.title });

    expect(within(section).getByText(TEAM_RECORDINGS_COPY.holder.GROUP)).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: TEAM_RECORDINGS_COPY.play })).toHaveAttribute("href", "/lab/recordings/res-1");
  });

  it("Actividad shows the timeline and pages it backwards", async() => {
    renderDetail("actividad");

    const timeline = await screen.findByRole("region", { name: STUDENT_ACTIVITY_COPY.timelineTitle });

    expect(await within(timeline).findByText(STUDENT_ACTIVITY_COPY.truncated)).toBeInTheDocument();
    expect(within(timeline).getByText("Nota 4,1")).toBeInTheDocument();
    expect(within(timeline).getByRole("link", { name: STUDENT_ACTIVITY_COPY.results })).toHaveAttribute("href", "/grading/evaluations/ev-1");

    fireEvent.click(within(timeline).getByRole("button", { name: STUDENT_ACTIVITY_COPY.loadOlder }));

    await waitFor(() => expect(timelineQueries).toHaveLength(2));
    const [current, older] = timelineQueries;

    expect(older?.to).toBe(current?.from);
    expect(await within(timeline).findByText(STUDENT_ACTIVITY_COPY.noEntries)).toBeInTheDocument();
  });

  it("Actividad validates the date range before requesting it", async() => {
    renderDetail("actividad");
    await screen.findByRole("region", { name: STUDENT_ACTIVITY_COPY.timelineTitle });

    fireEvent.change(screen.getByLabelText(STUDENT_ACTIVITY_COPY.from), { target: { value: "2026-10-10" } });
    fireEvent.change(screen.getByLabelText(STUDENT_ACTIVITY_COPY.to), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: STUDENT_ACTIVITY_COPY.apply }));

    expect(await screen.findByText(STUDENT_ACTIVITY_COPY.rangeErrors.order)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(STUDENT_ACTIVITY_COPY.to), { target: { value: "2026-10-12" } });
    fireEvent.click(screen.getByRole("button", { name: STUDENT_ACTIVITY_COPY.apply }));

    await waitFor(() => expect(timelineQueries.at(-1)).toEqual({ from: "2026-10-10T05:00:00.000Z", to: "2026-10-13T05:00:00.000Z" }));
  });

  it("Gamificación shows XP, level, streak and the achievements read-only", async() => {
    renderDetail("gamificacion");

    const stats = await screen.findByRole("region", { name: STUDENT_GAMIFICATION_COPY.statsTitle });

    expect(await within(stats).findByText(STUDENT_GAMIFICATION_COPY.level(3))).toBeInTheDocument();
    expect(within(stats).getByText(STUDENT_GAMIFICATION_COPY.xp(1255))).toBeInTheDocument();
    expect(within(stats).getByText(STUDENT_GAMIFICATION_COPY.xp(55))).toBeInTheDocument();
    expect(within(stats).getByText(STUDENT_GAMIFICATION_COPY.streakValue(4))).toBeInTheDocument();
    expect(within(stats).getByText(STUDENT_GAMIFICATION_COPY.longestStreak(9))).toBeInTheDocument();
    expect(within(stats).getByRole("progressbar", { name: STUDENT_GAMIFICATION_COPY.levelAria(51) })).toBeInTheDocument();

    const achievements = region(STUDENT_GAMIFICATION_COPY.achievementsFallbackTitle);

    expect(await within(achievements).findByText("Primer paso")).toBeInTheDocument();
    expect(within(achievements).getByRole("heading", { name: STUDENT_GAMIFICATION_COPY.achievementsTitle(1) })).toBeInTheDocument();
    expect(within(achievements).queryByRole("button")).not.toBeInTheDocument();
  });

  it("Gamificación shows the no-achievements empty state", async() => {
    server.use(http.get(apiUrl("/api/progress/users/:userId/achievements"), () => HttpResponse.json(envelope({ totalUnlocked: 0, achievements: [] }))));
    renderDetail("gamificacion");

    expect(await screen.findByText(STUDENT_GAMIFICATION_COPY.achievementsEmptyTitle)).toBeInTheDocument();
  });
});

describe("StudentDetailPage privacy", () => {
  it.each(STUDENT_DETAIL_TABS)("never requests nor renders personal notes or AI conversations (%s)", async(tab) => {
    renderDetail(tab);

    await screen.findByRole("tablist");
    // Every read of the tab answered: no skeleton left (header and panel).
    await waitFor(() => expect(screen.queryAllByRole("status", { busy: true })).toEqual([]));

    expect(requestedPaths.length).toBeGreaterThan(0);
    expect(requestedPaths.filter((path) => /note|chat|conversation|assistant|\/api\/ai\b/i.test(path))).toEqual([]);
    expect(screen.queryByText(/notas personales|mis notas|conversaci[oó]n|chat/i)).not.toBeInTheDocument();
  });
});
