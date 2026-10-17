/*
* Funcionalidad: My grade entity
* Descripción: One published grade of the caller (`GET /api/my-evaluations/grades`): evaluation, type, attempt, grade on the 0.0–5.0 scale, points and the `passed` flag exactly as the API returns them. The type filter only selects rows of the full, unpaginated list the endpoint returns (display filtering; no grade, average or statistic is computed on the client). BACKEND GAP: the grade carries no module, so /me/grades cannot filter by module. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type EvaluationType = "EXAM" | "QUIZ" | "WORKSHOP";

export type MyGrade = {
  attemptId: string
  attemptNumber: number
  evaluationId: string
  evaluationTitle: string
  evaluationType: EvaluationType
  grade: number
  passed: boolean
  publishedAt: string
  score: number | null
  maxScore: number | null
};

export type GradeTypeFilter = EvaluationType | "ALL";

export const GRADE_TYPE_FILTERS: readonly GradeTypeFilter[] = ["ALL", "EXAM", "QUIZ", "WORKSHOP"];

export function filterGradesByType(grades: readonly MyGrade[], type: GradeTypeFilter): MyGrade[] {
  return type === "ALL" ? [...grades] : grades.filter((grade) => grade.evaluationType === type);
}
