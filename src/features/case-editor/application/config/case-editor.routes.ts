/*
* Funcionalidad: Case editor routes
* Descripción: URLs of the case editor pages (teachers and admins): the case list /simulator/cases, the new case
*   /simulator/cases/new and the editor /simulator/cases/[id]/edit. The session route table (routes.config) declares
*   the same routes with their roles. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const CASES_URL = "/simulator/cases";
export const NEW_CASE_URL = "/simulator/cases/new";

export function buildCaseEditUrl(caseId: string): string {
  return `/simulator/cases/${encodeURIComponent(caseId)}/edit`;
}
