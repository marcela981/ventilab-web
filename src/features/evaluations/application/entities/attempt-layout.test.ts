/*
* Funcionalidad: Attempt layout rules tests
* Descripción: Verifies the pure rules of the attempt player per type: the layout and submit label of each type, the clock warning thresholds (EXAM 10 and 5 minutes), the WORKSHOP hint copy and the Alt+←/→ shortcut ignored in text fields. Depends on vitest and the attempt layout rules. v1.1 (ajustes C1): the immediate feedback rules are gone; the hint copy stays.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  HINT_COPY,
  layoutFor,
  pagerShortcut,
  SUBMIT_LABELS,
  warningThresholdsFor,
} from "./attempt-layout";
import { MINUTE_MS } from "./attempt-timer";

const key = (overrides: Partial<Parameters<typeof pagerShortcut>[0]>) => ({
  key: "ArrowRight",
  altKey: true,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  target: null,
  ...overrides,
});

describe("attempt layout rules", () => {
  it("maps each type to its layout, submit label and clock warnings", () => {
    expect([layoutFor("QUIZ"), layoutFor("WORKSHOP"), layoutFor("EXAM")]).toEqual(["quiz", "workshop", "exam"]);
    expect(SUBMIT_LABELS).toEqual({ QUIZ: "Enviar quiz", WORKSHOP: "Enviar taller", EXAM: "Enviar examen" });
    expect(warningThresholdsFor("EXAM")).toEqual([10 * MINUTE_MS, 5 * MINUTE_MS]);
    expect(warningThresholdsFor("QUIZ")).toEqual([5 * MINUTE_MS, MINUTE_MS]);
  });

  it("keeps the July WORKSHOP hint copy", () => {
    expect(HINT_COPY).toEqual({ show: "Pista 💡", hide: "Ocultar pista", label: "Pista" });
  });

  it("reads Alt+←/→ outside text fields only", () => {
    const textarea = document.createElement("textarea");
    const radio = document.createElement("input");

    radio.type = "radio";

    expect(pagerShortcut(key({}))).toBe("next");
    expect(pagerShortcut(key({ key: "ArrowLeft" }))).toBe("previous");
    expect(pagerShortcut(key({ altKey: false }))).toBeNull();
    expect(pagerShortcut(key({ shiftKey: true }))).toBeNull();
    expect(pagerShortcut(key({ target: textarea }))).toBeNull();
    expect(pagerShortcut(key({ target: radio }))).toBe("next");
    expect(pagerShortcut(key({ key: "Enter" }))).toBeNull();
  });
});
