/*
* Funcionalidad: TutorAI suggestions
* Descripción: Deterministic suggestions of the TutorAI popup (July suggestions.ts, FLUJOS_JULIO §d.2), as a pure module. Page suggestions: the four AI prompts of July (summary in 5 bullets, 3 quiz questions, step-by-step mini-guide rewritten without the literal "[condición del contexto]" placeholder (it names the page, or the lesson, instead) and textual mind map), which open the deepen accordion of the page with the prompt prefilled, plus the local "Tomar apunte" (switches to the Notas tab). Post-lesson suggestions (the lesson is completed and the student is on its last page): the local "Crear nota 'Checklist de la lección'" (July template, built as a Tiptap document) and a lesson summary prompt sent to the Preguntas tab (LESSON scope). The July post-lesson suggestions that depend on a quiz result (error analysis, flashcards) are out of scope: there is no in-lesson self-assessment yet (DISENO_BLOQUE2 §8). Depends only on the note entity types.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { NoteDoc } from "./note.entity";

// Where an AI suggestion sends its prompt: the deepen accordion of the page or the Preguntas tab of the popup.
export type TutorPromptTarget = "deepen" | "questions";

export type TutorSuggestionAction =
  | { kind: "prompt", target: TutorPromptTarget, prompt: string }
  | { kind: "take-note" }
  | { kind: "checklist-note" };

export type TutorSuggestion = {
  id: string
  label: string
  description: string
  group: "post-lesson" | "page"
  action: TutorSuggestionAction
};

export type TutorSuggestionContext = {
  pageTitle: string | null
  lessonTitle: string | null
  // The lesson is completed and the student is on its last page.
  postLesson: boolean
};

const FALLBACK_LESSON_TITLE = "Lección";

// TODO(i18n): move to a learning namespace in src/i18n.
export const TUTOR_SUGGESTION_PROMPTS = {
  summary: "Resúmeme esta página en 5 bullets accionables para repasar antes del examen, destacando fórmulas/valores críticos si aplican.",
  quiz: "Genera 3 preguntas tipo quiz con respuesta y breve justificación, basadas exclusivamente en esta página.",
  guide: (topic: string | null) => (topic
    ? `Hazme una mini-guía paso a paso para calcular Vt/FR/PEEP en el contexto de «${topic}».`
    : "Hazme una mini-guía paso a paso para calcular Vt/FR/PEEP en el contexto de esta página."),
  mindMap: "Dame un mapa mental textual (jerárquico) de los conceptos clave de esta página.",
  lessonSummary: (lessonTitle: string) => `Resume los puntos clave de la lección «${lessonTitle}» en un repaso breve para estudiar.`,
} as const;

function cleanTitle(title: string | null): string | null {
  const trimmed = title?.trim() ?? "";

  return trimmed === "" ? null : trimmed;
}

function pageSuggestions(topic: string | null): TutorSuggestion[] {
  const prompt = (id: string, text: string, description: string): TutorSuggestion => ({
    id,
    label: text,
    description,
    group: "page",
    action: { kind: "prompt", target: "deepen", prompt: text },
  });

  return [
    prompt("summarize-page", TUTOR_SUGGESTION_PROMPTS.summary, "Obtén un resumen estructurado de la página"),
    prompt("generate-quiz", TUTOR_SUGGESTION_PROMPTS.quiz, "Crea preguntas de práctica"),
    prompt("step-by-step-guide", TUTOR_SUGGESTION_PROMPTS.guide(topic), "Guía práctica paso a paso"),
    prompt("mind-map", TUTOR_SUGGESTION_PROMPTS.mindMap, "Visualiza los conceptos clave"),
    { id: "take-note", label: "Tomar apunte", description: "Crea una nueva nota", group: "page", action: { kind: "take-note" } },
  ];
}

function postLessonSuggestions(lessonTitle: string): TutorSuggestion[] {
  const summary = TUTOR_SUGGESTION_PROMPTS.lessonSummary(lessonTitle);

  return [
    {
      id: "lesson-checklist",
      label: "Crear nota 'Checklist de la lección'",
      description: "Crea una nota con template de checklist",
      group: "post-lesson",
      action: { kind: "checklist-note" },
    },
    {
      id: "lesson-summary",
      label: summary,
      description: "Repasa la lección completa con el tutor",
      group: "post-lesson",
      action: { kind: "prompt", target: "questions", prompt: summary },
    },
  ];
}

/** Suggestions of the popup: post-lesson ones first (only when the lesson is done), then the page ones. */
export function buildTutorSuggestions({ pageTitle, lessonTitle, postLesson }: TutorSuggestionContext): TutorSuggestion[] {
  const lesson = cleanTitle(lessonTitle);
  const page = pageSuggestions(cleanTitle(pageTitle) ?? lesson);

  return postLesson ? [...postLessonSuggestions(lesson ?? FALLBACK_LESSON_TITLE), ...page] : page;
}

const text = (value: string) => ({ type: "text", text: value });
const heading = (level: number, value: string) => ({ type: "heading", attrs: { level }, content: [text(value)] });
// Empty checklist entries: list items with an empty paragraph, ready to be filled in the editor.
const emptyList = (items: number) => ({
  type: "bulletList",
  content: Array.from({ length: items }, () => ({ type: "listItem", content: [{ type: "paragraph" }] })),
});

/** July "Checklist de la lección" template as a Tiptap document (StarterKit nodes only). */
export function buildChecklistNoteDoc(lessonTitle: string | null): NoteDoc {
  return {
    type: "doc",
    content: [
      heading(1, `Checklist de la lección: ${cleanTitle(lessonTitle) ?? FALLBACK_LESSON_TITLE}`),
      heading(2, "Conceptos a repasar"),
      emptyList(3),
      heading(2, "Fórmulas clave"),
      emptyList(2),
      heading(2, "Puntos débiles"),
      emptyList(2),
    ],
  };
}
