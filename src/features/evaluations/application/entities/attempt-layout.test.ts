/*
* Funcionalidad: Attempt layout rules tests
* Descripción: Verifies the pure rules of the attempt player per type: the layout and submit label of each type, the clock warning thresholds (EXAM 10 and 5 minutes), which questions get immediate feedback and which are checked on select, the July verdicts with the correct option texts and the WORKSHOP generic explanation, and the Alt+←/→ shortcut ignored in text fields. Depends on vitest and the attempt layout rules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  checksOnSelect,
  hasImmediateFeedback,
  layoutFor,
  pagerShortcut,
  revealMessage,
  SUBMIT_LABELS,
  warningThresholdsFor,
} from "./attempt-layout";
import { MINUTE_MS } from "./attempt-timer";

const options = [
  { id: "a", order: 0, content: "VC", media: null },
  { id: "b", order: 1, content: "PC", media: null },
];

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

  it("gives immediate feedback only to choice questions outside EXAM", () => {
    expect(hasImmediateFeedback("QUIZ", { type: "SINGLE_CHOICE" })).toBe(true);
    expect(hasImmediateFeedback("WORKSHOP", { type: "MULTIPLE_CHOICE" })).toBe(true);
    expect(hasImmediateFeedback("EXAM", { type: "SINGLE_CHOICE" })).toBe(false);
    expect(hasImmediateFeedback("QUIZ", { type: "OPEN_TEXT" })).toBe(false);
    expect(hasImmediateFeedback("QUIZ", { type: "SIMULATION" })).toBe(false);
    expect(checksOnSelect({ type: "TRUE_FALSE" })).toBe(true);
    expect(checksOnSelect({ type: "MULTIPLE_CHOICE" })).toBe(false);
  });

  it("builds the July verdicts from the server reveal", () => {
    const wrong = { isCorrect: false, correctOptionIds: ["a", "b"], explanation: null };

    expect(revealMessage("quiz", { options }, wrong)).toEqual({ correct: false, verdict: "Casi. La respuesta correcta era \"VC, PC\"", explanation: null });
    expect(revealMessage("quiz", { options }, { ...wrong, isCorrect: true, explanation: "Ambos." }).verdict).toBe("¡Correcto! 🎉");
    expect(revealMessage("workshop", { options }, wrong)).toEqual({
      correct: false,
      verdict: "La respuesta correcta era \"VC, PC\".",
      explanation: "La opción correcta es \"VC, PC\". Revisa el material del módulo para profundizar en este tema.",
    });
    expect(revealMessage("workshop", { options }, { ...wrong, isCorrect: true, explanation: "Ambos." }))
      .toEqual({ correct: true, verdict: "¡Muy bien! 🌟", explanation: "Ambos." });
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
