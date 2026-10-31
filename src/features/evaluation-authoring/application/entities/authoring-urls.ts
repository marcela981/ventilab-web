/*
* Funcionalidad: Evaluation authoring URLs
* Descripción: URL builders of the evaluation authoring routes: the list (/evaluations/manage), a new evaluation (/evaluations/manage/new), the editor (/evaluations/manage/[id]/edit) and the activations (/evaluations/manage/[id]/assignments). Ids are URL-encoded. No dependencies. v1.1 (Bloque 3): EVALUATIONS_LIST_URL is the Gestionar tab of the staff hub; buildEvaluationAssignmentsUrl opens the builder on its "Asignación a grupos" section (?section=asignacion).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const EVALUATIONS_MANAGE_URL = "/evaluations/manage";
export const NEW_EVALUATION_URL = `${EVALUATIONS_MANAGE_URL}/new`;
// The authoring list is the Gestionar tab of the staff evaluation hub (/evaluations/manage redirects there).
export const EVALUATIONS_LIST_URL = "/evaluations?tab=gestionar";

const segment = (value: string): string => encodeURIComponent(value);

export function buildEvaluationEditUrl(evaluationId: string): string {
  return `${EVALUATIONS_MANAGE_URL}/${segment(evaluationId)}/edit`;
}

// The assignments are the "Asignación a grupos" section of the builder.
export function buildEvaluationAssignmentsUrl(evaluationId: string): string {
  return `${buildEvaluationEditUrl(evaluationId)}?section=asignacion`;
}
