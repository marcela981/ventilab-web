/*
* Funcionalidad: SingleChoiceQuestion
* Descripción: Answer control of a SINGLE_CHOICE question: one radio button per option (text and optional image); picking one replaces the selection. In readOnly mode (authoring preview, result page) the radios are disabled and onChange is never called. TrueFalseQuestion reuses it in a row. Depends on MUI Radio, RadioGroup and FormControlLabel, the evaluation entities and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { cx } from "@shared/lib/class-names";
import { emptyAnswer } from "../../entities/attempt-progress";
import type { QuestionViewProps } from "../../entities/practical-question-renderer";
import { OptionLabel } from "./option-label";
import styles from "../../../UI/questions.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const OPTIONS_LABEL = "Opciones de respuesta";

export type SingleChoiceQuestionProps = QuestionViewProps & {
  row?: boolean | undefined
};

export function SingleChoiceQuestion({ question, answer, onChange, readOnly = false, row = false }: SingleChoiceQuestionProps) {
  const selected = answer?.selectedOptionIds[0] ?? "";

  const handleChange = (_event: unknown, optionId: string) => {
    if (!readOnly) {
      onChange({ ...(answer ?? emptyAnswer()), selectedOptionIds: [optionId] });
    }
  };

  return (
    <RadioGroup
      aria-label={OPTIONS_LABEL}
      value={selected}
      onChange={handleChange}
      className={cx(styles.options, row && styles.optionsRow)}
    >
      {question.options.map((option) => (
        <FormControlLabel
          key={option.id}
          value={option.id}
          control={<Radio />}
          label={<OptionLabel option={option} />}
          disabled={readOnly}
          className={cx(styles.option)}
        />
      ))}
    </RadioGroup>
  );
}
