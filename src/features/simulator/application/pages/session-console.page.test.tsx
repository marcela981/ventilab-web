/*
* Funcionalidad: Simulation session console page tests
* Descripción: Drives /simulator/sessions/[sessionId] with a fake worker client (jsdom has no Worker) and injected
*   HTTP calls: worker init/start from a fresh record and from a server replay (resume), pending → CONFIRMAR producing
*   exactly one PARAM_CHANGE event (client id + simTimeMs of the latest batch) sent to the worker and the server,
*   CANCELAR producing none, the end flow (flush, POST /end, result page) and its failure (error shown, session kept),
*   the FREE engine-version warning versus the EXAM block (no worker), the EXAM time controls without pause, the
*   playback multiplier capped by the session multiplier, the unavailable message and the frame source pushing samples
*   without React state. Background-tab catch-up is covered by the T1 sim-loop tests. Depends on vitest, Testing
*   Library, msw and the simulator test helpers. v1.1: the worker receives the event with its id and no time; it is
*   enqueued only after the batch acknowledgement, with the effective time; end waits for a pending acknowledgement;
*   a rejected change shows an error, rolls the setting back and is never sent. v1.2: the end time is the first paused
*   batch; a refused event opens the blocking divergence dialog and its reload rebuilds from the server; the outbox
*   mirror, the pending indicator and the keepalive page-hide send; unsent events of a reload are replayed and sent
*   before start; metric re-renders are throttled with a trailing refresh; init carries the boot backlog. v1.3 (T7):
*   the built-in "Asesoría IA" launcher (enabled only while running, EXAM without a policy disabled with its reason)
*   and its replacement by a host renderAssist.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, configure, fireEvent, renderHook, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { replay } from "@shared/sim-engine";
import type { SimBatch, SimCommand } from "@shared/sim-engine";
import type { ConsoleSampleBatch } from "@shared/ventilator-console";
import type { SessionReplay } from "../entities/sim-session.entity";
import { useSimSession } from "../hooks/use-sim-session";
import { createEventOutbox } from "../session/event-outbox";
import { createSessionStore } from "../session/session-store";
import type { SessionStore } from "../session/session-store";
import { buildBatch, buildBoot, buildEngineCase, buildRecord, createFakeWorker, createMemoryStorage } from "../session/sim-session-test-helpers";
import type { FakeWorker } from "../session/sim-session-test-helpers";
import { SessionConsolePage } from "./session-console.page";
import type { SessionConsolePageProps } from "./session-console.page";
import { apiUrl, envelope, renderWithSwr } from "./simulator-test-helpers";

const router = vi.hoisted(() => ({ push: vi.fn(() => Promise.resolve(true)) }));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer(
  http.get(apiUrl("/api/clinical-cases/case-1"), () => HttpResponse.json(envelope({
    clinicalCase: {
      id: "case-1",
      title: "SDRA moderado",
      description: "Paciente de 54 años con neumonía grave.",
      educationalGoal: "Ventilación protectora",
      mainDiagnosis: "SDRA",
      pathology: "SDRA",
      difficulty: "BEGINNER",
      patientAge: 54,
      patientWeight: 80,
      comorbidities: [],
      labData: null,
    },
    userAttempts: { total: 0, bestScore: null, lastAttempt: null, attempts: [] },
  }))),
);

// The full console renders slowly on the shared CI-less machine: widen the async and per-test budgets.
vi.setConfig({ testTimeout: 20_000 });

beforeAll(() => {
  configure({ asyncUtilTimeout: 4000 });
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  configure({ asyncUtilTimeout: 1000 });
  server.close();
});

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  router.push.mockClear();
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

type Harness = {
  worker: FakeWorker
  store: SessionStore
  storage: ReturnType<typeof createMemoryStorage>
  createWorker: ReturnType<typeof vi.fn>
  sendEvents: ReturnType<typeof vi.fn>
  sendKeepalive: ReturnType<typeof vi.fn>
  endSession: ReturnType<typeof vi.fn>
  fetchReplay: ReturnType<typeof vi.fn>
};

type RenderOptions = {
  record?: Parameters<typeof buildRecord>[0] | null
  replay?: () => Promise<SessionReplay>
  props?: Partial<SessionConsolePageProps>
  storage?: ReturnType<typeof createMemoryStorage>
};

function renderPage(options: RenderOptions = {}): Harness {
  const worker = createFakeWorker();
  const store = createSessionStore(() => null);
  const storage = options.storage ?? createMemoryStorage();
  const outbox = createEventOutbox(() => storage);
  const createWorker = vi.fn(() => worker);
  const sendEvents = vi.fn(() => Promise.resolve({ accepted: 1, duplicates: 0, lastSimTimeMs: 0 }));
  const sendKeepalive = vi.fn();
  const endSession = vi.fn(() => Promise.resolve());
  const fetchReplay = vi.fn(options.replay ?? (() => Promise.reject(new Error("no replay"))));

  if (options.record !== null) {
    store.save(buildRecord({ fresh: true, ...options.record }));
  }

  renderWithSwr(
    <SessionConsolePage
      sessionId="s1"
      deps={{
        bootstrap: {
          store,
          outbox,
          fetchReplay,
          fetchState: () => Promise.resolve({ id: "s1", status: "ACTIVE", simTimeMs: 6000, expiresAt: null }),
          fetchStartedAt: () => Promise.resolve(null),
        },
        session: { createWorker, sendEvents, sendKeepalive, endSession, outbox, createEventId: () => "evt-1" },
      }}
      {...options.props}
    />,
  );

  return { worker, store, storage, createWorker, sendEvents, sendKeepalive, endSession, fetchReplay };
}

function sentOfType<T extends SimCommand["type"]>(worker: FakeWorker, type: T): Array<Extract<SimCommand, { type: T }>> {
  return worker.sent.filter((command): command is Extract<SimCommand, { type: T }> => command.type === type);
}

async function startRunning(worker: FakeWorker, simTimeMs = 4321): Promise<void> {
  await waitFor(() => expect(sentOfType(worker, "init")).toHaveLength(1));
  act(() => {
    worker.emit({ type: "ready", engineVersion: "1.0.0" });
    worker.emit({ type: "batch", batch: buildBatch({ simTimeMs, status: "running" }) });
  });
}

const increasePeep = () => fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));

/** Confirms the end and answers the pause with a paused batch at `pausedAtMs` (the end time). */
async function endThroughDialog(worker: FakeWorker, pausedAtMs = 4400): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Finalizar sesión" }));
  fireEvent.click(await screen.findByRole("button", { name: "Finalizar" }));
  await waitFor(() => expect(sentOfType(worker, "pause").length).toBeGreaterThan(0));
  act(() => worker.emit({ type: "batch", batch: buildBatch({ simTimeMs: pausedAtMs, status: "paused" }) }));
}

const peepRaise = (id: string, simTimeMs: number) => ({ id, simTimeMs, type: "PARAM_CHANGE" as const, payload: { changes: { peepCmH2O: 6 } } });

describe("SessionConsolePage", () => {
  it("initialises the worker from a fresh record with the session multiplier and starts it when ready", async() => {
    const { worker, fetchReplay } = renderPage({ record: { timeMultiplier: 2 } });

    await startRunning(worker);

    expect(sentOfType(worker, "init")[0]).toMatchObject({
      seed: 42,
      options: { engineOptions: { timeMultiplier: 2 }, multiplier: 2, initialEvents: [], startAtSimTimeMs: 0 },
    });
    expect(sentOfType(worker, "start")).toHaveLength(1);
    expect(fetchReplay).not.toHaveBeenCalled();
    expect(await screen.findByText("SDRA moderado")).toBeInTheDocument();
    expect(screen.getByText("Peso predicho (PBW)").nextElementSibling).toHaveTextContent("70.6 kg");
    expect(screen.getByText("en tiempo real")).toBeInTheDocument();
  });

  it("resumes from the server replay: stored events and the resume time go to the worker init", async() => {
    const { worker } = renderPage({
      record: null,
      replay: () => Promise.resolve({
        id: "s1",
        seed: 9,
        engineVersion: "1.0.0",
        timeMultiplier: 1,
        engineCase: buildEngineCase(),
        events: [{ id: "e1", type: "PARAM_CHANGE", simTimeMs: 3000, payload: { changes: { peepCmH2O: 10 } } }],
      }),
    });

    await waitFor(() => expect(sentOfType(worker, "init")).toHaveLength(1));
    expect(sentOfType(worker, "init")[0]).toMatchObject({
      seed: 9,
      options: { initialEvents: [{ type: "PARAM_CHANGE", simTimeMs: 3000, changes: { peepCmH2O: 10 } }], startAtSimTimeMs: 6000 },
    });
    await startRunning(worker, 6000);
    expect(screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" })).toHaveAttribute("aria-valuenow", "10");
  });

  it("pending → CONFIRMAR sends one PARAM_CHANGE with its id and no time; it is enqueued with the acknowledged time", async() => {
    const { worker, sendEvents, endSession } = renderPage();

    await startRunning(worker);
    increasePeep();
    increasePeep();
    increasePeep();
    expect(sentOfType(worker, "applyEvent")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(sentOfType(worker, "applyEvent")).toEqual([
      { type: "applyEvent", event: { type: "PARAM_CHANGE", changes: { peepCmH2O: 8 }, id: "evt-1" } },
    ]);

    act(() => worker.emit({
      type: "batch",
      batch: buildBatch({ simTimeMs: 4354, status: "running", confirmedEvents: [{ id: "evt-1", effectiveSimTimeMs: 4321 }] }),
    }));
    // A running batch after the pause request does not decide the end time: the first paused batch does.
    fireEvent.click(screen.getByRole("button", { name: "Finalizar sesión" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finalizar" }));
    await waitFor(() => expect(sentOfType(worker, "pause")).toHaveLength(1));
    act(() => worker.emit({ type: "batch", batch: buildBatch({ simTimeMs: 4380, status: "running" }) }));
    act(() => worker.emit({ type: "batch", batch: buildBatch({ simTimeMs: 4400, status: "paused" }) }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulator/sessions/s1/result"));
    expect(sendEvents).toHaveBeenCalledTimes(1);
    expect(sendEvents).toHaveBeenCalledWith("s1", [
      { id: "evt-1", simTimeMs: 4321, type: "PARAM_CHANGE", payload: { changes: { peepCmH2O: 8 } } },
    ]);
    expect(endSession).toHaveBeenCalledWith("s1", 4400);
    expect(sentOfType(worker, "stop")).toHaveLength(1);
  });

  it("end waits for the acknowledgement of a change the worker has not confirmed yet", async() => {
    const { worker, sendEvents } = renderPage();

    await startRunning(worker);
    increasePeep();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    fireEvent.click(screen.getByRole("button", { name: "Finalizar sesión" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finalizar" }));

    await waitFor(() => expect(sentOfType(worker, "pause")).toHaveLength(1));
    expect(sendEvents).not.toHaveBeenCalled();

    act(() => worker.emit({
      type: "batch",
      batch: buildBatch({ simTimeMs: 4321, status: "paused", confirmedEvents: [{ id: "evt-1", effectiveSimTimeMs: 4321 }] }),
    }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulator/sessions/s1/result"));
    expect(sendEvents).toHaveBeenCalledWith("s1", [
      { id: "evt-1", simTimeMs: 4321, type: "PARAM_CHANGE", payload: { changes: { peepCmH2O: 6 } } },
    ]);
  });

  it("a change the worker rejects shows an error, rolls the setting back and is never sent", async() => {
    const { worker, sendEvents } = renderPage();

    await startRunning(worker);
    increasePeep();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    const peep = () => screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });

    expect(peep()).toHaveAttribute("aria-valuenow", "6");

    act(() => worker.emit({
      type: "batch",
      batch: buildBatch({
        simTimeMs: 4354,
        status: "running",
        rejectedEvents: [{ event: { type: "PARAM_CHANGE", id: "evt-1", changes: { peepCmH2O: 6 } }, message: "rejected" }],
      }),
    }));

    expect(await screen.findByText(/no se aplicó/i)).toBeInTheDocument();
    expect(peep()).toHaveAttribute("aria-valuenow", "5");
    await endThroughDialog(worker);
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(sendEvents).not.toHaveBeenCalled();
  });

  it("CANCELAR (or a pending edit never confirmed) produces no event", async() => {
    const { worker, sendEvents } = renderPage();

    await startRunning(worker);
    increasePeep();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    increasePeep();
    await endThroughDialog(worker);

    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(sentOfType(worker, "applyEvent")).toHaveLength(0);
    expect(sendEvents).not.toHaveBeenCalled();
  });

  it("keeps the session and shows the error when the end fails", async() => {
    const { worker, endSession } = renderPage();

    endSession.mockRejectedValueOnce(new ApiError({ code: "common.unknown", message: "", status: 500 }));
    await startRunning(worker);
    await endThroughDialog(worker);

    expect(await screen.findByText(/No se pudo finalizar la sesión/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(sentOfType(worker, "stop")).toHaveLength(0);
    expect(sentOfType(worker, "resume")).toHaveLength(1);
    expect(worker.terminated).toBe(false);
  });

  it("FREE with another engine version runs with a warning banner", async() => {
    const { worker, createWorker } = renderPage({ record: { engineVersion: "0.9.0" } });

    expect(await screen.findByText(/se creó con el motor 0\.9\.0/)).toBeInTheDocument();
    await startRunning(worker);
    expect(createWorker).toHaveBeenCalled();
  });

  it("EXAM with another engine version is blocked before the worker starts", async() => {
    const { createWorker } = renderPage({ record: { engineVersion: "0.9.0", mode: "EXAM" } });

    expect(await screen.findByText("Examen bloqueado")).toBeInTheDocument();
    expect(screen.getByText(/No se puede iniciar el examen/)).toBeInTheDocument();
    expect(createWorker).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Finalizar sesión" })).not.toBeInTheDocument();
  });

  it("EXAM keeps the session multiplier and offers no pause", async() => {
    const { worker } = renderPage({ record: { mode: "EXAM", timeMultiplier: 2 } });

    await startRunning(worker);

    expect(screen.getByText("Velocidad fija ×2 (examen, sin pausa)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pausar" })).not.toBeInTheDocument();
  });

  it("FREE pauses, resumes and changes the playback multiplier up to the session multiplier", async() => {
    const { worker } = renderPage({ record: { timeMultiplier: 2 } });

    await startRunning(worker);
    expect(screen.getByRole("button", { name: "×4" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "×1" }));
    expect(sentOfType(worker, "setMultiplier")).toEqual([{ type: "setMultiplier", multiplier: 1 }]);

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(sentOfType(worker, "pause")).toHaveLength(1);
    act(() => worker.emit({ type: "batch", batch: buildBatch({ simTimeMs: 5000, status: "paused" }) }));
    fireEvent.click(screen.getByRole("button", { name: "Reanudar" }));
    expect(sentOfType(worker, "resume")).toHaveLength(1);
    expect(screen.getByText("La velocidad máxima se eligió al iniciar la práctica en el catálogo; aquí solo puedes bajarla.")).toBeInTheDocument();
  });

  it("a refused event blocks the console as a divergence; reloading rebuilds the session from the server", async() => {
    const { worker, sendEvents, fetchReplay, createWorker } = renderPage({
      replay: () => Promise.resolve({ id: "s1", seed: 42, engineVersion: "1.0.0", timeMultiplier: 1, engineCase: buildEngineCase(), events: [] }),
    });

    sendEvents.mockRejectedValue(new ApiError({ code: "simulation.invalid_settings", message: "", status: 422 }));
    await startRunning(worker);
    increasePeep();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    act(() => worker.emit({
      type: "batch",
      batch: buildBatch({ simTimeMs: 4354, status: "running", confirmedEvents: [{ id: "evt-1", effectiveSimTimeMs: 4321 }] }),
    }));

    const dialog = await screen.findByRole("alertdialog", { name: "La sesión local y la del servidor divergieron" }, { timeout: 6000 });

    expect(dialog).toBeInTheDocument();
    expect(fetchReplay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recargar sesión" }));
    await waitFor(() => expect(fetchReplay).toHaveBeenCalledTimes(1));
    // The console is rebuilt (a new worker) and the dialog is gone.
    await waitFor(() => expect(createWorker).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("mirrors unsent events to sessionStorage, shows them as pending and sends them with keepalive on page hide", async() => {
    const { worker, sendEvents, sendKeepalive, storage } = renderPage();
    let release: () => void = () => undefined;

    sendEvents.mockImplementation(() => new Promise((resolve) => {
      release = () => resolve({ accepted: 1, duplicates: 0, lastSimTimeMs: 4321 });
    }));
    await startRunning(worker);
    increasePeep();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    act(() => worker.emit({
      type: "batch",
      batch: buildBatch({ simTimeMs: 4354, status: "running", confirmedEvents: [{ id: "evt-1", effectiveSimTimeMs: 4321 }] }),
    }));

    expect(await screen.findByText("1 evento pendiente de envío")).toBeInTheDocument();
    expect(JSON.parse(storage.data.get("ventylab.simulator.outbox.s1") ?? "[]")).toEqual([peepRaise("evt-1", 4321)]);

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(sendKeepalive).toHaveBeenCalledWith("s1", [peepRaise("evt-1", 4321)]);

    await waitFor(() => expect(sendEvents).toHaveBeenCalled(), { timeout: 6000 });
    act(() => release());
    await waitFor(() => expect(screen.queryByText("1 evento pendiente de envío")).not.toBeInTheDocument());
    expect(storage.data.has("ventylab.simulator.outbox.s1")).toBe(false);
  });

  it("after a reload, replays and sends the unsent events (minus the stored ones) before starting the simulation", async() => {
    const storage = createMemoryStorage();

    storage.setItem("ventylab.simulator.outbox.s1", JSON.stringify([peepRaise("e1", 3000), peepRaise("e2", 5000)]));

    const sendOrder: string[] = [];
    const { worker, sendEvents } = renderPage({
      record: null,
      storage,
      replay: () => Promise.resolve({
        id: "s1",
        seed: 9,
        engineVersion: "1.0.0",
        timeMultiplier: 1,
        engineCase: buildEngineCase(),
        events: [{ id: "e1", type: "PARAM_CHANGE", simTimeMs: 3000, payload: { changes: { peepCmH2O: 6 } } }],
      }),
    });

    sendEvents.mockImplementation((_id: string, events: Array<{ id: string }>) => {
      sendOrder.push(`send:${events.map((event) => event.id).join(",")}`);

      return Promise.resolve({ accepted: 1, duplicates: 0, lastSimTimeMs: 5000 });
    });

    await waitFor(() => expect(sentOfType(worker, "init")).toHaveLength(1));
    expect(sentOfType(worker, "init")[0]?.options?.initialEvents).toEqual([
      { type: "PARAM_CHANGE", simTimeMs: 3000, changes: { peepCmH2O: 6 } },
      { type: "PARAM_CHANGE", simTimeMs: 5000, changes: { peepCmH2O: 6 } },
    ]);
    act(() => worker.emit({ type: "ready", engineVersion: "1.0.0" }));
    expect(sentOfType(worker, "start")).toHaveLength(0);

    await waitFor(() => expect(sentOfType(worker, "start")).toHaveLength(1));
    expect(sendOrder).toEqual(["send:e2"]);
  });

  it("shows the built-in AI assist launcher, enabled only while the session runs; renderAssist replaces it", async() => {
    const { worker } = renderPage();

    expect(await screen.findByRole("button", { name: "Asesoría IA" })).toBeDisabled();
    await startRunning(worker);
    expect(screen.getByRole("button", { name: "Asesoría IA" })).toBeEnabled();
  });

  it("an EXAM session without a known assistance policy keeps the assist disabled with the reason", async() => {
    const { worker } = renderPage({ record: { mode: "EXAM" }, props: { renderAssist: undefined } });

    await startRunning(worker);
    expect(screen.getByRole("button", { name: "Asesoría IA" })).toBeDisabled();
    expect(screen.getByText("No se pudo verificar la política de asesoría")).toBeInTheDocument();
  });

  it("a host renderAssist replaces the built-in launcher", async() => {
    const { worker } = renderPage({ props: { renderAssist: ({ active }) => <span>{active ? "slot activo" : "slot inactivo"}</span> } });

    await startRunning(worker);
    expect(screen.getByText("slot activo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asesoría IA" })).not.toBeInTheDocument();
  });

  it("explains that the session cannot be resumed when the server cannot rebuild it", async() => {
    renderPage({ record: null });

    expect(await screen.findByText("No se puede reanudar esta sesión en este navegador")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver resultado" })).toHaveAttribute("href", "/simulator/sessions/s1/result");
    expect(screen.getByRole("link", { name: "Volver al simulador" })).toHaveAttribute("href", "/simulator");
  });
});

describe("useSimSession frame source", () => {
  it("pushes batch samples to the console subscribers with a stable source and no React update", () => {
    const worker = createFakeWorker();
    const boot = buildBoot();
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;

      return useSimSession({ boot, blocked: false, deps: { createWorker: () => worker, now: () => 0 } });
    });
    const received: ConsoleSampleBatch[] = [];
    const source = result.current.adapter?.frames;

    source?.subscribe((batch) => received.push(batch));
    act(() => worker.emit({ type: "batch", batch: buildBatch({ status: "running", simTimeMs: 0 }) }));

    const before = renders;

    act(() => {
      worker.emit({ type: "batch", batch: buildBatch({ status: "running", simTimeMs: 20, samples: [{ simTimeMs: 20, pressureCmH2O: 5, flowLpm: 1, volumeMl: 2 }] }) });
    });

    expect(received).toEqual([{ samples: [{ tMs: 20, pressure: 5, flow: 1, volume: 2 }] }]);
    expect(renders).toBe(before);
    expect(result.current.adapter?.frames).toBe(source);
    expect(source).toMatchObject({ sourceId: "s1", sampleRateHz: 50 });
  });

  it("throttles metric re-renders to the UI refresh interval and still shows the last snapshot", async() => {
    const worker = createFakeWorker();
    const boot = buildBoot();
    let wallMs = 0;
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;

      return useSimSession({ boot, blocked: false, deps: { createWorker: () => worker, now: () => wallMs } });
    });
    const { final } = replay(buildEngineCase(), 42, [], 2000);
    const metrics: NonNullable<SimBatch["metrics"]> = final;

    act(() => worker.emit({ type: "batch", batch: buildBatch({ status: "running", simTimeMs: 0 }) }));

    const before = renders;

    wallMs = 100;
    act(() => worker.emit({ type: "batch", batch: buildBatch({ status: "running", simTimeMs: 1000, metrics }) }));
    wallMs = 200;
    act(() => worker.emit({ type: "batch", batch: buildBatch({ status: "running", simTimeMs: 2000, metrics }) }));
    expect(renders).toBe(before);

    // The trailing refresh at the end of the window shows the latest snapshot once.
    await waitFor(() => expect(result.current.simTimeMs).toBe(2000));
    expect(renders).toBe(before + 1);
  });

  it("passes the wall-clock backlog of the boot to the worker init", () => {
    const worker = createFakeWorker();

    renderHook(() => useSimSession({
      boot: buildBoot({}, { startAtSimTimeMs: 6000, initialBacklogMs: 54_000 }),
      blocked: false,
      deps: { createWorker: () => worker },
    }));

    expect(sentOfType(worker, "init")[0]?.options).toMatchObject({ startAtSimTimeMs: 6000, initialBacklogMs: 54_000 });
  });
});
