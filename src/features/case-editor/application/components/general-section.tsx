/*
* Funcionalidad: Case editor general section
* Descripción: "Datos generales" of the case editor: title, short summary for listings, difficulty and pathology
*   (contract enums), main diagnosis, educational goal, comorbidities (one per line), the clinical history the student
*   reads in the console (the case `description`, written in Markdown with a live preview through the shared
*   RichContent renderer, the same one the session case panel uses), the present illness and the relevant history
*   (one per line). Media cannot be attached: the case contract has no media field and a signed media URL expires, so
*   embedding one would break later (BACKEND GAP, stated in a note). Depends on the design-system FormField, the shared
*   rich-content renderer, the case editor config, draft entity, section frame and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { RichContent } from "@shared/rich-content";
import { CASE_DIFFICULTIES, CASE_PATHOLOGIES, DIFFICULTY_LABELS, PATHOLOGY_LABELS } from "../config/case-editor.config";
import type { CaseDifficulty, CasePathology } from "../config/case-editor.config";
import { EditorSection } from "./editor-section";
import { sameSectionProps } from "./section-props";
import type { SectionProps } from "./section-props";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const GENERAL_COPY = {
  title: "Título",
  summary: "Resumen para el listado",
  difficulty: "Dificultad",
  pathology: "Patología",
  mainDiagnosis: "Diagnóstico principal",
  educationalGoal: "Objetivo educativo",
  comorbidities: "Comorbilidades",
  onePerLine: "Una por línea.",
  description: "Historia clínica (Markdown)",
  descriptionHelp: "El estudiante la lee en el panel del caso durante la sesión. Admite Markdown: **negrita**, listas y tablas.",
  preview: "Vista previa de la historia clínica",
  previewEmpty: "La historia clínica aparecerá aquí.",
  mediaNote: "Por ahora no se pueden adjuntar imágenes ni videos a un caso: el contrato del caso no tiene multimedia.",
  presentIllness: "Enfermedad actual",
  relevantHistory: "Antecedentes relevantes",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

function GeneralSectionView({ draft, errors, update, disabled }: SectionProps) {
  return (
    <EditorSection id="general">
      <div className={cx(styles.formGrid)}>
        <FormField
          label={GENERAL_COPY.title}
          value={draft.title}
          required
          disabled={disabled}
          error={errors.title}
          className={cx(styles.wide)}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, title: value }));
          }}
        />
        <FormField
          label={GENERAL_COPY.summary}
          value={draft.summary}
          disabled={disabled}
          error={errors.summary}
          className={cx(styles.wide)}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, summary: value }));
          }}
        />
        <FormField
          select
          label={GENERAL_COPY.difficulty}
          value={draft.difficulty}
          disabled={disabled}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, difficulty: value as CaseDifficulty }));
          }}
          slotProps={NATIVE_SELECT}
        >
          {CASE_DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</option>)}
        </FormField>
        <FormField
          select
          label={GENERAL_COPY.pathology}
          value={draft.pathology}
          disabled={disabled}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, pathology: value as CasePathology }));
          }}
          slotProps={NATIVE_SELECT}
        >
          {CASE_PATHOLOGIES.map((pathology) => <option key={pathology} value={pathology}>{PATHOLOGY_LABELS[pathology]}</option>)}
        </FormField>
        <FormField
          label={GENERAL_COPY.mainDiagnosis}
          value={draft.mainDiagnosis}
          required
          disabled={disabled}
          error={errors.mainDiagnosis}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, mainDiagnosis: value }));
          }}
        />
        <FormField
          label={GENERAL_COPY.educationalGoal}
          value={draft.educationalGoal}
          required
          disabled={disabled}
          error={errors.educationalGoal}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, educationalGoal: value }));
          }}
        />
        <FormField
          label={GENERAL_COPY.comorbidities}
          value={draft.comorbidities}
          multiline
          minRows={2}
          disabled={disabled}
          helperText={GENERAL_COPY.onePerLine}
          className={cx(styles.wide)}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, comorbidities: value }));
          }}
        />
      </div>
      <div className={cx(styles.markdownEditor)}>
        <FormField
          label={GENERAL_COPY.description}
          value={draft.description}
          multiline
          minRows={6}
          required
          disabled={disabled}
          error={errors.description}
          helperText={GENERAL_COPY.descriptionHelp}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, description: value }));
          }}
        />
        <div className={cx(styles.preview)} role="region" aria-label={GENERAL_COPY.preview}>
          <RichContent content={draft.description} emptyLabel={GENERAL_COPY.previewEmpty} />
        </div>
      </div>
      <p className={cx(styles.muted)} role="note">{GENERAL_COPY.mediaNote}</p>
      <div className={cx(styles.formGrid)}>
        <FormField
          label={GENERAL_COPY.presentIllness}
          value={draft.presentIllness}
          multiline
          minRows={3}
          disabled={disabled}
          error={errors["history.presentIllness"]}
          className={cx(styles.wide)}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, presentIllness: value }));
          }}
        />
        <FormField
          label={GENERAL_COPY.relevantHistory}
          value={draft.relevantHistory}
          multiline
          minRows={2}
          disabled={disabled}
          helperText={GENERAL_COPY.onePerLine}
          className={cx(styles.wide)}
          onChange={(event) => {
            const { value } = event.target;

            update((current) => ({ ...current, relevantHistory: value }));
          }}
        />
      </div>
    </EditorSection>
  );
}

export const GeneralSection = memo(GeneralSectionView, sameSectionProps<SectionProps>(["title", "summary", "description", "difficulty", "pathology", "mainDiagnosis", "educationalGoal", "comorbidities", "presentIllness", "relevantHistory"], "general"));
