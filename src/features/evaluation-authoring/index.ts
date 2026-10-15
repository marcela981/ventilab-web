/*
* Funcionalidad: Evaluation authoring feature barrel
* Descripción: Public surface of the evaluation authoring feature (teachers and admins): the EvaluationsManagePage of /evaluations/manage and the URL builders of the authoring routes. The only import surface for pages and other features. Depends on the authoring pages and entities. v1.1 (A2): exports the EvaluationBuilderPage of /evaluations/manage/new and /evaluations/manage/[id]/edit. v1.2 (A3): the builder page is exported through its lazy entry point (lazy-builder-page) so the list route does not bundle the builder, Tiptap, drag and drop or the learning curriculum code.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  buildEvaluationAssignmentsUrl,
  buildEvaluationEditUrl,
  EVALUATIONS_MANAGE_URL,
  NEW_EVALUATION_URL,
} from "./application/entities/authoring-urls";
export { EvaluationBuilderPage } from "./application/pages/lazy-builder-page";
export type { EvaluationBuilderPageProps } from "./application/pages/evaluation-builder.page";
export { EvaluationsManagePage } from "./application/pages/evaluations-manage.page";
