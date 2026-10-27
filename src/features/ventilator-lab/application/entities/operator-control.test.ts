/*
* Funcionalidad: Operator control state machine tests
* Descripción: Checks the pure control state machine of the live console: the loaded backend state, every
*   `ventilator:control-changed` reason (taken, takeover, released, presence_timeout, reservation_ended,
*   reservation_preempted) seen by the operator, by another holder and by staff, events of another reservation, the
*   take / takeover / release request lifecycle (pending, success, Spanish error by backend code), the banner text
*   per role (operator, holder, teacher), the console permissions (only the operator controls; socket lost and no-data
*   stay read-only) with the visible reason, the visible actions and the heartbeat interval from the vendored grace.
*   Depends on Vitest only. v1.1 (T7 review fix S2, T9): the bfcache "suspended" state and the control loss record
*   (takeover, taken, presence timeout, release by someone else, lost on a re-read; never the own release or the end of
*   the reservation). v1.2 (T9 review fix): W3 the own release is forgotten when the caller takes or is given the control again; S1 a
*   loss during a back-forward cache stay is reported by the first re-read.
*   v1.3 (W7, Bloque 1): the operator name and generic label (controlOperatorLabel) and their reset on a control change.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { VentilatorControlChangedReason } from "@shared/realtime";
import { ApiError } from "@shared/api-client/api-error";
import {
  CONTROL_COPY,
  controlActions,
  controlBanner,
  controlHeartbeatIntervalMs,
  controlOperatorLabel,
  controlPermissions,
  controlReducer,
  getControlErrorMessage,
  INITIAL_CONTROL_VIEW,
  operatorDisplayName,
} from "./operator-control.entity";
import type { ControlView, OperatorControlState } from "./operator-control.entity";

const SELF = "student-1";
const RESERVATION = "reservation-1";

function state(overrides: Partial<OperatorControlState> = {}): OperatorControlState {
  return {
    reservationId: RESERVATION,
    operatorUserId: null,
    isOperator: false,
    canTake: true,
    canTakeover: false,
    occupied: true,
    ...overrides,
  };
}

function loaded(overrides: Partial<OperatorControlState> = {}): ControlView {
  return controlReducer(INITIAL_CONTROL_VIEW, { type: "loaded", state: state(overrides) });
}

function changed(view: ControlView, operatorUserId: string | null, reason: VentilatorControlChangedReason, reservationId = RESERVATION): ControlView {
  return controlReducer(view, { type: "changed", event: { reservationId, operatorUserId, reason }, selfUserId: SELF });
}

describe("control state machine", () => {
  it("starts unknown and takes the backend state as loaded", () => {
    expect(INITIAL_CONTROL_VIEW).toEqual({ state: null, pending: null, error: null, loss: null, ownRelease: false, suspendedOperator: false });
    expect(loaded().state).toEqual(state());
  });

  it("taken by me: I am the operator and can neither take nor take over", () => {
    const view = changed(loaded(), SELF, "taken");

    expect(view.state).toMatchObject({ operatorUserId: SELF, isOperator: true, canTake: false, canTakeover: false });
  });

  it("taken by someone else: I lose the take and keep a takeover the backend had granted", () => {
    expect(changed(loaded(), "student-2", "taken").state).toMatchObject({ operatorUserId: "student-2", isOperator: false, canTake: false, canTakeover: false });
    // A group leader / teacher who could already take over another operator keeps it when the operator changes.
    const leader = loaded({ operatorUserId: "student-2", canTake: false, canTakeover: true });
    expect(changed(leader, "student-3", "takeover").state).toMatchObject({ operatorUserId: "student-3", canTakeover: true });
  });

  it("takeover from me: I stop being the operator", () => {
    const view = changed(loaded({ operatorUserId: SELF, isOperator: true, canTake: false }), "teacher-1", "takeover");

    expect(view.state).toMatchObject({ operatorUserId: "teacher-1", isOperator: false, canTake: false });
  });

  it.each(["released", "presence_timeout"] as const)("%s: the control is free and whoever could act on it may take it", (reason) => {
    const operator = changed(loaded({ operatorUserId: SELF, isOperator: true, canTake: false }), null, reason);
    expect(operator.state).toMatchObject({ operatorUserId: null, isOperator: false, canTake: true, canTakeover: false });

    const leader = changed(loaded({ operatorUserId: "student-2", canTake: false, canTakeover: true }), null, reason);
    expect(leader.state).toMatchObject({ operatorUserId: null, canTake: true, canTakeover: false });

    // Someone the backend never let act keeps no action.
    const viewer = changed(loaded({ operatorUserId: "student-2", canTake: false, canTakeover: false }), null, reason);
    expect(viewer.state).toMatchObject({ operatorUserId: null, canTake: false });
  });

  it.each(["reservation_ended", "reservation_preempted"] as const)("%s: nobody controls and nothing can be taken", (reason) => {
    const view = changed(loaded({ operatorUserId: SELF, isOperator: true, canTake: false }), null, reason);

    expect(view.state).toMatchObject({ operatorUserId: null, isOperator: false, canTake: false, canTakeover: false });
  });

  it("ignores events of another reservation and events before the first load", () => {
    const view = loaded();

    expect(changed(view, "student-9", "taken", "reservation-9")).toBe(view);
    expect(changed(INITIAL_CONTROL_VIEW, SELF, "taken")).toBe(INITIAL_CONTROL_VIEW);
  });

  it("tracks a request until it succeeds or fails with the backend error", () => {
    const requested = controlReducer(loaded(), { type: "requested", action: "take" });
    expect(requested.pending).toBe("take");

    const failed = controlReducer(requested, { type: "failed", action: "take", message: "Ocupado" });
    expect(failed).toMatchObject({ pending: null, error: "Ocupado" });

    const again = controlReducer(failed, { type: "requested", action: "take" });
    expect(again.error).toBeNull();
    // Success does not invent the new state: the control-changed event and the re-read bring it.
    expect(controlReducer(again, { type: "succeeded", action: "take" })).toMatchObject({ pending: null, state: state() });
  });

  it("marks the state unknown and not operator after a back-forward cache restore (T7 review fix S2)", () => {
    const view = controlReducer(loaded({ operatorUserId: SELF, isOperator: true, canTake: false }), { type: "suspended" });

    expect(view.state).toMatchObject({ isOperator: false, operatorUserId: undefined, canTake: false, canTakeover: false });
    expect(controlBanner(view.state, null).kind).toBe("unknown");
    expect(controlReducer(INITIAL_CONTROL_VIEW, { type: "suspended" })).toBe(INITIAL_CONTROL_VIEW);
  });
});

describe("control loss (T9)", () => {
  const operator = () => loaded({ operatorUserId: SELF, isOperator: true, canTake: false });

  it("records who took the control from the operator (takeover or taken)", () => {
    expect(changed(operator(), "teacher-1", "takeover").loss).toEqual({ reason: "takeover", operatorUserId: "teacher-1" });
    expect(changed(operator(), "teacher-1", "taken").loss).toEqual({ reason: "taken", operatorUserId: "teacher-1" });
  });

  it("records a presence timeout and a release by someone else, but not the operator's own release", () => {
    expect(changed(operator(), null, "presence_timeout").loss).toEqual({ reason: "presence_timeout", operatorUserId: null });
    expect(changed(operator(), null, "released").loss).toEqual({ reason: "released", operatorUserId: null });

    const releasing = controlReducer(operator(), { type: "requested", action: "release" });
    expect(changed(releasing, null, "released").loss).toBeNull();
    const released = controlReducer(releasing, { type: "succeeded", action: "release" });
    expect(changed(released, null, "released").loss).toBeNull();
  });

  it("leaves the end of the reservation to the revoked modal and ignores other people's changes", () => {
    expect(changed(operator(), null, "reservation_preempted").loss).toBeNull();
    expect(changed(operator(), null, "reservation_ended").loss).toBeNull();
    expect(changed(loaded({ operatorUserId: "student-2" }), "teacher-1", "takeover").loss).toBeNull();
  });

  it("records a loss found on a re-read of the same reservation (missed event)", () => {
    const reread = controlReducer(operator(), { type: "loaded", state: state({ operatorUserId: "teacher-1", canTake: false }) });
    expect(reread.loss).toEqual({ reason: "lost", operatorUserId: "teacher-1" });

    // A re-read confirming the event keeps the event reason.
    const afterEvent = changed(operator(), "teacher-1", "takeover");
    expect(controlReducer(afterEvent, { type: "loaded", state: state({ operatorUserId: "teacher-1", canTake: false }) }).loss)
      .toEqual({ reason: "takeover", operatorUserId: "teacher-1" });
    // Another reservation: the revoked modal handles it.
    expect(controlReducer(operator(), { type: "loaded", state: state({ reservationId: "reservation-2" }) }).loss).toBeNull();
    // Own release confirmed by the re-read before the event.
    const released = controlReducer(controlReducer(operator(), { type: "requested", action: "release" }), { type: "succeeded", action: "release" });
    expect(controlReducer(released, { type: "loaded", state: state() }).loss).toBeNull();
  });

  it("forgets the own release once the caller operates again, so a later staff release is a loss (T9 review fix W3)", () => {
    // The `released` event arrives before the 2xx of the caller's own DELETE.
    const releasing = controlReducer(operator(), { type: "requested", action: "release" });
    const done = controlReducer(changed(releasing, null, "released"), { type: "succeeded", action: "release" });

    expect(controlReducer(done, { type: "requested", action: "take" }).ownRelease).toBe(false);
    expect(controlReducer(done, { type: "requested", action: "takeover" }).ownRelease).toBe(false);

    const retaken = changed(done, SELF, "taken");
    expect(retaken.ownRelease).toBe(false);
    expect(changed(retaken, null, "released").loss).toEqual({ reason: "released", operatorUserId: null });
  });

  it("reports a loss that happened while the page was in the back-forward cache (T9 review fix S1)", () => {
    const suspended = controlReducer(operator(), { type: "suspended" });

    expect(controlReducer(suspended, { type: "loaded", state: state({ operatorUserId: "teacher-1", canTake: false }) }).loss)
      .toEqual({ reason: "lost", operatorUserId: "teacher-1" });
    // Still the operator after the restore, or restored as a viewer: nothing was lost.
    expect(controlReducer(suspended, { type: "loaded", state: state({ operatorUserId: SELF, isOperator: true }) }).loss).toBeNull();
    const viewer = controlReducer(loaded({ operatorUserId: "student-2" }), { type: "suspended" });
    expect(controlReducer(viewer, { type: "loaded", state: state({ operatorUserId: "teacher-1" }) }).loss).toBeNull();
    // Only the first re-read after the restore can report it.
    const reported = controlReducer(suspended, { type: "loaded", state: state({ operatorUserId: "teacher-1", canTake: false }) });
    const dismissed = controlReducer(reported, { type: "dismissLoss" });
    expect(controlReducer(dismissed, { type: "loaded", state: state({ operatorUserId: "teacher-1", canTake: false }) }).loss).toBeNull();
  });

  it("clears the notice when dismissed or when the caller operates again", () => {
    const lost = changed(operator(), null, "presence_timeout");

    expect(controlReducer(lost, { type: "dismissLoss" }).loss).toBeNull();
    expect(changed(lost, SELF, "taken").loss).toBeNull();
    expect(controlReducer(lost, { type: "loaded", state: state({ operatorUserId: SELF, isOperator: true }) }).loss).toBeNull();
  });
});

describe("control presentation", () => {
  it("banner per role: operator, another operator (backend name or a neutral text), free, unknown", () => {
    expect(controlBanner(state({ operatorUserId: SELF, isOperator: true }), null)).toEqual({ kind: "self", text: "Controlas el equipo" });
    expect(controlBanner(state({ operatorUserId: "student-2" }), "Ana Pérez")).toEqual({ kind: "other", text: "Opera: Ana Pérez" });
    expect(controlBanner(state({ operatorUserId: "teacher-9" }), null)).toEqual({ kind: "other", text: `Opera: ${CONTROL_COPY.otherOperator}` });
    expect(controlBanner(state(), null)).toEqual({ kind: "free", text: "Control libre" });
    expect(controlBanner(null, null)).toEqual({ kind: "unknown", text: CONTROL_COPY.checking });
    expect(controlBanner(state({ operatorUserId: undefined }), null).kind).toBe("unknown");
  });

  it("names the operator only with what the backend returned for the reservation holder", () => {
    const reservation = { holderUserId: "student-2", holderName: "Ana Pérez" };

    expect(operatorDisplayName("student-2", reservation)).toBe("Ana Pérez");
    expect(operatorDisplayName("student-3", reservation)).toBeNull();
    expect(operatorDisplayName(null, reservation)).toBeNull();
    expect(operatorDisplayName("student-2", { holderUserId: "student-2", holderName: null })).toBeNull();
  });

  it("only the operator controls, and never without data or socket", () => {
    const operator = state({ operatorUserId: SELF, isOperator: true });

    expect(controlPermissions(operator, null, { live: true, socketOnline: true })).toEqual({ canControl: true, readOnlyReason: null });
    expect(controlPermissions(operator, null, { live: false, socketOnline: true }).canControl).toBe(false);
    expect(controlPermissions(operator, null, { live: false, socketOnline: false }).canControl).toBe(false);
    expect(controlPermissions(state({ operatorUserId: "student-2" }), "Ana Pérez", { live: true, socketOnline: true }))
      .toEqual({ canControl: false, readOnlyReason: "Opera: Ana Pérez" });
    expect(controlPermissions(state(), null, { live: true, socketOnline: true }))
      .toEqual({ canControl: false, readOnlyReason: "Toma el control para operar" });
    expect(controlPermissions(null, null, { live: true, socketOnline: true }))
      .toEqual({ canControl: false, readOnlyReason: CONTROL_COPY.checking });
  });

  it("shows take when free, takeover only when the backend allows it, release only to the operator", () => {
    expect(controlActions(state())).toEqual({ take: true, takeover: false, release: false });
    expect(controlActions(state({ canTake: false }))).toEqual({ take: false, takeover: false, release: false });
    expect(controlActions(state({ operatorUserId: "student-2", canTake: false, canTakeover: true }))).toEqual({ take: false, takeover: true, release: false });
    expect(controlActions(state({ operatorUserId: "student-2", canTake: false }))).toEqual({ take: false, takeover: false, release: false });
    expect(controlActions(state({ operatorUserId: SELF, isOperator: true, canTake: false }))).toEqual({ take: false, takeover: false, release: true });
    expect(controlActions(null)).toEqual({ take: false, takeover: false, release: false });
  });

  it("maps the backend control error codes to Spanish and falls back to the lab messages", () => {
    const error = (code: string, status: number) => new ApiError({ code, status, message: "x" });

    expect(getControlErrorMessage(error("ventilator-commands.control_locked", 423))).toBe(CONTROL_COPY.errors.locked);
    expect(getControlErrorMessage(error("ventilator-commands.not_reservation_holder", 403))).toBe(CONTROL_COPY.errors.notHolder);
    expect(getControlErrorMessage(error("ventilator-commands.no_active_reservation", 423))).toBe(CONTROL_COPY.errors.noActiveReservation);
    expect(getControlErrorMessage(error("ventilator-commands.not_operator", 423))).toBe(CONTROL_COPY.errors.notOperator);
    expect(getControlErrorMessage(error("other", 500))).toBe("Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.");
  });

  it("beats three times per presence grace, never faster than once a second", () => {
    expect(controlHeartbeatIntervalMs(15)).toBe(5000);
    expect(controlHeartbeatIntervalMs(0)).toBe(1000);
  });
});

describe("operator name (W7)", () => {
  it("shows the backend name, else the Spanish generic label of its key, else nothing", () => {
    expect(controlOperatorLabel(state({ operatorUserId: "u2", operatorName: "Ana Gómez" }))).toBe("Ana Gómez");
    expect(controlOperatorLabel(state({ operatorUserId: "u2", operatorName: null, operatorLabelKey: "ventilator-commands.operator_labels.teacher" }))).toBe("Un docente");
    expect(controlOperatorLabel(state({ operatorUserId: "u2", operatorName: null, operatorLabelKey: "ventilator-commands.operator_labels.student" }))).toBe("Un estudiante");
    expect(controlOperatorLabel(state({ operatorUserId: "u2", operatorLabelKey: "unknown.key" }))).toBeNull();
    expect(controlOperatorLabel(state({ operatorUserId: null, operatorName: null }))).toBeNull();
    expect(controlOperatorLabel(null)).toBeNull();
  });

  it("forgets the name when another operator takes over (until the re-read) and clears it when the control is free", () => {
    const named = loaded({ operatorUserId: "u2", operatorName: "Ana Gómez", canTake: false });

    expect(changed(named, "u3", "takeover").state?.operatorName).toBeUndefined();
    expect(changed(named, "u2", "taken").state?.operatorName).toBe("Ana Gómez");
    expect(changed(named, null, "released").state?.operatorName).toBeNull();
  });
});
