/*
* Funcionalidad: evaluations public API
* Descripción: Public surface of the student evaluations feature for pages and other features: EvaluationsListPage (thin route pages/evaluations), EvaluationIntroPage (thin route pages/evaluations/[evaluationId]), the URL builders of the student evaluation routes, the entities and labels, the RichTextView and the attempt/grade badges (reused by the attempt player, the result page and the authoring preview), and the realtime refresh hook. Depends on the evaluations application layer. v1.1 (E2): AttemptPlayerPage (thin route pages/evaluations/[evaluationId]/attempts/[attemptId]); QuestionView and the per-type question components with their props (readOnly mode reused by the authoring preview); PracticalQuestionSlot and registerPracticalQuestionRenderer, the extension point a future simulator feature uses to render SIMULATION questions.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { AttemptStatusBadge, GradeBadge } from "./application/components/attempt-badges";
export { MultipleChoiceQuestion } from "./application/components/questions/multiple-choice-question";
export { OpenTextQuestion } from "./application/components/questions/open-text-question";
export { PracticalQuestionSlot } from "./application/components/questions/practical-question-slot";
export { QuestionView } from "./application/components/questions/question-view";
export { SingleChoiceQuestion } from "./application/components/questions/single-choice-question";
export type { SingleChoiceQuestionProps } from "./application/components/questions/single-choice-question";
export { TrueFalseQuestion } from "./application/components/questions/true-false-question";
export { RichTextView } from "./application/components/rich-text-view";
export type { RichTextViewProps } from "./application/components/rich-text-view";
export type {
  AttemptAnswer,
  AttemptDetail,
  AttemptOption,
  AttemptQuestion,
  AttemptResult,
  AttemptScenario,
  AttemptStatus,
  AttemptSummary,
  EvaluationMedia,
  EvaluationState,
  EvaluationType,
  MyEvaluation,
  MyGrade,
  QuestionType,
  RichText,
} from "./application/entities/evaluation.entity";
export { EVALUATION_TYPES } from "./application/entities/evaluation.entity";
export { OPEN_TEXT_MAX_LENGTH } from "./application/entities/attempt-progress";
export type { PracticalQuestionRendererProps, QuestionViewProps } from "./application/entities/practical-question-renderer";
export { registerPracticalQuestionRenderer } from "./application/entities/practical-question-renderer";
export { ATTEMPT_STATUS_LABELS, EVALUATION_TYPE_LABELS } from "./application/entities/evaluation-labels";
export {
  buildAttemptResultUrl,
  buildAttemptUrl,
  buildEvaluationIntroUrl,
  EVALUATIONS_URL,
} from "./application/entities/evaluations-urls";
export { useEvaluationsRealtime } from "./application/hooks/use-evaluations-realtime";
export { AttemptPlayerPage } from "./application/pages/attempt-player.page";
export type { AttemptPlayerPageProps } from "./application/pages/attempt-player.page";
export { EvaluationIntroPage } from "./application/pages/evaluation-intro.page";
export type { EvaluationIntroPageProps } from "./application/pages/evaluation-intro.page";
export { EvaluationsListPage } from "./application/pages/evaluations-list.page";
