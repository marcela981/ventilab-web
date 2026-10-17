/*
* Funcionalidad: Student risk highlight
* Descripción: Pure rule of the risk highlight of the teacher dashboard (decision 3 of odd/tasks/operation.md): a student is highlighted only when the API data says so, that is when any published evaluation of the dashboard row (`grades.evaluations[]`) has `passed === false`. The average grade is never compared against a threshold because the dashboard row carries no passingGrade (BACKEND GAP); no progress threshold exists, so none is invented. Depends on nothing at runtime.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type RiskInput = {
  evaluations: ReadonlyArray<{ evaluationId: string, evaluationTitle: string, passed: boolean }>
};

export type StudentRisk = {
  atRisk: boolean
  failedEvaluationTitles: string[]
};

export function assessStudentRisk(row: RiskInput): StudentRisk {
  const failed = row.evaluations.filter((evaluation) => evaluation.passed === false);

  return { atRisk: failed.length > 0, failedEvaluationTitles: failed.map((evaluation) => evaluation.evaluationTitle) };
}
