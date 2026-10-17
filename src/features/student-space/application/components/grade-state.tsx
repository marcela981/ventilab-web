/*
* Funcionalidad: GradeState
* Descripción: Passed/failed state of a published grade, taken from the API `passed` flag (the pass threshold is never computed on the client): "Aprobada" in the success token or "No aprobada" in the error token, always as text so the state never relies on colour alone. Depends on the student space labels and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { GRADE_STATE_LABELS } from "../entities/student-space-labels";
import styles from "../../UI/student-space.module.css";

export function GradeState({ passed }: { passed: boolean }) {
  return (
    <span className={cx(passed ? styles.gradePassed : styles.gradeFailed)}>
      {passed ? GRADE_STATE_LABELS.passed : GRADE_STATE_LABELS.failed}
    </span>
  );
}
