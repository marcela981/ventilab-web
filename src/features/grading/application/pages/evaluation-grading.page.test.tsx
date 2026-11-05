/*
* Funcionalidad: EvaluationGradingPage tests
* Descripción: Renders the unified grading screen with a mocked next/router and backend (msw): the Revisar tab lists every attempt with the July header "Total · Entregadas · Calificadas", the status chips write `?status=`, choosing an attempt writes `?attempt=` with a shallow replace and `?attempt=` opens the review pane; "Reiniciar intento" requires a reason, posts it and handles 409 evaluation.assignment_not_active (window and link to the builder section) and 409 evaluation.attempt_in_progress; the tabs switch with `?tab=` and the back link opens the Calificar tab. Depends on vitest, Testing Library, msw and the grading test helpers. v1.1 (ajustes C1): the attempts list shows the release state of each graded attempt ("Sin liberar", "Nota liberada", "Nota y respuestas liberadas").
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
import type { GradingAttemptListItemDTO } from "../../api/dtos/grading.dto";
import { EvaluationGradingPage } from "./evaluation-grading.page";
import { apiUrl, envelope, errorResponse, feedbackDto, gradingAttemptDto, renderGradingPage } from "./grading-test-helpers";

vi.setConfig({ testTimeout: 20_000 });

const router = vi.hoisted(() => ({
  isReady: true,
  pathname: "/grading/evaluations/[evaluationId]",
  asPath: "/grading/evaluations/ev-1",
  query: {} as Record<string, string>,
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
let listQueries: URLSearchParams[] = [];
let resetBodies: Array<{ userId: string, body: unknown }> = [];

function rowDto(attemptId: string, overrides: Partial<GradingAttemptListItemDTO> = {}): GradingAttemptListItemDTO {
  return {
    attemptId,
    evaluationId: "ev-1",
    assignmentId: "as-1",
    groupId: "g1",
    attemptNumber: 1,
    student: { id: `st-${attemptId}`, name: `Estudiante ${attemptId}`, email: `${attemptId}@ventylab.demo` },
    status: "GRADED",
    startedAt: "2026-10-11T10:00:00.000Z",
    submittedAt: "2026-10-11T10:30:00.000Z",
    score: 4,
    maxScore: 5,
    grade: 4,
    gradePublishedAt: null,
    answersReleasedAt: null,
    isLate: false,
    ...overrides,
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.query = { evaluationId: "ev-1" };
  router.replace.mockClear();
  listQueries = [];
  resetBodies = [];
  server.use(
    http.get(apiUrl("/api/analytics/evaluations/:evaluationId/stats"), () => errorResponse("analytics.evaluation_not_found", 404)),
    http.get(apiUrl("/api/evaluation-assignments"), () => HttpResponse.json(envelope([]))),
    http.get(apiUrl("/api/evaluation-grading/attempts"), ({ request }) => {
      listQueries.push(new URL(request.url).searchParams);

      return HttpResponse.json(envelope(
        {
          items: [
            rowDto("a1"),
            rowDto("a2", { status: "IN_PROGRESS", grade: null, score: null, submittedAt: null }),
            rowDto("a3", { gradePublishedAt: "2026-10-12T16:00:00.000Z" }),
            rowDto("a4", { gradePublishedAt: "2026-10-12T16:00:00.000Z", answersReleasedAt: "2026-10-12T16:00:00.000Z" }),
          ],
          counts: { IN_PROGRESS: 1, SUBMITTED: 2, PENDING_REVIEW: 3, GRADED: 4, total: 10 } },
        { page: 1, limit: 10, total: 4, pages: 1 },
      ));
    }),
    http.get(apiUrl("/api/evaluation-grading/attempts/:attemptId"), ({ params }) => HttpResponse.json(envelope(gradingAttemptDto(String(params.attemptId))))),
    http.get(apiUrl("/api/evaluation-grading/attempts/:attemptId/feedback"), ({ params }) => HttpResponse.json(envelope(feedbackDto(String(params.attemptId))))),
    http.post(apiUrl("/api/evaluation-grading/students/:userId/evaluations/:evaluationId/reset"), async({ params, request }) => {
      resetBodies.push({ userId: String(params.userId), body: await request.json() });

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

function renderPage() {
  return renderGradingPage(<EvaluationGradingPage evaluationId="ev-1" />);
}

describe("EvaluationGradingPage — Revisar", () => {
  it("lists every attempt with the July header and opens one through ?attempt=", async() => {
    renderPage();

    expect(screen.getByRole("tab", { name: "Revisar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "Volver a Calificar" })).toHaveAttribute("href", "/evaluations?tab=calificar");
    expect(await screen.findByText("Total 10 · Entregadas 9 · Calificadas 4", {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(listQueries[0]?.get("evaluationId")).toBe("ev-1");

    const list = screen.getByRole("list", { name: "Intentos de la evaluación" });

    // The release state of every graded attempt.
    expect(within(list).getByRole("button", { name: "Revisar el intento 1 de Estudiante a1" })).toHaveTextContent("Sin liberar");
    expect(within(list).getByRole("button", { name: "Revisar el intento 1 de Estudiante a2" })).not.toHaveTextContent(/liberad/);
    expect(within(list).getByRole("button", { name: "Revisar el intento 1 de Estudiante a3" })).toHaveTextContent("Nota liberada");
    expect(within(list).getByRole("button", { name: "Revisar el intento 1 de Estudiante a4" })).toHaveTextContent("Nota y respuestas liberadas");
    // No reset while the attempt is in progress.
    expect(within(list).getByRole("button", { name: "Reiniciar intento de Estudiante a1" })).toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: "Reiniciar intento de Estudiante a2" })).not.toBeInTheDocument();
    expect(screen.getByText("Elige un intento de la lista para revisarlo.")).toBeInTheDocument();

    fireEvent.click(within(list).getByRole("button", { name: "Revisar el intento 1 de Estudiante a1" }));

    expect(router.replace).toHaveBeenCalledWith(
      { pathname: "/grading/evaluations/[evaluationId]", query: { evaluationId: "ev-1", attempt: "a1" } },
      undefined,
      { shallow: true },
    );
  });

  it("filters by status through ?status= and shows the pane of ?attempt=", async() => {
    router.query = { evaluationId: "ev-1", attempt: "a1", status: "GRADED" };
    renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Estudiante a1 · Intento #2" }, { timeout: 10_000 })).toBeInTheDocument();
    await waitFor(() => expect(listQueries.some((query) => query.get("status") === "GRADED")).toBe(true));
    expect(screen.getByRole("button", { name: "Calificado" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Por revisar" }));

    expect(router.replace).toHaveBeenLastCalledWith(
      { pathname: "/grading/evaluations/[evaluationId]", query: { evaluationId: "ev-1", attempt: "a1", status: "PENDING_REVIEW,GRADED" } },
      undefined,
      { shallow: true },
    );
  });

  it("resets an attempt with a mandatory reason", async() => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reiniciar intento de Estudiante a1" }, { timeout: 10_000 }));

    const dialog = await screen.findByRole("dialog", { name: "Reiniciar intento" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Reiniciar" }));
    expect(await within(dialog).findByText("Escribe el motivo del reinicio.")).toBeInTheDocument();
    expect(resetBodies).toEqual([]);

    fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: "  Se cayó la conexión  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reiniciar" }));

    await waitFor(() => expect(resetBodies).toEqual([{ userId: "st-a1", body: { reason: "Se cayó la conexión" } }]));
    expect(await screen.findByText("Estudiante a1 podrá presentar la evaluación otra vez.")).toBeInTheDocument();
  });

  it("explains both reset conflicts and links to the builder to extend the window", async() => {
    server.use(http.post(apiUrl("/api/evaluation-grading/students/:userId/evaluations/:evaluationId/reset"), () => HttpResponse.json(
      {
        success: false,
        message: "evaluation.assignment_not_active",
        code: "evaluation.assignment_not_active",
        data: { assignmentId: "as-1", startsAt: "2026-10-01T13:00:00.000Z", endsAt: "2026-10-05T13:00:00.000Z" },
        timestamp: "",
        traceId: "t",
        pagination: null,
      },
      { status: 409 },
    ), { once: true }));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reiniciar intento de Estudiante a1" }, { timeout: 10_000 }));

    const dialog = await screen.findByRole("dialog", { name: "Reiniciar intento" });

    fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: "Repetir" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reiniciar" }));

    expect(await within(dialog).findByText(/La asignación de esta evaluación no está activa/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Ventana de la asignación:/)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Extender la ventana en el constructor" }))
      .toHaveAttribute("href", "/evaluations/manage/ev-1/edit?section=asignacion");

    server.use(http.post(apiUrl("/api/evaluation-grading/students/:userId/evaluations/:evaluationId/reset"), () =>
      errorResponse("evaluation.attempt_in_progress", 409), { once: true }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Reiniciar" }));

    expect(await within(dialog).findByText(/tiene un intento en curso/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Extender la ventana en el constructor" })).not.toBeInTheDocument();
  });
});

describe("EvaluationGradingPage — tabs", () => {
  it("opens the tab of the URL and writes the chosen tab", async() => {
    router.query = { evaluationId: "ev-1", tab: "publicacion" };
    renderPage();

    expect(screen.getByRole("tab", { name: "Publicación masiva" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Estadísticas" }));

    expect(router.replace).toHaveBeenCalledWith(
      { pathname: "/grading/evaluations/[evaluationId]", query: { evaluationId: "ev-1", tab: "estadisticas" } },
      undefined,
      { shallow: true },
    );
  });
});
