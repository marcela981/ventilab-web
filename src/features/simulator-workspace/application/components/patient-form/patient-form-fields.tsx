/*
* Funcionalidad: Patient form fields
* Descripción: Field building blocks of the Simular Paciente form (W8, Bloque 1): a numeric field with the backend
*   range as input bounds and its unit as end adornment, a native select over a label map (with an empty option) and a
*   read-only computed value (PCI, IMC, VT predicho). Each field shows its Spanish validation message in place of its
*   helper text and emits a partial patch of the form values. Depends on MUI TextField and InputAdornment, the form
*   entity and the patient form styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { PATIENT_NUMERIC_LIMITS } from "../../entities/patient-form.entity";
import type { NumericPatientField, PatientFormErrors, PatientFormField, PatientFormValues } from "../../entities/patient-form.entity";
import styles from "../../../UI/patient-form/patient-form.module.css";

export type PatientFormPatch = (patch: Partial<PatientFormValues>) => void;

type FieldBase<F extends PatientFormField> = {
  field: F
  label: string
  values: PatientFormValues
  errors: PatientFormErrors
  onChange: PatientFormPatch
  helperText?: string | undefined
  required?: boolean | undefined
  wide?: boolean | undefined
};

function unitAdornment(unit: string): { input?: { endAdornment: ReactNode } } {
  return unit ? { input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } } : {};
}

export function NumberField({ field, label, values, errors, onChange, helperText, required, wide }: FieldBase<NumericPatientField>) {
  const limit = PATIENT_NUMERIC_LIMITS[field];
  const error = errors[field];

  return (
    <TextField
      className={cx(wide ? styles.wide : undefined)}
      fullWidth
      size="small"
      type="number"
      label={label}
      required={required ?? false}
      value={values[field]}
      error={error !== undefined}
      helperText={error ?? helperText}
      onChange={(event) => onChange({ [field]: event.target.value } as Partial<PatientFormValues>)}
      slotProps={{
        htmlInput: { min: limit.min, max: limit.max, step: limit.integer ? 1 : limit.step ?? "any" },
        ...unitAdornment(limit.unit),
      }}
    />
  );
}

type TextFieldProps = FieldBase<"name" | "diagnosis" | "allergies" | "history"> & {
  placeholder?: string | undefined
  rows?: number | undefined
};

export function TextInputField({ field, label, values, errors, onChange, helperText, wide, placeholder, rows }: TextFieldProps) {
  const error = errors[field];

  return (
    <TextField
      className={cx(wide ? styles.wide : undefined)}
      fullWidth
      size="small"
      label={label}
      placeholder={placeholder ?? ""}
      {...(rows === undefined ? {} : { multiline: true, rows })}
      value={values[field]}
      error={error !== undefined}
      helperText={error ?? helperText}
      onChange={(event) => onChange({ [field]: event.target.value } as Partial<PatientFormValues>)}
    />
  );
}

type SelectFieldProps<F extends "sex" | "condition" | "difficulty" | "breathingPattern"> = FieldBase<F> & {
  options: Readonly<Record<string, string>>
  /** Label of the empty option; without it the field always has a value. */
  emptyLabel?: string | undefined
};

export function SelectField<F extends "sex" | "condition" | "difficulty" | "breathingPattern">({
  field,
  label,
  values,
  errors,
  onChange,
  helperText,
  required,
  wide,
  options,
  emptyLabel,
}: SelectFieldProps<F>) {
  const error = errors[field];

  return (
    <TextField
      className={cx(wide ? styles.wide : undefined)}
      select
      fullWidth
      size="small"
      label={label}
      required={required ?? false}
      value={values[field]}
      error={error !== undefined}
      helperText={error ?? helperText}
      // The option values are the keys of `options`, the closed domain of this field.
      onChange={(event) => onChange({ [field]: event.target.value } as Partial<PatientFormValues>)}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
    >
      {emptyLabel === undefined ? null : <option value="">{emptyLabel}</option>}
      {Object.entries(options).map(([value, optionLabel]) => (
        <option key={value} value={value}>{optionLabel}</option>
      ))}
    </TextField>
  );
}

export type ComputedFieldProps = { label: string, value: string, unit: string, helperText: string };

export function ComputedField({ label, value, unit, helperText }: ComputedFieldProps) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value}
      helperText={helperText}
      slotProps={{ input: { readOnly: true, ...unitAdornment(unit).input }, inputLabel: { shrink: true } }}
    />
  );
}
