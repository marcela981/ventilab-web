/*
* Funcionalidad: PreviewNotice
* Descripción: "Vista previa" notice shown to teachers and admins on the learning routes: they navigate everything (locks do not stop them) and their visits do not register progress. Depends on MUI Alert and the learning CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { cx } from "@shared/lib/class-names";
import styles from "../../UI/learning.module.css";

export function PreviewNotice() {
  return (
    <Alert severity="info" className={cx(styles.notice)}>
      <AlertTitle>Vista previa</AlertTitle>
      Estás viendo el contenido como docente: puedes navegar todo aunque esté bloqueado para los estudiantes, y tus visitas no registran progreso.
    </Alert>
  );
}
