/*
* Funcionalidad: SimulationQuestionFields
* Descripción: Placeholder section of a SIMULATION question in the builder: shows the linked clinical case id and the number of rubric criteria read-only. Task A3 replaces it with the clinical case selector (`GET /api/clinical-cases?status=PUBLISHED`) and the rubric editor of the real backend schema. Depends on @shared/lib, the builder copy and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import styles from "../../../UI/builder.module.css";

export type SimulationQuestionFieldsProps = {
  clinicalCaseId: string | null
  rubric: Record<string, unknown> | null
};

function criteriaCount(rubric: Record<string, unknown> | null): number | null {
  return rubric && Array.isArray(rubric.criteria) ? rubric.criteria.length : null;
}

export function SimulationQuestionFields({ clinicalCaseId, rubric }: SimulationQuestionFieldsProps) {
  const count = criteriaCount(rubric);

  return (
    <section className={cx(styles.subsection, styles.placeholder)} aria-label={BUILDER_COPY.simulationTitle}>
      <span className={cx(styles.fieldLabel)}>{BUILDER_COPY.simulationTitle}</span>
      <dl className={cx(styles.definition)}>
        <dt>{BUILDER_COPY.simulationCase}</dt>
        <dd>{clinicalCaseId ?? BUILDER_COPY.simulationNoCase}</dd>
      </dl>
      <p className={cx(styles.muted)}>{count === null ? BUILDER_COPY.simulationNoRubric : BUILDER_COPY.simulationRubric(count)}</p>
      <p className={cx(styles.muted)}>{BUILDER_COPY.simulationPending}</p>
    </section>
  );
}
