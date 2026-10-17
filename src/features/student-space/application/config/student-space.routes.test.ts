/*
* Funcionalidad: Student space routes tests
* Descripción: The local copies of the routes of other features used by the student space (lesson page, learning section, attempt result) build the same URLs as the route constants of the learning and evaluations features, so the deep links of /me, /me/notes and /me/grades stay real. Depends on vitest, the student space routes and the learning and evaluations barrels (route constants only).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { buildAttemptResultUrl as evaluationsAttemptResultUrl } from "@features/evaluations";
import { buildLessonPageUrl, buildSectionUrl as learningSectionUrl, LEARN_HOME_URL as LEARNING_HOME_URL } from "@features/learning";
import { buildAttemptResultUrl, buildLessonUrl, buildSectionUrl, LEARN_HOME_URL } from "./student-space.routes";

describe("student space routes", () => {
  it("match the learning route constants", () => {
    expect(buildLessonUrl("m 1", "l/1")).toBe(buildLessonPageUrl("m 1", "l/1"));
    expect(buildSectionUrl("s1")).toBe(learningSectionUrl("s1"));
    expect(LEARN_HOME_URL).toBe(LEARNING_HOME_URL);
  });

  it("match the evaluations attempt result route", () => {
    expect(buildAttemptResultUrl("e 1", "a/1")).toBe(evaluationsAttemptResultUrl("e 1", "a/1"));
  });
});
