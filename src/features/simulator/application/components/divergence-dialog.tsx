/*
* Funcionalidad: Session divergence dialog
* Descripción: Blocking dialog shown when the server refused an event of the running session: the local simulation no
*   longer matches the server replay (the source of the official score), so the student cannot keep working on it.
*   It cannot be dismissed (no close, Escape or backdrop) and offers only "Recargar sesión", which rebuilds the
*   session from the server replay. Depends on MUI.
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
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useId } from "react";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const DIVERGENCE_COPY = {
  title: "La sesión local y la del servidor divergieron",
  description: "El servidor rechazó un cambio de esta sesión, así que lo que ves ya no coincide con lo que se evaluará. Recarga la sesión para continuar desde el estado guardado en el servidor.",
  reload: "Recargar sesión",
} as const;

export type DivergenceDialogProps = {
  open: boolean
  /** Server detail of the refusal, shown under the explanation. */
  detail?: string | null | undefined
  onReload: () => void
};

export function DivergenceDialog({ open, detail, onReload }: DivergenceDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{ paper: { role: "alertdialog" } }}
    >
      <DialogTitle id={titleId}>{DIVERGENCE_COPY.title}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId}>{DIVERGENCE_COPY.description}</DialogContentText>
        {detail ? <DialogContentText>{detail}</DialogContentText> : null}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onReload} autoFocus>{DIVERGENCE_COPY.reload}</Button>
      </DialogActions>
    </Dialog>
  );
}
