/*
* Funcionalidad: Legacy evaluation redirects
* Descripción: R1: maps each legacy /evaluation/** Next pathname pattern (old Activity/Quiz/Submission screens) to its new route: the student list (/evaluations), the authoring list or builder (/evaluations/manage, /evaluations/manage/new) and the grading queue (/grading). Legacy activity ids do not exist in the new evaluation model, so dynamic legacy routes land on the matching list. Query strings are never carried over. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const LEGACY_EVALUATION_REDIRECTS = {
  "/evaluation": "/evaluations",
  "/evaluation/[activityId]": "/evaluations",
  "/evaluation/manage": "/evaluations/manage",
  "/evaluation/manage/new": "/evaluations/manage/new",
  "/evaluation/manage/[activityId]/edit": "/evaluations/manage",
  "/evaluation/grade": "/grading",
  "/evaluation/grade/[activityId]": "/grading",
} as const;

export type LegacyEvaluationRoute = keyof typeof LEGACY_EVALUATION_REDIRECTS;

const FALLBACK_REDIRECT = "/evaluations";

export function isLegacyEvaluationRoute(pathname: string): pathname is LegacyEvaluationRoute {
  return Object.prototype.hasOwnProperty.call(LEGACY_EVALUATION_REDIRECTS, pathname);
}

// Resolves a legacy Next pathname pattern (not a concrete path) to its new route.
// Unknown patterns fall back to the student list.
export function resolveLegacyEvaluationRedirect(pathname: string): string {
  return isLegacyEvaluationRoute(pathname) ? LEGACY_EVALUATION_REDIRECTS[pathname] : FALLBACK_REDIRECT;
}
