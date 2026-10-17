/*
* Funcionalidad: Operator control bar
* Descripción: Control strip of the live console: the banner of the exclusive control ("Controlas el equipo",
*   "Opera: <name>" with the name only as the backend returned it, "Control libre", or "Comprobando…" before the first
*   read) and the actions the backend allows: "Tomar control" when the control is free and the caller may take it,
*   "Quitar control" only when the backend says canTakeover (leader of the holder group, teacher or admin), behind a
*   confirmation dialog (going back sends nothing), and "Liberar control" for the operator. Buttons are disabled while
*   a request runs; a refused request shows its Spanish message (role alert). Presentational: the state and the
*   requests come from useOperatorControl. v1.1: the takeover confirmation closes by itself when the backend state no
*   longer allows a takeover (T7 review fix S3); the non-blocking control loss notice (T9: taken over / presence
*   timeout / released by staff / lost), with the new operator's name only as the backend returned it, the read-only
*   line, the hint to take the control again only when the backend allows it, and a dismiss button. Depends on MUI,
*   the design-system confirm dialog, the control and revocation entities and the live page styles.
* Versión: 1.1
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
import { controlLossNotice, REVOCATION_COPY } from "../entities/control-revocation.entity";
import { CONTROL_COPY, controlActions, controlBanner } from "../entities/operator-control.entity";
import type { ControlView } from "../entities/operator-control.entity";
import styles from "../../UI/lab-live.module.css";

export type OperatorControlBarProps = {
  view: ControlView
  /** Operator name as the backend returned it, or null. */
  operatorName: string | null
  onTake: () => Promise<void>
  onTakeover: () => Promise<void>
  onRelease: () => Promise<void>
  onDismissLoss: () => void
};

export function OperatorControlBar({ view, operatorName, onTake, onTakeover, onRelease, onDismissLoss }: OperatorControlBarProps) {
  const [confirming, setConfirming] = useState(false);
  const banner = controlBanner(view.state, operatorName);
  const actions = controlActions(view.state);
  const busy = view.pending !== null;
  const { loss } = view;
  // The name belongs to the current operator: use it only when the loss names that same person.
  const notice = loss ? controlLossNotice(loss, loss.operatorUserId !== null && loss.operatorUserId === view.state?.operatorUserId ? operatorName : null) : null;

  // S3: nobody to take the control from any more (released, or the state changed): close the confirmation.
  if (confirming && !actions.takeover && view.pending !== "takeover") {
    setConfirming(false);
  }

  const confirmTakeover = async() => {
    await onTakeover();
    setConfirming(false);
  };

  return (
    <div className={cx(styles.controlBar)} data-control={banner.kind}>
      <p className={cx(styles.controlBanner)} role="status" data-testid="lab-live-control-banner">{banner.text}</p>
      <div className={cx(styles.controlActions)}>
        {actions.take ? (
          <Button variant="contained" size="small" disabled={busy} onClick={() => void onTake()}>{CONTROL_COPY.take}</Button>
        ) : null}
        {actions.takeover ? (
          <Button variant="outlined" color="warning" size="small" disabled={busy} onClick={() => setConfirming(true)}>
            {CONTROL_COPY.takeover}
          </Button>
        ) : null}
        {actions.release ? (
          <Button variant="outlined" size="small" disabled={busy} onClick={() => void onRelease()}>{CONTROL_COPY.release}</Button>
        ) : null}
      </div>
      {notice ? (
        <div className={cx(styles.lossNotice)} role="status" data-testid="lab-live-control-loss">
          <p className={cx(styles.lossText)}>{notice.text}</p>
          <p className={cx(styles.lossHint)}>{notice.readOnly}</p>
          {actions.take ? <p className={cx(styles.lossHint)}>{REVOCATION_COPY.loss.retake}</p> : null}
          <Button size="small" onClick={onDismissLoss}>{REVOCATION_COPY.loss.dismiss}</Button>
        </div>
      ) : null}
      {view.error ? <p className={cx(styles.banner)} data-tone="error" role="alert">{view.error}</p> : null}
      <ConfirmDialog
        open={confirming}
        title={CONTROL_COPY.takeoverTitle}
        description={CONTROL_COPY.takeoverDescription(operatorName ?? "La persona que opera")}
        confirmLabel={CONTROL_COPY.takeoverConfirm}
        cancelLabel={CONTROL_COPY.back}
        destructive
        isPending={view.pending === "takeover"}
        onConfirm={() => void confirmTakeover()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
