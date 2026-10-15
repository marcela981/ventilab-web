/*
* Funcionalidad: QuestionCard
* Descripción: Editor of one question in the builder (article "Pregunta N"): drag handle slot, type label, "Sin guardar" marker, delete action, prompt as rich text, the statement media (QuestionMediaField), points, the fields of its type (options for SINGLE_CHOICE, MULTIPLE_CHOICE and TRUE_FALSE; a teacher note for OPEN_TEXT; the SimulationQuestionFields placeholder for SIMULATION) and the explanation shown with the results (plain text or markdown: the backend stores it as a string). Shows the validation messages, the error of its last failed save and, after a 422, its readiness issues from the reloaded detail. With the structure locked, points, options and delete are disabled. Depends on React, MUI, the design-system FormField, @shared/media-upload, the builder entities, components, copy and CSS Module. v1.1 (A3): SIMULATION questions edit their clinical case and rubric (SimulationQuestionFields) with the rubric issues of the validation; on a READY evaluation the correct answer of SINGLE_CHOICE and TRUE_FALSE is read-only with a hint to return to draft; the readiness issues come from the backend or from the client validation. v1.2 (S1): the card owns the media uploads of its statement and option images (shared useMediaUploader, one slot per statement and per option key); an uploaded media is added to the latest draft (statement mediaIds, option mediaId with its preview) and removing only changes the draft; media edits stay enabled with the structure locked.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { useMediaUploader } from "@shared/media-upload";
import type { UploadedMedia } from "@shared/media-upload";
import { BUILDER_COPY } from "../../entities/builder-copy";
import {
  addQuestionMedia,
  canAddQuestionMedia,
  hasSingleCorrect,
  isChoiceType,
  QUESTION_TYPE_LABELS,
  readinessIssueMessage,
  removeQuestionMedia,
  setOptionMedia,
} from "../../entities/builder-question.entity";
import type { QuestionDraft, QuestionErrors } from "../../entities/builder-question.entity";
import type { BuilderMedia, BuilderQuestion, ReadinessIssue } from "../../entities/evaluation-builder.entity";
import type { OptionMediaControls } from "./option-list-editor";
import { OptionListEditor } from "./option-list-editor";
import { QuestionMediaField, STATEMENT_MEDIA_KINDS } from "./question-media-field";
import { RichTextField } from "./rich-text-field";
import { SimulationQuestionFields } from "./simulation-question-fields";
import styles from "../../../UI/builder.module.css";

const STATEMENT_SLOT = "statement";

// A preview URL that could not be read is kept empty: the media is listed without preview.
function toBuilderMedia({ mediaId, mediaUrl, kind, mimeType }: UploadedMedia): BuilderMedia {
  return { mediaId, url: mediaUrl ?? "", kind, mimeType };
}

export type QuestionCardProps = {
  question: BuilderQuestion
  position: number
  draft: QuestionDraft
  dirty: boolean
  errors: QuestionErrors | null
  saveError: string | undefined
  issues: readonly ReadinessIssue[]
  locked: boolean
  // The evaluation is READY: single-correct answers cannot change through single-option PATCHes.
  ready: boolean
  busy: boolean
  dragHandle?: ReactNode
  newKey: () => string
  onChange: (draft: QuestionDraft) => void
  onDelete: () => void
};

export function QuestionCard({
  question,
  position,
  draft,
  dirty,
  errors,
  saveError,
  issues,
  locked,
  ready,
  busy,
  dragHandle,
  newKey,
  onChange,
  onDelete,
}: QuestionCardProps) {
  const label = BUILDER_COPY.questionLabel(position);
  const uploads = useMediaUploader();
  // Uploads finish later: they apply to the draft as it is then, not as it was when the file was chosen.
  const latest = useRef({ draft, onChange });

  useEffect(() => {
    latest.current = { draft, onChange };
  }, [draft, onChange]);

  // The ref is updated right away so two uploads finishing before the next render do not overwrite each other.
  const applyDraft = (change: (current: QuestionDraft) => QuestionDraft) => {
    const next = change(latest.current.draft);
    latest.current = { ...latest.current, draft: next };
    latest.current.onChange(next);
  };

  const selectStatementMedia = (file: File) => {
    void uploads.upload(STATEMENT_SLOT, STATEMENT_MEDIA_KINDS, file, {
      onUploaded: (media) => applyDraft((current) => addQuestionMedia(current, toBuilderMedia(media))),
    });
  };

  const optionMedia: OptionMediaControls = {
    stateOf: uploads.stateOf,
    select: (key, file) => {
      void uploads.upload(key, "IMAGE", file, {
        onUploaded: (media) => applyDraft((current) => ({ ...current, options: setOptionMedia(current.options, key, toBuilderMedia(media)) })),
      });
    },
    cancel: uploads.cancel,
    remove: (key) => {
      uploads.cancel(key);
      applyDraft((current) => ({ ...current, options: setOptionMedia(current.options, key, null) }));
    },
    release: uploads.release,
  };

  return (
    <article className={cx(styles.questionCard, dirty && styles.questionDirty)} aria-label={label}>
      <header className={cx(styles.cardHeader)}>
        {dragHandle}
        <span className={cx(styles.cardTitle)}>{label}</span>
        <span className={cx(styles.typeBadge)}>{QUESTION_TYPE_LABELS[question.type]}</span>
        {dirty ? <span className={cx(styles.unsavedBadge)}>{BUILDER_COPY.unsavedQuestion}</span> : null}
        <IconButton
          size="small"
          className={cx(styles.cardAction)}
          aria-label={BUILDER_COPY.deleteQuestion(position)}
          disabled={locked || busy}
          onClick={onDelete}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </header>
      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
      {issues.length > 0 ? (
        <Alert severity="warning" aria-label={BUILDER_COPY.issuesTitle}>
          <ul className={cx(styles.issueList)}>
            {issues.map((issue) => <li key={`${issue.code}-${issue.details.join("|")}`}>{readinessIssueMessage(issue)}</li>)}
          </ul>
        </Alert>
      ) : null}
      <RichTextField
        key={question.id}
        label={BUILDER_COPY.prompt}
        initialValue={draft.prompt}
        placeholder={BUILDER_COPY.promptPlaceholder}
        onChange={(prompt) => onChange({ ...draft, prompt })}
      />
      <QuestionMediaField
        mediaIds={draft.mediaIds}
        media={draft.media}
        canAdd={canAddQuestionMedia(draft)}
        state={uploads.stateOf(STATEMENT_SLOT)}
        onSelect={selectStatementMedia}
        onCancel={() => uploads.cancel(STATEMENT_SLOT)}
        onRemove={(mediaId) => onChange(removeQuestionMedia(draft, mediaId))}
      />
      <FormField
        label={BUILDER_COPY.points}
        value={draft.points}
        inputMode="decimal"
        size="small"
        disabled={locked}
        error={errors?.points}
        className={cx(styles.pointsField)}
        onChange={(event) => onChange({ ...draft, points: event.target.value })}
      />
      {isChoiceType(question.type) ? (
        <OptionListEditor
          type={question.type}
          options={draft.options}
          errors={errors}
          locked={locked}
          correctLocked={locked || (ready && hasSingleCorrect(question.type))}
          newKey={newKey}
          media={optionMedia}
          onChange={(options) => onChange({ ...draft, options })}
        />
      ) : null}
      {question.type === "OPEN_TEXT" ? <p className={cx(styles.muted)}>{BUILDER_COPY.openTextHelp}</p> : null}
      {question.type === "SIMULATION" ? (
        <SimulationQuestionFields
          clinicalCaseId={draft.clinicalCaseId}
          rubric={draft.rubric}
          rubricIssues={errors?.rubric}
          locked={locked}
          newKey={newKey}
          onChange={(changes) => onChange({ ...draft, ...changes })}
        />
      ) : null}
      <FormField
        label={BUILDER_COPY.explanation}
        value={draft.explanation}
        multiline
        minRows={2}
        helperText={BUILDER_COPY.explanationHelp}
        onChange={(event) => onChange({ ...draft, explanation: event.target.value })}
      />
    </article>
  );
}
