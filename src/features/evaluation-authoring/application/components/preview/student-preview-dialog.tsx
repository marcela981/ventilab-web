/*
* Funcionalidad: StudentPreviewDialog
* Descripción: Full-screen "Vista previa como estudiante" of the evaluation builder. Shows the saved evaluation exactly as the attempt player renders it, with the components of @features/evaluations: the question navigator, the sticky clinical scenario of the current question (ScenarioPanel), the question (QuestionView in readOnly mode, which renders the PracticalQuestionSlot for SIMULATION questions) and Anterior/Siguiente. Nothing can be answered and no correct answer, explanation or rubric is shown (the preview mapper drops them). When the builder has unsaved changes a notice says the preview shows the last saved version. Loading and error-with-retry states. Loaded on demand by the builder page. Depends on MUI, the @features/evaluations barrel, the design-system components, @shared/lib, the preview hook and the preview CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import { useId, useState } from "react";
import {
  clampQuestionIndex,
  findScenario,
  QuestionNavigator,
  QuestionView,
  RichTextView,
  ScenarioPanel,
} from "@features/evaluations";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { getAuthoringErrorMessage } from "../../entities/evaluation-authoring-error-messages";
import { useStudentPreview } from "../../hooks/use-student-preview";
import styles from "../../../UI/preview.module.css";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const PREVIEW_COPY = {
  title: (evaluationTitle: string) => `Vista previa como estudiante: ${evaluationTitle}`,
  loadingTitle: "Vista previa como estudiante",
  close: "Cerrar vista previa",
  readOnlyNotice: "Así verá el estudiante la evaluación. En la vista previa no se puede responder.",
  unsavedNotice: "Tienes cambios sin guardar: la vista previa muestra la última versión guardada.",
  loading: "Cargando la vista previa…",
  loadError: "No se pudo cargar la vista previa",
  empty: "La evaluación todavía no tiene preguntas.",
  questionPosition: (position: number, total: number) => `Pregunta ${position} de ${total}`,
  points: (points: number) => `${points} ${points === 1 ? "punto" : "puntos"}`,
  previous: "Anterior",
  next: "Siguiente",
} as const;

const NO_ANSWERS = {};
const NO_MARKS: ReadonlySet<string> = new Set();
const ignoreChange = (): void => undefined;

export type StudentPreviewDialogProps = {
  evaluationId: string
  // The builder has unsaved changes: the preview shows the saved version.
  dirty: boolean
  onClose: () => void
};

export function StudentPreviewDialog({ evaluationId, dirty, onClose }: StudentPreviewDialogProps) {
  const { preview, isLoading, error, reload } = useStudentPreview(evaluationId);
  const [index, setIndex] = useState(0);
  const titleId = useId();

  const questions = preview?.questions ?? [];
  const total = questions.length;
  const current = clampQuestionIndex(index, total);
  const question = questions[current];
  const scenario = preview ? findScenario(preview.scenarios, question) : null;

  const renderBody = () => {
    if (!preview) {
      if (error && !isLoading) {
        return <ErrorState title={PREVIEW_COPY.loadError} description={getAuthoringErrorMessage(error)} onRetry={() => void reload()} />;
      }

      return <LoadingState label={PREVIEW_COPY.loading} />;
    }

    if (!question) {
      return <p>{PREVIEW_COPY.empty}</p>;
    }

    return (
      <div className={cx(styles.body)}>
        <QuestionNavigator
          questions={questions}
          answers={NO_ANSWERS}
          marked={NO_MARKS}
          currentIndex={current}
          onSelect={(next) => setIndex(clampQuestionIndex(next, total))}
        />
        <div className={cx(styles.content, scenario && styles.contentWithScenario)}>
          {scenario ? <ScenarioPanel scenario={scenario} /> : null}
          <section className={cx(styles.questionCard)} aria-label={PREVIEW_COPY.questionPosition(current + 1, total)}>
            <div className={cx(styles.questionHeader)}>
              <h3 className={cx(styles.questionTitle)}>{PREVIEW_COPY.questionPosition(current + 1, total)}</h3>
              <span className={cx(styles.questionPoints)}>{PREVIEW_COPY.points(question.points)}</span>
            </div>
            <QuestionView key={question.id} question={question} answer={null} onChange={ignoreChange} readOnly />
            <div className={cx(styles.pager)}>
              <Button variant="outlined" disabled={current === 0} onClick={() => setIndex(current - 1)}>
                {PREVIEW_COPY.previous}
              </Button>
              <Button variant="outlined" disabled={current >= total - 1} onClick={() => setIndex(current + 1)}>
                {PREVIEW_COPY.next}
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <Dialog open fullScreen onClose={onClose} aria-labelledby={titleId}>
      <div className={cx(styles.toolbar)}>
        <h2 id={titleId} className={cx(styles.toolbarTitle)}>
          {preview ? PREVIEW_COPY.title(preview.title) : PREVIEW_COPY.loadingTitle}
        </h2>
        <Button variant="contained" onClick={onClose}>{PREVIEW_COPY.close}</Button>
      </div>
      <div className={cx(styles.main)}>
        <Alert severity="info">{PREVIEW_COPY.readOnlyNotice}</Alert>
        {dirty ? <Alert severity="warning">{PREVIEW_COPY.unsavedNotice}</Alert> : null}
        {preview?.description ? <RichTextView value={preview.description} /> : null}
        {renderBody()}
      </div>
    </Dialog>
  );
}
