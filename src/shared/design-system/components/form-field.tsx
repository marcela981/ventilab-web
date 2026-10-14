/*
* Funcionalidad: FormField
* Descripción: Thin wrapper over the outlined MUI TextField with the project form conventions: the label is always rendered, the field always has an id (given or generated) so MUI links the helper/error text through aria-describedby, `error` takes the `string | undefined` result of the entity validators (a message marks the field invalid with aria-invalid and replaces the helper text), and `required` shows the MUI required marker. Same visuals as a plain TextField. Depends on React and MUI TextField.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import { useId } from "react";
import type { ReactNode } from "react";

export type FormFieldProps = Omit<TextFieldProps<"outlined">, "error" | "helperText" | "id" | "label" | "variant"> & {
  label: string
  id?: string
  // Validator result: a message means invalid, undefined (or "") means valid.
  error?: string | undefined
  helperText?: ReactNode
};

export function FormField({ id, label, error, helperText, ...props }: FormFieldProps) {
  const generatedId = useId();
  const message = error ? error : helperText;

  return (
    <TextField
      {...props}
      variant="outlined"
      id={id ?? generatedId}
      label={label}
      error={Boolean(error)}
      {...(message === undefined ? {} : { helperText: message })}
    />
  );
}
