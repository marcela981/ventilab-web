/*
* Funcionalidad: FeedbackToast
* Descripción: Snackbar with the result of a group mutation: success messages as a status (closes after 6 s), error messages as an alert that stays until the user closes it. The design system has no Toast yet, so the groups feature owns this small wrapper over MUI Snackbar + Alert. Depends on MUI.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useState } from "react";

export type Feedback = {
  severity: "success" | "error"
  message: string
};

export type FeedbackToastProps = {
  feedback: Feedback | null
  onClose: () => void
};

const SUCCESS_HIDE_MS = 6000;

export function FeedbackToast({ feedback, onClose }: FeedbackToastProps) {
  // The last message stays rendered while the snackbar closes (derived state, updated during render).
  const [last, setLast] = useState<Feedback | null>(feedback);

  if (feedback && feedback !== last) {
    setLast(feedback);
  }

  const shown = feedback ?? last;
  const isError = shown?.severity === "error";

  return (
    <Snackbar
      open={feedback !== null}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") {
          onClose();
        }
      }}
      autoHideDuration={isError ? null : SUCCESS_HIDE_MS}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity={shown?.severity ?? "success"} role={isError ? "alert" : "status"} onClose={onClose} variant="filled">
        {shown?.message}
      </Alert>
    </Snackbar>
  );
}
