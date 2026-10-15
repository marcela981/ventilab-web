/*
* Funcionalidad: Evaluation authoring feature barrel
* Descripción: Public surface of the evaluation authoring feature (teachers and admins): the EvaluationsManagePage of /evaluations/manage and the URL builders of the authoring routes. The only import surface for pages and other features. Depends on the authoring pages and entities.
* Versión: 1.0
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
export { EvaluationsManagePage } from "./application/pages/evaluations-manage.page";
