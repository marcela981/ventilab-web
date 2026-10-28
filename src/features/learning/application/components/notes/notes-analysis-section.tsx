/*
* Funcionalidad: NotesAnalysisSection
* Descripción: "Analizar mis notas con IA" block of the notes panel: runs the AI analysis of the caller's notes of the lesson (useNotesAnalysis, slow timeout), shows its error (no notes, 429 with the wait, AI service unavailable or failing, network) and the result: summary, key concepts, gaps and suggestions, plus the shared "¿Te fue útil?" widget rating the analysis (targetType NOTES_ANALYSIS, targetId = the returned aiCallId; a fresh analysis has no rating yet). Depends on MUI, @shared/design-system (AsyncButton), @shared/ai-rating, useNotesAnalysis, the notes error messages and the notes CSS Module. v1.1 (L5/L6): list items are keyed by index + text (LLM output may repeat an item). v1.2 (W7, Bloque 2): the rating sends surface NOTES_ANALYSIS and scope LESSON (the analysis covers the lesson notes).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Alert from "@mui/material/Alert";
import { useId } from "react";
import { AiRatingWidget } from "@shared/ai-rating";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { getNotesAnalysisErrorMessage } from "../../entities/notes-error-messages";
import { useNotesAnalysis } from "../../hooks/use-notes-analysis";
import styles from "../../../UI/notes-panel.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  analyze: "Analizar mis notas con IA",
  title: "Análisis de tus notas",
  keyConcepts: "Conceptos clave",
  gaps: "Vacíos",
  suggestions: "Sugerencias",
} as const;

export type NotesAnalysisSectionProps = {
  lessonId: string
  // False while the lesson has no notes: there is nothing to analyze.
  canAnalyze: boolean
};

function AnalysisList({ title, items }: { title: string, items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className={cx(styles.analysisHeading)}>{title}</h4>
      <ul className={cx(styles.analysisList)}>
        {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
    </div>
  );
}

export function NotesAnalysisSection({ lessonId, canAnalyze }: NotesAnalysisSectionProps) {
  const titleId = useId();
  const { analysis, error, isAnalyzing, analyze } = useNotesAnalysis(lessonId);

  return (
    <div className={cx(styles.analysis)}>
      <AsyncButton variant="outlined" startIcon={<AutoAwesomeIcon />} loading={isAnalyzing} disabled={!canAnalyze} onClick={analyze}>
        {COPY.analyze}
      </AsyncButton>
      {error ? <Alert severity="error">{getNotesAnalysisErrorMessage(error)}</Alert> : null}
      {analysis ? (
        <section aria-labelledby={titleId} className={cx(styles.analysisResult)}>
          <h3 id={titleId} className={cx(styles.sectionTitle)}>{COPY.title}</h3>
          <p className={cx(styles.summary)}>{analysis.summary}</p>
          <AnalysisList title={COPY.keyConcepts} items={analysis.keyConcepts} />
          <AnalysisList title={COPY.gaps} items={analysis.gaps} />
          <AnalysisList title={COPY.suggestions} items={analysis.suggestions} />
          <AiRatingWidget key={analysis.aiCallId} targetType="NOTES_ANALYSIS" targetId={analysis.aiCallId} initialRating={null} surface="NOTES_ANALYSIS" scope="LESSON" />
        </section>
      ) : null}
    </div>
  );
}
