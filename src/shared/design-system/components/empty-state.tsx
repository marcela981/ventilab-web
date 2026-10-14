/*
* Funcionalidad: EmptyState
* Descripción: Neutral empty-result view for lists and pages: optional icon, title, optional description and an optional action (e.g. a create button). Depends on MUI Typography and UI/states.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import styles from "./UI/states.module.css";

export type EmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      {icon ? (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
