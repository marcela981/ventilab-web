/*
* Funcionalidad: LoadingState
* Descripción: Inline loading view for page sections and queries: spinner plus a Spanish label inside a polite role="status" region. Depends on MUI CircularProgress/Typography and UI/states.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import styles from "./UI/states.module.css";

export type LoadingStateProps = {
  label?: string
};

export function LoadingState({ label = "Cargando…" }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={styles.root}>
      <CircularProgress aria-hidden="true" />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </div>
  );
}
