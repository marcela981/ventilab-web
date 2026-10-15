/*
* Funcionalidad: MultipleChoiceQuestion
* Descripción: Answer control of a MULTIPLE_CHOICE question: one checkbox per option (text and optional image); checking or unchecking toggles that option and keeps the option order. In readOnly mode the checkboxes are disabled and onChange is never called. Depends on MUI Checkbox, FormGroup and FormControlLabel, the evaluation entities and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import { cx } from "@shared/lib/class-names";
import { emptyAnswer } from "../../entities/attempt-progress";
import type { QuestionViewProps } from "../../entities/practical-question-renderer";
import { OptionLabel } from "./option-label";
import styles from "../../../UI/questions.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const OPTIONS_LABEL = "Opciones de respuesta (puedes elegir varias)";

export function MultipleChoiceQuestion({ question, answer, onChange, readOnly = false }: QuestionViewProps) {
  const selected = new Set(answer?.selectedOptionIds ?? []);

  const toggle = (optionId: string, checked: boolean) => {
    if (readOnly) {
      return;
    }

    const next = new Set(selected);

    if (checked) {
      next.add(optionId);
    } else {
      next.delete(optionId);
    }

    const ordered = question.options.filter((option) => next.has(option.id)).map((option) => option.id);

    onChange({ ...(answer ?? emptyAnswer()), selectedOptionIds: ordered });
  };

  return (
    <FormGroup role="group" aria-label={OPTIONS_LABEL} className={cx(styles.options)}>
      {question.options.map((option) => (
        <FormControlLabel
          key={option.id}
          control={(
            <Checkbox
              checked={selected.has(option.id)}
              onChange={(_event, checked) => toggle(option.id, checked)}
            />
          )}
          label={<OptionLabel option={option} />}
          disabled={readOnly}
          className={cx(styles.option)}
        />
      ))}
    </FormGroup>
  );
}
