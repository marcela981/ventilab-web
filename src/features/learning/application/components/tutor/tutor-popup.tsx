/*
* Funcionalidad: TutorPopup
* Descripción: TutorAI popup of the lesson viewer (July TutorAIPopup, FLUJOS_JULIO §d.2; DISENO_BLOQUE2 §2.10). Lazy chunk opened by TutorFab. Accessible modal dialog (MUI Dialog: focus trapped inside, Esc and the close button close it, focus returns to the button that opened it), floating at the bottom right on desktop and a full-screen sheet on phones (CSS). Header "TutorAI". Tabs Sugerencias / Preguntas / Notas following the WAI-ARIA tabs pattern (roving tabindex, arrows, Home/End via the shared tab-list keyboard helper); a panel is mounted on its first visit and kept mounted (hidden) while the popup is open, so switching tab does not stop an answer. Sugerencias: the deterministic suggestions; an AI suggestion for the page closes the popup and hands the prompt to the deepen accordion through the viewer prompt store (it expands, scrolls into view and prefills), one for the lesson opens Preguntas with the prompt prefilled; "Tomar apunte" and the checklist note open Notas. Preguntas: QuestionsPanel (LESSON/MODULE). Notas: LessonNotesPanel anchored to the page (autosave, "Analizar mis notas con IA"). Depends on React, MUI (Dialog, IconButton, icons), @shared/lib (tab-list keyboard, class names), useTutorPromptStore, the suggestion entity, SuggestionsPanel, QuestionsPanel, LessonNotesPanel and the popup CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CloseIcon from "@mui/icons-material/Close";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { useId, useMemo, useState } from "react";
import { cx } from "@shared/lib/class-names";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import type { LessonPage } from "../../entities/lesson.entity";
import { buildTutorSuggestions } from "../../entities/tutor-suggestions";
import type { TutorPromptTarget } from "../../entities/tutor-suggestions";
import { useTutorPromptStore } from "../../hooks/use-tutor-prompt";
import { LessonNotesPanel } from "../notes/lesson-notes-panel";
import { QuestionsPanel } from "./questions-panel";
import { SuggestionsPanel } from "./suggestions-panel";
import styles from "../../../UI/tutor-popup.module.css";

export type TutorTab = "suggestions" | "questions" | "notes";

const TABS: readonly TutorTab[] = ["suggestions", "questions", "notes"];

// TODO(i18n): move to a learning namespace in src/i18n.
export const TUTOR_POPUP_COPY = {
  title: "TutorAI",
  close: "Cerrar TutorAI",
  tabsLabel: "Secciones de TutorAI",
  tabs: { suggestions: "Sugerencias", questions: "Preguntas", notes: "Notas" },
} as const;

export type TutorContext = {
  moduleId: string
  lessonId: string
  // Visible Page; null while it loads or when the lesson has no Pages.
  pageId: string | null
  pageTitle: string | null
  lessonTitle: string | null
  // Ordered Pages of the lesson, to resolve note anchors to page numbers.
  pages: readonly LessonPage[] | null
  // The lesson is completed and the student is on its last page.
  postLesson: boolean
};

export type TutorPopupProps = TutorContext & {
  open: boolean
  onClose: () => void
};

export function TutorPopup({ open, onClose, moduleId, lessonId, pageId, pageTitle, lessonTitle, pages, postLesson }: TutorPopupProps) {
  const titleId = useId();
  const baseId = useId();
  const store = useTutorPromptStore();
  const [tab, setTab] = useState<TutorTab>("suggestions");
  const [visited, setVisited] = useState<ReadonlySet<TutorTab>>(() => new Set<TutorTab>(["suggestions"]));
  const suggestions = useMemo(() => buildTutorSuggestions({ pageTitle, lessonTitle, postLesson }), [pageTitle, lessonTitle, postLesson]);

  const select = (next: TutorTab) => {
    setTab(next);
    setVisited((current) => (current.has(next) ? current : new Set([...current, next])));
  };

  const keyboard = useTabListKeyboard(TABS, tab, select);

  const handlePrompt = (target: TutorPromptTarget, prompt: string) => {
    store?.request(target, prompt);

    if (target === "deepen") {
      onClose();
    } else {
      select("questions");
    }
  };

  const tabId = (item: TutorTab) => `${baseId}-tab-${item}`;
  const panelId = (item: TutorTab) => `${baseId}-panel-${item}`;

  const renderPanel = (item: TutorTab) => {
    if (item === "suggestions") {
      return (
        <SuggestionsPanel
          suggestions={suggestions}
          lessonId={lessonId}
          pageId={pageId}
          lessonTitle={lessonTitle}
          onPrompt={handlePrompt}
          onOpenNotes={() => select("notes")}
        />
      );
    }

    if (item === "questions") {
      return <QuestionsPanel moduleId={moduleId} lessonId={lessonId} currentPageId={pageId} />;
    }

    return <LessonNotesPanel moduleId={moduleId} lessonId={lessonId} currentPageId={pageId} pages={pages} />;
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} classes={{ container: cx(styles.container), paper: cx(styles.paper) }}>
      <div className={cx(styles.header)}>
        <h2 id={titleId} className={cx(styles.title)}>
          <SmartToyIcon color="primary" aria-hidden="true" />
          {TUTOR_POPUP_COPY.title}
        </h2>
        <IconButton aria-label={TUTOR_POPUP_COPY.close} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      <div role="tablist" aria-label={TUTOR_POPUP_COPY.tabsLabel} className={cx(styles.tabList)} onKeyDown={keyboard.onKeyDown}>
        {TABS.map((item) => (
          <button
            key={item}
            ref={keyboard.registerTab(item)}
            id={tabId(item)}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={panelId(item)}
            tabIndex={tab === item ? 0 : -1}
            className={cx(styles.tab)}
            onClick={() => select(item)}
          >
            {TUTOR_POPUP_COPY.tabs[item]}
          </button>
        ))}
      </div>
      {TABS.map((item) => (
        <div key={item} id={panelId(item)} role="tabpanel" aria-labelledby={tabId(item)} hidden={tab !== item} className={cx(styles.tabPanel)}>
          {visited.has(item) ? renderPanel(item) : null}
        </div>
      ))}
    </Dialog>
  );
}
