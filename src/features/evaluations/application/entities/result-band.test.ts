/*
* Funcionalidad: Result band rules tests
* Descripción: Verifies the July result band: published verdict with emojis except EXAM and the "{c} de {t} correctas" count from the earned scores, and the pending text with the partial closed score sent by the server. Depends on vitest, the evaluations mapper, the result band rules and the test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toAttemptDetail } from "../../api/mappers/evaluations.mapper";
import { attemptDetailDto, questionDto } from "../pages/evaluations-test-helpers";
import { countCorrectAnswers, resultBand } from "./result-band";

const published = (type: "QUIZ" | "EXAM", passed: boolean) => toAttemptDetail(attemptDetailDto("at1", {
  status: "GRADED",
  published: true,
  grade: passed ? 4 : 2,
  passed,
  score: 3,
  maxScore: 5,
  evaluation: { id: "e1", title: "Evaluación", type, description: null },
  questions: [
    questionDto("q1", 0, "SINGLE_CHOICE", { points: 2, earnedScore: 2 }),
    questionDto("q2", 1, "OPEN_TEXT", { points: 3, earnedScore: 1 }),
  ],
}));

describe("resultBand", () => {
  it("shows the July verdict and the correct count once published", () => {
    expect(resultBand(published("QUIZ", true))).toEqual({ kind: "published", passed: true, verdict: "¡Aprobado! 🎉", detail: "1 de 2 correctas" });
    expect(resultBand(published("QUIZ", false)).verdict).toBe("Reprobado 😔");
    expect(resultBand(published("EXAM", true)).verdict).toBe("Aprobado");
    expect(resultBand(published("EXAM", false)).verdict).toBe("Reprobado");
  });

  it("shows the pending text with the partial closed score while the teacher reviews", () => {
    const pending = toAttemptDetail(attemptDetailDto("at1", { status: "PENDING_REVIEW", partialClosedScore: { correct: 1, total: 2 } }));

    expect(resultBand(pending)).toEqual({ kind: "pending", verdict: "Respuestas enviadas — pendiente de revisión por el docente", detail: "1 de 2 correctas" });
    expect(resultBand(toAttemptDetail(attemptDetailDto("at1", { status: "SUBMITTED" }))).detail).toBeNull();
  });

  it("counts nothing without earned scores", () => {
    expect(countCorrectAnswers({ questions: [] })).toBeNull();
  });
});
