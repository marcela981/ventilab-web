/*
* Funcionalidad: EvaluationsListPage tests
* Descripción: Renders /evaluations against a mocked backend (msw): active evaluations by default with counts per tab, the card details (type, linked title, duration, attempts, last attempt status and published grade colored by `passed`), switching tabs, the type filter chips with the filtered empty state, the load error with retry, and the socket events evaluation:activated and grade:published refetching my evaluations and my grades. Depends on vitest, Testing Library, msw and the evaluations test helpers.
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
import {
  apiUrl,
  attemptDto,
  createFakeSocket,
  envelope,
  errorResponse,
  myEvaluationDto,
  renderWithSession,
} from "./evaluations-test-helpers";
import { EvaluationsListPage } from "./evaluations-list.page";

const server = setupServer();
let evaluationRequests = 0;
let gradeRequests = 0;

const evaluations = [
  myEvaluationDto("as1", "e1", {
    evaluation: { title: "Examen final", type: "EXAM", durationMinutes: 90, maxAttempts: 1 },
    canStart: false,
    attempts: [attemptDto("at1", 1, { status: "GRADED", published: true, grade: 3.5, passed: true, score: 7, maxScore: 10 })],
  }),
  myEvaluationDto("as2", "e2", {
    evaluation: { title: "Quiz de PEEP", type: "QUIZ", durationMinutes: null },
    attempts: [attemptDto("at2", 1, { status: "IN_PROGRESS", submittedAt: null })],
  }),
  myEvaluationDto("as3", "e3", { state: "UPCOMING", canStart: false, evaluation: { title: "Taller de modos", type: "WORKSHOP" } }),
  myEvaluationDto("as4", "e4", {
    state: "CLOSED",
    canStart: false,
    evaluation: { title: "Quiz cerrado", type: "QUIZ" },
    attempts: [attemptDto("at4", 1, { status: "GRADED", published: true, grade: 2.4, passed: false, score: 4, maxScore: 10 })],
  }),
];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  evaluationRequests = 0;
  gradeRequests = 0;
  server.use(
    http.get(apiUrl("/api/my-evaluations"), () => {
      evaluationRequests += 1;

      return HttpResponse.json(envelope(evaluations));
    }),
    http.get(apiUrl("/api/my-evaluations/grades"), () => {
      gradeRequests += 1;

      return HttpResponse.json(envelope([]));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("EvaluationsListPage", () => {
  it("shows the active evaluations with counts per tab and the card details", async() => {
    renderWithSession(<EvaluationsListPage />);

    const list = await screen.findByRole("list", { name: "Evaluaciones activas" });
    const cards = within(list).getAllByRole("article");

    expect(cards).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Activas (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Próximas (1)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cerradas (1)" })).toBeInTheDocument();

    const exam = within(list).getByRole("article", { name: "Examen final" });

    expect(within(exam).getByRole("link", { name: "Examen final" })).toHaveAttribute("href", "/evaluations/e1");
    expect(exam).toHaveTextContent("Examen");
    expect(exam).toHaveTextContent("1 h 30 min");
    expect(exam).toHaveTextContent("1 de 1 intento");
    expect(exam).toHaveTextContent("Calificado");
    expect(within(exam).getByText("3,5").parentElement).toHaveClass("gradePassed");
    expect(exam).toHaveTextContent("Aprobado");

    const quiz = within(list).getByRole("article", { name: "Quiz de PEEP" });

    expect(quiz).toHaveTextContent("Sin límite de tiempo");
    expect(quiz).toHaveTextContent("En curso");
    expect(quiz).not.toHaveTextContent("Nota");
  });

  it("switches tabs and shows a failed published grade in the closed tab", async() => {
    renderWithSession(<EvaluationsListPage />);

    fireEvent.click(await screen.findByRole("tab", { name: "Cerradas (1)" }));

    const list = await screen.findByRole("list", { name: "Evaluaciones cerradas" });
    const card = within(list).getByRole("article", { name: "Quiz cerrado" });

    expect(within(card).getByText("2,4").parentElement).toHaveClass("gradeFailed");
    expect(card).toHaveTextContent("No aprobado");
  });

  it("filters by type and shows the empty state of the filter", async() => {
    renderWithSession(<EvaluationsListPage />);

    await screen.findByRole("list", { name: "Evaluaciones activas" });
    fireEvent.click(screen.getByRole("button", { name: "Quiz" }));

    expect(screen.getByRole("button", { name: "Quiz" })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("list", { name: "Evaluaciones activas" })).getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Activas (1)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Taller" }));

    expect(screen.getByText("No tienes evaluaciones activas.")).toBeInTheDocument();
    expect(screen.getByText("Prueba con otro tipo de evaluación.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Próximas (1)" }));

    expect(within(screen.getByRole("list", { name: "Evaluaciones próximas" })).getByRole("article", { name: "Taller de modos" }))
      .toBeInTheDocument();
  });

  it("shows the load error and retries", async() => {
    server.use(http.get(apiUrl("/api/my-evaluations"), () => errorResponse("common.internal_error", 500), { once: true }));
    renderWithSession(<EvaluationsListPage />);

    expect(await screen.findByText("No se pudieron cargar las evaluaciones")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));

    expect(await screen.findByRole("list", { name: "Evaluaciones activas" })).toBeInTheDocument();
  });

  it("refetches my evaluations and grades on evaluation:activated and grade:published", async() => {
    const socket = createFakeSocket();

    renderWithSession(<EvaluationsListPage />, { socket });
    await screen.findByRole("list", { name: "Evaluaciones activas" });
    await waitFor(() => {
      expect(socket.listenerCount("evaluation:activated")).toBe(1);
    });

    const before = evaluationRequests;

    socket.emit("evaluation:activated", {
      evaluationId: "e9",
      assignmentId: "as9",
      title: "Nueva",
      type: "QUIZ",
      startsAt: "2026-10-14T13:00:00.000Z",
      endsAt: "2026-10-15T13:00:00.000Z",
    });
    await waitFor(() => {
      expect(evaluationRequests).toBe(before + 1);
    });

    socket.emit("grade:published", {
      attemptId: "at1",
      evaluationId: "e1",
      score: 7,
      maxScore: 10,
      grade: 3.5,
      passed: true,
      publishedAt: "2026-10-14T15:00:00.000Z",
    });
    await waitFor(() => {
      expect(evaluationRequests).toBe(before + 2);
    });
    // The grades query is not mounted on this page, so revalidating its key requests nothing.
    expect(gradeRequests).toBe(0);
  });
});
