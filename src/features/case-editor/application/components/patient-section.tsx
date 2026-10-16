/*
* Funcionalidad: Case editor patient section
* Descripción: "Paciente" of the case editor: sex, age, height and real weight (each numeric field with its plausible
*   range from the vendored backend ranges) and the predicted body weight computed live with the engine formula
*   (predictedBodyWeightKg, Devine), the weight the protective tidal volume targets use; without a sex and a plausible
*   height it explains what is missing. Depends on the design-system FormField, the case editor config, draft entity,
*   fields, section frame and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { CASE_SEXES, PATIENT_FIELDS, SEX_LABELS } from "../config/case-editor.config";
import type { CaseSex } from "../config/case-editor.config";
import { draftPredictedBodyWeightKg } from "../entities/case-draft.entity";
import { NumericField } from "./case-fields";
import { EditorSection } from "./editor-section";
import { sameSectionProps } from "./section-props";
import type { SectionProps } from "./section-props";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const PATIENT_COPY = {
  sex: "Sexo",
  noSex: "Sin especificar",
  pbw: "Peso corporal predicho (PBW)",
  pbwValue: (kg: string) => `${kg} kg`,
  pbwMissing: "Indica el sexo y una talla plausible para calcularlo.",
  pbwHelp: "Fórmula de Devine, la misma del motor: los objetivos de volumen corriente usan este peso.",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;
const kgFormat = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function PatientSectionView({ draft, errors, update, disabled }: SectionProps) {
  const pbw = draftPredictedBodyWeightKg(draft);

  return (
    <EditorSection id="patient">
      <div className={cx(styles.formGrid)}>
        <FormField
          select
          label={PATIENT_COPY.sex}
          value={draft.patientSex}
          disabled={disabled}
          error={errors.patientSex}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, patientSex: value as CaseSex | "" }));
          }}
          slotProps={NATIVE_SELECT}
        >
          <option value="">{PATIENT_COPY.noSex}</option>
          {CASE_SEXES.map((sex) => <option key={sex} value={sex}>{SEX_LABELS[sex]}</option>)}
        </FormField>
        <NumericField
          definition={PATIENT_FIELDS.patientAge}
          value={draft.patientAge}
          required
          disabled={disabled}
          error={errors.patientAge}
          onChange={(patientAge) => update((current) => ({ ...current, patientAge }))}
        />
        <NumericField
          definition={PATIENT_FIELDS.patientHeightCm}
          value={draft.patientHeightCm}
          disabled={disabled}
          error={errors.patientHeightCm}
          onChange={(patientHeightCm) => update((current) => ({ ...current, patientHeightCm }))}
        />
        <NumericField
          definition={PATIENT_FIELDS.patientWeight}
          value={draft.patientWeight}
          required
          disabled={disabled}
          error={errors.patientWeight}
          onChange={(patientWeight) => update((current) => ({ ...current, patientWeight }))}
        />
      </div>
      <dl className={cx(styles.facts)}>
        <dt>{PATIENT_COPY.pbw}</dt>
        <dd aria-live="polite">{pbw === null ? PATIENT_COPY.pbwMissing : PATIENT_COPY.pbwValue(kgFormat.format(pbw))}</dd>
      </dl>
      <p className={cx(styles.muted)}>{PATIENT_COPY.pbwHelp}</p>
    </EditorSection>
  );
}

export const PatientSection = memo(PatientSectionView, sameSectionProps<SectionProps>(["patientSex", "patientAge", "patientHeightCm", "patientWeight"], "patient"));
