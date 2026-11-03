/*
* Funcionalidad: Staff evaluation hub tabs
* Descripción: Tabs of the staff evaluation hub at /evaluations (DISENO_BLOQUE3 §2.6): Gestionar (authoring list, default), Calificar (grading queue) and Resultados (results per evaluation), read from `?tab=gestionar|calificar|resultados`, with their Spanish labels and the URLs that open each tab (also the destinations of the redirected /evaluations/manage and /grading). Also the results link of one evaluation in the unified grading screen. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const STAFF_HUB_TABS = ["gestionar", "calificar", "resultados"] as const;
export type StaffHubTab = (typeof STAFF_HUB_TABS)[number];
export const DEFAULT_STAFF_HUB_TAB: StaffHubTab = "gestionar";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const STAFF_HUB_TAB_LABELS: Record<StaffHubTab, string> = {
  gestionar: "Gestionar",
  calificar: "Calificar",
  resultados: "Resultados",
};

export function staffHubUrl(tab: StaffHubTab): string {
  return `/evaluations?tab=${tab}`;
}

export function buildEvaluationResultsUrl(evaluationId: string): string {
  return `/grading/evaluations/${encodeURIComponent(evaluationId)}?tab=estadisticas`;
}
