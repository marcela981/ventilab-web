/*
* Funcionalidad: Monitoring panel tests
* Descripción: The Monitoreo tab of /simulador (W6, Bloque 1) inside the real workspace (session provider above the
*   tabs, fake worker client, injected HTTP calls): the status chip ("Sin señal" without a session, "Simulando" once
*   the session runs, "Conectado (Físico)" in real mode with a CONNECTED lab, "Sin señal" in real mode without one);
*   the July empty guide and its shortcuts; the real-mode guide to Conexión; the digital console without the alarm
*   limits panel; the own patient of the session; "Finalizar sesión" ending the session and showing its result in a
*   dialog without any navigation, with the replay link, and closing it clearing `?session=`; and simulation frames
*   that never commit a React render (high frequency stays out of React). v0.2 (W9, Bloque 1): the replay link opens
*   Mis sesiones (/simulador?tab=sesiones&replay=<id>). Depends on vitest, Testing Library, msw,
*   SWR and the workspace test helpers.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Profiler } from "react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionPatient } from "@features/simulator/session.entry";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { SimBatch, SimCommand } from "@shared/sim-engine";
import { ALARM_LIMITS_COPY, ALARMS_COPY } from "@shared/ventilator-console";
import { SimulatorWorkspacePage } from "../../pages/simulator-workspace.page";
import { buildFreshRecord, createSessionHarness, routerStore } from "../../workspace-test-helpers";
import type { FakeWorker, SessionHarness } from "../../workspace-test-helpers";
import type { LabConnectionValue } from "../lab-connection-provider";

vi.mock("next/router", async() => (await import("../../workspace-test-helpers")).nextRouterMock);
vi.mock("@features/simulator/catalog.entry", () => ({
  useCaseCatalog: () => ({ cases: [], isLoading: false, error: null }),
  useStartPractice: () => ({ pendingCaseId: null, error: null, start: () => Promise.resolve({ status: "busy" }) }),
}));
vi.mock("@features/simulator/result.entry", () => ({
  SessionResultSummary: ({ sessionId }: { sessionId: string }) => <p>{`result summary of ${sessionId}`}</p>,
}));

const server = setupServer(
  http.get(`${BACKEND_ORIGIN}/api/clinical-cases/:caseId`, () => HttpResponse.json({ success: false, message: "not found" }, { status: 404 })),
);

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
  routerStore.reset();
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

const CONNECTED: LabConnectionValue = {
  state: "CONNECTED",
  intent: "connect",
  error: null,
  connected: true,
  connect: () => undefined,
  disconnect: () => undefined,
};

const PATIENT: SessionPatient = {
  displayName: "María José",
  ageYears: 60,
  sex: "FEMALE",
  weightKg: 70,
  heightCm: 165,
  condition: "PNEUMONIA",
  difficulty: "INTERMEDIATE",
  diagnosis: "Neumonía grave con hipoxemia",
  allergies: ["Penicilina"],
  history: [],
  vitals: {
    respiratoryRateBpm: 24,
    spo2Percent: 88,
    heartRateBpm: 105,
    temperatureC: 39.1,
    systolicMmHg: 150,
    diastolicMmHg: 90,
    glasgow: 15,
    breathingPattern: "tachypneic",
  },
};

function Swr({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
}

type RenderOptions = {
  harness?: SessionHarness
  connection?: LabConnectionValue
  onCommit?: () => void
};

function renderWorkspace({ harness, connection, onCommit }: RenderOptions = {}): void {
  const page = <SimulatorWorkspacePage deps={harness?.deps} connection={connection} />;

  render(onCommit ? <Profiler id="workspace" onRender={onCommit}>{page}</Profiler> : page, { wrapper: Swr });
}

const chip = () => screen.getByRole("status", { name: "Estado de la señal" });

function sentOfType<T extends SimCommand["type"]>(worker: FakeWorker | undefined, type: T): SimCommand[] {
  return (worker?.sent ?? []).filter((command) => command.type === type);
}

function batch(overrides: Partial<SimBatch> = {}): SimBatch {
  return {
    simTimeMs: 1000,
    status: "running",
    backlogMs: 0,
    samples: [],
    droppedSamples: 0,
    metrics: null,
    alarms: [],
    appliedEvents: [],
    confirmedEvents: [],
    rejectedEvents: [],
    ...overrides,
  };
}

async function startRunning(harness: SessionHarness): Promise<FakeWorker> {
  await waitFor(() => expect(sentOfType(harness.workers[0], "init")).toHaveLength(1));

  const worker = harness.workers[0] as FakeWorker;

  act(() => {
    worker.emit({ type: "ready", engineVersion: "1.0.0" });
    worker.emit({ type: "batch", batch: batch({ simTimeMs: 1000, status: "running" }) });
  });

  return worker;
}

describe("MonitoringPanel", () => {
  it("without a session shows 'Sin señal' and the July guide with its two shortcuts", async() => {
    renderWorkspace();

    expect(await screen.findByText("Configura o inicia un paciente en la pestaña \"Simular Paciente\" para ver las curvas en tiempo real.")).toBeVisible();
    expect(chip()).toHaveTextContent("Sin señal");

    fireEvent.click(screen.getByRole("button", { name: "Ir a Simular Paciente" }));
    expect(routerStore.query).toEqual({ tab: "simular" });

    fireEvent.click(screen.getByRole("tab", { name: "Monitoreo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ir a Conexión" }));
    expect(routerStore.query).toEqual({ tab: "conexion" });
  });

  it("in real mode guides to Conexión until the lab is connected, then shows 'Conectado (Físico)'", async() => {
    renderWorkspace();
    fireEvent.click(await screen.findByRole("button", { name: "Real" }));

    expect(screen.getByText("Conéctate desde la pestaña Conexión para ver los datos del ventilador físico.")).toBeVisible();
    expect(chip()).toHaveTextContent("Sin señal");
    fireEvent.click(screen.getByRole("button", { name: "Ir a Conexión" }));
    expect(routerStore.query).toEqual({ tab: "conexion" });
  });

  it("shows 'Conectado (Físico)' in real mode with a CONNECTED lab", async() => {
    renderWorkspace({ connection: CONNECTED });
    fireEvent.click(await screen.findByRole("button", { name: "Real" }));

    expect(chip()).toHaveTextContent("Conectado (Físico)");
    expect(screen.getByRole("button", { name: "Real" })).toHaveAttribute("aria-pressed", "true");
  });

  it("runs the digital session: 'Simulando', the console without alarm limits and the own patient", async() => {
    const harness = createSessionHarness([buildFreshRecord({ patient: PATIENT })]);

    routerStore.reset({ session: "s1" });
    renderWorkspace({ harness });
    await startRunning(harness);

    await waitFor(() => expect(chip()).toHaveTextContent("Simulando"));
    expect(screen.getByRole("button", { name: "Finalizar sesión" })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Control del tiempo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asesoría IA" })).toBeInTheDocument();
    // AlarmLimitsPanel only in real mode (DISENO_BLOQUE1 §2.6): no "Límites" disclosure and no limits panel.
    expect(screen.getByText(ALARMS_COPY.none)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ALARMS_COPY.limits })).not.toBeInTheDocument();
    expect(screen.queryByText(ALARM_LIMITS_COPY.title)).not.toBeInTheDocument();

    const patient = screen.getByRole("region", { name: "Paciente: María José" });

    expect(within(patient).getByText("Neumonía")).toBeInTheDocument();
    expect(within(patient).getByText("Intermedio")).toBeInTheDocument();
    expect(within(patient).getByText("150/90 mmHg")).toBeInTheDocument();
    expect(within(patient).getByText("Taquipneico")).toBeInTheDocument();
  });

  it("'Finalizar sesión' shows the result in a dialog without navigating, and closing it clears the session", async() => {
    const harness = createSessionHarness();

    routerStore.reset({ session: "s1", tab: "monitoreo" });
    renderWorkspace({ harness });

    const worker = await startRunning(harness);

    fireEvent.click(await screen.findByRole("button", { name: "Finalizar sesión" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finalizar" }));
    await waitFor(() => expect(sentOfType(worker, "pause").length).toBeGreaterThan(0));
    act(() => worker.emit({ type: "batch", batch: batch({ simTimeMs: 1500, status: "paused" }) }));

    const dialog = await screen.findByRole("dialog", { name: "Resultado de la sesión" });

    expect(harness.endSession).toHaveBeenCalledWith("s1", 1500);
    expect(await within(dialog).findByText("result summary of s1")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Ver repetición" })).toHaveAttribute("href", "/simulador?tab=sesiones&replay=s1");
    expect(routerStore.push).not.toHaveBeenCalled();
    expect(routerStore.query).toEqual({ session: "s1", tab: "monitoreo" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    expect(routerStore.query).toEqual({ tab: "monitoreo" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Configura o inicia un paciente en la pestaña \"Simular Paciente\" para ver las curvas en tiempo real.")).toBeVisible();
  });

  it("simulation frames never commit a React render (samples stay out of React)", async() => {
    const harness = createSessionHarness();

    harness.deps.session = { ...harness.deps.session, now: () => 0 };
    routerStore.reset({ session: "s1" });

    let commits = 0;

    renderWorkspace({ harness, onCommit: () => { commits += 1; } });

    const worker = await startRunning(harness);

    await waitFor(() => expect(chip()).toHaveTextContent("Simulando"));

    const before = commits;

    for (let frame = 1; frame <= 20; frame += 1) {
      const simTimeMs = 1000 + frame * 20;

      act(() => worker.emit({
        type: "batch",
        batch: batch({ simTimeMs, samples: [{ simTimeMs, pressureCmH2O: 5 + frame, flowLpm: 1, volumeMl: frame }] }),
      }));
    }

    expect(commits).toBe(before);
  });
});
