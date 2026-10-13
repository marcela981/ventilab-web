/*
* Funcionalidad: Session loading view
* Descripción: Neutral full-viewport loading state (spinner + Spanish label, role="status") rendered by RequireAuth/RequireRole instead of protected content while the session loads or a redirect is pending. Depends on MUI CircularProgress and UI/session-loading.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CircularProgress from "@mui/material/CircularProgress";
import styles from "./UI/session-loading.module.css";

export function SessionLoading() {
  return (
    <div role="status" aria-live="polite" className={styles.root}>
      <CircularProgress aria-hidden="true" />
      <span className={styles.label}>Cargando sesión…</span>
    </div>
  );
}
