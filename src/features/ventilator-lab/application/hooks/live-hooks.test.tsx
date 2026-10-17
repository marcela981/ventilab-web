/*
* Funcionalidad: Live console hooks tests
* Descripción: useVentilatorRoom emits ventilator:join when enabled on each authenticated connection and reservation change, never when disabled, and scopes a rejection to the current reservation and connection; useTelemetryStale turns stale after staleAfterMs without batches, clears on a batch or ventilator:connected and is never stale while disabled. v1.1 (T6 review fix): a late rejection is attributed to the reservation of the join that was sent (W3); useServerClockOffset retries an unsynced clock with backoff and measures again on every new socket authentication (W2). v1.2 (T8 review fix S4): the clock gives up after CLOCK_MAX_ATTEMPTS failed rounds and a new authentication restarts the backoff and the attempts. Depends on vitest, Testing Library and the lab test helpers.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeSocket, createRealtimeStatusControl, renderLabHook } from "../pages/lab-test-helpers";
import { CLOCK_MAX_ATTEMPTS, CLOCK_RETRY_MAX_MS, useServerClockOffset } from "./use-telemetry-latency";
import { useTelemetryStale } from "./use-telemetry-stale";
import { useVentilatorRoom } from "./use-ventilator-room";
import type { UseVentilatorRoomOptions } from "./use-ventilator-room";

const joins = (emitted: readonly string[]) => emitted.filter((event) => event === "ventilator:join").length;

afterEach(() => {
  vi.useRealTimers();
});

describe("useVentilatorRoom", () => {
  it("joins per connection and per reservation, and scopes a rejection to them", () => {
    const socket = createFakeSocket();
    const realtimeControl = createRealtimeStatusControl("authenticated");
    const { result, rerender } = renderLabHook<ReturnType<typeof useVentilatorRoom>, UseVentilatorRoomOptions>(
      (options) => useVentilatorRoom(options),
      { socket, realtimeControl, initialProps: { enabled: true, reservationId: "r1" } },
    );

    expect(joins(socket.emitted)).toBe(1);
    socket.dispatch("ventilator:join-rejected", { reason: "no_active_reservation" });
    expect(result.current.rejectedReason).toBe("no_active_reservation");

    rerender({ enabled: true, reservationId: "r2" });
    expect(joins(socket.emitted)).toBe(2);
    expect(result.current.rejectedReason).toBeNull();

    socket.dispatch("ventilator:join-rejected", { reason: "not_reservation_holder" });
    realtimeControl.set("disconnected");
    realtimeControl.set("authenticated");
    expect(joins(socket.emitted)).toBe(3);
    expect(result.current.rejectedReason).toBeNull();
  });

  it("attributes a late rejection to the reservation of the join that was SENT, not to the newer one (W3)", () => {
    const socket = createFakeSocket();
    const realtimeControl = createRealtimeStatusControl("authenticated");
    const { result, rerender } = renderLabHook<ReturnType<typeof useVentilatorRoom>, UseVentilatorRoomOptions>(
      (options) => useVentilatorRoom(options),
      { socket, realtimeControl, initialProps: { enabled: true, reservationId: "r1" } },
    );

    expect(joins(socket.emitted)).toBe(1);
    realtimeControl.set("disconnected");
    // The reservation changes while no join can be sent: the last join sent is still the one of r1.
    rerender({ enabled: true, reservationId: "r2" });
    socket.dispatch("ventilator:join-rejected", { reason: "not_reservation_holder" });
    expect(result.current.rejectedReason).toBeNull();

    realtimeControl.set("authenticated");
    expect(joins(socket.emitted)).toBe(2);
    socket.dispatch("ventilator:join-rejected", { reason: "no_active_reservation" });
    expect(result.current.rejectedReason).toBe("no_active_reservation");
  });

  it("never joins while disabled", () => {
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useVentilatorRoom({ enabled: false, reservationId: "r1" }), { socket });

    socket.dispatch("ventilator:join-rejected", { reason: "no_active_reservation" });

    expect(joins(socket.emitted)).toBe(0);
    expect(result.current.rejectedReason).toBeNull();
  });
});

describe("useTelemetryStale", () => {
  it("turns stale without batches and clears on a batch or a connected event", () => {
    vi.useFakeTimers();
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useTelemetryStale(2_000, true), { socket });

    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1_999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    socket.dispatch("ventilator:telemetry", { serverTs: 1, frames: [] });
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1_500));
    socket.dispatch("ventilator:telemetry", { serverTs: 2, frames: [] });
    act(() => vi.advanceTimersByTime(1_500));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(true);

    socket.dispatch("ventilator:connected", { at: 3 });
    expect(result.current).toBe(false);
  });

  it("is never stale while disabled", () => {
    vi.useFakeTimers();
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useTelemetryStale(100, false), { socket });

    act(() => vi.advanceTimersByTime(1_000));

    expect(result.current).toBe(false);
  });
});

describe("useServerClockOffset", () => {
  const flush = () => act(async() => {
    await Promise.resolve();
    await Promise.resolve();
  });

  it("retries an unsynced clock with a growing backoff (W2)", async() => {
    vi.useFakeTimers();
    const measure = vi.fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(1_234);
    const { result } = renderLabHook(() => useServerClockOffset({ measure }), { socket: createFakeSocket() });

    await flush();
    expect(result.current).toEqual({ status: "unsynced", offsetMs: null });
    expect(measure).toHaveBeenCalledTimes(1);

    await act(async() => {
      vi.advanceTimersByTime(1_000);
    });
    await flush();
    expect(measure).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("unsynced");

    // The second wait doubles.
    await act(async() => {
      vi.advanceTimersByTime(1_999);
    });
    expect(measure).toHaveBeenCalledTimes(2);
    await act(async() => {
      vi.advanceTimersByTime(1);
    });
    await flush();
    expect(measure).toHaveBeenCalledTimes(3);
    expect(result.current).toEqual({ status: "synced", offsetMs: 1_234 });

    // Synced: no more retries.
    await act(async() => {
      vi.advanceTimersByTime(CLOCK_RETRY_MAX_MS * 2);
    });
    expect(measure).toHaveBeenCalledTimes(3);
  });

  it("measures again when the socket authenticates again, keeping the previous offset meanwhile (W2)", async() => {
    let resolveSecond: (value: number) => void = () => undefined;
    const measure = vi.fn()
      .mockResolvedValueOnce(10)
      .mockImplementationOnce(() => new Promise<number>((resolve) => {
        resolveSecond = resolve;
      }));
    const realtimeControl = createRealtimeStatusControl("authenticated");
    const { result } = renderLabHook(() => useServerClockOffset({ measure }), { socket: createFakeSocket(), realtimeControl });

    await flush();
    expect(result.current).toEqual({ status: "synced", offsetMs: 10 });

    realtimeControl.set("disconnected");
    expect(measure).toHaveBeenCalledTimes(1);
    realtimeControl.set("authenticated");
    expect(measure).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ status: "synced", offsetMs: 10 });

    await act(async() => {
      resolveSecond(20);
      await Promise.resolve();
    });
    expect(result.current).toEqual({ status: "synced", offsetMs: 20 });
  });

  it("stops retrying after CLOCK_MAX_ATTEMPTS failed rounds (T8 review S4)", async() => {
    vi.useFakeTimers();
    const measure = vi.fn().mockResolvedValue(null);
    const { result } = renderLabHook(() => useServerClockOffset({ measure }), { socket: createFakeSocket() });

    for (let index = 0; index < CLOCK_MAX_ATTEMPTS + 3; index += 1) {
      await flush();
      await act(async() => {
        vi.advanceTimersByTime(CLOCK_RETRY_MAX_MS);
      });
    }
    await flush();

    expect(measure).toHaveBeenCalledTimes(CLOCK_MAX_ATTEMPTS);
    expect(result.current).toEqual({ status: "unsynced", offsetMs: null });
  });

  it("restarts the backoff and the attempts on a new socket authentication (T8 review S4)", async() => {
    vi.useFakeTimers();
    const measure = vi.fn().mockResolvedValue(null);
    const realtimeControl = createRealtimeStatusControl("authenticated");

    renderLabHook(() => useServerClockOffset({ measure }), { socket: createFakeSocket(), realtimeControl });

    await flush();
    await act(async() => {
      vi.advanceTimersByTime(1_000);
    });
    await flush();
    await act(async() => {
      vi.advanceTimersByTime(2_000);
    });
    await flush();
    expect(measure).toHaveBeenCalledTimes(3);

    realtimeControl.set("disconnected");
    realtimeControl.set("authenticated");
    await flush();
    expect(measure).toHaveBeenCalledTimes(4);

    // The next wait starts again from CLOCK_RETRY_BASE_MS (1 s), not from 8 s.
    await act(async() => {
      vi.advanceTimersByTime(1_000);
    });
    await flush();
    expect(measure).toHaveBeenCalledTimes(5);
  });
});
