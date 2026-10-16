/*
* Funcionalidad: Case editor default rubric section
* Descripción: "Rúbrica por defecto" of the case editor: the shared OutcomeRubricEditor (assistance policy, passing
*   score and the outcome criteria of ClinicalCaseRubricDTO with the backend save rules) over the draft rubric. A case
*   without a default rubric offers "Definir rúbrica"; it can be removed again. The rubric issues show on their fields
*   once the author tried to save. The section sees only its block and is memoized (typing elsewhere does not
*   re-render the rubric editor). Depends on MUI, the shared rubric editor, the section frame and the CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { memo } from "react";
import { cx } from "@shared/lib/class-names";
import { emptyOutcomeRubricDraft, OutcomeRubricEditor } from "@shared/rubric-editor";
import type { OutcomeRubricDraft } from "@shared/rubric-editor";
import { EditorSection } from "./editor-section";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const RUBRIC_COPY = {
  description: "Rúbrica con la que se califica una sesión del caso cuando el examen no define otra.",
  none: "El caso no tiene rúbrica por defecto.",
  define: "Definir rúbrica",
  remove: "Quitar rúbrica",
} as const;

export type RubricSectionProps = {
  /** null: the case has no default rubric. */
  rubric: OutcomeRubricDraft | null
  error: string | undefined
  onChange: (rubric: OutcomeRubricDraft | null) => void
  newKey: () => string
  showIssues: boolean
  disabled: boolean
};

function RubricSectionView({ rubric, error, onChange, disabled, newKey, showIssues }: RubricSectionProps) {
  return (
    <EditorSection id="rubric" description={RUBRIC_COPY.description}>
      {rubric ? (
        <>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <OutcomeRubricEditor
            value={rubric}
            onChange={onChange}
            newKey={newKey}
            disabled={disabled}
            showIssues={showIssues}
          />
          <div>
            <Button color="inherit" disabled={disabled} onClick={() => onChange(null)}>{RUBRIC_COPY.remove}</Button>
          </div>
        </>
      ) : (
        <>
          <p className={cx(styles.muted)}>{RUBRIC_COPY.none}</p>
          <div>
            <Button variant="outlined" disabled={disabled} onClick={() => onChange(emptyOutcomeRubricDraft())}>
              {RUBRIC_COPY.define}
            </Button>
          </div>
        </>
      )}
    </EditorSection>
  );
}

export const RubricSection = memo(RubricSectionView);
