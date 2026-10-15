/*
* Funcionalidad: Builder rich text
* Descripción: Rich text values of the evaluation builder. The backend stores the evaluation description as plain text or a Tiptap JSON document, and question prompts and scenario contents as Tiptap JSON documents (sanitized server-side); the builder editor always emits a Tiptap document. Pure helpers: the empty document, the document guard, blank detection (no text in any node) and the equality used by the unsaved-changes check (blank values are equal). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type RichDoc = Record<string, unknown>;
export type RichTextValue = string | RichDoc;

export function emptyDoc(): RichDoc {
  return { type: "doc", content: [] };
}

export function isRichDoc(value: unknown): value is RichDoc {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(node: unknown): boolean {
  if (!isRichDoc(node)) {
    return false;
  }

  if (typeof node.text === "string" && node.text.trim() !== "") {
    return true;
  }

  // Non-text leaves such as images still count as content.
  if (typeof node.type === "string" && node.type !== "doc" && node.type !== "paragraph" && node.type !== "text" && node.type !== "hardBreak") {
    return true;
  }

  return Array.isArray(node.content) && node.content.some(hasText);
}

export function isBlankRichText(value: RichTextValue | null | undefined): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  return typeof value === "string" ? value.trim() === "" : !hasText(value);
}

export function sameRichText(a: RichTextValue | null | undefined, b: RichTextValue | null | undefined): boolean {
  if (isBlankRichText(a) && isBlankRichText(b)) {
    return true;
  }

  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
