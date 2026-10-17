/*
* Funcionalidad: useVentilatorCommands tests
* Descripción: The commands hook with msw and a fake socket: a confirmation becomes ONE POST /api/ventilator/commands with the full setting set built from the reported telemetry settings (FiO2 fraction, unchanged fields as reported), the in-flight state goes sending → awaiting (202) → waiting for the report (command-status APPLIED) and ends only when the telemetry reports the value; a second confirmation in flight sends nothing; statuses of another reservation are ignored; REJECTED leaves a warning; the Spanish copy of a 403 / 423 / 503 / 422 (violations) / 429 (Retry-After countdown, sending paused); a refusal of the mapper and a caller who is not the operator send nothing; the recent list merges the history read with the live statuses; a status that never arrives is looked up and marked unknown. v1.1 (T7 review fix S5): a not_operator refusal re-reads the control state. v1.2 (T8 review fix W2): a command found SENT by the lookup keeps the console locked and is looked up again until terminal, lost only after the lookup window; a lost connection during the send keeps the console locked until the device reports the value. v1.3 (T8 review fix 2): the end of an uncertain wait reads the history (APPLIED → blocked until «usar los valores que informa», unreadable → blocked as unknown, no trace → freed). v1.4 (T8 review fix 3): W2 only the caller's own early REJECTED ends an uncertain wait; W1 the abandoned accepted value is named and a change carrying another value is sent only when repeated. v1.5 (T8 review fix 4): B1 an abandoned accepted mode change (VCV → SIMV the device never reports) is named and a change built from the reported VCV is sent only when repeated; a report that moves between the warning and the repeat warns again. Depends on vitest, msw, Testing Library, the lab test helpers and the commands hook.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useApiQuery } from "@shared/api-client/use-api-query";
import type { VentilatorCommandStatusEvent, VentilatorTelemetryEvent } from "@shared/realtime";
import type { VentilatorCommandDTO } from "../../api/dtos/lab.dto";
import { VENTILATOR_CONTROL_PATH } from "../../api/services/ventilator-control.service";
import { SEND_COMMAND_ERROR_COPY } from "../entities/command-messages";
import { COMMAND_STATE_COPY, REPORT_WAIT_MS } from "../entities/command-state";
import { LAB_SETTING_DEFAULTS } from "../entities/lab-settings.entity";
import { apiUrl, createFakeSocket, envelope, renderLabHook } from "../pages/lab-test-helpers";
import type { FakeSocket } from "../pages/lab-test-helpers";
import { COMMAND_LOOKUP_WINDOW_MS, COMMAND_STATUS_GRACE_MS, useVentilatorCommands } from "./use-ventilator-commands";
import type { UseVentilatorCommandsOptions, VentilatorCommands } from "./use-ventilator-commands";

const RESERVATION = "r1";
const REPORTED = { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4 };

let posts: unknown[] = [];
let history: VentilatorCommandDTO[] = [];

// Initial handler: it survives resetHandlers, so a revalidation after a test ends is still answered.
const server = setupServer(http.get(apiUrl("/api/ventilator/commands"), ({ request }) => {
  const ids = new URL(request.url).searchParams.get("ids");

  return HttpResponse.json(envelope(ids ? history.filter((item) => ids.split(",").includes(item.id)) : history));
}));

function telemetry(settings: Record<string, number>, mode = "VCV"): VentilatorTelemetryEvent {
  return { serverTs: 1, frames: [{ serverTs: 1, pressure: 5, flow: 0, volume: 0, deviceId: "esp", mode, settings }] };
}

function status(commandId: string, value: VentilatorCommandStatusEvent["status"], extra: Partial<VentilatorCommandStatusEvent> = {}): VentilatorCommandStatusEvent {
  return { commandId, reservationId: RESERVATION, userId: "student-1", status: value, ...extra };
}

function historyDto(id: string, value: VentilatorCommandDTO["status"], params: Record<string, unknown> = { mode: "VCV", peep: 6 }): VentilatorCommandDTO {
  return {
    id,
    status: value,
    reservationId: RESERVATION,
    userId: "student-1",
    params: params as unknown as Record<string, never>,
    rejectReason: null,
    createdAt: "2026-10-16T15:00:00.000Z",
    sentAt: "2026-10-16T15:00:00.000Z",
    resolvedAt: null,
    latencyMs: 40,
    encoding: "json",
  };
}

function acceptPosts(commandId = "c1", value: VentilatorCommandDTO["status"] = "SENT") {
  server.use(http.post(apiUrl("/api/ventilator/commands"), async({ request }) => {
    posts.push(await request.json());

    return HttpResponse.json(envelope({ commandId, reservationId: RESERVATION, status: value }), { status: 202 });
  }));
}

function failPosts(statusCode: number, code: string, data: unknown = null, headers: Record<string, string> = {}) {
  server.use(http.post(apiUrl("/api/ventilator/commands"), async({ request }) => {
    posts.push(await request.json());

    return HttpResponse.json({ success: false, message: code, data, code, timestamp: "", traceId: "t", pagination: null }, { status: statusCode, headers });
  }));
}

function render(socket: FakeSocket, options: Partial<UseVentilatorCommandsOptions> = {}) {
  return renderLabHook(() => useVentilatorCommands({ reservationId: RESERVATION, canSend: true, settings: LAB_SETTING_DEFAULTS, ...options }), { socket });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  posts = [];
  history = [];
});

afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("useVentilatorCommands", { timeout: 20_000 }, () => {
  it("sends the full setting set once, follows 202 and command-status, and ends only when the device reports the value", async() => {
    acceptPosts();
    const socket = createFakeSocket();
    const { result } = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));

    expect(result.current.inFlight).toEqual({ fio2: { status: "sending" } });
    expect(result.current.busyReason).toBe(COMMAND_STATE_COPY.busy);
    // The first POST of the file is slow under a full parallel run (cold msw): a wider wait than the 1 s default.
    await waitFor(() => expect(result.current.inFlight).toEqual({ fio2: { status: "awaiting" } }), { timeout: 5000 });
    expect(posts).toEqual([{ mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.6 }]);

    socket.dispatch("ventilator:command-status", status("c1", "APPLIED"));
    // Confirmed by the backend, but the device has not reported it yet: still waiting, nothing to display.
    expect(result.current.inFlight.fio2).toEqual({ status: "awaiting", message: COMMAND_STATE_COPY.confirmedWaiting });

    socket.dispatch("ventilator:telemetry", telemetry({ ...REPORTED, fio2: 0.6 }));
    expect(result.current.inFlight).toEqual({});
    expect(result.current.busyReason).toBeNull();
    expect(result.current.notice?.message).toBe(COMMAND_STATE_COPY.applied);
  });

  it("sends nothing on a second confirmation while one is in flight (double send guard)", async() => {
    acceptPosts();
    const socket = createFakeSocket();
    const { result } = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => {
      result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] });
      result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] });
    });
    await waitFor(() => expect(result.current.inFlight.peep?.status).toBe("awaiting"));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 50 }] }));

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(posts).toHaveLength(1);
  });

  it("ignores statuses of another reservation and warns on a rejection", async() => {
    acceptPosts();
    const socket = createFakeSocket();
    const { result } = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 7 }] }));
    await waitFor(() => expect(result.current.inFlight.peep?.status).toBe("awaiting"));

    socket.dispatch("ventilator:command-status", status("c1", "REJECTED", { reservationId: "other" }));
    expect(result.current.inFlight.peep?.status).toBe("awaiting");

    socket.dispatch("ventilator:command-status", status("c1", "REJECTED", { reason: "device_busy" }));
    expect(result.current.inFlight).toEqual({ peep: { status: "rejected", message: "motivo informado: «device_busy»" } });
    expect(result.current.notice?.tone).toBe("warning");
    expect(result.current.busyReason).toBeNull();
  });

  it.each([
    [403, "ventilator-commands.no_active_reservation", SEND_COMMAND_ERROR_COPY.noActiveReservation],
    [403, "ventilator-commands.not_reservation_holder", SEND_COMMAND_ERROR_COPY.notHolder],
    [423, "ventilator-commands.not_operator", SEND_COMMAND_ERROR_COPY.notOperator],
    [503, "ventilator-commands.device_offline", SEND_COMMAND_ERROR_COPY.deviceOffline],
  ])("shows the Spanish copy of a %i %s", async(statusCode, code, message) => {
    failPosts(statusCode, code);
    const socket = createFakeSocket();
    const { result } = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));

    await waitFor(() => expect(result.current.notice?.message).toBe(message));
    expect(result.current.notice?.tone).toBe("error");
    expect(result.current.inFlight).toEqual({ peep: { status: "rejected", message: COMMAND_STATE_COPY.notSent } });
  });

  it("re-reads the control state after a not_operator refusal, and only then (T7 review fix S5)", async() => {
    let controlReads = 0;
    server.use(http.get(apiUrl("/api/ventilator/control"), () => {
      controlReads += 1;

      return HttpResponse.json(envelope({ isOperator: false, canTake: true, canTakeover: false, occupied: true, reservationId: RESERVATION, operatorUserId: null }));
    }));
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => {
      // A consumer of the control read, as the live page has.
      useApiQuery(VENTILATOR_CONTROL_PATH);

      return useVentilatorCommands({ reservationId: RESERVATION, canSend: true, settings: LAB_SETTING_DEFAULTS });
    }, { socket });
    await waitFor(() => expect(controlReads).toBe(1));

    failPosts(503, "ventilator-commands.device_offline");
    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    await waitFor(() => expect(result.current.notice?.message).toBe(SEND_COMMAND_ERROR_COPY.deviceOffline));
    expect(controlReads).toBe(1);

    failPosts(423, "ventilator-commands.not_operator");
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    await waitFor(() => expect(result.current.notice?.message).toBe(SEND_COMMAND_ERROR_COPY.notOperator));
    await waitFor(() => expect(controlReads).toBe(2));
  });

  it("lists the 422 violations in Spanish", async() => {
    failPosts(422, "ventilator-commands.invalid_command", {
      violations: [{ field: "peep", rule: "safety_limit", message: "peep 16 exceeds the safety maximum 15", limit: { max: 15 } }],
    });
    const socket = createFakeSocket();
    const { result } = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));

    await waitFor(() => expect(result.current.notice?.details).toEqual(["PEEP: supera el máximo de seguridad (15)."]));
    expect(result.current.notice?.message).toBe(SEND_COMMAND_ERROR_COPY.invalid);
  });

  it("pauses sending for the Retry-After of a 429 with a countdown", async() => {
    failPosts(429, "ventilator-commands.rate_limited", null, { "Retry-After": "2" });
    const socket = createFakeSocket();
    const { result } = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));

    await waitFor(() => expect(result.current.notice?.message).toBe(SEND_COMMAND_ERROR_COPY.rateLimited));
    expect(result.current.busyReason).toMatch(/podrás enviar otro en [12] s/);
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    expect(posts).toHaveLength(1);

    await waitFor(() => expect(result.current.busyReason).toBeNull(), { timeout: 4_000 });
  });

  it("refuses without sending when a required setting was never reported, or the caller is not the operator", async() => {
    acceptPosts();
    const socket = createFakeSocket();
    const { result } = render(socket);

    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    expect(result.current.notice?.message).toMatch(/no ha informado su modo/);

    const viewer = render(createFakeSocket(), { canSend: false });

    act(() => viewer.result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    expect(viewer.result.current.notice).toBeNull();
    expect(posts).toHaveLength(0);
  });

  it("merges the history read with the live statuses", async() => {
    history = [historyDto("h1", "SENT")];
    const socket = createFakeSocket();
    const { result } = render(socket);

    await waitFor(() => expect(result.current.recent).toHaveLength(1));
    expect(result.current.recent[0]).toMatchObject({ id: "h1", status: "SENT", summary: "VCV · PEEP 6 cmH2O", latencyMs: 40 });

    socket.dispatch("ventilator:command-status", status("h1", "APPLIED"));
    await waitFor(() => expect(result.current.recent[0]?.status).toBe("APPLIED"));
  });

  it("keeps the console locked while the lookup finds the command SENT, and follows it to its terminal status (T8 review W2)", async() => {
    acceptPosts();
    const socket = createFakeSocket();
    const settings = { ...LAB_SETTING_DEFAULTS, "commands.ackTimeoutMs": 10 };
    const { result } = render(socket, { settings });
    let lookups = 0;

    server.use(http.get(apiUrl("/api/ventilator/commands"), () => {
      lookups += 1;

      return HttpResponse.json(envelope(history));
    }));
    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    await waitFor(() => expect(result.current.inFlight.peep?.status).toBe("awaiting"));

    // First lookup after ackTimeoutMs + the grace still finds SENT: the console stays locked (no "lost").
    history = [historyDto("c1", "SENT")];
    const before = lookups;

    await waitFor(() => expect(lookups).toBeGreaterThan(before), { timeout: COMMAND_STATUS_GRACE_MS + 2_000 });
    await act(async() => {
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
    });
    expect(result.current.inFlight.peep).toEqual({ status: "awaiting" });
    expect(result.current.busyReason).toBe(COMMAND_STATE_COPY.busy);
    expect(result.current.notice?.message).not.toBe(COMMAND_STATE_COPY.lost);

    // The next lookup (backoff) finds it APPLIED; the device then reports it.
    history = [historyDto("c1", "APPLIED")];
    await waitFor(() => expect(result.current.inFlight.peep).toEqual({ status: "awaiting", message: COMMAND_STATE_COPY.confirmedWaiting }), { timeout: 3_000 });
    socket.dispatch("ventilator:telemetry", telemetry({ ...REPORTED, peep: 6 }));
    expect(result.current.busyReason).toBeNull();
    expect(posts).toHaveLength(1);
  });

  it("declares the command lost only after the lookup window (T8 review W2)", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    acceptPosts();
    history = [historyDto("c1", "SENT")];
    const socket = createFakeSocket();
    const settings = { ...LAB_SETTING_DEFAULTS, "commands.ackTimeoutMs": 10 };
    const { result } = render(socket, { settings });

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    await waitFor(() => expect(result.current.inFlight.peep?.status).toBe("awaiting"));

    await act(async() => {
      await vi.advanceTimersByTimeAsync(COMMAND_STATUS_GRACE_MS + COMMAND_LOOKUP_WINDOW_MS / 2);
    });
    expect(result.current.inFlight.peep).toEqual({ status: "awaiting" });

    for (let index = 0; index < 10 && result.current.notice?.message !== COMMAND_STATE_COPY.lost; index += 1) {
      await act(async() => {
        await vi.advanceTimersByTimeAsync(COMMAND_LOOKUP_WINDOW_MS / 2);
      });
    }
    expect(result.current.inFlight.peep).toEqual({ status: "rejected", message: COMMAND_STATE_COPY.unknown });
    expect(result.current.notice?.message).toBe(COMMAND_STATE_COPY.lost);
    expect(result.current.busyReason).toBeNull();
  });

  it("keeps the console locked after a lost connection during the send, until the device reports the value (T8 review W2)", async() => {
    server.use(http.post(apiUrl("/api/ventilator/commands"), async({ request }) => {
      posts.push(await request.json());

      return HttpResponse.error();
    }));
    const socket = createFakeSocket();
    const { result } = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
    await waitFor(() => expect(result.current.busyReason).toBe(COMMAND_STATE_COPY.uncertain));
    expect(result.current.notice?.message).toBe(SEND_COMMAND_ERROR_COPY.unreachable);
    expect(result.current.inFlight.peep).toEqual({ status: "awaiting", message: COMMAND_STATE_COPY.uncertainTag });

    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 50 }] }));
    expect(posts).toHaveLength(1);

    socket.dispatch("ventilator:telemetry", telemetry({ ...REPORTED, peep: 6 }));
    expect(result.current.busyReason).toBeNull();
    expect(result.current.notice?.message).toBe(COMMAND_STATE_COPY.applied);
  });

  describe("the end of an uncertain send (T8 review fix 2, W6) and the way out of the block (W5)", () => {
    const SENT_REQUEST = { mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 6, fio2: 0.4 };
    const settings = { ...LAB_SETTING_DEFAULTS, "commands.ackTimeoutMs": 10 };

    async function uncertainSend(socket: FakeSocket) {
      server.use(http.post(apiUrl("/api/ventilator/commands"), async({ request }) => {
        posts.push(await request.json());

        return HttpResponse.error();
      }));
      const rendered = render(socket, { settings });

      await waitFor(() => expect(rendered.result.current.recentLoading).toBe(false));
      socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
      act(() => rendered.result.current.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 6 }] }));
      await waitFor(() => expect(rendered.result.current.busyReason).toBe(COMMAND_STATE_COPY.uncertain));

      return rendered;
    }

    it("blocks sending when the history read at the end of the wait shows the command APPLIED, until «usar los valores que informa»", async() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      history = [historyDto("old", "APPLIED", SENT_REQUEST)];
      const socket = createFakeSocket();
      const { result } = await uncertainSend(socket);

      history = [historyDto("c9", "APPLIED", SENT_REQUEST), historyDto("old", "APPLIED", SENT_REQUEST)];
      await act(async() => {
        await vi.advanceTimersByTimeAsync(10 + COMMAND_STATUS_GRACE_MS + REPORT_WAIT_MS + 100);
      });

      await waitFor(() => expect(result.current.busyReason).toBe(COMMAND_STATE_COPY.unreported));
      expect(result.current.canUseReported).toBe(true);
      act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 50 }] }));
      expect(posts).toHaveLength(1);

      act(() => result.current.onUseReported());
      expect(result.current.busyReason).toBeNull();
      expect(result.current.canUseReported).toBe(false);
      expect(result.current.notice?.message).toBe(COMMAND_STATE_COPY.usingReported);
    });

    it("keeps sending blocked as unknown when the history cannot be read at the end of the wait", async() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const socket = createFakeSocket();
      const { result } = await uncertainSend(socket);

      server.use(http.get(apiUrl("/api/ventilator/commands"), () => HttpResponse.json({ success: false, message: "x", data: null }, { status: 500 })));
      await act(async() => {
        await vi.advanceTimersByTimeAsync(10 + COMMAND_STATUS_GRACE_MS + REPORT_WAIT_MS + 100);
      });

      await waitFor(() => expect(result.current.busyReason).toBe(COMMAND_STATE_COPY.unconfirmedBlocked));
      expect(result.current.notice?.message).toBe(COMMAND_STATE_COPY.unconfirmed);
    });

    it("ends the wait early only on a REJECTED of the caller's own new command (T8 review fix 3, W2)", async() => {
      const socket = createFakeSocket();
      const { result } = await uncertainSend(socket);

      // A teacher's command of the same reservation: never taken as this send's outcome.
      socket.dispatch("ventilator:command-status", status("t9", "REJECTED", { userId: "teacher-1", reason: "device_busy" }));
      expect(result.current.busyReason).toBe(COMMAND_STATE_COPY.uncertain);

      socket.dispatch("ventilator:command-status", status("c9", "REJECTED", { reason: "device_busy" }));
      expect(result.current.busyReason).toBeNull();
      expect(result.current.inFlight.peep).toEqual({ status: "rejected", message: "motivo informado: «device_busy»" });
    });

    it("frees the console when the history shows no trace of the command", async() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const socket = createFakeSocket();
      const { result } = await uncertainSend(socket);

      await act(async() => {
        await vi.advanceTimersByTimeAsync(10 + COMMAND_STATUS_GRACE_MS + REPORT_WAIT_MS + 100);
      });

      await waitFor(() => expect(result.current.notice?.message).toBe(COMMAND_STATE_COPY.notRegistered));
      expect(result.current.busyReason).toBeNull();
    });
  });

  it("names the abandoned accepted value and sends a command carrying another value only when repeated (T8 review fix 3, W1)", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    acceptPosts("c1", "SENT");
    const socket = createFakeSocket();
    const { result } = render(socket);
    const line = "Vt: aceptado 600 mL, el equipo informa 450 mL — el próximo comando enviará 450 mL";

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "tidalVolume", value: 600 }] }));
    await waitFor(() => expect(result.current.inFlight.tidalVolume?.status).toBe("awaiting"));
    socket.dispatch("ventilator:command-status", status("c1", "ACKED"));
    await act(async() => {
      await vi.advanceTimersByTimeAsync(REPORT_WAIT_MS + 1500);
    });

    // Blocked: the notice next to «Usar los valores que informa el equipo» names the accepted value and the next one sent.
    await waitFor(() => expect(result.current.busyReason).toBe(COMMAND_STATE_COPY.unreported));
    expect(result.current.notice?.details).toEqual([line]);

    act(() => result.current.onUseReported());
    expect(result.current.notice?.details).toEqual([line]);

    acceptPosts("c2", "SENT");
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));
    // Not sent: the change would carry Vt 450 mL over the accepted 600 mL; the operator is told and must repeat it.
    expect(posts).toHaveLength(1);
    expect(result.current.notice).toEqual({
      tone: "warning",
      message: COMMAND_STATE_COPY.carryWarning,
      details: ["Vt: aceptado 600 mL — este cambio enviará 450 mL (el valor que informa el equipo)"],
    });

    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual({ mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.6 });
  });

  async function abandonAccepted(socket: FakeSocket, confirmation: Parameters<VentilatorCommands["onConfirm"]>[0]) {
    acceptPosts("c1", "SENT");
    const rendered = render(socket);

    socket.dispatch("ventilator:telemetry", telemetry(REPORTED));
    act(() => rendered.result.current.onConfirm(confirmation));
    await waitFor(() => expect(posts).toHaveLength(1));
    await waitFor(() => expect(rendered.result.current.busyReason).toBe(COMMAND_STATE_COPY.busy));
    socket.dispatch("ventilator:command-status", status("c1", "ACKED"));
    await act(async() => {
      await vi.advanceTimersByTimeAsync(REPORT_WAIT_MS + 1500);
    });
    await waitFor(() => expect(rendered.result.current.busyReason).toBe(COMMAND_STATE_COPY.unreported));

    return rendered;
  }

  it("never reverts an abandoned accepted mode change without telling the operator (T8 review fix 4, B1)", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const socket = createFakeSocket();
    const { result } = await abandonAccepted(socket, { mode: "SIMV", changes: [] });
    const line = "Modo: aceptado SIMV, el equipo informa VCV — el próximo comando enviará VCV";

    // The device keeps reporting VCV: the block names the accepted mode.
    expect(result.current.notice?.details).toEqual([line]);
    act(() => result.current.onUseReported());
    expect(result.current.notice?.details).toEqual([line]);

    acceptPosts("c2", "SENT");
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));
    // Built from the reported VCV, it would silently undo SIMV: not sent, the operator is told.
    expect(posts).toHaveLength(1);
    expect(result.current.notice).toEqual({
      tone: "warning",
      message: COMMAND_STATE_COPY.carryWarning,
      details: ["Modo: aceptado SIMV — este cambio enviará VCV (el modo que informa el equipo)"],
    });

    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual({ mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.6 });
  });

  it("warns again when the report moves between the warning and the repeat (T8 review fix 4)", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const socket = createFakeSocket();
    const { result } = await abandonAccepted(socket, { mode: null, changes: [{ parameter: "tidalVolume", value: 600 }] });

    act(() => result.current.onUseReported());
    acceptPosts("c2", "SENT");
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));
    expect(result.current.notice?.details).toEqual(["Vt: aceptado 600 mL — este cambio enviará 450 mL (el valor que informa el equipo)"]);

    // The device now reports 480 mL: the repeat would carry another value than the one the operator was told about.
    socket.dispatch("ventilator:telemetry", telemetry({ ...REPORTED, tidalVolume: 480 }));
    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));
    expect(posts).toHaveLength(1);
    expect(result.current.notice?.details).toEqual(["Vt: aceptado 600 mL — este cambio enviará 480 mL (el valor que informa el equipo)"]);

    act(() => result.current.onConfirm({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual({ mode: "VCV", tidalVolume: 480, respiratoryRate: 14, peep: 5, fio2: 0.6 });
  });
});
