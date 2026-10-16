/*
* Funcionalidad: Exam practical slot tests
* Descripción: Drives the EXAM practical slot of a SIMULATION question with msw (clinical case, attempt deadline and
*   the history `ids` lookup of a linked session) and a mocked router on the attempt route: the case and the rubric
*   rules (criteria, weights, passing score, assistance policy with its penalty), the note when the rubric is not
*   published yet, the start sequence (EXAM session with attempt and question → onChange with the session id → saved
*   answer → console) in that order, a failed save that keeps the student on the exam, "Continuar parte práctica" for
*   an ACTIVE session (no new session), "Parte práctica completada" with the result link for an ended one, the
*   read-only mode, and the exam start routine itself (POST body, stored EXAM record with the exam context and the
*   server clock offset, exam return record). Depends on vitest, Testing Library, msw and the simulator test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptAnswer, AttemptQuestion } from "@features/evaluations";
import { createExamReturnStore } from "../session/exam-return-store";
import { startExamSession } from "../session/exam-session-start";
import { createSessionStore } from "../session/session-store";
import { buildEngineCase, createMemoryStorage } from "../session/sim-session-test-helpers";
import { apiUrl, envelope, renderWithSwr, sessionDto, startedSessionDto } from "../pages/simulator-test-helpers";
import { ExamPracticalSlot } from "./exam-practical-slot";
import type { ExamPracticalSlotProps } from "./exam-practical-slot";

const router = vi.hoisted(() => ({
  push: vi.fn(() => Promise.resolve(true)),
  query: { evaluationId: "e1", attemptId: "a1" } as Record<string, string>,
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();

/** One storage per store (a new storage per access would forget every write). */
function memoryStorageGetter() {
  const storage = createMemoryStorage();

  return () => storage;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  router.push.mockClear();
  router.query = { evaluationId: "e1", attemptId: "a1" };
});

const RUBRIC = {
  assistancePolicy: "ALLOWED_WITH_PENALTY",
  passingScore: 70,
  criteria: [
    { type: "TARGETS_REACHED", weight: 60, threshold: 0.8 },
    { type: "PLATEAU_PRESSURE_LIMIT", weight: 30, threshold: 30, penaltyPoints: 2 },
    { type: "AI_ASSIST_USAGE", weight: 10, threshold: 0, penaltyPoints: 5 },
  ],
};

function buildQuestion(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    id: "q1",
    scenarioId: null,
    position: 0,
    type: "SIMULATION",
    prompt: null,
    media: [],
    points: 4,
    clinicalCaseId: "case-1",
    options: [],
    answer: null,
    ...overrides,
  };
}

function caseHandler() {
  return http.get(apiUrl("/api/clinical-cases/case-1"), () => HttpResponse.json(envelope({
    clinicalCase: {
      id: "case-1",
      title: "SDRA moderado",
      description: "Paciente de 54 años con neumonía grave.",
      educationalGoal: "Ventilación protectora",
      mainDiagnosis: "SDRA",
      pathology: "SDRA",
      difficulty: "INTERMEDIATE",
      patientAge: 54,
      patientWeight: 80,
      comorbidities: [],
      labData: null,
    },
    userAttempts: { total: 0, bestScore: null, lastAttempt: null, attempts: [] },
  })));
}

function attemptHandler() {
  return http.get(apiUrl("/api/evaluation-attempts/a1"), () => HttpResponse.json(envelope({
    id: "a1",
    assignmentId: null,
    attemptNumber: 1,
    status: "IN_PROGRESS",
    startedAt: "2026-10-16T14:00:00.000Z",
    submittedAt: null,
    deadlineAt: "2026-10-16T15:30:00.000Z",
    serverNow: "2026-10-16T14:10:00.000Z",
    published: false,
    evaluation: { id: "e1", title: "Parcial", type: "EXAM", description: null },
    scenarios: [],
    questions: [],
  })));
}

function historyHandler(status: string) {
  return http.get(apiUrl("/api/simulation/sessions/history"), () => HttpResponse.json(envelope([
    sessionDto("s9", { mode: "EXAM", status, attemptId: "a1", questionId: "q1" }),
  ])));
}

function renderSlot(props: Partial<ExamPracticalSlotProps> = {}) {
  const onChange = vi.fn();
  const start = vi.fn(() => Promise.resolve({
    id: "s9", seed: 1, engineVersion: "1.0.0", startedAt: "2026-10-16T14:10:00.000Z", expiresAt: "2026-10-16T15:30:00.000Z", timeMultiplier: 1, engineCase: buildEngineCase(),
  }));
  const saveAnswer = vi.fn(() => Promise.resolve());
  const examReturn = createExamReturnStore(memoryStorageGetter());

  renderWithSwr(
    <ExamPracticalSlot
      question={buildQuestion()}
      answer={null}
      onChange={onChange}
      deps={{ loadStart: () => Promise.resolve(start), saveAnswer, examReturn }}
      {...props}
    />,
  );

  return { onChange, start, saveAnswer, examReturn };
}

describe("ExamPracticalSlot", () => {
  it("shows the case, the rubric rules with the assistance penalty and the deadline", async() => {
    server.use(caseHandler(), attemptHandler());
    renderSlot({ question: buildQuestion({ rubric: RUBRIC }) });

    expect(await screen.findByText("SDRA moderado")).toBeInTheDocument();
    expect(screen.getByText("Paciente de 54 años con neumonía grave.")).toBeInTheDocument();

    const plateau = screen.getByRole("rowheader", { name: "Límite de presión meseta" }).closest("tr");

    expect(plateau).toHaveTextContent("30");
    expect(plateau).toHaveTextContent("2");
    expect(screen.getByRole("rowheader", { name: "Objetivos alcanzados" }).closest("tr")).toHaveTextContent("60");
    expect(screen.getByText("Puntaje mínimo para aprobar: 70")).toBeInTheDocument();
    expect(screen.getByText("Permitida con penalización: cada solicitud descuenta 5 puntos.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Fecha límite del intento").nextElementSibling?.textContent).toMatch(/2026/));
    expect(screen.getByRole("button", { name: "Iniciar parte práctica" })).toBeEnabled();
  });

  it("says the rubric is shown with the published grade when the question does not expose it", async() => {
    server.use(caseHandler(), attemptHandler());
    renderSlot();

    expect(await screen.findByText(/se muestran cuando se publica la calificación/)).toHaveAttribute("role", "note");
    expect(screen.getByText(/durante el examen la asesoría queda desactivada/)).toBeInTheDocument();
  });

  it("creates the EXAM session, hands the answer to the player, saves it and only then opens the console", async() => {
    server.use(caseHandler(), attemptHandler());

    const { start, onChange, saveAnswer } = renderSlot({ question: buildQuestion({ rubric: RUBRIC }) });

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar parte práctica" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulator/sessions/s9"));
    expect(start).toHaveBeenCalledWith({
      attemptId: "a1",
      questionId: "q1",
      evaluationId: "e1",
      caseId: "case-1",
      returnUrl: "/evaluations/e1/attempts/a1",
      assistancePolicy: "ALLOWED_WITH_PENALTY",
    });
    expect(onChange).toHaveBeenCalledWith({ selectedOptionIds: [], textAnswer: null, simulationSessionId: "s9" });
    expect(saveAnswer).toHaveBeenCalledWith("a1", "q1", "s9");

    const order = (mock: { mock: { invocationCallOrder: number[] } }) => mock.mock.invocationCallOrder[0] ?? 0;

    expect(order(start)).toBeLessThan(order(onChange));
    expect(order(onChange)).toBeLessThan(order(saveAnswer));
    expect(order(saveAnswer)).toBeLessThan(order(router.push));
  });

  it("stays on the exam with the message when the answer cannot be saved", async() => {
    server.use(caseHandler(), attemptHandler());

    const saveAnswer = vi.fn(() => Promise.reject(new Error("offline")));

    renderSlot({ deps: { loadStart: () => Promise.resolve(() => Promise.resolve({ id: "s9", seed: 1, engineVersion: "1.0.0", startedAt: "", expiresAt: null, timeMultiplier: 1, engineCase: {} })), saveAnswer } });
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar parte práctica" }));

    expect(await screen.findByText(/no se pudo guardar en tu examen/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("continues an ACTIVE session instead of creating a new one", async() => {
    server.use(caseHandler(), attemptHandler(), historyHandler("ACTIVE"));

    const answer: AttemptAnswer = { selectedOptionIds: [], textAnswer: null, simulationSessionId: "s9" };
    const { start, saveAnswer, examReturn } = renderSlot({ answer });

    fireEvent.click(await screen.findByRole("button", { name: "Continuar parte práctica" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulator/sessions/s9"));
    expect(start).not.toHaveBeenCalled();
    expect(saveAnswer).toHaveBeenCalledWith("a1", "q1", "s9");
    expect(examReturn.read("s9")).toEqual({ evaluationId: "e1", attemptId: "a1" });
    expect(screen.queryByRole("button", { name: "Iniciar parte práctica" })).not.toBeInTheDocument();
  });

  it("shows the completed practical part with a link to its result", async() => {
    server.use(caseHandler(), attemptHandler(), historyHandler("ENDED"));
    renderSlot({ question: buildQuestion({ answer: { selectedOptionIds: [], textAnswer: null, simulationSessionId: "s9" } }) });

    expect(await screen.findByText("Parte práctica completada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver resultado de la parte práctica" })).toHaveAttribute("href", "/simulator/sessions/s9/result");
    expect(screen.queryByRole("button", { name: /parte práctica/ })).not.toBeInTheDocument();
  });

  it("never starts a session in read-only mode", async() => {
    server.use(caseHandler(), attemptHandler());
    renderSlot({ readOnly: true });

    expect(await screen.findByText("SDRA moderado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar parte práctica" })).not.toBeInTheDocument();
  });
});

describe("startExamSession", () => {
  it("posts an EXAM session with the attempt and question and stores the EXAM record with its exam context", async() => {
    let body: unknown = null;

    server.use(
      http.post(apiUrl("/api/simulation/sessions"), async({ request }) => {
        body = await request.json();

        return HttpResponse.json(envelope(startedSessionDto("s9", { expiresAt: "2026-10-16T15:30:00.000Z", case: buildEngineCase() as unknown as Record<string, never> })), { status: 201 });
      }),
      attemptHandler(),
    );

    const store = createSessionStore(memoryStorageGetter());
    const examReturn = createExamReturnStore(memoryStorageGetter());
    const clientNow = Date.parse("2026-10-16T14:09:58.000Z");
    const session = await startExamSession({
      attemptId: "a1",
      questionId: "q1",
      evaluationId: "e1",
      caseId: "case-1",
      returnUrl: "/evaluations/e1/attempts/a1",
      assistancePolicy: "DISABLED",
    }, { store, examReturn, now: () => clientNow });

    expect(session.id).toBe("s9");
    expect(body).toEqual({ mode: "EXAM", attemptId: "a1", questionId: "q1", timeMultiplier: 1, caseId: "case-1" });
    expect(store.read("s9")).toMatchObject({
      mode: "EXAM",
      fresh: true,
      expiresAt: "2026-10-16T15:30:00.000Z",
      exam: {
        attemptId: "a1",
        questionId: "q1",
        evaluationId: "e1",
        returnUrl: "/evaluations/e1/attempts/a1",
        assistancePolicy: "DISABLED",
        serverOffsetMs: 2000,
      },
    });
    expect(examReturn.read("s9")).toEqual({ evaluationId: "e1", attemptId: "a1" });
  });
});
