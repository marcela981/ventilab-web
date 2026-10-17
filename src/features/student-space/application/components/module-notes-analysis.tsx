/*
* Funcionalidad: ModuleNotesAnalysis
* Descripción: "Analizar mis notas con IA" for one module of /me/notes: the same flow and presentation as the lesson analysis of the learning feature (button with pending state, error alert, summary, key concepts, gaps and suggestions) over `POST /api/notes/analyze` with the moduleId, rated with the shared AiRatingWidget (target NOTES_ANALYSIS, the AI call id). Depends on MUI, @shared/ai-rating, the design-system async button, the module analysis hook and error messages and the student space CSS Module.
* Versión: 1.0
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
import { getModuleAnalysisErrorMessage } from "../entities/student-space-error-messages";
import { useModuleNotesAnalysis } from "../hooks/use-module-notes-analysis";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const MODULE_ANALYSIS_COPY = {
  analyze: "Analizar mis notas con IA",
  analyzeModule: (moduleTitle: string) => `Analizar mis notas del módulo ${moduleTitle} con IA`,
  title: (moduleTitle: string) => `Análisis de tus notas de ${moduleTitle}`,
  keyConcepts: "Conceptos clave",
  gaps: "Vacíos",
  suggestions: "Sugerencias",
} as const;

export type ModuleNotesAnalysisProps = {
  moduleId: string
  moduleTitle: string
};

function AnalysisList({ title, items }: { title: string, items: readonly string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className={cx(styles.subTitle)}>{title}</h4>
      <ul className={cx(styles.analysisList)}>
        {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
    </div>
  );
}

export function ModuleNotesAnalysis({ moduleId, moduleTitle }: ModuleNotesAnalysisProps) {
  const titleId = useId();
  const { analysis, error, isAnalyzing, analyze } = useModuleNotesAnalysis(moduleId);

  return (
    <div className={cx(styles.analysis)}>
      <AsyncButton
        variant="outlined"
        size="small"
        startIcon={<AutoAwesomeIcon />}
        loading={isAnalyzing}
        aria-label={MODULE_ANALYSIS_COPY.analyzeModule(moduleTitle)}
        onClick={analyze}
      >
        {MODULE_ANALYSIS_COPY.analyze}
      </AsyncButton>
      {error ? <Alert severity="error">{getModuleAnalysisErrorMessage(error)}</Alert> : null}
      {analysis ? (
        <section aria-labelledby={titleId} className={cx(styles.analysisResult)}>
          <h4 id={titleId} className={cx(styles.lessonTitle)}>{MODULE_ANALYSIS_COPY.title(moduleTitle)}</h4>
          <p className={cx(styles.excerpt)}>{analysis.summary}</p>
          <AnalysisList title={MODULE_ANALYSIS_COPY.keyConcepts} items={analysis.keyConcepts} />
          <AnalysisList title={MODULE_ANALYSIS_COPY.gaps} items={analysis.gaps} />
          <AnalysisList title={MODULE_ANALYSIS_COPY.suggestions} items={analysis.suggestions} />
          <AiRatingWidget key={analysis.aiCallId} targetType="NOTES_ANALYSIS" targetId={analysis.aiCallId} initialRating={null} />
        </section>
      ) : null}
    </div>
  );
}
