/*
* Funcionalidad: useVentilatorCommands
* Descripción: Commands of the live console for the active reservation. Builds the control limits (engine limits ∩
*   backend safety maxima of the lab settings), the editable parameters per mode and the mode options (command mapper);
*   keeps the latest device report (settings + mode of the telemetry frames) outside React; on CONFIRMAR, only while
*   `canSend` (the operator, live, socket up), maps the confirmation to the backend request (a refusal is shown, nothing
*   is sent), runs the pure command state machine (one command at a time: the guard is checked synchronously against a
*   ref, so a double click or two confirmations before a render send ONE request) and POSTs it; the 202 and every
*   `ventilator:command-status` of this reservation drive the per-parameter in-flight state. A command that stays
*   PENDING/SENT longer than commands.ackTimeoutMs + COMMAND_STATUS_GRACE_MS (status event missed, e.g. socket down) is
*   looked up once in GET /api/ventilator/commands?ids= and otherwise marked unknown. A confirmed change waits for the
*   telemetry report (state machine). Errors and refusals become a notice with Spanish copy; a 429 blocks sending until
*   its Retry-After (countdown re-rendered every second). "Comandos recientes" merges GET /api/ventilator/commands
*   (newest 10, revalidated after each terminal status or an uncertain send) with the live statuses. A new reservation
*   resets everything. Never sends anything by itself (no retry: there is no idempotency key). v1.1 (T7 review fix
*   S5): a `not_operator` refusal re-reads the control state (GET /api/ventilator/control), so the page stops showing
*   the caller as the operator. v1.2 (T8 review fix W2): the watchdog covers a command with an id still PENDING or SENT
*   and, while the lookup finds it non-terminal (or fails), looks it up again with a bounded backoff
*   (COMMAND_LOOKUP_BACKOFF_*) for COMMAND_LOOKUP_WINDOW_MS before declaring it lost, so a SENT status found at the
*   first lookup no longer frees the console; a request that may have been sent (no id) stays locked (state phase
*   `uncertain`) until the device reports it or ackTimeout + grace + REPORT_WAIT_MS have passed. The backend ignores the
*   `ids` filter (gap): the lookup finds the command among the 10 newest. Depends on React, SWR, the api-client query
*   hook and error, the shared realtime events, the commands and control services and the command entities. v1.3 (T8
*   review fix 2): W6 a submit passes the ids of the history read as `knownIds`, and the end of an uncertain wait reads
*   GET /api/ventilator/commands again and hands the records (or null when the read fails) to the state machine. W5
*   `canUseReported` / `onUseReported` («Usar los valores que informa el equipo») lift the unreported block. v1.4 (T8
*   review fix 3): W2 a submit passes the session user id (`callerId`), so only the caller's own early statuses resolve
*   an uncertain send (teachers and admins receive every command status). W1 the returned notice is
*   `commandNoticeView` (it names each accepted value the device does not report and what the next command would send);
*   a confirmation whose command would carry a value different from an accepted value abandoned with «Usar los valores
*   que informa el equipo» is NOT sent the first time: the notice lists those values, and only the identical change
*   confirmed again (same request, same carried values) is sent. Depends also on the session. v1.5 (T8 review fix 4):
*   B1 the same warning / identical-repeat flow applies when the command would carry the reported mode over an
*   accepted mode change abandoned with «Usar los valores que informa el equipo» (`carriedMode`, part of the key); a
*   report that moves between the warning and the repeat changes the key and warns again. S1 the hook never dispatches
*   the reducer `reset`: the state stays while `canSend` toggles, and a new reservation reads a fresh state.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { toApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries, useApiQuery } from "@shared/api-client/use-api-query";
import { useSocketEvent } from "@shared/realtime";
import { useSession } from "@shared/session/use-session";
import type {
  ConsoleConfirmation,
  ConsoleInFlight,
  ConsoleLimits,
  ConsoleModeOption,
  ModeParameterTable,
} from "@shared/ventilator-console";
import {
  fetchVentilatorCommands,
  RECENT_COMMANDS_LIMIT,
  sendVentilatorCommand,
  toLabCommandRecord,
  VENTILATOR_COMMANDS_PATH,
} from "../../api/services/ventilator-commands.service";
import { VENTILATOR_CONTROL_PATH } from "../../api/services/ventilator-control.service";
import {
  buildCommandLimits,
  COMMAND_APPLICABILITY,
  commandModeOptions,
  commandRefusalMessage,
  mapConfirmationToCommand,
  reduceDeviceReport,
} from "../entities/command-mapper";
import { describeSendCommandError, SEND_COMMAND_ERROR_CODES } from "../entities/command-messages";
import {
  canSubmitCommand,
  canUseReportedValues,
  carriedMode,
  carriedValues,
  carryKey,
  commandBusyReason,
  commandInFlight,
  commandNoticeView,
  commandReducer,
  INITIAL_COMMAND_STATE,
  isTerminalCommandStatus,
  mergeRecentCommands,
  REPORT_WAIT_MS,
} from "../entities/command-state";
import type { CommandAction, CommandNotice, CommandUiState, LabCommandRecord, RecentCommandItem } from "../entities/command-state";
import type { LabSettings } from "../entities/lab-settings.entity";

/** Margin over commands.ackTimeoutMs before a command without a terminal status is looked up. */
export const COMMAND_STATUS_GRACE_MS = 2000;
/** How long after the first lookup a non-terminal command keeps being looked up before it is declared lost. */
export const COMMAND_LOOKUP_WINDOW_MS = 30_000;
export const COMMAND_LOOKUP_BACKOFF_BASE_MS = 1000;
export const COMMAND_LOOKUP_BACKOFF_MAX_MS = 8000;
const TICK_MS = 1000;

type KeyedState = { reservationId: string, ui: CommandUiState };

export type UseVentilatorCommandsOptions = {
  reservationId: string
  /** The caller is the operator and the console is live (decided by the page). */
  canSend: boolean
  settings: LabSettings
};

export type VentilatorCommands = {
  limits: ConsoleLimits
  applicability: ModeParameterTable
  modeOptionsFor: (reportedMode: string | null) => readonly ConsoleModeOption[]
  inFlight: Readonly<Record<string, ConsoleInFlight>>
  /** Why no command can be sent now (one in flight, 429 wait), or null. */
  busyReason: string | null
  onConfirm: (confirmation: ConsoleConfirmation) => void
  /** W5: an unreported block can be lifted now with «Usar los valores que informa el equipo». */
  canUseReported: boolean
  onUseReported: () => void
  notice: CommandNotice | null
  recent: readonly RecentCommandItem[]
  recentLoading: boolean
  recentFailed: boolean
};

export function useVentilatorCommands({ reservationId, canSend, settings }: UseVentilatorCommandsOptions): VentilatorCommands {
  // The state belongs to one reservation: a new reservation reads (and then writes) a fresh state.
  const [keyed, setKeyed] = useState<KeyedState>(() => ({ reservationId, ui: INITIAL_COMMAND_STATE }));
  const keyedRef = useRef<KeyedState>(keyed);
  const reservationRef = useRef(reservationId);
  const state = keyed.reservationId === reservationId ? keyed.ui : INITIAL_COMMAND_STATE;
  const localIdRef = useRef(0);

  useLayoutEffect(() => {
    reservationRef.current = reservationId;
  });
  const [now, setNow] = useState(() => Date.now());
  const { user } = useSession();
  const callerId = user?.id ?? null;
  const { mutate: swrMutate } = useSWRConfig();
  const limits = useMemo(() => buildCommandLimits(settings), [settings]);
  const history = useApiQuery(VENTILATOR_COMMANDS_PATH, {
    query: { reservationId, limit: RECENT_COMMANDS_LIMIT, sortOrder: "desc" },
  });
  const { mutate: revalidateHistory } = history;
  const records = useMemo(() => (history.data ? history.data.data.map(toLabCommandRecord) : null), [history.data]);
  const recordsRef = useRef<readonly LabCommandRecord[] | null>(records);

  useLayoutEffect(() => {
    recordsRef.current = records;
  });

  /** The latest state of the current reservation (a stale reservation's state reads as the initial one). */
  const latest = useCallback((): CommandUiState => (
    keyedRef.current.reservationId === reservationRef.current ? keyedRef.current.ui : INITIAL_COMMAND_STATE
  ), []);

  const store = useCallback((ui: CommandUiState, render: boolean) => {
    keyedRef.current = { reservationId: reservationRef.current, ui };

    if (render) {
      setKeyed(keyedRef.current);
      // The countdown of a 429 wait starts from the time of this change, not from the last tick.
      setNow(Date.now());
    }
  }, []);

  const dispatch = useCallback((action: CommandAction) => {
    const previous = latest();
    const next = commandReducer(previous, action);

    if (next !== previous) {
      store(next, true);
    }
  }, [latest, store]);

  useSocketEvent("ventilator:telemetry", (batch) => {
    const previous = latest();
    const report = reduceDeviceReport(previous.report, batch.frames);

    if (report === previous.report) {
      return;
    }

    const next = commandReducer(previous, { type: "reported", report, at: Date.now() });

    // Render only when the report ends a confirmed command (no render per batch).
    store(next, next.active !== previous.active || next.notice !== previous.notice);
  });

  useSocketEvent("ventilator:command-status", (event) => {
    if (event.reservationId !== reservationId) {
      return;
    }

    dispatch({ type: "status", event, at: Date.now() });

    if (isTerminalCommandStatus(event.status)) {
      void revalidateHistory();
    }
  });

  const { active, retryAt } = state;
  const confirmedSince = active?.phase === "confirmed" ? active.phaseSince : null;
  const waitingRetry = retryAt !== null && retryAt > now;

  // One tick per second while a confirmed change waits for the report or a 429 wait counts down.
  useEffect(() => {
    if (confirmedSince === null && !waitingRetry) {
      return undefined;
    }

    const timer = setInterval(() => {
      const at = Date.now();

      setNow(at);
      dispatch({ type: "tick", at });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [confirmedSince, waitingRetry, dispatch]);

  // Status watchdog: a command with an id still PENDING/SENT after the backend timeout + a margin is looked up, again
  // with a bounded backoff while it is not terminal (or the read fails), and declared lost only after the window.
  const watchId = active !== null && active.commandId !== null && (active.phase === "sending" || active.phase === "awaiting")
    ? active.commandId
    : null;
  const ackTimeoutMs = settings["commands.ackTimeoutMs"];

  useEffect(() => {
    if (watchId === null) {
      return undefined;
    }

    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + ackTimeoutMs + COMMAND_STATUS_GRACE_MS + COMMAND_LOOKUP_WINDOW_MS;

    const retryOrGiveUp = () => {
      if (Date.now() >= deadline) {
        dispatch({ type: "lost", commandId: watchId, at: Date.now() });
        void revalidateHistory();

        return;
      }

      const wait = Math.min(COMMAND_LOOKUP_BACKOFF_MAX_MS, COMMAND_LOOKUP_BACKOFF_BASE_MS * 2 ** attempt);

      attempt += 1;
      timer = setTimeout(lookup, wait);
    };

    function lookup() {
      // The backend ignores `ids` (gap): the answer is the 10 newest commands of the reservation.
      fetchVentilatorCommands(reservationId, [watchId as string]).then(
        (records) => {
          if (cancelled) {
            return;
          }

          const record = records.find((item) => item.id === watchId);

          if (record && isTerminalCommandStatus(record.status)) {
            dispatch({
              type: "status",
              event: { commandId: record.id, reservationId, userId: "", status: record.status, ...(record.rejectReason ? { reason: record.rejectReason } : {}) },
              at: Date.now(),
            });
            void revalidateHistory();
          } else {
            retryOrGiveUp();
          }
        },
        () => {
          if (!cancelled) {
            retryOrGiveUp();
          }
        },
      );
    }

    timer = setTimeout(lookup, ackTimeoutMs + COMMAND_STATUS_GRACE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [watchId, ackTimeoutMs, reservationId, dispatch, revalidateHistory]);

  // A request that may have been sent (no id) stays locked until the device reports it or the backend has certainly
  // resolved it (ack timeout + margin) and the device had the report wait to show it.
  const uncertainLocalId = active?.phase === "uncertain" ? active.localId : null;

  useEffect(() => {
    if (uncertainLocalId === null) {
      return undefined;
    }

    let cancelled = false;
    // W6: the end of the wait reads the history again; the reducer looks for a new command with the same parameters.
    const timer = setTimeout(() => {
      fetchVentilatorCommands(reservationId).then(
        (records) => records,
        () => null,
      ).then((records) => {
        if (!cancelled) {
          dispatch({ type: "uncertain-expired", localId: uncertainLocalId, records, at: Date.now() });
          void revalidateHistory();
        }
      });
    }, ackTimeoutMs + COMMAND_STATUS_GRACE_MS + REPORT_WAIT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [uncertainLocalId, ackTimeoutMs, reservationId, dispatch, revalidateHistory]);

  const onConfirm = useCallback((confirmation: ConsoleConfirmation) => {
    const at = Date.now();

    if (!canSend || !canSubmitCommand(latest(), at)) {
      return;
    }

    const mapping = mapConfirmationToCommand(confirmation, latest().report, { limits, settings });

    if (!mapping.ok) {
      dispatch({ type: "refused", message: commandRefusalMessage(mapping.refusal) });

      return;
    }

    // Fix 3 (W1): a value that would silently replace an accepted one is listed; only an identical repeat sends it.
    // Fix 4 (B1): the same for the reported mode over an accepted mode change.
    const current = latest();
    const carried = carriedValues(current, mapping.command);
    const mode = carriedMode(current, mapping.command);

    if (carried.length > 0 || mode !== null) {
      const key = carryKey(mapping.command, carried, mode);

      if (current.carryAcknowledged !== key) {
        dispatch({ type: "carry-warned", key, carried, mode });

        return;
      }
    }

    localIdRef.current += 1;
    const localId = `${reservationId}:${localIdRef.current}`;

    // W6: the commands known now are never taken as evidence of this one; W2 (fix 3): only the caller's statuses count.
    dispatch({ type: "submitted", localId, command: mapping.command, at, knownIds: (recordsRef.current ?? []).map((record) => record.id), callerId });

    sendVentilatorCommand(mapping.command.request).then(
      (sent) => {
        dispatch({ type: "accepted", localId, commandId: sent.commandId, status: sent.status, at: Date.now() });
        void revalidateHistory();
      },
      (error: unknown) => {
        const description = describeSendCommandError(error);

        dispatch({ type: "failed", localId, description, at: Date.now() });

        // The backend says the caller no longer operates: the control state shown is stale.
        if (toApiError(error).code === SEND_COMMAND_ERROR_CODES.notOperator) {
          void invalidateApiQueries(swrMutate, [VENTILATOR_CONTROL_PATH]).catch(() => undefined);
        }

        if (description.mayHaveBeenSent) {
          void revalidateHistory();
        }
      },
    );
  }, [canSend, limits, settings, reservationId, callerId, latest, dispatch, revalidateHistory, swrMutate]);

  // W5: «Usar los valores que informa el equipo» lifts the unreported block (only while the caller may send).
  const onUseReported = useCallback(() => {
    if (canSend) {
      dispatch({ type: "use-reported" });
    }
  }, [canSend, dispatch]);

  const inFlight = useMemo(() => commandInFlight(state), [state]);
  const notice = useMemo(() => commandNoticeView(state), [state]);
  const recent = useMemo(() => mergeRecentCommands(records, state, RECENT_COMMANDS_LIMIT), [records, state]);

  return {
    limits,
    applicability: COMMAND_APPLICABILITY,
    modeOptionsFor: commandModeOptions,
    inFlight,
    busyReason: commandBusyReason(state, now),
    onConfirm,
    canUseReported: canSend && canUseReportedValues(state),
    onUseReported,
    notice,
    recent,
    recentLoading: !history.data && history.isLoading,
    recentFailed: !history.data && Boolean(history.error),
  };
}
