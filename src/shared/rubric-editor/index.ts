/*
* Funcionalidad: rubric-editor public API
* Descripción: Public surface of the shared rubric editors. The parameter rubric editor (ventilator parameter vs.
*   expected value, used by the SIMULATION questions of the evaluation builder) with its pure rules, draft helpers,
*   labels and copy, promoted unchanged from evaluation-authoring; and the outcome rubric editor of a clinical case
*   `defaultRubric` (criteria with weight, threshold, window and penalty, assistance policy and passing score) with its
*   validation mirroring the backend and its draft helpers. v1.1: the weight 0 hint. Depends on the module's application files only. v1.2 (B4, D7): parseRubricNumber is no longer exported (numbers go through @shared/lib/parse-decimal).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { ParameterRubricEditor } from "./application/parameter-rubric-editor";
export type { ParameterRubricEditorProps } from "./application/parameter-rubric-editor";
export {
  addCriterionDraft,
  DEFAULT_RUBRIC_PRIORITY,
  emptyRubricDraft,
  isNumericParameter,
  isTextParameter,
  parseBackendRubricError,
  removeCriterionDraft,
  RUBRIC_NUMERIC_PARAMETERS,
  RUBRIC_PARAMETER_LABELS,
  RUBRIC_PARAMETERS,
  RUBRIC_PRIORITIES,
  RUBRIC_PRIORITY_LABELS,
  RUBRIC_TEXT_PARAMETERS,
  rubricDraftFrom,
  rubricDraftIssues,
  rubricIssueMessage,
  sameRubric,
  toRubricValue,
  updateCriterionDraft,
  validateSimulationRubric,
} from "./application/parameter-rubric.entity";
export type {
  CriterionDraft,
  RubricDraft,
  RubricIssue,
  RubricIssueCode,
  RubricNumericParameter,
  RubricParameter,
  RubricPriority,
  RubricTextParameter,
  RubricValidation,
} from "./application/parameter-rubric.entity";
export { OutcomeRubricEditor } from "./application/outcome-rubric-editor";
export type { OutcomeRubricEditorProps } from "./application/outcome-rubric-editor";
export {
  addOutcomeCriterion,
  criterionUsesPenalty,
  criterionUsesWindow,
  emptyOutcomeRubricDraft,
  isOutcomeAssistancePolicy,
  isOutcomeCriterionType,
  moveOutcomeCriterion,
  OUTCOME_ASSISTANCE_POLICIES,
  OUTCOME_CRITERION_LABELS,
  OUTCOME_CRITERION_TYPES,
  OUTCOME_POLICY_LABELS,
  OUTCOME_RUBRIC_TOTAL_WEIGHT,
  OUTCOME_RUBRIC_WEIGHT_TOLERANCE,
  OUTCOME_THRESHOLD_LABELS,
  outcomeRubricDraftFrom,
  outcomeRubricDraftIssues,
  outcomeRubricIssueMessage,
  outcomeWeightTotal,
  outcomeWeightZeroHint,
  removeOutcomeCriterion,
  toOutcomeRubricValue,
  updateOutcomeCriterion,
  usedOutcomeTypes,
  validateOutcomeRubric,
  weightTotalMatches,
} from "./application/outcome-rubric.entity";
export type {
  OutcomeAssistancePolicy,
  OutcomeCriterionDraft,
  OutcomeCriterionType,
  OutcomeRubric,
  OutcomeRubricCriterion,
  OutcomeRubricDraft,
  OutcomeRubricField,
  OutcomeRubricIssue,
  OutcomeRubricIssueCode,
} from "./application/outcome-rubric.entity";
export { OUTCOME_RUBRIC_COPY, PARAMETER_RUBRIC_COPY } from "./application/rubric-editor-copy";
