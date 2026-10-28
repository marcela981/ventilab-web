/*
* Funcionalidad: Simulator workspace page tests
* Descripción: The /simulador workspace shell. v0.1 (W1): placeholder routing per tab. v0.2 (W4): entry point mocks. v0.5 (integration): waits longer for the lazily loaded session runner.
*   v0.3 (W5): the tab parser; nothing is read before the router is ready; a missing or unknown `?tab=` opens Monitoreo;
*   the bottom tabs switch with a shallow `router.replace` that keeps the rest of the query; each panel loads on its
*   first visit and then stays mounted (hidden), so the Monitoreo panel mounts once across tab switches; the session
*   of `?session=` runs above the tabs, so switching tabs never creates a second worker nor terminates the first;
*   `start()` opens a session in Monitoreo and `clear()` drops it; the temporary Simular panel starts a practice in
*   place. Depends on vitest, Testing Library, the workspace test helpers and mocked panels and catalog entry point.
*   v0.4 (W9, Bloque 1): the Mis sesiones panel is mocked (its own tests cover it). v0.6 (W8, Bloque 1): the Simular
*   Paciente panel (patient form, start mocked in the patient entry point) opens its session in Monitoreo. v0.7 (W7,
*   Bloque 1): the live lab connection controller is mocked idle; the Conexión panel is the real one. v0.8 (Ola 0 CI):
*   the lazily loaded Conexión panel gets a 4 s wait instead of the default 1 s of findBy.
* Versión: 0.8
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceSession } from "../components/workspace-session-provider";
import { parseWorkspaceTab } from "../entities/workspace-tab.entity";
import { buildFreshRecord, createSessionHarness, routerStore } from "../workspace-test-helpers";
import { SimulatorWorkspacePage } from "./simulator-workspace.page";

const counters = vi.hoisted(() => ({ mounts: 0, unmounts: 0 }));
const catalog = vi.hoisted(() => ({ start: vi.fn() }));

vi.mock("next/router", async() => (await import("../workspace-test-helpers")).nextRouterMock);
vi.mock("../hooks/use-lab-connection-controller", async() => (await import("../workspace-test-helpers")).labConnectionControllerMock);

function CountingMonitoringPanel() {
  const { sessionId, host, start, clear } = useWorkspaceSession();

  useEffect(() => {
    counters.mounts += 1;

    return () => {
      counters.unmounts += 1;
    };
  }, []);

  return (
    <div>
      <p>monitoring panel</p>
      <p>{`session: ${sessionId ?? "none"} · ${host?.phase ?? "no host"}`}</p>
      <button type="button" onClick={() => start({ id: "s2" })}>start s2</button>
      <button type="button" onClick={clear}>clear</button>
    </div>
  );
}

vi.mock("../components/monitoring/monitoring-panel", () => ({ MonitoringPanel: CountingMonitoringPanel }));
vi.mock("../components/sessions/sessions-panel", () => ({ SessionsPanel: () => <h2>Mis sesiones</h2> }));

vi.mock("@features/simulator/patient.entry", async(importOriginal) => ({
  ...await importOriginal<typeof import("@features/simulator/patient.entry")>(),
  useStartPractice: ({ onStarted }: { onStarted: (session: { id: string }) => void }) => ({
    pendingCaseId: null,
    isPending: false,
    error: null,
    startWithPatient: (patient: unknown, options: unknown) => {
      catalog.start(patient, options);
      onStarted({ id: "started-1" });

      return Promise.resolve({ status: "success" });
    },
  }),
}));

beforeEach(() => {
  routerStore.reset();
  counters.mounts = 0;
  counters.unmounts = 0;
  catalog.start.mockClear();
});

const tab = (name: string) => screen.getByRole("tab", { name });
// The real Conexión panel is loaded lazily; its first import can take longer than the default 1 s of findBy.
const LAZY_PANEL_WAIT = { timeout: 4000 };
const panelOf = (key: string) => document.getElementById(`workspace-panel-${key}`);

describe("parseWorkspaceTab", () => {
  it.each(["simular", "monitoreo", "conexion", "sesiones"] as const)("keeps %s", (value) => {
    expect(parseWorkspaceTab(value)).toBe(value);
  });

  it.each([undefined, "", "otra", ["simular", "conexion"]])("falls back to monitoreo for %j", (value) => {
    expect(parseWorkspaceTab(value)).toBe("monitoreo");
  });
});

describe("SimulatorWorkspacePage", () => {
  it("reads nothing until the router is ready", async() => {
    routerStore.reset({ tab: "conexion" }, false);
    render(<SimulatorWorkspacePage />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByText("monitoring panel")).not.toBeInTheDocument();

    act(() => routerStore.setReady());

    expect(await screen.findByRole("heading", { name: "Conexión" }, LAZY_PANEL_WAIT)).toBeInTheDocument();
    expect(tab("Conexión")).toHaveAttribute("aria-selected", "true");
  });

  it.each([[{}], [{ tab: "otra" }], [{ tab: ["simular", "conexion"] }]])("opens Monitoreo for the query %j", async(query) => {
    routerStore.reset(query);
    render(<SimulatorWorkspacePage />);

    expect(await screen.findByText("monitoring panel")).toBeInTheDocument();
    expect(tab("Monitoreo")).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tab").map((item) => item.textContent)).toEqual(["Simular Paciente", "Monitoreo", "Conexión", "Mis sesiones"]);
  });

  it("switches tabs with a shallow replace that keeps the rest of the query", async() => {
    routerStore.reset({ tab: "monitoreo", foo: "bar" });
    render(<SimulatorWorkspacePage />);
    await screen.findByText("monitoring panel");

    fireEvent.click(tab("Conexión"));

    expect(routerStore.replace).toHaveBeenCalledWith(
      { pathname: "/simulador", query: { tab: "conexion", foo: "bar" } },
      undefined,
      { shallow: true },
    );
    expect(await screen.findByRole("heading", { name: "Conexión" }, LAZY_PANEL_WAIT)).toBeInTheDocument();
    expect(tab("Conexión")).toHaveAttribute("aria-selected", "true");
    expect(panelOf("monitoreo")).not.toBeVisible();
  });

  it("loads each panel on its first visit and keeps it mounted afterwards", async() => {
    render(<SimulatorWorkspacePage />);
    await screen.findByText("monitoring panel");

    expect(screen.queryByRole("heading", { name: "Mis sesiones" })).not.toBeInTheDocument();

    fireEvent.click(tab("Mis sesiones"));
    await screen.findByRole("heading", { name: "Mis sesiones" });
    fireEvent.click(tab("Conexión"));
    await screen.findByRole("heading", { name: "Conexión" }, LAZY_PANEL_WAIT);
    fireEvent.click(tab("Monitoreo"));

    expect(panelOf("monitoreo")).toBeVisible();
    // The visited panels stay in the document, hidden.
    expect(panelOf("sesiones")).not.toBeVisible();
    expect(panelOf("sesiones")).toHaveTextContent("Mis sesiones");
    expect(panelOf("conexion")).toHaveTextContent("Conexión");
    expect(counters).toEqual({ mounts: 1, unmounts: 0 });
  });

  it("keeps the session worker across tab switches (one worker, never terminated)", async() => {
    const harness = createSessionHarness();

    routerStore.reset({ session: "s1" });
    render(<SimulatorWorkspacePage deps={harness.deps} />);

    await waitFor(() => expect(harness.createWorker).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(await screen.findByText("session: s1 · ready")).toBeInTheDocument();

    for (const name of ["Conexión", "Simular Paciente", "Mis sesiones", "Monitoreo", "Conexión", "Monitoreo"]) {
      fireEvent.click(tab(name));
      await waitFor(() => expect(tab(name)).toHaveAttribute("aria-selected", "true"));
    }

    expect(harness.createWorker).toHaveBeenCalledTimes(1);
    expect(harness.workers[0]?.terminated).toBe(false);
    expect(counters).toEqual({ mounts: 1, unmounts: 0 });
    expect(screen.getByText("session: s1 · ready")).toBeInTheDocument();
  });

  it("start() opens the session in Monitoreo and clear() drops it, without remounting the panel", async() => {
    const harness = createSessionHarness([buildFreshRecord({ id: "s2" })]);

    routerStore.reset({ tab: "conexion" });
    render(<SimulatorWorkspacePage deps={harness.deps} />);
    await screen.findByRole("heading", { name: "Conexión" }, LAZY_PANEL_WAIT);
    fireEvent.click(tab("Monitoreo"));
    fireEvent.click(await screen.findByRole("button", { name: "start s2" }));

    expect(routerStore.query).toEqual({ tab: "monitoreo", session: "s2" });
    expect(await screen.findByText("session: s2 · ready")).toBeInTheDocument();
    expect(harness.createWorker).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "clear" }));

    expect(routerStore.query).toEqual({ tab: "monitoreo" });
    expect(await screen.findByText("session: none · no host")).toBeInTheDocument();
    await waitFor(() => expect(harness.workers[0]?.terminated).toBe(true));
    expect(counters).toEqual({ mounts: 1, unmounts: 0 });
  });

  it("the Simular Paciente panel starts its patient in place and opens Monitoreo", async() => {
    routerStore.reset({ tab: "simular" });
    render(<SimulatorWorkspacePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Aleatorio" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar al Monitoreo" }));

    await waitFor(() => expect(catalog.start).toHaveBeenCalledWith(expect.objectContaining({ vitals: expect.any(Object) }), { caseId: undefined }));
    expect(routerStore.query).toEqual({ tab: "monitoreo", session: "started-1" });
    expect(await screen.findByText("monitoring panel")).toBeVisible();
  });
});
