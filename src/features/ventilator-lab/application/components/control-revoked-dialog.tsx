/*
* Funcionalidad: Control revoked dialog
* Descripción: Blocking modal of the live console when the session reservation ends or is preempted (T9): the title
*   and explanation of the reason, the preemption reason as the backend sent it, who holds the ventilator now ONLY as
*   the backend projection of the re-read describes it (or that it is free), and a single "Entendido" action that the
*   page answers with a fresh read of the active reservation (pending "Comprobando…", Spanish error with the same
*   action to retry). Escape and the backdrop do not close it: the next screen is decided by the backend re-read.
*   Presentational: the copy comes from the revocation entity. Depends on MUI and the live page styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { REVOCATION_COPY } from "../entities/control-revocation.entity";
import type { RevocationModal } from "../entities/control-revocation.entity";
import styles from "../../UI/lab-live.module.css";

export type ControlRevokedDialogProps = {
  open: boolean
  modal: RevocationModal
  pending: boolean
  error: string | null
  onAcknowledge: () => void
};

export function ControlRevokedDialog({ open, modal, pending, error, onAcknowledge }: ControlRevokedDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog open={open} aria-labelledby={titleId} aria-describedby={descriptionId} disableEscapeKeyDown>
      <DialogTitle id={titleId}>{modal.title}</DialogTitle>
      <DialogContent>
        <p id={descriptionId} className={cx(styles.revokedText)}>{modal.description}</p>
        {modal.detail ? <p className={cx(styles.revokedDetail)}>{modal.detail}</p> : null}
        {modal.successor ? <p className={cx(styles.revokedDetail)} data-testid="lab-live-revoked-successor">{modal.successor}</p> : null}
        {error ? <p className={cx(styles.revokedError)} role="alert">{error}</p> : null}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" disabled={pending} onClick={onAcknowledge}>
          {pending ? REVOCATION_COPY.checking : REVOCATION_COPY.acknowledge}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
