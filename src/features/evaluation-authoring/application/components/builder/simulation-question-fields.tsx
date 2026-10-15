/*
* Funcionalidad: SimulationQuestionFields
* Descripción: SIMULATION part of a question card in the evaluation builder: the clinical case of the practice (ClinicalCaseSelector over the published cases) and its rubric (RubricEditor on the backend schema). Both are structural: they are disabled once the structure is locked and saved in the structural question PATCH. Depends on @shared/lib, the clinical case selector, the rubric editor, the builder entities and the simulation CSS Module. v1.1 (A3): replaces the A2 read-only placeholder with the editable case selector and rubric editor.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import type { RubricDraft } from "../../entities/simulation-rubric.entity";
import { ClinicalCaseSelector } from "./clinical-case-selector";
import { RubricEditor } from "./rubric-editor";
import styles from "../../../UI/simulation.module.css";

export type SimulationChanges = {
  clinicalCaseId?: string | null
  rubric?: RubricDraft
};

export type SimulationQuestionFieldsProps = {
  clinicalCaseId: string | null
  rubric: RubricDraft
  rubricIssues: readonly string[] | undefined
  locked: boolean
  newKey: () => string
  onChange: (changes: SimulationChanges) => void
};

export function SimulationQuestionFields({ clinicalCaseId, rubric, rubricIssues, locked, newKey, onChange }: SimulationQuestionFieldsProps) {
  return (
    <section className={cx(styles.section)} aria-label={BUILDER_COPY.simulationTitle}>
      <ClinicalCaseSelector value={clinicalCaseId} disabled={locked} onChange={(id) => onChange({ clinicalCaseId: id })} />
      <RubricEditor rubric={rubric} issues={rubricIssues} disabled={locked} newKey={newKey} onChange={(next) => onChange({ rubric: next })} />
    </section>
  );
}
