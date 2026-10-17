/*
* Funcionalidad: usePreemptionNotice tests
* Descripción: The affected holder gets one persistent info toast per preempted reservation whether reservation:preempted, a RESERVATION_PREEMPTED notification:new or both arrive (no duplicates), other notifications show nothing, and a notification-only preemption revalidates the reservation reads. v1.1 (T3 review fix): finite auto-hide, and the reservations the caller is preempting are not announced to the caller. Depends on vitest, msw, Testing Library and the lab test helpers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { RealtimeEventMap } from "@shared/realtime/realtime.entity";
import type { ToastApi } from "@shared/design-system/components/use-toast";
import { apiUrl, createFakeSocket, envelope, renderLabHook } from "../pages/lab-test-helpers";
import { useCurrentReservation } from "./use-lab-reservations";
import { PREEMPTION_NOTICE_AUTO_HIDE_MS, usePreemptionNotice } from "./use-preemption-notice";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const preempted: RealtimeEventMap["reservation:preempted"] = {
  reservationId: "r1",
  holderType: "USER",
  groupId: null,
  startsAt: "2026-10-16T15:00:00.000Z",
  endsAt: "2026-10-16T16:00:00.000Z",
  reason: null,
  wasActive: false,
};

const notification = (type: RealtimeEventMap["notification:new"]["type"], reservationId: string): RealtimeEventMap["notification:new"] => ({
  id: `n-${reservationId}`,
  type,
  title: "Tu reserva del ventilador fue desplazada",
  body: "Tu reserva fue reemplazada por otra reserva.",
  data: { reservationId } as unknown as RealtimeEventMap["notification:new"]["data"],
  createdAt: "2026-10-16T14:00:00.000Z",
  readAt: null,
});

function spyToast(): ToastApi & { info: ReturnType<typeof vi.fn> } {
  return { success: vi.fn(), error: vi.fn(), info: vi.fn() };
}

describe("usePreemptionNotice", () => {
  it("shows one persistent toast per preempted reservation without duplicates", () => {
    const socket = createFakeSocket();
    const toast = spyToast();

    renderLabHook(() => usePreemptionNotice(), { socket, toast });

    socket.dispatch("reservation:preempted", preempted);
    // The same reservation through the group room and through the notification.
    socket.dispatch("reservation:preempted", preempted);
    socket.dispatch("notification:new", notification("RESERVATION_PREEMPTED", "r1"));

    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/^Tu reserva del ventilador \(.+\) fue desplazada/), { autoHideMs: PREEMPTION_NOTICE_AUTO_HIDE_MS });
  });

  it("hides the notice after a long finite time so it never blocks the toast queue (T3 review fix W3)", () => {
    expect(Number.isFinite(PREEMPTION_NOTICE_AUTO_HIDE_MS)).toBe(true);
    expect(PREEMPTION_NOTICE_AUTO_HIDE_MS).toBeGreaterThanOrEqual(20_000);
  });

  it("stays silent for the reservations the caller is preempting, and undoes it on failure (T3 review fix W1)", () => {
    const socket = createFakeSocket();
    const toast = spyToast();
    const { result } = renderLabHook(() => usePreemptionNotice(), { socket, toast });

    result.current.expectOwnPreemption(["r1"]);
    const undo = result.current.expectOwnPreemption(["r3"]);

    undo();
    socket.dispatch("reservation:preempted", preempted);
    socket.dispatch("notification:new", notification("RESERVATION_PREEMPTED", "r1"));
    expect(toast.info).not.toHaveBeenCalled();

    socket.dispatch("reservation:preempted", { ...preempted, reservationId: "r3" });
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("shows the notification when it arrives first, once, and ignores other notifications", () => {
    const socket = createFakeSocket();
    const toast = spyToast();

    renderLabHook(() => usePreemptionNotice(), { socket, toast });

    socket.dispatch("notification:new", notification("GRADE_PUBLISHED", "x"));
    expect(toast.info).not.toHaveBeenCalled();

    socket.dispatch("notification:new", notification("RESERVATION_PREEMPTED", "r1"));
    socket.dispatch("reservation:preempted", preempted);

    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith("Tu reserva fue reemplazada por otra reserva.", { autoHideMs: PREEMPTION_NOTICE_AUTO_HIDE_MS });
  });

  it("revalidates the reservation reads on a notification-only preemption", async() => {
    let requests = 0;

    server.use(http.get(apiUrl("/api/reservations/current"), () => {
      requests += 1;

      return HttpResponse.json(envelope({ reservation: null, canControl: false }));
    }));

    const socket = createFakeSocket();
    const { result } = renderLabHook(() => {
      usePreemptionNotice();

      return useCurrentReservation();
    }, { socket, toast: spyToast() });

    await waitFor(() => expect(result.current.data).not.toBeUndefined());
    expect(requests).toBe(1);

    socket.dispatch("notification:new", notification("RESERVATION_PREEMPTED", "r9"));
    await waitFor(() => expect(requests).toBe(2));
  });
});
