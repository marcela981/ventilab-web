/*
* Funcionalidad: ConfirmDialog
* Descripción: Confirmation dialog for destructive or irreversible actions (MUI Dialog): title, optional description, confirm/cancel labels, error color when destructive and a pending state that disables both actions and shows a spinner. Closing through the backdrop or Escape is ignored while pending. Depends on MUI Dialog components and Button.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useId } from "react";
import type { ReactNode } from "react";

export type ConfirmDialogProps = {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const pendingIcon = isPending ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : null;
  const describedBy = description ? { "aria-describedby": descriptionId } : {};

  const handleClose = () => {
    if (!isPending) {
      onCancel();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby={titleId}
      {...describedBy}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {description ? (
        <DialogContent>
          <DialogContentText id={descriptionId}>{description}</DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions>
        <Button onClick={onCancel} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={destructive ? "error" : "primary"}
          onClick={onConfirm}
          disabled={isPending}
          startIcon={pendingIcon}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
