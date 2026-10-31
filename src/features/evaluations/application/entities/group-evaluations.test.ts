/*
* Funcionalidad: Evaluation grouping tests
* Descripción: Verifies the July grouping of the student list: every type section in the July order (even empty), tracks Mecánica, VentyLab, other tracks by name and "Otras" last, levels by their order with "Otras" last, the order of evaluations kept inside a level, and the "Completado ✓" rule (a submitted attempt and none in progress). Depends on vitest, the evaluations mapper, the grouping entities and the test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toMyEvaluations } from "../../api/mappers/evaluations.mapper";
import { attemptDto, myEvaluationDto } from "../pages/evaluations-test-helpers";
import { groupEvaluations, isEvaluationCompleted } from "./group-evaluations";

const evaluations = toMyEvaluations([
  myEvaluationDto("a1", "e1", { evaluation: { type: "QUIZ", track: "ventylab", levelId: "v1", levelTitle: "VentyLab 1", levelOrder: 1 } }),
  myEvaluationDto("a2", "e2", { evaluation: { type: "QUIZ", track: "mecanica", levelId: "m2", levelTitle: "Intermedio", levelOrder: 2 } }),
  myEvaluationDto("a3", "e3", { evaluation: { type: "QUIZ", track: "mecanica", levelId: "m1", levelTitle: "Principiante", levelOrder: 1 } }),
  myEvaluationDto("a4", "e4", { evaluation: { type: "QUIZ", track: "mecanica", levelId: null } }),
  myEvaluationDto("a5", "e5", { evaluation: { type: "QUIZ", track: null } }),
  myEvaluationDto("a6", "e6", { evaluation: { type: "QUIZ", track: "clinica", levelId: "c1", levelTitle: "Clínica", levelOrder: 1 } }),
  myEvaluationDto("a7", "e7", { evaluation: { type: "QUIZ", track: "mecanica", levelId: "m1", levelTitle: "Principiante", levelOrder: 1 } }),
  myEvaluationDto("a8", "e8", { evaluation: { type: "EXAM" } }),
]);

describe("groupEvaluations", () => {
  it("returns the three July sections in order, even empty ones", () => {
    const sections = groupEvaluations(evaluations);

    expect(sections.map((section) => [section.label, section.count])).toEqual([
      ["📝 Quizzes", 7],
      ["📋 Talleres", 0],
      ["🎓 Exámenes Finales", 1],
    ]);
    expect(sections[1]?.tracks).toEqual([]);
  });

  it("orders tracks and levels, with Otras last, and keeps the order inside a level", () => {
    const [quizzes] = groupEvaluations(evaluations);

    expect(quizzes?.tracks.map((track) => track.label)).toEqual(["Mecánica", "VentyLab", "Clinica", "Otras"]);

    const mecanica = quizzes?.tracks[0];

    expect(mecanica?.levels.map((level) => level.label)).toEqual(["Principiante", "Intermedio", "Otras"]);
    expect(mecanica?.levels[0]?.evaluations.map((item) => item.assignmentId)).toEqual(["a3", "a7"]);
    expect(quizzes?.tracks[3]?.levels.map((level) => level.label)).toEqual(["Otras"]);
  });
});

describe("isEvaluationCompleted", () => {
  it("needs a submitted attempt and none in progress", () => {
    const [none, submitted, retaking] = toMyEvaluations([
      myEvaluationDto("a1", "e1"),
      myEvaluationDto("a2", "e2", { attempts: [attemptDto("t1", 1, { status: "GRADED" })] }),
      myEvaluationDto("a3", "e3", {
        attempts: [attemptDto("t2", 1, { status: "GRADED" }), attemptDto("t3", 2, { status: "IN_PROGRESS", submittedAt: null })],
      }),
    ]);

    expect(isEvaluationCompleted(none!)).toBe(false);
    expect(isEvaluationCompleted(submitted!)).toBe(true);
    expect(isEvaluationCompleted(retaking!)).toBe(false);
  });
});
