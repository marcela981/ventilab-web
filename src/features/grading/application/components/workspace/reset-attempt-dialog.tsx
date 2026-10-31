/*
* Funcionalidad: ResetAttemptDialog
* Descripción: Confirmation dialog of "Reiniciar intento" in the unified grading screen (DISENO_BLOQUE3 §2.9): explains that nothing is deleted and the student gets one more attempt and a notification, asks for the mandatory reason (1–500 characters, with a counter; it is audited) and posts it through useResetAttempt. Handles both conflicts of the backend: 409 evaluation.attempt_in_progress (the student is answering) and 409 evaluation.assignment_not_active, which shows the window of the assignment and a link to the builder section where it can be extended. Closes and reports success to the screen. Depends on React, MUI, the design-system async button, @shared/lib, the evaluation attempts entities, useResetAttempt and the grading CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useId, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { formatDateRange } from "@shared/lib/format";
import { buildAssignmentSectionUrl, RESET_REASON_MAX } from "../../entities/evaluation-attempts.entity";
import type { EvaluationAttemptRow } from "../../entities/evaluation-attempts.entity";
import { studentLabel } from "../../entities/grading.entity";
import type { AssignmentWindow } from "../../hooks/use-reset-attempt";
import { isValidResetReason, useResetAttempt } from "../../hooks/use-reset-attempt";
import styles from "../../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const RESET_COPY = {
  title: "Reiniciar intento",
  description: (student: string) =>
    `${student} podrá presentar la evaluación una vez más. No se borra nada: el intento, su nota y su retroalimentación se conservan, y el estudiante recibe una notificación.`,
  reason: "Motivo (obligatorio)",
  reasonHelp: (length: number) => `${length}/${RESET_REASON_MAX}. Queda registrado en la auditoría.`,
  reasonRequired: "Escribe el motivo del reinicio.",
  extend: "Extender la ventana en el constructor",
  window: (range: string) => `Ventana de la asignación: ${range}.`,
  cancel: "Cancelar",
  confirm: "Reiniciar",
} as const;

export type ResetAttemptDialogProps = {
  evaluationId: string
  row: EvaluationAttemptRow
  onClose: () => void
  onDone: (row: EvaluationAttemptRow) => void
};

export function ResetAttemptDialog({ evaluationId, row, onClose, onDone }: ResetAttemptDialogProps) {
  const { pending, reset } = useResetAttempt();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string, window: AssignmentWindow | null, notActive: boolean } | null>(null);
  const titleId = useId();
  const student = studentLabel({ name: row.studentName, email: row.studentEmail });

  const submit = async() => {
    if (!isValidResetReason(reason)) {
      setReasonError(RESET_COPY.reasonRequired);

      return;
    }

    setReasonError(null);
    setFailure(null);

    const outcome = await reset(row.studentId, evaluationId, reason);

    if (outcome.status === "success") {
      onDone(row);
    } else if (outcome.status === "not-active") {
      setFailure({ message: outcome.message, window: outcome.window, notActive: true });
    } else if (outcome.status === "in-progress" || outcome.status === "error") {
      setFailure({ message: outcome.message, window: null, notActive: false });
    }
  };

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={pending ? undefined : onClose} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{RESET_COPY.title}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          <p className={cx(styles.subtitle)}>{RESET_COPY.description(student)}</p>
          <TextField
            label={RESET_COPY.reason}
            value={reason}
            required
            multiline
            minRows={3}
            error={reasonError !== null}
            helperText={reasonError ?? RESET_COPY.reasonHelp(reason.length)}
            onChange={(event) => setReason(event.target.value)}
            slotProps={{ htmlInput: { maxLength: RESET_REASON_MAX } }}
          />
          {failure ? (
            <Alert severity="warning">
              <p className={cx(styles.alertText)}>{failure.message}</p>
              {failure.window?.startsAt ? (
                <p className={cx(styles.alertText)}>{RESET_COPY.window(formatDateRange(failure.window.startsAt, failure.window.endsAt))}</p>
              ) : null}
              {failure.notActive ? <Link href={buildAssignmentSectionUrl(evaluationId)}>{RESET_COPY.extend}</Link> : null}
            </Alert>
          ) : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onClose}>{RESET_COPY.cancel}</Button>
        <AsyncButton variant="contained" color="warning" loading={pending} disabled={pending} onClick={submit}>
          {RESET_COPY.confirm}
        </AsyncButton>
      </DialogActions>
    </Dialog>
  );
}
