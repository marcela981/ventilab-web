/*
* Funcionalidad: Result band rules tests
* Descripción: Verifies the July result band: published verdict with emojis except EXAM and the "{c} de {t} correctas" count from the earned scores, and the pending text. Depends on vitest, the evaluations mapper, the result band rules and the test helpers. v1.1 (ajustes C1): "Entregado — en espera de resultados" with no partial count until the release; with the grade alone, the verdict without the per-question count.
* Versión: 1.1
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

const published = (type: "QUIZ" | "EXAM", passed: boolean, answersReleased = true) => toAttemptDetail(attemptDetailDto("at1", {
  status: "GRADED",
  published: true,
  answersReleased,
  grade: passed ? 4 : 2,
  passed,
  score: 3,
  maxScore: 5,
  evaluation: { id: "e1", title: "Evaluación", type, description: null },
  // The server sends the earned scores only with the answers.
  questions: answersReleased
    ? [questionDto("q1", 0, "SINGLE_CHOICE", { points: 2, earnedScore: 2 }), questionDto("q2", 1, "OPEN_TEXT", { points: 3, earnedScore: 1 })]
    : [questionDto("q1", 0, "SINGLE_CHOICE", { points: 2 }), questionDto("q2", 1, "OPEN_TEXT", { points: 3 })],
}));

describe("resultBand", () => {
  it("shows the July verdict and the correct count once published", () => {
    expect(resultBand(published("QUIZ", true))).toEqual({ kind: "published", passed: true, verdict: "¡Aprobado! 🎉", detail: "1 de 2 correctas" });
    expect(resultBand(published("QUIZ", false)).verdict).toBe("Reprobado 😔");
    expect(resultBand(published("EXAM", true)).verdict).toBe("Aprobado");
    expect(resultBand(published("EXAM", false)).verdict).toBe("Reprobado");
  });

  it("shows the verdict without the per-question count when only the grade is released", () => {
    expect(resultBand(published("QUIZ", true, false))).toEqual({ kind: "published", passed: true, verdict: "¡Aprobado! 🎉", detail: null });
  });

  it("waits for the teacher release with no partial count", () => {
    const expected = { kind: "pending", verdict: "Entregado — en espera de resultados" };

    expect(resultBand(toAttemptDetail(attemptDetailDto("at1", { status: "PENDING_REVIEW" })))).toEqual(expected);
    expect(resultBand(toAttemptDetail(attemptDetailDto("at1", { status: "SUBMITTED" })))).toEqual(expected);
    // GRADED by the server (automatic score) but not released.
    expect(resultBand(toAttemptDetail(attemptDetailDto("at1", { status: "GRADED" })))).toEqual(expected);
  });

  it("counts nothing without earned scores", () => {
    expect(countCorrectAnswers({ questions: [] })).toBeNull();
  });
});
