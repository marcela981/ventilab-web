/*
* Funcionalidad: SuggestionsPanel
* Descripción: "Sugerencias" tab of the TutorAI popup (July TutorAIPopup suggestions tab). Shows the deterministic suggestions of buildTutorSuggestions as buttons, grouped as "Al terminar la lección" (only when the lesson is completed on its last page) and "Para esta página". An AI suggestion hands its prompt to the caller (deepen accordion or Preguntas, prefilled, never sent by itself); "Tomar apunte" asks to open Notas; "Crear nota 'Checklist de la lección'" creates the July checklist note anchored to the page (POST /api/notes), refreshes the cached lesson notes and then opens Notas, with an inline error on failure. Without a visible page the page suggestions are replaced by a hint. Depends on React, MUI, SWR, @shared/api-client, the notes service, the suggestion entity, the learning error messages and the popup CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import { useId, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { cx } from "@shared/lib/class-names";
import { createNote, LESSON_NOTES_PATH } from "../../../api/services/notes.service";
import { getLearningErrorMessage } from "../../entities/learning-error-messages";
import { buildChecklistNoteDoc } from "../../entities/tutor-suggestions";
import type { TutorPromptTarget, TutorSuggestion } from "../../entities/tutor-suggestions";
import styles from "../../../UI/tutor-popup.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
export const SUGGESTIONS_COPY = {
  postLesson: "Al terminar la lección",
  page: "Para esta página",
  noPage: "Abre una página de la lección para ver sugerencias sobre ella.",
  creating: "Creando la nota…",
} as const;

export type SuggestionsPanelProps = {
  suggestions: readonly TutorSuggestion[]
  lessonId: string
  // Visible Page: anchor of the checklist note; null hides the page suggestions.
  pageId: string | null
  lessonTitle: string | null
  onPrompt: (target: TutorPromptTarget, prompt: string) => void
  onOpenNotes: () => void
};

export function SuggestionsPanel({ suggestions, lessonId, pageId, lessonTitle, onPrompt, onOpenNotes }: SuggestionsPanelProps) {
  const postLessonId = useId();
  const pageGroupId = useId();
  const { mutate } = useSWRConfig();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const createChecklist = async() => {
    setCreating(true);
    setError(null);

    try {
      await createNote({ lessonId, pageId, content: buildChecklistNoteDoc(lessonTitle) });
      await invalidateApiQueries(mutate, [LESSON_NOTES_PATH]).catch(() => undefined);
      onOpenNotes();
    } catch (caught) {
      setError(caught);
    } finally {
      setCreating(false);
    }
  };

  const run = (suggestion: TutorSuggestion) => {
    const { action } = suggestion;

    if (action.kind === "prompt") {
      onPrompt(action.target, action.prompt);
    } else if (action.kind === "take-note") {
      onOpenNotes();
    } else {
      void createChecklist();
    }
  };

  const renderGroup = (titleId: string, title: string, items: readonly TutorSuggestion[]) => (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className={cx(styles.groupTitle)}>{title}</h3>
      <ul className={cx(styles.suggestionList)}>
        {items.map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              className={cx(styles.suggestion)}
              disabled={creating && suggestion.action.kind === "checklist-note"}
              onClick={() => run(suggestion)}
            >
              <span>{creating && suggestion.action.kind === "checklist-note" ? SUGGESTIONS_COPY.creating : suggestion.label}</span>
              <span className={cx(styles.suggestionHint)}>{suggestion.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  const postLesson = suggestions.filter((suggestion) => suggestion.group === "post-lesson");
  const page = suggestions.filter((suggestion) => suggestion.group === "page");

  return (
    <div className={cx(styles.suggestions)}>
      {error ? <Alert severity="error" onClose={() => setError(null)}>{getLearningErrorMessage(error)}</Alert> : null}
      {postLesson.length > 0 ? renderGroup(postLessonId, SUGGESTIONS_COPY.postLesson, postLesson) : null}
      {pageId ? renderGroup(pageGroupId, SUGGESTIONS_COPY.page, page) : <p className={cx(styles.suggestionHint)}>{SUGGESTIONS_COPY.noPage}</p>}
    </div>
  );
}
