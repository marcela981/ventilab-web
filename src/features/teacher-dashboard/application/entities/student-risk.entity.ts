/*
* Funcionalidad: Student risk highlight
* Descripción: Pure rule of the risk highlight of the teacher dashboard (decision 3 of odd/tasks/operation.md): a student is highlighted only when the API data says so, that is when any published evaluation of the dashboard row (`grades.evaluations[]`) has `passed === false`. The average grade is never compared against a threshold because the dashboard row carries no passingGrade (BACKEND GAP); no progress threshold exists, so none is invented. v1.1 (O3 review): per evaluation only the LATEST published attempt counts (selected by `publishedAt`, then `attemptNumber`; a selection, not a computation), so a student who failed and then passed a retake is not highlighted. v1.2 (review): the latest attempt is selected by `attemptNumber` first and `publishedAt` only as a tiebreak, so an earlier failed attempt re-published after a later passed one does not highlight the student. Depends on nothing at runtime.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

type RiskEvaluation = {
  evaluationId: string
  evaluationTitle: string
  passed: boolean
  publishedAt?: string | null
  attemptNumber?: number | null
};

export type RiskInput = {
  evaluations: ReadonlyArray<RiskEvaluation>
};

export type StudentRisk = {
  atRisk: boolean
  failedEvaluationTitles: string[]
};

function isLater(candidate: RiskEvaluation, current: RiskEvaluation): boolean {
  const candidateNumber = candidate.attemptNumber ?? 0;
  const currentNumber = current.attemptNumber ?? 0;

  if (candidateNumber !== currentNumber) {
    return candidateNumber > currentNumber;
  }

  // Same attempt number (or both missing): publishedAt breaks the tie. ISO-8601 UTC strings order lexicographically.
  return (candidate.publishedAt ?? "") > (current.publishedAt ?? "");
}

/** Latest published attempt of each evaluation, in first-seen order. */
export function selectLatestAttempts<T extends RiskEvaluation>(evaluations: ReadonlyArray<T>): T[] {
  const latest = new Map<string, T>();

  for (const evaluation of evaluations) {
    const current = latest.get(evaluation.evaluationId);

    if (!current || isLater(evaluation, current)) {
      latest.set(evaluation.evaluationId, evaluation);
    }
  }

  return [...latest.values()];
}

export function assessStudentRisk(row: RiskInput): StudentRisk {
  const failed = selectLatestAttempts(row.evaluations).filter((evaluation) => evaluation.passed === false);

  return { atRisk: failed.length > 0, failedEvaluationTitles: failed.map((evaluation) => evaluation.evaluationTitle) };
}
