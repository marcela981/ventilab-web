/*
* Funcionalidad: AttemptResultPage tests
* Descripción: Covers the attempt result page against an msw backend: an IN_PROGRESS attempt goes back to the player; unpublished attempts (SUBMITTED, PENDING_REVIEW) show only their state, render no question detail and never request the feedback; a published attempt shows the es-CO grade with the pass/fail class from `passed`, per-question earned points, the correct option, the teacher explanation and the simulation rubric; the AI feedback goes from the PENDING skeleton to READY after a FEEDBACK_READY notification for the attempt (and ignores other attempts), and DETERMINISTIC items carry the "Retroalimentación automática" label with the rating widget. Depends on Vitest, Testing Library, msw and the evaluations test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentAttemptDetailDTO, StudentGradeFeedbackDTO } from "../../api/dtos/evaluations.dto";
import { AttemptResultPage } from "./attempt-result.page";
import {
  apiUrl,
  attemptDetailDto,
  createFakeSocket,
  envelope,
  errorResponse,
  optionDto,
  questionDto,
  renderWithSession,
} from "./evaluations-test-helpers";
import type { FakeSocket } from "./evaluations-test-helpers";

const router = vi.hoisted(() => ({
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
const LAZY = { timeout: 5000 };
let attempt: StudentAttemptDetailDTO;
let feedback: StudentGradeFeedbackDTO;
let feedbackRequests = 0;

function unpublishedAttempt(status: StudentAttemptDetailDTO["status"]): StudentAttemptDetailDTO {
  return attemptDetailDto("at1", {
    status,
    submittedAt: "2026-10-14T15:20:00.000Z",
    questions: [
      questionDto("q1", 0, "SINGLE_CHOICE", { options: [optionDto("o1", 0, "5 cmH2O"), optionDto("o2", 1, "10 cmH2O")] }),
    ],
  });
}

function publishedAttempt(overrides: Partial<StudentAttemptDetailDTO> = {}): StudentAttemptDetailDTO {
  return attemptDetailDto("at1", {
    status: "GRADED",
    submittedAt: "2026-10-14T15:20:00.000Z",
    published: true,
    grade: 3.5,
    passed: false,
    score: 3.5,
    maxScore: 5,
    questions: [
      questionDto("q1", 0, "SINGLE_CHOICE", {
        prompt: "¿Qué PEEP inicial programarías?",
        points: 2,
        earnedScore: 0,
        explanation: "En SDRA moderado se parte de una PEEP de 10 cmH2O.",
        options: [optionDto("o1", 0, "5 cmH2O", { isCorrect: false }), optionDto("o2", 1, "10 cmH2O", { isCorrect: true })],
        answer: { selectedOptionIds: ["o1"], textAnswer: null, simulationSessionId: null },
      }),
      questionDto("q2", 1, "SIMULATION", {
        prompt: "Ventila al paciente del caso.",
        points: 3,
        earnedScore: 2.5,
        clinicalCaseId: "case-ards",
        rubric: {
          criteria: [{ parameter: "peep", expectedValue: 10, min: 8, max: 12, priority: "CRITICO" }],
        } as unknown as Record<string, never>,
      }),
    ],
    ...overrides,
  });
}

const feedbackItem = (id: string, questionId: string | null, status: "PENDING" | "READY" | "FAILED", source: "LLM" | "DETERMINISTIC" | null = null, content: string | null = null) =>
  ({ id, questionId, status, source, content });

function renderResult(socket?: FakeSocket) {
  return renderWithSession(<AttemptResultPage evaluationId="e1" attemptId="at1" />, socket ? { socket } : {});
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.replace.mockClear();
  feedbackRequests = 0;
  attempt = publishedAttempt();
  feedback = { attemptId: "at1", overall: null, questions: [] };
  server.use(
    http.get(apiUrl("/api/evaluation-attempts/:attemptId"), () => HttpResponse.json(envelope(attempt))),
    http.get(apiUrl("/api/evaluation-attempts/:attemptId/feedback"), () => {
      feedbackRequests += 1;

      return attempt.published ? HttpResponse.json(envelope(feedback)) : errorResponse("evaluation.feedback_not_found", 404);
    }),
    http.get(apiUrl("/api/ai-ratings/mine"), () => HttpResponse.json(envelope(null))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("AttemptResultPage", () => {
  it("sends an attempt in progress back to the player", async() => {
    attempt = unpublishedAttempt("IN_PROGRESS");

    renderResult();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/evaluations/e1/attempts/at1"));
  });

  it("shows a submitted attempt without any graded detail or feedback request", async() => {
    attempt = unpublishedAttempt("SUBMITTED");

    expect(JSON.stringify(attempt)).not.toMatch(/isCorrect|explanation|rubric|earnedScore/);

    renderResult();

    expect(await screen.findByRole("heading", { level: 2, name: "Enviado" })).toBeInTheDocument();
    expect(screen.getByText(/te notificaremos cuando esté disponible/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Pregunta 1 de 1" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("attempt-grade")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mis evaluaciones" })).toHaveAttribute("href", "/evaluations");
    expect(screen.getByRole("link", { name: "Ver la evaluación" })).toHaveAttribute("href", "/evaluations/e1");
    expect(feedbackRequests).toBe(0);
  });

  it("shows a pending review attempt as pending grading", async() => {
    attempt = unpublishedAttempt("PENDING_REVIEW");

    renderResult();

    expect(await screen.findByRole("heading", { level: 2, name: "Pendiente de calificación" })).toBeInTheDocument();
    expect(feedbackRequests).toBe(0);
  });

  it("shows the published grade, the per-question result and the rubric", async() => {
    renderResult();

    const grade = await screen.findByTestId("attempt-grade");

    expect(within(grade).getByText("3,5")).toBeInTheDocument();
    expect(within(grade).getByText("Reprobado")).toBeInTheDocument();
    expect(grade).toHaveClass("gradeFailed");
    expect(screen.getByText("3,5 de 5 puntos")).toBeInTheDocument();

    const first = screen.getByRole("region", { name: "Pregunta 1 de 2" });

    expect(within(first).getByText("0 / 2 puntos")).toBeInTheDocument();

    const review = within(first).getByRole("list", { name: "Revisión de las opciones" });

    expect(within(review).getByText("Respuesta correcta:").closest("li")).toHaveClass("reviewCorrect");
    expect(within(review).getByText("Tu respuesta (incorrecta):").closest("li")).toHaveClass("reviewWrong");
    expect(await within(first).findByText("En SDRA moderado se parte de una PEEP de 10 cmH2O.", {}, LAZY)).toBeInTheDocument();

    const second = screen.getByRole("region", { name: "Pregunta 2 de 2" });
    const rubric = within(second).getByRole("table", { name: "Rúbrica de la pregunta práctica" });

    expect(within(second).getByText("2,5 / 3 puntos")).toBeInTheDocument();
    expect(within(rubric).getByRole("rowheader", { name: "PEEP" })).toBeInTheDocument();
    expect(within(rubric).getByText("8 – 12")).toBeInTheDocument();
    expect(within(rubric).getByText("Crítico")).toBeInTheDocument();
  });

  it("colors a passed grade with the passed class", async() => {
    attempt = publishedAttempt({ grade: 4.2, passed: true });

    renderResult();

    const grade = await screen.findByTestId("attempt-grade");

    expect(within(grade).getByText("4,2")).toBeInTheDocument();
    expect(within(grade).getByText("Aprobado")).toBeInTheDocument();
    expect(grade).toHaveClass("gradePassed");
  });

  it("replaces the pending feedback skeleton when FEEDBACK_READY arrives for this attempt", async() => {
    const socket = createFakeSocket();

    feedback = { attemptId: "at1", overall: feedbackItem("f0", null, "PENDING"), questions: [feedbackItem("f1", "q1", "PENDING")] };
    renderResult(socket);

    expect(await screen.findByRole("status", { name: "Retroalimentación general: Generando retroalimentación…" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Retroalimentación de la pregunta: Generando retroalimentación…" })).toBeInTheDocument();

    feedback = {
      attemptId: "at1",
      overall: feedbackItem("f0", null, "READY", "LLM", "Buen manejo general de la ventilación."),
      questions: [feedbackItem("f1", "q1", "READY", "DETERMINISTIC", "La PEEP correcta era 10 cmH2O.")],
    };
    const requestsBefore = feedbackRequests;

    socket.emit("notification:new", {
      id: "n1",
      type: "FEEDBACK_READY",
      title: "Retroalimentación lista",
      body: "",
      createdAt: "2026-10-14T16:00:00.000Z",
      readAt: null,
      data: { attemptId: "other" } as unknown as Record<string, never>,
    });
    expect(feedbackRequests).toBe(requestsBefore);

    socket.emit("notification:new", {
      id: "n2",
      type: "FEEDBACK_READY",
      title: "Retroalimentación lista",
      body: "",
      createdAt: "2026-10-14T16:00:00.000Z",
      readAt: null,
      data: { attemptId: "at1", evaluationId: "e1" } as unknown as Record<string, never>,
    });

    expect(await screen.findByText("Buen manejo general de la ventilación.", {}, LAZY)).toBeInTheDocument();
    expect(await screen.findByText("La PEEP correcta era 10 cmH2O.", {}, LAZY)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /Generando retroalimentación/ })).not.toBeInTheDocument();

    const questionFeedback = screen.getByRole("region", { name: "Retroalimentación de la pregunta" });

    expect(within(questionFeedback).getByText("Retroalimentación automática")).toBeInTheDocument();
    expect(within(questionFeedback).getByText("¿Te fue útil?")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Retroalimentación general" })).queryByText("Retroalimentación automática"))
      .not.toBeInTheDocument();
  });

  it("shows a discreet message for failed feedback", async() => {
    feedback = { attemptId: "at1", overall: null, questions: [feedbackItem("f1", "q1", "FAILED")] };

    renderResult();

    expect(await screen.findByText("No fue posible generar la retroalimentación de esta pregunta.")).toBeInTheDocument();
  });

  it("reloads the attempt when its grade is published", async() => {
    const socket = createFakeSocket();

    attempt = unpublishedAttempt("PENDING_REVIEW");
    renderResult(socket);
    await screen.findByRole("heading", { level: 2, name: "Pendiente de calificación" });

    attempt = publishedAttempt();
    socket.emit("grade:published", {
      attemptId: "at1",
      evaluationId: "e1",
      score: 3.5,
      maxScore: 5,
      grade: 3.5,
      passed: false,
      publishedAt: "2026-10-14T16:00:00.000Z",
    });

    expect(await screen.findByTestId("attempt-grade")).toHaveClass("gradeFailed");
  });
});
