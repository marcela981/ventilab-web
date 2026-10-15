/*
* Funcionalidad: EvaluationResultsPage tests
* Descripción: Page tests of /grading/evaluations/[evaluationId] through MSW with @shared/charts mocked: the KPIs are the API statistics formatted in es-CO (grades with one decimal, pass rate as a percentage, passing grade from the API); the histogram chart receives the API buckets with their es-CO labels and counts and the difficulty chart the API indices by question; without attempts an empty state replaces KPIs and charts; the per-student section always explains the API gap and, for a chosen group, lists the published grades of the evaluation from the group dashboard; the bulk publish confirmation states the scope only (no client-side count), posts {evaluationId} or {evaluationId, groupId} only after confirming and toasts the publishedCount of the response. Depends on vitest, Testing Library, msw, the results page, its copy and entities and the grading test helpers. v1.1 (G3 review): the pass rate is asserted as the literal es-CO string "75%"; the KPIs carry the every-group scope note; the confirmation has no estimate and the button stays enabled when every graded attempt is already published; after a publish the stats-delay note appears and the stats are requested again once after STATS_REFRESH_DELAY_MS, and the timer is cleared on unmount.
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
import type { EvaluationAnalyticsDTO, EvaluationAssignmentDTO, GroupDashboardDTO } from "../../api/dtos/grading.dto";
import { EvaluationResultsPage, RESULTS_COPY, STATS_REFRESH_DELAY_MS } from "./evaluation-results.page";
import { apiUrl, envelope, renderGradingPage } from "./grading-test-helpers";

vi.setConfig({ testTimeout: 20_000 });

type ChartProps = { title: string, labels: string[], datasets: { label: string, values: (number | null)[] }[], horizontal?: boolean };

const charts = vi.hoisted(() => ({ calls: [] as ChartProps[] }));

vi.mock("@shared/charts", () => ({
  BarChart: (props: ChartProps) => {
    charts.calls.push(props);

    return <div data-testid="bar-chart">{props.title}</div>;
  },
}));

const server = setupServer();
let stats: EvaluationAnalyticsDTO;
let assignments: EvaluationAssignmentDTO[];
let publishBodies: unknown[];
let publishedCount: number;
let statsRequests: number;

function statsDto(overrides: Partial<EvaluationAnalyticsDTO> = {}): EvaluationAnalyticsDTO {
  return {
    evaluationId: "ev-1",
    title: "Parcial de ventilación",
    type: "EXAM",
    totalAttempts: 24,
    gradedCount: 20,
    publishedCount: 12,
    averageGrade: 3.62,
    medianGrade: 3.7,
    minGrade: 1.4,
    maxGrade: 5,
    passRate: 0.75,
    passingGrade: 3,
    histogram: [
      { from: 2.5, to: 3, count: 5 },
      { from: 3, to: 3.5, count: 4 },
      { from: 3.5, to: 4, count: 11 },
    ],
    questions: [
      { questionId: "q2", order: 2, type: "OPEN_TEXT", points: 2, answeredCount: 18, correctCount: 6, correctRate: 0.3, difficultyIndex: 0.42 },
      { questionId: "q1", order: 1, type: "SINGLE_CHOICE", points: 1, answeredCount: 20, correctCount: 12, correctRate: 0.6, difficultyIndex: 0.64 },
    ],
    ...overrides,
  };
}

function assignmentDto(id: string, groupId: string, groupName: string, graded: number): EvaluationAssignmentDTO {
  return {
    id,
    evaluationId: "ev-1",
    evaluationTitle: "Parcial de ventilación",
    evaluationType: "EXAM",
    evaluationStatus: "READY",
    groupId,
    groupName,
    startsAt: "2026-10-06T13:00:00.000Z",
    endsAt: "2026-10-06T15:00:00.000Z",
    state: "CLOSED",
    assignedById: "teacher-1",
    legacyIsActive: null,
    attemptCounts: { inProgress: 1, submitted: 0, pendingReview: 2, graded },
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
  };
}

function dashboardDto(): GroupDashboardDTO {
  const grades = (evaluationId: string, grade: number, passed: boolean) => ({
    averageGrade: grade,
    evaluations: [{ evaluationId, evaluationTitle: "x", attemptNumber: 1, grade, passed, publishedAt: "2026-10-12T16:00:00.000Z" }],
  });

  return {
    groupId: "g1",
    groupName: "UCI A",
    generatedAt: "2026-10-12T16:00:00.000Z",
    students: [
      { userId: "s1", name: "Ana Gómez", email: "ana@ventylab.demo", grades: grades("ev-1", 4.2, true) },
      { userId: "s2", name: null, email: "luis@ventylab.demo", grades: grades("ev-1", 2.4, false) },
      { userId: "s3", name: "Otra", email: "otra@ventylab.demo", grades: grades("ev-9", 5, true) },
    ] as never,
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  charts.calls.length = 0;
  stats = statsDto();
  assignments = [assignmentDto("a1", "g1", "UCI A", 6), assignmentDto("a2", "g2", "Urgencias", 3)];
  publishBodies = [];
  publishedCount = 8;
  statsRequests = 0;
  server.use(
    http.get(apiUrl("/api/analytics/evaluations/:evaluationId/stats"), () => {
      statsRequests += 1;

      return HttpResponse.json(envelope(stats));
    }),
    http.get(apiUrl("/api/evaluation-assignments"), ({ request }) => {
      const url = new URL(request.url);

      return HttpResponse.json(envelope(url.searchParams.get("evaluationId") === "ev-1" ? assignments : []));
    }),
    http.get(apiUrl("/api/analytics/groups/:groupId/dashboard"), () => HttpResponse.json(envelope(dashboardDto()))),
    http.post(apiUrl("/api/evaluation-grading/publish"), async({ request }) => {
      publishBodies.push(await request.json());

      return HttpResponse.json(envelope({ publishedCount }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

function renderPage() {
  return renderGradingPage(<EvaluationResultsPage evaluationId="ev-1" />);
}

async function loaded() {
  await screen.findByRole("heading", { name: "Parcial de ventilación" });
}

function kpi(label: string): string | null {
  const term = within(screen.getByLabelText(RESULTS_COPY.kpiLabel)).getByText(label, { selector: "dt" });

  return term.nextElementSibling?.textContent ?? null;
}

const groupSelect = () => screen.getByLabelText(RESULTS_COPY.group);
const publishButton = () => screen.getByRole("button", { name: RESULTS_COPY.publish });

describe("EvaluationResultsPage — statistics", () => {
  it("formats the API statistics in es-CO", async() => {
    renderPage();
    await loaded();

    expect(kpi(RESULTS_COPY.average)).toBe("3,6");
    expect(kpi(RESULTS_COPY.median)).toBe("3,7");
    expect(kpi(RESULTS_COPY.passRate)).toBe("75%");
    expect(kpi(RESULTS_COPY.passingGrade)).toBe("3,0");
    expect(kpi(RESULTS_COPY.minGrade)).toBe("1,4");
    expect(kpi(RESULTS_COPY.maxGrade)).toBe("5,0");
    expect(kpi(RESULTS_COPY.totalAttempts)).toBe("24");
    expect(kpi(RESULTS_COPY.gradedCount)).toBe("20");
    expect(kpi(RESULTS_COPY.publishedCount)).toBe("12");
    expect(screen.getByText(RESULTS_COPY.kpiScope)).toBeInTheDocument();
  });

  it("hands the API histogram buckets and question indices to the charts", async() => {
    renderPage();
    await loaded();

    await waitFor(() => expect(screen.getAllByTestId("bar-chart")).toHaveLength(2));

    const histogram = charts.calls.find((call) => !call.horizontal);
    const difficulty = charts.calls.find((call) => call.horizontal);

    expect(histogram?.labels).toEqual(["2,5–3,0", "3,0–3,5", "3,5–4,0"]);
    expect(histogram?.datasets[0]?.values).toEqual([5, 4, 11]);
    expect(difficulty?.labels).toEqual(["Pregunta 1", "Pregunta 2"]);
    expect(difficulty?.datasets[0]?.values).toEqual([0.64, 0.42]);
  });

  it("shows an empty state without attempts", async() => {
    stats = statsDto({
      totalAttempts: 0,
      gradedCount: 0,
      publishedCount: 0,
      averageGrade: null,
      medianGrade: null,
      minGrade: null,
      maxGrade: null,
      passRate: null,
      histogram: [],
      questions: [],
    });
    renderPage();
    await loaded();

    expect(screen.getByText(RESULTS_COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByLabelText(RESULTS_COPY.kpiLabel)).not.toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    expect(publishButton()).toBeDisabled();
  });
});

describe("EvaluationResultsPage — groups and students", () => {
  it("explains the per-student gap and lists the published grades of the chosen group", async() => {
    renderPage();
    await loaded();

    expect(screen.getByText(RESULTS_COPY.studentsGap)).toBeInTheDocument();
    expect(screen.getByText(RESULTS_COPY.studentsChooseGroup)).toBeInTheDocument();

    const groupsTable = await screen.findByRole("table", { name: "Intentos por grupo" });

    expect(within(groupsTable).getByText("UCI A")).toBeInTheDocument();
    expect(within(groupsTable).getByText("Urgencias")).toBeInTheDocument();

    fireEvent.change(groupSelect(), { target: { value: "g1" } });

    const students = await screen.findByRole("table", { name: "Notas publicadas por estudiante" });

    expect(within(students).getByText("Ana Gómez")).toBeInTheDocument();
    expect(within(students).getByText("4,2 · Aprobado")).toBeInTheDocument();
    expect(within(students).getByText("2,4 · No aprobado")).toBeInTheDocument();
    expect(within(students).queryByText("Otra")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Intentos por grupo" })).queryByText("Urgencias")).not.toBeInTheDocument();
  });
});

describe("EvaluationResultsPage — bulk publish", () => {
  it("confirms with the scope only for every group and posts only the evaluation", async() => {
    renderPage();
    await loaded();

    await waitFor(() => expect(publishButton()).toBeEnabled());
    fireEvent.click(publishButton());

    const dialog = await screen.findByRole("dialog", { name: RESULTS_COPY.publishTitle });

    expect(within(dialog).getByText(RESULTS_COPY.publishScopeAll)).toBeInTheDocument();
    expect(within(dialog).queryByText(/aprox/)).not.toBeInTheDocument();
    expect(publishBodies).toEqual([]);

    fireEvent.click(within(dialog).getByRole("button", { name: RESULTS_COPY.publishConfirm }));

    await waitFor(() => expect(publishBodies).toEqual([{ evaluationId: "ev-1" }]));
    expect(await screen.findByText(RESULTS_COPY.published(8))).toBeInTheDocument();
  });

  it("publishes one group and toasts the API count", async() => {
    publishedCount = 1;
    renderPage();
    await loaded();
    await screen.findByRole("table", { name: "Intentos por grupo" });

    fireEvent.change(groupSelect(), { target: { value: "g2" } });
    fireEvent.click(publishButton());

    const dialog = await screen.findByRole("dialog", { name: RESULTS_COPY.publishTitle });

    expect(within(dialog).getByText(RESULTS_COPY.publishScopeGroup("Urgencias"))).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: RESULTS_COPY.publishConfirm }));

    await waitFor(() => expect(publishBodies).toEqual([{ evaluationId: "ev-1", groupId: "g2" }]));
    expect(await screen.findByText(RESULTS_COPY.published(1))).toBeInTheDocument();
  });

  it("keeps the button enabled when every graded attempt is already published", async() => {
    stats = statsDto({ gradedCount: 12, publishedCount: 12 });
    publishedCount = 0;
    renderPage();
    await loaded();

    await waitFor(() => expect(publishButton()).toBeEnabled());
    fireEvent.click(publishButton());
    fireEvent.click(within(await screen.findByRole("dialog", { name: RESULTS_COPY.publishTitle })).getByRole("button", { name: RESULTS_COPY.publishConfirm }));

    expect(await screen.findByText(RESULTS_COPY.published(0))).toBeInTheDocument();
  });

  it("warns about the stats delay and revalidates the stats once after the backend cache window", async() => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = renderPage();
    await loaded();

    expect(screen.queryByText(RESULTS_COPY.statsDelay)).not.toBeInTheDocument();
    await waitFor(() => expect(publishButton()).toBeEnabled());
    fireEvent.click(publishButton());
    fireEvent.click(within(await screen.findByRole("dialog", { name: RESULTS_COPY.publishTitle })).getByRole("button", { name: RESULTS_COPY.publishConfirm }));

    expect(await screen.findByText(RESULTS_COPY.statsDelay)).toBeInTheDocument();

    const refreshCall = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === STATS_REFRESH_DELAY_MS);

    expect(refreshCall).toBeGreaterThanOrEqual(0);

    const requestsBefore = statsRequests;
    const refresh = setTimeoutSpy.mock.calls[refreshCall]?.[0] as () => void;

    refresh();
    await waitFor(() => expect(statsRequests).toBe(requestsBefore + 1));

    // A second publish re-arms the timer; unmounting clears the pending one.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(publishButton()).toBeEnabled());
    fireEvent.click(publishButton());
    fireEvent.click(within(await screen.findByRole("dialog", { name: RESULTS_COPY.publishTitle })).getByRole("button", { name: RESULTS_COPY.publishConfirm }));
    await waitFor(() => expect(setTimeoutSpy.mock.calls.filter(([, delay]) => delay === STATS_REFRESH_DELAY_MS)).toHaveLength(2));

    const refreshIndexes = setTimeoutSpy.mock.calls.flatMap(([, delay], index) => (delay === STATS_REFRESH_DELAY_MS ? [index] : []));
    const pendingIndex = refreshIndexes[refreshIndexes.length - 1] ?? -1;
    const pendingTimer = setTimeoutSpy.mock.results[pendingIndex]?.value;

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(pendingTimer);
  });

  it("links back to the grading queue", async() => {
    renderPage();
    await loaded();

    expect(screen.getByRole("link", { name: RESULTS_COPY.backToQueue })).toHaveAttribute("href", "/grading");
  });
});
