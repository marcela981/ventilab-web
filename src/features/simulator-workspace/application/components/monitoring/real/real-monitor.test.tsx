/*
* Funcionalidad: Real monitor tests
* Descripción: The real view of the Monitoreo tab of /simulador (W10, Bloque 1) inside the workspace with a fixed lab
*   connection, msw and a fake socket: the connected operator gets the lazy console editable once the device reports
*   its settings, "Grabar sesión", the latency badge and the alarm limits panel (editable); an observer (group member)
*   sees "Opera: <nombre>", a read-only console and a read-only limits panel, and no recording; "Equipo sin datos"
*   appears only after the stale threshold without telemetry and goes away with the next batch; without a connection
*   the guide to Conexión stays and no telemetry consumer is mounted; and telemetry batches never commit a React
*   render (the adapter publishes at most every 250 ms). Depends on vitest, Testing Library, msw, SWR, the session and
*   realtime contexts and the workspace test helpers. v0.2 (W11, Bloque 1): no mock of the removed catalog entry point. v0.3 (integration): a
*   telemetry heartbeat every 500 ms keeps the source live while a test asserts (one batch went stale under load).
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Profiler, useMemo } from "react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LabReservation } from "@features/ventilator-lab/connection.entry";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeEventMap, RealtimeEventName, RealtimeSocket, VentilatorTelemetryEvent } from "@shared/realtime/realtime.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { ALARM_LIMITS_COPY, ALARMS_COPY } from "@shared/ventilator-console";
import { SimulatorWorkspacePage } from "../../../pages/simulator-workspace.page";
import { routerStore } from "../../../workspace-test-helpers";
import { createLabConnectionValue } from "../../lab-connection-provider";
import type { LabConnectionValue } from "../../lab-connection-provider";

vi.mock("next/router", async() => (await import("../../../workspace-test-helpers")).nextRouterMock);
vi.mock("../../../hooks/use-lab-connection-controller", async() => (await import("../../../workspace-test-helpers")).labConnectionControllerMock);

const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;
const envelope = (data: unknown) => ({ success: true, message: null, data, code: null, timestamp: new Date().toISOString(), traceId: "t", pagination: null });

const server = setupServer(
  http.get(url("/api/reservations/current"), () => HttpResponse.json(envelope({ reservation: null, canControl: false, relation: "none" }))),
  http.get(url("/api/ventilator/commands"), () => HttpResponse.json(envelope([]))),
);

// The first test pays the lazy real monitor and console imports.
const LOAD_TIMEOUT = 20_000;

vi.setConfig({ testTimeout: 30_000 });

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
  routerStore.reset({ tab: "monitoreo" });
});

let stopHeartbeat: (() => void) | null = null;

afterEach(() => {
  stopHeartbeat?.();
  stopHeartbeat = null;
  server.resetHandlers();
  vi.restoreAllMocks();
});

const RESERVATION: LabReservation = {
  visibility: "full",
  id: "r1",
  startsAt: new Date(Date.now() - 60_000).toISOString(),
  endsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  status: "SCHEDULED",
  holderType: "USER",
  holderRole: "STUDENT",
  holderName: "Ana Gómez",
  holderCode: null,
  groupName: null,
  holderUserId: "student-1",
  groupId: null,
  createdById: null,
  purpose: null,
  preemptedReason: null,
};

const OPERATOR = createLabConnectionValue({
  state: "CONNECTED",
  intent: "connect",
  socketOnline: true,
  reservation: RESERVATION,
  relation: "holder",
  canControl: true,
  isOperator: true,
  operatorName: "Ana Gómez",
});

const OBSERVER = createLabConnectionValue({
  state: "CONNECTED",
  intent: "connect",
  socketOnline: true,
  reservation: RESERVATION,
  relation: "group_member",
  canControl: false,
  isOperator: false,
  operatorName: "Ana Gómez",
});

const REPORTED = { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4 };

function telemetry(pressure = 5): VentilatorTelemetryEvent {
  const serverTs = Date.now();

  return { serverTs, frames: [{ serverTs, deviceTs: serverTs, pressure, flow: 0, volume: 0, deviceId: "esp-1", mode: "VCV", settings: REPORTED }] };
}

type Listener = (payload: never) => void;

function createFakeSocket() {
  const listeners = new Map<string, Set<Listener>>();
  const socket = {
    on: (event: string, listener: Listener) => {
      const set = listeners.get(event) ?? new Set<Listener>();

      set.add(listener);
      listeners.set(event, set);
    },
    off: (event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    },
    emit: () => undefined,
  };

  return {
    socket: socket as unknown as RealtimeSocket,
    dispatch<E extends RealtimeEventName>(event: E, payload: RealtimeEventMap[E]) {
      act(() => {
        for (const listener of listeners.get(event) ?? []) {
          (listener as (value: typeof payload) => void)(payload);
        }
      });
    },
    listenerCount: (event: RealtimeEventName) => listeners.get(event)?.size ?? 0,
  };
}

type FakeSocket = ReturnType<typeof createFakeSocket>;

function sessionValue(): SessionContextValue {
  const user = { id: "student-1", email: "user@ventylab.demo", name: "Usuario", image: null, role: "STUDENT" as const };

  return {
    status: "authenticated",
    user,
    role: "STUDENT",
    permissions: [],
    error: null,
    hasRole: (...roles) => roles.includes("STUDENT"),
    hasPermission: () => false,
    establishSession: () => Promise.resolve(user),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(user),
    handleRoleChanged: () => Promise.resolve(false),
  };
}

function renderMonitor(connection: LabConnectionValue, onCommit?: () => void): FakeSocket {
  const fake = createFakeSocket();
  const session = sessionValue();

  function Wrapper({ children }: { children: ReactNode }) {
    const realtime = useMemo(() => ({ socket: fake.socket, status: "authenticated" as const }), []);

    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <SessionContext.Provider value={session}>
          <RealtimeContext.Provider value={realtime}>{children}</RealtimeContext.Provider>
        </SessionContext.Provider>
      </SWRConfig>
    );
  }

  const page = <SimulatorWorkspacePage connection={connection} />;

  render(onCommit ? <Profiler id="workspace" onRender={onCommit}>{page}</Profiler> : page, { wrapper: Wrapper });

  return fake;
}

const curvesStatus = () => document.querySelector("[data-source-status]")?.getAttribute("data-source-status") ?? null;
const chip = () => screen.getByRole("status", { name: "Estado de la señal" });

async function openReal(fake: FakeSocket) {
  fireEvent.click(await screen.findByRole("button", { name: "Real" }));
  await waitFor(() => expect(curvesStatus()).not.toBeNull(), { timeout: LOAD_TIMEOUT });
  fake.dispatch("ventilator:telemetry", telemetry());
  const heartbeat = setInterval(() => fake.dispatch("ventilator:telemetry", telemetry()), 500);

  stopHeartbeat = () => clearInterval(heartbeat);
  await waitFor(() => expect(curvesStatus()).toBe("live"));
}

function openLimits() {
  fireEvent.click(screen.getByRole("button", { name: ALARMS_COPY.limits }));

  return screen.getByRole("region", { name: ALARM_LIMITS_COPY.title });
}

describe("RealMonitor", () => {
  it("gives the connected operator an editable console, the recording, the latency and editable alarm limits", async() => {
    const fake = renderMonitor(OPERATOR);

    await openReal(fake);

    expect(chip()).toHaveTextContent("Conectado (Físico)");
    await waitFor(() => expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "Grabar sesión" })).toBeEnabled();
    expect(screen.getByTestId("real-monitor-latency")).toBeInTheDocument();
    expect(screen.getByTestId("real-monitor-operator")).toHaveTextContent("Controlas el equipo");

    const limits = openLimits();

    expect(within(limits).getByRole("textbox", { name: "Presión pico alta" })).toHaveValue("40");
    expect(within(limits).getByRole("button", { name: ALARM_LIMITS_COPY.apply })).toBeInTheDocument();

    fireEvent.change(within(limits).getByRole("textbox", { name: "Presión pico alta" }), { target: { value: "30" } });
    fireEvent.click(within(limits).getByRole("button", { name: ALARM_LIMITS_COPY.apply }));
    await waitFor(() => expect(within(limits).getByRole("textbox", { name: "Presión pico alta" })).toHaveValue("30"));
  });

  it("shows an observer (group member) 'Opera: <nombre>' with a read-only console and limits, and no recording", async() => {
    const fake = renderMonitor(OBSERVER);

    await openReal(fake);

    expect(screen.getByTestId("real-monitor-operator")).toHaveTextContent("Opera: Ana Gómez");
    expect(screen.getAllByText("Opera: Ana Gómez").length).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Grabar sesión" })).not.toBeInTheDocument();

    const limits = openLimits();

    expect(within(limits).getByText(ALARM_LIMITS_COPY.readOnly)).toBeInTheDocument();
    expect(within(limits).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows 'Equipo sin datos' only after 2 s without telemetry, until the next batch", async() => {
    const fake = renderMonitor(OPERATOR);

    await openReal(fake);

    expect(screen.queryByTestId("real-monitor-no-data")).not.toBeInTheDocument();
    stopHeartbeat?.();
    await waitFor(
      () => expect(screen.getByTestId("real-monitor-no-data")).toHaveTextContent("Equipo sin datos: sin señal del ventilador hace más de 2 segundos."),
      { timeout: 5000 },
    );
    expect(curvesStatus()).toBe("no-data");
    expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();

    fake.dispatch("ventilator:telemetry", telemetry());
    await waitFor(() => expect(screen.queryByTestId("real-monitor-no-data")).not.toBeInTheDocument());
    expect(curvesStatus()).toBe("live");
  });

  it("without a connection keeps the guide to Conexión and mounts no telemetry consumer", async() => {
    const fake = renderMonitor(createLabConnectionValue({ socketOnline: true }));

    fireEvent.click(await screen.findByRole("button", { name: "Real" }));

    expect(screen.getByText("Conéctate desde la pestaña Conexión para ver los datos del ventilador físico.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Ir a Conexión" })).toBeInTheDocument();
    expect(chip()).toHaveTextContent("Sin señal");
    expect(fake.listenerCount("ventilator:telemetry")).toBe(0);
  });

  it("telemetry batches never commit a React render (the adapter publishes at most every 250 ms)", async() => {
    let commits = 0;
    const fake = renderMonitor(OPERATOR, () => {
      commits += 1;
    });

    await openReal(fake);
    await waitFor(() => expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeEnabled());
    stopHeartbeat?.();

    // Inside one throttle window: the first batch below may only schedule the trailing publish.
    const now = Date.now();

    vi.spyOn(Date, "now").mockReturnValue(now);
    fake.dispatch("ventilator:telemetry", telemetry());

    const before = commits;

    for (let frame = 1; frame <= 30; frame += 1) {
      fake.dispatch("ventilator:telemetry", telemetry(5 + frame));
    }

    expect(commits).toBe(before);
  });
});
