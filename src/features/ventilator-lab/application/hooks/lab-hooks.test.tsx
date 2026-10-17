/*
* Funcionalidad: Lab hooks tests
* Descripción: useLabSettings (admin reads the platform settings, other roles get the vendored defaults without any request, a failed read keeps the defaults), useDeviceStatus (unknown until an event, connected/disconnected with reason, telemetry proves online, staff seed from the system status, realtime offline; v1.1: the seed is not trusted after a reconnect until revalidated) without emitting ventilator:join, and useReservationsRealtime (ventilator:availability and reservation:preempted refetch the current reservation). v1.2 (T9 review fix W1): useCurrentReservation.read() rejects on a failed read (never the stale cache). Depends on vitest, msw, Testing Library and the lab test helpers.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiUrl, createFakeSocket, createRealtimeStatusControl, envelope, errorResponse, renderLabHook, settingDto } from "../pages/lab-test-helpers";
import { useDeviceStatus } from "./use-device-status";
import { useCurrentReservation } from "./use-lab-reservations";
import { useLabSettings } from "./use-lab-settings";
import { useReservationsRealtime } from "./use-reservations-realtime";

const server = setupServer();
let settingsRequests = 0;

const systemStatus = (online: boolean) => envelope({
  state: "OK",
  checkedAt: "2026-10-16T14:00:00.000Z",
  components: { ventilator: { state: online ? "up" : "idle", online, activeReservation: false } },
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  settingsRequests = 0;
  server.use(http.get(apiUrl("/api/platform-settings"), () => {
    settingsRequests += 1;

    return HttpResponse.json(envelope([settingDto("reservations.slotMinutes", 30)]));
  }));
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("useLabSettings", () => {
  it("reads the platform settings when the session may manage them", async() => {
    const { result } = renderLabHook(() => useLabSettings(), { role: "ADMIN", permissions: ["settings:manage"] });

    expect(result.current.source).toBe("defaults");
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.source).toBe("server"));
    expect(result.current.settings["reservations.slotMinutes"]).toBe(30);
    expect(result.current.settings["reservations.maxDurationMinutes"]).toBe(120);
    expect(result.current.isLoading).toBe(false);
  });

  it("uses the vendored defaults without requesting the settings for other roles", async() => {
    const { result } = renderLabHook(() => useLabSettings(), { role: "TEACHER" });

    expect(result.current).toMatchObject({ source: "defaults", isLoading: false, error: null });
    expect(result.current.settings["reservations.slotMinutes"]).toBe(15);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settingsRequests).toBe(0);
  });

  it("keeps the defaults when the settings read fails", async() => {
    server.use(http.get(apiUrl("/api/platform-settings"), () => errorResponse("auth.forbidden", 403)));

    const { result } = renderLabHook(() => useLabSettings(), { role: "ADMIN", permissions: ["settings:manage"] });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.source).toBe("defaults");
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useDeviceStatus", () => {
  it("is unknown until an event and follows connected and disconnected", () => {
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useDeviceStatus(), { socket });

    expect(result.current).toEqual({ kind: "no-data", reason: "unknown", since: null });

    socket.dispatch("ventilator:connected", { at: 1000 });
    expect(result.current).toEqual({ kind: "online", since: 1000 });

    socket.dispatch("ventilator:disconnected", { at: 2000, reason: "device_stale" });
    expect(result.current).toEqual({ kind: "no-data", reason: "device_stale", since: 2000 });

    socket.dispatch("ventilator:telemetry", { frames: [], serverTs: 3000 });
    expect(result.current).toEqual({ kind: "online", since: 3000 });
    expect(socket.emitted).toEqual([]);
  });

  it("seeds the initial state from the system status for staff", async() => {
    server.use(http.get(apiUrl("/api/system/status"), () => HttpResponse.json(systemStatus(true))));

    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useDeviceStatus(), { role: "TEACHER", permissions: ["system:status"], socket });

    await waitFor(() => expect(result.current).toEqual({ kind: "online", since: null }));

    socket.dispatch("ventilator:disconnected", { at: 5, reason: "broker_disconnected" });
    expect(result.current).toEqual({ kind: "no-data", reason: "broker_disconnected", since: 5 });
  });

  it("does not trust the pre-disconnect seed after a reconnect until it is revalidated", async() => {
    let release: () => void = () => undefined;
    let requests = 0;

    server.use(http.get(apiUrl("/api/system/status"), async() => {
      requests += 1;

      if (requests > 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }

      return HttpResponse.json(systemStatus(true));
    }));

    const socket = createFakeSocket();
    const realtimeControl = createRealtimeStatusControl("authenticated");
    const { result } = renderLabHook(() => useDeviceStatus(), {
      role: "TEACHER",
      permissions: ["system:status"],
      socket,
      realtimeControl,
    });

    await waitFor(() => expect(result.current).toEqual({ kind: "online", since: null }));

    realtimeControl.set("disconnected");
    expect(result.current).toEqual({ kind: "no-data", reason: "realtime_offline", since: null });

    realtimeControl.set("authenticated");
    expect(result.current).toEqual({ kind: "no-data", reason: "unknown", since: null });
    await waitFor(() => expect(requests).toBe(2));
    expect(result.current).toEqual({ kind: "no-data", reason: "unknown", since: null });

    act(() => release());
    await waitFor(() => expect(result.current).toEqual({ kind: "online", since: null }));
  });

  it("does not trust a seed read before the first authentication until it is revalidated (T3 review fix S1)", async() => {
    let release: () => void = () => undefined;
    let requests = 0;

    server.use(http.get(apiUrl("/api/system/status"), async() => {
      requests += 1;

      if (requests > 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }

      return HttpResponse.json(systemStatus(true));
    }));

    const socket = createFakeSocket();
    const realtimeControl = createRealtimeStatusControl("connecting");
    const { result } = renderLabHook(() => useDeviceStatus(), {
      role: "TEACHER",
      permissions: ["system:status"],
      socket,
      realtimeControl,
    });

    await waitFor(() => expect(requests).toBe(1));
    realtimeControl.set("authenticated");
    await waitFor(() => expect(requests).toBe(2));
    expect(result.current).toEqual({ kind: "no-data", reason: "unknown", since: null });

    act(() => release());
    await waitFor(() => expect(result.current).toEqual({ kind: "online", since: null }));
  });

  it("reports the realtime connection as offline while the socket is not authenticated", () => {
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useDeviceStatus(), { socket, realtimeStatus: "disconnected" });

    expect(result.current).toEqual({ kind: "no-data", reason: "realtime_offline", since: null });
  });
});

describe("useReservationsRealtime", () => {
  it("refetches the current reservation on availability and preemption events", async() => {
    let requests = 0;

    server.use(http.get(apiUrl("/api/reservations/current"), () => {
      requests += 1;

      return HttpResponse.json(envelope({ reservation: null, canControl: false }));
    }));

    const socket = createFakeSocket();
    const { result } = renderLabHook(() => {
      useReservationsRealtime();

      return useCurrentReservation();
    }, { socket });

    await waitFor(() => expect(result.current.data).toEqual({ reservation: null, canControl: false }));
    expect(requests).toBe(1);

    socket.dispatch("ventilator:availability", { occupied: true });
    await waitFor(() => expect(requests).toBe(2));

    socket.dispatch("reservation:preempted", {
      reservationId: "r1",
      holderType: "USER",
      groupId: null,
      startsAt: "2026-10-16T14:00:00.000Z",
      endsAt: "2026-10-16T15:00:00.000Z",
      reason: "Clase",
      wasActive: false,
    });
    await waitFor(() => expect(requests).toBe(3));
    expect(socket.emitted).toEqual([]);
  });
});

describe("useCurrentReservation.read (T9 review fix W1)", () => {
  it("resolves with the fresh answer and rejects on a failed read instead of the cached one", async() => {
    server.use(http.get(apiUrl("/api/reservations/current"), () => HttpResponse.json(envelope({ reservation: null, canControl: false }))));
    const { result } = renderLabHook(() => useCurrentReservation(), { socket: createFakeSocket() });

    await waitFor(() => expect(result.current.data).toEqual({ reservation: null, canControl: false }));
    await expect(result.current.read()).resolves.toEqual({ reservation: null, canControl: false });

    server.use(http.get(apiUrl("/api/reservations/current"), () => errorResponse("common.unknown", 500)));
    await expect(result.current.read()).rejects.toMatchObject({ status: 500 });
    // The cached data is still what the page shows; it simply never decides the next action.
    expect(result.current.data).toEqual({ reservation: null, canControl: false });
  });
});
