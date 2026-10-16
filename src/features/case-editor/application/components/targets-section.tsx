/*
* Funcionalidad: Case editor stabilisation objectives section
* Descripción: "Objetivos de estabilización" of the case editor, matching ClinicalCaseTargetsDTO: a min–max range for
*   SpO2, PaCO2, pH and the tidal volume per kg of predicted body weight, and a maximum for plateau pressure, driving
*   pressure and auto-PEEP. Every field is optional (empty = no objective) and shows its plausible range from the
*   vendored backend ranges; a range needs both bounds and min ≤ max. Depends on the case editor config, draft entity,
*   fields, section frame and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo } from "react";
import { cx } from "@shared/lib/class-names";
import { TARGET_MAX_FIELDS, TARGET_MAX_KEYS, TARGET_RANGE_FIELDS, TARGET_RANGE_KEYS } from "../config/case-editor.config";
import { NumericField } from "./case-fields";
import { EditorSection } from "./editor-section";
import { sameSectionProps } from "./section-props";
import type { SectionProps } from "./section-props";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const TARGETS_COPY = {
  description: "Rangos que el estudiante debe alcanzar y mantener. Deja vacío lo que el caso no evalúa.",
  ranges: "Rangos objetivo",
  limits: "Límites de seguridad",
  min: (label: string) => `${label} mínimo`,
  max: (label: string) => `${label} máximo`,
} as const;

function TargetsSectionView({ draft, errors, update, disabled }: SectionProps) {
  return (
    <EditorSection id="targets" description={TARGETS_COPY.description}>
      <fieldset className={cx(styles.group)}>
        <legend className={cx(styles.groupTitle)}>{TARGETS_COPY.ranges}</legend>
        {TARGET_RANGE_KEYS.map((key) => {
          const field = TARGET_RANGE_FIELDS[key];
          const range = draft.targetRanges[key];
          const setBound = (bound: "min" | "max", value: string) => update((current) => ({
            ...current,
            targetRanges: { ...current.targetRanges, [key]: { ...current.targetRanges[key], [bound]: value } },
          }));

          return (
            <div key={key} className={cx(styles.formGrid)}>
              <NumericField
                definition={field}
                label={TARGETS_COPY.min(field.label)}
                value={range.min}
                disabled={disabled}
                error={errors[`${field.path}.min`]}
                onChange={(value) => setBound("min", value)}
              />
              <NumericField
                definition={field}
                label={TARGETS_COPY.max(field.label)}
                value={range.max}
                disabled={disabled}
                error={errors[`${field.path}.max`]}
                onChange={(value) => setBound("max", value)}
              />
            </div>
          );
        })}
      </fieldset>
      <fieldset className={cx(styles.group)}>
        <legend className={cx(styles.groupTitle)}>{TARGETS_COPY.limits}</legend>
        <div className={cx(styles.formGrid)}>
          {TARGET_MAX_KEYS.map((key) => {
            const field = TARGET_MAX_FIELDS[key];

            return (
              <NumericField
                key={key}
                definition={field}
                value={draft.targetMax[key]}
                disabled={disabled}
                error={errors[field.path]}
                onChange={(value) => update((current) => ({ ...current, targetMax: { ...current.targetMax, [key]: value } }))}
              />
            );
          })}
        </div>
      </fieldset>
    </EditorSection>
  );
}

export const TargetsSection = memo(TargetsSectionView, sameSectionProps<SectionProps>(["targetRanges", "targetMax"], "targets"));
