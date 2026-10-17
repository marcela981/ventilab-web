/*
* Funcionalidad: Ventilator command UI state tests
* Descripción: The pure command state machine of the live console: one command at a time (a second confirmation while one is in flight, or before the 429 Retry-After, is ignored), sending → awaiting on the 202 SENT, statuses that arrive before the 202 are applied once it arrives, ACKED/APPLIED wait until the device REPORTS the confirmed values (the state never carries a display value) and give up after REPORT_WAIT_MS, REJECTED/TIMEOUT/lost/failed leave a warning on the parameter (the console goes back to the reported value) and free the console, a new confirmation clears the warning, older or foreign statuses are ignored, 422 violations and the 429 wait reach the notice; the recent list merges the history read with the live statuses. v1.1 (T8 review fix): W3 an accepted change not reported within REPORT_WAIT_MS keeps sending blocked until the device reports it (or a reset); W1 a one-step change is not taken as applied while the old value is reported; W2 a request that may have been sent stays locked (uncertain) until the report or the end of the wait. v1.2 (T8 review fix 2): W6 the uncertain wait ends early on a REJECTED of a new command and its end consults the buffered statuses and the history (accepted → blocked, rejected → freed, unreadable → blocked, no trace → not sent); W5 «Usar los valores que informa el equipo» lifts the unreported block. v1.3 (T8 review fix 3): W1 the abandoned accepted values are named and listed before a command carries a different value; W2 only the caller's own early REJECTED/ACKED counts; a TIMEOUT history match keeps sending blocked as unknown; a console reset keeps the block. v1.4 (T8 review fix 4): B1 an abandoned accepted mode change is named and a command carrying the reported mode is warned (cleared by a report of that mode or a later accepted command that knowingly carried a mode); B2 an abandoned one-step change keeps its pre-command base (450 → 460 stays abandoned while 450 is reported); S2 a later accepted command clears only the abandoned values whose field it carried; the carry key changes when the report moves. Depends on vitest and the command state entity.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { VentilatorCommandStatusEvent } from "@shared/realtime";
import type { MappedCommand } from "./command-mapper";
import {
  canSubmitCommand,
  canUseReportedValues,
  carriedMode,
  carriedValues,
  carryKey,
  commandBusyReason,
  commandInFlight,
  commandNoticeView,
  COMMAND_STATE_COPY,
  commandReducer,
  formatCommandParams,
  INITIAL_COMMAND_STATE,
  mergeRecentCommands,
  REPORT_WAIT_MS,
} from "./command-state";
import type { CommandAction, CommandUiState, LabCommandRecord } from "./command-state";

const COMMAND: MappedCommand = {
  mode: "VCV",
  modeChanged: false,
  request: { mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 8, fio2: 0.4 },
  targets: [{ parameter: "peep", value: 8 }],
};

const run = (actions: readonly CommandAction[], state: CommandUiState = INITIAL_COMMAND_STATE) => actions.reduce(commandReducer, state);

const statusEvent = (commandId: string, status: VentilatorCommandStatusEvent["status"], reason?: string): VentilatorCommandStatusEvent => ({
  commandId,
  reservationId: "r1",
  userId: "u1",
  status,
  ...(reason === undefined ? {} : { reason }),
});

const submitted = (localId = "l1", at = 0): CommandAction => ({ type: "submitted", localId, command: COMMAND, at });
const accepted = (status: VentilatorCommandStatusEvent["status"] = "SENT", at = 100): CommandAction => ({ type: "accepted", localId: "l1", commandId: "c1", status, at });

describe("commandReducer", () => {
  it("sends one command at a time and marks its parameters sending, then awaiting", () => {
    const sending = run([submitted()]);

    expect(commandInFlight(sending)).toEqual({ peep: { status: "sending" } });
    expect(canSubmitCommand(sending, 0)).toBe(false);
    expect(commandBusyReason(sending, 0)).toMatch(/cambio en curso/);
    // Double send guard: a second confirmation while one is in flight changes nothing.
    expect(commandReducer(sending, submitted("l2"))).toBe(sending);

    const awaiting = commandReducer(sending, accepted());

    expect(awaiting.active?.commandId).toBe("c1");
    expect(commandInFlight(awaiting)).toEqual({ peep: { status: "awaiting" } });
  });

  it("applies a status that arrived before the 202 once the command id is known", () => {
    const state = run([submitted(), { type: "status", event: statusEvent("c1", "REJECTED", "out_of_order"), at: 50 }, accepted("SENT")]);

    expect(state.active).toBeNull();
    expect(commandInFlight(state)).toEqual({ peep: { status: "rejected", message: "motivo informado: «out_of_order»" } });
  });

  it("keeps the confirmed change waiting until the device REPORTS the value, never before", () => {
    const applied = run([submitted(), accepted(), { type: "status", event: statusEvent("c1", "APPLIED"), at: 200 }]);

    // APPLIED alone: the state holds no display value and the parameter keeps waiting for the report.
    expect(applied.active?.phase).toBe("confirmed");
    expect(commandInFlight(applied).peep?.status).toBe("awaiting");
    expect(applied.notice?.tone).toBe("info");

    const unchanged = commandReducer(applied, { type: "reported", report: { mode: "VCV", settings: { peep: 5 } }, at: 300 });

    expect(unchanged.active?.phase).toBe("confirmed");

    const reported = commandReducer(unchanged, { type: "reported", report: { mode: "VCV", settings: { peep: 8 } }, at: 400 });

    expect(reported.active).toBeNull();
    expect(commandInFlight(reported)).toEqual({});
    expect(reported.notice?.message).toMatch(/el equipo informa los nuevos valores/);
    expect(canSubmitCommand(reported, 400)).toBe(true);
  });

  it("finishes at once when the device already reports the value on ACKED", () => {
    const state = run([
      submitted(),
      { type: "reported", report: { mode: "VCV", settings: { peep: 8 } }, at: 50 },
      accepted("ACKED"),
    ]);

    expect(state.active).toBeNull();
  });

  it("after REPORT_WAIT_MS keeps sending blocked until the device reports the accepted values (T8 review W3)", () => {
    const confirmed = run([submitted(), accepted("ACKED", 100)]);

    expect(commandReducer(confirmed, { type: "tick", at: 100 + REPORT_WAIT_MS - 1 })).toBe(confirmed);

    const gaveUp = commandReducer(confirmed, { type: "tick", at: 100 + REPORT_WAIT_MS });

    expect(gaveUp.active).toBeNull();
    expect(gaveUp.notice).toEqual({ tone: "warning", message: COMMAND_STATE_COPY.notReported, details: [] });
    // The next command would be built from a report that does not show the accepted change: blocked.
    expect(canSubmitCommand(gaveUp, 100 + REPORT_WAIT_MS)).toBe(false);
    expect(commandBusyReason(gaveUp, 100 + REPORT_WAIT_MS)).toBe(COMMAND_STATE_COPY.unreported);
    expect(commandReducer(gaveUp, submitted("l2", 99_999))).toBe(gaveUp);
    expect(commandInFlight(gaveUp)).toEqual({ peep: { status: "awaiting", message: COMMAND_STATE_COPY.unreportedTag } });

    // A report still showing the old value keeps the block; only a report of the accepted value lifts it.
    const stillOld = commandReducer(gaveUp, { type: "reported", report: { mode: "VCV", settings: { peep: 5 } }, at: 9_000 });

    expect(canSubmitCommand(stillOld, 9_000)).toBe(false);

    const reported = commandReducer(stillOld, { type: "reported", report: { mode: "VCV", settings: { peep: 8 } }, at: 9_100 });

    expect(canSubmitCommand(reported, 9_100)).toBe(true);
    expect(commandInFlight(reported)).toEqual({});
    expect(reported.notice?.message).toBe(COMMAND_STATE_COPY.applied);
  });

  it("a console reset (e.g. control lost and retaken) keeps the unreported block of the same reservation (T8 review fix 3)", () => {
    const gaveUp = run([submitted(), accepted("ACKED", 100), { type: "tick", at: 100 + REPORT_WAIT_MS }]);
    const reset = commandReducer(gaveUp, { type: "reset" });

    expect(canSubmitCommand(reset, 0)).toBe(false);
    expect(reset.unreported).toEqual(gaveUp.unreported);
  });

  it("a console reset with a command in flight blocks sending as unknown instead of forgetting it (T8 review fix 3)", () => {
    const reset = run([submitted(), accepted(), { type: "reset" }]);

    expect(reset.active).toBeNull();
    expect(reset.unreported).toEqual({ mode: "VCV", modeChanged: false, targets: COMMAND.targets, accepted: false });
    expect(canSubmitCommand(reset, 0)).toBe(false);
    expect(commandInFlight(reset)).toEqual({ peep: { status: "awaiting", message: COMMAND_STATE_COPY.unconfirmedTag } });
  });

  it("does not take a one-step change as applied while the device still reports the old value (T8 review W1)", () => {
    const step: MappedCommand = { ...COMMAND, targets: [{ parameter: "tidalVolume", value: 460, base: 450 }] };
    const confirmed = run([
      { type: "submitted", localId: "l1", command: step, at: 0 },
      { type: "reported", report: { mode: "VCV", settings: { tidalVolume: 450 } }, at: 50 },
      accepted("APPLIED"),
    ]);

    expect(confirmed.active?.phase).toBe("confirmed");
    expect(commandReducer(confirmed, { type: "reported", report: { mode: "VCV", settings: { tidalVolume: 460 } }, at: 300 }).active).toBeNull();
  });

  it("keeps the console locked while a request that may have been sent is unresolved (T8 review W2)", () => {
    const uncertain = run([
      submitted(),
      { type: "failed", localId: "l1", description: { message: "Sin conexión", violations: [], retryAfterS: null, mayHaveBeenSent: true }, at: 10 },
    ]);

    expect(uncertain.active?.phase).toBe("uncertain");
    expect(canSubmitCommand(uncertain, 10)).toBe(false);
    expect(commandBusyReason(uncertain, 10)).toBe(COMMAND_STATE_COPY.uncertain);
    expect(commandInFlight(uncertain)).toEqual({ peep: { status: "awaiting", message: COMMAND_STATE_COPY.uncertainTag } });
    expect(uncertain.notice).toEqual({ tone: "warning", message: "Sin conexión", details: [] });

    // The device reporting the confirmed value resolves it.
    const reported = commandReducer(uncertain, { type: "reported", report: { mode: "VCV", settings: { peep: 8 } }, at: 500 });

    expect(reported.active).toBeNull();
    expect(canSubmitCommand(reported, 500)).toBe(true);

    // Otherwise only the end of the wait frees it: a history read without the command means it never reached the server.
    expect(commandReducer(uncertain, { type: "uncertain-expired", localId: "other", records: [], at: 20_000 })).toBe(uncertain);

    const expired = commandReducer(uncertain, { type: "uncertain-expired", localId: "l1", records: [], at: 20_000 });

    expect(expired.active).toBeNull();
    expect(canSubmitCommand(expired, 20_000)).toBe(true);
    expect(commandInFlight(expired).peep?.message).toBe(COMMAND_STATE_COPY.notSent);
    expect(expired.notice?.message).toBe(COMMAND_STATE_COPY.notRegistered);
  });

  describe("the end of an uncertain send consults the evidence (T8 review fix 2, W6)", () => {
    const failedUncertain: CommandAction = {
      type: "failed",
      localId: "l1",
      description: { message: "Sin conexión", violations: [], retryAfterS: null, mayHaveBeenSent: true },
      at: 10,
    };
    const known = (ids: readonly string[], callerId: string | null = "u1"): CommandAction => ({ type: "submitted", localId: "l1", command: COMMAND, knownIds: ids, callerId, at: 0 });
    const record = (id: string, status: LabCommandRecord["status"], params: Record<string, unknown> = COMMAND.request, rejectReason: string | null = null): LabCommandRecord => ({
      id,
      status,
      params,
      rejectReason,
      createdAt: "2026-10-16T10:00:00.000Z",
      latencyMs: null,
    });
    const expire = (records: readonly LabCommandRecord[] | null): CommandAction => ({ type: "uncertain-expired", localId: "l1", records, at: 20_000 });

    it("ends the wait early on a REJECTED status of a command unknown before the send", () => {
      const uncertain = run([known(["old"]), failedUncertain]);
      const foreign = commandReducer(uncertain, { type: "status", event: statusEvent("old", "REJECTED", "x"), at: 50 });

      expect(foreign.active?.phase).toBe("uncertain");

      const rejected = commandReducer(uncertain, { type: "status", event: statusEvent("c9", "REJECTED", "device_busy"), at: 60 });

      expect(rejected.active).toBeNull();
      expect(canSubmitCommand(rejected, 60)).toBe(true);
      expect(commandInFlight(rejected)).toEqual({ peep: { status: "rejected", message: "motivo informado: «device_busy»" } });
    });

    it("does not end the wait on a REJECTED of another user's command (teachers and admins get every status; T8 review fix 3, W2)", () => {
      const uncertain = run([known([]), failedUncertain]);
      const foreign = commandReducer(uncertain, { type: "status", event: { ...statusEvent("c9", "REJECTED", "x"), userId: "teacher-1" }, at: 50 });

      expect(foreign.active?.phase).toBe("uncertain");
      // Without a known caller the shortcut is never taken either.
      const anonymous = run([known([], null), failedUncertain, { type: "status", event: statusEvent("c9", "REJECTED", "x"), at: 50 }]);

      expect(anonymous.active?.phase).toBe("uncertain");
      // At the end of the wait only the history (id + parameters) can attribute it: no trace -> never reached the server.
      expect(commandReducer(foreign, expire([])).notice?.message).toBe(COMMAND_STATE_COPY.notRegistered);
    });

    it("does not take another user's ACKED status as this send's outcome (T8 review fix 3, W2)", () => {
      const state = run([known([]), failedUncertain, { type: "status", event: { ...statusEvent("c9", "ACKED"), userId: "teacher-1" }, at: 100 }, expire([])]);

      expect(state.unreported).toBeNull();
      expect(state.notice?.message).toBe(COMMAND_STATE_COPY.notRegistered);
    });

    it("keeps sending blocked as unknown when the history shows the command TIMEOUT (no proof it was not applied; T8 review fix 3)", () => {
      const uncertain = run([known([]), failedUncertain]);
      const state = commandReducer(uncertain, expire([record("c9", "TIMEOUT")]));

      expect(state.active).toBeNull();
      expect(canSubmitCommand(state, 20_000)).toBe(false);
      expect(state.unreported?.accepted).toBe(false);
      expect(commandBusyReason(state, 20_000)).toBe(COMMAND_STATE_COPY.unconfirmedBlocked);
      expect(state.notice?.message).toBe(COMMAND_STATE_COPY.timeoutUnconfirmed("el equipo no confirmó el cambio a tiempo"));
      expect(commandInFlight(state)).toEqual({ peep: { status: "awaiting", message: COMMAND_STATE_COPY.unconfirmedTag } });
      expect(canUseReportedValues(state)).toBe(true);
    });

    it("uses a REJECTED that arrived while the request was still in flight", () => {
      const state = run([known([]), { type: "status", event: statusEvent("c9", "REJECTED", "device_busy"), at: 5 }, failedUncertain]);

      expect(state.active).toBeNull();
      expect(commandInFlight(state).peep?.status).toBe("rejected");
    });

    it("blocks sending (unreported) when the history shows the command ACKED or APPLIED", () => {
      const uncertain = run([known(["old"]), failedUncertain]);
      const blocked = commandReducer(uncertain, expire([record("c9", "APPLIED"), record("old", "REJECTED")]));

      expect(blocked.active).toBeNull();
      expect(blocked.unreported).not.toBeNull();
      expect(canSubmitCommand(blocked, 20_000)).toBe(false);
      expect(commandBusyReason(blocked, 20_000)).toBe(COMMAND_STATE_COPY.unreported);
      expect(commandInFlight(blocked)).toEqual({ peep: { status: "awaiting", message: COMMAND_STATE_COPY.unreportedTag } });
    });

    it("blocks sending when an ACKED status of a new command arrived during the wait", () => {
      const state = run([known([]), failedUncertain, { type: "status", event: statusEvent("c9", "ACKED"), at: 100 }, expire([])]);

      expect(state.unreported).not.toBeNull();
      expect(canSubmitCommand(state, 20_000)).toBe(false);
    });

    it("does not take an older command with the same parameters as this one", () => {
      const uncertain = run([known(["old"]), failedUncertain]);
      const state = commandReducer(uncertain, expire([record("old", "APPLIED")]));

      expect(state.unreported).toBeNull();
      expect(canSubmitCommand(state, 20_000)).toBe(true);
    });

    it("frees the console with the reason when the history shows the command REJECTED", () => {
      const uncertain = run([known([]), failedUncertain]);
      const state = commandReducer(uncertain, expire([record("c9", "REJECTED", COMMAND.request, "device_busy")]));

      expect(state.unreported).toBeNull();
      expect(commandInFlight(state)).toEqual({ peep: { status: "rejected", message: "motivo informado: «device_busy»" } });
    });

    it("keeps sending blocked when the history cannot be read (outcome unknown)", () => {
      const uncertain = run([known([]), failedUncertain]);
      const state = commandReducer(uncertain, expire(null));

      expect(state.active).toBeNull();
      expect(canSubmitCommand(state, 20_000)).toBe(false);
      expect(commandBusyReason(state, 20_000)).toBe(COMMAND_STATE_COPY.unconfirmedBlocked);
      expect(state.notice?.message).toBe(COMMAND_STATE_COPY.unconfirmed);
    });
  });

  describe("the explicit way out of the unreported block (T8 review fix 2, W5)", () => {
    it("re-enables sending on «Usar los valores que informa el equipo», keeping the reported values as the base", () => {
      const gaveUp = run([submitted(), accepted("ACKED", 100), { type: "tick", at: 100 + REPORT_WAIT_MS }]);

      expect(canUseReportedValues(gaveUp)).toBe(true);

      const released = commandReducer(gaveUp, { type: "use-reported" });

      expect(released.unreported).toBeNull();
      expect(canSubmitCommand(released, 9_000)).toBe(true);
      expect(commandInFlight(released)).toEqual({});
      expect(released.notice?.message).toBe(COMMAND_STATE_COPY.usingReported);
      expect(canUseReportedValues(released)).toBe(false);
    });

    it("does nothing while a command is in flight", () => {
      const sending = run([submitted()]);

      expect(canUseReportedValues(sending)).toBe(false);
      expect(commandReducer(sending, { type: "use-reported" })).toBe(sending);
    });
  });

  describe("an accepted value abandoned with «Usar los valores que informa el equipo» (T8 review fix 3, W1)", () => {
    const VT: MappedCommand = {
      mode: "VCV",
      modeChanged: false,
      request: { mode: "VCV", tidalVolume: 600, respiratoryRate: 14, peep: 5, fio2: 0.4 },
      targets: [{ parameter: "tidalVolume", value: 600, base: 500 }],
    };
    const FIO2: MappedCommand = {
      mode: "VCV",
      modeChanged: false,
      request: { mode: "VCV", tidalVolume: 500, respiratoryRate: 14, peep: 5, fio2: 0.6 },
      targets: [{ parameter: "fio2", value: 60, base: 40 }],
    };
    const OLD_REPORT = { mode: "VCV", settings: { tidalVolume: 500, respiratoryRate: 14, peep: 5, fio2: 0.4 } };
    const LINE = "Vt: aceptado 600 mL, el equipo informa 500 mL — el próximo comando enviará 500 mL";
    const blocked = run([
      { type: "reported", report: OLD_REPORT, at: 0 },
      { type: "submitted", localId: "l1", command: VT, at: 0 },
      accepted("ACKED", 100),
      { type: "tick", at: 100 + REPORT_WAIT_MS },
    ]);

    it("names each accepted value the device does not report, next to the way out", () => {
      expect(commandNoticeView(blocked)?.details).toEqual([LINE]);
      expect(commandNoticeView(blocked)?.message).toBe(COMMAND_STATE_COPY.notReported);
    });

    it("keeps the abandoned value and lists it before any command would carry the reported one", () => {
      const released = commandReducer(blocked, { type: "use-reported" });

      expect(released.abandoned).toEqual([{ parameter: "tidalVolume", accepted: 600, base: 500, certain: true }]);
      expect(released.notice?.details).toEqual([LINE]);
      expect(carriedValues(released, FIO2)).toEqual([{ parameter: "tidalVolume", accepted: 600, base: 500, sent: 500, certain: true }]);

      const key = carryKey(FIO2, carriedValues(released, FIO2));
      const warned = commandReducer(released, { type: "carry-warned", key, carried: carriedValues(released, FIO2) });

      expect(warned.notice).toEqual({
        tone: "warning",
        message: COMMAND_STATE_COPY.carryWarning,
        details: ["Vt: aceptado 600 mL — este cambio enviará 500 mL (el valor que informa el equipo)"],
      });
      expect(warned.carryAcknowledged).toBe(key);
      // Submitting clears the acknowledgement; the abandoned value stays until the device confirms a command.
      const sent = commandReducer(warned, { type: "submitted", localId: "l2", command: FIO2, at: 9_000 });

      expect(sent.carryAcknowledged).toBeNull();
      expect(sent.abandoned).toHaveLength(1);
      expect(commandReducer(sent, { type: "accepted", localId: "l2", commandId: "c2", status: "ACKED", at: 9_100 }).abandoned).toEqual([]);
    });

    it("does not list a parameter the operator edits explicitly", () => {
      const released = commandReducer(blocked, { type: "use-reported" });
      const vtAgain: MappedCommand = { ...VT, targets: [{ parameter: "tidalVolume", value: 550, base: 500 }] };

      expect(carriedValues(released, vtAgain)).toEqual([]);
    });

    it("forgets it once the device reports the accepted value", () => {
      const released = commandReducer(blocked, { type: "use-reported" });
      const reported = commandReducer(released, { type: "reported", report: { mode: "VCV", settings: { ...OLD_REPORT.settings, tidalVolume: 600 } }, at: 9_500 });

      expect(reported.abandoned).toEqual([]);
      expect(commandReducer(released, { type: "reported", report: OLD_REPORT, at: 9_500 }).abandoned).toHaveLength(1);
    });

    it("keeps it across a console reset of the same reservation", () => {
      const released = commandReducer(blocked, { type: "use-reported" });

      expect(commandReducer(released, { type: "reset" }).abandoned).toEqual(released.abandoned);
    });

    it("keeps an abandoned one-step change while the device reports the pre-command value (T8 review fix 4, B2)", () => {
      const step: MappedCommand = {
        mode: "VCV",
        modeChanged: false,
        request: { mode: "VCV", tidalVolume: 460, respiratoryRate: 14, peep: 5, fio2: 0.4 },
        targets: [{ parameter: "tidalVolume", value: 460, base: 450 }],
      };
      const report = { mode: "VCV", settings: { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4 } };
      const released = run([
        { type: "reported", report, at: 0 },
        { type: "submitted", localId: "l1", command: step, at: 0 },
        accepted("ACKED", 100),
        { type: "tick", at: 100 + REPORT_WAIT_MS },
        { type: "use-reported" },
      ]);
      const fio2: MappedCommand = {
        mode: "VCV",
        modeChanged: false,
        request: { mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.6 },
        targets: [{ parameter: "fio2", value: 60, base: 40 }],
      };

      // 450 is within 5 % of 460, but it is the value reported before the command: not the accepted one.
      expect(released.abandoned).toEqual([{ parameter: "tidalVolume", accepted: 460, base: 450, certain: true }]);
      expect(commandReducer(released, { type: "reported", report, at: 9_000 }).abandoned).toHaveLength(1);
      expect(carriedValues(released, fio2)).toEqual([{ parameter: "tidalVolume", accepted: 460, base: 450, sent: 450, certain: true }]);
      expect(commandReducer(released, { type: "reported", report: { ...report, settings: { ...report.settings, tidalVolume: 460 } }, at: 9_000 }).abandoned).toEqual([]);
    });

    it("a later accepted command clears only the abandoned values whose field it carried (T8 review fix 4, S2)", () => {
      const trigger: MappedCommand = {
        mode: "VCV",
        modeChanged: false,
        request: { mode: "VCV", tidalVolume: 600, respiratoryRate: 14, peep: 5, fio2: 0.4, sensitivity: 3 },
        targets: [{ parameter: "tidalVolume", value: 600, base: 500 }, { parameter: "flowTrigger", value: 3, base: null }],
      };
      const released = run([
        { type: "reported", report: OLD_REPORT, at: 0 },
        { type: "submitted", localId: "l1", command: trigger, at: 0 },
        accepted("ACKED", 100),
        { type: "tick", at: 100 + REPORT_WAIT_MS },
        { type: "use-reported" },
      ]);

      expect(released.abandoned.map((entry) => entry.parameter)).toEqual(["tidalVolume", "flowTrigger"]);

      // FIO2 carries Vt (acknowledged) but not the sensitivity the device never reported.
      const key = carryKey(FIO2, carriedValues(released, FIO2));
      const confirmed = run([
        { type: "carry-warned", key, carried: carriedValues(released, FIO2) },
        { type: "submitted", localId: "l2", command: FIO2, at: 9_000 },
        { type: "accepted", localId: "l2", commandId: "c2", status: "ACKED", at: 9_100 },
      ], released);

      expect(confirmed.abandoned).toEqual([{ parameter: "flowTrigger", accepted: 3, base: null, certain: true }]);
    });
  });

  describe("an accepted mode change abandoned with «Usar los valores que informa el equipo» (T8 review fix 4, B1)", () => {
    const TO_SIMV: MappedCommand = {
      mode: "SIMV",
      modeChanged: true,
      request: { mode: "SIMV", tidalVolume: 500, respiratoryRate: 14, peep: 5, fio2: 0.4 },
      targets: [],
    };
    const FIO2: MappedCommand = {
      mode: "VCV",
      modeChanged: false,
      request: { mode: "VCV", tidalVolume: 500, respiratoryRate: 14, peep: 5, fio2: 0.6 },
      targets: [{ parameter: "fio2", value: 60, base: 40 }],
    };
    const VCV_REPORT = { mode: "VCV", settings: { tidalVolume: 500, respiratoryRate: 14, peep: 5, fio2: 0.4 } };
    const BLOCKED_LINE = "Modo: aceptado SIMV, el equipo informa VCV — el próximo comando enviará VCV";
    const blocked = run([
      { type: "reported", report: VCV_REPORT, at: 0 },
      { type: "submitted", localId: "l1", command: TO_SIMV, at: 0 },
      accepted("ACKED", 100),
      { type: "tick", at: 100 + REPORT_WAIT_MS },
    ]);
    const released = commandReducer(blocked, { type: "use-reported" });

    it("names the accepted mode the device does not report, before and after the way out", () => {
      expect(commandNoticeView(blocked)?.details).toEqual([BLOCKED_LINE]);
      expect(released.abandonedMode).toEqual({ mode: "SIMV", certain: true });
      expect(released.notice?.details).toEqual([BLOCKED_LINE]);
    });

    it("lists the reported mode a command would carry instead of the accepted one; an identical repeat is acknowledged", () => {
      const mode = carriedMode(released, FIO2);

      expect(mode).toEqual({ mode: "SIMV", certain: true, sent: "VCV" });

      const key = carryKey(FIO2, carriedValues(released, FIO2), mode);
      const warned = commandReducer(released, { type: "carry-warned", key, carried: [], mode });

      expect(warned.notice).toEqual({
        tone: "warning",
        message: COMMAND_STATE_COPY.carryWarning,
        details: ["Modo: aceptado SIMV — este cambio enviará VCV (el modo que informa el equipo)"],
      });
      expect(warned.carryAcknowledged).toBe(key);
      // A key without the mode is another command (the warning named the mode).
      expect(carryKey(FIO2, [])).not.toBe(key);
    });

    it("does not flag a command that explicitly picks the accepted mode or another one", () => {
      expect(carriedMode(released, { ...TO_SIMV, targets: [{ parameter: "fio2", value: 60, base: 40 }] })).toBeNull();
      expect(carriedMode(released, { ...FIO2, mode: "SIMV", modeChanged: true })).toBeNull();
    });

    it("forgets it once the device reports the mode", () => {
      expect(commandReducer(released, { type: "reported", report: { ...VCV_REPORT, mode: "simv" }, at: 9_000 }).abandonedMode).toBeNull();
      expect(commandReducer(released, { type: "reported", report: VCV_REPORT, at: 9_000 }).abandonedMode).not.toBeNull();
    });

    it("keeps it when a later accepted command did not knowingly carry another mode, clears it otherwise (S2)", () => {
      const ack = (command: MappedCommand, from: CommandUiState) => run([
        { type: "submitted", localId: "l2", command, at: 9_000 },
        { type: "accepted", localId: "l2", commandId: "c2", status: "ACKED", at: 9_100 },
      ], from);

      // Without the acknowledged warning the reducer never takes the reported mode as the operator's choice.
      expect(ack(FIO2, released).abandonedMode).toEqual({ mode: "SIMV", certain: true });

      const mode = carriedMode(released, FIO2);
      const warned = commandReducer(released, { type: "carry-warned", key: carryKey(FIO2, [], mode), carried: [], mode });

      expect(ack(FIO2, warned).abandonedMode).toBeNull();
      expect(ack({ ...TO_SIMV, targets: [{ parameter: "fio2", value: 60, base: 40 }] }, released).abandonedMode).toBeNull();
    });

    it("keeps it across a console reset of the same reservation", () => {
      expect(commandReducer(released, { type: "reset" }).abandonedMode).toEqual(released.abandonedMode);
    });
  });

  it("a new carry key when the report moves between the warning and the repeat (T8 review fix 4)", () => {
    const abandoned = { ...INITIAL_COMMAND_STATE, abandoned: [{ parameter: "tidalVolume", accepted: 600, base: 500, certain: true }] };
    const at500: MappedCommand = { ...COMMAND, request: { ...COMMAND.request, tidalVolume: 500 } };
    const at520: MappedCommand = { ...COMMAND, request: { ...COMMAND.request, tidalVolume: 520 } };

    expect(carryKey(at500, carriedValues(abandoned, at500))).not.toBe(carryKey(at520, carriedValues(abandoned, at520)));
  });

  it.each([
    ["REJECTED", "device_busy", "motivo informado: «device_busy»"],
    ["TIMEOUT", undefined, "el equipo no confirmó el cambio a tiempo"],
  ] as const)("frees the console and warns on the parameter after %s", (status, reason, message) => {
    const state = run([submitted(), accepted(), { type: "status", event: statusEvent("c1", status, reason), at: 300 }]);

    expect(state.active).toBeNull();
    expect(commandInFlight(state)).toEqual({ peep: { status: "rejected", message } });
    expect(state.notice?.tone).toBe("warning");
    expect(canSubmitCommand(state, 300)).toBe(true);

    // A new confirmation of that parameter clears its warning.
    expect(commandInFlight(commandReducer(state, submitted("l2", 400)))).toEqual({ peep: { status: "sending" } });
  });

  it("ignores statuses of other commands and older statuses", () => {
    const awaiting = run([submitted(), accepted()]);

    expect(commandReducer(awaiting, { type: "status", event: statusEvent("other", "REJECTED"), at: 1 }).active).toEqual(awaiting.active);

    const confirmed = commandReducer(awaiting, { type: "status", event: statusEvent("c1", "ACKED"), at: 2 });

    expect(commandReducer(confirmed, { type: "status", event: statusEvent("c1", "SENT"), at: 3 }).active?.phase).toBe("confirmed");
  });

  it("ignores the answer of a command that is no longer active", () => {
    const state = run([submitted(), { type: "reset" }, accepted()]);

    expect(state.active).toBeNull();
  });

  it("reports a failed request with the backend violations and frees the console", () => {
    const state = run([
      submitted(),
      { type: "failed", localId: "l1", description: { message: "El servidor rechazó", violations: ["PEEP: supera el máximo de seguridad (15)."], retryAfterS: null, mayHaveBeenSent: false }, at: 10 },
    ]);

    expect(state.active).toBeNull();
    expect(state.notice).toEqual({ tone: "error", message: "El servidor rechazó", details: ["PEEP: supera el máximo de seguridad (15)."] });
    expect(commandInFlight(state)).toEqual({ peep: { status: "rejected", message: "no se envió" } });
  });

  it("blocks new commands until the Retry-After of a 429 has passed", () => {
    const state = run([
      submitted(),
      { type: "failed", localId: "l1", description: { message: "Demasiados", violations: [], retryAfterS: 3, mayHaveBeenSent: false }, at: 1_000 },
    ]);

    expect(canSubmitCommand(state, 3_999)).toBe(false);
    expect(commandBusyReason(state, 1_500)).toBe("Demasiados cambios seguidos: podrás enviar otro en 3 s.");
    expect(commandReducer(state, submitted("l2", 3_000))).toBe(state);
    expect(canSubmitCommand(state, 4_000)).toBe(true);
  });

  it("marks the outcome unknown when the status never arrives", () => {
    const lost = run([submitted(), accepted(), { type: "lost", commandId: "c1", at: 9_000 }]);

    expect(lost.active).toBeNull();
    expect(commandInFlight(lost).peep?.message).toBe("estado desconocido");
  });

  it("shows a refusal of the mapper without starting a command", () => {
    const state = commandReducer(INITIAL_COMMAND_STATE, { type: "refused", message: "No hay cambios para enviar." });

    expect(state.active).toBeNull();
    expect(state.notice).toEqual({ tone: "error", message: "No hay cambios para enviar.", details: [] });
  });
});

describe("mergeRecentCommands", () => {
  const record = (id: string, status: LabCommandRecord["status"], createdAt: string): LabCommandRecord => ({
    id,
    status,
    params: { mode: "VCV", peep: 5, fio2: 0.4 },
    rejectReason: null,
    createdAt,
    latencyMs: null,
  });

  it("puts the live commands first and upgrades the history statuses with newer live ones", () => {
    const state = run([
      submitted(),
      accepted(),
      { type: "status", event: statusEvent("h1", "APPLIED"), at: 150 },
      { type: "status", event: statusEvent("h2", "SENT"), at: 160 },
    ]);
    const items = mergeRecentCommands([record("h1", "SENT", "2026-10-16T15:00:00.000Z"), record("h2", "APPLIED", "2026-10-16T14:59:00.000Z")], state, 10);

    expect(items.map((item) => [item.id, item.status])).toEqual([["c1", "SENT"], ["h1", "APPLIED"], ["h2", "APPLIED"]]);
    expect(items[0]?.summary).toBe("VCV · Vt 450 mL · FR 14 rpm · PEEP 8 cmH2O · FiO2 40 %");
  });

  it("formats the parameters in console units, including the fields without a control", () => {
    expect(formatCommandParams({ mode: "PCV", pressureLimit: 20, ieRatio: 0.5, flowRate: 60, sensitivity: 2 })).toBe(
      "PCV · Trigger flujo 2 L/min · presión límite 20 cmH2O · relación I:E 0,5 · flujo inspiratorio 60 L/min",
    );
  });
});
