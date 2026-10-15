/*
* Funcionalidad: OptionListEditor
* Descripción: Option list of a choice question in the builder: text of each option, the correct-answer control (radio semantics for SINGLE_CHOICE and TRUE_FALSE, checkbox for MULTIPLE_CHOICE), move up/down, remove and "Agregar opción" (up to 20). TRUE_FALSE keeps its two options. The attached option image, when there is one, is shown read-only (task S1 adds uploading). With the structure locked the correct answers and the add/remove actions are disabled; the texts stay editable. Changes go to the local draft; the builder saves them. Depends on MUI, the design-system FormField, the builder entities, copy and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Radio from "@mui/material/Radio";
import { useId } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import {
  addOptionDraft,
  hasSingleCorrect,
  MAX_OPTIONS_PER_QUESTION,
  moveOptionDraft,
  removeOptionDraft,
  setOptionCorrect,
  updateOptionContent,
} from "../../entities/builder-question.entity";
import type { OptionDraft, QuestionErrors, QuestionType } from "../../entities/builder-question.entity";
import styles from "../../../UI/builder.module.css";

export type OptionListEditorProps = {
  type: QuestionType
  options: readonly OptionDraft[]
  errors: QuestionErrors | null
  locked: boolean
  newKey: () => string
  onChange: (options: OptionDraft[]) => void
};

export function OptionListEditor({ type, options, errors, locked, newKey, onChange }: OptionListEditorProps) {
  const groupName = useId();
  const single = hasSingleCorrect(type);
  const fixedCount = type === "TRUE_FALSE";
  const canAdd = !locked && !fixedCount && options.length < MAX_OPTIONS_PER_QUESTION;

  return (
    <fieldset className={cx(styles.options)}>
      <legend className={cx(styles.fieldLabel)}>{BUILDER_COPY.options}</legend>
      <p className={cx(styles.muted)}>{single ? BUILDER_COPY.singleCorrectHelp : BUILDER_COPY.multipleCorrectHelp}</p>
      <ol className={cx(styles.optionList)}>
        {options.map((option, index) => {
          const position = index + 1;
          const correctLabel = BUILDER_COPY.correctOption(position);
          const toggle = (checked: boolean) => onChange(setOptionCorrect(type, options, option.key, checked));

          return (
            <li key={option.key} className={cx(styles.optionRow)}>
              {single ? (
                <Radio
                  name={groupName}
                  checked={option.isCorrect}
                  disabled={locked}
                  onChange={(event) => toggle(event.target.checked)}
                  slotProps={{ input: { "aria-label": correctLabel } }}
                />
              ) : (
                <Checkbox
                  checked={option.isCorrect}
                  disabled={locked}
                  onChange={(event) => toggle(event.target.checked)}
                  slotProps={{ input: { "aria-label": correctLabel } }}
                />
              )}
              <FormField
                label={BUILDER_COPY.optionText(position)}
                value={option.content}
                size="small"
                className={cx(styles.optionText)}
                error={errors?.optionContent[option.key]}
                onChange={(event) => onChange(updateOptionContent(options, option.key, event.target.value))}
              />
              {option.media?.kind === "IMAGE" ? (
                // Signed storage URL from the backend.
                // eslint-disable-next-line @next/next/no-img-element
                <img className={cx(styles.optionImage)} src={option.media.url} alt={BUILDER_COPY.optionMedia} loading="lazy" />
              ) : null}
              <div className={cx(styles.optionActions)}>
                <IconButton
                  size="small"
                  aria-label={BUILDER_COPY.moveOptionUp(position)}
                  disabled={index === 0}
                  onClick={() => onChange(moveOptionDraft(options, option.key, -1))}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={BUILDER_COPY.moveOptionDown(position)}
                  disabled={index === options.length - 1}
                  onClick={() => onChange(moveOptionDraft(options, option.key, 1))}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                {fixedCount ? null : (
                  <IconButton
                    size="small"
                    aria-label={BUILDER_COPY.removeOption(position)}
                    disabled={locked}
                    onClick={() => onChange(removeOptionDraft(options, option.key))}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {errors?.options ? <p className={cx(styles.errorText)} role="alert">{errors.options}</p> : null}
      {fixedCount ? null : (
        <Button size="small" startIcon={<AddIcon />} disabled={!canAdd} onClick={() => onChange(addOptionDraft(options, newKey()))}>
          {BUILDER_COPY.addOption}
        </Button>
      )}
    </fieldset>
  );
}
