/*
* Funcionalidad: OpenTextQuestion
* Descripción: Answer control of an OPEN_TEXT question: a light multiline text field (no rich editor) limited to the backend maximum of 10000 characters, with a character counter. In readOnly mode the field is read only and onChange is never called. Depends on MUI TextField and the attempt-progress entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import TextField from "@mui/material/TextField";
import type { ChangeEvent } from "react";
import { emptyAnswer, OPEN_TEXT_MAX_LENGTH } from "../../entities/attempt-progress";
import type { QuestionViewProps } from "../../entities/practical-question-renderer";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const OPEN_TEXT_COPY = {
  label: "Tu respuesta",
  counter: (length: number) =>
    `${length.toLocaleString("es-CO")} de ${OPEN_TEXT_MAX_LENGTH.toLocaleString("es-CO")} caracteres`,
} as const;

export function OpenTextQuestion({ answer, onChange, readOnly = false }: QuestionViewProps) {
  const value = answer?.textAnswer ?? "";

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!readOnly) {
      onChange({ ...(answer ?? emptyAnswer()), textAnswer: event.target.value.slice(0, OPEN_TEXT_MAX_LENGTH) });
    }
  };

  return (
    <TextField
      label={OPEN_TEXT_COPY.label}
      value={value}
      onChange={handleChange}
      multiline
      minRows={6}
      fullWidth
      helperText={OPEN_TEXT_COPY.counter(value.length)}
      slotProps={{ htmlInput: { maxLength: OPEN_TEXT_MAX_LENGTH, readOnly } }}
    />
  );
}
