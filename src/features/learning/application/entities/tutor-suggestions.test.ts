/*
* Funcionalidad: TutorAI suggestions tests
* Descripción: Unit tests of the pure TutorAI suggestion module: the July page suggestions in order (four AI prompts to the deepen accordion and "Tomar apunte"), the mini-guide naming the page (or the lesson) instead of the July placeholder, the post-lesson suggestions only when the lesson is done (checklist note and lesson summary to Preguntas) and the checklist Tiptap template. Depends on vitest.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { hasNoteText } from "./note.entity";
import { buildChecklistNoteDoc, buildTutorSuggestions, TUTOR_SUGGESTION_PROMPTS } from "./tutor-suggestions";

describe("buildTutorSuggestions", () => {
  it("returns the July page suggestions in order, the AI ones targeting the deepen accordion", () => {
    const suggestions = buildTutorSuggestions({ pageTitle: "PEEP", lessonTitle: "Ventilación", postLesson: false });

    expect(suggestions.map((suggestion) => suggestion.id)).toEqual(["summarize-page", "generate-quiz", "step-by-step-guide", "mind-map", "take-note"]);
    expect(suggestions[0]).toMatchObject({
      label: TUTOR_SUGGESTION_PROMPTS.summary,
      action: { kind: "prompt", target: "deepen", prompt: TUTOR_SUGGESTION_PROMPTS.summary },
    });
    expect(suggestions[4]).toMatchObject({ label: "Tomar apunte", action: { kind: "take-note" } });
  });

  it("names the page in the mini-guide instead of the July placeholder, falling back to the lesson", () => {
    const withPage = buildTutorSuggestions({ pageTitle: "Ajuste de la PEEP", lessonTitle: "Ventilación", postLesson: false });
    const withLesson = buildTutorSuggestions({ pageTitle: "  ", lessonTitle: "Ventilación", postLesson: false });
    const withNothing = buildTutorSuggestions({ pageTitle: null, lessonTitle: null, postLesson: false });

    expect(withPage[2]?.label).toBe("Hazme una mini-guía paso a paso para calcular Vt/FR/PEEP en el contexto de «Ajuste de la PEEP».");
    expect(withLesson[2]?.label).toContain("«Ventilación»");
    expect(withNothing[2]?.label).toBe("Hazme una mini-guía paso a paso para calcular Vt/FR/PEEP en el contexto de esta página.");
    expect([...withPage, ...withLesson, ...withNothing].some((suggestion) => suggestion.label.includes("["))).toBe(false);
  });

  it("adds the post-lesson suggestions first once the lesson is done", () => {
    const suggestions = buildTutorSuggestions({ pageTitle: "Cierre", lessonTitle: "Ventilación", postLesson: true });

    expect(suggestions.slice(0, 2)).toEqual([
      expect.objectContaining({ id: "lesson-checklist", label: "Crear nota 'Checklist de la lección'", group: "post-lesson", action: { kind: "checklist-note" } }),
      expect.objectContaining({
        id: "lesson-summary",
        group: "post-lesson",
        action: { kind: "prompt", target: "questions", prompt: TUTOR_SUGGESTION_PROMPTS.lessonSummary("Ventilación") },
      }),
    ]);
    expect(suggestions).toHaveLength(7);
  });
});

describe("buildChecklistNoteDoc", () => {
  it("builds the July checklist template as a Tiptap document", () => {
    const doc = buildChecklistNoteDoc("Ventilación");
    const content = doc.content as { type: string, content?: { text?: string }[] }[];

    expect(doc.type).toBe("doc");
    expect(content[0]?.content?.[0]?.text).toBe("Checklist de la lección: Ventilación");
    expect(content.filter((node) => node.type === "heading").map((node) => node.content?.[0]?.text)).toEqual([
      "Checklist de la lección: Ventilación",
      "Conceptos a repasar",
      "Fórmulas clave",
      "Puntos débiles",
    ]);
    expect(content.filter((node) => node.type === "bulletList")).toHaveLength(3);
    expect(hasNoteText(doc)).toBe(true);
    expect((buildChecklistNoteDoc(null).content as { content?: { text?: string }[] }[])[0]?.content?.[0]?.text).toBe("Checklist de la lección: Lección");
  });
});
