/*
* Funcionalidad: useOperatorControl tests
* Descripción: Drives the operator control hook with msw and a fake socket: the state read, take / takeover / release
*   requests (and a takeover refused with the Spanish backend message), `ventilator:control-changed` applied at once
*   and re-read, the heartbeat every heartbeatMs only while operator (socket message while authenticated, HTTP
*   heartbeat otherwise; fake intervals) that stops when control is lost and on unmount, and the release on leaving
*   the page (pagehide / unmount) only for the operator and only once. v1.1 (T7 review fix): no HTTP heartbeat ever
*   (W1: while the socket is down the backend presence grace runs; the state is re-read after re-authentication); the
*   release on leaving only with an authenticated socket and a control state re-read since the last authentication
*   (W2); state from SWR data (S1); a bfcache restore marks the caller not operator before the re-read (S2); the
*   control loss notice of a takeover (T9). v1.2 (T9 review fix W2): overlapping re-reads (only the latest one counts, an older
*   'operator' answer never arms the release) and a failed re-read never verifies the state. Depends on vitest, msw, Testing Library and the lab test helpers. v1.3 (T11 review: T9 residual): an SWR reconnect
*   revalidation answering after a control-changed event (before its re-read) does not bring the older operator back.
*   v1.4 (T12 review fix): a re-read answering after unmount writes nothing (no unhandled rejection from SWR's removed
*   cache, W2); a failed re-read after a control-changed event is retried once (bounded) so SWR data is not ignored
*   for good, and a second failure sends nothing more (S1).
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, cleanup, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { VentilatorControlStateDTO } from "../../api/dtos/lab.dto";
import { CONTROL_COPY } from "../entities/operator-control.entity";
import {
  apiUrl,
  createFakeSocket,
  createRealtimeStatusControl,
  envelope,
  errorResponse,
  renderLabHook,
  sessionUserId,
} from "../pages/lab-test-helpers";
import { useOperatorControl } from "./use-operator-control";

const server = setupServer();
const requests: string[] = [];
const SELF = sessionUserId("STUDENT");
let controlState: VentilatorControlStateDTO;

function stateDto(overrides: Partial<VentilatorControlStateDTO> = {}): VentilatorControlStateDTO {
  return {
    isOperator: false,
    canTake: true,
    canTakeover: false,
    occupied: true,
    reservationId: "reservation-1",
    operatorUserId: null,
    ...overrides,
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  server.events.on("request:start", ({ request }) => {
    requests.push(`${request.method} ${new URL(request.url).pathname}`);
  });
});

afterEach(() => {
  // Unmount before the handlers go away, so no re-read of a mounted hook hits an unhandled request.
  cleanup();
  requests.length = 0;
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});

function useHandlers() {
  controlState = stateDto();
  server.use(
    http.get(apiUrl("/api/ventilator/control"), () => HttpResponse.json(envelope(controlState))),
    http.post(apiUrl("/api/ventilator/control"), () => HttpResponse.json(envelope(null))),
    http.post(apiUrl("/api/ventilator/control/takeover"), () => HttpResponse.json(envelope(null))),
    http.delete(apiUrl("/api/ventilator/control"), () => HttpResponse.json(envelope(null))),
    http.post(apiUrl("/api/ventilator/control/heartbeat"), () => HttpResponse.json(envelope(null))),
  );
}

/** Polls with the real setTimeout (waitFor polls with setInterval, which these tests fake). */
async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100 && !check(); attempt += 1) {
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }

  expect(check()).toBe(true);
}

/** Holds every control read until answerAll (answered with the current controlState). */
function holdControlReads() {
  const answers: Array<() => void> = [];

  server.use(http.get(apiUrl("/api/ventilator/control"), () => new Promise<Response>((resolve) => {
    answers.push(() => resolve(HttpResponse.json(envelope(controlState))));
  })));

  return {
    waiting: () => answers.length,
    answerAll: () => answers.splice(0).forEach((answer) => answer()),
  };
}

/** Holds every control read with the state of the moment it was requested; answers them one by one, in any order. */
function holdControlReadsEach() {
  const answers: Array<() => void> = [];

  server.use(http.get(apiUrl("/api/ventilator/control"), () => {
    const snapshot = controlState;

    return new Promise<Response>((resolve) => {
      answers.push(() => resolve(HttpResponse.json(envelope(snapshot))));
    });
  }));

  return {
    waiting: () => answers.length,
    answer: (index: number) => answers[index]?.(),
  };
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

const count = (entry: string) => requests.filter((request) => request === entry).length;

describe("useOperatorControl", () => {
  it("reads the state, takes and releases the control and follows the control-changed events", async() => {
    useHandlers();
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined }), { socket });

    await waitFor(() => expect(result.current.view.state).toMatchObject({ operatorUserId: null, canTake: true }));

    await act(() => result.current.take());
    expect(count("POST /api/ventilator/control")).toBe(1);

    // The backend event makes the caller the operator at once; the re-read confirms it.
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: SELF, reason: "taken" });
    expect(result.current.view.state?.isOperator).toBe(true);
    await waitFor(() => expect(count("GET /api/ventilator/control")).toBeGreaterThanOrEqual(3));

    await act(() => result.current.release());
    expect(count("DELETE /api/ventilator/control")).toBe(1);
    const reads = count("GET /api/ventilator/control");
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: null, reason: "released" });
    expect(result.current.view.state).toMatchObject({ isOperator: false, operatorUserId: null, canTake: true });
    await waitFor(() => expect(count("GET /api/ventilator/control")).toBeGreaterThan(reads));
  });

  it("takes over with the backend and shows its refusal in Spanish", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: "student-2", canTake: false, canTakeover: true });
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined }), { socket: createFakeSocket() });
    await waitFor(() => expect(result.current.view.state?.canTakeover).toBe(true));

    server.use(http.post(apiUrl("/api/ventilator/control/takeover"), () => errorResponse("ventilator-commands.control_locked", 423)));
    await act(() => result.current.takeover());

    expect(count("POST /api/ventilator/control/takeover")).toBe(1);
    expect(result.current.view).toMatchObject({ pending: null, error: CONTROL_COPY.errors.locked });
  });

  it("beats only over an authenticated socket, never over HTTP, re-reads after re-authentication and stops on unmount (W1)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const socket = createFakeSocket();
    const realtime = createRealtimeStatusControl("authenticated");
    const { result, unmount } = renderLabHook(
      () => useOperatorControl({ enabled: true, heartbeatMs: 5000, releaseOnLeave: () => undefined }),
      { socket, realtimeControl: realtime },
    );
    await until(() => result.current.view.state?.isOperator === true);
    const beats = () => socket.emitted.filter((event) => event === "ventilator:heartbeat").length;

    act(() => vi.advanceTimersByTime(4999));
    expect(beats()).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(beats()).toBe(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(beats()).toBe(2);

    // Socket lost: nothing keeps the presence from the browser (an HTTP beat would cancel the backend grace for good).
    realtime.set("disconnected");
    act(() => vi.advanceTimersByTime(20_000));
    expect(beats()).toBe(2);
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(count("POST /api/ventilator/control/heartbeat")).toBe(0);

    // Re-authenticated: the state is read again (the grace may have released the control meanwhile).
    const reads = count("GET /api/ventilator/control");
    realtime.set("authenticated");
    await until(() => count("GET /api/ventilator/control") > reads);

    unmount();
    act(() => vi.advanceTimersByTime(20_000));
    expect(beats()).toBe(2);
    expect(count("POST /api/ventilator/control/heartbeat")).toBe(0);
  });

  it("stops beating when the control is taken over", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const socket = createFakeSocket();
    const { result } = renderLabHook(
      () => useOperatorControl({ enabled: true, heartbeatMs: 5000, releaseOnLeave: () => undefined }),
      { socket },
    );
    await until(() => result.current.view.state?.isOperator === true);

    controlState = stateDto({ operatorUserId: "teacher-1", canTake: false });
    const reads = count("GET /api/ventilator/control");
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: "teacher-1", reason: "takeover" });
    act(() => vi.advanceTimersByTime(15_000));

    expect(socket.emitted.filter((event) => event === "ventilator:heartbeat")).toHaveLength(0);
    await until(() => count("GET /api/ventilator/control") > reads);
  });

  it("releases on pagehide only when operator, and only once (not again on unmount)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    const releaseOnLeave = vi.fn();
    const { result, unmount } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave }), { socket: createFakeSocket() });
    await waitFor(() => expect(result.current.view.state?.isOperator).toBe(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    window.dispatchEvent(new Event("pagehide"));
    expect(releaseOnLeave).toHaveBeenCalledTimes(1);
    unmount();
    expect(releaseOnLeave).toHaveBeenCalledTimes(1);
  });

  it("never releases on leaving with the socket down or before the state was re-read after re-authentication (W2)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    const releaseOnLeave = vi.fn();
    const realtime = createRealtimeStatusControl("authenticated");
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave }), {
      socket: createFakeSocket(),
      realtimeControl: realtime,
    });
    await waitFor(() => expect(result.current.view.state?.isOperator).toBe(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    // Socket down: the shown state may be stale (a teacher/admin DELETE would release anyone's control).
    realtime.set("disconnected");
    window.dispatchEvent(new Event("pagehide"));
    expect(releaseOnLeave).not.toHaveBeenCalled();

    // Re-authenticated, but the re-read has not answered yet.
    const held = holdControlReads();
    realtime.set("authenticated");
    window.dispatchEvent(new Event("pagehide"));
    expect(releaseOnLeave).not.toHaveBeenCalled();

    await until(() => held.waiting() > 0);
    await act(async() => {
      held.answerAll();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    window.dispatchEvent(new Event("pagehide"));
    expect(releaseOnLeave).toHaveBeenCalledTimes(1);
  });

  it("marks the caller not operator on a back-forward cache restore until the re-read answers (S2)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined }), { socket: createFakeSocket() });
    await waitFor(() => expect(result.current.view.state?.isOperator).toBe(true));

    const held = holdControlReads();
    act(() => {
      const restored = new Event("pageshow");
      Object.defineProperty(restored, "persisted", { value: true });
      window.dispatchEvent(restored);
    });
    expect(result.current.view.state).toMatchObject({ isOperator: false, operatorUserId: undefined });

    await until(() => held.waiting() > 0);
    await act(async() => {
      held.answerAll();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(result.current.view.state?.isOperator).toBe(true);
  });

  it("gives every consumer of the shared read its state, also a deduplicated one (S1)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: "student-2", canTake: false });
    const { result, rerender } = renderLabHook(
      ({ second }: { second: boolean }) => ({
        first: useOperatorControl({ enabled: true, releaseOnLeave: () => undefined }),
        second: useOperatorControl({ enabled: second, releaseOnLeave: () => undefined }),
      }),
      { socket: createFakeSocket(), initialProps: { second: false } },
    );
    await waitFor(() => expect(result.current.first.view.state?.operatorUserId).toBe("student-2"));

    rerender({ second: true });
    await waitFor(() => expect(result.current.second.view.state?.operatorUserId).toBe("student-2"));
  });

  it("records the takeover of the operator for the notice (T9)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined }), { socket });
    await waitFor(() => expect(result.current.view.state?.isOperator).toBe(true));

    controlState = stateDto({ operatorUserId: "teacher-1", canTake: false });
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: "teacher-1", reason: "takeover" });
    expect(result.current.view.loss).toEqual({ reason: "takeover", operatorUserId: "teacher-1" });

    act(() => result.current.dismissLoss());
    expect(result.current.view.loss).toBeNull();
  });

  it("releases on unmount when operator, never when not operator", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    const operatorRelease = vi.fn();
    const operator = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: operatorRelease }), { socket: createFakeSocket() });
    await waitFor(() => expect(operator.result.current.view.state?.isOperator).toBe(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    operator.unmount();
    expect(operatorRelease).toHaveBeenCalledTimes(1);

    // A teacher watching another operator: the backend would release that operator, so nothing is sent.
    controlState = stateDto({ operatorUserId: "student-2", canTake: false, canTakeover: true });
    const viewerRelease = vi.fn();
    const viewer = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: viewerRelease }), {
      socket: createFakeSocket(),
      role: "TEACHER",
    });
    await waitFor(() => expect(viewer.result.current.view.state?.canTakeover).toBe(true));
    window.dispatchEvent(new Event("pagehide"));
    viewer.unmount();
    expect(viewerRelease).not.toHaveBeenCalled();
  });

  it("sends the keepalive DELETE with the Bearer token by default", async() => {
    const { releaseControlKeepalive } = await import("../../api/services/ventilator-control.service");
    const tokenStorage = await import("@shared/api-client/token-storage");
    vi.spyOn(tokenStorage, "getAccessToken").mockReturnValue("token-1");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));

    releaseControlKeepalive();

    expect(fetchSpy).toHaveBeenCalledWith(apiUrl("/api/ventilator/control"), expect.objectContaining({
      method: "DELETE",
      keepalive: true,
      headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
    }));
    vi.restoreAllMocks();
  });

  it("ignores a superseded re-read: an old 'operator' answer never comes back nor arms the release (T9 review fix W2)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    const releaseOnLeave = vi.fn();
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave }), { socket });
    await waitFor(() => expect(result.current.view.state?.isOperator).toBe(true));
    await settle();

    const held = holdControlReadsEach();
    // First re-read: requested while the caller still operates.
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: SELF, reason: "taken" });
    await until(() => held.waiting() === 1);
    // A takeover follows: second re-read with the new operator.
    controlState = stateDto({ operatorUserId: "teacher-1", canTake: false });
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: "teacher-1", reason: "takeover" });
    await until(() => held.waiting() === 2);

    // The newest answer arrives first, the superseded one last.
    await act(async() => {
      held.answer(1);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await act(async() => {
      held.answer(0);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.view.state).toMatchObject({ isOperator: false, operatorUserId: "teacher-1" });
    window.dispatchEvent(new Event("pagehide"));
    expect(releaseOnLeave).not.toHaveBeenCalled();
  });

  it("never verifies the state on a failed re-read after re-authentication (T9 review fix W2)", async() => {
    useHandlers();
    controlState = stateDto({ operatorUserId: SELF, isOperator: true, canTake: false });
    const releaseOnLeave = vi.fn();
    const realtime = createRealtimeStatusControl("authenticated");
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave }), {
      socket: createFakeSocket(),
      realtimeControl: realtime,
    });
    await waitFor(() => expect(result.current.view.state?.isOperator).toBe(true));
    await settle();

    realtime.set("disconnected");
    server.use(http.get(apiUrl("/api/ventilator/control"), () => errorResponse("common.unknown", 500)));
    const reads = count("GET /api/ventilator/control");
    realtime.set("authenticated");
    await until(() => count("GET /api/ventilator/control") > reads);
    await settle();

    window.dispatchEvent(new Event("pagehide"));
    expect(releaseOnLeave).not.toHaveBeenCalled();
  });
  it("ignores an SWR reconnect revalidation answering after a control-changed event, before the re-read (T11 review: T9 residual)", async() => {
    useHandlers();
    const socket = createFakeSocket();
    const { result } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined }), { socket });
    await waitFor(() => expect(result.current.view.state).toMatchObject({ operatorUserId: null }));
    await settle();

    const held = holdControlReadsEach();
    // Meanwhile a group member took the control (its event was missed); SWR's own reconnect revalidation (the app
    // default revalidates on reconnect) reads that state.
    controlState = stateDto({ operatorUserId: "student-2", canTake: false });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await until(() => held.waiting() === 1);

    // A teacher takes the control: the event is applied at once and a re-read is requested.
    controlState = stateDto({ operatorUserId: "teacher-1", canTake: false });
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: "teacher-1", reason: "taken" });
    await until(() => held.waiting() === 2);
    expect(result.current.view.state).toMatchObject({ operatorUserId: "teacher-1" });

    // The SWR revalidation (older state) answers first: it must not bring the previous operator back.
    await act(async() => {
      held.answer(0);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(result.current.view.state).toMatchObject({ operatorUserId: "teacher-1" });

    await act(async() => {
      held.answer(1);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(result.current.view.state).toMatchObject({ operatorUserId: "teacher-1" });
  });
  it("writes nothing after unmount: a re-read answering late raises no unhandled rejection (T12 review fix W2)", async() => {
    useHandlers();
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onRejection);

    try {
      const held = holdControlReads();
      const { unmount } = renderLabHook(() => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined }), {
        socket: createFakeSocket(),
      });
      await until(() => held.waiting() > 0);
      unmount();
      held.answerAll();
      await settle();
      await settle();
    } finally {
      process.off("unhandledRejection", onRejection);
    }

    expect(rejections).toEqual([]);
  });

  it("retries a failed re-read after a control-changed event once, then applies its answer (T12 review fix S1)", async() => {
    useHandlers();
    const socket = createFakeSocket();
    const { result } = renderLabHook(
      () => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined, rereadRetryMs: 10 }),
      { socket },
    );
    await waitFor(() => expect(result.current.view.state).toMatchObject({ operatorUserId: null }));
    await settle();

    let failures = 1;
    controlState = stateDto({ operatorUserId: "teacher-1", canTake: false });
    server.use(http.get(apiUrl("/api/ventilator/control"), () => {
      if (failures > 0) {
        failures -= 1;

        return errorResponse("common.unknown", 500);
      }

      return HttpResponse.json(envelope(controlState));
    }));
    const reads = count("GET /api/ventilator/control");
    // The event names the teacher, the backend later reports the teacher released the control to student-2.
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: "teacher-1", reason: "taken" });
    controlState = stateDto({ operatorUserId: "student-2", canTake: false });

    await until(() => count("GET /api/ventilator/control") === reads + 2);
    await until(() => result.current.view.state?.operatorUserId === "student-2");
  });

  it("retries a failed re-read only once (T12 review fix S1)", async() => {
    useHandlers();
    const socket = createFakeSocket();
    const { result } = renderLabHook(
      () => useOperatorControl({ enabled: true, releaseOnLeave: () => undefined, rereadRetryMs: 10 }),
      { socket },
    );
    await waitFor(() => expect(result.current.view.state).toMatchObject({ operatorUserId: null }));
    await settle();

    server.use(http.get(apiUrl("/api/ventilator/control"), () => errorResponse("common.unknown", 500)));
    const reads = count("GET /api/ventilator/control");
    socket.dispatch("ventilator:control-changed", { reservationId: "reservation-1", operatorUserId: "teacher-1", reason: "taken" });

    await until(() => count("GET /api/ventilator/control") === reads + 2);
    await settle();
    await settle();
    expect(count("GET /api/ventilator/control")).toBe(reads + 2);
    // The event stays applied: a failed re-read never invents another state.
    expect(result.current.view.state).toMatchObject({ operatorUserId: "teacher-1" });
  });
});
