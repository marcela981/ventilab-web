/*
* Funcionalidad: Student space routes tests
* Descripción: The local copies of the routes of other features used by the student space (lesson page, learning section, attempt result) build the same URLs as the route constants of the learning and evaluations features, so the deep links of /me, /me/notes and /me/grades stay real. Depends on vitest, the student space routes and the learning and evaluations barrels (route constants only). v1.1 (W1 Bloque 1): the simulator home (/simulador?tab=simular) and the simulation session, result and replay URLs match the simulator feature constants.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { buildAttemptResultUrl as evaluationsAttemptResultUrl } from "@features/evaluations";
import { buildLessonPageUrl, buildSectionUrl as learningSectionUrl, LEARN_HOME_URL as LEARNING_HOME_URL } from "@features/learning";
import { buildSessionReplayUrl, buildSessionResultUrl, buildSessionUrl, SIMULATOR_URL } from "@features/simulator";
import {
  buildAttemptResultUrl,
  buildLessonUrl,
  buildSectionUrl,
  buildSimulationReplayUrl,
  buildSimulationResultUrl,
  buildSimulationSessionUrl,
  LEARN_HOME_URL,
  SIMULATOR_HOME_URL,
} from "./student-space.routes";

describe("student space routes", () => {
  it("match the learning route constants", () => {
    expect(buildLessonUrl("m 1", "l/1")).toBe(buildLessonPageUrl("m 1", "l/1"));
    expect(buildSectionUrl("s1")).toBe(learningSectionUrl("s1"));
    expect(LEARN_HOME_URL).toBe(LEARNING_HOME_URL);
  });

  it("match the evaluations attempt result route", () => {
    expect(buildAttemptResultUrl("e 1", "a/1")).toBe(evaluationsAttemptResultUrl("e 1", "a/1"));
  });

  it("match the simulator routes: the workspace home and the session pages", () => {
    expect(SIMULATOR_HOME_URL).toBe("/simulador?tab=simular");
    expect(SIMULATOR_HOME_URL).toBe(SIMULATOR_URL);
    expect(buildSimulationSessionUrl("s 1")).toBe(buildSessionUrl("s 1"));
    expect(buildSimulationResultUrl("s1")).toBe(buildSessionResultUrl("s1"));
    expect(buildSimulationReplayUrl("s1")).toBe(buildSessionReplayUrl("s1"));
  });
});
