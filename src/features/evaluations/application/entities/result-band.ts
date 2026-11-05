/*
* Funcionalidad: Result band rules
* Descripción: Pure rules of the July result band of an attempt (DISENO_BLOQUE3 §2.4; July ResultsScreen): once published, the verdict ("¡Aprobado! 🎉" / "Reprobado 😔", without emojis for EXAM) and "{c} de {t} correctas", counting the questions whose earned score (sent by the server once published) reaches their points; while waiting for the teacher, "Respuestas enviadas — pendiente de revisión por el docente" and, for a QUIZ or WORKSHOP with open questions, the partial "{c} de {t} correctas" of the closed questions computed by the server (partialClosedScore). Depends on the evaluation entities. v1.1 (ajustes C1): until the teacher releases the grade the band says "Entregado — en espera de resultados" with no partial count (partialClosedScore is gone); with the grade alone it shows the verdict without the per-question count, which needs the answers release.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AttemptDetail } from "./evaluation.entity";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const BAND_COPY = {
  passed: (emojis: boolean) => (emojis ? "¡Aprobado! 🎉" : "Aprobado"),
  failed: (emojis: boolean) => (emojis ? "Reprobado 😔" : "Reprobado"),
  correct: (correct: number, total: number) => `${correct} de ${total} correctas`,
  pending: "Entregado — en espera de resultados",
  back: "Volver a evaluaciones",
} as const;

export type ResultBand =
  | { kind: "published", passed: boolean, verdict: string, detail: string | null }
  | { kind: "pending", verdict: string };

export function countCorrectAnswers(attempt: Pick<AttemptDetail, "questions">): { correct: number, total: number } | null {
  const scored = attempt.questions.filter((question) => typeof question.earnedScore === "number");

  if (scored.length === 0) {
    return null;
  }

  return {
    correct: scored.filter((question) => (question.earnedScore ?? 0) >= question.points).length,
    total: scored.length,
  };
}

export function resultBand(attempt: AttemptDetail): ResultBand {
  const emojis = attempt.evaluation.type !== "EXAM";

  if (attempt.published && attempt.result) {
    // The per-question count is part of the correction: only once the answers are released.
    const counts = attempt.answersReleased ? countCorrectAnswers(attempt) : null;

    return {
      kind: "published",
      passed: attempt.result.passed,
      verdict: attempt.result.passed ? BAND_COPY.passed(emojis) : BAND_COPY.failed(emojis),
      detail: counts ? BAND_COPY.correct(counts.correct, counts.total) : null,
    };
  }

  // Nothing is released yet: no partial count either (it is a score).
  return { kind: "pending", verdict: BAND_COPY.pending };
}
