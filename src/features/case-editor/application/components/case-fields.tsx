/*
* Funcionalidad: Case editor fields
* Descripción: Field building blocks of the case editor sections: NumericField (a decimal text input for one value of
*   the definition whose helper text shows the plausible physiological range of its parameter, read from the vendored
*   backend ranges, and turns into the field error when there is one) and `rangeHint` (the same range text on its own). Depends on the design-system FormField and the case editor config and ranges.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { FormField } from "@shared/design-system/components/form-field";
import type { NumericFieldDefinition } from "../config/case-editor.config";
import { formatRange, RANGE_COPY } from "../entities/case-ranges.entity";
import type { RangeDisplay } from "../entities/case-ranges.entity";

export type NumericFieldProps = {
  definition: NumericFieldDefinition
  value: string
  onChange: (value: string) => void
  error?: string | undefined
  /** Visible label (default: the definition label). */
  label?: string | undefined
  display?: RangeDisplay | undefined
  required?: boolean
  disabled: boolean
};

export function rangeHint(definition: NumericFieldDefinition, display?: RangeDisplay): string {
  return RANGE_COPY.range(formatRange(definition.parameter, display));
}

export function NumericField({ definition, value, onChange, error, label, display, required = false, disabled }: NumericFieldProps) {
  return (
    <FormField
      label={label ?? definition.label}
      value={value}
      required={required}
      disabled={disabled}
      error={error}
      helperText={rangeHint(definition, display)}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ htmlInput: { inputMode: "decimal", "data-field": definition.path } }}
    />
  );
}
