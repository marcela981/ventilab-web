/*
* Funcionalidad: evaluations public API
* Descripción: Public surface of the student evaluations feature for pages and other features: EvaluationsListPage (thin route pages/evaluations), EvaluationIntroPage (thin route pages/evaluations/[evaluationId]), the URL builders of the student evaluation routes, the entities and labels, the RichTextView and the attempt/grade badges (reused by the attempt player, the result page and the authoring preview), and the realtime refresh hook. Depends on the evaluations application layer. v1.1 (E2): AttemptPlayerPage (thin route pages/evaluations/[evaluationId]/attempts/[attemptId]); QuestionView and the per-type question components with their props (readOnly mode reused by the authoring preview); PracticalQuestionSlot and registerPracticalQuestionRenderer, the extension point a future simulator feature uses to render SIMULATION questions. v1.2 (E3): AttemptResultPage (thin route pages/evaluations/[evaluationId]/attempts/[attemptId]/result). v1.3 (A4): the attempt player pieces reused by the authoring student preview: QuestionNavigator, ScenarioPanel, findScenario/clampQuestionIndex, and toRichText (the rich text normalization of the student mapper). v1.4 (R1): LegacyEvaluationRedirect and the legacy redirect mapping (resolveLegacyEvaluationRedirect, LEGACY_EVALUATION_REDIRECTS) used by the legacy pages/evaluation/** routes. v1.5 (B3.8, D5): the legacy /evaluation/** redirects moved to config/legacy-redirects.mjs (next.config redirects); LegacyEvaluationRedirect and the mapping are gone.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { toRichText } from "./api/mappers/evaluations.mapper";
export { QuestionNavigator } from "./application/components/attempt/question-navigator";
export type { QuestionNavigatorProps } from "./application/components/attempt/question-navigator";
export { ScenarioPanel } from "./application/components/attempt/scenario-panel";
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
export { clampQuestionIndex, findScenario, OPEN_TEXT_MAX_LENGTH } from "./application/entities/attempt-progress";
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
export { AttemptResultPage } from "./application/pages/attempt-result.page";
export type { AttemptResultPageProps } from "./application/pages/attempt-result.page";
export { EvaluationIntroPage } from "./application/pages/evaluation-intro.page";
export type { EvaluationIntroPageProps } from "./application/pages/evaluation-intro.page";
export { EvaluationsListPage } from "./application/pages/evaluations-list.page";
