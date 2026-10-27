/*
* Funcionalidad: Legacy redirects
* Descripción: Single list of the redirects from the legacy routes to the new ones, consumed by next.config.mjs `redirects()` (served by Next before any page renders) and unit tested in src/shared/session/legacy-redirects.test.ts. Replaces the redirect-only pages (pages/simulador, pages/panel/**, pages/evaluation/**, pages/teaching/**) and their modules (shared/session/legacy-redirects.ts, ventilator-lab legacy-redirects.ts, evaluations legacy-redirects.ts and LegacyEvaluationRedirect, learning resolveLegacyLessonUrl). Next applies the first matching rule, so the specific /evaluation/* rules come before /evaluation/:activityId and the /teaching rule with both lesson query values comes before the bare /teaching. Next passes the request query through to the destination. No dependencies. v1.1 (W1 Bloque 1): /simulador is the unified simulator workspace (home of every role), so the old /simulador → /lab rule is removed (it would loop); /simulator → /simulador?tab=simular, /lab → /simulador?tab=conexion and /lab/live → /simulador?tab=monitoreo, exact paths only (the case editor /simulator/cases/**, the session pages /simulator/sessions/**, /lab/reservations and /lab/recordings/** keep their pages). The destination `tab` wins over a request `tab`; any other query value passes through (the old /lab/live read no query).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// Temporary (307) until after the thesis defense; then switch to permanent (308).
const permanent = false;

// Legacy lesson URLs had no page in the URL, so they land on page 1 of the same lesson.
const LESSON_PAGE_1 = "/learn/modules/:moduleId/lessons/:lessonId/1";

/** @type {ReadonlyArray<{ source: string, destination: string, permanent: false, has?: Array<{ type: "query", key: string, value: string }> }>} */
export const LEGACY_REDIRECTS = Object.freeze([
  // Unified simulator workspace (W1): the catalog and the lab pages became tabs of /simulador.
  { source: "/simulator", destination: "/simulador?tab=simular", permanent },
  { source: "/lab", destination: "/simulador?tab=conexion", permanent },
  { source: "/lab/live", destination: "/simulador?tab=monitoreo", permanent },
  // Staff panel: replaced by the teacher dashboard and the admin console.
  { source: "/panel", destination: "/teacher", permanent },
  { source: "/panel/students", destination: "/teacher", permanent },
  { source: "/panel/students/:id", destination: "/teacher/students/:id", permanent },
  { source: "/panel/admin", destination: "/admin/users", permanent },
  { source: "/panel/settings", destination: "/admin/settings", permanent },
  // Activities/quizzes: legacy activity ids do not exist in the new evaluation model.
  { source: "/evaluation", destination: "/evaluations", permanent },
  { source: "/evaluation/manage", destination: "/evaluations/manage", permanent },
  { source: "/evaluation/manage/new", destination: "/evaluations/manage/new", permanent },
  { source: "/evaluation/manage/:activityId/edit", destination: "/evaluations/manage", permanent },
  { source: "/evaluation/grade", destination: "/grading", permanent },
  { source: "/evaluation/grade/:activityId", destination: "/grading", permanent },
  { source: "/evaluation/:activityId", destination: "/evaluations", permanent },
  // Teaching module: lessons moved to /learn.
  { source: "/teaching/:moduleId/:lessonId", destination: LESSON_PAGE_1, permanent },
  {
    source: "/teaching",
    has: [
      { type: "query", key: "moduleId", value: "(?<moduleId>.+)" },
      { type: "query", key: "lessonId", value: "(?<lessonId>.+)" },
    ],
    destination: LESSON_PAGE_1,
    permanent,
  },
  { source: "/teaching", destination: "/learn", permanent },
]);
