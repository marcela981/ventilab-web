/*
* Funcionalidad: Legacy evaluation redirects tests
* Descripción: R1: every legacy /evaluation/** pattern maps to its new route, the destinations never carry a query string, and unknown patterns fall back to /evaluations. Depends on vitest and legacy-redirects.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { isLegacyEvaluationRoute, LEGACY_EVALUATION_REDIRECTS, resolveLegacyEvaluationRedirect } from "./legacy-redirects";

describe("resolveLegacyEvaluationRedirect", () => {
  it.each([
    ["/evaluation", "/evaluations"],
    ["/evaluation/[activityId]", "/evaluations"],
    ["/evaluation/manage", "/evaluations/manage"],
    ["/evaluation/manage/new", "/evaluations/manage/new"],
    ["/evaluation/manage/[activityId]/edit", "/evaluations/manage"],
    ["/evaluation/grade", "/grading"],
    ["/evaluation/grade/[activityId]", "/grading"],
  ])("maps %s to %s", (legacy, target) => {
    expect(resolveLegacyEvaluationRedirect(legacy)).toBe(target);
  });

  it("covers the seven legacy routes and never carries a query string", () => {
    const targets = Object.values(LEGACY_EVALUATION_REDIRECTS);
    expect(targets).toHaveLength(7);
    for (const target of targets) {
      expect(target).not.toMatch(/[?#[]/);
    }
  });

  it("falls back to the student list for an unknown pattern", () => {
    expect(isLegacyEvaluationRoute("/evaluation/other")).toBe(false);
    expect(isLegacyEvaluationRoute("toString")).toBe(false);
    expect(resolveLegacyEvaluationRedirect("/evaluation/other")).toBe("/evaluations");
  });
});
