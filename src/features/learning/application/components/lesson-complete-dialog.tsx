/*
* Funcionalidad: LessonCompleteDialog
* Descripción: "¡Lección Completada!" dialog of the lesson viewer (W5, Bloque 2), with the July texts (LessonViewer.jsx): "Has completado exitosamente esta lección. ¡Felicidades!", "Cerrar" and "Continuar a la Siguiente Lección" (only when there is a next lesson with Pages). No automatic navigation: the student chooses. Accessible MUI Dialog: labelled and described, focus moves to the primary action on open, stays trapped inside, Esc or "Cerrar" close it and focus returns to the element that had it. Loaded as a lazy chunk by the viewer (not in its initial bundle). Depends on MUI Dialog and Button.
* Versión: 0.1
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
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useId } from "react";

// TODO(i18n): move to a learning namespace in src/i18n.
export const LESSON_COMPLETE_COPY = {
  title: "¡Lección Completada!",
  body: "Has completado exitosamente esta lección. ¡Felicidades!",
  close: "Cerrar",
  next: "Continuar a la Siguiente Lección",
} as const;

export type LessonCompleteDialogProps = {
  open: boolean
  // null when the lesson is the last one with Pages of the module.
  onContinue: (() => void) | null
  onClose: () => void
};

export function LessonCompleteDialog({ open, onContinue, onClose }: LessonCompleteDialogProps) {
  const titleId = useId();
  const bodyId = useId();

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} aria-describedby={bodyId}>
      <DialogTitle id={titleId}>{LESSON_COMPLETE_COPY.title}</DialogTitle>
      <DialogContent>
        <DialogContentText id={bodyId}>{LESSON_COMPLETE_COPY.body}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus={onContinue === null}>{LESSON_COMPLETE_COPY.close}</Button>
        {onContinue ? (
          <Button variant="contained" onClick={onContinue} autoFocus>
            {LESSON_COMPLETE_COPY.next}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
