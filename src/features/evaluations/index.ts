/*
* Funcionalidad: evaluations public API
* Descripción: Public surface of the student evaluations feature for pages and other features: EvaluationsListPage (thin route pages/evaluations), EvaluationIntroPage (thin route pages/evaluations/[evaluationId]), the URL builders of the student evaluation routes, the entities and labels, the RichTextView and the attempt/grade badges (reused by the attempt player, the result page and the authoring preview), and the realtime refresh hook. Depends on the evaluations application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { AttemptStatusBadge, GradeBadge } from "./application/components/attempt-badges";
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
export { ATTEMPT_STATUS_LABELS, EVALUATION_TYPE_LABELS } from "./application/entities/evaluation-labels";
export {
  buildAttemptResultUrl,
  buildAttemptUrl,
  buildEvaluationIntroUrl,
  EVALUATIONS_URL,
} from "./application/entities/evaluations-urls";
export { useEvaluationsRealtime } from "./application/hooks/use-evaluations-realtime";
export { EvaluationIntroPage } from "./application/pages/evaluation-intro.page";
export type { EvaluationIntroPageProps } from "./application/pages/evaluation-intro.page";
export { EvaluationsListPage } from "./application/pages/evaluations-list.page";
