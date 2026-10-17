/*
* Funcionalidad: Recording control and REC indicator
* Descripción: RecordingControl is the "Grabar sesión" toggle of /lab/live (rendered by the page only when the caller
*   may record the session reservation): start, "Detener grabación" behind a confirmation dialog, the in-flight labels,
*   the Spanish error with a dismiss button and a hint that the recording stops by itself at the end of the reservation
*   and that the REC indicator is local to this tab. RecIndicator is the REC mark of the console header while THIS tab
*   recorded the session (the backend gives no shared recording signal, so nobody else sees it: gap). Depends on MUI,
*   the design-system confirm dialog, the session recording entity and hook type, and the live page styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { RECORDING_COPY } from "../entities/session-recording.entity";
import type { RecordingPhase } from "../entities/session-recording.entity";
import type { SessionRecording } from "../hooks/use-session-recording";
import styles from "../../UI/lab-live.module.css";

const BUTTON_LABELS: Readonly<Record<RecordingPhase, string>> = {
  idle: RECORDING_COPY.start,
  starting: RECORDING_COPY.starting,
  recording: RECORDING_COPY.stop,
  stopping: RECORDING_COPY.stopping,
};

export function RecordingControl({ recording }: { recording: SessionRecording }) {
  const [confirming, setConfirming] = useState(false);
  const { phase, error } = recording.state;
  const recordingNow = phase === "recording" || phase === "stopping";

  // The recording is no longer running (stopped, or the state was reset): nothing to confirm.
  if (confirming && !recordingNow) {
    setConfirming(false);
  }

  const confirmStop = async() => {
    await recording.stop();
    setConfirming(false);
  };

  return (
    <div className={cx(styles.recordingBar)} data-testid="lab-live-recording">
      <Button
        variant={recordingNow ? "outlined" : "contained"}
        color={recordingNow ? "error" : "primary"}
        size="small"
        disabled={phase === "starting" || phase === "stopping"}
        onClick={() => (phase === "recording" ? setConfirming(true) : void recording.start())}
      >
        {BUTTON_LABELS[phase]}
      </Button>
      <p className={cx(styles.recordingHint)}>{RECORDING_COPY.hint}</p>
      {error ? (
        <div className={cx(styles.banner)} data-tone="error" role="alert">
          <span>{error}</span>
          <Button size="small" onClick={recording.dismissError}>{RECORDING_COPY.dismiss}</Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={RECORDING_COPY.stopTitle}
        description={RECORDING_COPY.stopDescription}
        confirmLabel={RECORDING_COPY.stopConfirm}
        cancelLabel={RECORDING_COPY.stopCancel}
        destructive
        isPending={phase === "stopping"}
        onConfirm={() => void confirmStop()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

export function RecIndicator({ phase }: { phase: RecordingPhase }) {
  if (phase !== "recording" && phase !== "stopping") {
    return null;
  }

  return (
    <span className={cx(styles.rec)} role="status" aria-label={RECORDING_COPY.recLabel} data-testid="lab-live-rec">
      <span className={cx(styles.recDot)} aria-hidden="true" />
      {RECORDING_COPY.rec}
    </span>
  );
}
