/*
* Funcionalidad: AttemptPlayerPage layouts tests
* Descripción: Verifies the presentation per evaluation type of the attempt player (Bloque 3, W3): QUIZ shows every question and checks a single choice on select through the server (no PUT, July verdicts, explanation, locked controls, aria-live region), a multiple choice is autosaved and checked with "Comprobar respuesta", a revealed answer survives a reload, a 422 falls back to the autosave and a PUT refused with 409 evaluation.answer_locked is terminal (no retry, no error toast); WORKSHOP goes "Paso n de N" with "Pista 💡" / "Ocultar pista", "¡Muy bien! 🌟" with the July generic text when there is no explanation, focus on the question heading, Alt+←/→ and "Enviar taller" on the last step; EXAM announces the 10-minute warning in an aria-live region. Depends on Testing Library, msw, vitest and the evaluations test helpers.
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
import type { StudentAttemptDetailDTO } from "../../api/dtos/evaluations.dto";
import { AttemptPlayerPage } from "./attempt-player.page";
import { apiUrl, attemptDetailDto, envelope, errorResponse, optionDto, questionDto, renderWithSession } from "./evaluations-test-helpers";

const router = vi.hoisted(() => ({
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
const LAZY = { timeout: 5000 };
let attempt: StudentAttemptDetailDTO;
let saved: string[] = [];
let checks: Array<{ questionId: string, body: unknown }> = [];

const peep = () => questionDto("q1", 0, "SINGLE_CHOICE", {
  prompt: "¿Qué PEEP inicial programarías?",
  options: [optionDto("o1", 0, "5 cmH2O"), optionDto("o2", 1, "10 cmH2O")],
});
const modes = () => questionDto("q2", 1, "MULTIPLE_CHOICE", {
  prompt: "¿Qué modos son controlados?",
  options: [optionDto("m1", 0, "VC"), optionDto("m2", 1, "PC"), optionDto("m3", 2, "CPAP")],
});

function withType(type: "QUIZ" | "WORKSHOP" | "EXAM", overrides: Partial<StudentAttemptDetailDTO> = {}): StudentAttemptDetailDTO {
  return attemptDetailDto("at1", {
    evaluation: { id: "e1", title: "Evaluación de PEEP", type, description: null },
    questions: [peep(), modes()],
    ...overrides,
  });
}

function renderPlayer() {
  return renderWithSession(<AttemptPlayerPage evaluationId="e1" attemptId="at1" />);
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.replace.mockClear();
  sessionStorage.clear();
  saved = [];
  checks = [];
  attempt = withType("QUIZ");
  server.use(
    http.get(apiUrl("/api/evaluation-attempts/:attemptId"), () => HttpResponse.json(envelope(attempt))),
    http.put(apiUrl("/api/evaluation-attempts/:attemptId/answers/:questionId"), ({ params }) => {
      saved.push(String(params.questionId));

      return HttpResponse.json(envelope({ questionId: params.questionId }));
    }),
    http.post(apiUrl("/api/my-evaluations/attempts/:attemptId/answers/:questionId/check"), async({ params, request }) => {
      const body = await request.json() as { selectedOptionIds: string[] };

      checks.push({ questionId: String(params.questionId), body });

      if (params.questionId === "q1") {
        const isCorrect = body.selectedOptionIds[0] === "o2";

        return HttpResponse.json(envelope({ isCorrect, correctOptionIds: ["o2"], explanation: isCorrect ? null : "La PEEP de 10 recluta mejor." }));
      }

      return HttpResponse.json(envelope({ isCorrect: true, correctOptionIds: ["m1", "m2"], explanation: null }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});

describe("AttemptPlayerPage — QUIZ", () => {
  it("shows every question and checks a single choice on select without a PUT", async() => {
    renderPlayer();

    expect(await screen.findByRole("heading", { level: 2, name: "Pregunta 1 de 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Pregunta 2 de 2" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación de preguntas" })).not.toBeInTheDocument();

    const first = screen.getByRole("region", { name: "Pregunta 1 de 2" });

    fireEvent.click(within(first).getByRole("radio", { name: "5 cmH2O" }));

    expect(await within(first).findByText("Casi. La respuesta correcta era \"10 cmH2O\"")).toBeInTheDocument();
    expect(within(first).getByText("La PEEP de 10 recluta mejor.")).toBeInTheDocument();
    expect(within(first).getByText("Casi. La respuesta correcta era \"10 cmH2O\"").closest("[aria-live='polite']")).not.toBeNull();
    expect(within(first).getByRole("radio", { name: "10 cmH2O" })).toBeDisabled();
    expect(checks).toEqual([{ questionId: "q1", body: { selectedOptionIds: ["o1"] } }]);
    expect(saved).toEqual([]);
    expect(screen.getByRole("button", { name: "Enviar quiz" })).toBeInTheDocument();
  });

  it("autosaves a multiple choice and checks it with Comprobar respuesta", async() => {
    renderPlayer();

    const second = await screen.findByRole("region", { name: "Pregunta 2 de 2" });

    expect(within(second).getByRole("button", { name: "Comprobar respuesta" })).toBeDisabled();
    fireEvent.click(within(second).getByRole("checkbox", { name: "VC" }));
    fireEvent.click(within(second).getByRole("checkbox", { name: "PC" }));
    await waitFor(() => {
      expect(saved).toContain("q2");
    }, LAZY);

    fireEvent.click(within(second).getByRole("button", { name: "Comprobar respuesta" }));

    expect(await within(second).findByText("¡Correcto! 🎉")).toBeInTheDocument();
    expect(checks).toEqual([{ questionId: "q2", body: { selectedOptionIds: ["m1", "m2"] } }]);
    expect(within(second).queryByRole("button", { name: "Comprobar respuesta" })).not.toBeInTheDocument();
    expect(within(second).getByRole("checkbox", { name: "CPAP" })).toBeDisabled();
  });

  it("keeps a revealed answer after a reload", async() => {
    attempt = withType("QUIZ", {
      questions: [
        questionDto("q1", 0, "SINGLE_CHOICE", {
          options: [optionDto("o1", 0, "5 cmH2O"), optionDto("o2", 1, "10 cmH2O")],
          answer: { selectedOptionIds: ["o2"], textAnswer: null, simulationSessionId: null },
          reveal: { revealedAt: "2026-10-14T15:01:00.000Z", isCorrect: true, correctOptionIds: ["o2"], explanation: "Bien recordado." },
        }),
      ],
    });
    renderPlayer();

    expect(await screen.findByText("¡Correcto! 🎉")).toBeInTheDocument();
    expect(screen.getByText("Bien recordado.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "5 cmH2O" })).toBeDisabled();
  });

  it("falls back to the autosave when the server refuses the check (422)", async() => {
    server.use(http.post(apiUrl("/api/my-evaluations/attempts/:attemptId/answers/:questionId/check"), () =>
      errorResponse("evaluation.answer_check_unavailable", 422)));
    renderPlayer();

    fireEvent.click(await screen.findByRole("radio", { name: "10 cmH2O" }));

    await waitFor(() => {
      expect(saved).toEqual(["q1"]);
    }, LAZY);
    expect(await screen.findByText("Respuesta guardada")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "5 cmH2O" })).not.toBeDisabled();
  });

  it("treats a PUT refused because the answer is locked as final", async() => {
    let puts = 0;

    server.use(http.put(apiUrl("/api/evaluation-attempts/:attemptId/answers/:questionId"), () => {
      puts += 1;

      return errorResponse("evaluation.answer_locked", 409);
    }));
    renderPlayer();

    const second = await screen.findByRole("region", { name: "Pregunta 2 de 2" });

    fireEvent.click(within(second).getByRole("checkbox", { name: "VC" }));
    await waitFor(() => {
      expect(puts).toBe(1);
    }, LAZY);
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });

    expect(puts).toBe(1);
    expect(screen.queryByText("Esta respuesta ya fue revisada y no se puede cambiar.")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("AttemptPlayerPage — WORKSHOP", () => {
  it("goes step by step with the hint, the explanation after answering, focus and Alt shortcuts", async() => {
    attempt = withType("WORKSHOP", {
      questions: [
        questionDto("q1", 0, "SINGLE_CHOICE", {
          hint: "Piensa en el reclutamiento.",
          options: [optionDto("o1", 0, "5 cmH2O"), optionDto("o2", 1, "10 cmH2O")],
        }),
        questionDto("q2", 1, "OPEN_TEXT", { prompt: "Justifica." }),
      ],
    });
    server.use(http.post(apiUrl("/api/my-evaluations/attempts/:attemptId/answers/:questionId/check"), () =>
      HttpResponse.json(envelope({ isCorrect: true, correctOptionIds: ["o2"], explanation: null }))));
    renderPlayer();

    expect(await screen.findByText("Paso 1 de 2")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pregunta 2 de 2" })).not.toBeInTheDocument();

    const hint = screen.getByRole("button", { name: "Pista 💡" });

    expect(hint).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(hint);
    expect(screen.getByText("Piensa en el reclutamiento.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Ocultar pista" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("radio", { name: "10 cmH2O" }));

    expect(await screen.findByText("¡Muy bien! 🌟")).toBeInTheDocument();
    expect(screen.getByText("La opción correcta es \"10 cmH2O\". Revisa el material del módulo para profundizar en este tema.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pista/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar taller" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    const heading = await screen.findByRole("heading", { level: 2, name: "Pregunta 2 de 2" });

    expect(heading).toHaveFocus();
    expect(screen.getByText("Paso 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar taller" })).toBeInTheDocument();

    // Ignored while typing in the answer.
    fireEvent.keyDown(screen.getByLabelText("Tu respuesta"), { key: "ArrowLeft", altKey: true });
    expect(screen.getByText("Paso 2 de 2")).toBeInTheDocument();

    fireEvent.keyDown(heading, { key: "ArrowLeft", altKey: true });
    expect(await screen.findByText("Paso 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Pregunta 1 de 2" })).toHaveFocus();
  });
});

describe("AttemptPlayerPage — EXAM", () => {
  it("gives no immediate feedback and announces the 10-minute warning", async() => {
    attempt = withType("EXAM", { serverNow: "2026-10-14T15:20:01.000Z", deadlineAt: "2026-10-14T15:30:00.000Z" });
    renderPlayer();

    expect(await screen.findByText("Quedan 10 minutos para terminar el intento.")).toBeInTheDocument();
    expect(screen.getByText("Quedan 10 minutos para terminar el intento.")).toHaveAttribute("aria-live", "polite");

    fireEvent.click(screen.getByRole("radio", { name: "5 cmH2O" }));
    await waitFor(() => {
      expect(saved).toEqual(["q1"]);
    }, LAZY);
    expect(checks).toEqual([]);
    expect(screen.queryByText(/Correcto|Casi/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar examen" })).toBeInTheDocument();
  });
});
