/*
* Funcionalidad: SimulationQuestionFields
* Descripción: SIMULATION part of a question card in the evaluation builder: the clinical case of the practice (ClinicalCaseSelector over the published cases) and its rubric (RubricEditor on the backend schema). Both are structural: they are disabled once the structure is locked and saved in the structural question PATCH. Depends on @shared/lib, the clinical case selector, the rubric editor, the builder entities and the simulation CSS Module. v1.1 (A3): replaces the A2 read-only placeholder with the editable case selector and rubric editor. v1.2 (A3 review W2): without a clinical case it shows the non-blocking hint "Se recomienda vincular un caso clínico". v1.3 (T10 simulation): the rubric editor (ParameterRubricEditor) and its draft type come from @shared/rubric-editor; same DOM and behaviour.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import { cx } from "@shared/lib/class-names";
import { ParameterRubricEditor } from "@shared/rubric-editor";
import type { RubricDraft } from "@shared/rubric-editor";
import { BUILDER_COPY } from "../../entities/builder-copy";
import { ClinicalCaseSelector } from "./clinical-case-selector";
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
      {/* Advisory only: the backend does not require a clinical case for READY. */}
      {clinicalCaseId === null ? <Alert severity="info">{BUILDER_COPY.simulationCaseRecommended}</Alert> : null}
      <ParameterRubricEditor rubric={rubric} issues={rubricIssues} disabled={locked} newKey={newKey} onChange={(next) => onChange({ rubric: next })} />
    </section>
  );
}
