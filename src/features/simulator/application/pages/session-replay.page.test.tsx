/*
* Funcionalidad: Simulation session replay page tests
* Descripción: Drives /simulator/sessions/[sessionId]/replay with msw (replay + state; any other request, such as a
*   POST of events, fails the test) and fake worker clients (jsdom has no Worker): the replay-mode init (recorded
*   events, playback speed, end), start on ready, play/pause and the speed as worker commands, a debounced scrub that
*   re-initialises the worker once at the target time with a new seek generation, the event marks positioned by time
*   (recorded events and the alarm onsets of the worker timeline), the read-only console (no control enabled, nothing
*   applied), the engine version mismatch banner and the 403 state. Depends on vitest, Testing Library, msw, the
*   engine replay and the simulator test helpers. v1.1: two overlapping seeks start once after the second ready, the
*   playback length stays frozen across a /state revalidation, a failed /state retries before the last-event
*   fallback (with a note) and a long mark list collapses.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { replay } from "@shared/sim-engine";
import type { EngineMetrics, SimCommand } from "@shared/sim-engine";
import type { QueueTimers } from "../session/event-queue";
import { ReplayTimeline } from "../components/replay-timeline";
import { buildBatch, buildEngineCase, createFakeWorker } from "../session/sim-session-test-helpers";
import type { FakeWorker } from "../session/sim-session-test-helpers";
import { SessionReplayPage } from "./session-replay.page";
import { apiUrl, envelope, errorResponse, renderWithSwr, replayDto } from "./simulator-test-helpers";

vi.setConfig({ testTimeout: 20_000 });

const ENGINE_CASE = buildEngineCase();
const RECORDED = [
  { id: "e1", simTimeMs: 2000, type: "PARAM_CHANGE", payload: { changes: { peepCmH2O: 8 } }, receivedAt: "2026-10-15T14:00:02.000Z" },
  { id: "e2", simTimeMs: 4000, type: "AI_HELP", payload: {}, receivedAt: "2026-10-15T14:00:04.000Z" },
];

const server = setupServer();

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
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

type ManualTimers = QueueTimers & { pending: Map<number, () => void>, runAll: () => void };

function createManualTimers(): ManualTimers {
  const pending = new Map<number, () => void>();
  let next = 0;

  return {
    pending,
    setTimeout: (handler) => {
      next += 1;
      pending.set(next, handler);

      return next;
    },
    clearTimeout: (handle) => {
      pending.delete(handle as number);
    },
    runAll: () => {
      const handlers = [...pending.values()];

      pending.clear();
      handlers.forEach((handler) => handler());
    },
  };
}

/** Answers replay requests with the real engine replay; records every command. */
function createWorkerDouble(): FakeWorker {
  const worker = createFakeWorker();
  const send = worker.send.bind(worker);

  worker.send = (command: SimCommand) => {
    send(command);

    if (command.type === "replay") {
      const { engineCase, seed, events, untilMs, options } = command.request;
      const result = replay(engineCase, seed, events, untilMs, options);
      const timeline = result.metricsTimeline.map((snapshot, index): EngineMetrics => (
        index === 5 ? { ...snapshot, alarms: [{ code: "APNEA", severity: "HIGH", value: 20, threshold: 15 }] } : snapshot
      ));

      void Promise.resolve().then(() => worker.emit({ type: "replayResult", requestId: command.requestId, result: { ...result, metricsTimeline: timeline } }));
    }
  };

  return worker;
}

type RenderOptions = { mismatch?: boolean, stateSimTimeMs?: () => number };

let revalidateAll: () => Promise<unknown> = async() => undefined;

/** Captures the SWR cache mutate of the test wrapper, so a test can revalidate every query. */
function RevalidateProbe() {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    revalidateAll = () => mutate(() => true);
  }, [mutate]);

  return null;
}

function renderPage({ mismatch = false, stateSimTimeMs = () => 8000 }: RenderOptions = {}) {
  server.use(
    http.get(apiUrl("/api/simulation/sessions/s1/replay"), () => HttpResponse.json(envelope(replayDto({
      case: ENGINE_CASE,
      events: RECORDED,
      ...(mismatch ? { engineVersion: "0.9.0", engineVersionMismatch: true, warning: "La sesión usa el motor 0.9.0 y el servidor el 1.0.0." } : {}),
    })))),
    http.get(apiUrl("/api/simulation/sessions/s1/state"), () => HttpResponse.json(envelope({
      id: "s1",
      status: "ENDED",
      simTimeMs: stateSimTimeMs(),
      expiresAt: null,
      settings: {},
      metrics: {},
      alarms: [],
      targets: [],
    }))),
  );

  const workers: FakeWorker[] = [];
  const timers = createManualTimers();
  const createWorker = vi.fn(() => {
    const worker = createWorkerDouble();

    workers.push(worker);

    return worker;
  });
  const view = renderWithSwr(
    <>
      <RevalidateProbe />
      <SessionReplayPage sessionId="s1" deps={{ createWorker, timers, now: () => 0 }} />
    </>,
  );
  const playback = () => workers.find((worker) => worker.sent.some((command) => command.type === "init"));
  const inits = () => (playback()?.sent ?? []).filter((command) => command.type === "init");

  return { view, workers, timers, playback, inits };
}

describe("SessionReplayPage", () => {
  it("initialises the worker in replay mode and starts it on ready", async() => {
    const { playback, inits } = renderPage();

    await waitFor(() => expect(playback()).toBeDefined());

    const [init] = inits();

    expect(init).toMatchObject({
      type: "init",
      seed: 42,
      options: {
        multiplier: 1,
        playbackRate: 1,
        startAtSimTimeMs: 0,
        endAtSimTimeMs: 8000,
        engineOptions: { timeMultiplier: 1 },
        initialEvents: [{ type: "PARAM_CHANGE", simTimeMs: 2000, changes: { peepCmH2O: 8 } }],
      },
    });

    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));

    expect(playback()?.sent.map((command) => command.type)).toEqual(["init", "start"]);
  });

  it("plays, pauses and changes the local speed through worker commands", async() => {
    const { playback } = renderPage();

    await waitFor(() => expect(playback()).toBeDefined());
    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));
    act(() => playback()?.emit({ type: "batch", batch: buildBatch({ simTimeMs: 1000, status: "running" }) }));

    expect(await screen.findByText("0:01 / 0:08")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(playback()?.sent.at(-1)).toEqual({ type: "pause" });

    act(() => playback()?.emit({ type: "batch", batch: buildBatch({ simTimeMs: 1000, status: "paused" }) }));
    fireEvent.click(screen.getByRole("button", { name: "Reproducir" }));
    expect(playback()?.sent.at(-1)).toEqual({ type: "resume" });

    fireEvent.click(screen.getByRole("button", { name: "×8" }));
    expect(playback()?.sent.at(-1)).toEqual({ type: "setPlaybackRate", rate: 8 });
    expect(screen.getByRole("button", { name: "×8" })).toHaveAttribute("aria-pressed", "true");
  });

  it("re-initialises the worker once at the scrub target after the debounce", async() => {
    const { playback, inits, timers } = renderPage();

    await waitFor(() => expect(playback()).toBeDefined());
    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));
    fireEvent.click(screen.getByRole("button", { name: "×4" }));

    const range = screen.getByRole("slider", { name: "Posición de la repetición" });

    fireEvent.change(range, { target: { value: "3000" } });
    fireEvent.change(range, { target: { value: "5000" } });

    expect(inits()).toHaveLength(1);
    expect(screen.getByText("0:05 / 0:08")).toBeInTheDocument();
    expect(timers.pending.size).toBe(1);

    act(() => timers.runAll());

    expect(inits()).toHaveLength(2);
    expect(inits()[1]).toMatchObject({ options: { startAtSimTimeMs: 5000, playbackRate: 4, endAtSimTimeMs: 8000 } });

    // Batches of the superseded loop are ignored until the new ready.
    act(() => playback()?.emit({ type: "batch", batch: buildBatch({ simTimeMs: 1200, status: "running" }) }));
    expect(screen.getByText("0:05 / 0:08")).toBeInTheDocument();

    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));
    expect(playback()?.sent.at(-1)).toEqual({ type: "start" });
  });

  it("positions the event marks by time, including the alarm onsets of the worker timeline", async() => {
    const { view } = renderPage();
    const container = view.container;

    await waitFor(() => expect(container.querySelector('line[data-mark-id="e1"]')).not.toBeNull());

    expect(container.querySelector('line[data-mark-id="e1"]')).toHaveAttribute("x1", "25%");
    expect(container.querySelector('line[data-mark-id="e2"]')).toHaveAttribute("x1", "50%");
    expect(container.querySelector('line[data-kind="param"]')).not.toBeNull();
    await waitFor(() => expect(container.querySelector('line[data-kind="alarm"]')).not.toBeNull());
    expect(container.querySelector('line[data-kind="alarm"]')).toHaveAttribute("x1", "75%");
    expect(screen.getByRole("button", { name: "0:02 — Cambio de parámetros (1)" })).toBeInTheDocument();
  });

  it("jumps to a mark at once", async() => {
    const { playback, inits } = renderPage();

    await waitFor(() => expect(playback()).toBeDefined());
    fireEvent.click(await screen.findByRole("button", { name: "0:04 — Asesoría IA" }));

    expect(inits().at(-1)).toMatchObject({ options: { startAtSimTimeMs: 4000 } });
  });

  it("shows a read-only console that never applies or sends a change", async() => {
    const { playback, workers } = renderPage();

    await waitFor(() => expect(playback()).toBeDefined());
    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));
    act(() => playback()?.emit({ type: "batch", batch: buildBatch({ simTimeMs: 2500, status: "running" }) }));

    expect(await screen.findByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getAllByText("Solo lectura").length).toBeGreaterThan(0);
    screen.getAllByRole("spinbutton").forEach((control) => {
      expect(control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true").toBe(true);
    });
    expect(workers.flatMap((worker) => worker.sent).some((command) => command.type === "applyEvent")).toBe(false);
  });

  it("warns when the recorded engine version differs", async() => {
    renderPage({ mismatch: true });

    expect(await screen.findByText("La sesión usa el motor 0.9.0 y el servidor el 1.0.0.")).toBeInTheDocument();
  });

  it("starts exactly once after the second ready of two overlapping seeks", async() => {
    const { playback, inits } = renderPage();

    await waitFor(() => expect(playback()).toBeDefined());
    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));
    fireEvent.click(await screen.findByRole("button", { name: "0:02 — Cambio de parámetros (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "0:04 — Asesoría IA" }));

    expect(inits()).toHaveLength(3);

    const startsAfter = (from: number) => (playback()?.sent ?? []).slice(from).filter((command) => command.type === "start").length;
    const mark = playback()?.sent.length ?? 0;

    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));
    expect(startsAfter(mark)).toBe(0);

    act(() => playback()?.emit({ type: "ready", engineVersion: "1.0.0" }));
    expect(startsAfter(mark)).toBe(1);
  });

  it("keeps the playback length once settled when /state revalidates", async() => {
    let stateTime = 8000;
    const { playback, inits, workers } = renderPage({ stateSimTimeMs: () => stateTime });

    await waitFor(() => expect(playback()).toBeDefined());
    stateTime = 9000;
    await act(async() => {
      await revalidateAll();
    });

    expect(inits()).toHaveLength(1);
    expect(inits()[0]).toMatchObject({ options: { endAtSimTimeMs: 8000 } });
    expect(workers.filter((worker) => worker.sent.some((command) => command.type === "init"))).toHaveLength(1);
  });

  it("offers a retry when /state fails and falls back to the last event only after it, with a note", async() => {
    let stateCalls = 0;

    server.use(
      http.get(apiUrl("/api/simulation/sessions/s1/replay"), () => HttpResponse.json(envelope(replayDto({ case: ENGINE_CASE, events: RECORDED })))),
      http.get(apiUrl("/api/simulation/sessions/s1/state"), () => {
        stateCalls += 1;

        return errorResponse("common.internal_error", 500);
      }),
    );

    const createWorker = vi.fn(() => createWorkerDouble());

    renderWithSwr(<SessionReplayPage sessionId="s1" deps={{ createWorker, timers: createManualTimers(), now: () => 0 }} />);

    expect(await screen.findByText("No se pudo leer la duración de la sesión")).toBeInTheDocument();
    expect(createWorker).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText(/la repetición termina en el último evento registrado/)).toHaveAttribute("role", "note");
    expect(stateCalls).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0:00 / 0:04")).toBeInTheDocument();
  });

  it("collapses a long list of marks behind a disclosure", () => {
    const marks = Array.from({ length: 31 }, (_value, index) => ({
      id: `m${index}`, kind: "param" as const, simTimeMs: index * 1000, position: index, label: "Cambio de parámetros",
    }));
    const noop = () => undefined;
    const { container, rerender } = render(
      <ReplayTimeline status="paused" simTimeMs={0} durationMs={40_000} speed={1} marks={marks} onPlay={noop} onPause={noop} onSpeedChange={noop} onScrub={noop} onJump={noop} />,
    );

    expect(container.querySelector("details")).not.toBeNull();
    expect(screen.getByText("Eventos de la sesión (31)").tagName).toBe("SUMMARY");
    expect(container.querySelectorAll("line")).toHaveLength(31);

    rerender(<ReplayTimeline status="paused" simTimeMs={0} durationMs={40_000} speed={1} marks={marks.slice(0, 30)} onPlay={noop} onPause={noop} onSpeedChange={noop} onScrub={noop} onJump={noop} />);
    expect(container.querySelector("details")).toBeNull();
  });

  it("shows the access-denied state from the backend", async() => {
    server.use(
      http.get(apiUrl("/api/simulation/sessions/s1/replay"), () => errorResponse("simulation.session_access_denied", 403)),
      http.get(apiUrl("/api/simulation/sessions/s1/state"), () => errorResponse("simulation.session_access_denied", 403)),
    );
    renderWithSwr(<SessionReplayPage sessionId="s1" deps={{ createWorker: () => createWorkerDouble() }} />);

    expect(await screen.findByText("No tienes acceso a esta repetición.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });
});
