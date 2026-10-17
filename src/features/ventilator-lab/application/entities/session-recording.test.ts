/*
* Funcionalidad: Session recording entity tests
* Descripción: The recording toggle is allowed only to a caller the backend lets control the session reservation (holder user, member of the holder group, teacher or admin) while that reservation is active; the local state machine idle → starting → recording → stopping → idle keeps a failed stop as recording (the outcome is unknown) and a failed start as idle; the Spanish copy of 409 (no active reservation), 403 (not a holder), 404 (reservation not found), a lost connection / 5xx (retry is safe: start and stop are idempotent) and the generic lab messages. v1.1 (T10 review fix S8): a 409 on stop (no active reservation: the backend recorder stopped by itself) goes idle with its note. Depends on vitest, the api-client error and the session recording entity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import {
  INITIAL_RECORDING_STATE,
  RECORDING_COPY,
  recordingAllowed,
  recordingErrorMessage,
  recordingReducer,
  recordingStopEnded,
} from "./session-recording.entity";
import type { RecordingAction } from "./session-recording.entity";

const run = (actions: readonly RecordingAction[]) => actions.reduce(recordingReducer, INITIAL_RECORDING_STATE);

const apiError = (status: number, code: string) => new ApiError({ status, code, message: "backend english message" });

describe("recordingAllowed", () => {
  it("only for a caller who can control the session reservation, while it is active", () => {
    expect(recordingAllowed({ canControl: true, sessionReservationId: "r1", currentReservationId: "r1", ended: false })).toBe(true);
    expect(recordingAllowed({ canControl: false, sessionReservationId: "r1", currentReservationId: "r1", ended: false })).toBe(false);
    expect(recordingAllowed({ canControl: true, sessionReservationId: "r1", currentReservationId: "r1", ended: true })).toBe(false);
    expect(recordingAllowed({ canControl: true, sessionReservationId: "r1", currentReservationId: "r2", ended: false })).toBe(false);
    expect(recordingAllowed({ canControl: true, sessionReservationId: "r1", currentReservationId: null, ended: false })).toBe(false);
  });
});

describe("recordingReducer", () => {
  it("starts and stops", () => {
    const starting = run([{ type: "start-requested" }]);

    expect(starting.phase).toBe("starting");

    const recording = recordingReducer(starting, { type: "started", at: 1_000 });

    expect(recording).toEqual({ phase: "recording", startedAt: 1_000, error: null });
    expect(recordingReducer(recording, { type: "stop-requested" }).phase).toBe("stopping");
    expect(run([{ type: "start-requested" }, { type: "started", at: 1 }, { type: "stop-requested" }, { type: "stopped" }])).toEqual(INITIAL_RECORDING_STATE);
  });

  it("ignores a start while not idle and a stop while not recording", () => {
    const starting = run([{ type: "start-requested" }]);

    expect(recordingReducer(starting, { type: "start-requested" })).toBe(starting);
    expect(recordingReducer(INITIAL_RECORDING_STATE, { type: "stop-requested" })).toBe(INITIAL_RECORDING_STATE);
  });

  it("goes back to idle on a failed start, and stays recording on a failed stop (outcome unknown)", () => {
    expect(run([{ type: "start-requested" }, { type: "start-failed", error: "x" }])).toEqual({ phase: "idle", startedAt: null, error: "x" });
    expect(run([{ type: "start-requested" }, { type: "started", at: 5 }, { type: "stop-requested" }, { type: "stop-failed", error: "y" }])).toEqual({
      phase: "recording",
      startedAt: 5,
      error: "y",
    });
  });

  it("goes idle with a note when the stop finds no active reservation (T10 review fix S8)", () => {
    expect(run([{ type: "start-requested" }, { type: "started", at: 5 }, { type: "stop-requested" }, { type: "stop-ended" }])).toEqual({
      phase: "idle",
      startedAt: null,
      error: RECORDING_COPY.stoppedByServer,
    });
    expect(recordingReducer(INITIAL_RECORDING_STATE, { type: "stop-ended" })).toBe(INITIAL_RECORDING_STATE);
    expect(recordingStopEnded(apiError(409, "ventilator-telemetry.no_active_reservation"))).toBe(true);
    expect(recordingStopEnded(apiError(409, "other"))).toBe(true);
    expect(recordingStopEnded(apiError(500, "internal"))).toBe(false);
  });

  it("clears the error on a new request or when dismissed", () => {
    const failed = run([{ type: "start-requested" }, { type: "start-failed", error: "x" }]);

    expect(recordingReducer(failed, { type: "start-requested" }).error).toBeNull();
    expect(recordingReducer(failed, { type: "dismiss-error" }).error).toBeNull();
  });
});

describe("recordingErrorMessage", () => {
  it.each([
    ["start", 409, "ventilator-telemetry.no_active_reservation", "No hay una reserva activa del ventilador: no se pudo iniciar la grabación."],
    ["stop", 409, "ventilator-telemetry.no_active_reservation", "No hay una reserva activa del ventilador: no se pudo detener la grabación."],
    ["start", 403, "ventilator-telemetry.recording_forbidden", RECORDING_COPY.errors.forbidden],
    ["stop", 404, "ventilator-telemetry.reservation_not_found", "No se encontró la reserva: no se pudo detener la grabación."],
    ["start", 409, "common.conflict", "No hay una reserva activa del ventilador: no se pudo iniciar la grabación."],
    ["start", 403, "common.forbidden", RECORDING_COPY.errors.forbidden],
  ] as const)("%s %i %s", (action, status, code, message) => {
    expect(recordingErrorMessage(apiError(status, code), action)).toBe(message);
  });

  it("says a retry is safe after a lost connection or a server error", () => {
    expect(recordingErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkUnavailable), "start")).toBe(RECORDING_COPY.errors.uncertain("iniciar"));
    expect(recordingErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkTimeout), "stop")).toBe(RECORDING_COPY.errors.uncertain("detener"));
    expect(recordingErrorMessage(apiError(500, "common.internal"), "stop")).toBe(RECORDING_COPY.errors.uncertain("detener"));
  });

  it("uses the generic lab messages otherwise", () => {
    expect(recordingErrorMessage(apiError(429, "common.rate_limited"), "start")).toMatch(/Demasiadas solicitudes|Espera/);
  });
});
