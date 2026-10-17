/*
* Funcionalidad: Ventilator command UI state
* Descripción: Pure state machine of the commands sent from the live console. ONE command at a time: a confirmation
*   while another is in flight (or before the Retry-After of a 429) is ignored, because every command is a full setting
*   set built from the reported values and a second one would resend the old value of the first one's parameters.
*   Phases of the active command: `sending` (POST in flight), `awaiting` (PENDING/SENT), `confirmed` (ACKED/APPLIED,
*   waiting until the telemetry REPORTS the confirmed values, at most REPORT_WAIT_MS). The state never carries a value
*   to display: the console shows only what the device reports, so a confirmed change appears when the telemetry shows
*   it. REJECTED / TIMEOUT / a failed request / a lost status end the command with a per-parameter warning (console tag
*   "Rechazado: <motivo>") and a notice; the controls show the reported value again because the console never kept the
*   edit. A status that arrives before the 202 (the backend may resolve a command before answering) is buffered and
*   applied once the id is known; statuses never go backwards (PENDING < SENT < terminal). Every status seen is kept for
*   the "Comandos recientes" list, merged with the history read (GET /api/ventilator/commands). Selectors: the console
*   `settings.inFlight`, whether a command may be sent and the read-only reason while not. Depends on the realtime
*   command status types, the console contract types, the sim-engine console binding (units), the command mapper and the
*   command messages. v1.1 (T8 review fix): W3 a confirmed change the telemetry does not report within REPORT_WAIT_MS
*   frees the per-parameter tags but keeps sending BLOCKED (`unreported`, visible reason) until a device report shows the
*   accepted values (or a new reservation resets the state): the next full setting set would otherwise be built from a
*   report without the accepted change and could revert it. W2 a request that may have been sent (client timeout, lost
*   connection, 5xx) keeps the console locked in the `uncertain` phase until the device reports the confirmed values or
*   the hook declares the wait over (`uncertain-expired`, after the backend ack timeout + margins). W1 the report match
*   is the mapper's (closer to the target than to the pre-command base). v1.2 (T8 review fix 2): W6 an uncertain send
*   remembers the command ids known before it (history + session); a REJECTED of a new id buffered while uncertain
*   ends the wait early, and the end of the wait consults the buffered statuses and the history read at that moment (a
*   new record with the same parameters): ACKED/APPLIED → `unreported` block, REJECTED/TIMEOUT → freed with the reason,
*   history unreadable or unresolved → blocked as unknown (`accepted` false, own reason), no trace → "no llegó al
*   equipo". W5 the explicit way out `use-reported` («Usar los valores que informa el equipo»): it only re-enables
*   sending (the base of a command is always the reported values). An automatic lift when the report moves away from
*   the base was NOT added: a report taken mid-change (e.g. a ramp) would let a command rebuilt from it revert the
*   accepted change. S7 the unreachable `mayHaveBeenSent` branch of a definite failure removed. v1.3 (T8 review fix 3):
*   W1 «Usar los valores que informa el equipo» no longer forgets the accepted values: they stay in `abandoned` (cleared
*   when a report shows them, when a later command is confirmed ACKED/APPLIED — it carried them explicitly or edited
*   them — or on a new reservation); while blocked, `commandNoticeView` names each one ("Vt: aceptado 600 mL, el equipo
*   informa 500 mL — el próximo comando enviará 500 mL"), and `carriedValues` lists every value a command would carry
*   that differs from an abandoned one: the hook then refuses that command once with the list (`carry-warned`) and sends
*   it only if the operator repeats the identical change (`carryAcknowledged` = `carryKey`). A hard refusal unless the
*   parameter is edited was rejected: the console only emits values that differ from the reported one, so "keep the
*   reported 500 mL" could never be expressed and the operator would be stuck; the shared console confirmation dialog
*   cannot list them (generic module). W2 an early REJECTED/ACKED counts as this uncertain send's outcome only when the
*   event `userId` is the caller (`callerId` of `submitted`; teachers/admins receive every command status); otherwise
*   only the history record (new id + same parameters) attributes it. A TIMEOUT history match no longer frees the
*   console: TIMEOUT does not prove the change was not applied, so sending stays blocked as unknown (tag "sin
*   confirmación del equipo"; «Usar los valores que informa el equipo» is the way out). `reset` (console reset within the
*   same reservation, e.g. control lost and retaken) keeps the unreported block and the abandoned values, and turns a
*   command still in flight into an unknown block; a new reservation gets a fresh state in the hook. Limitation: the
*   block lives in this tab's memory (another tab or a reload does not know it). v1.4 (T8 review fix 4): B1 an accepted
*   MODE change abandoned with «Usar los valores que informa el equipo» is kept in `abandonedMode` (the notice names it:
*   "Modo: aceptado SIMV, el equipo informa VCV — el próximo comando enviará VCV"); `carriedMode` flags a command that
*   would carry the reported mode instead (the operator did not pick a mode), and it follows the same carry warning /
*   identical-repeat flow (`carryKey` includes the mode). It is cleared when the report shows that mode, on a new
*   reservation, or when a later accepted command knowingly carried a mode (the same one, one the operator picked, or
*   the reported one after the acknowledged warning: `supersedesMode`, computed at submit). B2 an abandoned value keeps
*   its pre-command `base`, so the report and carried-value matches use the closer-than-base guard (a one-step change
*   such as Vt 450 → 460 is not taken as reported by 450). S2 a later ACKED/APPLIED supersedes only the abandoned values
*   whose field its request carried (e.g. an unreported optional sensitivity stays). S1 `reset` is reducer-only: the
*   hook never dispatches it (it keeps the state while `canSend` toggles, and a new reservation reads a fresh state);
*   it is kept as the documented semantics of a console reset within a reservation.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { PARAMETER_SETTINGS, tidy } from "@shared/sim-engine/console-binding";
import type { VentilatorCommandStatus, VentilatorCommandStatusEvent } from "@shared/realtime";
import { CONSOLE_PARAMETERS } from "@shared/ventilator-console";
import type { ConsoleInFlight, ConsoleParameterId } from "@shared/ventilator-console";
import { COMMAND_PARAMETERS, commandFieldName, reportedConsoleValue, reportMatchesTargets } from "./command-mapper";
import type { CommandField, CommandTarget, DeviceReport, MappedCommand } from "./command-mapper";
import { commandOutcomeReason } from "./command-messages";
import type { SendCommandErrorDescription } from "./command-messages";

/** How long a confirmed (ACKED/APPLIED) change waits for the telemetry to report it before the console is freed. */
export const REPORT_WAIT_MS = 5000;
/** Statuses that arrived before their 202 and are kept until it arrives. */
const EARLY_LIMIT = 20;
/** Live statuses kept for the recent list. */
const SESSION_LIMIT = 50;

export type CommandPhase = "sending" | "awaiting" | "confirmed" | "uncertain";

export type ActiveCommand = {
  localId: string
  commandId: string | null
  phase: CommandPhase
  status: VentilatorCommandStatus | null
  mode: string
  modeChanged: boolean
  request: MappedCommand["request"]
  targets: readonly CommandTarget[]
  phaseSince: number
  /** W6: command ids known before this send (history + session), never taken as this command's evidence. */
  knownIds: readonly string[]
  /** Fix 3 (W2): the session user that sent it; only its own early statuses can resolve an uncertain send. */
  callerId: string | null
  /**
   * Fix 4 (B1/S2): the request knowingly carries a mode over an abandoned accepted mode (the same mode, a mode the
   * operator picked, or the reported mode after the acknowledged carry warning): its acceptance supersedes it.
   */
  supersedesMode: boolean
};

export type CommandNotice = { tone: "info" | "warning" | "error", message: string, details: readonly string[] };

/** A command seen in this session (POST answer or live status). */
export type SessionCommand = {
  id: string
  status: VentilatorCommandStatus
  reason: string | null
  params: Readonly<Record<string, unknown>> | null
  /** Client time of the last update. */
  at: number
};

/** A command of the history read (GET /api/ventilator/commands). */
export type LabCommandRecord = {
  id: string
  status: VentilatorCommandStatus
  params: Readonly<Record<string, unknown>>
  rejectReason: string | null
  createdAt: string
  latencyMs: number | null
};

/**
 * A change the device has not reported yet: no command may be built until it does (or the operator chooses to use the
 * reported values). `accepted` false: an uncertain send whose outcome could not be checked (history unreadable).
 */
export type UnreportedChange = { mode: string, modeChanged: boolean, targets: readonly CommandTarget[], accepted: boolean };

/**
 * Fix 3 (W1): an accepted (or, `certain` false, possibly accepted) value the operator stopped waiting for. Fix 4 (B2):
 * `base` is the value reported before that command, so a one-step change is never taken as reported by the old value.
 */
export type AbandonedTarget = { parameter: string, accepted: number, base: number | null, certain: boolean };

/** A value a command would carry from the report that differs from an abandoned accepted value (console units). */
export type CarriedValue = AbandonedTarget & { sent: number };

/** Fix 4 (B1): an accepted (or possibly accepted) mode change the operator stopped waiting for. */
export type AbandonedMode = { mode: string, certain: boolean };

/** Fix 4 (B1): the reported mode a command would carry instead of an abandoned accepted mode. */
export type CarriedMode = AbandonedMode & { sent: string };

export type CommandUiState = {
  active: ActiveCommand | null
  unreported: UnreportedChange | null
  /** Parameter → warning of its last command (rejected, not sent, unknown). */
  warnings: Readonly<Record<string, string>>
  notice: CommandNotice | null
  early: readonly VentilatorCommandStatusEvent[]
  session: Readonly<Record<string, SessionCommand>>
  report: DeviceReport
  /** Client time before which no command may be sent (429). */
  retryAt: number | null
  /** Fix 3 (W1): accepted values abandoned with «Usar los valores que informa el equipo». */
  abandoned: readonly AbandonedTarget[]
  /** Fix 4 (B1): an accepted mode change abandoned with «Usar los valores que informa el equipo». */
  abandonedMode: AbandonedMode | null
  /** Fix 3 (W1): `carryKey` of the command whose carried values the operator was warned about (repeat → send). */
  carryAcknowledged: string | null
};

export const INITIAL_COMMAND_STATE: CommandUiState = {
  active: null,
  unreported: null,
  warnings: {},
  notice: null,
  early: [],
  session: {},
  report: { settings: null, mode: null },
  retryAt: null,
  abandoned: [],
  abandonedMode: null,
  carryAcknowledged: null,
};

export type CommandAction =
  | { type: "submitted", localId: string, command: MappedCommand, at: number, knownIds?: readonly string[], callerId?: string | null }
  | { type: "accepted", localId: string, commandId: string, status: VentilatorCommandStatus, at: number }
  | { type: "failed", localId: string, description: SendCommandErrorDescription, at: number }
  | { type: "status", event: VentilatorCommandStatusEvent, at: number }
  | { type: "reported", report: DeviceReport, at: number }
  | { type: "tick", at: number }
  | { type: "lost", commandId: string, at: number }
  /** W6: `records` is the history read at the end of the wait, null when it could not be read. */
  | { type: "uncertain-expired", localId: string, records: readonly LabCommandRecord[] | null, at: number }
  | { type: "use-reported" }
  /** Fix 3 (W1): the command was not sent; its carried values (fix 4: and mode) are listed; an identical repeat sends it. */
  | { type: "carry-warned", key: string, carried: readonly CarriedValue[], mode?: CarriedMode | null }
  | { type: "refused", message: string }
  | { type: "reset" };

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const COMMAND_STATE_COPY = {
  busy: "Hay un cambio en curso: espera la confirmación del equipo antes de enviar otro.",
  rateLimited: (seconds: number) => `Demasiados cambios seguidos: podrás enviar otro en ${seconds} s.`,
  confirmedWaiting: "aceptado; esperando que el equipo informe el valor",
  accepted: "El equipo aceptó el cambio; los valores se actualizan cuando el equipo los informe.",
  applied: "Cambio aplicado: el equipo informa los nuevos valores.",
  notReported: "El equipo aceptó el cambio, pero aún no informa los nuevos valores. La consola muestra lo que el equipo informa.",
  unreported: "El equipo aceptó el último cambio pero aún no informa esos valores: no se puede enviar otro hasta que los informe (otro cambio armado con los valores anteriores podría deshacerlo).",
  unreportedTag: "aceptado; el equipo aún no informa el valor",
  uncertain: "No se sabe si el último cambio llegó al equipo: espera a que el equipo informe los valores o a que termine el tiempo de confirmación.",
  uncertainTag: "pudo haberse enviado; esperando al equipo",
  outcome: (label: string, reason: string) => `Cambio no aplicado (${label.toLowerCase()}): ${reason}. La consola muestra los valores que informa el equipo.`,
  notSent: "no se envió",
  unknown: "estado desconocido",
  lost: "No llegó la confirmación del estado del cambio. Revisa «Comandos recientes» y los valores que informa el equipo.",
  notRegistered: "El servidor no registró el último cambio: no llegó al equipo. La consola muestra los valores que informa el equipo.",
  unconfirmed: "No se pudo comprobar si el último cambio llegó al equipo. La consola muestra los valores que informa el equipo.",
  unconfirmedBlocked: "No se sabe si el último cambio llegó al equipo: no se puede enviar otro hasta que el equipo informe esos valores o elijas usar los valores que informa.",
  usingReported: "Los próximos cambios se arman con los valores que informa el equipo.",
  unconfirmedTag: "sin confirmación del equipo",
  timeoutUnconfirmed: (reason: string) => `Sin confirmación del equipo (${reason}): no se sabe si el cambio se aplicó. No se puede enviar otro hasta que el equipo informe esos valores o elijas usar los valores que informa.`,
  carryWarning: "No se envió: este cambio mantendría valores distintos de los que el equipo aceptó antes (abajo). Si es lo que quieres, repite el mismo cambio y confírmalo de nuevo; si no, ajusta esos parámetros en el cambio.",
  abandonedLine: (label: string, certain: boolean, accepted: string, reported: string | null) => (reported === null
    ? `${label}: ${certain ? "aceptado" : "posiblemente aceptado"} ${accepted}, el equipo no informa el valor`
    : `${label}: ${certain ? "aceptado" : "posiblemente aceptado"} ${accepted}, el equipo informa ${reported} — el próximo comando enviará ${reported}`),
  carriedLine: (label: string, certain: boolean, accepted: string, sent: string) => `${label}: ${certain ? "aceptado" : "posiblemente aceptado"} ${accepted} — este cambio enviará ${sent} (el valor que informa el equipo)`,
  abandonedModeLine: (certain: boolean, accepted: string, reported: string | null) => (reported === null
    ? `Modo: ${certain ? "aceptado" : "posiblemente aceptado"} ${accepted}, el equipo no informa el modo`
    : `Modo: ${certain ? "aceptado" : "posiblemente aceptado"} ${accepted}, el equipo informa ${reported} — el próximo comando enviará ${reported}`),
  carriedModeLine: (certain: boolean, accepted: string, sent: string) => `Modo: ${certain ? "aceptado" : "posiblemente aceptado"} ${accepted} — este cambio enviará ${sent} (el modo que informa el equipo)`,
} as const;

const STATUS_RANK: Readonly<Record<VentilatorCommandStatus, number>> = {
  PENDING: 0,
  SENT: 1,
  ACKED: 2,
  APPLIED: 2,
  REJECTED: 2,
  TIMEOUT: 2,
};

function isTerminal(status: VentilatorCommandStatus): boolean {
  return STATUS_RANK[status] === 2;
}

function warningsFor(targets: readonly CommandTarget[], message: string, base: Readonly<Record<string, string>>): Record<string, string> {
  const next = { ...base };

  targets.forEach((target) => {
    next[target.parameter] = message;
  });

  return next;
}

function withoutWarnings(targets: readonly CommandTarget[], base: Readonly<Record<string, string>>): Record<string, string> {
  const next = { ...base };

  targets.forEach((target) => {
    delete next[target.parameter];
  });

  return next;
}

function remember(session: Readonly<Record<string, SessionCommand>>, entry: SessionCommand): Readonly<Record<string, SessionCommand>> {
  const previous = session[entry.id];

  if (previous && STATUS_RANK[entry.status] < STATUS_RANK[previous.status]) {
    return session;
  }

  const next: Record<string, SessionCommand> = {
    ...session,
    [entry.id]: { ...entry, params: entry.params ?? previous?.params ?? null, reason: entry.reason ?? previous?.reason ?? null },
  };
  const ids = Object.keys(next);

  if (ids.length > SESSION_LIMIT) {
    const oldest = ids.reduce((a, b) => ((next[a]?.at ?? 0) <= (next[b]?.at ?? 0) ? a : b));
    delete next[oldest];
  }

  return next;
}

function reportShows(report: DeviceReport, change: Pick<UnreportedChange, "mode" | "modeChanged" | "targets">): boolean {
  const modeShown = !change.modeChanged || report.mode?.trim().toUpperCase() === change.mode;

  return modeShown && reportMatchesTargets(report, change.targets);
}

function reportedMode(report: DeviceReport): string | null {
  const mode = report.mode?.trim().toUpperCase() ?? "";

  return mode.length > 0 ? mode : null;
}

/** Fix 4 (B2): an abandoned value as a target with its pre-command base (closer-than-base match). */
function abandonedTarget(entry: AbandonedTarget): CommandTarget {
  return { parameter: entry.parameter, value: entry.accepted, base: entry.base };
}

/** Fix 3 (W1): an abandoned value (fix 4: or mode) the report shows is no longer at risk of being reverted. */
function withoutReportedAbandoned(state: CommandUiState): CommandUiState {
  const abandoned = state.abandoned.filter((entry) => !reportMatchesTargets(state.report, [abandonedTarget(entry)]));
  const modeShown = state.abandonedMode !== null && reportedMode(state.report) === state.abandonedMode.mode;

  return abandoned.length === state.abandoned.length && !modeShown
    ? state
    : { ...state, abandoned, abandonedMode: modeShown ? null : state.abandonedMode };
}

/**
 * Fix 4 (S2): the device accepted a full setting set the operator confirmed: it supersedes only the abandoned values
 * whose field the request carried (an unreported optional field it did not carry stays) and the abandoned mode only
 * when the request knowingly carried a mode over it.
 */
function supersededByAccepted(state: CommandUiState, active: ActiveCommand): CommandUiState {
  const request = active.request as Readonly<Record<string, unknown>>;
  const abandoned = state.abandoned.filter((entry) => {
    const mapping = Object.prototype.hasOwnProperty.call(COMMAND_PARAMETERS, entry.parameter)
      ? COMMAND_PARAMETERS[entry.parameter as ConsoleParameterId]
      : undefined;
    const carried = mapping ? request[mapping.field] : undefined;

    return typeof carried !== "number" || !Number.isFinite(carried);
  });

  return { ...state, abandoned, abandonedMode: active.supersedesMode ? null : state.abandonedMode };
}

/** Ends a confirmed / uncertain command, or lifts the unreported block, once the device reports the values. */
function finishIfReported(state: CommandUiState): CommandUiState {
  const { active, unreported } = state;
  const applied: CommandNotice = { tone: "info", message: COMMAND_STATE_COPY.applied, details: [] };

  if ((active?.phase === "confirmed" || active?.phase === "uncertain") && reportShows(state.report, active)) {
    return { ...state, active: null, notice: applied };
  }

  if (active === null && unreported !== null && reportShows(state.report, unreported)) {
    return { ...state, unreported: null, notice: applied };
  }

  return state;
}

function applyStatus(state: CommandUiState, status: VentilatorCommandStatus, reason: string | null, at: number): CommandUiState {
  const { active } = state;

  if (active === null || (active.status !== null && STATUS_RANK[status] < STATUS_RANK[active.status])) {
    return state;
  }

  if (status === "PENDING" || status === "SENT") {
    return { ...state, active: { ...active, status, phase: status === "SENT" ? "awaiting" : active.phase, phaseSince: at } };
  }

  if (status === "ACKED" || status === "APPLIED") {
    if (active.phase === "confirmed") {
      return state;
    }

    // Fix 3 (W1): the device accepted a full setting set the operator confirmed (carried values included); fix 4 (S2):
    // only the abandoned values (and mode) that set carried are superseded.
    return finishIfReported({
      ...supersededByAccepted(state, active),
      active: { ...active, status, phase: "confirmed", phaseSince: at },
      notice: { tone: "info", message: COMMAND_STATE_COPY.accepted, details: [] },
    });
  }

  return endWithOutcome(state, active, status, reason);
}

/** Ends the active command as not applied (REJECTED / TIMEOUT) with the reason on its parameters. */
function endWithOutcome(state: CommandUiState, active: ActiveCommand, status: "REJECTED" | "TIMEOUT", reason: string | null): CommandUiState {
  const reasonText = commandOutcomeReason(status, reason);
  const label = status === "REJECTED" ? "Rechazado por el equipo" : "Sin confirmación del equipo";

  return {
    ...state,
    active: null,
    warnings: warningsFor(active.targets, reasonText, state.warnings),
    notice: { tone: "warning", message: COMMAND_STATE_COPY.outcome(label, reasonText), details: [] },
  };
}

/** Blocks sending until the device reports the targets (or the operator uses the reported values). */
function blockUnreported(state: CommandUiState, active: ActiveCommand, accepted: boolean, message: string): CommandUiState {
  return {
    ...state,
    active: null,
    unreported: { mode: active.mode, modeChanged: active.modeChanged, targets: active.targets, accepted },
    notice: { tone: "warning", message, details: [] },
  };
}

function isNewCommand(active: ActiveCommand, commandId: string): boolean {
  return !active.knownIds.includes(commandId);
}

/** Fix 3 (W2): a buffered status is this send's only when it is a new command of the caller. */
function isOwnNewStatus(active: ActiveCommand, event: VentilatorCommandStatusEvent): boolean {
  return isNewCommand(active, event.commandId) && active.callerId !== null && event.userId === active.callerId;
}

/** Whether the recorded command params carry every field of the request (numbers compared without binary noise). */
function sameParams(params: Readonly<Record<string, unknown>>, request: MappedCommand["request"]): boolean {
  return Object.entries(request).every(([key, value]) => {
    const recorded = params[key];

    if (typeof value === "number") {
      return typeof recorded === "number" && Math.abs(recorded - value) <= 1e-9 * Math.max(1, Math.abs(value));
    }

    return typeof value === "string" && typeof recorded === "string" ? recorded.trim().toUpperCase() === value.toUpperCase() : recorded === value;
  });
}

/**
 * W6: while a send is uncertain its id is unknown, so its statuses are buffered in `early`. A REJECTED of a new command
 * of the caller can only be this one (one command at a time per operator): it ends the wait. Fix 3 (W2): teachers and
 * admins receive every command status, so another user's REJECTED is never taken (the history read decides).
 */
function endUncertainOnRejection(state: CommandUiState): CommandUiState {
  const { active } = state;

  if (active?.phase !== "uncertain") {
    return state;
  }

  const rejection = state.early.find((event) => event.status === "REJECTED" && isOwnNewStatus(active, event));

  return rejection ? endWithOutcome(state, active, "REJECTED", rejection.reason ?? null) : state;
}

/**
 * W6: the end of an uncertain wait consults the buffered statuses and the history read (a new command with the same
 * parameters): accepted → blocked until reported; rejected / timed out → freed with the reason; unreadable history or
 * an unresolved record → blocked (outcome unknown); no trace at all → never reached the server, freed.
 */
function resolveUncertain(state: CommandUiState, active: ActiveCommand, records: readonly LabCommandRecord[] | null): CommandUiState {
  const match = records?.find((record) => isNewCommand(active, record.id) && sameParams(record.params, active.request)) ?? null;
  const statuses = [
    ...state.early.filter((event) => isOwnNewStatus(active, event)).map((event) => event.status),
    ...(match ? [match.status] : []),
  ];

  if (statuses.some((status) => status === "ACKED" || status === "APPLIED")) {
    return blockUnreported(supersededByAccepted(state, active), active, true, COMMAND_STATE_COPY.notReported);
  }

  if (match?.status === "REJECTED") {
    return endWithOutcome(state, active, match.status, match.rejectReason);
  }

  // Fix 3: a TIMEOUT does not prove the change was not applied: blocked as unknown.
  if (match?.status === "TIMEOUT") {
    return blockUnreported(state, active, false, COMMAND_STATE_COPY.timeoutUnconfirmed(commandOutcomeReason("TIMEOUT", match.rejectReason)));
  }

  if (records === null || statuses.length > 0) {
    return blockUnreported(state, active, false, COMMAND_STATE_COPY.unconfirmed);
  }

  return {
    ...state,
    active: null,
    warnings: warningsFor(active.targets, COMMAND_STATE_COPY.notSent, state.warnings),
    notice: { tone: "warning", message: COMMAND_STATE_COPY.notRegistered, details: [] },
  };
}

export function commandReducer(state: CommandUiState, action: CommandAction): CommandUiState {
  switch (action.type) {
    case "submitted": {
      if (!canSubmitCommand(state, action.at)) {
        return state;
      }

      const { command } = action;
      // Fix 4 (B1/S2): a carried mode supersedes the abandoned one only after the acknowledged warning that named it.
      const modeCarried = carriedMode(state, command);
      const supersedesMode = modeCarried === null
        || state.carryAcknowledged === carryKey(command, carriedValues(state, command), modeCarried);

      return {
        ...state,
        early: [],
        notice: null,
        carryAcknowledged: null,
        warnings: withoutWarnings(command.targets, state.warnings),
        active: {
          localId: action.localId,
          commandId: null,
          phase: "sending",
          status: null,
          mode: command.mode,
          modeChanged: command.modeChanged,
          request: command.request,
          targets: command.targets,
          phaseSince: action.at,
          knownIds: [...new Set([...(action.knownIds ?? []), ...Object.keys(state.session)])],
          callerId: action.callerId ?? null,
          supersedesMode,
        },
      };
    }
    case "accepted": {
      const { active } = state;

      if (active?.localId !== action.localId) {
        return state;
      }

      const session = remember(state.session, { id: action.commandId, status: action.status, reason: null, params: active.request, at: action.at });
      let next: CommandUiState = { ...state, session, active: { ...active, commandId: action.commandId } };

      next = applyStatus(next, action.status, null, action.at);

      // Statuses that beat the 202: the furthest one wins.
      const early = state.early
        .filter((event) => event.commandId === action.commandId)
        .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

      early.forEach((event) => {
        next = applyStatus(next, event.status, event.reason ?? null, action.at);
      });

      return { ...next, early: [] };
    }
    case "failed": {
      const { active } = state;

      if (active?.localId !== action.localId) {
        return state;
      }

      const { description } = action;

      // W2: the request may have reached the server: stay locked until the device reports or the wait is over.
      if (description.mayHaveBeenSent) {
        return finishIfReported(endUncertainOnRejection({
          ...state,
          active: { ...active, phase: "uncertain", phaseSince: action.at },
          notice: { tone: "warning", message: description.message, details: description.violations },
        }));
      }

      return {
        ...state,
        active: null,
        warnings: warningsFor(active.targets, COMMAND_STATE_COPY.notSent, state.warnings),
        notice: { tone: "error", message: description.message, details: description.violations },
        retryAt: description.retryAfterS === null ? state.retryAt : action.at + description.retryAfterS * 1000,
      };
    }
    case "status": {
      const { event } = action;
      const session = remember(state.session, { id: event.commandId, status: event.status, reason: event.reason ?? null, params: null, at: action.at });
      const { active } = state;

      if (active !== null && active.commandId === null) {
        return endUncertainOnRejection({ ...state, session, early: [...state.early, event].slice(-EARLY_LIMIT) });
      }

      if (active === null || active.commandId !== event.commandId) {
        return { ...state, session };
      }

      return applyStatus({ ...state, session }, event.status, event.reason ?? null, action.at);
    }
    case "reported":
      return finishIfReported(withoutReportedAbandoned({ ...state, report: action.report }));
    case "tick": {
      const { active } = state;

      if (active?.phase !== "confirmed" || action.at - active.phaseSince < REPORT_WAIT_MS) {
        return state;
      }

      // W3: free the tags but keep sending blocked until the device reports the accepted values.
      return blockUnreported(state, active, true, COMMAND_STATE_COPY.notReported);
    }
    case "uncertain-expired": {
      const { active } = state;

      if (active?.localId !== action.localId || active.phase !== "uncertain") {
        return state;
      }

      return resolveUncertain(state, active, action.records);
    }
    case "use-reported": {
      // W5: the operator's way out of the block; the next command is built from the reported values as always.
      const { unreported } = state;

      if (!canUseReportedValues(state) || unreported === null) {
        return state;
      }

      // Fix 3 (W1): the accepted values are kept, so a later command cannot revert them without being told.
      const parameters = new Set(unreported.targets.map((target) => target.parameter));
      const abandoned = [
        ...state.abandoned.filter((entry) => !parameters.has(entry.parameter)),
        ...abandonedTargets(unreported),
      ];
      // Fix 4 (B1): an accepted mode change is kept too, or the next command built from the reported mode reverts it.
      const abandonedMode = unreported.modeChanged ? { mode: unreported.mode, certain: unreported.accepted } : state.abandonedMode;

      return withoutReportedAbandoned({
        ...state,
        unreported: null,
        abandoned,
        abandonedMode,
        notice: { tone: "info", message: COMMAND_STATE_COPY.usingReported, details: abandonedLines(abandoned, abandonedMode, state.report) },
      });
    }
    case "carry-warned": {
      const mode = action.mode ?? null;

      return {
        ...state,
        carryAcknowledged: action.key,
        notice: {
          tone: "warning",
          message: COMMAND_STATE_COPY.carryWarning,
          details: [
            ...(mode === null ? [] : [COMMAND_STATE_COPY.carriedModeLine(mode.certain, mode.mode, mode.sent)]),
            ...action.carried.map(carriedLine),
          ],
        },
      };
    }
    case "lost": {
      const { active } = state;

      if (active?.commandId !== action.commandId || active.phase === "confirmed" || active.phase === "uncertain") {
        return state;
      }

      return {
        ...state,
        active: null,
        warnings: warningsFor(active.targets, COMMAND_STATE_COPY.unknown, state.warnings),
        notice: { tone: "warning", message: COMMAND_STATE_COPY.lost, details: [] },
      };
    }
    case "refused":
      return { ...state, carryAcknowledged: null, notice: { tone: "error", message: action.message, details: [] } };
    case "reset": {
      // Fix 3: a console reset within the same reservation keeps the block (a release + retake must not bypass it);
      // a command still in flight becomes a block too (accepted when confirmed, unknown otherwise). Fix 4 (S1): never
      // dispatched by the hook (reducer-only semantics); a new reservation gets a fresh state there.
      const { active } = state;
      const unreported = state.unreported
        ?? (active === null ? null : { mode: active.mode, modeChanged: active.modeChanged, targets: active.targets, accepted: active.phase === "confirmed" });

      return { ...INITIAL_COMMAND_STATE, report: state.report, unreported, abandoned: state.abandoned, abandonedMode: state.abandonedMode };
    }
    default:
      return state;
  }
}

export function canSubmitCommand(state: CommandUiState, at: number): boolean {
  return state.active === null && state.unreported === null && (state.retryAt === null || at >= state.retryAt);
}

/** W5: whether «Usar los valores que informa el equipo» can lift an unreported block now (nothing in flight). */
export function canUseReportedValues(state: CommandUiState): boolean {
  return state.active === null && state.unreported !== null;
}

/** Why the console cannot send now (a command in flight, an unreported change, or the 429 wait), or null. */
export function commandBusyReason(state: CommandUiState, at: number): string | null {
  if (state.active !== null) {
    return state.active.phase === "uncertain" ? COMMAND_STATE_COPY.uncertain : COMMAND_STATE_COPY.busy;
  }

  if (state.unreported !== null) {
    return state.unreported.accepted ? COMMAND_STATE_COPY.unreported : COMMAND_STATE_COPY.unconfirmedBlocked;
  }

  if (state.retryAt !== null && at < state.retryAt) {
    return COMMAND_STATE_COPY.rateLimited(Math.ceil((state.retryAt - at) / 1000));
  }

  return null;
}

/** The console `settings.inFlight`: the active command's parameters, else the last warning per parameter. */
export function commandInFlight(state: CommandUiState): Record<string, ConsoleInFlight> {
  const inFlight: Record<string, ConsoleInFlight> = {};

  Object.entries(state.warnings).forEach(([parameter, message]) => {
    inFlight[parameter] = { status: "rejected", message };
  });

  const { active, unreported } = state;

  unreported?.targets.forEach((target) => {
    inFlight[target.parameter] = { status: "awaiting", message: unreported.accepted ? COMMAND_STATE_COPY.unreportedTag : COMMAND_STATE_COPY.unconfirmedTag };
  });

  active?.targets.forEach((target) => {
    if (active.phase === "sending") {
      inFlight[target.parameter] = { status: "sending" };
    } else if (active.phase === "awaiting") {
      inFlight[target.parameter] = { status: "awaiting" };
    } else if (active.phase === "uncertain") {
      inFlight[target.parameter] = { status: "awaiting", message: COMMAND_STATE_COPY.uncertainTag };
    } else {
      inFlight[target.parameter] = { status: "awaiting", message: COMMAND_STATE_COPY.confirmedWaiting };
    }
  });

  return inFlight;
}

function formatNumber(value: number): string {
  return String(tidy(value)).replace(".", ",");
}

/** "600 mL" in console units. */
function formatConsoleValue(parameter: string, value: number): string {
  const setting = Object.prototype.hasOwnProperty.call(PARAMETER_SETTINGS, parameter) ? PARAMETER_SETTINGS[parameter as ConsoleParameterId] : undefined;

  return setting?.unit ? `${formatNumber(value)} ${setting.unit}` : formatNumber(value);
}

function parameterLabel(parameter: string): string {
  return Object.prototype.hasOwnProperty.call(CONSOLE_PARAMETERS, parameter) ? CONSOLE_PARAMETERS[parameter as ConsoleParameterId].label : parameter;
}

/** The values of an unreported change as abandoned entries (fix 4, B2: with their pre-command base). */
function abandonedTargets(change: UnreportedChange): AbandonedTarget[] {
  return change.targets.map((target) => ({ parameter: target.parameter, accepted: target.value, base: target.base ?? null, certain: change.accepted }));
}

function abandonedLines(entries: readonly AbandonedTarget[], mode: AbandonedMode | null, report: DeviceReport): string[] {
  const modeLines = mode === null ? [] : [COMMAND_STATE_COPY.abandonedModeLine(mode.certain, mode.mode, reportedMode(report))];

  return [...modeLines, ...entries.map((entry) => {
    const reported = reportedConsoleValue(report, entry.parameter);

    return COMMAND_STATE_COPY.abandonedLine(
      parameterLabel(entry.parameter),
      entry.certain,
      formatConsoleValue(entry.parameter, entry.accepted),
      reported === null ? null : formatConsoleValue(entry.parameter, reported),
    );
  })];
}

function carriedLine(entry: CarriedValue): string {
  return COMMAND_STATE_COPY.carriedLine(
    parameterLabel(entry.parameter),
    entry.certain,
    formatConsoleValue(entry.parameter, entry.accepted),
    formatConsoleValue(entry.parameter, entry.sent),
  );
}

/**
 * Fix 3 (W1): the notice to show. While an unreported block can be lifted it names each accepted value, what the
 * device reports and what the next command would send, so «Usar los valores que informa el equipo» is an informed choice.
 */
export function commandNoticeView(state: CommandUiState): CommandNotice | null {
  const { unreported, notice } = state;

  if (state.active !== null || unreported === null) {
    return notice;
  }

  const mode = unreported.modeChanged ? { mode: unreported.mode, certain: unreported.accepted } : null;
  const base: CommandNotice = notice ?? { tone: "warning", message: commandBusyReason(state, 0) ?? COMMAND_STATE_COPY.unreported, details: [] };

  return { ...base, details: [...base.details, ...abandonedLines(abandonedTargets(unreported), mode, state.report)] };
}

/**
 * Fix 3 (W1): the values the command would carry from the report that differ from an abandoned accepted value (a
 * parameter the command changes explicitly is not carried). Compared with the backend apply tolerance.
 */
export function carriedValues(state: CommandUiState, command: MappedCommand): CarriedValue[] {
  const request = command.request as Readonly<Record<string, unknown>>;

  return state.abandoned.flatMap((entry): CarriedValue[] => {
    const mapping = Object.prototype.hasOwnProperty.call(COMMAND_PARAMETERS, entry.parameter)
      ? COMMAND_PARAMETERS[entry.parameter as ConsoleParameterId]
      : undefined;
    const raw = mapping ? request[mapping.field] : undefined;

    if (!mapping || command.targets.some((target) => target.parameter === entry.parameter) || typeof raw !== "number" || !Number.isFinite(raw)) {
      return [];
    }

    const sent: DeviceReport = { mode: null, settings: { [mapping.field]: raw } };

    return reportMatchesTargets(sent, [abandonedTarget(entry)])
      ? []
      : [{ ...entry, sent: tidy(raw / mapping.scale) }];
  });
}

/**
 * Fix 4 (B1): the reported mode a command would carry over an abandoned accepted mode, or null. A command whose mode
 * the operator picked explicitly (`modeChanged`) or that carries the abandoned mode itself is not flagged.
 */
export function carriedMode(state: CommandUiState, command: MappedCommand): CarriedMode | null {
  const { abandonedMode } = state;

  if (abandonedMode === null || command.modeChanged || command.mode === abandonedMode.mode) {
    return null;
  }

  return { ...abandonedMode, sent: command.mode };
}

/**
 * Fix 3 (W1): identity of a command and its carried values (fix 4: and carried mode); the warned command is sent only
 * when repeated as is (a report that moved in between changes the key and warns again).
 */
export function carryKey(command: MappedCommand, carried: readonly CarriedValue[], mode: CarriedMode | null = null): string {
  return JSON.stringify({
    request: command.request,
    targets: command.targets.map((target) => [target.parameter, target.value]),
    carried: carried.map((entry) => [entry.parameter, entry.accepted, entry.sent]),
    mode: mode === null ? null : [mode.mode, mode.sent],
  });
}

const NON_CONSOLE_FIELDS: readonly { field: CommandField, unit: string }[] = [
  { field: "pressureLimit", unit: "cmH2O" },
  { field: "ieRatio", unit: "" },
  { field: "flowRate", unit: "L/min" },
];

/** Command parameters in console units: "VCV · Vt 450 mL · … · FiO2 40 %". */
export function formatCommandParams(params: Readonly<Record<string, unknown>>): string {
  const parts: string[] = [];

  if (typeof params.mode === "string") {
    parts.push(params.mode);
  }

  (Object.keys(COMMAND_PARAMETERS) as ConsoleParameterId[]).forEach((parameter) => {
    const command = COMMAND_PARAMETERS[parameter];
    const value = command ? params[command.field] : undefined;

    if (command && typeof value === "number" && Number.isFinite(value)) {
      parts.push(`${CONSOLE_PARAMETERS[parameter].label} ${formatNumber(value / command.scale)} ${PARAMETER_SETTINGS[parameter].unit}`);
    }
  });

  NON_CONSOLE_FIELDS.forEach(({ field, unit }) => {
    const value = params[field];

    if (typeof value === "number" && Number.isFinite(value)) {
      parts.push(`${commandFieldName(field)} ${formatNumber(value)}${unit ? ` ${unit}` : ""}`);
    }
  });

  return parts.join(" · ");
}

export type RecentCommandItem = {
  id: string
  status: VentilatorCommandStatus
  summary: string
  reason: string | null
  /** ISO time of the history record; null for a command seen only live. */
  createdAt: string | null
  latencyMs: number | null
};

/** Live commands first (newest first), then the history read with the newer live statuses; at most `limit`. */
export function mergeRecentCommands(history: readonly LabCommandRecord[] | null, state: CommandUiState, limit: number): RecentCommandItem[] {
  const known = new Set((history ?? []).map((record) => record.id));
  const liveOnly = Object.values(state.session)
    .filter((entry) => !known.has(entry.id) && entry.params !== null)
    .sort((a, b) => b.at - a.at)
    .map((entry): RecentCommandItem => ({
      id: entry.id,
      status: entry.status,
      summary: formatCommandParams(entry.params ?? {}),
      reason: entry.reason,
      createdAt: null,
      latencyMs: null,
    }));
  const fromHistory = (history ?? []).map((record): RecentCommandItem => {
    const live = state.session[record.id];
    const upgraded = live && STATUS_RANK[live.status] > STATUS_RANK[record.status];

    return {
      id: record.id,
      status: upgraded ? live.status : record.status,
      summary: formatCommandParams(record.params),
      reason: upgraded ? live.reason : record.rejectReason,
      createdAt: record.createdAt,
      latencyMs: record.latencyMs,
    };
  });

  return [...liveOnly, ...fromHistory].slice(0, limit);
}

export { isTerminal as isTerminalCommandStatus };
