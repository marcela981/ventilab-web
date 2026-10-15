/*
* Funcionalidad: AttemptPlayerPage tests
* Descripción: Renders /evaluations/[evaluationId]/attempts/[attemptId] against a mocked backend (msw) with a mocked next/router: the attempt payload without isCorrect, explanation or rubric renders with its sticky scenario, a choice is autosaved with a PUT, the current question survives a remount (sessionStorage), the submit dialog states the unanswered count, a double click on "Enviar" sends one POST and opens the result, the SIMULATION question renders the disabled practical slot with its notice, a submitted attempt redirects to its result, and at zero the attempt is submitted once automatically (fake timers). Depends on vitest, Testing Library, msw and the evaluations test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentAttemptDetailDTO } from "../../api/dtos/evaluations.dto";
import { PRACTICAL_COPY } from "../components/questions/practical-question-slot";
import { AttemptPlayerPage } from "./attempt-player.page";
import {
  apiUrl,
  attemptDetailDto,
  envelope,
  optionDto,
  questionDto,
  renderWithSession,
  scenarioDto,
} from "./evaluations-test-helpers";

const router = vi.hoisted(() => ({
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
const RESULT_URL = "/evaluations/e1/attempts/at1/result";
const LAZY = { timeout: 5000 };
let attempt: StudentAttemptDetailDTO;
let saved: Array<{ questionId: string, body: unknown }> = [];
let submits = 0;

function buildAttempt(overrides: Partial<StudentAttemptDetailDTO> = {}): StudentAttemptDetailDTO {
  return attemptDetailDto("at1", {
    scenarios: [scenarioDto("s1", 0, "Paciente de 60 kg con SDRA moderado.")],
    questions: [
      questionDto("q1", 0, "SINGLE_CHOICE", {
        scenarioId: "s1",
        prompt: "¿Qué PEEP inicial programarías?",
        options: [optionDto("o1", 0, "5 cmH2O"), optionDto("o2", 1, "10 cmH2O")],
      }),
      questionDto("q2", 1, "OPEN_TEXT", { prompt: "Justifica el ajuste de FiO2." }),
      questionDto("q3", 2, "SIMULATION", { prompt: "Ventila al paciente del caso.", clinicalCaseId: "case-ards", points: 3 }),
    ],
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
  router.push.mockClear();
  sessionStorage.clear();
  saved = [];
  submits = 0;
  attempt = buildAttempt();
  server.use(
    http.get(apiUrl("/api/evaluation-attempts/:attemptId"), () => HttpResponse.json(envelope(attempt))),
    http.put(apiUrl("/api/evaluation-attempts/:attemptId/answers/:questionId"), async({ params, request }) => {
      saved.push({ questionId: String(params.questionId), body: await request.json() });

      return HttpResponse.json(envelope({ questionId: params.questionId }));
    }),
    http.post(apiUrl("/api/evaluation-attempts/:attemptId/submit"), () => {
      submits += 1;
      attempt = { ...attempt, status: "SUBMITTED", submittedAt: "2026-10-14T15:20:00.000Z" };

      return HttpResponse.json(envelope({ attemptId: "at1", status: "SUBMITTED", published: false }));
    }),
    http.get(apiUrl("/api/my-evaluations"), () => HttpResponse.json(envelope([]))),
    http.get(apiUrl("/api/my-evaluations/grades"), () => HttpResponse.json(envelope([]))),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});

describe("AttemptPlayerPage", () => {
  it("renders an unpublished attempt that carries no correctness, explanation or rubric", async() => {
    const payload = JSON.stringify(attempt);

    expect(payload).not.toMatch(/isCorrect|explanation|rubric|earnedScore/);

    renderPlayer();

    expect(await screen.findByRole("heading", { level: 1, name: "Quiz de PEEP" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Pregunta 1 de 3" })).toBeInTheDocument();
    // Plain-text rich content loads its markdown renderer lazily.
    expect(await screen.findByText("¿Qué PEEP inicial programarías?", {}, LAZY)).toBeInTheDocument();
    expect(await within(screen.getByRole("complementary", { name: "Escenario clínico" })).findByText("Paciente de 60 kg con SDRA moderado.", {}, LAZY))
      .toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("autosaves a choice with a PUT", async() => {
    renderPlayer();

    fireEvent.click(await screen.findByRole("radio", { name: "10 cmH2O" }));

    await waitFor(() => {
      expect(saved).toEqual([{ questionId: "q1", body: { selectedOptionIds: ["o2"] } }]);
    }, LAZY);
    expect(await screen.findByText("Respuesta guardada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pregunta 1, respondida" })).toBeInTheDocument();
  });

  it("resumes on the stored question after a remount", async() => {
    const first = renderPlayer();

    fireEvent.click(await screen.findByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("heading", { level: 2, name: "Pregunta 2 de 3" })).toBeInTheDocument();
    first.unmount();

    renderPlayer();

    expect(await screen.findByRole("heading", { level: 2, name: "Pregunta 2 de 3" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tu respuesta")).toBeInTheDocument();
  });

  it("states the unanswered questions and submits once on a double click", async() => {
    renderPlayer();

    fireEvent.click(await screen.findByRole("radio", { name: "5 cmH2O" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar intento" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Enviar el intento?" });

    expect(dialog).toHaveTextContent("Tienes 2 preguntas sin responder.");

    const confirm = within(dialog).getByRole("button", { name: "Enviar" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(RESULT_URL);
    }, LAZY);
    expect(submits).toBe(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
    // The pending choice was flushed before the submit.
    expect(saved).toEqual([{ questionId: "q1", body: { selectedOptionIds: ["o1"] } }]);
  });

  it("renders the SIMULATION question as the disabled practical slot", async() => {
    renderPlayer();

    fireEvent.click(await screen.findByRole("button", { name: "Pregunta 3, sin responder" }));

    const slot = screen.getByRole("group", { name: PRACTICAL_COPY.title });

    expect(slot).toHaveAttribute("aria-disabled", "true");
    expect(slot).toHaveTextContent(PRACTICAL_COPY.notice);
    expect(slot).toHaveTextContent("case-ards");
  });

  it("marks a question for review in the navigator", async() => {
    renderPlayer();

    fireEvent.click(await screen.findByRole("button", { name: "Marcar para revisión" }));

    expect(screen.getByRole("button", { name: "Pregunta 1, sin responder, marcada para revisión" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar marca de revisión" })).toHaveAttribute("aria-pressed", "true");
  });

  it("redirects a submitted attempt to its result", async() => {
    attempt = buildAttempt({ status: "SUBMITTED", submittedAt: "2026-10-14T15:20:00.000Z" });
    renderPlayer();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(RESULT_URL);
    });
    expect(screen.queryByRole("button", { name: "Enviar intento" })).not.toBeInTheDocument();
  });

  it("submits automatically once when the timer reaches zero", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    attempt = buildAttempt({ serverNow: "2026-10-14T15:29:57.000Z", deadlineAt: "2026-10-14T15:30:00.000Z" });
    renderPlayer();

    expect(await screen.findByRole("timer")).toHaveAccessibleName("Tiempo restante: 00:03");

    await act(async() => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(RESULT_URL);
    });
    expect(submits).toBe(1);
  });
});
