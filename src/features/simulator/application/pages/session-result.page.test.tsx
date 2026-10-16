/*
* Funcionalidad: Simulation session result page tests
* Descripción: Drives /simulator/sessions/[sessionId]/result with msw (summary, replay and the history `ids` lookup)
*   and a fake worker client that answers the replay request with the real engine replay (jsdom has no Worker): the
*   FREE summary (server score labelled as the server's, objectives, time to stabilise, safety violations, AI assist
*   count, no breakdown), the local evolution charts (charts module stubbed) built from a replay run in the worker, the
*   discreet note when the local final metrics differ from the server ones (server values kept), the EXAM rubric
*   breakdown with "Volver al examen" (recorded attempt or the evaluations list) and the 404 state. Depends on vitest,
*   Testing Library, msw, the engine replay and the simulator test helpers. v1.1: the evolution charts are line charts.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { replay } from "@shared/sim-engine";
import type { SimCommand } from "@shared/sim-engine";
import { createExamReturnStore } from "../session/exam-return-store";
import { buildEngineCase, createFakeWorker, createMemoryStorage } from "../session/sim-session-test-helpers";
import type { FakeWorker } from "../session/sim-session-test-helpers";
import { SessionResultPage } from "./session-result.page";
import { apiUrl, envelope, errorResponse, renderWithSwr, replayDto, sessionDto, summaryDto } from "./simulator-test-helpers";

// The evolution uses line charts; a bar chart in the result would show up as a different figure.
vi.mock("@shared/charts", () => ({
  LineChart: ({ title, labels }: { title: string, labels: readonly string[] }) => <figure aria-label={title} data-chart="line">{labels.join(" ")}</figure>,
  BarChart: ({ title }: { title: string }) => <figure aria-label={title} data-chart="bar" />,
}));

const ENGINE_CASE = buildEngineCase();
const RECORDED = [{ id: "e1", simTimeMs: 3000, type: "PARAM_CHANGE", payload: { changes: { peepCmH2O: 8 } }, receivedAt: "2026-10-15T14:00:03.000Z" }];
const LOCAL = replay(ENGINE_CASE, 42, [{ type: "PARAM_CHANGE", simTimeMs: 3000, changes: { peepCmH2O: 8 } }], 8000, { timeMultiplier: 1 });
const SERVER_FINAL: unknown = JSON.parse(JSON.stringify(LOCAL.final));

const BREAKDOWN = [
  { criterion: "TARGETS_REACHED", weight: 2, value: 1, threshold: 0.8, points: 1, weightedPoints: 0.5, justification: "All targets met at the end." },
  { criterion: "TIME_TO_STABILIZE", weight: 1, value: 42, threshold: 60, points: 1, weightedPoints: 0.25, justification: "Stable at 42 s." },
  { criterion: "SAFETY_VIOLATIONS", weight: 1, value: 3.5, threshold: 10, points: 0.65, weightedPoints: 0.16, justification: "3.5 s over the plateau limit." },
];

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Setup = { mode?: "FREE" | "EXAM", finalMetrics?: unknown, attemptId?: string | null };

function installHandlers({ mode = "FREE", finalMetrics = SERVER_FINAL, attemptId = null }: Setup = {}) {
  server.use(
    http.get(apiUrl("/api/simulation/sessions/s1/summary"), () => HttpResponse.json(envelope(summaryDto({
      targets: [{ id: "SPO2", status: "MET", value: 93, min: 88, max: 95 }, { id: "PLATEAU_PRESSURE", status: "UNMET", value: 32, min: null, max: 30 }],
      breakdown: BREAKDOWN,
      aiHelpCount: 2,
      finalMetrics,
    })))),
    http.get(apiUrl("/api/simulation/sessions/s1/replay"), () => HttpResponse.json(envelope(replayDto({ case: ENGINE_CASE, events: RECORDED })))),
    http.get(apiUrl("/api/simulation/sessions/history"), () => HttpResponse.json(envelope([sessionDto("s1", { mode, attemptId, questionId: attemptId ? "q1" : null })]))),
  );
}

/** A fake worker that answers a replay request with the real engine replay, as the worker host does. */
function createReplayingWorker(): FakeWorker {
  const worker = createFakeWorker();
  const send = worker.send.bind(worker);

  worker.send = (command: SimCommand) => {
    send(command);

    if (command.type === "replay") {
      const { engineCase, seed, events, untilMs, options } = command.request;

      void Promise.resolve().then(() => worker.emit({ type: "replayResult", requestId: command.requestId, result: replay(engineCase, seed, events, untilMs, options) }));
    }
  };

  return worker;
}

function renderPage(setup: Setup & { store?: ReturnType<typeof createExamReturnStore> } = {}) {
  installHandlers(setup);

  const workers: FakeWorker[] = [];
  const createWorker = vi.fn(() => {
    const worker = createReplayingWorker();

    workers.push(worker);

    return worker;
  });

  renderWithSwr(<SessionResultPage sessionId="s1" deps={{ createWorker, ...(setup.store ? { examReturn: setup.store } : {}) }} />);

  return { workers, createWorker };
}

describe("SessionResultPage", () => {
  it("shows the FREE server summary and the local evolution run in the worker", async() => {
    const { workers } = renderPage();

    expect(await screen.findByText("Puntaje calculado por el servidor")).toBeInTheDocument();
    expect(screen.getByText(/^82\s?%$/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resultado del servidor" })).toBeInTheDocument();

    const spo2 = screen.getByRole("rowheader", { name: "SpO2" }).closest("tr");

    expect(spo2).toHaveTextContent("88–95 %");
    expect(spo2).toHaveTextContent("Cumplido");
    expect(screen.getByRole("rowheader", { name: "Presión meseta" }).closest("tr")).toHaveTextContent("No cumplido");
    expect(screen.getByText("Tiempo hasta estabilizar").nextElementSibling).toHaveTextContent("42 s");
    expect(screen.getByText("Violaciones de seguridad").nextElementSibling).toHaveTextContent("3,5 s fuera de los límites de seguridad");
    expect(screen.getByText("Solicitudes de asesoría IA").nextElementSibling).toHaveTextContent("2");
    expect(screen.queryByText("Desglose de la rúbrica (servidor)")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Volver al examen" })).not.toBeInTheDocument();

    expect(await screen.findByRole("figure", { name: "SpO2 (%)" })).toHaveAttribute("data-chart", "line");
    expect(screen.getByRole("figure", { name: "PaCO2 (mmHg)" })).toHaveAttribute("data-chart", "line");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();

    const request = workers[0]?.sent.find((command) => command.type === "replay");

    expect(request?.type === "replay" ? request.request : null).toMatchObject({
      seed: 42,
      untilMs: 8000,
      events: [{ type: "PARAM_CHANGE", simTimeMs: 3000, changes: { peepCmH2O: 8 } }],
      options: { timeMultiplier: 1 },
    });
    await waitFor(() => expect(workers[0]?.terminated).toBe(true));
    expect(screen.getByRole("link", { name: "Ver repetición" })).toHaveAttribute("href", "/simulator/sessions/s1/replay");
  });

  it("notes a local-versus-server difference without replacing the server result", async() => {
    const altered = JSON.parse(JSON.stringify(LOCAL.final)) as { gasExchange: { spo2Percent: number } };

    altered.gasExchange.spo2Percent += 2;
    renderPage({ finalMetrics: altered });

    expect(await screen.findByRole("note")).toHaveTextContent("La repetición local no coincide del todo con el resultado del servidor");
    expect(screen.getByText(/^82\s?%$/)).toBeInTheDocument();
  });

  it("shows the EXAM rubric breakdown and returns to the recorded attempt", async() => {
    const storage = createMemoryStorage();
    const store = createExamReturnStore(() => storage);

    store.save("s1", { evaluationId: "e1", attemptId: "a1" });
    renderPage({ mode: "EXAM", attemptId: "a1", store });

    expect(await screen.findByRole("heading", { name: "Desglose de la rúbrica (servidor)" })).toBeInTheDocument();

    const targets = screen.getByRole("rowheader", { name: "Objetivos alcanzados" }).closest("tr");

    expect(targets).toHaveTextContent("All targets met at the end.");
    expect(screen.getByRole("link", { name: "Volver al examen" })).toHaveAttribute("href", "/evaluations/e1/attempts/a1");
  });

  it("falls back to the evaluations list when the exam attempt route is unknown", async() => {
    renderPage({ mode: "EXAM", attemptId: "a1", store: createExamReturnStore(() => createMemoryStorage()) });

    expect(await screen.findByRole("link", { name: "Volver al examen" })).toHaveAttribute("href", "/evaluations");
  });

  it("shows the server message when the session does not exist", async() => {
    server.use(
      http.get(apiUrl("/api/simulation/sessions/s1/summary"), () => errorResponse("simulation.session_not_found", 404)),
      http.get(apiUrl("/api/simulation/sessions/s1/replay"), () => errorResponse("simulation.session_not_found", 404)),
      http.get(apiUrl("/api/simulation/sessions/history"), () => HttpResponse.json(envelope([]))),
    );
    renderWithSwr(<SessionResultPage sessionId="s1" deps={{ createWorker: () => createReplayingWorker() }} />);

    expect(await screen.findByText("No se encontró la sesión de simulación.")).toBeInTheDocument();
    expect(screen.getByText("No se pudo cargar el resultado")).toBeInTheDocument();
  });
});
