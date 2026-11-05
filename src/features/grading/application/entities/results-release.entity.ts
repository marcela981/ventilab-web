/*
* Funcionalidad: Results release rules
* Descripción: Pure rules of the teacher release of an attempt's results (DISENO_AJUSTES_C §2.1, §2.4): the two scopes the hub sends to the publish endpoints (GRADE: score, grade and passed only; GRADE_AND_ANSWERS: also the correct answers, explanations, rubrics, per-question points and AI feedback), the release state of an attempt from its two marks (gradePublishedAt, answersReleasedAt: "Sin liberar", "Nota liberada", "Nota y respuestas liberadas") and the scopes still available for an attempt (a GRADED attempt that is not legacy; once the grade is released only the answers remain; nothing can be "unreleased"). No dependencies. v1.0 (ajustes C1).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const RELEASE_SCOPES = ["GRADE", "GRADE_AND_ANSWERS"] as const;
export type ReleaseScope = (typeof RELEASE_SCOPES)[number];

export type ReleaseState = "none" | "grade" | "full";

export type ReleaseMarks = {
  gradePublishedAt: string | null
  answersReleasedAt: string | null
};

// The answers release implies the grade (the server never releases the answers alone).
export function releaseStateOf(marks: ReleaseMarks): ReleaseState {
  if (marks.answersReleasedAt !== null) {
    return "full";
  }

  return marks.gradePublishedAt === null ? "none" : "grade";
}

// TODO(i18n): move to a grading namespace in src/i18n.
export const RELEASE_STATE_LABELS: Record<ReleaseState, string> = {
  none: "Sin liberar",
  grade: "Nota liberada",
  full: "Nota y respuestas liberadas",
};

type Releasable = ReleaseMarks & { status: string, legacy: boolean };

// GRADED attempts only (the server leaves out attempts in progress or pending review); legacy attempts are read-only.
export function canRelease(attempt: Releasable, scope: ReleaseScope): boolean {
  if (attempt.status !== "GRADED" || attempt.legacy) {
    return false;
  }

  return scope === "GRADE" ? releaseStateOf(attempt) === "none" : releaseStateOf(attempt) !== "full";
}
