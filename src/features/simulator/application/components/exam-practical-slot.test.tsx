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
*   v1.1 (review of eb3c21b): one explicit PUT on success (no player onChange), onChange only when the save fails, a double click starts one session, the link read from question.answer on return, and a settled lookup without the session shows an error with retry.
*   v1.2 (review of e45841f): a new linked session id under the app-wide keepPreviousData never shows a false "not found".
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptAnswer, AttemptQuestion } from "@features/evaluations";
import type { StartedSession } from "../entities/simulator.entity";
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

  it("creates the EXAM session, saves the answer with one explicit PUT and only then opens the console (no player onChange)", async() => {
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
    // The player autosave would PUT the same link again (and a stale resend after the deadline could get a 409).
    expect(onChange).not.toHaveBeenCalled();
    expect(saveAnswer).toHaveBeenCalledTimes(1);
    expect(saveAnswer).toHaveBeenCalledWith("a1", "q1", "s9");

    const order = (mock: { mock: { invocationCallOrder: number[] } }) => mock.mock.invocationCallOrder[0] ?? 0;

    expect(order(start)).toBeLessThan(order(saveAnswer));
    expect(order(saveAnswer)).toBeLessThan(order(router.push));
  });

  it("a double click starts exactly one session", async() => {
    server.use(caseHandler(), attemptHandler());

    let resolveStart: (value: StartedSession) => void = () => undefined;
    const start = vi.fn(() => new Promise<StartedSession>((resolve) => {
      resolveStart = resolve;
    }));
    const saveAnswer = vi.fn(() => Promise.resolve());

    renderSlot({ deps: { loadStart: () => Promise.resolve(start), saveAnswer, examReturn: createExamReturnStore(memoryStorageGetter()) } });

    const button = await screen.findByRole("button", { name: "Iniciar parte práctica" });

    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    resolveStart({ id: "s9", seed: 1, engineVersion: "1.0.0", startedAt: "", expiresAt: null, timeMultiplier: 1, engineCase: buildEngineCase() });

    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    expect(start).toHaveBeenCalledTimes(1);
    expect(saveAnswer).toHaveBeenCalledTimes(1);
  });

  it("reads the linked session from question.answer when the student is back (no player answer)", async() => {
    server.use(caseHandler(), attemptHandler(), historyHandler("ACTIVE"));
    renderSlot({ answer: null, question: buildQuestion({ answer: { selectedOptionIds: [], textAnswer: null, simulationSessionId: "s9" } }) });

    expect(await screen.findByRole("button", { name: "Continuar parte práctica" })).toBeInTheDocument();
  });

  it("a settled history lookup without the linked session is an error with a retry, not an endless check", async() => {
    let calls = 0;

    server.use(caseHandler(), attemptHandler(), http.get(apiUrl("/api/simulation/sessions/history"), () => {
      calls += 1;

      return HttpResponse.json(envelope(calls === 1 ? [] : [sessionDto("s9", { mode: "EXAM", status: "ACTIVE", attemptId: "a1", questionId: "q1" })]));
    }));
    renderSlot({ answer: { selectedOptionIds: [], textAnswer: null, simulationSessionId: "s9" } });

    expect(await screen.findByText(/No se encontró la sesión vinculada a esta pregunta/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("button", { name: "Continuar parte práctica" })).toBeInTheDocument();
  });

  it("a new linked session id never shows the previous lookup as \"not found\" (global keepPreviousData)", async() => {
    let releaseS9: () => void = () => undefined;
    const s9Ready = new Promise<void>((resolve) => {
      releaseS9 = resolve;
    });

    server.use(caseHandler(), attemptHandler(), http.get(apiUrl("/api/simulation/sessions/history"), async({ request }) => {
      const ids = new URL(request.url).searchParams.getAll("ids").join(",");

      if (ids.includes("s9")) {
        await s9Ready;

        return HttpResponse.json(envelope([sessionDto("s9", { mode: "EXAM", status: "ENDED", attemptId: "a1", questionId: "q1" })]));
      }

      return HttpResponse.json(envelope([sessionDto("s1", { mode: "EXAM", status: "ACTIVE", attemptId: "a1", questionId: "q1" })]));
    }));

    const examReturn = createExamReturnStore(memoryStorageGetter());
    const deps = { loadStart: () => Promise.reject(new Error("unused")), saveAnswer: vi.fn(() => Promise.resolve()), examReturn };
    const slotFor = (sessionId: string) => (
      <ExamPracticalSlot
        question={buildQuestion()}
        answer={{ selectedOptionIds: [], textAnswer: null, simulationSessionId: sessionId }}
        onChange={vi.fn()}
        deps={deps}
      />
    );
    // The app-wide SWR config keeps the previous data across a key change.
    const KeepPrevious = ({ children }: { children: ReactNode }) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false, keepPreviousData: true }}>
        {children}
      </SWRConfig>
    );
    const view = render(slotFor("s1"), { wrapper: KeepPrevious });

    expect(await screen.findByRole("button", { name: "Continuar parte práctica" })).toBeInTheDocument();

    view.rerender(slotFor("s9"));
    // While s9 loads, the s1 list is still the data: it must not read as "s9 not found".
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/No se encontró la sesión vinculada/)).not.toBeInTheDocument();

    releaseS9();
    expect(await screen.findByText("Parte práctica completada")).toBeInTheDocument();
    expect(screen.queryByText(/No se encontró la sesión vinculada/)).not.toBeInTheDocument();
  });

  it("stays on the exam with the message when the answer cannot be saved", async() => {
    server.use(caseHandler(), attemptHandler());

    const saveAnswer = vi.fn(() => Promise.reject(new Error("offline")));

    renderSlot({ deps: { loadStart: () => Promise.resolve(() => Promise.resolve({ id: "s9", seed: 1, engineVersion: "1.0.0", startedAt: "", expiresAt: null, timeMultiplier: 1, engineCase: {} })), saveAnswer } });
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar parte práctica" }));

    expect(await screen.findByText(/no se pudo guardar en tu examen/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("hands the link to the player only when the save fails, so the slot keeps \"Continuar\"", async() => {
    server.use(caseHandler(), attemptHandler());

    const saveAnswer = vi.fn(() => Promise.reject(new Error("offline")));
    const { onChange } = renderSlot({ deps: { loadStart: () => Promise.resolve(() => Promise.resolve({ id: "s9", seed: 1, engineVersion: "1.0.0", startedAt: "", expiresAt: null, timeMultiplier: 1, engineCase: {} })), saveAnswer } });

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar parte práctica" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ selectedOptionIds: [], textAnswer: null, simulationSessionId: "s9" }));
    expect(onChange).toHaveBeenCalledTimes(1);
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
