/*
* Funcionalidad: useSessionRecording
* Descripción: The "Grabar sesión" toggle of one /lab/live session: start / stop of the telemetry recording of the
*   active reservation (telemetry recording service) driving the pure session recording state machine. A synchronous
*   ref guard sends ONE request per click burst. The state is LOCAL to this tab (the backend exposes no recording state
*   or event): it starts idle, is lost on reload, and does not follow a start/stop made elsewhere (gap). While not
*   `enabled` (the session reservation ended: the backend stops the recording by itself) the state reads as idle and
*   nothing is sent. Errors become Spanish copy (409 / 403 / 404 / connection). Depends on React, the recording service
*   and the session recording entity. v1.1 (T10 review fix): S8 a 409 on stop goes idle (the backend recorder stopped
*   with the reservation). S9 when `enabled` turns false while this tab was recording, `note` explains it instead of
*   REC silently disappearing (the backend recording may continue until the reservation ends).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useLayoutEffect, useReducer, useRef } from "react";
import { startTelemetryRecording, stopTelemetryRecording } from "../../api/services/telemetry-recording.service";
import {
  INITIAL_RECORDING_STATE,
  RECORDING_COPY,
  recordingErrorMessage,
  recordingReducer,
  recordingStopEnded,
} from "../entities/session-recording.entity";
import type { RecordingState } from "../entities/session-recording.entity";

export type UseSessionRecordingOptions = {
  /** The caller may record the session reservation now (recordingAllowed). */
  enabled: boolean
};

export type SessionRecording = {
  state: RecordingState
  /** S9: note while this tab had started a recording that it may no longer control (else null). */
  note: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
  dismissError: () => void
};

export function useSessionRecording({ enabled }: UseSessionRecordingOptions): SessionRecording {
  const [state, dispatch] = useReducer(recordingReducer, INITIAL_RECORDING_STATE);
  const pendingRef = useRef(false);
  const phaseRef = useRef(state.phase);

  useLayoutEffect(() => {
    phaseRef.current = state.phase;
  });

  const start = useCallback(async() => {
    if (!enabled || pendingRef.current || phaseRef.current !== "idle") {
      return;
    }

    pendingRef.current = true;
    dispatch({ type: "start-requested" });

    try {
      await startTelemetryRecording();
      dispatch({ type: "started", at: Date.now() });
    } catch (error) {
      dispatch({ type: "start-failed", error: recordingErrorMessage(error, "start") });
    } finally {
      pendingRef.current = false;
    }
  }, [enabled]);

  const stop = useCallback(async() => {
    if (!enabled || pendingRef.current || phaseRef.current !== "recording") {
      return;
    }

    pendingRef.current = true;
    dispatch({ type: "stop-requested" });

    try {
      await stopTelemetryRecording();
      dispatch({ type: "stopped" });
    } catch (error) {
      dispatch(recordingStopEnded(error) ? { type: "stop-ended" } : { type: "stop-failed", error: recordingErrorMessage(error, "stop") });
    } finally {
      pendingRef.current = false;
    }
  }, [enabled]);

  const dismissError = useCallback(() => dispatch({ type: "dismiss-error" }), []);
  // S9: REC is no longer shown, but this tab started a recording the backend may still be running.
  const orphaned = !enabled && (state.phase === "recording" || state.phase === "stopping");

  return { state: enabled ? state : INITIAL_RECORDING_STATE, note: orphaned ? RECORDING_COPY.noLongerAllowed : null, start, stop, dismissError };
}
