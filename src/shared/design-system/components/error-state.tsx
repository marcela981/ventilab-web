/*
* Funcionalidad: ErrorState
* Descripción: Error view with role="alert" (MUI Alert), a Spanish default title/description and an optional retry button. Used by pages for failed queries and by RouteErrorBoundary. UI copy is plain Spanish because the i18next setup (src/i18n) is outside the new-code modules; TODO(i18n): move the defaults to an i18next namespace. Depends on MUI Alert/AlertTitle/Button, @shared/lib/class-names and UI/states.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import styles from "./UI/states.module.css";

export type ErrorStateProps = {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
};

export function ErrorState({
  title = "Algo salió mal",
  description = "No se pudo completar la operación. Inténtalo de nuevo.",
  onRetry,
  retryLabel = "Reintentar",
}: ErrorStateProps) {
  const action = onRetry ? (
    <Button color="inherit" size="small" onClick={onRetry}>
      {retryLabel}
    </Button>
  ) : null;

  return (
    <div className={styles.root}>
      <Alert severity="error" className={cx(styles.alert)} action={action}>
        <AlertTitle>{title}</AlertTitle>
        {description}
      </Alert>
    </div>
  );
}
