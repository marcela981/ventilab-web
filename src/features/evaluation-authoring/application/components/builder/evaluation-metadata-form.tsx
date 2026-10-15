/*
* Funcionalidad: EvaluationMetadataForm
* Descripción: General data of an evaluation in the builder: type (EXAM, QUIZ, WORKSHOP; editable only while creating because the update DTO has no type, and a change applies the default of "show results immediately"), title, description (rich text), optional level and module picked from the curriculum tree of the learning feature (`GET /api/curriculum/tree`; picking a module also links its level, picking a level drops a module of another level; ids no longer in the tree stay visible), optional duration in minutes, max attempts and the shuffle and show-results switches. Shows the validation messages of the builder. Depends on MUI, the design-system FormField, @features/learning (useCurriculumTree), the builder entities, RichTextField and the builder CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useMemo } from "react";
import { useCurriculumTree } from "@features/learning";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import { EVALUATION_TYPE_LABELS } from "../../entities/evaluation-authoring.entity";
import type { EvaluationType } from "../../entities/evaluation-authoring.entity";
import { moduleChoices, selectLevel, selectModule, TITLE_MAX_LENGTH } from "../../entities/evaluation-builder.entity";
import type { CurriculumLevelChoice, MetadataErrors, MetadataForm } from "../../entities/evaluation-builder.entity";
import { RichTextField } from "./rich-text-field";
import styles from "../../../UI/builder.module.css";

const TYPES: readonly EvaluationType[] = ["EXAM", "QUIZ", "WORKSHOP"];
const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type EvaluationMetadataFormProps = {
  form: MetadataForm
  errors: MetadataErrors
  creating: boolean
  // Remounts the description editor when another evaluation is loaded.
  editorKey: string
  onChange: (next: MetadataForm) => void
  onTypeChange: (type: EvaluationType) => void
};

function withCurrent(options: Array<{ id: string, title: string }>, currentId: string): Array<{ id: string, title: string }> {
  return currentId === "" || options.some((option) => option.id === currentId)
    ? options
    : [...options, { id: currentId, title: BUILDER_COPY.unknownCurriculumItem(currentId) }];
}

export function EvaluationMetadataForm({ form, errors, creating, editorKey, onChange, onTypeChange }: EvaluationMetadataFormProps) {
  const { tree, error: curriculumError } = useCurriculumTree();
  const levels: CurriculumLevelChoice[] = useMemo(
    () => (tree ? [...tree.sections.flatMap((section) => section.levels), ...tree.unsectionedLevels] : []),
    [tree],
  );
  const levelOptions = withCurrent(levels.map(({ id, title }) => ({ id, title })), form.levelId);
  const moduleOptions = withCurrent(moduleChoices(levels, form.levelId), form.moduleId);

  return (
    <section className={cx(styles.panel)} aria-labelledby="builder-metadata-title">
      <h2 id="builder-metadata-title" className={cx(styles.panelTitle)}>{BUILDER_COPY.metadataTitle}</h2>
      <div className={cx(styles.formGrid)}>
        <FormField
          select
          label={BUILDER_COPY.type}
          value={form.type}
          disabled={!creating}
          helperText={creating ? undefined : BUILDER_COPY.typeLocked}
          onChange={(event) => onTypeChange(event.target.value as EvaluationType)}
          slotProps={NATIVE_SELECT}
        >
          {TYPES.map((type) => <option key={type} value={type}>{EVALUATION_TYPE_LABELS[type]}</option>)}
        </FormField>
        <FormField
          label={BUILDER_COPY.title}
          value={form.title}
          required
          error={errors.title}
          className={cx(styles.wide)}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
          slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }}
        />
      </div>
      <RichTextField
        key={editorKey}
        label={BUILDER_COPY.description}
        initialValue={form.description}
        placeholder={BUILDER_COPY.descriptionPlaceholder}
        onChange={(description) => onChange({ ...form, description })}
      />
      <div className={cx(styles.formGrid)}>
        <FormField
          select
          label={BUILDER_COPY.level}
          value={form.levelId}
          onChange={(event) => onChange(selectLevel(form, levels, event.target.value))}
          slotProps={NATIVE_SELECT}
        >
          <option value="">{BUILDER_COPY.noLevel}</option>
          {levelOptions.map((level) => <option key={level.id} value={level.id}>{level.title}</option>)}
        </FormField>
        <FormField
          select
          label={BUILDER_COPY.module}
          value={form.moduleId}
          onChange={(event) => onChange(selectModule(form, levels, event.target.value))}
          slotProps={NATIVE_SELECT}
        >
          <option value="">{BUILDER_COPY.noModule}</option>
          {moduleOptions.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
        </FormField>
        <FormField
          label={BUILDER_COPY.duration}
          value={form.durationMinutes}
          inputMode="numeric"
          error={errors.durationMinutes}
          helperText={BUILDER_COPY.durationHelp}
          onChange={(event) => onChange({ ...form, durationMinutes: event.target.value })}
        />
        <FormField
          label={BUILDER_COPY.maxAttempts}
          value={form.maxAttempts}
          inputMode="numeric"
          required
          error={errors.maxAttempts}
          onChange={(event) => onChange({ ...form, maxAttempts: event.target.value })}
        />
      </div>
      {curriculumError ? <p className={cx(styles.muted)} role="status">{BUILDER_COPY.curriculumError}</p> : null}
      <div className={cx(styles.switches)}>
        <FormControlLabel
          control={(
            <Switch
              checked={form.shuffleQuestions}
              onChange={(event) => onChange({ ...form, shuffleQuestions: event.target.checked })}
            />
          )}
          label={BUILDER_COPY.shuffleQuestions}
        />
        <FormControlLabel
          control={(
            <Switch
              checked={form.showResultsImmediately}
              onChange={(event) => onChange({ ...form, showResultsImmediately: event.target.checked })}
            />
          )}
          label={BUILDER_COPY.showResultsImmediately}
        />
      </div>
    </section>
  );
}
