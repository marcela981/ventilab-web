/*
* Funcionalidad: Lab live console page tests
* Descripción: /lab/live with msw and a fake socket: the console (lazy) and the room join only for whoever the backend lets control the active reservation (holder, staff), "Equipo ocupado" with the backend label and no join for another student, the next reservation and the calendar link without an active one, the join re-sent on reconnect with the reconnection banner meanwhile, a join rejection with its reason and a re-read of the reservation, the no-data overlay on ventilator:disconnected and on the client stale timer and its automatic resume, the countdown and the latency (current and p95, colour level) on the server clock. v1.1 (T7): the control banner per role (operator, holder seen by a teacher, free), only the operator gets editable controls and loses them on a takeover (reason "Opera: …"), take, takeover behind its confirmation (going back sends nothing). v1.2 (T6 review fix S2): no latency value ("—") while the device has no data or the socket is down; the latency waits for every clock sample. v1.2 (T8): the operator confirms a PEEP change → one POST /api/ventilator/commands with the full reported setting set, the in-flight tag and the recent list follow the 202 and command-status, and the displayed value changes only when the telemetry reports it (APPLIED alone leaves it unchanged). Depends on vitest, msw, Testing Library and the lab test helpers. v1.3 (T9): control revoked — preemption during use → modal (reason, backend successor label, edits dropped, read-only) → leave to /lab, or watch the next reservation for staff; the countdown reaching zero → modal; takeover → non-blocking notice (no modal); presence timeout → notice with «Tomar control» again when allowed. v1.4 (T10): the recording toggle for the holder and staff (not without canControl, not after the session ended); start → REC mark in the console header; stop after confirming. v1.5 (T9 review fix): B1 no countdown ("—") and no end of the session while the server clock is pending or unsynced, even past the end on the browser clock; S2 a cancelled navigation to /lab falls back to a full page load and reopens the dialog; S3 no release DELETE after the session ended (pagehide and unmount). v1.6 (W1 Bloque 1): leaving after a revocation goes to the Conexión tab of the simulator workspace (LAB_URL = /simulador?tab=conexion). v1.7 (S8): fixtures carry the regenerated block 1 contract fields (party code null).
* Versión: 1.7
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { VentilatorTelemetryEvent } from "@shared/realtime";
import type { VentilatorControlStateDTO } from "../../api/dtos/lab.dto";
import { CLOCK_SAMPLES } from "../../api/services/lab-clock.service";
import { REVOCATION_COPY } from "../entities/control-revocation.entity";
import { CONTROL_COPY } from "../entities/operator-control.entity";
import { RECORDING_COPY } from "../entities/session-recording.entity";
import { LAB_LIVE_COPY, LabLivePage } from "./lab-live.page";
import {
  apiUrl,
  createFakeSocket,
  createRealtimeStatusControl,
  detailDto,
  envelope,
  renderLab,
  settingDto,
  summaryDto,
} from "./lab-test-helpers";

const router = vi.hoisted(() => ({ push: vi.fn(() => Promise.resolve(true)), replace: vi.fn(), query: {} }));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
const CLIENT_NOW = Date.parse("2026-10-16T14:30:00.000Z");
// The server clock is 5 s ahead of the browser.
const SERVER_NOW = CLIENT_NOW + 5_000;
// The first test pays the lazy console import; under the full parallel run it took more than 10 s once (T9).
const LOAD_TIMEOUT = 20_000;
let currentReads = 0;
const controlWrites: string[] = [];
let controlReads = 0;
const commandPosts: unknown[] = [];

const active = detailDto("active", { startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T15:00:00.000Z" });

function useCurrent(data: unknown) {
  server.use(http.get(apiUrl("/api/reservations/current"), () => {
    currentReads += 1;

    return HttpResponse.json({ ...envelope(data), timestamp: new Date(SERVER_NOW).toISOString() });
  }));
}

function useControl(state: Partial<VentilatorControlStateDTO>) {
  const dto: VentilatorControlStateDTO = {
    isOperator: false,
    canTake: false,
    canTakeover: false,
    occupied: true,
    reservationId: "active",
    operatorUserId: null,
    ...state,
  };
  const write = (label: string) => () => {
    controlWrites.push(label);

    return HttpResponse.json(envelope(null));
  };

  server.use(
    http.get(apiUrl("/api/ventilator/control"), () => {
      controlReads += 1;

      return HttpResponse.json(envelope(dto));
    }),
    http.post(apiUrl("/api/ventilator/control"), write("take")),
    http.post(apiUrl("/api/ventilator/control/takeover"), write("takeover")),
    http.delete(apiUrl("/api/ventilator/control"), write("release")),
    http.post(apiUrl("/api/ventilator/control/heartbeat"), write("heartbeat")),
  );
}

const banner = () => screen.getByTestId("lab-live-control-banner");
const vcvMode = () => screen.getByRole("button", { name: /VCV — Volumen control/ });

function useMine(data: unknown[]) {
  server.use(http.get(apiUrl("/api/reservations/mine"), () => HttpResponse.json(envelope(data))));
}

function batch(latencyMs: number): VentilatorTelemetryEvent {
  const serverTs = SERVER_NOW - latencyMs;

  return { serverTs, frames: [{ serverTs, deviceTs: serverTs, pressure: 10, flow: 0, volume: 0, deviceId: "esp-1" }] };
}

const curvesStatus = () => document.querySelector("[data-source-status]")?.getAttribute("data-source-status") ?? null;
const joins = (emitted: readonly string[]) => emitted.filter((event) => event === "ventilator:join").length;

async function consoleLoaded() {
  await waitFor(() => expect(curvesStatus()).not.toBeNull(), { timeout: LOAD_TIMEOUT });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
  currentReads = 0;
  controlWrites.length = 0;
  controlReads = 0;
  useControl({});
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(CLIENT_NOW);
  useMine([]);
  commandPosts.length = 0;
  server.use(http.get(apiUrl("/api/ventilator/commands"), () => HttpResponse.json(envelope([]))));
});

afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("LabLivePage", { timeout: 30_000 }, () => {
  it("opens the console for the holder, joins the room and counts down on the server clock", async() => {
    useCurrent({ reservation: active, canControl: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { socket });

    await consoleLoaded();
    expect(joins(socket.emitted)).toBe(1);
    expect(screen.getByRole("heading", { level: 1, name: LAB_LIVE_COPY.title })).toBeInTheDocument();
    // 15:00 − (14:30:00 + 5 s offset).
    await waitFor(() => expect(screen.getByRole("timer", { name: "Tiempo restante" })).toHaveTextContent("29:55"));
    // Nothing received yet: grey curves, read-only with the reason.
    expect(curvesStatus()).toBe("no-data");
    expect(screen.getAllByText(LAB_LIVE_COPY.noDataReason).length).toBeGreaterThan(0);
  });

  it("opens the console for staff too", async() => {
    useCurrent({ reservation: active, canControl: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { role: "TEACHER", socket });

    await consoleLoaded();
    expect(joins(socket.emitted)).toBe(1);
    // T10: staff may record the session too.
    expect(screen.getByRole("button", { name: RECORDING_COPY.start })).toBeInTheDocument();
  });

  it("records the session: the toggle starts it and the REC mark shows in the console header (T10)", async() => {
    useCurrent({ reservation: active, canControl: true });
    const recordingCalls: string[] = [];

    server.use(
      http.post(apiUrl("/api/ventilator/telemetry/recordings/start"), () => {
        recordingCalls.push("start");

        return HttpResponse.json(envelope(null));
      }),
      http.post(apiUrl("/api/ventilator/telemetry/recordings/stop"), () => {
        recordingCalls.push("stop");

        return HttpResponse.json(envelope(null));
      }),
    );
    renderLab(<LabLivePage />, { socket: createFakeSocket() });

    await consoleLoaded();
    expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.start }));

    const rec = await screen.findByTestId("lab-live-rec");
    expect(rec.closest("header")).not.toBeNull();
    expect(rec).toHaveAccessibleName(RECORDING_COPY.recLabel);

    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.stop }));
    fireEvent.click(await screen.findByRole("button", { name: RECORDING_COPY.stopConfirm }));
    await waitFor(() => expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument());
    expect(recordingCalls).toEqual(["start", "stop"]);
  });

  it("shows another student only the backend occupancy label, without curves and without joining", async() => {
    useCurrent({
      reservation: summaryDto("other", "reservations.labels.group_student", "Reservado por un estudiante del grupo B"),
      canControl: false,
    });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { socket });

    expect(await screen.findByRole("heading", { name: "Equipo ocupado" })).toBeInTheDocument();
    expect(screen.getByText("Reservado por un estudiante del grupo B")).toBeInTheDocument();
    expect(curvesStatus()).toBeNull();
    expect(screen.queryByText("Cargando la consola…")).not.toBeInTheDocument();
    expect(joins(socket.emitted)).toBe(0);
    // T10: no recording toggle without canControl.
    expect(screen.queryByRole("button", { name: RECORDING_COPY.start })).not.toBeInTheDocument();
  });

  it("shows the next reservation and the calendar without an active one", async() => {
    useCurrent({ reservation: null, canControl: false });
    useMine([detailDto("next", { startsAt: "2026-10-17T14:00:00.000Z", endsAt: "2026-10-17T15:00:00.000Z" })]);
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { socket });

    expect(await screen.findByRole("heading", { name: "No hay una reserva activa" })).toBeInTheDocument();
    expect(await screen.findByText(/^Tu próxima reserva:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al calendario de reservas" })).toHaveAttribute("href", "/lab/reservations");
    expect(joins(socket.emitted)).toBe(0);
  });

  it("re-joins on reconnect and shows the reconnection banner with a read-only console meanwhile", async() => {
    useCurrent({ reservation: active, canControl: true });
    const socket = createFakeSocket();
    const realtimeControl = createRealtimeStatusControl("authenticated");

    renderLab(<LabLivePage />, { socket, realtimeControl });

    await consoleLoaded();
    socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
    expect(curvesStatus()).toBe("live");

    realtimeControl.set("disconnected");
    expect(screen.getByRole("alert")).toHaveTextContent(LAB_LIVE_COPY.socketLost);
    expect(curvesStatus()).toBe("no-data");
    expect(screen.getAllByText(LAB_LIVE_COPY.socketLostReason).length).toBeGreaterThan(0);
    expect(screen.getByText(LAB_LIVE_COPY.socketLostOverlay)).toBeInTheDocument();

    const reads = controlReads;
    realtimeControl.set("authenticated");
    expect(joins(socket.emitted)).toBe(2);
    expect(screen.queryByText(LAB_LIVE_COPY.socketLost)).not.toBeInTheDocument();
    // Control events may have been missed while disconnected: the control state is read again.
    await waitFor(() => expect(controlReads).toBeGreaterThan(reads));
  });

  it("shows a join rejection with its reason and re-reads the active reservation", async() => {
    useCurrent({ reservation: active, canControl: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { socket });

    await consoleLoaded();
    const readsBefore = currentReads;

    socket.dispatch("ventilator:join-rejected", { reason: "not_reservation_holder" });

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo entrar a la sala del ventilador. La reserva activa no es tuya ni de tu grupo.");
    await waitFor(() => expect(currentReads).toBeGreaterThan(readsBefore));
  });

  it("greys the curves on ventilator:disconnected and on the stale timer, and resumes by itself", async() => {
    server.use(http.get(apiUrl("/api/platform-settings"), () => HttpResponse.json(envelope([
      settingDto("telemetry.staleAfterMs", 300),
    ]))));
    useCurrent({ reservation: active, canControl: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { role: "ADMIN", permissions: ["settings:manage"], socket });

    await consoleLoaded();
    socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
    expect(curvesStatus()).toBe("live");

    socket.dispatch("ventilator:disconnected", { at: CLIENT_NOW, reason: "device_stale" });
    expect(curvesStatus()).toBe("no-data");
    expect(screen.getByText(LAB_LIVE_COPY.noData, { selector: "[role=status]" })).toBeInTheDocument();

    socket.dispatch("ventilator:telemetry", batch(20));
    expect(curvesStatus()).toBe("live");

    // No batch for telemetry.staleAfterMs (300 ms from the platform settings).
    await waitFor(() => expect(curvesStatus()).toBe("no-data"), { timeout: 3_000 });

    socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
    expect(curvesStatus()).toBe("live");
  });

  it("shows the latency of the batches on the server clock with its session p95 and level", async() => {
    useCurrent({ reservation: active, canControl: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { socket });

    await consoleLoaded();
    const latency = screen.getByTestId("lab-live-latency");

    expect(latency).toHaveTextContent("—");
    // Wait for the clock offset (one reservation read + the clock samples) before sending batches.
    await waitFor(() => expect(currentReads).toBeGreaterThanOrEqual(1 + CLOCK_SAMPLES));
    await waitFor(() => {
      socket.dispatch("ventilator:telemetry", batch(42));
      expect(latency).toHaveTextContent("42 ms · p95 42 ms");
    }, { timeout: 3_000 });
    expect(latency).toHaveAttribute("data-level", "ok");

    for (let index = 0; index < 20; index += 1) {
      socket.dispatch("ventilator:telemetry", batch(130));
    }

    await waitFor(() => expect(latency).toHaveTextContent("130 ms · p95 130 ms"), { timeout: 3_000 });
    expect(latency).toHaveAttribute("data-level", "critical");
  });

  it("shows no latency while the device has no data or the socket is down (T6 review fix S2)", async() => {
    useCurrent({ reservation: active, canControl: true });
    const socket = createFakeSocket();
    const realtimeControl = createRealtimeStatusControl("authenticated");

    renderLab(<LabLivePage />, { socket, realtimeControl });

    await consoleLoaded();
    const latency = screen.getByTestId("lab-live-latency");

    await waitFor(() => expect(currentReads).toBeGreaterThanOrEqual(1 + CLOCK_SAMPLES));
    await waitFor(() => {
      socket.dispatch("ventilator:telemetry", batch(42));
      expect(latency).toHaveTextContent("42 ms · p95 42 ms");
    }, { timeout: 3_000 });

    socket.dispatch("ventilator:disconnected", { at: CLIENT_NOW, reason: "device_stale" });
    expect(latency).toHaveTextContent(/^—$/);
    expect(latency).toHaveAttribute("data-level", "unknown");

    socket.dispatch("ventilator:telemetry", batch(42));
    expect(latency).toHaveTextContent("42 ms · p95 42 ms");

    realtimeControl.set("disconnected");
    expect(latency).toHaveTextContent(/^—$/);
  });

  it("gives the controls only to the operator and takes them away on a takeover", async() => {
    useCurrent({ reservation: active, canControl: true });
    useControl({ operatorUserId: "student-1", isOperator: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { socket });

    await consoleLoaded();
    await waitFor(() => expect(banner()).toHaveTextContent("Controlas el equipo"));
    expect(screen.getByRole("button", { name: CONTROL_COPY.release })).toBeInTheDocument();
    // Without data the operator is read-only too.
    expect(vcvMode()).toBeDisabled();

    socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
    await waitFor(() => expect(vcvMode()).toBeEnabled());
    // An unconfirmed edit of the operator (T9: dropped when the control is taken away).
    fireEvent.click(screen.getByRole("button", { name: /^SIMV/ }));
    expect(screen.getByText("1 cambio pendiente")).toBeInTheDocument();

    useControl({ operatorUserId: "teacher-1" });
    const reads = controlReads;
    socket.dispatch("ventilator:control-changed", { reservationId: "active", operatorUserId: "teacher-1", reason: "takeover" });
    expect(banner()).toHaveTextContent("Opera: otra persona");
    expect(vcvMode()).toBeDisabled();
    expect(screen.getAllByText("Opera: otra persona").length).toBeGreaterThan(1);
    expect(screen.queryByRole("button", { name: CONTROL_COPY.release })).not.toBeInTheDocument();
    // The event is followed by a re-read of the control state (the backend stays the authority).
    await waitFor(() => expect(controlReads).toBeGreaterThan(reads));
    // T9: a non-blocking notice (no name: the backend did not give it), not the revoked modal; edits dropped.
    expect(screen.getByTestId("lab-live-control-loss")).toHaveTextContent("Otra persona tomó el control del equipo.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument());
  });

  it("shows a teacher the holder operating by the backend name and takes over after confirming", async() => {
    useCurrent({ reservation: active, canControl: true });
    useControl({ operatorUserId: "u1", canTakeover: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { role: "TEACHER", socket });

    await consoleLoaded();
    await waitFor(() => expect(banner()).toHaveTextContent("Opera: Ana Gómez"));
    socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
    expect(screen.getAllByText("Opera: Ana Gómez").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: CONTROL_COPY.takeover }));
    let dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: CONTROL_COPY.back }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(controlWrites).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: CONTROL_COPY.takeover }));
    dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Ana Gómez dejará de operar el equipo");
    const reads = controlReads;
    fireEvent.click(within(dialog).getByRole("button", { name: CONTROL_COPY.takeoverConfirm }));
    await waitFor(() => expect(controlWrites).toEqual(["takeover"]));
    await waitFor(() => expect(controlReads).toBeGreaterThan(reads));
  });

  it("offers the free control and tells the others to take it", async() => {
    useCurrent({ reservation: active, canControl: true });
    useControl({ canTake: true });
    const socket = createFakeSocket();

    renderLab(<LabLivePage />, { socket });

    await consoleLoaded();
    await waitFor(() => expect(banner()).toHaveTextContent("Control libre"));
    socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
    expect(screen.getAllByText(CONTROL_COPY.takeToOperate).length).toBeGreaterThan(0);
    expect(vcvMode()).toBeDisabled();
    expect(screen.queryByRole("button", { name: CONTROL_COPY.takeover })).not.toBeInTheDocument();

    const reads = controlReads;
    fireEvent.click(screen.getByRole("button", { name: CONTROL_COPY.take }));
    await waitFor(() => expect(controlWrites).toEqual(["take"]));
    await waitFor(() => expect(controlReads).toBeGreaterThan(reads));
  });

  it("sends a confirmed change and shows the new value ONLY when the device reports it (T8)", async() => {
    useCurrent({ reservation: active, canControl: true });
    useControl({ operatorUserId: "student-1", isOperator: true });
    server.use(http.post(apiUrl("/api/ventilator/commands"), async({ request }) => {
      commandPosts.push(await request.json());

      return HttpResponse.json(envelope({ commandId: "c1", reservationId: "active", status: "SENT" }), { status: 202 });
    }));
    const socket = createFakeSocket();
    const reported = { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4 };
    const frame = (settings: Record<string, number>): VentilatorTelemetryEvent => ({
      serverTs: SERVER_NOW,
      frames: [{ serverTs: SERVER_NOW, deviceTs: SERVER_NOW, pressure: 5, flow: 0, volume: 0, deviceId: "esp-1", mode: "VCV", settings }],
    });
    const peep = () => screen.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });

    renderLab(<LabLivePage />, { socket });

    await consoleLoaded();
    await waitFor(() => expect(banner()).toHaveTextContent("Controlas el equipo"));
    socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
    socket.dispatch("ventilator:telemetry", frame(reported));
    await waitFor(() => expect(peep()).toHaveAttribute("aria-valuenow", "5"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(commandPosts).toEqual([{ mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 6, fio2: 0.4 }]));
    // The PEEP control carries the in-flight tag; the recent list shows the same status.
    await waitFor(() => expect(document.querySelector("[data-in-flight=\"awaiting\"]")).not.toBeNull());
    expect(within(screen.getByTestId("lab-command-panel")).getByText("Esperando confirmación del equipo")).toBeInTheDocument();
    // Pending edits were reset by CONFIRMAR: the control shows the reported value, never the sent one.
    expect(peep()).toHaveAttribute("aria-valuenow", "5");

    socket.dispatch("ventilator:command-status", { commandId: "c1", reservationId: "active", userId: "student-1", status: "APPLIED" });
    socket.dispatch("ventilator:telemetry", frame(reported));
    await new Promise((resolve) => {
      setTimeout(resolve, 400);
    });
    // APPLIED without a telemetry change: the displayed value does not move.
    expect(peep()).toHaveAttribute("aria-valuenow", "5");

    socket.dispatch("ventilator:telemetry", frame({ ...reported, peep: 6 }));
    await waitFor(() => expect(peep()).toHaveAttribute("aria-valuenow", "6"));
    expect(within(screen.getByTestId("lab-command-panel")).getByText("Aplicado por el equipo")).toBeInTheDocument();
  });

  describe("control revoked (T9)", () => {
    const reported = { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4 };
    const frame = (): VentilatorTelemetryEvent => ({
      serverTs: SERVER_NOW,
      frames: [{ serverTs: SERVER_NOW, deviceTs: SERVER_NOW, pressure: 5, flow: 0, volume: 0, deviceId: "esp-1", mode: "VCV", settings: reported }],
    });
    const teacherSlot = summaryDto("teacher-slot", "reservations.labels.teacher", "Reservado por un docente");

    async function operatorWithEdit(socket: ReturnType<typeof createFakeSocket>) {
      await consoleLoaded();
      await waitFor(() => expect(banner()).toHaveTextContent("Controlas el equipo"));
      socket.dispatch("ventilator:connected", { at: CLIENT_NOW });
      socket.dispatch("ventilator:telemetry", frame());
      await waitFor(() => expect(screen.getByRole("button", { name: "Aumentar PEEP" })).toBeEnabled());
      fireEvent.click(screen.getByRole("button", { name: "Aumentar PEEP" }));
      expect(screen.getByText("1 cambio pendiente")).toBeInTheDocument();
    }

    it("preemption during use: modal with the reason and the backend label of the new holder, edits dropped, then leaves to /lab", async() => {
      useCurrent({ reservation: active, canControl: true });
      useControl({ operatorUserId: "student-1", isOperator: true });
      const socket = createFakeSocket();

      renderLab(<LabLivePage />, { socket });
      await operatorWithEdit(socket);

      // The backend preempts it for a teacher: control released, the student now gets the limited projection.
      useCurrent({ reservation: teacherSlot, canControl: false });
      useControl({ reservationId: "teacher-slot" });
      socket.dispatch("ventilator:control-changed", { reservationId: "active", operatorUserId: null, reason: "reservation_preempted" });
      socket.dispatch("reservation:preempted", {
        reservationId: "active", holderType: "USER", groupId: null, startsAt: active.startsAt, endsAt: active.endsAt, reason: "Práctica docente", wasActive: true,
      });

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent(REVOCATION_COPY.reservation_preempted.title);
      expect(dialog).toHaveTextContent("Motivo: Práctica docente");
      await waitFor(() => expect(within(dialog).getByTestId("lab-live-revoked-successor"))
        .toHaveTextContent("Ahora el ventilador está reservado por: Reservado por un docente"));
      // The console stays visible, read-only, with the edit dropped and no new command possible.
      expect(curvesStatus()).not.toBeNull();
      await waitFor(() => expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument());
      expect(screen.getAllByText(REVOCATION_COPY.readOnlyReason).length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "Aumentar PEEP", hidden: true })).toBeDisabled();
      // T10: the recording toggle is only offered during the active reservation.
      expect(screen.queryByRole("button", { name: RECORDING_COPY.start, hidden: true })).not.toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole("button", { name: REVOCATION_COPY.acknowledge }));
      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulador?tab=conexion"));
      // The ended reservation is not released by the page (the backend already did; a stale DELETE could hit the next one).
      expect(controlWrites).toEqual([]);
    });

    it("staff keep watching: after the modal the console of the new reservation, read-only until they take the control", async() => {
      useCurrent({ reservation: active, canControl: true });
      useControl({ operatorUserId: "u1", canTakeover: true });
      const socket = createFakeSocket();

      renderLab(<LabLivePage />, { role: "TEACHER", socket });
      await consoleLoaded();
      await waitFor(() => expect(banner()).toHaveTextContent("Opera: Ana Gómez"));

      const nextSlot = detailDto("next-slot", { startsAt: "2026-10-16T14:30:00.000Z", endsAt: "2026-10-16T15:30:00.000Z",
        holderRole: "TEACHER",
        holder: { id: "teacher-9", code: null, name: "Prof. Ruiz", identifier: "ruiz@ventylab.demo", role: "TEACHER" },
      });
      useCurrent({ reservation: nextSlot, canControl: true });
      useControl({ reservationId: "next-slot", canTake: true });
      socket.dispatch("ventilator:control-changed", { reservationId: "active", operatorUserId: null, reason: "reservation_preempted" });

      const dialog = await screen.findByRole("dialog");
      await waitFor(() => expect(within(dialog).getByTestId("lab-live-revoked-successor")).toHaveTextContent("Prof. Ruiz"));
      fireEvent.click(within(dialog).getByRole("button", { name: REVOCATION_COPY.acknowledge }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(router.push).not.toHaveBeenCalled();
      await waitFor(() => expect(banner()).toHaveTextContent("Control libre"));
      expect(screen.getByRole("button", { name: CONTROL_COPY.take })).toBeInTheDocument();
      expect(vcvMode()).toBeDisabled();
    });

    it("the countdown reaching zero opens the modal and, with no reservation left, leaves to /lab", async() => {
      // Ends 2 s after the browser clock: the server clock (+5 s) is already past it once synchronised.
      const ending = detailDto("ending", { startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T14:30:02.000Z" });
      useCurrent({ reservation: ending, canControl: true });
      useControl({ reservationId: "ending" });
      const socket = createFakeSocket();

      renderLab(<LabLivePage />, { socket });

      const dialog = await screen.findByRole("dialog", {}, { timeout: LOAD_TIMEOUT });
      expect(dialog).toHaveTextContent(REVOCATION_COPY.time_up.title);
      expect(screen.getByRole("timer", { name: "Tiempo restante", hidden: true })).toHaveTextContent("00:00");

      useCurrent({ reservation: null, canControl: false });
      fireEvent.click(within(dialog).getByRole("button", { name: REVOCATION_COPY.acknowledge }));
      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulador?tab=conexion"));
    });

    it("never ends the session on the browser clock while the server clock is unsynced (T9 review fix B1)", async() => {
      // Ended 10 s ago on the browser clock; the server answers without a readable time.
      const ended = detailDto("ending", { startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T14:29:50.000Z" });
      server.use(http.get(apiUrl("/api/reservations/current"), () => HttpResponse.json(envelope({ reservation: ended, canControl: true }))));
      useControl({ reservationId: "ending" });

      renderLab(<LabLivePage />, { socket: createFakeSocket() });
      await consoleLoaded();
      // More than one countdown tick on the real timers.
      await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));

      expect(screen.getByRole("timer", { name: "Tiempo restante" })).toHaveTextContent("—");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("never ends the session on the browser clock while the server clock is still pending (T9 review fix B1)", async() => {
      const ended = detailDto("ending", { startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T14:29:50.000Z" });
      let reads = 0;
      // The first read gives the reservation; every clock sample after it never answers.
      server.use(http.get(apiUrl("/api/reservations/current"), async() => {
        reads += 1;

        if (reads > 1) {
          await delay("infinite");
        }

        return HttpResponse.json({ ...envelope({ reservation: ended, canControl: true }), timestamp: new Date(SERVER_NOW).toISOString() });
      }));
      useControl({ reservationId: "ending" });

      renderLab(<LabLivePage />, { socket: createFakeSocket() });
      await consoleLoaded();
      await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));

      expect(screen.getByRole("timer", { name: "Tiempo restante" })).toHaveTextContent("—");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("falls back to a full page load and keeps the dialog when the navigation to /lab is cancelled (T9 review fix S2)", async() => {
      // jsdom's window.location.assign cannot be stubbed; its "Not implemented: navigation" report proves the call.
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      useCurrent({ reservation: active, canControl: true });
      const socket = createFakeSocket();

      renderLab(<LabLivePage />, { socket });
      await consoleLoaded();

      useCurrent({ reservation: null, canControl: false });
      socket.dispatch("ventilator:control-changed", { reservationId: "active", operatorUserId: null, reason: "reservation_ended" });
      const dialog = await screen.findByRole("dialog");

      router.push.mockResolvedValueOnce(false);
      fireEvent.click(within(dialog).getByRole("button", { name: REVOCATION_COPY.acknowledge }));

      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulador?tab=conexion"));
      await waitFor(() => expect(consoleError.mock.calls.some((call) => /navigation/i.test(String(call[0])))).toBe(true));
      // Not stranded behind a closed dialog: it is open again, so "Entendido" can be retried.
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
      consoleError.mockRestore();
    });

    it("sends no release once the session ended, neither on pagehide nor on leaving the page (T9 review fix S3)", async() => {
      useCurrent({ reservation: active, canControl: true });
      useControl({ operatorUserId: "student-1", isOperator: true });
      const socket = createFakeSocket();

      const { unmount } = renderLab(<LabLivePage />, { socket });
      await consoleLoaded();
      await waitFor(() => expect(banner()).toHaveTextContent("Controlas el equipo"));

      useCurrent({ reservation: null, canControl: false });
      useControl({ reservationId: null, occupied: false });
      socket.dispatch("ventilator:control-changed", { reservationId: "active", operatorUserId: null, reason: "reservation_ended" });
      await screen.findByRole("dialog");

      window.dispatchEvent(new Event("pagehide"));
      unmount();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(controlWrites).toEqual([]);
    });

    it("presence timeout: a notice (no modal) with «Tomar control» again when the backend allows it", async() => {
      useCurrent({ reservation: active, canControl: true });
      useControl({ operatorUserId: "student-1", isOperator: true });
      const socket = createFakeSocket();

      renderLab(<LabLivePage />, { socket });
      await operatorWithEdit(socket);

      useControl({ canTake: true });
      socket.dispatch("ventilator:control-changed", { reservationId: "active", operatorUserId: null, reason: "presence_timeout" });

      const notice = screen.getByTestId("lab-live-control-loss");
      expect(notice).toHaveTextContent(REVOCATION_COPY.loss.presenceTimeout);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument());
      await waitFor(() => expect(notice).toHaveTextContent(REVOCATION_COPY.loss.retake));

      fireEvent.click(screen.getByRole("button", { name: CONTROL_COPY.take }));
      await waitFor(() => expect(controlWrites).toEqual(["take"]));
    });
  });
});
